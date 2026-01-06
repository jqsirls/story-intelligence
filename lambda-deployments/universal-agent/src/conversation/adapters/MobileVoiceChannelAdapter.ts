import { ChannelAdapter, UniversalMessage, UniversalResponse, ConversationSession, ChannelSwitchContext } from '../UniversalConversationEngine';
import { Logger } from 'winston';
import { VoiceService, VoiceSynthesisRequest, createDefaultConfig } from '@alexa-multi-agent/voice-synthesis';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Mobile Voice Channel Adapter - Handles mobile app voice interactions
 */
export class MobileVoiceChannelAdapter extends ChannelAdapter {
  private logger: Logger;
  private voiceService: VoiceService | null = null;
  private s3Client: S3Client;
  private audioBucket: string;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    
    // Initialize S3 client for audio storage
    const region = process.env.AWS_REGION || 'us-east-2';
    this.s3Client = new S3Client({ region });
    this.audioBucket = process.env.AUDIO_BUCKET || process.env.ASSET_BUCKET || 'storytailor-assets-production';
    
    // Initialize VoiceService if configuration is available
    this.initializeVoiceService();
  }

  /**
   * Initialize VoiceService with configuration from environment
   */
  private async initializeVoiceService(): Promise<void> {
    try {
      const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenlabsApiKey) {
        this.logger.warn('ElevenLabs API key not found, VoiceService will not be available');
        return;
      }

      // Create VoiceService configuration
      const voiceConfig = createDefaultConfig();
      
      // Ensure voice ID is set (required for validation)
      if (!voiceConfig.elevenlabs.voiceId) {
        // Try to get from SSM or use default
        const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default ElevenLabs voice
        voiceConfig.elevenlabs.voiceId = defaultVoiceId;
        this.logger.info('Using default ElevenLabs voice ID', { voiceId: defaultVoiceId });
      }

      this.voiceService = new VoiceService(voiceConfig, this.logger);
      await this.voiceService.initialize();
      
      this.logger.info('VoiceService initialized for MobileVoiceChannelAdapter');
    } catch (error) {
      this.logger.warn('Failed to initialize VoiceService', {
        error: error instanceof Error ? error.message : String(error)
      });
      this.voiceService = null;
    }
  }

  async initializeSession(session: ConversationSession): Promise<void> {
    this.logger.debug('Initializing mobile voice session', {
      sessionId: session.sessionId,
      userId: session.userId
    });

    // Initialize mobile voice-specific session state
    const defaultVoiceSettings = {
      voice: 'storyteller',
      speed: 1.0,
      emotion: 'warm',
      volume: 0.8
    };
    const userVoiceSettings = (session.preferences && session.preferences.voice) ? session.preferences.voice : {} as any;
    session.state.channelStates['mobile_voice'] = {
      deviceInfo: {},
      voiceSettings: {
        voice: (userVoiceSettings as any).voice || defaultVoiceSettings.voice,
        speed: (userVoiceSettings as any).speed || defaultVoiceSettings.speed,
        emotion: (userVoiceSettings as any).emotion || defaultVoiceSettings.emotion,
        volume: (userVoiceSettings as any).volume || defaultVoiceSettings.volume
      },
      offlineCapability: session.capabilities.supportsOffline,
      pushNotifications: true,
      backgroundMode: false,
      audioQuality: 'high',
      compressionEnabled: true,
      batteryOptimization: true,
      networkAdaptation: true
    };
  }

  async preprocessMessage(message: UniversalMessage, session: ConversationSession): Promise<UniversalMessage> {
    const mobileState = session.state.channelStates['mobile_voice'] || {};

    // Handle different message types for mobile
    switch (message.type) {
      case 'voice':
        return this.preprocessVoiceMessage(message, session);
      
      case 'text':
        return this.preprocessTextMessage(message, session);
      
      case 'image':
        return this.preprocessImageMessage(message, session);
      
      default:
        return message;
    }
  }

  async postprocessResponse(response: UniversalResponse, session: ConversationSession): Promise<UniversalResponse> {
    const mobileState = session.state.channelStates['mobile_voice'] || {};

    // Optimize response for mobile delivery
    if (response.type === 'voice' || response.type === 'text') {
      return {
        ...response,
        content: this.optimizeForMobile(response.content.toString(), session),
        metadata: {
          ...response.metadata,
          optimizedForMobile: true,
          compressionApplied: mobileState.compressionEnabled,
          batteryOptimized: mobileState.batteryOptimization
        }
      };
    }

    return response;
  }

  async adaptResponse(response: UniversalResponse, session: ConversationSession): Promise<any> {
    const mobileState = session.state.channelStates['mobile_voice'] || {};

    // Create mobile-specific response format
    interface MobileResponse {
      id: string;
      type: string;
      timestamp: string;
      content: any;
      audio: any;
      ui: {
        showTranscript: boolean;
        allowPlayback: boolean;
        showWaveform: boolean;
        hapticFeedback: boolean;
      };
      metadata: {
        confidence: number;
        agentsUsed: string[];
        responseTime: number;
        networkOptimized: any;
        batteryOptimized: any;
      };
      offline?: {
        cacheable: boolean;
        priority: number;
        expiresAt: string;
      };
      pushNotification?: any;
      visual?: any;
      quickActions?: any;
    }

    const mobileResponse: MobileResponse = {
      id: this.generateResponseId(),
      type: 'mobile_voice_response',
      timestamp: new Date().toISOString(),
      content: await this.adaptContentForMobile(response, session),
      audio: await this.generateAudioResponse(response, session),
      ui: {
        showTranscript: true,
        allowPlayback: true,
        showWaveform: true,
        hapticFeedback: session.preferences?.accessibility?.hapticFeedback || false
      },
      metadata: {
        confidence: response.metadata.confidence,
        agentsUsed: response.metadata.agentsUsed,
        responseTime: response.metadata.generationTime,
        networkOptimized: mobileState.networkAdaptation,
        batteryOptimized: mobileState.batteryOptimization
      }
    };

    // Add offline support if enabled
    if (mobileState.offlineCapability) {
      mobileResponse.offline = {
        cacheable: this.isCacheable(response),
        priority: this.getCachePriority(response, session),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };
    }

    // Add push notification if appropriate
    if (this.shouldSendPushNotification(response, session)) {
      mobileResponse.pushNotification = this.createPushNotification(response, session);
    }

    // Add visual elements for devices with screens
    if (session.capabilities.supportsImages) {
      mobileResponse.visual = await this.createVisualElements(response, session);
    }

    // Add quick actions for common responses
    if (response.requiresInput) {
      mobileResponse.quickActions = this.generateQuickActions(response, session);
    }

    this.logger.debug('Mobile voice response adapted', {
      sessionId: session.sessionId,
      responseId: mobileResponse.id,
      hasAudio: !!mobileResponse.audio,
      hasVisual: !!mobileResponse.visual,
      hasQuickActions: !!mobileResponse.quickActions,
      cacheable: mobileResponse.offline?.cacheable
    });

    return mobileResponse;
  }

  async exportState(session: ConversationSession): Promise<any> {
    const mobileState = session.state.channelStates['mobile_voice'] || {};
    
    return {
      deviceInfo: mobileState.deviceInfo,
      voiceSettings: mobileState.voiceSettings,
      preferences: {
        audioQuality: mobileState.audioQuality,
        compressionEnabled: mobileState.compressionEnabled,
        batteryOptimization: mobileState.batteryOptimization,
        pushNotifications: mobileState.pushNotifications
      },
      conversationPhase: session.state.phase,
      lastInteraction: session.state.context.lastInteraction,
      storyContext: {
        currentStory: session.state.currentStory,
        currentCharacter: session.state.currentCharacter
      },
      offlineData: mobileState.offlineData || {},
      cachedResponses: mobileState.cachedResponses || []
    };
  }

  async importState(session: ConversationSession, state: any, context?: ChannelSwitchContext): Promise<void> {
    if (!state) return;

    // Import mobile voice-specific state
    session.state.channelStates['mobile_voice'] = {
      deviceInfo: state.deviceInfo || {},
      voiceSettings: state.voiceSettings || {},
      ...state.preferences,
      offlineCapability: session.capabilities.supportsOffline,
      offlineData: state.offlineData || {},
      cachedResponses: state.cachedResponses || []
    };

    // Import general conversation state
    if (state.conversationPhase) {
      session.state.phase = state.conversationPhase;
    }

    if (state.storyContext) {
      session.state.currentStory = state.storyContext.currentStory;
      session.state.currentCharacter = state.storyContext.currentCharacter;
    }

    this.logger.debug('Mobile voice state imported', {
      sessionId: session.sessionId,
      importedPhase: state.conversationPhase,
      hasOfflineData: !!state.offlineData,
      cachedResponseCount: state.cachedResponses?.length || 0,
      preserveState: context?.preserveState
    });
  }

  async cleanupSession(session: ConversationSession): Promise<void> {
    // Clean up mobile voice-specific resources
    const mobileState = session.state.channelStates['mobile_voice'];
    if (mobileState) {
      // Clear cached audio files
      if (mobileState.cachedAudio) {
        // Clean up cached audio files from S3 or local storage
        try {
          if (Array.isArray(mobileState.cachedAudio)) {
            for (const audioUrl of mobileState.cachedAudio) {
              // Extract S3 key from URL if it's an S3 URL
              if (audioUrl && typeof audioUrl === 'string' && audioUrl.includes('s3://')) {
                // S3 cleanup is handled by lifecycle policies automatically
                // Log the cleanup for monitoring purposes
                this.logger.debug('Cleaning up cached audio', { audioUrl });
              }
            }
          } else if (typeof mobileState.cachedAudio === 'object') {
            // Handle object format
            const audioFiles = Object.values(mobileState.cachedAudio);
            for (const audioFile of audioFiles) {
              if (audioFile && typeof audioFile === 'string') {
                this.logger.debug('Cleaning up cached audio file', { audioFile });
              }
            }
          }
        } catch (error) {
          this.logger.warn('Error cleaning up cached audio files', { error });
        }
      }
      
      // Clear temporary files
      if (mobileState.temporaryFiles) {
        // Clean up temporary files from S3 or local storage
        try {
          if (Array.isArray(mobileState.temporaryFiles)) {
            for (const tempFile of mobileState.temporaryFiles) {
              if (tempFile && typeof tempFile === 'string') {
                // Extract S3 key from URL if it's an S3 URL
                if (tempFile.includes('s3://')) {
                  // S3 cleanup would be handled by lifecycle policies
                  this.logger.debug('Cleaning up temporary file', { tempFile });
                }
              }
            }
          } else if (typeof mobileState.temporaryFiles === 'object') {
            // Handle object format
            const tempFiles = Object.values(mobileState.temporaryFiles);
            for (const tempFile of tempFiles) {
              if (tempFile && typeof tempFile === 'string') {
                this.logger.debug('Cleaning up temporary file', { tempFile });
              }
            }
          }
        } catch (error) {
          this.logger.warn('Error cleaning up temporary files', { error });
        }
      }
      
      delete session.state.channelStates['mobile_voice'];
    }
    
    this.logger.debug('Mobile voice session cleaned up', {
      sessionId: session.sessionId,
      userId: session.userId
    });
  }

  // Private helper methods

  private preprocessVoiceMessage(message: UniversalMessage, session: ConversationSession): UniversalMessage {
    const mobileState = session.state.channelStates['mobile_voice'] || {};
    
    // Handle mobile-specific voice processing
    return {
      ...message,
      metadata: {
        ...message.metadata,
        mobileVoice: true,
        deviceInfo: mobileState.deviceInfo,
        audioQuality: mobileState.audioQuality,
        compressionUsed: mobileState.compressionEnabled,
        backgroundMode: mobileState.backgroundMode
      }
    };
  }

  private preprocessTextMessage(message: UniversalMessage, session: ConversationSession): UniversalMessage {
    // Handle text input from mobile (typed while voice is primary)
    return {
      ...message,
      metadata: {
        ...message.metadata,
        mobileText: true,
        inputMethod: 'keyboard',
        voiceAlternative: true // Suggest voice input
      }
    };
  }

  private preprocessImageMessage(message: UniversalMessage, session: ConversationSession): UniversalMessage {
    // Handle image capture from mobile camera
    const imageData = message.content as any;
    
    return {
      ...message,
      metadata: {
        ...message.metadata,
        mobileImage: true,
        captureMethod: imageData.captureMethod || 'camera',
        location: imageData.location, // If available and permitted
        timestamp: imageData.timestamp
      }
    };
  }

  private optimizeForMobile(content: string, session: ConversationSession): string {
    const mobileState = session.state.channelStates['mobile_voice'] || {};
    
    // Optimize content for mobile voice delivery
    let optimized = content;

    // Adjust for battery optimization
    if (mobileState.batteryOptimization) {
      // Shorter responses to save battery
      optimized = this.shortenForBattery(optimized);
    }

    // Adjust for network conditions
    if (mobileState.networkAdaptation) {
      // Compress content for poor network conditions
      optimized = this.compressForNetwork(optimized);
    }

    // Add mobile-specific voice optimizations
    optimized = this.addMobileVoiceOptimizations(optimized);

    return optimized;
  }

  private async adaptContentForMobile(response: UniversalResponse, session: ConversationSession): Promise<any> {
    const content = response.content.toString();
    
    return {
      text: content,
      displayText: this.createDisplayText(content),
      transcript: this.stripSSML(content),
      summary: this.createSummary(content),
      keyPoints: this.extractKeyPoints(content),
      actionable: response.requiresInput,
      mobileOptimized: true
    };
  }

  private async generateAudioResponse(response: UniversalResponse, session: ConversationSession): Promise<any> {
    const mobileState = session.state.channelStates['mobile_voice'] || {};
    const voiceSettings = mobileState.voiceSettings || (session.preferences && session.preferences.voice ? session.preferences.voice : {}) || {};
    
    if (response.type !== 'voice' && response.type !== 'text') {
      return null;
    }

    const audioConfig = {
      voice: voiceSettings.voice || 'storyteller',
      speed: voiceSettings.speed || 1.0,
      emotion: voiceSettings.emotion || 'warm',
      volume: voiceSettings.volume || 0.8,
      quality: mobileState.audioQuality || 'high',
      compression: mobileState.compressionEnabled ? 'mp3' : 'wav',
      bitrate: (mobileState.audioQuality === 'high') ? 128 : 64
    };

    return {
      url: await this.synthesizeAudio(response.content.toString(), audioConfig),
      format: audioConfig.compression,
      duration: this.estimateAudioDuration(response.content.toString()),
      size: this.estimateAudioSize(response.content.toString(), audioConfig),
      config: audioConfig,
      cacheable: this.isCacheable(response)
    };
  }

  private isCacheable(response: UniversalResponse): boolean {
    // Determine if response can be cached for offline use
    const content = response.content.toString().toLowerCase();
    
    // Cache common responses and story elements
    return (
      content.includes('hello') ||
      content.includes('welcome') ||
      content.includes('character') ||
      content.includes('story') ||
      response.metadata.confidence > 0.8
    );
  }

  private getCachePriority(response: UniversalResponse, session: ConversationSession): number {
    // Determine cache priority (1-10, higher = more important)
    let priority = 5; // Default

    // Higher priority for story/character content
    if (response.content.toString().includes('character')) priority += 2;
    if (response.content.toString().includes('story')) priority += 2;
    
    // Higher priority for high-confidence responses
    if (response.metadata.confidence > 0.9) priority += 1;
    
    // Higher priority for current conversation phase
    if (session.state.phase === 'character_creation' && response.content.toString().includes('character')) {
      priority += 2;
    }

    return Math.min(priority, 10);
  }

  private shouldSendPushNotification(response: UniversalResponse, session: ConversationSession): boolean {
    const mobileState = session.state.channelStates['mobile_voice'] || {};
    
    if (!mobileState.pushNotifications) return false;

    // Send push notifications for story completion, character creation, etc.
    const content = response.content.toString().toLowerCase();
    
    return (
      content.includes('story is ready') ||
      content.includes('character created') ||
      content.includes('finished') ||
      content.includes('complete')
    );
  }

  private createPushNotification(response: UniversalResponse, session: ConversationSession): any {
    const content = response.content.toString();
    
    return {
      title: this.getPushTitle(content, session),
      body: this.getPushBody(content),
      icon: 'storytailor_icon',
      badge: 1,
      sound: 'default',
      data: {
        sessionId: session.sessionId,
        userId: session.userId,
        type: 'story_update',
        timestamp: new Date().toISOString()
      },
      actions: [
        {
          action: 'open',
          title: 'Open Story'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
  }

  private async createVisualElements(response: UniversalResponse, session: ConversationSession): Promise<any> {
    const visual = {
      type: 'mobile_visual',
      elements: []
    };

    // Add character image if available
    if (session.state.currentCharacter?.appearance_url) {
      visual.elements.push({
        type: 'character_image',
        url: session.state.currentCharacter.appearance_url,
        alt: session.state.currentCharacter.name,
        aspectRatio: '1:1',
        cornerRadius: 8
      });
    }

    // Add story cover if available
    const coverUrl =
      session.state.currentStory?.cover_art_url || (session.state.currentStory as any)?.cover_url

    if (coverUrl) {
      visual.elements.push({
        type: 'story_cover',
        url: coverUrl,
        alt: session.state.currentStory.title,
        aspectRatio: '16:9',
        cornerRadius: 12
      });
    }

    // Add progress indicator
    if (session.state.phase === 'story_building') {
      visual.elements.push({
        type: 'progress_indicator',
        progress: this.calculateStoryProgress(session),
        label: 'Story Progress'
      });
    }

    return visual.elements.length > 0 ? visual : null;
  }

  private generateQuickActions(response: UniversalResponse, session: ConversationSession): any[] {
    const actions = [];

    // Add common quick actions based on conversation phase
    switch (session.state.phase) {
      case 'greeting':
        actions.push(
          { id: 'create_story', label: '📖 Create Story', voice: 'Create a story' },
          { id: 'create_character', label: '👤 Create Character', voice: 'Create a character' }
        );
        break;
      
      case 'character_creation':
        actions.push(
          { id: 'yes', label: '✅ Yes', voice: 'Yes' },
          { id: 'no', label: '❌ No', voice: 'No' },
          { id: 'change', label: '✏️ Change', voice: 'I want to change that' }
        );
        break;
      
      case 'story_building':
        actions.push(
          { id: 'continue', label: '➡️ Continue', voice: 'Continue the story' },
          { id: 'edit', label: '✏️ Edit', voice: 'I want to edit' },
          { id: 'finish', label: '🏁 Finish', voice: 'Finish the story' }
        );
        break;
    }

    // Add suggestions as quick actions
    if (response.suggestions) {
      actions.push(...response.suggestions.map((suggestion, index) => ({
        id: `suggestion_${index}`,
        label: suggestion,
        voice: suggestion
      })));
    }

    return actions.slice(0, 6); // Limit to 6 actions for mobile UI
  }

  private shortenForBattery(content: string): string {
    // Shorten content to save battery on mobile
    if (content.length <= 200) return content;
    
    const sentences = content.split('. ');
    if (sentences.length <= 2) return content;
    
    // Keep first two sentences and add continuation hint
    return sentences.slice(0, 2).join('. ') + '. Would you like to hear more?';
  }

  private compressForNetwork(content: string): string {
    // Compress content for poor network conditions
    return content
      .replace(/\s+/g, ' ') // Remove extra whitespace
      .replace(/([.!?])\s+/g, '$1 ') // Normalize punctuation spacing
      .trim();
  }

  private addMobileVoiceOptimizations(content: string): string {
    // Add mobile-specific voice optimizations
    return content
      // Add pauses for mobile speakers
      .replace(/\. /g, '. <break time="0.3s"/> ')
      // Emphasize important words for mobile audio
      .replace(/\b(amazing|wonderful|exciting|magical)\b/gi, '<emphasis level="strong">$1</emphasis>')
      // Adjust speed for mobile listening
      .replace(/\b([A-Z][a-z]+)\b/g, '<prosody rate="95%">$1</prosody>');
  }

  private createDisplayText(content: string): string {
    // Create display text optimized for mobile screens
    return this.stripSSML(content)
      .replace(/\n/g, '\n\n') // Add spacing for readability
      .replace(/([.!?])/g, '$1\n') // Add line breaks after sentences
      .trim();
  }

  private createSummary(content: string): string {
    // Create a brief summary for mobile notifications/previews
    const sentences = content.split('. ');
    return sentences[0] + (sentences.length > 1 ? '...' : '');
  }

  private extractKeyPoints(content: string): string[] {
    // Extract key points from content for mobile display
    const keyPoints = [];
    
    if (content.includes('character')) {
      keyPoints.push('Character creation');
    }
    if (content.includes('story')) {
      keyPoints.push('Story building');
    }
    if (content.includes('finished') || content.includes('complete')) {
      keyPoints.push('Completion');
    }
    
    return keyPoints;
  }

  private stripSSML(content: string): string {
    return content
      .replace(/<speak>/g, '')
      .replace(/<\/speak>/g, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  private async synthesizeAudio(text: string, config: any): Promise<string> {
    try {
      // Use VoiceService if available
      if (this.voiceService) {
        const request: VoiceSynthesisRequest = {
          text,
          language: config.language || 'en-US',
          emotion: config.emotion || 'neutral',
          voiceId: config.voiceId,
          format: config.compression === 'mp3' ? 'mp3' : 'wav',
          sampleRate: config.sampleRate || 16000,
          streaming: false, // For mobile, we want complete audio files
          priority: config.priority || 'normal'
        };

        // Generate audio using VoiceService
        const response = await this.voiceService.generateLongForm(request);
        
        if (response.success && response.audioData) {
          // Upload audio to S3
          const audioKey = `audio/mobile/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${config.compression || 'mp3'}`;
          
          await this.s3Client.send(new PutObjectCommand({
            Bucket: this.audioBucket,
            Key: audioKey,
            Body: response.audioData,
            ContentType: config.compression === 'mp3' ? 'audio/mpeg' : 'audio/wav',
            CacheControl: 'public, max-age=31536000', // Cache for 1 year
            Metadata: {
              synthesizedAt: new Date().toISOString(),
              engine: response.engine,
              duration: response.duration?.toString() || '0'
            }
          }));

          const region = process.env.AWS_REGION || 'us-east-2';
          return `https://${this.audioBucket}.s3.${region}.amazonaws.com/${audioKey}`;
        } else if (response.audioUrl) {
          // VoiceService already provided a URL
          return response.audioUrl;
        } else {
          throw new Error(response.error || 'Audio synthesis failed');
        }
      }

      // Fallback: Return fallback audio URL if VoiceService not available
      // In production, VoiceService should always be initialized, but this provides graceful degradation
      this.logger.warn('VoiceService not available, using fallback audio URL');
      return `https://${this.audioBucket}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/audio/fallback/${Date.now()}.${config.compression || 'mp3'}`;
    } catch (error) {
      this.logger.error('Audio synthesis failed', {
        error: error instanceof Error ? error.message : String(error),
        textLength: text.length
      });
      throw error;
    }
  }

  private estimateAudioDuration(text: string): number {
    // Estimate audio duration in seconds (rough calculation)
    const wordsPerMinute = 150;
    const words = text.split(' ').length;
    return Math.ceil((words / wordsPerMinute) * 60);
  }

  private estimateAudioSize(text: string, config: any): number {
    // Estimate audio file size in bytes
    const duration = this.estimateAudioDuration(text);
    const bitrate = config.bitrate * 1000; // Convert to bits per second
    return Math.ceil((duration * bitrate) / 8); // Convert to bytes
  }

  private getPushTitle(content: string, session: ConversationSession): string {
    if (content.includes('story is ready')) return 'Your Story is Ready! 📖';
    if (content.includes('character created')) return 'Character Created! 👤';
    if (content.includes('finished')) return 'Story Complete! 🎉';
    return 'Storytailor Update';
  }

  private getPushBody(content: string): string {
    const summary = this.createSummary(content);
    return summary.length > 100 ? summary.substring(0, 97) + '...' : summary;
  }

  private calculateStoryProgress(session: ConversationSession): number {
    // Calculate story progress as percentage
    if (!session.state.currentStory) return 0;
    
    const story = session.state.currentStory;
    if (story.chapters && story.totalChapters) {
      return Math.round((story.chapters.length / story.totalChapters) * 100);
    }
    
    // Fallback based on conversation phase
    switch (session.state.phase) {
      case 'character_creation': return 25;
      case 'story_building': return 60;
      case 'editing': return 85;
      case 'finalization': return 100;
      default: return 0;
    }
  }

  private generateResponseId(): string {
    return `mobile_resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}