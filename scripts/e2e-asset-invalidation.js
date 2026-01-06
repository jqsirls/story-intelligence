#!/usr/bin/env node
/**
 * E2E invalidation test (staging recommended):
 * - Create story + finalize to generate all assets
 * - Mutate ONLY beat #2 visualDescription in metadata.keyBeats
 * - Call finalize again
 * - Verify only beat #2 image URL changes; cover/audio and other beats remain
 *
 * Usage:
 *   node scripts/e2e-asset-invalidation.js [staging|production]
 */
const { execFileSync } = require('child_process')
const crypto = require('crypto')

const REGION = 'us-east-1'
const env = process.argv[2] || 'staging'
if (!['staging', 'production'].includes(env)) {
  console.error('Usage: node scripts/e2e-asset-invalidation.js [staging|production]')
  process.exit(2)
}

const prefix = `/storytailor-${env}`
const functionName = env === 'production' ? 'storytailor-content-agent-production' : 'storytailor-content-agent-staging'

function awsText(args) {
  return execFileSync('aws', args, { encoding: 'utf8' }).trim()
}

function getSsm(name, decrypt) {
  try {
    const args = ['ssm', 'get-parameter', '--name', name]
    if (decrypt) args.push('--with-decryption')
    args.push('--query', 'Parameter.Value', '--output', 'text')
    const value = awsText(args)
    return value || null
  } catch {
    return null
  }
}

async function supabaseJson(url, key, path, init) {
  const full = `${url}${path}`
  const res = await fetch(full, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init && init.headers ? init.headers : {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

function uuidv4() {
  return crypto.randomUUID()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function invokeLambda(payloadObj) {
  const tmp = `/tmp/storytailor-inv-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
  require('fs').writeFileSync(tmp, JSON.stringify(payloadObj))
  const responsePath = `${tmp}.out.json`

  execFileSync(
    'aws',
    [
      'lambda',
      'invoke',
      '--function-name',
      functionName,
      '--region',
      REGION,
      '--payload',
      `file://${tmp}`,
      '--cli-binary-format',
      'raw-in-base64-out',
      responsePath,
    ],
    { stdio: 'inherit' }
  )

  const raw = require('fs').readFileSync(responsePath, 'utf8')
  const parsed = JSON.parse(raw)
  return typeof parsed.body === 'string' ? JSON.parse(parsed.body) : parsed
}

function beatUrlMap(beatImages) {
  const map = new Map()
  for (const b of Array.isArray(beatImages) ? beatImages : []) {
    if (!b || typeof b.beatNumber !== 'number' || typeof b.imageUrl !== 'string') continue
    if (!b.imageUrl) continue
    map.set(b.beatNumber, b.imageUrl)
  }
  return map
}

function isComplete(content) {
  const cover = content.coverImageUrl || ''
  const audio = content.audioUrl || ''
  const beats = beatUrlMap(content.beatImages)
  return !!cover && !!audio && [1, 2, 3, 4].every(n => beats.has(n))
}

async function pollStory(supabaseUrl, supabaseKey, storyId, deadlineMs) {
  while (Date.now() < deadlineMs) {
    const rows = await supabaseJson(
      supabaseUrl,
      supabaseKey,
      `/rest/v1/stories?id=eq.${encodeURIComponent(storyId)}&select=content`,
      { method: 'GET' }
    )
    const storyRow = Array.isArray(rows) ? rows[0] : null
    const content = storyRow?.content
    if (content && isComplete(content)) return content
    await sleep(10000)
  }
  throw new Error('Timed out polling story for completion')
}

async function main() {
  console.log(`\n[INV] Environment: ${env}`)
  console.log(`[INV] Lambda: ${functionName}`)

  const supabaseUrl =
    getSsm(`${prefix}/supabase/url`, false) ||
    getSsm(`${prefix}/supabase-url`, false) ||
    process.env.SUPABASE_URL
  const supabaseServiceKey =
    getSsm(`${prefix}/supabase/service-key`, true) ||
    getSsm(`${prefix}/supabase-service-key`, true) ||
    process.env.SUPABASE_SERVICE_KEY

  assert(supabaseUrl, 'Missing Supabase URL')
  assert(supabaseServiceKey, 'Missing Supabase service key')

  const userId = uuidv4()
  const email = `e2e-inv-${env}-${Date.now()}@storytailor.test`
  await supabaseJson(supabaseUrl, supabaseServiceKey, `/rest/v1/users`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ id: userId, email, email_confirmed: true, age: 10 }),
  })

  const sessionId = `inv-session-${Date.now()}`
  const createResp = invokeLambda({
    action: 'generate_story',
    userId,
    sessionId,
    characterName: 'Invalidation Hero',
    characterTraits: { age: 10, species: 'human' },
    storyType: 'adventure',
    userAge: 10,
    conversationPhase: 'story_planning',
  })
  assert(createResp.success === true, `Story planning failed: ${createResp.error || 'unknown error'}`)
  const storyId = createResp.data?.story?.storyId
  assert(typeof storyId === 'string' && storyId, 'Missing storyId')
  console.log(`[INV] storyId: ${storyId}`)

  const finalizeResp1 = invokeLambda({
    action: 'generate_story',
    userId,
    sessionId,
    storyId,
    conversationPhase: 'finalize',
    characterName: 'Invalidation Hero',
    userAge: 10,
    storyType: 'adventure',
  })
  assert(finalizeResp1.success === true, 'Finalize #1 failed')

  const content1 = await pollStory(supabaseUrl, supabaseServiceKey, storyId, Date.now() + 10 * 60 * 1000)
  const cover1 = content1.coverImageUrl
  const audio1 = content1.audioUrl
  const beats1 = beatUrlMap(content1.beatImages)
  console.log(`[INV] initial cover: ${cover1}`)
  console.log(`[INV] initial audio: ${audio1}`)
  console.log(`[INV] initial beat2: ${beats1.get(2)}`)

  // Mutate only beat 2 visualDescription
  const keyBeats = Array.isArray(content1.metadata?.keyBeats) ? content1.metadata.keyBeats : null
  assert(keyBeats && keyBeats.length >= 4, 'Missing keyBeats in story metadata')

  const nextKeyBeats = keyBeats.map((b, idx) => {
    if (idx !== 1) return b
    return { ...b, visualDescription: `${b.visualDescription} (now include a bright red balloon)` }
  })

  const updatedContent = {
    ...content1,
    metadata: {
      ...content1.metadata,
      keyBeats: nextKeyBeats,
    },
  }

  await supabaseJson(supabaseUrl, supabaseServiceKey, `/rest/v1/stories?id=eq.${encodeURIComponent(storyId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ content: updatedContent }),
  })

  const finalizeResp2 = invokeLambda({
    action: 'generate_story',
    userId,
    sessionId,
    storyId,
    conversationPhase: 'finalize',
    characterName: 'Invalidation Hero',
    userAge: 10,
    storyType: 'adventure',
  })
  assert(finalizeResp2.success === true, 'Finalize #2 failed')

  const content2 = await pollStory(supabaseUrl, supabaseServiceKey, storyId, Date.now() + 10 * 60 * 1000)
  const cover2 = content2.coverImageUrl
  const audio2 = content2.audioUrl
  const beats2 = beatUrlMap(content2.beatImages)

  console.log(`[INV] final cover: ${cover2}`)
  console.log(`[INV] final audio: ${audio2}`)
  console.log(`[INV] final beat2: ${beats2.get(2)}`)

  assert(cover1 === cover2, 'Cover URL changed; expected cover to be preserved')
  assert(audio1 === audio2, 'Audio URL changed; expected audio to be preserved')
  assert(beats1.get(1) === beats2.get(1), 'Beat 1 changed; expected preserved')
  assert(beats1.get(3) === beats2.get(3), 'Beat 3 changed; expected preserved')
  assert(beats1.get(4) === beats2.get(4), 'Beat 4 changed; expected preserved')
  assert(beats1.get(2) !== beats2.get(2), 'Beat 2 did not change; expected regeneration')

  console.log('\n[INV] ✅ Invalidation test passed (only beat #2 regenerated)')
}

main().catch(err => {
  console.error('\n[INV] ❌ Failed:', err.message)
  process.exit(1)
})

