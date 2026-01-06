Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 2.6 - Orchestration prompts extracted from code with file paths and line numbers

# Orchestration Prompts

## Overview

This document contains all prompts used for orchestration and routing in Storytailor, including intent classification, story type classification, and character extraction.

## Intent Classification

### Intent Classifier System Prompt

**Location:** `packages/router/src/services/IntentClassifier.ts:274-308`

**Purpose:** Classify user intent for routing to appropriate agents

**Code Reference:**
```typescript
// Code location: packages/router/src/services/IntentClassifier.ts:274-308
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

CONTEXT AWARENESS:
${context ? `
- Current phase: ${context.currentPhase}
- Previous intents: ${context.previousIntents.join(', ')}
- User profile: ${JSON.stringify(context.userProfile || {})}
` : 'No additional context provided'}

Classify the user's intent and provide appropriate parameters.`;
}
```

### Intent Classifier User Prompt

**Location:** `packages/router/src/services/IntentClassifier.ts:310-332`

**Purpose:** Build user prompt for intent classification

**Code Reference:**
```typescript
// Code location: packages/router/src/services/IntentClassifier.ts:310-332
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
```

### Intent Classification Function

**Location:** `packages/router/src/services/IntentClassifier.ts:334-370`

**Purpose:** Function definition for intent classification

**Code Reference:**
```typescript
// Code location: packages/router/src/services/IntentClassifier.ts:334-370
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
```

## Story Type Classification

### Story Type Classifier System Prompt

**Location:** `packages/content-agent/src/services/StoryTypeClassifier.ts:70-94`

**Purpose:** Classify user input into story types

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/StoryTypeClassifier.ts:70-94
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
```

**Note:** This is also documented in [Content Generation Prompts](./content-generation.md#story-type-classification) but included here for orchestration context.

### Story Type Classification User Prompt

**Location:** `packages/content-agent/src/services/StoryTypeClassifier.ts:96-121`

**Purpose:** Build user prompt for story type classification

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/StoryTypeClassifier.ts:96-121
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
```

### Clarification Prompt Generation

**Location:** `packages/content-agent/src/services/StoryTypeClassifier.ts:223-232`

**Purpose:** Generate clarification prompt when confidence is low

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/StoryTypeClassifier.ts:223-232
private generateClarificationPrompt(classification: StoryClassificationResult): string {
  const alternatives = classification.alternativeTypes?.slice(0, 2) || [];
  
  if (alternatives.length > 0) {
    const altText = alternatives.map(alt => alt.type).join(' or ');
    return `I think you might want a ${classification.storyType} story, but you could also mean ${altText}. Which type of story would you like to create?`;
  }
  
  return `I think you want a ${classification.storyType} story. Is that right, or did you have something else in mind?`;
}
```

## Character Extraction

### Character Trait Extraction System Prompt

**Location:** `packages/content-agent/src/services/CharacterGenerationService.ts:104-116`

**Purpose:** Extract character traits from natural conversation

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/CharacterGenerationService.ts:104-116
const systemPrompt = `You are an expert at extracting character traits from natural conversation. 
    
    Analyze the conversation history and extract character details that have been mentioned or implied.
    
    Focus on:
    - Basic traits (name, age, species)
    - Physical appearance details
    - Personality characteristics
    - Inclusivity traits (disabilities, special needs, etc.)
    - Interests and hobbies
    
    Be conservative - only extract traits that are clearly mentioned or strongly implied.
    For age-appropriate content, ensure all traits are suitable for children.`;
```

### Character Trait Extraction User Prompt

**Location:** `packages/content-agent/src/services/CharacterGenerationService.ts:118-125`

**Purpose:** Build user prompt for character trait extraction

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/CharacterGenerationService.ts:118-125
const userPrompt = `Conversation History:
${request.conversationHistory.map(turn => `${turn.speaker}: ${turn.message}`).join('\n')}

Current User Input: ${request.userInput || 'None'}
Current Phase: ${request.currentPhase}
User Age Context: ${request.ageContext || 'Unknown'}

Extract character traits from this conversation.`;
```

### Character Extraction Function

**Location:** `packages/content-agent/src/services/CharacterGenerationService.ts:769-851`

**Purpose:** Function definition for character trait extraction

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/CharacterGenerationService.ts:769-851
private getCharacterExtractionFunction(): OpenAI.Chat.Completions.ChatCompletionCreateParams.Function {
  return {
    name: 'extract_character_traits',
    description: 'Extract character traits from conversation',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Character name'
        },
        age: {
          type: 'number',
          description: 'Character age'
        },
        species: {
          type: 'string',
          enum: ['human', 'animal', 'robot', 'magical_creature', 'elemental', 'superhero', 'monster'],
          description: 'Character species'
        },
        appearance: {
          type: 'object',
          properties: {
            eyeColor: { type: 'string' },
            hairColor: { type: 'string' },
            hairTexture: { type: 'string' },
            clothing: { type: 'string' },
            height: { type: 'string' },
            weight: { type: 'string' },
            accessories: { type: 'array', items: { type: 'string' } },
            scars: { type: 'array', items: { type: 'string' } },
            // ... more appearance properties
          }
        },
        personality: {
          type: 'array',
          items: { type: 'string' },
          description: 'Personality traits'
        },
        interests: {
          type: 'array',
          items: { type: 'string' },
          description: 'Interests and hobbies'
        },
        // ... more trait properties
      },
      required: ['name', 'age', 'species']
    }
  };
}
```

## Story Type Prompts (Router)

### Story Type Prompt Initialization

**Location:** `packages/router/src/services/IntentClassifier.ts:447-559`

**Purpose:** Initialize story type prompts for intent classification

**Code Reference:**
```typescript
// Code location: packages/router/src/services/IntentClassifier.ts:447-559
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

  // ... more story types
}
```

## Fallback Intent Handling

### Unrecognized Intent Handler

**Location:** `packages/router/src/services/IntentClassifier.ts:154-197`

**Purpose:** Handle unrecognized intents with fallback logic

**Code Reference:**
```typescript
// Code location: packages/router/src/services/IntentClassifier.ts:154-197
async handleUnrecognizedIntent(
  turnContext: TurnContext,
  classificationContext?: ClassificationContext
): Promise<Intent> {
  this.logger.warn('Handling unrecognized intent', {
    userId: turnContext.userId,
    userInput: turnContext.userInput.substring(0, 100),
    currentPhase: turnContext.conversationPhase,
  });

  // Try to extract any story-related keywords for better fallback
  const storyKeywords = ['story', 'tale', 'adventure', 'character', 'hero', 'princess', 'dragon'];
  const hasStoryKeyword = storyKeywords.some(keyword => 
    turnContext.userInput.toLowerCase().includes(keyword)
  );

  // Determine fallback intent based on context
  let fallbackIntent = IntentType.UNKNOWN;
  let fallbackPhase = ConversationPhase.GREETING;
  let fallbackAgent: 'auth' | 'content' | 'library' | 'emotion' | 'commerce' | 'insights' = 'content';

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
    parameters: {},
    requiresAuth: false,
    targetAgent: fallbackAgent,
    conversationPhase: fallbackPhase
  };
}
```

**Note:** Fallback handling uses keyword matching and context, not prompts.

## Related Prompts

- **Story Type Classification:** See [Content Generation Prompts](./content-generation.md#story-type-classification)
- **Character Extraction:** See [Content Generation Prompts](./content-generation.md#character-generation-prompts)
