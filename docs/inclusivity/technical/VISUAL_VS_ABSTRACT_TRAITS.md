# Visual vs Abstract Traits - Definitive Classification

## Purpose

This document provides the definitive classification of all 39 inclusivity traits into three categories: Always Visual, Conditional, and Abstract. This distinction ensures we respect individual differences and avoid stereotyping.

## Core Principle

**Storytailor is user-driven through conversation.**

- Families/teachers/children describe THEIR unique child
- System captures what THEY say
- Images reflect THEIR description, not imposed stereotypes

## Classification System

### Always Visual (28 traits)

These traits have inherent physical manifestation - they MUST always be visible in images.

#### Structural/Anatomical (5)
1. **down_syndrome** - Facial features (almond eyes, flat bridge, rounded face)
2. **dwarfism** - Proportional anatomy
3. **facial_differences** - Structural facial variations
4. **cleft_lip** - Facial characteristic
5. **cerebral_palsy** - Movement patterns, often uses wheelchair

#### Limb Differences (3)
6. **limb_difference_arm_missing** - Anatomically absent limb
7. **prosthetic_leg** - Physical device
8. **prosthetic_arm** - Physical device
9. **limb_length_discrepancy** - Visible length difference

#### Surface Characteristics (4)
10. **burn_scars** - Skin texture/pattern
11. **vitiligo** - Skin pattern (patches)
12. **albinism** - Pigmentation (pale features)
13. **birthmark_large** - Skin marking

#### Physical Mobility Devices (6)
14. **wheelchair_manual** - Physical device (always present)
15. **wheelchair_power** - Physical device (always present)
16. **walker** - Physical device
17. **crutches** - Physical device
18. **scoliosis_brace** - Physical device
19. **orthotic_devices** - Physical devices

#### Medical Devices (10)
20. **halo_cervical_orthosis** - Physical device (Power Detection Crown)
21. **port_a_cath** - Physical device (visible under clothing)
22. **tracheostomy** - Physical device
23. **feeding_tube_gtube** - Physical device
24. **oxygen_cannula** - Physical device
25. **iv_picc_line** - Physical device
26. **cochlear_implant_external** - Physical device (external component)
27. **cranial_helmet** - Physical device (ages 0-3 typical, gentle check if older)
28. **dialysis_access** - Physical site/device
29. **medical_alert_symbol** - Physical device (bracelet)

### Conditional (8 traits)

These traits have NO inherent visual manifestation OR variable presentation - visual elements shown ONLY if user mentioned them.

#### Neurodiversity with Optional Supports (2)
30. **autism** - Headphones/fidget tools ONLY if user mentioned
31. **adhd** - Fidget tools ONLY if user mentioned

#### Sensory (2)
32. **deaf** - Some use hearing aids, some don't, some use ASL only
33. **hearing_aids** - Physical device (but separate trait - user must select it)
34. **visual_impairment** - May have cane/sunglasses, conditional on severity

#### Medical Conditions Often Invisible (3)
35. **type1_diabetes** - Insulin pump/CGM ONLY if user mentioned
36. **asthma** - Inhaler ONLY if user mentioned
37. **childhood_cancer** - Hair loss/port conditional on treatment stage

### Abstract (3 traits)

These traits have NO visual manifestation - story/personality integration ONLY, no visual elements.

38. **dyslexia** - Learning difference (invisible)
39. **intellectual_disability** - Cognitive difference (invisible)
40. **adhd** (without supports) - Neurological (can be shown through energy/body language, not objects)

**Note**: Some traits appear in multiple categories depending on user description (ADHD with fidget tool = conditional, ADHD without = abstract/behavioral).

## Why This Classification Matters

### Always Visual Traits

**Why mandatory**: These traits have physical manifestation that defines the representation.

**Example**: 
- Down syndrome: Almond eyes, flat bridge ARE the representation
- Wheelchair: Physical device IS part of their mobility
- Burn scars: Surface texture IS visible

**Result**: MUST show in images, no exceptions.

### Conditional Traits

**Why conditional**: Visual elements exist but vary by individual.

**Example**:
- Autism: Some children wear headphones, many don't
- Type 1 diabetes: Some use visible insulin pumps, some use pens (hidden)
- Deaf: Some use hearing aids, some don't

**Result**: Show visual elements ONLY if user/family mentioned them in conversation.

### Abstract Traits

**Why abstract**: NO inherent visual manifestation.

**Example**:
- Dyslexia: Reading difference - what does it "look like"? Nothing.
- Intellectual disability: Cognitive difference - no visual markers

**Result**: Story/personality integration only. Don't force visual elements.

## Prompt Writing Guide

### For Always Visual Traits

```
MANDATORY - [TRAIT NAME]:
- [Specific visual requirement]
- [Specific visual requirement]
- REJECT IMAGE if not visible
```

**No conditionals**. Trait must always be shown.

### For Conditional Traits

```
[TRAIT NAME] - CONDITIONAL:

IF user mentioned [support]:
  - Show [support] as described
  
IF user did NOT mention [support]:
  - Focus on authentic [trait] presentation
  - Do NOT add stereotypical objects
```

**Check user input before adding visual elements.**

### For Abstract Traits

```
[TRAIT NAME] - Story/Personality Only:

This trait has NO visual manifestation.
Use for personality, strengths, story integration.
Do NOT force visual elements.
```

**No visual prompts.** Used in story narrative only.

## Examples

### Good: Down Syndrome (Always Visual)

User says: "My daughter has Down syndrome"

**Prompt**: 
- MANDATORY: Almond-shaped eyes with upward slant
- MANDATORY: Flatter nasal bridge
- MANDATORY: Rounded fuller cheeks

**Result**: Shows DS features (it's a visual trait)

### Good: Autism (Conditional)

**Scenario A** - User says: "My son is autistic and loves his purple headphones"

**Prompt**: Show purple noise-canceling headphones (user mentioned them)

**Scenario B** - User says: "My daughter is autistic"

**Prompt**: Focus on authentic engagement, may look away (NO headphones - user didn't mention them)

### Bad: Autism (Prescriptive - Don't Do This)

User says: "My daughter is autistic"

**Bad Prompt**: Show headphones and fidget spinner (FORCING stereotypes user didn't describe)

**Why bad**: Not all autistic children use these supports. We're imposing our assumption.

### Good: Dyslexia (Abstract)

User says: "My son has dyslexia"

**Prompt**: Show intelligent, creative expression. Engaged in building/art/sports (non-reading strengths)

**NO visual markers** - dyslexia is invisible.

**Story integration**: Character might prefer listening to stories, excel at visual tasks, show intelligence in non-reading contexts.

## Database/API Integration

### User Description Capture

```typescript
// From conversational flow
inclusivityTraits: [{
  type: 'autism',
  description: 'My daughter is autistic and wears purple headphones', // USER SAID THIS
  userMentionedSupports: {
    headphones: true,  // Parsed from description
    color: 'purple'    // Specific detail
  }
}]
```

### Conditional Rendering Logic

```typescript
if (trait.id === 'autism') {
  if (trait.userMentionedSupports?.headphones) {
    // User mentioned - show them
    prompt += `wearing ${trait.userMentionedSupports.color || 'colorful'} noise-canceling headphones`;
  } else {
    // Not mentioned - don't force
    prompt += `engaged authentically (may look away, deeply focused)`;
  }
}
```

## Age-Constrained Traits

### Cranial Helmet (Ages 0-3 Typical)

**Classification**: Always Visual (physical device)

**Age check**: If age > 3, show gentle conversational confirmation:
- "Cranial helmets are usually for babies and toddlers. Is this for your child's specific situation?"
- If yes: Proceed
- If no: Suggest they might mean different trait

**Why**: Educate gently, catch mistakes, but respect exceptional medical cases.

## Validation Checklist

When creating/reviewing traits:

- [ ] Is this trait inherently visual? (facial features, devices, skin characteristics)
- [ ] Or does it vary by individual? (some use supports, some don't)
- [ ] Or is it completely abstract? (learning/cognitive differences)
- [ ] Does user description mention specific supports?
- [ ] Are we forcing visual elements user didn't mention?
- [ ] Are we respecting individual differences?

## Summary Table

| Trait Category | Count | Show When | Examples |
|----------------|-------|-----------|----------|
| Always Visual | 28 | Always | DS, wheelchair, scars, limb differences |
| Conditional | 8 | If user mentioned | Autism with headphones, diabetes with pump |
| Abstract | 3 | Story only | Dyslexia, intellectual disability |

**Total**: 39 traits, all properly classified to respect individual differences while ensuring accurate representation.

---

**Last Updated:** December 2025  
**Status:** Definitive classification established, prevents stereotyping
