#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const inputArg = process.argv.find(arg => arg.startsWith('--input='))
const inputPath = inputArg
  ? inputArg.split('=').slice(1).join('=')
  : (process.env.CANARY_REVIEW_PACK
    || process.env.CANARY_IMAGE_REVIEW_MARKDOWN_RUN
    || process.env.CANARY_IMAGE_REVIEW_MARKDOWN)

if (!inputPath) {
  console.error('Missing review pack path. Provide --input=... or CANARY_REVIEW_PACK env.')
  process.exit(1)
}

if (!fs.existsSync(inputPath)) {
  console.error(`Review pack not found at ${inputPath}`)
  process.exit(1)
}

const content = fs.readFileSync(inputPath, 'utf8')
const errors = []

if (/tpose/i.test(content)) {
  errors.push('Found "tpose" string in review pack')
}

const jsonBlocks = []
const forbiddenPublicKeys = new Set([
  'reference_images',
  'art_prompt',
  'headshot_prompt',
  'bodyshot_prompt',
  'edit_prompt',
  'prompt_hashes',
  'headshot_trace_url',
  'bodyshot_trace_url',
  'validation_summary',
  'validation_payload',
  'failure_codes',
  'failure_summary',
  'admin_review_required'
])
const blockRegex = /```json\s*([\s\S]*?)```/g
let match = null
while ((match = blockRegex.exec(content)) !== null) {
  const raw = match[1]
  try {
    jsonBlocks.push(JSON.parse(raw))
  } catch (err) {
    errors.push(`Failed to parse JSON block: ${err.message || String(err)}`)
  }
}

const receiptFailures = []
const alphaFailures = []
const mustHaveFailures = []
const forbiddenKeyFindings = []

function collectForbiddenKeys(value, pathPrefix = '') {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectForbiddenKeys(entry, `${pathPrefix}[${index}]`))
    return
  }
  Object.keys(value).forEach((key) => {
    const nextPath = pathPrefix ? `${pathPrefix}.${key}` : key
    if (forbiddenPublicKeys.has(key)) {
      forbiddenKeyFindings.push(nextPath)
    }
    collectForbiddenKeys(value[key], nextPath)
  })
}

jsonBlocks.forEach((block) => {
  if (block && Object.prototype.hasOwnProperty.call(block, 'public_snapshot_receipt')) {
    const receipt = block.public_snapshot_receipt
    if (!receipt || typeof receipt.status !== 'number') {
      receiptFailures.push({
        id: block.character_id || block.characterId || block.id || 'unknown',
        status: receipt?.status ?? null,
        url: receipt?.url ?? null
      })
    } else if (receipt.status !== 200) {
      receiptFailures.push({
        id: block.character_id || block.characterId || block.id || 'unknown',
        status: receipt.status,
        url: receipt.url || null
      })
    }
    if (receipt?.data) {
      collectForbiddenKeys(receipt.data, 'public_snapshot_receipt.data')
    }
  }

  if (block?.public_character_snapshot) {
    collectForbiddenKeys(block.public_character_snapshot, 'public_character_snapshot')
  }

  if (block?.public_character_snapshot_receipt?.data) {
    collectForbiddenKeys(block.public_character_snapshot_receipt.data, 'public_character_snapshot_receipt.data')
  }

  const headshotValidation = block?.validations?.headshot || block?.validation?.headshot
  if (headshotValidation) {
    const transparent = headshotValidation.transparent_background
    const ratio = headshotValidation.transparent_background_ratio
    if (transparent === true || (typeof ratio === 'number' && ratio > 0)) {
      alphaFailures.push({
        id: block.character_id || block.characterId || block.id || 'unknown',
        ratio: ratio ?? null
      })
    }
  }

  const fireRate = block?.validator_fire_rate
  if (fireRate && typeof fireRate.must_have_count === 'number' && fireRate.must_have_count > 0) {
    mustHaveFailures.push({
      id: block.character_id || block.characterId || block.id || 'unknown',
      must_have_count: fireRate.must_have_count,
      by_code: fireRate.by_code || {}
    })
  }
})

if (receiptFailures.length > 0) {
  errors.push(`Auth receipt failures: ${JSON.stringify(receiptFailures, null, 2)}`)
}
if (alphaFailures.length > 0) {
  errors.push(`Headshot alpha detected: ${JSON.stringify(alphaFailures, null, 2)}`)
}
if (mustHaveFailures.length > 0) {
  errors.push(`MUST-HAVE validator fires: ${JSON.stringify(mustHaveFailures, null, 2)}`)
}
if (forbiddenKeyFindings.length > 0) {
  const uniquePaths = Array.from(new Set(forbiddenKeyFindings)).sort()
  errors.push(`Forbidden keys found in public responses: ${uniquePaths.join(', ')}`)
}

if (errors.length > 0) {
  console.error('Review pack validation failed:\n' + errors.map(err => `- ${err}`).join('\n'))
  process.exit(1)
}

console.log(`Review pack validation passed: ${path.basename(inputPath)}`)
console.log('Forbidden-key scan passed')
