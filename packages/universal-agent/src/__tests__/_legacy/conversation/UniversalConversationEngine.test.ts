import { UniversalConversationEngine, ConversationChannel, ConversationRequest, ConversationStartRequest } from '../UniversalConversationEngine';
import { UniversalConversationManager } from '../UniversalConversationManager';
import { AlexaChannelAdapter } from '../adapters/AlexaChannelAdapter';
import { WebChatChannelAdapter } from '../adapters/WebChatChannelAdapter';
import { MobileVoiceChannelAdapter } from '../adapters/MobileVoiceChannelAdapter';
import { APIChannelAdapter } from '../adapters/APIChannelAdapter';
import { PlatformAwareRouter } from '@alexa-multi-agent/router';
import { EventPublisher } from '@alexa-multi-agent/event-system';
import { Logger } from 'winston';

// Mock dependencies
jest.mock('@alexa-multi-agent/router');
jest.mock('@alexa-multi-agent/event-system');
jest.mock('winston');

describe('UniversalConversationEngine', () => {
  let conversationEngine: UniversalConversationEngine;
  let mockRouter: jest.Mocked<PlatformAwareRouter>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockRouter = {
      handleRequest: jest.fn(),
      supportsStreaming: false,
      streamResponse: jest.fn()
    } as any;

    mockEventPublisher = {
      publishEvent: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;

    conversationEngine = new UniversalConversationEngine(
      mockRouter,
      mockEventPublisher,
      mockLogger
    );
  });

  describe('Session Management', () => {
    it('should start a new conversation session', async () => {
      const request: ConversationStartRequest = {
        userId: 'user123',
        channel: 'web_chat',
        sessionId: 'session123'
      };

      const session = await conversationEngine.startConversation(request);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe('session123');
      expect(session.userId).toBe('user123');
      expect(session.channel).toBe('web_chat');
      expect(session.capabilities).toBeDefined();
      expect(mockEventPublisher.publishEvent).toHaveBeenCalledWith(
        'com.storytailor.conversation.session_started',
        expect.objectContaining({
          sessionId: 'session123',
          userId: 'user123',
          channel: 'web_chat'
        })
      );
    });

    it('should generate session ID if not provided', async () => {
      const request: ConversationStartRequest = {
        userId: 'user123',
        channel: 'web_chat'
      };

      const session = await conversationEngine.startConversation(request);

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toMatch(/^conv_\d+_[a-z0-9]+$/);
    });

    it('should end conversation session', async () => {
      const request: ConversationStartRequest = {
        userId: 'user123',
        channel: 'web_chat',
        sessionId: 'session123'
      };

      const session = await conversationEngine.startConversation(request);
      await conversationEngine.endConversation(session.sessionId, 'user_requested');

      expect(mockEventPublisher.publishEvent).toHaveBeenCalledWith(
        'com.storytailor.conversation.session_ended',
        expect.objectContaining({
          sessionId: 'session123',
          userId: 'user123',
          reason: 'user_requested'
        })
      );
    });
  });

  describe('Message Processing', () => {
    let session: any;

    beforeEach(async () => {
      const request: ConversationStartRequest = {
        userId: 'user123',
        channel: 'web_chat',
        sessionId: 'session123'
      };
      session = await conversationEngine.startConversation(request);

      mockRouter.handleRequest.mockResolvedValue({
        speech: 'Hello! I\'m excited to help you create a story.',
        shouldEndSession: false,
        requiresInput: true,
        confidence: 0.95,
        agentsUsed: ['router', 'content-agent'],
        responseTime: 150
      });
    });

    it('should process a text message', async () => {
      const request: ConversationRequest = {
        userId: 'user123',
        sessionId: 'session123',
        requestId: 'req123',
        channel: 'web_chat',
        message: {
          type: 'text',
          content: 'I want to create a story',
          metadata: {
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString(),
        locale: 'en-US',
        metadata: {}
      };

      const response = await conversationEngine.processMessage(request);

      expect(response).toBeDefined();
      expect(response.requestId).toBe('req123');
      expect(response.response.content).toContain('Hello');
      expect(response.response.requiresInput).toBe(true);
      expect(response.metadata.responseTime).toBeGreaterThan(0);
      expect(mockRouter.handleRequest).toHaveBeenCalled();
      expect(mockEventPublisher.publishEvent).toHaveBeenCalledWith(
        'com.storytailor.conversation.message_processed',
        expect.objectContaining({
          requestId: 'req123',
          sessionId: 'session123',
          channel: 'web_chat'
        })
      );
    });

    it('should handle voice messages', async () => {
      const request: ConversationRequest = {
        userId: 'user123',
        sessionId: 'session123',
        requestId: 'req123',
        channel: 'alexa_plus',
        message: {
          type: 'voice',
          content: 'Create a bedtime story',
          metadata: {
            timestamp: new Date().toISOString(),
            confidence: 0.9
          }
        },
        timestamp: new Date().toISOString(),
        locale: 'en-US',
        metadata: {}
      };

      const response = await conversationEngine.processMessage(request);

      expect(response).toBeDefined();
      expect(response.response.type).toBe('text'); // Converted from router response
      expect(mockRouter.handleRequest).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRouter.handleRequest.mockRejectedValue(new Error('Router error'));

      const request: ConversationRequest = {
        userId: 'user123',
        sessionId: 'session123',
        requestId: 'req123',
        channel: 'web_chat',
        message: {
          type: 'text',
          content: 'Test message',
          metadata: {
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString(),
        locale: 'en-US',
        metadata: {}
      };

      const response = await conversationEngine.processMessage(request);

      expect(response).toBeDefined();
      expect(response.response.content).toContain('error');
      expect(response.metadata.fallbackUsed).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Channel Management', () => {
    it('should register and list supported channels', () => {
      const supportedChannels = conversationEngine.getSupportedChannels();
      
      expect(supportedChannels).toContain('alexa_plus');
      expect(supportedChannels).toContain('web_chat');
      expect(supportedChannels).toContain('mobile_voice');
      expect(supportedChannels).toContain('api_direct');
    });

    it('should get channel capabilities', () => {
      const capabilities = conversationEngine.getChannelCapabilities('web_chat');
      
      expect(capabilities).toBeDefined();
      expect(capabilities.supportsText).toBe(true);
      expect(capabilities.supportsVoice).toBe(true);
      expect(capabilities.supportsStreaming).toBe(true);
      expect(capabilities.maxResponseTime).toBeDefined();
    });

    it('should switch between channels', async () => {
      // Start session on web chat
      const request: ConversationStartRequest = {
        userId: 'user123',
        channel: 'web_chat',
        sessionId: 'session123'
      };
      const session = await conversationEngine.startConversation(request);

      // Switch to mobile voice
      const result = await conversationEngine.switchChannel(
        session.sessionId,
        'web_chat',
        'mobile_voice'
      );

      expect(result.success).toBe(true);
      expect(result.fromChannel).toBe('web_chat');
      expect(result.toChannel).toBe('mobile_voice');
      expect(mockEventPublisher.publishEvent).toHaveBeenCalledWith(
        'com.storytailor.conversation.channel_switched',
        expect.objectContaining({
          sessionId: 'session123',
          fromChannel: 'web_chat',
          toChannel: 'mobile_voice'
        })
      );
    });
  });

  describe('Streaming Support', () => {
    it('should support streaming responses when available', async () => {
      mockRouter.supportsStreaming = true;
      mockRouter.streamResponse = jest.fn().mockImplementation(async function* () {
        yield { content: 'Hello', isComplete: false, index: 0, total: 2 };
        yield { content: 'Hello there!', isComplete: true, index: 1, total: 2 };
      });

      const request: ConversationStartRequest = {
        userId: 'user123',
        channel: 'web_chat',
        sessionId: 'session123'
      };
      const session = await conversationEngine.startConversation(request);

      const messageRequest: ConversationRequest = {
        userId: 'user123',
        sessionId: 'session123',
        requestId: 'req123',
        channel: 'web_chat',
        message: {
          type: 'text',
          content: 'Hello',
          metadata: {
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString(),
        locale: 'en-US',
        metadata: {}
      };

      const chunks = [];
      for await (const chunk of conversationEngine.streamResponse(messageRequest)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toBe('Hello');
      expect(chunks[0].isComplete).toBe(false);
      expect(chunks[1].content).toBe('Hello there!');
      expect(chunks[1].isComplete).toBe(true);
    });

    it('should fallback to simulated streaming when not supported', async () => {
      mockRouter.supportsStreaming = false;
      mockRouter.handleRequest.mockResolvedValue({
        speech: 'Hello world',
        shouldEndSession: false
      });

      const request: ConversationStartRequest = {
        userId: 'user123',
        channel: 'web_chat',
        sessionId: 'session123'
      };
      const session = await conversationEngine.startConversation(request);

      const messageRequest: ConversationRequest = {
        userId: 'user123',
        sessionId: 'session123',
        requestId: 'req123',
        channel: 'web_chat',
        message: {
          type: 'text',
          content: 'Hello',
          metadata: {
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString(),
        locale: 'en-US',
        metadata: {}
      };

      const chunks = [];
      for await (const chunk of conversationEngine.streamResponse(messageRequest)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].isComplete).toBe(true);
    });
  });
});

describe('UniversalConversationManager', () => {
  let conversationManager: UniversalConversationManager;
  let mockRouter: jest.Mocked<PlatformAwareRouter>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockRouter = {
      handleRequest: jest.fn(),
      supportsStreaming: false,
      streamResponse: jest.fn()
    } as any;

    mockEventPublisher = {
      publishEvent: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;

    conversationManager = new UniversalConversationManager(
      mockRouter,
      mockEventPublisher,
      mockLogger
    );
  });

  describe('High-level Operations', () => {
    it('should provide health check', async () => {
      const healthCheck = await conversationManager.healthCheck();

      expect(healthCheck).toBeDefined();
      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.checks.channels).toBeDefined();
      expect(healthCheck.checks.engine).toBeDefined();
      expect(healthCheck.duration).toBeGreaterThan(0);
    });

    it('should provide conversation metrics', async () => {
      const metrics = await conversationManager.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.activeSessions).toBeDefined();
      expect(metrics.totalChannels).toBeGreaterThan(0);
      expect(metrics.channelMetrics).toBeDefined();
      expect(metrics.performance).toBeDefined();
    });

    it('should register custom channels', () => {
      const customAdapter = new APIChannelAdapter(mockLogger);
      const customCapabilities = {
        supportsText: true,
        supportsVoice: false,
        supportsImages: false,
        supportsFiles: false,
        supportsCards: false,
        supportsActions: true,
        supportsStreaming: false,
        supportsRealtime: false,
        supportsSmartHome: false,
        supportsOffline: false,
        maxResponseTime: 5000,
        maxContentLength: 10000
      };

      expect(() => {
        conversationManager.registerCustomChannel(
          'custom' as ConversationChannel,
          customAdapter,
          customCapabilities
        );
      }).not.toThrow();

      const supportedChannels = conversationManager.getSupportedChannels();
      expect(supportedChannels).toContain('custom');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete conversation flow', async () => {
      mockRouter.handleRequest.mockResolvedValue({
        speech: 'Hello! Let\'s create a story together.',
        shouldEndSession: false,
        requiresInput: true,
        confidence: 0.95,
        agentsUsed: ['router', 'content-agent']
      });

      // Start conversation
      const startRequest: ConversationStartRequest = {
        userId: 'user123',
        channel: 'web_chat',
        sessionId: 'session123'
      };

      const session = await conversationManager.startConversation(startRequest);
      expect(session.sessionId).toBe('session123');

      // Send message
      const messageRequest: ConversationRequest = {
        userId: 'user123',
        sessionId: 'session123',
        requestId: 'req123',
        channel: 'web_chat',
        message: {
          type: 'text',
          content: 'I want to create a bedtime story',
          metadata: {
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString(),
        locale: 'en-US',
        metadata: {}
      };

      const response = await conversationManager.processMessage(messageRequest);
      expect(response.response.content).toContain('Hello');

      // End conversation
      await conversationManager.endConversation(session.sessionId, 'completed');

      expect(mockEventPublisher.publishEvent).toHaveBeenCalledTimes(3); // start, message, end
    });

    it('should handle channel switching in conversation flow', async () => {
      mockRouter.handleRequest.mockResolvedValue({
        speech: 'Continuing our story...',
        shouldEndSession: false
      });

      // Start on web chat
      const session = await conversationManager.startConversation({
        userId: 'user123',
        channel: 'web_chat',
        sessionId: 'session123'
      });

      // Switch to mobile voice
      const switchResult = await conversationManager.switchChannel(
        session.sessionId,
        'web_chat',
        'mobile_voice'
      );

      expect(switchResult.success).toBe(true);

      // Continue conversation on mobile voice
      const response = await conversationManager.processMessage({
        userId: 'user123',
        sessionId: 'session123',
        requestId: 'req123',
        channel: 'mobile_voice',
        message: {
          type: 'voice',
          content: 'Continue the story',
          metadata: {
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString(),
        locale: 'en-US',
        metadata: {}
      });

      expect(response).toBeDefined();
      expect(mockRouter.handleRequest).toHaveBeenCalled();
    });
  });
});

describe('Channel Adapters', () => {
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;
  });

  describe('AlexaChannelAdapter', () => {
    let adapter: AlexaChannelAdapter;

    beforeEach(() => {
      adapter = new AlexaChannelAdapter(mockLogger);
    });

    it('should initialize Alexa session', async () => {
      const session = {
        sessionId: 'session123',
        userId: 'user123',
        channel: 'alexa_plus' as ConversationChannel,
        state: { channelStates: {} },
        preferences: { voice: { voice: 'storyteller', speed: 1.0, emotion: 'warm' } }
      } as any;

      await adapter.initializeSession(session);

      expect(session.state.channelStates['alexa_plus']).toBeDefined();
      expect(session.state.channelStates['alexa_plus'].voiceSettings).toBeDefined();
    });

    it('should adapt response for Alexa format', async () => {
      const session = {
        sessionId: 'session123',
        state: { 
          channelStates: { alexa_plus: {} },
          phase: 'greeting'
        },
        capabilities: { supportsCards: true }
      } as any;

      const response = {
        type: 'text',
        content: 'Hello! Let\'s create a story.',
        requiresInput: true,
        metadata: { confidence: 0.9, agentsUsed: ['content-agent'] }
      } as any;

      const alexaResponse = await adapter.adaptResponse(response, session);

      expect(alexaResponse.version).toBe('1.0');
      expect(alexaResponse.response.outputSpeech).toBeDefined();
      expect(alexaResponse.response.shouldEndSession).toBe(false);
    });
  });

  describe('WebChatChannelAdapter', () => {
    let adapter: WebChatChannelAdapter;

    beforeEach(() => {
      adapter = new WebChatChannelAdapter(mockLogger);
    });

    it('should initialize web chat session', async () => {
      const session = {
        sessionId: 'session123',
        userId: 'user123',
        channel: 'web_chat' as ConversationChannel,
        state: { channelStates: {} },
        capabilities: { supportsStreaming: true, supportsVoice: true, supportsFiles: true }
      } as any;

      await adapter.initializeSession(session);

      expect(session.state.channelStates['web_chat']).toBeDefined();
      expect(session.state.channelStates['web_chat'].streamingEnabled).toBe(true);
    });

    it('should format text for web display', async () => {
      const session = {
        state: { channelStates: { web_chat: {} } }
      } as any;

      const response = {
        type: 'text',
        content: 'Hello **Luna**! Let\'s create your *magical* story.',
        metadata: { confidence: 0.9 }
      } as any;

      const processedResponse = await adapter.postprocessResponse(response, session);

      expect(processedResponse.content).toContain('**Luna**');
      expect((processedResponse as any).metadata.formattedForWeb).toBe(true);
    });
  });

  describe('MobileVoiceChannelAdapter', () => {
    let adapter: MobileVoiceChannelAdapter;

    beforeEach(() => {
      adapter = new MobileVoiceChannelAdapter(mockLogger);
    });

    it('should initialize mobile voice session', async () => {
      const session = {
        sessionId: 'session123',
        userId: 'user123',
        channel: 'mobile_voice' as ConversationChannel,
        state: { channelStates: {} },
        capabilities: { supportsOffline: true },
        preferences: { voice: { voice: 'storyteller', speed: 1.0, emotion: 'warm', volume: 0.8 } }
      } as any;

      await adapter.initializeSession(session);

      expect(session.state.channelStates['mobile_voice']).toBeDefined();
      expect(session.state.channelStates['mobile_voice'].offlineCapability).toBe(true);
      expect(session.state.channelStates['mobile_voice'].voiceSettings).toBeDefined();
    });

    it('should create mobile-optimized response', async () => {
      const session = {
        sessionId: 'session123',
        state: { 
          channelStates: { mobile_voice: { batteryOptimization: true } },
          phase: 'character_creation'
        },
        capabilities: { supportsImages: true }
      } as any;

      const response = {
        type: 'voice',
        content: 'Great! Your character Luna is a magical unicorn.',
        requiresInput: true,
        metadata: { confidence: 0.9, agentsUsed: ['content-agent'] }
      } as any;

      const mobileResponse = await adapter.adaptResponse(response, session);

      expect(mobileResponse.type).toBe('mobile_voice_response');
      expect(mobileResponse.audio).toBeDefined();
      expect(mobileResponse.ui).toBeDefined();
      expect(mobileResponse.quickActions).toBeDefined();
    });
  });

  describe('APIChannelAdapter', () => {
    let adapter: APIChannelAdapter;

    beforeEach(() => {
      adapter = new APIChannelAdapter(mockLogger);
    });

    it('should initialize API session', async () => {
      const session = {
        sessionId: 'session123',
        userId: 'user123',
        channel: 'api_direct' as ConversationChannel,
        state: { channelStates: {} },
        capabilities: { supportsStreaming: true }
      } as any;

      await adapter.initializeSession(session);

      expect(session.state.channelStates['api_direct']).toBeDefined();
      expect(session.state.channelStates['api_direct'].apiVersion).toBe('1.0');
      expect(session.state.channelStates['api_direct'].streamingEnabled).toBe(true);
    });

    it('should create API-formatted response', async () => {
      const session = {
        sessionId: 'session123',
        state: { 
          channelStates: { api_direct: { apiVersion: '1.0', rateLimitInfo: {} } },
          phase: 'story_creation'
        }
      } as any;

      const response = {
        type: 'text',
        content: 'Your story is being created...',
        requiresInput: false,
        metadata: { confidence: 0.95, agentsUsed: ['content-agent'], generationTime: 200 }
      } as any;

      const apiResponse = await adapter.adaptResponse(response, session);

      expect(apiResponse.success).toBe(true);
      expect(apiResponse.data).toBeDefined();
      expect(apiResponse.metadata).toBeDefined();
      expect(apiResponse.links).toBeDefined();
    });
  });
});