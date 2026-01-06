export type ElevenLabsModel = 
  | 'eleven_v3_alpha'           // Most emotionally rich, expressive
  | 'eleven_monolingual_v1'     // Legacy model
  | 'eleven_turbo_v2_5'         // High quality, low latency (~250-300ms)
  | 'eleven_flash_v2_5'         // Fast, affordable (~75ms)
  | 'eleven_multilingual_v2';   // Lifelike, consistent quality

export type VoiceUseCase = 
  | 'realtime_conversation'     // Real-time Frankie responses
  | 'quick_response'            // Quick confirmations
  | 'story_narration'           // Full story narration
  | 'multi_character'           // Multi-character dialogue
  | 'background_ambient';        // Background music/ambient

export interface VoiceSettings {
  stability: number;              // 0-1, higher = more consistent
  similarity_boost: number;      // 0-1, higher = more similar to original
  use_speaker_boost: boolean;    // Enhances clarity
  style: number;                 // 0-1, higher = more expressive
  speed: number;                 // 0.25-4.0, speaking rate
}

export interface VoiceConfiguration {
  frankieVoiceId: string;
  defaultVoiceId: string;
  modelSelection: Record<VoiceUseCase, ElevenLabsModel>;
  defaultVoiceSettings: VoiceSettings;
  frankieVoiceSettings: VoiceSettings;
  characterVoiceSettings: Record<string, VoiceSettings>;
}

export const VOICE_CONFIGURATION: VoiceConfiguration = {
  frankieVoiceId: 'kQJQj1e9P2YDvAdvp2BW', // Frankie's voice ID
  defaultVoiceId: 'EXAVITQu4vr4xnSDxMaL',   // Default character voice
  
  modelSelection: {
    'realtime_conversation': 'eleven_flash_v2_5',      // ~75ms, 50% cheaper
    'quick_response': 'eleven_turbo_v2_5',             // ~250ms, 50% cheaper
    'story_narration': 'eleven_v3_alpha',              // ~500ms, highest quality
    'multi_character': 'eleven_v3_alpha',              // ~500ms, best expressiveness
    'background_ambient': 'eleven_turbo_v2_5'          // ~250ms, good quality
  },

  defaultVoiceSettings: {
    stability: 0.7,
    similarity_boost: 0.7,
    use_speaker_boost: true,
    style: 0.4,
    speed: 1.0
  },

  frankieVoiceSettings: {
    stability: 0.75,
    similarity_boost: 0.75,
    use_speaker_boost: true,
    style: 0.5,
    speed: 1.0
  },

  characterVoiceSettings: {
    // Magical characters
    'star': {
      stability: 0.8,
      similarity_boost: 0.6,
      use_speaker_boost: true,
      style: 0.7,
      speed: 0.9
    },
    'fairy': {
      stability: 0.7,
      similarity_boost: 0.8,
      use_speaker_boost: true,
      style: 0.6,
      speed: 1.1
    },
    'wizard': {
      stability: 0.9,
      similarity_boost: 0.7,
      use_speaker_boost: true,
      style: 0.3,
      speed: 0.8
    },
    'dragon': {
      stability: 0.8,
      similarity_boost: 0.6,
      use_speaker_boost: true,
      style: 0.2,
      speed: 0.7
    },
    // Animal characters
    'rabbit': {
      stability: 0.6,
      similarity_boost: 0.8,
      use_speaker_boost: true,
      style: 0.8,
      speed: 1.2
    },
    'owl': {
      stability: 0.9,
      similarity_boost: 0.7,
      use_speaker_boost: true,
      style: 0.2,
      speed: 0.8
    },
    // Human characters
    'child': {
      stability: 0.6,
      similarity_boost: 0.8,
      use_speaker_boost: true,
      style: 0.7,
      speed: 1.1
    },
    'parent': {
      stability: 0.8,
      similarity_boost: 0.7,
      use_speaker_boost: true,
      style: 0.3,
      speed: 0.9
    }
  }
};

export function selectModel(useCase: VoiceUseCase): ElevenLabsModel {
  return VOICE_CONFIGURATION.modelSelection[useCase] || 'eleven_turbo_v2_5';
}

export function getVoiceSettings(characterType: string, useCase: VoiceUseCase): VoiceSettings {
  // Get base settings based on use case
  let baseSettings: VoiceSettings;
  
  switch (useCase) {
    case 'realtime_conversation':
      baseSettings = VOICE_CONFIGURATION.frankieVoiceSettings;
      break;
    case 'story_narration':
      baseSettings = VOICE_CONFIGURATION.defaultVoiceSettings;
      break;
    case 'multi_character':
      baseSettings = VOICE_CONFIGURATION.characterVoiceSettings[characterType.toLowerCase()] || 
                    VOICE_CONFIGURATION.defaultVoiceSettings;
      break;
    default:
      baseSettings = VOICE_CONFIGURATION.defaultVoiceSettings;
  }

  return baseSettings;
}

export function getVoiceId(characterType: string, useCase: VoiceUseCase): string {
  switch (useCase) {
    case 'realtime_conversation':
      return VOICE_CONFIGURATION.frankieVoiceId;
    case 'story_narration':
      return VOICE_CONFIGURATION.defaultVoiceId;
    case 'multi_character':
      // Character-specific voice mapping
      const characterVoiceMap: Record<string, string> = {
        'frankie': VOICE_CONFIGURATION.frankieVoiceId,
        'star': 'pNInz6obpgDQGcFmaJgB',
        'fairy': 'pNInz6obpgDQGcFmaJgB',
        'wizard': 'VR6AewLTigWG4xSOukaG',
        'dragon': 'VR6AewLTigWG4xSOukaG',
        'rabbit': 'EXAVITQu4vr4xnSDxMaL',
        'owl': 'VR6AewLTigWG4xSOukaG',
        'child': 'EXAVITQu4vr4xnSDxMaL',
        'parent': 'VR6AewLTigWG4xSOukaG'
      };
      
      return characterVoiceMap[characterType.toLowerCase()] || VOICE_CONFIGURATION.defaultVoiceId;
    default:
      return VOICE_CONFIGURATION.defaultVoiceId;
  }
}

export function validateVoiceSettings(settings: VoiceSettings): boolean {
  return (
    settings.stability >= 0 && settings.stability <= 1 &&
    settings.similarity_boost >= 0 && settings.similarity_boost <= 1 &&
    settings.style >= 0 && settings.style <= 1 &&
    settings.speed >= 0.25 && settings.speed <= 4.0 &&
    typeof settings.use_speaker_boost === 'boolean'
  );
}

export function getOptimizedVoiceSettings(storyType: string, emotion?: string): VoiceSettings {
  const baseSettings = VOICE_CONFIGURATION.defaultVoiceSettings;
  
  // Adjust based on story type
  let adjustedSettings = { ...baseSettings };
  
  switch (storyType.toLowerCase()) {
    case 'adventure':
      adjustedSettings.style = 0.6;
      adjustedSettings.speed = 1.1;
      break;
    case 'bedtime':
      adjustedSettings.style = 0.2;
      adjustedSettings.speed = 0.8;
      adjustedSettings.stability = 0.8;
      break;
    case 'mystery':
      adjustedSettings.style = 0.3;
      adjustedSettings.speed = 0.9;
      break;
    case 'fantasy':
      adjustedSettings.style = 0.7;
      adjustedSettings.speed = 1.0;
      break;
    case 'scary':
      adjustedSettings.style = 0.4;
      adjustedSettings.speed = 0.8;
      adjustedSettings.stability = 0.9;
      break;
  }
  
  // Adjust based on emotion
  if (emotion) {
    switch (emotion.toLowerCase()) {
      case 'excited':
        adjustedSettings.style = Math.min(adjustedSettings.style + 0.2, 1.0);
        adjustedSettings.speed = Math.min(adjustedSettings.speed + 0.2, 4.0);
        break;
      case 'calm':
        adjustedSettings.style = Math.max(adjustedSettings.style - 0.2, 0.0);
        adjustedSettings.speed = Math.max(adjustedSettings.speed - 0.2, 0.25);
        break;
      case 'mysterious':
        adjustedSettings.style = Math.max(adjustedSettings.style - 0.1, 0.0);
        adjustedSettings.speed = Math.max(adjustedSettings.speed - 0.1, 0.25);
        break;
    }
  }
  
  return adjustedSettings;
}

export function getStreamingOptimization(useCase: VoiceUseCase): number {
  // ElevenLabs streaming optimization levels
  // 0 = No optimization
  // 1 = Some optimization
  // 2 = More optimization
  // 3 = Maximum optimization
  // 4 = Maximum optimization with minimal latency
  
  switch (useCase) {
    case 'realtime_conversation':
      return 4; // Maximum optimization for real-time
    case 'quick_response':
      return 3; // High optimization for quick responses
    case 'story_narration':
      return 1; // Minimal optimization for quality
    case 'multi_character':
      return 2; // Balanced optimization
    case 'background_ambient':
      return 0; // No optimization needed
    default:
      return 2;
  }
}
