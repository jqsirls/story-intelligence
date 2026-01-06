import { Logger } from 'winston';
import { createClient, RedisClientType } from 'redis';
import OpenAI from 'openai';
import {
  IContextualMemoryPersonalization,
  PersonalizationProfile,
  CommunicationStyle,
  UserPreferences,
  LearningPatterns,
  EngagementPatterns,
  ConversationMemory,
  DevelopmentalContext,
  ConversationIntelligenceConfig,
  ConversationIntelligenceError,
  ConversationIntelligenceErrorCode
} from '../types';

/**
 * Contextual Memory and Personalization service for long-term conversation context
 * preservation and personalized communication style adaptation
 */
export class ContextualMemoryPersonalization implements IContextualMemoryPersonalization {
  private openai: OpenAI;
  private redis: RedisClientType;
  private isInitialized = false;

  constructor(
    private config: ConversationIntelligenceConfig,
    private logger: Logger
  ) {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    this.redis = createClient({
      url: config.redis.url,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', { error: error.message });
    });

    this.logger.info('ContextualMemoryPersonalization service initialized');
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await this.redis.connect();
      this.isInitialized = true;
      this.logger.info('ContextualMemoryPersonalization service connected to Redis');
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    if (this.isInitialized) {
      await this.redis.disconnect();
      this.isInitialized = false;
      this.logger.info('ContextualMemoryPersonalization service disconnected from Redis');
    }
  }

  /**
   * Build comprehensive personalization profile from conversation history
   */
  async buildPersonalizationProfile(
    userId: string,
    conversationHistory: ConversationMemory[]
  ): Promise<PersonalizationProfile> {
    try {
      this.logger.debug('Building personalization profile', {
        userId,
        historyLength: conversationHistory.length,
      });

      // Check for existing profile in cache
      const cacheKey = `${this.config.redis.keyPrefix}:profile:${userId}`;
      const cachedProfile = await this.redis.get(cacheKey);
      
      if (cachedProfile) {
        const profile = JSON.parse(cachedProfile) as PersonalizationProfile;
        // Check if profile is recent enough
        const daysSinceUpdate = (Date.now() - new Date(profile.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) { // Use cached profile if less than 7 days old
          this.logger.debug('Using cached personalization profile', { userId, daysSinceUpdate });
          return profile;
        }
      }

      // Analyze conversation history for patterns
      const communicationStyle = await this.analyzeCommunicationStyle(conversationHistory);
      const preferences = await this.extractUserPreferences(conversationHistory);
      const learningPatterns = await this.identifyLearningPatterns(conversationHistory);
      const engagementPatterns = await this.analyzeEngagementPatterns(conversationHistory);

      const profile: PersonalizationProfile = {
        userId,
        communicationStyle,
        preferences,
        learningPatterns,
        engagementPatterns,
        conversationHistory: conversationHistory.slice(-50), // Keep last 50 conversations
        lastUpdated: new Date(),
      };

      // Cache the profile
      await this.redis.setEx(
        cacheKey,
        this.config.redis.ttl,
        JSON.stringify(profile)
      );

      this.logger.info('Personalization profile built', {
        userId,
        conversationCount: conversationHistory.length,
        preferredPace: profile.communicationStyle.preferredPace,
        learningStyle: profile.learningPatterns.learningStyle,
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
   * Adapt communication style based on personalization profile
   */
  async adaptCommunicationStyle(
    profile: PersonalizationProfile,
    context: any
  ): Promise<CommunicationStyle> {
    try {
      this.logger.debug('Adapting communication style', {
        userId: profile.userId,
        currentStyle: profile.communicationStyle.interactionStyle,
        contextType: context?.type,
      });

      // Use OpenAI to adapt communication style based on context
      const adaptationAnalysis = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert in personalized communication adaptation for children. Adapt the communication style based on the child's profile and current context.

Communication Style Dimensions:
- Pace: fast, normal, slow
- Complexity: simple, moderate, complex
- Response Length: brief, moderate, detailed
- Interaction Style: formal, casual, playful
- Feedback Preference: immediate, delayed, minimal

Consider:
- Child's learning patterns and preferences
- Current emotional state and engagement level
- Time of day and session context
- Recent conversation outcomes
- Developmental appropriateness`
          },
          {
            role: 'user',
            content: `Current Profile:
- Preferred Pace: ${profile.communicationStyle.preferredPace}
- Preferred Complexity: ${profile.communicationStyle.preferredComplexity}
- Response Length: ${profile.communicationStyle.responseLength}
- Interaction Style: ${profile.communicationStyle.interactionStyle}
- Feedback Preference: ${profile.communicationStyle.feedbackPreference}

Learning Patterns:
- Learning Style: ${profile.learningPatterns.learningStyle}
- Optimal Session Length: ${profile.learningPatterns.optimalSessionLength} minutes
- Comprehension Speed: ${profile.learningPatterns.comprehensionSpeed}

Current Context: ${JSON.stringify(context, null, 2)}

Adapt the communication style for this context. Respond with JSON:
{
  "preferredPace": "fast|normal|slow",
  "preferredComplexity": "simple|moderate|complex",
  "responseLength": "brief|moderate|detailed",
  "interactionStyle": "formal|casual|playful",
  "feedbackPreference": "immediate|delayed|minimal"
}`
          }
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      const adaptationContent = adaptationAnalysis.choices[0]?.message?.content;
      if (!adaptationContent) {
        // Return current style if adaptation fails
        return profile.communicationStyle;
      }

      let adaptedStyle;
      try {
        adaptedStyle = JSON.parse(adaptationContent);
      } catch (parseError) {
        // Return current style if parsing fails
        return profile.communicationStyle;
      }

      const communicationStyle: CommunicationStyle = {
        preferredPace: adaptedStyle.preferredPace || profile.communicationStyle.preferredPace,
        preferredComplexity: adaptedStyle.preferredComplexity || profile.communicationStyle.preferredComplexity,
        responseLength: adaptedStyle.responseLength || profile.communicationStyle.responseLength,
        interactionStyle: adaptedStyle.interactionStyle || profile.communicationStyle.interactionStyle,
        feedbackPreference: adaptedStyle.feedbackPreference || profile.communicationStyle.feedbackPreference,
      };

      this.logger.info('Communication style adapted', {
        userId: profile.userId,
        originalPace: profile.communicationStyle.preferredPace,
        adaptedPace: communicationStyle.preferredPace,
        originalStyle: profile.communicationStyle.interactionStyle,
        adaptedStyle: communicationStyle.interactionStyle,
      });

      return communicationStyle;

    } catch (error) {
      this.logger.error('Failed to adapt communication style', {
        error: error instanceof Error ? error.message : String(error),
        userId: profile.userId,
      });

      // Return original style on error
      return profile.communicationStyle;
    }
  }

  /**
   * Optimize conversation flow based on personalization profile
   */
  async optimizeConversationFlow(
    profile: PersonalizationProfile,
    currentFlow: any
  ): Promise<any> {
    try {
      this.logger.debug('Optimizing conversation flow', {
        userId: profile.userId,
        flowType: currentFlow?.type,
        optimalSessionLength: profile.learningPatterns.optimalSessionLength,
      });

      // Analyze current flow effectiveness
      const flowEffectiveness = await this.analyzeFlowEffectiveness(profile, currentFlow);

      // Use OpenAI to optimize the conversation flow
      const optimizationAnalysis = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert in conversation flow optimization for children. Optimize the conversation flow based on the child's personalization profile and current effectiveness metrics.

Flow Optimization Considerations:
- Attention span and optimal session length
- Learning style preferences (visual, auditory, kinesthetic)
- Engagement patterns and triggers
- Comprehension speed and processing needs
- Preferred interaction pacing
- Motivational factors

Optimization Strategies:
- Adjust pacing and timing
- Modify content delivery method
- Change interaction patterns
- Adapt feedback frequency
- Optimize challenge progression
- Enhance engagement triggers`
          },
          {
            role: 'user',
            content: `Profile Summary:
- Optimal Session Length: ${profile.learningPatterns.optimalSessionLength} minutes
- Learning Style: ${profile.learningPatterns.learningStyle}
- Comprehension Speed: ${profile.learningPatterns.comprehensionSpeed}
- Attention Triggers: ${profile.engagementPatterns.attentionTriggers.join(', ')}
- Disengagement Signals: ${profile.engagementPatterns.disengagementSignals.join(', ')}
- Optimal Challenge Level: ${profile.engagementPatterns.optimalChallengeLevel}

Current Flow: ${JSON.stringify(currentFlow, null, 2)}
Flow Effectiveness: ${JSON.stringify(flowEffectiveness, null, 2)}

Optimize this conversation flow. Respond with JSON containing the optimized flow structure.`
          }
        ],
        max_tokens: 600,
        temperature: 0.3,
      });

      const optimizationContent = optimizationAnalysis.choices[0]?.message?.content;
      if (!optimizationContent) {
        return currentFlow;
      }

      let optimizedFlow;
      try {
        optimizedFlow = JSON.parse(optimizationContent);
      } catch (parseError) {
        // Apply basic optimizations if parsing fails
        optimizedFlow = this.applyBasicFlowOptimizations(profile, currentFlow);
      }

      this.logger.info('Conversation flow optimized', {
        userId: profile.userId,
        originalFlowType: currentFlow?.type,
        optimizedFlowType: optimizedFlow?.type,
        effectivenessScore: flowEffectiveness.overallScore,
      });

      return optimizedFlow;

    } catch (error) {
      this.logger.error('Failed to optimize conversation flow', {
        error: error instanceof Error ? error.message : String(error),
        userId: profile.userId,
      });

      // Return original flow with basic optimizations
      return this.applyBasicFlowOptimizations(profile, currentFlow);
    }
  }

  /**
   * Recognize engagement patterns from conversation data
   */
  async recognizeEngagementPatterns(
    conversationData: any,
    profile: PersonalizationProfile
  ): Promise<EngagementPatterns> {
    try {
      this.logger.debug('Recognizing engagement patterns', {
        userId: profile.userId,
        dataPoints: conversationData?.interactions?.length || 0,
      });

      // Analyze conversation data for engagement indicators
      const engagementIndicators = this.extractEngagementIndicators(conversationData);

      // Use OpenAI to analyze engagement patterns
      const patternAnalysis = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert in child engagement pattern recognition. Analyze the conversation data to identify what triggers engagement and disengagement for this child.

Engagement Indicators:
- Response length and complexity
- Question asking frequency
- Emotional expressions
- Topic persistence
- Creative contributions
- Interaction frequency

Disengagement Indicators:
- Short or monosyllabic responses
- Topic avoidance
- Distraction signals
- Fatigue indicators
- Frustration expressions
- Silence or delays

Identify patterns and provide actionable insights for maintaining engagement.`
          },
          {
            role: 'user',
            content: `Conversation Data: ${JSON.stringify(conversationData, null, 2)}
Engagement Indicators: ${JSON.stringify(engagementIndicators, null, 2)}

Current Profile Patterns:
- Attention Triggers: ${profile.engagementPatterns.attentionTriggers.join(', ')}
- Disengagement Signals: ${profile.engagementPatterns.disengagementSignals.join(', ')}
- Motivational Factors: ${profile.engagementPatterns.motivationalFactors.join(', ')}

Analyze and update engagement patterns. Respond with JSON:
{
  "attentionTriggers": ["trigger1", "trigger2"],
  "disengagementSignals": ["signal1", "signal2"],
  "motivationalFactors": ["factor1", "factor2"],
  "optimalChallengeLevel": 0.0-1.0,
  "recoveryStrategies": ["strategy1", "strategy2"]
}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const patternContent = patternAnalysis.choices[0]?.message?.content;
      if (!patternContent) {
        return profile.engagementPatterns;
      }

      let updatedPatterns;
      try {
        updatedPatterns = JSON.parse(patternContent);
      } catch (parseError) {
        return profile.engagementPatterns;
      }

      const engagementPatterns: EngagementPatterns = {
        attentionTriggers: updatedPatterns.attentionTriggers || profile.engagementPatterns.attentionTriggers,
        disengagementSignals: updatedPatterns.disengagementSignals || profile.engagementPatterns.disengagementSignals,
        motivationalFactors: updatedPatterns.motivationalFactors || profile.engagementPatterns.motivationalFactors,
        optimalChallengeLevel: Math.max(0, Math.min(1, updatedPatterns.optimalChallengeLevel || profile.engagementPatterns.optimalChallengeLevel)),
        recoveryStrategies: updatedPatterns.recoveryStrategies || profile.engagementPatterns.recoveryStrategies,
      };

      this.logger.info('Engagement patterns recognized', {
        userId: profile.userId,
        triggersCount: engagementPatterns.attentionTriggers.length,
        signalsCount: engagementPatterns.disengagementSignals.length,
        optimalChallenge: engagementPatterns.optimalChallengeLevel,
      });

      return engagementPatterns;

    } catch (error) {
      this.logger.error('Failed to recognize engagement patterns', {
        error: error instanceof Error ? error.message : String(error),
        userId: profile.userId,
      });

      // Return existing patterns on error
      return profile.engagementPatterns;
    }
  }

  /**
   * Manage attention with developmental considerations
   */
  async manageAttention(
    attentionData: any,
    developmentalContext: DevelopmentalContext
  ): Promise<any> {
    try {
      this.logger.debug('Managing attention', {
        sustainedAttention: developmentalContext.attentionSpan.sustainedAttention,
        selectiveAttention: developmentalContext.attentionSpan.selectiveAttention,
        currentEngagement: attentionData?.engagementLevel,
      });

      // Calculate attention management strategy
      const attentionStrategy = await this.calculateAttentionStrategy(
        attentionData,
        developmentalContext
      );

      // Use OpenAI for attention management recommendations
      const attentionAnalysis = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert in attention management for children with developmental considerations. Provide strategies to maintain and enhance attention based on the child's developmental context and current attention data.

Attention Management Strategies:
- Break tasks into smaller chunks
- Use attention-grabbing elements
- Provide regular breaks
- Vary interaction modalities
- Use gamification elements
- Provide clear structure and expectations
- Monitor for fatigue and overstimulation

Consider the child's developmental stage and individual attention capabilities.`
          },
          {
            role: 'user',
            content: `Attention Data: ${JSON.stringify(attentionData, null, 2)}

Developmental Context:
- Sustained Attention: ${developmentalContext.attentionSpan.sustainedAttention} minutes
- Selective Attention: ${developmentalContext.attentionSpan.selectiveAttention}
- Divided Attention: ${developmentalContext.attentionSpan.dividedAttention}
- Attention Shifting: ${developmentalContext.attentionSpan.attentionShifting}

Cognitive Stage: ${developmentalContext.cognitiveStage.stage}
Executive Function Level: ${JSON.stringify(developmentalContext.executiveFunctionLevel, null, 2)}

Provide attention management recommendations. Respond with JSON:
{
  "immediateActions": ["action1", "action2"],
  "sessionStructure": {
    "chunkDuration": "minutes",
    "breakFrequency": "minutes",
    "attentionCues": ["cue1", "cue2"]
  },
  "engagementTechniques": ["technique1", "technique2"],
  "monitoringIndicators": ["indicator1", "indicator2"],
  "adaptationTriggers": ["trigger1", "trigger2"]
}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const attentionContent = attentionAnalysis.choices[0]?.message?.content;
      if (!attentionContent) {
        return this.getDefaultAttentionManagement(developmentalContext);
      }

      let attentionManagement;
      try {
        attentionManagement = JSON.parse(attentionContent);
      } catch (parseError) {
        return this.getDefaultAttentionManagement(developmentalContext);
      }

      this.logger.info('Attention management strategy created', {
        chunkDuration: attentionManagement.sessionStructure?.chunkDuration,
        breakFrequency: attentionManagement.sessionStructure?.breakFrequency,
        techniquesCount: attentionManagement.engagementTechniques?.length || 0,
      });

      return attentionManagement;

    } catch (error) {
      this.logger.error('Failed to manage attention', {
        error: error instanceof Error ? error.message : String(error),
      });

      return this.getDefaultAttentionManagement(developmentalContext);
    }
  }

  /**
   * Private helper methods
   */

  private async analyzeCommunicationStyle(conversationHistory: ConversationMemory[]): Promise<CommunicationStyle> {
    // Analyze conversation patterns to determine preferred communication style
    const recentConversations = conversationHistory.slice(-10);
    
    // Calculate average response characteristics
    const avgResponseLength = recentConversations.reduce((sum, conv) => 
      sum + conv.userInput.length, 0) / Math.max(recentConversations.length, 1);
    
    // Determine preferred pace based on response patterns
    let preferredPace: CommunicationStyle['preferredPace'] = 'normal';
    if (avgResponseLength > 100) {
      preferredPace = 'slow'; // Longer responses suggest need for slower pace
    } else if (avgResponseLength < 20) {
      preferredPace = 'fast'; // Short responses might indicate preference for faster pace
    }

    // Determine complexity preference
    let preferredComplexity: CommunicationStyle['preferredComplexity'] = 'moderate';
    const complexWords = recentConversations.reduce((count, conv) => {
      const words = conv.userInput.split(' ');
      return count + words.filter(word => word.length > 6).length;
    }, 0);
    
    if (complexWords / Math.max(recentConversations.length, 1) > 3) {
      preferredComplexity = 'complex';
    } else if (complexWords / Math.max(recentConversations.length, 1) < 1) {
      preferredComplexity = 'simple';
    }

    // Determine interaction style based on emotional expressions
    const positiveEmotions = recentConversations.filter(conv => 
      conv.emotionalState.includes('joy') || conv.emotionalState.includes('excitement')
    ).length;
    
    let interactionStyle: CommunicationStyle['interactionStyle'] = 'casual';
    if (positiveEmotions > recentConversations.length * 0.7) {
      interactionStyle = 'playful';
    }

    return {
      preferredPace,
      preferredComplexity,
      responseLength: avgResponseLength > 50 ? 'detailed' : avgResponseLength > 20 ? 'moderate' : 'brief',
      interactionStyle,
      feedbackPreference: 'immediate', // Default to immediate feedback for children
    };
  }

  private async extractUserPreferences(conversationHistory: ConversationMemory[]): Promise<UserPreferences> {
    // Extract preferences from conversation history
    const allInputs = conversationHistory.map(conv => conv.userInput).join(' ').toLowerCase();
    
    // Extract story types mentioned
    const storyTypes = ['adventure', 'bedtime', 'birthday', 'educational', 'fantasy', 'mystery'];
    const mentionedStoryTypes = storyTypes.filter(type => allInputs.includes(type));

    // Extract character types mentioned
    const characterTypes = ['princess', 'knight', 'dragon', 'unicorn', 'robot', 'animal', 'superhero'];
    const mentionedCharacterTypes = characterTypes.filter(type => allInputs.includes(type));

    // Extract themes
    const themes = ['friendship', 'family', 'adventure', 'magic', 'learning', 'helping'];
    const mentionedThemes = themes.filter(theme => allInputs.includes(theme));

    // Extract avoided topics (based on negative responses)
    const avoidedTopics: string[] = [];
    conversationHistory.forEach(conv => {
      if (conv.userInput.toLowerCase().includes('don\'t like') || 
          conv.userInput.toLowerCase().includes('don\'t want')) {
        // Extract what they don't like
        const words = conv.userInput.toLowerCase().split(' ');
        const dontIndex = words.findIndex(word => word === 'don\'t');
        if (dontIndex >= 0 && dontIndex < words.length - 2) {
          avoidedTopics.push(words[dontIndex + 2]);
        }
      }
    });

    // Extract favorite words (frequently used positive words)
    const wordFrequency: Record<string, number> = {};
    conversationHistory.forEach(conv => {
      const words = conv.userInput.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 3 && !['that', 'this', 'with', 'have', 'they', 'were'].includes(word)) {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });
    });

    const favoriteWords = Object.entries(wordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    return {
      storyTypes: mentionedStoryTypes,
      characterTypes: mentionedCharacterTypes,
      themes: mentionedThemes,
      avoidedTopics,
      favoriteWords,
      communicationTriggers: [], // Would be populated through more detailed analysis
    };
  }

  private async identifyLearningPatterns(conversationHistory: ConversationMemory[]): Promise<LearningPatterns> {
    // Calculate optimal session length based on engagement patterns
    const sessionLengths = conversationHistory.map(conv => {
      // Estimate session length from conversation complexity and engagement
      return Math.min(30, Math.max(5, conv.userInput.length / 10));
    });
    
    const avgSessionLength = sessionLengths.reduce((sum, length) => sum + length, 0) / 
      Math.max(sessionLengths.length, 1);

    // Determine learning style based on interaction patterns
    let learningStyle: LearningPatterns['learningStyle'] = 'mixed';
    const visualWords = conversationHistory.filter(conv => 
      conv.userInput.toLowerCase().includes('see') || 
      conv.userInput.toLowerCase().includes('look') ||
      conv.userInput.toLowerCase().includes('picture')
    ).length;
    
    const auditoryWords = conversationHistory.filter(conv => 
      conv.userInput.toLowerCase().includes('hear') || 
      conv.userInput.toLowerCase().includes('sound') ||
      conv.userInput.toLowerCase().includes('listen')
    ).length;

    if (visualWords > auditoryWords * 1.5) {
      learningStyle = 'visual';
    } else if (auditoryWords > visualWords * 1.5) {
      learningStyle = 'auditory';
    }

    // Calculate comprehension speed based on response complexity and time
    const comprehensionSpeed = Math.min(1, Math.max(0.3, 
      conversationHistory.reduce((sum, conv) => sum + conv.engagementLevel, 0) / 
      Math.max(conversationHistory.length, 1)
    ));

    return {
      optimalSessionLength: Math.round(avgSessionLength),
      bestTimeOfDay: 'afternoon', // Default, would be determined from timestamp analysis
      learningStyle,
      comprehensionSpeed,
      retentionRate: 0.7, // Default, would be calculated from follow-up conversations
      transferAbility: 0.6, // Default, would be assessed through cross-topic performance
    };
  }

  private async analyzeEngagementPatterns(conversationHistory: ConversationMemory[]): Promise<EngagementPatterns> {
    // Analyze what triggers attention and engagement
    const highEngagementConversations = conversationHistory.filter(conv => conv.engagementLevel > 0.7);
    const lowEngagementConversations = conversationHistory.filter(conv => conv.engagementLevel < 0.4);

    // Extract attention triggers from high engagement conversations
    const attentionTriggers: string[] = [];
    highEngagementConversations.forEach(conv => {
      const words = conv.context.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 4 && !attentionTriggers.includes(word)) {
          attentionTriggers.push(word);
        }
      });
    });

    // Extract disengagement signals from low engagement conversations
    const disengagementSignals: string[] = [];
    lowEngagementConversations.forEach(conv => {
      if (conv.userInput.length < 10) {
        disengagementSignals.push('short_responses');
      }
      if (conv.userInput.toLowerCase().includes('tired') || 
          conv.userInput.toLowerCase().includes('bored')) {
        disengagementSignals.push('explicit_fatigue');
      }
    });

    // Extract motivational factors
    const motivationalFactors: string[] = [];
    conversationHistory.forEach(conv => {
      if (conv.emotionalState.includes('excitement') || conv.emotionalState.includes('joy')) {
        const context = conv.context.toLowerCase();
        if (context.includes('story')) motivationalFactors.push('storytelling');
        if (context.includes('character')) motivationalFactors.push('character_creation');
        if (context.includes('adventure')) motivationalFactors.push('adventure_themes');
      }
    });

    // Calculate optimal challenge level
    const avgEngagement = conversationHistory.reduce((sum, conv) => sum + conv.engagementLevel, 0) / 
      Math.max(conversationHistory.length, 1);

    return {
      attentionTriggers: attentionTriggers.slice(0, 5), // Top 5 triggers
      disengagementSignals: [...new Set(disengagementSignals)], // Remove duplicates
      motivationalFactors: [...new Set(motivationalFactors)], // Remove duplicates
      optimalChallengeLevel: Math.min(1, Math.max(0.3, avgEngagement)),
      recoveryStrategies: ['change_topic', 'add_excitement', 'provide_encouragement'], // Default strategies
    };
  }

  private async analyzeFlowEffectiveness(profile: PersonalizationProfile, currentFlow: any): Promise<any> {
    // Analyze how effective the current flow is for this user
    const recentOutcomes = profile.conversationHistory.slice(-5).map(conv => conv.outcomes);
    const successRate = recentOutcomes.flat().filter(outcome => 
      outcome.includes('success') || outcome.includes('completed')
    ).length / Math.max(recentOutcomes.flat().length, 1);

    const avgEngagement = profile.conversationHistory.slice(-5).reduce((sum, conv) => 
      sum + conv.engagementLevel, 0) / Math.max(5, 1);

    return {
      overallScore: (successRate + avgEngagement) / 2,
      successRate,
      avgEngagement,
      flowType: currentFlow?.type || 'unknown',
    };
  }

  private applyBasicFlowOptimizations(profile: PersonalizationProfile, currentFlow: any): any {
    // Apply basic optimizations based on profile
    return {
      ...currentFlow,
      pacing: {
        ...currentFlow.pacing,
        speed: profile.communicationStyle.preferredPace,
        chunkSize: profile.learningPatterns.optimalSessionLength / 3, // Divide session into 3 chunks
      },
      engagement: {
        ...currentFlow.engagement,
        triggers: profile.engagementPatterns.attentionTriggers,
        recoveryStrategies: profile.engagementPatterns.recoveryStrategies,
      },
      adaptation: {
        ...currentFlow.adaptation,
        learningStyle: profile.learningPatterns.learningStyle,
        challengeLevel: profile.engagementPatterns.optimalChallengeLevel,
      },
    };
  }

  private extractEngagementIndicators(conversationData: any): any {
    // Extract indicators of engagement from conversation data
    return {
      responseLength: conversationData.userInput?.length || 0,
      questionCount: (conversationData.userInput?.match(/\?/g) || []).length,
      emotionalExpressions: conversationData.emotionalState ? 1 : 0,
      topicPersistence: conversationData.topicChanges || 0,
      interactionFrequency: conversationData.interactions?.length || 0,
    };
  }

  private async calculateAttentionStrategy(attentionData: any, developmentalContext: DevelopmentalContext): Promise<any> {
    // Calculate attention management strategy based on developmental context
    const sustainedAttentionMinutes = developmentalContext.attentionSpan.sustainedAttention;
    const chunkDuration = Math.max(2, Math.min(sustainedAttentionMinutes / 2, 10));
    const breakFrequency = Math.max(chunkDuration, sustainedAttentionMinutes * 0.8);

    return {
      chunkDuration,
      breakFrequency,
      attentionLevel: attentionData?.engagementLevel || 0.5,
      strategy: sustainedAttentionMinutes < 5 ? 'high_support' : 
                sustainedAttentionMinutes < 10 ? 'moderate_support' : 'standard_support',
    };
  }

  private getDefaultAttentionManagement(developmentalContext: DevelopmentalContext): any {
    // Provide default attention management based on developmental context
    const sustainedAttention = developmentalContext.attentionSpan.sustainedAttention;
    
    return {
      immediateActions: ['check_engagement', 'provide_encouragement'],
      sessionStructure: {
        chunkDuration: Math.max(3, Math.min(sustainedAttention / 2, 8)),
        breakFrequency: Math.max(5, sustainedAttention * 0.8),
        attentionCues: ['visual_highlight', 'voice_emphasis', 'interactive_prompt'],
      },
      engagementTechniques: ['gamification', 'choice_offering', 'progress_celebration'],
      monitoringIndicators: ['response_length', 'response_time', 'topic_engagement'],
      adaptationTriggers: ['short_responses', 'long_pauses', 'topic_avoidance'],
    };
  }
}