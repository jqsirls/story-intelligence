# Phase 0: Research Findings - Current Production State

**Date**: December 29, 2025  
**Purpose**: Establish baseline before implementing V2 image parity  
**Status**: ✅ Research Complete

---

## Executive Summary

The Content Agent is in a **stable, working state** with recently deployed critical features:

1. ✅ **39-trait inclusivity system** fully operational
2. ✅ **CDN (assets.storytailor.dev)** deployed and serving images
3. ✅ **Story-first philosophy** integrated into prompts
4. ✅ **Character trait injection** working in narratives
5. ⚠️ **Image generation logic** needs V2 parity upgrades

**Critical**: Do NOT break items 1-4 while implementing item 5.

---

## 🟢 Recent Fixes (MUST PRESERVE)

### 1. Inclusivity Trait Integration (Dec 29, 2025)

**Status**: ✅ Deployed and verified  
**Location**: `lambda-deployments/content-agent/src/RealContentAgent.ts:1950-2030`

**What works**:
- `inclusivityTraits` array properly received as parameter
- `characterAppearance` properly integrated into story prompt
- Story narratives mention traits when they serve the plot

**Evidence**:
```typescript
// RealContentAgent.ts generateStoryContent() method
async generateStoryContent(request: StoryGenerationRequest): Promise<{ content: string; keyBeats: Beat[] }> {
  // ... 
  inclusivityTraits: InclusivityTrait[]  // ✅ Correctly received
  characterAppearance: string            // ✅ Correctly received
  
  // Character details section includes:
  if (request.inclusivityTraits && request.inclusivityTraits.length > 0) {
    const traitsList = request.inclusivityTraits
      .map(t => `- ${t.name}: ${t.visual_description || t.prompt_guidance}`)
      .join('\n');
    characterDetails += `\n\nInclusivity Traits (integrate when they serve the story):\n${traitsList}`;
  }
}
```

**Test Evidence**: Story "Zara and the Lighthouse Map" (Story ID `458e22c7-51f1-4a97-8fdd-ed5fc47f2839`)
- ✅ Wheelchair mentioned when terrain matters: "driftwood held under Zara's wheels"
- ✅ Hearing aids mentioned when sound matters: "Her hearing aids caught gull calls"
- ✅ Hijab mentioned when wind matters: "Her colorful hijab fluttered"
- ✅ Autism correctly NOT mentioned (patterns/routines not plot-relevant)

**Regression Risk**: ⚠️ HIGH - Do NOT modify these parameters or the prompt construction logic

---

### 2. Story-First Philosophy (Dec 29, 2025)

**Status**: ✅ Deployed and verified  
**Locations**:
- `lambda-deployments/content-agent/src/services/prompts/StandardPromptBuilder.ts:50-108` (IDENTITY_TRAIT_RULES constant)
- `lambda-deployments/content-agent/src/services/prompts/AgePrompts.ts:100-534` (integrated into all age groups)

**What works**:
- "The Invisibility Test": "If this sentence were removed, would the story lose clarity, tension, or joy?"
- Traits mentioned only when they serve the narrative
- Images carry identity silently when traits don't drive action
- Age-specific guidance (sentence length, vocabulary, complexity) PRESERVED

**Critical Structure**:
```typescript
// Each age group in AgePrompts.ts has TWO sections (both required):

### Overall Protagonist Approach
[Original age-appropriate guidance]
- Sentence length requirements
- Vocabulary complexity
- Story structure

### Trait Integration Discipline (Ages X)
[Story-first philosophy]
- Earned mention guidelines
- The invisibility test
- Examples
```

**Regression Risk**: ⚠️ CRITICAL - Do NOT remove age-specific guidance when updating prompts

---

### 3. Canonical Story Engine (Dec 29, 2025)

**Status**: ✅ Deployed  
**Location**: `lambda-deployments/content-agent/src/services/prompts/StandardPromptBuilder.ts:12-48`

**What works**:
- 12-step universal narrative framework
- Age scaling (ages 3-4 use 6 steps, ages 9+ use all 12)
- Scene unit requirements (immediate goal, active opposition, turn, outcome)

**Integrated into**: Standard story prompts via `getAgeSystemPrompt()` in `PromptSelector.ts:195-215`

**Regression Risk**: ⚠️ MEDIUM - Keep this constant, don't modify

---

### 4. Character Detail Interpolation (Working)

**Status**: ✅ Working  
**Location**: `lambda-deployments/content-agent/src/services/PromptSelector.ts:195-215`

**What works**:
- `{{characterName}}` → actual character name
- `{{characterAge}}` → actual age
- `{{characterSpecies}}` → actual species
- All placeholders correctly replaced

**Method**:
```typescript
private interpolateCharacterDetails(template: string, inputs: StoryGenerationInputs): string {
  const char = inputs.characterProfile || {};
  
  return template
    .replace(/{{characterName}}/g, char.name || char.first_name || 'Sam')
    .replace(/{{characterAge}}/g, String(char.age || inputs.userAge || 7))
    .replace(/{{characterInclusivityDescription}}/g, char.inclusivity_description || 'unique and valued')
    // ... etc
}
```

**Regression Risk**: ⚠️ LOW - But don't modify this method

---

### 5. CDN Setup (Dec 29, 2025)

**Status**: ✅ Operational  
**Infrastructure**:
- CloudFront Distribution: E1RLJAA0G7V7A4
- Custom Domain: assets.storytailor.dev
- Origin Access Control: [REDACTED_OAC_ID]
- S3 Bucket: storytailor-assets-production-326181217496
- S3 Policy: CloudFront-only access (Block Public Access enabled)

**Test URL** (verified working):
```
https://d1ricf3rl3ivh8.cloudfront.net/characters/0b9401b1-9bbc-4ff9-8564-39c55e1faba6/headshot-1767026415162.png
HTTP/2 200
x-cache: Hit from cloudfront
```

**Regression Risk**: ⚠️ LOW - Infrastructure is separate from code

---

## ⚠️ Known Issues (TO BE FIXED)

### Issue 1: Repetitive Image Poses

**Problem**: Story images show same pose and composition  
**Root Cause**: Reference chain uses last 3 images including previous beats  
**Location**: `lambda-deployments/content-agent/src/RealContentAgent.ts:2333`

**Current (WRONG) Logic**:
```typescript
// Line 2333: Uses last 3 generated images as references
const recentReferencesRaw = progressiveReferences.slice(-3);
```

This means:
- Beat 1 sees: [Cover, (nothing), (nothing)] → 1 reference
- Beat 2 sees: [Cover, Beat1, (nothing)] → 2 references
- Beat 3 sees: [Cover, Beat1, Beat2] → 3 references
- Beat 4 sees: [Beat1, Beat2, Beat3] → 3 references (NO COVER!)

**Result**: Poses become repetitive because AI sees previous beat poses as references.

**V2 Correct Logic** (`v2 OLD Prompt Templates/Images/V2 Image Flow` lines 585-595):
- Cover gets character references only
- ALL beats get ONLY the cover image as style reference
- This maintains style consistency while forcing pose variation

**Fix Required**: Change `progressiveReferences` to only include cover image for beats.

---

### Issue 2: Static Palette (FALLBACK_PALETTE)

**Problem**: Using hardcoded palette arc instead of story-analyzed palette  
**Location**: `lambda-deployments/content-agent/src/RealContentAgent.ts:2309`

**Current (WRONG) Logic**:
```typescript
// Line 2309: Uses static fallback palette
PALETTE: ${FALLBACK_PALETTE[paletteIndex] || FALLBACK_PALETTE[1]}
```

**V2 Correct Logic** (`v2 OLD Prompt Templates/Images/V2 Image Flow` lines 143-171):
- Use GPT-4o to analyze full story text (up to 6,000 chars)
- Generate custom motif (short theme like "wonder", "bravery", "discovery")
- Generate 5-step palette arc mirroring emotional arc
- Example: `["Bright sunrise warmth", "Slightly cooler teal highs", "Balanced midday vibrancy", "Golden-hour oranges sliding toward magenta dusk", "Deep twilight jewel tones"]`

**Fix Required**: Add `generateStoryPaletteJourney()` method with GPT-4o pass.

---

### Issue 3: Missing Scene Analysis Pass

**Problem**: ACTION directives use raw `beat.visualDescription` from story generation  
**Location**: `lambda-deployments/content-agent/src/RealContentAgent.ts:2304`

**Current (BASIC) Logic**:
```typescript
// Line 2304: Direct use of beat description
ACTION: ${beat.visualDescription || beat.description}
```

**V2 Correct Logic** (`v2 OLD Prompt Templates/Images/V2 Image Flow` lines 173-201):
- Use GPT-4o to analyze each beat for "visually kinetic, plot-shifting moment"
- Extract decisive action, camera angle, depth, lighting, atmosphere
- System prompt: `SECTION_SYS` (lines 188-195)
  ```
  You are a film story artist describing keyframes.
  Return ONE paragraph ≤120 words that shows decisive action & emotion,
  specifies cinematic camera angle/lens or depth-of-field, layers foreground/mid/background,
  and notes atmosphere. Do NOT mention medium, palette, UI, or watermarks.
  ```
- Result: Dynamic, cinematic descriptions instead of static narrative text

**Fix Required**: Add `analyzeSceneForVisualDynamism()` method with GPT-4o pass.

---

### Issue 4: Weak Pose Variation Directive

**Problem**: Pose variation prompt lacks explicit examples and rejection criteria  
**Location**: `lambda-deployments/content-agent/src/RealContentAgent.ts:2311-2316`

**Current (WEAK) Logic**:
```typescript
POSE VARIATION (MANDATORY):
- This is pose ${beatIndex + 2} of 5
- Previous poses: ${previousPoses.join('; ')}
- Character MUST be in distinctly different pose than reference images
- Change arm and leg positions clearly
- Use different camera angle (${CAMERA_ANGLES[paletteIndex] || 'varied'})
```

**V2 Correct Logic** (`v2 OLD Prompt Templates/Images/V2 Image Flow` lines 406-422):
```
Pose and framing directives (mandatory):
• The character must be in a distinctly different pose than in any reference image.
• Change arm and leg positions clearly so the body language is obviously new.
• Use a different camera angle or framing (for example, wide shot, low angle, side view, top-down, or over-the-shoulder).
• Avoid re-using the same straight-on, centered pose or composition seen in reference images.
• If the pose feels too similar to any reference, choose a more dynamic, story-specific alternative that matches this scene.
```

**Key Difference**: V2 includes:
- Explicit examples of camera angles ("wide shot, low angle, side view, top-down, or over-the-shoulder")
- Rejection criteria ("If the pose feels too similar")
- Story-specific guidance ("matches this scene")

**Fix Required**: Strengthen pose directive with V2's explicit examples.

---

## 🔒 Protected Files (DO NOT MODIFY)

These files contain critical, working features. **Read-only unless explicitly fixing a bug:**

1. **`lambda-deployments/content-agent/src/constants/ComprehensiveInclusivityDatabase.ts`**
   - 3,504 lines, 39 traits
   - Protected by 6-layer defense system
   - DO NOT simplify, reduce, or genericize

2. **`lambda-deployments/content-agent/src/services/PromptSelector.ts`**
   - `interpolateCharacterDetails()` method working correctly
   - Backwards compatibility methods for `ContentAgent.ts`
   - Orchestrates StandardPromptBuilder and TherapeuticPromptBuilder

3. **`lambda-deployments/content-agent/src/services/prompts/AgePrompts.ts`**
   - Age-specific guidance recently fixed (Dec 29)
   - Story-first philosophy integrated alongside original guidance
   - Both sections required for each age group

4. **`lambda-deployments/content-agent/src/services/prompts/StandardPromptBuilder.ts`**
   - CANONICAL_STORY_ENGINE constant (lines 16-48)
   - IDENTITY_TRAIT_RULES constant (lines 55-108)
   - Both integrated into standard story prompts

5. **`lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts`**
   - GLOBAL_STYLE, ARTISTIC_EXECUTION, FALLBACK_PALETTE
   - Can ADD V2 parity comments, but don't change constants

---

## 🟡 Target Files (SAFE TO MODIFY)

These files contain the image generation logic needing V2 parity:

1. **`lambda-deployments/content-agent/src/RealContentAgent.ts`** (lines 2060-2521)
   - `generateStoryImages()` method
   - **Safe changes**:
     - Extract scene analysis logic to helper methods
     - Add palette journey generation
     - Fix reference chain logic (line 2333)
     - Strengthen pose variation prompt (lines 2311-2316)
   - **Protected sections**:
     - Character reference loading (lines 2081-2126)
     - Inclusivity traits integration (lines 2110-2121)
     - Character consistency context (line 2129)

---

## 📊 Current Image Generation Flow

### Step-by-Step Breakdown (RealContentAgent.ts generateStoryImages())

**1. Load character data** (lines 2081-2126):
- ✅ Fetch character from database
- ✅ Get reference images (headshot, bodyshot)
- ✅ Extract inclusivity traits
- **Status**: Working, do not modify

**2. Build character consistency context** (line 2129):
- ✅ Call `buildCharacterConsistencyContext()`
- **Status**: Working, do not modify

**3. Import artistic constants** (line 2132):
- ✅ GLOBAL_STYLE, ARTISTIC_EXECUTION, FALLBACK_PALETTE, CAMERA_ANGLES
- **Status**: Working, constants are correct

**4. Generate cover image** (lines 2134-2227):
- ⚠️ Uses static FALLBACK_PALETTE[0]
- ⚠️ No GPT-4o scene analysis pass
- ✅ Uses character references correctly
- **Status**: Needs V2 parity (palette + scene analysis)

**5. Generate beat images** (lines 2228-2448):
- ⚠️ Uses `progressiveReferences.slice(-3)` (WRONG)
- ⚠️ Uses `beat.visualDescription` directly (WRONG)
- ⚠️ Uses static FALLBACK_PALETTE (WRONG)
- ⚠️ Weak pose variation directive
- **Status**: Needs V2 parity (all 4 issues)

**6. Parallel color extraction** (lines 2386):
- ✅ Extracts colors from beat images
- **Status**: Working, keep this

**7. Database updates** (lines 2390-2441):
- ✅ Progressive loading status updates
- **Status**: Working, do not modify

---

## 🎯 Safe Refactoring Boundaries

### Green Zone (Safe to Refactor)
- Lines 2134-2324 in `generateStoryImages()`
- Lines 2304-2316 (ACTION and POSE_VARIATION directives)
- Adding new helper methods for scene analysis and palette generation
- Adding inline comments documenting V2 parity

### Yellow Zone (Refactor with Caution)
- Lines 2333-2383 (Reference chain management)
  - Must maintain progressive loading
  - Must preserve S3 URL conversion logic
  - Must keep `progressiveReferences` array structure
- Lines 2326-2327 (Safety sanitization)
  - Keep this call, don't bypass it

### Red Zone (DO NOT MODIFY)
- Lines 2081-2126 (Character data loading)
- Lines 2110-2121 (Inclusivity traits extraction)
- Lines 2129 (Character consistency context)
- Lines 2386 (Color extraction parallel promise)
- Lines 2390-2441 (Database status updates)
- Lines 2347-2354 (Image generation call with trait validation)

---

## 🧪 Test Results Baseline

### Last Successful Test (Dec 29, 2025)

**Test Script**: `scripts/test-complete-character-and-story.js`  
**Story ID**: `458e22c7-51f1-4a97-8fdd-ed5fc47f2839`  
**Character ID**: `0b9401b1-9bbc-4ff9-8564-39c55e1faba6`

**Results**:
- ✅ Character created with 5 inclusivity traits
- ✅ Character images generated (headshot, bodyshot)
- ✅ Story narrative includes all traits naturally
- ✅ Story images generated (cover + 2 scenes)
- ✅ All images accessible via CDN
- ⚠️ Image poses repetitive (expected, to be fixed)

**Test Artifacts Location**:
```
test-results/complete-test/run-1767026340262/
├── 1-character-created.json
├── 2-character-images-response.json
├── 3-story-record.json
├── 4-story-generation-response.json
└── 5-inclusivity-verification.json
```

---

## 📋 V2 Reference Implementation

**File**: `v2 OLD Prompt Templates/Images/V2 Image Flow`

### Key V2 Patterns to Replicate

**1. buildImagePrompts.ts (lines 1-281)**:
- Lines 92-118: Vision analysis (optional, for reference images)
- Lines 120-137: Protagonist DNA compression (temperature: 0, max_tokens: 120)
- Lines 143-171: Motif & Palette journey (temperature: 0.5, max_tokens: 180)
- Lines 173-201: Scene analysis with COVER_DIRECTIVE and SECTION_SYS (temperature: 0.85, max_tokens: 320)

**2. Image Creator Node (lines 285-711)**:
- Lines 406-422: Explicit pose and framing directives
- Lines 585-595: Reference strategy (cover gets character refs, beats get ONLY cover)
- Lines 624-687: reviewImageWithVision() safety check with GPT-5.1

**3. Critical V2 Parameters**:
- All GPT-4o calls use `model: "gpt-4o"`
- Temperature varies: 0 for DNA, 0.5 for palette, 0.85 for scene analysis
- Max tokens vary: 120 for DNA, 180 for palette, 320 for scene analysis

---

## ✅ Regression Prevention Checklist

Before deploying ANY changes, verify:

- [ ] `interpolateCharacterDetails()` still works (test with `{{characterName}}`)
- [ ] `inclusivityTraits` array still passed to story generation
- [ ] `characterAppearance` still in story prompt
- [ ] Age-specific guidance preserved in `AgePrompts.ts`
- [ ] Story-first philosophy still in prompts
- [ ] CANONICAL_STORY_ENGINE constant unchanged
- [ ] IDENTITY_TRAIT_RULES constant unchanged
- [ ] CDN URLs still accessible (check S3 policy unchanged)
- [ ] Progressive loading database updates still working
- [ ] Character reference images still loaded correctly
- [ ] Safety sanitization still applied
- [ ] Color extraction still running in parallel

**Test Command After Changes**:
```bash
node scripts/test-complete-character-and-story.js
```

**Expected Result**: Character + story with 5 inclusivity traits, all traits mentioned naturally in narrative.

---

## 🚀 Next Steps (Phase 1: Extract V2 Helper Functions)

**Now safe to proceed with**:
1. Create `analyzeSceneForVisualDynamism()` method (V2 lines 173-201)
2. Create `generateStoryPaletteJourney()` method (V2 lines 143-171)
3. Create `buildMotifInstruction()` helper method
4. Add V2 PARITY inline comments to all new methods
5. Refactor `generateStoryImages()` to use new methods

**DO NOT proceed until**:
- This research document is reviewed
- All protected files identified
- All regression risks understood
- Test baseline established

---

**Research Status**: ✅ Complete  
**Safe to Proceed**: ✅ Yes (with boundaries documented above)  
**Estimated Risk**: 🟡 Medium (if boundaries respected), 🔴 High (if boundaries violated)


