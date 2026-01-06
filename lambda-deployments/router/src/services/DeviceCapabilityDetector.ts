/**
 * Device Capability Detector
 * 
 * Detects device capabilities to adapt storytelling experience.
 * Ensures perfect experience on:
 * - Audio-only devices (Alexa Echo, phone calls)
 * - Visual+audio devices (Echo Show, tablets, web browsers)
 * - Accessible devices (screen readers, braille displays, switch controls)
 * 
 * Design Principle: Every device gets optimized experience, zero capability assumptions
 */

export interface DeviceCapabilities {
  // Core Capabilities
  hasScreen: boolean;
  hasAudio: boolean;
  hasTouch: boolean;
  hasKeyboard: boolean;
  hasCamera: boolean;
  
  // Screen Details
  screenSize?: 'small' | 'medium' | 'large' | 'extra-large';
  screenResolution?: { width: number; height: number };
  supportsVideo: boolean;
  supportsAnimation: boolean;
  
  // Audio Details
  audioChannels: 'mono' | 'stereo' | 'surround';
  supportsSSML: boolean;
  supportsSoundEffects: boolean;
  
  // Accessibility Features
  visuallyImpaired: boolean;
  hearingImpaired: boolean;
  motorImpaired: boolean;
  cognitiveSupport: boolean;
  
  // Assistive Technology
  screenReaderActive: boolean;
  brailleDisplayConnected: boolean;
  switchControlActive: boolean;
  voiceControlActive: boolean;
  
  // Advanced Features
  hasHaptics: boolean;
  supportsAR: boolean;
  supportsVR: boolean;
  supports3D: boolean;
  
  // Platform & Context
  platform: 'alexa' | 'google' | 'apple' | 'web' | 'mobile' | 'iot' | 'unknown';
  deviceType: 'smart-speaker' | 'smart-display' | 'phone' | 'tablet' | 'computer' | 'wearable' | 'unknown';
  networkSpeed: 'slow' | 'medium' | 'fast';
  
  // User Preferences (from profile or detection)
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  prefersLargeText: boolean;
  prefersSimplifiedUI: boolean;
}

export class DeviceCapabilityDetector {
  
  /**
   * Detect device capabilities from request context
   * 
   * Sources:
   * - User-Agent header
   * - Alexa context object
   * - Explicit device hints in request
   * - User profile preferences
   */
  detectCapabilities(requestContext: any): DeviceCapabilities {
    
    // Extract platform from context
    const platform = this.detectPlatform(requestContext);
    
    // Platform-specific capability detection
    switch (platform) {
      case 'alexa':
        return this.detectAlexaCapabilities(requestContext);
      case 'google':
        return this.detectGoogleCapabilities(requestContext);
      case 'apple':
        return this.detectAppleCapabilities(requestContext);
      case 'web':
        return this.detectWebCapabilities(requestContext);
      case 'mobile':
        return this.detectMobileCapabilities(requestContext);
      default:
        return this.getDefaultCapabilities();
    }
  }

  /**
   * Detect platform from request context
   */
  private detectPlatform(requestContext: any): DeviceCapabilities['platform'] {
    // Check explicit platform hint
    if (requestContext.platform) {
      return requestContext.platform;
    }
    
    // Check Alexa-specific context
    if (requestContext.System?.device || requestContext.context?.System) {
      return 'alexa';
    }
    
    // Check user agent
    const userAgent = (requestContext.headers?.['user-agent'] || '').toLowerCase();
    
    if (userAgent.includes('alexa')) return 'alexa';
    if (userAgent.includes('google')) return 'google';
    if (userAgent.includes('siri') || userAgent.includes('apple')) return 'apple';
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('ios')) return 'mobile';
    if (userAgent.includes('mozilla') || userAgent.includes('chrome') || userAgent.includes('safari')) return 'web';
    
    return 'unknown';
  }

  /**
   * Detect Alexa device capabilities
   */
  private detectAlexaCapabilities(context: any): DeviceCapabilities {
    const supportedInterfaces = context.System?.device?.supportedInterfaces || 
                                context.context?.System?.device?.supportedInterfaces || {};
    
    const hasScreen = !!supportedInterfaces.Display || !!supportedInterfaces['Alexa.Presentation.APL'];
    const hasVideo = !!supportedInterfaces.VideoApp;
    
    return {
      hasScreen,
      hasAudio: true, // Alexa always has audio
      hasTouch: hasScreen, // Displays have touch
      hasKeyboard: false,
      hasCamera: false,
      
      screenSize: hasScreen ? this.detectAlexaScreenSize(context) : undefined,
      supportsVideo: hasVideo,
      supportsAnimation: hasScreen,
      
      audioChannels: 'stereo',
      supportsSSML: true, // Alexa supports SSML
      supportsSoundEffects: true,
      
      // Accessibility (would need explicit hints or profile)
      visuallyImpaired: false, // TODO: Detect from voice commands or profile
      hearingImpaired: false,
      motorImpaired: false,
      cognitiveSupport: false,
      
      screenReaderActive: false,
      brailleDisplayConnected: false,
      switchControlActive: false,
      voiceControlActive: true, // Alexa is voice-controlled
      
      hasHaptics: false,
      supportsAR: false,
      supportsVR: false,
      supports3D: false,
      
      platform: 'alexa',
      deviceType: hasScreen ? 'smart-display' : 'smart-speaker',
      networkSpeed: 'fast', // Assume good connection for Alexa
      
      prefersReducedMotion: false,
      prefersHighContrast: false,
      prefersLargeText: false,
      prefersSimplifiedUI: false
    };
  }

  /**
   * Detect Alexa screen size from device type
   */
  private detectAlexaScreenSize(context: any): 'small' | 'medium' | 'large' {
    // Echo Show 5 = small, Show 8 = medium, Show 10/15 = large
    // For now: Assume medium if has screen
    return 'medium';
  }

  /**
   * Detect web browser capabilities
   */
  private detectWebCapabilities(context: any): DeviceCapabilities {
    const metadata = context.metadata || context.deviceHints || {};
    
    return {
      hasScreen: true,
      hasAudio: true,
      hasTouch: metadata.isTouchDevice || false,
      hasKeyboard: true,
      hasCamera: metadata.hasCamera || false,
      
      screenSize: this.detectScreenSize(metadata.screenWidth),
      screenResolution: metadata.screenResolution,
      supportsVideo: true,
      supportsAnimation: true,
      
      audioChannels: 'stereo',
      supportsSSML: false, // Web uses direct audio
      supportsSoundEffects: true,
      
      // Accessibility detection from browser APIs
      visuallyImpaired: metadata.visuallyImpaired || false,
      hearingImpaired: metadata.hearingImpaired || false,
      motorImpaired: metadata.motorImpaired || false,
      cognitiveSupport: metadata.cognitiveSupport || false,
      
      screenReaderActive: metadata.screenReader || false,
      brailleDisplayConnected: metadata.brailleDisplay || false,
      switchControlActive: metadata.switchControl || false,
      voiceControlActive: metadata.voiceControl || false,
      
      hasHaptics: metadata.hasHaptics || false,
      supportsAR: metadata.supportsAR || false,
      supportsVR: metadata.supportsVR || false,
      supports3D: false,
      
      platform: 'web',
      deviceType: metadata.isMobile ? 'phone' : metadata.isTablet ? 'tablet' : 'computer',
      networkSpeed: metadata.networkSpeed || 'medium',
      
      // Accessibility preferences (from browser or profile)
      prefersReducedMotion: metadata.prefersReducedMotion || false,
      prefersHighContrast: metadata.prefersHighContrast || false,
      prefersLargeText: metadata.prefersLargeText || false,
      prefersSimplifiedUI: metadata.prefersSimplifiedUI || false
    };
  }

  /**
   * Detect mobile app capabilities
   */
  private detectMobileCapabilities(context: any): DeviceCapabilities {
    const metadata = context.metadata || {};
    
    return {
      hasScreen: true,
      hasAudio: true,
      hasTouch: true,
      hasKeyboard: metadata.hasKeyboard || false,
      hasCamera: true,
      
      screenSize: metadata.screenSize || 'medium',
      screenResolution: metadata.screenResolution,
      supportsVideo: true,
      supportsAnimation: true,
      
      audioChannels: 'stereo',
      supportsSSML: false,
      supportsSoundEffects: true,
      
      visuallyImpaired: metadata.visuallyImpaired || false,
      hearingImpaired: metadata.hearingImpaired || false,
      motorImpaired: metadata.motorImpaired || false,
      cognitiveSupport: metadata.cognitiveSupport || false,
      
      screenReaderActive: metadata.screenReaderActive || false,
      brailleDisplayConnected: false,
      switchControlActive: metadata.switchControlActive || false,
      voiceControlActive: metadata.voiceControlActive || false,
      
      hasHaptics: true, // Most mobile devices have haptics
      supportsAR: metadata.supportsAR || false,
      supportsVR: false,
      supports3D: false,
      
      platform: 'mobile',
      deviceType: metadata.isTablet ? 'tablet' : 'phone',
      networkSpeed: metadata.networkSpeed || 'medium',
      
      prefersReducedMotion: metadata.prefersReducedMotion || false,
      prefersHighContrast: metadata.prefersHighContrast || false,
      prefersLargeText: metadata.prefersLargeText || false,
      prefersSimplifiedUI: metadata.prefersSimplifiedUI || false
    };
  }

  /**
   * Detect Google Assistant capabilities
   */
  private detectGoogleCapabilities(context: any): DeviceCapabilities {
    // Similar to Alexa but Google-specific
    const hasScreen = !!(context.capabilities?.SCREEN_OUTPUT || context.surface?.capabilities?.hasScreen);
    
    return {
      hasScreen,
      hasAudio: true,
      hasTouch: hasScreen,
      hasKeyboard: false,
      hasCamera: false,
      
      screenSize: hasScreen ? 'medium' : undefined,
      supportsVideo: hasScreen,
      supportsAnimation: hasScreen,
      
      audioChannels: 'stereo',
      supportsSSML: true,
      supportsSoundEffects: true,
      
      visuallyImpaired: false,
      hearingImpaired: false,
      motorImpaired: false,
      cognitiveSupport: false,
      
      screenReaderActive: false,
      brailleDisplayConnected: false,
      switchControlActive: false,
      voiceControlActive: true,
      
      hasHaptics: false,
      supportsAR: false,
      supportsVR: false,
      supports3D: false,
      
      platform: 'google',
      deviceType: hasScreen ? 'smart-display' : 'smart-speaker',
      networkSpeed: 'fast',
      
      prefersReducedMotion: false,
      prefersHighContrast: false,
      prefersLargeText: false,
      prefersSimplifiedUI: false
    };
  }

  /**
   * Detect Apple/Siri capabilities
   */
  private detectAppleCapabilities(context: any): DeviceCapabilities {
    // Apple HomePod, iOS Siri, etc.
    const hasScreen = context.metadata?.hasScreen || false;
    
    return {
      hasScreen,
      hasAudio: true,
      hasTouch: hasScreen,
      hasKeyboard: hasScreen,
      hasCamera: hasScreen,
      
      screenSize: hasScreen ? 'medium' : undefined,
      supportsVideo: hasScreen,
      supportsAnimation: hasScreen,
      
      audioChannels: 'stereo',
      supportsSSML: false, // Siri uses direct audio
      supportsSoundEffects: true,
      
      visuallyImpaired: context.metadata?.visuallyImpaired || false,
      hearingImpaired: context.metadata?.hearingImpaired || false,
      motorImpaired: context.metadata?.motorImpaired || false,
      cognitiveSupport: false,
      
      screenReaderActive: context.metadata?.voiceOverActive || false,
      brailleDisplayConnected: false,
      switchControlActive: context.metadata?.switchControlActive || false,
      voiceControlActive: true,
      
      hasHaptics: hasScreen, // iOS devices have haptics
      supportsAR: hasScreen, // iOS has ARKit
      supportsVR: false,
      supports3D: false,
      
      platform: 'apple',
      deviceType: hasScreen ? 'phone' : 'smart-speaker',
      networkSpeed: 'fast',
      
      prefersReducedMotion: context.metadata?.prefersReducedMotion || false,
      prefersHighContrast: context.metadata?.prefersHighContrast || false,
      prefersLargeText: context.metadata?.prefersLargeText || false,
      prefersSimplifiedUI: false
    };
  }

  /**
   * Detect screen size from width
   */
  private detectScreenSize(width?: number): 'small' | 'medium' | 'large' | 'extra-large' {
    if (!width) return 'medium';
    
    if (width < 768) return 'small';      // Phone
    if (width < 1024) return 'medium';    // Tablet
    if (width < 1920) return 'large';     // Laptop
    return 'extra-large';                 // Desktop/TV
  }

  /**
   * Get default/fallback capabilities when detection fails
   */
  private getDefaultCapabilities(): DeviceCapabilities {
    return {
      hasScreen: true, // Assume screen for safety
      hasAudio: true,
      hasTouch: false,
      hasKeyboard: true,
      hasCamera: false,
      
      screenSize: 'medium',
      supportsVideo: true,
      supportsAnimation: true,
      
      audioChannels: 'stereo',
      supportsSSML: false,
      supportsSoundEffects: true,
      
      visuallyImpaired: false,
      hearingImpaired: false,
      motorImpaired: false,
      cognitiveSupport: false,
      
      screenReaderActive: false,
      brailleDisplayConnected: false,
      switchControlActive: false,
      voiceControlActive: false,
      
      hasHaptics: false,
      supportsAR: false,
      supportsVR: false,
      supports3D: false,
      
      platform: 'web',
      deviceType: 'computer',
      networkSpeed: 'medium',
      
      prefersReducedMotion: false,
      prefersHighContrast: false,
      prefersLargeText: false,
      prefersSimplifiedUI: false
    };
  }

  /**
   * Validate capabilities make sense (sanity check)
   */
  validateCapabilities(capabilities: DeviceCapabilities): boolean {
    // Can't have screen without being able to show visuals
    if (!capabilities.hasScreen && capabilities.supportsVideo) {
      return false;
    }
    
    // Must have SOME input method
    if (!capabilities.hasTouch && !capabilities.hasKeyboard && !capabilities.voiceControlActive) {
      return false;
    }
    
    // Must have SOME output method
    if (!capabilities.hasScreen && !capabilities.hasAudio) {
      return false;
    }
    
    return true;
  }

  /**
   * Merge user preferences with detected capabilities
   */
  mergeWithUserPreferences(
    detected: DeviceCapabilities,
    userProfile: any
  ): DeviceCapabilities {
    
    return {
      ...detected,
      
      // Override with explicit user preferences
      visuallyImpaired: userProfile.visuallyImpaired ?? detected.visuallyImpaired,
      hearingImpaired: userProfile.hearingImpaired ?? detected.hearingImpaired,
      motorImpaired: userProfile.motorImpaired ?? detected.motorImpaired,
      cognitiveSupport: userProfile.cognitiveSupport ?? detected.cognitiveSupport,
      
      // Accessibility preferences
      prefersReducedMotion: userProfile.prefersReducedMotion ?? detected.prefersReducedMotion,
      prefersHighContrast: userProfile.prefersHighContrast ?? detected.prefersHighContrast,
      prefersLargeText: userProfile.prefersLargeText ?? detected.prefersLargeText,
      prefersSimplifiedUI: userProfile.prefersSimplifiedUI ?? detected.prefersSimplifiedUI
    };
  }
}

