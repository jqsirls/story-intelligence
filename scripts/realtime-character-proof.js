#!/usr/bin/env node
/**
 * Minimal character realtime proof:
 * - logs in
 * - creates character
 * - subscribes to public.characters UPDATE id=eq.<characterId>
 * - waits up to 60s for first UPDATE payload, prints it, exits 0
 * - on timeout, exits 1 with diagnostics
 *
 * Env required:
 *  API_BASE_URL
 *  STORYTAILOR_TEST_EMAIL
 *  STORYTAILOR_TEST_PASSWORD
 *  SUPABASE_URL
 *  SUPABASE_ANON_KEY
 */

const { createClient } = require('@supabase/supabase-js');

const API_BASE_URL = process.env.API_BASE_URL;
const EMAIL = process.env.STORYTAILOR_TEST_EMAIL;
const PASSWORD = process.env.STORYTAILOR_TEST_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function requiredEnv() {
  if (!API_BASE_URL || !EMAIL || !PASSWORD || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing env. Require: API_BASE_URL, STORYTAILOR_TEST_EMAIL, STORYTAILOR_TEST_PASSWORD, SUPABASE_URL, SUPABASE_ANON_KEY');
    process.exit(1);
  }
}

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

(async () => {
  requiredEnv();

  // Login API
  const login = await jsonFetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  if (!login.res.ok || !login.data?.tokens?.accessToken) {
    console.error('Login failed', login.res.status, login.data);
    process.exit(1);
  }
  const token = login.data.tokens.accessToken;

  // Supabase auth
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const supaAuth = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (supaAuth.error || !supaAuth.data?.session) {
    console.error('Supabase auth failed', supaAuth.error);
    process.exit(1);
  }

  // Create character
  const charResp = await jsonFetch(`${API_BASE_URL}/api/v1/characters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: `RealtimeProof_${Date.now()}`,
      traits: {
        age: 7,
        species: 'human',
        ethnicity: ['Black'],
        inclusivityTraits: ['wheelchair_manual']
      }
    })
  });
  if (!charResp.res.ok || !charResp.data?.data?.id) {
    console.error('Character create failed', charResp.res.status, charResp.data);
    process.exit(1);
  }
  const characterId = charResp.data.data.id;

  let payloadReceived = null;
  let subscribeStatus = null;
  const filter = `id=eq.${characterId}`;

  const channel = supabase.channel(`char-proof-${characterId}`);
  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'characters', filter },
    (payload) => {
      if (!payloadReceived) {
        payloadReceived = payload;
        console.log(JSON.stringify(payload, null, 2));
        console.log('PASS character realtime observed');
        process.exit(0);
      }
    }
  );
  subscribeStatus = await channel.subscribe();

  const deadline = Date.now() + 180000; // 180s (character art generation can exceed 60s)
  while (!payloadReceived && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 500));
  }

  if (!payloadReceived) {
    console.error('FAIL character realtime NOT observed');
    console.error('subscribeStatus:', subscribeStatus);
    console.error('filter:', filter);
    const session = await supabase.auth.getSession();
    console.error('auth session exists:', !!session.data?.session);
    process.exit(1);
  }
})();


