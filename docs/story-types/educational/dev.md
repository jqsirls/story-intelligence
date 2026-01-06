# Educational Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: Educational  
**Age Range**: 3-12 years

## Technical Overview

The Educational story type creates learning-focused stories that teach concepts, facts, or skills for children ages 4-12. It integrates with the Educational Agent for curriculum alignment, learning objectives, and assessment features.

## Story Type Classification

### Classification Keywords

**Primary Keywords:**
- learn
- teach
- school
- science
- math
- history
- educational
- study

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:485` - Keywords array

### User Input Examples

**High Confidence Examples:**
- "I want to learn about space"
- "Teach me about animals"
- "Something educational"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:486` - Examples array

### Conversation Starters

**System-Generated Starters:**
- "What would you like to learn about?"
- "Let's explore something new!"

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:487` - Conversation starters

## Prompt Templates and Selection

### Story-Specific Prompt

**Educational Story Prompt:**
```
Create learning-focused stories with:
- Clear educational objectives woven into narrative
- Fun ways to explore academic concepts
- Characters who learn and grow through discovery
- Interactive elements that reinforce learning
- Positive attitudes toward knowledge and curiosity
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:150-155` - Educational prompt template

## Educational Agent Integration

### Curriculum Alignment

Educational stories can integrate with Educational Agent for:
- **Curriculum Alignment**: Automatic alignment with curriculum standards
- **Learning Objectives**: Integration of learning objectives
- **Vocabulary Analysis**: Vocabulary level appropriate for grade level
- **Readability Assessment**: Readability scores ensure age-appropriateness

**Code Reference:**
- `packages/educational-agent/src/EducationalAgent.ts` - Educational Agent
- `docs/agents/educational-agent/development.md` - Educational Agent documentation

### Learning Outcome Tracking

With Educational Agent integration:
- **Progress Monitoring**: Track student progress on learning objectives
- **Mastery Assessment**: Assess mastery levels for each objective
- **Engagement Metrics**: Monitor student engagement and interaction

## Age Range Handling

### Primary Age Range
- **Minimum**: 3 years
- **Maximum**: 12 years
- **Optimal**: 6-10 years

**Code Reference:**
- `packages/router/src/services/IntentClassifier.ts:484` - Age range [3, 12]

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type
- `packages/router/src/types.ts:4-16` - StoryType enum

### Classification
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Classification service
- `packages/router/src/services/IntentClassifier.ts:480-488` - Router classification

### Educational Integration
- `packages/educational-agent/src/EducationalAgent.ts` - Educational Agent
- `docs/agents/educational-agent/development.md` - Educational Agent documentation

---

**Related Documentation:**
- [Educational - Marketing](./marketing.md)
- [Educational - Sales](./sales.md)
- [Educational - Executives](./executives.md)
- [Educational Agent Documentation](../agents/educational-agent/)
- [Story Types Index](../README.md)
