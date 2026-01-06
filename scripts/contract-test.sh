#!/usr/bin/env bash
set -euo pipefail

# Required env:
#  API_BASE_URL
#  STORYTAILOR_TEST_EMAIL
#  STORYTAILOR_TEST_PASSWORD
#  SUPABASE_URL
#  SUPABASE_ANON_KEY

if [[ -z "${API_BASE_URL:-}" || -z "${STORYTAILOR_TEST_EMAIL:-}" || -z "${STORYTAILOR_TEST_PASSWORD:-}" || -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "Missing required env: API_BASE_URL, STORYTAILOR_TEST_EMAIL, STORYTAILOR_TEST_PASSWORD, SUPABASE_URL, SUPABASE_ANON_KEY"
  exit 1
fi

node - <<'NODE'
const fetch = global.fetch;
const { createClient } = require('@supabase/supabase-js');

const API_BASE_URL = process.env.API_BASE_URL;
const EMAIL = process.env.STORYTAILOR_TEST_EMAIL;
const PASSWORD = process.env.STORYTAILOR_TEST_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function fail(msg) { console.error(msg); process.exit(1); }
function now() { return Date.now(); }

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

(async () => {
  // Login
  const loginStart = now();
  const login = await jsonFetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  if (!login.res.ok || !login.data?.tokens?.accessToken) fail(`Login failed: ${login.res.status} ${JSON.stringify(login.data)}`);
  const token = login.data.tokens.accessToken;
  const loginMs = now() - loginStart;

  // Supabase client for realtime + polling
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const supaAuth = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (supaAuth.error || !supaAuth.data?.session) fail(`Supabase login failed: ${supaAuth.error?.message}`);
  const userId = supaAuth.data.session.user.id;

  // Create character
  const charResp = await jsonFetch(`${API_BASE_URL}/api/v1/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      name: `ContractTest_${Date.now()}`,
      traits: {
        age: 7,
        species: 'human',
        ethnicity: ['Black'],
        inclusivityTraits: ['wheelchair_manual']
      }
    })
  });
  if (!charResp.res.ok || !charResp.data?.data?.id) fail(`Character create failed: ${charResp.res.status} ${JSON.stringify(charResp.data)}`);
  const characterId = charResp.data.data.id;

  // Realtime subscribe to story inserts/updates (before creation) scoped to userId
  let storyRealtimeInsert = false;
  let storyRealtimeUpdate = false;
  let storyRealtimePayload = null;
  let storyId = null;
  const storyChannel = supabase.channel(`contract-story-${Date.now()}`);
  storyChannel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'stories', filter: `creator_user_id=eq.${userId}` },
    (payload) => {
      // Filter by storyId once known; accept insert/update
      if (storyId && payload.new?.id !== storyId) return;
      if (!storyId && payload.new?.id) storyId = payload.new.id;
      if (payload.eventType === 'INSERT') storyRealtimeInsert = true;
      if (payload.eventType === 'UPDATE') storyRealtimeUpdate = true;
      storyRealtimePayload = payload;
    }
  );
  let storySubStatus = 'INIT';
  await new Promise((resolve) => {
    storyChannel.subscribe((status) => {
      storySubStatus = status;
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') resolve();
    });
  });
  if (storySubStatus !== 'SUBSCRIBED') fail(`Realtime subscribe failed: ${storySubStatus}`);

  async function createStoryAndSnapshot(label, generateAssetsValue) {
    const payload = { characterId, generateAssets: generateAssetsValue };
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-test-mode': 'true' };
    console.log(`POST_STORIES_${label}_REQUEST`, JSON.stringify({ url: `${API_BASE_URL}/api/v1/stories`, headers: { ...headers, Authorization: 'Bearer <redacted>' }, body: payload }, null, 2));
    const storyStart = now();
    const storyResp = await jsonFetch(`${API_BASE_URL}/api/v1/stories`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const storyMs = now() - storyStart;
    console.log(`POST_STORIES_${label}_RESPONSE`, JSON.stringify({ status: storyResp.res.status, body: storyResp.data, durationMs: storyMs }, null, 2));
    if (!storyResp.res.ok || !storyResp.data?.data?.id) return { storyId: null, storyResp };
    const sid = storyResp.data.data.id;

    // Initial story snapshot
    const storyInitial = await jsonFetch(`${API_BASE_URL}/api/v1/stories/${sid}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`STORY_${label}_INITIAL`, JSON.stringify({
      httpStatus: storyInitial.res.status,
      body: storyInitial.data,
      fields: storyInitial.data?.data ? {
        status: storyInitial.data.data.status,
        asset_generation_status: storyInitial.data.data.asset_generation_status,
        jobs: storyInitial.data.data.jobs || storyInitial.data.data.asset_jobs || null,
        cover_art_url: storyInitial.data.data.cover_art_url,
        scene_art_urls: storyInitial.data.data.scene_art_urls,
        audio_url: storyInitial.data.data.audio_url,
        pdf_url: storyInitial.data.data.pdf_url,
        qr_code_url: storyInitial.data.data.qr_code_url
      } : null
    }, null, 2));

    // Assets status snapshot
    const statusInitial = await jsonFetch(`${API_BASE_URL}/api/v1/stories/${sid}/assets/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`STATUS_${label}_INITIAL`, JSON.stringify({
      httpStatus: statusInitial.res.status,
      body: statusInitial.data
    }, null, 2));

    const initialAgs = statusInitial.data?.data?.asset_generation_status || storyInitial.data?.data?.asset_generation_status;
    const initialCover = statusInitial.data?.data?.cover_art_url || storyInitial.data?.data?.cover_art_url;
    const initialScene0 = Array.isArray(statusInitial.data?.data?.scene_art_urls) ? statusInitial.data.data.scene_art_urls[0] : (Array.isArray(storyInitial.data?.data?.scene_art_urls) ? storyInitial.data.data.scene_art_urls[0] : null);
    const jobsPresent = statusInitial.data?.data?.jobs || statusInitial.data?.data?.asset_jobs || storyInitial.data?.data?.jobs || storyInitial.data?.data?.asset_jobs || null;
    const hasPending = initialAgs?.overall === 'generating' ||
      initialAgs?.assets?.cover?.status === 'generating' ||
      initialAgs?.assets?.beats?.status === 'generating' ||
      initialAgs?.assets?.content?.status === 'generating' ||
      initialAgs?.overall === 'pending' ||
      initialAgs?.assets?.cover?.status === 'pending' ||
      initialAgs?.assets?.beats?.status === 'pending' ||
      initialAgs?.assets?.content?.status === 'pending';

    return {
      storyId: sid,
      initialCover,
      initialScene0,
      jobsPresent,
      hasPending
    };
  }

  // Control experiments A (array) and B (boolean)
  const storyA = await createStoryAndSnapshot('A_ARRAY', ['cover', 'scene_1']);
  const storyB = await createStoryAndSnapshot('B_BOOL', true);

  // If either returns null id, fail with that response
  if (!storyA.storyId) fail('Story A creation failed');
  if (!storyB.storyId) fail('Story B creation failed');

  // If A has no jobs/pending and B does, treat as contract mismatch; otherwise we proceed to observe A
  if (!storyA.jobsPresent && !storyA.hasPending && !storyA.initialCover && !storyA.initialScene0 &&
      (storyB.jobsPresent || storyB.hasPending || storyB.initialCover || storyB.initialScene0)) {
    fail('Story A (generateAssets array) shows no jobs/pending but Story B (boolean) does; request contract mismatch suspected');
  }

  // Use Story A for full pipeline verification
  storyId = storyA.storyId;

  // Wait for realtime OR polling progress
  const realtimeDeadline = now() + 600000; // up to 10m for first progress
  let pollingProgressSeen = false;
  let coverReady = false;
  let scene1Ready = false;
  let publicUrl = `${API_BASE_URL}/api/v1/stories/${storyId}`;

  while (now() < realtimeDeadline && !(coverReady && scene1Ready)) {
    if (storyRealtimeInsert || storyRealtimeUpdate) break;
    const statusResp = await jsonFetch(`${API_BASE_URL}/api/v1/stories/${storyId}/assets/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (statusResp.res.ok && statusResp.data?.data) {
      const d = statusResp.data.data;
      const overall = d.asset_generation_status?.overall;
      const coverUrl = d.cover_art_url;
      const scene1 = Array.isArray(d.scene_art_urls) ? d.scene_art_urls[0] : null;
      const jobs = d.jobs || d.asset_jobs || null;

      // Heartbeat every 30s
      console.log('HEARTBEAT', JSON.stringify({
        timestamp: new Date().toISOString(),
        overall,
        cover_status: d.asset_generation_status?.assets?.cover?.status || (coverUrl ? 'ready' : 'unknown'),
        scene1_status: d.asset_generation_status?.assets?.beats?.status || (scene1 ? 'ready' : 'unknown'),
        coverUrlPresent: !!coverUrl,
        scene1Present: !!scene1,
        jobs
      }, null, 2));

      // Stuck detection
      if (jobs && Array.isArray(jobs)) {
        for (const job of jobs) {
          const started = job.started_at ? new Date(job.started_at).getTime() : null;
          const nowTs = Date.now();
          if (job.status === 'failed') {
            fail(`JOB STUCK failed: ${JSON.stringify(job)}`);
          }
          if (job.status === 'generating' && started && nowTs - started > 10 * 60 * 1000) {
            fail(`JOB STUCK >10m: ${JSON.stringify(job)}`);
          }
        }
      }

      if (overall === 'generating' || coverUrl || scene1) pollingProgressSeen = true;
      coverReady = !!coverUrl;
      scene1Ready = !!scene1;
      if (coverReady && scene1Ready) {
        publicUrl = d.public_url || publicUrl;
        break;
      }
    }
    await new Promise(r => setTimeout(r, 5000));
  }

  if (!storyRealtimeInsert && !storyRealtimeUpdate && !pollingProgressSeen) {
    // one more immediate status check before failing to avoid race
    const statusResp = await jsonFetch(`${API_BASE_URL}/api/v1/stories/${storyId}/assets/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (statusResp.res.ok && statusResp.data?.data) {
      const d = statusResp.data.data;
      const overall = d.asset_generation_status?.overall;
      const coverUrl = d.cover_art_url;
      const scene1 = Array.isArray(d.scene_art_urls) ? d.scene_art_urls[0] : null;
      if (overall === 'generating' || coverUrl || scene1) {
        pollingProgressSeen = true;
        coverReady = coverReady || !!coverUrl;
        scene1Ready = scene1Ready || !!scene1;
      }
    }
    if (!storyRealtimeInsert && !storyRealtimeUpdate && !pollingProgressSeen) {
      fail('No realtime event and no polling progress observed for story');
    }
  }

  // Continue polling until cover and scene_1 exist (timeout 10m total from start)
  const pollDeadline = now() + 20 * 60 * 1000; // allow up to 20m for full asset readiness
  while (now() < pollDeadline) {
    const statusResp = await jsonFetch(`${API_BASE_URL}/api/v1/stories/${storyId}/assets/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (statusResp.res.ok && statusResp.data?.data) {
      const d = statusResp.data.data;
      coverReady = !!d.cover_art_url;
      scene1Ready = Array.isArray(d.scene_art_urls) && d.scene_art_urls[0];
      if (coverReady && scene1Ready) {
        publicUrl = d.public_url || publicUrl;
        break;
      }
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  if (!coverReady || !scene1Ready) fail('Assets not ready (cover and scene_1)');

  // Assert canonical fields on GET /stories/:id
  const storyGet = await jsonFetch(`${API_BASE_URL}/api/v1/stories/${storyId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!storyGet.res.ok || !storyGet.data?.data) fail(`Story fetch failed: ${storyGet.res.status} ${JSON.stringify(storyGet.data)}`);
  const storyData = storyGet.data.data;
  if (!storyData.cover_art_url) fail('Story missing cover_art_url');
  if (!Array.isArray(storyData.scene_art_urls) || !storyData.scene_art_urls[0]) fail('Story missing scene_art_urls[0]');

  const pathSatisfied = storyRealtimeInsert
    ? 'realtime: insert'
    : storyRealtimeUpdate
      ? 'realtime: update'
      : 'polling: assets progress';

  console.log(`PASS ${storyId} ${publicUrl} (${pathSatisfied})`);
})();
NODE

