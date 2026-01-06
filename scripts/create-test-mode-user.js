#!/usr/bin/env node

/**
 * Create a test user with test_mode_authorized enabled
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createTestUser() {
  const timestamp = Date.now();
  const email = `test-mode-${timestamp}@storytailor.test`;
  const password = 'TestMode123!@#';
  
  console.log('🔄 Creating test user with test_mode_authorized...');
  console.log(`Email: ${email}`);
  
  // 1. Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (authError) {
    console.error('❌ Failed to create auth user:', authError.message);
    process.exit(1);
  }
  
  console.log('✅ Auth user created:', authUser.user.id);
  
  // 2. Create public user record
  const { error: publicUserError } = await supabase
    .from('users')
    .insert({
      id: authUser.user.id,
      email: authUser.user.email,
      is_minor: false,
      policy_version: 'v1.0.0',
      evaluated_at: new Date().toISOString(),
      test_mode_authorized: true  // Enable test mode
    });
  
  if (publicUserError) {
    console.error('❌ Failed to create public user:', publicUserError.message);
    process.exit(1);
  }
  
  console.log('✅ Public user created with test_mode_authorized = true');
  
  // 3. Verify
  const { data: verifyUser, error: verifyError } = await supabase
    .from('users')
    .select('id, email, test_mode_authorized')
    .eq('id', authUser.user.id)
    .single();
  
  if (verifyError || !verifyUser.test_mode_authorized) {
    console.error('❌ Verification failed');
    process.exit(1);
  }
  
  console.log('✅ Verification passed');
  
  // 4. Sign in to get access token
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (signInError) {
    console.error('❌ Failed to sign in:', signInError.message);
    process.exit(1);
  }
  
  console.log('✅ Sign in successful');
  
  // 5. Output credentials
  console.log('');
  console.log('═'.repeat(80));
  console.log('✅ TEST USER CREATED SUCCESSFULLY');
  console.log('═'.repeat(80));
  console.log('');
  console.log('User ID:', authUser.user.id);
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Test Mode Authorized: true');
  console.log('');
  console.log('Access Token (use for API calls):');
  console.log(signInData.session.access_token);
  console.log('');
  console.log('To use in tests:');
  console.log(`export TEST_USER_ID="${authUser.user.id}"`);
  console.log(`export TEST_USER_EMAIL="${email}"`);
  console.log(`export TEST_USER_PASSWORD="${password}"`);
  console.log(`export TEST_USER_TOKEN="${signInData.session.access_token}"`);
  console.log('');
  console.log('═'.repeat(80));
  
  // Save to file
  const fs = require('fs');
  const path = require('path');
  const outputFile = path.join(__dirname, '../test-results/test-mode-user-credentials.json');
  
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify({
    userId: authUser.user.id,
    email,
    password,
    accessToken: signInData.session.access_token,
    testModeAuthorized: true,
    createdAt: new Date().toISOString()
  }, null, 2));
  
  console.log(`✅ Credentials saved to: ${outputFile}`);
}

createTestUser().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

