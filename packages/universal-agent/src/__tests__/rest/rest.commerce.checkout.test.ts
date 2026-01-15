import request from 'supertest'
import { makeTestApp } from '../helpers/makeTestApp'

describe('POST /api/v1/checkout/individual', () => {
  it('returns 401 when not authenticated', async () => {
    const { app } = await makeTestApp({ authedUser: null })
    const res = await request(app)
      .post('/api/v1/checkout/individual')
      .send({ planId: 'pro_individual' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
  })

  it('returns checkout url + sessionId', async () => {
    const { app } = await makeTestApp({
      commerceAgentStub: {
        createIndividualCheckout: async () => ({
          sessionId: 'cs_test_ind',
          url: 'https://checkout.example.test/individual',
          expiresAt: '2026-01-01T00:00:00.000Z'
        })
      }
    })

    const res = await request(app)
      .post('/api/v1/checkout/individual')
      .send({ planId: 'pro_individual' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      success: true,
      data: { url: 'https://checkout.example.test/individual', sessionId: 'cs_test_ind' }
    })
  })

  it('supports /api/v1/checkout alias', async () => {
    const { app } = await makeTestApp({
      commerceAgentStub: {
        createIndividualCheckout: async () => ({
          sessionId: 'cs_test_alias',
          url: 'https://checkout.example.test/alias',
          expiresAt: '2026-01-01T00:00:00.000Z'
        })
      }
    })

    const res = await request(app)
      .post('/api/v1/checkout')
      .send({ planId: 'pro_individual' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      success: true,
      data: { url: 'https://checkout.example.test/alias', sessionId: 'cs_test_alias' }
    })
  })

  it('returns 400 on checkout error', async () => {
    const { app } = await makeTestApp({
      commerceAgentStub: {
        createIndividualCheckout: async () => {
          throw new Error('boom')
        }
      }
    })

    const res = await request(app)
      .post('/api/v1/checkout/individual')
      .send({ planId: 'pro_individual' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('CHECKOUT_FAILED')
  })
})

describe('POST /api/v1/checkout/organization', () => {
  it('returns 401 when not authenticated', async () => {
    const { app } = await makeTestApp({ authedUser: null })
    const res = await request(app)
      .post('/api/v1/checkout/organization')
      .send({ organizationName: 'Acme', seatCount: 2, planId: 'pro_organization' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
  })

  it('returns checkout url + sessionId', async () => {
    const { app } = await makeTestApp({
      commerceAgentStub: {
        createOrganizationCheckout: async () => ({
          sessionId: 'cs_test_org',
          url: 'https://checkout.example.test/organization',
          expiresAt: '2026-01-01T00:00:00.000Z'
        })
      }
    })

    const res = await request(app)
      .post('/api/v1/checkout/organization')
      .send({ organizationName: 'Acme', seatCount: 2, planId: 'pro_organization', interval: 'month' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      success: true,
      data: { url: 'https://checkout.example.test/organization', sessionId: 'cs_test_org' }
    })
  })

  it('returns 400 on invalid input', async () => {
    const { app } = await makeTestApp()
    const res = await request(app)
      .post('/api/v1/checkout/organization')
      .send({ seatCount: 0 })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('INVALID_INPUT')
  })
})
