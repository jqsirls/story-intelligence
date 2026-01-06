# Adventure Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: Adventure  
**Age Range**: 3-12 years

## Technical Overview

The Adventure story type is one of 11 children's story types supported by Storytailor. It is classified using natural language processing, generates age-appropriate adventure narratives, and supports interactive continuation.

## Story Type Classification

### Classification Method

Adventure stories are classified using OpenAI function calling with the `StoryTypeClassifier` service.

**Code Location:**
- `packages/content-agent/src/services/StoryTypeClassifier.ts:15-68` - Main classification logic
- `packages/router/src/services/IntentClassifier.ts:450-458` - Router-level classification

### Classification Logic

```typescript
// Story type is classified based on user input
const result = await storyTypeClassifier.classifyStoryIntent({
  userInput: "Let's go on an adventure!",
  userId: "user-123",
  sessionId: "session-456",
  context: {
    userAge: 7,
    emotionalState: "excited",
    currentPhase: "story_planning"
  }
});

// Returns: { storyType: 'Adventure', confidence: 0.95, reasoning: '...' }
```

### Classification Keywords

**Primary Keywords:**
- adventure
- quest
- journey
- explore
- treasure
- hero
- brave
- exciting

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:455` - Keywords array

### User Input Examples

**High Confidence Examples:**
- "Let's go on an adventure!"
- "I want to find treasure"
- "Can we explore a jungle?"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:456` - Examples array

### Conversation Starters

**System-Generated Starters:**
- "What kind of adventure should we go on?"
- "Where would you like to explore?"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:457` - Conversation starters

## Prompt Templates and Selection

### Prompt Selection

Adventure stories use age-specific prompt templates selected by the `PromptSelector` service.

**Code Location:**
- `packages/content-agent/src/services/PromptSelector.ts:18-30` - Prompt selection logic
- `packages/content-agent/src/services/PromptSelector.ts:123-136` - Template creation

### Age Groups Supported

Adventure stories support age groups: 3, 4, 5, 6, 7, 8, 9+

**Code Reference:**
- `packages/content-agent/src/services/PromptSelector.ts:109` - Age groups array

### Prompt Template Structure

```typescript
// Template key format: "Adventure_{ageGroup}"
// Example: "Adventure_7" for 7-year-old

const template = promptSelector.selectPromptTemplate('Adventure', 7);
// Returns: PromptTemplate with age-appropriate constraints and story-specific prompts
```

### Story-Specific Prompt

**Adventure Story Prompt:**
```
Create exciting adventure stories with:
- Brave protagonists on thrilling journeys
- Safe but exciting challenges to overcome
- Exploration of new places and discoveries
- Positive problem-solving and teamwork
- Triumphant endings that celebrate courage
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:129-134` - Adventure prompt template
- `packages/content-agent/src/services/PromptSelector.ts:154-264` - Story-specific prompts

## Age-Appropriate Constraints

### Base Constraints (All Ages)
- Content must be positive and uplifting
- No violence or scary content
- Use simple, clear language
- Include moral lessons appropriate for children

### Age-Specific Constraints

**Ages 3-4:**
- Very simple vocabulary (1-2 syllable words)
- Short sentences (5-8 words)
- Basic emotions and concepts
- Repetitive elements for engagement
- Avoid complex plot structures

**Ages 5-6:**
- Elementary vocabulary with some new words
- Moderate sentence length (8-12 words)
- Basic problem-solving concepts
- Simple cause-and-effect relationships

**Ages 7-8:**
- Age-appropriate vocabulary with explanations
- More complex sentence structures
- Mild challenges and obstacles
- Basic emotional complexity

**Ages 9+:**
- Rich vocabulary appropriate for reading level
- Complex plot structures and character development
- Meaningful challenges and growth opportunities
- Nuanced emotional themes

**Code Reference:**
- `packages/content-agent/src/services/PromptSelector.ts:35-89` - Age-appropriate constraints

## API Integration

### Story Creation Endpoint

**Endpoint:** `POST /v1/stories`

**Request Body:**
```json
{
  "characterId": "char-123",
  "storyType": "Adventure",
  "userAge": 7,
  "language": "en",
  "preferences": {
    "theme": "jungle exploration",
    "characterName": "Luna"
  }
}
```

**Response:**
```json
{
  "id": "story-456",
  "type": "Adventure",
  "content": {
    "text": "Once upon a time, brave Luna set off on a thrilling jungle adventure...",
    "beats": [...]
  },
  "metadata": {
    "ageGroup": "7",
    "classificationConfidence": 0.95
  }
}
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:825-848` - Story creation endpoint

### Story Type Classification Endpoint

**Endpoint:** `POST /v1/stories/classify`

**Request Body:**
```json
{
  "userInput": "Let's go on an adventure!",
  "userId": "user-123",
  "context": {
    "userAge": 7
  }
}
```

**Response:**
```json
{
  "storyType": "Adventure",
  "confidence": 0.95,
  "reasoning": "User input contains adventure keywords and expresses desire for exploration",
  "alternatives": []
}
```

## Code Implementation

### Story Type Definition

**TypeScript Type:**
```typescript
export type StoryType = 
  'Adventure' | 'Bedtime' | 'Birthday' | 'Educational' | 
  'Financial Literacy' | 'Language Learning' | 'Medical Bravery' | 
  'Mental Health' | 'Milestones' | 'New Chapter Sequel' | 'Tech Readiness';
```

**Code Location:**
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type definition

### Enum Definition

**Router Enum:**
```typescript
export enum StoryType {
  ADVENTURE = 'adventure',
  // ... other types
}
```

**Code Location:**
- `packages/router/src/types.ts:4-16` - StoryType enum

### Classification Service

**Main Class:**
```typescript
export class StoryTypeClassifier {
  async classifyStoryIntent(
    request: StoryClassificationRequest
  ): Promise<StoryClassificationResult> {
    // Classification logic using OpenAI function calling
  }
}
```

**Code Location:**
- `packages/content-agent/src/services/StoryTypeClassifier.ts:6-232` - Full implementation

### Prompt Selector Service

**Main Class:**
```typescript
export class PromptSelector {
  selectPromptTemplate(storyType: StoryType, age: number): PromptTemplate {
    // Selects age-appropriate prompt template
  }
  
  getStoryTypeDescription(storyType: StoryType): string {
    // Returns: "Exciting journeys and brave quests with heroes who explore new places"
  }
}
```

**Code Location:**
- `packages/content-agent/src/services/PromptSelector.ts:5-338` - Full implementation

## Classification Logic

### Classification Process

1. **User Input Analysis**: Analyze user input for keywords and intent
2. **Context Consideration**: Consider user age, emotional state, conversation history
3. **OpenAI Function Calling**: Use GPT-4 with function calling for classification
4. **Confidence Scoring**: Calculate confidence score (0-1)
5. **Result Validation**: Validate classification result
6. **Caching**: Cache classification results for performance

**Code Reference:**
- `packages/content-agent/src/services/StoryTypeClassifier.ts:15-68` - Classification process

### Confidence Thresholds

- **High Confidence (≥0.8)**: Use classification directly
- **Medium Confidence (0.5-0.8)**: May request clarification
- **Low Confidence (<0.5)**: Request clarification or use default

## Prompt Selection Logic

### Template Selection

```typescript
// 1. Get age group from user age
const ageGroup = getAgeGroup(age); // Returns: '3', '4', '5', '6', '7', '8', '9+'

// 2. Build template key
const key = `Adventure_${ageGroup}`; // Example: "Adventure_7"

// 3. Retrieve template
const template = promptTemplates.get(key);

// 4. If not found, use default template
if (!template) {
  return getDefaultTemplate('Adventure', ageGroup);
}
```

**Code Reference:**
- `packages/content-agent/src/services/PromptSelector.ts:18-30` - Selection logic

### Template Initialization

Templates are initialized for all story type and age group combinations:

```typescript
storyTypes.forEach(storyType => {
  ageGroups.forEach(ageGroup => {
    const template = createPromptTemplate(storyType, ageGroup);
    promptTemplates.set(`${storyType}_${ageGroup}`, template);
  });
});
```

**Code Reference:**
- `packages/content-agent/src/services/PromptSelector.ts:101-121` - Template initialization

## Age Range Handling

### Primary Age Range
- **Minimum**: 3 years
- **Maximum**: 12 years
- **Optimal**: 6-10 years

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:454` - Age range [3, 12]

### Age Group Mapping

```typescript
function getAgeGroup(age: number): AgeGroup {
  if (age <= 3) return '3';
  if (age <= 4) return '4';
  if (age <= 5) return '5';
  if (age <= 6) return '6';
  if (age <= 7) return '7';
  if (age <= 8) return '8';
  return '9+';
}
```

**Code Reference:**
- `packages/content-agent/src/services/PromptSelector.ts:91-99` - Age group mapping

## Character Integration

### Character Requirements

Adventure stories work with any character type but are optimized for:
- Brave, adventurous characters
- Explorer archetypes
- Hero characters
- Quest-oriented characters

### Character Consistency

Adventure stories maintain character traits across sessions:
- Character personality remains consistent
- Character abilities and traits are preserved
- Previous adventure experiences are referenced

**Code Reference:**
- `packages/content-agent/src/services/CharacterConsistencyManager.ts` - Consistency management

## Asset Generation

### Image Generation

Adventure stories generate illustrations featuring:
- Adventure settings (jungles, oceans, space, etc.)
- Character in action poses
- Exploration and discovery scenes
- Treasure and quest elements

**Code Reference:**
- `packages/content-agent/src/services/ArtGenerationService.ts` - Image generation

### Audio Generation

Adventure stories include:
- Exciting but age-appropriate music
- Sound effects for exploration
- Voice narration with adventure tone

**Code Reference:**
- `packages/voice-synthesis/src/VoiceSynthesisAgent.ts` - Audio generation

## Testing Requirements

### Unit Tests

**Test File:** `packages/content-agent/src/__tests__/StoryTypeClassifier.test.ts`

**Test Cases:**
- Adventure classification with high confidence
- Adventure classification with keywords
- Age-appropriate prompt selection
- Template retrieval for all age groups

### Integration Tests

**Test File:** `packages/content-agent/src/__tests__/StoryCreationService.test.ts`

**Test Cases:**
- Adventure story generation
- Age-appropriate content validation
- Character integration in adventure stories
- Asset generation for adventure stories

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type
- `packages/router/src/types.ts:4-16` - StoryType enum

### Classification
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Classification service
- `packages/router/src/services/IntentClassifier.ts:450-458` - Router classification

### Prompt Selection
- `packages/content-agent/src/services/PromptSelector.ts:18-30` - Prompt selection
- `packages/content-agent/src/services/PromptSelector.ts:318-337` - Story type descriptions
- `docs/prompts-library/content-generation.md:129-134` - Adventure prompt template

### API Integration
- `packages/universal-agent/src/api/RESTAPIGateway.ts:825-848` - Story creation endpoint

## Example Code Snippets

### Classifying Adventure Intent

```typescript
import { StoryTypeClassifier } from '@alexa-multi-agent/content-agent';

const classifier = new StoryTypeClassifier(openai, logger);

const result = await classifier.classifyStoryIntent({
  userInput: "Let's go on an adventure!",
  userId: "user-123",
  sessionId: "session-456",
  context: {
    userAge: 7,
    emotionalState: "excited"
  }
});

console.log(result.storyType); // 'Adventure'
console.log(result.confidence); // 0.95
```

### Selecting Adventure Prompt

```typescript
import { PromptSelector } from '@alexa-multi-agent/content-agent';

const selector = new PromptSelector(logger);

const template = selector.selectPromptTemplate('Adventure', 7);

console.log(template.systemPrompt); // Age-appropriate system prompt
console.log(template.storySpecificPrompt); // Adventure-specific prompt
console.log(template.constraints); // Age-appropriate constraints
```

### Creating Adventure Story

```typescript
import { ContentAgent } from '@alexa-multi-agent/content-agent';

const agent = new ContentAgent(config);
await agent.initialize();

const story = await agent.createStory({
  characterId: 'char-123',
  storyType: 'Adventure',
  userAge: 7,
  preferences: {
    theme: 'jungle exploration'
  }
});

console.log(story.type); // 'Adventure'
console.log(story.content.text); // Adventure story text
```

---

**Related Documentation:**
- [Adventure - Marketing](./marketing.md)
- [Adventure - Sales](./sales.md)
- [Adventure - Executives](./executives.md)
- [Story Types Index](../README.md)
