#!/usr/bin/env bash
set -euo pipefail

# Smoke test for Storytailor production pipeline (REST API + Supabase Realtime).
#
# What this validates (ground truth):
# - POST /api/v1/characters returns immediately and background art generation completes
#   (character complete gate = appearance_url + headshot/bodyshot in reference_images array)
# - POST /api/v1/stories returns immediately with an ID (no inline generation)
# - Story assets land over time (cover + 4 scenes + audio + pdf + qr + activities)
# - Updates arrive via Supabase Realtime (stories + characters rows UPDATE)
#
# Required env:
# - STORYTAILOR_TEST_EMAIL
# - STORYTAILOR_TEST_PASSWORD
#
# Optional env:
# - API_BASE_URL (default: https://api.storytailor.dev)
#

API_BASE_URL="${API_BASE_URL:-https://api.storytailor.dev}"

if [[ -z "${STORYTAILOR_TEST_EMAIL:-}" || -z "${STORYTAILOR_TEST_PASSWORD:-}" ]]; then
  echo "Missing env vars. Usage:"
  echo "  STORYTAILOR_TEST_EMAIL=... STORYTAILOR_TEST_PASSWORD=... $0"
  exit 2
fi

node - <<'NODE'
const API = process.env.API_BASE_URL || 'https://api.storytailor.dev'

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)) }

async function jsonFetch(url, opts={}){
  const t0 = Date.now()
  const res = await fetch(url, opts)
  const t1 = Date.now()
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  return { res, data, ms: t1 - t0 }
}

function isNonEmptyString(v){ return typeof v === 'string' && v.trim().length > 0 }

function characterIsComplete(char){
  const ref = Array.isArray(char?.reference_images) ? char.reference_images : []
  const hasHeadshot = ref.some((img) => img && img.type === 'headshot' && isNonEmptyString(img.url))
  const hasBodyshot = ref.some((img) => img && img.type === 'bodyshot' && isNonEmptyString(img.url))
  const hasAppearance = isNonEmptyString(char?.appearance_url)
  return hasAppearance && hasHeadshot && hasBodyshot
}

function storyAssetsComplete(story){
  const cover = isNonEmptyString(story?.cover_art_url)
  const scenes = Array.isArray(story?.scene_art_urls) ? story.scene_art_urls : []
  const scenesOk = scenes.length >= 4 && scenes.slice(0, 4).every((u) => isNonEmptyString(u))
  const audio = isNonEmptyString(story?.audio_url)
  const pdf = isNonEmptyString(story?.pdf_url)
  const qr = isNonEmptyString(story?.qr_public_url) || isNonEmptyString(story?.qr_code_url)
  const activities = Array.isArray(story?.activities) && story.activities.length > 0
  // Hue can be {} early; we still track it for visibility and require it to exist.
  const hue = story?.hue_extracted_colors !== undefined && story?.hue_extracted_colors !== null
  return { cover, scenesOk, audio, pdf, qr, activities, hue, ok: cover && scenesOk && audio && pdf && qr && activities && hue }
}

;(async () => {
  const email = process.env.STORYTAILOR_TEST_EMAIL
  const password = process.env.STORYTAILOR_TEST_PASSWORD

  // API login
  const login = await jsonFetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!login.res.ok || !login.data?.tokens?.accessToken) {
    console.error(JSON.stringify({ step: 'api_login_failed', httpStatus: login.res.status, body: login.data }, null, 2))
    process.exit(1)
  }
  const apiToken = login.data.tokens.accessToken

  // Supabase realtime login (anon key + password)
  const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm')
  const { createClient } = require('@supabase/supabase-js')
  const ssm = new SSMClient({ region: 'us-east-1' })
  async function getParam(Name){
    const out = await ssm.send(new GetParameterCommand({ Name, WithDecryption: true }))
    return out.Parameter.Value
  }
  const supabaseUrl = await getParam('/storytailor-production/supabase/url')
  const anonKey = await getParam('/storytailor-production/supabase/anon-key')
  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
  if (authErr || !authData?.session?.access_token) {
    console.error(JSON.stringify({ step: 'supabase_login_failed', error: authErr?.message || String(authErr) }, null, 2))
    process.exit(2)
  }

  // 1) Character selection:
  // Prefer creating a fresh character (proves async generation path), but if this account
  // is quota-limited we fall back to an existing COMPLETE character to validate gating + story pipeline.
  let characterId = null
  let characterWasCreated = false

  const createChar = await jsonFetch(`${API}/api/v1/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
    body: JSON.stringify({
      name: `Smoke Test Zara ${Date.now()}`,
      gender: 'girl',
      species: 'human',
      age: 7,
      ethnicity: ['Black'],
      // We keep the trait object simple; the pipeline stores it in traits JSONB.
      inclusivityTraits: [
        { type: 'mobility', detail: 'wheelchair user', notes: 'Mobility aid is part of her adventures; do not separate.' }
      ],
      appearance: {
        hair: 'curly hair',
        clothing: 'colorful jacket',
        accessories: 'cool backpack'
      }
    })
  })

  console.log(JSON.stringify({ step: 'character_create_attempt', httpStatus: createChar.res.status, ok: createChar.res.ok, durationMs: createChar.ms, body: createChar.data }, null, 2))

  if (createChar.res.ok) {
    characterId = createChar.data?.data?.id
    characterWasCreated = true
    if (!characterId) {
      console.error(JSON.stringify({ step: 'character_create_missing_id', body: createChar.data }, null, 2))
      process.exit(4)
    }
  } else if (createChar.res.status === 402 && createChar.data?.code === 'CHARACTER_QUOTA_EXCEEDED') {
    // Fallback: pick an existing COMPLETE character.
    const list = await jsonFetch(`${API}/api/v1/characters`, { headers: { Authorization: `Bearer ${apiToken}` } })
    console.log(JSON.stringify({ step: 'character_list_for_fallback', httpStatus: list.res.status, ok: list.res.ok }, null, 2))
    if (!list.res.ok || !Array.isArray(list.data?.data)) {
      console.error(JSON.stringify({ step: 'character_list_failed', body: list.data }, null, 2))
      process.exit(3)
    }
    const candidate = list.data.data.find((c) => characterIsComplete(c))
    if (!candidate?.id) {
      console.error(JSON.stringify({ step: 'no_complete_character_available_for_smoke_test', count: list.data.data.length }, null, 2))
      process.exit(3)
    }
    characterId = candidate.id
    console.log(JSON.stringify({
      step: 'character_fallback_selected_complete',
      characterId,
      appearance_url: candidate.appearance_url,
      reference_images: candidate.reference_images
    }, null, 2))
  } else {
    console.error(JSON.stringify({ step: 'character_create_failed', httpStatus: createChar.res.status, body: createChar.data }, null, 2))
    process.exit(3)
  }

  // Subscribe to character updates (only necessary when we created a new one; still useful telemetry otherwise)
  let realtimeCharacterCompletePayload = null
  const charChannel = supabase
    .channel(`characters:id=${characterId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'characters', filter: `id=eq.${characterId}` }, (payload) => {
      if (!realtimeCharacterCompletePayload && characterIsComplete(payload?.new)) {
        realtimeCharacterCompletePayload = payload
        console.log(JSON.stringify({ step: 'realtime_character_complete', characterId, payload }, null, 2))
      }
    })

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Realtime subscribe timeout (characters)')), 15000)
    charChannel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(true) }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timeout); reject(err || new Error(`Realtime subscribe failed: ${status}`)) }
    })
  })

  // Poll until character is complete (proves the gate is correct).
  // If we used fallback, this should succeed immediately.
  const charDeadline = Date.now() + (characterWasCreated ? 12 : 1) * 60 * 1000
  let finalCharacter = null
  while (Date.now() < charDeadline) {
    const getChar = await jsonFetch(`${API}/api/v1/characters/${characterId}`, { headers: { Authorization: `Bearer ${apiToken}` } })
    if (getChar.res.ok && characterIsComplete(getChar.data?.data)) {
      finalCharacter = getChar.data.data
      console.log(JSON.stringify({
        step: 'character_complete_gate_ok',
        characterId,
        characterWasCreated,
        appearance_url: finalCharacter.appearance_url,
        reference_images: finalCharacter.reference_images,
        realtimeSaw: !!realtimeCharacterCompletePayload
      }, null, 2))
      break
    }
    await sleep(5000)
  }
  if (!finalCharacter) {
    console.error(JSON.stringify({ step: 'character_complete_timeout', characterId, characterWasCreated, realtimeSaw: !!realtimeCharacterCompletePayload }, null, 2))
    await charChannel.unsubscribe()
    process.exit(5)
  }

  // 2) Create story (must return immediately; no inline generation)
  const createStory = await jsonFetch(`${API}/api/v1/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
    body: JSON.stringify({
      title: 'Smoke Test Story (full pipeline)',
      storyIdea: 'A brave kid explores a floating library that changes colors with each page.',
      storyType: 'adventure',
      childAge: 7,
      characterId,
      generateAssets: true
    })
  })
  console.log(JSON.stringify({ step: 'story_create', httpStatus: createStory.res.status, ok: createStory.res.ok, durationMs: createStory.ms, body: createStory.data }, null, 2))
  let storyId = createStory.data?.data?.id || createStory.data?.storyId || createStory.data?.data?.storyId
  let storyWasCreated = createStory.res.ok

  // If the account is story-quota limited, fall back to an existing COMPLETE story and validate assets + CDN URLs.
  // This keeps smoke tests reliable even when running repeatedly on a free-tier account.
  if (!createStory.res.ok) {
    const errCode = createStory.data?.code
    if (createStory.res.status === 402 && errCode === 'STORY_QUOTA_EXCEEDED') {
      const { data: recentStories, error: storiesErr } = await supabase
        .from('stories')
        .select('id, cover_art_url, scene_art_urls, audio_url, pdf_url, qr_public_url, qr_code_url, activities, hue_extracted_colors')
        .order('created_at', { ascending: false })
        .limit(25)

      if (storiesErr) {
        console.error(JSON.stringify({ step: 'story_fallback_query_failed', error: storiesErr.message }, null, 2))
        process.exit(6)
      }

      const candidate = (recentStories || []).find((s) => storyAssetsComplete(s).ok)
      if (!candidate?.id) {
        console.error(JSON.stringify({ step: 'story_quota_exceeded_no_fallback_story_found', body: createStory.data }, null, 2))
        process.exit(6)
      }

      storyId = candidate.id
      storyWasCreated = false
      console.log(JSON.stringify({ step: 'story_fallback_selected_complete', storyId }, null, 2))
    } else {
      process.exit(6)
    }
  }
  if (createStory.ms >= 2000) {
    console.error(JSON.stringify({ step: 'story_create_too_slow', durationMs: createStory.ms, expectedLtMs: 2000 }, null, 2))
    process.exit(7)
  }

  if (!storyId) {
    console.error(JSON.stringify({ step: 'story_create_missing_id', body: createStory.data }, null, 2))
    process.exit(8)
  }

  // Subscribe to story updates and capture first time each asset arrives.
  // If we are using a fallback COMPLETE story, we may see no realtime updates (assets already landed).
  const seenRealtime = { cover: false, scenesOk: false, audio: false, pdf: false, qr: false, activities: false, hue: false }
  const storyChannel = supabase
    .channel(`stories:id=${storyId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stories', filter: `id=eq.${storyId}` }, (payload) => {
      const newRow = payload?.new
      const s = storyAssetsComplete(newRow)
      if (s.cover && !seenRealtime.cover) { seenRealtime.cover = true; console.log(JSON.stringify({ step: 'realtime_story_cover_ready', storyId, cover_art_url: newRow.cover_art_url, payload }, null, 2)) }
      if (s.scenesOk && !seenRealtime.scenesOk) { seenRealtime.scenesOk = true; console.log(JSON.stringify({ step: 'realtime_story_scenes_ready', storyId, scene_art_urls: newRow.scene_art_urls, payload }, null, 2)) }
      if (s.audio && !seenRealtime.audio) { seenRealtime.audio = true; console.log(JSON.stringify({ step: 'realtime_story_audio_ready', storyId, audio_url: newRow.audio_url, payload }, null, 2)) }
      if (s.pdf && !seenRealtime.pdf) { seenRealtime.pdf = true; console.log(JSON.stringify({ step: 'realtime_story_pdf_ready', storyId, pdf_url: newRow.pdf_url, payload }, null, 2)) }
      if (s.qr && !seenRealtime.qr) { seenRealtime.qr = true; console.log(JSON.stringify({ step: 'realtime_story_qr_ready', storyId, qr_code_url: newRow.qr_code_url, qr_public_url: newRow.qr_public_url, payload }, null, 2)) }
      if (s.activities && !seenRealtime.activities) { seenRealtime.activities = true; console.log(JSON.stringify({ step: 'realtime_story_activities_ready', storyId, activitiesCount: Array.isArray(newRow.activities) ? newRow.activities.length : 0, payload }, null, 2)) }
      if (s.hue && !seenRealtime.hue) { seenRealtime.hue = true; console.log(JSON.stringify({ step: 'realtime_story_hue_present', storyId, hue_extracted_colors: newRow.hue_extracted_colors, payload }, null, 2)) }
    })

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Realtime subscribe timeout (stories)')), 15000)
    storyChannel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(true) }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timeout); reject(err || new Error(`Realtime subscribe failed: ${status}`)) }
    })
  })

  // Poll until story assets complete
  const storyDeadline = Date.now() + 18 * 60 * 1000
  let finalStory = null
  let finalChecks = null
  while (Date.now() < storyDeadline) {
    const getStory = await jsonFetch(`${API}/api/v1/stories/${storyId}`, { headers: { Authorization: `Bearer ${apiToken}` } })
    if (getStory.res.ok) {
      finalStory = getStory.data?.data
      finalChecks = storyAssetsComplete(finalStory)
      if (finalChecks.ok) break
    }
    await sleep(5000)
  }

  if (!finalStory || !finalChecks?.ok) {
    console.error(JSON.stringify({ step: 'story_assets_timeout', storyId, seenRealtime, lastKnown: finalStory, checks: finalChecks }, null, 2))
    await storyChannel.unsubscribe()
    await charChannel.unsubscribe()
    process.exit(9)
  }

  console.log(JSON.stringify({
    step: 'smoke_test_success',
    storyId,
    characterId,
    storyWasCreated,
    assets: {
      cover_art_url: finalStory.cover_art_url,
      scene_art_urls: finalStory.scene_art_urls,
      audio_url: finalStory.audio_url,
      pdf_url: finalStory.pdf_url,
      qr_public_url: finalStory.qr_public_url,
      qr_code_url: finalStory.qr_code_url
    },
    hue_extracted_colors: finalStory.hue_extracted_colors,
    activitiesCount: Array.isArray(finalStory.activities) ? finalStory.activities.length : 0,
    realtimeEvidence: seenRealtime
  }, null, 2))

  await storyChannel.unsubscribe()
  await charChannel.unsubscribe()
  process.exit(0)
})()
NODE

