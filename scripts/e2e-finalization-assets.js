#!/usr/bin/env node
/**
 * End-to-end finalization test:
 * - Creates a test user in Supabase (so FK constraints pass)
 * - Invokes content-agent generate_story (story_planning) → expects immediate story text + assetsStatus pending
 * - Invokes content-agent finalize → enqueues SQS job
 * - Polls Supabase story record until cover + 4 beats + audio are ready
 *
 * Usage:
 *   node scripts/e2e-finalization-assets.js [staging|production]
 */
const { execFileSync } = require('child_process')
const crypto = require('crypto')

const REGION = 'us-east-1'
const env = process.argv[2] || 'staging'
if (!['staging', 'production'].includes(env)) {
  console.error('Usage: node scripts/e2e-finalization-assets.js [staging|production]')
  process.exit(2)
}

const userAge = Number(process.env.E2E_USER_AGE || '7')
if (!Number.isFinite(userAge) || userAge < 3 || userAge > 10) {
  console.error('E2E_USER_AGE must be between 3 and 10')
  process.exit(2)
}

const prefix = `/storytailor-${env}`
const functionName = env === 'production' ? 'storytailor-content-agent-production' : 'storytailor-content-agent-staging'

function awsJson(args) {
  const out = execFileSync('aws', args, { encoding: 'utf8' }).trim()
  return out ? JSON.parse(out) : {}
}

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

async function supabaseFetch(url, key, path, init) {
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
  if (!res.ok) {
    throw new Error(`Supabase ${res.status} ${res.statusText}: ${text}`)
  }
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

function parseLambdaInvokePayload(payloadObj) {
  const tmp = `/tmp/storytailor-e2e-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
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
  const body = typeof parsed.body === 'string' ? JSON.parse(parsed.body) : parsed
  return body
}

function extractStoryId(agentResponse) {
  const storyId = agentResponse?.data?.story?.storyId || agentResponse?.story?.storyId
  assert(typeof storyId === 'string' && storyId.length > 0, 'Missing storyId in content-agent response')
  return storyId
}

function hasAllBeatImages(beatImages) {
  if (!Array.isArray(beatImages)) return false
  const byNumber = new Map()
  for (const b of beatImages) {
    if (!b || typeof b.beatNumber !== 'number' || typeof b.imageUrl !== 'string') continue
    if (!b.imageUrl) continue
    byNumber.set(b.beatNumber, b.imageUrl)
  }
  return [1, 2, 3, 4].every(n => byNumber.has(n))
}

async function main() {
  console.log(`\n[E2E] Environment: ${env}`)
  console.log(`[E2E] Lambda: ${functionName}`)
  if (process.env.E2E_EXPECT_AUDIO_PROVIDER) {
    console.log(`[E2E] Expecting audio provider: ${process.env.E2E_EXPECT_AUDIO_PROVIDER}`)
  }
  if (process.env.E2E_EXPECT_AUDIO_SEGMENTS === 'true') {
    console.log(`[E2E] Expecting chunked audio segments`)
  }

  const supabaseUrl =
    getSsm(`${prefix}/supabase/url`, false) ||
    getSsm(`${prefix}/supabase-url`, false) ||
    process.env.SUPABASE_URL
  const supabaseServiceKey =
    getSsm(`${prefix}/supabase/service-key`, true) ||
    getSsm(`${prefix}/supabase-service-key`, true) ||
    process.env.SUPABASE_SERVICE_KEY

  assert(supabaseUrl, 'Missing Supabase URL (SSM or env)')
  assert(supabaseServiceKey, 'Missing Supabase service key (SSM or env)')

  // Create test user so FK constraints pass (libraries.owner -> users.id)
  const userId = uuidv4()
  const email = `e2e-${env}-${Date.now()}@storytailor.test`
  console.log(`[E2E] Creating test user: ${userId} (${email})`)

  await supabaseFetch(supabaseUrl, supabaseServiceKey, `/rest/v1/users`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      id: userId,
      email,
      email_confirmed: true,
      parent_email: null,
      age: userAge,
    }),
  })

  const sessionId = `e2e-session-${Date.now()}`
  console.log(`[E2E] Creating story (text-only, immediate)`)
  const createResp = parseLambdaInvokePayload({
    action: 'generate_story',
    userId,
    sessionId,
    characterName: 'E2E Hero',
    characterTraits: { age: userAge, species: 'human', disabilities: 'fully mobile' },
    storyType: 'adventure',
    userAge,
    conversationPhase: 'story_planning',
  })

  if (createResp.success !== true) {
    console.error('[E2E] Story planning response:', JSON.stringify(createResp))
    throw new Error('Story planning call did not succeed')
  }
  assert(createResp.data?.story?.content || createResp.data?.story?.title, 'Missing story content in response')
  assert(createResp.data?.assetsStatus, 'Missing assetsStatus in response')

  const storyId = extractStoryId(createResp)
  console.log(`[E2E] storyId: ${storyId}`)
  console.log(`[E2E] Finalizing (enqueue SQS finalization job)`)

  const finalizeResp = parseLambdaInvokePayload({
    action: 'generate_story',
    userId,
    sessionId,
    storyId,
    conversationPhase: 'finalize',
    characterName: 'E2E Hero',
    userAge,
    storyType: 'adventure',
  })

  if (finalizeResp.success !== true) {
    console.error('[E2E] Finalize response:', JSON.stringify(finalizeResp))
    throw new Error('Finalize call did not succeed')
  }

  const deadlineMs = Date.now() + 8 * 60 * 1000
  let last = null

  while (Date.now() < deadlineMs) {
    const rows = await supabaseFetch(
      supabaseUrl,
      supabaseServiceKey,
      `/rest/v1/stories?id=eq.${encodeURIComponent(storyId)}&select=id,title,status,finalized_at,content`,
      { method: 'GET' }
    )

    const storyRow = Array.isArray(rows) ? rows[0] : null
    if (storyRow && storyRow.content) {
      const content = storyRow.content
      const coverImageUrl = content.coverImageUrl || ''
      const beatImages = content.beatImages || []
      const audioUrl = content.audioUrl || ''
      const assetsStatus = content.metadata?.assetsStatus || {}
      const audioProvider = content.metadata?.audioProvider || null
      const audioSegments = content.metadata?.audioSegments || null

      last = { coverImageUrl, beatImages, audioUrl, assetsStatus, audioProvider, audioSegments }

      const coverReady = typeof coverImageUrl === 'string' && coverImageUrl.length > 0
      const beatsReady = hasAllBeatImages(beatImages)
      const audioReady = typeof audioUrl === 'string' && audioUrl.length > 0

      if (coverReady && beatsReady && audioReady) {
        console.log('\n[E2E] ✅ Assets ready')
        console.log(`[E2E] coverImageUrl: ${coverImageUrl}`)
        console.log(`[E2E] beatImages:`)
        for (const b of beatImages) {
          if (b && typeof b.beatNumber === 'number' && b.imageUrl) {
            console.log(`  - beat ${b.beatNumber}: ${b.imageUrl}`)
          }
        }
        console.log(`[E2E] audioUrl: ${audioUrl}`)
        console.log(`[E2E] assetsStatus: ${JSON.stringify(assetsStatus)}`)
        if (audioProvider) console.log(`[E2E] audioProvider: ${audioProvider}`)
        if (audioSegments) console.log(`[E2E] audioSegments: ${JSON.stringify(audioSegments).slice(0, 500)}`)

        const expectedProvider = process.env.E2E_EXPECT_AUDIO_PROVIDER
        if (expectedProvider) {
          assert(audioProvider === expectedProvider, `Expected audioProvider=${expectedProvider}, got ${audioProvider}`)
        }
        if (process.env.E2E_EXPECT_AUDIO_SEGMENTS === 'true') {
          assert(Array.isArray(audioSegments) && audioSegments.length >= 1, 'Expected audioSegments to be an array with >=1 items')
        }
        return
      }
    }

    console.log(`[E2E] Waiting... (cover=${last?.assetsStatus?.cover || 'n/a'}, audio=${last?.assetsStatus?.audio || 'n/a'})`)
    await sleep(10000)
  }

  throw new Error(`Timed out waiting for assets. Last seen: ${JSON.stringify(last)}`)
}

main().catch(err => {
  console.error('\n[E2E] ❌ Failed:', err.message)
  process.exit(1)
})

