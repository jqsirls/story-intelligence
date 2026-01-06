#!/usr/bin/env node
/**
 * Admin Script: Grant Test Mode Authorization
 * 
 * Sets users.test_mode_authorized = true to bypass quota checks for testing.
 * 
 * SECURITY: Requires SUPABASE_SERVICE_ROLE_KEY (admin-only, not public API).
 * 
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/grant-test-mode.js <email>
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/grant-test-mode.js <user_id>
 */

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { createClient } = require('@supabase/supabase-js');

async function getSSMParam(name) {
  const ssm = new SSMClient({ region: 'us-east-1' });
  const cmd = new GetParameterCommand({ Name: name, WithDecryption: true });
  const out = await ssm.send(cmd);
  return out.Parameter.Value;
}

(async () => {
  const identifier = process.argv[2];
  
  if (!identifier) {
    console.error('Usage: node scripts/grant-test-mode.js <email|user_id>');
    console.error('Example: node scripts/grant-test-mode.js j+1226@jqsirls.com');
    process.exit(1);
  }

  // Get service role key (admin-only)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || await getSSMParam('/storytailor-production/supabase/service-key').catch(() => null);
  
  if (!serviceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY required (env var or SSM)');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL || await getSSMParam('/storytailor-production/supabase/url');
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Find user by email or ID
  let userId;
  if (identifier.includes('@')) {
    // Email lookup via auth.users table (service role can access)
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', identifier)
      .limit(1)
      .single();
    
    if (authError || !authUsers?.id) {
      // Fallback: try users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', identifier)
        .limit(1)
        .single();
      
      if (userError || !userData?.id) {
        console.error(`❌ User not found: ${identifier}`);
        process.exit(1);
      }
      userId = userData.id;
    } else {
      userId = authUsers.id;
    }
    console.log(`📧 Found user by email: ${identifier} → ${userId}`);
  } else {
    // Assume UUID
    userId = identifier;
    console.log(`🆔 Using user ID: ${userId}`);
  }

  // Grant test mode
  const { error } = await supabase
    .from('users')
    .update({ test_mode_authorized: true })
    .eq('id', userId);

  if (error) {
    console.error(`❌ Failed to grant test mode: ${error.message}`);
    process.exit(1);
  }

  console.log(`✅ Test mode authorized for user: ${userId}`);
  console.log(`   Quota bypass enabled for POST /api/v1/stories and POST /api/v1/characters`);
  process.exit(0);
})();

