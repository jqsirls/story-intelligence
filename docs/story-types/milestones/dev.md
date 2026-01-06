# Milestones Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: Milestones  
**Age Range**: 3-14 years

## Technical Overview

The Milestones story type celebrates achievements and life transitions for children ages 5-14.

## Story Type Classification

### Classification Keywords

**Primary Keywords:**
- growing up
- milestone
- achievement
- first day
- graduation
- accomplishment

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:535` - Keywords array

### User Input Examples

**High Confidence Examples:**
- "First day of school"
- "I learned to ride a bike"
- "Growing up story"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:536` - Examples array

### Conversation Starters

**System-Generated Starters:**
- "What are you proud of?"
- "Tell me about something new you learned"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:537` - Conversation starters

## Prompt Templates and Selection

### Story-Specific Prompt

**Milestones Story Prompt:**
```
Create achievement celebration stories with:
- Recognition of personal growth and accomplishments
- Characters overcoming challenges to reach goals
- Family and community support for achievements
- Building confidence and self-esteem
- Inspiration for continued growth
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:185-190` - Milestones prompt template

## Age Range Handling

### Primary Age Range
- **Minimum**: 3 years
- **Maximum**: 14 years
- **Optimal**: 7-12 years

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:534` - Age range [3, 14]

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type
- `packages/router/src/types.ts:4-16` - StoryType enum

### Classification
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Classification service
- `packages/router/src/services/IntentClassifier.ts:530-538` - Router classification

---

**Related Documentation:**
- [Milestones - Marketing](./marketing.md)
- [Milestones - Sales](./sales.md)
- [Milestones - Executives](./executives.md)
- [Story Types Index](../README.md)
