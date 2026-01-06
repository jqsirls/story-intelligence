# Content Agent - AGENTS.md

**This is the PRODUCTION Content Agent** with the 39-trait inclusivity system.

## Overview

Content Agent generates personalized stories and characters with universal inclusivity:
- **39 traits** working across **9 species** (human, dragon, robot, monster, alien, dinosaur, superhero, fantasy_being, elemental)
- **100% filter success** (ages 5-8, diverse ethnicities)
- **Species-first language** prevents "human in costume" problem
- **Context-sensitive transformations** (wheelchair → rocket vehicle, halo → power detection crown)

## Critical Files (NEVER DELETE)

**Inclusivity System (3,504 lines total)**:
- `src/constants/ComprehensiveInclusivityDatabase.ts` (3,504 lines - ALL 39 traits)
- `src/constants/SpeciesAnatomyProfiles.ts` (9 species profiles)
- `src/services/CharacterImageGenerator.ts` (prompt building with species-first language)
- `src/services/CharacterGenerationService.ts` (generateReferenceImagesWithValidation method)

**Style & Safety**:
- `src/constants/GlobalArtStyle.ts` (ARTISTIC_EXECUTION, no artist names)
- `src/services/ImageSafetyReviewService.ts` (vision model validation)

## Build & Test

### Build (Required Before Testing)

```bash
cd lambda-deployments/content-agent
npm run build
cd ../..
```

**Must build** because tests require built code from `dist/`, not source from `src/`.

### Testing (Standalone Scripts, NOT Jest)

**Why standalone**: lambda-deployments not in workspace packages, requires built code.

**Pattern**:
```bash
# 1. Build first
cd lambda-deployments/content-agent && npm run build && cd ../..

# 2. Run standalone script
node scripts/test-comprehensive-inclusivity-validation.js

# 3. Results in markdown
# Check: COMPREHENSIVE_VALIDATION_RESULTS.md
```

**Available Scripts**:
- `scripts/test-comprehensive-inclusivity-validation.js` - ALL 39 traits (80 images, $3.20)
- `scripts/test-halo-imagination-variants.js` - Halo device specific

**See**: `docs/testing/HOW_TO_RUN_INCLUSIVITY_TESTS.md` for complete guide

## Trait Classification (Critical)

**Always Visual (28 traits)**: Physical characteristics - MUST always show
- Down syndrome, wheelchair, prosthetics, scars, vitiligo, halo device, etc.

**Conditional (8 traits)**: Show ONLY if user mentioned in conversation
- Autism WITH headphones (if described), ADHD WITH fidget tools (if described), diabetes WITH pump (if described)

**Abstract (3 traits)**: NO visual manifestation - story/personality only
- Dyslexia, intellectual disability, ADHD without supports

**See**: `docs/inclusivity/technical/VISUAL_VS_ABSTRACT_TRAITS.md` for complete classification

## DO NOTs for AI Assistants

**FORBIDDEN changes that will break the system**:

❌ "Let's simplify ComprehensiveInclusivityDatabase.ts - it's too long"
- 3,504 lines = 39 traits. Simplification = children excluded.

❌ "We can reduce to 5-10 showcase traits"
- Each trait represents real children. 29-34 would be excluded.

❌ "Let's create generic trait handler"
- Generic = loses medical specificity. Down syndrome ≠ wheelchair ≠ vitiligo.

❌ "This prompt is too long, let's shorten"
- Length = AI bias mitigation. Short prompts = traits disappear.

❌ "We only need species-first language for some traits"
- ALL structural traits need it. Without it: "human in costume" problem returns.

❌ "Force headphones for all autistic characters"
- Autism is conditional. Not all autistic children wear headphones. Respect user input.

**Why these rules exist**: 9 months of iteration, $10,000+ in API costs, 100+ tests per trait

## Protection Mechanisms Active

**6-layer defense**:
1. Runtime enforcement (crashes if <39 traits)
2. Pre-commit hooks (blocks <39 traits, placeholders, deletions)
3. Test suite (43 tests validate everything)
4. CI (runs integrity tests before deploy)
5. Deploy script (final verification gate)
6. Documentation (AI warnings throughout)

**Tests will FAIL** if you ignore these warnings.

## Deployment

**Use the proper deployment script**:
```bash
./scripts/deploy-universal-agent-proper.sh production
```

**This script**:
- Verifies 39 traits present
- Checks all critical files exist
- Shows validation reminder
- Bundles dependencies correctly
- Updates Lambda functions

**DO NOT** use generic deployment commands - Universal Agent has complex module bundling.

## Image Generation Quality (V2 Parity)

**Status**: ✅ Production (December 2025)  
**Reference**: `docs/agents/content-agent/v2-to-v3-parity.md`

### 3-Pass Architecture

V3 matches V2 (Buildship) image quality through sophisticated scene analysis:

**Pass 1: Story Analysis (GPT-5.2)**
- Generates custom palette journey (5-step emotional arc)
- Identifies story motif (subtle thematic symbol)
- Tokens: ~99 per story

**Pass 2: Scene Analysis (GPT-5.2 × 5)**
- Cinematic keyframe descriptions (camera angle, depth, atmosphere)
- Cover: "Most visually kinetic, plot-shifting moment"
- Beats: Decisive action for each scene
- Tokens: ~224 per scene

**Pass 3: Image Generation (gpt-image-1.5)**
- Cover: References character images only
- Beats: Reference ONLY cover (forces pose variation)
- Custom palette + motif + scene analysis
- Pose variation directives with explicit rejection criteria

### Key Quality Features

1. **Pose Variation System**
   - Beats reference only cover (not previous beats)
   - Explicit "REJECT if same arm position/camera angle/body orientation"
   - Forces distinct poses across all 5 images

2. **Custom Palette Journey**
   - Story-analyzed (not generic fallback)
   - 5-step arc mirrors emotional progression
   - Dawn → dusk color evolution

3. **Scene Analysis**
   - GPT-5.2 pass for each image
   - Camera angles, depth, atmosphere specified
   - Cinematic descriptions (not static text)

4. **Model Flexibility**
   - No hardcoded models (use `MODEL_CONFIG`)
   - Environment-configurable via `src/config/models.ts`
   - Defaults: gpt-5.2 (text), gpt-5.1 (vision), gpt-image-1.5 (images)

### CloudWatch Verification

Monitor these logs to verify V2 parity execution:

```bash
# Palette generation (once per story)
info: Story palette journey generated {"motif":"Overcoming Fear","paletteSteps":5,"usingCustomPalette":true}

# Scene analysis (5 times: cover + 4 beats)
info: Scene analysis complete {"isCover":true,"outputLength":748,"tokensUsed":224}

# Image generation
info: Generating cover with GLOBAL_STYLE, references, and validation
```

### Critical Files (V2 Parity)

- `src/RealContentAgent.ts` (lines 2074-2430) - 3-pass implementation
- `src/config/models.ts` - Configurable GPT models
- `src/constants/GlobalArtStyle.ts` - GLOBAL_STYLE + FALLBACK_PALETTE
- `docs/agents/content-agent/v2-to-v3-parity.md` - Complete architecture

### Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Pose Variation | 5/5 distinct | ✅ Confirmed |
| Custom Palette | Story-specific | ✅ Confirmed |
| Scene Analysis | GPT-5.2 pass | ✅ Confirmed |
| Token Efficiency | ~1,200/story | ✅ 1,203 actual |
| Generation Time | <3 minutes | ✅ Confirmed |

### Testing V2 Parity

```bash
# Automated validation
node scripts/test-v2-parity-validation.js <story_id>

# Complete E2E test
node scripts/test-complete-character-and-story.js

# Validation checklist
# See: docs/testing/v2-parity-image-validation.md
```

## Common Issues

**"Cannot find module"**: Build lambda-deployments first
**"traitsValidated: false"**: Vision model didn't detect trait - strengthen prompt
**Filter rejection**: Medical language detected - apply wheelchair pattern more aggressively
**"Human in costume"**: Species-first language not applied - check SpeciesAnatomyProfiles

## Documentation

**Comprehensive inclusivity docs**: `docs/inclusivity/`
**Testing guides**: `docs/testing/`
**Technical patterns**: `docs/inclusivity/technical/AI_IDE_REFERENCE.md`

---

**Version**: 1.0  
**Last Updated**: December 22, 2025  
**For**: lambda-deployments/content-agent (PRODUCTION version)
