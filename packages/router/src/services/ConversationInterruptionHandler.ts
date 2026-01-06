import { Logger } from 'winston';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import {
  MemoryState,
  ConversationPhase,
  IntentType,
  TurnContext,
  RouterError,
  RouterErrorCode,
  StoryType
} from '../types';

/**
 * Interruption types that can occur during conversation
 */
export enum InterruptionType {
  USER_STOP = 'user_stop',           // User explicitly stops conversation
  SYSTEM_ERROR = 'system_error',     // System error interrupts conversation
  TIMEOUT = 'timeout',               // Session timeout
  DEVICE_SWITCH = 'device_switch',   // User switches to different device
  NETWORK_LOSS = 'network_loss',     // Network connectivity lost
  EXTERNAL_INTERRUPT = 'external_interrupt', // External system interruption
  MULTI_USER_SWITCH = 'multi_user_switch'    // Different user takes over on shared device
}

/**
 * Checkpoint data structure for story state preservation
 */
export interface StoryCheckpoint {
  checkpointId: string;
  sessionId: string;
  userId: string;
  timestamp: Date;
  conversationPhase: ConversationPhase;
  storyState: {
    storyId?: string;
    characterId?: string;
    storyType?: StoryType;
    currentBeat?: number;
    storyOutline?: any;
    characterDetails?: Record<string, any>;
    narrativeChoices?: Array<{
      choice: string;
      timestamp: Date;
      impact: string;
    }>;
    plotPoints?: Array<{
      type: 'setup' | 'inciting_incident' | 'rising_action' | 'climax' | 'resolution';
      content: string;
      timestamp: Date;
    }>;
    lastCompleteAction: string;
    pendingActions: string[];
  };
  conversationContext: {
    lastUserInput: string;
    lastAgentResponse: string;
    lastIntent: IntentType;
    conversationHistory: Array<{
      timestamp: Date;
      userInput: string;
      agentResponse: string;
      intent: IntentType;
      phase: ConversationPhase;
    }>;
  };
  deviceContext?: {
    deviceId: string;
    deviceType: string;
    capabilities: string[];
  };
  userContext: {
    primaryUserId: string;
    activeUsers: string[];
    userSeparation?: Record<string, {
      personalContext: any;
      storyPreferences: any;
      emotionalState: any;
    }>;
  };
}

/**
 * Interruption state tracking
 */
export interface InterruptionState {
  interruptionId: string;
  sessionId: string;
  userId: string;
  interruptionType: InterruptionType;
  timestamp: Date;
  checkpointId: string;
  resumptionPrompt: string;
  contextSnapshot: any;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  isRecovered: boolean;
  recoveredAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Configuration for interruption handling
 */
export interface InterruptionHandlerConfig {
  redis: {
    url: string;
    keyPrefix: string;
    checkpointTtl: number;
    interruptionTtl: number;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  checkpointing: {
    enabled: boolean;
    autoCheckpointInterval: number; // seconds
    maxCheckpointsPerSession: number;
    criticalPhases: ConversationPhase[];
  };
  recovery: {
    maxRecoveryAttempts: number;
    recoveryTimeoutMs: number;
    gracefulRecoveryEnabled: boolean;
  };
  multiUser: {
    enabled: boolean;
    userSwitchTimeoutMs: number;
    maxConcurrentUsers: number;
  };
}

/**
 * Conversation interruption handler with graceful recovery and multi-user support
 */
export class ConversationInterruptionHandler {
  private redis: RedisClientType;
  private supabase: SupabaseClient;
  private isInitialized = false;
  private checkpointInterval?: NodeJS.Timeout;

  constructor(
    private config: InterruptionHandlerConfig,
    private logger: Logger
  ) {
    this.redis = createRedisClient({ url: config.redis.url });
    this.supabase = createClient(config.supabase.url, config.supabase.anonKey);
  }

  /**
   * Initialize the interruption handler
   */
  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      this.isInitialized = true;
      
      if (this.config.checkpointing.enabled) {
        this.startAutoCheckpointing();
      }
      
      this.logger.info('ConversationInterruptionHandler initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ConversationInterruptionHandler', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Shutdown the interruption handler
   */
  async shutdown(): Promise<void> {
    try {
      if (this.checkpointInterval) {
        clearInterval(this.checkpointInterval);
      }
      
      await this.redis.disconnect();
      this.isInitialized = false;
      this.logger.info('ConversationInterruptionHandler shutdown completed');
    } catch (error) {
      this.logger.error('Error during ConversationInterruptionHandler shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create a story state checkpoint at key narrative moments
   */
  async createCheckpoint(
    memoryState: MemoryState,
    deviceContext?: {
      deviceId: string;
      deviceType: string;
      capabilities: string[];
    }
  ): Promise<StoryCheckpoint> {
    this.ensureInitialized();

    const checkpointId = `checkpoint_${memoryState.sessionId}_${Date.now()}`;
    const checkpoint: StoryCheckpoint = {
      checkpointId,
      sessionId: memoryState.sessionId,
      userId: memoryState.userId,
      timestamp: new Date(),
      conversationPhase: memoryState.conversationPhase,
      storyState: {
        storyId: memoryState.currentStoryId,
        characterId: memoryState.currentCharacterId,
        storyType: memoryState.storyType,
        currentBeat: memoryState.context.currentBeat,
        storyOutline: memoryState.context.storyOutline,
        characterDetails: memoryState.context.characterDetails,
        narrativeChoices: memoryState.context.narrativeChoices || [],
        plotPoints: memoryState.context.plotPoints || [],
        lastCompleteAction: this.determineLastCompleteAction(memoryState),
        pendingActions: this.determinePendingActions(memoryState),
      },
      conversationContext: {
        lastUserInput: memoryState.context.lastUserInput || '',
        lastAgentResponse: memoryState.context.lastAgentResponse || '',
        lastIntent: memoryState.lastIntent,
        conversationHistory: memoryState.context.conversationHistory || [],
      },
      deviceContext,
      userContext: {
        primaryUserId: memoryState.userId,
        activeUsers: memoryState.context.activeUsers || [memoryState.userId],
        userSeparation: memoryState.context.userSeparation,
      },
    };

    try {
      // Store checkpoint in Redis
      const key = this.getCheckpointKey(checkpointId);
      await this.redis.setEx(
        key,
        this.config.redis.checkpointTtl,
        JSON.stringify(checkpoint)
      );

      // Also persist critical checkpoints to Supabase
      if (this.isCriticalPhase(memoryState.conversationPhase)) {
        await this.persistCheckpointToSupabase(checkpoint);
      }

      // Clean up old checkpoints for this session
      await this.cleanupOldCheckpoints(memoryState.sessionId);

      this.logger.info('Story checkpoint created', {
        checkpointId,
        sessionId: memoryState.sessionId,
        userId: memoryState.userId,
        phase: memoryState.conversationPhase,
        isCritical: this.isCriticalPhase(memoryState.conversationPhase),
      });

      return checkpoint;
    } catch (error) {
      this.logger.error('Failed to create checkpoint', {
        error: error instanceof Error ? error.message : String(error),
        checkpointId,
        sessionId: memoryState.sessionId,
      });
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'Failed to create story checkpoint'
      );
    }
  }

  /**
   * Handle conversation interruption with graceful recovery
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
  ): Promise<InterruptionState> {
    this.ensureInitialized();

    const interruptionId = `interruption_${sessionId}_${Date.now()}`;
    
    try {
      // Get the most recent checkpoint for this session
      const checkpoint = await this.getLatestCheckpoint(sessionId);
      if (!checkpoint) {
        throw new RouterError(
          RouterErrorCode.INTERNAL_ERROR,
          'No checkpoint found for interrupted session'
        );
      }

      // Generate resumption prompt based on interruption context
      const resumptionPrompt = this.generateResumptionPrompt(
        checkpoint,
        interruptionType,
        contextSnapshot
      );

      const interruption: InterruptionState = {
        interruptionId,
        sessionId,
        userId,
        interruptionType,
        timestamp: new Date(),
        checkpointId: checkpoint.checkpointId,
        resumptionPrompt,
        contextSnapshot: contextSnapshot || {},
        recoveryAttempts: 0,
        maxRecoveryAttempts: this.config.recovery.maxRecoveryAttempts,
        isRecovered: false,
        metadata: {
          deviceContext,
          originalPhase: checkpoint.conversationPhase,
          lastCompleteAction: checkpoint.storyState.lastCompleteAction,
        },
      };

      // Store interruption state
      const key = this.getInterruptionKey(interruptionId);
      await this.redis.setEx(
        key,
        this.config.redis.interruptionTtl,
        JSON.stringify(interruption)
      );

      this.logger.info('Conversation interruption handled', {
        interruptionId,
        sessionId,
        userId,
        interruptionType,
        checkpointId: checkpoint.checkpointId,
        phase: checkpoint.conversationPhase,
      });

      return interruption;
    } catch (error) {
      this.logger.error('Failed to handle interruption', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        userId,
        interruptionType,
      });
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'Failed to handle conversation interruption'
      );
    }
  }

  /**
   * Attempt to recover from interruption
   */
  async recoverFromInterruption(
    interruptionId: string,
    newTurnContext: TurnContext
  ): Promise<{
    success: boolean;
    memoryState?: MemoryState;
    resumptionPrompt?: string;
    error?: string;
  }> {
    this.ensureInitialized();

    try {
      // Get interruption state
      const interruption = await this.getInterruptionState(interruptionId);
      if (!interruption) {
        return {
          success: false,
          error: 'Interruption state not found',
        };
      }

      if (interruption.isRecovered) {
        return {
          success: false,
          error: 'Interruption already recovered',
        };
      }

      if (interruption.recoveryAttempts >= interruption.maxRecoveryAttempts) {
        return {
          success: false,
          error: 'Maximum recovery attempts exceeded',
        };
      }

      // Get checkpoint data
      const checkpoint = await this.getCheckpoint(interruption.checkpointId);
      if (!checkpoint) {
        return {
          success: false,
          error: 'Checkpoint data not found',
        };
      }

      // Reconstruct memory state from checkpoint
      const recoveredMemoryState = await this.reconstructMemoryStateFromCheckpoint(
        checkpoint,
        newTurnContext
      );

      // Update interruption state
      interruption.recoveryAttempts++;
      interruption.isRecovered = true;
      interruption.recoveredAt = new Date();

      const key = this.getInterruptionKey(interruptionId);
      await this.redis.setEx(
        key,
        this.config.redis.interruptionTtl,
        JSON.stringify(interruption)
      );

      this.logger.info('Successfully recovered from interruption', {
        interruptionId,
        sessionId: interruption.sessionId,
        userId: interruption.userId,
        interruptionType: interruption.interruptionType,
        recoveryAttempts: interruption.recoveryAttempts,
        timeSinceInterruption: Date.now() - interruption.timestamp.getTime(),
      });

      return {
        success: true,
        memoryState: recoveredMemoryState,
        resumptionPrompt: interruption.resumptionPrompt,
      };
    } catch (error) {
      this.logger.error('Failed to recover from interruption', {
        error: error instanceof Error ? error.message : String(error),
        interruptionId,
      });
      return {
        success: false,
        error: 'Recovery failed due to system error',
      };
    }
  }

  /**
   * Handle multi-user context separation on shared devices
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
  ): Promise<void> {
    this.ensureInitialized();

    if (!this.config.multiUser.enabled) {
      this.logger.warn('Multi-user support is disabled');
      return;
    }

    if (allUserIds.length > this.config.multiUser.maxConcurrentUsers) {
      throw new RouterError(
        RouterErrorCode.INVALID_INPUT,
        `Too many concurrent users. Maximum allowed: ${this.config.multiUser.maxConcurrentUsers}`
      );
    }

    try {
      const separationData = {
        sessionId,
        primaryUserId,
        allUserIds,
        userContexts,
        timestamp: new Date(),
        separationId: `separation_${sessionId}_${Date.now()}`,
      };

      const key = this.getUserSeparationKey(sessionId);
      await this.redis.setEx(
        key,
        this.config.redis.interruptionTtl,
        JSON.stringify(separationData)
      );

      this.logger.info('User context separated', {
        sessionId,
        primaryUserId,
        totalUsers: allUserIds.length,
        separationId: separationData.separationId,
      });
    } catch (error) {
      this.logger.error('Failed to separate user context', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        primaryUserId,
      });
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'Failed to separate user context'
      );
    }
  }

  /**
   * Switch active user context on shared device
   */
  async switchUserContext(
    sessionId: string,
    fromUserId: string,
    toUserId: string,
    currentMemoryState: MemoryState
  ): Promise<{
    success: boolean;
    updatedMemoryState?: MemoryState;
    interruptionId?: string;
    error?: string;
  }> {
    this.ensureInitialized();

    if (!this.config.multiUser.enabled) {
      return {
        success: false,
        error: 'Multi-user support is disabled',
      };
    }

    try {
      // Create checkpoint for current user's state
      const checkpoint = await this.createCheckpoint(currentMemoryState);

      // Handle user switch as a special type of interruption
      const interruption = await this.handleInterruption(
        sessionId,
        fromUserId,
        InterruptionType.MULTI_USER_SWITCH,
        {
          fromUserId,
          toUserId,
          switchTimestamp: new Date(),
        }
      );

      // Get user separation data
      const separationData = await this.getUserSeparation(sessionId);
      if (!separationData) {
        return {
          success: false,
          error: 'User separation data not found',
        };
      }

      // Update memory state for new user
      const updatedMemoryState = { ...currentMemoryState };
      
      // Save current user's context
      if (!updatedMemoryState.context.userSeparation) {
        updatedMemoryState.context.userSeparation = {};
      }
      
      updatedMemoryState.context.userSeparation[fromUserId] = {
        personalContext: {
          conversationPhase: currentMemoryState.conversationPhase,
          currentStoryId: currentMemoryState.currentStoryId,
          currentCharacterId: currentMemoryState.currentCharacterId,
          storyType: currentMemoryState.storyType,
          lastIntent: currentMemoryState.lastIntent,
        },
        storyPreferences: currentMemoryState.context.storyPreferences || {},
        emotionalState: currentMemoryState.context.emotionalState || {},
      };

      // Load new user's context
      const newUserContext = separationData.userContexts[toUserId];
      if (newUserContext) {
        updatedMemoryState.conversationPhase = newUserContext.personalContext.conversationPhase || ConversationPhase.GREETING;
        updatedMemoryState.currentStoryId = newUserContext.personalContext.currentStoryId;
        updatedMemoryState.currentCharacterId = newUserContext.personalContext.currentCharacterId;
        updatedMemoryState.storyType = newUserContext.personalContext.storyType;
        updatedMemoryState.lastIntent = newUserContext.personalContext.lastIntent || IntentType.GREETING;
        updatedMemoryState.context.storyPreferences = newUserContext.storyPreferences;
        updatedMemoryState.context.emotionalState = newUserContext.emotionalState;
      } else {
        // New user - reset to greeting phase
        updatedMemoryState.conversationPhase = ConversationPhase.GREETING;
        updatedMemoryState.currentStoryId = undefined;
        updatedMemoryState.currentCharacterId = undefined;
        updatedMemoryState.storyType = undefined;
        updatedMemoryState.lastIntent = IntentType.GREETING;
        updatedMemoryState.context.storyPreferences = {};
        updatedMemoryState.context.emotionalState = {};
      }

      // Update user ID and active users
      updatedMemoryState.userId = toUserId;
      updatedMemoryState.context.activeUsers = separationData.allUserIds;
      updatedMemoryState.context.primaryUserId = toUserId;
      updatedMemoryState.updatedAt = new Date();

      this.logger.info('User context switched successfully', {
        sessionId,
        fromUserId,
        toUserId,
        interruptionId: interruption.interruptionId,
        newPhase: updatedMemoryState.conversationPhase,
      });

      return {
        success: true,
        updatedMemoryState,
        interruptionId: interruption.interruptionId,
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
   * Generate contextual resumption prompts based on interruption type and conversation state
   */
  private generateResumptionPrompt(
    checkpoint: StoryCheckpoint,
    interruptionType: InterruptionType,
    contextSnapshot?: any
  ): string {
    const timeSinceCheckpoint = Date.now() - checkpoint.timestamp.getTime();
    const hoursAgo = Math.floor(timeSinceCheckpoint / (1000 * 60 * 60));
    
    let timeReference = '';
    if (hoursAgo < 1) {
      timeReference = 'a few minutes ago';
    } else if (hoursAgo < 24) {
      timeReference = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
    } else {
      const daysAgo = Math.floor(hoursAgo / 24);
      timeReference = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
    }

    // Base prompt based on conversation phase
    let basePrompt = '';
    switch (checkpoint.conversationPhase) {
      case ConversationPhase.CHARACTER_CREATION:
        if (checkpoint.storyState.characterDetails?.name) {
          const characterName = checkpoint.storyState.characterDetails.name;
          basePrompt = `Welcome back! ${timeReference} we were creating ${characterName}. Should we continue working on their details, or would you like to start the story?`;
        } else {
          basePrompt = `Hi again! ${timeReference} we were creating a character for your story. Would you like to continue where we left off?`;
        }
        break;

      case ConversationPhase.STORY_BUILDING:
        if (checkpoint.storyState.currentBeat && checkpoint.storyState.storyOutline) {
          basePrompt = `Welcome back to your story! ${timeReference} we were at an exciting part where your character was making an important choice. Should we continue the adventure?`;
        } else {
          basePrompt = `Hi! ${timeReference} we were building your story together. Would you like to continue where we left off?`;
        }
        break;

      case ConversationPhase.STORY_EDITING:
        basePrompt = `Welcome back! ${timeReference} we were making some changes to your story. Would you like to continue editing, or are you happy with how it is?`;
        break;

      case ConversationPhase.ASSET_GENERATION:
        basePrompt = `Hi there! ${timeReference} we were creating the pictures and audio for your story. Everything should be ready now! Would you like to see your completed story?`;
        break;

      default:
        basePrompt = `Hi there! ${timeReference} we were working on your story together. Would you like to continue where we left off?`;
    }

    // Modify prompt based on interruption type
    switch (interruptionType) {
      case InterruptionType.DEVICE_SWITCH:
        return `${basePrompt} I see you're on a different device now - that's perfectly fine! Everything is saved and ready to continue.`;

      case InterruptionType.NETWORK_LOSS:
        return `${basePrompt} I noticed we lost connection for a bit, but don't worry - I saved everything! We can pick up right where we left off.`;

      case InterruptionType.SYSTEM_ERROR:
        return `${basePrompt} Sorry about the technical hiccup earlier! Everything is working perfectly now, and I've saved all our progress.`;

      case InterruptionType.TIMEOUT:
        return `${basePrompt} I was waiting for you and thought you might have gotten busy with something else. No worries at all!`;

      case InterruptionType.MULTI_USER_SWITCH:
        const fromUser = contextSnapshot?.fromUserId;
        const toUser = contextSnapshot?.toUserId;
        if (fromUser && toUser) {
          return `Hi! I see someone new is here. ${basePrompt.replace('Welcome back!', 'Welcome!')} Each person can have their own stories, so this is your space to create!`;
        }
        return basePrompt.replace('Welcome back!', 'Welcome!');

      case InterruptionType.USER_STOP:
        return `${basePrompt} You stopped our conversation earlier, which is totally fine! Ready to continue?`;

      default:
        return basePrompt;
    }
  }

  /**
   * Private helper methods
   */

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'ConversationInterruptionHandler not initialized'
      );
    }
  }

  private getCheckpointKey(checkpointId: string): string {
    return `${this.config.redis.keyPrefix}:checkpoint:${checkpointId}`;
  }

  private getInterruptionKey(interruptionId: string): string {
    return `${this.config.redis.keyPrefix}:interruption:${interruptionId}`;
  }

  private getUserSeparationKey(sessionId: string): string {
    return `${this.config.redis.keyPrefix}:user_separation:${sessionId}`;
  }

  private async getCheckpoint(checkpointId: string): Promise<StoryCheckpoint | null> {
    try {
      const key = this.getCheckpointKey(checkpointId);
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }

      const checkpoint = JSON.parse(data) as StoryCheckpoint;
      checkpoint.timestamp = new Date(checkpoint.timestamp);
      
      return checkpoint;
    } catch (error) {
      this.logger.error('Failed to get checkpoint', {
        error: error instanceof Error ? error.message : String(error),
        checkpointId,
      });
      return null;
    }
  }

  private async getLatestCheckpoint(sessionId: string): Promise<StoryCheckpoint | null> {
    try {
      const pattern = `${this.config.redis.keyPrefix}:checkpoint:checkpoint_${sessionId}_*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return null;
      }

      // Sort keys by timestamp (embedded in checkpoint ID)
      keys.sort((a, b) => {
        const timestampA = parseInt(a.split('_').pop() || '0');
        const timestampB = parseInt(b.split('_').pop() || '0');
        return timestampB - timestampA; // Most recent first
      });

      const latestKey = keys[0];
      const data = await this.redis.get(latestKey);
      
      if (!data) {
        return null;
      }

      const checkpoint = JSON.parse(data) as StoryCheckpoint;
      checkpoint.timestamp = new Date(checkpoint.timestamp);
      
      return checkpoint;
    } catch (error) {
      this.logger.error('Failed to get latest checkpoint', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      return null;
    }
  }

  private async getInterruptionState(interruptionId: string): Promise<InterruptionState | null> {
    try {
      const key = this.getInterruptionKey(interruptionId);
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }

      const interruption = JSON.parse(data) as InterruptionState;
      interruption.timestamp = new Date(interruption.timestamp);
      if (interruption.recoveredAt) {
        interruption.recoveredAt = new Date(interruption.recoveredAt);
      }
      
      return interruption;
    } catch (error) {
      this.logger.error('Failed to get interruption state', {
        error: error instanceof Error ? error.message : String(error),
        interruptionId,
      });
      return null;
    }
  }

  private async getUserSeparation(sessionId: string): Promise<any | null> {
    try {
      const key = this.getUserSeparationKey(sessionId);
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }

      const separation = JSON.parse(data);
      separation.timestamp = new Date(separation.timestamp);
      
      return separation;
    } catch (error) {
      this.logger.error('Failed to get user separation', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      return null;
    }
  }

  private async reconstructMemoryStateFromCheckpoint(
    checkpoint: StoryCheckpoint,
    newTurnContext: TurnContext
  ): Promise<MemoryState> {
    const now = new Date();
    
    const memoryState: MemoryState = {
      userId: newTurnContext.userId,
      sessionId: newTurnContext.sessionId,
      conversationPhase: checkpoint.conversationPhase,
      currentStoryId: checkpoint.storyState.storyId,
      currentCharacterId: checkpoint.storyState.characterId,
      storyType: checkpoint.storyState.storyType,
      lastIntent: checkpoint.conversationContext.lastIntent,
      context: {
        // Restore story state
        currentBeat: checkpoint.storyState.currentBeat,
        storyOutline: checkpoint.storyState.storyOutline,
        characterDetails: checkpoint.storyState.characterDetails,
        narrativeChoices: checkpoint.storyState.narrativeChoices,
        plotPoints: checkpoint.storyState.plotPoints,
        
        // Restore conversation context
        lastUserInput: checkpoint.conversationContext.lastUserInput,
        lastAgentResponse: checkpoint.conversationContext.lastAgentResponse,
        conversationHistory: checkpoint.conversationContext.conversationHistory,
        
        // Restore user context
        activeUsers: checkpoint.userContext.activeUsers,
        primaryUserId: checkpoint.userContext.primaryUserId,
        userSeparation: checkpoint.userContext.userSeparation,
        
        // Add recovery metadata
        recoveredFromCheckpoint: true,
        checkpointId: checkpoint.checkpointId,
        recoveryTimestamp: now,
      },
      createdAt: checkpoint.timestamp,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 3600 * 1000), // 1 hour from now
    };

    return memoryState;
  }

  private determineLastCompleteAction(memoryState: MemoryState): string {
    switch (memoryState.conversationPhase) {
      case ConversationPhase.CHARACTER_CREATION:
        return memoryState.context.characterDetails ? 'character_details_collected' : 'character_creation_started';
      case ConversationPhase.STORY_BUILDING:
        return memoryState.context.currentBeat ? `story_beat_${memoryState.context.currentBeat}_completed` : 'story_building_started';
      case ConversationPhase.STORY_EDITING:
        return 'story_editing_in_progress';
      case ConversationPhase.ASSET_GENERATION:
        return 'asset_generation_in_progress';
      default:
        return `${memoryState.conversationPhase}_active`;
    }
  }

  private determinePendingActions(memoryState: MemoryState): string[] {
    const pending: string[] = [];

    switch (memoryState.conversationPhase) {
      case ConversationPhase.CHARACTER_CREATION:
        if (!memoryState.context.characterDetails?.name) pending.push('collect_character_name');
        if (!memoryState.context.characterDetails?.appearance) pending.push('collect_character_appearance');
        if (!memoryState.context.characterDetails?.personality) pending.push('collect_character_personality');
        break;
      
      case ConversationPhase.STORY_BUILDING:
        if (!memoryState.context.storyOutline) pending.push('create_story_outline');
        if (memoryState.context.currentBeat === undefined) pending.push('start_story_narration');
        break;
      
      case ConversationPhase.ASSET_GENERATION:
        pending.push('complete_asset_generation');
        break;
    }

    return pending;
  }

  private isCriticalPhase(phase: ConversationPhase): boolean {
    return this.config.checkpointing.criticalPhases.includes(phase);
  }

  private async cleanupOldCheckpoints(sessionId: string): Promise<void> {
    try {
      const pattern = `${this.config.redis.keyPrefix}:checkpoint:checkpoint_${sessionId}_*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length <= this.config.checkpointing.maxCheckpointsPerSession) {
        return;
      }

      // Sort keys by timestamp and keep only the most recent ones
      keys.sort((a, b) => {
        const timestampA = parseInt(a.split('_').pop() || '0');
        const timestampB = parseInt(b.split('_').pop() || '0');
        return timestampB - timestampA;
      });

      const keysToDelete = keys.slice(this.config.checkpointing.maxCheckpointsPerSession);
      
      if (keysToDelete.length > 0) {
        await this.redis.del(keysToDelete);
        this.logger.debug('Cleaned up old checkpoints', {
          sessionId,
          deletedCount: keysToDelete.length,
          remainingCount: this.config.checkpointing.maxCheckpointsPerSession,
        });
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup old checkpoints', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
    }
  }

  private async persistCheckpointToSupabase(checkpoint: StoryCheckpoint): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('conversation_checkpoints')
        .upsert({
          checkpoint_id: checkpoint.checkpointId,
          session_id: checkpoint.sessionId,
          user_id: checkpoint.userId,
          conversation_phase: checkpoint.conversationPhase,
          story_state: checkpoint.storyState,
          conversation_context: checkpoint.conversationContext,
          device_context: checkpoint.deviceContext,
          user_context: checkpoint.userContext,
          created_at: checkpoint.timestamp.toISOString(),
        });

      if (error) {
        throw error;
      }

      this.logger.debug('Checkpoint persisted to Supabase', {
        checkpointId: checkpoint.checkpointId,
        sessionId: checkpoint.sessionId,
      });
    } catch (error) {
      this.logger.warn('Failed to persist checkpoint to Supabase', {
        error: error instanceof Error ? error.message : String(error),
        checkpointId: checkpoint.checkpointId,
      });
      // Don't throw - this is not critical for operation
    }
  }

  private startAutoCheckpointing(): void {
    this.checkpointInterval = setInterval(async () => {
      try {
        // This would be called by the main conversation system
        // when it detects that auto-checkpointing is needed
        this.logger.debug('Auto-checkpoint interval triggered');
      } catch (error) {
        this.logger.error('Auto-checkpoint failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, this.config.checkpointing.autoCheckpointInterval * 1000);
  }
}