import { ConversationContext, ConversationPhase } from '@alexa-multi-agent/shared-types';
import { SupportedLocale, DeviceCapabilities } from '../types/alexa';
import { createLogger } from '../utils/logger';
import Redis from 'redis';

export interface CreateContextOptions {
  sessionId: string;
  userId: string;
  channel: 'alexa' | 'web_chat' | 'mobile_voice';
  locale: SupportedLocale;
  deviceCapabilities: DeviceCapabilities;
}

export class ConversationStateManager {
  private logger = createLogger('conversation-state-manager');
  private redis: Redis.RedisClientType;
  private readonly CONTEXT_TTL = 24 * 60 * 60; // 24 hours in seconds
  private readonly CONTEXT_PREFIX = 'conversation:';

  constructor(redisClient: Redis.RedisClientType) {
    this.redis = redisClient;
  }

  /**
   * Creates a new conversation context
   */
  async createContext(options: CreateContextOptions): Promise<ConversationContext> {
    const context: ConversationContext = {
      sessionId: options.sessionId,
      userId: options.userId,
      characterIds: [],
      currentPhase: 'character',
      conversationHistory: [],
      emotionalState: {
        currentMood: 'neutral',
        confidence: 0.5,
        recentEmotions: [],
        patterns: []
      },
      preferences: await this.loadUserPreferences(options.userId, options.locale),
      lastActivity: new Date().toISOString()
    };

    await this.saveContext(context);

    this.logger.info('Created new conversation context', {
      sessionId: options.sessionId,
      userId: options.userId,
      channel: options.channel,
      locale: options.locale
    });

    return context;
  }

  /**
   * Retrieves conversation context from Redis
   */
  async getContext(sessionId: string): Promise<ConversationContext | null> {
    try {
      const key = this.getContextKey(sessionId);
      const contextData = await this.redis.get(key);
      
      if (!contextData) {
        return null;
      }

      const context = JSON.parse(contextData) as ConversationContext;
      
      this.logger.debug('Retrieved conversation context', {
        sessionId,
        currentPhase: context.currentPhase,
        historyLength: context.conversationHistory.length,
        lastActivity: context.lastActivity
      });

      return context;
    } catch (error) {
      this.logger.error('Failed to retrieve conversation context', {
        sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      return null;
    }
  }

  /**
   * Saves conversation context to Redis with TTL
   */
  async saveContext(context: ConversationContext): Promise<void> {
    try {
      const key = this.getContextKey(context.sessionId);
      const contextData = JSON.stringify(context);
      
      await this.redis.setEx(key, this.CONTEXT_TTL, contextData);
      
      this.logger.debug('Saved conversation context', {
        sessionId: context.sessionId,
        currentPhase: context.currentPhase,
        historyLength: context.conversationHistory.length
      });
    } catch (error) {
      this.logger.error('Failed to save conversation context', {
        sessionId: context.sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Updates conversation phase
   */
  async updatePhase(sessionId: string, phase: ConversationPhase): Promise<void> {
    const context = await this.getContext(sessionId);
    if (!context) {
      throw new Error(`Conversation context not found for session ${sessionId}`);
    }

    context.currentPhase = phase;
    context.lastActivity = new Date().toISOString();
    
    await this.saveContext(context);

    this.logger.info('Updated conversation phase', {
      sessionId,
      newPhase: phase
    });
  }

  /**
   * Adds story ID to conversation context
   */
  async setStoryId(sessionId: string, storyId: string): Promise<void> {
    const context = await this.getContext(sessionId);
    if (!context) {
      throw new Error(`Conversation context not found for session ${sessionId}`);
    }

    context.storyId = storyId;
    context.lastActivity = new Date().toISOString();
    
    await this.saveContext(context);

    this.logger.info('Set story ID in conversation context', {
      sessionId,
      storyId
    });
  }

  /**
   * Adds character ID to conversation context
   */
  async addCharacterId(sessionId: string, characterId: string): Promise<void> {
    const context = await this.getContext(sessionId);
    if (!context) {
      throw new Error(`Conversation context not found for session ${sessionId}`);
    }

    if (!context.characterIds.includes(characterId)) {
      context.characterIds.push(characterId);
      context.lastActivity = new Date().toISOString();
      
      await this.saveContext(context);

      this.logger.info('Added character ID to conversation context', {
        sessionId,
        characterId,
        totalCharacters: context.characterIds.length
      });
    }
  }

  /**
   * Updates emotional state in conversation context
   */
  async updateEmotionalState(sessionId: string, mood: any, confidence: number): Promise<void> {
    const context = await this.getContext(sessionId);
    if (!context) {
      throw new Error(`Conversation context not found for session ${sessionId}`);
    }

    context.emotionalState.currentMood = mood;
    context.emotionalState.confidence = confidence;
    context.lastActivity = new Date().toISOString();
    
    await this.saveContext(context);

    this.logger.info('Updated emotional state', {
      sessionId,
      mood,
      confidence
    });
  }

  /**
   * Clears conversation context (for session end or reset)
   */
  async clearContext(sessionId: string): Promise<void> {
    try {
      const key = this.getContextKey(sessionId);
      await this.redis.del(key);
      
      this.logger.info('Cleared conversation context', { sessionId });
    } catch (error) {
      this.logger.error('Failed to clear conversation context', {
        sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Checks if conversation context exists
   */
  async contextExists(sessionId: string): Promise<boolean> {
    try {
      const key = this.getContextKey(sessionId);
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error('Failed to check context existence', {
        sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      return false;
    }
  }

  /**
   * Handles conversation interruption by saving checkpoint
   */
  async saveInterruptionCheckpoint(sessionId: string, checkpointData: any): Promise<void> {
    const context = await this.getContext(sessionId);
    if (!context) {
      throw new Error(`Conversation context not found for session ${sessionId}`);
    }

    // Store checkpoint data in context metadata
    if (!context.metadata) {
      context.metadata = {};
    }
    
    context.metadata.interruptionCheckpoint = {
      timestamp: new Date().toISOString(),
      data: checkpointData
    };
    
    await this.saveContext(context);

    this.logger.info('Saved interruption checkpoint', {
      sessionId,
      checkpointType: checkpointData.type
    });
  }

  /**
   * Retrieves interruption checkpoint for conversation resumption
   */
  async getInterruptionCheckpoint(sessionId: string): Promise<any | null> {
    const context = await this.getContext(sessionId);
    if (!context || !context.metadata?.interruptionCheckpoint) {
      return null;
    }

    return context.metadata.interruptionCheckpoint.data;
  }

  /**
   * Generates Redis key for conversation context
   */
  private getContextKey(sessionId: string): string {
    return `${this.CONTEXT_PREFIX}${sessionId}`;
  }

  /**
   * Loads user preferences (placeholder - would integrate with user profile service)
   */
  private async loadUserPreferences(userId: string, locale: SupportedLocale): Promise<any> {
    // TODO: Integrate with user profile service to load actual preferences
    // For now, return default preferences based on locale
    
    const defaultVoiceSettings = {
      'en-US': { voice: 'en-US-AriaNeural', speed: 1.0, emotion: 'gentle' },
      'en-GB': { voice: 'en-GB-SoniaNeural', speed: 1.0, emotion: 'gentle' },
      'es-US': { voice: 'es-US-PalomaNeural', speed: 1.0, emotion: 'gentle' },
      'fr-FR': { voice: 'fr-FR-DeniseNeural', speed: 1.0, emotion: 'gentle' },
      'de-DE': { voice: 'de-DE-KatjaNeural', speed: 1.0, emotion: 'gentle' }
    };

    return {
      voiceSettings: {
        ...defaultVoiceSettings[locale] || defaultVoiceSettings['en-US'],
        volume: 0.8,
        clarity: 'high'
      },
      storyPreferences: {
        favoriteGenres: [],
        preferredLength: 'medium',
        complexityLevel: 'standard'
      },
      accessibilitySettings: {
        speechProcessingDelay: 0,
        vocabularyLevel: 'standard',
        attentionSpan: 300, // 5 minutes
        preferredInteractionStyle: 'detailed',
        assistiveTechnology: []
      }
    };
  }
}