#!/usr/bin/env node
/**
 * Smoke test: character quota bypass
 * Requires env:
 *   STORYTAILOR_TEST_EMAIL
 *   STORYTAILOR_TEST_PASSWORD
 *   API_BASE_URL (default: https://api.storytailor.dev)
 *
 * Passes if POST /api/v1/characters returns 201 for a user with test_mode_authorized=true
 */

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

(async () => {
  try {
    // Login
    const loginRes = await jsonFetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    if (!loginRes.ok || !loginRes.data?.tokens?.accessToken) {
      console.error('❌ Login failed:', loginRes.data);
      process.exit(1);
    }

    const token = loginRes.data.tokens.accessToken;

    // Create character
    const createRes = await jsonFetch(`${API_BASE_URL}/api/v1/characters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: `QuotaBypass_${Date.now()}`,
        traits: {
          age: 7,
          gender: 'female',
          species: 'human',
          ethnicity: ['White'],
          inclusivityTraits: ['wheelchair_manual']
        }
      })
    });

    if (createRes.status !== 201) {
      console.error(`❌ Character create failed. Status: ${createRes.status}`);
      console.error(JSON.stringify(createRes.data, null, 2));
      process.exit(1);
    }

    console.log('✅ PASS quota bypass active (character created)');
    console.log(`Character ID: ${createRes.data?.data?.id || 'unknown'}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR', err);
    process.exit(1);
  }
})();

