# Medical Bravery Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: Medical Bravery  
**Age Range**: 3-10 years

## Technical Overview

The Medical Bravery story type helps children cope with medical situations and build courage for children ages 3-10. It integrates with Therapeutic Agent for medical procedure support and anxiety reduction.

## Story Type Classification

### Classification Keywords

**Primary Keywords:**
- doctor
- hospital
- medicine
- brave
- checkup
- surgery
- medical
- healing

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:515` - Keywords array

### User Input Examples

**High Confidence Examples:**
- "I'm going to the doctor"
- "I need to be brave"
- "Hospital story"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:516` - Examples array

### Conversation Starters

**System-Generated Starters:**
- "Let's talk about being brave"
- "What makes you feel strong?"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:517` - Conversation starters

## Prompt Templates and Selection

### Story-Specific Prompt

**Medical Bravery Story Prompt:**
```
Create supportive medical stories with:
- Characters facing medical procedures with courage
- Accurate but non-scary medical information
- Coping strategies for medical anxiety
- Healthcare workers as helpful heroes
- Positive outcomes and healing themes
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:171-176` - Medical Bravery prompt template

## Therapeutic Agent Integration

### Medical Procedure Support

Medical Bravery stories can integrate with Therapeutic Agent for:
- **Medical Procedure Preparation**: Stories prepare children for procedures
- **Anxiety Reduction**: Therapeutic support for medical anxiety
- **Coping Strategies**: Evidence-based coping strategies
- **Healthcare Provider Integration**: Support for healthcare providers

**Code Reference:**
- `packages/therapeutic-agent/src/TherapeuticAgent.ts` - Therapeutic Agent
- `docs/agents/therapeutic-agent/development.md` - Therapeutic Agent documentation

## Age Range Handling

### Primary Age Range
- **Minimum**: 3 years
- **Maximum**: 10 years
- **Optimal**: 5-8 years

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:514` - Age range [3, 10]

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type
- `packages/router/src/types.ts:4-16` - StoryType enum

### Classification
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Classification service
- `packages/router/src/services/IntentClassifier.ts:510-518` - Router classification

### Therapeutic Integration
- `packages/therapeutic-agent/src/TherapeuticAgent.ts` - Therapeutic Agent
- `docs/agents/therapeutic-agent/development.md` - Therapeutic Agent documentation

---

**Related Documentation:**
- [Medical Bravery - Marketing](./marketing.md)
- [Medical Bravery - Sales](./sales.md)
- [Medical Bravery - Executives](./executives.md)
- [Therapeutic Agent Documentation](../agents/therapeutic-agent/)
- [Story Types Index](../README.md)
