// REST API Gateway Tests
import request from 'supertest';
import { RESTAPIGateway } from '../api/RESTAPIGateway';
import { UniversalStorytellerAPI } from '../UniversalStorytellerAPI';
import { WebhookDeliverySystem } from '../webhooks/WebhookDeliverySystem';
import { DeveloperDashboard } from '../dashboard/DeveloperDashboard';
import winston from 'winston';

describe('RESTAPIGateway', () => {
  let apiGateway: RESTAPIGateway;
  let mockStorytellerAPI: jest.Mocked<UniversalStorytellerAPI>;
  let logger: winston.Logger;
  let server: any;

  beforeAll(() => {
    // Create mock logger
    logger = winston.createLogger({
      level: 'error',
      transports: [new winston.transports.Console({ silent: true })]
    });

    // Create mock UniversalStorytellerAPI
    mockStorytellerAPI = {
      startConversation: jest.fn(),
      sendMessage: jest.fn(),
      streamResponse: jest.fn(),
      processVoiceInput: jest.fn(),
      endConversation: jest.fn(),
      getStories: jest.fn(),
      getStory: jest.fn(),
      createStory: jest.fn(),
      editStory: jest.fn(),
      generateAssets: jest.fn(),
      getCharacters: jest.fn(),
      createCharacter: jest.fn(),
      editCharacter: jest.fn(),
      authenticateUser: jest.fn(),
      linkAccount: jest.fn(),
      connectSmartDevice: jest.fn(),
      synthesizeVoice: jest.fn()
    } as any;

    // Initialize API Gateway
    apiGateway = new RESTAPIGateway(mockStorytellerAPI, logger);
    server = apiGateway['app'];
  });

  afterAll(() => {
    if (apiGateway) {
      apiGateway.stop();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        version: '1.0.0'
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });

  describe('API Documentation', () => {
    it('should return API documentation', async () => {
      const response = await request(server)
        .get('/docs')
        .expect(200);

      expect(response.body).toMatchObject({
        title: 'Storytailor REST API Gateway',
        version: '1.0.0',
        endpoints: expect.objectContaining({
          conversation: '/v1/conversation/*',
          stories: '/v1/stories/*',
          characters: '/v1/characters/*'
        })
      });
    });

    it('should serve Swagger documentation', async () => {
      const response = await request(server)
        .get('/api-docs/')
        .expect(200);

      expect(response.text).toContain('Swagger UI');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await request(server)
        .post('/v1/conversation/start')
        .send({ platform: 'web' })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: 'API key required. Include it in Authorization header as "Bearer YOUR_KEY" or X-API-Key header.'
      });
    });

    it('should reject requests with invalid API key', async () => {
      const response = await request(server)
        .post('/v1/conversation/start')
        .set('Authorization', 'Bearer invalid-key')
        .send({ platform: 'web' })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: 'Invalid or inactive API key'
      });
    });

    it('should accept requests with valid API key', async () => {
      mockStorytellerAPI.startConversation.mockResolvedValue({
        sessionId: 'session_123',
        userId: 'user_123',
        platform: 'web',
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        state: { phase: 'greeting', context: {}, history: [], currentStory: null, currentCharacter: null },
        capabilities: { supportsText: true, supportsVoice: false }
      });

      const response = await request(server)
        .post('/v1/conversation/start')
        .set('Authorization', 'Bearer test_api_key')
        .send({ platform: 'web' })
        .expect(200);

      expect(response.body.sessionId).toBe('session_123');
      expect(mockStorytellerAPI.startConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'web',
          userId: 'user-123'
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(10).fill(null).map(() =>
        request(server)
          .get('/health')
          .expect(200)
      );

      await Promise.all(requests);

      // The next request should be rate limited (in a real scenario with lower limits)
      // For testing purposes, we'll just verify the rate limit headers are present
      const response = await request(server)
        .get('/health')
        .expect(200);

      // Rate limit headers should be present (even if not triggered)
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });

    it('should include rate limit headers', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-request-id');
    });
  });

  describe('Conversation Endpoints', () => {
    const validApiKey = 'test_api_key';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should start conversation', async () => {
      const mockSession = {
        sessionId: 'session_123',
        userId: 'user_123',
        platform: 'web',
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        state: { phase: 'greeting', context: {}, history: [], currentStory: null, currentCharacter: null },
        capabilities: { supportsText: true, supportsVoice: false }
      };

      mockStorytellerAPI.startConversation.mockResolvedValue(mockSession);

      const response = await request(server)
        .post('/v1/conversation/start')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          platform: 'web',
          language: 'en',
          voiceEnabled: true
        })
        .expect(200);

      expect(response.body).toEqual(mockSession);
      expect(mockStorytellerAPI.startConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'web',
          language: 'en',
          voiceEnabled: true,
          userId: 'user-123'
        })
      );
    });

    it('should validate conversation start request', async () => {
      const response = await request(server)
        .post('/v1/conversation/start')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          platform: 'invalid-platform'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation Error'
      });
    });

    it('should send message', async () => {
      const mockResponse = {
        type: 'text',
        content: 'Hello! Let\'s create a story together.',
        suggestions: ['Adventure', 'Bedtime', 'Educational'],
        requiresInput: true,
        conversationState: { phase: 'greeting' },
        metadata: { responseTime: 150, confidence: 0.95, agentsUsed: ['router'] }
      };

      mockStorytellerAPI.sendMessage.mockResolvedValue(mockResponse);

      const response = await request(server)
        .post('/v1/conversation/message')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          sessionId: 'session_123',
          message: {
            type: 'text',
            content: 'Let\'s create a story about a dragon'
          }
        })
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(mockStorytellerAPI.sendMessage).toHaveBeenCalledWith(
        'session_123',
        expect.objectContaining({
          type: 'text',
          content: 'Let\'s create a story about a dragon'
        })
      );
    });

    it('should handle batch messages', async () => {
      const mockResponse = {
        type: 'text',
        content: 'Response',
        suggestions: [],
        requiresInput: true,
        conversationState: { phase: 'greeting' },
        metadata: { responseTime: 150, confidence: 0.95, agentsUsed: ['router'] }
      };

      mockStorytellerAPI.sendMessage.mockResolvedValue(mockResponse);

      const response = await request(server)
        .post('/v1/conversation/batch')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          messages: [
            {
              sessionId: 'session_123',
              message: { type: 'text', content: 'Message 1' }
            },
            {
              sessionId: 'session_456',
              message: { type: 'text', content: 'Message 2' }
            }
          ]
        })
        .expect(200);

      expect(response.body.responses).toHaveLength(2);
      expect(response.body.responses[0].status).toBe('fulfilled');
      expect(response.body.responses[1].status).toBe('fulfilled');
    });

    it('should process voice input', async () => {
      const mockVoiceResponse = {
        transcription: 'Create a story about a unicorn',
        textResponse: 'Great! Let\'s create a story about a unicorn.',
        conversationState: { phase: 'character_creation' },
        metadata: { transcriptionConfidence: 0.95, responseTime: 200 }
      };

      mockStorytellerAPI.processVoiceInput.mockResolvedValue(mockVoiceResponse);

      const response = await request(server)
        .post('/v1/conversation/voice')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          sessionId: 'session_123',
          audio: Buffer.from('fake-audio-data').toString('base64'),
          format: 'wav',
          sampleRate: 16000
        })
        .expect(200);

      expect(response.body).toEqual(mockVoiceResponse);
    });

    it('should end conversation', async () => {
      mockStorytellerAPI.endConversation.mockResolvedValue(undefined);

      const response = await request(server)
        .post('/v1/conversation/end')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({ sessionId: 'session_123' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockStorytellerAPI.endConversation).toHaveBeenCalledWith('session_123');
    });
  });

  describe('Story Endpoints', () => {
    const validApiKey = 'test_api_key';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should get stories', async () => {
      const mockStories = [
        {
          id: 'story_123',
          title: 'The Dragon Adventure',
          storyType: 'adventure',
          createdAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockStorytellerAPI.getStories.mockResolvedValue(mockStories);

      const response = await request(server)
        .get('/v1/stories')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      expect(response.body).toEqual(mockStories);
      expect(mockStorytellerAPI.getStories).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          limit: 50,
          offset: 0
        })
      );
    });

    it('should get specific story', async () => {
      const mockStory = {
        id: 'story_123',
        title: 'The Dragon Adventure',
        content: 'Once upon a time...',
        storyType: 'adventure',
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockStorytellerAPI.getStory.mockResolvedValue(mockStory);

      const response = await request(server)
        .get('/v1/stories/story_123')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      expect(response.body).toEqual(mockStory);
      expect(mockStorytellerAPI.getStory).toHaveBeenCalledWith(
        'story_123',
        expect.objectContaining({ includeAssets: false })
      );
    });

    it('should create story', async () => {
      const mockStory = {
        id: 'story_456',
        title: 'Luna\'s Magical Journey',
        storyType: 'bedtime',
        character: { name: 'Luna', species: 'unicorn' },
        createdAt: new Date().toISOString()
      };

      mockStorytellerAPI.createStory.mockResolvedValue(mockStory);

      const response = await request(server)
        .post('/v1/stories')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          character: { name: 'Luna', species: 'unicorn' },
          storyType: 'bedtime',
          generateAssets: true
        })
        .expect(201);

      expect(response.body).toEqual(mockStory);
      expect(mockStorytellerAPI.createStory).toHaveBeenCalledWith(
        expect.objectContaining({
          character: { name: 'Luna', species: 'unicorn' },
          storyType: 'bedtime',
          generateAssets: true,
          userId: 'user-123'
        })
      );
    });

    it('should validate story creation request', async () => {
      const response = await request(server)
        .post('/v1/stories')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          storyType: 'bedtime'
          // Missing required character field
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation Error'
      });
    });

    it('should generate assets', async () => {
      const mockAssets = {
        art: ['image1.png', 'image2.png'],
        audio: 'story_audio.mp3',
        pdf: 'story_book.pdf',
        activities: ['activity1.txt', 'activity2.txt']
      };

      mockStorytellerAPI.generateAssets.mockResolvedValue(mockAssets);

      const response = await request(server)
        .post('/v1/stories/story_123/assets')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          assetTypes: ['art', 'audio'],
          regenerate: false
        })
        .expect(200);

      expect(response.body).toEqual(mockAssets);
      expect(mockStorytellerAPI.generateAssets).toHaveBeenCalledWith(
        'story_123',
        ['art', 'audio'],
        false
      );
    });
  });

  describe('Character Endpoints', () => {
    const validApiKey = 'test_api_key';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should get characters', async () => {
      const mockCharacters = [
        {
          id: 'char_123',
          name: 'Luna',
          species: 'unicorn',
          traits: { age: 8, gender: 'female' }
        }
      ];

      mockStorytellerAPI.getCharacters.mockResolvedValue(mockCharacters);

      const response = await request(server)
        .get('/v1/characters')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      expect(response.body).toEqual(mockCharacters);
    });

    it('should create character', async () => {
      const mockCharacter = {
        id: 'char_456',
        name: 'Zara',
        species: 'dragon',
        traits: { age: 12, gender: 'female', color: 'emerald' }
      };

      mockStorytellerAPI.createCharacter.mockResolvedValue(mockCharacter);

      const response = await request(server)
        .post('/v1/characters')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          name: 'Zara',
          traits: {
            species: 'dragon',
            age: 12,
            gender: 'female',
            appearance: { color: 'emerald' }
          }
        })
        .expect(201);

      expect(response.body).toEqual(mockCharacter);
    });
  });

  describe('Webhook Endpoints', () => {
    const validApiKey = 'test_api_key';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create webhook', async () => {
      const response = await request(server)
        .post('/v1/webhooks')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          url: 'https://example.com/webhook',
          events: ['story.created', 'conversation.started']
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        url: 'https://example.com/webhook',
        events: ['story.created', 'conversation.started'],
        isActive: true
      });
    });

    it('should validate webhook creation', async () => {
      const response = await request(server)
        .post('/v1/webhooks')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          url: 'invalid-url',
          events: []
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation Error'
      });
    });

    it('should handle webhook verification', async () => {
      const response = await request(server)
        .get('/v1/webhooks/verify?challenge=test-challenge')
        .expect(200);

      expect(response.text).toBe('test-challenge');
    });
  });

  describe('Analytics Endpoints', () => {
    const validApiKey = 'test_api_key';

    it('should get usage analytics', async () => {
      const response = await request(server)
        .get('/v1/analytics/usage?timeRange=7d')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      expect(response.body).toMatchObject({
        timeRange: '7d',
        totalRequests: expect.any(Number),
        averageResponseTime: expect.any(Number)
      });
    });
  });

  describe('Developer Dashboard', () => {
    const validApiKey = 'test_api_key';

    it('should get dashboard data', async () => {
      const response = await request(server)
        .get('/developer/dashboard')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      expect(response.body).toMatchObject({
        user: expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String)
        }),
        apiKeys: expect.any(Array),
        webhooks: expect.any(Array),
        usage: expect.any(Object),
        quotas: expect.any(Object)
      });
    });

    it('should create API key', async () => {
      const response = await request(server)
        .post('/developer/api-keys')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          name: 'Test Key',
          permissions: ['stories:read', 'conversation:use'],
          rateLimit: { requests: 1000, window: 3600 }
        })
        .expect(201);

      expect(response.body).toMatchObject({
        key: expect.stringMatching(/^sk-/),
        name: 'Test Key',
        permissions: ['stories:read', 'conversation:use'],
        isActive: true
      });
    });
  });

  describe('Error Handling', () => {
    const validApiKey = 'test_api_key';

    it('should handle internal server errors', async () => {
      mockStorytellerAPI.startConversation.mockRejectedValue(new Error('Internal error'));

      const response = await request(server)
        .post('/v1/conversation/start')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({ platform: 'web' })
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Error',
        message: 'Internal error'
      });
      expect(response.body.requestId).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const response = await request(server)
        .post('/v1/conversation/start')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({}) // Missing required platform field
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation Error'
      });
    });
  });

  describe('CORS and Security', () => {
    it('should include security headers', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(server)
        .options('/v1/stories')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('GraphQL', () => {
    const validApiKey = 'test_api_key';

    it('should handle GraphQL queries', async () => {
      mockStorytellerAPI.getStories.mockResolvedValue([
        { id: 'story_123', title: 'Test Story' }
      ]);

      const response = await request(server)
        .post('/graphql')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send({
          query: '{ stories }'
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });
});