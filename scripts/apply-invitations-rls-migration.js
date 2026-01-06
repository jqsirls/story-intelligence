#!/usr/bin/env node

/**
 * Apply RLS policy migration for invitations table
 * Allows friend referrals to work properly
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getSSMParameter(name) {
  try {
    const result = execSync(
      `aws ssm get-parameter --name "${name}" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return result || null;
  } catch (error) {
    console.warn(`⚠️  Could not get SSM parameter ${name}: ${error.message}`);
    return null;
  }
}

async function applyMigration() {
  console.log('🗄️  Applying Invitations RLS Policy Migration\n');
  
  // Get Supabase credentials
  const supabaseUrl = getSSMParameter('/storytailor-production/supabase/url') || 
                      getSSMParameter('/storytailor-production/supabase-url') ||
                      process.env.SUPABASE_URL;
  const supabaseServiceKey = getSSMParameter('/storytailor-production/supabase/service-key') || 
                             getSSMParameter('/storytailor-production/supabase/service_key') ||
                             process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Failed to get Supabase credentials from SSM or environment');
    process.exit(1);
  }
  
  console.log('✅ Credentials loaded');
  console.log(`   URL: ${supabaseUrl.substring(0, 30)}...\n`);
  
  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public'
    }
  });
  
  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20251227000000_add_invitations_rls_policy.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📝 Reading migration file...');
  console.log(`   File: ${path.basename(migrationPath)}\n`);
  
  // Split SQL into individual statements (handle DO blocks)
  const statements = migrationSQL
    .split(/;\s*(?=\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));
  
  console.log(`🔄 Executing ${statements.length} SQL statements...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip empty statements
    if (statement.length < 10) continue;
    
    try {
      // Use raw SQL execution via RPC if available
      // For ALTER TABLE and CREATE POLICY, we need to use raw SQL
      let error = null;
      try {
        const result = await supabase.rpc('exec_sql', { 
          query: statement + ';' 
        });
        error = result.error;
      } catch (rpcError) {
        // If exec_sql doesn't exist, we need manual application
        error = { message: 'exec_sql function not available - manual application required' };
      }
      
      if (error) {
        if (error.message && error.message.includes('exec_sql')) {
          console.log(`   ⚠️  Statement ${i + 1}: exec_sql not available - manual application required`);
          errorCount++;
        } else {
          // Some errors are expected (e.g., policy already exists)
          if (error.message && (
            error.message.includes('already exists') ||
            error.message.includes('does not exist') && statement.includes('DROP')
          )) {
            console.log(`   ℹ️  Statement ${i + 1}: ${error.message.substring(0, 60)}...`);
            successCount++; // Count as success (idempotent)
          } else {
            throw error;
          }
        }
      } else {
        successCount++;
        const action = statement.match(/^(DROP|CREATE|ALTER)/i)?.[1] || 'Execute';
        console.log(`   ✅ Statement ${i + 1}: ${action}`);
      }
    } catch (err) {
      errorCount++;
      console.log(`   ❌ Statement ${i + 1}: ${err.message.substring(0, 100)}`);
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}\n`);
  
  if (errorCount > 0) {
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    console.log('📋 MANUAL APPLICATION MAY BE REQUIRED:');
    console.log('='.repeat(70));
    console.log(`1. Go to: https://supabase.com/dashboard/project/${projectId}/sql/new`);
    console.log('2. Copy contents of: supabase/migrations/20251227000000_add_invitations_rls_policy.sql');
    console.log('3. Paste and Run');
    console.log('='.repeat(70));
    console.log('\n⚠️  However, the migration may have partially succeeded.');
    console.log('   Please verify by testing the referral invite endpoint.\n');
  } else {
    console.log('✅ Migration applied successfully!\n');
  }
}

applyMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

