import { 
  AlexaTurnContext, 
  AlexaResponse, 
  AlexaHandoffRequest, 
  AlexaHandoffResponse,
  AlexaError,
  DeviceCapabilities,
  SupportedLocale,
  LocaleConfig
} from '../types/alexa';
import { ConversationContext, TurnContext } from '@alexa-multi-agent/shared-types';
import { ConversationStateManager } from './ConversationStateManager';
import { APLRenderer } from './APLRenderer';
import { StreamingResponseManager } from './StreamingResponseManager';
import { LocaleManager } from './LocaleManager';
import { VoiceResponseService } from './VoiceResponseService';
import { ConversationalFlowManager } from './ConversationalFlowManager';
import { AccountLinkingIntegration } from './AccountLinkingIntegration';
import { createLogger } from '../utils/logger';

export class AlexaHandoffHandler {
  private logger = createLogger('alexa-handoff-handler');
  private conversationStateManager: ConversationStateManager;
  private aplRenderer: APLRenderer;
  private streamingManager: StreamingResponseManager;
  private localeManager: LocaleManager;
  private voiceResponseService: VoiceResponseService;
  private conversationalFlowManager: ConversationalFlowManager;
  private accountLinkingIntegration: AccountLinkingIntegration;

  constructor(
    conversationStateManager: ConversationStateManager,
    aplRenderer: APLRenderer,
    streamingManager: StreamingResponseManager,
    localeManager: LocaleManager,
    voiceResponseService: VoiceResponseService,
    conversationalFlowManager: ConversationalFlowManager,
    accountLinkingIntegration: AccountLinkingIntegration
  ) {
    this.conversationStateManager = conversationStateManager;
    this.aplRenderer = aplRenderer;
    this.streamingManager = streamingManager;
    this.localeManager = localeManager;
    this.voiceResponseService = voiceResponseService;
    this.conversationalFlowManager = conversationalFlowManager;
    this.accountLinkingIntegration = accountLinkingIntegration;
  }

  /**
   * Main handoff handler for Alexa+ Multi-Agent SDK
   * Processes turn context from Alexa and returns appropriate response
   */
  async handleHandoff(request: AlexaHandoffRequest): Promise<AlexaHandoffResponse> {
    const startTime = Date.now();
    const { turnContext } = request;

    try {
      this.logger.info('Processing Alexa handoff', {
        sessionId: turnContext.sessionId,
        userId: turnContext.userId,
        locale: turnContext.locale,
        deviceType: turnContext.deviceType,
        input: turnContext.input
      });

      // Validate locale support
      await this.validateLocaleSupport(turnContext.locale as SupportedLocale);

      // Load or create conversation context
      const conversationContext = await this.loadConversationContext(turnContext);

      // Convert Alexa turn context to internal format
      const internalTurnContext = this.convertToInternalContext(turnContext, conversationContext);

      // Process the conversation turn
      const response = await this.processConversationTurn(internalTurnContext, turnContext.deviceCapabilities);

      // Update conversation state
      const updatedContext = await this.updateConversationState(conversationContext, internalTurnContext, response);

      // Build Alexa response
      const alexaResponse = await this.buildAlexaResponse(response, turnContext, updatedContext);

      const processingTime = Date.now() - startTime;
      
      this.logger.info('Alexa handoff completed', {
        sessionId: turnContext.sessionId,
        processingTime,
        responseLength: alexaResponse.speech.length,
        hasAPL: !!alexaResponse.aplDocument,
        hasAudio: !!alexaResponse.audioStream
      });

      return {
        response: alexaResponse,
        conversationContext: updatedContext,
        shouldContinue: !alexaResponse.shouldEndSession
      };

    } catch (error) {
      this.logger.error('Alexa handoff failed', {
        sessionId: turnContext.sessionId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      });

      return this.handleError(error, turnContext);
    }
  }

  /**
   * Validates that the requested locale is supported
   */
  private async validateLocaleSupport(locale: SupportedLocale): Promise<void> {
    if (!this.localeManager.isSupported(locale)) {
      throw new Error(`Locale ${locale} is not supported`);
    }
  }

  /**
   * Loads existing conversation context or creates new one
   */
  private async loadConversationContext(turnContext: AlexaTurnContext): Promise<ConversationContext> {
    try {
      const existingContext = await this.conversationStateManager.getContext(turnContext.sessionId);
      if (existingContext) {
        return existingContext;
      }
    } catch (error) {
      this.logger.warn('Failed to load existing conversation context', {
        sessionId: turnContext.sessionId,
        error: error.message
      });
    }

    // Create new conversation context
    return this.conversationStateManager.createContext({
      sessionId: turnContext.sessionId,
      userId: turnContext.userId,
      channel: 'alexa',
      locale: turnContext.locale as SupportedLocale,
      deviceCapabilities: turnContext.deviceCapabilities
    });
  }

  /**
   * Converts Alexa turn context to internal conversation format
   */
  private convertToInternalContext(
    alexaContext: AlexaTurnContext, 
    conversationContext: ConversationContext
  ): TurnContext {
    return {
      sessionId: alexaContext.sessionId,
      userId: alexaContext.userId,
      input: alexaContext.input,
      conversationHistory: conversationContext.conversationHistory,
      metadata: {
        channel: 'alexa',
        locale: alexaContext.locale,
        deviceType: alexaContext.deviceType,
        deviceCapabilities: alexaContext.deviceCapabilities,
        alexaPersonId: alexaContext.alexaPersonId,
        customerEmail: alexaContext.customerEmail,
        ...alexaContext.metadata
      }
    };
  }

  /**
   * Processes the conversation turn through the conversational flow manager
   */
  private async processConversationTurn(
    turnContext: TurnContext, 
    deviceCapabilities: DeviceCapabilities
  ): Promise<any> {
    const maxResponseTime = Math.min(deviceCapabilities.maxResponseTime, 800); // 800ms requirement
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Response timeout')), maxResponseTime);
    });

    const processingPromise = this.processWithFlowManager(turnContext);

    try {
      return await Promise.race([processingPromise, timeoutPromise]);
    } catch (error) {
      if (error.message === 'Response timeout') {
        this.logger.warn('Response timeout, providing fallback', {
          sessionId: turnContext.sessionId,
          maxResponseTime
        });
        return this.generateFallbackResponse(turnContext);
      }
      throw error;
    }
  }

  /**
   * Processes conversation through the flow manager
   */
  private async processWithFlowManager(turnContext: TurnContext): Promise<any> {
    // Get conversation context
    const conversationContext = await this.conversationStateManager.getContext(turnContext.sessionId);
    if (!conversationContext) {
      throw new Error('Conversation context not found');
    }

    // Convert TurnContext to AlexaTurnContext for flow manager
    const alexaTurnContext: AlexaTurnContext = {
      sessionId: turnContext.sessionId,
      userId: turnContext.userId,
      alexaPersonId: turnContext.metadata.alexaPersonId || '',
      customerEmail: turnContext.metadata.customerEmail,
      input: turnContext.input,
      locale: turnContext.metadata.locale || 'en-US',
      deviceType: turnContext.metadata.deviceType || 'voice',
      deviceCapabilities: turnContext.metadata.deviceCapabilities || {
        hasScreen: false,
        hasAudio: true,
        supportsAPL: false,
        supportsStreaming: true,
        maxResponseTime: 800
      },
      conversationHistory: conversationContext.conversationHistory,
      metadata: {
        requestId: `req-${Date.now()}`,
        timestamp: new Date().toISOString(),
        locale: turnContext.metadata.locale || 'en-US',
        deviceId: turnContext.metadata.deviceId || 'unknown',
        applicationId: turnContext.metadata.applicationId || 'storytailor',
        sessionAttributes: {}
      }
    };

    // Handle account linking first
    const accountLinkingResult = await this.accountLinkingIntegration.handleAccountLinking(
      alexaTurnContext,
      conversationContext
    );

    // Check if we need to handle account linking
    if (!accountLinkingResult.isAuthenticated) {
      if (accountLinkingResult.requiresLinking) {
        return {
          speech: accountLinkingResult.linkingInstructions || "I need to connect to your account first.",
          nextPrompt: "Please say 'link my account' to get started.",
          shouldEndSession: false,
          conversationPhase: 'authentication',
          requiresAccountLinking: true
        };
      } else if (accountLinkingResult.linkingInstructions) {
        // Account linking in progress, waiting for verification
        return {
          speech: accountLinkingResult.linkingInstructions,
          nextPrompt: "Please say your verification code when you're ready.",
          shouldEndSession: false,
          conversationPhase: 'verification',
          voiceCode: accountLinkingResult.voiceCode,
          magicLinkUrl: accountLinkingResult.magicLinkUrl,
          qrCodeUrl: accountLinkingResult.qrCodeUrl,
          expiresAt: accountLinkingResult.expiresAt
        };
      }
    }

    // Check for voice code verification
    if (this.isVoiceCodeInput(turnContext.input)) {
      const voiceCode = this.extractVoiceCode(turnContext.input);
      const verificationResult = await this.accountLinkingIntegration.processVoiceCodeVerification(
        voiceCode,
        alexaTurnContext,
        conversationContext
      );

      if (verificationResult.isAuthenticated) {
        return {
          speech: "Great! Your account is now connected. Let's create an amazing story together!",
          nextPrompt: "What would you like to name your character?",
          shouldEndSession: false,
          conversationPhase: 'character',
          authenticationComplete: true
        };
      } else {
        return {
          speech: verificationResult.linkingInstructions || "That code didn't work. Please try again.",
          nextPrompt: "Please say your verification code.",
          shouldEndSession: false,
          conversationPhase: 'verification'
        };
      }
    }

    // Manage session state
    await this.accountLinkingIntegration.manageSessionState(alexaTurnContext, conversationContext);

    // Process through conversational flow manager
    const conversationFlow = await this.conversationalFlowManager.manageConversationFlow(
      conversationContext,
      alexaTurnContext,
      turnContext.input
    );

    // Convert flow response to expected format
    const primaryPrompt = conversationFlow.prompts[0];
    
    return {
      speech: primaryPrompt.text,
      nextPrompt: primaryPrompt.followUpPrompt,
      shouldEndSession: false,
      conversationPhase: conversationFlow.currentPhase,
      nextPhase: conversationFlow.nextPhase,
      confirmationRequired: conversationFlow.confirmationRequired,
      assetGenerationTrigger: conversationFlow.assetGenerationTrigger,
      expectedInputs: conversationFlow.expectedInputs,
      storyMood: this.extractStoryMood(conversationContext),
      promptType: primaryPrompt.type,
      choices: primaryPrompt.choices,
      userId: accountLinkingResult.userId
    };
  }

  /**
   * Delegates processing to the Router (placeholder for now)
   */
  private async delegateToRouter(turnContext: TurnContext): Promise<any> {
    // TODO: Integrate with actual Router implementation
    // For now, return a basic response structure
    return {
      speech: "I'm excited to help you create amazing stories! Let's start by making a character together.",
      shouldEndSession: false,
      conversationPhase: 'character',
      nextPrompt: "What would you like to name your character?"
    };
  }

  /**
   * Generates fallback response when processing times out
   */
  private generateFallbackResponse(turnContext: TurnContext): any {
    return {
      speech: "I'm thinking about your story. Let me ask you something while I process that.",
      shouldEndSession: false,
      conversationPhase: turnContext.metadata.conversationPhase || 'character',
      nextPrompt: "Can you tell me more about what kind of story you'd like to create?"
    };
  }

  /**
   * Updates conversation state with new turn information
   */
  private async updateConversationState(
    context: ConversationContext,
    turnContext: TurnContext,
    response: any
  ): Promise<ConversationContext> {
    // Add user turn to history
    context.conversationHistory.push({
      id: `turn-${Date.now()}-user`,
      timestamp: new Date().toISOString(),
      speaker: 'user',
      content: turnContext.input,
      intent: response.intent,
      confidence: response.confidence
    });

    // Add agent response to history
    context.conversationHistory.push({
      id: `turn-${Date.now()}-agent`,
      timestamp: new Date().toISOString(),
      speaker: 'agent',
      content: response.speech
    });

    // Update conversation phase if changed
    if (response.conversationPhase) {
      context.currentPhase = response.conversationPhase;
    }

    // Update last activity
    context.lastActivity = new Date().toISOString();

    // Save updated context
    await this.conversationStateManager.saveContext(context);

    return context;
  }

  /**
   * Builds the final Alexa response with APL and audio if supported
   */
  private async buildAlexaResponse(
    response: any,
    turnContext: AlexaTurnContext,
    conversationContext: ConversationContext
  ): Promise<AlexaResponse> {
    // Generate voice response with ElevenLabs
    let voiceAudioData: Buffer | undefined;
    let voiceCost = 0;

    try {
      if (turnContext.deviceCapabilities.hasAudio) {
        const voiceResponse = await this.voiceResponseService.generateVoiceResponse({
          text: response.speech,
          emotion: this.determineEmotionFromContext(conversationContext, response),
          childAge: this.extractChildAge(conversationContext),
          locale: turnContext.locale as SupportedLocale,
          sessionId: turnContext.sessionId,
          userId: turnContext.userId,
          conversationPhase: conversationContext.currentPhase,
          storyMood: response.storyMood
        });

        voiceAudioData = voiceResponse.audioData;
        voiceCost = voiceResponse.cost;

        this.logger.info('Generated voice response', {
          sessionId: turnContext.sessionId,
          duration: voiceResponse.duration,
          cost: voiceCost
        });
      }
    } catch (error) {
      this.logger.warn('Failed to generate voice response, using text fallback', {
        sessionId: turnContext.sessionId,
        error: error.message
      });
    }

    const alexaResponse: AlexaResponse = {
      speech: response.speech,
      reprompt: response.nextPrompt,
      shouldEndSession: response.shouldEndSession || false,
      sessionAttributes: {
        conversationPhase: conversationContext.currentPhase,
        storyId: conversationContext.storyId,
        characterIds: conversationContext.characterIds,
        lastActivity: conversationContext.lastActivity,
        voiceCost: voiceCost
      },
      responseTime: Date.now()
    };

    // Add APL document for screen devices
    if (turnContext.deviceCapabilities.hasScreen && turnContext.deviceCapabilities.supportsAPL) {
      try {
        alexaResponse.aplDocument = await this.aplRenderer.renderForPhase(
          conversationContext.currentPhase,
          response,
          conversationContext
        );
      } catch (error) {
        this.logger.warn('Failed to render APL document', {
          sessionId: turnContext.sessionId,
          error: error.message
        });
      }
    }

    // Add streaming audio if supported and generated
    if (turnContext.deviceCapabilities.supportsStreaming && voiceAudioData) {
      try {
        alexaResponse.audioStream = await this.streamingManager.createAudioStream(
          this.createAudioUrl(voiceAudioData, turnContext.sessionId),
          `audio-${turnContext.sessionId}-${Date.now()}`,
          0
        );
      } catch (error) {
        this.logger.warn('Failed to create audio stream', {
          sessionId: turnContext.sessionId,
          error: error.message
        });
      }
    }

    return alexaResponse;
  }

  /**
   * Handles errors and returns appropriate error response
   */
  private handleError(error: any, turnContext: AlexaTurnContext): AlexaHandoffResponse {
    const errorResponse: AlexaResponse = {
      speech: "I'm having trouble right now, but let's try again. What would you like to do?",
      reprompt: "You can say 'create a story' or 'tell me a story' to get started.",
      shouldEndSession: false,
      sessionAttributes: {},
      responseTime: Date.now()
    };

    // Create minimal conversation context for error case
    const errorContext: ConversationContext = {
      sessionId: turnContext.sessionId,
      userId: turnContext.userId,
      characterIds: [],
      currentPhase: 'character',
      conversationHistory: [],
      emotionalState: {
        currentMood: 'neutral',
        confidence: 0.5,
        recentEmotions: [],
        patterns: []
      },
      preferences: {
        voiceSettings: {
          voice: 'default',
          speed: 1.0,
          emotion: 'gentle',
          volume: 0.8,
          clarity: 'high'
        },
        storyPreferences: {
          favoriteGenres: [],
          preferredLength: 'medium',
          complexityLevel: 'standard'
        },
        accessibilitySettings: {
          speechProcessingDelay: 0,
          vocabularyLevel: 'standard',
          attentionSpan: 300,
          preferredInteractionStyle: 'detailed',
          assistiveTechnology: []
        }
      },
      lastActivity: new Date().toISOString()
    };

    return {
      response: errorResponse,
      conversationContext: errorContext,
      shouldContinue: true
    };
  }

  /**
   * Determines appropriate emotion based on conversation context
   */
  private determineEmotionFromContext(
    context: ConversationContext, 
    response: any
  ): 'excited' | 'calm' | 'mysterious' | 'gentle' {
    // Base emotion on conversation phase
    switch (context.currentPhase) {
      case 'character':
        return 'excited'; // Enthusiastic about character creation
      case 'story':
        return response.storyMood === 'mysterious' ? 'mysterious' : 'excited';
      case 'editing':
        return 'gentle'; // Supportive during editing
      case 'finalization':
        return 'excited'; // Celebratory at completion
      default:
        return 'gentle';
    }
  }

  /**
   * Extracts child age from conversation context or metadata
   */
  private extractChildAge(context: ConversationContext): number | undefined {
    // This would typically come from user profile or conversation metadata
    // For now, return a default age or extract from context if available
    return context.metadata?.childAge || undefined;
  }

  /**
   * Creates audio URL for streaming (placeholder implementation)
   */
  private createAudioUrl(audioData: Buffer, sessionId: string): string {
    // In production, this would upload to S3/CDN and return URL
    // For now, return a placeholder URL
    return `https://audio-cdn.storytailor.com/sessions/${sessionId}/audio.pcm`;
  }

  /**
   * Extracts story mood from conversation context
   */
  private extractStoryMood(context: ConversationContext): string | undefined {
    // Extract mood from story choices or emotional state
    const emotionalState = context.emotionalState;
    
    switch (emotionalState.currentMood) {
      case 'happy':
        return 'happy';
      case 'excited':
        return 'adventurous';
      case 'calm':
        return 'peaceful';
      case 'neutral':
        return 'adventurous'; // Default for stories
      default:
        return 'adventurous';
    }
  }

  /**
   * Checks if input contains a voice code
   */
  private isVoiceCodeInput(input: string): boolean {
    // Check for 6-digit codes or common voice code patterns
    const voiceCodePattern = /\b\d{6}\b/;
    const codeKeywords = ['code', 'verification', 'verify'];
    
    return voiceCodePattern.test(input) || 
           codeKeywords.some(keyword => input.toLowerCase().includes(keyword));
  }

  /**
   * Extracts voice code from user input
   */
  private extractVoiceCode(input: string): string {
    // Extract 6-digit code from input
    const match = input.match(/\b(\d{6})\b/);
    return match ? match[1] : input.replace(/\D/g, '').substring(0, 6);
  }
}