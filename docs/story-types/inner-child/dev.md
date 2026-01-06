# Inner Child Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: Inner Child (Adult Therapeutic)  
**Age Range**: Adult

## Technical Overview

The Inner Child story type provides healing narratives for connecting with and nurturing the inner child. This is an adult therapeutic story type that requires special handling and therapeutic integration.

## Story Type Classification

### Story Type Description

**Description:**
"Healing stories for connecting with and nurturing your inner child"

**Code Reference:**
- `packages/content-agent/src/services/PromptSelector.ts:332` - Story type description

## Prompt Templates and Selection

### Story-Specific Prompt

**Inner Child Story Prompt:**
```
Create inner child healing stories with:
- Three-part narrative: inner child, adult self, and protector
- Journey of self-discovery and emotional integration
- Healing of childhood wounds and patterns
- Development of self-compassion and acceptance
- Transformation of protective mechanisms into allies
- Empowerment through understanding and love
- Simple, accessible language that speaks to the subconscious
- Therapeutic resolution with lasting emotional impact
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:216-224` - Inner Child prompt template

## Therapeutic Agent Integration

### Inner Child Healing

Inner Child stories require full integration with Therapeutic Agent for:
- **Inner Child Work**: Evidence-based inner child therapeutic pathways
- **Crisis Detection**: Detection of emotional distress
- **Professional Referrals**: Referral pathways for additional support
- **Therapeutic Pathways**: Inner child healing therapeutic pathways

**Code Reference:**
- `packages/therapeutic-agent/src/TherapeuticAgent.ts` - Therapeutic Agent
- `docs/agents/therapeutic-agent/development.md` - Therapeutic Agent documentation

## Special Handling Requirements

### Adult Audience
- **Audience Type**: Adult (not children)
- **Age Validation**: Stories are for adults only
- **Content Moderation**: Special content moderation for therapeutic content

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type (includes 'Inner Child')

### Therapeutic Integration
- `packages/therapeutic-agent/src/TherapeuticAgent.ts` - Therapeutic Agent
- `docs/agents/therapeutic-agent/development.md` - Therapeutic Agent documentation

---

**Related Documentation:**
- [Inner Child - Marketing](./marketing.md)
- [Inner Child - Sales](./sales.md)
- [Inner Child - Executives](./executives.md)
- [Therapeutic Agent Documentation](../agents/therapeutic-agent/)
- [Story Types Index](../README.md)
