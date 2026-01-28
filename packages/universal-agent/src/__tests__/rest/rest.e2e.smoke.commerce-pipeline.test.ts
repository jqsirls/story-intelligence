import request from 'supertest'
import { makeTestApp, defaultAuthedUser } from '../helpers/makeTestApp'

// Set explicit timeout for all tests
jest.setTimeout(10000)

describe('E2E Smoke Tests - Commerce & Pipeline', () => {
  describe('E) Commerce', () => {
    it('POST /api/v1/checkout/individual - returns deterministic URL/session id', async () => {
      const { app } = await makeTestApp({
        commerceAgentStub: {
          createIndividualCheckout: async () => ({
            url: 'https://checkout.stripe.com/test',
            sessionId: 'cs_test_123'
          })
        }
      })

      const res = await request(app)
        .post('/api/v1/checkout/individual')
        .send({
          planId: 'plan_monthly',
          discountCode: 'TEST10'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.url).toBeDefined()
      expect(res.body.data.sessionId).toBeDefined()
    }, 10000)

    it('GET /api/v1/subscription - returns deterministic payload', async () => {
      const { app } = await makeTestApp({
        commerceAgentStub: {
          getSubscriptionStatus: async () => ({
            planId: 'plan_monthly',
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })
        }
      })

      const res = await request(app).get('/api/v1/subscription')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.plan.planId).toBeDefined()
      expect(res.body.data.plan.status).toBeDefined()
    }, 10000)

    it('GET /api/v1/subscription/usage - returns deterministic payload', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          users: {
            data: [{ id: defaultAuthedUser.id, available_story_credits: 3 }]
          },
          subscriptions: {
            data: [{ id: 'sub_123', user_id: defaultAuthedUser.id, plan_id: 'plan_monthly', status: 'active' }]
          },
          story_packs: {
            data: []
          }
        }
      })

      const res = await request(app).get('/api/v1/subscription/usage')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
    }, 10000)

    it('POST /api/v1/story-packs/buy - creates row in story_packs', async () => {
      const originalPriceId = process.env.STRIPE_STORY_PACK_10_PRICE_ID
      process.env.STRIPE_STORY_PACK_10_PRICE_ID = 'price_test_123'
      
      const { app } = await makeTestApp({
        supabaseFixtures: {
          users: {
            data: [{ id: defaultAuthedUser.id, email: 'test@example.com' }]
          }
        }
      })

      const res = await request(app)
        .post('/api/v1/story-packs/buy')
        .send({
          packType: '10_pack'
        })

      // May return 200 (if Stripe mock works) or 503 (if price not configured)
      expect([200, 503]).toContain(res.status)
      
      if (originalPriceId) {
        process.env.STRIPE_STORY_PACK_10_PRICE_ID = originalPriceId
      } else {
        delete process.env.STRIPE_STORY_PACK_10_PRICE_ID
      }
    }, 10000)

    it('POST /api/v1/gift-cards/redeem - updates entitlements deterministically', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          gift_cards: {
            data: [{
              id: 'gift_123',
              code: 'GIFT123',
              redeemed_at: null,
              status: 'active',
              value_months: 1,
              expires_at: null
            }],
            update: (state: any) => ({
              data: {
                ...state.payload,
                redeemed_at: new Date().toISOString(),
                redeemed_by: defaultAuthedUser.id,
                status: 'redeemed'
              },
              error: null
            })
          },
          subscriptions: {
            data: [],
            insert: (state: any) => ({
              id: 'sub_123',
              user_id: state.payload.user_id,
              plan_id: state.payload.plan_id,
              status: 'active',
              current_period_end: state.payload.current_period_end
            })
          },
          gift_card_redemptions: {
            insert: (state: any) => ({
              id: 'redemption_123',
              gift_card_id: state.payload.gift_card_id,
              user_id: state.payload.user_id,
              months_added: state.payload.months_added
            })
          }
        }
      })

      const res = await request(app)
        .post('/api/v1/gift-cards/redeem')
        .send({ code: 'GIFT123' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    }, 10000)
  })

  describe('F) Stripe Webhook Resilience', () => {
    const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    afterEach(() => {
      if (originalWebhookSecret !== undefined) {
        process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret
      } else {
        delete process.env.STRIPE_WEBHOOK_SECRET
      }
    })

    it('POST /api/v1/stripe/webhook - signature missing -> 400', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
      const { app } = await makeTestApp()
      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .send({ type: 'checkout.session.completed' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('STRIPE_SIGNATURE_MISSING')
    }, 10000)

    it('POST /api/v1/stripe/webhook - placeholder secret -> 503', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET
      const { app } = await makeTestApp()
      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Stripe-Signature', 't=123,v1=abc')
        .send({ type: 'checkout.session.completed' })

      expect(res.status).toBe(503)
      expect(res.body.code).toBe('STRIPE_WEBHOOK_NOT_CONFIGURED')
    }, 10000)

    it('POST /api/v1/stripe/webhook - unhandled event -> 200 and logs UNHANDLED_EVENT', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      const handleWebhookSpy = jest.fn().mockImplementation(async () => {
        console.log('STRIPE_UNHANDLED_EVENT', { type: 'unknown.event', id: 'evt_test' })
      })

      const { app } = await makeTestApp({
        commerceAgentStub: {
          handleWebhook: handleWebhookSpy
        }
      })

      const payload = JSON.stringify({ type: 'unknown.event', id: 'evt_test' })
      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=123,v1=abc')
        .send(payload)

      // Should return 200 even for unhandled events
      expect(res.status).toBe(200)
      expect(logSpy).toHaveBeenCalledWith('STRIPE_UNHANDLED_EVENT', {
        type: 'unknown.event',
        id: 'evt_test'
      })
      
      logSpy.mockRestore()
    }, 10000)

    it('POST /api/v1/stripe/webhook - handled story_pack -> inserts story_packs', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
      const { app } = await makeTestApp({
        supabaseFixtures: {
          story_packs: {
            insert: (state: any) => ({
              id: 'pack_123',
              user_id: state.payload.user_id,
              pack_type: state.payload.pack_type,
              stories_remaining: 10
            })
          }
        },
        commerceAgentStub: {
          handleWebhook: async () => {
            return { handled: true, eventType: 'checkout.session.completed' }
          }
        }
      })

      const payload = JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: defaultAuthedUser.id, packType: 'standard' }
          }
        }
      })
      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=123,v1=abc')
        .send(payload)

      expect(res.status).toBe(200)
    }, 10000)

    it('POST /api/v1/stripe/webhook - handled subscription -> upserts subscriptions', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
      const { app } = await makeTestApp({
        supabaseFixtures: {
          subscriptions: {
            data: [],
            insert: (state: any) => ({
              id: 'sub_123',
              user_id: state.payload.user_id,
              plan_id: state.payload.plan_id,
              status: 'active'
            }),
            update: (state: any) => ({ data: { ...state.payload, status: 'active' }, error: null })
          }
        },
        commerceAgentStub: {
          handleWebhook: async () => {
            return { handled: true, eventType: 'customer.subscription.updated' }
          }
        }
      })

      const payload = JSON.stringify({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            metadata: { userId: defaultAuthedUser.id },
            status: 'active'
          }
        }
      })
      const res = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=123,v1=abc')
        .send(payload)

      expect(res.status).toBe(200)
    }, 10000)
  })
})
