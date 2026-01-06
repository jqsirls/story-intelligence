import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { StoryCreationService } from './StoryCreationService';
import { 
  StoryType, StoryBeat, StoryChoice, Story, StoryDraft 
} from '@alexa-multi-agent/shared-types';

export interface StoryConversationSession {
  id: string;
  userId: string;
  libraryId: string;
  characterId: string;
  storyType: StoryType;
  phase: 'setup' | 'creation' | 'editing' | 'finalization';
  currentBeat: number;
  storyDraft?: StoryDraft;
  conversationHistory: ConversationTurn[];
  choices: StoryChoice[];
  lastActivity: string;
  ageContext?: number;
}

export interface ConversationTurn {
  timestamp: string;
  speaker: 'user' | 'agent';
  content: string;
  type: 'story_beat' | 'choice_selection' | 'edit_request' | 'confirmation';
  metadata?: any;
}

export interface StoryConversationResponse {
  sessionId: string;
  agentResponse: string;
  storyBeat?: StoryBeat;
  choices: StoryChoice[];
  phase: string;
  isComplete: boolean;
  needsConfirmation?: boolean;
  confirmationType?: 'story_finalization' | 'character_change' | 'major_edit';
}

export class StoryConversationManager {
  private readonly SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds
  private readonly SESSION_PREFIX = 'story_conversation:';

  constructor(
    private redis: RedisClientType,
    private logger: Logger,
    private storyCreationService: StoryCreationService
  ) {}

  /**
   * Start a new story conversation session
   */
  async startStoryConversation(
    userId: string,
    libraryId: string,
    characterId: string,
    storyType: StoryType,
    ageContext?: number
  ): Promise<StoryConversationResponse> {
    this.logger.info('Starting story conversation', { 
      userId, 
      libraryId, 
      characterId, 
      storyType 
    });

    const sessionId = this.generateSessionId();
    
    // Create story draft
    const storyDraft = await this.storyCreationService.createStoryDraft({
      characterId,
      storyType,
      userAge: ageContext
    });

    // Initialize conversation session
    const session: StoryConversationSession = {
      id: sessionId,
      userId,
      libraryId,
      characterId,
      storyType,
      phase: 'setup',
      currentBeat: 0,
      storyDraft,
      conversationHistory: [],
      choices: storyDraft.choices,
      lastActivity: new Date().toISOString(),
      ageContext
    };

    await this.saveSession(session);

    // Generate opening response
    const agentResponse = await this.generateOpeningResponse(
      storyType,
      characterId,
      ageContext
    );

    // Add to conversation history
    await this.addConversationTurn(sessionId, {
      timestamp: new Date().toISOString(),
      speaker: 'agent',
      content: agentResponse,
      type: 'story_beat'
    });

    return {
      sessionId,
      agentResponse,
      choices: session.choices,
      phase: 'setup',
      isComplete: false
    };
  }

  /**
   * Continue story conversation with user input
   */
  async continueStoryConversation(
    sessionId: string,
    userInput: string,
    ageContext?: number
  ): Promise<StoryConversationResponse> {
    this.logger.info('Continuing story conversation', { 
      sessionId, 
      inputLength: userInput.length 
    });

    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Story conversation session not found');
    }

    // Add user input to conversation history
    await this.addConversationTurn(sessionId, {
      timestamp: new Date().toISOString(),
      speaker: 'user',
      content: userInput,
      type: 'choice_selection'
    });

    // Process user input based on current phase
    let response: StoryConversationResponse;

    switch (session.phase) {
      case 'setup':
        response = await this.handleSetupPhase(session, userInput);
        break;
      case 'creation':
        response = await this.handleCreationPhase(session, userInput);
        break;
      case 'editing':
        response = await this.handleEditingPhase(session, userInput);
        break;
      case 'finalization':
        response = await this.handleFinalizationPhase(session, userInput);
        break;
      default:
        throw new Error(`Unknown conversation phase: ${session.phase}`);
    }

    // Update session
    session.lastActivity = new Date().toISOString();
    await this.saveSession(session);

    // Add agent response to conversation history
    await this.addConversationTurn(sessionId, {
      timestamp: new Date().toISOString(),
      speaker: 'agent',
      content: response.agentResponse,
      type: 'story_beat'
    });

    return response;
  }

  /**
   * Handle setup phase (story beginning)
   */
  private async handleSetupPhase(
    session: StoryConversationSession,
    userInput: string
  ): Promise<StoryConversationResponse> {
    // Find matching choice or interpret free-form input
    const selectedChoice = this.findMatchingChoice(session.choices, userInput);
    
    // Generate first story beat
    const beatResult = await this.storyCreationService.continueStoryBeat({
      storyId: session.storyDraft!.id,
      userChoice: selectedChoice?.text || undefined,
      voiceInput: userInput
    });

    // Update session
    session.phase = 'creation';
    session.currentBeat = 1;
    session.choices = beatResult.choices;

    const agentResponse = await this.generateStoryBeatResponse(
      beatResult.beat,
      beatResult.choices,
      session.ageContext
    );

    return {
      sessionId: session.id,
      agentResponse,
      storyBeat: beatResult.beat,
      choices: beatResult.choices,
      phase: 'creation',
      isComplete: beatResult.isComplete
    };
  }

  /**
   * Handle creation phase (main story building)
   */
  private async handleCreationPhase(
    session: StoryConversationSession,
    userInput: string
  ): Promise<StoryConversationResponse> {
    // Check if user wants to edit something
    if (this.isEditRequest(userInput)) {
      session.phase = 'editing';
      return await this.handleEditingPhase(session, userInput);
    }

    // Continue with story beat
    const selectedChoice = this.findMatchingChoice(session.choices, userInput);
    
    const beatResult = await this.storyCreationService.continueStoryBeat({
      storyId: session.storyDraft!.id,
      userChoice: selectedChoice?.text || undefined,
      voiceInput: userInput
    });

    session.currentBeat++;
    session.choices = beatResult.choices;

    // Check if story is complete
    if (beatResult.isComplete) {
      session.phase = 'finalization';
      const agentResponse = await this.generateFinalizationPrompt(session.ageContext);
      
      return {
        sessionId: session.id,
        agentResponse,
        storyBeat: beatResult.beat,
        choices: [],
        phase: 'finalization',
        isComplete: false,
        needsConfirmation: true,
        confirmationType: 'story_finalization'
      };
    }

    const agentResponse = await this.generateStoryBeatResponse(
      beatResult.beat,
      beatResult.choices,
      session.ageContext
    );

    return {
      sessionId: session.id,
      agentResponse,
      storyBeat: beatResult.beat,
      choices: beatResult.choices,
      phase: 'creation',
      isComplete: false
    };
  }

  /**
   * Handle editing phase (voice-based story editing)
   */
  private async handleEditingPhase(
    session: StoryConversationSession,
    userInput: string
  ): Promise<StoryConversationResponse> {
    // Apply the edit
    const editResult = await this.storyCreationService.editStoryViaVoice({
      storyId: session.storyDraft!.id,
      voiceCommand: userInput
    });

    // Generate response about the edit
    const agentResponse = await this.generateEditConfirmationResponse(
      editResult,
      session.ageContext
    );

    // Return to creation phase
    session.phase = 'creation';

    return {
      sessionId: session.id,
      agentResponse,
      choices: session.choices,
      phase: 'creation',
      isComplete: false,
      needsConfirmation: true,
      confirmationType: 'major_edit'
    };
  }

  /**
   * Handle finalization phase (story completion)
   */
  private async handleFinalizationPhase(
    session: StoryConversationSession,
    userInput: string
  ): Promise<StoryConversationResponse> {
    const isConfirmed = this.isConfirmation(userInput);

    if (isConfirmed) {
      // Finalize the story
      const finalStory = await this.storyCreationService.finalizeStory(
        session.storyDraft!.id,
        true
      );

      const agentResponse = await this.generateCompletionResponse(
        finalStory,
        session.ageContext
      );

      return {
        sessionId: session.id,
        agentResponse,
        choices: [],
        phase: 'finalization',
        isComplete: true
      };
    } else {
      // User wants to continue editing
      session.phase = 'creation';
      const agentResponse = await this.generateContinueEditingResponse(session.ageContext);

      return {
        sessionId: session.id,
        agentResponse,
        choices: session.choices,
        phase: 'creation',
        isComplete: false
      };
    }
  }

  /**
   * Generate opening response for story conversation
   */
  private async generateOpeningResponse(
    storyType: StoryType,
    characterId: string,
    ageContext?: number
  ): Promise<string> {
    const ageAppropriateLanguage = this.getAgeAppropriateLanguage(ageContext);
    
    return `${ageAppropriateLanguage.greeting} I'm so excited to create a ${storyType.toLowerCase()} story with you! I can see you've created an amazing character. 

Let's start our adventure! Here are some ways we could begin our story. Which one sounds most exciting to you?`;
  }

  /**
   * Generate response for story beat with choices
   */
  private async generateStoryBeatResponse(
    beat: StoryBeat,
    choices: StoryChoice[],
    ageContext?: number
  ): Promise<string> {
    const ageAppropriateLanguage = this.getAgeAppropriateLanguage(ageContext);
    
    let response = beat.content + '\n\n';
    
    if (choices.length > 0) {
      response += `${ageAppropriateLanguage.choicePrompt} What would you like to do next?\n\n`;
      choices.forEach((choice, index) => {
        response += `${index + 1}. ${choice.text}\n`;
      });
      response += '\nOr tell me something else you\'d like to happen!';
    } else {
      response += `${ageAppropriateLanguage.excitement} What an amazing part of the story!`;
    }

    return response;
  }

  /**
   * Generate finalization prompt
   */
  private async generateFinalizationPrompt(ageContext?: number): Promise<string> {
    const ageAppropriateLanguage = this.getAgeAppropriateLanguage(ageContext);
    
    return `${ageAppropriateLanguage.excitement} What an amazing story we've created together! Your character has been on such an incredible journey.

Would you like me to save this story and create all the special things that go with it? I can make:
- Beautiful pictures for your story
- An audio version you can listen to
- Fun activities to do
- A book you can print and keep

Just say "yes" if you're happy with the story, or tell me if you'd like to change anything first!`;
  }

  /**
   * Generate edit confirmation response
   */
  private async generateEditConfirmationResponse(
    editResult: any,
    ageContext?: number
  ): Promise<string> {
    const ageAppropriateLanguage = this.getAgeAppropriateLanguage(ageContext);
    
    return `${ageAppropriateLanguage.confirmation} I've made those changes to your story! ${editResult.narrativeChanges.join(' ')}

How does that sound? Should we continue with the story, or would you like to make any other changes?`;
  }

  /**
   * Generate completion response
   */
  private async generateCompletionResponse(
    story: Story,
    ageContext?: number
  ): Promise<string> {
    const ageAppropriateLanguage = this.getAgeAppropriateLanguage(ageContext);
    
    return `${ageAppropriateLanguage.celebration} Wonderful! I'm saving your amazing story right now and creating all the special extras for you.

Your story "${story.title}" is going to be so special! I'm making beautiful pictures, recording the audio, creating fun activities, and preparing a book you can print.

You did such a great job creating this story! I hope you love reading it and sharing it with others. Your creativity is truly magical! ✨`;
  }

  /**
   * Generate continue editing response
   */
  private async generateContinueEditingResponse(ageContext?: number): Promise<string> {
    const ageAppropriateLanguage = this.getAgeAppropriateLanguage(ageContext);
    
    return `${ageAppropriateLanguage.encouragement} No problem! Let's keep working on your story to make it exactly how you want it.

What would you like to change or add to the story?`;
  }

  /**
   * Find matching choice from user input
   */
  private findMatchingChoice(choices: StoryChoice[], userInput: string): StoryChoice | null {
    const input = userInput.toLowerCase().trim();
    
    // Check for number selection (1, 2, 3, etc.)
    const numberMatch = input.match(/^(\d+)/);
    if (numberMatch) {
      const choiceIndex = parseInt(numberMatch[1]) - 1;
      if (choiceIndex >= 0 && choiceIndex < choices.length) {
        return choices[choiceIndex];
      }
    }

    // Check for keyword matching with better algorithm
    const inputWords = input.split(' ').filter(word => word.length > 2); // Filter out short words
    
    let bestMatch: StoryChoice | null = null;
    let bestScore = 0;
    
    for (const choice of choices) {
      const choiceWords = choice.text.toLowerCase().split(' ').filter(word => word.length > 2);
      let score = 0;
      
      for (const inputWord of inputWords) {
        for (const choiceWord of choiceWords) {
          if (choiceWord.includes(inputWord) || inputWord.includes(choiceWord)) {
            score += 1;
          }
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = choice;
      }
    }
    
    // Only return match if we have a reasonable confidence
    return bestScore >= 1 ? bestMatch : null;
  }

  /**
   * Check if user input is an edit request
   */
  private isEditRequest(userInput: string): boolean {
    const editKeywords = [
      'change', 'edit', 'modify', 'different', 'instead', 'actually',
      'wait', 'no', 'let me', 'can we', 'what if', 'make it'
    ];
    
    const input = userInput.toLowerCase();
    return editKeywords.some(keyword => input.includes(keyword));
  }

  /**
   * Check if user input is a confirmation
   */
  private isConfirmation(userInput: string): boolean {
    const confirmKeywords = [
      'yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'sounds good',
      'perfect', 'great', 'love it', 'finished', 'done', 'save it'
    ];
    
    const input = userInput.toLowerCase();
    return confirmKeywords.some(keyword => input.includes(keyword));
  }

  /**
   * Get age-appropriate language patterns
   */
  private getAgeAppropriateLanguage(ageContext?: number) {
    const age = ageContext || 5;
    
    if (age <= 4) {
      return {
        greeting: 'Hi there, little storyteller!',
        excitement: 'Wow!',
        choicePrompt: 'Ooh!',
        confirmation: 'Great job!',
        celebration: 'Yay!',
        encouragement: 'That\'s okay!'
      };
    } else if (age <= 7) {
      return {
        greeting: 'Hello, amazing storyteller!',
        excitement: 'This is so exciting!',
        choicePrompt: 'Now here\'s the fun part!',
        confirmation: 'Perfect!',
        celebration: 'Fantastic!',
        encouragement: 'No worries!'
      };
    } else {
      return {
        greeting: 'Hey there, creative writer!',
        excitement: 'This is incredible!',
        choicePrompt: 'Here\'s where it gets interesting!',
        confirmation: 'Excellent choice!',
        celebration: 'Outstanding work!',
        encouragement: 'That\'s totally fine!'
      };
    }
  }

  /**
   * Session management methods
   */
  private async saveSession(session: StoryConversationSession): Promise<void> {
    const key = `${this.SESSION_PREFIX}${session.id}`;
    await this.redis.setEx(key, this.SESSION_TTL, JSON.stringify(session));
  }

  private async getSession(sessionId: string): Promise<StoryConversationSession | null> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  private async addConversationTurn(sessionId: string, turn: ConversationTurn): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.conversationHistory.push(turn);
      await this.saveSession(session);
    }
  }

  /**
   * Get conversation session details
   */
  async getConversationSession(sessionId: string): Promise<StoryConversationSession | null> {
    return await this.getSession(sessionId);
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string): Promise<ConversationTurn[]> {
    const session = await this.getSession(sessionId);
    return session?.conversationHistory || [];
  }

  /**
   * End conversation session
   */
  async endConversationSession(sessionId: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    await this.redis.del(key);
    this.logger.info('Story conversation session ended', { sessionId });
  }

  /**
   * Get user's active story conversation sessions
   */
  async getUserConversationSessions(userId: string): Promise<StoryConversationSession[]> {
    const pattern = `${this.SESSION_PREFIX}*`;
    const keys = await this.redis.keys(pattern);
    
    const sessions: StoryConversationSession[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data);
        if (session.userId === userId) {
          sessions.push(session);
        }
      }
    }
    
    return sessions;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const pattern = `${this.SESSION_PREFIX}*`;
    const keys = await this.redis.keys(pattern);
    
    let cleaned = 0;
    const now = new Date();
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data);
        const lastActivity = new Date(session.lastActivity);
        const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceActivity > 24) {
          await this.redis.del(key);
          cleaned++;
        }
      }
    }
    
    return cleaned;
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(): Promise<{
    activeSessions: number;
    totalTurns: number;
    averageSessionLength: number;
  }> {
    const pattern = `${this.SESSION_PREFIX}*`;
    const keys = await this.redis.keys(pattern);
    
    let totalTurns = 0;
    let activeSessions = 0;
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data);
        activeSessions++;
        totalTurns += session.conversationHistory.length;
      }
    }
    
    return {
      activeSessions,
      totalTurns,
      averageSessionLength: activeSessions > 0 ? totalTurns / activeSessions : 0
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `story_conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}