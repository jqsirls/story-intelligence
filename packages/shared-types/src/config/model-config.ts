/**
 * Centralized AI Model Configuration
 * 
 * This module provides centralized configuration for all AI models used across Storytailor.
 * All models are configurable via environment variables with sensible defaults.
 * 
 * Model Version Policy:
 * - Text: GPT-5.1+ (or latest GPT-5.x) for primary, GPT-5.1-mini for lightweight
 * - Image: gpt-image-1 (or latest gpt-image-x)
 * - Video: sora-2 (or latest sora-x)
 * - Never use: gpt-3, gpt-3.5-turbo, gpt-4, gpt-4o, dall-e-2, dall-e-3
 * 
 * Upgrade Path:
 * When GPT-6+ is released, update SSM parameters only - no code changes needed.
 */

export interface ModelConfig {
  TEXT: {
    PRIMARY: string;
    CONVERSATION: string;
    SAFETY: string;
    ROUTING: string;
  };
  IMAGE: {
    PRIMARY: string;
  };
  VIDEO: {
    PRIMARY: string;
  };
}

/**
 * Deprecated models that should not be used
 */
const DEPRECATED_MODELS = [
  'gpt-3',
  'gpt-3.5',
  'gpt-3.5-turbo',
  'gpt-4',
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-4-turbo-preview',
  'gpt-4-1106-preview',
  'dall-e-2',
  'dall-e-3',
];

/**
 * Validate model name against deprecated models
 */
export function validateModel(modelName: string): boolean {
  const isDeprecated = DEPRECATED_MODELS.some(deprecated => 
    modelName.toLowerCase().includes(deprecated.toLowerCase())
  );
  
  if (isDeprecated) {
    console.warn(`⚠️  Deprecated model detected: ${modelName}. Please use GPT-5.1+ or gpt-image-1.`);
    return false;
  }
  
  return true;
}

/**
 * Centralized model configuration
 * 
 * All models support GPT-5.x versioning (flexible) with gpt-5.1 as default.
 * Environment variables allow easy upgrades to GPT-6+ without code changes.
 */
export const MODEL_CONFIG: ModelConfig = {
  TEXT: {
    /**
     * Primary text generation model for story creation, character generation, content moderation
     * Default: gpt-5.1 (supports gpt-5.x versions)
     */
    PRIMARY: process.env.OPENAI_MODEL_STORY || 'gpt-5.1',
    
    /**
     * Lightweight model for conversational responses, quick content generation
     * Default: gpt-5.1-mini (supports gpt-5.x-mini versions)
     */
    CONVERSATION: process.env.OPENAI_MODEL_CONVERSATION || 'gpt-5.1-mini',
    
    /**
     * Safety and content moderation model
     * Default: gpt-5.1 (supports gpt-5.x versions)
     */
    SAFETY: process.env.OPENAI_MODEL_SAFETY || 'gpt-5.1',
    
    /**
     * Routing and intent classification model
     * Default: gpt-5.1-mini (supports gpt-5.x-mini versions)
     */
    ROUTING: process.env.OPENAI_MODEL_ROUTING || 'gpt-5.1-mini',
  },
  IMAGE: {
    /**
     * Image generation model for character art, story illustrations, cover art
     * Default: gpt-image-1 (supports gpt-image-x versions)
     */
    PRIMARY: process.env.OPENAI_MODEL_IMAGE || 'gpt-image-1',
  },
  VIDEO: {
    /**
     * Video generation model for story videos, micro episodes, animated content
     * Default: sora-2 (supports sora-x versions)
     */
    PRIMARY: process.env.OPENAI_MODEL_VIDEO || 'sora-2',
  },
};

/**
 * Get model configuration with validation
 */
export function getModelConfig(): ModelConfig {
  // Validate all models on startup (development only to avoid performance impact)
  if (process.env.NODE_ENV === 'development') {
    Object.values(MODEL_CONFIG.TEXT).forEach(model => validateModel(model));
    validateModel(MODEL_CONFIG.IMAGE.PRIMARY);
    validateModel(MODEL_CONFIG.VIDEO.PRIMARY);
  }
  
  return MODEL_CONFIG;
}

/**
 * Convenience exports for common model selections
 */
export const DEFAULT_STORY_MODEL = MODEL_CONFIG.TEXT.PRIMARY;
export const DEFAULT_CONVERSATION_MODEL = MODEL_CONFIG.TEXT.CONVERSATION;
export const DEFAULT_SAFETY_MODEL = MODEL_CONFIG.TEXT.SAFETY;
export const DEFAULT_ROUTING_MODEL = MODEL_CONFIG.TEXT.ROUTING;
export const DEFAULT_IMAGE_MODEL = MODEL_CONFIG.IMAGE.PRIMARY;
export const DEFAULT_VIDEO_MODEL = MODEL_CONFIG.VIDEO.PRIMARY;
