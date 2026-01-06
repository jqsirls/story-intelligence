/**
 * Global Art Style - V3 with V2 Parity
 * 
 * This EXACT style should be used for:
 * - All character headshots
 * - All story cover images
 * - All story beat illustrations
 * - All Sora video animations
 * 
 * V2 PARITY ACHIEVED (December 29, 2025):
 * - GLOBAL_STYLE: Matches V2's fixed artistic direction (V2 lines 42-50)
 * - FALLBACK_PALETTE: Used only as fallback, replaced by story-analyzed palette (V2 lines 56-62)
 * - CAMERA_ANGLES: Provides cinematic framing options (V2 pattern)
 * - ARTISTIC_EXECUTION: Natural guidance without artist name references (V2 pattern)
 * 
 * KEY PRINCIPLE: Consistency = Your Brand
 * 
 * V2 REFERENCE: `v2 OLD Prompt Templates/Images/V2 Image Flow`
 * - buildImagePrompts.ts defines GLOBAL_STYLE (lines 42-50)
 * - buildImagePrompts.ts defines FALLBACK_PALETTE (lines 56-62)
 * - Image generation uses these constants for all 5 images (cover + 4 beats)
 */

/**
 * Artistic Execution Direction
 * 
 * V2 PARITY: Natural artistic guidance following Buildship's approach
 * Use BEFORE character details to set artistic expectation
 * 
 * Source: V2's buildImagePrompts.ts (implicit in GLOBAL_STYLE constant)
 * Key Elements:
 * - Hand-painted digital art (NOT 3D, NOT Pixar, NOT anime)
 * - Soft airbrush blends with painterly brush strokes
 * - Vibrant cinematic color with warm/cool contrast
 * - Layered depth with atmospheric falloff
 * - NO artist name references (safety compliance)
 */
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

/**
 * Fallback Palette Journey (dawn → dusk emotional arc)
 * 
 * V2 PARITY: This is the FALLBACK only, used when GPT-4o palette generation fails
 * 
 * Source: V2's buildImagePrompts.ts lines 56-62 (FALLBACK_PALETTE constant)
 * 
 * IN V2: This was the DEFAULT palette (always used)
 * IN V3: This is the FALLBACK (GPT-4o generates story-specific palette first)
 * 
 * V3 IMPROVEMENT over V2:
 * - Primary: generateStoryPaletteJourney() creates custom 5-step arc mirroring story's emotional journey
 * - Fallback: This generic palette used only if GPT-4o analysis fails
 * - Result: More dynamic, story-specific color progression
 * 
 * Usage: RealContentAgent.generateStoryImages() tries GPT-4o first, falls back to this
 */
export const FALLBACK_PALETTE = [
  "Bright sunrise warmth with candy-pastel accents.",
  "Slightly cooler teal highs hinting at rising tension.",
  "Balanced midday vibrancy, full saturation.",
  "Golden-hour oranges sliding toward magenta dusk.",
  "Deep twilight jewel tones with soft bioluminescent highlights."
];

/**
 * Camera angle directives for cinematic quality
 */
export const CAMERA_ANGLES = [
  "Establishing wide shot, slight low angle (heroic introduction)",
  "Medium close-up, eye-level (intimate connection)",
  "Dynamic angle following action, layered depth planes",
  "Dramatic reveal angle, atmospheric perspective",
  "Triumphant pullback, celebrating resolution"
];

/**
 * Depth directives for professional composition
 */
export const DEPTH_DIRECTIVES = [
  "Foreground sharp with protagonist in focus, background soft bokeh with atmospheric falloff",
  "Layered depth: foreground elements frame the action, mid-ground holds characters, background suggests world",
  "Compressed depth with shallow focus, protagonist crisp, environment dreamlike",
  "Deep focus showing full environment, maintaining protagonist prominence through lighting",
  "Balanced depth across three planes, each contributing to emotional narrative"
];

/**
 * Lighting moods for emotional beats
 */
export const LIGHTING_MOODS = [
  "Warm, inviting key light suggesting safety and discovery, soft shadows",
  "Dappled, dynamic lighting suggesting movement and adventure, play of light and shadow",
  "Focused, dramatic lighting building tension, deeper contrasts",
  "Brilliant, revelatory lighting at peak moment, golden warmth",
  "Soft, triumphant lighting suggesting resolution and peace, gentle glow"
];

