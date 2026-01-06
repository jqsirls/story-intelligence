import OpenAI from 'openai';
import { StoryType } from '@alexa-multi-agent/shared-types';
import { StoryClassificationRequest, StoryClassificationResult, ConversationContext } from '../types';
import { Logger } from 'winston';

export class StoryTypeClassifier {
  private openai: OpenAI;
  private logger: Logger;

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  async classifyStoryIntent(request: StoryClassificationRequest): Promise<StoryClassificationResult> {
    this.logger.info('Classifying story intent', { 
      userId: request.userId, 
      sessionId: request.sessionId,
      inputLength: request.userInput.length 
    });

    try {
      const systemPrompt = this.buildClassificationSystemPrompt();
      const userPrompt = this.buildClassificationUserPrompt(request);

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL_CONVERSATION || process.env.OPENAI_MODEL_STORY || 'gpt-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        functions: [this.getClassificationFunction()],
        function_call: { name: 'classify_story_type' },
        temperature: 0.3,
        max_tokens: 500
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall || !functionCall.arguments) {
        throw new Error('No function call response received');
      }

      const result = JSON.parse(functionCall.arguments) as StoryClassificationResult;
      
      // Validate the result
      this.validateClassificationResult(result);
      
      this.logger.info('Story intent classified successfully', {
        userId: request.userId,
        storyType: result.storyType,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      this.logger.error('Error classifying story intent', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId 
      });
      
      // Return default classification on error
      return {
        storyType: 'Adventure',
        confidence: 0.5,
        reasoning: 'Default classification due to processing error'
      };
    }
  }

  private buildClassificationSystemPrompt(): string {
    return `You are an expert story type classifier for children's storytelling. Your job is to analyze user input and determine which type of story they want to create.

Available story types:
1. Adventure - Action-packed journeys, quests, exploration
2. Bedtime - Calm, soothing stories for sleep time
3. Birthday - Celebration-themed stories for special occasions
4. Educational - Learning-focused stories that teach concepts
5. Financial Literacy - Stories that teach money management and financial concepts
6. Language Learning - Stories that help learn new languages or vocabulary
7. Medical Bravery - Stories that help children cope with medical procedures or health challenges
8. Mental Health - Stories that address emotional well-being and coping strategies
9. Milestones - Stories celebrating achievements and life transitions
10. New Chapter Sequel - Continuing stories from previous sessions
11. Tech Readiness - Stories that introduce technology concepts and digital literacy

Consider:
- Direct mentions of story types or themes
- Emotional context and user needs
- Age-appropriate content preferences
- Previous conversation context if available
- Implicit story type indicators in language

Provide confidence scores and reasoning for your classification.`;
  }

  private buildClassificationUserPrompt(request: StoryClassificationRequest): string {
    let prompt = `User input: "${request.userInput}"`;
    
    if (request.context) {
      prompt += `\n\nContext:`;
      if (request.context.userAge) {
        prompt += `\n- User age: ${request.context.userAge}`;
      }
      if (request.context.emotionalState) {
        prompt += `\n- Emotional state: ${request.context.emotionalState}`;
      }
      if (request.context.currentPhase) {
        prompt += `\n- Conversation phase: ${request.context.currentPhase}`;
      }
      if (request.context.previousMessages && request.context.previousMessages.length > 0) {
        prompt += `\n- Previous messages: ${request.context.previousMessages.slice(-3).join(', ')}`;
      }
      if (request.context.preferences?.favoriteStoryTypes) {
        prompt += `\n- Favorite story types: ${request.context.preferences.favoriteStoryTypes.join(', ')}`;
      }
    }

    prompt += `\n\nPlease classify this into one of the 11 story types and provide your reasoning.`;
    
    return prompt;
  }

  private getClassificationFunction(): OpenAI.Chat.Completions.ChatCompletionCreateParams.Function {
    return {
      name: 'classify_story_type',
      description: 'Classify user input into a story type with confidence and reasoning',
      parameters: {
        type: 'object',
        properties: {
          storyType: {
            type: 'string',
            enum: [
              'Adventure', 'Bedtime', 'Birthday', 'Educational', 
              'Financial Literacy', 'Language Learning', 'Medical Bravery',
              'Mental Health', 'Milestones', 'New Chapter Sequel', 'Tech Readiness'
            ],
            description: 'The classified story type'
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence score between 0 and 1'
          },
          alternativeTypes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'Adventure', 'Bedtime', 'Birthday', 'Educational', 
                    'Financial Literacy', 'Language Learning', 'Medical Bravery',
                    'Mental Health', 'Milestones', 'New Chapter Sequel', 'Tech Readiness'
                  ]
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1
                }
              },
              required: ['type', 'confidence']
            },
            description: 'Alternative story types with their confidence scores'
          },
          reasoning: {
            type: 'string',
            description: 'Explanation for the classification decision'
          }
        },
        required: ['storyType', 'confidence', 'reasoning']
      }
    };
  }

  private validateClassificationResult(result: StoryClassificationResult): void {
    const validStoryTypes: StoryType[] = [
      'Adventure', 'Bedtime', 'Birthday', 'Educational', 
      'Financial Literacy', 'Language Learning', 'Medical Bravery',
      'Mental Health', 'Milestones', 'New Chapter Sequel', 'Tech Readiness'
    ];

    if (!validStoryTypes.includes(result.storyType)) {
      throw new Error(`Invalid story type: ${result.storyType}`);
    }

    if (result.confidence < 0 || result.confidence > 1) {
      throw new Error(`Invalid confidence score: ${result.confidence}`);
    }

    if (!result.reasoning || result.reasoning.trim().length === 0) {
      throw new Error('Reasoning is required');
    }
  }

  /**
   * Get story type routing based on user intent and context
   */
  async routeStoryType(request: StoryClassificationRequest): Promise<{
    storyType: StoryType;
    shouldProceed: boolean;
    clarificationNeeded?: string;
  }> {
    const classification = await this.classifyStoryIntent(request);
    
    // If confidence is low, ask for clarification
    if (classification.confidence < 0.7) {
      return {
        storyType: classification.storyType,
        shouldProceed: false,
        clarificationNeeded: this.generateClarificationPrompt(classification)
      };
    }

    return {
      storyType: classification.storyType,
      shouldProceed: true
    };
  }

  private generateClarificationPrompt(classification: StoryClassificationResult): string {
    const alternatives = classification.alternativeTypes?.slice(0, 2) || [];
    
    if (alternatives.length > 0) {
      const altText = alternatives.map(alt => alt.type).join(' or ');
      return `I think you might want a ${classification.storyType} story, but you could also mean ${altText}. Which type of story would you like to create?`;
    }
    
    return `I think you want a ${classification.storyType} story. Is that right, or did you have something else in mind?`;
  }
}