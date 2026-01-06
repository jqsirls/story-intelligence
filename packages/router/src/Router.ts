import { EventEmitter } from 'events';
import { Logger } from 'winston';
import {
  TurnContext,
  Intent,
  AgentResponse,
  CustomerResponse,
  MemoryState,
  ConversationPhase,
  IntentType,
  RouterConfig,
  RouterError,
  RouterErrorCode,
  ClassificationContext
} from './types';
import { IntentClassifier } from './services/IntentClassifier';
import { AgentDelegator } from './services/AgentDelegator';
import { ConversationStateManager } from './services/ConversationStateManager';
import { ConversationInterruptionHandler, InterruptionType } from './services/ConversationInterruptionHandler';

/**
 * Main Router class that orchestrates intent classification and agent delegation
 * Stateless function that interprets user intent, selects appropriate sub-agent, and aggregates responses
 */
export class Router extends EventEmitter {
  private intentClassifier: IntentClassifier;
  private agentDelegator: AgentDelegator;
  private stateManager: ConversationStateManager;
  private interruptionHandler: ConversationInterruptionHandler;
  private isInitialized = false;

  constructor(
    private config: RouterConfig,
    private logger: Logger
  ) {
    super();

    // Initialize services
    this.intentClassifier = new IntentClassifier(config.openai, logger);
    this.agentDelegator = new AgentDelegator(config, logger);
    this.stateManager = new ConversationStateManager(config.redis, logger);
    
    // Initialize interruption handler with configuration
    const interruptionConfig = {
      redis: {
        url: config.redis.url,
        keyPrefix: config.redis.keyPrefix,
        checkpointTtl: 86400, // 24 hours
        interruptionTtl: 3600, // 1 hour
      },
      supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
      },
      checkpointing: {
        enabled: true,
        autoCheckpointInterval: 300, // 5 minutes
        maxCheckpointsPerSession: 5,
        criticalPhases: [ConversationPhase.STORY_BUILDING, ConversationPhase.CHARACTER_CREATION],
      },
      recovery: {
        maxRecoveryAttempts: 3,
        recoveryTimeoutMs: 30000,
        gracefulRecoveryEnabled: true,
      },
      multiUser: {
        enabled: true,
        userSwitchTimeoutMs: 5000,
        maxConcurrentUsers: 4,
      },
    };
    this.interruptionHandler = new ConversationInterruptionHandler(interruptionConfig, logger);
  }

  /**
   * Initialize the router and all services
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Router...');

      // Initialize state manager
      await this.stateManager.initialize();
      
      // Initialize interruption handler
      await this.interruptionHandler.initialize();

      this.isInitialized = true;
      this.logger.info('Router initialized successfully');

      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Router', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Shutdown the router gracefully
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Router...');

      await this.stateManager.shutdown();
      await this.interruptionHandler.shutdown();

      this.isInitialized = false;
      this.logger.info('Router shutdown completed');

      this.emit('shutdown');
    } catch (error) {
      this.logger.error('Error during Router shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Main routing method - classify intent and delegate to appropriate agent
   */
  async route(turnContext: TurnContext): Promise<CustomerResponse> {
    this.ensureInitialized();

    const startTime = Date.now();

    try {
      this.logger.info('Processing turn context', {
        userId: turnContext.userId,
        sessionId: turnContext.sessionId,
        channel: turnContext.channel,
        userInput: turnContext.userInput.substring(0, 100),
      });

      // Get or create conversation state
      const memoryState = await this.stateManager.getOrCreateMemoryState(turnContext);

      // Build classification context
      const classificationContext = this.buildClassificationContext(memoryState, turnContext);

      // Classify intent
      const intent = await this.intentClassifier.classifyIntent(turnContext, classificationContext);

      // Check authentication if required
      if (intent.requiresAuth) {
        const authResult = await this.checkAuthentication(turnContext);
        if (!authResult.authenticated) {
          return this.createAuthenticationResponse(authResult.redirectUrl);
        }
      }

      // Update memory state with new intent
      await this.updateMemoryStateWithIntent(memoryState, intent, turnContext);

      // Delegate to appropriate agent
      const agentResponse = await this.agentDelegator.delegate(intent, turnContext, memoryState);

      // Update conversation phase if needed
      if (agentResponse.nextPhase) {
        await this.stateManager.updateConversationPhase(
          turnContext.userId,
          turnContext.sessionId,
          agentResponse.nextPhase
        );

        // Create checkpoint at critical phases
        if (this.isCriticalPhase(agentResponse.nextPhase)) {
          try {
            await this.createCheckpoint(
              turnContext.userId,
              turnContext.sessionId,
              turnContext.metadata?.deviceContext
            );
          } catch (error) {
            // Don't fail the main flow if checkpointing fails
            this.logger.warn('Failed to create automatic checkpoint', {
              error: error instanceof Error ? error.message : String(error),
              userId: turnContext.userId,
              sessionId: turnContext.sessionId,
              phase: agentResponse.nextPhase,
            });
          }
        }
      }

      // Handle follow-up if required
      if (agentResponse.requiresFollowup && agentResponse.followupAgent) {
        await this.handleFollowup(agentResponse, turnContext, memoryState);
      }

      // Assemble customer response
      const customerResponse = await this.assembleResponse(agentResponse, intent, memoryState);

      const processingTime = Date.now() - startTime;

      this.logger.info('Turn processing completed', {
        userId: turnContext.userId,
        sessionId: turnContext.sessionId,
        intentType: intent.type,
        targetAgent: intent.targetAgent,
        success: customerResponse.success,
        processingTime,
      });

      this.emit('turn_completed', {
        turnContext,
        intent,
        agentResponse,
        customerResponse,
        processingTime,
      });

      return customerResponse;

    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error('Turn processing failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: turnContext.userId,
        sessionId: turnContext.sessionId,
        processingTime,
      });

      this.emit('turn_failed', {
        turnContext,
        error,
        processingTime,
      });

      return this.createErrorResponse(error);
    }
  }

  /**
   * Get router health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    agents: Record<string, any>;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  }> {
    const agentHealth = this.agentDelegator.getAgentHealth();
    
    // Determine overall status
    const agentStates = Object.values(agentHealth);
    const openCircuitBreakers = agentStates.filter(state => state.isOpen).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (openCircuitBreakers === 0) {
      status = 'healthy';
    } else if (openCircuitBreakers < agentStates.length / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      agents: agentHealth,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Reset circuit breaker for an agent
   */
  resetAgentCircuitBreaker(agentName: string): void {
    this.agentDelegator.resetCircuitBreaker(agentName);
    this.logger.info('Circuit breaker reset', { agentName });
  }

  /**
   * Get conversation summary for a session
   */
  async getConversationSummary(userId: string, sessionId: string) {
    return this.stateManager.getConversationSummary(userId, sessionId);
  }

  /**
   * Handle conversation interruption
   */
  async handleInterruption(
    sessionId: string,
    userId: string,
    interruptionType: InterruptionType,
    contextSnapshot?: any,
    deviceContext?: {
      deviceId: string;
      deviceType: string;
      capabilities: string[];
    }
  ) {
    this.ensureInitialized();

    try {
      // Create checkpoint before handling interruption
      const memoryState = await this.stateManager.getMemoryState(userId, sessionId);
      if (memoryState) {
        await this.interruptionHandler.createCheckpoint(memoryState, deviceContext);
      }

      // Handle the interruption
      const interruption = await this.interruptionHandler.handleInterruption(
        sessionId,
        userId,
        interruptionType,
        contextSnapshot,
        deviceContext
      );

      this.emit('conversation_interrupted', {
        sessionId,
        userId,
        interruptionType,
        interruptionId: interruption.interruptionId,
      });

      return interruption;
    } catch (error) {
      this.logger.error('Failed to handle conversation interruption', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        userId,
        interruptionType,
      });
      throw error;
    }
  }

  /**
   * Recover from conversation interruption
   */
  async recoverFromInterruption(
    interruptionId: string,
    newTurnContext: TurnContext
  ): Promise<{
    success: boolean;
    customerResponse?: CustomerResponse;
    error?: string;
  }> {
    this.ensureInitialized();

    try {
      const recovery = await this.interruptionHandler.recoverFromInterruption(
        interruptionId,
        newTurnContext
      );

      if (!recovery.success) {
        return {
          success: false,
          error: recovery.error,
        };
      }

      // Update state manager with recovered memory state
      if (recovery.memoryState) {
        await this.stateManager.saveMemoryState(recovery.memoryState);
      }

      // Create a welcome back response with resumption prompt
      const customerResponse: CustomerResponse = {
        success: true,
        message: recovery.resumptionPrompt || 'Welcome back! Let\'s continue where we left off.',
        speechText: recovery.resumptionPrompt || 'Welcome back! Let\'s continue where we left off.',
        conversationPhase: recovery.memoryState?.conversationPhase || ConversationPhase.GREETING,
        nextExpectedInput: this.getNextExpectedInput(
          recovery.memoryState?.conversationPhase || ConversationPhase.GREETING,
          { type: IntentType.GREETING } as Intent
        ),
        shouldEndSession: false,
        metadata: {
          recoveredFromInterruption: true,
          interruptionId,
          recoveryTimestamp: new Date().toISOString(),
        },
      };

      this.emit('conversation_recovered', {
        interruptionId,
        sessionId: newTurnContext.sessionId,
        userId: newTurnContext.userId,
        recoverySuccess: true,
      });

      return {
        success: true,
        customerResponse,
      };
    } catch (error) {
      this.logger.error('Failed to recover from interruption', {
        error: error instanceof Error ? error.message : String(error),
        interruptionId,
        sessionId: newTurnContext.sessionId,
      });

      this.emit('conversation_recovered', {
        interruptionId,
        sessionId: newTurnContext.sessionId,
        userId: newTurnContext.userId,
        recoverySuccess: false,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: 'Failed to recover from interruption',
      };
    }
  }

  /**
   * Handle multi-user context separation
   */
  async separateUserContext(
    sessionId: string,
    primaryUserId: string,
    allUserIds: string[],
    userContexts: Record<string, {
      personalContext: any;
      storyPreferences: any;
      emotionalState: any;
    }>
  ) {
    this.ensureInitialized();

    try {
      await this.interruptionHandler.separateUserContext(
        sessionId,
        primaryUserId,
        allUserIds,
        userContexts
      );

      this.emit('user_context_separated', {
        sessionId,
        primaryUserId,
        totalUsers: allUserIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to separate user context', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        primaryUserId,
      });
      throw error;
    }
  }

  /**
   * Switch active user context on shared device
   */
  async switchUserContext(
    sessionId: string,
    fromUserId: string,
    toUserId: string
  ): Promise<{
    success: boolean;
    customerResponse?: CustomerResponse;
    error?: string;
  }> {
    this.ensureInitialized();

    try {
      // Get current memory state
      const currentMemoryState = await this.stateManager.getMemoryState(fromUserId, sessionId);
      if (!currentMemoryState) {
        return {
          success: false,
          error: 'Current user session not found',
        };
      }

      // Switch user context
      const switchResult = await this.interruptionHandler.switchUserContext(
        sessionId,
        fromUserId,
        toUserId,
        currentMemoryState
      );

      if (!switchResult.success) {
        return {
          success: false,
          error: switchResult.error,
        };
      }

      // Update state manager with new user's memory state
      if (switchResult.updatedMemoryState) {
        await this.stateManager.saveMemoryState(switchResult.updatedMemoryState);
      }

      // Create user switch response
      const customerResponse: CustomerResponse = {
        success: true,
        message: `Hi! I see someone new is here. Welcome to your storytelling space!`,
        speechText: `Hi! I see someone new is here. Welcome to your storytelling space!`,
        conversationPhase: switchResult.updatedMemoryState?.conversationPhase || ConversationPhase.GREETING,
        nextExpectedInput: this.getNextExpectedInput(
          switchResult.updatedMemoryState?.conversationPhase || ConversationPhase.GREETING,
          { type: IntentType.GREETING } as Intent
        ),
        shouldEndSession: false,
        metadata: {
          userContextSwitched: true,
          fromUserId,
          toUserId,
          interruptionId: switchResult.interruptionId,
          switchTimestamp: new Date().toISOString(),
        },
      };

      this.emit('user_context_switched', {
        sessionId,
        fromUserId,
        toUserId,
        interruptionId: switchResult.interruptionId,
      });

      return {
        success: true,
        customerResponse,
      };
    } catch (error) {
      this.logger.error('Failed to switch user context', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        fromUserId,
        toUserId,
      });

      return {
        success: false,
        error: 'Failed to switch user context',
      };
    }
  }

  /**
   * Create checkpoint at key narrative moments
   */
  async createCheckpoint(
    userId: string,
    sessionId: string,
    deviceContext?: {
      deviceId: string;
      deviceType: string;
      capabilities: string[];
    }
  ) {
    this.ensureInitialized();

    try {
      const memoryState = await this.stateManager.getMemoryState(userId, sessionId);
      if (!memoryState) {
        throw new RouterError(
          RouterErrorCode.INTERNAL_ERROR,
          'Memory state not found for checkpoint creation'
        );
      }

      const checkpoint = await this.interruptionHandler.createCheckpoint(memoryState, deviceContext);

      this.emit('checkpoint_created', {
        checkpointId: checkpoint.checkpointId,
        sessionId,
        userId,
        phase: checkpoint.conversationPhase,
      });

      return checkpoint;
    } catch (error) {
      this.logger.error('Failed to create checkpoint', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'Router not initialized. Call initialize() first.'
      );
    }
  }

  private buildClassificationContext(
    memoryState: MemoryState,
    turnContext: TurnContext
  ): ClassificationContext {
    return {
      previousIntents: [memoryState.lastIntent],
      conversationHistory: memoryState.context.conversationHistory || [],
      currentPhase: memoryState.conversationPhase,
      userProfile: memoryState.context.userProfile,
    };
  }

  private async updateMemoryStateWithIntent(
    memoryState: MemoryState,
    intent: Intent,
    turnContext: TurnContext
  ): Promise<void> {
    memoryState.lastIntent = intent.type;
    
    // Update conversation phase if specified
    if (intent.conversationPhase) {
      memoryState.conversationPhase = intent.conversationPhase;
    }

    // Update story and character IDs if present in intent parameters
    if (intent.parameters?.storyId) {
      memoryState.currentStoryId = intent.parameters.storyId;
    }
    
    if (intent.parameters?.characterId) {
      memoryState.currentCharacterId = intent.parameters.characterId;
    }

    // Add to conversation history
    if (!memoryState.context.conversationHistory) {
      memoryState.context.conversationHistory = [];
    }
    
    memoryState.context.conversationHistory.push(turnContext.userInput);
    
    // Keep only last 10 conversation turns
    if (memoryState.context.conversationHistory.length > 10) {
      memoryState.context.conversationHistory = memoryState.context.conversationHistory.slice(-10);
    }

    await this.stateManager.saveMemoryState(memoryState);
  }

  private async checkAuthentication(turnContext: TurnContext): Promise<{
    authenticated: boolean;
    redirectUrl?: string;
  }> {
    // In a real implementation, this would check JWT tokens or session state
    // For now, we'll assume authentication is handled by the auth agent
    
    // Check if user has valid session in memory state
    const memoryState = await this.stateManager.getMemoryState(
      turnContext.userId,
      turnContext.sessionId
    );

    const isAuthenticated = memoryState?.context.authenticated === true;

    return {
      authenticated: isAuthenticated,
      redirectUrl: isAuthenticated ? undefined : '/auth/link-account',
    };
  }

  private createAuthenticationResponse(redirectUrl?: string): CustomerResponse {
    return {
      success: false,
      message: 'Authentication required. Please link your account first.',
      speechText: 'I need you to link your account first. Please check your Alexa app.',
      conversationPhase: ConversationPhase.GREETING,
      shouldEndSession: true,
      error: 'Authentication required',
      metadata: {
        redirectUrl,
        requiresAuth: true,
      },
    };
  }

  private async handleFollowup(
    agentResponse: AgentResponse,
    turnContext: TurnContext,
    memoryState: MemoryState
  ): Promise<void> {
    // This would handle cases where multiple agents need to be called
    // For example, after creating a character, we might need to call the emotion agent
    this.logger.info('Handling followup', {
      followupAgent: agentResponse.followupAgent,
      userId: turnContext.userId,
      sessionId: turnContext.sessionId,
    });

    // Implementation would depend on specific followup requirements
  }

  private async assembleResponse(
    agentResponse: AgentResponse,
    intent: Intent,
    memoryState: MemoryState
  ): Promise<CustomerResponse> {
    const baseResponse: CustomerResponse = {
      success: agentResponse.success,
      message: this.extractMessage(agentResponse),
      conversationPhase: agentResponse.nextPhase || memoryState.conversationPhase,
      shouldEndSession: this.shouldEndSession(agentResponse, intent),
    };

    // Add speech text for voice channels
    if (agentResponse.data?.speechText) {
      baseResponse.speechText = agentResponse.data.speechText;
    } else {
      baseResponse.speechText = baseResponse.message;
    }

    // Add display text for screen channels
    if (agentResponse.data?.displayText) {
      baseResponse.displayText = agentResponse.data.displayText;
    }

    // Add visual elements for screen devices
    if (agentResponse.data?.visualElements) {
      baseResponse.visualElements = agentResponse.data.visualElements;
    }

    // Add audio URL if available
    if (agentResponse.data?.audioUrl) {
      baseResponse.audioUrl = agentResponse.data.audioUrl;
    }

    // Add next expected input hint
    baseResponse.nextExpectedInput = this.getNextExpectedInput(
      baseResponse.conversationPhase,
      intent
    );

    // Add error if present
    if (agentResponse.error) {
      baseResponse.error = agentResponse.error;
    }

    // Add metadata
    baseResponse.metadata = {
      ...agentResponse.metadata,
      intentType: intent.type,
      targetAgent: intent.targetAgent,
      confidence: intent.confidence,
    };

    return baseResponse;
  }

  private extractMessage(agentResponse: AgentResponse): string {
    if (agentResponse.data?.message) {
      return agentResponse.data.message;
    }

    if (agentResponse.success) {
      return 'Request processed successfully.';
    }

    return agentResponse.error || 'Something went wrong. Please try again.';
  }

  private shouldEndSession(agentResponse: AgentResponse, intent: Intent): boolean {
    // End session for goodbye intents or completion phase
    if (intent.type === IntentType.GOODBYE) {
      return true;
    }

    if (agentResponse.nextPhase === ConversationPhase.COMPLETION) {
      return true;
    }

    // End session on critical errors
    if (!agentResponse.success && agentResponse.error?.includes('critical')) {
      return true;
    }

    return false;
  }

  private getNextExpectedInput(phase: ConversationPhase, intent: Intent): string {
    switch (phase) {
      case ConversationPhase.GREETING:
        return "Tell me what kind of story you'd like to create!";
      
      case ConversationPhase.EMOTION_CHECK:
        return "How are you feeling today?";
      
      case ConversationPhase.CHARACTER_CREATION:
        return "Tell me about your character - what's their name?";
      
      case ConversationPhase.STORY_BUILDING:
        return "What should happen next in your story?";
      
      case ConversationPhase.STORY_EDITING:
        return "What would you like to change about your story?";
      
      case ConversationPhase.ASSET_GENERATION:
        return "Should I create the pictures and audio for your story?";
      
      case ConversationPhase.COMPLETION:
        return "Would you like to create another story?";
      
      default:
        return "What would you like to do next?";
    }
  }

  private isCriticalPhase(phase: ConversationPhase): boolean {
    const criticalPhases = [
      ConversationPhase.CHARACTER_CREATION,
      ConversationPhase.STORY_BUILDING,
      ConversationPhase.STORY_EDITING,
      ConversationPhase.ASSET_GENERATION,
    ];
    return criticalPhases.includes(phase);
  }

  private createErrorResponse(error: any): CustomerResponse {
    let message = 'I encountered an error. Please try again.';
    let shouldEndSession = false;

    if (error instanceof RouterError) {
      switch (error.code) {
        case RouterErrorCode.AUTHENTICATION_REQUIRED:
          message = 'Please link your account first to continue.';
          shouldEndSession = true;
          break;
        
        case RouterErrorCode.CIRCUIT_BREAKER_OPEN:
          message = 'The service is temporarily unavailable. Please try again in a moment.';
          break;
        
        case RouterErrorCode.TIMEOUT:
          message = 'The request took too long. Please try again.';
          break;
        
        case RouterErrorCode.RATE_LIMITED:
          message = 'You\'re making requests too quickly. Please wait a moment and try again.';
          break;
        
        default:
          message = error.message || message;
      }
    }

    return {
      success: false,
      message,
      speechText: message,
      conversationPhase: ConversationPhase.GREETING,
      shouldEndSession,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        errorCode: error instanceof RouterError ? error.code : 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
      },
    };
  }
}