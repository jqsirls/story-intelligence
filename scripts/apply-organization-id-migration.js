#!/usr/bin/env node

/**
 * Apply organization_id nullable migration for invitations table
 * This allows friend referrals to work properly
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
  console.log('🗄️  Applying organization_id nullable migration\n');
  
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
  
  console.log('✅ Credentials loaded');
  console.log(`   URL: ${supabaseUrl.substring(0, 30)}...\n`);
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public'
    }
  });
  
  // Apply the migration using the full migration file
  console.log('🔄 Applying migration...\n');
  
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../supabase/migrations/20251227000000_add_invitations_rls_policy.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  // Split into statements
  const statements = migrationSQL
    .split(/;\s*(?=\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));
  
  console.log(`📝 Executing ${statements.length} SQL statements...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length < 10) continue;
    
    try {
      // Try using Supabase REST API to execute SQL
      // Since exec_sql might not exist, we'll use a workaround
      const { error } = await supabase.rpc('exec_sql', { query: statement + ';' }).catch(() => {
        return { error: { message: 'exec_sql not available' } };
      });
      
      if (error) {
        if (error.message.includes('exec_sql')) {
          console.log(`   ⚠️  Statement ${i + 1}: exec_sql not available - manual application needed`);
          errorCount++;
        } else if (error.message.includes('already exists') || 
                   (error.message.includes('does not exist') && statement.includes('DROP'))) {
          console.log(`   ℹ️  Statement ${i + 1}: ${error.message.substring(0, 60)}...`);
          successCount++;
        } else {
          throw error;
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
    console.log('📋 MANUAL APPLICATION REQUIRED:');
    console.log('='.repeat(70));
    console.log('Please apply this SQL in Supabase Dashboard:');
    console.log('ALTER TABLE public.invitations ALTER COLUMN organization_id DROP NOT NULL;');
    console.log('='.repeat(70));
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    console.log(`Dashboard: https://supabase.com/dashboard/project/${projectId}/sql/new\n`);
  }
}

applyMigration().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

