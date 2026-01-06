# How to Run Inclusivity Validation Tests

## Quick Start

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-key-here"

# Navigate to content agent
cd lambda-deployments/content-agent

# Run focused validation (recommended first run)
npm test -- FocusedInclusivityValidation.test.ts
```

**This will generate 16 images in ~15 minutes for $0.64**

## Three-Phase Test Execution

### Phase 1: Human Medical Accuracy (Run First)

```bash
npm test -- FocusedInclusivityValidation.test.ts --testNamePattern="Phase 1"
```

**Tests**: 7 critical traits on human children  
**Time**: ~7 minutes  
**Cost**: $0.28

**What it validates:**
- Halo device (Power Detection Crown)
- Down syndrome (medical accuracy)
- Burn scars (surface adaptation)
- Wheelchair (decorated, celebrated)
- Vitiligo (pattern preservation)
- Prosthetic leg (device celebration)
- Facial differences (medical accuracy)

**Expected**: All 7 tests pass with `traitsValidated: true`

**If ANY fail**: Medical accuracy pathway broken for real children. **STOP and debug before proceeding.**

### Phase 2: Baseline Ethnicity (Run Second)

```bash
npm test -- FocusedInclusivityValidation.test.ts --testNamePattern="Phase 2"
```

**Tests**: Hispanic and Black children WITHOUT inclusivity traits  
**Time**: ~2 minutes  
**Cost**: $0.08

**What it validates:**
- Hispanic child (no "whitewashing")
- Black child (skin tone hex #6F4E37, not lightened)

**Expected**: Both tests pass, skin tones accurate

**If fails**: AI has baseline ethnicity bias. **FIX before testing traits on diverse ethnicities.**

### Phase 3: Creature Species-First Language (Run Third)

```bash
npm test -- FocusedInclusivityValidation.test.ts --testNamePattern="Phase 3"
```

**Tests**: Same 7 traits on fantasy creatures  
**Time**: ~7 minutes  
**Cost**: $0.28

**What it validates:**
- Down syndrome on dragon (species-first language)
- Halo device on superhero (Energy Crown transformation)
- Wheelchair on robot (mobility platform)
- Burn scars on dinosaur (scale texture)
- Vitiligo on alien (pattern preservation)
- Prosthetic on monster (enhanced limb)
- Facial differences on monster (species anatomy)

**Expected**: All 7 tests pass with species-first language in prompts

**If fails**: Species-first language or context transformation broken. Mother can't say "That dragon has DS too!"

## Run All Phases Together

```bash
npm test -- FocusedInclusivityValidation.test.ts 2>&1 | tee focused-validation-results.log
```

**Recommended for**: Complete baseline validation run

## After Tests Complete

### 1. Check Results

Look for these patterns in output:

```
✅ Halo Device on human
   URL: https://...
   TraitsValidated: true

✅ Hispanic child baseline
   Skin hex: #D4A17A

✅ Down Syndrome on dragon
   URL: https://...
   TraitsValidated: true
```

### 2. Record URLs

Copy all 16 URLs from console output to [`docs/inclusivity/INCLUSIVITY_VALIDATION_BASELINE.md`](docs/inclusivity/INCLUSIVITY_VALIDATION_BASELINE.md)

### 3. Visual Inspection

Download and manually inspect a few key images:

```bash
# Download from S3 (if uploaded)
aws s3 ls s3://storytailor-staging-assets-6d120153/inclusivity-tests/

# Or inspect URLs directly (if HTTP URLs)
```

**Check that:**
- Down syndrome features clearly visible on human
- Dragon with DS doesn't look like "human in costume"
- Halo device looks like Power Detection Crown (not medical)
- Black child's skin is NOT lightened

## Troubleshooting

### "OPENAI_API_KEY not set"

```bash
export OPENAI_API_KEY="sk-..."
```

### "traitsValidated: false"

**Meaning**: Vision model detected trait not visible in generated image

**Action**:
1. Check console logs for "missing_traits" details
2. Review prompt that was used
3. Check if this is AI bias regression
4. May need to strengthen MANDATORY requirements for that trait

### Filter Rejection

**Meaning**: OpenAI safety filter rejected the image

**Action**:
1. Check which trait caused rejection
2. Review prompt for medical language
3. May need to apply wheelchair pattern more aggressively
4. This is a CRITICAL regression if previously passed

### AWS Credentials Error

```bash
aws configure
# Enter AWS credentials for S3 uploads
```

## What Success Looks Like

```
=============================================================================
🎯 FOCUSED INCLUSIVITY VALIDATION COMPLETE
=============================================================================

✅ Phase 1: Human Medical Accuracy (7 traits)
   → Medical accuracy pathway working for real children

✅ Phase 2: Baseline Ethnicity (Hispanic + Black)
   → No baseline ethnicity bias detected

✅ Phase 3: Creature Species-First Language (7 traits)
   → Species-first language working
   → Context transformations working
   → Mother can say "That dragon has DS too!"

CORE ACHIEVEMENT VALIDATED:
  ✓ Human children see themselves with medical accuracy
  ✓ Fantasy creatures see traits through species-first language
  ✓ Halo device transforms (Power Detection Crown)
  ✓ Wheelchair transforms (rocket vehicle, mobility platform)
  ✓ Baseline ethnicities accurate (no whitewashing)

Total: 16 images validated
=============================================================================
```

## Next Steps After Baseline

Once focused validation passes:

1. **Run dual behavior tests** (validates prompt differences):
   ```bash
   npm test -- DualBehaviorValidation.test.ts
   ```

2. **Run full sample validation** (8 traits × 2 species):
   ```bash
   npm test -- InclusivitySampleValidation.test.ts
   ```

3. **Run all integrity tests** (structural, no API calls):
   ```bash
   npm test -- InclusivitySystemIntegrity.test.ts
   npm test -- ContextDeterminationLogic.test.ts
   npm test -- NoPlaceholdersAllowed.test.ts
   npm test -- InclusivityRegressionDetection.test.ts
   ```

---

**Last Updated:** December 2025  
**Status:** Test execution guide ready, awaiting first validation run
