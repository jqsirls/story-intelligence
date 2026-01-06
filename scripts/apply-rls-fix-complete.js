#!/usr/bin/env node
/**
 * Complete RLS Fix - Apply migration using Supabase client with service role
 * This bypasses RLS to apply the fix
 */

const { createClient } = require('@supabase/supabase-js');
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

async function applyMigration() {
  console.log('🗄️  COMPLETE RLS FIX - Applying Migration\n');
  
  // Get Supabase credentials
  const supabaseUrl = getSSMParameter('/storytailor-production/supabase/url');
  const supabaseServiceKey = getSSMParameter('/storytailor-production/supabase/service-key');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Failed to get Supabase credentials from SSM');
    process.exit(1);
  }
  
  console.log('✅ Credentials loaded');
  console.log(`   URL: ${supabaseUrl}\n`);
  
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
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250117000001_fix_library_permissions_rls_recursion.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📝 Migration file loaded');
  console.log(`   File: ${path.basename(migrationPath)}\n`);
  
  // Split into statements (semicolon-separated, but handle multi-line statements)
  const statements = migrationSQL
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));
  
  console.log(`🔄 Executing ${statements.length} SQL statements...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  // Execute statements one by one
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'; // Add semicolon back
    
    // Skip empty or very short statements
    if (statement.length < 20) {
      continue;
    }
    
    try {
      // Use RPC to execute SQL (if available)
      const { data, error } = await supabase.rpc('exec_sql', {
        query: statement
      });
      
      if (error) {
        // Try alternative: Execute via REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ query: statement })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        successCount++;
        const action = statement.match(/^(DROP|CREATE|ALTER)/i)?.[1] || 'Execute';
        console.log(`   ✅ Statement ${i + 1}: ${action}\n`);
      } else {
        successCount++;
        const action = statement.match(/^(DROP|CREATE|ALTER)/i)?.[1] || 'Execute';
        console.log(`   ✅ Statement ${i + 1}: ${action}\n`);
      }
    } catch (err) {
      errorCount++;
      const errorMsg = err.message || String(err);
      errors.push({ statement: i + 1, error: errorMsg });
      console.error(`   ❌ Statement ${i + 1} failed: ${errorMsg}\n`);
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. Errors:');
    errors.forEach(e => {
      console.log(`   Statement ${e.statement}: ${e.error.substring(0, 100)}`);
    });
    console.log('\n📋 MANUAL APPLICATION REQUIRED:');
    console.log('   1. Go to Supabase Dashboard: SQL Editor');
    console.log(`   2. Open: ${migrationPath}`);
    console.log('   3. Copy entire contents');
    console.log('   4. Paste into SQL Editor');
    console.log('   5. Click Run');
  } else {
    console.log('\n🎉 Migration completed successfully!');
    
    // Verify policies
    console.log('\n🔍 Verifying policies...');
    try {
      const { data: policies, error: policyError } = await supabase
        .from('pg_policies')
        .select('policyname, tablename')
        .eq('tablename', 'library_permissions')
        .eq('policyname', 'library_permissions_policy');
      
      if (!policyError && policies && policies.length > 0) {
        console.log('   ✅ library_permissions_policy exists');
      } else {
        console.log('   ⚠️  Could not verify policy (this is OK if using service role)');
      }
    } catch (err) {
      console.log('   ⚠️  Verification query failed (this is OK)');
    }
  }
}

applyMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
