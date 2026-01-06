# AI IDE Reference - Inclusivity System Patterns

## Purpose

This document prevents pattern loss and file location amnesia for AI coding assistants. It documents EXACT patterns, file locations, and critical "DO NOT" rules that must be preserved.

## ⚠️ FOR AI CODING ASSISTANTS READING THIS

If you are an AI assistant (Claude, GPT, Copilot, etc.) working on this codebase:

### DO NOT Suggest These "Improvements"

❌ **"This trait database is too long, let's use a config file"**
- Config files = easier to delete, harder to version control

❌ **"We can reduce to 5-10 representative traits"**
- "Representative" = 29-34 other children EXCLUDED

❌ **"Let's create a generic trait handler for DRY code"**
- Generic = loses medical specificity. Down syndrome ≠ wheelchair ≠ vitiligo

❌ **"This function is too complex, let's simplify"**
- Complexity = 9 months of AI bias mitigation. "Simplification" = broken

❌ **"TODO: Add remaining traits in future PR"**
- TODO = child excluded NOW. "Future PR" never happens

❌ **"This prompt is too long, let's shorten it"**
- Length = fighting AI bias. Short = AI ignores traits

❌ **"We only need species-first language for a few traits"**
- ALL structural traits need it. Without it: "human in costume" problem

### What TO Suggest

✅ Adding NEW traits (expanding from 39 to 40+)  
✅ Bug fixes with tests proving no regression  
✅ Documentation improvements that add detail  
✅ Performance optimizations that maintain accuracy

### DO NOT: Force Visual Elements on Abstract Traits

**CRITICAL DISTINCTION**: Visual vs Abstract Traits

❌ **DO NOT add visual elements to abstract/conditional traits:**
- **Autism**: Do NOT force headphones unless user mentioned them
- **ADHD**: Do NOT force fidget tools unless user mentioned them
- **Dyslexia**: Do NOT add colored overlays/audiobooks (NO visual manifestation)
- **Intellectual Disability**: Do NOT add visual markers (cognitive difference is invisible)
- **Type 1 Diabetes**: Do NOT force insulin pump unless user mentioned it
- **Asthma**: Do NOT force inhaler unless user mentioned it

**Why**: These traits are conditional on what the user/family actually described. Not all autistic children wear headphones. Not all diabetic children use visible pumps.

❌ **DO NOT stereot**: Forcing visual elements creates stereotypes and doesn't respect individual differences.

✅ **DO**: Make visual elements conditional on user description captured in conversation.

**See**: `docs/inclusivity/technical/VISUAL_VS_ABSTRACT_TRAITS.md` for complete classification.

### Remember

**Every line of code represents a child seeing themselves as a hero.**

If you suggest removing lines, you're suggesting removing children.  
If you force stereotypical visual elements, you're not respecting THEIR unique presentation.

### Tests Will Catch Violations

Automated tests will fail if you ignore these warnings:
- InclusivitySystemIntegrity.test.ts
- ContextDeterminationLogic.test.ts  
- DualBehaviorValidation.test.ts
- NoPlaceholdersAllowed.test.ts
- InclusivityRegressionDetection.test.ts

**Result**: Deployment blocked. CI fails. Cannot break this.

## What We Accomplished

- **39 inclusivity traits** working universally across 9 species
- **100% OpenAI filter success** for ages 5-8
- **Species-first language** preventing "human in costume"
- **Context-sensitive transformations** (medical vs imagination)
- **3,442 lines of proprietary logic** in ComprehensiveInclusivityDatabase.ts
- **Text-to-accurate-representation** WITHOUT photo uploads (ethical innovation)

## Where It's Deployed

**Production Status**: ✅ ACTIVE (Last deployed: December 23, 2025, 3:00 PM EST)

- **Lambda Functions:**
  - `storytailor-content-agent-production` (primary image generation)
  - `storytailor-universal-agent-production` (orchestration, last modified: 2025-12-23T20:00:09 UTC)

- **File Locations:**
  - `lambda-deployments/content-agent/src/constants/ComprehensiveInclusivityDatabase.ts` (3,442 lines - ALL 39 traits)
  - `lambda-deployments/content-agent/src/constants/SpeciesAnatomyProfiles.ts` (9 species profiles)
  - `lambda-deployments/content-agent/src/services/CharacterImageGenerator.ts` (prompt building logic)
  - `lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts` (VERIFIED: No artist names)

## The Wheelchair Pattern (Universal Template)

**This pattern works for ALL device-safety-risk traits (halo, prosthetics, hearing aids, etc.)**

### Core Principles

1. **Zero Medical Language** - Remove all clinical/invasive terms
2. **Absolute Identity Statements** - "IS superhero equipment" not "like superhero"
3. **Pure Capability Framing** - Focus on what it DOES, not what it fixes
4. **Explicit Negatives** - "NOT angel halo" prevents dangerous misinterpretation

### Template Structure

```typescript
contextDescriptions: {
  medical: `[DEVICE NAME] with [CAPABILITY DESCRIPTION]. [Device] IS [IDENTITY STATEMENT]. [Components] connect [device] to [power source]. [Device] [ACTION] and [ACTION]. Decorated with [decorative elements]. NOT [dangerous misinterpretation] - this IS [CORRECT IDENTITY].`,
  
  superhero: `[SUPERHERO NAME] with [SUPERHERO CAPABILITY]. [Components] radiating from [device] to [power core]. [Device] [SUPERHERO ACTION] and [SUPERHERO ACTION]. Glowing with [power description]. [Device] is source of [superhero ability].`,
  
  fantasy: `[FANTASY NAME] with [MAGICAL CAPABILITY]. [Enchanted components] flowing from [device] to [magical source]. [Device] channels [magical action] and [magical action]. Glows with [magical power]. [Fantasy description].`,
  
  scifi: `[SCIFI NAME] with [TECH CAPABILITY]. [Tech components] connecting [device] to [tech core]. [Device] provides [tech action] and [tech action]. [Futuristic description].`,
  
  robot: `[ROBOT NAME] as integrated component. [Structural description] extending from [device] to [robot chassis]. [Connection description] linking [components]. Built-in [robot feature]. Part of robot configuration.`
}
```

### Example: Halo Device (Power Detection Crown)

```typescript
contextDescriptions: {
  medical: `POWER DETECTION CROWN with glowing sensors and force field projectors. Crown IS superhero danger-scanner. Energy bars connect crown to chest power core. Crown SCANS for threats and PROJECTS protective shields. Decorated with hero emblems and power symbols. NOT angel halo - this IS SUPERHERO EQUIPMENT.`,
  
  superhero: `ENERGY CROWN with glowing star points projecting force fields and power beams. Luminous conduits radiating from crown down to chest power core unit. Crown scans environment and projects protective energy shields. Glowing with hero power, strength, and courage. Energy crown is source of hero scanning abilities.`,
  
  // ... other contexts
}
```

### Why This Works

- **Zero medical language** = No filter triggers
- **Absolute identity** = AI can't misinterpret ("IS superhero" not "like superhero")
- **Capability focus** = Empowerment not limitation
- **Explicit negatives** = Prevents dangerous symbols (angel halo)

## Species-First Language Pattern

**Prevents "human in costume" problem for structural traits (Down syndrome, facial differences, etc.)**

### Decision Tree

```
IF species === 'human':
  → Use direct medical description
  → Traits apply directly

ELSE IF species === 'dragon' | 'monster' | 'robot' | etc.:
  → Use SPECIES-FIRST language
  → Format: "[SPECIES] [FEATURE] (species-specific, NOT human) with [TRAIT CHARACTERISTIC]"
  → Example: "DRAGON EYES (reptilian, NOT human) with ALMOND SHAPE"
```

### Template Structure

```typescript
// WRONG (causes "human in costume"):
"Almond-shaped eyes with upward slant"  // AI thinks: human child

// CORRECT (species-first):
"DRAGON EYES (reptilian, NOT human) with ALMOND SHAPE and upward tilt"
// AI thinks: dragon with DS-adapted features
```

### Example: Down Syndrome on Dragon

```typescript
gptImageSafePrompt: `DRAGON EYES (reptilian, NOT human) with ALMOND SHAPE and gentle upward tilt. Softer rounded DRAGON SNOUT (not angular dragon snout). Rounder DRAGON FACE with gentler features. This is DRAGON anatomy showing Down syndrome characteristics - recognizable as "has DS too!" on dragon form.`
```

### Critical Rules

1. **Species name FIRST** - "DRAGON EYES" not "eyes on dragon"
2. **Explicit "NOT human"** - Prevents costume interpretation
3. **Species-specific anatomy** - "DRAGON SNOUT" not "nose"
4. **Recognizable adaptation** - Mother can say "That dragon has DS too!"

## Context Determination Logic

**When to use medical vs imagination contexts**

### Context Selection Algorithm

```typescript
function selectContext(trait: InclusivityTrait, characterContext: CharacterContext): string {
  // Device-safety-risk traits: ALWAYS use imagination for human children
  if (trait.id === 'halo_cervical_orthosis' && characterContext.species === 'human') {
    // Default to superhero (proven to work universally)
    return 'superhero';  // or 'medical' if explicitly requested
  }
  
  // For fantasy species: Use fantasy/scifi/robot contexts
  if (characterContext.species === 'dragon' || characterContext.species === 'fantasy_being') {
    return 'fantasy';
  }
  
  if (characterContext.species === 'robot') {
    return 'robot';
  }
  
  if (characterContext.species === 'alien') {
    return 'scifi';
  }
  
  // For human + superhero context: Use superhero
  if (characterContext.context === 'superhero') {
    return 'superhero';
  }
  
  // Default: medical (for human, realistic contexts)
  return 'medical';
}
```

### Context Priority

1. **Character species** (dragon → fantasy, robot → robot)
2. **Story context** (superhero story → superhero)
3. **Trait type** (device-safety-risk → prefer imagination)
4. **Default** (human, realistic → medical)

## Critical "DO NOT" Patterns

### DO NOT: Revert to Medical Language

```typescript
// WRONG - Will trigger filters:
"Medical halo device with pins screwed into skull"

// CORRECT - Power Detection Crown:
"POWER DETECTION CROWN with glowing sensors"
```

### DO NOT: Use Generic Trait Descriptions on Non-Human Species

```typescript
// WRONG - Causes "human in costume":
"Almond-shaped eyes"  // on dragon

// CORRECT - Species-first:
"DRAGON EYES (reptilian, NOT human) with ALMOND SHAPE"
```

### DO NOT: Remove Critical Safety Negatives

```typescript
// ALWAYS include for halo device:
criticalSafetyNegatives: ['NOT angel halo', 'NOT decorative crown', 'NOT golden ring']
```

### DO NOT: Change Artistic Style When Adding Traits

```typescript
// Style is CONSTANT across all traits:
ARTISTIC_EXECUTION + GLOBAL_STYLE  // Always same, regardless of traits
```

### DO NOT: Use Artist Names in Prompts

```typescript
// VERIFIED: GlobalArtStyle.ts uses TECHNIQUE descriptions only:
"digital hand-painting, airbrush, canvas texture"
"high-end graphic novels"  // Generic category, NOT "Eric Carle style"
```

## Prompt Building Order (CRITICAL)

**Order matters - this sequence prevents AI misinterpretation:**

1. **Species Anatomy Prefix** (if non-human)
   - `buildSpeciesAnatomyPrefix()` output
   - Prevents "human in costume"

2. **Artistic Execution**
   - `ARTISTIC_EXECUTION` constant
   - Sets style expectation

3. **Global Style**
   - `GLOBAL_STYLE` constant
   - Reinforces style

4. **Character Details**
   - Name, age, species, ethnicity
   - Hex colors (skin, hair, eyes)

5. **Mandatory Section**
   - `buildMandatorySection()` output
   - Includes context-sensitive trait descriptions
   - Includes critical safety negatives

6. **Negative Prompt Section**
   - `buildNegativePromptSection()` output
   - What NOT to do

7. **Final Reminder**
   - Style enforcement across ALL species
   - "Species anatomy varies, ARTISTIC STYLE does not"

## Deployment Verification

### How to Check Production Has Latest

1. **Check Lambda Function Code:**
   ```bash
   aws lambda get-function --function-name storytailor-content-agent-production
   ```

2. **Verify ComprehensiveInclusivityDatabase.ts:**
   - Should be 3,442+ lines
   - Should have 39 traits
   - Should have `contextDescriptions` for halo device

3. **Verify SpeciesAnatomyProfiles.ts:**
   - Should have 9 species profiles
   - Should have `exampleAdaptations` for common traits

4. **Verify CharacterImageGenerator.ts:**
   - Should call `buildSpeciesAnatomyPrefix()` FIRST
   - Should use `buildMandatorySection()` with context selection
   - Should include `ARTISTIC_EXECUTION` and `GLOBAL_STYLE`

## Test Protocols

### Spacing Strategy

- **Between tests:** 2-3 seconds minimum
- **Between batches:** 10-15 seconds
- **Rate limit handling:** Exponential backoff

### Validation Stages

1. **Quick Validation** (Stage 1)
   - 3-5 images per variant
   - Ages 6-7 (proven to work)
   - Fail-fast if filter rejects

2. **Confirmation** (Stage 2)
   - 3x repeatability test
   - Same variant, same age
   - Must pass 3/3

3. **Universal Validation** (Stage 4)
   - Ages 4, 5, 6, 8
   - Diverse ethnicities
   - Must pass 8/8 for universal success

### Metrics to Log

- Filter rejection rate (target: 0%)
- Trait visibility (vision model validation)
- Style consistency (non-blocking but logged)
- Generation time (target: <40 seconds)

## File Reference System (Consistency Method)

**Using `images.edit()` for bodyshot/headshot consistency:**

```typescript
// 1. Generate headshot first
const headshotResult = await generateHeadshot(...);

// 2. Convert headshot buffer to OpenAI File object
const headshotFile = await convertBufferToFile(headshotBuffer);

// 3. Use images.edit() for bodyshot with headshot as reference
const bodyshotResult = await generateBodyshotWithReference(
  headshotFile,  // File object from headshot
  traits,
  inclusivityTraits,
  hexColors
);
```

**Why this works:**
- OpenAI `images.edit()` uses reference image to maintain consistency
- Face, hair, skin tone match automatically
- Only body pose and clothing change

## Common Pitfalls & Solutions

### Pitfall 1: "Human in Costume" on Dragon

**Symptom:** Dragon looks like human child with dragon features

**Solution:** Use species-first language in `buildSpeciesAnatomyPrefix()`

**Fix:**
```typescript
// Add to prompt FIRST:
"=== SPECIES ANATOMY - CRITICAL ===
This is DRAGON anatomy, NOT a human child in costume.
DRAGON body, DRAGON features, DRAGON proportions."
```

### Pitfall 2: Halo Device Rejected by Filter

**Symptom:** OpenAI safety filter rejects as `[sexual]` or `[violence]`

**Solution:** Use Power Detection Crown language (zero-medical, superhero identity)

**Fix:**
```typescript
// Use contextDescriptions.medical (Power Detection Crown):
"POWER DETECTION CROWN with glowing sensors. Crown IS superhero danger-scanner."
```

### Pitfall 3: Trait Not Visible in Generated Image

**Symptom:** Vision model validation fails (trait not detected)

**Solution:** Strengthen `mandatoryVisualRequirements` and add to prompt

**Fix:**
```typescript
// Add explicit visibility requirements:
"MUST show [trait] clearly visible. [Trait] MUST be [specific description]."
```

### Pitfall 4: Style Changes When Adding Traits

**Symptom:** Artistic style becomes photorealistic or changes

**Solution:** Ensure `ARTISTIC_EXECUTION` and `GLOBAL_STYLE` are ALWAYS included

**Fix:**
```typescript
// Always include in prompt (even with traits):
${ARTISTIC_EXECUTION}
${GLOBAL_STYLE}
// Then add traits
```

## Maintenance Procedures

### Adding a New Trait

1. **Add to ComprehensiveInclusivityDatabase.ts:**
   - Follow existing trait structure
   - Include `contextDescriptions` if device-safety-risk
   - Include `criticalSafetyNegatives` if misinterpretation risk

2. **Add to SpeciesAnatomyProfiles.ts:**
   - Add `exampleAdaptations` entry for each species
   - Show how trait adapts to species anatomy

3. **Test thoroughly:**
   - Quick validation (3-5 images)
   - Confirmation (3x repeatability)
   - Universal validation (ages 4-8, diverse ethnicities)

4. **Update documentation:**
   - TRAIT_DATABASE.md
   - This file (if pattern changes)

### Modifying Existing Trait

1. **Identify issue:**
   - Filter rejection? → Use wheelchair pattern
   - Not visible? → Strengthen mandatory requirements
   - Wrong species adaptation? → Update species-first language

2. **Test incrementally:**
   - One change at a time
   - Validate after each change

3. **Document change:**
   - Why changed
   - What worked
   - Test results

## Critical Constants to Preserve

### ARTISTIC_EXECUTION (GlobalArtStyle.ts)

```typescript
export const ARTISTIC_EXECUTION = `
ARTISTIC EXECUTION:
High-resolution digital hand-painting with soft airbrush blends layered over subtle 
painterly brush strokes. Fine canvas tooth texture where needed for organic warmth.
// ... (DO NOT modify without testing)
`;
```

**DO NOT:**
- Add artist names
- Change to photorealistic
- Remove painterly language

### GLOBAL_STYLE (GlobalArtStyle.ts)

```typescript
export const GLOBAL_STYLE = `
GLOBAL STYLE (fixed)
— Medium & surface: ultra-high-res digital hand-painting...
// ... (DO NOT modify without testing)
`;
```

**DO NOT:**
- Change style description
- Remove "STRICT: no text, captions, UI"

## Emergency Rollback

**If production breaks:**

1. **Revert to last known working version:**
   ```bash
   git checkout <last-working-commit> -- lambda-deployments/content-agent/src/constants/ComprehensiveInclusivityDatabase.ts
   ```

2. **Verify in staging:**
   - Test 3-5 images
   - Check filter rejection rate

3. **Deploy:**
   ```bash
   ./scripts/deploy-universal-agent-proper.sh staging
   ```

## Protection & Testing

### CRITICAL: Two Implementations Exist

- **Production**: `lambda-deployments/content-agent/` (1,555+ lines, 94 files)
  - Full 39-trait inclusivity system
  - generateReferenceImagesWithValidation() method
  - ComprehensiveInclusivityDatabase.ts (3,442 lines)
  - CharacterImageGenerator.ts with species-first language
  - SpeciesAnatomyProfiles.ts for 9 species

- **Legacy**: `packages/content-agent/` (904 lines, 43 files)
  - INCOMPLETE - missing inclusivity system
  - DO NOT USE for production development

**ALWAYS use `lambda-deployments/content-agent/` for development.**

### Integrity Tests (Run Before ANY Deployment)

```bash
# Fast structural checks (no API calls, <10 seconds)
npm test -- InclusivitySystemIntegrity.test.ts
npm test -- ContextDeterminationLogic.test.ts
npm test -- NoPlaceholdersAllowed.test.ts
npm test -- InclusivityRegressionDetection.test.ts
```

**Must pass:**
- ✅ generateReferenceImagesWithValidation method exists
- ✅ 39+ traits in database
- ✅ 9+ species profiles exist
- ✅ Context determination works for all species
- ✅ No TODO/FIXME placeholders
- ✅ No generic handlers
- ✅ File line counts maintained (no "simplification")
- ✅ Species-first language patterns intact

### Dual Behavior Validation (Run On-Demand)

```bash
# Validates core achievement: human AND non-human both work
# Requires OPENAI_API_KEY
npm test -- DualBehaviorValidation.test.ts
```

**Validates:**
- ✅ Down syndrome: Medical (human) vs Species-first (dragon)
- ✅ Halo device: Power Detection Crown (human) vs Energy Crown (superhero)
- ✅ Wheelchair: Decorated (human) vs Mobility platform (robot)

**Cost**: ~$0.24 (6 images)  
**Time**: ~5 minutes

### Sample Validation (Run Before Major Releases)

```bash
# Tests 8 traits × 2 species = 16 images
# Requires OPENAI_API_KEY
npm test -- InclusivitySampleValidation.test.ts
```

**Coverage**:
- Structural: down_syndrome, facial_differences, dwarfism
- Surface: vitiligo, burn_scars
- Device: wheelchair, halo, port_a_cath

**Cost**: ~$0.64 (16 images)  
**Time**: ~12 minutes  
**Results stored in**: `s3://{bucket}/inclusivity-tests/{date}/`

### Protection Layers

1. **Runtime Enforcement** - Crashes if <39 traits (production/CI only)
2. **Pre-commit Hooks** - Blocks commits with <39 traits or placeholders (auto-install via npm prepare)
3. **CI Tests** - Runs integrity tests before deployment
4. **Deploy Script** - Verifies system before Lambda update
5. **Anti-Simplification Headers** - Warns AI in code comments
6. **Test Suite** - 43 tests validate structure, logic, and integration

**Result**: Six overlapping layers. Regression impossible without multiple failures.

## Key Takeaways

1. **Wheelchair pattern works universally** - Use for all device-safety-risk traits
2. **Species-first language prevents "human in costume"** - Always use for non-human species
3. **Context selection matters** - Medical vs imagination based on species/context
4. **Prompt order is critical** - Species prefix FIRST, then artistic, then details
5. **Style is constant** - Never changes when adding traits
6. **Test incrementally** - One change at a time, validate thoroughly
7. **Document everything** - Patterns, failures, solutions
8. **Protection is multi-layered** - Runtime + hooks + CI + deploy script + tests + headers

---

**Last Updated:** December 2025  
**Status:** Critical patterns documented, comprehensive protection active
