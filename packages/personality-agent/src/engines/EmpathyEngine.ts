import {
  EmotionalState,
  PersonalityContext,
  EmpathicPatterns,
  InteractionMemory
} from '../types';

/**
 * Empathy system that provides feeling reflection and supportive presence
 * Implements Requirement 19.3: Empathy with feeling reflection and supportive presence
 */
export class EmpathyEngine {
  private empathicPatterns!: EmpathicPatterns;
  private emotionalMirroringMap: Map<EmotionalState, EmotionalState[]> = new Map();
  private supportiveResponses: Map<string, string[]> = new Map();
  private validationTechniques: Map<EmotionalState, string[]> = new Map();

  constructor() {
    this.initializeEmpathicPatterns();
    this.initializeEmotionalMirroring();
    this.initializeSupportiveResponses();
    this.initializeValidationTechniques();
  }

  /**
   * Reflects and validates the child's feelings with appropriate empathy
   * Shows understanding and acceptance of their emotional state
   */
  reflectFeelings(
    childEmotion: EmotionalState,
    context: PersonalityContext,
    childInput: string
  ): {
    reflection: string;
    validation: string;
    empathicConnection: string;
    supportLevel: number;
  } {
    const reflection = this.createEmotionalReflection(childEmotion, childInput, context);
    const validation = this.validateEmotionalExperience(childEmotion, context);
    const empathicConnection = this.establishEmpathicConnection(childEmotion, context);
    const supportLevel = this.calculateSupportLevel(childEmotion, context);

    return {
      reflection,
      validation,
      empathicConnection,
      supportLevel
    };
  }

  /**
   * Provides supportive presence that makes children feel understood and safe
   * Adapts support style based on child's needs and emotional state
   */
  provideSupportivePresence(
    childEmotion: EmotionalState,
    context: PersonalityContext,
    intensityNeeded: number
  ): {
    supportiveMessage: string;
    presenceType: string;
    comfortLevel: number;
    empathicElements: string[];
  } {
    const presenceType = this.determineSupportivePresenceType(childEmotion, context);
    const supportiveMessage = this.craftSupportiveMessage(
      childEmotion,
      presenceType,
      intensityNeeded,
      context
    );
    const comfortLevel = this.assessComfortLevel(supportiveMessage, childEmotion);
    const empathicElements = this.extractEmpathicElements(supportiveMessage);

    return {
      supportiveMessage,
      presenceType,
      comfortLevel,
      empathicElements
    };
  }

  /**
   * Creates emotional mirroring that helps children feel understood
   * Matches their emotional energy appropriately without overwhelming
   */
  createEmotionalMirroring(
    childEmotion: EmotionalState,
    context: PersonalityContext,
    mirroringIntensity: number = 0.7
  ): {
    mirroredEmotion: EmotionalState;
    mirroringResponse: string;
    connectionStrength: number;
    appropriatenessScore: number;
  } {
    const mirroredEmotion = this.selectMirroredEmotion(childEmotion, mirroringIntensity);
    const mirroringResponse = this.generateMirroringResponse(
      childEmotion,
      mirroredEmotion,
      context
    );
    const connectionStrength = this.calculateConnectionStrength(
      childEmotion,
      mirroredEmotion,
      context
    );
    const appropriatenessScore = this.assessMirroringAppropriateness(
      childEmotion,
      mirroredEmotion,
      context
    );

    return {
      mirroredEmotion,
      mirroringResponse,
      connectionStrength,
      appropriatenessScore
    };
  }

  /**
   * Generates encouraging responses that build confidence and self-worth
   * Balances empathy with gentle motivation and support
   */
  generateEncouragement(
    context: PersonalityContext,
    achievementLevel: 'small' | 'medium' | 'large',
    childEmotion: EmotionalState
  ): {
    encouragement: string;
    motivationalElements: string[];
    confidenceBoost: number;
    empathicSupport: string;
  } {
    const encouragement = this.craftEncouragingMessage(
      achievementLevel,
      childEmotion,
      context
    );
    const motivationalElements = this.identifyMotivationalElements(encouragement);
    const confidenceBoost = this.calculateConfidenceBoost(
      encouragement,
      achievementLevel,
      context
    );
    const empathicSupport = this.addEmpathicSupport(encouragement, childEmotion);

    return {
      encouragement,
      motivationalElements,
      confidenceBoost,
      empathicSupport
    };
  }

  /**
   * Adapts empathic response based on child's communication style and needs
   * Learns from interaction history to improve empathic connection
   */
  adaptEmpathicResponse(
    baseResponse: string,
    context: PersonalityContext,
    interactionHistory: InteractionMemory[]
  ): {
    adaptedResponse: string;
    adaptationReasons: string[];
    empathicImprovements: string[];
    personalizedElements: string[];
  } {
    const adaptationReasons = this.analyzeAdaptationNeeds(context, interactionHistory);
    const adaptedResponse = this.applyEmpathicAdaptations(
      baseResponse,
      adaptationReasons,
      context
    );
    const empathicImprovements = this.identifyEmpathicImprovements(
      baseResponse,
      adaptedResponse
    );
    const personalizedElements = this.extractPersonalizedElements(
      adaptedResponse,
      context
    );

    return {
      adaptedResponse,
      adaptationReasons,
      empathicImprovements,
      personalizedElements
    };
  }

  /**
   * Provides comfort during difficult emotional moments
   * Uses gentle, soothing language that helps children feel safe
   */
  provideComfort(
    distressType: 'sadness' | 'fear' | 'frustration' | 'overwhelm',
    context: PersonalityContext,
    comfortLevel: 'gentle' | 'moderate' | 'strong'
  ): {
    comfortMessage: string;
    soothingElements: string[];
    safetyAssurance: string;
    emotionalSupport: string;
  } {
    const comfortMessage = this.craftComfortMessage(distressType, comfortLevel, context);
    const soothingElements = this.identifySoothingElements(comfortMessage);
    const safetyAssurance = this.createSafetyAssurance(distressType, context);
    const emotionalSupport = this.generateEmotionalSupport(distressType, context);

    return {
      comfortMessage,
      soothingElements,
      safetyAssurance,
      emotionalSupport
    };
  }

  private initializeEmpathicPatterns(): void {
    this.empathicPatterns = {
      validationPhrases: [
        "I can hear how you're feeling",
        "Your feelings make complete sense",
        "It's perfectly okay to feel that way",
        "I understand what you're going through",
        "Your emotions are important and valid",
        "Thank you for sharing how you feel with me",
        "I can see this really matters to you",
        "Your feelings are completely normal"
      ],
      supportiveResponses: [
        "I'm here with you through this",
        "You're not alone in feeling this way",
        "We can work through this together",
        "I believe in you and your strength",
        "You're doing the best you can",
        "It's okay to take your time",
        "I'm proud of you for sharing",
        "You're safe here with me"
      ],
      encouragementPhrases: [
        "You're incredibly brave for trying",
        "I can see how hard you're working",
        "Your effort is what matters most",
        "You're learning and growing every day",
        "I'm so proud of your creativity",
        "You have such wonderful ideas",
        "Your imagination is amazing",
        "You're doing something really special"
      ],
      comfortingWords: [
        "gentle", "safe", "warm", "peaceful", "calm", "secure",
        "protected", "understood", "accepted", "valued", "cherished", "loved"
      ],
      celebrationPhrases: [
        "That's absolutely wonderful!",
        "I'm so excited for you!",
        "You should feel proud of yourself!",
        "That's a fantastic achievement!",
        "Your joy makes me happy too!",
        "What an amazing accomplishment!",
        "You've done something really special!",
        "I'm celebrating with you!"
      ]
    };
  }

  private initializeEmotionalMirroring(): void {
    // Map child emotions to appropriate mirrored responses
    this.emotionalMirroringMap.set('happy', ['happy', 'excited', 'calm']);
    this.emotionalMirroringMap.set('excited', ['excited', 'happy', 'curious']);
    this.emotionalMirroringMap.set('sad', ['calm', 'neutral', 'calm']);
    this.emotionalMirroringMap.set('anxious', ['calm', 'neutral', 'calm']);
    this.emotionalMirroringMap.set('frustrated', ['calm', 'neutral', 'calm']);
    this.emotionalMirroringMap.set('shy', ['calm', 'neutral', 'calm']);
    this.emotionalMirroringMap.set('curious', ['curious', 'excited', 'happy']);
    this.emotionalMirroringMap.set('confident', ['confident', 'happy', 'calm']);
  }

  private initializeSupportiveResponses(): void {
    this.supportiveResponses.set('emotional_validation', [
      "Your feelings are completely valid and important.",
      "It makes perfect sense that you would feel this way.",
      "Thank you for trusting me with your feelings.",
      "I can really hear what you're experiencing."
    ]);

    this.supportiveResponses.set('gentle_encouragement', [
      "You're doing wonderfully, even when things feel hard.",
      "I can see how much effort you're putting in.",
      "Every step you take is progress, no matter how small.",
      "You're braver than you know."
    ]);

    this.supportiveResponses.set('safety_assurance', [
      "You're completely safe here with me.",
      "There's no pressure at all - we can go at your pace.",
      "I'm here to support you no matter what.",
      "This is a safe space for all your feelings."
    ]);
  }

  private initializeValidationTechniques(): void {
    this.validationTechniques.set('happy', [
      "I can feel your happiness shining through!",
      "Your joy is absolutely contagious!",
      "It's wonderful to hear how happy you are!"
    ]);

    this.validationTechniques.set('sad', [
      "I can hear the sadness in your voice, and that's okay.",
      "It's completely normal to feel sad sometimes.",
      "Your sadness shows how much you care."
    ]);

    this.validationTechniques.set('anxious', [
      "I understand that you're feeling worried right now.",
      "It's natural to feel anxious about new things.",
      "Your concerns are completely valid."
    ]);

    this.validationTechniques.set('frustrated', [
      "I can tell you're feeling frustrated, and that makes sense.",
      "It's okay to feel frustrated when things are challenging.",
      "Your frustration shows how much you want to succeed."
    ]);
  }

  private createEmotionalReflection(
    emotion: EmotionalState,
    input: string,
    context: PersonalityContext
  ): string {
    const reflectionTemplates: Record<EmotionalState, string> = {
      happy: "I can hear the happiness in your voice when you say that!",
      excited: "Your excitement is absolutely bubbling over!",
      sad: "I can sense that you're feeling sad about this.",
      anxious: "I notice you might be feeling a bit worried.",
      frustrated: "It sounds like you're feeling frustrated right now.",
      shy: "I can tell you might be feeling a little shy, and that's perfectly okay.",
      calm: "I can feel the calmness in your voice.",
      confident: "I can hear the confidence in what you're saying!",
      curious: "I can sense your curiosity about this!",
      tired: "I can tell you might be feeling a bit tired.",
      overwhelmed: "I notice you might be feeling overwhelmed right now.",
      neutral: "I can hear how you're feeling."
    };

    const baseReflection = reflectionTemplates[emotion] || "I can hear how you're feeling.";

    // Personalize based on age
    return this.personalizeForAge(baseReflection, context.ageGroup);
  }

  private validateEmotionalExperience(
    emotion: EmotionalState,
    context: PersonalityContext
  ): string {
    const validations = this.validationTechniques.get(emotion) || [
      "Your feelings are completely valid and important."
    ];

    const selectedValidation = validations[Math.floor(Math.random() * validations.length)];
    return this.personalizeForAge(selectedValidation, context.ageGroup);
  }

  private establishEmpathicConnection(
    emotion: EmotionalState,
    context: PersonalityContext
  ): string {
    const connectionPhrases: Record<EmotionalState, string> = {
      happy: "Your happiness makes me feel happy too!",
      excited: "I'm getting excited right along with you!",
      sad: "I'm here with you in this sad moment.",
      anxious: "I want you to know you're not alone with these worries.",
      frustrated: "I understand how frustrating this must be for you.",
      shy: "I appreciate you sharing with me, even when you're feeling shy.",
      calm: "I'm feeling calm and peaceful with you.",
      confident: "Your confidence is inspiring!",
      curious: "I'm curious about this too!",
      tired: "I understand you're feeling tired right now.",
      overwhelmed: "I'm here to help you through this overwhelming moment.",
      neutral: "I'm here with you."
    };

    const connection = connectionPhrases[emotion] || "I'm here with you.";
    return this.personalizeForAge(connection, context.ageGroup);
  }

  private calculateSupportLevel(
    emotion: EmotionalState,
    context: PersonalityContext
  ): number {
    const baseSupportLevels = {
      happy: 0.3,
      excited: 0.4,
      sad: 0.9,
      anxious: 0.8,
      frustrated: 0.7,
      shy: 0.6,
      curious: 0.4,
      confident: 0.3,
      tired: 0.6,
      overwhelmed: 0.9,
      neutral: 0.4,
      calm: 0.3
    };

    let supportLevel = baseSupportLevels[emotion] || 0.5;

    // Adjust for age - younger children may need more support
    if (context.ageGroup === '3-5') {
      supportLevel += 0.1;
    }

    return Math.min(1.0, supportLevel);
  }

  private determineSupportivePresenceType(
    emotion: EmotionalState,
    context: PersonalityContext
  ): string {
    const presenceTypes: Record<EmotionalState, string> = {
      happy: 'celebratory',
      excited: 'enthusiastic',
      sad: 'comforting',
      anxious: 'reassuring',
      frustrated: 'patient',
      shy: 'gentle',
      curious: 'encouraging',
      confident: 'affirming',
      calm: 'peaceful',
      tired: 'gentle',
      overwhelmed: 'reassuring',
      neutral: 'supportive'
    };

    return presenceTypes[emotion] || 'supportive';
  }

  private craftSupportiveMessage(
    emotion: EmotionalState,
    presenceType: string,
    intensity: number,
    context: PersonalityContext
  ): string {
    const messageTemplates: Record<string, string> = {
      comforting: "I'm right here with you, and everything is going to be okay.",
      reassuring: "You're completely safe, and there's no need to worry.",
      patient: "Take all the time you need. I'm not going anywhere.",
      gentle: "You're doing beautifully, and I'm so proud of you.",
      encouraging: "I believe in you and your amazing abilities.",
      celebratory: "This is so wonderful! I'm celebrating with you!",
      enthusiastic: "Your energy is absolutely infectious!",
      affirming: "You should feel proud of yourself - you're amazing!",
      peaceful: "I'm feeling calm and peaceful with you.",
      supportive: "I'm here to support you."
    };

    const baseMessage = messageTemplates[presenceType] || "I'm here to support you.";

    // Adjust intensity
    if (intensity > 0.7) {
      return this.amplifyMessage(baseMessage, context);
    } else if (intensity < 0.3) {
      return this.softenMessage(baseMessage, context);
    }

    return this.personalizeForAge(baseMessage, context.ageGroup);
  }

  private assessComfortLevel(message: string, emotion: EmotionalState): number {
    // Assess how comforting the message is likely to be
    const comfortWords = this.empathicPatterns.comfortingWords;
    const comfortWordCount = comfortWords.filter(word =>
      message.toLowerCase().includes(word)
    ).length;

    let comfortLevel = 0.5 + (comfortWordCount * 0.1);

    // Adjust based on emotion
    if (['sad', 'anxious', 'overwhelmed'].includes(emotion)) {
      comfortLevel += 0.2;
    }

    return Math.min(1.0, comfortLevel);
  }

  private extractEmpathicElements(message: string): string[] {
    const elements: string[] = [];

    if (message.includes("I can")) elements.push("perspective taking");
    if (message.includes("you're")) elements.push("direct address");
    if (message.includes("feel")) elements.push("emotional acknowledgment");
    if (message.includes("understand")) elements.push("understanding expression");
    if (message.includes("here")) elements.push("presence assurance");
    if (message.includes("safe")) elements.push("safety assurance");

    return elements;
  }

  private selectMirroredEmotion(
    childEmotion: EmotionalState,
    intensity: number
  ): EmotionalState {
    const possibleMirrors = this.emotionalMirroringMap.get(childEmotion) || ['calm'];

    // Select based on intensity
    if (intensity > 0.7 && possibleMirrors.length > 0) {
      return possibleMirrors[0] as EmotionalState;
    } else if (intensity > 0.4 && possibleMirrors.length > 1) {
      return possibleMirrors[1] as EmotionalState;
    } else if (possibleMirrors.length > 2) {
      return possibleMirrors[2] as EmotionalState;
    }

    return possibleMirrors[0] as EmotionalState || 'calm';
  }

  private generateMirroringResponse(
    childEmotion: EmotionalState,
    mirroredEmotion: EmotionalState,
    context: PersonalityContext
  ): string {
    const mirroringTemplates: Record<EmotionalState, string> = {
      happy: "I'm feeling happy right along with you!",
      excited: "Your excitement is making me excited too!",
      calm: "I'm feeling calm and peaceful with you.",
      sad: "I'm here with caring feelings for you.",
      anxious: "I'm here with gentle, understanding feelings.",
      frustrated: "I'm here with patient, caring feelings.",
      shy: "I'm here with gentle, accepting feelings.",
      confident: "I'm feeling confident in you too!",
      curious: "I'm feeling curious about this with you!",
      tired: "I'm here with gentle, restful feelings.",
      overwhelmed: "I'm here with calm, supportive feelings.",
      neutral: "I'm sharing this moment with you."
    };

    const response = mirroringTemplates[mirroredEmotion] || "I'm sharing this moment with you.";
    return this.personalizeForAge(response, context.ageGroup);
  }

  private calculateConnectionStrength(
    childEmotion: EmotionalState,
    mirroredEmotion: EmotionalState,
    context: PersonalityContext
  ): number {
    // Calculate how strong the empathic connection is likely to be
    let strength = 0.5;

    // Direct emotional matching increases connection
    if (childEmotion === mirroredEmotion) {
      strength += 0.3;
    }

    // Complementary emotions also create good connection
    const complementaryPairs: Array<[EmotionalState, EmotionalState]> = [
      ['sad', 'calm'],
      ['anxious', 'calm'],
      ['frustrated', 'calm']
    ];

    const isComplementary = complementaryPairs.some(pair =>
      (pair[0] === childEmotion && pair[1] === mirroredEmotion) ||
      (pair[1] === childEmotion && pair[0] === mirroredEmotion)
    );

    if (isComplementary) {
      strength += 0.2;
    }

    return Math.min(1.0, strength);
  }

  private assessMirroringAppropriateness(
    childEmotion: EmotionalState,
    mirroredEmotion: EmotionalState,
    context: PersonalityContext
  ): number {
    // Assess whether the mirroring is appropriate for the situation
    let appropriateness = 0.7;

    // Some emotions should not be directly mirrored
    const shouldNotMirror = ['sad', 'anxious', 'frustrated', 'overwhelmed'];

    if (shouldNotMirror.includes(childEmotion) && childEmotion === mirroredEmotion) {
      appropriateness -= 0.4;
    }

    // Age-appropriate adjustments
    if (context.ageGroup === '3-5' && mirroredEmotion === 'excited') {
      appropriateness += 0.2; // Younger children respond well to excitement
    }

    return Math.max(0.1, Math.min(1.0, appropriateness));
  }

  private craftEncouragingMessage(
    achievementLevel: 'small' | 'medium' | 'large',
    emotion: EmotionalState,
    context: PersonalityContext
  ): string {
    const encouragementTemplates = {
      small: "Every little step you take is wonderful progress!",
      medium: "You're doing such a great job - I'm really proud of you!",
      large: "Wow! What an amazing accomplishment! You should feel so proud!"
    };

    let message = encouragementTemplates[achievementLevel];

    // Adjust for emotional state
    if (emotion === 'shy') {
      message = `You were so brave to try that! ${message}`;
    } else if (emotion === 'frustrated') {
      message = `I know that was challenging, and ${message.toLowerCase()}`;
    }

    return this.personalizeForAge(message, context.ageGroup);
  }

  private identifyMotivationalElements(message: string): string[] {
    const elements: string[] = [];

    if (message.includes("proud")) elements.push("pride recognition");
    if (message.includes("great") || message.includes("wonderful")) elements.push("positive reinforcement");
    if (message.includes("progress") || message.includes("step")) elements.push("growth acknowledgment");
    if (message.includes("brave") || message.includes("try")) elements.push("courage recognition");

    return elements;
  }

  private calculateConfidenceBoost(
    message: string,
    achievementLevel: 'small' | 'medium' | 'large',
    context: PersonalityContext
  ): number {
    const baseBoosts = {
      small: 0.3,
      medium: 0.6,
      large: 0.9
    };

    let boost = baseBoosts[achievementLevel];

    // Positive words increase boost
    const positiveWords = ['amazing', 'wonderful', 'great', 'proud', 'fantastic'];
    const positiveCount = positiveWords.filter(word =>
      message.toLowerCase().includes(word)
    ).length;

    boost += positiveCount * 0.1;

    return Math.min(1.0, boost);
  }

  private addEmpathicSupport(message: string, emotion: EmotionalState): string {
    const supportAdditions: Partial<Record<EmotionalState, string>> = {
      shy: " You were so brave to share that with me.",
      anxious: " I want you to know you're completely safe.",
      sad: " I'm here with you through all your feelings.",
      frustrated: " I understand this has been challenging for you.",
      overwhelmed: " We can take this one step at a time.",
      tired: " It's okay to rest when you need to."
    };

    const addition = supportAdditions[emotion];
    return addition ? `${message}${addition}` : message;
  }

  private analyzeAdaptationNeeds(
    context: PersonalityContext,
    history: InteractionMemory[]
  ): string[] {
    const needs: string[] = [];

    // Analyze interaction history for patterns
    if (history.length > 0) {
      const recentEffectiveness = history.slice(-3).map(h => h.effectivenessScore);
      const avgEffectiveness = recentEffectiveness.reduce((a, b) => a + b, 0) / recentEffectiveness.length;

      if (avgEffectiveness < 0.6) {
        needs.push("increase empathic connection");
      }

      // Look for emotional patterns
      const recentEmotions = history.slice(-3).map(h => h.emotionalState);
      const sadnessCount = recentEmotions.filter(e => e === 'sad').length;

      if (sadnessCount > 1) {
        needs.push("provide more comfort");
      }
    }

    // Age-based adaptations
    if (context.ageGroup === '3-5') {
      needs.push("simplify language");
    } else if (context.ageGroup === '11+') {
      needs.push("increase sophistication");
    }

    return needs;
  }

  private applyEmpathicAdaptations(
    response: string,
    adaptationNeeds: string[],
    context: PersonalityContext
  ): string {
    let adaptedResponse = response;

    adaptationNeeds.forEach(need => {
      switch (need) {
        case "increase empathic connection":
          adaptedResponse = `I really understand how you're feeling. ${adaptedResponse}`;
          break;
        case "provide more comfort":
          adaptedResponse = `${adaptedResponse} Remember, I'm here with you and you're safe.`;
          break;
        case "simplify language":
          adaptedResponse = this.simplifyLanguage(adaptedResponse);
          break;
        case "increase sophistication":
          adaptedResponse = this.increaseSophistication(adaptedResponse);
          break;
      }
    });

    return adaptedResponse;
  }

  private identifyEmpathicImprovements(original: string, adapted: string): string[] {
    const improvements: string[] = [];

    if (adapted.length > original.length) {
      improvements.push("added empathic content");
    }

    if (adapted.includes("understand") && !original.includes("understand")) {
      improvements.push("added understanding expression");
    }

    if (adapted.includes("safe") && !original.includes("safe")) {
      improvements.push("added safety assurance");
    }

    return improvements;
  }

  private extractPersonalizedElements(response: string, context: PersonalityContext): string[] {
    const elements: string[] = [];

    // Check for age-appropriate language
    if (context.ageGroup === '3-5' && /\b(big|little|nice)\b/.test(response)) {
      elements.push("age-appropriate vocabulary");
    }

    // Check for emotional personalization
    if (response.includes(context.currentEmotionalState)) {
      elements.push("emotional state acknowledgment");
    }

    return elements;
  }

  private craftComfortMessage(
    distressType: 'sadness' | 'fear' | 'frustration' | 'overwhelm',
    comfortLevel: 'gentle' | 'moderate' | 'strong',
    context: PersonalityContext
  ): string {
    const comfortTemplates = {
      sadness: {
        gentle: "I can see you're feeling sad, and that's okay.",
        moderate: "I'm here with you in this sad moment, and your feelings are important.",
        strong: "I understand you're feeling very sad right now. I'm here to comfort you, and we'll get through this together."
      },
      fear: {
        gentle: "I notice you might be feeling scared, and that's completely normal.",
        moderate: "It's okay to feel afraid sometimes. I'm here to keep you safe.",
        strong: "I can see you're feeling scared, and I want you to know you're completely safe with me. We'll face this together."
      },
      frustration: {
        gentle: "I can tell you're feeling frustrated, and that makes sense.",
        moderate: "It's completely normal to feel frustrated when things are hard. I'm here to help.",
        strong: "I understand you're feeling really frustrated right now. These feelings are valid, and I'm here to support you through this."
      },
      overwhelm: {
        gentle: "It seems like you might be feeling overwhelmed, and that's okay.",
        moderate: "When things feel like too much, it's normal to feel overwhelmed. Let's take this slowly together.",
        strong: "I can see you're feeling overwhelmed right now. Let's pause, breathe, and take this one small step at a time. I'm right here with you."
      }
    };

    const message = comfortTemplates[distressType][comfortLevel];
    return this.personalizeForAge(message, context.ageGroup);
  }

  private identifySoothingElements(message: string): string[] {
    const elements: string[] = [];

    const soothingWords = ['calm', 'gentle', 'safe', 'okay', 'together', 'here', 'breathe', 'slowly'];
    soothingWords.forEach(word => {
      if (message.toLowerCase().includes(word)) {
        elements.push(word);
      }
    });

    return elements;
  }

  private createSafetyAssurance(
    distressType: 'sadness' | 'fear' | 'frustration' | 'overwhelm',
    context: PersonalityContext
  ): string {
    const safetyMessages = {
      sadness: "You're safe to feel sad here with me.",
      fear: "You're completely safe and protected.",
      frustration: "This is a safe space for all your feelings.",
      overwhelm: "You're safe, and we can take this as slowly as you need."
    };

    const message = safetyMessages[distressType];
    return this.personalizeForAge(message, context.ageGroup);
  }

  private generateEmotionalSupport(
    distressType: 'sadness' | 'fear' | 'frustration' | 'overwhelm',
    context: PersonalityContext
  ): string {
    const supportMessages = {
      sadness: "Your sadness shows how much you care, and that's beautiful.",
      fear: "Being brave doesn't mean not being scared - it means doing things even when you feel scared.",
      frustration: "Frustration means you're trying hard, and that's something to be proud of.",
      overwhelm: "When things feel like too much, remember that you don't have to handle everything at once."
    };

    const message = supportMessages[distressType];
    return this.personalizeForAge(message, context.ageGroup);
  }

  // Helper methods
  private personalizeForAge(message: string, ageGroup: string): string {
    if (ageGroup === '3-5') {
      return this.simplifyLanguage(message);
    } else if (ageGroup === '11+') {
      return this.increaseSophistication(message);
    }
    return message;
  }

  private simplifyLanguage(message: string): string {
    return message
      .replace(/completely/g, 'very')
      .replace(/absolutely/g, 'really')
      .replace(/understand/g, 'know')
      .replace(/frustrated/g, 'upset');
  }

  private increaseSophistication(message: string): string {
    return message
      .replace(/really/g, 'genuinely')
      .replace(/very/g, 'incredibly')
      .replace(/good/g, 'excellent')
      .replace(/nice/g, 'wonderful');
  }

  private amplifyMessage(message: string, context: PersonalityContext): string {
    return `${message} I truly mean that with all my heart.`;
  }

  private softenMessage(message: string, context: PersonalityContext): string {
    return message.replace(/!/g, '.').replace(/\.$/, ', and that\'s perfectly okay.');
  }
}