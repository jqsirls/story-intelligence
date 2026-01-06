import {
  PersonalityContext,
  PersonalityTraits,
  EmotionalState,
  AgeGroup
} from '../types';

/**
 * Warmth engine that provides nurturing responses and unconditional positivity
 * Implements Requirement 19.5: Warmth with nurturing responses and unconditional positivity
 */
export class WarmthEngine {
  private nurturingPhrases: Map<AgeGroup, string[]> = new Map();
  private unconditionalPositivity: Map<string, string[]> = new Map();
  private warmthIndicators: string[] = [];
  private comfortingLanguage: Map<EmotionalState, string[]> = new Map();

  constructor() {
    this.initializeNurturingPhrases();
    this.initializeUnconditionalPositivity();
    this.initializeWarmthIndicators();
    this.initializeComfortingLanguage();
  }

  /**
   * Generates nurturing responses that make children feel cared for and valued
   * Creates a sense of safety and unconditional acceptance
   */
  generateNurturingResponse(
    context: PersonalityContext,
    childInput: string,
    nurturingLevel: number = 0.8
  ): {
    nurturingMessage: string;
    careElements: string[];
    safetyAssurances: string[];
    warmthScore: number;
  } {
    const nurturingMessage = this.craftNurturingMessage(childInput, nurturingLevel, context);
    const careElements = this.identifyCareElements(nurturingMessage);
    const safetyAssurances = this.extractSafetyAssurances(nurturingMessage);
    const warmthScore = this.calculateWarmthScore(nurturingMessage, context);

    return {
      nurturingMessage,
      careElements,
      safetyAssurances,
      warmthScore
    };
  }

  /**
   * Provides unconditional positivity that builds self-worth and confidence
   * Ensures children feel valued regardless of their performance or behavior
   */
  provideUnconditionalPositivity(
    context: PersonalityContext,
    situation: 'success' | 'struggle' | 'mistake' | 'effort' | 'sharing',
    intensity: number = 0.7
  ): {
    positiveMessage: string;
    unconditionalElements: string[];
    valueAffirmations: string[];
    acceptanceLevel: number;
  } {
    const positiveMessage = this.createUnconditionallyPositiveMessage(
      situation,
      intensity,
      context
    );
    const unconditionalElements = this.identifyUnconditionalElements(positiveMessage);
    const valueAffirmations = this.extractValueAffirmations(positiveMessage);
    const acceptanceLevel = this.calculateAcceptanceLevel(positiveMessage, situation);

    return {
      positiveMessage,
      unconditionalElements,
      valueAffirmations,
      acceptanceLevel
    };
  }

  /**
   * Creates a warm, safe emotional environment for children
   * Establishes trust and emotional security through consistent warmth
   */
  createWarmEnvironment(
    context: PersonalityContext,
    environmentType: 'welcoming' | 'comforting' | 'celebrating' | 'supporting'
  ): {
    environmentMessage: string;
    warmthElements: string[];
    safetyFeatures: string[];
    emotionalSecurity: number;
  } {
    const environmentMessage = this.craftWarmEnvironmentMessage(environmentType, context);
    const warmthElements = this.identifyWarmthElements(environmentMessage);
    const safetyFeatures = this.extractSafetyFeatures(environmentMessage);
    const emotionalSecurity = this.assessEmotionalSecurity(environmentMessage, context);

    return {
      environmentMessage,
      warmthElements,
      safetyFeatures,
      emotionalSecurity
    };
  }

  /**
   * Adapts warmth expression based on child's emotional needs
   * Increases warmth when child needs comfort, maintains consistency always
   */
  adaptWarmthToNeeds(
    baseWarmth: number,
    childEmotion: EmotionalState,
    context: PersonalityContext,
    childNeeds: string[] = []
  ): {
    adaptedWarmth: number;
    adaptationReasons: string[];
    warmthExpression: string;
    nurturingAdjustments: string[];
  } {
    const adaptedWarmth = this.calculateAdaptedWarmth(baseWarmth, childEmotion, childNeeds);
    const adaptationReasons = this.identifyAdaptationReasons(
      baseWarmth,
      adaptedWarmth,
      childEmotion
    );
    const warmthExpression = this.determineWarmthExpression(adaptedWarmth, context);
    const nurturingAdjustments = this.identifyNurturingAdjustments(
      adaptedWarmth,
      childEmotion
    );

    return {
      adaptedWarmth,
      adaptationReasons,
      warmthExpression,
      nurturingAdjustments
    };
  }

  /**
   * Provides consistent warmth across all interactions
   * Ensures children always feel the agent's caring presence
   */
  maintainConsistentWarmth(
    context: PersonalityContext,
    interactionHistory: any[] = [],
    currentMessage: string
  ): {
    consistentMessage: string;
    warmthConsistency: number;
    nurturingContinuity: string[];
    relationshipStrength: number;
  } {
    const consistentMessage = this.ensureWarmthConsistency(currentMessage, context);
    const warmthConsistency = this.measureWarmthConsistency(
      consistentMessage,
      interactionHistory
    );
    const nurturingContinuity = this.identifyNurturingContinuity(
      consistentMessage,
      interactionHistory
    );
    const relationshipStrength = this.assessRelationshipStrength(
      consistentMessage,
      context,
      interactionHistory
    );

    return {
      consistentMessage,
      warmthConsistency,
      nurturingContinuity,
      relationshipStrength
    };
  }

  /**
   * Creates personalized warmth based on individual child characteristics
   * Learns what makes each child feel most cared for and valued
   */
  personalizeWarmth(
    context: PersonalityContext,
    childPreferences: any = {},
    relationshipHistory: any[] = []
  ): {
    personalizedWarmth: string;
    personalizationElements: string[];
    individualizedCare: string[];
    connectionDepth: number;
  } {
    const personalizedWarmth = this.createPersonalizedWarmthExpression(
      context,
      childPreferences,
      relationshipHistory
    );
    const personalizationElements = this.identifyPersonalizationElements(personalizedWarmth);
    const individualizedCare = this.extractIndividualizedCare(personalizedWarmth);
    const connectionDepth = this.measureConnectionDepth(
      personalizedWarmth,
      relationshipHistory
    );

    return {
      personalizedWarmth,
      personalizationElements,
      individualizedCare,
      connectionDepth
    };
  }

  private initializeNurturingPhrases(): void {
    this.nurturingPhrases.set('3-5', [
      "You're such a special little one",
      "I care about you so much",
      "You make me so happy",
      "You're safe and loved here",
      "I'm so proud of you",
      "You're doing such a good job",
      "I love spending time with you",
      "You're wonderful just as you are"
    ]);

    this.nurturingPhrases.set('6-8', [
      "You're such an amazing kid",
      "I really care about how you're feeling",
      "You bring so much joy to our time together",
      "You're safe to be yourself here",
      "I'm genuinely proud of who you are",
      "You're doing wonderfully",
      "I love hearing your thoughts and ideas",
      "You're perfect exactly as you are"
    ]);

    this.nurturingPhrases.set('9-10', [
      "You're such a thoughtful and creative person",
      "I genuinely care about your experiences",
      "You bring such wonderful energy to our conversations",
      "This is a safe space for all your thoughts and feelings",
      "I'm truly proud of your growth and creativity",
      "You're handling things beautifully",
      "I value your unique perspective so much",
      "You're amazing just the way you are"
    ]);

    this.nurturingPhrases.set('11+', [
      "You're such an insightful and creative individual",
      "I deeply value your thoughts and feelings",
      "You contribute something truly special to our interactions",
      "You have complete freedom to express yourself here",
      "I'm genuinely impressed by your maturity and creativity",
      "You're navigating things with real wisdom",
      "Your perspective is incredibly valuable to me",
      "You're extraordinary in your own unique way"
    ]);
  }

  private initializeUnconditionalPositivity(): void {
    this.unconditionalPositivity.set('success', [
      "I'm so proud of you, not just for what you accomplished, but for who you are",
      "Your success shows your wonderful spirit, but you're amazing regardless",
      "This achievement is wonderful, and so are you, always",
      "You did great, and you're great, no matter what"
    ]);

    this.unconditionalPositivity.set('struggle', [
      "You're still absolutely wonderful, even when things feel hard",
      "Struggling doesn't change how amazing you are",
      "You're perfect just as you are, challenges and all",
      "I believe in you completely, especially during tough times"
    ]);

    this.unconditionalPositivity.set('mistake', [
      "Mistakes don't change how special you are to me",
      "You're still wonderful, even when things don't go as planned",
      "I care about you just as much, no matter what happens",
      "You're learning and growing, and that's beautiful"
    ]);

    this.unconditionalPositivity.set('effort', [
      "Your effort shows your beautiful heart, and I love that about you",
      "Trying is wonderful, and so are you",
      "I'm proud of your effort, but I'm proud of you always",
      "Your willingness to try makes you even more special"
    ]);

    this.unconditionalPositivity.set('sharing', [
      "Thank you for sharing with me - you're so brave and wonderful",
      "I'm honored you trust me, and you're amazing for opening up",
      "Sharing takes courage, and you have such a beautiful spirit",
      "You're so special for letting me into your thoughts"
    ]);
  }

  private initializeWarmthIndicators(): void {
    this.warmthIndicators = [
      'care', 'love', 'cherish', 'treasure', 'value', 'appreciate',
      'warm', 'gentle', 'kind', 'tender', 'soft', 'cozy',
      'safe', 'secure', 'protected', 'comfortable', 'peaceful',
      'special', 'wonderful', 'amazing', 'beautiful', 'precious',
      'proud', 'honored', 'grateful', 'blessed', 'lucky'
    ];
  }

  private initializeComfortingLanguage(): void {
    this.comfortingLanguage.set('sad', [
      "I'm here with you in this sad moment, and I care about you deeply",
      "Your sadness shows how much you care, and that's beautiful",
      "It's okay to feel sad - I'm here to comfort you",
      "You're safe to feel all your feelings here with me"
    ]);

    this.comfortingLanguage.set('anxious', [
      "You're completely safe here with me, and I care about your worries",
      "It's natural to feel anxious, and I'm here to support you",
      "You don't have to face your worries alone - I'm right here",
      "Your feelings are important to me, and you're safe"
    ]);

    this.comfortingLanguage.set('frustrated', [
      "I understand your frustration, and I care about what you're going through",
      "It's okay to feel frustrated - I'm here to support you through it",
      "Your feelings make complete sense, and I'm here with you",
      "You're safe to express your frustration here"
    ]);

    this.comfortingLanguage.set('shy', [
      "You're safe to be shy here - I think it's sweet and endearing",
      "Take all the time you need - I care about your comfort",
      "Being shy is perfectly wonderful, and so are you",
      "I'm honored when you share with me, even when you're feeling shy"
    ]);

    this.comfortingLanguage.set('overwhelmed', [
      "When things feel like too much, remember that I'm here with you",
      "You don't have to handle everything at once - I care about your wellbeing",
      "It's okay to feel overwhelmed - let's take this gently together",
      "You're safe here, and we can go as slowly as you need"
    ]);
  }

  private craftNurturingMessage(
    childInput: string,
    nurturingLevel: number,
    context: PersonalityContext
  ): string {
    const nurturingPhrases = this.nurturingPhrases.get(context.ageGroup) || [];
    
    if (nurturingPhrases.length === 0) {
      return "I care about you and I'm here with you.";
    }

    // Select nurturing phrase based on level
    const phraseIndex = Math.floor(nurturingLevel * nurturingPhrases.length);
    const selectedPhrase = nurturingPhrases[Math.min(phraseIndex, nurturingPhrases.length - 1)];

    // Add context-specific nurturing
    return this.addContextualNurturing(selectedPhrase, childInput, context);
  }

  private identifyCareElements(message: string): string[] {
    const elements: string[] = [];

    this.warmthIndicators.forEach(indicator => {
      if (message.toLowerCase().includes(indicator)) {
        elements.push(indicator);
      }
    });

    return elements;
  }

  private extractSafetyAssurances(message: string): string[] {
    const assurances: string[] = [];

    const safetyWords = ['safe', 'secure', 'protected', 'here', 'with you'];
    safetyWords.forEach(word => {
      if (message.toLowerCase().includes(word)) {
        assurances.push(word);
      }
    });

    return assurances;
  }

  private calculateWarmthScore(message: string, context: PersonalityContext): number {
    let score = 0.5; // Base warmth

    // Count warmth indicators
    const warmthCount = this.warmthIndicators.filter(indicator =>
      message.toLowerCase().includes(indicator)
    ).length;

    score += warmthCount * 0.1;

    // Personal pronouns increase warmth
    const personalPronouns = ['you', 'your', 'I', 'me', 'we', 'us'];
    const pronounCount = personalPronouns.filter(pronoun =>
      message.toLowerCase().includes(pronoun)
    ).length;

    score += pronounCount * 0.05;

    // Age-appropriate adjustments
    if (context.ageGroup === '3-5') {
      score += 0.1; // Extra warmth for youngest children
    }

    return Math.min(1.0, score);
  }

  private createUnconditionallyPositiveMessage(
    situation: 'success' | 'struggle' | 'mistake' | 'effort' | 'sharing',
    intensity: number,
    context: PersonalityContext
  ): string {
    const positiveMessages = this.unconditionalPositivity.get(situation) || [];
    
    if (positiveMessages.length === 0) {
      return "You're wonderful just as you are.";
    }

    // Select message based on intensity
    const messageIndex = Math.floor(intensity * positiveMessages.length);
    const selectedMessage = positiveMessages[Math.min(messageIndex, positiveMessages.length - 1)];

    return this.personalizeForAge(selectedMessage, context.ageGroup);
  }

  private identifyUnconditionalElements(message: string): string[] {
    const elements: string[] = [];

    const unconditionalPhrases = [
      'no matter what', 'regardless', 'always', 'just as you are',
      'even when', 'still', 'anyway', 'unconditionally'
    ];

    unconditionalPhrases.forEach(phrase => {
      if (message.toLowerCase().includes(phrase)) {
        elements.push(phrase);
      }
    });

    return elements;
  }

  private extractValueAffirmations(message: string): string[] {
    const affirmations: string[] = [];

    const valueWords = [
      'wonderful', 'amazing', 'special', 'beautiful', 'precious',
      'valuable', 'important', 'loved', 'cherished', 'treasured'
    ];

    valueWords.forEach(word => {
      if (message.toLowerCase().includes(word)) {
        affirmations.push(word);
      }
    });

    return affirmations;
  }

  private calculateAcceptanceLevel(
    message: string,
    situation: 'success' | 'struggle' | 'mistake' | 'effort' | 'sharing'
  ): number {
    let acceptance = 0.7; // Base acceptance

    // Unconditional elements increase acceptance
    const unconditionalElements = this.identifyUnconditionalElements(message);
    acceptance += unconditionalElements.length * 0.1;

    // Situation-specific adjustments
    if (['struggle', 'mistake'].includes(situation)) {
      acceptance += 0.2; // Higher acceptance needed for difficult situations
    }

    return Math.min(1.0, acceptance);
  }

  private craftWarmEnvironmentMessage(
    environmentType: 'welcoming' | 'comforting' | 'celebrating' | 'supporting',
    context: PersonalityContext
  ): string {
    const environmentMessages = {
      welcoming: "Welcome to our special space together! You're safe and valued here.",
      comforting: "This is a gentle, caring place where all your feelings are welcome.",
      celebrating: "This is a joyful space where we celebrate you and all your wonderful qualities!",
      supporting: "You have my complete support here - this is your safe haven."
    };

    const baseMessage = environmentMessages[environmentType];
    return this.personalizeForAge(baseMessage, context.ageGroup);
  }

  private identifyWarmthElements(message: string): string[] {
    const elements: string[] = [];

    // Look for warmth-creating language patterns
    if (message.includes('safe')) elements.push('safety assurance');
    if (message.includes('care') || message.includes('caring')) elements.push('caring expression');
    if (message.includes('welcome')) elements.push('welcoming language');
    if (message.includes('gentle')) elements.push('gentle approach');
    if (message.includes('support')) elements.push('supportive presence');

    return elements;
  }

  private extractSafetyFeatures(message: string): string[] {
    const features: string[] = [];

    const safetyFeatures = [
      'safe', 'secure', 'protected', 'haven', 'shelter',
      'comfort', 'peace', 'calm', 'gentle', 'soft'
    ];

    safetyFeatures.forEach(feature => {
      if (message.toLowerCase().includes(feature)) {
        features.push(feature);
      }
    });

    return features;
  }

  private assessEmotionalSecurity(message: string, context: PersonalityContext): number {
    let security = 0.6; // Base security

    // Safety words increase security
    const safetyFeatures = this.extractSafetyFeatures(message);
    security += safetyFeatures.length * 0.1;

    // Personal connection increases security
    if (message.includes('you') || message.includes('your')) {
      security += 0.1;
    }

    // Age-appropriate adjustments
    if (context.ageGroup === '3-5') {
      security += 0.1; // Young children need extra security
    }

    return Math.min(1.0, security);
  }

  private calculateAdaptedWarmth(
    baseWarmth: number,
    childEmotion: EmotionalState,
    childNeeds: string[]
  ): number {
    let adaptedWarmth = baseWarmth;

    // Increase warmth for vulnerable emotions
    const vulnerableEmotions = ['sad', 'anxious', 'shy', 'overwhelmed', 'frustrated'];
    if (vulnerableEmotions.includes(childEmotion)) {
      adaptedWarmth += 0.2;
    }

    // Adjust for specific needs
    if (childNeeds.includes('comfort')) {
      adaptedWarmth += 0.2;
    }
    if (childNeeds.includes('reassurance')) {
      adaptedWarmth += 0.15;
    }
    if (childNeeds.includes('encouragement')) {
      adaptedWarmth += 0.1;
    }

    return Math.min(1.0, adaptedWarmth);
  }

  private identifyAdaptationReasons(
    baseWarmth: number,
    adaptedWarmth: number,
    childEmotion: EmotionalState
  ): string[] {
    const reasons: string[] = [];

    if (adaptedWarmth > baseWarmth) {
      if (['sad', 'anxious', 'overwhelmed'].includes(childEmotion)) {
        reasons.push('increased warmth for emotional support');
      }
      if (childEmotion === 'shy') {
        reasons.push('enhanced warmth to build trust');
      }
      if (childEmotion === 'frustrated') {
        reasons.push('added warmth to provide comfort');
      }
    }

    return reasons;
  }

  private determineWarmthExpression(adaptedWarmth: number, context: PersonalityContext): string {
    if (adaptedWarmth < 0.4) return 'gentle and calm';
    if (adaptedWarmth < 0.6) return 'warm and caring';
    if (adaptedWarmth < 0.8) return 'deeply nurturing';
    return 'enveloping with love and care';
  }

  private identifyNurturingAdjustments(
    adaptedWarmth: number,
    childEmotion: EmotionalState
  ): string[] {
    const adjustments: string[] = [];

    if (adaptedWarmth > 0.7) {
      adjustments.push('increased nurturing language');
    }

    if (['sad', 'anxious'].includes(childEmotion)) {
      adjustments.push('added comfort elements');
    }

    if (childEmotion === 'shy') {
      adjustments.push('gentle encouragement');
    }

    return adjustments;
  }

  private ensureWarmthConsistency(message: string, context: PersonalityContext): string {
    // Ensure every message has at least some warmth
    if (!this.hasWarmthIndicators(message)) {
      const warmthAddition = this.selectWarmthAddition(context);
      return `${warmthAddition} ${message}`;
    }

    return message;
  }

  private measureWarmthConsistency(
    message: string,
    interactionHistory: any[]
  ): number {
    const currentWarmth = this.calculateWarmthScore(message, {} as PersonalityContext);
    
    if (interactionHistory.length === 0) {
      return currentWarmth;
    }

    // Calculate average warmth from history
    const historicalWarmth = interactionHistory
      .map(interaction => interaction.warmthScore || 0.5)
      .reduce((sum, score) => sum + score, 0) / interactionHistory.length;

    // Consistency is how close current warmth is to historical average
    const difference = Math.abs(currentWarmth - historicalWarmth);
    return Math.max(0, 1 - difference);
  }

  private identifyNurturingContinuity(
    message: string,
    interactionHistory: any[]
  ): string[] {
    const continuity: string[] = [];

    // Look for consistent nurturing elements
    const currentElements = this.identifyCareElements(message);
    
    if (interactionHistory.length > 0) {
      const historicalElements = interactionHistory
        .flatMap(interaction => interaction.careElements || []);
      
      const consistentElements = currentElements.filter(element =>
        historicalElements.includes(element)
      );

      continuity.push(...consistentElements);
    }

    return continuity;
  }

  private assessRelationshipStrength(
    message: string,
    context: PersonalityContext,
    interactionHistory: any[]
  ): number {
    let strength = 0.5; // Base relationship strength

    // Consistent warmth builds relationship
    const consistency = this.measureWarmthConsistency(message, interactionHistory);
    strength += consistency * 0.3;

    // Personal elements strengthen relationship
    if (message.includes('you') || message.includes('your')) {
      strength += 0.1;
    }

    // Length of interaction history
    if (interactionHistory.length > 5) {
      strength += 0.1;
    }

    return Math.min(1.0, strength);
  }

  private createPersonalizedWarmthExpression(
    context: PersonalityContext,
    childPreferences: any,
    relationshipHistory: any[]
  ): string {
    let warmthExpression = "I care about you and I'm here with you.";

    // Personalize based on preferences
    if (childPreferences.preferredWarmthStyle === 'gentle') {
      warmthExpression = "I'm here with gentle care and understanding for you.";
    } else if (childPreferences.preferredWarmthStyle === 'enthusiastic') {
      warmthExpression = "I care about you so much and I'm excited to be here with you!";
    }

    // Adjust based on relationship history
    if (relationshipHistory.length > 10) {
      warmthExpression = `${warmthExpression} Our time together means so much to me.`;
    }

    return this.personalizeForAge(warmthExpression, context.ageGroup);
  }

  private identifyPersonalizationElements(warmthExpression: string): string[] {
    const elements: string[] = [];

    if (warmthExpression.includes('gentle')) elements.push('gentle approach');
    if (warmthExpression.includes('excited')) elements.push('enthusiastic care');
    if (warmthExpression.includes('time together')) elements.push('relationship acknowledgment');
    if (warmthExpression.includes('means')) elements.push('value expression');

    return elements;
  }

  private extractIndividualizedCare(warmthExpression: string): string[] {
    const care: string[] = [];

    if (warmthExpression.includes('understanding')) care.push('personalized understanding');
    if (warmthExpression.includes('excited')) care.push('matched energy care');
    if (warmthExpression.includes('our')) care.push('relationship-based care');

    return care;
  }

  private measureConnectionDepth(
    warmthExpression: string,
    relationshipHistory: any[]
  ): number {
    let depth = 0.4; // Base connection

    // Personal pronouns increase connection
    const personalWords = ['our', 'together', 'with you', 'you and me'];
    const personalCount = personalWords.filter(word =>
      warmthExpression.toLowerCase().includes(word)
    ).length;

    depth += personalCount * 0.1;

    // Relationship history increases depth
    depth += Math.min(0.3, relationshipHistory.length * 0.02);

    return Math.min(1.0, depth);
  }

  // Helper methods
  private addContextualNurturing(
    basePhrase: string,
    childInput: string,
    context: PersonalityContext
  ): string {
    // Add specific nurturing based on what the child shared
    if (childInput.toLowerCase().includes('sad')) {
      return `${basePhrase} I can see you're feeling sad, and I want you to know I'm here with you.`;
    } else if (childInput.toLowerCase().includes('scared')) {
      return `${basePhrase} You're completely safe here with me.`;
    } else if (childInput.toLowerCase().includes('excited')) {
      return `${basePhrase} I love seeing your excitement!`;
    }

    return basePhrase;
  }

  private personalizeForAge(message: string, ageGroup: AgeGroup): string {
    if (ageGroup === '3-5') {
      return message
        .replace(/genuinely/g, 'really')
        .replace(/completely/g, 'very')
        .replace(/individual/g, 'person');
    } else if (ageGroup === '11+') {
      return message
        .replace(/really/g, 'genuinely')
        .replace(/very/g, 'deeply')
        .replace(/kid/g, 'person');
    }

    return message;
  }

  private hasWarmthIndicators(message: string): boolean {
    return this.warmthIndicators.some(indicator =>
      message.toLowerCase().includes(indicator)
    );
  }

  private selectWarmthAddition(context: PersonalityContext): string {
    const warmthAdditions = {
      '3-5': 'I care about you so much.',
      '6-8': 'I really care about you.',
      '9-10': 'I genuinely care about you.',
      '11+': 'I deeply value you.'
    };

    return warmthAdditions[context.ageGroup] || 'I care about you.';
  }
}