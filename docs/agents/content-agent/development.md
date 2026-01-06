# Content Agent - Developer Documentation

**Status**: Draft  
**Audience**: Engineering  
**Last Updated**: 2025-12-11

## Technical Architecture

### Core Components

1. **ContentAgent** (`packages/content-agent/src/ContentAgent.ts`)
   - Main agent class
   - Coordinates all services
   - Lines of Code: ~1,422

2. **StoryTypeClassifier** (`packages/content-agent/src/services/StoryTypeClassifier.ts`)
   - Classifies user input into 11 story types
   - Uses OpenAI function calling
   - Confidence scoring

3. **StoryCreationService** (`packages/content-agent/src/services/StoryCreationService.ts`)
   - Hero's Journey structure implementation
   - Story generation
   - Story editing and adaptation

4. **CharacterGenerationService** (`packages/content-agent/src/services/CharacterGenerationService.ts`)
   - Character creation
   - Character consistency
   - Character assets

5. **ArtGenerationService** (`packages/content-agent/src/services/ArtGenerationService.ts`)
   - Image generation (DALL-E 3, gpt-image-1)
   - Image consistency analysis
   - Asset management

6. **AssetGenerationPipeline** (`packages/content-agent/src/services/AssetGenerationPipeline.ts`)
   - Orchestrates asset generation
   - Handles failures and retries
   - Progress tracking

7. **ContentModerator** (`packages/content-agent/src/services/ContentModerator.ts`)
   - Content safety screening
   - Age-appropriate validation
   - Crisis detection

## API Endpoints

Content Agent is integrated into Universal Agent and accessible via:
- `POST /v1/stories` - Create story
- `POST /v1/characters` - Create character
- `POST /v1/stories/:id/beats` - Continue story
- `POST /v1/stories/:id/edit` - Edit story

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - API integration

## Integration Guide

### Basic Usage

```typescript
import { ContentAgent } from '@alexa-multi-agent/content-agent';

const agent = new ContentAgent({
  openaiApiKey: process.env.OPENAI_API_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  redisUrl: process.env.REDIS_URL,
  moderationEnabled: true,
  logLevel: 'info',
});

await agent.initialize();

const story = await agent.createStory({
  characterId: 'char-123',
  storyType: 'ADVENTURE',
  userAge: 7,
});
```

## Multi-Agent Coordination

### Agents Content Agent Coordinates With

1. **Emotion Agent** (Direct)
   - Gets emotional context for story adaptation
   - Code: `getEmotionalContext(userId)`

2. **Personality Agent** (Direct)
   - Gets personality adaptation settings
   - Code: `getPersonalityAdaptation(userId, emotionalContext)`

3. **Child Safety Agent** (EventBridge)
   - Publishes `character.created` event
   - Publishes `story.created` event for safety screening
   - Code: `eventPublisher.publishEvent('character.created', {...})`

4. **Localization Agent** (EventBridge)
   - Publishes `story.localization_requested` event
   - Code: `eventPublisher.publishEvent('story.localization_requested', {...})`

5. **Library Agent** (Direct)
   - Saves stories and characters
   - Code: `libraryAgent.saveStory(story)`

6. **Accessibility Agent** (Parallel)
   - Inclusive design validation
   - Code: Parallel coordination during character creation

**Code References:**
- `docs/developer-docs/01_CORE_ARCHITECTURE/01_Multi_Agent_Orchestration_Flow.md:491-549` - Coordination patterns

## Configuration Options

### Story Types Supported
1. Adventure
2. Bedtime
3. Birthday
4. Educational
5. Financial Literacy
6. Language Learning
7. Medical Bravery
8. Mental Health
9. Milestones
10. New Chapter Sequel
11. Tech Readiness

**Code References:**
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Story type classification

### Age Groups
- Ages 3-4: Basic emotions, simple concepts
- Ages 5-6: Basic emotional complexity
- Ages 7-8: Nuanced emotional themes
- Ages 9+: Complex narratives, advanced themes

**Code References:**
- `packages/content-agent/src/services/PromptSelector.ts:52-83` - Age-appropriate prompts

## Error Handling

### Content Moderation Failures
- Rejects unsafe content
- Provides alternative suggestions
- Logs moderation results

### Asset Generation Failures
- Retries with exponential backoff
- Falls back to simpler assets
- Tracks failure reasons

**Code References:**
- `packages/content-agent/src/services/AssetGenerationFailureHandler.ts` - Failure handling

## Testing Guide

### Unit Tests
```typescript
import { ContentAgent } from '@alexa-multi-agent/content-agent';

const agent = new ContentAgent(testConfig);

// Test story type classification
const classification = await agent.classifyStoryType({
  userInput: "Create an adventure story",
  userAge: 7,
});

// Test story generation
const story = await agent.createStory({
  characterId: 'test-char',
  storyType: 'ADVENTURE',
});
```

## Deployment Instructions

### Lambda Deployment

Content Agent is deployed as `storytailor-content-production`:
- **Runtime**: nodejs22.x
- **Memory**: 1024 MB
- **Timeout**: 300 seconds
- **Handler**: `dist/lambda.handler`

**Code References:**
- `docs/system/deployment_inventory.md:39` - Deployment configuration

### Environment Variables

Set via SSM Parameter Store:
- `/storytailor-production/openai/api-key`
- `/storytailor-production/openai/model-story`
- `/storytailor-production/openai/model-image`
- `/storytailor-production/supabase/url`
- `/storytailor-production/supabase/service-key`
- `/storytailor-production/redis/url`

**Code References:**
- `docs/system/ssm_parameters_inventory.md` - SSM parameters
