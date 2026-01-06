# Tech Readiness Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: Tech Readiness  
**Age Range**: 3-14 years

## Technical Overview

The Tech Readiness story type introduces technology concepts, digital citizenship, and online safety for children ages 6-14.

## Story Type Classification

### Classification Keywords

**Primary Keywords:**
- technology
- computer
- internet
- online
- digital
- coding
- robots

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:555` - Keywords array

### User Input Examples

**High Confidence Examples:**
- "I want to learn about computers"
- "What is the internet?"
- "Technology story"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:556` - Examples array

### Conversation Starters

**System-Generated Starters:**
- "What technology interests you?"
- "Let's explore the digital world!"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:557` - Conversation starters

## Prompt Templates and Selection

### Story-Specific Prompt

**Tech Readiness Story Prompt:**
```
Create technology-positive stories with:
- Age-appropriate introduction to digital concepts
- Safe and responsible technology use
- Characters using technology to solve problems
- Balance between digital and real-world activities
- Positive role models for digital citizenship
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:199-204` - Tech Readiness prompt template

## Age Range Handling

### Primary Age Range
- **Minimum**: 3 years
- **Maximum**: 14 years
- **Optimal**: 8-12 years

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:554` - Age range [3, 14]

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type
- `packages/router/src/types.ts:4-16` - StoryType enum

### Classification
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Classification service
- `packages/router/src/services/IntentClassifier.ts:550-558` - Router classification

---

**Related Documentation:**
- [Tech Readiness - Marketing](./marketing.md)
- [Tech Readiness - Sales](./sales.md)
- [Tech Readiness - Executives](./executives.md)
- [Story Types Index](../README.md)
