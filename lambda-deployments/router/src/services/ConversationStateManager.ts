import { createClient, RedisClientType } from 'redis';
import { Logger } from 'winston';
import {
  MemoryState,
  ConversationPhase,
  IntentType,
  TurnContext,
  RouterError,
  RouterErrorCode
} from '../types';

/**
 * Conversation state management using Redis for short-term memory caching
 * Handles conversation context persistence and cleanup
 */
export class ConversationStateManager {
  private redis: RedisClientType;
  private isInitialized = false;

  constructor(
    private config: {
      url: string;
      keyPrefix: string;
      defaultTtl: number;
    },
    private logger: Logger
  ) {
    this.redis = createClient({ url: config.url });
  }

  /**
   * Initialize the conversation state manager
   */
  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      this.isInitialized = true;
      this.logger.info('ConversationStateManager initialized successfully');

      // Start cleanup task
      this.startCleanupTask();

    } catch (error) {
      this.logger.error('Failed to initialize ConversationStateManager', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Shutdown the conversation state manager
   */
  async shutdown(): Promise<void> {
    try {
      // Clear cleanup interval
      if ((this as any).cleanupInterval) {
        clearInterval((this as any).cleanupInterval);
      }

      // Run final cleanup
      await this.cleanupExpiredStates();

      // Disconnect from Redis
      await this.redis.disconnect();
      this.isInitialized = false;
      this.logger.info('ConversationStateManager shutdown completed');
    } catch (error) {
      this.logger.error('Error during ConversationStateManager shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get conversation state for a user session
   */
  async getMemoryState(userId: string, sessionId: string): Promise<MemoryState | null> {
    console.log('🔍 [STATE] getMemoryState START:', { userId, sessionId });
    this.ensureInitialized();

    try {
      const key = this.getStateKey(userId, sessionId);
      console.log('🔍 [STATE] Looking for key:', key);
      
      const data = await this.redis.get(key);
      console.log('🔍 [STATE] Redis returned:', data ? `${data.length} bytes` : 'NULL');

      if (!data) {
        console.log('⚠️  [STATE] No state found, will create new');
        return null;
      }

      const parsed = JSON.parse(data);
      console.log('✅ [STATE] State found! lastIntent:', parsed.lastIntent, 'phase:', parsed.conversationPhase);
      const memoryState = {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
        expiresAt: new Date(parsed.expiresAt),
      };

      return this.decompressMemoryState(memoryState);

    } catch (error) {
      this.logger.error('Failed to get memory state', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        sessionId,
      });
      return null;
    }
  }

  /**
   * Save conversation state
   */
  async saveMemoryState(memoryState: MemoryState): Promise<void> {
    console.log('🔍 [STATE] saveMemoryState START:', { userId: memoryState.userId, sessionId: memoryState.sessionId, lastIntent: memoryState.lastIntent, phase: memoryState.conversationPhase });
    this.ensureInitialized();

    try {
      const key = this.getStateKey(memoryState.userId, memoryState.sessionId);
      console.log('🔍 [STATE] Redis key:', key);
      
      const ttl = Math.floor((memoryState.expiresAt.getTime() - Date.now()) / 1000);
      console.log('🔍 [STATE] TTL:', ttl, 'seconds');

      if (ttl <= 0) {
        console.warn('⚠️  [STATE] TTL expired, not saving');
        this.logger.warn('Attempted to save expired memory state', {
          userId: memoryState.userId,
          sessionId: memoryState.sessionId,
          expiresAt: memoryState.expiresAt,
        });
        return;
      }

      // Compress conversation history to save space
      const compressedState = this.compressMemoryState(memoryState);

      const data = JSON.stringify({
        ...compressedState,
        updatedAt: new Date().toISOString(),
      });

      console.log('🔍 [STATE] Saving to Redis, size:', data.length);
      await this.redis.setEx(key, ttl, data);
      console.log('✅ [STATE] Saved successfully!');

      this.logger.debug('Memory state saved', {
        userId: memoryState.userId,
        sessionId: memoryState.sessionId,
        phase: memoryState.conversationPhase,
        ttl,
        dataSize: data.length,
      });

    } catch (error) {
      this.logger.error('Failed to save memory state', {
        error: error instanceof Error ? error.message : String(error),
        userId: memoryState.userId,
        sessionId: memoryState.sessionId,
      });
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'Failed to save conversation state'
      );
    }
  }

  /**
   * Compress memory state to reduce Redis storage
   */
  private compressMemoryState(memoryState: MemoryState): MemoryState {
    const compressed = { ...memoryState };

    // Compress conversation history - keep only last 10 entries
    if (compressed.context.conversationHistory && Array.isArray(compressed.context.conversationHistory)) {
      compressed.context.conversationHistory = compressed.context.conversationHistory.slice(-10);
    }

    // Remove large temporary data that shouldn't persist
    if (compressed.context.tempData) {
      delete compressed.context.tempData;
    }

    // Compress user profile data - keep only essential fields
    if (compressed.context.userProfile) {
      const profile = compressed.context.userProfile;
      compressed.context.userProfile = {
        age: profile.age,
        preferences: profile.preferences?.slice(0, 5), // Keep top 5 preferences
        previousStoryTypes: profile.previousStoryTypes?.slice(-5), // Keep last 5 story types
      };
    }

    return compressed;
  }

  /**
   * Decompress memory state after retrieval
   */
  private decompressMemoryState(memoryState: MemoryState): MemoryState {
    // Initialize missing arrays
    if (!memoryState.context.conversationHistory) {
      memoryState.context.conversationHistory = [];
    }

    if (!memoryState.context.userProfile) {
      memoryState.context.userProfile = {};
    }

    return memoryState;
  }

  /**
   * Update conversation phase
   */
  async updateConversationPhase(
    userId: string,
    sessionId: string,
    phase: ConversationPhase
  ): Promise<void> {
    const memoryState = await this.getMemoryState(userId, sessionId);
    
    if (memoryState) {
      memoryState.conversationPhase = phase;
      memoryState.updatedAt = new Date();
      await this.saveMemoryState(memoryState);
    }
  }

  /**
   * Create new conversation state
   */
  async createMemoryState(
    userId: string,
    sessionId: string,
    initialContext: Partial<MemoryState> = {}
  ): Promise<MemoryState> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.defaultTtl * 1000);

    const memoryState: MemoryState = {
      userId,
      sessionId,
      conversationPhase: ConversationPhase.GREETING,
      lastIntent: IntentType.UNKNOWN, // Use UNKNOWN for new sessions to trigger emotion check
      context: {},
      createdAt: now,
      updatedAt: now,
      expiresAt,
      ...initialContext,
    };

    await this.saveMemoryState(memoryState);
    return memoryState;
  }

  /**
   * Update context data
   */
  async updateContext(
    userId: string,
    sessionId: string,
    contextUpdates: Record<string, any>
  ): Promise<void> {
    const memoryState = await this.getMemoryState(userId, sessionId);
    
    if (memoryState) {
      memoryState.context = {
        ...memoryState.context,
        ...contextUpdates,
      };
      memoryState.updatedAt = new Date();
      await this.saveMemoryState(memoryState);
    }
  }

  /**
   * Get or create memory state
   */
  async getOrCreateMemoryState(
    turnContext: TurnContext,
    initialContext: Partial<MemoryState> = {}
  ): Promise<MemoryState> {
    let memoryState = await this.getMemoryState(turnContext.userId, turnContext.sessionId);
    
    if (!memoryState) {
      memoryState = await this.createMemoryState(
        turnContext.userId,
        turnContext.sessionId,
        {
          conversationPhase: turnContext.conversationPhase || ConversationPhase.GREETING,
          ...initialContext,
        }
      );
    }

    return memoryState;
  }

  /**
   * Delete conversation state
   */
  async deleteMemoryState(userId: string, sessionId: string): Promise<void> {
    this.ensureInitialized();

    try {
      const key = this.getStateKey(userId, sessionId);
      await this.redis.del(key);

      this.logger.info('Memory state deleted', { userId, sessionId });

    } catch (error) {
      this.logger.error('Failed to delete memory state', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        sessionId,
      });
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    this.ensureInitialized();

    try {
      const pattern = `${this.config.keyPrefix}:state:${userId}:*`;
      const keys = await this.redis.keys(pattern);
      
      return keys.map(key => {
        const parts = key.split(':');
        return parts[parts.length - 1]; // Extract session ID
      });

    } catch (error) {
      this.logger.error('Failed to get user sessions', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      return [];
    }
  }

  /**
   * Extend session expiration
   */
  async extendSession(
    userId: string,
    sessionId: string,
    additionalTtl: number = 3600
  ): Promise<void> {
    const memoryState = await this.getMemoryState(userId, sessionId);
    
    if (memoryState) {
      memoryState.expiresAt = new Date(memoryState.expiresAt.getTime() + additionalTtl * 1000);
      await this.saveMemoryState(memoryState);
    }
  }

  /**
   * Get conversation history summary
   */
  async getConversationSummary(userId: string, sessionId: string): Promise<{
    phase: ConversationPhase;
    lastIntent: IntentType;
    duration: number;
    storyId?: string;
    characterId?: string;
    messageCount: number;
    lastActivity: Date;
    isExpired: boolean;
  } | null> {
    const memoryState = await this.getMemoryState(userId, sessionId);
    
    if (!memoryState) {
      return null;
    }

    const now = Date.now();
    const duration = now - memoryState.createdAt.getTime();
    const isExpired = now > memoryState.expiresAt.getTime();
    const messageCount = memoryState.context.conversationHistory?.length || 0;

    return {
      phase: memoryState.conversationPhase,
      lastIntent: memoryState.lastIntent,
      duration,
      storyId: memoryState.currentStoryId,
      characterId: memoryState.currentCharacterId,
      messageCount,
      lastActivity: memoryState.updatedAt,
      isExpired,
    };
  }

  /**
   * Get conversation state metrics
   */
  async getStateMetrics(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    averageSessionDuration: number;
    memoryUsage: number;
    phaseDistribution: Record<ConversationPhase, number>;
  }> {
    try {
      const pattern = `${this.config.keyPrefix}:state:*`;
      const keys = await this.redis.keys(pattern);
      
      let activeSessions = 0;
      let expiredSessions = 0;
      let totalDuration = 0;
      let memoryUsage = 0;
      const phaseDistribution: Record<ConversationPhase, number> = {} as any;

      // Initialize phase distribution
      Object.values(ConversationPhase).forEach(phase => {
        phaseDistribution[phase] = 0;
      });

      // Process sessions in batches
      const batchSize = 50;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (key) => {
          try {
            const data = await this.redis.get(key);
            if (data) {
              memoryUsage += data.length;
              
              const parsed = JSON.parse(data);
              const createdAt = new Date(parsed.createdAt);
              const expiresAt = new Date(parsed.expiresAt);
              const now = new Date();

              if (now > expiresAt) {
                expiredSessions++;
              } else {
                activeSessions++;
                totalDuration += now.getTime() - createdAt.getTime();
                
                if (parsed.conversationPhase) {
                  phaseDistribution[parsed.conversationPhase as ConversationPhase]++;
                }
              }
            }
          } catch (error) {
            // Skip invalid sessions
          }
        }));
      }

      const averageSessionDuration = activeSessions > 0 ? totalDuration / activeSessions : 0;

      return {
        totalSessions: keys.length,
        activeSessions,
        expiredSessions,
        averageSessionDuration,
        memoryUsage,
        phaseDistribution,
      };

    } catch (error) {
      this.logger.error('Failed to get state metrics', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Return empty metrics on error
      return {
        totalSessions: 0,
        activeSessions: 0,
        expiredSessions: 0,
        averageSessionDuration: 0,
        memoryUsage: 0,
        phaseDistribution: {} as any,
      };
    }
  }

  /**
   * Private helper methods
   */

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new RouterError(
        RouterErrorCode.INTERNAL_ERROR,
        'ConversationStateManager not initialized'
      );
    }
  }

  private getStateKey(userId: string, sessionId: string): string {
    return `${this.config.keyPrefix}:state:${userId}:${sessionId}`;
  }

  private startCleanupTask(): void {
    // Clean up expired states every 5 minutes
    const cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredStates();
      } catch (error) {
        this.logger.error('Cleanup task failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 5 * 60 * 1000);

    // Store interval reference for cleanup during shutdown
    (this as any).cleanupInterval = cleanupInterval;

    // Also run cleanup on startup
    setTimeout(() => {
      this.cleanupExpiredStates().catch(error => {
        this.logger.error('Initial cleanup failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, 1000);
  }

  private async cleanupExpiredStates(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const pattern = `${this.config.keyPrefix}:state:*`;
      const keys = await this.redis.keys(pattern);
      
      let cleanedCount = 0;
      let errorCount = 0;
      const expiredKeys: string[] = [];

      // Process keys in batches to avoid overwhelming Redis
      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (key) => {
          try {
            const ttl = await this.redis.ttl(key);
            
            // If TTL is -2 (key doesn't exist) or 0 (expired), clean it up
            if (ttl === -2 || ttl === 0) {
              await this.redis.del(key);
              expiredKeys.push(key);
              cleanedCount++;
            }
          } catch (error) {
            errorCount++;
            this.logger.warn('Failed to check/cleanup individual key', {
              key,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }));
      }

      const duration = Date.now() - startTime;

      if (cleanedCount > 0 || errorCount > 0) {
        this.logger.info('Conversation state cleanup completed', {
          totalKeys: keys.length,
          cleanedCount,
          errorCount,
          duration,
          cleanupRate: cleanedCount / (duration / 1000), // keys per second
        });
      }

      // Log sample of cleaned keys for debugging
      if (expiredKeys.length > 0) {
        this.logger.debug('Sample of cleaned keys', {
          sampleKeys: expiredKeys.slice(0, 5),
          totalCleaned: expiredKeys.length,
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to cleanup expired states', {
        error: error instanceof Error ? error.message : String(error),
        duration,
      });
    }
  }
}