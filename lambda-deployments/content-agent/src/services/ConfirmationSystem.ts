import { Logger } from 'winston';
import OpenAI from 'openai';
import { RedisClientType } from 'redis';

export interface ConfirmationRequest {
  sessionId: string;
  userId: string;
  userInput: string;
  confirmationType: 'character_finalization' | 'story_finalization' | 'character_change' | 'story_edit' | 'asset_generation';
  context: ConfirmationContext;
  previousAttempts?: number;
}

export interface ConfirmationContext {
  itemBeingConfirmed: any; // Character, story, or edit details
  conversationHistory: string[];
  ageContext?: number;
  currentPhase: string;
  relatedData?: any; // Additional context for confirmation
}

export interface ConfirmationResult {
  confirmed: boolean;
  confidence: number;
  interpretation: 'explicit_yes' | 'explicit_no' | 'ambiguous' | 'partial' | 'retraction' | 'unclear';
  clarificationNeeded?: string;
  suggestedAction?: string;
  partialConfirmation?: {
    confirmedAspects: string[];
    unconfirmedAspects: string[];
    needsClarification: string[];
  };
  defaultBehavior?: 'proceed' | 'wait' | 'clarify' | 'cancel';
}

export interface ConfirmationRetraction {
  sessionId: string;
  originalConfirmation: any;
  retractionReason: string;
  affectedItems: string[];
  rollbackRequired: boolean;
}

export class ConfirmationSystem {
  private openai: OpenAI;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(openai: OpenAI, redis: RedisClientType, logger: Logger) {
    this.openai = openai;
    this.redis = redis;
    this.logger = logger;
  }

  /**
   * Process user confirmation with sophisticated interpretation
   */
  async processConfirmation(request: ConfirmationRequest): Promise<ConfirmationResult> {
    this.logger.info('Processing confirmation request', {
      sessionId: request.sessionId,
      confirmationType: request.confirmationType,
      attempts: request.previousAttempts || 0
    });

    try {
      // First, detect basic confirmation patterns
      const basicResult = this.detectBasicConfirmation(request.userInput, request.context.ageContext);
      
      // If basic detection is confident, use it
      if (basicResult.confidence > 0.8) {
        return this.enhanceBasicResult(basicResult, request);
      }

      // For ambiguous cases, use AI interpretation
      const aiResult = await this.interpretWithAI(request);
      
      // Combine results and determine final interpretation
      const finalResult = this.combineResults(basicResult, aiResult, request);
      
      // Cache the result for consistency
      await this.cacheConfirmationResult(request.sessionId, finalResult);
      
      return finalResult;
    } catch (error) {
      this.logger.error('Error processing confirmation', {
        sessionId: request.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return safe default
      return this.getDefaultConfirmationResult(request);
    }
  }

  /**
   * Handle partial confirmations with intelligent completion
   */
  async handlePartialConfirmation(
    sessionId: string,
    partialResult: ConfirmationResult,
    context: ConfirmationContext
  ): Promise<{
    completionSuggestion: string;
    missingElements: string[];
    proceedWithPartial: boolean;
    clarificationPrompt: string;
  }> {
    this.logger.info('Handling partial confirmation', { sessionId });

    if (!partialResult.partialConfirmation) {
      throw new Error('No partial confirmation data provided');
    }

    const { confirmedAspects, unconfirmedAspects, needsClarification } = partialResult.partialConfirmation;

    // Determine if we can proceed with partial confirmation
    const criticalAspects = this.identifyCriticalAspects(context.itemBeingConfirmed, context.currentPhase);
    const criticalMissing = unconfirmedAspects.filter(aspect => criticalAspects.includes(aspect));
    
    const proceedWithPartial = criticalMissing.length === 0;

    // Generate intelligent completion suggestions
    const completionSuggestion = await this.generateCompletionSuggestion(
      confirmedAspects,
      unconfirmedAspects,
      context
    );

    // Create age-appropriate clarification prompt
    const clarificationPrompt = this.generateClarificationPrompt(
      needsClarification,
      context.ageContext
    );

    return {
      completionSuggestion,
      missingElements: unconfirmedAspects,
      proceedWithPartial,
      clarificationPrompt
    };
  }

  /**
   * Handle confirmation retraction with graceful updates
   */
  async handleConfirmationRetraction(retraction: ConfirmationRetraction): Promise<{
    rollbackPlan: RollbackPlan;
    userNotification: string;
    alternativeOptions: string[];
  }> {
    this.logger.info('Handling confirmation retraction', {
      sessionId: retraction.sessionId,
      reason: retraction.retractionReason
    });

    // Create rollback plan
    const rollbackPlan = await this.createRollbackPlan(retraction);
    
    // Generate user-friendly notification
    const userNotification = this.generateRetractionNotification(
      retraction.retractionReason,
      retraction.affectedItems
    );

    // Suggest alternative options
    const alternativeOptions = await this.generateAlternativeOptions(retraction);

    return {
      rollbackPlan,
      userNotification,
      alternativeOptions
    };
  }

  /**
   * Create context-aware confirmation interpretation
   */
  async createContextAwareInterpretation(
    userInput: string,
    context: ConfirmationContext
  ): Promise<{
    interpretation: string;
    confidence: number;
    contextFactors: string[];
    ageAdjustments: string[];
  }> {
    const prompt = `
You are helping interpret a child's confirmation response in a storytelling context.

Context:
- Current phase: ${context.currentPhase}
- Child's age: ${context.ageContext || 'unknown'}
- Item being confirmed: ${JSON.stringify(context.itemBeingConfirmed, null, 2)}
- Recent conversation: ${context.conversationHistory.slice(-3).join('\n')}

Child's response: "${userInput}"

Consider:
1. Age-appropriate language patterns
2. Enthusiasm vs hesitation
3. Specific vs general responses
4. Context of what's being confirmed
5. Previous conversation flow

Provide interpretation with confidence score (0-1) and explain your reasoning.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_CONVERSATION || process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content || '';
      
      // Parse the AI response (simplified - would need more robust parsing)
      const interpretation = this.parseAIInterpretation(content);
      
      return interpretation;
    } catch (error) {
      this.logger.error('Error in AI interpretation', { error });
      return {
        interpretation: 'unclear',
        confidence: 0.3,
        contextFactors: ['ai_error'],
        ageAdjustments: []
      };
    }
  }

  /**
   * Build default behavior engine for unclear confirmations
   */
  getDefaultBehavior(
    confirmationType: string,
    context: ConfirmationContext,
    attempts: number = 0
  ): 'proceed' | 'wait' | 'clarify' | 'cancel' {
    // Safety-first approach for children
    if (context.ageContext && context.ageContext < 6) {
      // Younger children - be more permissive but safe
      if (attempts < 2) return 'clarify';
      return 'proceed'; // Assume positive intent after clarification attempts
    }

    // Different defaults based on confirmation type
    switch (confirmationType) {
      case 'character_finalization':
        return attempts < 3 ? 'clarify' : 'proceed';
      
      case 'story_finalization':
        return attempts < 2 ? 'clarify' : 'wait';
      
      case 'character_change':
        return attempts < 2 ? 'clarify' : 'cancel';
      
      case 'story_edit':
        return attempts < 1 ? 'clarify' : 'cancel';
      
      case 'asset_generation':
        return attempts < 1 ? 'clarify' : 'proceed';
      
      default:
        return 'clarify';
    }
  }

  /**
   * Detect basic confirmation patterns
   */
  private detectBasicConfirmation(userInput: string, ageContext?: number): ConfirmationResult {
    const input = userInput.toLowerCase().trim();
    
    // Explicit positive patterns
    const positivePatterns = [
      /^(yes|yeah|yep|yup|sure|okay|ok|alright|sounds good|perfect|great|awesome|cool|love it)$/i,
      /^(that's perfect|i love it|sounds great|yes please|absolutely|definitely)$/i,
      /^(let's do it|go for it|make it|create it)$/i
    ];

    // Explicit negative patterns
    const negativePatterns = [
      /^(no|nope|nah|not really|i don't like|don't want|stop|cancel)$/i,
      /^(that's not right|change it|different|something else)$/i,
      /^(i don't want that|not good|try again)$/i
    ];

    // Age-specific patterns
    if (ageContext && ageContext < 6) {
      // Younger children might use simpler language
      positivePatterns.push(/^(good|nice|pretty|fun|like it)$/i);
      negativePatterns.push(/^(bad|scary|don't like|no no)$/i);
    }

    // Check patterns
    for (const pattern of positivePatterns) {
      if (pattern.test(input)) {
        return {
          confirmed: true,
          confidence: 0.9,
          interpretation: 'explicit_yes',
          defaultBehavior: 'proceed'
        };
      }
    }

    for (const pattern of negativePatterns) {
      if (pattern.test(input)) {
        return {
          confirmed: false,
          confidence: 0.9,
          interpretation: 'explicit_no',
          defaultBehavior: 'clarify'
        };
      }
    }

    // Ambiguous cases
    if (input.length < 3 || /^(um|uh|hmm|maybe|kinda|sort of)$/i.test(input)) {
      return {
        confirmed: false,
        confidence: 0.3,
        interpretation: 'ambiguous',
        clarificationNeeded: 'I want to make sure I understand. Do you like this, or would you like to change something?',
        defaultBehavior: 'clarify'
      };
    }

    return {
      confirmed: false,
      confidence: 0.5,
      interpretation: 'unclear',
      clarificationNeeded: 'I\'m not sure what you mean. Can you tell me yes or no?',
      defaultBehavior: 'clarify'
    };
  }

  /**
   * Interpret confirmation using AI for complex cases
   */
  private async interpretWithAI(request: ConfirmationRequest): Promise<ConfirmationResult> {
    const prompt = `
Analyze this child's response to determine if they're confirming or rejecting something in a storytelling context.

Context: ${request.confirmationType}
Child's age: ${request.context.ageContext || 'unknown'}
What they're confirming: ${JSON.stringify(request.context.itemBeingConfirmed)}
Their response: "${request.userInput}"

Consider:
1. Age-appropriate language
2. Enthusiasm level
3. Specific feedback vs general response
4. Context of storytelling
5. Child communication patterns

Respond with JSON:
{
  "confirmed": boolean,
  "confidence": number (0-1),
  "interpretation": "explicit_yes|explicit_no|ambiguous|partial|unclear",
  "reasoning": "explanation",
  "partialAspects": ["aspect1", "aspect2"] if partial
}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_CONVERSATION || process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 300
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      return {
        confirmed: parsed.confirmed || false,
        confidence: parsed.confidence || 0.5,
        interpretation: parsed.interpretation || 'unclear',
        defaultBehavior: this.getDefaultBehavior(
          request.confirmationType,
          request.context,
          request.previousAttempts
        )
      };
    } catch (error) {
      this.logger.error('AI interpretation failed', { error });
      return this.getDefaultConfirmationResult(request);
    }
  }

  /**
   * Enhance basic confirmation result with context
   */
  private enhanceBasicResult(
    basicResult: ConfirmationResult,
    request: ConfirmationRequest
  ): ConfirmationResult {
    return {
      ...basicResult,
      defaultBehavior: this.getDefaultBehavior(
        request.confirmationType,
        request.context,
        request.previousAttempts
      )
    };
  }

  /**
   * Combine basic and AI results
   */
  private combineResults(
    basicResult: ConfirmationResult,
    aiResult: ConfirmationResult,
    request: ConfirmationRequest
  ): ConfirmationResult {
    // If basic result is confident, prefer it
    if (basicResult.confidence > 0.8) {
      return basicResult;
    }

    // If AI result is confident, use it
    if (aiResult.confidence > 0.7) {
      return aiResult;
    }

    // Combine both with weighted average
    const combinedConfidence = (basicResult.confidence + aiResult.confidence) / 2;
    
    return {
      confirmed: combinedConfidence > 0.5 ? (basicResult.confirmed || aiResult.confirmed) : false,
      confidence: combinedConfidence,
      interpretation: combinedConfidence > 0.6 ? 'ambiguous' : 'unclear',
      clarificationNeeded: 'I want to make sure I understand you correctly. Can you tell me more about what you think?',
      defaultBehavior: this.getDefaultBehavior(
        request.confirmationType,
        request.context,
        request.previousAttempts
      )
    };
  }

  /**
   * Generate completion suggestion for partial confirmations
   */
  private async generateCompletionSuggestion(
    confirmedAspects: string[],
    unconfirmedAspects: string[],
    context: ConfirmationContext
  ): Promise<string> {
    // Simple rule-based completion for now
    if (unconfirmedAspects.length === 1) {
      return `Great! I'll keep ${confirmedAspects.join(', ')} and use a good default for ${unconfirmedAspects[0]}.`;
    }

    return `I'll keep the parts you confirmed: ${confirmedAspects.join(', ')}. For the rest, I'll choose what works best with your story.`;
  }

  /**
   * Generate age-appropriate clarification prompt
   */
  private generateClarificationPrompt(needsClarification: string[], ageContext?: number): string {
    if (!ageContext || ageContext >= 7) {
      return `I want to make sure I understand. Can you tell me more about: ${needsClarification.join(', ')}?`;
    }

    // Simpler language for younger children
    return `I want to make sure this is just right for you. What do you think about ${needsClarification[0]}?`;
  }

  /**
   * Create rollback plan for retracted confirmations
   */
  private async createRollbackPlan(retraction: ConfirmationRetraction): Promise<RollbackPlan> {
    return {
      sessionId: retraction.sessionId,
      steps: [
        {
          action: 'revert_changes',
          target: retraction.affectedItems,
          description: 'Undo the confirmed changes'
        },
        {
          action: 'restore_previous_state',
          target: ['conversation_state'],
          description: 'Return to previous conversation state'
        },
        {
          action: 'clear_confirmation_cache',
          target: [retraction.sessionId],
          description: 'Clear cached confirmation results'
        }
      ],
      estimatedTime: '< 1 second',
      userVisible: false
    };
  }

  /**
   * Generate user-friendly retraction notification
   */
  private generateRetractionNotification(reason: string, affectedItems: string[]): string {
    return `No problem! I've undone those changes. Let's try something different.`;
  }

  /**
   * Generate alternative options after retraction
   */
  private async generateAlternativeOptions(retraction: ConfirmationRetraction): Promise<string[]> {
    return [
      'Would you like to try a different approach?',
      'Should we go back and change something?',
      'Would you like to start this part over?'
    ];
  }

  /**
   * Identify critical aspects that must be confirmed
   */
  private identifyCriticalAspects(item: any, phase: string): string[] {
    switch (phase) {
      case 'character_finalization':
        return ['name', 'species'];
      case 'story_finalization':
        return ['main_plot', 'ending'];
      case 'character_change':
        return ['affected_traits'];
      default:
        return [];
    }
  }

  /**
   * Parse AI interpretation response
   */
  private parseAIInterpretation(content: string): {
    interpretation: string;
    confidence: number;
    contextFactors: string[];
    ageAdjustments: string[];
  } {
    // Simplified parsing - would need more robust implementation
    return {
      interpretation: 'unclear',
      confidence: 0.5,
      contextFactors: ['parsing_error'],
      ageAdjustments: []
    };
  }

  /**
   * Get default confirmation result for error cases
   */
  private getDefaultConfirmationResult(request: ConfirmationRequest): ConfirmationResult {
    return {
      confirmed: false,
      confidence: 0.3,
      interpretation: 'unclear',
      clarificationNeeded: 'I want to make sure I understand. Can you tell me yes or no?',
      defaultBehavior: this.getDefaultBehavior(
        request.confirmationType,
        request.context,
        request.previousAttempts
      )
    };
  }

  /**
   * Cache confirmation result for consistency
   */
  private async cacheConfirmationResult(sessionId: string, result: ConfirmationResult): Promise<void> {
    try {
      const key = `confirmation:${sessionId}:${Date.now()}`;
      await this.redis.setEx(key, 300, JSON.stringify(result)); // Cache for 5 minutes
    } catch (error) {
      this.logger.warn('Failed to cache confirmation result', { error });
    }
  }
}

export interface RollbackPlan {
  sessionId: string;
  steps: RollbackStep[];
  estimatedTime: string;
  userVisible: boolean;
}

export interface RollbackStep {
  action: string;
  target: string[];
  description: string;
}