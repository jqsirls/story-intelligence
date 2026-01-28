import request from 'supertest'

jest.mock('stripe', () => {
  class StripeMock {
    public checkout = {
      sessions: {
        create: async () => ({ id: 'cs_test_gift', url: 'https://checkout.example.test/gift-card' })
      }
    }
    constructor() {}
  }
  return { __esModule: true, default: StripeMock }
})

import { makeTestApp } from '../helpers/makeTestApp'

describe('GET /api/v1/gift-cards/:code/validate', () => {
  it('returns 404 when not found', async () => {
    const { app } = await makeTestApp({
      supabaseFixtures: { gift_cards: { data: [] } }
    })

    const res = await request(app).get('/api/v1/gift-cards/NOPE/validate')

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('GIFT_CARD_NOT_FOUND')
  })

  it('returns valid when active', async () => {
    const { app } = await makeTestApp({
      supabaseFixtures: {
        gift_cards: {
          data: [{ id: 'gc1', code: 'GC1', type: '3_month', status: 'active', expires_at: null, redeemed_at: null, value_months: 3 }]
        }
      }
    })

    const res = await request(app).get('/api/v1/gift-cards/GC1/validate')

    expect(res.status).toBe(200)
    expect(res.body.data.valid).toBe(true)
  })
})

describe('POST /api/v1/gift-cards/purchase', () => {
  it('returns 401 when not authenticated', async () => {
    const { app } = await makeTestApp({ authedUser: null })
    const res = await request(app).post('/api/v1/gift-cards/purchase').send({ giftCardType: '1_month' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
  })

  it('returns checkout url + sessionId', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_stub'
    process.env.STRIPE_GIFT_CARD_1_MONTH_PRICE_ID = 'price_gift_1'

    const { app } = await makeTestApp()
    const res = await request(app).post('/api/v1/gift-cards/purchase').send({ giftCardType: '1_month' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      success: true,
      data: { url: 'https://checkout.example.test/gift-card', sessionId: 'cs_test_gift' }
    })
  })
})

describe('POST /api/v1/gift-cards/redeem', () => {
  it('returns 401 when not authenticated', async () => {
    const { app } = await makeTestApp({ authedUser: null })
    const res = await request(app).post('/api/v1/gift-cards/redeem').send({ code: 'GC1' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
  })

  it('returns 404 when gift card not found', async () => {
    const { app } = await makeTestApp({
      supabaseFixtures: { gift_cards: { data: [] } }
    })

    const res = await request(app).post('/api/v1/gift-cards/redeem').send({ code: 'GC1' })

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('GIFT_CARD_NOT_FOUND')
  })

  it('returns 409 when already redeemed', async () => {
    const { app } = await makeTestApp({
      supabaseFixtures: {
        gift_cards: {
          data: [{ id: 'gc1', code: 'GC1', type: '3_month', status: 'redeemed', redeemed_at: '2026-01-01T00:00:00.000Z', value_months: 3 }]
        }
      }
    })

    const res = await request(app).post('/api/v1/gift-cards/redeem').send({ code: 'GC1' })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('GIFT_CARD_ALREADY_REDEEMED')
  })

  it('redeems successfully', async () => {
    const { app } = await makeTestApp({
      supabaseFixtures: {
        gift_cards: {
          data: [{ id: 'gc1', code: 'GC1', type: '3_month', status: 'active', redeemed_at: null, expires_at: null, value_months: 3 }]
        },
        subscriptions: { data: [] }
      }
    })

    const res = await request(app).post('/api/v1/gift-cards/redeem').send({ code: 'GC1' })

    expect(res.status).toBe(200)
    expect(res.body.data.redeemed).toBe(true)
  })
})
