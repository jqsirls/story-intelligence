/**
 * Modality Adaptor
 * 
 * Adapts storytelling responses for different device capabilities.
 * Ensures perfect experience whether child has:
 * - Audio-only device
 * - Screen + audio device
 * - Accessibility needs (screen reader, captions, haptics)
 * 
 * Core Principle: Every child gets optimal experience for their device
 */

import { DeviceCapabilities } from './DeviceCapabilityDetector';

export interface BaseStoryResponse {
  message: string;
  speechText: string;
  visuals?: {
    images?: string[];
    characterImage?: string;
    sceneDescription?: string;
  };
  audio?: {
    narrativeUrl?: string;
    soundEffects?: string[];
    musicUrl?: string;
  };
  choices?: Array<{
    text: string;
    value: string;
  }>;
  liveAvatar?: {
    characterId?: string;
    avatarUrl?: string;
    expressions?: string[];
  };
  metadata?: any;
}

export interface AdaptedResponse extends BaseStoryResponse {
  // Audio-specific adaptations
  audioDescriptions?: string[]; // Rich descriptions for audio-only
  voiceCues?: string[]; // Navigation cues for audio interaction
  soundEffects?: string[]; // Enhanced audio for immersion
  
  // Visual-specific adaptations
  visualElements?: any[]; // Formatted for screen size
  captions?: string; // For hearing impaired
  alternativeText?: string[]; // For screen readers
  
  // Accessibility adaptations
  screenReaderText?: string; // Optimized for screen reader
  hapticPatterns?: any[]; // Haptic feedback cues
  simplifiedUI?: boolean; // Cognitive support mode
  
  // Avatar adaptations
  showAvatar: boolean; // Whether to render avatar
  avatarMode?: 'live' | 'static' | 'none';
  
  // Interaction adaptations
  inputMethod: 'voice' | 'touch' | 'keyboard' | 'mixed';
  outputPriority: 'audio' | 'visual' | 'balanced';
}

export class ModalityAdaptor {
  
  /**
   * Adapt response based on device capabilities
   * 
   * Returns optimized response for the specific device and user needs
   */
  adaptResponse(
    baseResponse: BaseStoryResponse,
    capabilities: DeviceCapabilities
  ): AdaptedResponse {
    
    // Start with base response
    let adapted: AdaptedResponse = {
      ...baseResponse,
      showAvatar: false,
      inputMethod: 'voice',
      outputPriority: 'audio'
    };

    // SCENARIO 1: Visually Impaired User (Screen Reader)
    if (capabilities.visuallyImpaired || capabilities.screenReaderActive) {
      adapted = this.adaptForScreenReader(baseResponse, capabilities);
    }
    
    // SCENARIO 2: Audio-Only Device (Alexa Echo, phone call)
    else if (!capabilities.hasScreen) {
      adapted = this.adaptForAudioOnly(baseResponse, capabilities);
    }
    
    // SCENARIO 3: Screen + Audio Device (Alexa Show, tablet, web)
    else if (capabilities.hasScreen && capabilities.hasAudio) {
      adapted = this.adaptForVisualAudio(baseResponse, capabilities);
    }
    
    // SCENARIO 4: Hearing Impaired (Captions needed)
    if (capabilities.hearingImpaired) {
      adapted = this.addCaptionsAndVisualCues(adapted, capabilities);
    }
    
    // SCENARIO 5: Motor Impaired (Voice/switch control)
    if (capabilities.motorImpaired || capabilities.switchControlActive) {
      adapted = this.adaptForAlternativeInput(adapted, capabilities);
    }
    
    // SCENARIO 6: Cognitive Support Needed
    if (capabilities.cognitiveSupport || capabilities.prefersSimplifiedUI) {
      adapted = this.simplifyInterface(adapted);
    }

    return adapted;
  }

  /**
   * Adapt for screen reader users
   * 
   * Audio-first but with rich descriptions for sighted family members
   */
  private adaptForScreenReader(
    response: BaseStoryResponse,
    capabilities: DeviceCapabilities
  ): AdaptedResponse {
    
    return {
      ...response,
      
      // Rich audio descriptions of visual elements
      audioDescriptions: this.generateAudioDescriptions(response.visuals),
      
      // Screen reader optimized text
      screenReaderText: this.formatForScreenReader(response.message),
      
      // Alternative text for all images
      alternativeText: this.generateAltText(response.visuals),
      
      // Haptic cues if available
      hapticPatterns: capabilities.hasHaptics ? this.generateHapticCues(response) : undefined,
      
      // Still show visuals for sighted family members
      visualElements: response.visuals as any,
      
      // Avatar: Static image with audio description
      showAvatar: !!response.liveAvatar,
      avatarMode: 'static', // No live animation for screen reader
      
      inputMethod: 'voice',
      outputPriority: 'audio'
    };
  }

  /**
   * Adapt for audio-only devices (Alexa Echo, phone calls)
   */
  private adaptForAudioOnly(
    response: BaseStoryResponse,
    capabilities: DeviceCapabilities
  ): AdaptedResponse {
    
    return {
      ...response,
      
      // NO visual elements
      visuals: undefined,
      visualElements: undefined,
      liveAvatar: undefined,
      
      // Enhanced audio with sound effects
      soundEffects: this.selectSoundEffects(response),
      audioDescriptions: this.generateRichAudioNarration(response),
      
      // Voice navigation cues
      voiceCues: this.generateVoiceNavigationCues(response.choices),
      
      // SSML if supported (Alexa)
      speechText: capabilities.supportsSSML 
        ? this.enhanceWithSSML(response.speechText)
        : response.speechText,
      
      showAvatar: false,
      avatarMode: 'none',
      
      inputMethod: 'voice',
      outputPriority: 'audio'
    };
  }

  /**
   * Adapt for visual + audio devices (optimal experience)
   */
  private adaptForVisualAudio(
    response: BaseStoryResponse,
    capabilities: DeviceCapabilities
  ): AdaptedResponse {
    
    return {
      ...response,
      
      // Format visuals for screen size
      visualElements: this.formatVisualsForScreen(
        response.visuals,
        capabilities.screenSize || 'medium'
      ),
      
      // Live avatar if available
      showAvatar: !!response.liveAvatar,
      avatarMode: capabilities.supportsVideo && capabilities.supportsAnimation
        ? 'live'  // Full live avatar with lip-sync
        : 'static', // Static image if can't do video
      
      // Enhanced audio with effects
      soundEffects: capabilities.supportsSoundEffects 
        ? this.selectSoundEffects(response)
        : undefined,
      
      // Captions available but not forced
      captions: this.generateCaptions(response.speechText),
      
      inputMethod: capabilities.hasTouch ? 'mixed' : 'voice',
      outputPriority: 'balanced'
    };
  }

  /**
   * Add captions and visual cues for hearing impaired users
   */
  private addCaptionsAndVisualCues(
    response: AdaptedResponse,
    capabilities: DeviceCapabilities
  ): AdaptedResponse {
    
    return {
      ...response,
      
      // Always show captions
      captions: this.generateDetailedCaptions(response.speechText),
      
      // Visual indicators for audio cues
      // e.g., "🔊 Whoosh!" for sound effect
      visualElements: this.addVisualAudioIndicators(response.visualElements),
      
      // Text-based choices instead of audio-only
      choices: response.choices?.map(choice => ({
        ...choice,
        visualProminent: true
      })),
      
      outputPriority: 'visual' // Prioritize visual over audio
    };
  }

  /**
   * Adapt for motor impairment (voice/switch control)
   */
  private adaptForAlternativeInput(
    response: AdaptedResponse,
    capabilities: DeviceCapabilities
  ): AdaptedResponse {
    
    return {
      ...response,
      
      // Large touch targets if touch available
      // Voice commands prominently suggested
      // Switch-scanning compatible UI
      
      inputMethod: capabilities.voiceControlActive 
        ? 'voice'
        : capabilities.switchControlActive
          ? 'keyboard' // Switch control uses keyboard events
          : 'mixed',
      
      metadata: {
        ...response.metadata,
        largeTargets: true,
        voiceCommandsAvailable: true,
        switchScanningEnabled: capabilities.switchControlActive
      }
    };
  }

  /**
   * Simplify interface for cognitive support
   */
  private simplifyInterface(response: AdaptedResponse): AdaptedResponse {
    return {
      ...response,
      
      // Limit choices (2-3 max instead of 5+)
      choices: response.choices?.slice(0, 3),
      
      // Simpler language
      message: this.simplifyLanguage(response.message),
      
      // Fewer visual elements (reduce cognitive load)
      visualElements: this.limitVisualComplexity(response.visualElements),
      
      simplifiedUI: true,
      
      metadata: {
        ...response.metadata,
        cognitiveSupport: true,
        reducedComplexity: true
      }
    };
  }

  // Helper Methods

  private generateAudioDescriptions(visuals?: any): string[] {
    if (!visuals) return [];
    
    // TODO: Generate rich audio descriptions of visual elements
    // For now: Placeholder
    return ['A beautiful scene with vibrant colors'];
  }

  private formatForScreenReader(text: string): string {
    // Remove emojis, format for speech
    return text.replace(/[^\w\s.,!?'-]/g, '');
  }

  private generateAltText(visuals?: any): string[] {
    if (!visuals?.images) return [];
    
    // TODO: Generate descriptive alt text for each image
    return visuals.images.map((img: string, i: number) => 
      `Story illustration ${i + 1}: Character in adventure scene`
    );
  }

  private generateHapticCues(response: BaseStoryResponse): any[] {
    // TODO: Map emotional moments to haptic patterns
    // e.g., Exciting moment = quick tap pattern
    //       Calm moment = gentle pulse
    //       Magical moment = sparkle pattern
    return [];
  }

  private generateRichAudioNarration(response: BaseStoryResponse): string[] {
    // For audio-only: Describe visual scenes richly
    return [
      `In a ${response.visuals?.sceneDescription || 'magical place'}...`
    ];
  }

  private selectSoundEffects(response: BaseStoryResponse): string[] {
    // TODO: Select appropriate sound effects based on story content
    // e.g., Adventure = whooshes, magical = sparkles, bedtime = gentle music
    return [];
  }

  private generateVoiceNavigationCues(choices?: any[]): string[] {
    if (!choices) return [];
    
    return choices.map((choice, i) => 
      `To choose option ${i + 1}, say "${choice.text}"`
    );
  }

  private enhanceWithSSML(text: string): string {
    // Add SSML tags for Alexa
    // - <prosody> for emphasis
    // - <break> for pauses
    // - <emphasis> for important words
    
    // For now: Return as-is (TODO: Implement SSML enhancement)
    return text;
  }

  private formatVisualsForScreen(visuals: any, screenSize: string): any {
    // Resize images, adjust layouts for screen size
    // TODO: Implement responsive visual formatting
    return visuals;
  }

  private generateCaptions(speechText: string): string {
    // Generate synchronized captions
    // TODO: Implement WebVTT or similar format
    return speechText;
  }

  private generateDetailedCaptions(speechText: string): string {
    // More detailed captions including sound effects
    // e.g., "[Magical sparkle sound] The dragon appeared!"
    return speechText; // TODO: Enhance with sound effect descriptions
  }

  private addVisualAudioIndicators(visuals: any): any {
    // Add visual indicators for sound effects
    // e.g., Show "🔊" icon when sound plays
    return visuals || {};
  }

  private simplifyLanguage(text: string): string {
    // Simplify to shorter sentences, simpler vocabulary
    // TODO: Implement language simplification
    return text;
  }

  private limitVisualComplexity(visuals: any): any {
    // Reduce number of visual elements for cognitive support
    // TODO: Implement visual simplification
    return visuals;
  }
}

