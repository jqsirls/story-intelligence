/**
 * models.ts
 * 
 * Centralized GPT model configuration.
 * Prevents hardcoding model names, allowing flexibility for model deprecation/updates.
 * 
 * Environment Variables:
 * - GPT_TEXT_MODEL: Model for text generation tasks (default: gpt-5.2)
 * - GPT_VISION_MODEL: Model for vision/image analysis tasks (default: gpt-5.1)
 * - GPT_IMAGE_MODEL: Model for image generation (default: gpt-image-1)
 */

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

/**
 * V2 PARITY: Model flexibility
 * 
 * V2 passed models as function parameters (e.g., `model`, `visionModel`).
 * V3 uses centralized environment-based config for easier Lambda deployment.
 * 
 * Migration path:
 * - Set SSM parameters: /storytailor/production/gpt-text-model, etc.
 * - Lambda automatically picks up new models without code changes.
 */

