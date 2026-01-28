import request from 'supertest'
import { makeTestApp } from '../helpers/makeTestApp'

describe('Story Feedback', () => {
  describe('GET /api/v1/stories/:id/feedback/summary', () => {
    it('returns 401 when not authenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app).get('/api/v1/stories/story_123/feedback/summary')

      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })

    it('returns 404 when story not found', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          stories: { data: [] }
        }
      })

      const res = await request(app).get('/api/v1/stories/story_123/feedback/summary')

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('STORY_NOT_FOUND')
    })

    it('returns summary data', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          stories: {
            data: [{ id: 'story_123', library_id: 'lib_123' }]
          },
          libraries: {
            data: [{ id: 'lib_123', owner: 'user_123' }]
          },
          rpc: {
            get_story_feedback_summary: () => ({ data: { averageRating: 4.5, totalCount: 10 }, error: null })
          }
        }
      })

      const res = await request(app).get('/api/v1/stories/story_123/feedback/summary')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
    })
  })

  describe('POST /api/v1/stories/:id/feedback', () => {
    it('returns 401 when not authenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app)
        .post('/api/v1/stories/story_123/feedback')
        .send({ sentiment: 'positive' })

      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })

    it('returns 400 on invalid payload', async () => {
      const { app } = await makeTestApp()
      const res = await request(app)
        .post('/api/v1/stories/story_123/feedback')
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('INVALID_FEEDBACK_PAYLOAD')
    })

    it('returns 404 when story not found', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          stories: { data: [] }
        }
      })

      const res = await request(app)
        .post('/api/v1/stories/story_123/feedback')
        .send({ sentiment: 'positive', rating: 5 })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('STORY_NOT_FOUND')
    })

    it('creates feedback successfully', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          stories: {
            data: [{ id: 'story_123' }]
          },
          story_feedback: {
            insert: (state: any) => ({
              id: 'fb_123',
              story_id: state.payload.story_id,
              user_id: state.payload.user_id,
              rating: state.payload.rating,
              sentiment: state.payload.sentiment,
              message: state.payload.message
            })
          }
        }
      })

      const res = await request(app)
        .post('/api/v1/stories/story_123/feedback')
        .send({ sentiment: 'positive', rating: 5, message: 'Great story!' })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.sentiment).toBe('positive')
    })
  })
})

describe('Character Feedback', () => {
  describe('GET /api/v1/characters/:id/feedback/summary', () => {
    it('returns 401 when not authenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app).get('/api/v1/characters/char_123/feedback/summary')

      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })

    it('returns 404 when character not found', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          characters: { data: [] }
        }
      })

      const res = await request(app).get('/api/v1/characters/char_123/feedback/summary')

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('CHARACTER_NOT_FOUND')
    })

    it('returns summary data', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          characters: {
            data: [{ id: 'char_123', library_id: 'lib_123' }]
          },
          libraries: {
            data: [{ id: 'lib_123', owner: 'user_123' }]
          },
          rpc: {
            get_character_feedback_summary: () => ({ data: { averageRating: 4.0, totalCount: 5 }, error: null })
          }
        }
      })

      const res = await request(app).get('/api/v1/characters/char_123/feedback/summary')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
    })
  })

  describe('POST /api/v1/characters/:id/feedback', () => {
    it('returns 401 when not authenticated', async () => {
      const { app } = await makeTestApp({ authedUser: null })
      const res = await request(app)
        .post('/api/v1/characters/char_123/feedback')
        .send({ sentiment: 'positive' })

      expect(res.status).toBe(401)
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING')
    })

    it('returns 400 on invalid payload', async () => {
      const { app } = await makeTestApp()
      const res = await request(app)
        .post('/api/v1/characters/char_123/feedback')
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('INVALID_FEEDBACK_PAYLOAD')
    })

    it('returns 404 when character not found', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          characters: { data: [] }
        }
      })

      const res = await request(app)
        .post('/api/v1/characters/char_123/feedback')
        .send({ sentiment: 'positive', rating: 5 })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('CHARACTER_NOT_FOUND')
    })

    it('creates feedback successfully', async () => {
      const { app } = await makeTestApp({
        supabaseFixtures: {
          characters: {
            data: [{ id: 'char_123' }]
          },
          character_feedback: {
            insert: (state: any) => ({
              id: 'fb_123',
              character_id: state.payload.character_id,
              user_id: state.payload.user_id,
              rating: state.payload.rating,
              sentiment: state.payload.sentiment,
              message: state.payload.message
            })
          }
        }
      })

      const res = await request(app)
        .post('/api/v1/characters/char_123/feedback')
        .send({ sentiment: 'positive', rating: 5, message: 'Great character!' })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.sentiment).toBe('positive')
    })
  })
})
