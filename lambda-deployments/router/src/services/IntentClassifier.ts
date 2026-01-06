import OpenAI from 'openai';
import { Logger } from 'winston';
import {
  TurnContext,
  Intent,
  IntentType,
  StoryType,
  ConversationPhase,
  IntentClassificationFunction,
  ClassificationContext,
  RouterError,
  RouterErrorCode,
  StoryTypePrompt
} from '../types';

/**
 * Intent classification service using OpenAI function calling
 * Classifies user intents and maps to appropriate story types
 */
export class IntentClassifier {
  private openai: OpenAI | null = null;
  private storyTypePrompts: Map<StoryType, StoryTypePrompt>;

  constructor(
    private config: {
      apiKey: string;
      model: string;
      maxTokens: number;
      temperature: number;
    },
    private logger: Logger
  ) {
    // Don't initialize OpenAI client in constructor - lazy load it
    this.storyTypePrompts = this.initializeStoryTypePrompts();
  }

  /**
   * Get or create OpenAI client with current API key from config
   * This ensures we always use the latest API key, even if it was set after Router initialization
   */
  private getOpenAIClient(): OpenAI {
    // Always refresh if API key has changed or client doesn't exist
    const currentKey = this.config.apiKey || process.env.OPENAI_API_KEY || '';
    
    // DEBUG: Force console.log for CloudWatch
    console.log('[INTENT CLASSIFIER] getOpenAIClient called', {
      configApiKey: this.config.apiKey?.substring(0, 20),
      envApiKey: process.env.OPENAI_API_KEY?.substring(0, 20),
      currentKey: currentKey?.substring(0, 20),
      hasOpenai: !!this.openai
    });
    
    if (!this.openai || this.config.apiKey !== currentKey) {
      this.config.apiKey = currentKey;
      this.openai = new OpenAI({
        apiKey: currentKey,
      });
      console.log('[INTENT CLASSIFIER] OpenAI client created with key:', currentKey?.substring(0, 20));
      this.logger.info('OpenAI client initialized', { hasKey: !!currentKey, keyPrefix: currentKey.substring(0, 15) });
    }
    
    return this.openai;
  }

  /**
   * Classify user intent from turn context
   */
  async classifyIntent(
    turnContext: TurnContext,
    classificationContext?: ClassificationContext
  ): Promise<Intent> {
    try {
      this.logger.info('Classifying intent', {
        userId: turnContext.userId,
        sessionId: turnContext.sessionId,
        userInput: turnContext.userInput.substring(0, 100),
        currentPhase: turnContext.conversationPhase,
      });

      // Prepare the classification prompt
      const systemPrompt = this.buildSystemPrompt(classificationContext);
      const userPrompt = this.buildUserPrompt(turnContext, classificationContext);

      // Call OpenAI with function calling and retry logic
      // Note: temperature and max_completion_tokens omitted for model compatibility
      const response = await this.callOpenAIWithRetry({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        functions: [this.getIntentClassificationFunction()],
        function_call: { name: 'classify_intent' },
      });

      // Parse the function call response
      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'classify_intent') {
        throw new RouterError(
          RouterErrorCode.INTENT_CLASSIFICATION_FAILED,
          'OpenAI did not return a valid function call'
        );
      }

      const classificationResult = JSON.parse(functionCall.arguments);
      
      this.logger.debug('Parsed classification result', {
        result: classificationResult,
        userId: turnContext.userId,
        sessionId: turnContext.sessionId
      });
      
      // Validate and construct the intent
      const intent = this.constructIntent(classificationResult, turnContext);

      this.logger.info('Intent classified successfully', {
        userId: turnContext.userId,
        sessionId: turnContext.sessionId,
        intentType: intent.type,
        storyType: intent.storyType,
        confidence: intent.confidence,
        targetAgent: intent.targetAgent,
      });

      return intent;

    } catch (error) {
      this.logger.error('Intent classification failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: turnContext.userId,
        sessionId: turnContext.sessionId,
      });

      if (error instanceof RouterError) {
        throw error;
      }

      // Return fallback intent for unknown inputs
      return await this.getFallbackIntent(turnContext, classificationContext);
    }
  }

  /**
   * Get story type suggestions based on user input
   */
  async suggestStoryTypes(userInput: string, userAge?: number): Promise<StoryType[]> {
    const suggestions: StoryType[] = [];
    const inputLower = userInput.toLowerCase();

    // Check keywords for each story type
    this.storyTypePrompts.forEach((prompt, storyType) => {
      // Age appropriateness check
      if (userAge && (userAge < prompt.ageRange[0] || userAge > prompt.ageRange[1])) {
        return;
      }

      // Keyword matching
      const hasKeyword = prompt.keywords.some(keyword => 
        inputLower.includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        suggestions.push(storyType);
      }
    });

    // If no specific matches, return age-appropriate defaults
    if (suggestions.length === 0) {
      if (userAge && userAge <= 5) {
        suggestions.push(StoryType.BEDTIME, StoryType.ADVENTURE);
      } else if (userAge && userAge <= 8) {
        suggestions.push(StoryType.ADVENTURE, StoryType.EDUCATIONAL);
      } else {
        suggestions.push(StoryType.ADVENTURE, StoryType.MILESTONES);
      }
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Handle fallback for unrecognized intents
   */
  async handleUnrecognizedIntent(
    turnContext: TurnContext,
    classificationContext?: ClassificationContext
  ): Promise<Intent> {
    this.logger.warn('Handling unrecognized intent', {
      userId: turnContext.userId,
      userInput: turnContext.userInput.substring(0, 100),
      currentPhase: turnContext.conversationPhase,
    });

    // Check for multi-child switching patterns first
    const multiChildPatterns = [
      /this is for (\w+)/i,
      /(\w+)'s turn/i,
      /switch to (\w+)/i,
      /let (\w+) play/i,
      /(\w+) wants to/i,
      /for (\w+)/i,
      /make one for (\w+)/i,
      /create for (\w+)/i
    ];

    for (const pattern of multiChildPatterns) {
      const match = turnContext.userInput.match(pattern);
      if (match && match[1]) {
        return {
          type: IntentType.UNKNOWN, // Will be handled as multi-child switch
          targetAgent: 'library',
          confidence: 0.9,
          requiresAuth: true,
          parameters: {
            action: 'switch_child',
            childName: match[1]
          },
          conversationPhase: ConversationPhase.GREETING
        };
      }
    }

    // Check for story-related keywords
    const storyKeywords = ['story', 'tale', 'adventure', 'character', 'princess', 'knight', 'create', 'generate'];
    const hasStoryKeyword = storyKeywords.some(keyword => 
      turnContext.userInput.toLowerCase().includes(keyword)
    );

    // Determine fallback intent based on context
    let fallbackIntent = IntentType.UNKNOWN;
    let fallbackPhase = ConversationPhase.GREETING;
    let fallbackAgent: 'auth' | 'content' | 'library' | 'emotion' | 'commerce' | 'insights' | 'smarthome' | 'conversation' = 'content';

    if (hasStoryKeyword) {
      fallbackIntent = IntentType.CREATE_STORY;
      fallbackPhase = ConversationPhase.CHARACTER_CREATION;
      fallbackAgent = 'content';
    } else if (classificationContext?.currentPhase === ConversationPhase.CHARACTER_CREATION) {
      fallbackIntent = IntentType.CREATE_CHARACTER;
      fallbackPhase = ConversationPhase.CHARACTER_CREATION;
      fallbackAgent = 'content';
    } else if (classificationContext?.currentPhase === ConversationPhase.STORY_BUILDING) {
      fallbackIntent = IntentType.CONTINUE_STORY;
      fallbackPhase = ConversationPhase.STORY_BUILDING;
      fallbackAgent = 'content';
    }

    return {
      type: fallbackIntent,
      confidence: 0.2, // Low confidence for fallback
      parameters: {
        originalInput: turnContext.userInput,
        fallbackReason: 'Unrecognized intent - using contextual fallback',
        hasStoryKeyword: true,
        currentPhase: classificationContext?.currentPhase,
      },
      requiresAuth: this.requiresAuthentication(fallbackIntent),
      targetAgent: fallbackAgent,
      conversationPhase: fallbackPhase,
    };
  }

  /**
   * Validate intent classification result
   */
  validateClassification(result: any, turnContext: TurnContext): boolean {
    // Check required fields
    if (!result.intent_type || typeof result.confidence !== 'number') {
      this.logger.debug('Validation failed: missing intent_type or confidence', {
        result,
        userId: turnContext.userId,
        sessionId: turnContext.sessionId
      });
      return false;
    }

    // Check confidence range
    if (result.confidence < 0 || result.confidence > 1) {
      this.logger.debug('Validation failed: confidence out of range', {
        confidence: result.confidence,
        userId: turnContext.userId,
        sessionId: turnContext.sessionId
      });
      return false;
    }

    // Check valid intent type
    if (!Object.values(IntentType).includes(result.intent_type)) {
      this.logger.debug('Validation failed: invalid intent type', {
        intent_type: result.intent_type,
        validIntentTypes: Object.values(IntentType),
        userId: turnContext.userId,
        sessionId: turnContext.sessionId
      });
      return false;
    }

    // Check story type if provided
    if (result.story_type && !Object.values(StoryType).includes(result.story_type)) {
      return false;
    }

    return true;
  }

  /**
   * Private helper methods
   */

  private async callOpenAIWithRetry(params: any, maxRetries: number = 3): Promise<any> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Use direct HTTP instead of SDK to ensure API key is always fresh from env
        const apiKey = process.env.OPENAI_API_KEY || this.config.apiKey || '';
        const authHeader = `Bearer ${apiKey}`;
        console.log('[OPENAI DIRECT] API Key from env:', !!process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEY?.substring(0, 20));
        console.log('[OPENAI DIRECT] API Key final:', apiKey?.substring(0, 20), 'length:', apiKey?.length);
        console.log('[OPENAI DIRECT] Authorization header:', authHeader.substring(0, 30));
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(params)
        });

        console.log('[OPENAI DIRECT] Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json() as any;
        console.log('[OPENAI DIRECT] Success:', { hasChoices: !!data.choices });
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        this.logger.warn('OpenAI API call failed', {
          attempt,
          maxRetries,
          error: lastError.message,
        });

        // Don't retry on certain error types
        if (lastError.message.includes('invalid_api_key') || 
            lastError.message.includes('insufficient_quota')) {
          throw new RouterError(
            RouterErrorCode.INTENT_CLASSIFICATION_FAILED,
            `OpenAI API error: ${lastError.message}`
          );
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new RouterError(
      RouterErrorCode.INTENT_CLASSIFICATION_FAILED,
      `OpenAI API failed after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  private buildSystemPrompt(context?: ClassificationContext): string {
    const storyTypes = Array.from(this.storyTypePrompts.values())
      .map(prompt => `- ${prompt.name}: ${prompt.description}`)
      .join('\n');

    return `You are an expert intent classifier for a children's storytelling AI assistant. Your job is to understand what children and parents want to do and classify their intent accurately.

STORY TYPES AVAILABLE:
${storyTypes}

CONVERSATION PHASES:
- greeting: Initial interaction, welcoming the user
- emotion_check: Checking how the child is feeling today
- character_creation: Creating or editing story characters
- story_building: Building the story narrative with user choices
- story_editing: Making changes to existing story content
- asset_generation: Confirming and generating story assets (art, audio, PDF)
- completion: Wrapping up the session

INTENT CLASSIFICATION RULES:
1. Always prioritize story creation intents when users mention making, creating, or telling stories
2. Detect story type from keywords, context, and user age appropriateness
3. Consider the current conversation phase when classifying intents
4. Use high confidence (0.8+) for clear intents, lower confidence for ambiguous inputs
5. Default to 'unknown' intent with low confidence if truly unclear
6. Detect Hue/smart home connection intents when users mention connecting lights, Hue, smart home, or lighting
7. Detect conversational storytelling intents when users want real-time interactive stories or voice conversations

CONTEXT AWARENESS:
${context ? `
- Current phase: ${context.currentPhase}
- Previous intents: ${context.previousIntents.join(', ')}
- User profile: ${JSON.stringify(context.userProfile || {})}
` : 'No additional context provided'}

Classify the user's intent and provide appropriate parameters.`;
  }

  private buildUserPrompt(turnContext: TurnContext, context?: ClassificationContext): string {
    let prompt = `User Input: "${turnContext.userInput}"

Channel: ${turnContext.channel}
Device Type: ${turnContext.deviceType || 'unknown'}
Locale: ${turnContext.locale}`;

    if (turnContext.conversationPhase) {
      prompt += `\nCurrent Conversation Phase: ${turnContext.conversationPhase}`;
    }

    if (turnContext.previousIntent) {
      prompt += `\nPrevious Intent: ${turnContext.previousIntent}`;
    }

    if (context?.conversationHistory && context.conversationHistory.length > 0) {
      prompt += `\nRecent Conversation History:\n${context.conversationHistory.slice(-3).join('\n')}`;
    }

    prompt += '\n\nPlease classify this intent and provide the appropriate parameters.';

    return prompt;
  }

  private getIntentClassificationFunction(): IntentClassificationFunction {
    return {
      name: 'classify_intent',
      description: 'Classify user intent for storytelling conversation',
      parameters: {
        type: 'object',
        properties: {
          intent_type: {
            type: 'string',
            enum: Object.values(IntentType),
            description: 'The primary intent of the user input',
          },
          story_type: {
            type: 'string',
            enum: Object.values(StoryType),
            description: 'The type of story if creating or continuing a story',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence score for the classification (0.0 to 1.0)',
          },
          parameters: {
            type: 'object',
            description: 'Additional parameters extracted from the input',
          },
          conversation_phase: {
            type: 'string',
            enum: Object.values(ConversationPhase),
            description: 'The expected conversation phase after this intent',
          },
        },
        required: ['intent_type', 'confidence'],
      },
    };
  }

  private constructIntent(result: any, turnContext: TurnContext): Intent {
    if (!this.validateClassification(result, turnContext)) {
      throw new RouterError(
        RouterErrorCode.INTENT_CLASSIFICATION_FAILED,
        'Invalid classification result from OpenAI'
      );
    }

    const intentType = result.intent_type as IntentType;
    const targetAgent = this.getTargetAgent(intentType);
    const requiresAuth = this.requiresAuthentication(intentType);

    return {
      type: intentType,
      confidence: result.confidence,
      storyType: result.story_type as StoryType,
      parameters: result.parameters || {},
      requiresAuth,
      targetAgent,
      conversationPhase: result.conversation_phase as ConversationPhase,
    };
  }

  private getTargetAgent(intentType: IntentType): 'auth' | 'content' | 'library' | 'emotion' | 'commerce' | 'insights' | 'smarthome' | 'conversation' {
    switch (intentType) {
      case IntentType.ACCOUNT_LINKING:
        return 'auth';
      
      case IntentType.CREATE_STORY:
      case IntentType.CONTINUE_STORY:
      case IntentType.EDIT_STORY:
      case IntentType.FINISH_STORY:
      case IntentType.CREATE_CHARACTER:
      case IntentType.EDIT_CHARACTER:
      case IntentType.CONFIRM_CHARACTER:
        return 'content';
      
      case IntentType.VIEW_LIBRARY:
      case IntentType.SHARE_STORY:
      case IntentType.DELETE_STORY:
        return 'library';
      
      case IntentType.EMOTION_CHECKIN:
      case IntentType.MOOD_UPDATE:
        return 'emotion';
      
      case IntentType.SUBSCRIPTION_MANAGEMENT:
        return 'commerce';
      
      case IntentType.CONNECT_HUE:
      case IntentType.HUE_STATUS:
      case IntentType.CONTROL_LIGHTS:
        return 'smarthome';
      
      case IntentType.START_CONVERSATION:
      case IntentType.CONTINUE_CONVERSATION:
      case IntentType.END_CONVERSATION:
      case IntentType.RESUME_CONVERSATION:
        return 'conversation';
      
      default:
        return 'content'; // Default to content agent for general conversation
    }
  }

  private requiresAuthentication(intentType: IntentType): boolean {
    const authRequiredIntents = [
      IntentType.CREATE_STORY,
      IntentType.CONTINUE_STORY,
      IntentType.EDIT_STORY,
      IntentType.FINISH_STORY,
      IntentType.VIEW_LIBRARY,
      IntentType.SHARE_STORY,
      IntentType.DELETE_STORY,
      IntentType.EMOTION_CHECKIN,
      IntentType.SUBSCRIPTION_MANAGEMENT,
    ];

    return authRequiredIntents.includes(intentType);
  }

  private async getFallbackIntent(turnContext: TurnContext, classificationContext?: ClassificationContext): Promise<Intent> {
    // Use the enhanced fallback handler
    return this.handleUnrecognizedIntent(turnContext, classificationContext);
  }

  private initializeStoryTypePrompts(): Map<StoryType, StoryTypePrompt> {
    const prompts = new Map<StoryType, StoryTypePrompt>();

    prompts.set(StoryType.ADVENTURE, {
      type: StoryType.ADVENTURE,
      name: 'Adventure',
      description: 'Exciting journeys with quests, exploration, and heroic challenges',
      ageRange: [4, 12],
      keywords: ['adventure', 'quest', 'journey', 'explore', 'treasure', 'hero', 'brave', 'exciting'],
      examples: ['Let\'s go on an adventure!', 'I want to find treasure', 'Can we explore a jungle?'],
      conversationStarters: ['What kind of adventure should we go on?', 'Where would you like to explore?'],
    });

    prompts.set(StoryType.BEDTIME, {
      type: StoryType.BEDTIME,
      name: 'Bedtime',
      description: 'Calm, soothing stories perfect for winding down before sleep',
      ageRange: [2, 8],
      keywords: ['bedtime', 'sleep', 'sleepy', 'tired', 'calm', 'peaceful', 'dream', 'night'],
      examples: ['Tell me a bedtime story', 'I\'m sleepy', 'Something calm please'],
      conversationStarters: ['Let\'s create a peaceful bedtime story', 'What helps you feel calm?'],
    });

    prompts.set(StoryType.BIRTHDAY, {
      type: StoryType.BIRTHDAY,
      name: 'Birthday',
      description: 'Celebratory stories about birthdays, parties, and special occasions',
      ageRange: [3, 10],
      keywords: ['birthday', 'party', 'celebration', 'cake', 'presents', 'special day', 'celebrate'],
      examples: ['It\'s my birthday!', 'I want a birthday story', 'Let\'s have a party'],
      conversationStarters: ['Tell me about your birthday!', 'What makes birthdays special?'],
    });

    prompts.set(StoryType.EDUCATIONAL, {
      type: StoryType.EDUCATIONAL,
      name: 'Educational',
      description: 'Learning-focused stories that teach concepts, facts, or skills',
      ageRange: [4, 12],
      keywords: ['learn', 'teach', 'school', 'science', 'math', 'history', 'educational', 'study'],
      examples: ['I want to learn about space', 'Teach me about animals', 'Something educational'],
      conversationStarters: ['What would you like to learn about?', 'Let\'s explore something new!'],
    });

    prompts.set(StoryType.FINANCIAL_LITERACY, {
      type: StoryType.FINANCIAL_LITERACY,
      name: 'Financial Literacy',
      description: 'Stories that teach money management, saving, and financial responsibility',
      ageRange: [6, 14],
      keywords: ['money', 'save', 'spend', 'buy', 'allowance', 'bank', 'budget', 'financial'],
      examples: ['I want to learn about money', 'How do I save money?', 'What is a bank?'],
      conversationStarters: ['Let\'s learn about money!', 'What do you know about saving?'],
    });

    prompts.set(StoryType.LANGUAGE_LEARNING, {
      type: StoryType.LANGUAGE_LEARNING,
      name: 'Language Learning',
      description: 'Stories that incorporate language learning and cultural exploration',
      ageRange: [4, 12],
      keywords: ['language', 'spanish', 'french', 'learn language', 'translate', 'culture', 'words'],
      examples: ['Teach me Spanish', 'I want to learn French', 'Different languages'],
      conversationStarters: ['What language interests you?', 'Let\'s explore different cultures!'],
    });

    prompts.set(StoryType.MEDICAL_BRAVERY, {
      type: StoryType.MEDICAL_BRAVERY,
      name: 'Medical Bravery',
      description: 'Stories that help children cope with medical situations and build courage',
      ageRange: [3, 10],
      keywords: ['doctor', 'hospital', 'medicine', 'brave', 'checkup', 'surgery', 'medical', 'healing'],
      examples: ['I\'m going to the doctor', 'I need to be brave', 'Hospital story'],
      conversationStarters: ['Let\'s talk about being brave', 'What makes you feel strong?'],
    });

    prompts.set(StoryType.MENTAL_HEALTH, {
      type: StoryType.MENTAL_HEALTH,
      name: 'Mental Health',
      description: 'Stories that address emotions, feelings, and mental wellness',
      ageRange: [4, 12],
      keywords: ['feelings', 'emotions', 'sad', 'happy', 'worried', 'anxious', 'mental health', 'cope'],
      examples: ['I feel sad', 'I\'m worried about something', 'Help with feelings'],
      conversationStarters: ['How are you feeling today?', 'Let\'s talk about emotions'],
    });

    prompts.set(StoryType.MILESTONES, {
      type: StoryType.MILESTONES,
      name: 'Milestones',
      description: 'Stories about growing up, achievements, and life transitions',
      ageRange: [5, 14],
      keywords: ['growing up', 'milestone', 'achievement', 'first day', 'graduation', 'accomplishment'],
      examples: ['First day of school', 'I learned to ride a bike', 'Growing up story'],
      conversationStarters: ['What are you proud of?', 'Tell me about something new you learned'],
    });

    prompts.set(StoryType.NEW_CHAPTER_SEQUEL, {
      type: StoryType.NEW_CHAPTER_SEQUEL,
      name: 'New Chapter Sequel',
      description: 'Continuing stories with existing characters in new adventures',
      ageRange: [4, 12],
      keywords: ['continue', 'sequel', 'next chapter', 'more', 'again', 'same character'],
      examples: ['Continue the story', 'What happens next?', 'More adventures with Luna'],
      conversationStarters: ['What should happen next?', 'Let\'s continue our story!'],
    });

    prompts.set(StoryType.TECH_READINESS, {
      type: StoryType.TECH_READINESS,
      name: 'Tech Readiness',
      description: 'Stories about technology, digital citizenship, and online safety',
      ageRange: [6, 14],
      keywords: ['technology', 'computer', 'internet', 'online', 'digital', 'coding', 'robots'],
      examples: ['I want to learn about computers', 'What is the internet?', 'Technology story'],
      conversationStarters: ['What technology interests you?', 'Let\'s explore the digital world!'],
    });

    return prompts;
  }
}