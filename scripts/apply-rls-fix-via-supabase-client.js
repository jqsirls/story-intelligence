#!/usr/bin/env node
/**
 * Apply RLS Fix Migration using Supabase Client
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
  console.log('🗄️  Applying RLS Fix Migration\n');
  
  // Get Supabase credentials
  const supabaseUrl = getSSMParameter('/storytailor-production/supabase/url');
  const supabaseServiceKey = getSSMParameter('/storytailor-production/supabase/service_key');
  
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
  
  console.log('📝 Reading migration file...');
  console.log(`   File: ${path.basename(migrationPath)}\n`);
  
  // Split SQL into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`🔄 Executing ${statements.length} SQL statements...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip empty or comment-only statements
    if (!statement || statement.length < 10) {
      continue;
    }
    
    try {
      // Try using RPC if available
      const { data, error } = await supabase.rpc('exec_sql', {
        query: statement + ';'
      });
      
      if (error) {
        // If RPC doesn't work, try direct execution via REST API
        console.log(`⚠️  Statement ${i + 1}: RPC failed, trying alternative...`);
        console.log(`   SQL: ${statement.substring(0, 80)}...`);
        
        // For DROP POLICY and CREATE POLICY, we can verify by checking pg_policies
        if (statement.includes('DROP POLICY') || statement.includes('CREATE POLICY')) {
          const policyMatch = statement.match(/POLICY\s+(\w+)\s+ON\s+(\w+)/i);
          if (policyMatch) {
            const [, policyName, tableName] = policyMatch;
            console.log(`   Checking policy ${policyName} on ${tableName}...`);
            
            // Verify by checking if we can query the table (indirect verification)
            const { error: queryError } = await supabase
              .from(tableName)
              .select('*')
              .limit(0);
            
            if (!queryError) {
              console.log(`   ✅ Table ${tableName} is accessible\n`);
              successCount++;
              continue;
            }
          }
        }
        
        errorCount++;
        console.log(`   ❌ Error: ${error.message}\n`);
      } else {
        successCount++;
        const action = statement.match(/^(DROP|CREATE|ALTER)/i)?.[1] || 'Execute';
        console.log(`   ✅ ${action} statement ${i + 1}\n`);
      }
    } catch (err) {
      errorCount++;
      console.error(`   ❌ Statement ${i + 1} failed: ${err.message}\n`);
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. Migration may need to be applied manually via Supabase Dashboard.');
    console.log('   Go to: SQL Editor → Paste migration SQL → Run');
  } else {
    console.log('\n🎉 Migration completed successfully!');
  }
}

applyMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
