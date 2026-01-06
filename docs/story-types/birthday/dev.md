# Birthday Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: Birthday  
**Age Range**: 3-10 years

## Technical Overview

The Birthday story type creates celebratory stories about birthdays, parties, and special occasions for children ages 3-10.

## Story Type Classification

### Classification Keywords

**Primary Keywords:**
- birthday
- party
- celebration
- cake
- presents
- special day
- celebrate

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:475` - Keywords array

### User Input Examples

**High Confidence Examples:**
- "It's my birthday!"
- "I want a birthday story"
- "Let's have a party"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:476` - Examples array

### Conversation Starters

**System-Generated Starters:**
- "Tell me about your birthday!"
- "What makes birthdays special?"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:477` - Conversation starters

## Prompt Templates and Selection

### Story-Specific Prompt

**Birthday Story Prompt:**
```
Create celebratory birthday stories with:
- Special occasion themes and celebrations
- Gift-giving, parties, and joyful moments
- Age-appropriate milestone recognition
- Friendship and family connections
- Magical birthday wishes coming true
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:143-148` - Birthday prompt template

## Age Range Handling

### Primary Age Range
- **Minimum**: 3 years
- **Maximum**: 10 years
- **Optimal**: 5-8 years

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:474` - Age range [3, 10]

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type
- `packages/router/src/types.ts:4-16` - StoryType enum

### Classification
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Classification service
- `packages/router/src/services/IntentClassifier.ts:470-478` - Router classification

### Prompt Selection
- `packages/content-agent/src/services/PromptSelector.ts:18-30` - Prompt selection
- `docs/prompts-library/content-generation.md:143-148` - Birthday prompt template

---

**Related Documentation:**
- [Birthday - Marketing](./marketing.md)
- [Birthday - Sales](./sales.md)
- [Birthday - Executives](./executives.md)
- [Story Types Index](../README.md)
