import request from 'supertest'

jest.mock('stripe', () => {
  class StripeMock {
    public checkout = {
      sessions: {
        create: async () => ({ id: 'cs_test_story_pack', url: 'https://checkout.example.test/story-pack' })
      }
    }
    constructor() {}
  }
  return { __esModule: true, default: StripeMock }
})

import { makeTestApp } from '../helpers/makeTestApp'

describe('GET /api/v1/users/me/story-packs', () => {
  it('returns 401 when not authenticated', async () => {
    const { app } = await makeTestApp({ authedUser: null })
    const res = await request(app).get('/api/v1/users/me/story-packs')

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
  })

  it('returns inventory summary', async () => {
    const { app } = await makeTestApp({
      supabaseFixtures: {
        story_packs: { data: [{ id: 'sp1', pack_type: '10_pack', stories_remaining: 3, expires_at: null, purchased_at: '2026-01-01T00:00:00.000Z' }] }
      }
    })

    const res = await request(app).get('/api/v1/users/me/story-packs')

    expect(res.status).toBe(200)
    expect(res.body.data.totalAvailable).toBe(3)
  })
})

describe('POST /api/v1/story-packs/buy', () => {
  it('returns 401 when not authenticated', async () => {
    const { app } = await makeTestApp({ authedUser: null })
    const res = await request(app).post('/api/v1/story-packs/buy').send({ packType: '10_pack' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
  })

  it('returns 400 on invalid pack type', async () => {
    const { app } = await makeTestApp()
    const res = await request(app).post('/api/v1/story-packs/buy').send({ packType: 'invalid' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('INVALID_PACK_TYPE')
  })

  it('returns checkout url + sessionId', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_stub'
    process.env.STRIPE_STORY_PACK_10_PRICE_ID = 'price_test_10_pack'

    const { app } = await makeTestApp()
    const res = await request(app).post('/api/v1/story-packs/buy').send({ packType: '10_pack' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      success: true,
      data: { url: 'https://checkout.example.test/story-pack', sessionId: 'cs_test_story_pack' }
    })
  })
})
