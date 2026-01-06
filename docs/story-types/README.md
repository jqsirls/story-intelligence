# Story Types Documentation

**Last Updated**: 2025-01-15  
**Total Story Types**: 14 (11 children's + 3 adult therapeutic)  
**Status**: Complete Documentation

## Overview

Storytailor supports 14 distinct story types, each optimized for specific use cases, age ranges, and user needs. Each story type has comprehensive documentation organized by audience: marketing, sales, development, and executives.

## Quick Navigation

### By Audience

- **Marketing Team**: See `{story-type}/marketing.md` for each story type
- **Sales Team**: See `{story-type}/sales.md` for each story type
- **Developers**: See `{story-type}/dev.md` for each story type
- **Executives**: See `{story-type}/executives.md` for each story type

### By Story Type

**Children's Story Types (Ages 2-14):**
1. [Adventure](./adventure/) - Action-packed journeys, quests, exploration (Ages 3-12)
2. [Bedtime](./bedtime/) - Calm, soothing stories for sleep time (Ages 2-10)
3. [Birthday](./birthday/) - Celebration-themed stories for special occasions (Ages 3-10)
4. [Educational](./educational/) - Learning-focused stories that teach concepts (Ages 3-12)
5. [Financial Literacy](./financial-literacy/) - Money management and financial concepts (Ages 3-14)
6. [Language Learning](./language-learning/) - Stories that help learn new languages (Ages 3-12)
7. [Medical Bravery](./medical-bravery/) - Coping with medical procedures or health challenges (Ages 3-10)
8. [Mental Health](./mental-health/) - Emotional well-being and coping strategies (Ages 3-12)
9. [Milestones](./milestones/) - Celebrating achievements and life transitions (Ages 3-14)
10. [New Chapter Sequel](./new-chapter-sequel/) - Continuing stories from previous sessions (Ages 3-12)
11. [Tech Readiness](./tech-readiness/) - Technology concepts and digital literacy (Ages 3-14)

**Adult Therapeutic Story Types:**
1. [Child Loss](./child-loss/) - Therapeutic stories for processing grief and honoring a child's memory
2. [Inner Child](./inner-child/) - Healing stories for connecting with and nurturing your inner child
3. [New Birth](./new-birth/) - Celebratory stories for welcoming new life and embracing change

## Story Type Quick Reference

| Story Type | Age Range | Primary Use Case | Category |
|------------|-----------|------------------|----------|
| Adventure | 3-12 | Action, exploration, quests | Children's |
| Bedtime | 2-10 | Sleep, calm, relaxation | Children's |
| Birthday | 3-10 | Celebration, special occasions | Children's |
| Educational | 3-12 | Learning, teaching concepts | Children's |
| Financial Literacy | 3-14 | Money management, saving | Children's |
| Language Learning | 3-12 | Language acquisition, culture | Children's |
| Medical Bravery | 3-10 | Medical procedures, courage | Children's |
| Mental Health | 3-12 | Emotions, coping, wellness | Children's |
| Milestones | 3-14 | Achievements, transitions | Children's |
| New Chapter Sequel | 3-12 | Continuation, series | Children's |
| Tech Readiness | 3-14 | Technology, digital literacy | Children's |
| Child Loss | Adult | Grief processing, remembrance | Therapeutic |
| Inner Child | Adult | Healing, self-compassion | Therapeutic |
| New Birth | Adult | New beginnings, change | Therapeutic |

## Documentation Structure

Each story type folder contains four comprehensive documentation files:

### marketing.md
- Value proposition and positioning
- Target audience and personas
- Key features and benefits
- Use cases and examples
- Competitive differentiation
- Marketing messaging
- Campaign ideas
- SEO keywords

### sales.md
- Sales pitch and talking points
- Target customer profiles
- Pain points addressed
- Key selling points
- Objection handling
- Demo scripts
- Pricing considerations
- ROI for customers

### dev.md
- Technical overview
- Story type classification logic
- Prompt templates and selection
- Age-appropriate constraints
- API integration
- Code implementation details
- Testing requirements
- Code references

### executives.md
- Executive summary
- Business value and market opportunity
- Revenue potential
- Competitive position
- Strategic importance
- Key metrics and growth projections
- Risk assessment
- Investor talking points

## Code References

**Type Definitions:**
- `packages/shared-types/src/types/story.ts:2-10` - StoryType type definition
- `packages/router/src/types.ts:4-16` - StoryType enum

**Classification:**
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Story type classification logic
- `packages/router/src/services/IntentClassifier.ts:447-561` - Story type prompts with keywords, examples, age ranges

**Prompt Selection:**
- `packages/content-agent/src/services/PromptSelector.ts:318-337` - Story type descriptions
- `packages/content-agent/src/services/PromptSelector.ts:123-136` - Prompt template creation
- `packages/content-agent/src/services/PromptSelector.ts:18-30` - Age-appropriate prompt selection

**Documentation:**
- `docs/storytailor/overview.md:57-78` - Story types overview
- `docs/prompts-library/content-generation.md:125-225` - Story-specific prompt templates

## Related Documentation

- **[Content Agent Documentation](../agents/content-agent/)** - Story generation engine
- **[Therapeutic Agent Documentation](../agents/therapeutic-agent/)** - Therapeutic story support
- **[Educational Agent Documentation](../agents/educational-agent/)** - Educational story features
- **[Story Intelligence Overview](../story-intelligence/overview.md)** - Story Intelligence platform
- **[Product Overview](../storytailor/product-overview.md)** - Complete product documentation

---

**Last Updated**: 2025-01-15  
**Maintained By**: Documentation Team  
**For Questions**: See [How We Work](../HOW_WE_WORK.md) or [Ownership](../OWNERSHIP.md)
