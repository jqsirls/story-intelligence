# New Birth Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: New Birth (Adult Therapeutic)  
**Age Range**: Adult

## Technical Overview

The New Birth story type celebrates welcoming new life and embracing change. This is an adult therapeutic story type that supports new parents and families.

## Story Type Classification

### Story Type Description

**Description:**
"Celebratory stories for welcoming new life and embracing change"

**Code Reference:**
- `packages/content-agent/src/services/PromptSelector.ts:333` - Story type description

## Prompt Templates and Selection

### Story-Specific Prompt

**New Birth Story Prompt:**
```
Create new life celebration stories with:
- Joy and wonder of new beginnings
- Transformation and growth themes
- Support for new parents and families
- Acknowledgment of fears alongside excitement
- Celebration of life's precious moments
- Guidance for embracing change and responsibility
- Hope and optimism for the future
- Grounding in love, protection, and capability
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:226-234` - New Birth prompt template

## Therapeutic Agent Integration

### New Parent Support

New Birth stories can integrate with Therapeutic Agent for:
- **Parent Support**: Support for new parents and families
- **Emotional Processing**: Processing complex emotions around new life
- **Crisis Detection**: Detection of emotional distress
- **Professional Referrals**: Referral pathways when needed

**Code Reference:**
- `packages/therapeutic-agent/src/TherapeuticAgent.ts` - Therapeutic Agent
- `docs/agents/therapeutic-agent/development.md` - Therapeutic Agent documentation

## Special Handling Requirements

### Adult Audience
- **Audience Type**: Adult (not children)
- **Age Validation**: Stories are for adults
- **Content Moderation**: Special content moderation for therapeutic content

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type (includes 'New Birth')

### Therapeutic Integration
- `packages/therapeutic-agent/src/TherapeuticAgent.ts` - Therapeutic Agent
- `docs/agents/therapeutic-agent/development.md` - Therapeutic Agent documentation

---

**Related Documentation:**
- [New Birth - Marketing](./marketing.md)
- [New Birth - Sales](./sales.md)
- [New Birth - Executives](./executives.md)
- [Therapeutic Agent Documentation](../agents/therapeutic-agent/)
- [Story Types Index](../README.md)
