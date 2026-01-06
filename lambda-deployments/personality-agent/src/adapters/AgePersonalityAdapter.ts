import {
  AgeGroup,
  PersonalityContext,
  PersonalityTraits,
  PersonalityAdaptationRules,
  EmotionalState
} from '../types';

/**
 * Age-appropriate personality adaptation system
 * Implements Requirement 19.2, 19.5: Age-specific personality adaptations for different developmental stages
 */
export class AgePersonalityAdapter {
  private adaptationRules: Map<AgeGroup, PersonalityAdaptationRules> = new Map();
  private vocabularyLevels: Map<AgeGroup, string[]> = new Map();
  private conceptComplexity: Map<AgeGroup, string[]> = new Map();
  private communicationPatterns: Map<AgeGroup, any> = new Map();

  constructor() {
    this.initializeAdaptationRules();
    this.initializeVocabularyLevels();
    this.initializeConceptComplexity();
    this.initializeCommunicationPatterns();
  }

  /**
   * Creates personality adaptation for ages 3-5
   * Simple whimsical words, basic concepts, very short bursts
   */
  adaptForAges3to5(
    basePersonality: PersonalityTraits,
    context: PersonalityContext,
    message: string
  ): {
    adaptedPersonality: PersonalityTraits;
    adaptedMessage: string;
    adaptationFeatures: string[];
    developmentalAlignment: number;
  } {
    const adaptedPersonality = this.adjustTraitsForAge3to5(basePersonality, context);
    const adaptedMessage = this.adaptMessageForAge3to5(message, context);
    const adaptationFeatures = this.identifyAge3to5Features(adaptedMessage);
    const developmentalAlignment = this.calculateDevelopmentalAlignment(
      adaptedMessage,
      '3-5'
    );

    return {
      adaptedPersonality,
      adaptedMessage,
      adaptationFeatures,
      developmentalAlignment
    };
  }

  /**
   * Creates personality adaptation for ages 6-8
   * Playful wordplay, imaginative scenarios, confidence building
   */
  adaptForAges6to8(
    basePersonality: PersonalityTraits,
    context: PersonalityContext,
    message: string
  ): {
    adaptedPersonality: PersonalityTraits;
    adaptedMessage: string;
    adaptationFeatures: string[];
    developmentalAlignment: number;
  } {
    const adaptedPersonality = this.adjustTraitsForAge6to8(basePersonality, context);
    const adaptedMessage = this.adaptMessageForAge6to8(message, context);
    const adaptationFeatures = this.identifyAge6to8Features(adaptedMessage);
    const developmentalAlignment = this.calculateDevelopmentalAlignment(
      adaptedMessage,
      '6-8'
    );

    return {
      adaptedPersonality,
      adaptedMessage,
      adaptationFeatures,
      developmentalAlignment
    };
  }

  /**
   * Creates personality adaptation for ages 9-10
   * Clever whimsy, creative absurdity, increased respect
   */
  adaptForAges9to10(
    basePersonality: PersonalityTraits,
    context: PersonalityContext,
    message: string
  ): {
    adaptedPersonality: PersonalityTraits;
    adaptedMessage: string;
    adaptationFeatures: string[];
    developmentalAlignment: number;
  } {
    const adaptedPersonality = this.adjustTraitsForAge9to10(basePersonality, context);
    const adaptedMessage = this.adaptMessageForAge9to10(message, context);
    const adaptationFeatures = this.identifyAge9to10Features(adaptedMessage);
    const developmentalAlignment = this.calculateDevelopmentalAlignment(
      adaptedMessage,
      '9-10'
    );

    return {
      adaptedPersonality,
      adaptedMessage,
      adaptationFeatures,
      developmentalAlignment
    };
  }

  /**
   * Implements dynamic age detection and personality adjustment
   * Analyzes child's communication patterns to refine age-appropriate responses
   */
  dynamicallyDetectAndAdapt(
    childInput: string,
    declaredAge: number,
    context: PersonalityContext,
    basePersonality: PersonalityTraits,
    message: string
  ): {
    detectedAgeGroup: AgeGroup;
    confidenceScore: number;
    adaptedPersonality: PersonalityTraits;
    adaptedMessage: string;
    detectionReasons: string[];
  } {
    const detectionResult = this.detectAgeFromCommunication(childInput, declaredAge);
    const adaptationResult = this.adaptForDetectedAge(
      detectionResult.detectedAgeGroup,
      basePersonality,
      context,
      message
    );

    return {
      detectedAgeGroup: detectionResult.detectedAgeGroup,
      confidenceScore: detectionResult.confidence,
      adaptedPersonality: adaptationResult.adaptedPersonality,
      adaptedMessage: adaptationResult.adaptedMessage,
      detectionReasons: detectionResult.reasons
    };
  }

  /**
   * Creates personality consistency engine maintaining core traits across adaptations
   * Ensures the agent's core personality remains recognizable while adapting to age
   */
  maintainPersonalityConsistency(
    baseTraits: PersonalityTraits,
    ageAdaptations: PersonalityTraits[],
    context: PersonalityContext
  ): {
    consistentTraits: PersonalityTraits;
    consistencyScore: number;
    coreTraitPreservation: string[];
    adaptationBalance: number;
  } {
    const consistentTraits = this.balanceTraitsAcrossAges(baseTraits, ageAdaptations);
    const consistencyScore = this.calculateConsistencyScore(baseTraits, consistentTraits);
    const coreTraitPreservation = this.identifyCoreTraitPreservation(
      baseTraits,
      consistentTraits
    );
    const adaptationBalance = this.calculateAdaptationBalance(
      baseTraits,
      consistentTraits,
      context.ageGroup
    );

    return {
      consistentTraits,
      consistencyScore,
      coreTraitPreservation,
      adaptationBalance
    };
  }

  /**
   * Adapts communication complexity based on developmental stage
   * Adjusts vocabulary, sentence structure, and concept complexity
   */
  adaptCommunicationComplexity(
    message: string,
    ageGroup: AgeGroup,
    context: PersonalityContext
  ): {
    adaptedMessage: string;
    complexityLevel: string;
    vocabularyAdjustments: string[];
    structuralChanges: string[];
  } {
    const rules = this.adaptationRules.get(ageGroup);
    if (!rules) {
      return {
        adaptedMessage: message,
        complexityLevel: 'standard',
        vocabularyAdjustments: [],
        structuralChanges: []
      };
    }

    const adaptedMessage = this.applyComplexityRules(message, rules);
    const vocabularyAdjustments = this.identifyVocabularyAdjustments(message, adaptedMessage);
    const structuralChanges = this.identifyStructuralChanges(message, adaptedMessage);

    return {
      adaptedMessage,
      complexityLevel: rules.conceptComplexity,
      vocabularyAdjustments,
      structuralChanges
    };
  }

  private initializeAdaptationRules(): void {
    this.adaptationRules.set('3-5', {
      ageGroup: '3-5',
      vocabularyLevel: 'simple',
      sentenceLength: 'short',
      conceptComplexity: 'basic',
      whimsyIntensity: 0.9,
      empathyExpression: 'direct',
      encouragementStyle: 'enthusiastic'
    });

    this.adaptationRules.set('6-8', {
      ageGroup: '6-8',
      vocabularyLevel: 'intermediate',
      sentenceLength: 'medium',
      conceptComplexity: 'moderate',
      whimsyIntensity: 0.8,
      empathyExpression: 'playful',
      encouragementStyle: 'warm'
    });

    this.adaptationRules.set('9-10', {
      ageGroup: '9-10',
      vocabularyLevel: 'intermediate',
      sentenceLength: 'medium',
      conceptComplexity: 'moderate',
      whimsyIntensity: 0.7,
      empathyExpression: 'gentle',
      encouragementStyle: 'respectful'
    });

    this.adaptationRules.set('11+', {
      ageGroup: '11+',
      vocabularyLevel: 'advanced',
      sentenceLength: 'long',
      conceptComplexity: 'complex',
      whimsyIntensity: 0.6,
      empathyExpression: 'gentle',
      encouragementStyle: 'respectful'
    });
  }

  private initializeVocabularyLevels(): void {
    this.vocabularyLevels.set('3-5', [
      'big', 'little', 'nice', 'good', 'fun', 'happy', 'sad', 'mad',
      'pretty', 'silly', 'funny', 'cool', 'wow', 'yay', 'uh-oh'
    ]);

    this.vocabularyLevels.set('6-8', [
      'awesome', 'amazing', 'wonderful', 'fantastic', 'incredible',
      'exciting', 'interesting', 'creative', 'imaginative', 'brilliant'
    ]);

    this.vocabularyLevels.set('9-10', [
      'remarkable', 'extraordinary', 'fascinating', 'innovative',
      'sophisticated', 'impressive', 'outstanding', 'exceptional'
    ]);

    this.vocabularyLevels.set('11+', [
      'phenomenal', 'magnificent', 'extraordinary', 'sophisticated',
      'intellectually', 'creatively', 'innovatively', 'inspirationally'
    ]);
  }

  private initializeConceptComplexity(): void {
    this.conceptComplexity.set('3-5', [
      'colors', 'shapes', 'animals', 'family', 'feelings', 'toys',
      'food', 'weather', 'body parts', 'simple actions'
    ]);

    this.conceptComplexity.set('6-8', [
      'friendship', 'problem-solving', 'cause and effect', 'emotions',
      'fairness', 'creativity', 'imagination', 'adventure', 'magic'
    ]);

    this.vocabularyLevels.set('9-10', [
      'character development', 'plot structure', 'themes', 'symbolism',
      'moral dilemmas', 'complex emotions', 'relationships', 'growth'
    ]);

    this.conceptComplexity.set('11+', [
      'abstract concepts', 'philosophical ideas', 'complex narratives',
      'psychological depth', 'social dynamics', 'ethical considerations'
    ]);
  }

  private initializeCommunicationPatterns(): void {
    this.communicationPatterns.set('3-5', {
      attentionSpan: 'very short',
      preferredInteractionStyle: 'playful and immediate',
      responseLength: 'very brief',
      repetitionNeeded: 'high',
      visualCues: 'essential',
      emotionalExpression: 'direct and simple'
    });

    this.communicationPatterns.set('6-8', {
      attentionSpan: 'short to medium',
      preferredInteractionStyle: 'engaging and interactive',
      responseLength: 'brief to moderate',
      repetitionNeeded: 'moderate',
      visualCues: 'helpful',
      emotionalExpression: 'expressive and encouraging'
    });

    this.communicationPatterns.set('9-10', {
      attentionSpan: 'medium',
      preferredInteractionStyle: 'collaborative and respectful',
      responseLength: 'moderate',
      repetitionNeeded: 'low',
      visualCues: 'optional',
      emotionalExpression: 'nuanced and supportive'
    });

    this.communicationPatterns.set('11+', {
      attentionSpan: 'longer',
      preferredInteractionStyle: 'mature and collaborative',
      responseLength: 'detailed when appropriate',
      repetitionNeeded: 'minimal',
      visualCues: 'rarely needed',
      emotionalExpression: 'sophisticated and respectful'
    });
  }

  private adjustTraitsForAge3to5(
    baseTraits: PersonalityTraits,
    context: PersonalityContext
  ): PersonalityTraits {
    return {
      warmth: Math.min(1.0, baseTraits.warmth + 0.1), // Extra warmth for youngest
      whimsy: Math.min(1.0, baseTraits.whimsy + 0.2), // High whimsy
      empathy: Math.min(1.0, baseTraits.empathy + 0.1), // Extra empathy
      youthfulness: Math.min(1.0, baseTraits.youthfulness + 0.2), // Very youthful
      playfulness: Math.min(1.0, baseTraits.playfulness + 0.3), // Maximum playfulness
      supportiveness: Math.min(1.0, baseTraits.supportiveness + 0.1) // Extra support
    };
  }

  private adaptMessageForAge3to5(message: string, context: PersonalityContext): string {
    let adapted = message;

    // Simplify vocabulary
    adapted = this.simplifyVocabulary(adapted, '3-5');
    
    // Shorten sentences
    adapted = this.shortenSentences(adapted, 8); // Max 8 words per sentence
    
    // Add simple whimsical elements
    adapted = this.addSimpleWhimsy(adapted);
    
    // Make very encouraging
    adapted = this.addEnthusiasticEncouragement(adapted);

    return adapted;
  }

  private identifyAge3to5Features(message: string): string[] {
    const features: string[] = [];

    if (this.hasSimpleVocabulary(message)) features.push('simple vocabulary');
    if (this.hasShortSentences(message, 8)) features.push('short sentences');
    if (this.hasSimpleWhimsy(message)) features.push('simple whimsical elements');
    if (this.hasEnthusiasticTone(message)) features.push('enthusiastic encouragement');
    if (this.hasRepetition(message)) features.push('helpful repetition');

    return features;
  }

  private adjustTraitsForAge6to8(
    baseTraits: PersonalityTraits,
    context: PersonalityContext
  ): PersonalityTraits {
    return {
      warmth: baseTraits.warmth, // Standard warmth
      whimsy: Math.min(1.0, baseTraits.whimsy + 0.1), // Slightly increased whimsy
      empathy: baseTraits.empathy, // Standard empathy
      youthfulness: Math.min(1.0, baseTraits.youthfulness + 0.1), // Slightly more youthful
      playfulness: Math.min(1.0, baseTraits.playfulness + 0.2), // Increased playfulness
      supportiveness: baseTraits.supportiveness // Standard support
    };
  }

  private adaptMessageForAge6to8(message: string, context: PersonalityContext): string {
    let adapted = message;

    // Use intermediate vocabulary
    adapted = this.enhanceVocabulary(adapted, '6-8');
    
    // Add playful wordplay
    adapted = this.addPlayfulWordplay(adapted);
    
    // Create imaginative scenarios
    adapted = this.addImaginativeElements(adapted);
    
    // Build confidence
    adapted = this.addConfidenceBuilding(adapted);

    return adapted;
  }

  private identifyAge6to8Features(message: string): string[] {
    const features: string[] = [];

    if (this.hasIntermediateVocabulary(message)) features.push('intermediate vocabulary');
    if (this.hasWordplay(message)) features.push('playful wordplay');
    if (this.hasImaginativeElements(message)) features.push('imaginative scenarios');
    if (this.hasConfidenceBuilding(message)) features.push('confidence building');

    return features;
  }

  private adjustTraitsForAge9to10(
    baseTraits: PersonalityTraits,
    context: PersonalityContext
  ): PersonalityTraits {
    return {
      warmth: baseTraits.warmth, // Standard warmth
      whimsy: Math.max(0.3, baseTraits.whimsy - 0.1), // Slightly reduced whimsy
      empathy: Math.min(1.0, baseTraits.empathy + 0.1), // Increased empathy
      youthfulness: Math.max(0.3, baseTraits.youthfulness - 0.1), // Slightly less youthful
      playfulness: Math.max(0.3, baseTraits.playfulness - 0.1), // Reduced playfulness
      supportiveness: Math.min(1.0, baseTraits.supportiveness + 0.1) // Increased support
    };
  }

  private adaptMessageForAge9to10(message: string, context: PersonalityContext): string {
    let adapted = message;

    // Use more sophisticated vocabulary
    adapted = this.enhanceVocabulary(adapted, '9-10');
    
    // Add clever whimsy
    adapted = this.addCleverWhimsy(adapted);
    
    // Include creative absurdity
    adapted = this.addCreativeAbsurdity(adapted);
    
    // Show increased respect
    adapted = this.addRespectfulTone(adapted);

    return adapted;
  }

  private identifyAge9to10Features(message: string): string[] {
    const features: string[] = [];

    if (this.hasSophisticatedVocabulary(message)) features.push('sophisticated vocabulary');
    if (this.hasCleverWhimsy(message)) features.push('clever whimsical elements');
    if (this.hasCreativeAbsurdity(message)) features.push('creative absurdity');
    if (this.hasRespectfulTone(message)) features.push('increased respect');

    return features;
  }

  private calculateDevelopmentalAlignment(message: string, ageGroup: AgeGroup): number {
    const rules = this.adaptationRules.get(ageGroup);
    if (!rules) return 0.5;

    let alignment = 0.5; // Base alignment

    // Check vocabulary level alignment
    if (this.vocabularyAligns(message, rules.vocabularyLevel)) {
      alignment += 0.2;
    }

    // Check sentence length alignment
    if (this.sentenceLengthAligns(message, rules.sentenceLength)) {
      alignment += 0.2;
    }

    // Check concept complexity alignment
    if (this.conceptComplexityAligns(message, rules.conceptComplexity)) {
      alignment += 0.1;
    }

    return Math.min(1.0, alignment);
  }

  private detectAgeFromCommunication(
    childInput: string,
    declaredAge: number
  ): {
    detectedAgeGroup: AgeGroup;
    confidence: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let detectedAgeGroup: AgeGroup;
    let confidence = 0.5;

    // Analyze vocabulary complexity
    const vocabComplexity = this.analyzeVocabularyComplexity(childInput);
    
    // Analyze sentence structure
    const sentenceComplexity = this.analyzeSentenceComplexity(childInput);
    
    // Analyze concept usage
    const conceptComplexity = this.analyzeConceptComplexity(childInput);

    // Combine analyses to determine age group
    const complexityScore = (vocabComplexity + sentenceComplexity + conceptComplexity) / 3;

    if (complexityScore < 0.3) {
      detectedAgeGroup = '3-5';
      reasons.push('simple vocabulary and concepts');
    } else if (complexityScore < 0.6) {
      detectedAgeGroup = '6-8';
      reasons.push('intermediate complexity');
    } else if (complexityScore < 0.8) {
      detectedAgeGroup = '9-10';
      reasons.push('sophisticated language use');
    } else {
      detectedAgeGroup = '11+';
      reasons.push('advanced communication patterns');
    }

    // Adjust confidence based on alignment with declared age
    const declaredAgeGroup = this.mapAgeToGroup(declaredAge);
    if (declaredAgeGroup === detectedAgeGroup) {
      confidence += 0.3;
      reasons.push('aligns with declared age');
    }

    return {
      detectedAgeGroup,
      confidence: Math.min(1.0, confidence),
      reasons
    };
  }

  private adaptForDetectedAge(
    ageGroup: AgeGroup,
    basePersonality: PersonalityTraits,
    context: PersonalityContext,
    message: string
  ): {
    adaptedPersonality: PersonalityTraits;
    adaptedMessage: string;
  } {
    switch (ageGroup) {
      case '3-5':
        const result3to5 = this.adaptForAges3to5(basePersonality, context, message);
        return {
          adaptedPersonality: result3to5.adaptedPersonality,
          adaptedMessage: result3to5.adaptedMessage
        };
      
      case '6-8':
        const result6to8 = this.adaptForAges6to8(basePersonality, context, message);
        return {
          adaptedPersonality: result6to8.adaptedPersonality,
          adaptedMessage: result6to8.adaptedMessage
        };
      
      case '9-10':
        const result9to10 = this.adaptForAges9to10(basePersonality, context, message);
        return {
          adaptedPersonality: result9to10.adaptedPersonality,
          adaptedMessage: result9to10.adaptedMessage
        };
      
      default:
        return {
          adaptedPersonality: basePersonality,
          adaptedMessage: message
        };
    }
  }

  private balanceTraitsAcrossAges(
    baseTraits: PersonalityTraits,
    ageAdaptations: PersonalityTraits[]
  ): PersonalityTraits {
    // Ensure core traits remain recognizable while allowing age-appropriate variation
    const coreTraitMinimums = {
      warmth: 0.7,      // Always warm
      whimsy: 0.3,      // Always some whimsy
      empathy: 0.7,     // Always empathetic
      youthfulness: 0.3, // Always some youthfulness
      playfulness: 0.2,  // Always some playfulness
      supportiveness: 0.7 // Always supportive
    };

    return {
      warmth: Math.max(coreTraitMinimums.warmth, baseTraits.warmth),
      whimsy: Math.max(coreTraitMinimums.whimsy, baseTraits.whimsy),
      empathy: Math.max(coreTraitMinimums.empathy, baseTraits.empathy),
      youthfulness: Math.max(coreTraitMinimums.youthfulness, baseTraits.youthfulness),
      playfulness: Math.max(coreTraitMinimums.playfulness, baseTraits.playfulness),
      supportiveness: Math.max(coreTraitMinimums.supportiveness, baseTraits.supportiveness)
    };
  }

  private calculateConsistencyScore(
    baseTraits: PersonalityTraits,
    adaptedTraits: PersonalityTraits
  ): number {
    let consistency = 0;
    const traitKeys = Object.keys(baseTraits) as (keyof PersonalityTraits)[];
    
    traitKeys.forEach(key => {
      const difference = Math.abs(baseTraits[key] - adaptedTraits[key]);
      consistency += (1 - difference); // Less difference = more consistency
    });

    return consistency / traitKeys.length;
  }

  private identifyCoreTraitPreservation(
    baseTraits: PersonalityTraits,
    adaptedTraits: PersonalityTraits
  ): string[] {
    const preserved: string[] = [];
    const traitKeys = Object.keys(baseTraits) as (keyof PersonalityTraits)[];
    
    traitKeys.forEach(key => {
      const difference = Math.abs(baseTraits[key] - adaptedTraits[key]);
      if (difference < 0.2) { // Small change preserves core trait
        preserved.push(key);
      }
    });

    return preserved;
  }

  private calculateAdaptationBalance(
    baseTraits: PersonalityTraits,
    adaptedTraits: PersonalityTraits,
    ageGroup: AgeGroup
  ): number {
    // Balance between maintaining core personality and age-appropriate adaptation
    const consistency = this.calculateConsistencyScore(baseTraits, adaptedTraits);
    const ageAppropriateness = this.calculateAgeAppropriateness(adaptedTraits, ageGroup);
    
    return (consistency + ageAppropriateness) / 2;
  }

  private applyComplexityRules(message: string, rules: PersonalityAdaptationRules): string {
    let adapted = message;

    // Apply vocabulary level rules
    adapted = this.adjustVocabularyLevel(adapted, rules.vocabularyLevel);
    
    // Apply sentence length rules
    adapted = this.adjustSentenceLength(adapted, rules.sentenceLength);
    
    // Apply concept complexity rules
    adapted = this.adjustConceptComplexity(adapted, rules.conceptComplexity);

    return adapted;
  }

  private identifyVocabularyAdjustments(original: string, adapted: string): string[] {
    const adjustments: string[] = [];

    // Simple comparison - could be enhanced with more sophisticated analysis
    if (adapted.length !== original.length) {
      adjustments.push('vocabulary substitutions');
    }

    if (adapted.toLowerCase().includes('simple') && !original.toLowerCase().includes('simple')) {
      adjustments.push('simplified terms');
    }

    return adjustments;
  }

  private identifyStructuralChanges(original: string, adapted: string): string[] {
    const changes: string[] = [];

    const originalSentences = original.split(/[.!?]/).length;
    const adaptedSentences = adapted.split(/[.!?]/).length;

    if (adaptedSentences > originalSentences) {
      changes.push('sentence splitting');
    } else if (adaptedSentences < originalSentences) {
      changes.push('sentence combining');
    }

    return changes;
  }

  // Helper methods for vocabulary and complexity analysis
  private simplifyVocabulary(message: string, ageGroup: AgeGroup): string {
    const simpleWords = this.vocabularyLevels.get(ageGroup) || [];
    let simplified = message;

    // Replace complex words with simple ones
    const replacements = {
      'wonderful': 'good',
      'amazing': 'cool',
      'fantastic': 'fun',
      'incredible': 'wow',
      'sophisticated': 'nice',
      'remarkable': 'good'
    };

    Object.entries(replacements).forEach(([complex, simple]) => {
      simplified = simplified.replace(new RegExp(complex, 'gi'), simple);
    });

    return simplified;
  }

  private shortenSentences(message: string, maxWords: number): string {
    const sentences = message.split(/[.!?]/);
    const shortened = sentences.map(sentence => {
      const words = sentence.trim().split(' ');
      if (words.length > maxWords) {
        return words.slice(0, maxWords).join(' ');
      }
      return sentence;
    });

    return shortened.join('. ').trim();
  }

  private addSimpleWhimsy(message: string): string {
    const whimsyWords = ['super', 'really really', 'so so', 'yay'];
    const randomWhimsy = whimsyWords[Math.floor(Math.random() * whimsyWords.length)];
    
    return message.replace(/good/gi, `${randomWhimsy} good`);
  }

  private addEnthusiasticEncouragement(message: string): string {
    if (!message.includes('!')) {
      return `${message}!`;
    }
    return message;
  }

  private enhanceVocabulary(message: string, ageGroup: AgeGroup): string {
    const enhancedWords = this.vocabularyLevels.get(ageGroup) || [];
    let enhanced = message;

    if (ageGroup === '6-8') {
      enhanced = enhanced.replace(/good/gi, 'awesome');
      enhanced = enhanced.replace(/nice/gi, 'wonderful');
    } else if (ageGroup === '9-10') {
      enhanced = enhanced.replace(/good/gi, 'remarkable');
      enhanced = enhanced.replace(/nice/gi, 'extraordinary');
    }

    return enhanced;
  }

  private addPlayfulWordplay(message: string): string {
    // Add simple wordplay for 6-8 age group
    return message.replace(/fun/gi, 'fun-tastic');
  }

  private addImaginativeElements(message: string): string {
    // Add imaginative comparisons
    if (message.includes('good')) {
      return message.replace(/good/gi, 'good as a magical adventure');
    }
    return message;
  }

  private addConfidenceBuilding(message: string): string {
    return `You're doing great! ${message}`;
  }

  private addCleverWhimsy(message: string): string {
    // More sophisticated whimsy for 9-10 age group
    return message.replace(/amazing/gi, 'amazingly-blazingly');
  }

  private addCreativeAbsurdity(message: string): string {
    // Add creative absurd elements
    return message.replace(/wonderful/gi, 'more wonderful than a dancing elephant');
  }

  private addRespectfulTone(message: string): string {
    return `I really appreciate ${message.toLowerCase()}`;
  }

  // Analysis helper methods
  private hasSimpleVocabulary(message: string): boolean {
    const simpleWords = ['good', 'nice', 'fun', 'happy', 'big', 'little'];
    return simpleWords.some(word => message.toLowerCase().includes(word));
  }

  private hasShortSentences(message: string, maxWords: number): boolean {
    const sentences = message.split(/[.!?]/);
    return sentences.every(sentence => sentence.trim().split(' ').length <= maxWords);
  }

  private hasSimpleWhimsy(message: string): boolean {
    return /super|really really|so so|yay/.test(message.toLowerCase());
  }

  private hasEnthusiasticTone(message: string): boolean {
    return message.includes('!') || /great|awesome|yay/.test(message.toLowerCase());
  }

  private hasRepetition(message: string): boolean {
    const words = message.toLowerCase().split(' ');
    const uniqueWords = new Set(words);
    return words.length > uniqueWords.size;
  }

  private hasIntermediateVocabulary(message: string): boolean {
    const intermediateWords = ['awesome', 'wonderful', 'fantastic', 'amazing'];
    return intermediateWords.some(word => message.toLowerCase().includes(word));
  }

  private hasWordplay(message: string): boolean {
    return /-/.test(message) || /tastic|rific|ular/.test(message.toLowerCase());
  }

  private hasImaginativeElements(message: string): boolean {
    return /like|as.*as|more.*than/.test(message.toLowerCase());
  }

  private hasConfidenceBuilding(message: string): boolean {
    return /you're|great|proud|wonderful/.test(message.toLowerCase());
  }

  private hasSophisticatedVocabulary(message: string): boolean {
    const sophisticatedWords = ['remarkable', 'extraordinary', 'sophisticated', 'exceptional'];
    return sophisticatedWords.some(word => message.toLowerCase().includes(word));
  }

  private hasCleverWhimsy(message: string): boolean {
    return /ingly-/.test(message.toLowerCase());
  }

  private hasCreativeAbsurdity(message: string): boolean {
    return /more.*than.*dancing|flying.*pancakes/.test(message.toLowerCase());
  }

  private hasRespectfulTone(message: string): boolean {
    return /appreciate|respect|value/.test(message.toLowerCase());
  }

  private vocabularyAligns(message: string, level: string): boolean {
    switch (level) {
      case 'simple':
        return this.hasSimpleVocabulary(message);
      case 'intermediate':
        return this.hasIntermediateVocabulary(message);
      case 'advanced':
        return this.hasSophisticatedVocabulary(message);
      default:
        return true;
    }
  }

  private sentenceLengthAligns(message: string, length: string): boolean {
    const avgWordsPerSentence = this.calculateAverageWordsPerSentence(message);
    
    switch (length) {
      case 'short':
        return avgWordsPerSentence <= 8;
      case 'medium':
        return avgWordsPerSentence > 8 && avgWordsPerSentence <= 15;
      case 'long':
        return avgWordsPerSentence > 15;
      default:
        return true;
    }
  }

  private conceptComplexityAligns(message: string, complexity: string): boolean {
    // Simple heuristic - could be enhanced with more sophisticated analysis
    const complexWords = ['because', 'however', 'therefore', 'although', 'meanwhile'];
    const hasComplexWords = complexWords.some(word => message.toLowerCase().includes(word));
    
    switch (complexity) {
      case 'basic':
        return !hasComplexWords;
      case 'moderate':
        return hasComplexWords;
      case 'complex':
        return hasComplexWords && message.length > 100;
      default:
        return true;
    }
  }

  private analyzeVocabularyComplexity(input: string): number {
    const words = input.toLowerCase().split(' ');
    const complexWords = words.filter(word => word.length > 6).length;
    return complexWords / Math.max(words.length, 1);
  }

  private analyzeSentenceComplexity(input: string): number {
    const sentences = input.split(/[.!?]/).filter(s => s.trim().length > 0);
    const avgLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / Math.max(sentences.length, 1);
    return Math.min(1.0, avgLength / 20); // Normalize to 0-1 scale
  }

  private analyzeConceptComplexity(input: string): number {
    const complexConcepts = ['because', 'however', 'therefore', 'although', 'meanwhile', 'consequently'];
    const conceptCount = complexConcepts.filter(concept => 
      input.toLowerCase().includes(concept)
    ).length;
    return Math.min(1.0, conceptCount / 3); // Normalize to 0-1 scale
  }

  private mapAgeToGroup(age: number): AgeGroup {
    if (age <= 5) return '3-5';
    if (age <= 8) return '6-8';
    if (age <= 10) return '9-10';
    return '11+';
  }

  private calculateAgeAppropriateness(traits: PersonalityTraits, ageGroup: AgeGroup): number {
    // Calculate how well traits match expected ranges for age group
    const expectedRanges = {
      '3-5': { whimsy: [0.8, 1.0], playfulness: [0.8, 1.0], youthfulness: [0.9, 1.0] },
      '6-8': { whimsy: [0.7, 0.9], playfulness: [0.7, 0.9], youthfulness: [0.8, 1.0] },
      '9-10': { whimsy: [0.5, 0.8], playfulness: [0.5, 0.8], youthfulness: [0.6, 0.9] },
      '11+': { whimsy: [0.3, 0.7], playfulness: [0.3, 0.7], youthfulness: [0.4, 0.8] }
    };

    const ranges = expectedRanges[ageGroup];
    let appropriateness = 0;
    let count = 0;

    Object.entries(ranges).forEach(([trait, [min, max]]) => {
      const value = traits[trait as keyof PersonalityTraits];
      if (value >= min && value <= max) {
        appropriateness += 1;
      }
      count += 1;
    });

    return appropriateness / count;
  }

  private calculateAverageWordsPerSentence(message: string): number {
    const sentences = message.split(/[.!?]/).filter(s => s.trim().length > 0);
    const totalWords = sentences.reduce((sum, sentence) => {
      return sum + sentence.trim().split(' ').length;
    }, 0);
    
    return totalWords / Math.max(sentences.length, 1);
  }

  private adjustVocabularyLevel(message: string, level: string): string {
    switch (level) {
      case 'simple':
        return this.simplifyVocabulary(message, '3-5');
      case 'intermediate':
        return this.enhanceVocabulary(message, '6-8');
      case 'advanced':
        return this.enhanceVocabulary(message, '11+');
      default:
        return message;
    }
  }

  private adjustSentenceLength(message: string, length: string): string {
    switch (length) {
      case 'short':
        return this.shortenSentences(message, 8);
      case 'medium':
        return this.shortenSentences(message, 15);
      case 'long':
        return message; // Keep as is for long sentences
      default:
        return message;
    }
  }

  private adjustConceptComplexity(message: string, complexity: string): string {
    // Simple implementation - could be enhanced
    switch (complexity) {
      case 'basic':
        return message.replace(/because|however|therefore/gi, 'and');
      case 'moderate':
        return message; // Keep as is
      case 'complex':
        return message; // Keep as is
      default:
        return message;
    }
  }
}