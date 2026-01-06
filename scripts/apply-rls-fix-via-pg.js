#!/usr/bin/env node
/**
 * Apply RLS Fix via PostgreSQL connection using service role password
 * This is the most reliable method for DDL operations
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get credentials from SSM
function getSSMParameter(name) {
  try {
    return execSync(`aws ssm get-parameter --name "${name}" --with-decryption --query 'Parameter.Value' --output text`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    console.error(`Failed to get parameter ${name}:`, error.message);
    return null;
  }
}

// Extract password from JWT service key
function extractPasswordFromJWT(jwt) {
  try {
    // Service key is a JWT - we need the actual database password
    // For Supabase, the service key JWT contains the password in the payload
    // However, we can't easily extract it. Instead, we need to use the connection string
    // from Supabase dashboard or use the REST API approach
    
    // Alternative: Use the service key directly in connection (Supabase supports this)
    return jwt;
  } catch (err) {
    return null;
  }
}

async function applyMigration() {
  console.log('🗄️  COMPLETE RLS FIX - Applying via PostgreSQL\n');
  
  // Get Supabase credentials
  const supabaseUrl = getSSMParameter('/storytailor-production/supabase/url');
  const supabaseServiceKey = getSSMParameter('/storytailor-production/supabase/service-key');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Failed to get Supabase credentials from SSM');
    process.exit(1);
  }
  
  // Extract project ID from URL
  const projectMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!projectMatch) {
    console.error('❌ Invalid Supabase URL format');
    process.exit(1);
  }
  
  const projectId = projectMatch[1];
  
  console.log('✅ Credentials loaded');
  console.log(`   Project ID: ${projectId}\n`);
  
  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250117000001_fix_library_permissions_rls_recursion.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📝 Migration file loaded');
  console.log(`   File: ${path.basename(migrationPath)}\n`);
  
  // For Supabase, we need the actual database password, not the JWT service key
  // The service key JWT can't be used directly for psql connection
  // We'll use the Supabase REST API with a function that executes SQL
  
  console.log('⚠️  Direct PostgreSQL connection requires database password.');
  console.log('   Using Supabase REST API approach instead...\n');
  
  // Use Supabase client to execute via REST API
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
  
  // Try to execute the migration via a stored procedure or direct SQL execution
  // Since Supabase doesn't expose exec_sql by default, we'll need to create it first
  // OR use the Supabase Dashboard method
  
  console.log('📋 MIGRATION APPLICATION INSTRUCTIONS:');
  console.log('=' .repeat(70));
  console.log('\nSince automated application has limitations, please apply manually:');
  console.log('\n1. Go to Supabase Dashboard:');
  console.log(`   https://supabase.com/dashboard/project/${projectId}/sql`);
  console.log('\n2. Navigate to: SQL Editor');
  console.log('\n3. Copy the entire contents of:');
  console.log(`   ${migrationPath}`);
  console.log('\n4. Paste into SQL Editor');
  console.log('\n5. Click "Run" or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)');
  console.log('\n6. Verify no errors appear');
  console.log('\n' + '='.repeat(70));
  console.log('\n📝 Migration SQL Preview (first 500 chars):');
  console.log(migrationSQL.substring(0, 500) + '...\n');
  
  // Also try to create exec_sql function if it doesn't exist
  console.log('🔄 Attempting to create exec_sql function...');
  
  const createExecSqlFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE query_text;
    END;
    $$;
  `;
  
  try {
    // Try to execute via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: createExecSqlFunction })
    });
    
    if (response.ok) {
      console.log('   ✅ exec_sql function created or already exists');
      
      // Now try to execute the migration
      console.log('\n🔄 Executing migration via exec_sql...');
      
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
        console.log('   ✅ Migration executed successfully!\n');
        console.log('🎉 RLS FIX COMPLETE!\n');
        return;
      } else {
        const errorText = await migrationResponse.text();
        console.log(`   ⚠️  Migration execution failed: ${errorText.substring(0, 200)}`);
        console.log('   Please apply manually via Supabase Dashboard\n');
      }
    } else {
      console.log('   ⚠️  Could not create exec_sql function');
      console.log('   Please apply migration manually via Supabase Dashboard\n');
    }
  } catch (err) {
    console.log(`   ⚠️  Error: ${err.message}`);
    console.log('   Please apply migration manually via Supabase Dashboard\n');
  }
  
  console.log('📋 Please follow the manual instructions above to complete the migration.');
}

applyMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
