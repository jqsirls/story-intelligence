import { PlatformAwareRouter } from '../PlatformAwareRouter';
import { WebhookHandler } from '../services/WebhookHandler';
import { RouterConfig } from '../config';
import {
  EmbeddingConfig,
  WebhookConfig,
  UniversalPlatformConfig,
  VoicePlatform,
  WebhookPayload
} from '@alexa-multi-agent/shared-types';

// Mock dependencies
jest.mock('../services/SmartHomeIntegrator');
jest.mock('../services/WebhookHandler');
jest.mock('@supabase/supabase-js');
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  })),
  format: {
    combine: jest.fn(() => 'combined-format'),
    timestamp: jest.fn(() => 'timestamp-format'),
    json: jest.fn(() => 'json-format')
  },
  transports: {
    Console: jest.fn().mockImplementation(() => ({}))
  }
}));

describe('Enhanced Voice Platform Support', () => {
  let router: PlatformAwareRouter;
  let mockConfig: RouterConfig;

  beforeEach(() => {
    mockConfig = {
      database: {
        url: 'http://localhost:54321',
        apiKey: 'test-key'
      },
      redis: {
        url: 'redis://localhost:6379',
        keyPrefix: 'test'
      },
      openai: {
        apiKey: 'test-openai-key'
      },
      agents: {
        auth: { endpoint: 'http://localhost:3001' },
        content: { endpoint: 'http://localhost:3002' },
        library: { endpoint: 'http://localhost:3003' },
        emotion: { endpoint: 'http://localhost:3004' },
        commerce: { endpoint: 'http://localhost:3005' },
        insights: { endpoint: 'http://localhost:3006' },
        smartHome: { endpoint: 'http://localhost:3007' }
      }
    };

    router = new PlatformAwareRouter(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Third-Party Skill Embedding', () => {
    it('should generate Alexa+ embedding code', async () => {
      const embeddingConfig: EmbeddingConfig = {
        invocationName: 'Test Storytailor',
        description: 'Test storytelling skill',
        category: 'education',
        keywords: ['test', 'storytelling'],
        privacyPolicyUrl: 'https://test.com/privacy',
        termsOfUseUrl: 'https://test.com/terms',
        supportedLocales: ['en-US'],
        targetAudience: 'family',
        contentRating: 'everyone',
        permissions: [
          {
            name: 'alexa::profile:email:read',
            reason: 'Account linking',
            required: true
          }
        ]
      };

      const embeddingCode = await router.generateEmbeddingCode('alexa_plus', embeddingConfig);

      expect(embeddingCode).toBeDefined();
      expect(typeof embeddingCode).toBe('string');
      expect(embeddingCode).toContain('skillManifest');
      expect(embeddingCode).toContain('interactionModel');
      expect(embeddingCode).toContain('Test Storytailor');
    });

    it('should generate Google Assistant embedding code', async () => {
      const embeddingConfig: EmbeddingConfig = {
        actionId: 'test-storytailor-action',
        invocationName: 'Test Storytailor',
        description: 'Test storytelling action',
        category: 'games_and_trivia',
        keywords: ['test', 'storytelling'],
        privacyPolicyUrl: 'https://test.com/privacy',
        termsOfUseUrl: 'https://test.com/terms',
        supportedLocales: ['en-US'],
        targetAudience: 'family',
        contentRating: 'everyone',
        permissions: []
      };

      const embeddingCode = await router.generateEmbeddingCode('google_assistant', embeddingConfig);

      expect(embeddingCode).toBeDefined();
      expect(typeof embeddingCode).toBe('string');
      expect(embeddingCode).toContain('actionConfig');
      expect(embeddingCode).toContain('test-storytailor-action');
    });

    it('should generate Apple Siri embedding code', async () => {
      const embeddingConfig: EmbeddingConfig = {
        shortcutId: 'com.test.storytailor',
        invocationName: 'Test Storytailor',
        description: 'Test storytelling shortcuts',
        category: 'education',
        keywords: ['test', 'storytelling'],
        privacyPolicyUrl: 'https://test.com/privacy',
        termsOfUseUrl: 'https://test.com/terms',
        supportedLocales: ['en-US'],
        targetAudience: 'family',
        contentRating: 'everyone',
        permissions: []
      };

      const embeddingCode = await router.generateEmbeddingCode('apple_siri', embeddingConfig);

      expect(embeddingCode).toBeDefined();
      expect(typeof embeddingCode).toBe('string');
      expect(embeddingCode).toContain('shortcutConfig');
      expect(embeddingCode).toContain('com.test.storytailor');
    });

    it('should throw error for unsupported platform', async () => {
      const embeddingConfig: EmbeddingConfig = {
        invocationName: 'Test',
        description: 'Test',
        category: 'test',
        keywords: [],
        privacyPolicyUrl: 'https://test.com/privacy',
        termsOfUseUrl: 'https://test.com/terms',
        supportedLocales: ['en-US'],
        targetAudience: 'family',
        contentRating: 'everyone',
        permissions: []
      };

      await expect(
        router.generateEmbeddingCode('unsupported_platform' as VoicePlatform, embeddingConfig)
      ).rejects.toThrow('Unsupported platform: unsupported_platform');
    });
  });

  describe('Webhook System', () => {
    let mockWebhookHandler: jest.Mocked<WebhookHandler>;

    beforeEach(() => {
      mockWebhookHandler = {
        registerWebhook: jest.fn(),
        handleWebhook: jest.fn(),
        getWebhookStatus: jest.fn(),
        listWebhooks: jest.fn(),
        unregisterWebhook: jest.fn()
      } as any;

      (router as any).webhookHandler = mockWebhookHandler;
    });

    it('should set up webhook for platform', async () => {
      const webhookConfig: WebhookConfig = {
        url: 'https://test.com/webhook',
        events: [
          { type: 'skill_enabled' },
          { type: 'account_linked' }
        ],
        secret: 'test-secret'
      };

      const expectedResult = {
        webhookId: 'test-webhook-id',
        status: 'active' as const,
        verificationToken: 'test-token'
      };

      mockWebhookHandler.registerWebhook.mockResolvedValue(expectedResult);

      const result = await router.setupWebhook('alexa_plus', webhookConfig);

      expect(mockWebhookHandler.registerWebhook).toHaveBeenCalledWith('alexa_plus', webhookConfig);
      expect(result).toEqual(expectedResult);
    });

    it('should handle incoming webhook', async () => {
      const payload: WebhookPayload = {
        eventType: 'skill_enabled',
        timestamp: new Date().toISOString(),
        userId: 'test-user',
        platform: 'alexa_plus',
        data: { skillId: 'test-skill' }
      };

      const headers = {
        'x-signature': 'test-signature',
        'content-type': 'application/json'
      };

      const expectedResult = { status: 'processed' };

      mockWebhookHandler.handleWebhook.mockResolvedValue(expectedResult);

      const result = await router.handleWebhook('alexa_plus', payload, headers);

      expect(mockWebhookHandler.handleWebhook).toHaveBeenCalledWith('alexa_plus', payload, headers);
      expect(result).toEqual(expectedResult);
    });

    it('should get webhook status', () => {
      const webhookId = 'test-webhook-id';
      const expectedStatus = {
        id: webhookId,
        platform: 'alexa_plus' as VoicePlatform,
        status: 'active' as const,
        createdAt: new Date()
      };

      mockWebhookHandler.getWebhookStatus.mockReturnValue(expectedStatus);

      const result = router.getWebhookStatus(webhookId);

      expect(mockWebhookHandler.getWebhookStatus).toHaveBeenCalledWith(webhookId);
      expect(result).toEqual(expectedStatus);
    });

    it('should list all webhooks', () => {
      const expectedWebhooks = [
        {
          id: 'webhook-1',
          platform: 'alexa_plus' as VoicePlatform,
          status: 'active' as const,
          createdAt: new Date()
        },
        {
          id: 'webhook-2',
          platform: 'google_assistant' as VoicePlatform,
          status: 'active' as const,
          createdAt: new Date()
        }
      ];

      mockWebhookHandler.listWebhooks.mockReturnValue(expectedWebhooks);

      const result = router.listWebhooks();

      expect(mockWebhookHandler.listWebhooks).toHaveBeenCalled();
      expect(result).toEqual(expectedWebhooks);
    });

    it('should unregister webhook', async () => {
      const webhookId = 'test-webhook-id';

      mockWebhookHandler.unregisterWebhook.mockResolvedValue();

      await router.unregisterWebhook(webhookId);

      expect(mockWebhookHandler.unregisterWebhook).toHaveBeenCalledWith(webhookId);
    });
  });

  describe('Universal Platform Adapter', () => {
    it('should register universal platform adapter', () => {
      const universalConfig: UniversalPlatformConfig = {
        platformName: 'test_platform',
        version: '1.0',
        capabilities: ['smart_home', 'voice_synthesis'],
        requestFormat: 'json',
        responseFormat: 'json',
        authentication: {
          type: 'bearer_token',
          config: { tokenHeader: 'Authorization' }
        },
        endpoints: {
          conversation: 'https://test.com/conversation'
        },
        requestMapping: {
          userId: 'user.id',
          sessionId: 'session.id',
          intent: 'intent.name',
          parameters: 'intent.parameters'
        },
        responseMapping: {
          speech: 'response.speech',
          shouldEndSession: 'response.endSession'
        }
      };

      expect(() => {
        router.registerUniversalPlatform('test_platform', universalConfig);
      }).not.toThrow();

      const supportedPlatforms = router.getSupportedPlatforms();
      expect(supportedPlatforms).toContain('test_platform');
    });

    it('should handle requests from universal platform', async () => {
      const universalConfig: UniversalPlatformConfig = {
        platformName: 'test_platform',
        version: '1.0',
        capabilities: ['smart_home'],
        requestFormat: 'json',
        responseFormat: 'json',
        authentication: {
          type: 'bearer_token',
          config: { tokenHeader: 'Authorization' }
        },
        endpoints: {
          conversation: 'https://test.com/conversation'
        },
        requestMapping: {
          userId: 'user.id',
          sessionId: 'session.id',
          intent: 'intent.name',
          parameters: 'intent.parameters'
        },
        responseMapping: {
          speech: 'response.speech',
          shouldEndSession: 'response.endSession'
        }
      };

      router.registerUniversalPlatform('test_platform', universalConfig);

      const testRequest = {
        user: { id: 'test-user' },
        session: { id: 'test-session' },
        intent: { name: 'CreateStoryIntent', parameters: { storyType: 'bedtime' } }
      };

      // Mock the router's internal methods
      jest.spyOn(router as any, 'processStandardizedRequest').mockResolvedValue({
        speech: 'Hello! Let\'s create a bedtime story.',
        shouldEndSession: false
      });

      const response = await router.handleRequest(testRequest, 'test_platform' as VoicePlatform);

      expect(response).toBeDefined();
      expect(response.response.speech).toBe('Hello! Let\'s create a bedtime story.');
    });
  });

  describe('Smart Home Synchronization', () => {
    it('should synchronize smart home across all platforms', async () => {
      const userId = 'test-user';
      const smartHomeAction = {
        type: 'set_story_environment',
        storyType: 'bedtime',
        userId: userId
      };

      // Mock smart home integrator
      const mockSmartHomeIntegrator = {
        executeAction: jest.fn().mockResolvedValue(undefined)
      };
      (router as any).smartHomeIntegrator = mockSmartHomeIntegrator;

      await router.synchronizeSmartHomeAcrossPlatforms(userId, smartHomeAction);

      // Should call executeAction for each platform that supports smart home
      const supportedPlatforms = router.getSupportedPlatforms().filter(platform =>
        router.platformSupportsSmartHome(platform)
      );

      expect(mockSmartHomeIntegrator.executeAction).toHaveBeenCalledTimes(supportedPlatforms.length);

      supportedPlatforms.forEach(platform => {
        expect(mockSmartHomeIntegrator.executeAction).toHaveBeenCalledWith(
          userId,
          smartHomeAction,
          platform
        );
      });
    });

    it('should handle smart home sync failures gracefully', async () => {
      const userId = 'test-user';
      const smartHomeAction = {
        type: 'set_story_environment',
        storyType: 'adventure',
        userId: userId
      };

      // Mock smart home integrator to fail for some platforms
      const mockSmartHomeIntegrator = {
        executeAction: jest.fn()
          .mockResolvedValueOnce(undefined) // Success for first platform
          .mockRejectedValueOnce(new Error('Platform error')) // Failure for second platform
          .mockResolvedValueOnce(undefined) // Success for third platform
      };
      (router as any).smartHomeIntegrator = mockSmartHomeIntegrator;

      // Should not throw error even if some platforms fail
      await expect(
        router.synchronizeSmartHomeAcrossPlatforms(userId, smartHomeAction)
      ).resolves.not.toThrow();
    });
  });

  describe('Platform Capabilities', () => {
    it('should return correct supported platforms', () => {
      const supportedPlatforms = router.getSupportedPlatforms();

      expect(supportedPlatforms).toContain('alexa_plus');
      expect(supportedPlatforms).toContain('google_assistant');
      expect(supportedPlatforms).toContain('apple_siri');
      expect(supportedPlatforms).toContain('microsoft_cortana');
    });

    it('should return platform capabilities', () => {
      const alexaCapabilities = router.getPlatformCapabilities('alexa_plus');

      expect(alexaCapabilities).toContain('smart_home');
      expect(alexaCapabilities).toContain('multi_agent');
      expect(alexaCapabilities).toContain('voice_synthesis');
      expect(alexaCapabilities).toContain('third_party_embedding');
      expect(alexaCapabilities).toContain('webhook_support');
    });

    it('should check smart home support correctly', () => {
      expect(router.platformSupportsSmartHome('alexa_plus')).toBe(true);
      expect(router.platformSupportsSmartHome('google_assistant')).toBe(true);
      expect(router.platformSupportsSmartHome('apple_siri')).toBe(true);
    });

    it('should return empty capabilities for unsupported platform', () => {
      const capabilities = router.getPlatformCapabilities('unsupported_platform' as VoicePlatform);
      expect(capabilities).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle embedding code generation errors', async () => {
      const embeddingConfig: EmbeddingConfig = {
        invocationName: 'Test',
        description: 'Test',
        category: 'test',
        keywords: [],
        privacyPolicyUrl: 'https://test.com/privacy',
        termsOfUseUrl: 'https://test.com/terms',
        supportedLocales: ['en-US'],
        targetAudience: 'family',
        contentRating: 'everyone',
        permissions: []
      };

      // Mock adapter to throw error
      const mockAdapter = {
        supportsThirdPartyEmbedding: jest.fn().mockReturnValue(true),
        generateEmbeddingCode: jest.fn().mockRejectedValue(new Error('Generation failed'))
      };

      (router as any).platformAdapters.set('alexa_plus', mockAdapter);

      await expect(
        router.generateEmbeddingCode('alexa_plus', embeddingConfig)
      ).rejects.toThrow('Generation failed');
    });

    it('should handle webhook setup errors', async () => {
      const webhookConfig: WebhookConfig = {
        url: 'https://test.com/webhook',
        events: [{ type: 'skill_enabled' }]
      };

      const mockWebhookHandler = {
        registerWebhook: jest.fn().mockRejectedValue(new Error('Webhook setup failed'))
      };
      (router as any).webhookHandler = mockWebhookHandler;

      await expect(
        router.setupWebhook('alexa_plus', webhookConfig)
      ).rejects.toThrow('Webhook setup failed');
    });

    it('should handle webhook handling errors', async () => {
      const payload: WebhookPayload = {
        eventType: 'skill_enabled',
        timestamp: new Date().toISOString(),
        platform: 'alexa_plus',
        data: {}
      };

      const mockWebhookHandler = {
        handleWebhook: jest.fn().mockRejectedValue(new Error('Webhook handling failed'))
      };
      (router as any).webhookHandler = mockWebhookHandler;

      await expect(
        router.handleWebhook('alexa_plus', payload, {})
      ).rejects.toThrow('Webhook handling failed');
    });
  });
});

describe('WebhookHandler', () => {
  let webhookHandler: WebhookHandler;
  let mockConfig: RouterConfig;

  beforeEach(() => {
    mockConfig = {
      database: {
        url: 'http://localhost:54321',
        apiKey: 'test-key'
      },
      redis: {
        url: 'redis://localhost:6379',
        keyPrefix: 'test'
      },
      agents: {
        auth: { endpoint: 'http://localhost:3001' },
        content: { endpoint: 'http://localhost:3002' },
        library: { endpoint: 'http://localhost:3003' },
        emotion: { endpoint: 'http://localhost:3004' },
        commerce: { endpoint: 'http://localhost:3005' },
        insights: { endpoint: 'http://localhost:3006' },
        smartHome: { endpoint: 'http://localhost:3007' }
      }
    };

    webhookHandler = new WebhookHandler(mockConfig);
  });

  describe('Webhook Event Processing', () => {
    it('should process skill enabled event', async () => {
      const payload: WebhookPayload = {
        eventType: 'skill_enabled',
        timestamp: new Date().toISOString(),
        userId: 'test-user',
        platform: 'alexa_plus',
        data: { skillId: 'test-skill' }
      };

      const result = await (webhookHandler as any).processWebhookEvent('alexa_plus', payload);

      expect(result).toEqual({ status: 'processed' });
    });

    it('should process account linked event', async () => {
      const payload: WebhookPayload = {
        eventType: 'account_linked',
        timestamp: new Date().toISOString(),
        userId: 'test-user',
        platform: 'alexa_plus',
        data: { accountToken: 'test-token' }
      };

      const result = await (webhookHandler as any).processWebhookEvent('alexa_plus', payload);

      expect(result).toEqual({ status: 'processed' });
    });

    it('should process smart home discovery event', async () => {
      const payload: WebhookPayload = {
        eventType: 'smart_home_discovery',
        timestamp: new Date().toISOString(),
        userId: 'test-user',
        platform: 'alexa_plus',
        data: { requestId: 'discovery-123' }
      };

      // Mock getUserSmartHomeDevices
      jest.spyOn(webhookHandler as any, 'getUserSmartHomeDevices').mockResolvedValue([
        {
          id: 'device-1',
          device_name: 'Living Room Light',
          device_type: 'philips_hue',
          room_name: 'Living Room'
        }
      ]);

      const result = await (webhookHandler as any).processWebhookEvent('alexa_plus', payload);

      expect(result.status).toBe('processed');
      expect(result.devices).toBeDefined();
      expect(Array.isArray(result.devices)).toBe(true);
    });

    it('should handle unknown event types', async () => {
      const payload: WebhookPayload = {
        eventType: 'unknown_event',
        timestamp: new Date().toISOString(),
        platform: 'alexa_plus',
        data: {}
      };

      const result = await (webhookHandler as any).processWebhookEvent('alexa_plus', payload);

      expect(result).toEqual({ status: 'ignored' });
    });
  });
});