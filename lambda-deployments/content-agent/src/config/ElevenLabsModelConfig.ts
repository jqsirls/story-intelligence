/**
 * Centralized ElevenLabs Model Configuration
 * 
 * This module provides centralized configuration for all ElevenLabs models used across Storytailor.
 * All models are configurable via environment variables with sensible defaults.
 * 
 * Model Version Policy:
 * - Story Narration: eleven_v3 (latest stable, expressive, high quality)
 * - Multi-Character Dialogue: eleven_v3 (best expressiveness)
 * - Real-time Conversation: eleven_flash_v2_5 (low latency)
 * - Background Music: music_v1 (specialized for music)
 * 
 * Upgrade Path:
 * When new models are released (e.g., eleven_v4), update environment variables or SSM parameters only.
 * Model requirements (voice_settings) are automatically validated per model version.
 */

export type ElevenLabsModelId =
  | 'eleven_v3'                    // Latest stable (June 2025) - Expressive, 70+ languages, best for narration
  | 'eleven_multilingual_v2'       // Stable fallback - Consistent quality
  | 'eleven_v3_alpha'              // Alpha version (use with caution)
  | 'eleven_turbo_v2_5'            // High quality, low latency (~250-300ms)
  | 'eleven_flash_v2_5'            // Fast, affordable (~75ms)
  | 'eleven_monolingual_v1'        // Legacy model (deprecated)
  | 'music_v1';                    // Specialized for music generation

export interface ElevenLabsVoiceSettings {
  stability: number;              // 0.0-1.0 (for v3: 0.0, 0.5, 1.0 only)
  similarity_boost: number;      // 0.0-1.0
  use_speaker_boost?: boolean;   // Optional - may cause TTD interpretation issues
  style?: number;                // 0.0-1.0 (v3 only, for expressive speech)
  speed?: number;                // 0.25-4.0 (speaking rate)
}

export interface ModelRequirements {
  supportedVoiceSettings: string[];  // Which settings are supported
  requiredSettings: string[];        // Which settings are required
  defaultSettings: ElevenLabsVoiceSettings;
  notes: string;                     // Model-specific notes
}

/**
 * Model-specific requirements and defaults
 */
export const MODEL_REQUIREMENTS: Record<ElevenLabsModelId, ModelRequirements> = {
  'eleven_v3': {
    supportedVoiceSettings: ['stability', 'similarity_boost', 'style', 'speed'],
    requiredSettings: ['stability', 'similarity_boost'],
    defaultSettings: {
      stability: 0.5,              // v3 only supports: 0.0, 0.5, 1.0
      similarity_boost: 0.75,
      style: 0.4,                  // Expressive speech (v3 feature)
      speed: 1.0
    },
    notes: 'Latest stable model. Best for expressive story narration. Supports 70+ languages. Not for real-time use.'
  },
  'eleven_multilingual_v2': {
    supportedVoiceSettings: ['stability', 'similarity_boost', 'use_speaker_boost', 'speed'],
    requiredSettings: ['stability', 'similarity_boost'],
    defaultSettings: {
      stability: 0.5,              // Valid: 0.0-1.0 (any value)
      similarity_boost: 0.75,
      use_speaker_boost: true,
      speed: 1.0
    },
    notes: 'Stable fallback model. Consistent quality, good for narration.'
  },
  'eleven_v3_alpha': {
    supportedVoiceSettings: ['stability', 'similarity_boost', 'style', 'speed'],
    requiredSettings: ['stability', 'similarity_boost'],
    defaultSettings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.4,
      speed: 1.0
    },
    notes: 'Alpha version - use with caution. May have breaking changes.'
  },
  'eleven_turbo_v2_5': {
    supportedVoiceSettings: ['stability', 'similarity_boost', 'use_speaker_boost', 'speed'],
    requiredSettings: ['stability', 'similarity_boost'],
    defaultSettings: {
      stability: 0.7,
      similarity_boost: 0.7,
      use_speaker_boost: true,
      speed: 1.0
    },
    notes: 'High quality, low latency (~250-300ms). Good for quick responses.'
  },
  'eleven_flash_v2_5': {
    supportedVoiceSettings: ['stability', 'similarity_boost', 'use_speaker_boost', 'speed'],
    requiredSettings: ['stability', 'similarity_boost'],
    defaultSettings: {
      stability: 0.7,
      similarity_boost: 0.7,
      use_speaker_boost: true,
      speed: 1.0
    },
    notes: 'Fast, affordable (~75ms). Best for real-time conversations.'
  },
  'eleven_monolingual_v1': {
    supportedVoiceSettings: ['stability', 'similarity_boost', 'use_speaker_boost', 'speed'],
    requiredSettings: ['stability', 'similarity_boost'],
    defaultSettings: {
      stability: 0.7,
      similarity_boost: 0.7,
      use_speaker_boost: true,
      speed: 1.0
    },
    notes: 'Legacy model - deprecated. Use eleven_v3 or eleven_multilingual_v2 instead.'
  },
  'music_v1': {
    supportedVoiceSettings: ['stability', 'similarity_boost'],
    requiredSettings: ['stability', 'similarity_boost'],
    defaultSettings: {
      stability: 0.5,
      similarity_boost: 0.75
    },
    notes: 'Specialized for music generation. Different API endpoint.'
  }
};

/**
 * Use case to model mapping
 */
export type ElevenLabsUseCase =
  | 'story_narration'      // Full story narration (highest quality)
  | 'multi_character'       // Multi-character dialogue
  | 'realtime_conversation' // Real-time Frankie responses
  | 'quick_response'        // Quick confirmations
  | 'background_music';     // Background music generation

/**
 * Centralized model configuration
 * 
 * Environment variables allow easy upgrades without code changes:
 * - ELEVENLABS_MODEL_STORY_NARRATION
 * - ELEVENLABS_MODEL_MULTI_CHARACTER
 * - ELEVENLABS_MODEL_REALTIME
 * - ELEVENLABS_MODEL_MUSIC
 */
export const ELEVENLABS_MODEL_CONFIG: Record<ElevenLabsUseCase, ElevenLabsModelId> = {
  'story_narration': (process.env.ELEVENLABS_MODEL_STORY_NARRATION as ElevenLabsModelId) || 'eleven_v3',
  'multi_character': (process.env.ELEVENLABS_MODEL_MULTI_CHARACTER as ElevenLabsModelId) || 'eleven_v3',
  'realtime_conversation': (process.env.ELEVENLABS_MODEL_REALTIME as ElevenLabsModelId) || 'eleven_flash_v2_5',
  'quick_response': (process.env.ELEVENLABS_MODEL_QUICK as ElevenLabsModelId) || 'eleven_turbo_v2_5',
  'background_music': (process.env.ELEVENLABS_MODEL_MUSIC as ElevenLabsModelId) || 'music_v1'
};

/**
 * Get model ID for a specific use case
 */
export function getModelForUseCase(useCase: ElevenLabsUseCase): ElevenLabsModelId {
  return ELEVENLABS_MODEL_CONFIG[useCase];
}

/**
 * Get voice settings for a model, with validation
 */
export function getVoiceSettingsForModel(
  modelId: ElevenLabsModelId,
  overrides?: Partial<ElevenLabsVoiceSettings>
): ElevenLabsVoiceSettings {
  const requirements = MODEL_REQUIREMENTS[modelId];
  if (!requirements) {
    throw new Error(`Unknown ElevenLabs model: ${modelId}`);
  }

  // Start with defaults
  const settings: ElevenLabsVoiceSettings = { ...requirements.defaultSettings };

  // Apply overrides
  if (overrides) {
    Object.assign(settings, overrides);
  }

  // Validate stability for v3 models (only 0.0, 0.5, 1.0 allowed)
  if (modelId === 'eleven_v3' || modelId === 'eleven_v3_alpha') {
    if (settings.stability !== 0.0 && settings.stability !== 0.5 && settings.stability !== 1.0) {
      console.warn(`⚠️  eleven_v3 only supports stability values: 0.0, 0.5, 1.0. Rounding ${settings.stability} to 0.5`);
      settings.stability = 0.5;
    }
  }

  // Remove unsupported settings
  const supported = requirements.supportedVoiceSettings;
  const cleaned: ElevenLabsVoiceSettings = {
    stability: settings.stability,
    similarity_boost: settings.similarity_boost
  };

  if (supported.includes('style') && settings.style !== undefined) {
    cleaned.style = settings.style;
  }
  if (supported.includes('use_speaker_boost') && settings.use_speaker_boost !== undefined) {
    cleaned.use_speaker_boost = settings.use_speaker_boost;
  }
  if (supported.includes('speed') && settings.speed !== undefined) {
    cleaned.speed = settings.speed;
  }

  return cleaned;
}

/**
 * Validate voice settings for a model
 */
export function validateVoiceSettings(
  modelId: ElevenLabsModelId,
  settings: ElevenLabsVoiceSettings
): { valid: boolean; errors: string[] } {
  const requirements = MODEL_REQUIREMENTS[modelId];
  if (!requirements) {
    return { valid: false, errors: [`Unknown model: ${modelId}`] };
  }

  const errors: string[] = [];

  // Check required settings
  for (const required of requirements.requiredSettings) {
    if (settings[required as keyof ElevenLabsVoiceSettings] === undefined) {
      errors.push(`Missing required setting: ${required}`);
    }
  }

  // Validate stability for v3 models
  if ((modelId === 'eleven_v3' || modelId === 'eleven_v3_alpha') && settings.stability !== undefined) {
    if (settings.stability !== 0.0 && settings.stability !== 0.5 && settings.stability !== 1.0) {
      errors.push(`eleven_v3 only supports stability: 0.0, 0.5, 1.0 (got ${settings.stability})`);
    }
  }

  // Check for unsupported settings
  const supported = requirements.supportedVoiceSettings;
  for (const key in settings) {
    if (!supported.includes(key) && key !== 'use_speaker_boost') {
      errors.push(`Setting '${key}' not supported by ${modelId}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get model requirements documentation
 */
export function getModelInfo(modelId: ElevenLabsModelId): ModelRequirements | null {
  return MODEL_REQUIREMENTS[modelId] || null;
}

/**
 * Convenience exports
 */
export const DEFAULT_STORY_NARRATION_MODEL = ELEVENLABS_MODEL_CONFIG.story_narration;
export const DEFAULT_MULTI_CHARACTER_MODEL = ELEVENLABS_MODEL_CONFIG.multi_character;
export const DEFAULT_REALTIME_MODEL = ELEVENLABS_MODEL_CONFIG.realtime_conversation;
export const DEFAULT_MUSIC_MODEL = ELEVENLABS_MODEL_CONFIG.background_music;
