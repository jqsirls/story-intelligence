#!/usr/bin/env node
/**
 * COMPLETE RLS FIX - Apply migration using Supabase client with service role
 * This script uses service role to bypass RLS and apply the fix
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getSSMParameter(name) {
  try {
    return execSync(`aws ssm get-parameter --name "${name}" --with-decryption --query 'Parameter.Value' --output text`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    return null;
  }
}

async function applyMigration() {
  console.log('🗄️  COMPLETE RLS FIX - Applying Migration\n');
  
  const supabaseUrl = getSSMParameter('/storytailor-production/supabase/url');
  const supabaseServiceKey = getSSMParameter('/storytailor-production/supabase/service-key');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Failed to get credentials');
    process.exit(1);
  }
  
  console.log('✅ Credentials loaded\n');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250117000001_fix_library_permissions_rls_recursion.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📝 Migration loaded\n');
  console.log('🔄 Applying migration via service role...\n');
  
  // Split into individual statements
  const statements = migrationSQL
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'));
  
  let successCount = 0;
  let errorCount = 0;
  
  // Execute each statement using service role (bypasses RLS)
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    if (statement.length < 20) continue;
    
    try {
      // Use RPC if exec_sql exists
      const { data, error } = await supabase.rpc('exec_sql', { query: statement });
      
      if (error) {
        // If exec_sql doesn't exist, we need to apply manually
        if (error.message.includes('function exec_sql') || error.message.includes('does not exist')) {
          console.log('⚠️  exec_sql function does not exist');
          console.log('📋 Migration must be applied manually via Supabase Dashboard');
          break;
        }
        throw error;
      }
      
      successCount++;
      const action = statement.match(/^(DROP|CREATE|ALTER)/i)?.[1] || 'Execute';
      console.log(`   ✅ Statement ${i + 1}: ${action}`);
    } catch (err) {
      errorCount++;
      console.log(`   ❌ Statement ${i + 1}: ${err.message.substring(0, 100)}`);
    }
  }
  
  if (errorCount === 0 && successCount > 0) {
    console.log('\n✅ Migration applied successfully!\n');
    console.log('🎉 RLS FIX COMPLETE!\n');
  } else {
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    console.log('\n📋 MANUAL APPLICATION REQUIRED:');
    console.log('='.repeat(70));
    console.log(`1. Go to: https://supabase.com/dashboard/project/${projectId}/sql`);
    console.log('2. Click "SQL Editor"');
    console.log(`3. Copy contents of: ${migrationPath}`);
    console.log('4. Paste and Run');
    console.log('='.repeat(70));
  }
}

applyMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
