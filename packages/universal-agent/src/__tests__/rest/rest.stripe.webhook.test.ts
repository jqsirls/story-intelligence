/**
 * Deterministic tests for Stripe webhook receiver
 * Coverage: signature validation, placeholder detection, fulfillment stub
 */

import request from 'supertest'
import { makeTestApp } from '../helpers/makeTestApp'

describe('POST /api/v1/stripe/webhook', () => {
  describe('missing stripe-signature header', () => {
    it('returns 400 STRIPE_SIGNATURE_MISSING', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid_secret_for_unit_tests'

      const { app } = await makeTestApp({
        authedUser: null // webhook is public, no auth required
      })

      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .send({ type: 'invoice.payment_succeeded' })

      expect(res.status).toBe(400)
      expect(res.body).toEqual({
        success: false,
        error: 'Missing Stripe-Signature header',
        code: 'STRIPE_SIGNATURE_MISSING'
      })

      if (originalSecret) {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret
      } else {
        delete process.env.STRIPE_WEBHOOK_SECRET
      }
    })
  })

  describe('placeholder/missing webhook secret', () => {
    it('returns 503 STRIPE_WEBHOOK_NOT_CONFIGURED when env var is empty', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET

      const { app } = await makeTestApp({ authedUser: null })

      // Set empty AFTER makeTestApp so the handler reads empty at request time
      process.env.STRIPE_WEBHOOK_SECRET = ''

      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=1234567890,v1=deadbeef')
        .send({ type: 'invoice.payment_succeeded' })

      expect(res.status).toBe(503)
      expect(res.body).toMatchObject({
        success: false,
        error: 'Stripe webhook receiver is not configured',
        code: 'STRIPE_WEBHOOK_NOT_CONFIGURED',
        ssmParameter: '/storytailor-production/stripe/webhook-secret'
      })

      // Restore
      if (originalSecret) {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret
      } else {
        delete process.env.STRIPE_WEBHOOK_SECRET
      }
    })

    it('returns 503 when secret contains "placeholder"', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET
      process.env.STRIPE_WEBHOOK_SECRET = 'placeholder-secret'

      const { app } = await makeTestApp({ authedUser: null })

      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=1234567890,v1=deadbeef')
        .send({ type: 'invoice.payment_succeeded' })

      expect(res.status).toBe(503)
      expect(res.body.code).toBe('STRIPE_WEBHOOK_NOT_CONFIGURED')

      // Restore
      if (originalSecret) {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret
      } else {
        delete process.env.STRIPE_WEBHOOK_SECRET
      }
    })

    it('returns 503 when secret does not start with whsec_', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET
      process.env.STRIPE_WEBHOOK_SECRET = 'invalid-format-secret'

      const { app } = await makeTestApp({ authedUser: null })

      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=1234567890,v1=deadbeef')
        .send({ type: 'invoice.payment_succeeded' })

      expect(res.status).toBe(503)
      expect(res.body.code).toBe('STRIPE_WEBHOOK_NOT_CONFIGURED')

      // Restore
      if (originalSecret) {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret
      } else {
        delete process.env.STRIPE_WEBHOOK_SECRET
      }
    })
  })

  describe('happy path with valid signature stub', () => {
    it('returns 200 received:true when commerceAgent.handleWebhook succeeds', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid_secret_for_unit_tests'

      const handleWebhookSpy = jest.fn().mockResolvedValue(undefined)

      const { app } = await makeTestApp({
        authedUser: null,
        commerceAgentStub: {
          handleWebhook: handleWebhookSpy
        }
      })

      const payload = JSON.stringify({
        id: 'evt_test_12345',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_12345' } }
      })

      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=1234567890,v1=deadbeef')
        .send(payload)

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ received: true })
      expect(handleWebhookSpy).toHaveBeenCalledWith(
        payload,
        't=1234567890,v1=deadbeef'
      )

      // Restore
      if (originalSecret) {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret
      } else {
        delete process.env.STRIPE_WEBHOOK_SECRET
      }
    })
  })

  describe('unhandled event should still return 200', () => {
    it('returns 200 and logs STRIPE_UNHANDLED_EVENT', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid_secret_for_unit_tests'

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      const handleWebhookSpy = jest.fn().mockImplementation(async () => {
        console.log('STRIPE_UNHANDLED_EVENT', { type: 'customer.created', id: 'evt_unhandled' })
      })

      const { app } = await makeTestApp({
        authedUser: null,
        commerceAgentStub: {
          handleWebhook: handleWebhookSpy
        }
      })

      const payload = JSON.stringify({
        id: 'evt_unhandled',
        type: 'customer.created',
        data: { object: { id: 'cus_test_123' } }
      })

      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=1234567890,v1=deadbeef')
        .send(payload)

      expect(res.status).toBe(200)
      expect(logSpy).toHaveBeenCalledWith('STRIPE_UNHANDLED_EVENT', {
        type: 'customer.created',
        id: 'evt_unhandled'
      })

      logSpy.mockRestore()

      if (originalSecret) {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret
      } else {
        delete process.env.STRIPE_WEBHOOK_SECRET
      }
    })
  })

  describe('webhook fulfillment errors', () => {
    it('returns 400 STRIPE_EVENT_UNMAPPED_USER when user cannot be mapped', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid_secret_for_unit_tests'

      const handleWebhookSpy = jest.fn().mockRejectedValue(
        new Error('STRIPE_EVENT_UNMAPPED_USER')
      )

      const { app } = await makeTestApp({
        authedUser: null,
        commerceAgentStub: {
          handleWebhook: handleWebhookSpy
        }
      })

      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=1234567890,v1=deadbeef')
        .send(JSON.stringify({ type: 'checkout.session.completed' }))

      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({
        success: false,
        error: 'Unable to map Stripe event to a user (missing metadata.userId)',
        code: 'STRIPE_EVENT_UNMAPPED_USER'
      })

      // Restore
      if (originalSecret) {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret
      } else {
        delete process.env.STRIPE_WEBHOOK_SECRET
      }
    })

    it('returns 400 INVALID_PACK_TYPE when pack type is invalid', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid_secret_for_unit_tests'

      const handleWebhookSpy = jest.fn().mockRejectedValue(
        new Error('INVALID_PACK_TYPE')
      )

      const { app } = await makeTestApp({
        authedUser: null,
        commerceAgentStub: {
          handleWebhook: handleWebhookSpy
        }
      })

      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=1234567890,v1=deadbeef')
        .send(JSON.stringify({ type: 'checkout.session.completed' }))

      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({
        success: false,
        error: 'Invalid pack type in Stripe event metadata',
        code: 'INVALID_PACK_TYPE'
      })

      // Restore
      if (originalSecret) {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret
      } else {
        delete process.env.STRIPE_WEBHOOK_SECRET
      }
    })

    it('returns 400 STRIPE_WEBHOOK_FAILED for other webhook errors', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid_secret_for_unit_tests'

      const handleWebhookSpy = jest.fn().mockRejectedValue(
        new Error('Some other error')
      )

      const { app } = await makeTestApp({
        authedUser: null,
        commerceAgentStub: {
          handleWebhook: handleWebhookSpy
        }
      })

      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=1234567890,v1=deadbeef')
        .send(JSON.stringify({ type: 'checkout.session.completed' }))

      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({
        success: false,
        error: 'Some other error',
        code: 'STRIPE_WEBHOOK_FAILED'
      })

      // Restore
      if (originalSecret) {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret
      } else {
        delete process.env.STRIPE_WEBHOOK_SECRET
      }
    })
  })
})
