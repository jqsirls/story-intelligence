#!/usr/bin/env node

/**
 * Apply migration using direct Postgres connection
 * Requires: npm install pg
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Parse Supabase URL to get connection details
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lendybmmnlqelrhkhdyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

// Extract project ID from Supabase URL
const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectId) {
  console.error('❌ Error: Could not parse project ID from SUPABASE_URL');
  process.exit(1);
}

// Supabase Postgres connection string format
// For direct connection, we need: db.<project-ref>.supabase.co
const connectionString = `postgresql://postgres.${projectId}:${SUPABASE_SERVICE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

async function applyMigration() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔄 Connecting to Supabase Postgres...');
    await client.connect();
    console.log('✅ Connected!');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251229150000_add_test_mode_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Applying migration...');
    
    // Execute migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    
    // Verify
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'test_mode_authorized'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: test_mode_authorized column exists');
      console.log('Column details:', result.rows[0]);
    } else {
      console.error('❌ Verification failed: column not found');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();

