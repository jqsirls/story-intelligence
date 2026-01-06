import {
  PersonalityRequest,
  PersonalityResponse,
  PersonalityTraits,
  PersonalityContext,
  EmotionalState,
  AgeGroup
} from './types';
import { EmotionalIntelligenceEngine } from './engines/EmotionalIntelligenceEngine';
import { WhimsicalPersonalityEngine } from './engines/WhimsicalPersonalityEngine';
import { EmpathyEngine } from './engines/EmpathyEngine';
import { YouthfulEnergyEngine } from './engines/YouthfulEnergyEngine';
import { WarmthEngine } from './engines/WarmthEngine';
import { GiggleInducingEngine } from './engines/GiggleInducingEngine';

/**
 * Core personality framework that integrates all personality engines
 * Implements Requirement 19.1-19.5: Complete personality system with emotional intelligence,
 * whimsical language, empathy, youthful energy, and warmth
 */
export class PersonalityFramework {
  private emotionalIntelligenceEngine: EmotionalIntelligenceEngine;
  private whimsicalPersonalityEngine: WhimsicalPersonalityEngine;
  private empathyEngine: EmpathyEngine;
  private youthfulEnergyEngine: YouthfulEnergyEngine;
  private warmthEngine: WarmthEngine;
  private giggleInducingEngine: GiggleInducingEngine;

  private basePersonalityTraits: PersonalityTraits = {
    warmth: 0.9,
    whimsy: 0.7,
    empathy: 0.9,
    youthfulness: 0.8,
    playfulness: 0.7,
    supportiveness: 0.9
  };

  constructor() {
    this.emotionalIntelligenceEngine = new EmotionalIntelligenceEngine();
    this.whimsicalPersonalityEngine = new WhimsicalPersonalityEngine();
    this.empathyEngine = new EmpathyEngine();
    this.youthfulEnergyEngine = new YouthfulEnergyEngine();
    this.warmthEngine = new WarmthEngine();
    this.giggleInducingEngine = new GiggleInducingEngine();
  }

  /**
   * Generates a complete personality response integrating all engines
   * Creates warm, whimsical, empathetic responses with appropriate emotional intelligence
   */
  async generatePersonalityResponse(request: PersonalityRequest): Promise<PersonalityResponse> {
    // Step 1: Analyze emotional context
    const emotionalAnalysis = this.analyzeEmotionalContext(request);
    
    // Step 2: Adapt personality traits for context
    const adaptedTraits = this.adaptPersonalityTraits(
      this.basePersonalityTraits,
      emotionalAnalysis,
      request.context
    );

    // Step 3: Generate base response with emotional intelligence
    const baseResponse = await this.generateEmotionallyIntelligentResponse(
      request,
      emotionalAnalysis,
      adaptedTraits
    );

    // Step 4: Add whimsical elements
    const whimsicalResponse = this.addWhimsicalElements(
      baseResponse,
      request.context,
      adaptedTraits.whimsy
    );

    // Step 5: Enhance with empathy
    const empathicResponse = this.enhanceWithEmpathy(
      whimsicalResponse,
      emotionalAnalysis,
      request.context,
      adaptedTraits.empathy
    );

    // Step 6: Infuse youthful energy
    const energeticResponse = this.infuseYouthfulEnergy(
      empathicResponse,
      request.context,
      adaptedTraits.youthfulness
    );

    // Step 7: Add warmth
    const warmResponse = this.addWarmth(
      energeticResponse,
      request.context,
      adaptedTraits.warmth
    );

    // Step 8: Include giggle-inducing elements
    const finalResponse = this.addGiggleInducingElements(
      warmResponse,
      request.context,
      adaptedTraits.playfulness,
      emotionalAnalysis
    );

    // Step 9: Compile final personality response
    return this.compilePersonalityResponse(
      finalResponse,
      adaptedTraits,
      emotionalAnalysis,
      request
    );
  }

  /**
   * Validates emotional state and provides appropriate response
   * Ensures the agent recognizes and responds to children's emotions appropriately
   */
  validateAndRespondToEmotion(
    childEmotion: EmotionalState,
    context: PersonalityContext,
    childInput: string
  ): {
    validation: string;
    emotionalResponse: string;
    supportLevel: number;
  } {
    // Use emotional intelligence engine for validation
    const emotionalResponse = this.emotionalIntelligenceEngine.generateEmpatheticResponse(
      childEmotion,
      context,
      'provide emotional support'
    );

    // Use empathy engine for validation
    const empathicResponse = this.empathyEngine.reflectFeelings(
      childEmotion,
      context,
      childInput
    );

    return {
      validation: empathicResponse.validation,
      emotionalResponse: emotionalResponse.response,
      supportLevel: empathicResponse.supportLevel
    };
  }

  /**
   * Creates whimsical language that makes children giggle while maintaining focus
   * Balances silliness with story coherence and emotional appropriateness
   */
  createWhimsicalLanguage(
    baseMessage: string,
    context: PersonalityContext,
    storyContext?: any
  ): {
    whimsicalMessage: string;
    giggleFactor: number;
    storyFocus: number;
  } {
    // Generate whimsical elements
    const whimsicalResult = this.whimsicalPersonalityEngine.generateWhimsicalLanguage(
      context,
      baseMessage,
      this.basePersonalityTraits.whimsy
    );

    // Add giggle-inducing elements
    const humorResult = this.giggleInducingEngine.generateAgeAppropriateHumor(
      context,
      baseMessage,
      this.basePersonalityTraits.playfulness
    );

    // Balance with story focus if needed
    let finalMessage = whimsicalResult.whimsicalMessage;
    let storyFocus = 1.0;

    if (storyContext) {
      const balancedResult = this.giggleInducingEngine.balanceHumorWithStoryFocus(
        finalMessage,
        storyContext,
        0.8
      );
      finalMessage = balancedResult.balancedHumor;
      storyFocus = balancedResult.focusPreservation;
    }

    return {
      whimsicalMessage: finalMessage,
      giggleFactor: humorResult.gigglePotential,
      storyFocus
    };
  }

  /**
   * Provides empathetic support that makes children feel understood
   * Combines emotional validation with nurturing presence
   */
  provideEmpathicSupport(
    childEmotion: EmotionalState,
    context: PersonalityContext,
    supportNeeded: 'comfort' | 'encouragement' | 'validation' | 'celebration'
  ): {
    empathicMessage: string;
    nurturingElements: string[];
    emotionalConnection: number;
  } {
    let empathicMessage: string;
    let nurturingElements: string[] = [];

    switch (supportNeeded) {
      case 'comfort':
        const comfortResult = this.empathyEngine.provideComfort(
          this.mapEmotionToDistressType(childEmotion),
          context,
          'moderate'
        );
        empathicMessage = comfortResult.comfortMessage;
        nurturingElements = comfortResult.soothingElements;
        break;

      case 'encouragement':
        const encouragementResult = this.empathyEngine.generateEncouragement(
          context,
          'medium',
          childEmotion
        );
        empathicMessage = encouragementResult.encouragement;
        nurturingElements = encouragementResult.motivationalElements;
        break;

      case 'validation':
        const validationResult = this.empathyEngine.reflectFeelings(
          childEmotion,
          context,
          'user input'
        );
        empathicMessage = validationResult.validation;
        nurturingElements = [validationResult.empathicConnection];
        break;

      case 'celebration':
        const celebrationResult = this.warmthEngine.provideUnconditionalPositivity(
          context,
          'success',
          0.9
        );
        empathicMessage = celebrationResult.positiveMessage;
        nurturingElements = celebrationResult.valueAffirmations;
        break;

      default:
        empathicMessage = "I'm here with you and I care about how you're feeling.";
    }

    // Calculate emotional connection strength
    const emotionalConnection = this.calculateEmotionalConnection(
      empathicMessage,
      childEmotion,
      context
    );

    return {
      empathicMessage,
      nurturingElements,
      emotionalConnection
    };
  }

  /**
   * Generates youthful energy appropriate for the child's state
   * Balances enthusiasm with emotional sensitivity
   */
  generateYouthfulEnergy(
    context: PersonalityContext,
    energyTrigger: string,
    emotionalSensitivity: number = 0.8
  ): {
    energeticMessage: string;
    energyLevel: number;
    appropriateness: number;
  } {
    // Generate boundless enthusiasm
    const enthusiasmResult = this.youthfulEnergyEngine.generateBoundlessEnthusiasm(
      context,
      energyTrigger,
      this.basePersonalityTraits.youthfulness
    );

    // Balance with emotional sensitivity
    const balancedResult = this.youthfulEnergyEngine.balanceEnergyWithSensitivity(
      enthusiasmResult.energyLevel,
      context.currentEmotionalState,
      context
    );

    // Maintain appropriate boundaries
    const boundaryResult = this.youthfulEnergyEngine.maintainEnergyBoundaries(
      balancedResult.balancedEnergy,
      context
    );

    return {
      energeticMessage: enthusiasmResult.enthusiasticResponse,
      energyLevel: boundaryResult.adjustedEnergy,
      appropriateness: boundaryResult.appropriatenessScore
    };
  }

  /**
   * Creates warm, nurturing responses that make children feel valued
   * Provides unconditional positive regard and emotional safety
   */
  createWarmNurturingResponse(
    context: PersonalityContext,
    responseType: 'welcoming' | 'comforting' | 'celebrating' | 'supporting',
    personalization: any = {}
  ): {
    warmMessage: string;
    nurturingLevel: number;
    emotionalSafety: number;
  } {
    // Generate nurturing response
    const nurturingResult = this.warmthEngine.generateNurturingResponse(
      context,
      'user input',
      this.basePersonalityTraits.warmth
    );

    // Create warm environment
    const environmentResult = this.warmthEngine.createWarmEnvironment(
      context,
      responseType
    );

    // Personalize if preferences available
    let finalMessage = nurturingResult.nurturingMessage;
    if (Object.keys(personalization).length > 0) {
      const personalizedResult = this.warmthEngine.personalizeWarmth(
        context,
        personalization,
        []
      );
      finalMessage = personalizedResult.personalizedWarmth;
    }

    return {
      warmMessage: finalMessage,
      nurturingLevel: nurturingResult.warmthScore,
      emotionalSafety: environmentResult.emotionalSecurity
    };
  }

  private analyzeEmotionalContext(request: PersonalityRequest): {
    detectedEmotion: EmotionalState;
    confidence: number;
    emotionalNeeds: string[];
  } {
    // Use emotional intelligence engine to analyze context
    const detectedEmotion = this.emotionalIntelligenceEngine.recognizeEmotionalState(
      request.userInput,
      request.context,
      request.voiceAnalysis
    );

    // Analyze voice if available
    let confidence = 0.7;
    if (request.voiceAnalysis) {
      confidence = request.voiceAnalysis.confidence;
    }

    // Determine emotional needs
    const emotionalNeeds = this.determineEmotionalNeeds(detectedEmotion, request.context);

    return {
      detectedEmotion,
      confidence,
      emotionalNeeds
    };
  }

  private adaptPersonalityTraits(
    baseTraits: PersonalityTraits,
    emotionalAnalysis: any,
    context: PersonalityContext
  ): PersonalityTraits {
    // Use emotional intelligence engine to adjust traits
    const adjustedTraits = this.emotionalIntelligenceEngine.adjustPersonalityForEmotion(
      baseTraits,
      emotionalAnalysis.detectedEmotion,
      context
    );

    // Further adapt warmth based on needs
    const warmthAdjustment = this.warmthEngine.adaptWarmthToNeeds(
      adjustedTraits.warmth,
      emotionalAnalysis.detectedEmotion,
      context,
      emotionalAnalysis.emotionalNeeds
    );

    adjustedTraits.warmth = warmthAdjustment.adaptedWarmth;

    return adjustedTraits;
  }

  private async generateEmotionallyIntelligentResponse(
    request: PersonalityRequest,
    emotionalAnalysis: any,
    traits: PersonalityTraits
  ): Promise<string> {
    // Generate empathetic response based on emotional state
    const empathicResponse = this.emotionalIntelligenceEngine.generateEmpatheticResponse(
      emotionalAnalysis.detectedEmotion,
      request.context,
      request.conversationGoal
    );

    return empathicResponse.response;
  }

  private addWhimsicalElements(
    baseResponse: string,
    context: PersonalityContext,
    whimsyLevel: number
  ): string {
    const whimsicalResult = this.whimsicalPersonalityEngine.generateWhimsicalLanguage(
      context,
      baseResponse,
      whimsyLevel
    );

    return whimsicalResult.whimsicalMessage;
  }

  private enhanceWithEmpathy(
    response: string,
    emotionalAnalysis: any,
    context: PersonalityContext,
    empathyLevel: number
  ): string {
    // Add empathic elements to the response
    const empathicResponse = this.empathyEngine.provideSupportivePresence(
      emotionalAnalysis.detectedEmotion,
      context,
      empathyLevel
    );

    // Combine responses thoughtfully
    return `${empathicResponse.supportiveMessage} ${response}`;
  }

  private infuseYouthfulEnergy(
    response: string,
    context: PersonalityContext,
    energyLevel: number
  ): string {
    const energyResult = this.youthfulEnergyEngine.createYouthfulLanguage(
      response,
      context,
      energyLevel
    );

    return energyResult.youthfulMessage;
  }

  private addWarmth(
    response: string,
    context: PersonalityContext,
    warmthLevel: number
  ): string {
    const warmthResult = this.warmthEngine.maintainConsistentWarmth(
      context,
      [],
      response
    );

    return warmthResult.consistentMessage;
  }

  private addGiggleInducingElements(
    response: string,
    context: PersonalityContext,
    playfulness: number,
    emotionalAnalysis: any
  ): string {
    // Only add humor if emotionally appropriate
    const humorTiming = this.giggleInducingEngine.timeHumorAppropriately(
      context,
      response,
      0.8
    );

    if (humorTiming.timingScore > 0.5) {
      const humorResult = this.giggleInducingEngine.generateAgeAppropriateHumor(
        context,
        response,
        playfulness
      );

      // Integrate humor thoughtfully
      return `${response} ${humorResult.humorousContent}`;
    }

    return response;
  }

  private compilePersonalityResponse(
    finalResponse: string,
    traits: PersonalityTraits,
    emotionalAnalysis: any,
    request: PersonalityRequest
  ): PersonalityResponse {
    // Extract elements used in the response
    const whimsicalElements = this.extractWhimsicalElements(finalResponse);
    const empathicElements = this.extractEmpathicElements(finalResponse);
    const ageAppropriateAdaptations = this.extractAgeAdaptations(finalResponse, request.context);

    // Calculate confidence score
    const confidenceScore = this.calculateResponseConfidence(
      finalResponse,
      traits,
      emotionalAnalysis,
      request.context
    );

    return {
      response: finalResponse,
      personalityTraitsUsed: traits,
      emotionalTone: emotionalAnalysis.detectedEmotion,
      whimsicalElements,
      empathicElements,
      ageAppropriateAdaptations,
      confidenceScore,
      suggestedFollowUp: this.generateFollowUpSuggestion(request.context, emotionalAnalysis)
    };
  }

  private determineEmotionalNeeds(emotion: EmotionalState, context: PersonalityContext): string[] {
    const needsMap: Partial<Record<EmotionalState, string[]>> = {
      sad: ['comfort', 'validation', 'gentle support'],
      anxious: ['reassurance', 'safety', 'calm presence'],
      shy: ['patience', 'gentle encouragement', 'no pressure'],
      frustrated: ['understanding', 'problem-solving support', 'patience'],
      excited: ['energy matching', 'enthusiasm sharing', 'celebration'],
      happy: ['joy sharing', 'celebration', 'positive reinforcement'],
      curious: ['engagement', 'exploration support', 'wonder sharing'],
      confident: ['affirmation', 'challenge', 'growth support'],
      tired: ['gentle energy', 'comfort', 'understanding'],
      overwhelmed: ['simplification', 'calm presence', 'step-by-step support'],
      neutral: ['engagement', 'interest building', 'connection'],
      calm: ['peaceful interaction', 'gentle engagement', 'stability']
    };

    return needsMap[emotion] ?? ['understanding', 'support'];
  }

  private mapEmotionToDistressType(emotion: EmotionalState): 'sadness' | 'fear' | 'frustration' | 'overwhelm' {
    const mappings: Partial<Record<EmotionalState, 'sadness' | 'fear' | 'frustration' | 'overwhelm'>> = {
      sad: 'sadness',
      anxious: 'fear',
      frustrated: 'frustration',
      overwhelmed: 'overwhelm',
      shy: 'fear',
      tired: 'overwhelm'
    };

    return mappings[emotion] ?? 'sadness';
  }

  private calculateEmotionalConnection(
    message: string,
    emotion: EmotionalState,
    context: PersonalityContext
  ): number {
    let connection = 0.5; // Base connection

    // Personal pronouns increase connection
    const personalWords = ['you', 'your', 'I', 'me', 'we', 'us'];
    const personalCount = personalWords.filter(word =>
      message.toLowerCase().includes(word)
    ).length;

    connection += personalCount * 0.1;

    // Emotional words increase connection
    const emotionalWords = ['feel', 'understand', 'care', 'here', 'with'];
    const emotionalCount = emotionalWords.filter(word =>
      message.toLowerCase().includes(word)
    ).length;

    connection += emotionalCount * 0.1;

    return Math.min(1.0, connection);
  }

  private extractWhimsicalElements(response: string): string[] {
    const elements: string[] = [];

    if (/\b\w+-\w+\b/.test(response)) elements.push('hyphenated silliness');
    if (response.includes('!')) elements.push('enthusiastic punctuation');
    if (/\b(silly|giggly|wiggly|bubbly)\b/.test(response)) elements.push('silly descriptors');
    if (/\b(boop|pop|whoosh|zing)\b/.test(response)) elements.push('sound effects');

    return elements;
  }

  private extractEmpathicElements(response: string): string[] {
    const elements: string[] = [];

    if (response.includes('understand')) elements.push('understanding expression');
    if (response.includes('feel')) elements.push('feeling acknowledgment');
    if (response.includes('here') || response.includes('with')) elements.push('presence assurance');
    if (response.includes('care')) elements.push('caring expression');

    return elements;
  }

  private extractAgeAdaptations(response: string, context: PersonalityContext): string[] {
    const adaptations: string[] = [];

    if (context.ageGroup === '3-5') {
      if (/\b(big|little|nice|good)\b/.test(response)) {
        adaptations.push('simple vocabulary');
      }
    } else if (context.ageGroup === '11+') {
      if (/\b(genuinely|sophisticated|remarkable)\b/.test(response)) {
        adaptations.push('advanced vocabulary');
      }
    }

    return adaptations;
  }

  private calculateResponseConfidence(
    response: string,
    traits: PersonalityTraits,
    emotionalAnalysis: any,
    context: PersonalityContext
  ): number {
    let confidence = 0.7; // Base confidence

    // Length and completeness
    if (response.length > 20 && response.length < 200) {
      confidence += 0.1; // Appropriate length
    }

    // Emotional appropriateness
    if (emotionalAnalysis.confidence > 0.7) {
      confidence += 0.1;
    }

    // Age appropriateness
    const ageAdaptations = this.extractAgeAdaptations(response, context);
    if (ageAdaptations.length > 0) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  private generateFollowUpSuggestion(
    context: PersonalityContext,
    emotionalAnalysis: any
  ): string {
    const suggestions = {
      happy: "What else makes you feel this happy?",
      excited: "Tell me more about what's got you so excited!",
      sad: "Would you like to talk about what's making you feel sad?",
      anxious: "Is there anything I can do to help you feel more comfortable?",
      curious: "What would you like to explore next?",
      shy: "Take your time - I'm here whenever you're ready to share more."
    };

    return suggestions[emotionalAnalysis.detectedEmotion] || "What would you like to do next?";
  }
}