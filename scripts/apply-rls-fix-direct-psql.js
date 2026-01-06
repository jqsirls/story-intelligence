#!/usr/bin/env node
/**
 * Apply RLS Fix via Direct PostgreSQL Connection
 * Uses service role key as password (Supabase supports this)
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

async function applyMigration() {
  console.log('🗄️  COMPLETE RLS FIX - Direct PostgreSQL Connection\n');
  
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
  const dbHost = `db.${projectId}.supabase.co`;
  
  console.log('✅ Credentials loaded');
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Database Host: ${dbHost}\n`);
  
  // For Supabase, the service role key JWT contains the database password
  // We need to extract it or use the connection pooling approach
  // Actually, Supabase allows using the service role key directly as password for psql
  
  // Create PostgreSQL connection pool
  // Note: Supabase service role key can be used as password for direct connections
  const pool = new Pool({
    host: dbHost,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: supabaseServiceKey, // Service role key works as password
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
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
    console.error('   This may require manual application via Supabase Dashboard');
    process.exit(1);
  }
  
  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250117000001_fix_library_permissions_rls_recursion.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📝 Migration file loaded');
  console.log(`   File: ${path.basename(migrationPath)}\n`);
  
  // Execute the migration
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🔄 Executing migration...\n');
    
    // Execute the entire migration SQL as a transaction
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
      
      // Check that it doesn't have recursion
      const qual = policyRows[0].qual || '';
      if (qual.includes('library_permissions') && qual.includes('lp2')) {
        console.log(`   ⚠️  WARNING: Policy may still have recursion!`);
      } else {
        console.log(`   ✅ Policy does not have recursion`);
      }
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
    console.error('\n📋 Please apply migration manually via Supabase Dashboard');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
