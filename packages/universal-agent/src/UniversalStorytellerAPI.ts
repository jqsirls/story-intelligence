// Universal Storyteller API that can be embedded anywhere
// Router imported dynamically to avoid module resolution issues in Lambda
// import { Router } from '@alexa-multi-agent/router';
// @ts-ignore - Event-system is bundled at runtime, types may not be available during compilation
import { EventPublisher } from '@alexa-multi-agent/event-system';
import { Logger } from 'winston';
// TODO: Re-enable when @alexa-multi-agent/kid-communication-intelligence package is available
// import { KidCommunicationIntelligenceService, AudioInput as KidAudioInput, TranscriptionResult, ChildProfile } from '@alexa-multi-agent/kid-communication-intelligence';

// Temporary stub types to avoid compilation errors
type KidCommunicationIntelligenceService = any;
type KidAudioInput = any;
type TranscriptionResult = any;
type ChildProfile = any;

import { FEATURES } from '@alexa-multi-agent/api-contract';

export interface ConversationConfig {
  platform: 'web' | 'mobile' | 'alexa' | 'google' | 'apple' | 'api' | 'custom';
  userId?: string;
  sessionId?: string;
  language: string;
  voiceEnabled: boolean;
  smartHomeEnabled: boolean;
  parentalControls: ParentalControlConfig;
  privacySettings: PrivacyConfig;
  customization?: {
    theme: string;
    branding: BrandingConfig;
    features: FeatureFlags;
  };
}

export interface UserMessage {
  type: 'text' | 'voice' | 'image' | 'file';
  content: string | AudioData | ImageData | FileData;
  metadata: {
    timestamp: string;
    platform: string;
    deviceInfo?: DeviceInfo;
    location?: LocationInfo;
  };
}

export interface BotResponse {
  type: 'text' | 'voice' | 'image' | 'card' | 'action';
  content: string | AudioData | ImageData | CardData | ActionData;
  suggestions?: string[];
  requiresInput: boolean;
  conversationState: ConversationState;
  smartHomeActions?: SmartHomeAction[];
  metadata: {
    responseTime: number;
    confidence: number;
    agentsUsed: string[];
  };
}

export interface ConversationSession {
  sessionId: string;
  userId: string;
  platform: string;
  startedAt: string;
  expiresAt: string;
  state: ConversationState;
  capabilities: PlatformCapabilities;
}

export class UniversalStorytellerAPI {
  private router: any; // Router loaded dynamically
  private eventPublisher: EventPublisher;
  private logger: Logger;
  private activeSessions: Map<string, ConversationSession> = new Map();
  private kidIntelligence: KidCommunicationIntelligenceService | null = null;
  private kidIntelligenceEnabled: boolean = false;

  constructor(
    router: any, // Router loaded dynamically
    eventPublisher: EventPublisher,
    logger: Logger
  ) {
    this.router = router;
    this.eventPublisher = eventPublisher;
    this.logger = logger;
    
    // Check feature flag for Kid Communication Intelligence
    this.kidIntelligenceEnabled = FEATURES.KID_COMMUNICATION_INTELLIGENCE || 
                                   process.env.ENABLE_KID_INTELLIGENCE === 'true' ||
                                   false;
    
    // Initialize Kid Communication Intelligence Service if feature is enabled
    if (this.kidIntelligenceEnabled) {
      this.initializeKidIntelligence();
    } else {
      this.logger.info('Kid Communication Intelligence is disabled (feature flag off)');
    }
  }

  /**
   * Initialize Kid Communication Intelligence Service
   */
  private async initializeKidIntelligence(): Promise<void> {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        this.kidIntelligence = new KidCommunicationIntelligenceService({
          enableAudioIntelligence: true,
          enableTestTimeAdaptation: true,
          enableMultimodal: true,
          enableDevelopmentalProcessing: true,
          enableInventedWordIntelligence: true,
          enableChildLogicInterpreter: true,
          enableEmotionalSpeechIntelligence: true,
          enableAdaptiveTranscription: true,
          enableContinuousPersonalization: true,
          enableConfidenceSystem: true,
          supabaseUrl,
          supabaseKey,
          redisUrl: process.env.REDIS_URL
        }, this.logger);
        
        // Initialize the service
        await this.kidIntelligence.initialize();
        this.logger.info('Kid Communication Intelligence Service initialized (feature enabled)');
      } else {
        this.logger.warn('Kid Communication Intelligence Service not initialized - missing Supabase credentials');
      }
    } catch (error: any) {
      this.logger.warn('Failed to initialize Kid Communication Intelligence Service', { error: error.message });
    }
  }

  /**
   * Start a new conversation session
   */
  async startConversation(config: ConversationConfig): Promise<ConversationSession> {
    const sessionId = config.sessionId || this.generateSessionId();
    const userId = config.userId || 'anonymous';

    // Create session with platform-specific capabilities
    const session: ConversationSession = {
      sessionId,
      userId,
      platform: config.platform,
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      state: {
        phase: 'greeting',
        context: {},
        history: [],
        currentStory: null,
        currentCharacter: null
      },
      capabilities: this.getPlatformCapabilities(config.platform)
    };

    this.activeSessions.set(sessionId, session);

    // Log session start
    await this.eventPublisher.publishEvent(
      'com.storytailor.conversation.started',
      {
        sessionId,
        userId,
        platform: config.platform,
        capabilities: session.capabilities
      }
    );

    this.logger.info('Conversation session started', {
      sessionId,
      userId,
      platform: config.platform
    });

    return session;
  }

  /**
   * Send a message and get response
   */
  async sendMessage(sessionId: string, message: UserMessage): Promise<BotResponse> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const startTime = Date.now();

    try {
      // Convert to router format
      const routerRequest = this.convertToRouterRequest(message, session);

      // Process through existing router
      const routerResponse = await this.router.routeRequest(routerRequest);

      // Convert back to universal format
      const universalResponse = this.convertToUniversalResponse(routerResponse, session);

      // Update session state
      session.state.history.push({
        timestamp: new Date().toISOString(),
        userMessage: message,
        botResponse: universalResponse
      });

      // Update conversation state based on response
      this.updateConversationState(session, universalResponse);

      // Log interaction
      await this.eventPublisher.publishEvent(
        'com.storytailor.conversation.message',
        {
          sessionId,
          userId: session.userId,
          platform: session.platform,
          messageType: message.type,
          responseType: universalResponse.type,
          responseTime: Date.now() - startTime
        }
      );

      return universalResponse;

    } catch (error) {
      this.logger.error('Error processing message', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });

      // Return error response in universal format
      return {
        type: 'text',
        content: "I'm sorry, I encountered an error. Let me try to help you in a different way.",
        suggestions: ['Start over', 'Try again', 'Get help'],
        requiresInput: true,
        conversationState: session.state,
        metadata: {
          responseTime: Date.now() - startTime,
          confidence: 0,
          agentsUsed: ['error_handler']
        }
      };
    }
  }

  /**
   * Stream responses for real-time chat
   */
  async *streamResponse(sessionId: string, message: UserMessage): AsyncIterator<ResponseChunk> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Convert to router format
    const routerRequest = this.convertToRouterRequest(message, session);

    // Stream from router (if supported) or simulate streaming
    if (this.router.supportsStreaming) {
      for await (const chunk of this.router.streamResponse(routerRequest)) {
        yield this.convertChunkToUniversal(chunk, session);
      }
    } else {
      // Simulate streaming for non-streaming agents
      const response = await this.sendMessage(sessionId, message);
      const words = response.content.toString().split(' ');
      
      for (let i = 0; i < words.length; i++) {
        yield {
          type: 'text_chunk',
          content: words.slice(0, i + 1).join(' '),
          isComplete: i === words.length - 1,
          metadata: {
            chunkIndex: i,
            totalChunks: words.length
          }
        };
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * Process voice input
   */
  async processVoiceInput(sessionId: string, audioData: AudioInput): Promise<VoiceResponse> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Get child profile if available (from session context)
    const childProfile: ChildProfile | undefined = session.state.context?.childProfile;

    // Preprocess audio with Kid Communication Intelligence if feature is enabled
    let processedAudio: KidAudioInput = {
      data: audioData.data,
      sampleRate: audioData.sampleRate || 16000,
      channels: 1,
      format: 'pcm',
      metadata: {
        childId: session.userId,
        age: childProfile?.age,
        sessionId,
        timestamp: new Date().toISOString()
      }
    };

    if (this.kidIntelligenceEnabled && this.kidIntelligence) {
      try {
        processedAudio = await this.kidIntelligence.preprocessAudio(processedAudio, childProfile);
      } catch (error: any) {
        this.logger.warn('Audio preprocessing failed, using original audio', { error: error.message });
      }
    }

    // Convert audio to text (using Kid Communication Intelligence if enabled)
    const transcription = await this.transcribeAudio(processedAudio, childProfile, sessionId);

    // Process as text message
    const textMessage: UserMessage = {
      type: 'text',
      content: transcription.text,
      metadata: {
        timestamp: new Date().toISOString(),
        platform: session.platform,
        originalAudio: true as any, // Type assertion - originalAudio may not be in metadata type
        confidence: transcription.confidence,
        inventedWords: transcription.inventedWords,
        emotionalContext: transcription.emotionalContext,
        developmentalStage: transcription.developmentalStage
      }
    };

    const response = await this.sendMessage(sessionId, textMessage);

    // Convert response to voice if platform supports it
    let audioResponse: AudioData | undefined;
    if (session.capabilities.supportsVoice && response.type === 'text') {
      audioResponse = await this.synthesizeVoice(response.content.toString(), {
        voice: 'storyteller',
        speed: 1.0,
        emotion: this.getEmotionFromContext(session.state)
      });
    }

    return {
      transcription: transcription.text,
      textResponse: response.content.toString(),
      audioResponse,
      conversationState: response.conversationState,
      metadata: {
        transcriptionConfidence: transcription.confidence,
        responseTime: response.metadata.responseTime,
        inventedWords: transcription.inventedWords,
        emotionalContext: transcription.emotionalContext
      }
    };
  }

  /**
   * Synthesize voice response
   */
  async synthesizeVoice(text: string, voiceConfig: VoiceConfig): Promise<AudioData> {
    // Use existing ElevenLabs integration through voice-synthesis package
    const voiceService = this.getVoiceService();
    return await voiceService.synthesize(text, voiceConfig);
  }

  /**
   * Get user's stories
   */
  async getStories(userId: string, libraryId?: string): Promise<any[]> {
    // Use existing LibraryAgent
    const libraryAgent = this.getLibraryAgent();
    return await libraryAgent.listStories(libraryId || await this.getDefaultLibraryId(userId));
  }

  /**
   * Create a new story
   */
  async createStory(request: StoryCreationRequest): Promise<any> {
    // Use existing ContentAgent
    const contentAgent = this.getContentAgent();
    return await contentAgent.createStoryDraft(request.character, request.storyType);
  }

  /**
   * Connect smart home device
   */
  async connectSmartDevice(deviceConfig: SmartDeviceConfig): Promise<DeviceConnection> {
    // Use existing SmartHomeAgent
    const smartHomeAgent = this.getSmartHomeAgent();
    return await smartHomeAgent.connectDevice(deviceConfig);
  }

  /**
   * End conversation session
   */
  async endConversation(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return; // Already ended or never existed
    }

    // Log session end
    await this.eventPublisher.publishEvent(
      'com.storytailor.conversation.ended',
      {
        sessionId,
        userId: session.userId,
        platform: session.platform,
        duration: Date.now() - new Date(session.startedAt).getTime(),
        messageCount: session.state.history.length
      }
    );

    this.activeSessions.delete(sessionId);

    this.logger.info('Conversation session ended', {
      sessionId,
      userId: session.userId,
      platform: session.platform
    });
  }

  // Private helper methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPlatformCapabilities(platform: string): PlatformCapabilities {
    const baseCapabilities = {
      supportsText: true,
      supportsVoice: false,
      supportsImages: false,
      supportsFiles: false,
      supportsRealtime: false,
      supportsSmartHome: false,
      maxResponseTime: 5000,
      maxContentLength: 2000
    };

    switch (platform) {
      case 'web':
        return {
          ...baseCapabilities,
          supportsVoice: true,
          supportsImages: true,
          supportsFiles: true,
          supportsRealtime: true,
          supportsSmartHome: true,
          maxResponseTime: 3000
        };

      case 'mobile':
        return {
          ...baseCapabilities,
          supportsVoice: true,
          supportsImages: true,
          supportsFiles: true,
          supportsSmartHome: true,
          maxResponseTime: 2000
        };

      case 'alexa':
      case 'google':
      case 'apple':
        return {
          ...baseCapabilities,
          supportsVoice: true,
          supportsSmartHome: true,
          maxResponseTime: 800, // Voice platforms need faster response
          maxContentLength: 8000 // Voice can handle longer content
        };

      case 'api':
        return {
          ...baseCapabilities,
          supportsImages: true,
          supportsFiles: true,
          maxResponseTime: 10000,
          maxContentLength: 10000
        };

      default:
        return baseCapabilities;
    }
  }

  private convertToRouterRequest(message: UserMessage, session: ConversationSession): any {
    return {
      userId: session.userId,
      sessionId: session.sessionId,
      input: message.content,
      platform: session.platform,
      context: session.state.context,
      capabilities: session.capabilities
    };
  }

  private convertToUniversalResponse(routerResponse: any, session: ConversationSession): BotResponse {
    return {
      type: this.determineResponseType(routerResponse, session),
      content: routerResponse.content || routerResponse.speech || routerResponse.text,
      suggestions: routerResponse.suggestions || [],
      requiresInput: routerResponse.requiresInput !== false,
      conversationState: session.state,
      smartHomeActions: routerResponse.smartHomeActions || [],
      metadata: {
        responseTime: routerResponse.responseTime || 0,
        confidence: routerResponse.confidence || 1.0,
        agentsUsed: routerResponse.agentsUsed || ['router']
      }
    };
  }

  private determineResponseType(routerResponse: any, session: ConversationSession): 'text' | 'voice' | 'image' | 'card' | 'action' {
    if (routerResponse.type && ['text', 'voice', 'image', 'card', 'action'].includes(routerResponse.type)) {
      return routerResponse.type as 'text' | 'voice' | 'image' | 'card' | 'action';
    }

    if (session.capabilities.supportsVoice && routerResponse.speech) {
      return 'voice';
    }

    if (routerResponse.card || routerResponse.image) {
      return 'card';
    }

    return 'text';
  }

  private updateConversationState(session: ConversationSession, response: BotResponse): void {
    // Update conversation phase based on response content
    if (response.content.toString().includes('character')) {
      session.state.phase = 'character_creation';
    } else if (response.content.toString().includes('story')) {
      session.state.phase = 'story_creation';
    }

    // Update context with any new information
    if (response.conversationState) {
      session.state.context = {
        ...session.state.context,
        ...response.conversationState.context
      };
    }
  }

  private async transcribeAudio(
    audioData: KidAudioInput,
    childProfile?: ChildProfile,
    sessionId?: string
  ): Promise<{ 
    text: string; 
    confidence: number;
    inventedWords?: any[];
    emotionalContext?: any;
    developmentalStage?: any;
  }> {
    // If Kid Communication Intelligence is enabled, use it for enhanced transcription
    if (this.kidIntelligenceEnabled && this.kidIntelligence) {
      try {
        // First, get a basic transcription (this would come from your existing voice service)
        // For now, we'll use a placeholder, but in production this would call your actual transcription service
        const basicTranscription: TranscriptionResult = {
          text: "Placeholder transcription", // TODO: Replace with actual transcription service call
          confidence: 0.85,
          language: 'en'
        };

        // Enhance transcription with Kid Communication Intelligence
        const context = sessionId ? {
          sessionId,
          conversationHistory: this.activeSessions.get(sessionId || '')?.state.history || [],
          storyContext: this.activeSessions.get(sessionId || '')?.state.currentStory || null
        } : undefined;

        const enhanced = await this.kidIntelligence.enhanceTranscription(
          basicTranscription,
          audioData,
          childProfile,
          context
        );

        return {
          text: enhanced.text,
          confidence: enhanced.confidence,
          inventedWords: enhanced.inventedWords,
          emotionalContext: enhanced.emotionalContext,
          developmentalStage: enhanced.developmentalStage
        };
      } catch (error: any) {
        this.logger.warn('Transcription enhancement failed, using basic transcription', { error: error.message });
        // Fallback to basic transcription
        return {
          text: "Placeholder transcription",
          confidence: 0.85
        };
      }
    }

    // Fallback: Use basic transcription without enhancement
    return {
      text: "Placeholder transcription",
      confidence: 0.85
    };
  }

  private getEmotionFromContext(state: ConversationState): string {
    // Determine appropriate emotion based on conversation state
    if (state.phase === 'greeting') return 'excited';
    if (state.phase === 'character_creation') return 'curious';
    if (state.phase === 'story_creation') return 'engaging';
    return 'warm';
  }

  private convertChunkToUniversal(chunk: any, session: ConversationSession): ResponseChunk {
    return {
      type: 'text_chunk',
      content: chunk.content,
      isComplete: chunk.isComplete,
      metadata: {
        chunkIndex: chunk.index,
        totalChunks: chunk.total
      }
    };
  }

  // Agent getters (these would be injected in real implementation)
  private getVoiceService(): any {
    // Return existing voice synthesis service
    return null;
  }

  private getLibraryAgent(): any {
    // Return existing library agent
    return null;
  }

  private getContentAgent(): any {
    // Return existing content agent
    return null;
  }

  private getSmartHomeAgent(): any {
    // Return existing smart home agent
    return null;
  }

  private async getDefaultLibraryId(userId: string): Promise<string> {
    // Get user's default library
    return 'default-library-id';
  }
}

// Type definitions
interface AudioData {
  format: string;
  data: Buffer;
  duration: number;
}

interface AudioInput {
  format: string;
  data: Buffer;
  sampleRate: number;
}

interface ImageData {
  format: string;
  data: Buffer;
  width: number;
  height: number;
}

interface FileData {
  name: string;
  type: string;
  data: Buffer;
  size: number;
}

interface CardData {
  title: string;
  content: string;
  image?: string;
  actions?: CardAction[];
}

interface ActionData {
  type: string;
  payload: any;
}

interface ConversationState {
  phase: string;
  context: Record<string, any>;
  history: ConversationHistoryItem[];
  currentStory: any;
  currentCharacter: any;
}

interface ConversationHistoryItem {
  timestamp: string;
  userMessage: UserMessage;
  botResponse: BotResponse;
}

interface PlatformCapabilities {
  supportsText: boolean;
  supportsVoice: boolean;
  supportsImages: boolean;
  supportsFiles: boolean;
  supportsRealtime: boolean;
  supportsSmartHome: boolean;
  maxResponseTime: number;
  maxContentLength: number;
}

interface ResponseChunk {
  type: string;
  content: string;
  isComplete: boolean;
  metadata: any;
}

interface VoiceResponse {
  transcription: string;
  textResponse: string;
  audioResponse?: AudioData;
  conversationState: ConversationState;
  metadata: any;
}

interface VoiceConfig {
  voice: string;
  speed: number;
  emotion: string;
}

interface StoryCreationRequest {
  character: any;
  storyType: string;
}

interface SmartDeviceConfig {
  deviceType: string;
  userId: string;
  roomId: string;
}

interface DeviceConnection {
  deviceId: string;
  status: string;
}

interface ParentalControlConfig {
  enabled: boolean;
  ageRestrictions: any;
}

interface PrivacyConfig {
  dataRetention: string;
  consentLevel: string;
}

interface BrandingConfig {
  colors: any;
  logo: string;
}

interface FeatureFlags {
  voiceEnabled: boolean;
  smartHomeEnabled: boolean;
  kidIntelligenceEnabled?: boolean;
}

interface DeviceInfo {
  type: string;
  os: string;
  version: string;
}

interface LocationInfo {
  country: string;
  timezone: string;
}

interface CardAction {
  label: string;
  action: string;
  payload?: any;
}

interface SmartHomeAction {
  type: string;
  deviceId: string;
  action: any;
}