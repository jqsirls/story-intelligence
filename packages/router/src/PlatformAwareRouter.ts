import { Router } from './Router';
import { RouterConfig } from './config';
import { Logger } from 'winston';

import {
  VoicePlatform,
  VoicePlatformAdapter,
  StandardizedRequest,
  StandardizedResponse,
  SmartHomeAction,
  NarrativeEvent,
  AlexaPlusAdapter,
  GoogleAssistantAdapter,
  AppleSiriAdapter,
  MicrosoftCortanaAdapter
} from '@alexa-multi-agent/shared-types';

// Lazy-load SmartHomeIntegrator and WebhookHandler to avoid hard dependencies
let SmartHomeIntegrator: any = null;
let WebhookHandler: any = null;

export class PlatformAwareRouter extends Router {
  private platformAdapters: Map<VoicePlatform, VoicePlatformAdapter> = new Map();
  private smartHomeIntegrator: any = null;
  private webhookHandler: any = null;
  private platformLogger: Logger;

  constructor(config: RouterConfig) {
    // Create logger first
    const winston = require('winston');
    const logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'platform-aware-router' },
      transports: [new winston.transports.Console()]
    });
    
    super(config, logger);
    this.platformLogger = logger;

    // Register default platform adapters
    this.registerDefaultAdapters();
    
    // Initialize smart home integrator (lazy load to avoid hard dependency)
    try {
      if (!SmartHomeIntegrator) {
        const smartHomeModule = require('./services/SmartHomeIntegrator');
        SmartHomeIntegrator = smartHomeModule.SmartHomeIntegrator || smartHomeModule.default;
      }
      if (SmartHomeIntegrator) {
        this.smartHomeIntegrator = new SmartHomeIntegrator(config);
      }
    } catch (error: any) {
      logger.warn('SmartHomeIntegrator not available, continuing without smart home features', {
        error: error.message
      });
    }
    
    // Initialize webhook handler (lazy load to avoid hard dependency)
    // DISABLED: WebhookHandler tries to create PlatformAwareRouter, causing recursion
    // WebhookHandler will be initialized on-demand when needed
    // try {
    //   if (!WebhookHandler) {
    //     const webhookModule = require('./services/WebhookHandler');
    //     WebhookHandler = webhookModule.WebhookHandler || webhookModule.default;
    //   }
    //   if (WebhookHandler) {
    //     this.webhookHandler = new WebhookHandler(config);
    //   }
    // } catch (error: any) {
    //   logger.warn('WebhookHandler not available, continuing without webhook features', {
    //     error: error.message
    //   });
    // }
    logger.debug('WebhookHandler initialization skipped to prevent recursion with PlatformAwareRouter');
  }

  /**
   * Handle request from any supported platform
   */
  async handleRequest(rawRequest: any, platform: VoicePlatform): Promise<any> {
    const startTime = Date.now();
    
    try {
      this.platformLogger.info('Handling platform request', {
        platform,
        requestId: rawRequest.requestId || 'unknown'
      });

      const adapter = this.platformAdapters.get(platform);
      if (!adapter) {
        // Fallback to alexa_plus adapter if platform not found (for compatibility)
        this.platformLogger.warn('Unsupported platform, using alexa_plus fallback', { platform });
        const fallbackAdapter = this.platformAdapters.get('alexa_plus');
        if (!fallbackAdapter) {
          return {
            speech: `I'm sorry, platform ${platform} is not supported.`,
            shouldEndSession: false,
            smartHomeActions: []
          };
        }
        // Use fallback adapter
        const standardRequest = fallbackAdapter.parseUserRequest(rawRequest);
        if (!standardRequest) {
          this.platformLogger.error('parseUserRequest returned null/undefined (fallback)', { platform });
          return {
            speech: "I'm sorry, I encountered an error processing your request.",
            shouldEndSession: false,
            smartHomeActions: []
          };
        }
        // Ensure sessionId is present
        if (!standardRequest.sessionId && rawRequest.sessionId) {
          standardRequest.sessionId = rawRequest.sessionId;
        }
        const standardResponse = await this.processStandardizedRequest(standardRequest);
        return fallbackAdapter.formatResponse(standardResponse);
      }

      // Convert to standardized format
      const standardRequest = adapter.parseUserRequest(rawRequest);
      
      // Ensure standardRequest is valid and has required fields
      if (!standardRequest) {
        this.platformLogger.error('parseUserRequest returned null/undefined', { platform });
        return {
          speech: "I'm sorry, I encountered an error processing your request.",
          shouldEndSession: false,
          smartHomeActions: []
        };
      }
      
      // Ensure standardRequest is valid
      if (!standardRequest) {
        this.platformLogger.error('parseUserRequest returned null/undefined', { platform });
        return {
          speech: "I'm sorry, I encountered an error processing your request.",
          shouldEndSession: false,
          smartHomeActions: []
        };
      }
      
      // Ensure sessionId is present (extract from rawRequest if missing)
      if (!standardRequest.sessionId && rawRequest?.sessionId) {
        standardRequest.sessionId = rawRequest.sessionId;
      }
      
      // Generate sessionId if still missing
      if (!standardRequest.sessionId) {
        standardRequest.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.platformLogger.warn('Generated sessionId for request', { platform, userId: standardRequest.userId });
      }
      
      this.platformLogger.debug('Request standardized', {
        platform,
        userId: standardRequest?.userId || 'unknown',
        sessionId: standardRequest?.sessionId || 'unknown',
        intent: standardRequest?.intent || 'unknown',
        capabilities: standardRequest?.capabilities || []
      });

      // Process request through existing router logic
      const standardResponse = await this.processStandardizedRequest(standardRequest);

      // Handle smart home actions if present and supported
      if (standardResponse.smartHomeActions && adapter.supportsSmartHome()) {
        await this.executeSmartHomeActions(
          standardRequest.userId,
          standardResponse.smartHomeActions,
          platform
        );
      }

      // Convert back to platform-specific format
      const platformResponse = adapter.formatResponse(standardResponse);

      const duration = Date.now() - startTime;
      this.platformLogger.info('Platform request completed', {
        platform,
        userId: standardRequest.userId,
        duration,
        smartHomeActions: standardResponse.smartHomeActions?.length || 0
      });

      return platformResponse;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.platformLogger.error('Platform request failed', {
        error: error instanceof Error ? error.message : String(error),
        platform,
        duration
      });

      // Return platform-specific error response
      const adapter = this.platformAdapters.get(platform);
      if (adapter) {
        return adapter.formatError(error instanceof Error ? error : new Error(String(error)));
      }

      throw error;
    }
  }

  /**
   * Register a new platform adapter
   */
  registerPlatform(platform: VoicePlatform, adapter: VoicePlatformAdapter): void {
    this.platformAdapters.set(platform, adapter);
    
    this.platformLogger.info('Platform adapter registered', {
      platform,
      capabilities: adapter.getCapabilities()
    });
  }

  /**
   * Get supported platforms
   */
  getSupportedPlatforms(): VoicePlatform[] {
    return Array.from(this.platformAdapters.keys());
  }

  /**
   * Get platform capabilities
   */
  getPlatformCapabilities(platform: VoicePlatform): string[] {
    const adapter = this.platformAdapters.get(platform);
    return adapter ? adapter.getCapabilities() : [];
  }

  /**
   * Check if platform supports smart home
   */
  platformSupportsSmartHome(platform: VoicePlatform): boolean {
    const adapter = this.platformAdapters.get(platform);
    return adapter ? adapter.supportsSmartHome() : false;
  }

  // Private methods

  private registerDefaultAdapters(): void {
    this.registerPlatform('alexa_plus', new AlexaPlusAdapter());
    this.registerPlatform('google_assistant', new GoogleAssistantAdapter());
    this.registerPlatform('apple_siri', new AppleSiriAdapter());
    this.registerPlatform('microsoft_cortana', new MicrosoftCortanaAdapter());
    
    this.platformLogger.info('Default platform adapters registered', {
      platforms: this.getSupportedPlatforms()
    });
  }

  private async processStandardizedRequest(
    request: StandardizedRequest
  ): Promise<StandardizedResponse> {
    try {
      // Validate request
      if (!request) {
        this.platformLogger.error('processStandardizedRequest called with null/undefined request');
        throw new Error('Request is null or undefined');
      }
      
      if (!request.sessionId) {
        this.platformLogger.warn('Request missing sessionId, generating one', { userId: request.userId });
        request.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      if (!request.userId) {
        this.platformLogger.error('Request missing userId');
        throw new Error('Request must have a userId');
      }
      
      // Use existing router logic but with standardized request
      const turnContext = {
        userId: request.userId,
        sessionId: request.sessionId,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userInput: request.intent || 'unknown',
        channel: 'alexa' as const, // Default to alexa, could be mapped from platform
        locale: request.locale || 'en-US',
        deviceType: 'voice' as const,
        timestamp: new Date().toISOString(),
        metadata: {
          slots: request.slots || {},
          rawRequest: request.rawRequest,
          platform: request.platform,
          deviceCapabilities: request.deviceCapabilities || []
        }
      };
      
      const routingResult = await this.route(turnContext);

      // Detect smart home actions from routing result
      const smartHomeActions = await this.detectSmartHomeActions(request, routingResult);

      const response: StandardizedResponse = {
        speech: routingResult.speechText || routingResult.message || 'I\'m sorry, I didn\'t understand that.',
        shouldEndSession: routingResult.shouldEndSession || false,
        smartHomeActions,
        sessionAttributes: routingResult.metadata || {}
      };

      // Add reprompt if needed (use nextExpectedInput as reprompt)
      if (routingResult.nextExpectedInput) {
        response.reprompt = routingResult.nextExpectedInput;
      }

      return response;

    } catch (error) {
      this.platformLogger.error('Standardized request processing failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
        intent: request.intent
      });

      return {
        speech: 'I\'m sorry, I encountered an error. Please try again.',
        shouldEndSession: false,
        smartHomeActions: []
      };
    }
  }

  private async detectSmartHomeActions(
    request: StandardizedRequest,
    routingResult: any
  ): Promise<SmartHomeAction[]> {
    const actions: SmartHomeAction[] = [];

    try {
      // Check if platform supports smart home
      const adapter = this.platformAdapters.get(request.platform);
      if (!adapter || !adapter.supportsSmartHome()) {
        return actions;
      }

      // Detect story-related events that should trigger smart home actions
      if (routingResult.storyEvent) {
        switch (routingResult.storyEvent.type) {
          case 'story_start':
            actions.push({
              type: 'set_story_environment',
              storyType: routingResult.storyEvent.storyType,
              userId: request.userId
            });
            break;

          case 'story_end':
            actions.push({
              type: 'restore_default_lighting',
              userId: request.userId
            });
            break;

          case 'narrative_moment':
            const narrativeEvent: NarrativeEvent = {
              type: routingResult.storyEvent.narrativeEvent.type,
              intensity: routingResult.storyEvent.narrativeEvent.intensity || 0.5,
              duration: routingResult.storyEvent.narrativeEvent.duration,
              metadata: routingResult.storyEvent.narrativeEvent.metadata
            };

            actions.push({
              type: 'sync_narrative_lighting',
              narrativeEvent,
              userId: request.userId
            });
            break;
        }
      }

      // Detect explicit smart home intents
      if (request.intent) {
        const smartHomeIntents = [
          'ConnectSmartHomeDevice',
          'SetRoomLighting',
          'DisconnectSmartHomeDevice'
        ];

        if (smartHomeIntents.includes(request.intent)) {
          actions.push({
            type: 'device_control',
            userId: request.userId,
            parameters: request.slots || {}
          });
        }
      }

      if (actions.length > 0) {
        this.platformLogger.debug('Smart home actions detected', {
          userId: request.userId,
          platform: request.platform,
          actionCount: actions.length,
          actionTypes: actions.map(a => a.type)
        });
      }

      return actions;

    } catch (error) {
      this.platformLogger.error('Smart home action detection failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
        platform: request.platform
      });
      return [];
    }
  }

  private async executeSmartHomeActions(
    userId: string,
    actions: SmartHomeAction[],
    platform: VoicePlatform
  ): Promise<void> {
    if (actions.length === 0) {
      return;
    }

    try {
      this.platformLogger.info('Executing smart home actions', {
        userId,
        platform,
        actionCount: actions.length
      });

      // Execute actions in parallel
      const actionPromises = actions.map(action =>
        this.smartHomeIntegrator.executeAction(userId, action, platform)
          .catch((error: any) => {
            this.platformLogger.error('Smart home action execution failed', {
              error: error instanceof Error ? error.message : String(error),
              userId,
              actionType: action.type,
              platform
            });
            // Don't let individual action failures break the entire flow
          })
      );

      await Promise.all(actionPromises);

      this.platformLogger.info('Smart home actions execution completed', {
        userId,
        platform,
        actionCount: actions.length
      });

    } catch (error) {
      this.platformLogger.error('Smart home actions execution failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        platform,
        actionCount: actions.length
      });
      // Don't throw error - smart home failures shouldn't break voice conversation
    }
  }

  /**
   * Get platform-specific user context
   */
  async getUserContext(rawRequest: any, platform: VoicePlatform): Promise<any> {
    try {
      const adapter = this.platformAdapters.get(platform);
      if (!adapter) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      return await adapter.getUserContext(rawRequest);

    } catch (error) {
      this.platformLogger.error('Failed to get user context', {
        error: error instanceof Error ? error.message : String(error),
        platform
      });
      return null;
    }
  }

  /**
   * Send platform-specific response
   */
  async sendResponse(response: any, platform: VoicePlatform): Promise<void> {
    try {
      const adapter = this.platformAdapters.get(platform);
      if (!adapter) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      await adapter.sendResponse(response);

    } catch (error) {
      this.platformLogger.error('Failed to send platform response', {
        error: error instanceof Error ? error.message : String(error),
        platform
      });
      throw error;
    }
  }

  /**
   * Generate embedding code for third-party integration
   */
  async generateEmbeddingCode(
    platform: VoicePlatform,
    config: any
  ): Promise<string> {
    try {
      const adapter = this.platformAdapters.get(platform);
      if (!adapter) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      if (!adapter.supportsThirdPartyEmbedding()) {
        throw new Error(`Platform ${platform} does not support third-party embedding`);
      }

      if (!adapter.generateEmbeddingCode) {
        throw new Error(`Platform ${platform} does not implement embedding code generation`);
      }

      const embeddingCode = await adapter.generateEmbeddingCode(config);

      this.platformLogger.info('Embedding code generated', {
        platform,
        configName: config.invocationName
      });

      return embeddingCode;

    } catch (error) {
      this.platformLogger.error('Failed to generate embedding code', {
        error: error instanceof Error ? error.message : String(error),
        platform
      });
      throw error;
    }
  }

  /**
   * Set up webhook for platform integration
   */
  async setupWebhook(
    platform: VoicePlatform,
    webhookConfig: any
  ): Promise<any> {
    try {
      const adapter = this.platformAdapters.get(platform);
      if (!adapter) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      if (!adapter.supportsWebhooks()) {
        throw new Error(`Platform ${platform} does not support webhooks`);
      }

      // Register webhook with the handler
      const result = await this.webhookHandler.registerWebhook(platform, webhookConfig);

      this.platformLogger.info('Webhook set up successfully', {
        platform,
        webhookId: result.webhookId,
        status: result.status
      });

      return result;

    } catch (error) {
      this.platformLogger.error('Failed to set up webhook', {
        error: error instanceof Error ? error.message : String(error),
        platform
      });
      throw error;
    }
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(
    platform: VoicePlatform,
    payload: any,
    headers: Record<string, string>
  ): Promise<any> {
    try {
      return await this.webhookHandler.handleWebhook(platform, payload, headers);
    } catch (error) {
      this.platformLogger.error('Failed to handle webhook', {
        error: error instanceof Error ? error.message : String(error),
        platform
      });
      throw error;
    }
  }

  /**
   * Get webhook status
   */
  getWebhookStatus(webhookId: string): any {
    return this.webhookHandler.getWebhookStatus(webhookId);
  }

  /**
   * List all webhooks
   */
  listWebhooks(): any[] {
    return this.webhookHandler.listWebhooks();
  }

  /**
   * Unregister webhook
   */
  async unregisterWebhook(webhookId: string): Promise<void> {
    try {
      await this.webhookHandler.unregisterWebhook(webhookId);
      
      this.platformLogger.info('Webhook unregistered', { webhookId });
    } catch (error) {
      this.platformLogger.error('Failed to unregister webhook', {
        error: error instanceof Error ? error.message : String(error),
        webhookId
      });
      throw error;
    }
  }

  /**
   * Register a custom universal platform adapter
   */
  registerUniversalPlatform(
    platformName: string,
    config: any
  ): void {
    try {
      const { UniversalPlatformAdapter } = require('@alexa-multi-agent/shared-types/voice-platform');
      const adapter = new UniversalPlatformAdapter(config);
      
      this.platformAdapters.set(platformName as VoicePlatform, adapter);
      
      this.platformLogger.info('Universal platform adapter registered', {
        platformName,
        capabilities: adapter.getCapabilities()
      });
    } catch (error) {
      this.platformLogger.error('Failed to register universal platform adapter', {
        error: error instanceof Error ? error.message : String(error),
        platformName
      });
      throw error;
    }
  }

  /**
   * Enhanced smart home synchronization across all platforms
   */
  async synchronizeSmartHomeAcrossPlatforms(
    userId: string,
    action: any
  ): Promise<void> {
    try {
      this.platformLogger.info('Synchronizing smart home across platforms', {
        userId,
        actionType: action.type
      });

      // Get all platforms that support smart home for this user
      const supportedPlatforms = this.getSupportedPlatforms().filter(platform =>
        this.platformSupportsSmartHome(platform)
      );

      // Execute smart home action on all supported platforms
      const syncPromises = supportedPlatforms.map(platform =>
        this.smartHomeIntegrator.executeAction(userId, action, platform)
          .catch((error: any) => {
            this.platformLogger.error('Smart home sync failed for platform', {
              error: error instanceof Error ? error.message : String(error),
              platform,
              userId
            });
            // Don't let individual platform failures break the entire sync
          })
      );

      await Promise.all(syncPromises);

      this.platformLogger.info('Smart home synchronization completed', {
        userId,
        platformCount: supportedPlatforms.length,
        actionType: action.type
      });

    } catch (error) {
      this.platformLogger.error('Smart home synchronization failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        actionType: action.type
      });
      // Don't throw error - smart home failures shouldn't break voice conversation
    }
  }
}