# Trait Types - Developer Guide

## Purpose

Complete technical guide for developers working with the 39-trait inclusivity system.

## Three Trait Classifications

### Visual Traits (28 traits)

**Definition**: Inherent physical manifestation - MUST always show in images.

**Examples**: Down syndrome (facial features), wheelchair (physical device), burn scars (surface texture), prosthetic (physical device)

**Implementation**:
- Always include in prompts
- Always validate with vision model
- Species-first language for structural traits
- Imagination transformation for devices

**Code**:
```typescript
// Visual traits are MANDATORY
mandatoryVisualRequirements: [
  'MUST show wheelchair visible',
  'MUST show character seated'
]
```

### Conditional Traits (8 traits)

**Definition**: Variable presentation - show ONLY if user mentioned in conversation.

**Examples**: Autism WITH headphones (if user mentioned), diabetes WITH pump (if user mentioned)

**Implementation**:
- Parse user description with `parseUserMentionedSupports()`
- Conditionally include visual elements
- Never force stereotypical supports

**Code**:
```typescript
// Check what user actually said
if (trait.id === 'autism') {
  const supports = this.parseUserMentionedSupports(trait, userDescription);
  if (supports.headphones) {
    // User mentioned - show them
    prompt += `wearing ${supports.colorOverride || 'colorful'} headphones`;
  } else {
    // Not mentioned - don't force
    prompt += `engaged authentically (may look away)`;
  }
}
```

### Abstract Traits (3 traits)

**Definition**: NO visual manifestation - story/personality only.

**Examples**: Dyslexia (learning difference), intellectual disability (cognitive difference)

**Implementation**:
- Do NOT add to image prompts
- Use in personality, strengths, story integration only
- Show intelligence, capability, not forced "markers"

## Headshot vs Bodyshot Logic

**Common sense applicability**:

**Bodyshot Only** (`appliesToHeadshot: false`):
- Prosthetic leg/arm
- Wheelchair
- Walker/crutches
- Scoliosis brace
- Limb length discrepancy

**Both** (default):
- Facial traits (Down syndrome, facial differences, cleft lip)
- Skin patterns (vitiligo, burn scars, albinism)
- Head devices (halo, cranial helmet)

**Code**:
```typescript
// Trait definition
{
  id: 'prosthetic_leg',
  appliesToHeadshot: false,  // Legs not in headshot
  appliesToBodyshot: true
}

// Validation filters automatically
const applicableTraits = expectedTraits.filter(trait => {
  if (imageType === 'headshot') return trait.appliesToHeadshot !== false;
  else return trait.appliesToBodyshot !== false;
});
```

## Natural Language Detection

**Use searchTraits() for conversational capture**:

```typescript
import { searchTraits } from '../constants/ComprehensiveInclusivityDatabase';

// Child says: "special helmet"
const matches = searchTraits("special helmet");
// Returns: [cranial_helmet, halo_cervical_orthosis]

// System asks clarifying question:
if (matches.length > 1) {
  clarifyingQuestion = `Did you mean ${matches[0].label} or ${matches[1].label}?`;
}
```

**ConversationalHints examples**:
- Cranial helmet: 'wears helmet', 'head helmet', 'special helmet'
- Feeding tube: 'tube for eating', 'G-tube', 'feeding tube'
- Wheelchair: 'chair with wheels', 'uses wheelchair', 'rolls'

**Every trait has 3-5 hints** for natural language matching.

## Testing Strategies

**Visual traits**: Test on human + creature with diverse ethnicities  
**Conditional traits**: Test with/without user mentions  
**Abstract traits**: Test personality integration, not images

**Pattern**:
```bash
# Build first
cd lambda-deployments/content-agent && npm run build

# Run standalone script
node scripts/test-visual-traits-validation.js
```

## Code Locations

- **Trait database**: `lambda-deployments/content-agent/src/constants/ComprehensiveInclusivityDatabase.ts`
- **Image generator**: `lambda-deployments/content-agent/src/services/CharacterImageGenerator.ts`
- **Species profiles**: `lambda-deployments/content-agent/src/constants/SpeciesAnatomyProfiles.ts`
- **Conversation manager**: `lambda-deployments/content-agent/src/services/CharacterConversationManager.ts`
- **Validation service**: `lambda-deployments/content-agent/src/services/ImageSafetyReviewService.ts`

---

**Last Updated**: December 22, 2025  
**For**: Developers working on inclusivity system
