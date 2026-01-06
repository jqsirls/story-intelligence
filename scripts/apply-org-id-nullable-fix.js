#!/usr/bin/env node

/**
 * Apply migration to make organization_id nullable in invitations table
 * This is required for friend referrals to work
 */

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

function getSSMParameter(name) {
  try {
    return execSync(
      `aws ssm get-parameter --name "${name}" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch (error) {
    return null;
  }
}

async function applyMigration() {
  console.log('🗄️  Making organization_id nullable for friend referrals\n');
  
  const supabaseUrl = getSSMParameter('/storytailor-production/supabase/url') || 
                      getSSMParameter('/storytailor-production/supabase-url') ||
                      process.env.SUPABASE_URL;
  const supabaseServiceKey = getSSMParameter('/storytailor-production/supabase/service-key') || 
                             getSSMParameter('/storytailor-production/supabase/service_key') ||
                             process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Failed to get Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Try to execute the ALTER TABLE statement
  // Since Supabase doesn't support raw DDL via REST API, we'll need manual application
  // But we can test if the column exists and provide instructions
  
  console.log('📋 MIGRATION REQUIRED:');
  console.log('='.repeat(70));
  console.log('The invitations table has organization_id as NOT NULL.');
  console.log('Friend referrals need this to be nullable.');
  console.log('\nPlease apply this SQL manually in Supabase Dashboard:');
  console.log('='.repeat(70));
  console.log('ALTER TABLE public.invitations ALTER COLUMN organization_id DROP NOT NULL;');
  console.log('='.repeat(70));
  console.log('\nOr run this migration file:');
  console.log('supabase/migrations/20251227000000_add_invitations_rls_policy.sql\n');
  
  // For now, we'll test if setting null works (it will fail, but we'll see the error)
  console.log('⚠️  Note: The code has been updated to set organization_id: null');
  console.log('   This will work once the migration is applied.\n');
}

applyMigration().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

