import OpenAI from 'openai';
import { StoryType, PostStorySupport, SupportAction, Visualization, Affirmation, GroundingTechnique } from '@alexa-multi-agent/shared-types';
import { 
  PostStoryAnalysisRequest, 
  PostStoryAnalysisResult, 
  SupportSessionRequest,
  SupportSessionPlan,
  CrisisIndicator,
  CrisisResponse
} from '../types';
import { DataRetentionManager } from './DataRetentionManager';
import { Logger } from 'winston';
import { RedisClientType } from 'redis';

export class PostStorySupportService {
  private openai: OpenAI;
  private logger: Logger;
  private dataRetention: DataRetentionManager;

  constructor(openai: OpenAI, redis: RedisClientType, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
    this.dataRetention = new DataRetentionManager(redis, logger);
  }

  /**
   * Analyze user's emotional state after story completion
   * PRIVACY: All emotional data is stored ephemerally and auto-deleted
   */
  async analyzePostStoryState(request: PostStoryAnalysisRequest): Promise<PostStoryAnalysisResult> {
    this.logger.info('Analyzing post-story emotional state', { 
      storyId: request.storyId,
      storyType: request.storyType 
    });

    try {
      // Store emotional response data ephemerally (auto-expires in 24h)
      await this.dataRetention.storeEphemeralData({
        sessionId: request.userReaction.sessionId || 'unknown',
        userId: request.userReaction.userId,
        dataType: 'emotional_response',
        data: {
          storyType: request.storyType,
          emotionalResponse: request.userReaction.emotionalResponse,
          timestamp: request.userReaction.timestamp
        }
      });

      // Check for crisis indicators first
      const crisisIndicators = this.detectCrisisIndicators(request);
      if (crisisIndicators.length > 0) {
        // Store crisis data with longer retention for safety follow-up
        await this.dataRetention.storeEphemeralData({
          sessionId: request.userReaction.sessionId || 'unknown',
          userId: request.userReaction.userId,
          dataType: 'crisis_data',
          data: {
            indicators: crisisIndicators,
            storyType: request.storyType,
            timestamp: new Date().toISOString()
          }
        });
        
        return this.handleCrisisResponse(request, crisisIndicators);
      }

      // Analyze emotional response using AI
      const emotionalAssessment = await this.assessEmotionalState(request);
      
      // Generate appropriate support recommendations
      const supportRecommendations = await this.generateSupportRecommendations(
        request, 
        emotionalAssessment
      );

      const result = {
        emotionalAssessment,
        recommendedSupport: supportRecommendations,
        urgencyLevel: this.determineUrgencyLevel(emotionalAssessment),
        followUpNeeded: this.shouldFollowUp(emotionalAssessment),
        professionalReferral: this.needsProfessionalReferral(emotionalAssessment)
      };

      // Store therapeutic context ephemerally
      await this.dataRetention.storeEphemeralData({
        sessionId: request.userReaction.sessionId || 'unknown',
        userId: request.userReaction.userId,
        dataType: 'therapeutic_context',
        data: {
          assessment: emotionalAssessment,
          urgencyLevel: result.urgencyLevel,
          timestamp: new Date().toISOString()
        }
      });

      return result;

    } catch (error) {
      this.logger.error('Error analyzing post-story state', { error });
      return this.getDefaultSupportResponse(request);
    }
  }

  /**
   * Create a personalized support session plan
   * PRIVACY: Support session data is stored ephemerally and auto-deleted
   */
  async createSupportSession(request: SupportSessionRequest): Promise<SupportSessionPlan> {
    this.logger.info('Creating support session plan', { 
      userId: request.userId,
      timeAvailable: request.timeAvailable 
    });

    const sessionPlan = await this.generateSessionPlan(request);
    
    if (request.voiceGuidancePreferred) {
      sessionPlan.voiceScript = await this.generateVoiceScript(sessionPlan);
    }

    // Store support session data ephemerally (auto-expires in 12h)
    await this.dataRetention.storeEphemeralData({
      sessionId: sessionPlan.sessionId,
      userId: request.userId,
      dataType: 'support_session',
      data: {
        sessionPlan: {
          ...sessionPlan,
          voiceScript: undefined // Don't store voice script for privacy
        },
        emotionalState: request.emotionalState,
        preferences: request.preferredSupport,
        timestamp: new Date().toISOString()
      }
    });

    return sessionPlan;
  }

  /**
   * Generate immediate grounding techniques based on emotional state
   */
  generateImmediateGrounding(emotionalIntensity: number, triggers: string[]): GroundingTechnique[] {
    const techniques: GroundingTechnique[] = [];

    // High intensity - immediate grounding needed
    if (emotionalIntensity >= 8) {
      techniques.push({
        name: "5-4-3-2-1 Grounding",
        type: "5-4-3-2-1",
        instructions: [
          "Take a deep breath and look around you",
          "Name 5 things you can see",
          "Name 4 things you can touch",
          "Name 3 things you can hear",
          "Name 2 things you can smell",
          "Name 1 thing you can taste"
        ],
        duration: "2-3 minutes",
        effectiveness: "strong"
      });
    }

    // Moderate intensity - breathing focus
    if (emotionalIntensity >= 5) {
      techniques.push({
        name: "Box Breathing",
        type: "breathing",
        instructions: [
          "Sit comfortably with your back straight",
          "Breathe in for 4 counts",
          "Hold your breath for 4 counts",
          "Breathe out for 4 counts",
          "Hold empty for 4 counts",
          "Repeat 4-6 times"
        ],
        duration: "3-5 minutes",
        effectiveness: "moderate"
      });
    }

    // Body-based grounding for trauma responses
    if (triggers.some(t => t.includes('trauma') || t.includes('loss'))) {
      techniques.push({
        name: "Progressive Muscle Relaxation",
        type: "progressive_muscle",
        instructions: [
          "Start with your toes - tense for 5 seconds, then release",
          "Move to your calves - tense and release",
          "Continue up through your body",
          "Notice the difference between tension and relaxation",
          "End with your face and scalp"
        ],
        duration: "10-15 minutes",
        effectiveness: "strong"
      });
    }

    return techniques;
  }

  /**
   * Generate therapeutic visualizations
   */
  generateVisualizations(storyType: StoryType, emotionalState: string): Visualization[] {
    const visualizations: Visualization[] = [];

    switch (storyType) {
      case 'Child Loss':
        visualizations.push({
          title: "Garden of Memory",
          description: "A peaceful visualization to honor your child's memory",
          script: this.getChildLossVisualizationScript(),
          duration: "8-10 minutes",
          imagery: ["peaceful garden", "gentle light", "beautiful flowers", "warm presence"],
          purpose: "processing"
        });
        break;

      case 'Inner Child':
        visualizations.push({
          title: "Safe Haven",
          description: "Creating a safe space for your inner child",
          script: this.getInnerChildVisualizationScript(),
          duration: "6-8 minutes",
          imagery: ["cozy space", "warm light", "protective boundaries", "nurturing presence"],
          purpose: "empowering"
        });
        break;

      case 'New Birth':
        visualizations.push({
          title: "New Beginnings",
          description: "Embracing the joy and wonder of new life",
          script: this.getNewBirthVisualizationScript(),
          duration: "5-7 minutes",
          imagery: ["sunrise", "blooming flowers", "gentle growth", "bright future"],
          purpose: "calming"
        });
        break;

      default:
        visualizations.push(this.getUniversalCalmingVisualization());
    }

    return visualizations;
  }

  /**
   * Generate personalized affirmations
   */
  generateAffirmations(storyType: StoryType, therapeuticFocus?: string): Affirmation[] {
    const affirmations: Affirmation[] = [];

    // Universal healing affirmations
    affirmations.push(
      {
        text: "I am worthy of love and healing",
        category: "self_worth",
        repetitions: 3,
        timing: "immediate"
      },
      {
        text: "I give myself permission to feel and heal",
        category: "healing",
        repetitions: 5,
        timing: "daily"
      }
    );

    // Story-type specific affirmations
    switch (storyType) {
      case 'Child Loss':
        affirmations.push(
          {
            text: "My love for my child is eternal and unbreakable",
            category: "healing",
            repetitions: 3,
            timing: "as_needed"
          },
          {
            text: "I carry my child's light within me always",
            category: "hope",
            repetitions: 1,
            timing: "daily"
          }
        );
        break;

      case 'Inner Child':
        affirmations.push(
          {
            text: "I am safe to feel and express my emotions",
            category: "strength",
            repetitions: 3,
            timing: "immediate"
          },
          {
            text: "I embrace all parts of myself with compassion",
            category: "self_worth",
            repetitions: 5,
            timing: "daily"
          }
        );
        break;

      case 'New Birth':
        affirmations.push(
          {
            text: "I welcome this new chapter with open arms",
            category: "hope",
            repetitions: 3,
            timing: "immediate"
          },
          {
            text: "I trust in my ability to nurture and love",
            category: "strength",
            repetitions: 1,
            timing: "daily"
          }
        );
        break;
    }

    return affirmations;
  }

  /**
   * Detect crisis indicators in user response
   */
  private detectCrisisIndicators(request: PostStoryAnalysisRequest): CrisisIndicator[] {
    const indicators: CrisisIndicator[] = [];
    const reaction = request.userReaction;

    // High emotional intensity with overwhelm
    if (reaction.emotionalResponse.intensity >= 9 && reaction.emotionalResponse.overwhelmed) {
      indicators.push({
        type: 'emotional_intensity',
        severity: 'severe',
        description: 'Extremely high emotional intensity with overwhelm',
        immediateAction: 'Provide immediate grounding and consider professional support'
      });
    }

    // Triggered response with vulnerability
    if (reaction.emotionalResponse.triggered && reaction.emotionalResponse.needsSpace) {
      indicators.push({
        type: 'behavioral',
        severity: 'moderate',
        description: 'Triggered response requiring space and support',
        immediateAction: 'Offer gentle grounding techniques and respect need for space'
      });
    }

    // Check for crisis language patterns (would use NLP in real implementation)
    // This is a simplified version
    const concerningEmotions = ['hopeless', 'trapped', 'unbearable', 'can\'t go on'];
    const userEmotions = reaction.emotionalResponse.felt;
    
    if (userEmotions.some(emotion => concerningEmotions.includes(emotion.toLowerCase()))) {
      indicators.push({
        type: 'language',
        severity: 'critical',
        description: 'Language indicating potential crisis state',
        immediateAction: 'Immediate professional intervention may be needed'
      });
    }

    return indicators;
  }

  private async assessEmotionalState(request: PostStoryAnalysisRequest) {
    const systemPrompt = `You are an expert in emotional assessment and therapeutic support. Analyze the user's emotional response to a ${request.storyType} story and provide a detailed assessment.

Consider:
- Emotional intensity and stability
- Coping capacity
- Support needs
- Risk factors
- Resilience indicators

Respond with a structured assessment focusing on immediate support needs.`;

    const userPrompt = `Story Type: ${request.storyType}
User's Emotional Response: ${JSON.stringify(request.userReaction.emotionalResponse)}
Story Content Summary: ${request.storyContent.substring(0, 500)}...

Please assess the user's emotional state and support needs.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      functions: [this.getEmotionalAssessmentFunction()],
      function_call: { name: 'assess_emotional_state' },
      temperature: 0.3
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (functionCall?.arguments) {
      return JSON.parse(functionCall.arguments);
    }

    throw new Error('Failed to assess emotional state');
  }

  private async generateSupportRecommendations(
    request: PostStoryAnalysisRequest, 
    assessment: any
  ): Promise<PostStorySupport> {
    const support: PostStorySupport = {
      emotionalState: {
        primary: {
          emotion: assessment.primaryEmotions[0] || 'processing',
          intensity: assessment.intensityLevel || 5,
          duration: 'lingering'
        },
        stabilityLevel: assessment.stabilityRisk === 'high' ? 'vulnerable' : 'processing'
      },
      recommendedActions: [],
      visualizations: this.generateVisualizations(request.storyType, assessment.primaryEmotions[0]),
      affirmations: this.generateAffirmations(request.storyType),
      groundingTechniques: this.generateImmediateGrounding(
        assessment.intensityLevel, 
        assessment.triggerIndicators || []
      ),
      followUpPrompts: this.generateFollowUpPrompts(request.storyType, assessment),
      safetyResources: this.getSafetyResources(assessment.stabilityRisk)
    };

    // Generate recommended actions based on assessment
    support.recommendedActions = this.generateSupportActions(assessment, request.storyType);

    return support;
  }

  private generateSupportActions(assessment: any, storyType: StoryType): SupportAction[] {
    const actions: SupportAction[] = [];

    // Immediate grounding if high intensity
    if (assessment.intensityLevel >= 7) {
      actions.push({
        type: 'grounding',
        title: 'Immediate Grounding',
        description: 'Quick techniques to help you feel more centered',
        duration: '2-5 minutes',
        instructions: [
          'Focus on your breathing',
          'Feel your feet on the ground',
          'Notice your surroundings',
          'Take three deep breaths'
        ],
        priority: 'immediate'
      });
    }

    // Breathing exercise for moderate intensity
    if (assessment.intensityLevel >= 4) {
      actions.push({
        type: 'breathing',
        title: 'Calming Breath Work',
        description: 'Gentle breathing to restore balance',
        duration: '5-10 minutes',
        instructions: [
          'Find a comfortable position',
          'Place one hand on chest, one on belly',
          'Breathe slowly and deeply',
          'Focus on the rise and fall of your belly'
        ],
        voiceGuidance: true,
        priority: 'recommended'
      });
    }

    // Self-care recommendations
    actions.push({
      type: 'self_care',
      title: 'Gentle Self-Care',
      description: 'Nurturing activities for emotional recovery',
      duration: '15-30 minutes',
      instructions: [
        'Make yourself a warm drink',
        'Wrap yourself in a soft blanket',
        'Listen to calming music',
        'Do something that brings you comfort'
      ],
      priority: 'recommended'
    });

    // Professional support if needed
    if (assessment.copingCapacity === 'limited' || assessment.stabilityRisk === 'high') {
      actions.push({
        type: 'professional_help',
        title: 'Professional Support',
        description: 'Consider reaching out to a mental health professional',
        duration: 'Ongoing',
        instructions: [
          'Contact your therapist if you have one',
          'Consider calling a crisis helpline',
          'Reach out to a trusted friend or family member',
          'Don\'t hesitate to seek professional help'
        ],
        priority: 'immediate'
      });
    }

    return actions;
  }

  private generateFollowUpPrompts(storyType: StoryType, assessment: any): string[] {
    const prompts = [
      "How are you feeling right now?",
      "What do you need most in this moment?",
      "Would you like to talk about what came up for you?"
    ];

    switch (storyType) {
      case 'Child Loss':
        prompts.push(
          "Would you like to share a favorite memory?",
          "How can we honor your child's memory today?",
          "What would bring you comfort right now?"
        );
        break;
      
      case 'Inner Child':
        prompts.push(
          "What does your inner child need to hear right now?",
          "How can you show yourself compassion today?",
          "What would make you feel safe and loved?"
        );
        break;
      
      case 'New Birth':
        prompts.push(
          "What are you most excited about?",
          "How can we celebrate this new beginning?",
          "What support do you need as you embrace this change?"
        );
        break;
    }

    return prompts;
  }

  private getSafetyResources(riskLevel: string) {
    const resources = [
      {
        type: 'crisis_line' as const,
        name: 'National Crisis Text Line',
        contact: 'Text HOME to 741741',
        description: '24/7 crisis support via text',
        availability: '24/7',
        urgency: 'immediate' as const
      },
      {
        type: 'therapist' as const,
        name: 'Find a Therapist',
        description: 'Professional mental health support',
        availability: 'By appointment',
        urgency: 'within_24h' as const
      }
    ];

    if (riskLevel === 'high') {
      resources.unshift({
        type: 'crisis_line' as const,
        name: 'Emergency Services',
        contact: '911',
        description: 'Immediate emergency assistance',
        availability: '24/7',
        urgency: 'immediate' as const
      });
    }

    return resources;
  }

  // Visualization scripts
  private getChildLossVisualizationScript(): string {
    return `Take a comfortable position and close your eyes. Imagine yourself in a beautiful, peaceful garden. This is a special place where love never dies and memories bloom like flowers. 

See yourself walking along a gentle path, surrounded by the most beautiful flowers you've ever seen. Each flower represents a precious memory of your child. Notice how they seem to glow with a warm, loving light.

Find a comfortable spot to sit, perhaps on a soft bench or under a beautiful tree. Feel the warmth of the sun on your face, and know that this warmth is your child's love surrounding you always.

Take a moment to speak to your child, knowing they can hear you. Share whatever is in your heart. Feel their presence with you, their love wrapping around you like a gentle embrace.

When you're ready, slowly open your eyes, carrying this sense of connection and love with you.`;
  }

  private getInnerChildVisualizationScript(): string {
    return `Close your eyes and imagine yourself in the most safe and comfortable place you can think of. This might be a cozy room, a peaceful meadow, or anywhere that feels completely secure.

Now imagine your younger self appearing in this space. See them clearly - their age, what they're wearing, how they're feeling. Notice that they might seem small or scared, and that's okay.

Approach your inner child with the same gentleness you would show any child who needed comfort. Sit with them, let them know they are safe now. Tell them: "You are loved. You are worthy. You belong."

Imagine wrapping your inner child in a warm, protective light. This light represents all the love and wisdom you have now. Feel how this light heals old wounds and fills empty spaces with warmth.

Promise your inner child that you will listen to them, protect them, and never abandon them again. Feel the peace that comes from this reunion.

When you're ready, slowly return to the present, knowing your inner child is now safe within you.`;
  }

  private getNewBirthVisualizationScript(): string {
    return `Close your eyes and imagine the first light of dawn breaking over a beautiful landscape. The sky is painted in soft pastels - gentle pinks, warm golds, and peaceful blues.

See yourself standing in this new light, feeling the warmth on your face. This light represents all the new possibilities and joy that this birth brings into your life.

Imagine holding this new life, feeling the miracle of their presence. Notice the perfect tiny fingers, the soft breathing, the complete trust in their eyes. Feel the overwhelming love that fills your heart.

See yourself surrounded by a golden light of protection and wisdom. This light gives you everything you need to nurture and care for this precious life. You are exactly who this child needs.

Feel the support of all those who love you, their presence like a warm circle around you and your child. You are not alone in this journey.

Take a deep breath and feel the joy, the love, and the infinite possibilities that stretch out before you both.

When you're ready, slowly open your eyes, carrying this sense of wonder and capability with you.`;
  }

  private getUniversalCalmingVisualization(): Visualization {
    return {
      title: "Peaceful Sanctuary",
      description: "A calming visualization for emotional balance",
      script: `Close your eyes and imagine yourself in a place of complete peace and safety. This might be by a gentle stream, in a cozy room, or under a beautiful tree.

Feel yourself settling into this space, letting all tension leave your body. With each breath, you feel more relaxed and centered.

Imagine a warm, healing light surrounding you. This light represents love, peace, and healing. Let it wash over you, carrying away any pain or worry.

In this space, you are completely safe and loved. Take as long as you need here, knowing you can return whenever you need comfort.

When you're ready, slowly return to the present, carrying this peace with you.`,
      duration: "5-8 minutes",
      imagery: ["peaceful sanctuary", "healing light", "safety", "comfort"],
      purpose: "calming"
    };
  }

  private async generateSessionPlan(request: SupportSessionRequest): Promise<SupportSessionPlan> {
    // This would be more sophisticated in a real implementation
    const timeMinutes = parseInt(request.timeAvailable.split(' ')[0]);
    
    return {
      sessionId: `session_${Date.now()}`,
      duration: request.timeAvailable,
      phases: this.createSessionPhases(timeMinutes, request.emotionalState),
      checkpoints: ['25%', '50%', '75%', '100%'],
      exitStrategies: [
        'Take three deep breaths and slowly open your eyes',
        'Ground yourself by feeling your feet on the floor',
        'Remind yourself that you are safe in this moment'
      ]
    };
  }

  private createSessionPhases(timeMinutes: number, emotionalState: any) {
    // Simplified phase creation - would be more sophisticated in real implementation
    if (timeMinutes <= 5) {
      return [{
        name: 'Quick Grounding',
        duration: '5 minutes',
        type: 'grounding' as const,
        activities: [{
          name: '5-4-3-2-1 Technique',
          instructions: ['Name 5 things you see', 'Name 4 things you can touch'],
          duration: '3 minutes',
          optional: false
        }],
        transitionCue: 'Take a deep breath and feel more centered'
      }];
    }

    return [
      {
        name: 'Grounding',
        duration: '5 minutes',
        type: 'grounding' as const,
        activities: [{
          name: 'Breathing Exercise',
          instructions: ['Focus on your breath', 'Breathe slowly and deeply'],
          duration: '5 minutes',
          optional: false
        }],
        transitionCue: 'Feel yourself becoming more centered'
      },
      {
        name: 'Processing',
        duration: `${timeMinutes - 10} minutes`,
        type: 'processing' as const,
        activities: [{
          name: 'Gentle Reflection',
          instructions: ['Allow feelings to surface', 'Observe without judgment'],
          duration: `${timeMinutes - 10} minutes`,
          optional: false
        }],
        transitionCue: 'Begin to integrate what you\'ve experienced'
      },
      {
        name: 'Integration',
        duration: '5 minutes',
        type: 'integrating' as const,
        activities: [{
          name: 'Affirmations',
          instructions: ['Repeat positive affirmations', 'Feel their truth'],
          duration: '5 minutes',
          optional: false
        }],
        transitionCue: 'Carry this healing with you'
      }
    ];
  }

  private async generateVoiceScript(sessionPlan: SupportSessionPlan): Promise<string> {
    // Generate a voice script for the session
    return `Welcome to your healing session. I'll be guiding you through ${sessionPlan.duration} of gentle support.

Let's begin by finding a comfortable position. Take a moment to settle in and know that you are safe here.

${sessionPlan.phases.map(phase => 
      `Now we'll move into ${phase.name}. ${phase.activities[0]?.instructions.join('. ')}.`
    ).join('\n\n')}

You've done beautiful work today. Take a moment to appreciate your courage in seeking support and healing.`;
  }

  private getEmotionalAssessmentFunction() {
    return {
      name: 'assess_emotional_state',
      description: 'Assess user emotional state and support needs',
      parameters: {
        type: 'object',
        properties: {
          primaryEmotions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Primary emotions identified'
          },
          intensityLevel: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: 'Emotional intensity level'
          },
          stabilityRisk: {
            type: 'string',
            enum: ['low', 'moderate', 'high'],
            description: 'Risk to emotional stability'
          },
          triggerIndicators: {
            type: 'array',
            items: { type: 'string' },
            description: 'Potential triggers identified'
          },
          copingCapacity: {
            type: 'string',
            enum: ['strong', 'moderate', 'limited', 'overwhelmed'],
            description: 'Current coping capacity'
          },
          supportReadiness: {
            type: 'boolean',
            description: 'Whether user is ready for support interventions'
          }
        },
        required: ['primaryEmotions', 'intensityLevel', 'stabilityRisk', 'copingCapacity', 'supportReadiness']
      }
    };
  }

  private handleCrisisResponse(request: PostStoryAnalysisRequest, indicators: CrisisIndicator[]): PostStoryAnalysisResult {
    const highestSeverity = indicators.reduce((max, indicator) => {
      if (indicator.severity === 'critical') return 'critical';
      if (indicator.severity === 'severe' && max !== 'critical') return 'severe';
      if (indicator.severity === 'moderate' && max === 'mild') return 'moderate';
      return max;
    }, 'mild' as 'mild' | 'moderate' | 'severe' | 'critical');

    return {
      emotionalAssessment: {
        primaryEmotions: ['crisis', 'overwhelmed'],
        intensityLevel: 9,
        stabilityRisk: 'high',
        triggerIndicators: indicators.map(i => i.description),
        copingCapacity: 'overwhelmed',
        supportReadiness: true
      },
      recommendedSupport: this.getCrisisSupport(),
      urgencyLevel: 'crisis',
      followUpNeeded: true,
      professionalReferral: true
    };
  }

  private getCrisisSupport(): PostStorySupport {
    return {
      emotionalState: {
        primary: { emotion: 'crisis', intensity: 9, duration: 'persistent' },
        stabilityLevel: 'crisis'
      },
      recommendedActions: [{
        type: 'professional_help',
        title: 'Immediate Professional Support',
        description: 'Please reach out for immediate professional help',
        duration: 'Immediate',
        instructions: [
          'Call 988 (Suicide & Crisis Lifeline) if in the US',
          'Contact emergency services if in immediate danger',
          'Reach out to a trusted friend or family member',
          'Go to your nearest emergency room if needed'
        ],
        priority: 'immediate'
      }],
      safetyResources: [{
        type: 'crisis_line',
        name: '988 Suicide & Crisis Lifeline',
        contact: '988',
        description: 'Free, confidential crisis support 24/7',
        availability: '24/7',
        urgency: 'immediate'
      }],
      followUpPrompts: [
        'Are you safe right now?',
        'Do you have someone you can call?',
        'Can you get to a safe place?'
      ]
    };
  }

  private getDefaultSupportResponse(request: PostStoryAnalysisRequest): PostStoryAnalysisResult {
    return {
      emotionalAssessment: {
        primaryEmotions: ['processing'],
        intensityLevel: 5,
        stabilityRisk: 'moderate',
        triggerIndicators: [],
        copingCapacity: 'moderate',
        supportReadiness: true
      },
      recommendedSupport: {
        emotionalState: {
          primary: { emotion: 'processing', intensity: 5, duration: 'lingering' },
          stabilityLevel: 'processing'
        },
        recommendedActions: [{
          type: 'self_care',
          title: 'Gentle Self-Care',
          description: 'Take time for yourself',
          duration: '15-30 minutes',
          instructions: ['Rest', 'Hydrate', 'Do something comforting'],
          priority: 'recommended'
        }]
      },
      urgencyLevel: 'moderate',
      followUpNeeded: false,
      professionalReferral: false
    };
  }

  private determineUrgencyLevel(assessment: any): 'low' | 'moderate' | 'high' | 'crisis' {
    if (assessment.copingCapacity === 'overwhelmed' || assessment.stabilityRisk === 'high') {
      return 'crisis';
    }
    if (assessment.intensityLevel >= 8 || assessment.stabilityRisk === 'moderate') {
      return 'high';
    }
    if (assessment.intensityLevel >= 6) {
      return 'moderate';
    }
    return 'low';
  }

  private shouldFollowUp(assessment: any): boolean {
    return assessment.intensityLevel >= 7 || 
           assessment.stabilityRisk !== 'low' || 
           assessment.copingCapacity === 'limited';
  }

  private needsProfessionalReferral(assessment: any): boolean {
    return assessment.copingCapacity === 'overwhelmed' || 
           assessment.stabilityRisk === 'high' ||
           assessment.intensityLevel >= 9;
  }
}