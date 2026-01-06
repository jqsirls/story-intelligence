# Financial Literacy Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: Financial Literacy  
**Age Range**: 3-14 years

## Technical Overview

The Financial Literacy story type teaches money management, saving, and financial responsibility for children ages 6-14.

## Story Type Classification

### Classification Keywords

**Primary Keywords:**
- money
- save
- spend
- buy
- allowance
- bank
- budget
- financial

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:495` - Keywords array

### User Input Examples

**High Confidence Examples:**
- "I want to learn about money"
- "How do I save money?"
- "What is a bank?"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:496` - Examples array

### Conversation Starters

**System-Generated Starters:**
- "Let's learn about money!"
- "What do you know about saving?"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:497` - Conversation starters

## Prompt Templates and Selection

### Story-Specific Prompt

**Financial Literacy Story Prompt:**
```
Create money-smart stories with:
- Age-appropriate financial concepts (saving, spending, sharing)
- Characters making good money decisions
- Simple lessons about needs vs. wants
- The value of work and earning
- Generosity and responsible money management
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:157-162` - Financial Literacy prompt template

## Age Range Handling

### Primary Age Range
- **Minimum**: 3 years
- **Maximum**: 14 years
- **Optimal**: 8-12 years

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:494` - Age range [3, 14]

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type
- `packages/router/src/types.ts:4-16` - StoryType enum

### Classification
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Classification service
- `packages/router/src/services/IntentClassifier.ts:490-498` - Router classification

### Prompt Selection
- `packages/content-agent/src/services/PromptSelector.ts:18-30` - Prompt selection
- `docs/prompts-library/content-generation.md:157-162` - Financial Literacy prompt template

---

**Related Documentation:**
- [Financial Literacy - Marketing](./marketing.md)
- [Financial Literacy - Sales](./sales.md)
- [Financial Literacy - Executives](./executives.md)
- [Story Types Index](../README.md)
