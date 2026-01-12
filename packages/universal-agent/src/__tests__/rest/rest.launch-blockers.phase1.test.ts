import request from 'supertest'
import { makeTestApp, defaultAuthedUser } from '../helpers/makeTestApp'

describe('REST launch blockers phase1', () => {
  describe('GET /api/v1/auth/me', () => {
    it('returns the current user profile', async () => {
      const { app } = await makeTestApp()

      const res = await request(app).get('/api/v1/auth/me')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.id).toBe(defaultAuthedUser.id)
    })

    it('rejects when unauthenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })

      const res = await request(app).get('/api/v1/auth/me')

      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })
  })

  describe('DELETE /api/v1/libraries/:id', () => {
    it('deletes a library when caller is owner', async () => {
      const libraryId = 'lib_del'
      const { app } = await makeTestApp({
        supabaseFixtures: {
          libraries: { data: [{ id: libraryId, owner: defaultAuthedUser.id }] }
        }
      })

      const res = await request(app).delete(`/api/v1/libraries/${libraryId}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/Library deleted/i)
    })

    it('rejects when unauthenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })

      const res = await request(app).delete('/api/v1/libraries/lib_del')

      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })
  })

  describe('GET /api/v1/commerce/subscriptions', () => {
    it('returns subscriptions for the current user', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          subscriptions: {
            data: [
              { id: 'sub_1', user_id: defaultAuthedUser.id, plan_id: 'pro', status: 'active', created_at: '2024-01-01T00:00:00Z' },
              { id: 'sub_2', user_id: defaultAuthedUser.id, plan_id: 'plus', status: 'canceled', created_at: '2024-01-02T00:00:00Z' }
            ],
            count: 2
          }
        }
      })

      const res = await request(app).get('/api/v1/commerce/subscriptions')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.subscriptions)).toBe(true)
      expect(res.body.data.subscriptions.length).toBe(2)
    })

    it('rejects when unauthenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })

      const res = await request(app).get('/api/v1/commerce/subscriptions')

      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })
  })
})

