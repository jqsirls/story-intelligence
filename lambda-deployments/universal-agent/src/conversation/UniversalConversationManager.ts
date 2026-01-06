import { UniversalConversationEngine, ConversationChannel, ConversationRequest, ConversationResponse, ConversationStartRequest, ChannelSyncRequest, ConversationResponseChunk } from './UniversalConversationEngine';
import { AlexaChannelAdapter } from './adapters/AlexaChannelAdapter';
import { WebChatChannelAdapter } from './adapters/WebChatChannelAdapter';
import { MobileVoiceChannelAdapter } from './adapters/MobileVoiceChannelAdapter';
import { APIChannelAdapter } from './adapters/APIChannelAdapter';
// PlatformAwareRouter imported dynamically to avoid module resolution issues in Lambda
// import { PlatformAwareRouter } from '@alexa-multi-agent/router';
// @ts-ignore - Event-system is bundled at runtime, types may not be available during compilation
import { EventPublisher } from '@alexa-multi-agent/event-system';
import { Logger } from 'winston';

/**
 * Universal Conversation Manager - High-level interface for channel-agnostic conversations
 */
export class UniversalConversationManager {
  private conversationEngine: UniversalConversationEngine;
  private logger: Logger;
  private channelSessionCounts: Map<ConversationChannel, number> = new Map();
  private channelLastUsed: Map<ConversationChannel, Date> = new Map();

  constructor(
    router: any, // PlatformAwareRouter loaded dynamically
    eventPublisher: EventPublisher,
    logger: Logger
  ) {
    this.logger = logger;
    this.conversationEngine = new UniversalConversationEngine(router, eventPublisher, logger);
    
    this.initializeChannelAdapters();
    this.initializeChannelTracking();
  }

  /**
   * Initialize channel tracking
   */
  private initializeChannelTracking(): void {
    // Initialize all supported channels with zero sessions
    const supportedChannels = this.getSupportedChannels();
    for (const channel of supportedChannels) {
      this.channelSessionCounts.set(channel, 0);
      this.channelLastUsed.set(channel, new Date());
    }
  }

  /**
   * Start a new conversation session
   */
  async startConversation(request: ConversationStartRequest) {
    try {
      this.logger.info('Starting universal conversation', {
        userId: request.userId,
        channel: request.channel,
        sessionId: request.sessionId
      });

      const session = await this.conversationEngine.startConversation(request);

      // Track channel usage
      const currentCount = this.channelSessionCounts.get(request.channel) || 0;
      this.channelSessionCounts.set(request.channel, currentCount + 1);
      this.channelLastUsed.set(request.channel, new Date());

      this.logger.info('Universal conversation started successfully', {
        sessionId: session.sessionId,
        userId: session.userId,
        channel: session.channel
      });

      return session;

    } catch (error) {
      this.logger.error('Failed to start universal conversation', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
        channel: request.channel
      });
      throw error;
    }
  }

  /**
   * Process a conversation message
   */
  async processMessage(request: ConversationRequest): Promise<ConversationResponse> {
    try {
      this.logger.info('Processing universal message', {
        requestId: request.requestId,
        sessionId: request.sessionId,
        channel: request.channel,
        messageType: request.message.type
      });

      const response = await this.conversationEngine.processMessage(request);

      this.logger.info('Universal message processed successfully', {
        requestId: request.requestId,
        responseId: response.responseId,
        sessionId: request.sessionId,
        channel: request.channel,
        responseTime: response.metadata.responseTime
      });

      return response;

    } catch (error) {
      this.logger.error('Failed to process universal message', {
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId,
        sessionId: request.sessionId,
        channel: request.channel
      });
      throw error;
    }
  }

  /**
   * Stream conversation response
   */
  async *streamResponse(request: ConversationRequest): AsyncIterableIterator<ConversationResponseChunk> {
    try {
      this.logger.info('Starting universal response stream', {
        requestId: request.requestId,
        sessionId: request.sessionId,
        channel: request.channel
      });

      for await (const chunk of this.conversationEngine.streamResponse(request)) {
        yield chunk;
      }

      this.logger.info('Universal response stream completed', {
        requestId: request.requestId,
        sessionId: request.sessionId,
        channel: request.channel
      });

    } catch (error) {
      this.logger.error('Universal response stream failed', {
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId,
        sessionId: request.sessionId,
        channel: request.channel
      });
      throw error;
    }
  }

  /**
   * Switch conversation between channels
   */
  async switchChannel(
    sessionId: string,
    fromChannel: ConversationChannel,
    toChannel: ConversationChannel,
    switchContext?: any
  ) {
    try {
      this.logger.info('Switching conversation channel', {
        sessionId,
        fromChannel,
        toChannel
      });

      const result = await this.conversationEngine.switchChannel(
        sessionId,
        fromChannel,
        toChannel,
        switchContext
      );

      this.logger.info('Channel switch completed', {
        sessionId,
        fromChannel,
        toChannel,
        success: result.success,
        duration: result.duration
      });

      return result;

    } catch (error) {
      this.logger.error('Channel switch failed', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        fromChannel,
        toChannel
      });
      throw error;
    }
  }

  /**
   * Synchronize conversation state across channels
   */
  async synchronizeChannels(request: ChannelSyncRequest) {
    try {
      this.logger.info('Synchronizing channels', {
        sourceChannel: request.sourceChannel,
        targetChannels: request.targetChannels,
        syncType: request.syncType
      });

      const result = await this.conversationEngine.synchronizeChannels(request);

      this.logger.info('Channel synchronization completed', {
        sourceChannel: request.sourceChannel,
        targetChannels: request.targetChannels,
        success: result.success,
        conflictCount: result.conflicts.length
      });

      return result;

    } catch (error) {
      this.logger.error('Channel synchronization failed', {
        error: error instanceof Error ? error.message : String(error),
        sourceChannel: request.sourceChannel,
        targetChannels: request.targetChannels
      });
      throw error;
    }
  }

  /**
   * End conversation session
   */
  async endConversation(sessionId: string, reason?: string): Promise<void> {
    try {
      // Get session to track channel
      const session = (this.conversationEngine as any).activeSessions?.get(sessionId);
      const channel = session?.channel;
      
      this.logger.info('Ending universal conversation', {
        sessionId,
        reason,
        channel
      });

      await this.conversationEngine.endConversation(sessionId, reason);
      
      // Decrement channel session count
      if (channel) {
        const currentCount = this.channelSessionCounts.get(channel) || 0;
        this.channelSessionCounts.set(channel, Math.max(0, currentCount - 1));
      }

      this.logger.info('Universal conversation ended successfully', {
        sessionId,
        reason
      });

    } catch (error) {
      this.logger.error('Failed to end universal conversation', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        reason
      });
      throw error;
    }
  }

  /**
   * Get supported channels
   */
  getSupportedChannels(): ConversationChannel[] {
    return this.conversationEngine.getSupportedChannels();
  }

  /**
   * Get channel capabilities
   */
  getChannelCapabilities(channel: ConversationChannel) {
    return this.conversationEngine.getChannelCapabilities(channel);
  }

  /**
   * Register a custom channel adapter
   */
  registerCustomChannel(channel: ConversationChannel, adapter: any, capabilities: any): void {
    try {
      this.conversationEngine.registerChannel(channel, adapter, capabilities);
      
      this.logger.info('Custom channel registered', {
        channel,
        capabilities: Object.keys(capabilities).filter(key => capabilities[key])
      });

    } catch (error) {
      this.logger.error('Failed to register custom channel', {
        error: error instanceof Error ? error.message : String(error),
        channel
      });
      throw error;
    }
  }

  /**
   * Health check for conversation system
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {},
      duration: 0
    };

    try {
      // Check supported channels
      const supportedChannels = this.getSupportedChannels();
      result.checks.channels = {
        status: supportedChannels.length > 0 ? 'healthy' : 'unhealthy',
        count: supportedChannels.length,
        supported: supportedChannels
      };

      // Check each channel adapter
      for (const channel of supportedChannels) {
        try {
          const capabilities = this.getChannelCapabilities(channel);
          result.checks[`channel_${channel}`] = {
            status: 'healthy',
            capabilities: Object.keys(capabilities).filter(key => capabilities[key])
          };
        } catch (error) {
          result.checks[`channel_${channel}`] = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : String(error)
          };
          result.status = 'degraded';
        }
      }

      // Check conversation engine
      result.checks.engine = {
        status: 'healthy',
        activeSessions: (this.conversationEngine as any).activeSessions?.size || 0
      };

      result.duration = Date.now() - startTime;

      this.logger.debug('Health check completed', {
        status: result.status,
        duration: result.duration,
        channelCount: supportedChannels.length
      });

      return result;

    } catch (error) {
      result.status = 'unhealthy';
      result.error = error instanceof Error ? error.message : String(error);
      result.duration = Date.now() - startTime;

      this.logger.error('Health check failed', {
        error: result.error,
        duration: result.duration
      });

      return result;
    }
  }

  /**
   * Get conversation metrics
   */
  async getMetrics(): Promise<ConversationMetrics> {
    try {
      const metrics: ConversationMetrics = {
        timestamp: new Date().toISOString(),
        activeSessions: (this.conversationEngine as any).activeSessions?.size || 0,
        totalChannels: this.getSupportedChannels().length,
        channelMetrics: {},
        performance: {
          averageResponseTime: 0,
          totalRequests: 0,
          errorRate: 0
        }
      };

      // Get metrics for each channel
      for (const channel of this.getSupportedChannels()) {
        const activeSessions = this.channelSessionCounts.get(channel) || 0;
        const lastUsed = this.channelLastUsed.get(channel) || null;
        
        metrics.channelMetrics[channel] = {
          activeSessions,
          capabilities: this.getChannelCapabilities(channel),
          lastUsed: lastUsed ? lastUsed.toISOString() : null
        };
      }

      this.logger.debug('Conversation metrics collected', {
        activeSessions: metrics.activeSessions,
        totalChannels: metrics.totalChannels
      });

      return metrics;

    } catch (error) {
      this.logger.error('Failed to collect conversation metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Private helper methods

  private initializeChannelAdapters(): void {
    try {
      // Register Alexa+ adapter
      this.conversationEngine.registerChannel(
        'alexa_plus',
        new AlexaChannelAdapter(this.logger),
        {
          supportsText: false,
          supportsVoice: true,
          supportsImages: false,
          supportsFiles: false,
          supportsCards: true,
          supportsActions: true,
          supportsStreaming: false,
          supportsRealtime: false,
          supportsSmartHome: true,
          supportsOffline: false,
          maxResponseTime: 800,
          maxContentLength: 8000
        }
      );

      // Register Web Chat adapter
      this.conversationEngine.registerChannel(
        'web_chat',
        new WebChatChannelAdapter(this.logger),
        {
          supportsText: true,
          supportsVoice: true,
          supportsImages: true,
          supportsFiles: true,
          supportsCards: true,
          supportsActions: true,
          supportsStreaming: true,
          supportsRealtime: true,
          supportsSmartHome: true,
          supportsOffline: false,
          maxResponseTime: 3000,
          maxContentLength: 10000,
          maxFileSize: 10 * 1024 * 1024,
          supportedImageFormats: ['jpg', 'png', 'gif', 'webp'],
          supportedAudioFormats: ['mp3', 'wav', 'ogg'],
          supportedFileTypes: ['pdf', 'doc', 'txt']
        }
      );

      // Register Mobile Voice adapter
      this.conversationEngine.registerChannel(
        'mobile_voice',
        new MobileVoiceChannelAdapter(this.logger),
        {
          supportsText: true,
          supportsVoice: true,
          supportsImages: true,
          supportsFiles: true,
          supportsCards: true,
          supportsActions: true,
          supportsStreaming: false,
          supportsRealtime: false,
          supportsSmartHome: true,
          supportsOffline: true,
          maxResponseTime: 2000,
          maxContentLength: 5000,
          maxFileSize: 5 * 1024 * 1024,
          supportedImageFormats: ['jpg', 'png'],
          supportedAudioFormats: ['mp3', 'wav']
        }
      );

      // Register API adapter
      this.conversationEngine.registerChannel(
        'api_direct',
        new APIChannelAdapter(this.logger),
        {
          supportsText: true,
          supportsVoice: false,
          supportsImages: true,
          supportsFiles: true,
          supportsCards: false,
          supportsActions: true,
          supportsStreaming: true,
          supportsRealtime: false,
          supportsSmartHome: false,
          supportsOffline: false,
          maxResponseTime: 10000,
          maxContentLength: 50000,
          maxFileSize: 50 * 1024 * 1024,
          supportedImageFormats: ['jpg', 'png', 'gif', 'webp', 'svg'],
          supportedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'json', 'xml']
        }
      );

      this.logger.info('Channel adapters initialized successfully', {
        channels: this.getSupportedChannels()
      });

    } catch (error) {
      this.logger.error('Failed to initialize channel adapters', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Type definitions
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: Record<string, any>;
  duration: number;
  error?: string;
}

export interface ConversationMetrics {
  timestamp: string;
  activeSessions: number;
  totalChannels: number;
  channelMetrics: Record<string, ChannelMetrics>;
  performance: {
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
  };
}

interface ChannelMetrics {
  activeSessions: number;
  capabilities: any;
  lastUsed: string | null;
}

export type { ConversationChannel, ConversationRequest, ConversationResponse, ConversationStartRequest, ChannelSyncRequest };