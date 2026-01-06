# Language Learning Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: Language Learning  
**Age Range**: 3-12 years

## Technical Overview

The Language Learning story type incorporates language learning and cultural exploration for children ages 4-12.

## Story Type Classification

### Classification Keywords

**Primary Keywords:**
- language
- spanish
- french
- learn language
- translate
- culture
- words

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:505` - Keywords array

### User Input Examples

**High Confidence Examples:**
- "Teach me Spanish"
- "I want to learn French"
- "Different languages"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:506` - Examples array

### Conversation Starters

**System-Generated Starters:**
- "What language interests you?"
- "Let's explore different cultures!"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:507` - Conversation starters

## Prompt Templates and Selection

### Story-Specific Prompt

**Language Learning Story Prompt:**
```
Create language-rich stories with:
- Vocabulary building naturally integrated
- Repetition of new words in context
- Cultural elements from target language
- Interactive language practice opportunities
- Celebration of multilingual abilities
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:164-169` - Language Learning prompt template

## Age Range Handling

### Primary Age Range
- **Minimum**: 3 years
- **Maximum**: 12 years
- **Optimal**: 6-10 years

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:504` - Age range [3, 12]

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type
- `packages/router/src/types.ts:4-16` - StoryType enum

### Classification
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Classification service
- `packages/router/src/services/IntentClassifier.ts:500-508` - Router classification

---

**Related Documentation:**
- [Language Learning - Marketing](./marketing.md)
- [Language Learning - Sales](./sales.md)
- [Language Learning - Executives](./executives.md)
- [Story Types Index](../README.md)
