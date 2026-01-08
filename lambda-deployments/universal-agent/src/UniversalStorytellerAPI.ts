// Universal Storyteller API that can be embedded anywhere
// Router imported dynamically to avoid module resolution issues in Lambda
// import { Router } from '@alexa-multi-agent/router';
// @ts-ignore - Event-system is bundled at runtime, types may not be available during compilation
import { EventPublisher } from '@alexa-multi-agent/event-system';
import { Logger } from 'winston';
// Optional import - kid-communication-intelligence may not be available in all deployments
// Type definitions for optional module
type KidCommunicationIntelligenceServiceType = any;
type KidAudioInputType = any;
type TranscriptionResultType = any;
type ChildProfileType = any;

let KidCommunicationIntelligenceService: KidCommunicationIntelligenceServiceType | null = null;
let KidAudioInputModule: KidAudioInputType | null = null;
let TranscriptionResultModule: TranscriptionResultType | null = null;
let ChildProfileModule: ChildProfileType | null = null;

try {
  const kidIntelligenceModule = require('@alexa-multi-agent/kid-communication-intelligence');
  KidCommunicationIntelligenceService = kidIntelligenceModule.KidCommunicationIntelligenceService || kidIntelligenceModule.default?.KidCommunicationIntelligenceService;
  KidAudioInputModule = kidIntelligenceModule.AudioInput;
  TranscriptionResultModule = kidIntelligenceModule.TranscriptionResult;
  ChildProfileModule = kidIntelligenceModule.ChildProfile;
} catch (error) {
  // Module not available - kid intelligence features will be disabled
}

// Type aliases for use in code (using any to handle optional module)
type KidAudioInput = any;
type TranscriptionResult = any;
type ChildProfile = any;
// @ts-ignore - api-contract may not be available during compilation
// FEATURES will be defined inline if module not available
let FEATURES: any = null;
try {
  // Try require first (CommonJS) - try both package names
  // @ts-ignore - Dynamic require may fail
  let apiContractModule: any = null;
  try {
    // Try @storytailor/api-contract first (workspace name)
    apiContractModule = require('@storytailor/api-contract');
  } catch (e1: any) {
    try {
      // Fallback to legacy scope if present
      apiContractModule = require('@alexa-multi-agent/api-contract');
    } catch (e2: any) {
      try {
        // Final fallback to local source during dev/smoke
        apiContractModule = require('../api-contract/src');
      } catch (_e3: any) {
        // If all fail, use inline definition
        throw e2;
      }
    }
  }
  FEATURES = apiContractModule.FEATURES || apiContractModule.default?.FEATURES || apiContractModule;
} catch (error: any) {
  // Define FEATURES inline if module not available
  // Suppress ES module warnings - this is expected in Lambda environment
  if (error?.message && !error.message.includes('ES module') && !error.message.includes('Cannot find module')) {
    // Only log if it's not an ES module or module not found error (expected)
  }
  FEATURES = {
    CONVERSATION: 'conversation',
    STORY_CREATION: 'story_creation',
    CHARACTER_MANAGEMENT: 'character_management',
    LIBRARY_MANAGEMENT: 'library_management',
    EMOTION_TRACKING: 'emotion_tracking',
    VOICE_SYNTHESIS: 'voice_synthesis'
  };
}
// @ts-ignore - AWS SDK may not be available during type checking
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand, LanguageCode } from '@aws-sdk/client-transcribe';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

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
    originalAudio?: boolean;
    confidence?: number;
    inventedWords?: string[];
    emotionalContext?: string;
    developmentalStage?: string;
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
  private kidIntelligence: any = null;
  private kidIntelligenceEnabled: boolean = false;
  private transcribeClient: TranscribeClient;
  private s3Client: S3Client;
  private transcriptionBucket: string;

  constructor(
    router: any, // Router loaded dynamically
    eventPublisher: EventPublisher,
    logger: Logger
  ) {
    this.router = router;
    this.eventPublisher = eventPublisher;
    this.logger = logger;
    
    // Initialize AWS Transcribe and S3 clients for transcription
    const region = process.env.AWS_REGION || 'us-east-2';
    this.transcribeClient = new TranscribeClient({ region });
    this.s3Client = new S3Client({ region });
    this.transcriptionBucket = process.env.TRANSCRIPTION_BUCKET || 'storytailor-transcriptions-production';
    
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
      
      if (supabaseUrl && supabaseKey && KidCommunicationIntelligenceService) {
        this.kidIntelligence = new (KidCommunicationIntelligenceService as any)({
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

    // Persist session to database if supabase client is available
    // Note: UniversalStorytellerAPI doesn't have direct access to supabase,
    // so persistence is handled by RESTAPIGateway after session creation

    // Log session start
    if (this.eventPublisher) {
      await this.eventPublisher.publishEvent(
        'com.storytailor.conversation.started',
        {
          sessionId,
          userId,
          platform: config.platform,
          capabilities: session.capabilities
        }
      );
    }

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
      // Router can be either Router (with route()) or PlatformAwareRouter (with handleRequest())
      if (!this.router) {
        throw new Error('Router not initialized');
      }

      let routerResponse: any;
      try {
        // For 'api' platform, use base Router.route() instead of PlatformAwareRouter.handleRequest()
        // because PlatformAwareRouter expects platform-specific adapters that don't exist for 'api'
        if (session.platform === 'api' && this.router.route) {
          // Base Router - convert to TurnContext format
          const turnContext = {
            userId: routerRequest.userId,
            sessionId: routerRequest.sessionId,
            requestId: `req_${Date.now()}`,
            userInput: typeof routerRequest.input === 'string' ? routerRequest.input : String(routerRequest.input),
            channel: 'api' as any,
            locale: 'en-US',
            timestamp: new Date().toISOString(),
            metadata: routerRequest.context || {}
          };
          routerResponse = await this.router.route(turnContext);
        } else if (this.router.handleRequest) {
          // PlatformAwareRouter - for voice platforms (alexa, google, etc.)
          routerResponse = await this.router.handleRequest(routerRequest, session.platform as any);
        } else if (this.router.route) {
          // Base Router - convert to TurnContext format
          const turnContext = {
            userId: routerRequest.userId,
            sessionId: routerRequest.sessionId,
            requestId: `req_${Date.now()}`,
            userInput: typeof routerRequest.input === 'string' ? routerRequest.input : String(routerRequest.input),
            channel: routerRequest.platform as any,
            locale: 'en-US',
            timestamp: new Date().toISOString(),
            metadata: routerRequest.context || {}
          };
          routerResponse = await this.router.route(turnContext);
        } else {
          throw new Error('Router does not have handleRequest or route method');
        }
      } catch (routerError: any) {
        this.logger.error('Router error during message processing', {
          error: routerError?.message || String(routerError),
          sessionId,
          userId: session.userId,
          platform: session.platform,
          routerType: this.router.handleRequest ? 'PlatformAwareRouter' : this.router.route ? 'Router' : 'Unknown'
        });
        throw routerError;
      }

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
  async *streamResponse(sessionId: string, message: UserMessage): AsyncIterableIterator<ResponseChunk> {
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
        originalAudio: true,
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
    // Handle both Router.route() response (CustomerResponse) and PlatformAwareRouter.handleRequest() response
    const content = routerResponse.content || 
                    routerResponse.message || 
                    routerResponse.speechText || 
                    routerResponse.speech || 
                    routerResponse.text || 
                    'I\'m sorry, I didn\'t understand that.';
    
    // Create a clean copy of conversation state without circular references
    // Use JSON serialization to break circular references
    let cleanState: any;
    try {
      // Create a replacer function to exclude conversationState from botResponse to avoid circular reference
      const replacer = (key: string, value: any) => {
        if (key === 'conversationState' && typeof value === 'object') {
          return undefined; // Exclude conversationState to break circular reference
        }
        return value;
      };
      cleanState = JSON.parse(JSON.stringify(session.state, replacer));
    } catch (error) {
      // Fallback: create a simple state without history if serialization fails
      cleanState = {
        phase: session.state.phase,
        context: { ...session.state.context },
        history: [],
        currentStory: session.state.currentStory,
        currentCharacter: session.state.currentCharacter
      };
    }
    
    return {
      type: this.determineResponseType(routerResponse, session),
      content,
      suggestions: routerResponse.suggestions || [],
      requiresInput: routerResponse.requiresInput !== false && routerResponse.shouldEndSession !== true,
      conversationState: cleanState,
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

    // Check for voice response indicators
    if (session.capabilities.supportsVoice && (routerResponse.speech || routerResponse.speechText || routerResponse.audioUrl)) {
      return 'voice';
    }

    // Check for card/visual response indicators
    if (routerResponse.card || routerResponse.image || routerResponse.visualElements) {
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
    try {
      // Step 1: Get basic transcription using AWS Transcribe
      const basicTranscription = await this.getBasicTranscription(audioData, sessionId);

      // Step 2: If Kid Communication Intelligence is enabled, enhance the transcription
      if (this.kidIntelligenceEnabled && this.kidIntelligence) {
        try {
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
            text: basicTranscription.text,
            confidence: basicTranscription.confidence || 0.85
          };
        }
      }

      // Return basic transcription without enhancement
      return {
        text: basicTranscription.text,
        confidence: basicTranscription.confidence || 0.85
      };
    } catch (error: any) {
      this.logger.error('Transcription failed', { error: error.message });
      // Final fallback
      return {
        text: '',
        confidence: 0
      };
    }
  }

  /**
   * Get basic transcription using AWS Transcribe
   */
  private async getBasicTranscription(
    audioData: KidAudioInput,
    sessionId?: string
  ): Promise<TranscriptionResult> {
    try {
      // Convert audio data to buffer
      let audioBuffer: Buffer;
      if (audioData instanceof Buffer) {
        audioBuffer = audioData;
      } else if (typeof audioData === 'string') {
        // Assume base64 encoded
        audioBuffer = Buffer.from(audioData, 'base64');
      } else if (audioData && typeof (audioData as any).data === 'string') {
        audioBuffer = Buffer.from((audioData as any).data, 'base64');
      } else {
        throw new Error('Unsupported audio data format');
      }

      // Upload audio to S3 for transcription
      const audioKey = `transcriptions/${sessionId || 'temp'}-${Date.now()}.${this.getAudioFormat(audioData)}`;
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.transcriptionBucket,
        Key: audioKey,
        Body: audioBuffer,
        ContentType: this.getContentType(audioData)
      }));

      const audioUri = `s3://${this.transcriptionBucket}/${audioKey}`;
      const jobName = `transcribe-${sessionId || 'temp'}-${Date.now()}`;

      // Start transcription job
      const startCommand = new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        Media: { MediaFileUri: audioUri },
        MediaFormat: this.getMediaFormat(audioData),
        LanguageCode: (this.detectLanguageFromContext(audioData, sessionId) as LanguageCode) || LanguageCode.EN_US,
        Settings: {
          ShowSpeakerLabels: false,
          MaxAlternatives: 1
        }
      });

      await this.transcribeClient.send(startCommand);

      // Wait for transcription to complete (with timeout)
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();
      let jobStatus = 'IN_PROGRESS';

      while (jobStatus === 'IN_PROGRESS' && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        const getCommand = new GetTranscriptionJobCommand({ TranscriptionJobName: jobName });
        const jobResponse = await this.transcribeClient.send(getCommand);
        jobStatus = jobResponse.TranscriptionJob?.TranscriptionJobStatus || 'FAILED';

        if (jobStatus === 'COMPLETED') {
          // Get transcription result from S3
          const transcriptUri = jobResponse.TranscriptionJob?.Transcript?.TranscriptFileUri;
          if (transcriptUri) {
            const transcriptKey = transcriptUri.split(`${this.transcriptionBucket}/`)[1];
            const getObjectCommand = new GetObjectCommand({
              Bucket: this.transcriptionBucket,
              Key: transcriptKey
            });
            const transcriptResponse = await this.s3Client.send(getObjectCommand);
            
            let transcriptData = '';
            if (transcriptResponse.Body instanceof Readable) {
              const chunks: Buffer[] = [];
              for await (const chunk of transcriptResponse.Body) {
                chunks.push(Buffer.from(chunk));
              }
              transcriptData = Buffer.concat(chunks).toString('utf-8');
            }

            const transcriptJson = JSON.parse(transcriptData);
            const text = transcriptJson.results?.transcripts?.[0]?.transcript || '';
            const confidence = transcriptJson.results?.items?.[0]?.alternatives?.[0]?.confidence || 0.85;

            // Cleanup: Delete temporary files
            try {
              await this.s3Client.send(new DeleteObjectCommand({
                Bucket: this.transcriptionBucket,
                Key: audioKey
              }));
              await this.s3Client.send(new DeleteObjectCommand({
                Bucket: this.transcriptionBucket,
                Key: transcriptKey
              }));
            } catch (cleanupError) {
              this.logger.warn('Failed to cleanup transcription files', { error: cleanupError });
            }

            return {
              text,
              confidence,
              language: 'en'
            };
          }
        } else if (jobStatus === 'FAILED') {
          throw new Error(`Transcription job failed: ${jobResponse.TranscriptionJob?.FailureReason}`);
        }
      }

      // Timeout or still in progress
      throw new Error('Transcription job timed out or did not complete');
    } catch (error: any) {
      this.logger.error('AWS Transcribe failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get audio format from audio data
   */
  private getAudioFormat(audioData: KidAudioInput): string {
    // Default to wav, but could be enhanced to detect format
    if (audioData && typeof (audioData as any).format === 'string') {
      return (audioData as any).format;
    }
    return 'wav';
  }

  /**
   * Get content type for S3 upload
   */
  private getContentType(audioData: KidAudioInput): string {
    const format = this.getAudioFormat(audioData);
    const contentTypes: Record<string, string> = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac'
    };
    return contentTypes[format] || 'audio/wav';
  }

  /**
   * Get media format for Transcribe
   */
  private getMediaFormat(audioData: KidAudioInput): 'mp3' | 'mp4' | 'wav' | 'flac' | 'ogg' | 'amr' | 'webm' {
    const format = this.getAudioFormat(audioData).toLowerCase();
    const validFormats: Record<string, 'mp3' | 'mp4' | 'wav' | 'flac' | 'ogg' | 'amr' | 'webm'> = {
      'mp3': 'mp3',
      'mp4': 'mp4',
      'wav': 'wav',
      'flac': 'flac',
      'ogg': 'ogg',
      'amr': 'amr',
      'webm': 'webm'
    };
    return validFormats[format] || 'wav';
  }

  /**
   * Detect language from audio context, session, or user preferences
   */
  private detectLanguageFromContext(
    audioData: KidAudioInput,
    sessionId?: string
  ): string {
    // Check session preferences
    if (sessionId) {
      const session = this.activeSessions.get(sessionId);
      if (session && session.state && (session.state as any).language) {
        return this.mapLanguageToTranscribeCode((session.state as any).language);
      }
    }

    // Check audio metadata if available
    if (audioData && typeof (audioData as any).language === 'string') {
      return this.mapLanguageToTranscribeCode((audioData as any).language);
    }

    // Default to English
    return 'en-US';
  }

  /**
   * Map language code to AWS Transcribe language code format
   */
  private mapLanguageToTranscribeCode(language: string): string {
    const languageMap: Record<string, string> = {
      'en': 'en-US',
      'es': 'es-US',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-BR',
      'ja': 'ja-JP',
      'zh': 'zh-CN',
      'ko': 'ko-KR',
      'ar': 'ar-SA',
      'hi': 'hi-IN',
      'ru': 'ru-RU'
    };

    // Check if already in Transcribe format
    if (language.includes('-')) {
      return language;
    }

    // Map to Transcribe format
    return languageMap[language.toLowerCase()] || 'en-US';
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

export interface VoiceResponse {
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

export interface StoryCreationRequest {
  character: any;
  storyType: string;
}

export interface SmartDeviceConfig {
  deviceType: string;
  userId: string;
  roomId: string;
}

export interface DeviceConnection {
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