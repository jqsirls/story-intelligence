#!/usr/bin/env node
// Generate Stripe-Signature header for a fixture payload
// Usage: node stripe_sign.js <payload.json> <secret> [timestamp]
const fs = require('fs')
const crypto = require('crypto')

const [payloadPath, secret, tsArg] = process.argv.slice(2)
if (!payloadPath || !secret) {
  console.error('usage: node stripe_sign.js <payload.json> <secret> [timestamp]')
  process.exit(1)
}

const timestamp = tsArg || Math.floor(Date.now() / 1000)
const payload = fs.readFileSync(payloadPath, 'utf8').trim()
const signedPayload = `${timestamp}.${payload}`
const signature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')
process.stdout.write(`t=${timestamp},v1=${signature}\n`)

