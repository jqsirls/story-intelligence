#!/usr/bin/env node
/**
 * Apply RLS Fix Migration for library_permissions infinite recursion
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
  console.log('🗄️  Applying RLS Fix Migration for library_permissions\n');
  
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
    const result = await pool.query('SELECT current_database(), current_user;');
    console.log('✅ Connected to database');
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}\n`);
  } catch (err) {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }
  
  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250117000001_fix_library_permissions_rls_recursion.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📝 Reading migration file...');
  console.log(`   File: ${path.basename(migrationPath)}\n`);
  
  // Execute the migration
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🔄 Executing migration...\n');
    
    // Execute the migration SQL
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!\n');
    
    // Verify policies were updated
    console.log('🔍 Verifying RLS policies...');
    
    const { rows: policyRows } = await client.query(`
      SELECT policyname, cmd, qual
      FROM pg_policies
      WHERE schemaname = 'public' 
      AND tablename = 'library_permissions'
      AND policyname = 'library_permissions_policy';
    `);
    
    if (policyRows.length > 0) {
      console.log(`   ✅ Policy library_permissions_policy exists`);
      console.log(`   Command: ${policyRows[0].cmd}`);
    } else {
      console.log(`   ❌ Policy library_permissions_policy not found`);
    }
    
    // Check for trigger
    const { rows: triggerRows } = await client.query(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgname = 'auto_create_library_owner_permission';
    `);
    
    if (triggerRows.length > 0) {
      console.log(`   ✅ Trigger auto_create_library_owner_permission exists`);
    } else {
      console.log(`   ⚠️  Trigger auto_create_library_owner_permission not found`);
    }
    
    console.log('\n🎉 Migration verification complete!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', err.message);
    console.error('   Error code:', err.code);
    console.error('   Error detail:', err.detail);
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
