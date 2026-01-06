#!/usr/bin/env node

/**
 * Add test_mode_authorized column directly via Supabase admin
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function addColumn() {
  console.log('🔄 Checking if test_mode_authorized column exists...');
  
  // Try to select the column - if it fails, we need to add it
  const { data, error } = await supabase
    .from('users')
    .select('id, test_mode_authorized')
    .limit(1);
  
  if (!error) {
    console.log('✅ Column already exists!');
    return true;
  }
  
  if (error.message.includes('column') && error.message.includes('does not exist')) {
    console.log('⚠️  Column does not exist. Please add it manually via Supabase dashboard:');
    console.log('');
    console.log('SQL to run:');
    console.log('ALTER TABLE users ADD COLUMN test_mode_authorized BOOLEAN DEFAULT FALSE NOT NULL;');
    console.log('CREATE INDEX idx_users_test_mode_authorized ON users(test_mode_authorized) WHERE test_mode_authorized = TRUE;');
    console.log('');
    console.log('Or run via psql/pg_admin with service role credentials.');
    return false;
  }
  
  console.error('❌ Unexpected error:', error);
  return false;
}

addColumn().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

