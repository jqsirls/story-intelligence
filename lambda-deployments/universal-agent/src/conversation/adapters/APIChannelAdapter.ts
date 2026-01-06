import { ChannelAdapter, UniversalMessage, UniversalResponse, ConversationSession, ChannelSwitchContext } from '../UniversalConversationEngine';
import { Logger } from 'winston';

/**
 * API Channel Adapter - Handles direct API integrations and third-party services
 */
export class APIChannelAdapter extends ChannelAdapter {
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async initializeSession(session: ConversationSession): Promise<void> {
    this.logger.debug('Initializing API session', {
      sessionId: session.sessionId,
      userId: session.userId
    });

    // Initialize API-specific session state
    session.state.channelStates['api_direct'] = {
      apiVersion: '1.0',
      responseFormat: 'json',
      includeMetadata: true,
      includeDebugInfo: false,
      rateLimitInfo: {
        remaining: 1000,
        resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        limit: 1000
      },
      clientInfo: {
        userAgent: 'unknown',
        apiKey: 'unknown',
        integration: 'direct'
      },
      webhookConfig: null,
      streamingEnabled: session.capabilities.supportsStreaming,
      batchingEnabled: false,
      compressionEnabled: true
    };
  }

  async preprocessMessage(message: UniversalMessage, session: ConversationSession): Promise<UniversalMessage> {
    const apiState = session.state.channelStates['api_direct'] || {};

    // Handle API-specific message preprocessing
    switch (message.type) {
      case 'text':
        return this.preprocessTextMessage(message, session);
      
      case 'file':
        return this.preprocessFileMessage(message, session);
      
      case 'action':
        return this.preprocessActionMessage(message, session);
      
      default:
        return message;
    }
  }

  async postprocessResponse(response: UniversalResponse, session: ConversationSession): Promise<UniversalResponse> {
    const apiState = session.state.channelStates['api_direct'] || {};

    // Add API-specific metadata and formatting
    return {
      ...response,
      metadata: {
        ...response.metadata,
        apiVersion: apiState.apiVersion,
        responseFormat: apiState.responseFormat,
        compressionUsed: apiState.compressionEnabled,
        rateLimitInfo: apiState.rateLimitInfo,
        debugInfo: apiState.includeDebugInfo ? this.generateDebugInfo(response, session) : undefined
      }
    };
  }

  async adaptResponse(response: UniversalResponse, session: ConversationSession): Promise<any> {
    const apiState = session.state.channelStates['api_direct'] || {};

    // Create API-specific response format
    interface APIResponse {
      success: boolean;
      data: {
        id: string;
        type: string;
        content: any;
        timestamp: string;
        conversationState: any;
        requiresInput: boolean;
        suggestions: string[];
        alternatives: any[];
      };
      metadata: {
        responseTime: number;
        confidence: number;
        agentsUsed: string[];
        apiVersion?: string;
        rateLimitInfo?: any;
      };
      links: any;
      pagination: any;
      webhook?: {
        deliveryId: string;
        url: string;
        scheduledAt: string;
        status: string;
      };
      debug?: any;
      streaming?: {
        supported: boolean;
        endpoint: string;
        format: string;
      };
    }

    const apiResponse: APIResponse = {
      success: true,
      data: {
        id: this.generateResponseId(),
        type: response.type,
        content: this.adaptContentForAPI(response, session),
        timestamp: new Date().toISOString(),
        conversationState: this.sanitizeConversationState(session.state),
        requiresInput: response.requiresInput,
        suggestions: response.suggestions || [],
        alternatives: response.alternatives || []
      },
      metadata: {
        responseTime: response.metadata.generationTime,
        confidence: response.metadata.confidence,
        agentsUsed: response.metadata.agentsUsed,
        apiVersion: apiState.apiVersion,
        rateLimitInfo: apiState.rateLimitInfo
      },
      links: this.generateAPILinks(response, session),
      pagination: null // For future use with batch responses
    };

    // Add webhook delivery if configured
    if (apiState.webhookConfig) {
      apiResponse.webhook = {
        deliveryId: this.generateWebhookId(),
        url: apiState.webhookConfig.url,
        scheduledAt: new Date().toISOString(),
        status: 'pending'
      };
    }

    // Add debug information if requested
    if (apiState.includeDebugInfo) {
      apiResponse.debug = this.generateDebugInfo(response, session);
    }

    // Add streaming information if supported
    if (apiState.streamingEnabled && response.type === 'text') {
      apiResponse.streaming = {
        supported: true,
        endpoint: `/api/v1/conversations/${session.sessionId}/stream`,
        format: 'text/event-stream'
      };
    }

    this.logger.debug('API response adapted', {
      sessionId: session.sessionId,
      responseId: apiResponse.data.id,
      hasWebhook: !!apiResponse.webhook,
      hasDebugInfo: !!apiResponse.debug,
      streamingSupported: apiResponse.streaming?.supported
    });

    return apiResponse;
  }

  async exportState(session: ConversationSession): Promise<any> {
    const apiState = session.state.channelStates['api_direct'] || {};
    
    return {
      apiVersion: apiState.apiVersion,
      clientInfo: apiState.clientInfo,
      preferences: {
        responseFormat: apiState.responseFormat,
        includeMetadata: apiState.includeMetadata,
        includeDebugInfo: apiState.includeDebugInfo,
        compressionEnabled: apiState.compressionEnabled
      },
      conversationPhase: session.state.phase,
      lastInteraction: session.state.context.lastInteraction,
      storyContext: {
        currentStory: session.state.currentStory,
        currentCharacter: session.state.currentCharacter
      },
      rateLimitInfo: apiState.rateLimitInfo,
      webhookConfig: apiState.webhookConfig,
      requestHistory: apiState.requestHistory?.slice(-10) || [] // Keep last 10 requests
    };
  }

  async importState(session: ConversationSession, state: any, context?: ChannelSwitchContext): Promise<void> {
    if (!state) return;

    // Import API-specific state
    session.state.channelStates['api_direct'] = {
      apiVersion: state.apiVersion || '1.0',
      clientInfo: state.clientInfo || {},
      ...state.preferences,
      streamingEnabled: session.capabilities.supportsStreaming,
      rateLimitInfo: state.rateLimitInfo || {},
      webhookConfig: state.webhookConfig,
      requestHistory: state.requestHistory || []
    };

    // Import general conversation state
    if (state.conversationPhase) {
      session.state.phase = state.conversationPhase;
    }

    if (state.storyContext) {
      session.state.currentStory = state.storyContext.currentStory;
      session.state.currentCharacter = state.storyContext.currentCharacter;
    }

    this.logger.debug('API state imported', {
      sessionId: session.sessionId,
      importedPhase: state.conversationPhase,
      hasWebhookConfig: !!state.webhookConfig,
      requestHistoryCount: state.requestHistory?.length || 0,
      preserveState: context?.preserveState
    });
  }

  async cleanupSession(session: ConversationSession): Promise<void> {
    // Clean up API-specific resources
    const apiState = session.state.channelStates['api_direct'];
    if (apiState) {
      // Cancel any pending webhooks
      if (apiState.pendingWebhooks) {
        try {
          // Cancel pending webhook deliveries
          // In production, this would call the webhook delivery system to cancel pending deliveries
          if (Array.isArray(apiState.pendingWebhooks)) {
            for (const webhookId of apiState.pendingWebhooks) {
              // Emit cancellation event - webhook delivery system will handle cancellation
              this.logger.debug('Canceling pending webhook', { webhookId, sessionId: session.sessionId });
              // Note: Actual cancellation would be handled by WebhookDeliverySystem
              // which listens to cancellation events
            }
          }
          // Clear pending webhooks list
          apiState.pendingWebhooks = [];
        } catch (error) {
          this.logger.warn('Error canceling pending webhooks', {
            error: error instanceof Error ? error.message : String(error),
            sessionId: session.sessionId
          });
        }
      }
      
      // Clear request history
      delete apiState.requestHistory;
      
      delete session.state.channelStates['api_direct'];
    }
    
    this.logger.debug('API session cleaned up', {
      sessionId: session.sessionId,
      userId: session.userId
    });
  }

  // Public API-specific methods

  /**
   * Configure webhook for API responses
   */
  async configureWebhook(session: ConversationSession, webhookConfig: WebhookConfig): Promise<void> {
    const apiState = session.state.channelStates['api_direct'];
    if (apiState) {
      apiState.webhookConfig = {
        ...webhookConfig,
        configuredAt: new Date().toISOString(),
        status: 'active'
      };
      
      this.logger.info('Webhook configured for API session', {
        sessionId: session.sessionId,
        webhookUrl: webhookConfig.url,
        events: webhookConfig.events
      });
    }
  }

  /**
   * Update rate limit information
   */
  updateRateLimit(session: ConversationSession, rateLimitInfo: RateLimitInfo): void {
    const apiState = session.state.channelStates['api_direct'];
    if (apiState) {
      apiState.rateLimitInfo = {
        ...rateLimitInfo,
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Enable/disable debug information
   */
  setDebugMode(session: ConversationSession, enabled: boolean): void {
    const apiState = session.state.channelStates['api_direct'];
    if (apiState) {
      apiState.includeDebugInfo = enabled;
      
      this.logger.debug('Debug mode updated for API session', {
        sessionId: session.sessionId,
        debugEnabled: enabled
      });
    }
  }

  // Private helper methods

  private preprocessTextMessage(message: UniversalMessage, session: ConversationSession): UniversalMessage {
    const apiState = session.state.channelStates['api_direct'] || {};
    
    // Add API-specific metadata
    return {
      ...message,
      metadata: {
        ...message.metadata,
        apiProcessed: true,
        clientInfo: apiState.clientInfo,
        requestId: this.generateRequestId()
      }
    };
  }

  private preprocessFileMessage(message: UniversalMessage, session: ConversationSession): UniversalMessage {
    const fileData = message.content as any;
    
    // Validate file for API processing
    const validation = this.validateFile(fileData);
    
    return {
      ...message,
      metadata: {
        ...message.metadata,
        apiFileProcessing: true,
        validation,
        processingRequired: validation.valid && this.requiresProcessing(fileData.type)
      }
    };
  }

  private preprocessActionMessage(message: UniversalMessage, session: ConversationSession): UniversalMessage {
    const actionData = message.content as any;
    
    // Validate and process API actions
    return {
      ...message,
      metadata: {
        ...message.metadata,
        apiAction: true,
        actionType: actionData.type,
        actionValidated: this.validateAction(actionData)
      }
    };
  }

  private adaptContentForAPI(response: UniversalResponse, session?: ConversationSession): any {
    const content = response.content;
    
    // Structure content for API consumption
    if (typeof content === 'string') {
      // Detect language from content if session available, otherwise default to 'en'
      let language = 'en';
      if (session && response.metadata) {
        // Try to get language from response metadata or session preferences
        language = (response.metadata as any).language || 
                   (session.preferences && (session.preferences as any).language) || 
                   'en';
      }
      
      return {
        text: content,
        format: 'plain',
        length: content.length,
        wordCount: content.split(' ').length,
        language,
        entities: this.extractEntities(content)
      };
    }

    // Handle other content types
    if (response.type === 'voice' && typeof content === 'object') {
      return {
        audio: content,
        transcript: this.extractTranscript(content),
        duration: (content as any).duration,
        format: (content as any).format
      };
    }

    if (response.type === 'image' && typeof content === 'object') {
      return {
        image: content,
        alt: (content as any).alt,
        dimensions: `${(content as any).width}x${(content as any).height}`,
        format: (content as any).format
      };
    }

    return content;
  }

  private sanitizeConversationState(state: any): any {
    // Remove sensitive information from conversation state for API response
    return {
      phase: state.phase,
      totalInteractions: state.context?.totalInteractions || 0,
      lastInteraction: state.context?.lastInteraction,
      storyProgress: this.calculateStoryProgress(state),
      characterProgress: this.calculateCharacterProgress(state)
    };
  }

  private generateAPILinks(response: UniversalResponse, session: ConversationSession): any {
    const baseUrl = process.env.API_BASE_URL || 'https://api.storytailor.dev';
    
    return {
      self: `${baseUrl}/api/v1/conversations/${session.sessionId}/messages/${this.generateResponseId()}`,
      conversation: `${baseUrl}/api/v1/conversations/${session.sessionId}`,
      user: `${baseUrl}/api/v1/users/${session.userId}`,
      stories: `${baseUrl}/api/v1/users/${session.userId}/stories`,
      characters: `${baseUrl}/api/v1/users/${session.userId}/characters`
    };
  }

  private generateDebugInfo(response: UniversalResponse, session: ConversationSession): any {
    return {
      processingSteps: response.metadata.agentsUsed,
      confidence: response.metadata.confidence,
      generationTime: response.metadata.generationTime,
      sessionInfo: {
        phase: session.state.phase,
        totalInteractions: session.state.context?.totalInteractions || 0,
        capabilities: Object.keys(session.capabilities).filter(key => 
          session.capabilities[key as keyof typeof session.capabilities]
        )
      },
      systemInfo: {
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };
  }

  private validateFile(fileData: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check file size
    if (fileData.size > 50 * 1024 * 1024) { // 50MB limit
      errors.push('File size exceeds 50MB limit');
    }
    
    // Check file type
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/json',
      'image/jpeg',
      'image/png',
      'audio/mpeg',
      'audio/wav'
    ];
    
    if (!allowedTypes.includes(fileData.type)) {
      errors.push(`File type ${fileData.type} not supported`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private requiresProcessing(fileType: string): boolean {
    const processableTypes = [
      'text/plain',
      'application/pdf',
      'application/json',
      'audio/mpeg',
      'audio/wav'
    ];
    
    return processableTypes.includes(fileType);
  }

  private validateAction(actionData: any): boolean {
    const allowedActions = [
      'create_story',
      'create_character',
      'edit_story',
      'edit_character',
      'generate_assets',
      'export_story'
    ];
    
    return allowedActions.includes(actionData.type);
  }

  private extractEntities(text: string): any[] {
    const entities = [];
    
    // Extract character names (capitalized words)
    const names = text.match(/\b[A-Z][a-z]+\b/g);
    if (names) {
      entities.push(...names.map(name => ({
        type: 'character_name',
        value: name,
        confidence: 0.8
      })));
    }
    
    // Extract story types
    const storyTypes = ['adventure', 'bedtime', 'birthday', 'educational'];
    for (const type of storyTypes) {
      if (text.toLowerCase().includes(type)) {
        entities.push({
          type: 'story_type',
          value: type,
          confidence: 0.9
        });
      }
    }
    
    return entities;
  }

  private extractTranscript(audioContent: any): string {
    // Extract transcript from audio content
    return audioContent.transcript || '';
  }

  private calculateStoryProgress(state: any): number {
    if (!state.currentStory) return 0;
    
    // Calculate based on story completion
    const story = state.currentStory;
    if (story.chapters && story.totalChapters) {
      return Math.round((story.chapters.length / story.totalChapters) * 100);
    }
    
    return 0;
  }

  private calculateCharacterProgress(state: any): number {
    if (!state.currentCharacter) return 0;
    
    // Calculate based on character trait completion
    const character = state.currentCharacter;
    const requiredTraits = ['name', 'age', 'species', 'appearance'];
    const completedTraits = requiredTraits.filter(trait => character[trait]);
    
    return Math.round((completedTraits.length / requiredTraits.length) * 100);
  }

  private generateResponseId(): string {
    return `api_resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `api_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWebhookId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Detect language from message content and session preferences
   */
  private detectLanguage(message: UniversalMessage, session: ConversationSession): string {
    // Check user preferences first
    if (session.preferences && (session.preferences as any).language) {
      return (session.preferences as any).language;
    }

    // Check message metadata
    if (message.metadata && (message.metadata as any).language) {
      return (message.metadata as any).language;
    }

    // Detect from content if it's text
    if (typeof message.content === 'string') {
      return this.detectLanguageFromText(message.content);
    }

    // Default to English
    return 'en';
  }

  /**
   * Detect language from text content using simple heuristics
   */
  private detectLanguageFromText(text: string): string {
    // Simple language detection based on common words and patterns
    const languagePatterns: Record<string, RegExp[]> = {
      'es': [/el |la |de |que |y |en |un |una |es |son |con |por |para |del |los |las /i],
      'fr': [/le |la |de |et |un |une |est |sont |avec |pour |dans |du |les |des /i],
      'de': [/der |die |das |und |ist |sind |mit |für |von |den |dem |des /i],
      'it': [/il |la |di |e |un |una |è |sono |con |per |nel |della |dei |delle /i],
      'pt': [/o |a |de |e |um |uma |é |são |com |por |para |do |da |dos |das /i],
      'ja': [/の |は |が |を |に |と |で |も |から |まで |です |ます /],
      'zh': [/的 |是 |在 |了 |和 |有 |我 |你 |他 |她 |这 |那 /],
      'ko': [/은 |는 |이 |가 |을 |를 |에 |에서 |와 |과 |의 |도 /]
    };

    const textLower = text.toLowerCase();
    let maxMatches = 0;
    let detectedLang = 'en';

    for (const [lang, patterns] of Object.entries(languagePatterns)) {
      let matches = 0;
      for (const pattern of patterns) {
        if (pattern.test(textLower)) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedLang = lang;
      }
    }

    return detectedLang;
  }
}

// API-specific interfaces
interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

interface RateLimitInfo {
  remaining: number;
  resetTime: string;
  limit: number;
  windowSize?: string;
}