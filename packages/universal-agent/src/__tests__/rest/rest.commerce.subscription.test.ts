import request from 'supertest'
import { makeTestApp } from '../helpers/makeTestApp'

describe('GET /api/v1/subscription', () => {
  it('returns 401 when not authenticated', async () => {
    const { app } = await makeTestApp({ authedUser: null })
    const res = await request(app).get('/api/v1/subscription')

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
  })

  it('returns subscription data when available', async () => {
    const { app } = await makeTestApp({
      commerceAgentStub: {
        getSubscriptionStatus: async () => ({ plan_id: 'pro_individual', status: 'active' })
      }
    })

    const res = await request(app).get('/api/v1/subscription')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      success: true,
      data: { plan: { plan_id: 'pro_individual', status: 'active' } }
    })
  })

  it('returns 400 on error', async () => {
    const { app } = await makeTestApp({
      commerceAgentStub: {
        getSubscriptionStatus: async () => {
          throw new Error('boom')
        }
      }
    })

    const res = await request(app).get('/api/v1/subscription')

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('GET_SUBSCRIPTION_FAILED')
  })
})

describe('POST /api/v1/subscription/cancel', () => {
  it('returns 401 when not authenticated', async () => {
    const { app } = await makeTestApp({ authedUser: null })
    const res = await request(app).post('/api/v1/subscription/cancel').send({ immediate: true })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
  })

  it('returns success when canceled', async () => {
    const { app } = await makeTestApp({
      commerceAgentStub: {
        cancelSubscription: async () => ({ success: true })
      }
    })

    const res = await request(app).post('/api/v1/subscription/cancel').send({ immediate: true })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ success: true, data: { cancelled: true } })
  })

  it('returns 400 when cancel fails', async () => {
    const { app } = await makeTestApp({
      commerceAgentStub: {
        cancelSubscription: async () => ({ success: false, error: 'nope' })
      }
    })

    const res = await request(app).post('/api/v1/subscription/cancel').send({ immediate: true })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('CANCEL_SUBSCRIPTION_FAILED')
  })
})

describe('POST /api/v1/subscription/upgrade', () => {
  it('returns 401 when not authenticated', async () => {
    const { app } = await makeTestApp({ authedUser: null })
    const res = await request(app).post('/api/v1/subscription/upgrade').send({ planId: 'pro_individual' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
  })

  it('returns 400 when planId missing', async () => {
    const { app } = await makeTestApp()
    const res = await request(app).post('/api/v1/subscription/upgrade').send({})

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('MISSING_PLAN_ID')
  })

  it('returns success when plan changes', async () => {
    const { app } = await makeTestApp({
      commerceAgentStub: {
        changePlan: async () => ({ success: true })
      }
    })

    const res = await request(app).post('/api/v1/subscription/upgrade').send({ planId: 'pro_individual' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ success: true, data: { planChanged: true } })
  })
})

describe('GET /api/v1/subscription/usage', () => {
  it('returns 401 when not authenticated', async () => {
    const { app } = await makeTestApp({ authedUser: null })
    const res = await request(app).get('/api/v1/subscription/usage')

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
  })

  it('returns usage data', async () => {
    const { app } = await makeTestApp({
      supabaseFixtures: {
        users: { data: [{ available_story_credits: 1, lifetime_stories_created: 0 }] },
        subscriptions: { data: [] },
        story_packs: { data: [] },
        stories: { data: [], count: 0 }
      }
    })

    const res = await request(app).get('/api/v1/subscription/usage')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
  })
})
