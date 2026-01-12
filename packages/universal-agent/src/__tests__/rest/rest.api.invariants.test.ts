import request from 'supertest'
import { makeTestApp, defaultAuthedUser } from '../helpers/makeTestApp'

describe('REST API invariants', () => {
  describe('GET /api/v1/users/me/notifications', () => {
    it('returns array payloads without numeric keys when authenticated', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          notifications: {
            data: [
              { id: 'n1', user_id: defaultAuthedUser.id, read: false, created_at: '2024-01-01T00:00:00Z' },
              { id: 'n2', user_id: defaultAuthedUser.id, read: true, created_at: '2024-01-02T00:00:00Z' }
            ],
            count: 2,
            unreadCount: 1
          }
        }
      })

      const res = await request(app).get('/api/v1/users/me/notifications').expect(200)

      expect(Array.isArray(res.body.data.notifications)).toBe(true)
      expect(typeof res.body.data.unreadCount).toBe('number')
      expect(Object.keys(res.body.data).some(k => /^\d+$/.test(k))).toBe(false)
      if (res.body.pagination) {
        expect(typeof res.body.pagination.page).toBe('number')
        expect(typeof res.body.pagination.limit).toBe('number')
        expect(typeof res.body.pagination.total).toBe('number')
      }
    })

    it('rejects when unauthenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app).get('/api/v1/users/me/notifications').expect(401)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/v1/users/me/rewards', () => {
    it('returns reward arrays and totals without numeric keys', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          reward_ledger: {
            data: [
              { id: 'rw1', user_id: defaultAuthedUser.id, amount: 150, status: 'applied', created_at: '2024-01-01T00:00:00Z' },
              { id: 'rw2', user_id: defaultAuthedUser.id, amount: 250, status: 'pending', created_at: '2024-01-02T00:00:00Z' }
            ],
            count: 2
          }
        }
      })

      const res = await request(app).get('/api/v1/users/me/rewards').expect(200)

      expect(Array.isArray(res.body.data.rewards)).toBe(true)
      expect(typeof res.body.data.totalEarned).toBe('number')
      expect(typeof res.body.data.totalApplied).toBe('number')
      expect(typeof res.body.data.available).toBe('number')
      expect(Object.keys(res.body.data).some(k => /^\d+$/.test(k))).toBe(false)
    })

    it('rejects when unauthenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app).get('/api/v1/users/me/rewards').expect(401)
      expect(res.body.success).toBe(false)
    })
  })

  describe('POST /api/v1/stories', () => {
    it('requires auth', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app).post('/api/v1/stories').send({ title: 'My Story' }).expect(401)
      expect(res.body.success).toBe(false)
    })

    it('creates a story with stable payload shape', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          subscriptions: {
            data: { plan_id: 'pro', status: 'active' }
          },
          libraries: {
            data: [{ id: 'lib_1', owner: defaultAuthedUser.id }]
          },
          stories: {
            insert: () => ({
              id: 'story_test_1',
              library_id: 'lib_1',
              creator_user_id: defaultAuthedUser.id,
              title: 'My Story',
              status: 'draft'
            })
          }
        }
      })

      const res = await request(app)
        .post('/api/v1/stories')
        .send({
          title: 'My Story',
          content: { body: 'hello' }
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
      expect(res.body.data.id).toBe('story_test_1')
      expect(Object.keys(res.body.data).some(k => /^\d+$/.test(k))).toBe(false)
    })
  })
})

