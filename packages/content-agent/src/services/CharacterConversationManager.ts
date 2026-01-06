import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { CharacterGenerationService, CharacterGenerationRequest, CharacterGenerationResult, ConversationTurn, CharacterGenerationPhase } from './CharacterGenerationService';
import { CharacterDatabaseService } from './CharacterDatabaseService';
import { Character } from '@alexa-multi-agent/shared-types';

export interface CharacterConversationSession {
  sessionId: string;
  userId: string;
  libraryId: string;
  currentPhase: CharacterGenerationPhase;
  conversationHistory: ConversationTurn[];
  extractedTraits: any;
  createdAt: string;
  updatedAt: string;
  isComplete: boolean;
  characterId?: string;
}

export interface ConversationResponse {
  sessionId: string;
  response: string;
  phase: CharacterGenerationPhase;
  isComplete: boolean;
  character?: Character;
  suggestedQuestions?: string[];
  needsValidation?: boolean;
  validationIssues?: string[];
}

export class CharacterConversationManager {
  private redis: RedisClientType;
  private logger: Logger;
  private characterService: CharacterGenerationService;
  private characterDatabase?: CharacterDatabaseService;
  private readonly SESSION_TTL = 3600; // 1 hour

  constructor(
    redis: RedisClientType,
    logger: Logger,
    characterService: CharacterGenerationService,
    characterDatabase?: CharacterDatabaseService
  ) {
    this.redis = redis;
    this.logger = logger;
    this.characterService = characterService;
    this.characterDatabase = characterDatabase;
  }

  /**
   * Start a new character creation conversation
   */
  async startCharacterConversation(
    userId: string,
    libraryId: string,
    ageContext?: number
  ): Promise<ConversationResponse> {
    const sessionId = `char_conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: CharacterConversationSession = {
      sessionId,
      userId,
      libraryId,
      currentPhase: 'greeting',
      conversationHistory: [],
      extractedTraits: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isComplete: false
    };

    // Process initial greeting
    const request: CharacterGenerationRequest = {
      userId,
      sessionId,
      libraryId,
      conversationHistory: [],
      currentPhase: 'greeting',
      ageContext
    };

    const result = await this.characterService.processCharacterGeneration(request);
    
    // Update session with result
    session.currentPhase = result.nextPhase || result.phase;
    session.extractedTraits = result.extractedTraits;
    session.conversationHistory.push({
      speaker: 'assistant',
      message: result.response,
      timestamp: new Date().toISOString()
    });

    // Store session
    await this.storeSession(session);

    this.logger.info('Character conversation started', {
      sessionId,
      userId,
      libraryId,
      phase: session.currentPhase
    });

    return {
      sessionId,
      response: result.response,
      phase: result.phase,
      isComplete: result.isComplete,
      suggestedQuestions: result.suggestedQuestions,
      needsValidation: result.needsValidation,
      validationIssues: result.validationIssues
    };
  }

  /**
   * Continue character conversation with user input
   */
  async continueCharacterConversation(
    sessionId: string,
    userInput: string,
    ageContext?: number
  ): Promise<ConversationResponse> {
    // Get existing session
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Character conversation session not found');
    }

    // Add user input to conversation history
    session.conversationHistory.push({
      speaker: 'user',
      message: userInput,
      timestamp: new Date().toISOString()
    });

    // Process with character service
    const request: CharacterGenerationRequest = {
      userId: session.userId,
      sessionId,
      libraryId: session.libraryId,
      conversationHistory: session.conversationHistory,
      currentPhase: session.currentPhase,
      userInput,
      ageContext
    };

    const result = await this.characterService.processCharacterGeneration(request);

    // Update session
    session.currentPhase = result.nextPhase || result.phase;
    session.extractedTraits = { ...session.extractedTraits, ...result.extractedTraits };
    session.updatedAt = new Date().toISOString();
    session.isComplete = result.isComplete;

    // Add assistant response to history
    session.conversationHistory.push({
      speaker: 'assistant',
      message: result.response,
      timestamp: new Date().toISOString(),
      extractedData: result.extractedTraits
    });

    let character: Character | undefined;

    // Create character if complete
    if (result.isComplete && session.currentPhase === 'complete') {
      try {
        if (this.characterDatabase) {
          // Use database service to create and persist character
          character = await this.characterDatabase.createCharacter({
            libraryId: session.libraryId,
            name: session.extractedTraits.name || 'Unnamed Character',
            traits: session.extractedTraits,
            artPrompt: await this.generateArtPrompt(session.extractedTraits)
          });
        } else {
          // Fallback to generation service only
          character = await this.characterService.createCharacterFromTraits(
            session.extractedTraits,
            session.libraryId,
            session.userId
          );
        }
        
        session.characterId = character.id;
        
        this.logger.info('Character created from conversation', {
          sessionId,
          characterId: character.id,
          characterName: character.name
        });
      } catch (error) {
        this.logger.error('Error creating character from conversation', { error, sessionId });
      }
    }

    // Store updated session
    await this.storeSession(session);

    this.logger.info('Character conversation continued', {
      sessionId,
      phase: session.currentPhase,
      isComplete: session.isComplete,
      characterCreated: !!character
    });

    return {
      sessionId,
      response: result.response,
      phase: result.phase,
      isComplete: result.isComplete,
      character,
      suggestedQuestions: result.suggestedQuestions,
      needsValidation: result.needsValidation,
      validationIssues: result.validationIssues
    };
  }

  /**
   * Get conversation session
   */
  async getConversationSession(sessionId: string): Promise<CharacterConversationSession | null> {
    return await this.getSession(sessionId);
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string): Promise<ConversationTurn[]> {
    const session = await this.getSession(sessionId);
    return session?.conversationHistory || [];
  }

  /**
   * Reset conversation to a specific phase
   */
  async resetConversationPhase(
    sessionId: string,
    phase: CharacterGenerationPhase
  ): Promise<ConversationResponse> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Character conversation session not found');
    }

    // Reset to specified phase
    session.currentPhase = phase;
    session.isComplete = false;
    session.updatedAt = new Date().toISOString();

    // Add reset message to history
    session.conversationHistory.push({
      speaker: 'assistant',
      message: `Let's go back and work on the ${phase.replace('_', ' ')} part of your character.`,
      timestamp: new Date().toISOString()
    });

    await this.storeSession(session);

    return {
      sessionId,
      response: `Let's go back and work on the ${phase.replace('_', ' ')} part of your character. What would you like to change?`,
      phase,
      isComplete: false,
      suggestedQuestions: this.getPhaseQuestions(phase)
    };
  }

  /**
   * End conversation session
   */
  async endConversationSession(sessionId: string): Promise<void> {
    await this.redis.del(this.getSessionKey(sessionId));
    this.logger.info('Character conversation session ended', { sessionId });
  }

  /**
   * Get active conversation sessions for a user
   */
  async getUserConversationSessions(userId: string): Promise<CharacterConversationSession[]> {
    const pattern = `char_conv:*`;
    const keys = await this.redis.keys(pattern);
    const sessions: CharacterConversationSession[] = [];

    for (const key of keys) {
      try {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session: CharacterConversationSession = JSON.parse(sessionData);
          if (session.userId === userId) {
            sessions.push(session);
          }
        }
      } catch (error) {
        this.logger.warn('Error parsing session data', { key, error });
      }
    }

    return sessions.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const pattern = `char_conv:*`;
    const keys = await this.redis.keys(pattern);
    let cleaned = 0;

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    for (const key of keys) {
      try {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session: CharacterConversationSession = JSON.parse(sessionData);
          if (session.updatedAt < oneHourAgo && !session.isComplete) {
            await this.redis.del(key);
            cleaned++;
          }
        }
      } catch (error) {
        // Delete corrupted sessions
        await this.redis.del(key);
        cleaned++;
      }
    }

    this.logger.info('Character conversation cleanup completed', { cleaned });
    return cleaned;
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    averageConversationLength: number;
    phaseDistribution: Record<CharacterGenerationPhase, number>;
  }> {
    const pattern = `char_conv:*`;
    const keys = await this.redis.keys(pattern);
    
    let totalSessions = 0;
    let activeSessions = 0;
    let completedSessions = 0;
    let totalTurns = 0;
    const phaseDistribution: Record<CharacterGenerationPhase, number> = {
      greeting: 0,
      basic_traits: 0,
      species_selection: 0,
      appearance_details: 0,
      personality_traits: 0,
      inclusivity_traits: 0,
      validation: 0,
      confirmation: 0,
      complete: 0
    };

    for (const key of keys) {
      try {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session: CharacterConversationSession = JSON.parse(sessionData);
          totalSessions++;
          totalTurns += session.conversationHistory.length;
          
          if (session.isComplete) {
            completedSessions++;
          } else {
            activeSessions++;
          }
          
          phaseDistribution[session.currentPhase]++;
        }
      } catch (error) {
        // Skip corrupted sessions
      }
    }

    return {
      totalSessions,
      activeSessions,
      completedSessions,
      averageConversationLength: totalSessions > 0 ? totalTurns / totalSessions : 0,
      phaseDistribution
    };
  }

  private async storeSession(session: CharacterConversationSession): Promise<void> {
    const key = this.getSessionKey(session.sessionId);
    await this.redis.setEx(key, this.SESSION_TTL, JSON.stringify(session));
  }

  private async getSession(sessionId: string): Promise<CharacterConversationSession | null> {
    const key = this.getSessionKey(sessionId);
    const sessionData = await this.redis.get(key);
    
    if (!sessionData) {
      return null;
    }

    try {
      return JSON.parse(sessionData);
    } catch (error) {
      this.logger.error('Error parsing session data', { sessionId, error });
      return null;
    }
  }

  private getSessionKey(sessionId: string): string {
    return `char_conv:${sessionId}`;
  }

  private getPhaseQuestions(phase: CharacterGenerationPhase): string[] {
    const questions: Record<CharacterGenerationPhase, string[]> = {
      greeting: ["What should we call your character?", "Tell me about your character!"],
      basic_traits: ["What's your character's name?", "How old are they?"],
      species_selection: ["Is your character human, animal, or something magical?"],
      appearance_details: ["What do they look like?", "What color are their eyes?"],
      personality_traits: ["What is your character like?", "Are they brave, funny, or kind?"],
      inclusivity_traits: ["Is there anything special about your character?"],
      validation: ["Does this look right?", "Should we change anything?"],
      confirmation: ["Should we create this character?", "Does everything look good?"],
      complete: ["Great! Your character is ready!"]
    };

    return questions[phase] || ["Tell me more!"];
  }

  /**
   * Generate art prompt for character visualization
   */
  private async generateArtPrompt(traits: any): Promise<string> {
    const elements = [];
    
    // Basic description
    elements.push(`${traits.age || 'young'} ${traits.species || 'human'}`);
    
    // Appearance
    if (traits.appearance?.eyeColor) elements.push(`${traits.appearance.eyeColor} eyes`);
    if (traits.appearance?.hairColor) elements.push(`${traits.appearance.hairColor} hair`);
    if (traits.appearance?.clothing) elements.push(`wearing ${traits.appearance.clothing}`);
    
    // Personality reflected in pose/expression
    if (traits.personality?.includes('brave')) elements.push('confident pose');
    if (traits.personality?.includes('kind')) elements.push('warm smile');
    if (traits.personality?.includes('shy')) elements.push('gentle expression');
    
    // Style
    elements.push('children\'s book illustration style');
    elements.push('friendly and approachable');
    elements.push('colorful and vibrant');
    
    return elements.join(', ');
  }
}