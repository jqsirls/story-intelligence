import { Logger } from 'winston';
import {
  ConversationIntelligenceConfig,
  ConversationAnalysis,
  MultiModalIntent,
  DevelopmentalAssessment,
  PersonalizationInsights,
  ConversationQuality,
  ConversationRecommendations,
  PersonalizationProfile,
  ConversationMemory,
  DevelopmentalContext,
  ConversationIntelligenceError,
  ConversationIntelligenceErrorCode
} from './types';
import { NaturalLanguageUnderstanding } from './services/NaturalLanguageUnderstanding';
import { DevelopmentalPsychologyIntegration } from './services/DevelopmentalPsychologyIntegration';
import { ContextualMemoryPersonalization } from './services/ContextualMemoryPersonalization';

/**
 * Main Conversation Intelligence Agent that orchestrates advanced natural language understanding,
 * developmental psychology integration, and contextual memory personalization
 */
export class ConversationIntelligenceAgent {
  private nluService: NaturalLanguageUnderstanding;
  private developmentalService: DevelopmentalPsychologyIntegration;
  private personalizationService: ContextualMemoryPersonalization;
  private isInitialized = false;

  constructor(
    private config: ConversationIntelligenceConfig,
    private logger: Logger
  ) {
    this.nluService = new NaturalLanguageUnderstanding(config, logger);
    this.developmentalService = new DevelopmentalPsychologyIntegration(config, logger);
    this.personalizationService = new ContextualMemoryPersonalization(config, logger);

    this.logger.info('ConversationIntelligenceAgent initialized');
  }

  /**
   * Initialize the agent and all services
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing ConversationIntelligenceAgent...');

      // Initialize personalization service (needs Redis connection)
      await this.personalizationService.initialize();

      this.isInitialized = true;
      this.logger.info('ConversationIntelligenceAgent initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize ConversationIntelligenceAgent', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Shutdown the agent gracefully
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down ConversationIntelligenceAgent...');

      await this.personalizationService.shutdown();

      this.isInitialized = false;
      this.logger.info('ConversationIntelligenceAgent shutdown completed');

    } catch (error) {
      this.logger.error('Error during ConversationIntelligenceAgent shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Perform comprehensive conversation analysis
   */
  async analyzeConversation(
    userInput: string,
    context: {
      userId: string;
      conversationHistory: string[];
      voiceData?: any;
      userAge?: number;
      lastSystemResponse?: string;
      userProfile?: PersonalizationProfile;
    }
  ): Promise<ConversationAnalysis> {
    this.ensureInitialized();

    try {
      this.logger.debug('Analyzing conversation', {
        userId: context.userId,
        inputLength: userInput.length,
        historyLength: context.conversationHistory.length,
        hasVoiceData: !!context.voiceData,
      });

      // Step 1: Multi-modal intent analysis
      const intentAnalysis = await this.nluService.analyzeMultiModalIntent(
        userInput,
        context.voiceData,
        {
          conversationHistory: context.conversationHistory,
          userProfile: context.userProfile,
          userAge: context.userAge,
          lastSystemResponse: context.lastSystemResponse,
        }
      );

      // Step 2: Developmental assessment
      const developmentalAssessment = await this.performDevelopmentalAssessment(
        userInput,
        context.conversationHistory,
        context.userAge,
        intentAnalysis
      );

      // Step 3: Personalization insights
      const personalizationInsights = await this.generatePersonalizationInsights(
        context.userId,
        context.userProfile,
        intentAnalysis,
        developmentalAssessment
      );

      // Step 4: Conversation quality assessment
      const conversationQuality = await this.assessConversationQuality(
        userInput,
        context.lastSystemResponse || '',
        intentAnalysis,
        developmentalAssessment
      );

      // Step 5: Generate recommendations
      const recommendations = await this.generateRecommendations(
        intentAnalysis,
        developmentalAssessment,
        personalizationInsights,
        conversationQuality
      );

      const analysis: ConversationAnalysis = {
        intentAnalysis,
        developmentalAssessment,
        personalizationInsights,
        conversationQuality,
        recommendations,
      };

      this.logger.info('Conversation analysis completed', {
        userId: context.userId,
        primaryIntent: intentAnalysis.primaryIntent,
        cognitiveStage: developmentalAssessment.cognitiveAssessment.stage.stage,
        overallQuality: conversationQuality.coherence,
        recommendationsCount: recommendations.immediateActions.length,
      });

      return analysis;

    } catch (error) {
      this.logger.error('Failed to analyze conversation', {
        error: error instanceof Error ? error.message : String(error),
        userId: context.userId,
      });

      throw new ConversationIntelligenceError(
        'Failed to analyze conversation',
        ConversationIntelligenceErrorCode.ANALYSIS_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * Build or update personalization profile
   */
  async buildPersonalizationProfile(
    userId: string,
    conversationHistory: ConversationMemory[]
  ): Promise<PersonalizationProfile> {
    this.ensureInitialized();

    try {
      this.logger.debug('Building personalization profile', {
        userId,
        historyLength: conversationHistory.length,
      });

      const profile = await this.personalizationService.buildPersonalizationProfile(
        userId,
        conversationHistory
      );

      this.logger.info('Personalization profile built', {
        userId,
        communicationStyle: profile.communicationStyle.interactionStyle,
        learningStyle: profile.learningPatterns.learningStyle,
        engagementLevel: profile.engagementPatterns.optimalChallengeLevel,
      });

      return profile;

    } catch (error) {
      this.logger.error('Failed to build personalization profile', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });

      throw new ConversationIntelligenceError(
        'Failed to build personalization profile',
        ConversationIntelligenceErrorCode.PROFILE_CREATION_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * Adapt conversation based on analysis
   */
  async adaptConversation(
    profile: PersonalizationProfile,
    developmentalContext: DevelopmentalContext,
    currentConversation: any
  ): Promise<{
    adaptedStyle: any;
    optimizedFlow: any;
    attentionManagement: any;
  }> {
    this.ensureInitialized();

    try {
      this.logger.debug('Adapting conversation', {
        userId: profile.userId,
        cognitiveStage: developmentalContext.cognitiveStage.stage,
        currentStyle: profile.communicationStyle.interactionStyle,
      });

      // Adapt communication style
      const adaptedStyle = await this.personalizationService.adaptCommunicationStyle(
        profile,
        currentConversation
      );

      // Optimize conversation flow
      const optimizedFlow = await this.personalizationService.optimizeConversationFlow(
        profile,
        currentConversation
      );

      // Manage attention
      const attentionManagement = await this.personalizationService.manageAttention(
        {
          engagementLevel: currentConversation.engagementLevel || 0.7,
          attentionSpan: currentConversation.attentionSpan || 10,
        },
        developmentalContext
      );

      this.logger.info('Conversation adapted', {
        userId: profile.userId,
        adaptedPace: adaptedStyle.preferredPace,
        flowType: optimizedFlow.type,
        attentionStrategy: attentionManagement.sessionStructure?.chunkDuration,
      });

      return {
        adaptedStyle,
        optimizedFlow,
        attentionManagement,
      };

    } catch (error) {
      this.logger.error('Failed to adapt conversation', {
        error: error instanceof Error ? error.message : String(error),
        userId: profile.userId,
      });

      throw new ConversationIntelligenceError(
        'Failed to adapt conversation',
        ConversationIntelligenceErrorCode.ADAPTATION_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * Detect and handle conversation repair needs
   */
  async handleConversationRepair(
    userInput: string,
    systemResponse: string,
    context: any
  ): Promise<{
    repairNeeded: boolean;
    repairStrategy?: string;
    repairPrompt?: string;
    confidence?: number;
  }> {
    this.ensureInitialized();

    try {
      this.logger.debug('Checking for conversation repair needs', {
        inputLength: userInput.length,
        responseLength: systemResponse.length,
      });

      const conversationRepair = await this.nluService.detectConversationRepair(
        userInput,
        systemResponse,
        context
      );

      if (!conversationRepair) {
        return { repairNeeded: false };
      }

      this.logger.info('Conversation repair detected', {
        strategy: conversationRepair.repairStrategy,
        confidence: conversationRepair.confidence,
      });

      return {
        repairNeeded: conversationRepair.misunderstandingDetected,
        repairStrategy: conversationRepair.repairStrategy,
        repairPrompt: conversationRepair.repairPrompt,
        confidence: conversationRepair.confidence,
      };

    } catch (error) {
      this.logger.error('Failed to handle conversation repair', {
        error: error instanceof Error ? error.message : String(error),
      });

      return { repairNeeded: false };
    }
  }

  /**
   * Get conversation intelligence health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, any>;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  }> {
    const services = {
      nlu: { status: 'healthy', initialized: true },
      developmental: { status: 'healthy', initialized: true },
      personalization: { status: 'healthy', initialized: this.isInitialized },
    };

    const unhealthyServices = Object.values(services).filter(service => 
      service.status !== 'healthy' || !service.initialized
    ).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices === 0) {
      status = 'healthy';
    } else if (unhealthyServices < Object.keys(services).length / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Private helper methods
   */

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ConversationIntelligenceError(
        'ConversationIntelligenceAgent not initialized. Call initialize() first.',
        ConversationIntelligenceErrorCode.ANALYSIS_FAILED
      );
    }
  }

  private async performDevelopmentalAssessment(
    userInput: string,
    conversationHistory: string[],
    userAge?: number,
    intentAnalysis?: MultiModalIntent
  ): Promise<DevelopmentalAssessment> {
    try {
      // Cognitive stage assessment
      const cognitiveAssessment = await this.developmentalService.assessCognitiveStage(
        userInput,
        conversationHistory,
        userAge
      );

      // Executive function assessment
      const executiveFunctionAssessment = await this.developmentalService.assessExecutiveFunction(
        {
          attentionSpan: intentAnalysis?.voiceContext.hesitation ? 'short' : 'normal',
          taskPersistence: conversationHistory.length > 3 ? 'high' : 'moderate',
        },
        {
          userInput,
          conversationHistory,
          emotionalState: intentAnalysis?.emotionalContext.primaryEmotion,
        }
      );

      // ZPD assessment
      const zpd = await this.developmentalService.assessZPD(
        { skillLevel: 0.6, confidence: 0.7 }, // Current performance estimate
        { skillLevel: 0.8, confidence: 0.9 }, // Supported performance estimate
        { userAge, conversationComplexity: userInput.length / 50 }
      );

      // Generate developmental recommendations
      const developmentalRecommendations = this.generateDevelopmentalRecommendations(
        cognitiveAssessment,
        executiveFunctionAssessment,
        zpd
      );

      return {
        cognitiveAssessment,
        executiveFunctionAssessment,
        socialSkillsAssessment: {
          currentLevel: {
            perspectiveTaking: 0.6,
            empathy: 0.7,
            cooperationSkills: 0.6,
            conflictResolution: 0.5,
            communicationSkills: 0.7,
          },
          socialStrengths: ['communication', 'empathy'],
          socialChallenges: ['conflict_resolution'],
          peerInteractionQuality: 0.6,
          socialLearningOpportunities: ['group_storytelling', 'character_interaction'],
        },
        emotionalAssessment: {
          currentStage: {
            emotionalRegulation: 0.6,
            emotionalExpression: 0.7,
            emotionalUnderstanding: 0.6,
            empathyDevelopment: 0.7,
            attachmentSecurity: 0.8,
          },
          emotionalStrengths: ['expression', 'empathy'],
          emotionalChallenges: ['regulation'],
          regulationStrategies: ['deep_breathing', 'story_reflection'],
          supportNeeds: ['emotional_vocabulary', 'coping_strategies'],
        },
        zpd,
        developmentalRecommendations,
      };

    } catch (error) {
      this.logger.error('Failed to perform developmental assessment', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ConversationIntelligenceError(
        'Failed to perform developmental assessment',
        ConversationIntelligenceErrorCode.DEVELOPMENTAL_ASSESSMENT_FAILED,
        { originalError: error }
      );
    }
  }

  private async generatePersonalizationInsights(
    userId: string,
    userProfile?: PersonalizationProfile,
    intentAnalysis?: MultiModalIntent,
    developmentalAssessment?: DevelopmentalAssessment
  ): Promise<PersonalizationInsights> {
    const insights: PersonalizationInsights = {
      styleAdaptations: [],
      contentRecommendations: [],
      engagementStrategies: [],
      learningOptimizations: [],
      communicationAdjustments: [],
    };

    // Style adaptations based on communication preferences
    if (userProfile) {
      if (userProfile.communicationStyle.preferredPace === 'slow') {
        insights.styleAdaptations.push('reduce_speech_rate');
        insights.styleAdaptations.push('increase_pause_duration');
      }
      
      if (userProfile.communicationStyle.preferredComplexity === 'simple') {
        insights.styleAdaptations.push('simplify_vocabulary');
        insights.styleAdaptations.push('shorter_sentences');
      }
    }

    // Content recommendations based on preferences
    if (userProfile?.preferences.storyTypes.length > 0) {
      insights.contentRecommendations.push(`focus_on_${userProfile.preferences.storyTypes[0]}_stories`);
    }

    // Engagement strategies based on patterns
    if (userProfile?.engagementPatterns.attentionTriggers.length > 0) {
      insights.engagementStrategies.push(`use_${userProfile.engagementPatterns.attentionTriggers[0]}_triggers`);
    }

    // Learning optimizations based on developmental assessment
    if (developmentalAssessment?.cognitiveAssessment.stage.stage === 'preoperational') {
      insights.learningOptimizations.push('use_concrete_examples');
      insights.learningOptimizations.push('visual_storytelling');
    }

    // Communication adjustments based on intent analysis
    if (intentAnalysis?.conversationRepair) {
      insights.communicationAdjustments.push(`apply_${intentAnalysis.conversationRepair.repairStrategy}`);
    }

    return insights;
  }

  private async assessConversationQuality(
    userInput: string,
    systemResponse: string,
    intentAnalysis: MultiModalIntent,
    developmentalAssessment: DevelopmentalAssessment
  ): Promise<ConversationQuality> {
    // Calculate coherence based on intent understanding and response appropriateness
    const coherence = intentAnalysis.confidence * 0.8 + 
      (intentAnalysis.conversationRepair ? 0.3 : 0.9) * 0.2;

    // Calculate engagement based on emotional context and voice indicators
    const engagement = intentAnalysis.emotionalContext.engagementLevel;

    // Calculate understanding based on implicit meaning extraction
    const understanding = intentAnalysis.implicitMeaning.confidence;

    // Calculate satisfaction based on emotional state and engagement
    const satisfaction = (
      intentAnalysis.emotionalContext.moodShift === 'positive' ? 0.8 : 
      intentAnalysis.emotionalContext.moodShift === 'neutral' ? 0.6 : 0.4
    );

    // Calculate developmental appropriateness
    const developmentalAppropriate = developmentalAssessment.cognitiveAssessment.confidence;

    // Calculate cultural sensitivity
    const culturalSensitivity = intentAnalysis.culturalContext.detectedCulture === 'mixed' ? 0.8 : 0.9;

    return {
      coherence: Math.max(0, Math.min(1, coherence)),
      engagement: Math.max(0, Math.min(1, engagement)),
      understanding: Math.max(0, Math.min(1, understanding)),
      satisfaction: Math.max(0, Math.min(1, satisfaction)),
      developmentalAppropriate: Math.max(0, Math.min(1, developmentalAppropriate)),
      culturalSensitivity: Math.max(0, Math.min(1, culturalSensitivity)),
    };
  }

  private async generateRecommendations(
    intentAnalysis: MultiModalIntent,
    developmentalAssessment: DevelopmentalAssessment,
    personalizationInsights: PersonalizationInsights,
    conversationQuality: ConversationQuality
  ): Promise<ConversationRecommendations> {
    const recommendations: ConversationRecommendations = {
      immediateActions: [],
      sessionAdjustments: [],
      longTermStrategies: [],
      parentGuidance: [],
      professionalReferrals: [],
    };

    // Immediate actions based on conversation repair needs
    if (intentAnalysis.conversationRepair) {
      recommendations.immediateActions.push(`apply_${intentAnalysis.conversationRepair.repairStrategy}`);
    }

    // Session adjustments based on engagement level
    if (intentAnalysis.emotionalContext.engagementLevel < 0.5) {
      recommendations.sessionAdjustments.push('increase_engagement_techniques');
      recommendations.sessionAdjustments.push('check_attention_level');
    }

    // Long-term strategies based on developmental assessment
    if (developmentalAssessment.cognitiveAssessment.stage.stage === 'preoperational') {
      recommendations.longTermStrategies.push('focus_on_concrete_concepts');
      recommendations.longTermStrategies.push('use_visual_aids');
    }

    // Parent guidance based on developmental needs
    if (developmentalAssessment.executiveFunctionAssessment.challenges.length > 0) {
      recommendations.parentGuidance.push('support_executive_function_development');
      recommendations.parentGuidance.push('provide_structured_environment');
    }

    // Professional referrals if needed
    if (conversationQuality.developmentalAppropriate < 0.4) {
      recommendations.professionalReferrals.push('consider_developmental_assessment');
    }

    return recommendations;
  }

  private generateDevelopmentalRecommendations(
    cognitiveAssessment: any,
    executiveFunctionAssessment: any,
    zpd: any
  ): string[] {
    const recommendations: string[] = [];

    // Cognitive stage recommendations
    if (cognitiveAssessment.stage.stage === 'preoperational') {
      recommendations.push('use_concrete_examples');
      recommendations.push('avoid_abstract_concepts');
    } else if (cognitiveAssessment.stage.stage === 'concrete-operational') {
      recommendations.push('introduce_logical_thinking_exercises');
      recommendations.push('use_classification_activities');
    }

    // Executive function recommendations
    if (executiveFunctionAssessment.currentLevel.workingMemory < 0.5) {
      recommendations.push('break_information_into_chunks');
      recommendations.push('provide_memory_aids');
    }

    // ZPD recommendations
    if (zpd.scaffoldingNeeded.includes('verbal_prompts')) {
      recommendations.push('use_guiding_questions');
    }
    if (zpd.scaffoldingNeeded.includes('encouragement')) {
      recommendations.push('provide_frequent_positive_feedback');
    }

    return recommendations;
  }
}