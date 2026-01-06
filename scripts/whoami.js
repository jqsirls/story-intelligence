#!/usr/bin/env node
/**
 * Whoami Script
 * 
 * Prints current user profile information from the API token.
 * 
 * Usage:
 *   STORYTAILOR_TEST_EMAIL="..." STORYTAILOR_TEST_PASSWORD="..." node scripts/whoami.js
 */

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { createClient } = require('@supabase/supabase-js');

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.storytailor.dev';
const EMAIL = process.env.STORYTAILOR_TEST_EMAIL;
const PASSWORD = process.env.STORYTAILOR_TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Missing STORYTAILOR_TEST_EMAIL or STORYTAILOR_TEST_PASSWORD');
  process.exit(1);
}

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { res, data, ok: res.ok, status: res.status };
}

async function getSSMParam(name) {
  const ssm = new SSMClient({ region: 'us-east-1' });
  const cmd = new GetParameterCommand({ Name: name, WithDecryption: true });
  const out = await ssm.send(cmd);
  return out.Parameter.Value;
}

(async () => {
  try {
    // Initialize Supabase
    const supabaseUrl = await getSSMParam('/storytailor-production/supabase/url');
    const anonKey = await getSSMParam('/storytailor-production/supabase/anon-key');
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Login to API
    const loginRes = await jsonFetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    if (!loginRes.ok || !loginRes.data?.tokens?.accessToken) {
      console.error('❌ Login failed:');
      console.error(`   Status: ${loginRes.status}`);
      console.error(`   Response: ${JSON.stringify(loginRes.data, null, 2)}`);
      process.exit(1);
    }

    const apiToken = loginRes.data.tokens.accessToken;

    // Get user profile
    const profileRes = await jsonFetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });

    if (!profileRes.ok || !profileRes.data?.user) {
      console.error('❌ Failed to fetch user profile:');
      console.error(`   Status: ${profileRes.status}`);
      console.error(`   Response: ${JSON.stringify(profileRes.data, null, 2)}`);
      process.exit(1);
    }

    const userId = profileRes.data.user.id;
    const userEmail = profileRes.data.user.email;
    
    // Login to Supabase to query users table
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD
    });
    if (authErr || !authData?.session) {
      console.error('❌ Supabase login failed:', authErr);
      process.exit(1);
    }

    // Get test_mode_authorized from users table (using authenticated session)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('test_mode_authorized')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Failed to fetch user data from Supabase:', userError);
      process.exit(1);
    }

    const testModeAuthorized = userData?.test_mode_authorized === true;

    // Print user info
    console.log('👤 Current User Profile\n');
    console.log(`User ID: ${userId}`);
    console.log(`Email: ${userEmail}`);
    console.log(`test_mode_authorized: ${testModeAuthorized}`);
    
    if (!testModeAuthorized) {
      console.log('\n⚠️  test_mode_authorized is false');
      console.log('   Run: node scripts/grant-test-mode.js <email>');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR');
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    process.exit(1);
  }
})();

