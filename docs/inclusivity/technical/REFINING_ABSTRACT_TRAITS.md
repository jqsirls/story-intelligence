# Refining Abstract Traits - Guide for Conditional Logic

## Purpose

This guide explains how to refine abstract/conditional traits to respect individual differences and avoid stereotyping while maintaining accurate representation.

## The Core Problem

**Prescriptive trait definitions** force visual elements that may not apply:
- "Autistic children wear headphones" - NOT all do
- "ADHD children use fidget spinners" - NOT all do
- "Diabetic children have visible insulin pumps" - Many use pens/injections

**Result**: Stereotyping that doesn't respect individual presentations.

## The Solution: Conditional Logic

**Make visual elements conditional on what user/family actually described in conversation.**

### Before (Prescriptive - Bad)

```typescript
gptImageSafePrompt: `Character with autism may wear noise-canceling headphones...`

mandatoryVisualRequirements: [
  'If character wears headphones: MUST be visible'
]
```

**Problem**: Assumes headphones, creates stereotype.

### After (Conditional - Good)

```typescript
gptImageSafePrompt: `Character is autistic (neurological difference).

VISUAL ELEMENTS - CONDITIONAL ON USER DESCRIPTION:
IF user described headphones: Show headphones as user described
IF user did NOT mention headphones: Focus on authentic autistic presentation WITHOUT objects

ALWAYS SHOW:
- Authentic engagement style (may look away)
- Intelligent, capable expression
- Joyful, valid way of being

Sensory supports shown ONLY if family mentioned them.`

mandatoryVisualRequirements: [
  'MUST show authentically engaged',
  'If supports mentioned: MUST show them',
  'If NO supports mentioned: MUST NOT add stereotypical objects'
]
```

**Result**: Respects what user actually said, doesn't impose stereotypes.

## How to Identify Traits Needing Refinement

### Red Flags

**Look for these patterns in trait definitions:**
- "May wear [object]" - Suggests optional but then forces it
- "Often uses [device]" - Creates stereotype
- Visual element for abstract concept (dyslexia → colored overlays)
- Neurological difference portrayed with objects (autism → headphones)

### Classification Test

Ask these questions:

1. **Is this trait inherently visual?**
   - Wheelchair: YES (physical device)
   - Down syndrome: YES (facial features)
   - Autism: NO (neurological)
   - Dyslexia: NO (learning difference)

2. **Do ALL people with this trait have visible markers?**
   - Wheelchair users: YES (wheelchair is visible)
   - Autistic people: NO (variable - some use supports, many don't)
   - Diabetic people: NO (pumps, pens, or injections - variable)

3. **Can you see it in a photo?**
   - Burn scars: YES (visible texture)
   - Dyslexia: NO (reading difference - invisible)

**If NO to any**: Make it conditional or abstract.

## Implementation Pattern

### Step 1: Update visualDescription

**Before**: "May wear headphones, fidget tools"  
**After**: "Often invisible - headphones/fidget tools conditional on user description"

### Step 2: Update gptImageSafePrompt

Add conditional section:

```
VISUAL ELEMENTS - CONDITIONAL ON USER DESCRIPTION:
IF user described [support]: Show [support] as described
IF user did NOT mention [support]: Focus on authentic [trait] presentation WITHOUT objects

ALWAYS SHOW:
- [Core characteristics that are always present]
- [Expression/engagement style]
- [Personality traits]

[Trait] is [neurological/learning/invisible].
[Supports] shown ONLY if user/family mentioned them.
```

### Step 3: Update mandatoryVisualRequirements

```typescript
mandatoryVisualRequirements: [
  'MUST show [core authentic presentation]',
  'If [support] mentioned in user description: MUST show it',
  'If NO [support] mentioned: MUST NOT add stereotypical [object]'
]
```

### Step 4: Test Both Scenarios

Generate images:
- **With support**: User says "wears purple headphones" → Should show purple headphones
- **Without support**: User says "is autistic" → Should NOT show headphones

## Traits Refined (December 2025)

### 1. Autism (Conditional)
**Before**: Assumed headphones/fidget tools  
**After**: Conditional on user description  
**Result**: Respects individual presentations

### 2. ADHD (Conditional)
**Before**: Assumed fidget tools  
**After**: Conditional - high energy shown through body language, tools only if mentioned  
**Result**: Natural energy, not forced objects

### 3. Dyslexia (Abstract)
**Before**: Colored overlays, audiobooks  
**After**: NO visual elements - story/personality only  
**Result**: Respects that dyslexia is invisible

### 4. Intellectual Disability (Abstract)
**Before**: Generic markers  
**After**: NO visual elements - show intelligence through engagement  
**Result**: Dignity-first, no stereotyping

### 5. Type 1 Diabetes (Conditional)
**Before**: Always showed insulin pump  
**After**: Conditional - many use pens/injections (invisible)  
**Result**: Respects variable management styles

### 6. Asthma (Conditional)
**Before**: Always showed inhaler  
**After**: Conditional - often invisible unless actively using  
**Result**: Respects that most asthma is invisible

## Parsing User Descriptions

### Example Conversational Flows

**Autism with supports:**
```
User: "My daughter is autistic and her purple headphones really help her"
System captures: {
  type: 'autism',
  description: 'autistic and her purple headphones really help her',
  userMentionedSupports: {
    headphones: true,
    color: 'purple'
  }
}
Image prompt: "wearing purple noise-canceling headphones"
```

**Autism without supports:**
```
User: "My son is autistic"
System captures: {
  type: 'autism',
  description: 'autistic'
}
Image prompt: "engaged authentically, may look away (valid autistic trait)"
(NO headphones added)
```

## Common Mistakes to Avoid

### Mistake 1: Forcing "Helpful" Visual Elements

**Bad**: "They're autistic so let's show headphones to be inclusive"  
**Why bad**: Not all autistic children use headphones - you're stereotyping  
**Good**: Show headphones ONLY if user mentioned them

### Mistake 2: Visual Markers for Abstract Traits

**Bad**: "Dyslexia is hard to show, let's add colored overlays"  
**Why bad**: Forcing visual element for invisible trait creates false representation  
**Good**: Don't try to "show" dyslexia visually - use in story/personality only

### Mistake 3: Assuming One Presentation

**Bad**: "Diabetic children have pumps, so always show pump"  
**Why bad**: Many use pens or injections (invisible)  
**Good**: Show pump ONLY if user described it

## Testing Conditional Traits

### Test Scenarios

For each conditional trait, test BOTH:

1. **With support mentioned**:
   ```
   description: "autistic and wears blue headphones"
   Expected: Blue headphones visible
   ```

2. **Without support mentioned**:
   ```
   description: "autistic"
   Expected: No headphones (don't force stereotype)
   ```

### Validation Criteria

- ✅ With support: Visual element present as described
- ✅ Without support: NO stereotypical objects added
- ✅ Both: Trait represented respectfully and authentically

## When to Make a Trait Conditional

**Make conditional if:**
- Trait has variable presentation (some have supports, some don't)
- Not all people with trait use same visual markers
- Forcing visual element creates stereotype
- User description should drive visual elements

**Keep mandatory if:**
- Trait is inherently visual (facial features, limb differences, devices)
- ALL people with trait have this characteristic
- Physical manifestation is the trait itself (wheelchair, prosthetic, burn scar)

## Documentation Updates

When refining a trait:

1. Update trait definition in ComprehensiveInclusivityDatabase.ts
2. Add to VISUAL_VS_ABSTRACT_TRAITS.md classification
3. Update TRAIT_DATABASE.md with new classification
4. Add warning to AI_IDE_REFERENCE.md if needed
5. Test both scenarios (with/without support)
6. Document in this guide

## Conclusion

**Conditional logic respects individual differences.**

Not all autistic children wear headphones.  
Not all ADHD children use fidget tools.  
Not all diabetic children have visible pumps.

**User description drives visual elements**, not our assumptions.

This is what makes Storytailor ethical and respectful.

---

**Last Updated:** December 2025  
**Status:** Guide for refining abstract/conditional traits, prevents stereotyping
