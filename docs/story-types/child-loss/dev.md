# Child Loss Story Type - Development

**Last Updated**: 2025-01-15  
**Audience**: Engineering | Developers | Technical Team  
**Story Type**: Child Loss (Adult Therapeutic)  
**Age Range**: Adult

## Technical Overview

The Child Loss story type provides therapeutic support for processing grief and honoring a child's memory. This is an adult therapeutic story type that requires special handling, therapeutic integration, and crisis support.

## Story Type Classification

### Classification Method

Child Loss stories are classified as adult therapeutic stories and require special handling:

**Code Location:**
- `packages/content-agent/src/services/PromptSelector.ts:304-313` - Available story types includes 'Child Loss'
- `packages/content-agent/src/services/PromptSelector.ts:331` - Child Loss description

### Story Type Description

**Description:**
"Therapeutic stories for processing grief and honoring a child's memory"

**Code Reference:**
- `packages/content-agent/src/services/PromptSelector.ts:331` - Story type description

## Prompt Templates and Selection

### Story-Specific Prompt

**Child Loss Story Prompt:**
```
Create therapeutic grief processing stories with:
- Gentle exploration of loss and remembrance
- Honoring the child's unique personality and impact
- Journey through grief toward healing and connection
- Safe emotional processing with grounding techniques
- Validation of complex emotions and experiences
- Symbols of enduring love and memory
- Age-appropriate language for the intended audience
- Professional therapeutic principles integrated naturally
```

**Code Reference:**
- `docs/prompts-library/content-generation.md:206-214` - Child Loss prompt template

## Therapeutic Agent Integration

### Grief Support

Child Loss stories require full integration with Therapeutic Agent for:
- **Grief Processing**: Evidence-based grief support
- **Crisis Detection**: Detection of emotional distress
- **Professional Referrals**: Referral pathways for additional support
- **Therapeutic Pathways**: Grief support therapeutic pathways

**Code Reference:**
- `packages/therapeutic-agent/src/TherapeuticAgent.ts` - Therapeutic Agent
- `docs/agents/therapeutic-agent/development.md` - Therapeutic Agent documentation

## Special Handling Requirements

### Adult Audience
- **Audience Type**: Adult (not children)
- **Age Validation**: Stories are for adults only
- **Content Moderation**: Special content moderation for therapeutic content

### Crisis Support
- **Crisis Detection**: Automatic crisis detection
- **Intervention Protocols**: Crisis intervention protocols
- **Professional Referrals**: Referral pathways for professional support
- **Safety Resources**: Integration with safety resources

## Code References

### Type Definitions
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type (includes 'Child Loss')

### Therapeutic Integration
- `packages/therapeutic-agent/src/TherapeuticAgent.ts` - Therapeutic Agent
- `docs/agents/therapeutic-agent/development.md` - Therapeutic Agent documentation

### Prompt Selection
- `packages/content-agent/src/services/PromptSelector.ts:331` - Child Loss description
- `docs/prompts-library/content-generation.md:206-214` - Child Loss prompt template

---

**Related Documentation:**
- [Child Loss - Marketing](./marketing.md)
- [Child Loss - Sales](./sales.md)
- [Child Loss - Executives](./executives.md)
- [Therapeutic Agent Documentation](../agents/therapeutic-agent/)
- [Story Types Index](../README.md)
