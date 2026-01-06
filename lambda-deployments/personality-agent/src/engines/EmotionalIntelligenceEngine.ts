import {
  EmotionalState,
  VoiceEmotionAnalysis,
  PersonalityContext,
  PersonalityTraits,
  TherapeuticTiming
} from '../types';

/**
 * Core emotional intelligence engine that recognizes, validates, and responds to children's emotional states
 * Implements Requirement 19.1: High emotional EQ with emotion recognition and validation
 */
export class EmotionalIntelligenceEngine {
  private emotionPatterns: Map<string, string[]> = new Map();
  private validationResponses: Map<EmotionalState, string[]> = new Map();

  constructor() {
    this.initializeEmotionPatterns();
    this.initializeValidationResponses();
  }

  /**
   * Analyzes voice patterns to detect emotional state
   * Looks at tone, pace, word choice, and energy levels
   */
  analyzeVoiceEmotion(voiceInput: string, audioMetrics?: any): VoiceEmotionAnalysis {
    const wordChoiceIndicators = this.analyzeWordChoice(voiceInput);
    const toneIndicators = this.analyzeToneFromText(voiceInput);
    
    // Combine text analysis with audio metrics if available
    const detectedEmotion = this.determineEmotionalState(wordChoiceIndicators, toneIndicators);
    const confidence = this.calculateConfidence(wordChoiceIndicators, toneIndicators);

    return {
      detectedEmotion,
      confidence,
      toneIndicators,
      wordChoiceIndicators
    };
  }

  /**
   * Recognizes emotional state from context and input
   * Considers conversation history and current situation
   */
  recognizeEmotionalState(
    userInput: string,
    context: PersonalityContext,
    voiceAnalysis?: VoiceEmotionAnalysis
  ): EmotionalState {
    // Start with voice analysis if available
    if (voiceAnalysis && voiceAnalysis.confidence > 0.7) {
      return voiceAnalysis.detectedEmotion;
    }

    // Analyze text patterns
    const textEmotion = this.analyzeTextEmotionalCues(userInput);
    
    // Consider context from recent interactions
    const contextEmotion = this.inferFromContext(context);
    
    // Combine signals with weighted confidence
    return this.combineEmotionalSignals([
      { emotion: textEmotion, weight: 0.6 },
      { emotion: contextEmotion, weight: 0.4 }
    ]);
  }

  /**
   * Validates and reflects the child's emotional state with empathy
   * Creates appropriate emotional responses that show understanding
   */
  validateEmotionalState(
    detectedEmotion: EmotionalState,
    context: PersonalityContext
  ): string {
    const validationPhrases = this.validationResponses.get(detectedEmotion) || [];
    const ageAppropriate = this.filterForAge(validationPhrases, context.ageGroup);
    
    // Select validation phrase based on context
    const selectedValidation = this.selectContextualValidation(
      ageAppropriate,
      context.conversationPhase,
      detectedEmotion
    );

    return selectedValidation;
  }

  /**
   * Determines appropriate emotional response based on child's state
   * Balances empathy with encouragement and support
   */
  generateEmpatheticResponse(
    childEmotion: EmotionalState,
    context: PersonalityContext,
    conversationGoal: string
  ): {
    response: string;
    emotionalTone: EmotionalState;
    empathicElements: string[];
  } {
    const therapeuticTiming = this.assessTherapeuticTiming(childEmotion, context);
    const empathicElements = this.selectEmpathicElements(childEmotion, context.ageGroup);
    
    const response = this.craftEmpatheticResponse(
      childEmotion,
      therapeuticTiming,
      empathicElements,
      conversationGoal,
      context
    );

    const emotionalTone = this.determineResponseTone(childEmotion, therapeuticTiming);

    return {
      response,
      emotionalTone,
      empathicElements
    };
  }

  /**
   * Adjusts personality traits based on emotional context
   * Increases empathy and warmth when child needs support
   */
  adjustPersonalityForEmotion(
    baseTraits: PersonalityTraits,
    childEmotion: EmotionalState,
    context: PersonalityContext
  ): PersonalityTraits {
    const adjustments = this.getEmotionalAdjustments(childEmotion);
    
    return {
      warmth: Math.min(1, baseTraits.warmth + adjustments.warmth),
      whimsy: Math.max(0, baseTraits.whimsy + adjustments.whimsy),
      empathy: Math.min(1, baseTraits.empathy + adjustments.empathy),
      youthfulness: Math.max(0, baseTraits.youthfulness + adjustments.youthfulness),
      playfulness: Math.max(0, baseTraits.playfulness + adjustments.playfulness),
      supportiveness: Math.min(1, baseTraits.supportiveness + adjustments.supportiveness)
    };
  }

  /**
   * Assesses when to be silly vs gentle based on emotional context
   */
  assessTherapeuticTiming(
    childEmotion: EmotionalState,
    context: PersonalityContext
  ): TherapeuticTiming {
    const situationType = this.categorizeSituation(childEmotion, context);
    const recommendedApproach = this.determineTherapeuticApproach(situationType, childEmotion);
    const intensityLevel = this.calculateIntensityLevel(childEmotion, context);
    const durationRecommendation = this.estimateDuration(situationType, context.ageGroup);

    return {
      situationType,
      recommendedApproach,
      intensityLevel,
      durationRecommendation
    };
  }

  private initializeEmotionPatterns(): void {
    // Positive emotion patterns
    this.emotionPatterns.set('excitement', ['excited', 'amazing', 'awesome', 'wow', 'cool', 'yes!']);
    this.emotionPatterns.set('happiness', ['happy', 'good', 'great', 'fun', 'love', 'like']);
    this.emotionPatterns.set('curiosity', ['what', 'how', 'why', 'tell me', 'show me', 'wonder']);
    
    // Challenging emotion patterns
    this.emotionPatterns.set('sadness', ['sad', 'upset', 'cry', 'hurt', 'miss', 'lonely']);
    this.emotionPatterns.set('anxiety', ['scared', 'worried', 'nervous', 'afraid', 'anxious']);
    this.emotionPatterns.set('frustration', ['mad', 'angry', 'frustrated', 'annoyed', 'grr']);
    this.emotionPatterns.set('shyness', ['shy', 'quiet', 'maybe', 'i guess', 'um', 'uh']);
  }

  private initializeValidationResponses(): void {
    this.validationResponses.set('happy', [
      "I can hear the joy in your voice! That makes me happy too!",
      "Your happiness is absolutely sparkling today!",
      "What a wonderful, giggly feeling you have!"
    ]);

    this.validationResponses.set('excited', [
      "Oh my goodness, your excitement is bouncing around like a happy kangaroo!",
      "I can feel your excitement bubbling up like fizzy lemonade!",
      "Your energy is more sparkly than a unicorn's mane!"
    ]);

    this.validationResponses.set('sad', [
      "I can hear that you're feeling a bit sad right now, and that's okay.",
      "Sometimes we feel sad, and I'm here with you through those feelings.",
      "Your feelings are important, and I want to understand how you're feeling."
    ]);

    this.validationResponses.set('anxious', [
      "I notice you might be feeling a little worried, and that's completely normal.",
      "It's okay to feel nervous sometimes. I'm right here with you.",
      "Let's take this nice and slow together, there's no rush at all."
    ]);

    this.validationResponses.set('shy', [
      "I can tell you might be feeling a little shy, and that's perfectly wonderful.",
      "Take your time - there's no hurry at all. I'm here whenever you're ready.",
      "Being shy is like being a gentle butterfly - beautiful and special."
    ]);
  }

  private analyzeWordChoice(input: string): VoiceEmotionAnalysis['wordChoiceIndicators'] {
    const words = input.toLowerCase().split(/\s+/);
    
    const positiveWords = words.filter(word => 
      ['happy', 'good', 'great', 'awesome', 'cool', 'fun', 'love', 'like', 'yes', 'wow'].includes(word)
    ).length;

    const negativeWords = words.filter(word =>
      ['sad', 'bad', 'no', 'hate', 'scared', 'worried', 'mad', 'angry'].includes(word)
    ).length;

    const excitementWords = words.filter(word =>
      ['excited', 'amazing', 'awesome', 'wow', 'cool', 'yay', '!'].includes(word)
    ).length;

    const hesitationWords = words.filter(word =>
      ['um', 'uh', 'maybe', 'i guess', 'i think', 'kinda', 'sorta'].includes(word)
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

  private calculateConfidence(
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

  private analyzeTextEmotionalCues(input: string): EmotionalState {
    const lowerInput = input.toLowerCase();
    
    for (const [emotion, patterns] of this.emotionPatterns.entries()) {
      const matchCount = patterns.filter(pattern => lowerInput.includes(pattern)).length;
      if (matchCount > 0) {
        return emotion as EmotionalState;
      }
    }
    
    return 'neutral';
  }

  private inferFromContext(context: PersonalityContext): EmotionalState {
    // Look at recent interaction history for emotional patterns
    if (context.sessionHistory.length > 0) {
      const recentEmotions = context.sessionHistory
        .slice(-3)
        .map(interaction => interaction.emotionalState);
      
      // Return most common recent emotion
      const emotionCounts = recentEmotions.reduce((acc, emotion) => {
        acc[emotion] = (acc[emotion] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostCommon = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (mostCommon) {
        return mostCommon[0] as EmotionalState;
      }
    }
    
    return 'neutral';
  }

  private combineEmotionalSignals(signals: Array<{emotion: EmotionalState, weight: number}>): EmotionalState {
    const weightedScores: Record<string, number> = {};
    
    signals.forEach(({emotion, weight}) => {
      weightedScores[emotion] = (weightedScores[emotion] || 0) + weight;
    });
    
    const topEmotion = Object.entries(weightedScores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return (topEmotion?.[0] as EmotionalState) || 'neutral';
  }

  private filterForAge(phrases: string[], ageGroup: string): string[] {
    // Age-appropriate filtering logic would go here
    // For now, return all phrases (could be enhanced with age-specific filtering)
    return phrases;
  }

  private selectContextualValidation(
    phrases: string[],
    phase: string,
    emotion: EmotionalState
  ): string {
    // Select most appropriate validation phrase based on context
    if (phrases.length === 0) {
      return "I hear you, and I'm here with you.";
    }
    
    // Simple selection for now - could be enhanced with more sophisticated logic
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  private selectEmpathicElements(emotion: EmotionalState, ageGroup: string): string[] {
    const elements: Partial<Record<EmotionalState, string[]>> = {
      happy: ['celebration', 'shared joy', 'enthusiasm'],
      excited: ['energy matching', 'enthusiasm amplification', 'shared excitement'],
      sad: ['gentle comfort', 'validation', 'supportive presence'],
      anxious: ['reassurance', 'calm presence', 'safety'],
      shy: ['patience', 'gentle encouragement', 'no pressure'],
      frustrated: ['understanding', 'problem-solving support', 'patience']
    };
    
    return elements[emotion] ?? ['understanding', 'support'];
  }

  private craftEmpatheticResponse(
    childEmotion: EmotionalState,
    timing: TherapeuticTiming,
    elements: string[],
    goal: string,
    context: PersonalityContext
  ): string {
    // This would be enhanced with more sophisticated response generation
    const validation = this.validateEmotionalState(childEmotion, context);
    const transition = this.createTransitionToGoal(goal, timing.recommendedApproach);
    
    return `${validation} ${transition}`;
  }

  private determineResponseTone(emotion: EmotionalState, timing: TherapeuticTiming): EmotionalState {
    // Match or complement the child's emotional state appropriately
    const toneMap: Partial<Record<EmotionalState, EmotionalState>> = {
      happy: 'happy',
      excited: 'excited',
      sad: 'calm',
      anxious: 'calm',
      shy: 'calm',
      frustrated: 'calm',
      curious: 'curious',
      confident: 'confident',
      tired: 'calm',
      overwhelmed: 'calm',
      neutral: 'calm'
    };
    
    return toneMap[emotion] || 'calm';
  }

  private getEmotionalAdjustments(emotion: EmotionalState): PersonalityTraits {
    const adjustments: Partial<Record<EmotionalState, Partial<PersonalityTraits>>> = {
      sad: { empathy: 0.3, warmth: 0.2, whimsy: -0.2, supportiveness: 0.3 },
      anxious: { empathy: 0.2, warmth: 0.3, playfulness: -0.1, supportiveness: 0.2 },
      shy: { empathy: 0.2, warmth: 0.1, youthfulness: -0.1, supportiveness: 0.1 },
      frustrated: { empathy: 0.3, warmth: 0.2, whimsy: -0.1, supportiveness: 0.2 },
      excited: { playfulness: 0.2, youthfulness: 0.1, whimsy: 0.1 },
      happy: { playfulness: 0.1, whimsy: 0.1, youthfulness: 0.1 }
    };
    
    const adjustment = adjustments[emotion] || {};
    
    return {
      warmth: adjustment.warmth || 0,
      whimsy: adjustment.whimsy || 0,
      empathy: adjustment.empathy || 0,
      youthfulness: adjustment.youthfulness || 0,
      playfulness: adjustment.playfulness || 0,
      supportiveness: adjustment.supportiveness || 0
    };
  }

  private categorizeSituation(emotion: EmotionalState, context: PersonalityContext): TherapeuticTiming['situationType'] {
    if (['sad', 'anxious', 'frustrated'].includes(emotion)) return 'distress';
    if (['excited', 'happy'].includes(emotion)) return 'excitement';
    if (['shy'].includes(emotion)) return 'shyness';
    if (['frustrated'].includes(emotion)) return 'frustration';
    return 'distress'; // default
  }

  private determineTherapeuticApproach(
    situationType: TherapeuticTiming['situationType'],
    emotion: EmotionalState
  ): TherapeuticTiming['recommendedApproach'] {
    const approachMap: Partial<Record<TherapeuticTiming['situationType'], TherapeuticTiming['recommendedApproach']>> = {
      distress: 'gentle',
      excitement: 'playful',
      shyness: 'gentle',
      frustration: 'supportive',
      confusion: 'calm'
    };
    
    return approachMap[situationType] ?? 'supportive';
  }

  private calculateIntensityLevel(emotion: EmotionalState, context: PersonalityContext): number {
    // Base intensity on emotion strength and context
    const intensityMap: Partial<Record<EmotionalState, number>> = {
      excited: 0.8,
      happy: 0.6,
      sad: 0.3,
      anxious: 0.2,
      shy: 0.2,
      frustrated: 0.4,
      curious: 0.5,
      confident: 0.7,
      tired: 0.2,
      overwhelmed: 0.1,
      neutral: 0.4,
      calm: 0.3
    };
    
    return intensityMap[emotion] ?? 0.4;
  }

  private estimateDuration(
    situationType: TherapeuticTiming['situationType'],
    ageGroup: string
  ): TherapeuticTiming['durationRecommendation'] {
    // Younger children need shorter interactions
    if (ageGroup === '3-5') {
      return situationType === 'distress' ? 'brief' : 'brief';
    } else if (ageGroup === '6-8') {
      return situationType === 'distress' ? 'moderate' : 'moderate';
    } else {
      return situationType === 'distress' ? 'extended' : 'moderate';
    }
  }

  private createTransitionToGoal(goal: string, approach: TherapeuticTiming['recommendedApproach']): string {
    const transitions = {
      gentle: "Let's take this nice and easy together.",
      playful: "Now, let's have some fun!",
      supportive: "I'm here to help you with this.",
      calm: "Let's continue step by step.",
      silly: "Ready for something wonderfully silly?"
    };
    
    return transitions[approach] || "Let's continue our story adventure!";
  }
}