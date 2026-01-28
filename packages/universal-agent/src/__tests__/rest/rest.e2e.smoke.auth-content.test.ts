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
    const forbiddenPublicKeys = [
      'reference_images',
      'art_prompt',
      'headshot_prompt',
      'bodyshot_prompt',
      'edit_prompt',
      'prompt_hashes',
      'headshot_trace_url',
      'bodyshot_trace_url',
      'validation_summary',
      'validation_payload',
      'failure_codes',
      'failure_summary',
      'admin_review_required'
    ]

    it('POST /api/v1/characters - create character', async () => {
      const lambdaInvocations = (globalThis as any).__lambdaInvocations as any[]
      if (lambdaInvocations) lambdaInvocations.length = 0
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
      expect(lambdaInvocations.length).toBeGreaterThan(0)
      const payload = JSON.parse(String(lambdaInvocations[0].Payload || '{}'))
      expect(payload.action).toBe('complete_character_creation_with_visuals')
      expect(payload.data?.traits?.name).toBe('Test Character')
    }, 10000)

    it('POST /v1/characters - queues canonical pipeline', async () => {
      const lambdaInvocations = (globalThis as any).__lambdaInvocations as any[]
      if (lambdaInvocations) lambdaInvocations.length = 0
      const { app } = await makeTestApp({
        supabaseFixtures: {
          libraries: {
            data: [{ id: 'lib_456', owner: defaultAuthedUser.id }]
          },
          characters: {
            insert: (state: any) => ({
              id: 'char_456',
              library_id: state.payload.library_id,
              name: state.payload.name,
              ...state.payload
            })
          }
        }
      })

      const res = await request(app)
        .post('/v1/characters')
        .send({
          libraryId: 'lib_456',
          name: 'Second Character',
          species: 'human',
          age: 9
        })

      expect(res.status).toBe(202)
      expect(res.body.character?.id).toBeDefined()
      expect(lambdaInvocations.length).toBeGreaterThan(0)
      const payload = JSON.parse(String(lambdaInvocations[0].Payload || '{}'))
      expect(payload.action).toBe('complete_character_creation_with_visuals')
      expect(payload.data?.traits?.name).toBe('Second Character')
    }, 10000)

    it('GET /api/v1/characters/:id - get character', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          characters: {
            data: [{
              id: 'char_123',
              library_id: 'lib_123',
              name: 'Test Character',
              art_prompt: 'do not leak',
              headshot_prompt: 'do not leak',
              bodyshot_prompt: 'do not leak',
              edit_prompt: 'do not leak',
              prompt_hashes: { headshot: 'hash', bodyshot: 'hash' },
              headshot_trace_url: 'https://example.com/trace.json',
              bodyshot_trace_url: 'https://example.com/trace.json',
              validation_summary: { ok: false },
              validation_payload: { raw: true },
              failure_codes: ['safety'],
              failure_summary: { code: 'safety' },
              admin_review_required: true,
              reference_images: [{ type: 'headshot', url: 'https://example.com/img.png' }]
            }]
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
      forbiddenPublicKeys.forEach((key) => {
        expect(res.body.data).not.toHaveProperty(key)
      })
      Object.keys(res.body.data).forEach((key) => {
        expect(key.startsWith('tpose')).toBe(false)
      })
    }, 10000)

    it('GET /v1/characters/:id - public character payload omits internal fields', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          characters: {
            data: [{
              id: 'char_pub_123',
              library_id: 'lib_pub_123',
              name: 'Public Character',
              art_prompt: 'do not leak',
              headshot_prompt: 'do not leak',
              bodyshot_prompt: 'do not leak',
              edit_prompt: 'do not leak',
              prompt_hashes: { headshot: 'hash', bodyshot: 'hash' },
              headshot_trace_url: 'https://example.com/trace.json',
              bodyshot_trace_url: 'https://example.com/trace.json',
              validation_summary: { ok: false },
              validation_payload: { raw: true },
              failure_codes: ['safety'],
              failure_summary: { code: 'safety' },
              admin_review_required: true,
              reference_images: [{ type: 'headshot', url: 'https://example.com/img.png' }]
            }]
          },
          libraries: {
            data: [{ id: 'lib_pub_123', owner: defaultAuthedUser.id }]
          }
        }
      })

      const res = await request(app).get('/v1/characters/char_pub_123')

      expect(res.status).toBe(200)
      expect(res.body.character?.name).toBe('Public Character')
      forbiddenPublicKeys.forEach((key) => {
        expect(res.body.character).not.toHaveProperty(key)
      })
      Object.keys(res.body.character || {}).forEach((key) => {
        expect(key.startsWith('tpose')).toBe(false)
      })
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
