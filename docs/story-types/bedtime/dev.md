# Bedtime Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: Bedtime  
**Age Range**: 2-10 years

## Technical Overview

The Bedtime story type is designed for children ages 2-8, creating calming, soothing narratives that promote sleep and relaxation. It uses specific prompt templates with repetitive, rhythmic language and sleep-promoting endings.

## Story Type Classification

### Classification Method

Bedtime stories are classified using OpenAI function calling with the `StoryTypeClassifier` service.

**Code Location:**
- `packages/content-agent/src/services/StoryTypeClassifier.ts:15-68` - Main classification logic
- `packages/router/src/services/IntentClassifier.ts:460-468` - Router-level classification

### Classification Keywords

**Primary Keywords:**
- bedtime
- sleep
- sleepy
- tired
- calm
- peaceful
- dream
- night

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:465` - Keywords array

### User Input Examples

**High Confidence Examples:**
- "Tell me a bedtime story"
- "I'm sleepy"
- "Something calm please"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:466` - Examples array

### Conversation Starters

**System-Generated Starters:**
- "Let's create a peaceful bedtime story"
- "What helps you feel calm?"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:467` - Conversation starters

## Prompt Templates and Selection

### Story-Specific Prompt

**Bedtime Story Prompt:**
```
Create calming bedtime stories with:
- Peaceful, soothing narratives
- Gentle characters and soft adventures
- Dreamy, magical elements
- Repetitive, rhythmic language
- Endings that promote relaxation and sleep
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:136-141` - Bedtime prompt template
- `packages/content-agent/src/services/PromptSelector.ts:154-264` - Story-specific prompts

### Age Groups Supported

Bedtime stories support age groups: 3, 4, 5, 6, 7, 8, 9+ (though optimal for 2-8)

**Code Reference:**
- `packages/content-agent/src/services/PromptSelector.ts:109` - Age groups array

## Age-Appropriate Constraints

### Special Constraints for Bedtime Stories

**All Ages:**
- Content must be calming and peaceful
- No exciting or stimulating content
- Use soothing, gentle language
- Include repetitive, rhythmic elements
- Endings must promote relaxation

**Ages 2-4:**
- Very simple, repetitive language
- Short, soothing sentences
- Gentle, dreamy themes
- Strong rhythmic patterns
- Simple, peaceful endings

**Ages 5-6:**
- Calming vocabulary with gentle words
- Moderate sentence length with rhythm
- Peaceful adventures
- Soothing narrative flow
- Relaxing conclusions

**Ages 7-8:**
- Calming but slightly more complex language
- Peaceful story structures
- Gentle character development
- Soothing plot progression
- Sleep-promoting endings

**Code Reference:**
- `packages/content-agent/src/services/PromptSelector.ts:35-89` - Age-appropriate constraints

## API Integration

### Story Creation Endpoint

**Endpoint:** `POST /v1/stories`

**Request Body:**
```json
{
  "characterId": "char-123",
  "storyType": "Bedtime",
  "userAge": 4,
  "language": "en",
  "preferences": {
    "theme": "peaceful dreams",
    "characterName": "Luna"
  }
}
```

## Code Implementation

### Story Type Definition

**TypeScript Type:**
```typescript
export type StoryType = 
  'Adventure' | 'Bedtime' | 'Birthday' | 'Educational' | 
  // ... other types
```

**Code Location:**
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type definition

### Enum Definition

**Router Enum:**
```typescript
export enum StoryType {
  BEDTIME = 'bedtime',
  // ... other types
}
```

**Code Location:**
- `packages/router/src/types.ts:4-16` - StoryType enum

## Age Range Handling

### Primary Age Range
- **Minimum**: 2 years
- **Maximum**: 10 years
- **Optimal**: 3-6 years

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:464` - Age range [2, 10]

## Character Integration

### Character Requirements

Bedtime stories work best with:
- Gentle, calming characters
- Soothing companion characters
- Peaceful guide characters
- Dreamy, magical characters

## Testing Requirements

### Unit Tests

**Test Cases:**
- Bedtime classification with high confidence
- Bedtime classification with keywords
- Age-appropriate prompt selection (ages 2-8)
- Calming content validation

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type
- `packages/router/src/types.ts:4-16` - StoryType enum

### Classification
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Classification service
- `packages/router/src/services/IntentClassifier.ts:460-468` - Router classification

### Prompt Selection
- `packages/content-agent/src/services/PromptSelector.ts:18-30` - Prompt selection
- `packages/content-agent/src/services/PromptSelector.ts:318-337` - Story type descriptions
- `docs/prompts-library/content-generation.md:136-141` - Bedtime prompt template

---

**Related Documentation:**
- [Bedtime - Marketing](./marketing.md)
- [Bedtime - Sales](./sales.md)
- [Bedtime - Executives](./executives.md)
- [Story Types Index](../README.md)
