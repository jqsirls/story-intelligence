/**
 * Modality Engine
 * Intelligently selects and manages the optimal modality for each user session
 * Supports: Video+Audio+Text, Audio-Only, Video-Only
 */

export type ModalityMode = 'video-audio-text' | 'audio-only' | 'video-only';

export interface ModalityContext {
  userAge?: number;
  timeOfDay?: number;  // 0-23
  device?: 'desktop' | 'mobile' | 'tablet';
  scenario?: 'bedtime' | 'learning' | 'car' | 'entertainment';
  userPreference?: ModalityMode;
}

export interface ModalityFeatures {
  showAvatar: boolean;
  showText: boolean;
  playAudio: boolean;
  showIllustrations: boolean;
  enableWebVTT: boolean;
}

export class ModalityEngine {
  private currentMode: ModalityMode;

  constructor(initialMode: ModalityMode = 'video-audio-text') {
    this.currentMode = initialMode;
  }

  /**
   * Select optimal modality based on context
   */
  selectOptimalModality(context: ModalityContext): ModalityMode {
    // User preference always wins
    if (context.userPreference) {
      return context.userPreference;
    }

    // Time-based detection
    if (context.timeOfDay !== undefined && context.timeOfDay >= 20) {
      return 'audio-only';  // After 8pm = bedtime
    }

    if (context.scenario === 'bedtime') {
      return 'audio-only';
    }

    // Age-based detection
    if (context.userAge !== undefined && context.userAge < 5) {
      return 'video-only';  // Young kids just watch Frankie
    }

    // Scenario-based detection
    if (context.scenario === 'car') {
      return 'audio-only';  // Eyes on road, hands on wheel
    }

    if (context.scenario === 'learning') {
      return 'video-audio-text';  // Full reading experience
    }

    // Device-based hints
    if (context.device === 'mobile' && context.scenario === 'entertainment') {
      return 'video-only';  // Mobile video watching
    }

    // Default: full experience
    return 'video-audio-text';
  }

  /**
   * Get features enabled for a specific modality
   */
  getFeatures(mode: ModalityMode): ModalityFeatures {
    const featureMap: Record<ModalityMode, ModalityFeatures> = {
      'video-audio-text': {
        showAvatar: true,
        showText: true,
        playAudio: true,
        showIllustrations: true,
        enableWebVTT: true
      },
      'audio-only': {
        showAvatar: false,
        showText: false,
        playAudio: true,
        showIllustrations: false,
        enableWebVTT: false
      },
      'video-only': {
        showAvatar: true,
        showText: false,
        playAudio: true,
        showIllustrations: false,
        enableWebVTT: false
      }
    };

    return featureMap[mode];
  }

  /**
   * Switch to a different modality
   */
  switchMode(newMode: ModalityMode): ModalityFeatures {
    this.currentMode = newMode;
    return this.getFeatures(newMode);
  }

  /**
   * Get current modality mode
   */
  getCurrentMode(): ModalityMode {
    return this.currentMode;
  }

  /**
   * Get current modality features
   */
  getCurrentFeatures(): ModalityFeatures {
    return this.getFeatures(this.currentMode);
  }

  /**
   * Detect device type from user agent
   */
  static detectDevice(): 'desktop' | 'mobile' | 'tablet' {
    const ua = navigator.userAgent.toLowerCase();
    
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    
    if (/mobile|android|iphone|ipod|phone/i.test(ua)) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  /**
   * Get current time of day (0-23)
   */
  static getTimeOfDay(): number {
    return new Date().getHours();
  }
}

