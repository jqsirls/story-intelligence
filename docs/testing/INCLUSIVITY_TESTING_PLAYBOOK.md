# Inclusivity Testing Playbook

## Purpose

Complete playbook for when, how, what, and where to test the 39-trait inclusivity system.

## When to Test

### Before Major Releases (Required)

Run comprehensive validation before ANY major release:
```bash
node scripts/test-comprehensive-inclusivity-validation.js
```

**Why**: Proves deployed code works, establishes baseline, prevents regression

### After Significant Changes (Required)

Run validation after changes to:
- ComprehensiveInclusivityDatabase.ts (trait definitions)
- CharacterImageGenerator.ts (prompt building logic)
- SpeciesAnatomyProfiles.ts (species adaptations)
- Context determination logic

**Why**: Confirms changes didn't break existing functionality

### Quarterly Reviews (Scheduled)

**Q1, Q2, Q3, Q4**: Run comprehensive validation

**Aligns with**: Medical advisor consultation schedule (see docs/inclusivity/ethics/ACCOUNTABILITY_STRUCTURE.md)

**Why**: Continuous validation, catch regressions early, maintain quality

### Annual Baseline Update (Scheduled)

**December**: Run comprehensive validation, update baseline documentation

**Why**: Establishes yearly baseline, documents improvements, shows progress

### After Deployment (Verification)

Run sample validation to verify production works:
```bash
# Quick validation (7 critical traits)
node scripts/test-focused-inclusivity-validation.js
```

**Why**: Confirms deployment successful, catches deployment-specific issues

## How to Test

### The Proven Pattern

**Step 1: Build**
```bash
cd lambda-deployments/content-agent
npm run build
cd ../..
```

**Step 2: Run Script**
```bash
node scripts/test-comprehensive-inclusivity-validation.js
```

**Step 3: Review Results**
```bash
# Check COMPREHENSIVE_VALIDATION_RESULTS.md
# Verify all tests passed
# Visual inspection of key images
```

**See**: docs/testing/HOW_TO_RUN_INCLUSIVITY_TESTS.md for detailed steps

### Fast Integrity Tests (No API Calls)

Before running expensive image generation, verify structure:

```bash
cd lambda-deployments/content-agent
npm run build
node -e "const db = require('./dist/constants/ComprehensiveInclusivityDatabase.js'); console.log('Traits loaded:', db.CORE_INCLUSIVITY_TRAITS.length)"
```

**Expected**: "📊 Inclusivity Traits Loaded: 39/39"

**If different**: System compromised, investigate immediately

## What to Test

### Comprehensive Validation (Recommended)

**ALL 39 traits × 2 species + 2 baseline = 80 images**

**Categories:**
- Physical/Mobility: 8 traits
- Neurodiversity: 5 traits
- Sensory: 3 traits
- Skin/Appearance: 4 traits
- Physical Structure: 4 traits
- Medical Conditions: 4 traits
- Medical Devices: 11 traits

**Both species for each trait:**
- Human (medical accuracy)
- Creature (species-first language + context transformations)

**Cost**: $3.20  
**Time**: ~2-2.5 hours  
**Value**: Complete confidence, 100% coverage, definitive baseline

### Focused Validation (Quick Check)

**7 critical breakthroughs × 2 species + 2 baseline = 16 images**

**Traits:**
- Halo device (Power Detection Crown breakthrough)
- Down syndrome (species-first language breakthrough)
- Wheelchair (transformation breakthrough)
- Burn scars, vitiligo, prosthetic, facial differences

**Cost**: $0.64  
**Time**: ~20 minutes  
**Value**: Validates core achievements quickly

### Targeted Validation (Bug Fix)

**Single trait × 2 species = 2 images**

After fixing specific trait, test just that trait on human + creature.

**Cost**: $0.08  
**Time**: ~5 minutes  
**Value**: Confirms specific fix works

## Where Results Go

### Markdown Files (Project Root)

**Comprehensive**: `COMPREHENSIVE_VALIDATION_RESULTS.md`
**Focused**: `FOCUSED_VALIDATION_RESULTS.md`
**Halo**: `REVIEW_ALL_HALO_IMAGES.md`, `HALO_VARIANT_A_COMPLETE_RESULTS.md`
**Species**: `SPECIES_TEST_RESULTS_ALL_URLS.md`

### Consolidated Documentation

**Directory**: `docs/testing/validation-results/`

**Files:**
- `comprehensive-validation-YYYY-MM-DD.md`
- `halo-device-validation.md`
- `species-adaptation-validation.md`

### S3 Storage

**Bucket**: `storytailor-audio` (us-east-1)

**Paths:**
- `characters/char-headshot-[testid].png`
- `characters/char-bodyshot-[testid].png`

**Signed URLs**: 7-day expiry (604800 seconds)

### Baseline Documentation

**Primary**: `docs/inclusivity/INCLUSIVITY_VALIDATION_BASELINE.md`

**Updated after each comprehensive run** with all URLs for regression comparison.

## How to Interpret Results

### Success Indicators

**✅ Filter Success:**
- Image generated without safety filter rejection
- No `[sexual]`, `[violence]`, or other filter tags

**✅ Trait Validation:**
- `traitsValidated: true`
- Vision model confirmed trait visible
- Representation authentic

**✅ Species Anatomy:**
- Creature looks like actual creature (not "human in costume")
- For structural traits: species-first language evident in prompts
- Mother can say "That [creature] has [trait] too!"

### Warning Signs

**⚠️ traitsValidated: false:**
- Vision model didn't detect trait
- Possible AI bias (smoothed/minimized trait)
- Action: Review prompt, strengthen MANDATORY requirements

**⚠️ Filter rejection:**
- Medical language detected
- Dangerous symbol misinterpreted
- Action: Apply wheelchair pattern, add critical safety negatives

**⚠️ "Human in costume":**
- Creature has human face/body with creature accessories
- Species-first language not applied or insufficient
- Action: Strengthen species anatomy prefix

## Historical Context

### Why This Playbook Exists

**Problem**: We kept "forgetting" how to run tests
- Lambda-deployments not in Jest
- Tried to use `npm test` (doesn't work)
- Created Jest test files (can't run them)
- Forgot the standalone script pattern

**Solution**: Document the PROVEN pattern that generated 100+ successful images

**Pattern established**: December 2025 after halo device and species testing success

### Test Evolution

**Phase 1**: Manual testing (slow, inconsistent)
**Phase 2**: Jest tests (didn't work for lambda-deployments)
**Phase 3**: Standalone scripts (WORKS - current pattern)

**Lesson**: Sometimes the simple pattern (require built code, call method, log results) is the right pattern.

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│  INCLUSIVITY TESTING QUICK REFERENCE                    │
├─────────────────────────────────────────────────────────┤
│  1. Build:                                              │
│     cd lambda-deployments/content-agent && npm run build│
│                                                          │
│  2. Test:                                               │
│     node scripts/test-comprehensive-inclusivity.js      │
│                                                          │
│  3. Results:                                            │
│     COMPREHENSIVE_VALIDATION_RESULTS.md                 │
│                                                          │
│  Pattern: PROVEN. 100+ successful images.               │
│  Never use Jest for lambda-deployments.                 │
└─────────────────────────────────────────────────────────┘
```

---

**Last Updated:** December 2025  
**Status:** Complete playbook documenting when/how/what/where  
**Based on**: 100+ successful test images using proven pattern
