# V3 Image Generation Pipeline - Complete Inventory

**Generated**: December 30, 2025  
**Purpose**: Full verbatim extraction of V3 image prompt pipeline for V2 comparison

---

## 1. Pipeline Locations

### 1.1 Choosing Cover Moment & 4 Beats

**Function**: `analyzeSceneForVisualDynamism()`  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2181-2252

**Purpose**: Uses GPT to analyze story beats and extract "visually kinetic, plot-shifting moments" with cinematic descriptions

### 1.2 Generating Scene Paragraphs (Cover & Beats)

**Function**: `analyzeSceneForVisualDynamism()`  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2187-2252

**System prompts defined at**:
- `SECTION_SYS` (beats): Lines 2187-2200
- `COVER_DIRECTIVE` (cover): Lines 2202-2215

**API Call**: Lines 2218-2234

### 1.3 Generating Motif + Palette Journey

**Function**: `generateStoryPaletteJourney()`  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2277-2324

**System prompt**: Lines 2286-2291

### 1.4 Building Final Image Prompt String

**Cover Prompt Assembly**:  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2444-2480

**Beat Prompt Assembly**:  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2632-2672

### 1.5 Calling OpenAI Image Endpoint

**Function**: `generateImageWithReferences()`  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 1881-2138

**API call logic**: Lines 1949-1969
- With references: `images.edit()` (line 1953)
- Without references: `images.generate()` (line 1963)

---

## 2. Upstream Prompt Templates (Verbatim)

### 2.1 Cover Scene Directive

**Variable**: `COVER_DIRECTIVE`  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2202-2215

```typescript
const COVER_DIRECTIVE = `
Identify the single most visually kinetic, plot-shifting moment in the story.
Depict the protagonist mid-action at peak emotion (wonder, fear, triumph, etc.).
Return ONE paragraph ≤120 words describing action, camera angle, depth, lighting, and atmosphere.
Do NOT mention medium, palette, brush style, text, UI, or watermarks.

CRITICAL: Disability Representation Rules:
- Mobility aids (wheelchairs, canes, walkers) are PART of the character, not obstacles
- In magical/flight scenes: "character AND wheelchair fly together" (wheels glowing, both airborne)
- Never show character separated from their mobility aid as "freedom"
- Wheelchair modifications for fantasy: glowing wheels, magical propulsion, transforming features
- Adventure happens WITH the aid, not despite it
- Prosthetics stay attached during action - they are part of the body
- Hearing aids, glasses, medical devices remain visible and integrated`.trim();
```

### 2.2 Beat Scene Directive

**Variable**: `SECTION_SYS`  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2187-2200

```typescript
const SECTION_SYS = `
You are a film story artist describing keyframes.
Return ONE paragraph ≤120 words that shows decisive action & emotion,
specifies cinematic camera angle/lens or depth-of-field, layers foreground/mid/background,
and notes atmosphere. Do NOT mention medium, palette, UI, or watermarks.

CRITICAL: Disability Representation Rules:
- Mobility aids (wheelchairs, canes, walkers) are PART of the character, not obstacles
- In magical/flight scenes: "character AND wheelchair fly together" (wheels glowing, both airborne)
- Never show character separated from their mobility aid as "freedom"
- Wheelchair modifications for fantasy: glowing wheels, magical propulsion, transforming features
- Adventure happens WITH the aid, not despite it
- Prosthetics stay attached during action - they are part of the body
- Hearing aids, glasses, medical devices remain visible and integrated`.trim();
```

### 2.3 Motif + Palette Journey Directive

**System Prompt** (Palette Generation)  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2286-2291

```typescript
const response = await this.openai.chat.completions.create({
  model: MODEL_CONFIG.TEXT,
  messages: [
    {
      role: 'system',
      content: `You are a picture-book art director.
Return JSON ONLY:
{ "motif":"<short theme>", "paletteJourney":[ "<cover>", "<p1>", "<p2>", "<p3>", "<p4>" ] }
Palette arc should mirror emotional arc.`
    },
    {
      role: 'user',
      content: fullStory.slice(0, 6000)  // V2 PARITY: Analyze first 6000 chars
    }
  ],
  temperature: 0.5,  // V2 PARITY: Balanced for thematic analysis
  max_completion_tokens: 180,
  response_format: { type: 'json_object' }
});
```

**Motif Instruction Builder**  
**Function**: `buildMotifInstruction()`  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2337-2339

```typescript
private buildMotifInstruction(motif: string): string {
  return `Subtle motif: weave a small symbol of "${motif}" into the scene.`;
}
```

### 2.4 Protagonist DNA / Character Context

**Function**: `buildCharacterConsistencyContext()`  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2866-2918

**Template** (Lines 2907-2917):

```typescript
return `CHARACTER DETAILS (EXACT consistency across ALL images):
Name: ${characterName}
Age: ${age} years old
Species: ${species}
Ethnicity: ${ethnicity}
Hair: ${hairColor}
Eyes: ${eyeColor}
Physical traits: ${appearance}${inclusivitySection}

CRITICAL: ${characterName} looks EXACTLY the same in cover + all 4 beats.
Visual consistency is paramount for therapeutic storytelling.`;
```

**Inclusivity Section** (Lines 2875-2905):
If character has inclusivity traits, adds detailed section with trait visual descriptions, mandatory requirements, and safety negatives.

### 2.5 GLOBAL_STYLE Block

**Constant**: `GLOBAL_STYLE`  
**File**: `lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts`  
**Lines**: 61-70

```typescript
export const GLOBAL_STYLE = `
GLOBAL STYLE (fixed)
— Medium & surface: ultra-high-res digital hand-painting; soft-airbrush blends layered with subtle painterly brush strokes; fine canvas tooth only where needed for warmth.
— Edge handling: paint-defined silhouettes (no ink); crisp edges on focal elements, feathered fall-off on background forms.
— Lighting & colour: vibrant, optimistic palette; warm key-light versus cool teal/purple shadows; molten rim highlights; volumetric haze with drifting dust motes for depth.
— Dimensional shading: subtle subsurface bounce; glossy specular accents on eyes, enamel, or metal; avoid heavy impasto or cel-shading.
— Composition: cinematic lens choice, layered foreground / mid / background planes with atmospheric falloff.
— Colour discipline: thread protagonist HEX colours through costume, props **and** environment—never solid swatches.
— STRICT: no text, captions, UI, or watermarks.
`.trim();
```

### 2.6 ARTISTIC_EXECUTION Block

**Constant**: `ARTISTIC_EXECUTION`  
**File**: `lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts`  
**Lines**: 38-59

```typescript
export const ARTISTIC_EXECUTION = `
ARTISTIC EXECUTION:
High-resolution digital hand-painting with soft airbrush blends layered over subtle 
painterly brush strokes. Fine canvas tooth texture where needed for organic warmth.

Clean painted edges with crisp silhouette control. Microscopic texture on fabrics 
and foliage scaled to 300 ppi. Vibrant cinematic color palette with warm key-light 
against cooler teal or purple shadows. Luminous golden rim highlights catching edges.

Atmospheric depth with floating light motes and gentle haze for immersion. Natural 
dimensional shading with bounce light and glossy specular kicks on eyes, teeth, and 
metal surfaces. No heavy impasto.

Color discipline: Weave protagonist HEX codes into skin, hair, eyes, clothing, AND 
environment—never showing colors as flat swatches. Slightly stylized but grounded, 
with realistic proportions and gentle exaggeration for expression and energy.

Style inspiration: High-end graphic novels for crisp composition and line work, 
animated feature film color scripts for cinematic lighting and emotional mood.

STRICT: No text, captions, UI elements, or watermarks.
`.trim();
```

### 2.7 CAMERA_ANGLES Array

**Constant**: `CAMERA_ANGLES`  
**File**: `lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts`  
**Lines**: 97-130 (approximate)

```typescript
export const CAMERA_ANGLES = [
  "Wide establishing shot at slight low angle (heroic, approachable)",
  "Medium shot at eye level (intimate, conversational)",
  "Low angle looking up (empowering, aspirational)",
  "High angle looking down (bird's eye, protective)",
  "Over-the-shoulder or side view (dynamic action, movement)"
];
```

### 2.8 Pose/Framing Directives

**Location**: Injected into beat prompts only  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2658-2665

```typescript
POSE VARIATION (MANDATORY - V2 PARITY Enhanced):
- This is pose ${beatIndex + 2} of 5
- Character MUST be in a distinctly different pose than in any reference image
- Change arm and leg positions clearly so the body language is obviously new
- Use a different camera angle or framing (for example: wide shot, low angle, side view, top-down, or over-the-shoulder)
- Avoid re-using the same straight-on, centered pose or composition seen in reference images
- If the pose feels too similar to any reference, choose a more dynamic, story-specific alternative that matches this scene
```

### 2.9 Disability Representation Rules

**Location**: Injected into both cover and beat prompts  
**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Cover**: Lines 2464-2471  
**Beat**: Lines 2649-2656

```typescript
DISABILITY REPRESENTATION (CRITICAL):
- Mobility aids (wheelchairs, canes, walkers) are PART of the character, not obstacles
- In magical/flight scenes: character AND wheelchair fly together (wheels glowing, both airborne)
- NEVER show character separated from their mobility aid as "freedom"
- Wheelchair modifications for fantasy: glowing wheels, magical propulsion, transforming features
- Adventure happens WITH the aid, not despite it
- Prosthetics stay attached during action - they are part of the body
- Hearing aids, glasses, medical devices remain visible and integrated
```

---

## 3. Final Prompt Assembly Templates (Verbatim)

### 3.1 Cover Prompt Assembly

**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2444-2480

**Assembly Order**:

```typescript
let coverPrompt = `${ARTISTIC_EXECUTION}

${GLOBAL_STYLE}

PROTAGONIST DNA: ${characterContext}

SCENE - COVER ART (V2 PARITY: GPT-4o Analyzed):
${coverSceneAnalysis}

Camera: ${CAMERA_ANGLES[0]}
Depth: Layered foreground/mid/background with atmospheric falloff

PALETTE (V2 PARITY: Story-Specific, Not Static): ${paletteJourney[0]}
- Thread protagonist HEX colors through environment
- Warm key-light vs cool teal/purple shadows
- Luminous rim highlights
- Volumetric haze with dust motes

${this.buildMotifInstruction(motif)}

DISABILITY REPRESENTATION (CRITICAL):
- Mobility aids (wheelchairs, canes, walkers) are PART of the character, not obstacles
- In magical/flight scenes: character AND wheelchair fly together (wheels glowing, both airborne)
- NEVER show character separated from their mobility aid as "freedom"
- Wheelchair modifications for fantasy: glowing wheels, magical propulsion, transforming features
- Adventure happens WITH the aid, not despite it
- Prosthetics stay attached during action - they are part of the body
- Hearing aids, glasses, medical devices remain visible and integrated

EMOTIONAL TONE: Wonder, curiosity, readiness
AGE: Suitable for young audiences 3-10
QUALITY: Professional therapeutic storytelling

CRITICAL: Establish ${characterName}'s appearance clearly
Hand-painted digital art (NOT 3D, NOT Pixar)

${GLOBAL_STYLE}`;
```

**Block Count**: GLOBAL_STYLE appears **TWICE** (lines 2446 and 2480)

**Post-Processing**: Lines 2482-2483
```typescript
// Run contextual safety check on art prompt
coverPrompt = await this.checkAndSanitizeArtPrompt(coverPrompt, characterTraits?.age || 7);
```

### 3.2 Beat Prompt Assembly

**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2632-2672

**Assembly Order**:

```typescript
const beatPrompt = `${ARTISTIC_EXECUTION}

${GLOBAL_STYLE}

PROTAGONIST DNA: ${characterContext}

SCENE - BEAT ${beatIndex + 1} OF 4 (V2 PARITY: GPT-4o Analyzed):
${beatSceneAnalysis}

Story: "${story.title}"
Image ${beatIndex + 2} of 5 total

CAMERA: ${CAMERA_ANGLES[paletteIndex] || CAMERA_ANGLES[1]}
PALETTE (V2 PARITY: Story-Specific): ${paletteJourney[paletteIndex] || paletteJourney[1]}

${this.buildMotifInstruction(motif)}

DISABILITY REPRESENTATION (CRITICAL):
- Mobility aids (wheelchairs, canes, walkers) are PART of the character, not obstacles
- In magical/flight scenes: character AND wheelchair fly together (wheels glowing, both airborne)
- NEVER show character separated from their mobility aid as "freedom"
- Wheelchair modifications for fantasy: glowing wheels, magical propulsion, transforming features
- Adventure happens WITH the aid, not despite it
- Prosthetics stay attached during action - they are part of the body
- Hearing aids, glasses, medical devices remain visible and integrated

POSE VARIATION (MANDATORY - V2 PARITY Enhanced):
- This is pose ${beatIndex + 2} of 5
- Character MUST be in a distinctly different pose than in any reference image
- Change arm and leg positions clearly so the body language is obviously new
- Use a different camera angle or framing (for example: wide shot, low angle, side view, top-down, or over-the-shoulder)
- Avoid re-using the same straight-on, centered pose or composition seen in reference images
- If the pose feels too similar to any reference, choose a more dynamic, story-specific alternative that matches this scene

VISUAL CONTINUITY (CRITICAL):
- ${characterName} looks EXACTLY as in previous ${beatIndex + 1} images
- Same hand-painted digital art style
- Maintain ALL physical traits (inclusivity features, skin tone, hair, etc.)
- Inclusivity traits MUST remain visible (wheelchair, prosthetics, Down syndrome features, etc.)

${GLOBAL_STYLE}`;
```

**Block Count**: GLOBAL_STYLE appears **TWICE** (lines 2634 and 2672)

**Post-Processing**: Lines 2674-2675
```typescript
// Run contextual safety check
const sanitizedBeatPrompt = await this.checkAndSanitizeArtPrompt(beatPrompt, characterTraits?.age || 7);
```

---

## 4. OpenAI Image Payloads (Verbatim)

### 4.1 Model Configuration

**File**: `lambda-deployments/content-agent/src/config/models.ts`  
**Lines**: 13-37

```typescript
export const MODEL_CONFIG = {
  /**
   * Text generation model used for:
   * - Scene analysis (analyzeSceneForVisualDynamism)
   * - Palette journey generation (generateStoryPaletteJourney)
   * - Educational activities
   * - Story generation
   */
  TEXT: process.env.GPT_TEXT_MODEL || 'gpt-5.2',

  /**
   * Vision model used for:
   * - Image safety review
   * - Character trait validation
   * - Reference image analysis
   */
  VISION: process.env.GPT_VISION_MODEL || 'gpt-5.1',

  /**
   * Image generation model used for:
   * - Story illustrations (cover + beats)
   * - Character reference images
   */
  IMAGE: process.env.GPT_IMAGE_MODEL || 'gpt-image-1.5',
} as const;
```

**Usage**: `DEFAULT_IMAGE_MODEL` is set to `MODEL_CONFIG.IMAGE` (line 1954, 1964)

### 4.2 Image Generation with References (images.edit)

**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 1951-1959

```typescript
if (referenceFiles.length > 0) {
  // Use images.edit() with references (BUILDSHIP APPROACH - per plan)
  response = await this.openai.images.edit({
    model: DEFAULT_IMAGE_MODEL,
    prompt: currentPrompt,
    image: referenceFiles.length === 1 ? referenceFiles[0] : referenceFiles,
    size: size as any,
    quality: quality as any
  });
```

**Parameters**:
- `model`: `MODEL_CONFIG.IMAGE` (default: `gpt-image-1.5`)
- `prompt`: Full assembled prompt string
- `image`: OpenAI File object(s) from character references
- `size`: Default `'1024x1024'` (line 1888)
- `quality`: Default `'high'` (line 1889)

### 4.3 Image Generation without References (images.generate)

**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 1960-1968

```typescript
} else {
  // Fallback to images.generate()
  this.logger.warn('No references available, using generate() instead of edit()');
  response = await this.openai.images.generate({
    model: DEFAULT_IMAGE_MODEL,
    prompt: currentPrompt,
    size: size as any,
    quality: quality as any
  });
}
```

**Parameters**:
- `model`: `MODEL_CONFIG.IMAGE` (default: `gpt-image-1.5`)
- `prompt`: Full assembled prompt string
- `size`: Default `'1024x1024'`
- `quality`: Default `'high'`

### 4.4 Retry Logic

**File**: `lambda-deployments/content-agent/src/RealContentAgent.ts`  
**Lines**: 2060-2080

**Retry Behavior**:
1. Safety failure → Appends `suggested_fix_prompt` to prompt
2. Trait validation failure → Appends `suggested_trait_fix` to prompt
3. Style failure → **Logged only, NOT appended** (trusts base prompts)

```typescript
if (attempt < maxRetries) {
  // Build retry prompt combining all three fixes
  let retryPrompt = prompt;
  
  if (review.suggested_fix_prompt) {
    retryPrompt += `\n\nSafety adjustments:\n${review.suggested_fix_prompt}`;
  }
  
  if (review.suggested_trait_fix) {
    retryPrompt += `\n\nTrait visibility adjustments (AI BIAS CORRECTION - ATTEMPT ${attempt + 2}):\n${review.suggested_trait_fix}`;
  }

  // Style fix: Log but don't include in retry (trusting Buildship prompts)
  if (review.suggested_style_fix) {
    this.logger.info('Style fix suggested but not applying (trusting prompts)', {
      suggestedFix: review.suggested_style_fix,
      note: 'Style improvements come from better base prompts, not retry corrections'
    });
  }

  currentPrompt = retryPrompt;
  finalReview = review;
```

**Max Retries**:
- Cover: 2 attempts (line 2503)
- Beats: 1 attempt (line 2692)

### 4.5 Reference Image Behavior

**Cover References** (Lines 2497-2504):
```typescript
const coverResult = await this.generateImageWithReferences({
  prompt: coverPrompt,
  referenceUrls: characterReferences,  // Character reference images from DB
  targetRating: 'G',
  characterName,
  expectedTraits: characterInclusivityTraits,
  maxRetries: 2
});
```

**Beat References - V2 PARITY FIX** (Lines 2599-2688):
```typescript
// V2 PARITY FIX: Reference chain isolation
// Source: V2 Image Flow lines 585-595
// CRITICAL: Beats should ONLY see the cover image as reference, NOT previous beats
// This maintains style consistency while forcing distinct pose variation
// OLD (WRONG): progressiveReferences = [coverS3Url, beat1, beat2, beat3]
// NEW (CORRECT): coverOnlyReferences = [coverS3Url] for ALL beats
const coverOnlyReferences = [coverS3Url];  // V2 PARITY: Beats reference ONLY cover

// ... later in loop ...

// V2 PARITY FIX: Use ONLY cover as reference
// Source: V2 Image Flow lines 585-595
// OLD (WRONG): Used last 3 images including previous beats
// NEW (CORRECT): Use ONLY cover image to maintain style but force pose variation
// This prevents repetitive poses while maintaining visual consistency
const beatReferences = coverOnlyReferences;  // V2 PARITY: Only the cover image

const beatResult = await this.generateImageWithReferences({
  prompt: sanitizedBeatPrompt,
  referenceUrls: beatReferences,  // V2 PARITY: Cover only, not progressive chain
  targetRating: 'G',
  characterName,
  expectedTraits: characterInclusivityTraits,
  maxRetries: 1
});
```

**Key Insight**: ALL 4 beats reference ONLY the cover (not previous beats) to force pose variation.

---

## 5. V2 vs V3 Comparison

| Element | V2 Baseline | V3 Current | Notes |
|---------|-------------|------------|-------|
| **Cover Directive** | `Identify the single most visually kinetic, plot-shifting moment in the story.`<br>`Depict the protagonist mid-action at peak emotion (wonder, fear, triumph, etc.).`<br>`Return ONE paragraph ≤120 words describing action, camera angle, depth, lighting, and atmosphere.`<br>`Do NOT mention medium, palette, brush style, text, UI, or watermarks.` | `Identify the single most visually kinetic, plot-shifting moment in the story.`<br>`Depict the protagonist mid-action at peak emotion (wonder, fear, triumph, etc.).`<br>`Return ONE paragraph ≤120 words describing action, camera angle, depth, lighting, and atmosphere.`<br>`Do NOT mention medium, palette, brush style, text, UI, or watermarks.`<br><br>`CRITICAL: Disability Representation Rules:`<br>`- Mobility aids (wheelchairs, canes, walkers) are PART of the character, not obstacles`<br>`- In magical/flight scenes: "character AND wheelchair fly together" (wheels glowing, both airborne)`<br>`- Never show character separated from their mobility aid as "freedom"`<br>`- Wheelchair modifications for fantasy: glowing wheels, magical propulsion, transforming features`<br>`- Adventure happens WITH the aid, not despite it`<br>`- Prosthetics stay attached during action - they are part of the body`<br>`- Hearing aids, glasses, medical devices remain visible and integrated` | V3 adds disability representation rules (7 lines) |
| **Beat Directive** | `You are a film story artist describing keyframes.`<br>`Return ONE paragraph ≤120 words that shows decisive action & emotion,`<br>`specifies cinematic camera angle/lens or depth-of-field, layers foreground/mid/background,`<br>`and notes atmosphere. Do NOT mention medium, palette, UI, or watermarks.` | `You are a film story artist describing keyframes.`<br>`Return ONE paragraph ≤120 words that shows decisive action & emotion,`<br>`specifies cinematic camera angle/lens or depth-of-field, layers foreground/mid/background,`<br>`and notes atmosphere. Do NOT mention medium, palette, UI, or watermarks.`<br><br>`CRITICAL: Disability Representation Rules:`<br>`- Mobility aids (wheelchairs, canes, walkers) are PART of the character, not obstacles`<br>`- In magical/flight scenes: "character AND wheelchair fly together" (wheels glowing, both airborne)`<br>`- Never show character separated from their mobility aid as "freedom"`<br>`- Wheelchair modifications for fantasy: glowing wheels, magical propulsion, transforming features`<br>`- Adventure happens WITH the aid, not despite it`<br>`- Prosthetics stay attached during action - they are part of the body`<br>`- Hearing aids, glasses, medical devices remain visible and integrated` | V3 adds disability representation rules (7 lines) |
| **GLOBAL_STYLE Block** | `— Medium & surface: ultra-high-res digital hand-painting; soft-airbrush blends layered with subtle painterly brush strokes; fine canvas tooth only where needed for warmth.`<br>`— Edge handling: paint-defined silhouettes (no ink); crisp edges on focal elements, feathered fall-off on background forms.`<br>`— Lighting & colour: vibrant, optimistic palette; warm key-light versus cool teal/purple shadows; molten rim highlights; volumetric haze with drifting dust motes for depth.`<br>`— Dimensional shading: subtle subsurface bounce; glossy specular accents on eyes, enamel, or metal; avoid heavy impasto or cel-shading.`<br>`— Composition: cinematic lens choice, layered foreground / mid / background planes with atmospheric falloff.`<br>`— Colour discipline: thread protagonist HEX colours through costume, props and environment—never solid swatches.`<br>`— STRICT: no text, captions, UI, or watermarks.` | Identical | Exact match |
| **Pose/Framing Directives** | `• The character must be in a distinctly different pose than in any reference image.`<br>`• Change arm and leg positions clearly so the body language is obviously new.`<br>`• Use a different camera angle or framing (for example, wide shot, low angle, side view, top-down, or over-the-shoulder).`<br>`• Avoid re-using the same straight-on, centered pose or composition seen in reference images.`<br>`• If the pose feels too similar to any reference, choose a more dynamic, story-specific alternative that matches this scene.` | `POSE VARIATION (MANDATORY - V2 PARITY Enhanced):`<br>`- This is pose ${beatIndex + 2} of 5`<br>`- Character MUST be in a distinctly different pose than in any reference image`<br>`- Change arm and leg positions clearly so the body language is obviously new`<br>`- Use a different camera angle or framing (for example: wide shot, low angle, side view, top-down, or over-the-shoulder)`<br>`- Avoid re-using the same straight-on, centered pose or composition seen in reference images`<br>`- If the pose feels too similar to any reference, choose a more dynamic, story-specific alternative that matches this scene` | V3 adds header and pose counter. Content identical. |
| **Motif Instruction** | (V2 behavior implied, not documented in baseline) | `Subtle motif: weave a small symbol of "${motif}" into the scene.` | V3 explicitly calls buildMotifInstruction() |
| **Palette Journey Instruction** | (V2 used GPT-4o to generate palette) | System prompt:<br>`You are a picture-book art director.`<br>`Return JSON ONLY:`<br>`{ "motif":"<short theme>", "paletteJourney":[ "<cover>", "<p1>", "<p2>", "<p3>", "<p4>" ] }`<br>`Palette arc should mirror emotional arc.` | V3 mirrors V2 approach |
| **Protagonist DNA** | (Not documented in V2 baseline, assumed present) | `CHARACTER DETAILS (EXACT consistency across ALL images):`<br>`Name: ${characterName}`<br>`Age: ${age} years old`<br>`Species: ${species}`<br>`Ethnicity: ${ethnicity}`<br>`Hair: ${hairColor}`<br>`Eyes: ${eyeColor}`<br>`Physical traits: ${appearance}${inclusivitySection}`<br><br>`CRITICAL: ${characterName} looks EXACTLY the same in cover + all 4 beats.`<br>`Visual consistency is paramount for therapeutic storytelling.` | V3 includes detailed inclusivity trait section if present |
| **Safety Prompt Modification** | (Not documented in V2 baseline) | On retry:<br>`Safety adjustments:\n${suggested_fix_prompt}`<br>`Trait visibility adjustments (AI BIAS CORRECTION):\n${suggested_trait_fix}`<br><br>Style fixes logged but NOT appended | V3 appends safety/trait fixes on retry, ignores style fixes |
| **Reference Image Behavior** | Cover: Character references<br>Beats: Cover only (isolation pattern) | Cover: `images.edit()` with character references<br>Beats: `images.edit()` with COVER ONLY (not progressive chain)<br><br>Fallback: `images.generate()` if no references | V3 matches V2 isolation pattern (beats see only cover) |
| **Model Used** | `gpt-4o` (text analysis)<br>Image model not specified in baseline | TEXT: `gpt-5.2` (env: GPT_TEXT_MODEL)<br>VISION: `gpt-5.1` (env: GPT_VISION_MODEL)<br>IMAGE: `gpt-image-1.5` (env: GPT_IMAGE_MODEL) | V3 uses newer models with env config |
| **ARTISTIC_EXECUTION Block** | (Not present in V2 baseline) | 19-line detailed execution guide covering:<br>- Digital hand-painting technique<br>- Edge control & texture<br>- Cinematic color & lighting<br>- Atmospheric depth<br>- Color discipline<br>- Style inspiration<br>- Strict no-text rule | V3 adds comprehensive artistic guidance |
| **GLOBAL_STYLE Duplication** | (Unknown - not in baseline) | GLOBAL_STYLE appears **TWICE** in both cover and beat prompts:<br>1. After ARTISTIC_EXECUTION (top)<br>2. At end of prompt (bottom) | V3 repeats GLOBAL_STYLE for emphasis |
| **Camera Angles** | (Not documented in V2 baseline) | Array of 5 angles:<br>1. Wide establishing at low angle<br>2. Medium shot at eye level<br>3. Low angle looking up<br>4. High angle looking down<br>5. Over-shoulder or side view | V3 provides specific camera options |
| **Additional V3 Sections** | (Not present in V2) | 1. Disability Representation (7 lines)<br>2. Emotional Tone + Age + Quality (3 lines)<br>3. Visual Continuity (4 lines for beats)<br>4. Pose counter ("This is pose X of 5") | V3 adds structure and guardrails |

---

## Summary of Key Differences

### What V3 Added (Not in V2 Baseline):

1. **ARTISTIC_EXECUTION block** (19 lines) - Comprehensive technique guidance
2. **Disability Representation rules** (7 lines) - Integration of mobility aids
3. **Detailed character context** with inclusivity traits from database
4. **GLOBAL_STYLE duplication** (appears twice in each prompt)
5. **Structured sections** (EMOTIONAL TONE, AGE, QUALITY, VISUAL CONTINUITY)
6. **Explicit pose counter** ("This is pose X of 5")
7. **Safety prompt modification** on retry (appends fixes)
8. **Model configuration** via environment variables

### What V3 Kept from V2:

1. **GLOBAL_STYLE text** - Exact match
2. **Scene analysis directives** - Core content identical (V3 added disability rules)
3. **Pose variation directives** - Core content identical (V3 added header)
4. **Palette journey generation** - Same GPT approach
5. **Reference isolation pattern** - Beats reference ONLY cover (not progressive chain)
6. **3-pass architecture** - Palette → Scene Analysis → Image Generation

### Potential Issues:

1. **GLOBAL_STYLE duplication** - Does repeating it help or cause redundancy?
2. **Prompt length** - V3 prompts are significantly longer (~50% more content)
3. **Safety appends** - Retry prompts get additional instructions that may dilute original intent
4. **Missing from V2 baseline** - ARTISTIC_EXECUTION may not have V2 equivalent to compare

---

**END OF INVENTORY**

