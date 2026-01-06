// @ts-ignore - Event-system is bundled at runtime, types may not be available during compilation
import { EventPublisher } from '@alexa-multi-agent/event-system';
// PlatformAwareRouter imported dynamically to avoid module resolution issues in Lambda
// import { PlatformAwareRouter } from '@alexa-multi-agent/router';
import { Logger } from 'winston';

// Channel-agnostic conversation types
export type ConversationChannel = 
  | 'alexa_plus' 
  | 'google_assistant' 
  | 'apple_siri' 
  | 'web_chat' 
  | 'mobile_voice' 
  | 'mobile_app'
  | 'api_direct'
  | 'agent_to_agent'
  | 'webhook'
  | 'custom';

export type MessageType = 'text' | 'voice' | 'image' | 'file' | 'action' | 'system';
export type ResponseType = 'text' | 'voice' | 'image' | 'card' | 'action' | 'stream';

export interface ChannelCapabilities {
  supportsText: boolean;
  supportsVoice: boolean;
  supportsImages: boolean;
  supportsFiles: boolean;
  supportsCards: boolean;
  supportsActions: boolean;
  supportsStreaming: boolean;
  supportsRealtime: boolean;
  supportsSmartHome: boolean;
  supportsOffline: boolean;
  maxResponseTime: number;
  maxContentLength: number;
  maxFileSize?: number;
  supportedImageFormats?: string[];
  supportedAudioFormats?: string[];
  supportedFileTypes?: string[];
}

export interface ConversationRequest {
  // Core identification
  userId: string;
  sessionId: string;
  requestId: string;
  
  // Channel information
  channel: ConversationChannel;
  channelVersion?: string;
  deviceId?: string;
  
  // Message content
  message: UniversalMessage;
  
  // Context and state
  conversationContext?: ConversationContext;
  userPreferences?: UserPreferences;
  
  // Metadata
  timestamp: string;
  locale: string;
  timezone?: string;
  metadata: RequestMetadata;
}

export interface UniversalMessage {
  type: MessageType;
  content: string | AudioData | ImageData | FileData | ActionData;
  metadata: MessageMetadata;
  attachments?: MessageAttachment[];
}

export interface MessageMetadata {
  timestamp: string;
  confidence?: number;
  originalFormat?: string;
  processingHints?: ProcessingHints;
  accessibility?: AccessibilityMetadata;
}

export interface ProcessingHints {
  expectsVoiceResponse?: boolean;
  requiresImmediateResponse?: boolean;
  allowsAsyncProcessing?: boolean;
  preferredResponseType?: ResponseType;
  maxWaitTime?: number;
}

export interface AccessibilityMetadata {
  speechProcessingDelay?: number;
  vocabularyLevel?: 'simple' | 'standard' | 'advanced';
  requiresVisualCues?: boolean;
  requiresAudioDescription?: boolean;
  preferredInteractionMode?: 'voice' | 'text' | 'multimodal';
}

export interface ConversationResponse {
  // Core identification
  requestId: string;
  responseId: string;
  
  // Response content
  response: UniversalResponse;
  
  // Conversation state
  conversationState: ConversationState;
  nextExpectedInput?: string;
  
  // Channel-specific adaptations
  channelAdaptations: Record<ConversationChannel, any>;
  
  // Actions and side effects
  actions?: ConversationAction[];
  smartHomeActions?: SmartHomeAction[];
  
  // Metadata
  metadata: ResponseMetadata;
}

export interface UniversalResponse {
  type: ResponseType;
  content: string | AudioData | ImageData | CardData | ActionData;
  alternatives?: AlternativeResponse[];
  suggestions?: string[];
  requiresInput: boolean;
  metadata: ResponseContentMetadata;
}

export interface AlternativeResponse {
  type: ResponseType;
  content: string | AudioData | ImageData | CardData;
  condition: string; // When to use this alternative
  priority: number;
}

export interface ResponseContentMetadata {
  confidence: number;
  generationTime: number;
  agentsUsed: string[];
  fallbackUsed?: boolean;
  adaptedForChannel?: boolean;
}

export interface ConversationContext {
  // Session information
  sessionStartTime: string;
  totalInteractions: number;
  
  // Story context
  currentStory?: StoryContext;
  currentCharacter?: CharacterContext;
  storyPhase?: 'greeting' | 'character_creation' | 'story_building' | 'editing' | 'finalization';
  
  // User context
  emotionalState?: EmotionalState;
  engagementLevel?: number;
  
  // Technical context
  lastSuccessfulChannel?: ConversationChannel;
  failedChannels?: ConversationChannel[];
  
  // History
  recentInteractions: InteractionSummary[];
  conversationSummary?: string;
}

export interface ConversationState {
  phase: string;
  context: Record<string, any>;
  history: ConversationHistoryItem[];
  currentStory: any;
  currentCharacter: any;
  channelStates: Record<ConversationChannel, any>;
}

export interface ConversationAction {
  type: 'redirect' | 'escalate' | 'transfer' | 'notify' | 'log' | 'trigger_webhook';
  target?: string;
  payload?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  executeAfterResponse?: boolean;
}

export interface RequestMetadata {
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: DeviceInfo;
  networkInfo?: NetworkInfo;
  authenticationLevel?: 'anonymous' | 'basic' | 'verified' | 'premium';
  rateLimitInfo?: RateLimitInfo;
}

export interface ResponseMetadata {
  responseTime: number;
  processingSteps: ProcessingStep[];
  cacheHit?: boolean;
  fallbackUsed?: boolean;
  channelAdaptations: string[];
  warnings?: string[];
  debugInfo?: any;
}

export interface ProcessingStep {
  step: string;
  duration: number;
  agent?: string;
  success: boolean;
  error?: string;
}

// Channel-specific authentication
export interface ChannelAuthentication {
  channel: ConversationChannel;
  authType: 'oauth' | 'api_key' | 'jwt' | 'session' | 'none';
  credentials: Record<string, any>;
  expiresAt?: string;
  refreshToken?: string;
}

// Cross-channel synchronization
export interface ChannelSyncRequest {
  sourceChannel: ConversationChannel;
  targetChannels: ConversationChannel[];
  syncType: 'state' | 'context' | 'full';
  conflictResolution: 'source_wins' | 'target_wins' | 'merge' | 'manual';
}

export interface ChannelSyncResult {
  syncId: string;
  sourceChannel: ConversationChannel;
  targetChannels: ConversationChannel[];
  syncedAt: string;
  conflicts: SyncConflict[];
  success: boolean;
  errors?: string[];
}

export interface SyncConflict {
  field: string;
  sourceValue: any;
  targetValue: any;
  resolution: 'source' | 'target' | 'merged' | 'manual_required';
}

/**
 * Universal Conversation Engine - Channel-agnostic conversation management
 */
export class UniversalConversationEngine {
  private router: any; // PlatformAwareRouter loaded dynamically
  private eventPublisher: EventPublisher;
  private logger: Logger;
  
  // Channel management
  private channelAdapters: Map<ConversationChannel, ChannelAdapter> = new Map();
  private channelCapabilities: Map<ConversationChannel, ChannelCapabilities> = new Map();
  
  // Session management
  private activeSessions: Map<string, ConversationSession> = new Map();
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  // Cross-channel synchronization
  private syncQueue: Map<string, ChannelSyncRequest[]> = new Map();
  private conflictResolver: ConflictResolver;
  
  constructor(
    router: any, // PlatformAwareRouter loaded dynamically
    eventPublisher: EventPublisher,
    logger: Logger
  ) {
    this.router = router;
    this.eventPublisher = eventPublisher;
    this.logger = logger;
    this.conflictResolver = new ConflictResolver(logger);
    
    this.initializeDefaultChannels();
    this.startSessionCleanup();
  }

  /**
   * Start a new conversation session
   */
  async startConversation(request: ConversationStartRequest): Promise<ConversationSession> {
    const sessionId = request.sessionId || this.generateSessionId();
    const startTime = Date.now();

    try {
      this.logger.info('Starting conversation session', {
        sessionId,
        userId: request.userId,
        channel: request.channel
      });

      // Validate channel support
      if (!this.channelAdapters.has(request.channel)) {
        throw new Error(`Unsupported channel: ${request.channel}`);
      }

      // Get channel capabilities
      const capabilities = this.getChannelCapabilities(request.channel);

      // Create session
      const session: ConversationSession = {
        sessionId,
        userId: request.userId,
        channel: request.channel,
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (request.sessionDuration || 24 * 60 * 60 * 1000)).toISOString(),
        capabilities,
        state: {
          phase: 'greeting',
          context: request.initialContext || {},
          history: [],
          currentStory: null,
          currentCharacter: null,
          channelStates: {}
        },
        authentication: request.authentication,
        preferences: request.preferences || this.getDefaultPreferences()
      };

      // Store session
      this.activeSessions.set(sessionId, session);
      this.scheduleSessionCleanup(sessionId, session.expiresAt);

      // Initialize channel-specific state
      const adapter = this.channelAdapters.get(request.channel)!;
      await adapter.initializeSession(session);

      // Publish event
      await this.eventPublisher.publishEvent(
        'com.storytailor.conversation.session_started',
        {
          sessionId,
          userId: request.userId,
          channel: request.channel,
          capabilities: capabilities,
          duration: Date.now() - startTime
        }
      );

      this.logger.info('Conversation session started successfully', {
        sessionId,
        userId: request.userId,
        channel: request.channel,
        duration: Date.now() - startTime
      });

      return session;

    } catch (error) {
      this.logger.error('Failed to start conversation session', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        userId: request.userId,
        channel: request.channel,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Process a conversation message
   */
  async processMessage(request: ConversationRequest): Promise<ConversationResponse> {
    const startTime = Date.now();
    const processingSteps: ProcessingStep[] = [];

    try {
      this.logger.info('Processing conversation message', {
        requestId: request.requestId,
        sessionId: request.sessionId,
        channel: request.channel,
        messageType: request.message.type
      });

      // Validate session
      const session = await this.validateSession(request.sessionId);
      processingSteps.push({
        step: 'session_validation',
        duration: Date.now() - startTime,
        success: true
      });

      // Get channel adapter
      const adapter = this.channelAdapters.get(request.channel);
      if (!adapter) {
        throw new Error(`No adapter found for channel: ${request.channel}`);
      }

      // Pre-process message through channel adapter
      const preprocessStart = Date.now();
      const preprocessedMessage = await adapter.preprocessMessage(request.message, session);
      processingSteps.push({
        step: 'message_preprocessing',
        duration: Date.now() - preprocessStart,
        success: true
      });

      // Convert to router format
      const routerStart = Date.now();
      const routerRequest = await this.convertToRouterRequest(request, session, preprocessedMessage);
      
      // Process through router (with null check to prevent stack overflow)
      if (!this.router) {
        throw new Error('Router not initialized. Cannot process message.');
      }
      const routerResponse = await this.router.handleRequest(routerRequest, this.mapChannelToPlatform(request.channel));
      processingSteps.push({
        step: 'router_processing',
        duration: Date.now() - routerStart,
        success: true
      });

      // Convert router response to universal format
      const conversionStart = Date.now();
      const universalResponse = await this.convertFromRouterResponse(routerResponse, session, request.channel);
      processingSteps.push({
        step: 'response_conversion',
        duration: Date.now() - conversionStart,
        success: true
      });

      // Post-process response through channel adapter
      const postprocessStart = Date.now();
      const finalResponse = await adapter.postprocessResponse(universalResponse, session);
      processingSteps.push({
        step: 'response_postprocessing',
        duration: Date.now() - postprocessStart,
        success: true
      });

      // Update session state
      await this.updateSessionState(session, request, finalResponse);

      // Create channel adaptations
      const adaptationStart = Date.now();
      const channelAdaptations = await this.createChannelAdaptations(finalResponse, session);
      processingSteps.push({
        step: 'channel_adaptations',
        duration: Date.now() - adaptationStart,
        success: true
      });

      // Build final response
      const response: ConversationResponse = {
        requestId: request.requestId,
        responseId: this.generateResponseId(),
        response: finalResponse,
        conversationState: session.state,
        nextExpectedInput: this.determineNextExpectedInput(finalResponse, session),
        channelAdaptations,
        actions: this.determineActions(finalResponse, session),
        smartHomeActions: routerResponse.smartHomeActions || [],
        metadata: {
          responseTime: Date.now() - startTime,
          processingSteps,
          channelAdaptations: Object.keys(channelAdaptations),
          cacheHit: false // TODO: Implement caching
        }
      };

      // Execute post-response actions
      await this.executePostResponseActions(response);

      // Publish event
      await this.eventPublisher.publishEvent(
        'com.storytailor.conversation.message_processed',
        {
          requestId: request.requestId,
          responseId: response.responseId,
          sessionId: request.sessionId,
          userId: request.userId,
          channel: request.channel,
          messageType: request.message.type,
          responseType: finalResponse.type,
          responseTime: response.metadata.responseTime,
          agentsUsed: finalResponse.metadata.agentsUsed
        }
      );

      this.logger.info('Conversation message processed successfully', {
        requestId: request.requestId,
        responseId: response.responseId,
        sessionId: request.sessionId,
        channel: request.channel,
        responseTime: response.metadata.responseTime
      });

      return response;

    } catch (error) {
      const errorStep: ProcessingStep = {
        step: 'error_handling',
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      processingSteps.push(errorStep);

      this.logger.error('Failed to process conversation message', {
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId,
        sessionId: request.sessionId,
        channel: request.channel,
        processingSteps
      });

      // Return error response
      return this.createErrorResponse(request, error, processingSteps, Date.now() - startTime);
    }
  }

  /**
   * Stream conversation response for real-time channels
   */
  async *streamResponse(request: ConversationRequest): AsyncIterator<ConversationResponseChunk> {
    const session = await this.validateSession(request.sessionId);
    const adapter = this.channelAdapters.get(request.channel);
    
    if (!adapter || !session.capabilities.supportsStreaming) {
      // Fallback to regular response and simulate streaming
      const response = await this.processMessage(request);
      yield* this.simulateStreaming(response);
      return;
    }

    try {
      this.logger.info('Starting streaming response', {
        requestId: request.requestId,
        sessionId: request.sessionId,
        channel: request.channel
      });

      // Convert to router format
      const routerRequest = await this.convertToRouterRequest(request, session, request.message);
      
      // Stream from router if supported
      if (this.router.supportsStreaming) {
        for await (const chunk of this.router.streamResponse(routerRequest)) {
          const universalChunk = await this.convertStreamChunk(chunk, session, request.channel);
          yield universalChunk;
        }
      } else {
        // Fallback to simulated streaming
        const response = await this.processMessage(request);
        yield* this.simulateStreaming(response);
      }

    } catch (error) {
      this.logger.error('Streaming response failed', {
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId,
        sessionId: request.sessionId,
        channel: request.channel
      });

      // Yield error chunk
      yield {
        chunkId: this.generateChunkId(),
        type: 'error',
        content: 'I encountered an error while processing your request.',
        isComplete: true,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Switch conversation between channels
   */
  async switchChannel(
    sessionId: string,
    fromChannel: ConversationChannel,
    toChannel: ConversationChannel,
    switchContext?: ChannelSwitchContext
  ): Promise<ChannelSwitchResult> {
    const startTime = Date.now();

    try {
      this.logger.info('Switching conversation channel', {
        sessionId,
        fromChannel,
        toChannel
      });

      // Validate session and channels
      const session = await this.validateSession(sessionId);
      
      if (!this.channelAdapters.has(toChannel)) {
        throw new Error(`Target channel not supported: ${toChannel}`);
      }

      // Get adapters
      const fromAdapter = this.channelAdapters.get(fromChannel);
      const toAdapter = this.channelAdapters.get(toChannel)!;

      // Export state from source channel
      let exportedState: any = {};
      if (fromAdapter) {
        exportedState = await fromAdapter.exportState(session);
      }

      // Import state to target channel
      await toAdapter.importState(session, exportedState, switchContext);

      // Update session channel
      session.channel = toChannel;
      session.capabilities = this.getChannelCapabilities(toChannel);

      // Update channel states
      if (fromChannel !== toChannel) {
        session.state.channelStates[fromChannel] = exportedState;
      }

      // Publish event
      await this.eventPublisher.publishEvent(
        'com.storytailor.conversation.channel_switched',
        {
          sessionId,
          fromChannel,
          toChannel,
          userId: session.userId,
          duration: Date.now() - startTime
        }
      );

      const result: ChannelSwitchResult = {
        sessionId,
        fromChannel,
        toChannel,
        switchedAt: new Date().toISOString(),
        success: true,
        newCapabilities: session.capabilities,
        preservedState: Object.keys(exportedState),
        duration: Date.now() - startTime
      };

      this.logger.info('Channel switch completed successfully', result);
      return result;

    } catch (error) {
      this.logger.error('Channel switch failed', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        fromChannel,
        toChannel,
        duration: Date.now() - startTime
      });

      return {
        sessionId,
        fromChannel,
        toChannel,
        switchedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Synchronize conversation state across multiple channels
   */
  async synchronizeChannels(request: ChannelSyncRequest): Promise<ChannelSyncResult> {
    const startTime = Date.now();
    const syncId = this.generateSyncId();

    try {
      this.logger.info('Starting channel synchronization', {
        syncId,
        sourceChannel: request.sourceChannel,
        targetChannels: request.targetChannels,
        syncType: request.syncType
      });

      const conflicts: SyncConflict[] = [];
      const errors: string[] = [];

      // Get source adapter and export state
      const sourceAdapter = this.channelAdapters.get(request.sourceChannel);
      if (!sourceAdapter) {
        throw new Error(`Source channel adapter not found: ${request.sourceChannel}`);
      }

      // For each target channel, perform synchronization
      for (const targetChannel of request.targetChannels) {
        try {
          const targetAdapter = this.channelAdapters.get(targetChannel);
          if (!targetAdapter) {
            errors.push(`Target channel adapter not found: ${targetChannel}`);
            continue;
          }

          // Perform sync based on type
          const channelConflicts = await this.performChannelSync(
            sourceAdapter,
            targetAdapter,
            request.syncType,
            request.conflictResolution
          );

          conflicts.push(...channelConflicts);

        } catch (error) {
          errors.push(`Sync failed for ${targetChannel}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const result: ChannelSyncResult = {
        syncId,
        sourceChannel: request.sourceChannel,
        targetChannels: request.targetChannels,
        syncedAt: new Date().toISOString(),
        conflicts,
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };

      // Publish event
      await this.eventPublisher.publishEvent(
        'com.storytailor.conversation.channels_synchronized',
        {
          syncId,
          sourceChannel: request.sourceChannel,
          targetChannels: request.targetChannels,
          syncType: request.syncType,
          conflictCount: conflicts.length,
          errorCount: errors.length,
          duration: Date.now() - startTime
        }
      );

      this.logger.info('Channel synchronization completed', {
        syncId,
        success: result.success,
        conflictCount: conflicts.length,
        errorCount: errors.length,
        duration: Date.now() - startTime
      });

      return result;

    } catch (error) {
      this.logger.error('Channel synchronization failed', {
        error: error instanceof Error ? error.message : String(error),
        syncId,
        sourceChannel: request.sourceChannel,
        targetChannels: request.targetChannels,
        duration: Date.now() - startTime
      });

      return {
        syncId,
        sourceChannel: request.sourceChannel,
        targetChannels: request.targetChannels,
        syncedAt: new Date().toISOString(),
        conflicts: [],
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Register a new channel adapter
   */
  registerChannel(
    channel: ConversationChannel,
    adapter: ChannelAdapter,
    capabilities: ChannelCapabilities
  ): void {
    this.channelAdapters.set(channel, adapter);
    this.channelCapabilities.set(channel, capabilities);
    
    this.logger.info('Channel adapter registered', {
      channel,
      capabilities: Object.keys(capabilities).filter(key => capabilities[key as keyof ChannelCapabilities])
    });
  }

  /**
   * Get supported channels
   */
  getSupportedChannels(): ConversationChannel[] {
    return Array.from(this.channelAdapters.keys());
  }

  /**
   * Get channel capabilities
   */
  getChannelCapabilities(channel: ConversationChannel): ChannelCapabilities {
    return this.channelCapabilities.get(channel) || this.getDefaultCapabilities();
  }

  /**
   * End conversation session
   */
  async endConversation(sessionId: string, reason?: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn('Attempted to end non-existent session', { sessionId });
      return;
    }

    try {
      this.logger.info('Ending conversation session', {
        sessionId,
        userId: session.userId,
        channel: session.channel,
        reason
      });

      // Clean up channel-specific resources
      const adapter = this.channelAdapters.get(session.channel);
      if (adapter) {
        await adapter.cleanupSession(session);
      }

      // Clear timeouts
      const timeout = this.sessionTimeouts.get(sessionId);
      if (timeout) {
        clearTimeout(timeout);
        this.sessionTimeouts.delete(sessionId);
      }

      // Remove session
      this.activeSessions.delete(sessionId);

      // Publish event
      await this.eventPublisher.publishEvent(
        'com.storytailor.conversation.session_ended',
        {
          sessionId,
          userId: session.userId,
          channel: session.channel,
          duration: Date.now() - new Date(session.startedAt).getTime(),
          messageCount: session.state.history.length,
          reason
        }
      );

      this.logger.info('Conversation session ended successfully', {
        sessionId,
        userId: session.userId,
        channel: session.channel
      });

    } catch (error) {
      this.logger.error('Failed to end conversation session', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        userId: session.userId,
        channel: session.channel
      });
    }
  }

  // Private helper methods

  private initializeDefaultChannels(): void {
    // Initialize default channel capabilities
    this.channelCapabilities.set('alexa_plus', {
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
    });

    this.channelCapabilities.set('web_chat', {
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
      maxFileSize: 10 * 1024 * 1024, // 10MB
      supportedImageFormats: ['jpg', 'png', 'gif', 'webp'],
      supportedAudioFormats: ['mp3', 'wav', 'ogg'],
      supportedFileTypes: ['pdf', 'doc', 'txt']
    });

    this.channelCapabilities.set('mobile_voice', {
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
      maxFileSize: 5 * 1024 * 1024, // 5MB
      supportedImageFormats: ['jpg', 'png'],
      supportedAudioFormats: ['mp3', 'wav']
    });

    this.channelCapabilities.set('api_direct', {
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
      maxFileSize: 50 * 1024 * 1024, // 50MB
      supportedImageFormats: ['jpg', 'png', 'gif', 'webp', 'svg'],
      supportedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'json', 'xml']
    });
  }

  private startSessionCleanup(): void {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (new Date(session.expiresAt).getTime() < now) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.endConversation(sessionId, 'expired').catch(error => {
        this.logger.error('Failed to cleanup expired session', {
          error: error instanceof Error ? error.message : String(error),
          sessionId
        });
      });
    }

    if (expiredSessions.length > 0) {
      this.logger.info('Cleaned up expired sessions', {
        count: expiredSessions.length,
        sessionIds: expiredSessions
      });
    }
  }

  private scheduleSessionCleanup(sessionId: string, expiresAt: string): void {
    const timeout = setTimeout(() => {
      this.endConversation(sessionId, 'expired').catch(error => {
        this.logger.error('Failed to cleanup session on timeout', {
          error: error instanceof Error ? error.message : String(error),
          sessionId
        });
      });
    }, new Date(expiresAt).getTime() - Date.now());

    this.sessionTimeouts.set(sessionId, timeout);
  }

  private async validateSession(sessionId: string): Promise<ConversationSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.endConversation(sessionId, 'expired');
      throw new Error(`Session expired: ${sessionId}`);
    }

    return session;
  }

  private generateSessionId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResponseId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultCapabilities(): ChannelCapabilities {
    return {
      supportsText: true,
      supportsVoice: false,
      supportsImages: false,
      supportsFiles: false,
      supportsCards: false,
      supportsActions: false,
      supportsStreaming: false,
      supportsRealtime: false,
      supportsSmartHome: false,
      supportsOffline: false,
      maxResponseTime: 5000,
      maxContentLength: 2000
    };
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      voice: {
        voice: 'storyteller',
        speed: 1.0,
        emotion: 'warm',
        volume: 0.8
      },
      smartHome: {
        autoConnect: false,
        lightingIntensity: 'moderate',
        enableNarrativeSync: true
      },
      privacy: {
        dataRetentionPreference: 'standard',
        analyticsOptOut: false,
        smartHomeDataSharing: false
      },
      accessibility: {
        speechProcessingDelay: 0,
        vocabularyLevel: 'standard',
        visualIndicators: false,
        hapticFeedback: false
      }
    };
  }

  private mapChannelToPlatform(channel: ConversationChannel): any {
    const mapping: Record<ConversationChannel, string> = {
      'alexa_plus': 'alexa_plus',
      'google_assistant': 'google_assistant',
      'apple_siri': 'apple_siri',
      'web_chat': 'alexa_plus', // Map web to alexa_plus adapter (most compatible)
      'mobile_voice': 'alexa_plus', // Map mobile to alexa_plus adapter
      'mobile_app': 'alexa_plus',
      'api_direct': 'alexa_plus', // Map API to alexa_plus adapter
      'agent_to_agent': 'alexa_plus',
      'webhook': 'alexa_plus',
      'custom': 'alexa_plus' // Default to alexa_plus for compatibility
    };

    return mapping[channel] || 'alexa_plus';
  }

  private async convertToRouterRequest(
    request: ConversationRequest,
    session: ConversationSession,
    message: UniversalMessage
  ): Promise<any> {
    // Convert universal request to router format
    // Add context.System property for platform adapters that expect it (e.g., Alexa)
    return {
      userId: request.userId,
      sessionId: request.sessionId,
      requestId: request.requestId,
      userInput: message.content.toString(),
      channel: this.mapChannelToPlatform(request.channel),
      locale: request.locale,
      deviceType: 'voice', // TODO: Map from channel
      timestamp: request.timestamp,
      context: {
        System: {
          application: {
            applicationId: session.sessionId || 'default-app-id'
          },
          user: {
            userId: request.userId,
            accessToken: request.metadata?.authToken || undefined
          },
          device: {
            deviceId: request.deviceId || session.sessionId,
            supportedInterfaces: {}
          },
          apiEndpoint: 'https://api.amazonalexa.com',
          apiAccessToken: request.metadata?.authToken || undefined
        }
      },
      metadata: {
        originalChannel: request.channel,
        messageType: message.type,
        capabilities: session.capabilities,
        preferences: session.preferences,
        ...request.metadata
      }
    };
  }

  private async convertFromRouterResponse(
    routerResponse: any,
    session: ConversationSession,
    channel: ConversationChannel
  ): Promise<UniversalResponse> {
    const capabilities = this.getChannelCapabilities(channel);
    
    // Determine best response type for channel
    let responseType: ResponseType = 'text';
    if (capabilities.supportsVoice && routerResponse.speech) {
      responseType = 'voice';
    } else if (capabilities.supportsCards && routerResponse.card) {
      responseType = 'card';
    }

    return {
      type: responseType,
      content: routerResponse.speech || routerResponse.message || routerResponse.text || 'I\'m sorry, I didn\'t understand that.',
      alternatives: this.generateAlternatives(routerResponse, capabilities),
      suggestions: routerResponse.suggestions || [],
      requiresInput: routerResponse.requiresInput !== false,
      metadata: {
        confidence: routerResponse.confidence || 1.0,
        generationTime: routerResponse.responseTime || 0,
        agentsUsed: routerResponse.agentsUsed || ['router'],
        adaptedForChannel: true
      }
    };
  }

  private generateAlternatives(routerResponse: any, capabilities: ChannelCapabilities): AlternativeResponse[] {
    const alternatives: AlternativeResponse[] = [];

    // Add text alternative if voice is primary
    if (capabilities.supportsText && routerResponse.speech && routerResponse.text !== routerResponse.speech) {
      alternatives.push({
        type: 'text',
        content: routerResponse.text || this.stripSSML(routerResponse.speech),
        condition: 'text_preferred',
        priority: 1
      });
    }

    // Add voice alternative if text is primary
    if (capabilities.supportsVoice && routerResponse.text && !routerResponse.speech) {
      alternatives.push({
        type: 'voice',
        content: routerResponse.text,
        condition: 'voice_preferred',
        priority: 1
      });
    }

    return alternatives;
  }

  private stripSSML(ssml: string): string {
    return ssml.replace(/<[^>]*>/g, '').trim();
  }

  private async updateSessionState(
    session: ConversationSession,
    request: ConversationRequest,
    response: UniversalResponse
  ): Promise<void> {
    // Add to history
    session.state.history.push({
      timestamp: new Date().toISOString(),
      userMessage: request.message,
      botResponse: response
    });

    // Update conversation context
    session.state.context.lastInteraction = new Date().toISOString();
    session.state.context.totalInteractions = (session.state.context.totalInteractions || 0) + 1;

    // Update phase based on response content
    if (response.content.toString().includes('character')) {
      session.state.phase = 'character_creation';
    } else if (response.content.toString().includes('story')) {
      session.state.phase = 'story_creation';
    }

    // Trim history if too long
    if (session.state.history.length > 50) {
      session.state.history = session.state.history.slice(-25);
    }
  }

  private async createChannelAdaptations(
    response: UniversalResponse,
    session: ConversationSession
  ): Promise<Record<ConversationChannel, any>> {
    const adaptations: Record<ConversationChannel, any> = {};

    // Create adaptations for each supported channel
    for (const [channel, adapter] of this.channelAdapters.entries()) {
      try {
        adaptations[channel] = await adapter.adaptResponse(response, session);
      } catch (error) {
        this.logger.warn('Failed to create channel adaptation', {
          error: error instanceof Error ? error.message : String(error),
          channel,
          sessionId: session.sessionId
        });
        adaptations[channel] = { error: 'adaptation_failed' };
      }
    }

    return adaptations;
  }

  private determineNextExpectedInput(response: UniversalResponse, session: ConversationSession): string | undefined {
    if (!response.requiresInput) {
      return undefined;
    }

    // Determine based on conversation phase
    switch (session.state.phase) {
      case 'greeting':
        return 'story_type_or_character_name';
      case 'character_creation':
        return 'character_trait_or_confirmation';
      case 'story_building':
        return 'story_choice_or_edit';
      case 'editing':
        return 'edit_command_or_finalization';
      default:
        return 'user_input';
    }
  }

  private determineActions(response: UniversalResponse, session: ConversationSession): ConversationAction[] {
    const actions: ConversationAction[] = [];

    // Add logging action for all interactions
    actions.push({
      type: 'log',
      payload: {
        sessionId: session.sessionId,
        userId: session.userId,
        phase: session.state.phase,
        responseType: response.type
      },
      priority: 'low',
      executeAfterResponse: true
    });

    // Add escalation if confidence is low
    if (response.metadata.confidence < 0.5) {
      actions.push({
        type: 'escalate',
        target: 'human_moderator',
        payload: {
          reason: 'low_confidence',
          confidence: response.metadata.confidence
        },
        priority: 'medium'
      });
    }

    return actions;
  }

  private async executePostResponseActions(response: ConversationResponse): Promise<void> {
    if (!response.actions || response.actions.length === 0) {
      return;
    }

    const actionsToExecute = response.actions.filter(action => action.executeAfterResponse);

    for (const action of actionsToExecute) {
      try {
        await this.executeAction(action);
      } catch (error) {
        this.logger.error('Failed to execute post-response action', {
          error: error instanceof Error ? error.message : String(error),
          actionType: action.type,
          responseId: response.responseId
        });
      }
    }
  }

  private async executeAction(action: ConversationAction): Promise<void> {
    switch (action.type) {
      case 'log':
        this.logger.info('Conversation action log', action.payload);
        break;
      case 'escalate':
        await this.eventPublisher.publishEvent(
          'com.storytailor.conversation.escalation',
          action.payload
        );
        break;
      case 'notify':
        await this.eventPublisher.publishEvent(
          'com.storytailor.conversation.notification',
          action.payload
        );
        break;
      case 'trigger_webhook':
        // TODO: Implement webhook triggering
        break;
      default:
        this.logger.warn('Unknown action type', { actionType: action.type });
    }
  }

  private createErrorResponse(
    request: ConversationRequest,
    error: any,
    processingSteps: ProcessingStep[],
    responseTime: number
  ): ConversationResponse {
    return {
      requestId: request.requestId,
      responseId: this.generateResponseId(),
      response: {
        type: 'text',
        content: 'I\'m sorry, I encountered an error while processing your request. Please try again.',
        suggestions: ['Try again', 'Start over', 'Get help'],
        requiresInput: true,
        metadata: {
          confidence: 0,
          generationTime: responseTime,
          agentsUsed: ['error_handler'],
          fallbackUsed: true
        }
      },
      conversationState: {
        phase: 'error',
        context: { error: error instanceof Error ? error.message : String(error) },
        history: [],
        currentStory: null,
        currentCharacter: null,
        channelStates: {}
      },
      channelAdaptations: {},
      actions: [{
        type: 'log',
        payload: {
          error: error instanceof Error ? error.message : String(error),
          requestId: request.requestId
        },
        priority: 'high' as const,
        executeAfterResponse: true
      }],
      metadata: {
        responseTime,
        processingSteps,
        channelAdaptations: [],
        fallbackUsed: true,
        warnings: ['Error response generated']
      }
    };
  }

  private async *simulateStreaming(response: ConversationResponse): AsyncIterator<ConversationResponseChunk> {
    const content = response.response.content.toString();
    const words = content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      yield {
        chunkId: this.generateChunkId(),
        type: 'text_chunk',
        content: words.slice(0, i + 1).join(' '),
        isComplete: i === words.length - 1,
        metadata: {
          chunkIndex: i,
          totalChunks: words.length,
          timestamp: new Date().toISOString()
        }
      };
      
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private async convertStreamChunk(
    chunk: any,
    session: ConversationSession,
    channel: ConversationChannel
  ): Promise<ConversationResponseChunk> {
    return {
      chunkId: this.generateChunkId(),
      type: 'text_chunk',
      content: chunk.content || chunk.text || '',
      isComplete: chunk.isComplete || false,
      metadata: {
        chunkIndex: chunk.index || 0,
        totalChunks: chunk.total || 1,
        timestamp: new Date().toISOString(),
        channel,
        sessionId: session.sessionId
      }
    };
  }

  private async performChannelSync(
    sourceAdapter: ChannelAdapter,
    targetAdapter: ChannelAdapter,
    syncType: string,
    conflictResolution: string
  ): Promise<SyncConflict[]> {
    // TODO: Implement channel synchronization logic
    return [];
  }
}

// Additional interfaces and types

export interface ConversationSession {
  sessionId: string;
  userId: string;
  channel: ConversationChannel;
  startedAt: string;
  expiresAt: string;
  capabilities: ChannelCapabilities;
  state: ConversationState;
  authentication?: ChannelAuthentication;
  preferences?: UserPreferences;
}

export interface ConversationStartRequest {
  userId: string;
  sessionId?: string;
  channel: ConversationChannel;
  sessionDuration?: number;
  initialContext?: Record<string, any>;
  authentication?: ChannelAuthentication;
  preferences?: UserPreferences;
}

export interface ConversationResponseChunk {
  chunkId: string;
  type: string;
  content: string;
  isComplete: boolean;
  metadata: any;
}

export interface ChannelSwitchContext {
  reason?: string;
  preserveState?: boolean;
  customData?: Record<string, any>;
}

export interface ChannelSwitchResult {
  sessionId: string;
  fromChannel: ConversationChannel;
  toChannel: ConversationChannel;
  switchedAt: string;
  success: boolean;
  error?: string;
  newCapabilities?: ChannelCapabilities;
  preservedState?: string[];
  duration: number;
}

// Abstract base class for channel adapters
export abstract class ChannelAdapter {
  abstract initializeSession(session: ConversationSession): Promise<void>;
  abstract preprocessMessage(message: UniversalMessage, session: ConversationSession): Promise<UniversalMessage>;
  abstract postprocessResponse(response: UniversalResponse, session: ConversationSession): Promise<UniversalResponse>;
  abstract adaptResponse(response: UniversalResponse, session: ConversationSession): Promise<any>;
  abstract exportState(session: ConversationSession): Promise<any>;
  abstract importState(session: ConversationSession, state: any, context?: ChannelSwitchContext): Promise<void>;
  abstract cleanupSession(session: ConversationSession): Promise<void>;
}

// Conflict resolver for cross-channel synchronization
class ConflictResolver {
  constructor(private logger: Logger) {}

  async resolveConflicts(
    conflicts: SyncConflict[],
    resolution: string
  ): Promise<SyncConflict[]> {
    const resolvedConflicts: SyncConflict[] = [];

    for (const conflict of conflicts) {
      try {
        const resolved = await this.resolveConflict(conflict, resolution);
        resolvedConflicts.push(resolved);
      } catch (error) {
        this.logger.error('Failed to resolve conflict', {
          error: error instanceof Error ? error.message : String(error),
          conflict
        });
        resolvedConflicts.push({
          ...conflict,
          resolution: 'manual_required'
        });
      }
    }

    return resolvedConflicts;
  }

  private async resolveConflict(conflict: SyncConflict, resolution: string): Promise<SyncConflict> {
    switch (resolution) {
      case 'source_wins':
        return { ...conflict, resolution: 'source' };
      case 'target_wins':
        return { ...conflict, resolution: 'target' };
      case 'merge':
        return { ...conflict, resolution: 'merged' };
      default:
        return { ...conflict, resolution: 'manual_required' };
    }
  }
}

// Type definitions for additional interfaces
interface AudioData {
  format: string;
  data: Buffer;
  duration: number;
  sampleRate?: number;
}

interface ImageData {
  format: string;
  data: Buffer;
  width: number;
  height: number;
  alt?: string;
}

interface FileData {
  name: string;
  type: string;
  data: Buffer;
  size: number;
}

interface ActionData {
  type: string;
  payload: any;
  target?: string;
}

interface CardData {
  title: string;
  content: string;
  image?: string;
  actions?: CardAction[];
}

interface CardAction {
  label: string;
  action: string;
  payload?: any;
}

interface MessageAttachment {
  type: string;
  data: any;
  metadata?: any;
}

interface StoryContext {
  storyId?: string;
  title?: string;
  type?: string;
  phase?: string;
}

interface CharacterContext {
  characterId?: string;
  name?: string;
  traits?: any;
}

interface EmotionalState {
  mood: string;
  confidence: number;
  timestamp: string;
}

interface InteractionSummary {
  timestamp: string;
  type: string;
  summary: string;
}

interface ConversationHistoryItem {
  timestamp: string;
  userMessage: UniversalMessage;
  botResponse: UniversalResponse;
}

interface DeviceInfo {
  type: string;
  os: string;
  version: string;
  capabilities?: string[];
}

interface NetworkInfo {
  type: string;
  quality: string;
  latency?: number;
}

interface RateLimitInfo {
  remaining: number;
  resetTime: string;
  limit: number;
}

interface UserPreferences {
  voice?: VoiceSettings;
  smartHome?: SmartHomePreferences;
  privacy?: PrivacySettings;
  accessibility?: AccessibilitySettings;
}

interface VoiceSettings {
  voice: string;
  speed: number;
  emotion: string;
  volume: number;
}

interface SmartHomePreferences {
  autoConnect: boolean;
  defaultRoom?: string;
  lightingIntensity: string;
  enableNarrativeSync: boolean;
}

interface PrivacySettings {
  dataRetentionPreference: string;
  analyticsOptOut: boolean;
  smartHomeDataSharing: boolean;
}

interface AccessibilitySettings {
  speechProcessingDelay: number;
  vocabularyLevel: string;
  visualIndicators: boolean;
  hapticFeedback: boolean;
}

interface SmartHomeAction {
  type: string;
  userId: string;
  deviceId?: string;
  roomId?: string;
  parameters?: any;
}