#!/usr/bin/env node
/**
 * Run API Keys and Webhooks Migration
 * Executes the migration SQL directly via Supabase client
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

async function runMigration() {
  console.log('🗄️  Running API Keys and Webhooks Migration\n');
  
  // Get Supabase credentials
  const supabaseUrl = getSSMParameter('/storytailor-production/supabase/url');
  const supabaseServiceKey = getSSMParameter('/storytailor-production/supabase/service_key');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Failed to get Supabase credentials from SSM');
    process.exit(1);
  }
  
  console.log('✅ Credentials loaded');
  console.log(`   URL: ${supabaseUrl}\n`);
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20240101000018_api_keys_and_webhooks.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📝 Reading migration file...');
  console.log(`   File: ${path.basename(migrationPath)}\n`);
  
  // Split migration into individual statements
  // Remove comments and split by semicolons
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
    .map(s => s + ';');
  
  console.log(`📊 Found ${statements.length} SQL statements to execute\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip empty statements
    if (!statement || statement.trim() === ';') {
      continue;
    }
    
    try {
      // Use Supabase RPC if available, otherwise try direct query
      const { data, error } = await supabase.rpc('exec_sql', {
        query: statement
      });
      
      if (error) {
        // If RPC doesn't exist, try executing via REST API directly
        console.log(`⚠️  RPC failed, trying direct execution for statement ${i + 1}...`);
        
        // For CREATE TABLE and other DDL, we'll need to use a different approach
        // Try to execute via PostgREST if possible, or log that manual execution is needed
        console.log(`   Statement: ${statement.substring(0, 100)}...`);
        
        // Check if it's a CREATE TABLE statement
        if (statement.match(/CREATE TABLE/i)) {
          const tableMatch = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
          if (tableMatch) {
            const tableName = tableMatch[1];
            console.log(`   Checking if table ${tableName} exists...`);
            
            // Try to query the table to see if it exists
            const { error: queryError } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (!queryError) {
              console.log(`   ✅ Table ${tableName} already exists\n`);
              successCount++;
              continue;
            } else if (queryError.code === 'PGRST116') {
              console.log(`   ⚠️  Table ${tableName} does not exist - manual migration needed\n`);
              errorCount++;
              continue;
            }
          }
        }
        
        errorCount++;
        console.log(`   ❌ Error: ${error.message}\n`);
      } else {
        successCount++;
        console.log(`   ✅ Statement ${i + 1} executed successfully\n`);
      }
    } catch (err) {
      errorCount++;
      console.log(`   ❌ Statement ${i + 1} failed: ${err.message}\n`);
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  
  // Verify tables were created
  console.log('\n🔍 Verifying tables...');
  
  const tablesToCheck = ['api_keys', 'webhooks', 'webhook_deliveries'];
  
  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`   ✅ Table ${table} exists and is accessible`);
      } else {
        console.log(`   ❌ Table ${table} - ${error.message}`);
      }
    } catch (err) {
      console.log(`   ❌ Table ${table} - ${err.message}`);
    }
  }
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. You may need to run this migration manually in the Supabase dashboard.');
    console.log('   Migration file: supabase/migrations/20240101000018_api_keys_and_webhooks.sql');
    process.exit(1);
  } else {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  }
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
