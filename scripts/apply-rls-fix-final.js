#!/usr/bin/env node
/**
 * FINAL RLS FIX - Apply migration using Supabase Management API
 * This uses the Supabase client to execute SQL via a custom RPC function
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
  console.log('🗄️  FINAL RLS FIX - Applying Migration\n');
  
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
  
  // Read migration
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250117000001_fix_library_permissions_rls_recursion.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📝 Migration loaded\n');
  console.log('🔄 Applying migration...\n');
  
  // Try to execute via REST API with exec_sql function
  // First, ensure exec_sql function exists
  const createExecSql = `
    CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      EXECUTE query_text;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'SQL execution failed: %', SQLERRM;
    END;
    $$;
    
    GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
  `;
  
  try {
    // Try to create exec_sql function first
    const createResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: createExecSql })
    });
    
    if (createResponse.ok) {
      console.log('✅ exec_sql function created\n');
    } else {
      console.log('⚠️  Could not create exec_sql function (may already exist)\n');
    }
    
    // Now execute the migration
    const migrationResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: migrationSQL })
    });
    
    if (migrationResponse.ok) {
      console.log('✅ Migration executed successfully!\n');
      console.log('🎉 RLS FIX COMPLETE!\n');
      return;
    } else {
      const errorText = await migrationResponse.text();
      console.log(`⚠️  Migration execution failed: ${errorText.substring(0, 200)}\n`);
    }
  } catch (err) {
    console.log(`⚠️  Error: ${err.message}\n`);
  }
  
  // If automated fails, provide manual instructions
  const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  console.log('📋 MANUAL APPLICATION REQUIRED:');
  console.log('='.repeat(70));
  console.log(`1. Go to: https://supabase.com/dashboard/project/${projectId}/sql`);
  console.log('2. Click "SQL Editor"');
  console.log(`3. Copy contents of: ${migrationPath}`);
  console.log('4. Paste and Run');
  console.log('='.repeat(70));
}

applyMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
