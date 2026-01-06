"use strict";
/**
 * Global Art Style - Your Signature Artistic Standards
 *
 * This EXACT style should be used for:
 * - All character headshots
 * - All story cover images
 * - All story beat illustrations
 * - All Sora video animations
 *
 * Consistency = Your Brand
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIGHTING_MOODS = exports.DEPTH_DIRECTIVES = exports.CAMERA_ANGLES = exports.FALLBACK_PALETTE = exports.GLOBAL_STYLE = void 0;
exports.GLOBAL_STYLE = `
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
 * Fallback palette journey (dawn → dusk emotional arc)
 * Used when story doesn't generate custom palette
 */
exports.FALLBACK_PALETTE = [
    "Bright sunrise warmth with candy-pastel accents.",
    "Slightly cooler teal highs hinting at rising tension.",
    "Balanced midday vibrancy, full saturation.",
    "Golden-hour oranges sliding toward magenta dusk.",
    "Deep twilight jewel tones with soft bioluminescent highlights."
];
/**
 * Camera angle directives for cinematic quality
 */
exports.CAMERA_ANGLES = [
    "Establishing wide shot, slight low angle (heroic introduction)",
    "Medium close-up, eye-level (intimate connection)",
    "Dynamic angle following action, layered depth planes",
    "Dramatic reveal angle, atmospheric perspective",
    "Triumphant pullback, celebrating resolution"
];
/**
 * Depth directives for professional composition
 */
exports.DEPTH_DIRECTIVES = [
    "Foreground sharp with protagonist in focus, background soft bokeh with atmospheric falloff",
    "Layered depth: foreground elements frame the action, mid-ground holds characters, background suggests world",
    "Compressed depth with shallow focus, protagonist crisp, environment dreamlike",
    "Deep focus showing full environment, maintaining protagonist prominence through lighting",
    "Balanced depth across three planes, each contributing to emotional narrative"
];
/**
 * Lighting moods for emotional beats
 */
exports.LIGHTING_MOODS = [
    "Warm, inviting key light suggesting safety and discovery, soft shadows",
    "Dappled, dynamic lighting suggesting movement and adventure, play of light and shadow",
    "Focused, dramatic lighting building tension, deeper contrasts",
    "Brilliant, revelatory lighting at peak moment, golden warmth",
    "Soft, triumphant lighting suggesting resolution and peace, gentle glow"
];
//# sourceMappingURL=GlobalArtStyle.js.map