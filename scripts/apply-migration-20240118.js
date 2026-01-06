if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

#!/usr/bin/env node
/**
 * Apply Character Reference Images Migration
 * Executes: supabase/migrations/20240118000000_character_reference_images.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://lendybmmnlqelrhkhdyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  console.log('🔄 Applying Character Reference Images Migration...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Read migration SQL
  const migrationPath = path.join(__dirname, '../supabase/migrations/20240118000000_character_reference_images.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📝 Migration SQL loaded');
  console.log('🚀 Executing migration...\n');
  
  // Execute the full migration as one statement
  try {
    // Use raw SQL execution via PostgREST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      console.log('⚠️  RPC method not available, using alternative approach...\n');
      console.log('MANUAL MIGRATION REQUIRED:');
      console.log('1. Open: https://supabase.com/dashboard/project/lendybmmnlqelrhkhdyc');
      console.log('2. Go to: SQL Editor');
      console.log('3. Paste SQL from: supabase/migrations/20240118000000_character_reference_images.sql');
      console.log('4. Execute\n');
      console.log('Then run this script again to verify.');
      return false;
    }
  } catch (err) {
    console.log('⚠️  Direct SQL execution not available\n');
  }
  
  // Verify migration by checking if columns exist
  console.log('🔍 Verifying migration...\n');
  
  try {
    const { data, error } = await supabase
      .from('user_characters')
      .select('id, reference_images, color_palette, expressions')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Migration NOT applied - columns do not exist');
        console.log('Error:', error.message);
        console.log('\nMANUAL STEP REQUIRED:');
        console.log('Run migration SQL in Supabase Dashboard (see above)');
        return false;
      }
      throw error;
    }
    
    console.log('✅ MIGRATION SUCCESSFUL!');
    console.log('   Columns added: reference_images, color_palette, expressions');
    console.log('   Table: user_characters');
    console.log('\n✅ Database schema updated and ready for new features\n');
    return true;
    
  } catch (err) {
    console.log('❌ Verification failed:', err.message);
    return false;
  }
}

applyMigration()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('❌ Migration script error:', err.message);
    process.exit(1);
  });
