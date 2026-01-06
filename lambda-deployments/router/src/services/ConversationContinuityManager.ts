import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import { Logger } from 'winston';
import { createCipher, createDecipher, randomBytes } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import {
  MemoryState,
  ConversationPhase,
  IntentType,
  TurnContext,
  RouterError,
  RouterErrorCode,
  StoryType
} from '../types';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Enhanced conversation context for multi-session continuity
 */
export interface EnhancedConversationContext extends MemoryState {
  // Multi-session tracking
  parentSessionId?: string;
  metadata?: Record<string, any>;
  sessionChain: string[];
  deviceHistory: Array<{
    deviceId: string;
    deviceType: string;
    sessionId: string;
    timestamp: Date;
  }>;
  
  // Story state reconstruction
  storyState: {
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
  };
  
  // Conversation history with compression
  conversationHistory: Array<{
    timestamp: Date;
    userInput: string;
    agentResponse: string;
    intent: IntentType;
    phase: ConversationPhase;
    compressed?: boolean;
  }>;
  
  // Interruption handling
  interruptionState?: {
    timestamp: Date;
    lastCompleteAction: string;
    pendingActions: string[];
    resumptionPrompt: string;
    contextSnapshot: any;
  };
  
  // Multi-user context separation
  userContext: {
    primaryUserId: string;
    activeUsers: string[];
    userSeparation: Record<string, {
      personalContext: any;
      storyPreferences: any;
      emotionalState: any;
    }>;
  };
  
  // Encryption metadata
  encryptionMetadata?: {
    algorithm: string;
    keyId: string;
    iv: string;
  };
}

/**
 * Configuration for conversation continuity
 */
export interface ContinuityConfig {
  redis: {
    url: string;
    keyPrefix: string;
    defaultTtl: number;
    maxHistoryLength: number;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  encryption: {
    algorithm: string;
    keyRotationInterval: number;
    encryptionKeys: Record<string, string>;
  };
  compression: {
    enabled: boolean;
    threshold: number; // Compress if context size exceeds this
    level: number; // Compression level 1-9
  };
  cleanup: {
    expiredSessionCleanupInterval: number;
    maxSessionChainLength: number;
    historyRetentionDays: number;
  };
}

/**
 * Advanced conversation continuity manager with multi-session support,
 * smart resumption, encryption, and compression
 */
export class ConversationContinuityManager {
  private redis: RedisClientType;
  private supabase: SupabaseClient;
  private isInitialized = false;
  private cleanupInterval?: NodeJS.Timeout;
  private encryptionKeys: Map<string, Buffer> = new Map();

  constructor(
    private config: ContinuityConfig,
    private logger: Logger
  ) {
    this.redis = createRedisClient({ url: config.redis.url });
    this.supabase = createClient(config.supabase.url, config.supabase.anonKey);
    this.initializeEncryptionKeys();
  }

  /**
   * Initialize the conversation continuity manager
   */
  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      this.isInitialized = true;
      this.logger.info('ConversationContinuityManager initialized successfully');

      // Start cleanup task
      this.startCleanupTask();

    } catch (error) {
      this.logger.error('Failed to initialize ConversationContinuityManager', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Shutdown the conversation continuity manager
   */
  async shutdown(): Promise<void> {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      await this.cleanupExpiredSessions();
      await this.redis.disconnect();
      this.isInitialized = false;
      this.logger.info('ConversationContinuityManager shutdown completed');
    } catch (error) {
      this.logger.error('Error during ConversationContinuityManager shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create or resume conversation context with smart state reconstruction
   */
  async getOrCreateContext(
    turnContext: TurnContext,
    deviceInfo?: {
      deviceId: string;
      deviceType: string;
      capabilities: string[];
    }
  ): Promise<EnhancedConversationContext> {
    this.ensureInitialized();

    try {
      // Try to get existing context
      let context = await this.getContext(turnContext.sessionId);
      
      if (!context) {
        // Check for related sessions from the same user
        const relatedSessions = await this.findRelatedSessions(turnContext.userId);
        
        if (relatedSessions.length > 0) {
          // Smart resumption: reconstruct context from most recent related session
          context = await this.reconstructContextFromRelatedSession(
            turnContext,
            relatedSessions[0],
            deviceInfo
          );
        } else {
          // Create new context
          context = await this.createNewContext(turnContext, deviceInfo);
        }
      } else {
        // Update existing context with new device info if provided
        if (deviceInfo) {
          await this.updateDeviceHistory(context, deviceInfo, turnContext.sessionId);
        }
      }

      // Update last activity
      context.updatedAt = new Date();
      await this.saveContext(context);

      return context;

    } catch (error) {
      this.logger.error('Failed to get or create conversation context', {
        error: error instanceof Error ? error.message : String(error),
        userId: turnContext.userId,
        sessionId: turnContext.sessionId,
      });
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'Failed to manage conversation context'
      );
    }
  }

  /**
   * Get conversation context with automatic decompression and decryption
   */
  async getContext(sessionId: string): Promise<EnhancedConversationContext | null> {
    this.ensureInitialized();

    try {
      const key = this.getContextKey(sessionId);
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      let contextData = data;

      // Decrypt if encrypted
      const parsed = JSON.parse(contextData);
      if (parsed.encryptionMetadata) {
        contextData = await this.decryptContext(contextData, parsed.encryptionMetadata);
      }

      // Decompress if compressed
      if (parsed.compressed) {
        contextData = await this.decompressContext(contextData);
      }

      const context = JSON.parse(contextData) as EnhancedConversationContext;
      
      // Convert date strings back to Date objects
      context.createdAt = new Date(context.createdAt);
      context.updatedAt = new Date(context.updatedAt);
      context.expiresAt = new Date(context.expiresAt);
      
      if (context.interruptionState) {
        context.interruptionState.timestamp = new Date(context.interruptionState.timestamp);
      }

      context.conversationHistory = context.conversationHistory.map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));

      context.deviceHistory = context.deviceHistory.map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));

      this.logger.debug('Retrieved enhanced conversation context', {
        sessionId,
        userId: context.userId,
        phase: context.conversationPhase,
        historyLength: context.conversationHistory.length,
        deviceCount: context.deviceHistory.length,
        hasInterruption: !!context.interruptionState,
      });

      return context;

    } catch (error) {
      this.logger.error('Failed to get conversation context', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      return null;
    }
  }

  /**
   * Save conversation context with compression and encryption
   */
  async saveContext(context: EnhancedConversationContext): Promise<void> {
    this.ensureInitialized();

    try {
      const key = this.getContextKey(context.sessionId);
      let contextData = JSON.stringify(context);

      // Compress if enabled and context is large
      if (this.config.compression.enabled && 
          contextData.length > this.config.compression.threshold) {
        contextData = await this.compressContext(contextData);
      }

      // Encrypt sensitive data
      if (this.shouldEncryptContext(context)) {
        contextData = await this.encryptContext(contextData);
      }

      const ttl = Math.floor((context.expiresAt.getTime() - Date.now()) / 1000);
      
      if (ttl <= 0) {
        this.logger.warn('Attempted to save expired context', {
          sessionId: context.sessionId,
          userId: context.userId,
          expiresAt: context.expiresAt,
        });
        return;
      }

      await this.redis.setEx(key, ttl, contextData);

      // Also persist to Supabase for long-term storage
      await this.persistContextToSupabase(context);

      this.logger.debug('Enhanced conversation context saved', {
        sessionId: context.sessionId,
        userId: context.userId,
        phase: context.conversationPhase,
        ttl,
        dataSize: contextData.length,
        compressed: contextData.includes('"compressed":true'),
        encrypted: contextData.includes('"encryptionMetadata"'),
      });

    } catch (error) {
      this.logger.error('Failed to save conversation context', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: context.sessionId,
        userId: context.userId,
      });
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'Failed to save conversation context'
      );
    }
  }

  /**
   * Handle conversation interruption with state checkpointing
   */
  async handleInterruption(
    sessionId: string,
    interruptionType: 'user_stop' | 'system_error' | 'timeout' | 'device_switch',
    contextSnapshot: any
  ): Promise<void> {
    const context = await this.getContext(sessionId);
    if (!context) {
      this.logger.warn('Cannot handle interruption - context not found', { sessionId });
      return;
    }

    // Create interruption checkpoint
    context.interruptionState = {
      timestamp: new Date(),
      lastCompleteAction: this.determineLastCompleteAction(context),
      pendingActions: this.determinePendingActions(context),
      resumptionPrompt: this.generateResumptionPrompt(context, interruptionType),
      contextSnapshot,
    };

    await this.saveContext(context);

    this.logger.info('Conversation interruption handled', {
      sessionId,
      userId: context.userId,
      interruptionType,
      lastAction: context.interruptionState.lastCompleteAction,
      pendingActions: context.interruptionState.pendingActions.length,
    });
  }

  /**
   * Generate resumption prompt based on conversation state
   */
  generateResumptionPrompt(
    context: EnhancedConversationContext,
    interruptionType: string
  ): string {
    const timeSinceLastActivity = Date.now() - context.updatedAt.getTime();
    const hoursAgo = Math.floor(timeSinceLastActivity / (1000 * 60 * 60));
    
    let timeReference = '';
    if (hoursAgo < 1) {
      timeReference = 'a few minutes ago';
    } else if (hoursAgo < 24) {
      timeReference = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
    } else {
      const daysAgo = Math.floor(hoursAgo / 24);
      timeReference = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
    }

    switch (context.conversationPhase) {
      case ConversationPhase.CHARACTER_CREATION:
        if (context.storyState.characterDetails) {
          const characterName = context.storyState.characterDetails.name || 'your character';
          return `Welcome back! ${timeReference} we were creating ${characterName}. Should we continue working on their details, or would you like to start the story?`;
        }
        return `Hi again! ${timeReference} we were creating a character for your story. Would you like to continue where we left off?`;

      case ConversationPhase.STORY_BUILDING:
        if (context.storyState.currentBeat && context.storyState.storyOutline) {
          return `Welcome back to your story! ${timeReference} we were at an exciting part where your character was making an important choice. Should we continue the adventure?`;
        }
        return `Hi! ${timeReference} we were building your story together. Would you like to continue where we left off?`;

      case ConversationPhase.STORY_EDITING:
        return `Welcome back! ${timeReference} we were making some changes to your story. Would you like to continue editing, or are you happy with how it is?`;

      default:
        return `Hi there! ${timeReference} we were working on your story together. Would you like to continue where we left off?`;
    }
  }

  /**
   * Handle seamless session handoff between devices
   */
  async handleDeviceHandoff(
    fromSessionId: string,
    toSessionId: string,
    newDeviceInfo: {
      deviceId: string;
      deviceType: string;
      capabilities: string[];
    }
  ): Promise<EnhancedConversationContext> {
    const sourceContext = await this.getContext(fromSessionId);
    if (!sourceContext) {
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'Source session context not found for device handoff'
      );
    }

    // Create new context for target device
    const targetContext: EnhancedConversationContext = {
      ...sourceContext,
      sessionId: toSessionId,
      parentSessionId: fromSessionId,
      sessionChain: [...sourceContext.sessionChain, fromSessionId],
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.redis.defaultTtl * 1000),
    };

    // Update device history
    targetContext.deviceHistory.push({
      deviceId: newDeviceInfo.deviceId,
      deviceType: newDeviceInfo.deviceType,
      sessionId: toSessionId,
      timestamp: new Date(),
    });

    // Adapt context for new device capabilities
    await this.adaptContextForDevice(targetContext, newDeviceInfo);

    // Save new context
    await this.saveContext(targetContext);

    // Mark source session as handed off
    sourceContext.metadata = {
      ...sourceContext.metadata,
      handedOffTo: toSessionId,
      handoffTimestamp: new Date().toISOString(),
    };
    await this.saveContext(sourceContext);

    this.logger.info('Device handoff completed', {
      fromSessionId,
      toSessionId,
      userId: sourceContext.userId,
      fromDevice: sourceContext.deviceHistory[sourceContext.deviceHistory.length - 1]?.deviceType,
      toDevice: newDeviceInfo.deviceType,
    });

    return targetContext;
  }

  /**
   * Manage multi-user context separation on shared devices
   */
  async separateUserContext(
    sessionId: string,
    activeUserId: string,
    allUserIds: string[]
  ): Promise<void> {
    const context = await this.getContext(sessionId);
    if (!context) {
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'Context not found for user separation'
      );
    }

    // Initialize user separation if not exists
    if (!context.userContext.userSeparation) {
      context.userContext.userSeparation = {};
    }

    // Store current state for the active user
    context.userContext.userSeparation[activeUserId] = {
      personalContext: {
        conversationPhase: context.conversationPhase,
        storyState: context.storyState,
        lastIntent: context.lastIntent,
      },
      storyPreferences: context.context.storyPreferences || {},
      emotionalState: context.context.emotionalState || {},
    };

    // Update active users list
    context.userContext.activeUsers = allUserIds;
    context.userContext.primaryUserId = activeUserId;

    await this.saveContext(context);

    this.logger.info('User context separated', {
      sessionId,
      activeUserId,
      totalUsers: allUserIds.length,
    });
  }

  /**
   * Switch active user context on shared device
   */
  async switchUserContext(
    sessionId: string,
    newActiveUserId: string
  ): Promise<EnhancedConversationContext> {
    const context = await this.getContext(sessionId);
    if (!context) {
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'Context not found for user switch'
      );
    }

    // Save current user's state
    const currentUserId = context.userContext.primaryUserId;
    if (currentUserId && context.userContext.userSeparation[currentUserId]) {
      context.userContext.userSeparation[currentUserId] = {
        personalContext: {
          conversationPhase: context.conversationPhase,
          storyState: context.storyState,
          lastIntent: context.lastIntent,
        },
        storyPreferences: context.context.storyPreferences || {},
        emotionalState: context.context.emotionalState || {},
      };
    }

    // Load new user's state
    const newUserState = context.userContext.userSeparation[newActiveUserId];
    if (newUserState) {
      context.conversationPhase = newUserState.personalContext.conversationPhase;
      context.storyState = newUserState.personalContext.storyState;
      context.lastIntent = newUserState.personalContext.lastIntent;
      context.context.storyPreferences = newUserState.storyPreferences;
      context.context.emotionalState = newUserState.emotionalState;
    }

    // Update primary user
    context.userContext.primaryUserId = newActiveUserId;
    context.updatedAt = new Date();

    await this.saveContext(context);

    this.logger.info('User context switched', {
      sessionId,
      fromUserId: currentUserId,
      toUserId: newActiveUserId,
    });

    return context;
  }

  /**
   * Private helper methods
   */

  private async createNewContext(
    turnContext: TurnContext,
    deviceInfo?: {
      deviceId: string;
      deviceType: string;
      capabilities: string[];
    }
  ): Promise<EnhancedConversationContext> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.redis.defaultTtl * 1000);

    const context: EnhancedConversationContext = {
      userId: turnContext.userId,
      sessionId: turnContext.sessionId,
      conversationPhase: ConversationPhase.GREETING,
      lastIntent: IntentType.GREETING,
      context: {},
      createdAt: now,
      updatedAt: now,
      expiresAt,
      sessionChain: [turnContext.sessionId],
      deviceHistory: deviceInfo ? [{
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType,
        sessionId: turnContext.sessionId,
        timestamp: now,
      }] : [],
      storyState: {
        narrativeChoices: [],
        plotPoints: [],
      },
      conversationHistory: [],
      userContext: {
        primaryUserId: turnContext.userId,
        activeUsers: [turnContext.userId],
        userSeparation: {},
      },
    };

    this.logger.info('Created new enhanced conversation context', {
      sessionId: turnContext.sessionId,
      userId: turnContext.userId,
      deviceType: deviceInfo?.deviceType,
    });

    return context;
  }

  private async findRelatedSessions(userId: string): Promise<string[]> {
    try {
      const pattern = `${this.config.redis.keyPrefix}:context:*`;
      const keys = await this.redis.keys(pattern);
      
      const relatedSessions: Array<{ sessionId: string; updatedAt: Date }> = [];

      // Check each session to see if it belongs to the user
      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.userId === userId) {
              const sessionId = key.split(':').pop()!;
              relatedSessions.push({
                sessionId,
                updatedAt: new Date(parsed.updatedAt),
              });
            }
          }
        } catch (error) {
          // Skip invalid sessions
          continue;
        }
      }

      // Sort by most recent first
      relatedSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      return relatedSessions.map(s => s.sessionId);

    } catch (error) {
      this.logger.error('Failed to find related sessions', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      return [];
    }
  }

  private async reconstructContextFromRelatedSession(
    turnContext: TurnContext,
    relatedSessionId: string,
    deviceInfo?: {
      deviceId: string;
      deviceType: string;
      capabilities: string[];
    }
  ): Promise<EnhancedConversationContext> {
    const relatedContext = await this.getContext(relatedSessionId);
    if (!relatedContext) {
      return this.createNewContext(turnContext, deviceInfo);
    }

    const now = new Date();
    const reconstructedContext: EnhancedConversationContext = {
      ...relatedContext,
      sessionId: turnContext.sessionId,
      parentSessionId: relatedSessionId,
      sessionChain: [...relatedContext.sessionChain, relatedSessionId],
      updatedAt: now,
      expiresAt: new Date(now.getTime() + this.config.redis.defaultTtl * 1000),
    };

    // Add new device to history if provided
    if (deviceInfo) {
      reconstructedContext.deviceHistory.push({
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType,
        sessionId: turnContext.sessionId,
        timestamp: now,
      });
    }

    // Compress conversation history to keep only recent entries
    if (reconstructedContext.conversationHistory.length > this.config.redis.maxHistoryLength) {
      reconstructedContext.conversationHistory = reconstructedContext.conversationHistory
        .slice(-this.config.redis.maxHistoryLength);
    }

    this.logger.info('Reconstructed context from related session', {
      newSessionId: turnContext.sessionId,
      relatedSessionId,
      userId: turnContext.userId,
      preservedPhase: reconstructedContext.conversationPhase,
      historyLength: reconstructedContext.conversationHistory.length,
    });

    return reconstructedContext;
  }

  private async updateDeviceHistory(
    context: EnhancedConversationContext,
    deviceInfo: {
      deviceId: string;
      deviceType: string;
      capabilities: string[];
    },
    sessionId: string
  ): Promise<void> {
    // Check if this device is already in history for this session
    const existingEntry = context.deviceHistory.find(
      entry => entry.deviceId === deviceInfo.deviceId && entry.sessionId === sessionId
    );

    if (!existingEntry) {
      context.deviceHistory.push({
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType,
        sessionId,
        timestamp: new Date(),
      });

      // Keep only recent device history
      if (context.deviceHistory.length > 10) {
        context.deviceHistory = context.deviceHistory.slice(-10);
      }
    }
  }

  private determineLastCompleteAction(context: EnhancedConversationContext): string {
    if (context.conversationHistory.length === 0) {
      return 'conversation_started';
    }

    const lastEntry = context.conversationHistory[context.conversationHistory.length - 1];
    
    switch (lastEntry.phase) {
      case ConversationPhase.CHARACTER_CREATION:
        return context.storyState.characterDetails ? 'character_details_collected' : 'character_creation_started';
      case ConversationPhase.STORY_BUILDING:
        return context.storyState.currentBeat ? `story_beat_${context.storyState.currentBeat}_completed` : 'story_building_started';
      case ConversationPhase.STORY_EDITING:
        return 'story_editing_in_progress';
      default:
        return `${lastEntry.phase}_active`;
    }
  }

  private determinePendingActions(context: EnhancedConversationContext): string[] {
    const pending: string[] = [];

    switch (context.conversationPhase) {
      case ConversationPhase.CHARACTER_CREATION:
        if (!context.storyState.characterDetails?.name) pending.push('collect_character_name');
        if (!context.storyState.characterDetails?.appearance) pending.push('collect_character_appearance');
        if (!context.storyState.characterDetails?.personality) pending.push('collect_character_personality');
        break;
      
      case ConversationPhase.STORY_BUILDING:
        if (!context.storyState.storyOutline) pending.push('create_story_outline');
        if (context.storyState.currentBeat === undefined) pending.push('start_story_narration');
        break;
      
      case ConversationPhase.ASSET_GENERATION:
        pending.push('complete_asset_generation');
        break;
    }

    return pending;
  }

  private async adaptContextForDevice(
    context: EnhancedConversationContext,
    deviceInfo: {
      deviceId: string;
      deviceType: string;
      capabilities: string[];
    }
  ): Promise<void> {
    // Adapt conversation style based on device capabilities
    if (!context.context.deviceAdaptations) {
      context.context.deviceAdaptations = {};
    }

    context.context.deviceAdaptations[deviceInfo.deviceId] = {
      deviceType: deviceInfo.deviceType,
      capabilities: deviceInfo.capabilities,
      adaptations: {
        useVisualElements: deviceInfo.capabilities.includes('screen'),
        enableVoiceOutput: deviceInfo.capabilities.includes('audio_output'),
        supportFileUploads: deviceInfo.capabilities.includes('file_upload'),
        enableRealTimeUpdates: deviceInfo.capabilities.includes('websocket'),
      },
    };
  }

  private shouldEncryptContext(context: EnhancedConversationContext): boolean {
    // Encrypt if context contains sensitive information
    return !!(
      context.storyState.characterDetails ||
      context.conversationHistory.length > 0 ||
      context.userContext.userSeparation ||
      context.interruptionState
    );
  }

  private async compressContext(contextData: string): Promise<string> {
    try {
      const compressed = await gzipAsync(Buffer.from(contextData));
      const result = {
        compressed: true,
        data: compressed.toString('base64'),
        originalSize: contextData.length,
        compressedSize: compressed.length,
      };
      return JSON.stringify(result);
    } catch (error) {
      this.logger.warn('Failed to compress context, using uncompressed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return contextData;
    }
  }

  private async decompressContext(contextData: string): Promise<string> {
    try {
      const parsed = JSON.parse(contextData);
      if (parsed.compressed) {
        const compressed = Buffer.from(parsed.data, 'base64');
        const decompressed = await gunzipAsync(compressed);
        return decompressed.toString();
      }
      return contextData;
    } catch (error) {
      this.logger.error('Failed to decompress context', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async encryptContext(contextData: string): Promise<string> {
    try {
      const keyId = 'current'; // Use current encryption key
      const key = this.encryptionKeys.get(keyId);
      if (!key) {
        throw new Error(`Encryption key ${keyId} not found`);
      }

      const iv = randomBytes(16);
      const cipher = createCipher(this.config.encryption.algorithm, key);
      
      let encrypted = cipher.update(contextData, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const result = {
        encrypted: true,
        data: encrypted,
        encryptionMetadata: {
          algorithm: this.config.encryption.algorithm,
          keyId,
          iv: iv.toString('hex'),
        },
      };

      return JSON.stringify(result);
    } catch (error) {
      this.logger.warn('Failed to encrypt context, using unencrypted', {
        error: error instanceof Error ? error.message : String(error),
      });
      return contextData;
    }
  }

  private async decryptContext(contextData: string, metadata: any): Promise<string> {
    try {
      const key = this.encryptionKeys.get(metadata.keyId);
      if (!key) {
        throw new Error(`Encryption key ${metadata.keyId} not found`);
      }

      const parsed = JSON.parse(contextData);
      const decipher = createDecipher(metadata.algorithm, key);
      
      let decrypted = decipher.update(parsed.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt context', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private initializeEncryptionKeys(): void {
    for (const [keyId, keyString] of Object.entries(this.config.encryption.encryptionKeys)) {
      this.encryptionKeys.set(keyId, Buffer.from(keyString, 'hex'));
    }
  }

  private async persistContextToSupabase(context: EnhancedConversationContext): Promise<void> {
    try {
      // Only persist significant conversation states to Supabase
      if (context.conversationPhase === ConversationPhase.GREETING) {
        return; // Don't persist greeting-only sessions
      }

      const { error } = await this.supabase
        .from('conversation_sessions')
        .upsert({
          session_id: context.sessionId,
          user_id: context.userId,
          parent_session_id: context.parentSessionId,
          conversation_phase: context.conversationPhase,
          story_id: context.currentStoryId,
          character_id: context.currentCharacterId,
          story_type: context.storyType,
          session_chain: context.sessionChain,
          device_history: context.deviceHistory,
          story_state: context.storyState,
          interruption_state: context.interruptionState,
          created_at: context.createdAt.toISOString(),
          updated_at: context.updatedAt.toISOString(),
          expires_at: context.expiresAt.toISOString(),
        });

      if (error) {
        this.logger.warn('Failed to persist context to Supabase', {
          error: error.message,
          sessionId: context.sessionId,
        });
      }
    } catch (error) {
      this.logger.warn('Error persisting context to Supabase', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: context.sessionId,
      });
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'ConversationContinuityManager not initialized'
      );
    }
  }

  private getContextKey(sessionId: string): string {
    return `${this.config.redis.keyPrefix}:context:${sessionId}`;
  }

  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        this.logger.error('Cleanup task failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, this.config.cleanup.expiredSessionCleanupInterval);

    // Run initial cleanup
    setTimeout(() => {
      this.cleanupExpiredSessions().catch(error => {
        this.logger.error('Initial cleanup failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, 1000);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const pattern = `${this.config.redis.keyPrefix}:context:*`;
      const keys = await this.redis.keys(pattern);
      
      let cleanedCount = 0;
      const expiredKeys: string[] = [];

      for (const key of keys) {
        try {
          const ttl = await this.redis.ttl(key);
          
          if (ttl === -2 || ttl === 0) {
            await this.redis.del(key);
            expiredKeys.push(key);
            cleanedCount++;
          }
        } catch (error) {
          // Skip individual key errors
          continue;
        }
      }

      const duration = Date.now() - startTime;

      if (cleanedCount > 0) {
        this.logger.info('Conversation continuity cleanup completed', {
          totalKeys: keys.length,
          cleanedCount,
          duration,
        });
      }

    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}