import request from 'supertest'
import { makeTestApp, defaultAuthedUser } from '../helpers/makeTestApp'

describe('REST launch blockers phase2', () => {
  describe('DELETE /api/v1/libraries/:id/members/:userId/remove', () => {
    it('removes a member when caller is owner', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          library_permissions: {
            data: [
              { library_id: 'lib_1', user_id: defaultAuthedUser.id, role: 'Owner' },
              { library_id: 'lib_1', user_id: 'member_1', role: 'Member' }
            ]
          }
        }
      })

      const res = await request(app).delete('/api/v1/libraries/lib_1/members/member_1/remove')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/Member removed/i)
    })

    it('rejects unauthenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app).delete('/api/v1/libraries/lib_1/members/member_1/remove')
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })

    it('rejects when caller lacks permission', async () => {
      const { app } = await makeTestApp({
        authedUser: { id: 'user_no_access', email: 'x@test.dev' },
        supabaseFixtures: {
          libraries: { data: [{ id: 'lib_1', owner: 'other_owner' }] },
          library_permissions: { data: [{ library_id: 'lib_1', user_id: 'member_1', role: 'Member' }] }
        }
      })
      const res = await request(app).delete('/api/v1/libraries/lib_1/members/member_1/remove')
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('PERMISSION_DENIED')
    })
  })

  describe('GET /api/v1/libraries/:id/stats', () => {
    it('returns stats for owner', async () => {
      const { app } = await makeTestApp()
      const res = await request(app).get('/api/v1/libraries/lib_1/stats')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.totalStories).toBeDefined()
    })

    it('rejects unauthenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app).get('/api/v1/libraries/lib_1/stats')
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })

    it('rejects permission denied', async () => {
      const { app } = await makeTestApp({
        authedUser: { id: 'user_no_access', email: 'x@test.dev' },
        supabaseFixtures: {
          libraries: { data: [{ id: 'lib_1', owner: 'owner_x' }] },
          library_permissions: { data: [] }
        }
      })
      const res = await request(app).get('/api/v1/libraries/lib_1/stats')
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('PERMISSION_DENIED')
    })
  })

  describe('GET /api/v1/libraries/:libraryId/stories', () => {
    it('lists stories for owner', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          stories: {
            data: [
              { id: 'story_1', library_id: 'lib_1', title: 'My Story', creator_user_id: defaultAuthedUser.id },
              { id: 'story_2', library_id: 'lib_1', title: 'Second', creator_user_id: defaultAuthedUser.id }
            ],
            count: 2
          }
        }
      })
      const res = await request(app).get('/api/v1/libraries/lib_1/stories')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('rejects unauthenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app).get('/api/v1/libraries/lib_1/stories')
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })
  })

  describe('GET /api/v1/stories/:id/activities', () => {
    it('returns activities when permitted', async () => {
      const { app } = await makeTestApp()
      const res = await request(app).get('/api/v1/stories/story_1/activities')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.activities)).toBe(true)
    })

    it('rejects unauthenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app).get('/api/v1/stories/story_1/activities')
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })

    it('rejects when no permission', async () => {
      const { app } = await makeTestApp({
        authedUser: { id: 'user_no_access', email: 'x@test.dev' },
        supabaseFixtures: {
          libraries: { data: [{ id: 'lib_1', owner: 'owner_x' }] },
          stories: { data: [{ id: 'story_1', library_id: 'lib_1', activities: ['a'] }] },
          library_permissions: { data: [] }
        }
      })
      const res = await request(app).get('/api/v1/stories/story_1/activities')
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('PERMISSION_DENIED')
    })
  })

  describe('GET /api/v1/stories/:id/feedback', () => {
    it('returns story feedback summary', async () => {
      const { app } = await makeTestApp()
      const res = await request(app).get('/api/v1/stories/story_1/feedback')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.total).toBeDefined()
    })

    it('rejects unauthenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app).get('/api/v1/stories/story_1/feedback')
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })

    it('rejects when no permission', async () => {
      const { app } = await makeTestApp({
        authedUser: { id: 'user_no_access', email: 'x@test.dev' },
        supabaseFixtures: {
          libraries: { data: [{ id: 'lib_1', owner: 'owner_x' }] },
          stories: { data: [{ id: 'story_1', library_id: 'lib_1', title: 'T' }] },
          library_permissions: { data: [] }
        }
      })
      const res = await request(app).get('/api/v1/stories/story_1/feedback')
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('PERMISSION_DENIED')
    })
  })

  describe('GET /api/v1/characters/:id/feedback', () => {
    it('returns character feedback summary', async () => {
      const { app } = await makeTestApp()
      const res = await request(app).get('/api/v1/characters/char_1/feedback')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.total).toBeDefined()
    })

    it('rejects unauthenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app).get('/api/v1/characters/char_1/feedback')
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })

    it('rejects when no permission', async () => {
      const { app } = await makeTestApp({
        authedUser: { id: 'user_no_access', email: 'x@test.dev' },
        supabaseFixtures: {
          libraries: { data: [{ id: 'lib_1', owner: 'owner_x' }] },
          characters: { data: [{ id: 'char_1', library_id: 'lib_1' }] },
          library_permissions: { data: [] }
        }
      })
      const res = await request(app).get('/api/v1/characters/char_1/feedback')
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('PERMISSION_DENIED')
    })
  })

  describe('GET /api/v1/stories/:id/assets/stream', () => {
    it('returns asset url', async () => {
      const { app } = await makeTestApp()
      const res = await request(app).get('/api/v1/stories/story_1/assets/stream')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.url).toMatch(/^https?:\/\//)
    })

    it('returns 404 when asset type not found', async () => {
      const { app } = await makeTestApp()
      const res = await request(app).get('/api/v1/stories/story_1/assets/stream?assetType=nonexistent')
      expect(res.status).toBe(404)
      expect(res.body.code).toBe('ASSET_NOT_FOUND')
    })

    it('rejects unauthenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app).get('/api/v1/stories/story_1/assets/stream')
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })

    it('rejects when no permission', async () => {
      const { app } = await makeTestApp({
        authedUser: { id: 'user_no_access', email: 'x@test.dev' },
        supabaseFixtures: {
          libraries: { data: [{ id: 'lib_1', owner: 'owner_x' }] },
          stories: { data: [{ id: 'story_1', library_id: 'lib_1' }] },
          library_permissions: { data: [] }
        }
      })
      const res = await request(app).get('/api/v1/stories/story_1/assets/stream')
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('PERMISSION_DENIED')
    })
  })
})

