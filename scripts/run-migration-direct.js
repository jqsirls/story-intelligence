#!/usr/bin/env node
/**
 * Run API Keys and Webhooks Migration via Direct PostgreSQL Connection
 * This bypasses Supabase REST API limitations for DDL operations
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

async function runMigration() {
  console.log('🗄️  Running API Keys and Webhooks Migration via Direct PostgreSQL Connection\n');
  
  // Get Supabase credentials
  const supabaseUrl = getSSMParameter('/storytailor-production/supabase/url');
  const supabaseServiceKey = getSSMParameter('/storytailor-production/supabase/service_key');
  
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
  const dbHost = `db.${projectId}.supabase.co`;
  
  console.log('✅ Credentials loaded');
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Database Host: ${dbHost}\n`);
  
  // Create PostgreSQL connection pool
  const pool = new Pool({
    host: dbHost,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: supabaseServiceKey,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  // Test connection
  try {
    const result = await pool.query('SELECT current_database(), current_user, version();');
    console.log('✅ Connected to database');
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    console.log(`   PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}\n`);
  } catch (err) {
    console.error('❌ Failed to connect to database:', err.message);
    console.error('   Make sure the service key has database access permissions');
    process.exit(1);
  }
  
  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20240101000018_api_keys_and_webhooks.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📝 Reading migration file...');
  console.log(`   File: ${path.basename(migrationPath)}\n`);
  
  // Execute the entire migration as a single transaction
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🔄 Executing migration...\n');
    
    // Execute the entire migration SQL
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!\n');
    
    // Verify tables were created
    console.log('🔍 Verifying tables...');
    
    const tablesToCheck = ['api_keys', 'webhooks', 'webhook_deliveries'];
    
    for (const table of tablesToCheck) {
      const { rows } = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (rows[0].exists) {
        // Check column count
        const { rows: colRows } = await client.query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = $1;
        `, [table]);
        
        console.log(`   ✅ Table ${table} exists (${colRows[0].count} columns)`);
      } else {
        console.log(`   ❌ Table ${table} does not exist`);
      }
    }
    
    // Verify functions
    console.log('\n🔍 Verifying functions...');
    const functionsToCheck = [
      'update_updated_at_column',
      'update_api_keys_updated_at',
      'update_webhook_delivery',
      'get_pending_webhook_deliveries',
      'schedule_webhook_retry',
      'cleanup_old_webhook_deliveries'
    ];
    
    for (const funcName of functionsToCheck) {
      const { rows } = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' 
          AND p.proname = $1
        );
      `, [funcName]);
      
      if (rows[0].exists) {
        console.log(`   ✅ Function ${funcName} exists`);
      } else {
        console.log(`   ❌ Function ${funcName} does not exist`);
      }
    }
    
    console.log('\n🎉 Migration verification complete!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', err.message);
    console.error('   Error code:', err.code);
    console.error('   Error detail:', err.detail);
    console.error('   Error position:', err.position);
    if (err.hint) {
      console.error('   Hint:', err.hint);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
