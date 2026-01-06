import {
  EmotionalState,
  VoiceEmotionAnalysis,
  PersonalityContext,
  PersonalityTraits,
  TherapeuticTiming,
  InteractionMemory
} from '../types';

/**
 * Emotional intelligence integration system that combines voice analysis, empathic validation,
 * mood adaptation, and therapeutic timing
 * Implements Requirement 19.1, 19.3, 19.4, 19.5: Complete emotional intelligence integration
 */
export class EmotionalIntelligenceIntegrator {
  private voicePatternDatabase: Map<string, VoiceEmotionAnalysis[]> = new Map();
  private empathicResponseHistory: Map<string, any[]> = new Map();
  private moodAdaptationRules: Map<EmotionalState, any> = new Map();
  private therapeuticTimingMap: Map<string, TherapeuticTiming> = new Map();
  private personalityMemory: Map<string, any> = new Map();

  constructor() {
    this.initializeMoodAdaptationRules();
    this.initializeTherapeuticTimingMap();
  }

  /**
   * Creates voice emotion detection analyzing tone, pace, and word choice
   * Combines multiple signals to accurately detect child's emotional state
   */
  detectVoiceEmotion(
    voiceInput: string,
    audioMetrics?: any,
    childId?: string
  ): {
    emotionAnalysis: VoiceEmotionAnalysis;
    confidenceFactors: string[];
    historicalComparison: any;
    detectionQuality: number;
  } {
    const emotionAnalysis = this.analyzeVoicePatterns(voiceInput, audioMetrics);
    const confidenceFactors = this.identifyConfidenceFactors(emotionAnalysis);
    const historicalComparison = this.compareWithHistory(emotionAnalysis, childId);
    const detectionQuality = this.assessDetectionQuality(
      emotionAnalysis,
      confidenceFactors,
      historicalComparison
    );

    // Store for future reference
    if (childId) {
      this.storeVoicePattern(childId, emotionAnalysis);
    }

    return {
      emotionAnalysis,
      confidenceFactors,
      historicalComparison,
      detectionQuality
    };
  }

  /**
   * Implements empathic validation with appropriate emotional responses
   * Validates child's feelings and provides supportive, understanding responses
   */
  provideEmpathicValidation(
    detectedEmotion: EmotionalState,
    context: PersonalityContext,
    childInput: string,
    childId?: string
  ): {
    validationResponse: string;
    empathicElements: string[];
    emotionalConnection: number;
    validationEffectiveness: number;
  } {
    const validationResponse = this.generateValidationResponse(
      detectedEmotion,
      context,
      childInput
    );
    const empathicElements = this.extractEmpathicElements(validationResponse);
    const emotionalConnection = this.calculateEmotionalConnection(
      validationResponse,
      detectedEmotion,
      context
    );
    const validationEffectiveness = this.assessValidationEffectiveness(
      validationResponse,
      detectedEmotion,
      context
    );

    // Store empathic response for learning
    if (childId) {
      this.storeEmpathicResponse(childId, {
        emotion: detectedEmotion,
        response: validationResponse,
        effectiveness: validationEffectiveness,
        context
      });
    }

    return {
      validationResponse,
      empathicElements,
      emotionalConnection,
      validationEffectiveness
    };
  }

  /**
   * Adds mood adaptation engine matching child's energy level appropriately
   * Adjusts personality traits and response style based on detected mood
   */
  adaptToMood(
    childMood: EmotionalState,
    basePersonality: PersonalityTraits,
    context: PersonalityContext,
    energyLevel: number
  ): {
    adaptedPersonality: PersonalityTraits;
    moodMatchingStrategy: string;
    energyAdjustment: number;
    adaptationReasons: string[];
  } {
    const adaptationRules = this.moodAdaptationRules.get(childMood);
    const adaptedPersonality = this.applyMoodAdaptation(
      basePersonality,
      adaptationRules,
      context
    );
    const moodMatchingStrategy = this.determineMoodMatchingStrategy(
      childMood,
      energyLevel,
      context
    );
    const energyAdjustment = this.calculateEnergyAdjustment(
      childMood,
      energyLevel,
      context
    );
    const adaptationReasons = this.identifyAdaptationReasons(
      childMood,
      adaptedPersonality,
      basePersonality
    );

    return {
      adaptedPersonality,
      moodMatchingStrategy,
      energyAdjustment,
      adaptationReasons
    };
  }

  /**
   * Builds whimsical therapy engine using playfulness for emotional support
   * Combines therapeutic principles with playful, whimsical elements
   */
  createWhimsicalTherapy(
    emotionalNeed: 'comfort' | 'encouragement' | 'validation' | 'joy',
    context: PersonalityContext,
    whimsyLevel: number = 0.7
  ): {
    therapeuticResponse: string;
    whimsicalElements: string[];
    therapeuticValue: number;
    playfulnessBalance: number;
  } {
    const therapeuticResponse = this.generateWhimsicalTherapeuticResponse(
      emotionalNeed,
      context,
      whimsyLevel
    );
    const whimsicalElements = this.identifyWhimsicalTherapeuticElements(therapeuticResponse);
    const therapeuticValue = this.assessTherapeuticValue(
      therapeuticResponse,
      emotionalNeed,
      context
    );
    const playfulnessBalance = this.calculatePlayfulnessBalance(
      therapeuticResponse,
      emotionalNeed,
      whimsyLevel
    );

    return {
      therapeuticResponse,
      whimsicalElements,
      therapeuticValue,
      playfulnessBalance
    };
  }

  /**
   * Creates therapeutic timing system knowing when to be silly vs. gentle
   * Analyzes emotional context to determine appropriate response approach
   */
  determineTherapeuticTiming(
    emotionalContext: {
      currentEmotion: EmotionalState;
      emotionIntensity: number;
      situationContext: string;
      childAge: number;
    },
    interactionHistory: InteractionMemory[] = []
  ): {
    timing: TherapeuticTiming;
    approachRecommendation: string;
    intensityGuidance: string;
    contextualFactors: string[];
  } {
    const timing = this.calculateTherapeuticTiming(emotionalContext, interactionHistory);
    const approachRecommendation = this.generateApproachRecommendation(timing, emotionalContext);
    const intensityGuidance = this.createIntensityGuidance(timing, emotionalContext);
    const contextualFactors = this.identifyContextualFactors(emotionalContext, interactionHistory);

    return {
      timing,
      approachRecommendation,
      intensityGuidance,
      contextualFactors
    };
  }

  /**
   * Adds personality memory system remembering what works for each child
   * Learns from interaction patterns to improve future responses
   */
  updatePersonalityMemory(
    childId: string,
    interaction: {
      emotion: EmotionalState;
      personalityUsed: PersonalityTraits;
      response: string;
      childReaction: string;
      effectiveness: number;
      context: PersonalityContext;
    }
  ): {
    memoryUpdate: any;
    learningInsights: string[];
    personalityAdjustments: PersonalityTraits;
    confidenceImprovement: number;
  } {
    const currentMemory = this.personalityMemory.get(childId) || {
      preferences: {},
      effectivePatterns: [],
      challengingScenarios: [],
      personalityOptimizations: {}
    };

    const memoryUpdate = this.processInteractionForMemory(interaction, currentMemory);
    const learningInsights = this.generateLearningInsights(memoryUpdate, interaction);
    const personalityAdjustments = this.calculatePersonalityAdjustments(
      memoryUpdate,
      interaction.personalityUsed
    );
    const confidenceImprovement = this.assessConfidenceImprovement(
      memoryUpdate,
      currentMemory
    );

    // Update stored memory
    this.personalityMemory.set(childId, memoryUpdate);

    return {
      memoryUpdate,
      learningInsights,
      personalityAdjustments,
      confidenceImprovement
    };
  }

  /**
   * Integrates all emotional intelligence components for comprehensive response
   * Combines voice analysis, empathy, mood adaptation, and therapeutic timing
   */
  generateIntegratedEmotionalResponse(
    childInput: string,
    context: PersonalityContext,
    basePersonality: PersonalityTraits,
    childId?: string,
    audioMetrics?: any
  ): {
    integratedResponse: string;
    emotionalAnalysis: VoiceEmotionAnalysis;
    empathicValidation: string;
    moodAdaptedPersonality: PersonalityTraits;
    therapeuticTiming: TherapeuticTiming;
    responseConfidence: number;
  } {
    // Step 1: Detect emotion from voice
    const voiceDetection = this.detectVoiceEmotion(childInput, audioMetrics, childId);

    // Step 2: Provide empathic validation
    const empathicValidation = this.provideEmpathicValidation(
      voiceDetection.emotionAnalysis.detectedEmotion,
      context,
      childInput,
      childId
    );

    // Step 3: Adapt personality to mood
    const moodAdaptation = this.adaptToMood(
      voiceDetection.emotionAnalysis.detectedEmotion,
      basePersonality,
      context,
      this.calculateEnergyFromVoice(voiceDetection.emotionAnalysis)
    );

    // Step 4: Determine therapeutic timing
    const therapeuticTiming = this.determineTherapeuticTiming({
      currentEmotion: voiceDetection.emotionAnalysis.detectedEmotion,
      emotionIntensity: voiceDetection.emotionAnalysis.confidence,
      situationContext: context.conversationPhase,
      childAge: context.childAge
    });

    // Step 5: Create whimsical therapy if appropriate
    const whimsicalTherapy = this.createWhimsicalTherapy(
      this.mapEmotionToNeed(voiceDetection.emotionAnalysis.detectedEmotion),
      context,
      moodAdaptation.adaptedPersonality.whimsy
    );

    // Step 6: Integrate all components
    const integratedResponse = this.synthesizeEmotionalResponse(
      empathicValidation.validationResponse,
      whimsicalTherapy.therapeuticResponse,
      therapeuticTiming.timing,
      context
    );

    const responseConfidence = this.calculateIntegratedConfidence([
      voiceDetection.detectionQuality,
      empathicValidation.validationEffectiveness,
      whimsicalTherapy.therapeuticValue
    ]);

    return {
      integratedResponse,
      emotionalAnalysis: voiceDetection.emotionAnalysis,
      empathicValidation: empathicValidation.validationResponse,
      moodAdaptedPersonality: moodAdaptation.adaptedPersonality,
      therapeuticTiming: therapeuticTiming.timing,
      responseConfidence
    };
  }

  private initializeMoodAdaptationRules(): void {
    this.moodAdaptationRules.set('happy', {
      personalityAdjustments: { playfulness: +0.2, youthfulness: +0.1, whimsy: +0.1 },
      energyMatching: 'amplify',
      responseStyle: 'celebratory',
      therapeuticApproach: 'playful'
    });

    this.moodAdaptationRules.set('excited', {
      personalityAdjustments: { playfulness: +0.3, youthfulness: +0.2, whimsy: +0.2 },
      energyMatching: 'match_high',
      responseStyle: 'enthusiastic',
      therapeuticApproach: 'energetic'
    });

    this.moodAdaptationRules.set('sad', {
      personalityAdjustments: { empathy: +0.3, warmth: +0.2, whimsy: -0.2 },
      energyMatching: 'gentle_lower',
      responseStyle: 'comforting',
      therapeuticApproach: 'gentle'
    });

    this.moodAdaptationRules.set('anxious', {
      personalityAdjustments: { empathy: +0.2, warmth: +0.3, playfulness: -0.1 },
      energyMatching: 'calm_steady',
      responseStyle: 'reassuring',
      therapeuticApproach: 'supportive'
    });

    this.moodAdaptationRules.set('frustrated', {
      personalityAdjustments: { empathy: +0.3, supportiveness: +0.2, whimsy: -0.1 },
      energyMatching: 'patient_steady',
      responseStyle: 'understanding',
      therapeuticApproach: 'supportive'
    });

    this.moodAdaptationRules.set('shy', {
      personalityAdjustments: { warmth: +0.1, empathy: +0.2, youthfulness: -0.1 },
      energyMatching: 'gentle_encouraging',
      responseStyle: 'patient',
      therapeuticApproach: 'gentle'
    });
  }

  private initializeTherapeuticTimingMap(): void {
    this.therapeuticTimingMap.set('distress_high', {
      situationType: 'distress',
      recommendedApproach: 'gentle',
      intensityLevel: 0.2,
      durationRecommendation: 'extended'
    });

    this.therapeuticTimingMap.set('excitement_high', {
      situationType: 'excitement',
      recommendedApproach: 'playful',
      intensityLevel: 0.9,
      durationRecommendation: 'moderate'
    });

    this.therapeuticTimingMap.set('confusion_moderate', {
      situationType: 'confusion',
      recommendedApproach: 'supportive',
      intensityLevel: 0.5,
      durationRecommendation: 'moderate'
    });
  }

  private analyzeVoicePatterns(voiceInput: string, audioMetrics?: any): VoiceEmotionAnalysis {
    // Analyze word choice indicators
    const wordChoiceIndicators = this.analyzeWordChoice(voiceInput);
    
    // Analyze tone from text patterns
    const toneIndicators = this.analyzeToneFromText(voiceInput);
    
    // Combine with audio metrics if available
    if (audioMetrics) {
      toneIndicators.pace = audioMetrics.pace || toneIndicators.pace;
      toneIndicators.volume = audioMetrics.volume || toneIndicators.volume;
      toneIndicators.pitch = audioMetrics.pitch || toneIndicators.pitch;
    }

    // Determine emotional state
    const detectedEmotion = this.determineEmotionalState(wordChoiceIndicators, toneIndicators);
    const confidence = this.calculateEmotionConfidence(wordChoiceIndicators, toneIndicators);

    return {
      detectedEmotion,
      confidence,
      toneIndicators,
      wordChoiceIndicators
    };
  }

  private analyzeWordChoice(input: string): VoiceEmotionAnalysis['wordChoiceIndicators'] {
    const words = input.toLowerCase().split(/\s+/);
    
    const positiveWords = words.filter(word => 
      ['happy', 'good', 'great', 'awesome', 'cool', 'fun', 'love', 'like', 'yes', 'wow'].includes(word)
    ).length;

    const negativeWords = words.filter(word =>
      ['sad', 'bad', 'no', 'hate', 'scared', 'worried', 'mad', 'angry', 'upset'].includes(word)
    ).length;

    const excitementWords = words.filter(word =>
      ['excited', 'amazing', 'awesome', 'wow', 'cool', 'yay', 'fantastic'].includes(word)
    ).length;

    const hesitationWords = words.filter(word =>
      ['um', 'uh', 'maybe', 'i guess', 'i think', 'kinda', 'sorta', 'not sure'].includes(word)
    ).length;

    return {
      positiveWords,
      negativeWords,
      excitementWords,
      hesitationWords
    };
  }

  private analyzeToneFromText(input: string): VoiceEmotionAnalysis['toneIndicators'] {
    const exclamationCount = (input.match(/!/g) || []).length;
    const questionCount = (input.match(/\?/g) || []).length;
    const capsCount = (input.match(/[A-Z]/g) || []).length;
    const wordCount = input.split(/\s+/).length;

    return {
      pace: wordCount > 15 ? 'fast' : wordCount < 5 ? 'slow' : 'normal',
      volume: capsCount > 3 ? 'loud' : 'normal',
      pitch: questionCount > 1 ? 'high' : 'normal',
      energy: exclamationCount > 1 ? 'high' : exclamationCount > 0 ? 'medium' : 'low'
    };
  }

  private determineEmotionalState(
    wordChoice: VoiceEmotionAnalysis['wordChoiceIndicators'],
    tone: VoiceEmotionAnalysis['toneIndicators']
  ): EmotionalState {
    // Score different emotions based on indicators
    const scores = {
      excited: wordChoice.excitementWords * 2 + (tone.energy === 'high' ? 2 : 0),
      happy: wordChoice.positiveWords * 1.5 + (tone.energy === 'medium' ? 1 : 0),
      sad: wordChoice.negativeWords * 2 + (tone.energy === 'low' ? 1 : 0),
      anxious: wordChoice.hesitationWords * 1.5 + (tone.pace === 'fast' ? 1 : 0),
      shy: wordChoice.hesitationWords * 1 + (tone.volume === 'quiet' ? 2 : 0),
      curious: (tone.pitch === 'high' ? 1 : 0) + (wordChoice.positiveWords > 0 ? 1 : 0)
    };

    // Return emotion with highest score, default to neutral
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'neutral';

    const topEmotion = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0];
    return (topEmotion as EmotionalState) || 'neutral';
  }

  private calculateEmotionConfidence(
    wordChoice: VoiceEmotionAnalysis['wordChoiceIndicators'],
    tone: VoiceEmotionAnalysis['toneIndicators']
  ): number {
    const totalIndicators = wordChoice.positiveWords + wordChoice.negativeWords + 
                           wordChoice.excitementWords + wordChoice.hesitationWords;
    
    const toneStrength = (tone.energy === 'high' ? 0.3 : 0) + 
                        (tone.volume !== 'normal' ? 0.2 : 0) +
                        (tone.pace !== 'normal' ? 0.2 : 0);

    return Math.min(1, (totalIndicators * 0.1) + toneStrength + 0.3);
  }

  private identifyConfidenceFactors(analysis: VoiceEmotionAnalysis): string[] {
    const factors: string[] = [];

    if (analysis.confidence > 0.8) factors.push('strong emotional indicators');
    if (analysis.wordChoiceIndicators.positiveWords > 2) factors.push('multiple positive words');
    if (analysis.wordChoiceIndicators.excitementWords > 1) factors.push('excitement markers');
    if (analysis.toneIndicators.energy === 'high') factors.push('high energy tone');
    if (analysis.wordChoiceIndicators.hesitationWords > 1) factors.push('hesitation patterns');

    return factors;
  }

  private compareWithHistory(analysis: VoiceEmotionAnalysis, childId?: string): any {
    if (!childId) return { hasHistory: false };

    const history = this.voicePatternDatabase.get(childId) || [];
    if (history.length === 0) return { hasHistory: false };

    const recentPatterns = history.slice(-5);
    const avgConfidence = recentPatterns.reduce((sum, p) => sum + p.confidence, 0) / recentPatterns.length;
    const commonEmotions = this.findCommonEmotions(recentPatterns);

    return {
      hasHistory: true,
      historicalConfidence: avgConfidence,
      commonEmotions,
      consistencyWithHistory: this.calculateConsistency(analysis, recentPatterns)
    };
  }

  private assessDetectionQuality(
    analysis: VoiceEmotionAnalysis,
    factors: string[],
    history: any
  ): number {
    let quality = analysis.confidence;

    // Boost quality with multiple confidence factors
    quality += factors.length * 0.05;

    // Boost quality with historical consistency
    if (history.hasHistory && history.consistencyWithHistory > 0.7) {
      quality += 0.1;
    }

    return Math.min(1, quality);
  }

  private storeVoicePattern(childId: string, analysis: VoiceEmotionAnalysis): void {
    const patterns = this.voicePatternDatabase.get(childId) || [];
    patterns.push(analysis);
    
    // Keep only last 20 patterns
    if (patterns.length > 20) {
      patterns.shift();
    }
    
    this.voicePatternDatabase.set(childId, patterns);
  }

  private generateValidationResponse(
    emotion: EmotionalState,
    context: PersonalityContext,
    childInput: string
  ): string {
    const validationTemplates = {
      happy: "I can hear the happiness in your voice! That joy is absolutely wonderful.",
      excited: "Your excitement is bubbling over and it's making me excited too!",
      sad: "I can hear that you're feeling sad right now, and that's completely okay.",
      anxious: "I notice you might be feeling a bit worried, and those feelings are totally normal.",
      frustrated: "I can tell you're feeling frustrated, and that makes complete sense.",
      shy: "I can sense you might be feeling a little shy, and that's perfectly beautiful.",
      curious: "I love hearing the curiosity in your voice!",
      neutral: "I'm here with you and I care about how you're feeling."
    };

    const baseValidation = validationTemplates[emotion] || validationTemplates.neutral;
    return this.personalizeValidation(baseValidation, context, childInput);
  }

  private extractEmpathicElements(response: string): string[] {
    const elements: string[] = [];

    if (response.includes('I can hear')) elements.push('auditory acknowledgment');
    if (response.includes('understand') || response.includes('sense')) elements.push('understanding expression');
    if (response.includes('feel')) elements.push('feeling reflection');
    if (response.includes('okay') || response.includes('normal')) elements.push('normalization');
    if (response.includes('here') || response.includes('with you')) elements.push('presence assurance');

    return elements;
  }

  private calculateEmotionalConnection(
    response: string,
    emotion: EmotionalState,
    context: PersonalityContext
  ): number {
    let connection = 0.5; // Base connection

    // Personal pronouns increase connection
    const personalWords = ['you', 'your', 'I', 'me', 'we', 'us'];
    const personalCount = personalWords.filter(word =>
      response.toLowerCase().includes(word)
    ).length;

    connection += personalCount * 0.05;

    // Emotional mirroring increases connection
    if (response.toLowerCase().includes(emotion)) {
      connection += 0.2;
    }

    // Age-appropriate language increases connection
    if (context.ageGroup === '3-5' && /good|nice|happy/.test(response.toLowerCase())) {
      connection += 0.1;
    }

    return Math.min(1, connection);
  }

  private assessValidationEffectiveness(
    response: string,
    emotion: EmotionalState,
    context: PersonalityContext
  ): number {
    let effectiveness = 0.6; // Base effectiveness

    // Check for emotion-specific validation
    const emotionValidation = {
      sad: ['sad', 'okay', 'understand'],
      anxious: ['worried', 'normal', 'safe'],
      frustrated: ['frustrated', 'sense', 'understand'],
      happy: ['happiness', 'joy', 'wonderful'],
      excited: ['excitement', 'excited', 'bubbling']
    };

    const expectedWords = emotionValidation[emotion] || [];
    const matchCount = expectedWords.filter(word =>
      response.toLowerCase().includes(word)
    ).length;

    effectiveness += matchCount * 0.1;

    return Math.min(1, effectiveness);
  }

  private storeEmpathicResponse(childId: string, responseData: any): void {
    const history = this.empathicResponseHistory.get(childId) || [];
    history.push({
      ...responseData,
      timestamp: new Date()
    });

    // Keep only last 15 responses
    if (history.length > 15) {
      history.shift();
    }

    this.empathicResponseHistory.set(childId, history);
  }

  private applyMoodAdaptation(
    basePersonality: PersonalityTraits,
    rules: any,
    context: PersonalityContext
  ): PersonalityTraits {
    if (!rules) return basePersonality;

    const adapted = { ...basePersonality };
    const adjustments = rules.personalityAdjustments || {};

    Object.entries(adjustments).forEach(([trait, adjustment]) => {
      const currentValue = adapted[trait as keyof PersonalityTraits];
      const newValue = currentValue + (adjustment as number);
      adapted[trait as keyof PersonalityTraits] = Math.max(0, Math.min(1, newValue));
    });

    return adapted;
  }

  private determineMoodMatchingStrategy(
    mood: EmotionalState,
    energyLevel: number,
    context: PersonalityContext
  ): string {
    const strategies = {
      happy: 'amplify_joy',
      excited: 'match_enthusiasm',
      sad: 'gentle_comfort',
      anxious: 'calm_reassurance',
      frustrated: 'patient_understanding',
      shy: 'gentle_encouragement',
      curious: 'engage_wonder'
    };

    return strategies[mood] || 'supportive_presence';
  }

  private calculateEnergyAdjustment(
    mood: EmotionalState,
    baseEnergy: number,
    context: PersonalityContext
  ): number {
    const adjustments = {
      happy: 0.1,
      excited: 0.2,
      sad: -0.3,
      anxious: -0.2,
      frustrated: -0.1,
      shy: -0.2,
      curious: 0.1,
      neutral: 0
    };

    const adjustment = adjustments[mood] || 0;
    return Math.max(0.1, Math.min(1, baseEnergy + adjustment));
  }

  private identifyAdaptationReasons(
    mood: EmotionalState,
    adapted: PersonalityTraits,
    base: PersonalityTraits
  ): string[] {
    const reasons: string[] = [];

    if (adapted.empathy > base.empathy) {
      reasons.push(`increased empathy for ${mood} emotion`);
    }
    if (adapted.warmth > base.warmth) {
      reasons.push(`enhanced warmth for emotional support`);
    }
    if (adapted.playfulness < base.playfulness) {
      reasons.push(`reduced playfulness for emotional sensitivity`);
    }

    return reasons;
  }

  private generateWhimsicalTherapeuticResponse(
    need: 'comfort' | 'encouragement' | 'validation' | 'joy',
    context: PersonalityContext,
    whimsyLevel: number
  ): string {
    const therapeuticBase = {
      comfort: "I'm here to wrap you in the coziest, most caring hug of understanding.",
      encouragement: "You're braver than a lion wearing a superhero cape!",
      validation: "Your feelings are as important and beautiful as a rainbow after rain.",
      joy: "Your happiness is sparkling like the most magical glitter in the universe!"
    };

    const base = therapeuticBase[need];
    return this.addWhimsicalTherapeuticElements(base, whimsyLevel, context);
  }

  private identifyWhimsicalTherapeuticElements(response: string): string[] {
    const elements: string[] = [];

    if (/like.*magical|sparkling|glitter/.test(response.toLowerCase())) {
      elements.push('magical metaphors');
    }
    if (/braver than.*superhero/.test(response.toLowerCase())) {
      elements.push('empowering comparisons');
    }
    if (/coziest.*hug/.test(response.toLowerCase())) {
      elements.push('comforting imagery');
    }
    if (/rainbow|universe|stars/.test(response.toLowerCase())) {
      elements.push('wonder elements');
    }

    return elements;
  }

  private assessTherapeuticValue(
    response: string,
    need: 'comfort' | 'encouragement' | 'validation' | 'joy',
    context: PersonalityContext
  ): number {
    let value = 0.5; // Base therapeutic value

    // Check for need-specific therapeutic elements
    const therapeuticElements = {
      comfort: ['here', 'safe', 'caring', 'understanding', 'cozy'],
      encouragement: ['brave', 'strong', 'can', 'able', 'superhero'],
      validation: ['important', 'beautiful', 'feelings', 'okay', 'normal'],
      joy: ['happy', 'wonderful', 'magical', 'sparkling', 'amazing']
    };

    const expectedElements = therapeuticElements[need] || [];
    const elementCount = expectedElements.filter(element =>
      response.toLowerCase().includes(element)
    ).length;

    value += elementCount * 0.1;

    // Age-appropriate therapeutic language
    if (context.ageGroup === '3-5' && /simple|cozy|safe/.test(response.toLowerCase())) {
      value += 0.1;
    }

    return Math.min(1, value);
  }

  private calculatePlayfulnessBalance(
    response: string,
    need: 'comfort' | 'encouragement' | 'validation' | 'joy',
    whimsyLevel: number
  ): number {
    const playfulElements = (response.match(/magical|sparkling|superhero|rainbow|glitter/gi) || []).length;
    const therapeuticElements = (response.match(/understanding|caring|important|safe|here/gi) || []).length;

    const playfulnessRatio = playfulElements / Math.max(playfulElements + therapeuticElements, 1);
    const targetRatio = whimsyLevel * 0.6; // Target playfulness based on whimsy level

    return 1 - Math.abs(playfulnessRatio - targetRatio);
  }

  private calculateTherapeuticTiming(
    emotionalContext: any,
    history: InteractionMemory[]
  ): TherapeuticTiming {
    const { currentEmotion, emotionIntensity, situationContext, childAge } = emotionalContext;

    // Determine situation type
    let situationType: TherapeuticTiming['situationType'];
    if (['sad', 'anxious', 'frustrated', 'overwhelmed'].includes(currentEmotion)) {
      situationType = 'distress';
    } else if (['happy', 'excited'].includes(currentEmotion)) {
      situationType = 'excitement';
    } else if (currentEmotion === 'shy') {
      situationType = 'shyness';
    } else {
      situationType = 'confusion';
    }

    // Determine approach
    const approachMap = {
      distress: 'gentle',
      excitement: 'playful',
      shyness: 'gentle',
      confusion: 'supportive',
      frustration: 'supportive'
    };

    const recommendedApproach = approachMap[situationType] || 'supportive';

    // Calculate intensity level
    const intensityLevel = this.calculateTherapeuticIntensity(
      currentEmotion,
      emotionIntensity,
      childAge
    );

    // Determine duration
    const durationRecommendation = this.calculateTherapeuticDuration(
      situationType,
      childAge,
      history
    );

    return {
      situationType,
      recommendedApproach: (recommendedApproach as TherapeuticTiming['recommendedApproach']),
      intensityLevel,
      durationRecommendation
    };
  }

  private generateApproachRecommendation(
    timing: TherapeuticTiming,
    context: any
  ): string {
    const recommendations = {
      gentle: "Use soft, caring language with plenty of emotional validation and support.",
      playful: "Match their energy with enthusiasm while maintaining emotional connection.",
      supportive: "Provide steady, understanding presence with problem-solving support.",
      calm: "Maintain peaceful, reassuring energy with clear, simple communication."
    };

    return recommendations[timing.recommendedApproach] ?? recommendations.supportive;
  }

  private createIntensityGuidance(timing: TherapeuticTiming, context: any): string {
    if (timing.intensityLevel < 0.3) {
      return "Very gentle approach - minimal stimulation, maximum comfort and safety.";
    } else if (timing.intensityLevel < 0.6) {
      return "Moderate approach - balanced energy with emotional sensitivity.";
    } else {
      return "Higher energy approach - match enthusiasm while maintaining emotional awareness.";
    }
  }

  private identifyContextualFactors(
    context: any,
    history: InteractionMemory[]
  ): string[] {
    const factors: string[] = [];

    if (context.childAge < 6) factors.push('young age requires extra gentleness');
    if (context.emotionIntensity > 0.8) factors.push('high emotional intensity');
    if (history.length > 0) {
      const recentEmotions = history.slice(-3).map(h => h.emotionalState);
      if (recentEmotions.filter(e => ['sad', 'anxious'].includes(e)).length > 1) {
        factors.push('recent emotional vulnerability');
      }
    }

    return factors;
  }

  private processInteractionForMemory(interaction: any, currentMemory: any): any {
    const updated = { ...currentMemory };

    // Update preferences based on effectiveness
    if (interaction.effectiveness > 0.7) {
      updated.effectivePatterns.push({
        emotion: interaction.emotion,
        personalityTraits: interaction.personalityUsed,
        responseType: this.categorizeResponse(interaction.response),
        effectiveness: interaction.effectiveness
      });
    }

    // Track challenging scenarios
    if (interaction.effectiveness < 0.4) {
      updated.challengingScenarios.push({
        emotion: interaction.emotion,
        context: interaction.context.conversationPhase,
        attempted: interaction.response,
        childReaction: interaction.childReaction
      });
    }

    // Update personality optimizations
    Object.keys(interaction.personalityUsed).forEach(trait => {
      if (!updated.personalityOptimizations[trait]) {
        updated.personalityOptimizations[trait] = [];
      }
      updated.personalityOptimizations[trait].push({
        value: interaction.personalityUsed[trait],
        effectiveness: interaction.effectiveness,
        emotion: interaction.emotion
      });
    });

    return updated;
  }

  private generateLearningInsights(memoryUpdate: any, interaction: any): string[] {
    const insights: string[] = [];

    if (interaction.effectiveness > 0.8) {
      insights.push(`High effectiveness with ${interaction.emotion} using ${this.categorizeResponse(interaction.response)}`);
    }

    if (memoryUpdate.effectivePatterns.length > 5) {
      const commonTraits = this.findCommonEffectiveTraits(memoryUpdate.effectivePatterns);
      insights.push(`Consistently effective traits: ${commonTraits.join(', ')}`);
    }

    return insights;
  }

  private calculatePersonalityAdjustments(
    memoryUpdate: any,
    currentPersonality: PersonalityTraits
  ): PersonalityTraits {
    const adjustments = { ...currentPersonality };

    // Analyze effective patterns to suggest adjustments
    Object.entries(memoryUpdate.personalityOptimizations).forEach(([trait, data]: [string, any[]]) => {
      if (data.length > 3) {
        const avgEffectiveness = data.reduce((sum, d) => sum + d.effectiveness, 0) / data.length;
        const avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;
        
        if (avgEffectiveness > 0.7) {
          // Adjust toward effective values
          adjustments[trait as keyof PersonalityTraits] = 
            (adjustments[trait as keyof PersonalityTraits] + avgValue) / 2;
        }
      }
    });

    return adjustments;
  }

  private assessConfidenceImprovement(memoryUpdate: any, previousMemory: any): number {
    const currentPatterns = memoryUpdate.effectivePatterns.length;
    const previousPatterns = previousMemory.effectivePatterns?.length || 0;
    
    return Math.min(0.2, (currentPatterns - previousPatterns) * 0.05);
  }

  private synthesizeEmotionalResponse(
    validation: string,
    therapy: string,
    timing: TherapeuticTiming,
    context: PersonalityContext
  ): string {
    if (timing.recommendedApproach === 'gentle') {
      return `${validation} ${therapy}`;
    } else if (timing.recommendedApproach === 'playful') {
      return `${validation} ${therapy}`;
    } else {
      return `${validation} ${therapy}`;
    }
  }

  private calculateIntegratedConfidence(confidenceScores: number[]): number {
    return confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
  }

  // Helper methods
  private calculateEnergyFromVoice(analysis: VoiceEmotionAnalysis): number {
    let energy = 0.5;
    
    if (analysis.toneIndicators.energy === 'high') energy += 0.3;
    if (analysis.toneIndicators.energy === 'medium') energy += 0.1;
    if (analysis.wordChoiceIndicators.excitementWords > 1) energy += 0.2;
    
    return Math.min(1, energy);
  }

  private mapEmotionToNeed(emotion: EmotionalState): 'comfort' | 'encouragement' | 'validation' | 'joy' {
    const mapping = {
      sad: 'comfort',
      anxious: 'comfort',
      frustrated: 'encouragement',
      shy: 'encouragement',
      happy: 'joy',
      excited: 'joy',
      curious: 'validation',
      neutral: 'validation'
    };

    return mapping[emotion] || 'validation';
  }

  private personalizeValidation(
    validation: string,
    context: PersonalityContext,
    childInput: string
  ): string {
    // Add age-appropriate personalization
    if (context.ageGroup === '3-5') {
      return validation.replace(/completely/g, 'very').replace(/absolutely/g, 'really');
    }
    return validation;
  }

  private addWhimsicalTherapeuticElements(
    base: string,
    whimsyLevel: number,
    context: PersonalityContext
  ): string {
    if (whimsyLevel > 0.7) {
      return base.replace(/magical/g, 'super-duper magical');
    }
    return base;
  }

  private calculateTherapeuticIntensity(
    emotion: EmotionalState,
    emotionIntensity: number,
    childAge: number
  ): number {
    let intensity = 0.5;

    // Adjust for emotion type
    if (['sad', 'anxious', 'overwhelmed'].includes(emotion)) {
      intensity = 0.2; // Very gentle
    } else if (['happy', 'excited'].includes(emotion)) {
      intensity = 0.8; // Higher energy
    }

    // Adjust for age
    if (childAge < 6) {
      intensity = Math.min(intensity, 0.6); // Cap intensity for young children
    }

    return intensity;
  }

  private calculateTherapeuticDuration(
    situationType: TherapeuticTiming['situationType'],
    childAge: number,
    history: InteractionMemory[]
  ): TherapeuticTiming['durationRecommendation'] {
    if (childAge < 6) {
      return 'brief'; // Young children need shorter interactions
    } else if (situationType === 'distress') {
      return 'extended'; // Distress needs more time
    } else {
      return 'moderate';
    }
  }

  private findCommonEmotions(patterns: VoiceEmotionAnalysis[]): EmotionalState[] {
    const emotionCounts: Record<string, number> = {};
    patterns.forEach(p => {
      emotionCounts[p.detectedEmotion] = (emotionCounts[p.detectedEmotion] || 0) + 1;
    });

    return Object.entries(emotionCounts)
      .filter(([_, count]) => count > 1)
      .map(([emotion, _]) => emotion as EmotionalState);
  }

  private calculateConsistency(
    current: VoiceEmotionAnalysis,
    history: VoiceEmotionAnalysis[]
  ): number {
    const recentEmotions = history.map(h => h.detectedEmotion);
    const matchCount = recentEmotions.filter(e => e === current.detectedEmotion).length;
    return matchCount / Math.max(recentEmotions.length, 1);
  }

  private categorizeResponse(response: string): string {
    if (/comfort|safe|here/.test(response.toLowerCase())) return 'comforting';
    if (/brave|strong|can/.test(response.toLowerCase())) return 'encouraging';
    if (/understand|feel|hear/.test(response.toLowerCase())) return 'validating';
    if (/happy|joy|wonderful/.test(response.toLowerCase())) return 'celebratory';
    return 'supportive';
  }

  private findCommonEffectiveTraits(patterns: any[]): string[] {
    const traitEffectiveness: Record<string, number[]> = {};
    
    patterns.forEach(pattern => {
      Object.entries(pattern.personalityTraits).forEach(([trait, value]) => {
        if (!traitEffectiveness[trait]) traitEffectiveness[trait] = [];
        traitEffectiveness[trait].push(pattern.effectiveness);
      });
    });

    return Object.entries(traitEffectiveness)
      .filter(([_, effectiveness]) => {
        const avg = effectiveness.reduce((sum, e) => sum + e, 0) / effectiveness.length;
        return avg > 0.7;
      })
      .map(([trait, _]) => trait);
  }
}