#!/usr/bin/env node

/**
 * Apply test_mode_authorized migration to Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('🔄 Applying test_mode_authorized migration...');
  
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, '../supabase/migrations/20251229150000_add_test_mode_column.sql'),
    'utf8'
  );
  
  // Split SQL by semicolons and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    if (statement.length === 0) continue;
    
    console.log(`Executing: ${statement.substring(0, 60)}...`);
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
    
    if (error) {
      // Try direct query if rpc doesn't exist
      const { error: directError } = await supabase.from('_sql').select('*').limit(0);
      
      if (directError) {
        console.error(`❌ Error executing statement: ${error.message}`);
        console.error('Statement:', statement);
        // Continue anyway - column might already exist
      }
    }
  }
  
  // Verify the column was added
  const { data, error } = await supabase
    .from('users')
    .select('test_mode_authorized')
    .limit(1);
  
  if (error) {
    console.error('❌ Migration may have failed:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Migration applied successfully!');
  console.log('✅ test_mode_authorized column is now available in users table');
}

applyMigration().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

