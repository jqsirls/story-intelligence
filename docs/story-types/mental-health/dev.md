# Mental Health Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: Mental Health  
**Age Range**: 3-12 years

## Technical Overview

The Mental Health story type addresses emotions, feelings, and mental wellness for children ages 4-12. It integrates with Therapeutic Agent for emotional support, coping strategies, and therapeutic interventions.

## Story Type Classification

### Classification Keywords

**Primary Keywords:**
- feelings
- emotions
- sad
- happy
- worried
- anxious
- mental health
- cope

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:525` - Keywords array

### User Input Examples

**High Confidence Examples:**
- "I feel sad"
- "I'm worried about something"
- "Help with feelings"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:526` - Examples array

### Conversation Starters

**System-Generated Starters:**
- "How are you feeling today?"
- "Let's talk about emotions"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:527` - Conversation starters

## Prompt Templates and Selection

### Story-Specific Prompt

**Mental Health Story Prompt:**
```
Create emotionally supportive stories with:
- Characters processing emotions in healthy ways
- Coping strategies for common childhood challenges
- Validation of feelings and experiences
- Building emotional resilience and self-awareness
- Professional help portrayed positively when needed
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:178-183` - Mental Health prompt template

## Therapeutic Agent Integration

### Emotional Support

Mental Health stories integrate with Therapeutic Agent for:
- **Emotional Processing**: Support for processing emotions
- **Coping Strategies**: Evidence-based coping strategies
- **Crisis Detection**: Detection of emotional distress
- **Professional Referrals**: Referral pathways when needed

**Code Reference:**
- `packages/therapeutic-agent/src/TherapeuticAgent.ts` - Therapeutic Agent
- `docs/agents/therapeutic-agent/development.md` - Therapeutic Agent documentation

## Age Range Handling

### Primary Age Range
- **Minimum**: 3 years
- **Maximum**: 12 years
- **Optimal**: 6-10 years

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:524` - Age range [3, 12]

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type
- `packages/router/src/types.ts:4-16` - StoryType enum

### Classification
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Classification service
- `packages/router/src/services/IntentClassifier.ts:520-528` - Router classification

### Therapeutic Integration
- `packages/therapeutic-agent/src/TherapeuticAgent.ts` - Therapeutic Agent
- `docs/agents/therapeutic-agent/development.md` - Therapeutic Agent documentation

---

**Related Documentation:**
- [Mental Health - Marketing](./marketing.md)
- [Mental Health - Sales](./sales.md)
- [Mental Health - Executives](./executives.md)
- [Therapeutic Agent Documentation](../agents/therapeutic-agent/)
- [Story Types Index](../README.md)
