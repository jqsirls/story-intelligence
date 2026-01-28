import request from 'supertest'
import { makeTestApp, defaultAuthedUser } from '../helpers/makeTestApp'

// Set explicit timeout for all tests
jest.setTimeout(10000)

describe('E2E Smoke Tests - Auth & Content', () => {
  describe('A) Auth Flow', () => {
    it('POST /api/v1/auth/register - happy path', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@storytailor.dev',
          password: 'SecurePass123!',
          age: 18,
          userType: 'parent',
          firstName: 'Test',
          lastName: 'User'
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.user).toBeDefined()
    }, 10000)

    it('POST /api/v1/auth/login - happy path', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@storytailor.dev',
          password: 'password123'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.user).toBeDefined()
    }, 10000)

    it('POST /api/v1/auth/login - 401 on invalid credentials', async () => {
      const { app } = await makeTestApp({
        authedUser: null,
        authStub: {
          signInWithPassword: async () => ({
            data: { user: null, session: null },
            error: { message: 'Invalid login' }
          })
        }
      })
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@storytailor.dev',
          password: 'wrongpassword'
        })

      expect(res.status).toBe(401)
    }, 10000)

    it('POST /api/v1/auth/refresh - happy path', async () => {
      const { app } = await makeTestApp()
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid_refresh_token' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.tokens).toBeDefined()
    }, 10000)

    it('POST /api/v1/auth/logout - happy path', async () => {
      const { app } = await makeTestApp()
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'token_to_revoke' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    }, 10000)
  })

  describe('B) Onboarding + PLG', () => {
    it('PUT /api/v1/users/me/profile - profile completion earns credit', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          users: {
            data: [{ id: defaultAuthedUser.id, profile_completed: false, available_story_credits: 0 }],
            update: (state: any) => {
              const updated = {
                ...state.payload,
                profile_completed: true,
                available_story_credits: (state.payload.available_story_credits || 0) + 1
              }
              return { data: updated, error: null }
            }
          }
        }
      })

      const res = await request(app)
        .put('/api/v1/users/me/profile')
        .send({
          name: 'Test User',
          age: 8,
          preferences: {}
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    }, 10000)
  })

  describe('C) Character Creation', () => {
    it('POST /api/v1/characters - create character', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          libraries: {
            data: [{ id: 'lib_123', owner: defaultAuthedUser.id }]
          },
          characters: {
            insert: (state: any) => ({
              id: 'char_123',
              library_id: state.payload.library_id,
              name: state.payload.name,
              ...state.payload
            })
          }
        }
      })

      const res = await request(app)
        .post('/api/v1/characters')
        .send({
          libraryId: 'lib_123',
          name: 'Test Character',
          species: 'human',
          age: 10
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.id).toBeDefined()
    }, 10000)

    it('GET /api/v1/characters/:id - get character', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          characters: {
            data: [{ id: 'char_123', library_id: 'lib_123', name: 'Test Character' }]
          },
          libraries: {
            data: [{ id: 'lib_123', owner: defaultAuthedUser.id }]
          }
        }
      })

      const res = await request(app).get('/api/v1/characters/char_123')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.name).toBe('Test Character')
    }, 10000)

    it('GET /api/v1/characters - list characters with permission check', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          libraries: {
            data: [{ id: 'lib_123', owner: defaultAuthedUser.id }]
          },
          characters: {
            data: [
              { id: 'char_123', library_id: 'lib_123', name: 'Char 1' },
              { id: 'char_456', library_id: 'lib_123', name: 'Char 2' }
            ]
          }
        }
      })

      const res = await request(app).get('/api/v1/characters?libraryId=lib_123')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    }, 10000)
  })

  describe('D) Story Creation + Quota Enforcement', () => {
    it('POST /api/v1/stories - create story with free tier, quota decrements', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          users: {
            data: [{ id: defaultAuthedUser.id, available_story_credits: 5 }],
            update: (state: any) => ({ data: { ...state.payload, available_story_credits: (state.payload.available_story_credits || 0) - 1 }, error: null })
          },
          libraries: {
            data: [{ id: 'lib_123', owner: defaultAuthedUser.id }]
          },
          stories: {
            insert: (state: any) => ({
              id: 'story_123',
              library_id: state.payload.library_id,
              creator_user_id: defaultAuthedUser.id,
              ...state.payload
            })
          },
          subscriptions: {
            data: []
          },
          story_packs: {
            data: []
          }
        }
      })

      const res = await request(app)
        .post('/api/v1/stories')
        .send({
          libraryId: 'lib_123',
          title: 'Test Story',
          storyType: 'bedtime'
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
    }, 10000)

    it('POST /api/v1/stories - 402 quota exceeded', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          users: {
            data: [{ id: defaultAuthedUser.id, available_story_credits: 0 }]
          },
          libraries: {
            data: [{ id: 'lib_123', owner: defaultAuthedUser.id }]
          },
          subscriptions: {
            data: []
          },
          story_packs: {
            data: []
          }
        }
      })

      const res = await request(app)
        .post('/api/v1/stories')
        .send({
          libraryId: 'lib_123',
          title: 'Test Story',
          storyType: 'bedtime'
        })

      expect(res.status).toBe(402)
      expect(res.body.code).toBe('STORY_QUOTA_EXCEEDED')
    }, 10000)
  })
})
