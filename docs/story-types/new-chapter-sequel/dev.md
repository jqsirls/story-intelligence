# New Chapter Sequel Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: New Chapter Sequel  
**Age Range**: 3-12 years

## Technical Overview

The New Chapter Sequel story type continues stories with existing characters in new adventures for children ages 4-12.

## Story Type Classification

### Classification Keywords

**Primary Keywords:**
- continue
- sequel
- next chapter
- more
- again
- same character

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:545` - Keywords array

### User Input Examples

**High Confidence Examples:**
- "Continue the story"
- "What happens next?"
- "More adventures with Luna"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:546` - Examples array

### Conversation Starters

**System-Generated Starters:**
- "What should happen next?"
- "Let's continue our story!"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:547` - Conversation starters

## Prompt Templates and Selection

### Story-Specific Prompt

**New Chapter Sequel Story Prompt:**
```
Create continuing stories with:
- Seamless continuation from previous story elements
- Character development and growth
- New adventures building on established relationships
- Consistency with previous story themes and tone
- Fresh challenges while maintaining familiar comfort
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:192-197` - New Chapter Sequel prompt template

## Character Consistency

### Character Requirements

New Chapter Sequel stories require:
- **Previous Story Reference**: Access to previous story content
- **Character Consistency**: Maintains character traits and relationships
- **Story Continuity**: Continues story themes and tone
- **Character Development**: Characters grow across stories

**Code Reference:**
- `packages/content-agent/src/services/CharacterConsistencyManager.ts` - Character consistency
- `packages/content-agent/src/services/StoryCreationService.ts` - Story continuation logic

## Age Range Handling

### Primary Age Range
- **Minimum**: 3 years
- **Maximum**: 12 years
- **Optimal**: 6-10 years

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:544` - Age range [3, 12]

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type
- `packages/router/src/types.ts:4-16` - StoryType enum

### Classification
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Classification service
- `packages/router/src/services/IntentClassifier.ts:540-548` - Router classification

---

**Related Documentation:**
- [New Chapter Sequel - Marketing](./marketing.md)
- [New Chapter Sequel - Sales](./sales.md)
- [New Chapter Sequel - Executives](./executives.md)
- [Story Types Index](../README.md)
