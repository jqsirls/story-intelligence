import { Logger } from 'winston';

/**
 * Mobile-specific optimizations for battery, network, and UX
 */
export class MobileOptimizations {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Optimize content for mobile delivery considering battery and network
   */
  optimizeForMobile(content: string, context: MobileContext): MobileOptimizedContent {
    let optimizedContent = content;

    // Apply battery optimizations
    if (context.batteryLevel && context.batteryLevel < 20) {
      optimizedContent = this.applyBatteryOptimizations(optimizedContent, context);
    }

    // Apply network optimizations
    if (context.networkCondition && context.networkCondition !== 'excellent') {
      optimizedContent = this.applyNetworkOptimizations(optimizedContent, context);
    }

    // Apply mobile UX optimizations
    optimizedContent = this.applyMobileUXOptimizations(optimizedContent, context);

    const result: MobileOptimizedContent = {
      text: optimizedContent,
      audio: this.generateOptimizedAudio(optimizedContent, context),
      visual: this.generateMobileVisuals(content, context),
      interactions: this.generateMobileInteractions(context),
      caching: this.generateCachingStrategy(content, context),
      metadata: {
        originalLength: content.length,
        optimizedLength: optimizedContent.length,
        compressionRatio: optimizedContent.length / content.length,
        batteryOptimized: context.batteryLevel ? context.batteryLevel < 20 : false,
        networkOptimized: context.networkCondition !== 'excellent'
      }
    };

    this.logger.debug('Content optimized for mobile', {
      compressionRatio: result.metadata.compressionRatio,
      batteryOptimized: result.metadata.batteryOptimized,
      networkOptimized: result.metadata.networkOptimized,
      hasAudio: !!result.audio,
      hasVisuals: result.visual.elements.length > 0
    });

    return result;
  }

  /**
   * Create push notification for story updates
   */
  createPushNotification(content: string, context: MobileContext): PushNotification {
    const notification: PushNotification = {
      title: this.generateNotificationTitle(content, context),
      body: this.generateNotificationBody(content),
      icon: this.getNotificationIcon(context),
      badge: this.calculateBadgeCount(context),
      sound: this.getNotificationSound(context),
      vibration: this.getVibrationPattern(context),
      data: {
        sessionId: context.sessionId,
        userId: context.userId,
        type: this.getNotificationType(content, context),
        timestamp: new Date().toISOString(),
        priority: this.getNotificationPriority(content, context)
      },
      actions: this.generateNotificationActions(content, context),
      scheduling: this.getNotificationScheduling(context)
    };

    this.logger.debug('Push notification created', {
      title: notification.title,
      type: notification.data.type,
      priority: notification.data.priority,
      hasActions: notification.actions.length > 0
    });

    return notification;
  }

  /**
   * Generate offline content for when network is unavailable
   */
  generateOfflineContent(context: MobileContext): OfflineContent {
    const offlineContent: OfflineContent = {
      stories: this.getCachedStories(context),
      characters: this.getCachedCharacters(context),
      templates: this.getStoryTemplates(),
      activities: this.getOfflineActivities(),
      responses: this.getCommonResponses(),
      metadata: {
        lastSync: context.lastSyncTime || new Date().toISOString(),
        cacheSize: this.calculateCacheSize(context),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }
    };

    this.logger.debug('Offline content generated', {
      storyCount: offlineContent.stories.length,
      characterCount: offlineContent.characters.length,
      templateCount: offlineContent.templates.length,
      cacheSize: offlineContent.metadata.cacheSize
    });

    return offlineContent;
  }

  /**
   * Optimize audio for mobile playback
   */
  optimizeAudioForMobile(audioConfig: AudioConfig, context: MobileContext): OptimizedAudioConfig {
    const optimized: OptimizedAudioConfig = {
      ...audioConfig,
      bitrate: this.getOptimalBitrate(context),
      format: this.getOptimalFormat(context),
      compression: this.getCompressionLevel(context),
      streaming: this.shouldUseStreaming(context),
      preload: this.getPreloadStrategy(context),
      fallback: this.generateAudioFallback(audioConfig, context)
    };

    // Adjust quality based on network conditions
    if (context.networkCondition === 'poor') {
      optimized.bitrate = Math.min(optimized.bitrate, 64); // 64kbps max for poor network
      optimized.compression = 'high';
    } else if (context.networkCondition === 'good') {
      optimized.bitrate = Math.min(optimized.bitrate, 128); // 128kbps max for good network
    }

    // Adjust for battery level
    if (context.batteryLevel && context.batteryLevel < 20) {
      optimized.bitrate = Math.min(optimized.bitrate, 96); // Reduce bitrate to save battery
      optimized.preload = 'none'; // Don't preload to save battery
    }

    this.logger.debug('Audio optimized for mobile', {
      originalBitrate: audioConfig.bitrate,
      optimizedBitrate: optimized.bitrate,
      format: optimized.format,
      compression: optimized.compression,
      streaming: optimized.streaming
    });

    return optimized;
  }

  /**
   * Generate haptic feedback patterns
   */
  generateHapticFeedback(context: MobileContext, eventType: string): HapticPattern | null {
    if (!context.capabilities?.supportsHaptics || !context.preferences?.hapticFeedback) {
      return null;
    }

    const patterns: Record<string, HapticPattern> = {
      message_received: {
        pattern: [100, 50, 100],
        intensity: 'light'
      },
      story_complete: {
        pattern: [200, 100, 200, 100, 200],
        intensity: 'medium'
      },
      character_created: {
        pattern: [150, 75, 150, 75, 300],
        intensity: 'medium'
      },
      error: {
        pattern: [300, 100, 300],
        intensity: 'heavy'
      },
      success: {
        pattern: [100, 50, 100, 50, 200],
        intensity: 'light'
      }
    };

    return patterns[eventType] || null;
  }

  /**
   * Create mobile-optimized UI layout
   */
  createMobileLayout(context: MobileContext): MobileLayoutConfig {
    const screenSize = this.getScreenSize(context);
    const orientation = this.getOrientation(context);

    return {
      screenSize,
      orientation,
      layout: {
        header: {
          height: screenSize === 'small' ? '60px' : '80px',
          compact: screenSize === 'small',
          showTitle: true,
          showBack: true
        },
        content: {
          padding: screenSize === 'small' ? '12px' : '16px',
          fontSize: this.getOptimalFontSize(screenSize),
          lineHeight: this.getOptimalLineHeight(screenSize),
          maxWidth: '100%'
        },
        input: {
          height: screenSize === 'small' ? '48px' : '56px',
          fontSize: this.getOptimalInputFontSize(screenSize),
          showVoiceButton: context.capabilities?.supportsVoice || false,
          showAttachButton: context.capabilities?.supportsFiles || false
        },
        quickReplies: {
          maxPerRow: screenSize === 'small' ? 2 : 3,
          height: '40px',
          fontSize: '14px',
          spacing: '8px'
        }
      },
      gestures: {
        swipeToGoBack: true,
        pullToRefresh: true,
        longPressForOptions: true,
        pinchToZoom: false // Disabled for chat
      },
      animations: {
        enabled: !context.preferences?.reducedMotion,
        duration: context.preferences?.reducedMotion ? 0 : 300,
        easing: 'ease-out'
      }
    };
  }

  /**
   * Generate mobile-specific quick actions
   */
  generateMobileQuickActions(context: MobileContext): MobileQuickAction[] {
    const actions: MobileQuickAction[] = [];

    // Context-specific actions
    switch (context.conversationPhase) {
      case 'greeting':
        actions.push(
          { id: 'voice_story', icon: '🎤', label: 'Voice Story', action: 'start_voice_story' },
          { id: 'quick_character', icon: '👤', label: 'Quick Character', action: 'quick_character' },
          { id: 'story_library', icon: '📚', label: 'My Stories', action: 'view_library' }
        );
        break;

      case 'character_creation':
        actions.push(
          { id: 'take_photo', icon: '📷', label: 'Photo', action: 'take_character_photo' },
          { id: 'voice_describe', icon: '🎤', label: 'Describe', action: 'voice_describe_character' },
          { id: 'random_traits', icon: '🎲', label: 'Random', action: 'random_character_traits' }
        );
        break;

      case 'story_building':
        actions.push(
          { id: 'continue_voice', icon: '🎤', label: 'Voice Continue', action: 'voice_continue_story' },
          { id: 'add_image', icon: '🖼️', label: 'Add Image', action: 'add_story_image' },
          { id: 'share_story', icon: '📤', label: 'Share', action: 'share_story' }
        );
        break;
    }

    // Always available actions
    actions.push(
      { id: 'help', icon: '❓', label: 'Help', action: 'show_help' },
      { id: 'settings', icon: '⚙️', label: 'Settings', action: 'show_settings' }
    );

    // Limit to 6 actions for mobile screens
    return actions.slice(0, 6);
  }

  // Private helper methods

  private applyBatteryOptimizations(content: string, context: MobileContext): string {
    // Shorten content to reduce processing time
    if (content.length > 300) {
      const sentences = content.split('. ');
      if (sentences.length > 2) {
        return sentences.slice(0, 2).join('. ') + '. Would you like to hear more?';
      }
    }

    // Remove complex formatting to reduce rendering cost
    return content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1'); // Remove italic formatting
  }

  private applyNetworkOptimizations(content: string, context: MobileContext): string {
    // Compress content for poor network conditions
    return content
      .replace(/\s+/g, ' ') // Remove extra whitespace
      .replace(/([.!?])\s+/g, '$1 ') // Normalize punctuation spacing
      .trim();
  }

  private applyMobileUXOptimizations(content: string, context: MobileContext): string {
    // Break long paragraphs for mobile reading
    const sentences = content.split('. ');
    if (sentences.length > 3) {
      return sentences.map((sentence, index) => {
        if (index > 0 && index % 2 === 0) {
          return '\n\n' + sentence;
        }
        return sentence;
      }).join('. ');
    }

    return content;
  }

  private generateOptimizedAudio(content: string, context: MobileContext): MobileAudioConfig | null {
    if (!context.capabilities?.supportsVoice) {
      return null;
    }

    return {
      url: this.generateAudioURL(content, context),
      format: this.getOptimalFormat(context),
      bitrate: this.getOptimalBitrate(context),
      duration: this.estimateAudioDuration(content),
      size: this.estimateAudioSize(content, context),
      streaming: this.shouldUseStreaming(context),
      preload: this.getPreloadStrategy(context),
      fallback: {
        text: content,
        enabled: true
      }
    };
  }

  private generateMobileVisuals(content: string, context: MobileContext): MobileVisualConfig {
    const elements: VisualElement[] = [];

    // Add character image if available
    if (context.currentCharacter?.imageUrl) {
      elements.push({
        type: 'character_image',
        url: context.currentCharacter.imageUrl,
        alt: context.currentCharacter.name,
        size: 'medium',
        position: 'center',
        lazy: true
      });
    }

    // Add story cover if available
    if (context.currentStory?.coverUrl) {
      elements.push({
        type: 'story_cover',
        url: context.currentStory.coverUrl,
        alt: context.currentStory.title,
        size: 'large',
        position: 'top',
        lazy: false
      });
    }

    // Add progress indicator
    if (context.storyProgress) {
      elements.push({
        type: 'progress_indicator',
        data: {
          progress: context.storyProgress,
          label: 'Story Progress',
          color: '#4CAF50'
        },
        size: 'small',
        position: 'bottom',
        lazy: false
      });
    }

    return {
      elements,
      layout: 'vertical',
      spacing: '16px',
      maxWidth: '100%',
      responsive: true
    };
  }

  private generateMobileInteractions(context: MobileContext): MobileInteractionConfig {
    return {
      touch: {
        enabled: true,
        tapDelay: 0,
        doubleTapZoom: false,
        longPressDelay: 500
      },
      voice: {
        enabled: context.capabilities?.supportsVoice || false,
        pushToTalk: false,
        voiceActivation: true,
        noiseReduction: true
      },
      gestures: {
        swipe: {
          enabled: true,
          threshold: 50,
          velocity: 0.3
        },
        pinch: {
          enabled: false // Disabled for chat interface
        }
      },
      haptics: {
        enabled: context.capabilities?.supportsHaptics || false,
        feedback: context.preferences?.hapticFeedback || false
      }
    };
  }

  private generateCachingStrategy(content: string, context: MobileContext): CachingStrategy {
    return {
      enabled: context.capabilities?.supportsOffline || false,
      priority: this.getCachePriority(content, context),
      ttl: this.getCacheTTL(content, context),
      size: content.length,
      compression: context.networkCondition === 'poor',
      encryption: false, // Not needed for non-sensitive content
      syncStrategy: 'background'
    };
  }

  private generateNotificationTitle(content: string, context: MobileContext): string {
    if (content.includes('story is ready') || content.includes('story complete')) {
      return '📖 Your Story is Ready!';
    }
    if (content.includes('character created') || content.includes('character complete')) {
      return '👤 Character Created!';
    }
    if (content.includes('chapter') || content.includes('continue')) {
      return '📚 Story Update';
    }
    return 'Storytailor';
  }

  private generateNotificationBody(content: string): string {
    // Create a concise summary for notification
    const summary = content.length > 100 ? content.substring(0, 97) + '...' : content;
    return summary.replace(/<[^>]*>/g, ''); // Remove HTML tags
  }

  private getNotificationIcon(context: MobileContext): string {
    switch (context.conversationPhase) {
      case 'character_creation': return 'character_icon';
      case 'story_building': return 'story_icon';
      case 'editing': return 'edit_icon';
      default: return 'app_icon';
    }
  }

  private calculateBadgeCount(context: MobileContext): number {
    // Calculate unread story updates or notifications
    return context.unreadCount || 0;
  }

  private getNotificationSound(context: MobileContext): string {
    if (context.preferences?.notificationSound === 'none') {
      return 'none';
    }
    return context.preferences?.notificationSound || 'default';
  }

  private getVibrationPattern(context: MobileContext): number[] {
    if (!context.capabilities?.supportsHaptics || !context.preferences?.hapticFeedback) {
      return [];
    }
    return [200, 100, 200]; // Default pattern
  }

  private getNotificationType(content: string, context: MobileContext): string {
    if (content.includes('story') && content.includes('ready')) return 'story_complete';
    if (content.includes('character') && content.includes('created')) return 'character_complete';
    if (content.includes('chapter')) return 'story_update';
    return 'general';
  }

  private getNotificationPriority(content: string, context: MobileContext): 'low' | 'normal' | 'high' {
    if (content.includes('complete') || content.includes('ready')) return 'high';
    if (content.includes('update') || content.includes('chapter')) return 'normal';
    return 'low';
  }

  private generateNotificationActions(content: string, context: MobileContext): NotificationAction[] {
    const actions: NotificationAction[] = [
      { action: 'open', title: 'Open', icon: 'open_icon' }
    ];

    if (content.includes('story')) {
      actions.push({ action: 'preview', title: 'Preview', icon: 'preview_icon' });
    }

    actions.push({ action: 'dismiss', title: 'Dismiss', icon: 'dismiss_icon' });

    return actions;
  }

  private getNotificationScheduling(context: MobileContext): NotificationScheduling {
    return {
      immediate: true,
      respectQuietHours: true,
      quietHours: {
        start: '22:00',
        end: '08:00'
      },
      maxPerHour: 3,
      grouping: true
    };
  }

  private getCachedStories(context: MobileContext): any[] {
    // Return cached stories from context or empty array
    return context.cachedData?.stories || [];
  }

  private getCachedCharacters(context: MobileContext): any[] {
    // Return cached characters from context or empty array
    return context.cachedData?.characters || [];
  }

  private getStoryTemplates(): any[] {
    // Return basic story templates for offline use
    return [
      { id: 'adventure', name: 'Adventure Story', template: 'adventure_template' },
      { id: 'bedtime', name: 'Bedtime Story', template: 'bedtime_template' },
      { id: 'educational', name: 'Educational Story', template: 'educational_template' }
    ];
  }

  private getOfflineActivities(): any[] {
    // Return offline activities that don't require network
    return [
      { id: 'character_creator', name: 'Character Creator', offline: true },
      { id: 'story_prompts', name: 'Story Prompts', offline: true },
      { id: 'drawing_pad', name: 'Drawing Pad', offline: true }
    ];
  }

  private getCommonResponses(): any[] {
    // Return common responses for offline use
    return [
      { trigger: 'hello', response: 'Hello! I\'m excited to help you create stories.' },
      { trigger: 'help', response: 'I can help you create characters and stories. What would you like to do?' },
      { trigger: 'story', response: 'Let\'s create an amazing story together!' }
    ];
  }

  private calculateCacheSize(context: MobileContext): number {
    // Calculate total cache size in bytes
    const stories = context.cachedData?.stories || [];
    const characters = context.cachedData?.characters || [];
    
    return (stories.length * 1024) + (characters.length * 512); // Rough estimate
  }

  private getOptimalBitrate(context: MobileContext): number {
    switch (context.networkCondition) {
      case 'excellent': return 192;
      case 'good': return 128;
      case 'fair': return 96;
      case 'poor': return 64;
      default: return 128;
    }
  }

  private getOptimalFormat(context: MobileContext): string {
    // Use MP3 for better compatibility and compression
    return 'mp3';
  }

  private getCompressionLevel(context: MobileContext): 'low' | 'medium' | 'high' {
    switch (context.networkCondition) {
      case 'excellent': return 'low';
      case 'good': return 'medium';
      case 'fair': return 'high';
      case 'poor': return 'high';
      default: return 'medium';
    }
  }

  private shouldUseStreaming(context: MobileContext): boolean {
    return context.networkCondition !== 'poor' && (context.batteryLevel || 100) > 20;
  }

  private getPreloadStrategy(context: MobileContext): 'none' | 'metadata' | 'auto' {
    if ((context.batteryLevel || 100) < 20) return 'none';
    if (context.networkCondition === 'poor') return 'metadata';
    return 'auto';
  }

  private generateAudioFallback(audioConfig: AudioConfig, context: MobileContext): AudioFallback {
    return {
      text: 'Audio playback not available',
      enabled: true,
      autoFallback: true
    };
  }

  private generateAudioURL(content: string, context: MobileContext): string {
    // Generate URL for audio synthesis service
    const params = new URLSearchParams({
      text: content,
      voice: context.voiceSettings?.voice || 'storyteller',
      speed: (context.voiceSettings?.speed || 1.0).toString(),
      format: this.getOptimalFormat(context),
      bitrate: this.getOptimalBitrate(context).toString()
    });

    return `https://audio.storytailor.com/synthesize?${params.toString()}`;
  }

  private estimateAudioDuration(content: string): number {
    const words = content.split(' ').length;
    const wordsPerMinute = 150;
    return Math.ceil((words / wordsPerMinute) * 60); // Duration in seconds
  }

  private estimateAudioSize(content: string, context: MobileContext): number {
    const duration = this.estimateAudioDuration(content);
    const bitrate = this.getOptimalBitrate(context);
    return Math.ceil((duration * bitrate * 1000) / 8); // Size in bytes
  }

  private getScreenSize(context: MobileContext): 'small' | 'medium' | 'large' {
    const width = context.screenWidth || 375;
    if (width < 375) return 'small';
    if (width < 414) return 'medium';
    return 'large';
  }

  private getOrientation(context: MobileContext): 'portrait' | 'landscape' {
    return context.orientation || 'portrait';
  }

  private getOptimalFontSize(screenSize: string): string {
    switch (screenSize) {
      case 'small': return '14px';
      case 'medium': return '16px';
      case 'large': return '18px';
      default: return '16px';
    }
  }

  private getOptimalLineHeight(screenSize: string): string {
    switch (screenSize) {
      case 'small': return '1.4';
      case 'medium': return '1.5';
      case 'large': return '1.6';
      default: return '1.5';
    }
  }

  private getOptimalInputFontSize(screenSize: string): string {
    // Prevent zoom on iOS when input font size is < 16px
    return '16px';
  }

  private getCachePriority(content: string, context: MobileContext): number {
    let priority = 5; // Default priority

    // Higher priority for story/character content
    if (content.includes('character')) priority += 2;
    if (content.includes('story')) priority += 2;
    
    // Higher priority for current conversation phase
    if (context.conversationPhase === 'character_creation' && content.includes('character')) {
      priority += 3;
    }
    
    return Math.min(priority, 10);
  }

  private getCacheTTL(content: string, context: MobileContext): number {
    // Cache TTL in milliseconds
    if (content.includes('story') || content.includes('character')) {
      return 7 * 24 * 60 * 60 * 1000; // 7 days for story content
    }
    return 24 * 60 * 60 * 1000; // 24 hours for general content
  }
}

// Type definitions
interface MobileContext {
  sessionId: string;
  userId: string;
  conversationPhase: string;
  batteryLevel?: number;
  networkCondition?: 'excellent' | 'good' | 'fair' | 'poor';
  screenWidth?: number;
  orientation?: 'portrait' | 'landscape';
  capabilities?: {
    supportsVoice: boolean;
    supportsFiles: boolean;
    supportsHaptics: boolean;
    supportsOffline: boolean;
  };
  preferences?: {
    hapticFeedback: boolean;
    reducedMotion: boolean;
    notificationSound: string;
  };
  voiceSettings?: {
    voice: string;
    speed: number;
  };
  currentCharacter?: any;
  currentStory?: any;
  storyProgress?: number;
  unreadCount?: number;
  lastSyncTime?: string;
  cachedData?: {
    stories: any[];
    characters: any[];
  };
}

interface MobileOptimizedContent {
  text: string;
  audio: MobileAudioConfig | null;
  visual: MobileVisualConfig;
  interactions: MobileInteractionConfig;
  caching: CachingStrategy;
  metadata: {
    originalLength: number;
    optimizedLength: number;
    compressionRatio: number;
    batteryOptimized: boolean;
    networkOptimized: boolean;
  };
}

interface MobileAudioConfig {
  url: string;
  format: string;
  bitrate: number;
  duration: number;
  size: number;
  streaming: boolean;
  preload: string;
  fallback: {
    text: string;
    enabled: boolean;
  };
}

interface MobileVisualConfig {
  elements: VisualElement[];
  layout: string;
  spacing: string;
  maxWidth: string;
  responsive: boolean;
}

interface VisualElement {
  type: string;
  url?: string;
  data?: any;
  alt?: string;
  size: string;
  position: string;
  lazy: boolean;
}

interface MobileInteractionConfig {
  touch: {
    enabled: boolean;
    tapDelay: number;
    doubleTapZoom: boolean;
    longPressDelay: number;
  };
  voice: {
    enabled: boolean;
    pushToTalk: boolean;
    voiceActivation: boolean;
    noiseReduction: boolean;
  };
  gestures: {
    swipe: {
      enabled: boolean;
      threshold: number;
      velocity: number;
    };
    pinch: {
      enabled: boolean;
    };
  };
  haptics: {
    enabled: boolean;
    feedback: boolean;
  };
}

interface CachingStrategy {
  enabled: boolean;
  priority: number;
  ttl: number;
  size: number;
  compression: boolean;
  encryption: boolean;
  syncStrategy: string;
}

interface PushNotification {
  title: string;
  body: string;
  icon: string;
  badge: number;
  sound: string;
  vibration: number[];
  data: {
    sessionId: string;
    userId: string;
    type: string;
    timestamp: string;
    priority: string;
  };
  actions: NotificationAction[];
  scheduling: NotificationScheduling;
}

interface NotificationAction {
  action: string;
  title: string;
  icon: string;
}

interface NotificationScheduling {
  immediate: boolean;
  respectQuietHours: boolean;
  quietHours: {
    start: string;
    end: string;
  };
  maxPerHour: number;
  grouping: boolean;
}

interface OfflineContent {
  stories: any[];
  characters: any[];
  templates: any[];
  activities: any[];
  responses: any[];
  metadata: {
    lastSync: string;
    cacheSize: number;
    expiresAt: string;
  };
}

interface AudioConfig {
  bitrate: number;
  format: string;
  voice: string;
  speed: number;
}

interface OptimizedAudioConfig extends AudioConfig {
  compression: string;
  streaming: boolean;
  preload: string;
  fallback: AudioFallback;
}

interface AudioFallback {
  text: string;
  enabled: boolean;
  autoFallback: boolean;
}

interface HapticPattern {
  pattern: number[];
  intensity: 'light' | 'medium' | 'heavy';
}

interface MobileLayoutConfig {
  screenSize: string;
  orientation: string;
  layout: {
    header: any;
    content: any;
    input: any;
    quickReplies: any;
  };
  gestures: any;
  animations: any;
}

interface MobileQuickAction {
  id: string;
  icon: string;
  label: string;
  action: string;
}