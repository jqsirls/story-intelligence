const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Usage:');
  console.error('  SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/create-test-user-phase9-node.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  const testEmail = `phase9-test-${Date.now()}@storytailor.com`;
  const testPassword = 'TestPass123!';
  
  console.log('=== Creating Test User for Phase 9 ===');
  console.log('');
  console.log('Email:', testEmail);
  console.log('Password:', testPassword);
  console.log('');
  
  try {
    // Create user in auth.users via admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        first_name: 'Phase9',
        last_name: 'Test',
        age: 14,
        user_type: 'parent'
      }
    });
    
    if (authError) {
      console.error('❌ Auth user creation error:', authError.message);
      console.error('Details:', JSON.stringify(authError, null, 2));
      return;
    }
    
    if (!authUser || !authUser.user) {
      console.error('❌ No user data returned');
      return;
    }
    
    console.log('✅ Auth user created:', authUser.user.id);
    
    // Create user record in users table
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: authUser.user.id,
        email: testEmail,
        first_name: 'Phase9',
        last_name: 'Test',
        age: 14,
        user_type: 'parent',
        is_coppa_protected: false,
        email_confirmed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (userError) {
      console.error('⚠️  Users table upsert error:', userError.message);
      console.error('Details:', JSON.stringify(userError, null, 2));
    } else {
      console.log('✅ User record created in users table');
    }
    
    console.log('');
    console.log('=== Test User Created Successfully ===');
    console.log('');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('User ID:', authUser.user.id);
    console.log('');
    console.log('You can now login to get an access token:');
    console.log(`  curl -X POST https://api.storytailor.dev/api/v1/auth/login \\`);
    console.log(`    -H 'Content-Type: application/json' \\`);
    console.log(`    -d '{"email":"${testEmail}","password":"${testPassword}"}'`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

createTestUser();
