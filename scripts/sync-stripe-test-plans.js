#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Sync LIVE Stripe product/prices into Stripe TEST mode, without exposing secrets.
 *
 * Reads keys from SSM:
 * - LIVE: /storytailor-production/stripe/secret-key
 * - TEST: /storytailor-production/stripe/test/secret-key
 *
 * Writes (optional) TEST lane price-id params (String only; no secrets):
 * - /storytailor-production/stripe/test/price-id-individual-monthly
 * - /storytailor-production/stripe/test/price-id-individual-yearly
 * - /storytailor-production/stripe/test/price-id-org (only if unambiguous)
 *
 * Usage:
 *   node scripts/sync-stripe-test-plans.js --live-product prod_XXXX [--write-ssm-price-ids]
 *
 * Notes:
 * - Never prints secret keys.
 * - Artifacts written to: artifacts/stripe-test-sync/<runId>/summary.json
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')

const STRIPE_API = 'https://api.stripe.com'

function argValue(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function fail(msg) {
  console.error(`FAIL ${msg}`)
  process.exit(1)
}

function ssmGet(name, decrypt) {
  try {
    const out = execFileSync(
      'aws',
      [
        'ssm',
        'get-parameter',
        '--region',
        process.env.AWS_REGION || 'us-east-1',
        '--name',
        name,
        ...(decrypt ? ['--with-decryption'] : []),
        '--query',
        'Parameter.Value',
        '--output',
        'text'
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )
    return String(out).trim()
  } catch (err) {
    return null
  }
}

function ssmPutString(name, value) {
  execFileSync(
    'aws',
    [
      'ssm',
      'put-parameter',
      '--region',
      process.env.AWS_REGION || 'us-east-1',
      '--name',
      name,
      '--type',
      'String',
      '--value',
      value,
      '--overwrite'
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  )
}

async function stripeFetch(secretKey, method, endpoint, formBody) {
  const headers = {
    Authorization: `Bearer ${secretKey}`
  }
  let body
  if (formBody) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams(formBody)
  }
  const res = await fetch(`${STRIPE_API}${endpoint}`, { method, headers, body })
  const text = await res.text()
  let parsed = null
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = null
  }
  if (!res.ok) {
    const code = parsed?.error?.code || `http_${res.status}`
    const type = parsed?.error?.type || 'stripe_error'
    const message = parsed?.error?.message || text.slice(0, 200)
    throw new Error(`Stripe ${method} ${endpoint} failed: ${res.status} ${code} ${type} ${message}`)
  }
  return parsed
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function nowRunId() {
  return crypto.randomUUID()
}

function normalizeRecurring(recurring) {
  if (!recurring) return null
  return {
    interval: recurring.interval || null,
    interval_count: recurring.interval_count || 1,
    usage_type: recurring.usage_type || null
  }
}

function priceSignature(p) {
  return JSON.stringify({
    currency: p.currency,
    unit_amount: p.unit_amount,
    recurring: normalizeRecurring(p.recurring),
    type: p.type,
    nickname: p.nickname || null,
    active: p.active === true
  })
}

async function main() {
  const liveProductId = argValue('--live-product')
  const writeSsmPriceIds = hasFlag('--write-ssm-price-ids')

  if (!liveProductId || !liveProductId.startsWith('prod_')) {
    fail('missing_or_invalid --live-product prod_... argument')
  }

  const ssmPrefix = process.env.SSM_PREFIX || '/storytailor-production'
  const liveKey = ssmGet(`${ssmPrefix}/stripe/secret-key`, true)
  const testKey = ssmGet(`${ssmPrefix}/stripe/test/secret-key`, true)

  if (!liveKey || !liveKey.startsWith('sk_live_')) {
    fail(`live Stripe key missing or invalid in SSM (${ssmPrefix}/stripe/secret-key)`)
  }
  if (!testKey || !testKey.startsWith('sk_test_')) {
    fail(`test Stripe key missing or invalid in SSM (${ssmPrefix}/stripe/test/secret-key). Run scripts/set-stripe-test-lane-ssm.sh first.`)
  }

  const runId = nowRunId()
  const artifactsDir = path.join(process.cwd(), 'artifacts', 'stripe-test-sync', runId)
  ensureDir(artifactsDir)

  const liveProduct = await stripeFetch(liveKey, 'GET', `/v1/products/${encodeURIComponent(liveProductId)}`)
  const livePrices = await stripeFetch(liveKey, 'GET', `/v1/prices?limit=100&product=${encodeURIComponent(liveProductId)}`)
  const livePriceList = Array.isArray(livePrices?.data) ? livePrices.data : []

  // Find or create corresponding test product (by metadata.source_live_product_id)
  const testProducts = await stripeFetch(testKey, 'GET', '/v1/products?limit=100')
  const testProductList = Array.isArray(testProducts?.data) ? testProducts.data : []
  let testProduct = testProductList.find(
    (p) => p?.metadata?.source_live_product_id === liveProductId
  )
  if (!testProduct) {
    testProduct = await stripeFetch(testKey, 'POST', '/v1/products', {
      name: liveProduct.name,
      description: liveProduct.description || undefined,
      active: 'true',
      'metadata[source_live_product_id]': liveProductId,
      'metadata[source_live_product_name]': liveProduct.name
    })
  }

  // Fetch existing test prices for product and map by metadata.source_live_price_id
  const testPrices = await stripeFetch(
    testKey,
    'GET',
    `/v1/prices?limit=100&product=${encodeURIComponent(testProduct.id)}`
  )
  const testPriceList = Array.isArray(testPrices?.data) ? testPrices.data : []
  const bySourceLive = new Map()
  for (const tp of testPriceList) {
    const src = tp?.metadata?.source_live_price_id
    if (src) bySourceLive.set(src, tp)
  }

  const synced = []
  const created = []

  for (const lp of livePriceList) {
    const livePriceId = lp.id
    let tp = bySourceLive.get(livePriceId)
    if (!tp) {
      // Create a matching test price
      const body = {
        product: testProduct.id,
        currency: lp.currency,
        unit_amount: String(lp.unit_amount ?? ''),
        nickname: lp.nickname || undefined,
        active: lp.active ? 'true' : 'false',
        'metadata[source_live_product_id]': liveProductId,
        'metadata[source_live_price_id]': livePriceId,
        'metadata[source_live_price_signature]': priceSignature(lp)
      }
      if (lp.recurring?.interval) {
        body['recurring[interval]'] = lp.recurring.interval
        if (lp.recurring.interval_count) body['recurring[interval_count]'] = String(lp.recurring.interval_count)
      }
      // Stripe rejects empty unit_amount; guard
      if (!lp.unit_amount || String(lp.unit_amount) === '0') {
        // skip invalid / legacy prices
        synced.push({ live_price_id: livePriceId, skipped: true, reason: 'unit_amount_missing_or_zero' })
        continue
      }
      tp = await stripeFetch(testKey, 'POST', '/v1/prices', body)
      created.push(tp.id)
    }
    synced.push({
      live_price_id: livePriceId,
      test_price_id: tp.id,
      nickname: lp.nickname || null,
      currency: lp.currency,
      unit_amount: lp.unit_amount,
      recurring: normalizeRecurring(lp.recurring),
      active: lp.active === true
    })
  }

  // Suggested mapping by nickname (deterministic)
  const findByNickname = (needle) =>
    synced.filter((p) => !p.skipped && typeof p.nickname === 'string' && p.nickname.toLowerCase().includes(needle.toLowerCase()))

  const individualMonthly = findByNickname('Individual Monthly')
  const individualYearly = findByNickname('Individual Yearly')
  const orgCandidates = findByNickname('Org').concat(findByNickname('Organization')).concat(findByNickname('Seats'))

  const ssmWrites = []
  if (writeSsmPriceIds) {
    const monthly = individualMonthly.length === 1 ? individualMonthly[0].test_price_id : null
    const yearly = individualYearly.length === 1 ? individualYearly[0].test_price_id : null
    if (monthly) {
      ssmPutString(`${ssmPrefix}/stripe/test/price-id-individual-monthly`, monthly)
      ssmWrites.push({ name: `${ssmPrefix}/stripe/test/price-id-individual-monthly`, value: monthly })
    }
    if (yearly) {
      ssmPutString(`${ssmPrefix}/stripe/test/price-id-individual-yearly`, yearly)
      ssmWrites.push({ name: `${ssmPrefix}/stripe/test/price-id-individual-yearly`, value: yearly })
    }
    // org is only written if unambiguous
    const orgUnique = Array.from(new Set(orgCandidates.map((c) => c.test_price_id)))
    if (orgUnique.length === 1) {
      ssmPutString(`${ssmPrefix}/stripe/test/price-id-org`, orgUnique[0])
      ssmWrites.push({ name: `${ssmPrefix}/stripe/test/price-id-org`, value: orgUnique[0] })
    }
  }

  const summary = {
    runId,
    live: { product_id: liveProductId, product_name: liveProduct.name },
    test: { product_id: testProduct.id },
    created_test_price_ids: created,
    synced_prices: synced,
    nickname_matches: {
      individual_monthly: individualMonthly.map((p) => p.test_price_id),
      individual_yearly: individualYearly.map((p) => p.test_price_id),
      org: Array.from(new Set(orgCandidates.map((p) => p.test_price_id)))
    },
    ssm_price_id_writes: ssmWrites
  }

  fs.writeFileSync(path.join(artifactsDir, 'summary.json'), JSON.stringify(summary, null, 2))

  console.log(`OK stripe_test_sync runId=${runId} liveProduct=${liveProductId} testProduct=${testProduct.id} createdPrices=${created.length} artifacts=${artifactsDir}`)
}

main().catch((err) => {
  console.error(`FAIL stripe_test_sync ${err?.message || err}`)
  process.exit(1)
})


