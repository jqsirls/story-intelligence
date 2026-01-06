# V2 Parity Image Validation Checklist

**Purpose:** Manual and automated validation that V3 image generation matches V2 (Buildship) quality  
**Status:** Production Validation Required  
**Last Updated:** December 29, 2025

## Quick Validation

Run this command to validate a story's images:

```bash
node scripts/test-v2-parity-validation.js <story_id>
```

**Expected Output:**
```
✅ Pose Variation: 5/5 distinct poses
✅ Custom Palette: Story-specific (not fallback)
✅ Scene Analysis: 5/5 GPT-5.2 analyzed
✅ CloudWatch Logs: V2 parity methods executing
✅ All checks passed
```

## Automated Validation Criteria

### 1. Pose Variation (CRITICAL)

**Check:** Each image has a distinct pose from all others

**Method:**
- Compare arm positions across images
- Compare camera angles across images
- Compare body orientations across images

**Pass Criteria:**
- ✅ Cover vs Beat 1: Different arm positions
- ✅ Cover vs Beat 2: Different camera angle
- ✅ Cover vs Beat 3: Different body orientation  
- ✅ Beat 1 vs Beat 2: Distinct poses
- ✅ Beat 2 vs Beat 3: Distinct poses

**Failure Indicators:**
- ❌ Same straight-on, centered pose in multiple images
- ❌ Same arm position in 2+ images
- ❌ Character looks "copied" between images

### 2. Custom Palette (CRITICAL)

**Check:** Story uses custom palette (not fallback)

**CloudWatch Evidence:**
```
info: Story palette journey generated {"motif":"<not 'wonder'>","paletteSteps":5,"usingCustomPalette":true}
```

**Pass Criteria:**
- ✅ Motif is NOT "wonder" (fallback default)
- ✅ `usingCustomPalette: true` in logs
- ✅ 5 unique palette descriptions
- ✅ Palette reflects story emotional arc

**Failure Indicators:**
- ❌ Motif is "wonder" (indicates fallback)
- ❌ Palette descriptions are identical to FALLBACK_PALETTE
- ❌ No palette generation log entry

### 3. Scene Analysis (CRITICAL)

**Check:** GPT-5.2 generated cinematic descriptions

**CloudWatch Evidence:**
```
info: Scene analysis complete {"isCover":true,"outputLength":748,"tokensUsed":224}
info: Scene analysis complete {"isCover":false,"outputLength":650,"tokensUsed":210}
(5 total: 1 cover + 4 beats)
```

**Pass Criteria:**
- ✅ 5 scene analysis log entries (1 cover + 4 beats)
- ✅ `outputLength` > 500 chars (detailed descriptions)
- ✅ `tokensUsed` ~200-250 per scene

**Failure Indicators:**
- ❌ No scene analysis log entries
- ❌ `outputLength` < 100 (too short, using static text)
- ❌ Only 1 scene analysis (missing beats)

### 4. Reference Chain (CRITICAL)

**Check:** Beats reference only cover (not previous beats)

**Code Evidence:**
```typescript
// CORRECT (V2 parity):
const recentReferencesRaw = coverOnlyReferences;

// WRONG (V3 bug):
const recentReferencesRaw = progressiveReferences.slice(-3);
```

**Pass Criteria:**
- ✅ Beat images show pose variation (indicates cover-only references)
- ✅ Code uses `coverOnlyReferences` (not `progressiveReferences`)

**Failure Indicators:**
- ❌ Pose repetition in beats (indicates wrong reference chain)
- ❌ Code uses `progressiveReferences` for beats

### 5. Artistic Style (Important)

**Check:** No "Anime-inspired look" (V2 complaint)

**Visual Inspection:**
- ✅ Consistent with GLOBAL_STYLE (soft airbrush, subtle brush strokes)
- ✅ No heavy cel-shading or anime characteristics
- ✅ Realistic lighting and depth

**Failure Indicators:**
- ❌ Flat cel-shaded style
- ❌ Exaggerated anime features
- ❌ Inconsistent art style between images

### 6. Inclusivity Traits (Important)

**Check:** Character traits visible in all images

**Vision Validation:**
```
✅ Inclusivity traits verified: wheelchair, hijab, glasses, hearing aids, autism
```

**Pass Criteria:**
- ✅ Wheelchair visible in all full-body images
- ✅ Hijab visible and styled consistently
- ✅ Glasses visible in close-ups
- ✅ Hearing aids visible when appropriate
- ✅ Autism represented through posture/behavior (not erased)

**Failure Indicators:**
- ❌ Trait "smoothed away" by AI bias
- ❌ Inconsistent trait visibility
- ❌ Missing traits in later images

## Manual Validation Checklist

### Pre-Deployment Validation

Run these checks before deploying V2 parity changes:

- [ ] **Code Review**
  - [ ] `analyzeSceneForVisualDynamism()` method exists
  - [ ] `generateStoryPaletteJourney()` method exists
  - [ ] `buildMotifInstruction()` helper exists
  - [ ] Cover generation calls all 3 helpers
  - [ ] Beat generation uses `coverOnlyReferences`
  - [ ] Pose directive includes rejection examples
  - [ ] Models use `MODEL_CONFIG` (not hardcoded)

- [ ] **CloudWatch Logs**
  - [ ] Palette generation logged (once per story)
  - [ ] Scene analysis logged (5 times per story)
  - [ ] `usingCustomPalette: true` confirmed
  - [ ] Token usage ~1,200 per story

- [ ] **Database**
  - [ ] `cover_image_url` populated
  - [ ] `scene_images` array has 4 URLs
  - [ ] `asset_generation_status` shows "ready"

### Post-Deployment Validation

Run these checks after deploying to production:

- [ ] **Generate 3 Test Stories**
  - [ ] Adventure (standard story)
  - [ ] Child-Loss (therapeutic story)
  - [ ] Birthday (standard story)

- [ ] **Visual Inspection (Per Story)**
  - [ ] 5 distinct poses (no repetition)
  - [ ] Consistent artistic style (no anime look)
  - [ ] All inclusivity traits visible
  - [ ] Custom palette evident (not generic)
  - [ ] Motif visible (if applicable)

- [ ] **CloudWatch Validation (Per Story)**
  - [ ] Palette generation logged
  - [ ] 5 scene analyses logged
  - [ ] Custom palette confirmed
  - [ ] No errors or timeouts

- [ ] **Performance**
  - [ ] Story generated in <60 seconds
  - [ ] Images generated in <3 minutes
  - [ ] No Lambda timeouts

## Common Failure Patterns

### Pattern 1: Pose Repetition

**Symptoms:**
- All images show same arm position
- Same camera angle (straight-on, centered)
- Character appears "copied"

**Root Cause:** Wrong reference chain (using `progressiveReferences` instead of `coverOnlyReferences`)

**Fix:** Update beat generation to use cover-only references

**Verification:**
```typescript
// RealContentAgent.ts line ~2363
const recentReferencesRaw = coverOnlyReferences; // ✅ CORRECT
```

### Pattern 2: Generic Palette

**Symptoms:**
- Motif is "wonder" (default fallback)
- All stories look identical
- No emotional arc visible

**Root Cause:** Palette generation not executing or failing

**Fix:** Check CloudWatch logs for palette generation errors

**Verification:**
```bash
aws logs tail /aws/lambda/storytailor-content-agent-production --since 10m | grep "palette"
# Should see: info: Story palette journey generated
```

### Pattern 3: Static Scenes

**Symptoms:**
- Generic "character standing" poses
- No action or movement
- Boring, static compositions

**Root Cause:** Scene analysis not executing (using static beat text)

**Fix:** Check CloudWatch logs for scene analysis errors

**Verification:**
```bash
aws logs tail /aws/lambda/storytailor-content-agent-production --since 10m | grep "Scene analysis"
# Should see 5 entries (1 cover + 4 beats)
```

### Pattern 4: Missing Traits

**Symptoms:**
- Wheelchair user shown standing
- Hijab missing in later images
- Hearing aids "smoothed away"

**Root Cause:** AI bias or missing trait validation

**Fix:** Check vision validation logs

**Verification:**
```bash
aws logs tail /aws/lambda/storytailor-content-agent-production --since 10m | grep "trait"
# Should see: Inclusivity traits verified
```

## Validation Scripts

### scripts/test-v2-parity-validation.js

```bash
# Validate single story
node scripts/test-v2-parity-validation.js <story_id>

# Validate multiple stories
node scripts/test-v2-parity-validation.js <story_id_1> <story_id_2> <story_id_3>

# Generate validation report
node scripts/test-v2-parity-validation.js --report
```

### scripts/test-complete-character-and-story.js

```bash
# Create character + story + validate
node scripts/test-complete-character-and-story.js

# With specific story type
node scripts/test-complete-character-and-story.js --story-type adventure

# With specific age
node scripts/test-complete-character-and-story.js --age 7
```

## Success Metrics

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Pose Variation | 5/5 distinct | Visual inspection + validation script |
| Custom Palette | 100% stories | CloudWatch logs (`usingCustomPalette: true`) |
| Scene Analysis | 5/5 scenes | CloudWatch logs (5 entries per story) |
| Trait Visibility | 100% traits | Vision validation logs |
| Token Efficiency | ~1,200/story | CloudWatch logs (sum all token usage) |
| Generation Time | <3 minutes | CloudWatch logs (timestamp diff) |
| No Anime Look | 100% stories | Visual inspection |

## Regression Testing

Run these tests before each deployment:

```bash
# 1. Full validation suite
npm run test:v2-parity

# 2. Integration tests
npm run test:integration

# 3. Manual spot check
node scripts/test-complete-character-and-story.js

# 4. CloudWatch verification
aws logs tail /aws/lambda/storytailor-content-agent-production --since 5m | grep -E "(palette|scene|motif)"
```

## Troubleshooting

### Issue: Validation script fails

**Solution:**
1. Check that story has images generated (`asset_generation_status.overall === 'ready'`)
2. Wait for async generation to complete (~3 minutes)
3. Check CloudWatch logs for generation errors

### Issue: Images generated but validation fails

**Solution:**
1. Download images and inspect manually
2. Check CloudWatch logs for V2 parity method execution
3. Verify code uses correct reference chain

### Issue: Custom palette not detected

**Solution:**
1. Check CloudWatch logs: `aws logs tail /aws/lambda/storytailor-content-agent-production --since 10m | grep "palette"`
2. If no logs, palette generation failed (check for errors)
3. If logs show fallback, GPT-5.2 response parsing failed

## Contact

**Issues:** File in GitHub under `v2-parity-image-validation` label  
**Slack:** #content-agent-quality  
**Documentation:** `docs/agents/content-agent/v2-to-v3-parity.md`

