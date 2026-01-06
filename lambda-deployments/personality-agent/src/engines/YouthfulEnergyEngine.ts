import {
  AgeGroup,
  PersonalityContext,
  PersonalityTraits,
  EmotionalState
} from '../types';

/**
 * Youthful energy engine that brings boundless enthusiasm and childlike wonder
 * Implements Requirement 19.4: Youthful energy with boundless enthusiasm and childlike wonder
 */
export class YouthfulEnergyEngine {
  private enthusiasmLevels: Map<string, number> = new Map();
  private wonderExpressions: Map<AgeGroup, string[]> = new Map();
  private energyModulators: Map<EmotionalState, number> = new Map();
  private youthfulLanguage: Map<AgeGroup, string[]> = new Map();

  constructor() {
    this.initializeEnthusiasmLevels();
    this.initializeWonderExpressions();
    this.initializeEnergyModulators();
    this.initializeYouthfulLanguage();
  }

  /**
   * Generates boundless enthusiasm appropriate for the context
   * Matches child's energy while maintaining appropriate boundaries
   */
  generateBoundlessEnthusiasm(
    context: PersonalityContext,
    topic: string,
    baseEnergy: number = 0.7
  ): {
    enthusiasticResponse: string;
    energyLevel: number;
    enthusiasmMarkers: string[];
    boundlessElements: string[];
  } {
    const adjustedEnergy = this.modulateEnergyForContext(baseEnergy, context);
    const enthusiasticResponse = this.craftEnthusiasticResponse(topic, adjustedEnergy, context);
    const enthusiasmMarkers = this.identifyEnthusiasmMarkers(enthusiasticResponse);
    const boundlessElements = this.extractBoundlessElements(enthusiasticResponse);

    return {
      enthusiasticResponse,
      energyLevel: adjustedEnergy,
      enthusiasmMarkers,
      boundlessElements
    };
  }

  /**
   * Expresses childlike wonder and amazement
   * Creates sense of magic and possibility in storytelling
   */
  expressChildlikeWonder(
    context: PersonalityContext,
    wonderTrigger: string,
    intensity: number = 0.8
  ): {
    wonderExpression: string;
    amazementLevel: number;
    magicalElements: string[];
    curiosityInducers: string[];
  } {
    const wonderExpression = this.createWonderExpression(wonderTrigger, intensity, context);
    const amazementLevel = this.calculateAmazementLevel(wonderTrigger, context);
    const magicalElements = this.identifyMagicalElements(wonderExpression);
    const curiosityInducers = this.extractCuriosityInducers(wonderExpression);

    return {
      wonderExpression,
      amazementLevel,
      magicalElements,
      curiosityInducers
    };
  }

  /**
   * Creates youthful language patterns that resonate with children
   * Uses age-appropriate expressions that feel fresh and energetic
   */
  createYouthfulLanguage(
    baseMessage: string,
    context: PersonalityContext,
    youthfulnessLevel: number = 0.6
  ): {
    youthfulMessage: string;
    languageTransformations: string[];
    energyBoosts: string[];
    ageAlignment: number;
  } {
    const youthfulMessage = this.transformToYouthfulLanguage(
      baseMessage,
      context.ageGroup,
      youthfulnessLevel
    );
    const languageTransformations = this.identifyTransformations(baseMessage, youthfulMessage);
    const energyBoosts = this.identifyEnergyBoosts(youthfulMessage);
    const ageAlignment = this.calculateAgeAlignment(youthfulMessage, context.ageGroup);

    return {
      youthfulMessage,
      languageTransformations,
      energyBoosts,
      ageAlignment
    };
  }

  /**
   * Balances high energy with emotional sensitivity
   * Adjusts enthusiasm based on child's emotional state and needs
   */
  balanceEnergyWithSensitivity(
    baseEnergy: number,
    childEmotion: EmotionalState,
    context: PersonalityContext
  ): {
    balancedEnergy: number;
    adjustmentReason: string;
    sensitivityFactors: string[];
    energyExpression: string;
  } {
    const energyModulator = this.energyModulators.get(childEmotion) || 1.0;
    const balancedEnergy = this.calculateBalancedEnergy(baseEnergy, energyModulator, context);
    const adjustmentReason = this.explainEnergyAdjustment(childEmotion, balancedEnergy);
    const sensitivityFactors = this.identifySensitivityFactors(childEmotion, context);
    const energyExpression = this.determineEnergyExpression(balancedEnergy, context);

    return {
      balancedEnergy,
      adjustmentReason,
      sensitivityFactors,
      energyExpression
    };
  }

  /**
   * Creates infectious excitement that spreads to children
   * Generates enthusiasm that naturally draws children into engagement
   */
  createInfectiousExcitement(
    context: PersonalityContext,
    excitementTrigger: string,
    contagionLevel: number = 0.8
  ): {
    infectiousMessage: string;
    contagionFactors: string[];
    excitementAmplifiers: string[];
    engagementPotential: number;
  } {
    const infectiousMessage = this.craftInfectiousMessage(
      excitementTrigger,
      contagionLevel,
      context
    );
    const contagionFactors = this.identifyContagionFactors(infectiousMessage);
    const excitementAmplifiers = this.extractExcitementAmplifiers(infectiousMessage);
    const engagementPotential = this.calculateEngagementPotential(
      infectiousMessage,
      context
    );

    return {
      infectiousMessage,
      contagionFactors,
      excitementAmplifiers,
      engagementPotential
    };
  }

  /**
   * Maintains appropriate energy boundaries
   * Ensures enthusiasm doesn't overwhelm or overstimulate children
   */
  maintainEnergyBoundaries(
    energyLevel: number,
    context: PersonalityContext,
    childResponse?: string
  ): {
    adjustedEnergy: number;
    boundaryReasons: string[];
    safetyMeasures: string[];
    appropriatenessScore: number;
  } {
    const adjustedEnergy = this.applyEnergyBoundaries(energyLevel, context);
    const boundaryReasons = this.identifyBoundaryReasons(energyLevel, adjustedEnergy, context);
    const safetyMeasures = this.determineSafetyMeasures(adjustedEnergy, context);
    const appropriatenessScore = this.calculateAppropriatenessScore(adjustedEnergy, context);

    return {
      adjustedEnergy,
      boundaryReasons,
      safetyMeasures,
      appropriatenessScore
    };
  }

  private initializeEnthusiasmLevels(): void {
    // Base enthusiasm levels for different contexts
    this.enthusiasmLevels.set('story_start', 0.9);
    this.enthusiasmLevels.set('character_creation', 0.8);
    this.enthusiasmLevels.set('story_building', 0.7);
    this.enthusiasmLevels.set('celebration', 1.0);
    this.enthusiasmLevels.set('encouragement', 0.8);
    this.enthusiasmLevels.set('greeting', 0.9);
    this.enthusiasmLevels.set('farewell', 0.7);
    this.enthusiasmLevels.set('problem_solving', 0.6);
  }

  private initializeWonderExpressions(): void {
    this.wonderExpressions.set('3-5', [
      "Wow! That's so cool!",
      "Oh my goodness, how amazing!",
      "That's like magic!",
      "Incredible! I love it!",
      "So awesome and wonderful!",
      "That makes me so happy!",
      "What a fantastic idea!",
      "You're so creative!"
    ]);

    this.wonderExpressions.set('6-8', [
      "That's absolutely incredible!",
      "Wow, you've blown my mind!",
      "That's more amazing than I imagined!",
      "You've created something truly special!",
      "I'm amazed by your creativity!",
      "That's wonderfully imaginative!",
      "You've made something magical happen!",
      "That's beyond awesome!"
    ]);

    this.wonderExpressions.set('9-10', [
      "That's genuinely extraordinary!",
      "You've created something remarkable!",
      "I'm in awe of your imagination!",
      "That's brilliantly creative!",
      "You've crafted something truly unique!",
      "That's impressively innovative!",
      "You've brought something wonderful to life!",
      "That's creatively inspiring!"
    ]);

    this.wonderExpressions.set('11+', [
      "That's remarkably sophisticated!",
      "You've demonstrated incredible creativity!",
      "That's genuinely impressive work!",
      "You've shown exceptional imagination!",
      "That's creatively outstanding!",
      "You've developed something truly original!",
      "That shows remarkable artistic vision!",
      "You've created something genuinely inspiring!"
    ]);
  }

  private initializeEnergyModulators(): void {
    // How different emotions should modulate energy levels
    this.energyModulators.set('happy', 1.2);
    this.energyModulators.set('excited', 1.3);
    this.energyModulators.set('curious', 1.1);
    this.energyModulators.set('confident', 1.1);
    this.energyModulators.set('calm', 0.8);
    this.energyModulators.set('sad', 0.4);
    this.energyModulators.set('anxious', 0.5);
    this.energyModulators.set('shy', 0.6);
    this.energyModulators.set('frustrated', 0.7);
    this.energyModulators.set('tired', 0.3);
    this.energyModulators.set('overwhelmed', 0.2);
    this.energyModulators.set('neutral', 1.0);
  }

  private initializeYouthfulLanguage(): void {
    this.youthfulLanguage.set('3-5', [
      'super', 'really really', 'so so', 'wow', 'yay', 'hooray',
      'amazing', 'awesome', 'cool', 'fun', 'silly', 'giggly'
    ]);

    this.youthfulLanguage.set('6-8', [
      'totally', 'absolutely', 'incredibly', 'fantastically', 'wonderfully',
      'brilliantly', 'amazingly', 'spectacularly', 'magnificently'
    ]);

    this.youthfulLanguage.set('9-10', [
      'genuinely', 'remarkably', 'exceptionally', 'extraordinarily',
      'impressively', 'creatively', 'innovatively', 'imaginatively'
    ]);

    this.youthfulLanguage.set('11+', [
      'sophisticatedly', 'artistically', 'intellectually', 'creatively',
      'innovatively', 'originally', 'uniquely', 'inspiringly'
    ]);
  }

  private modulateEnergyForContext(
    baseEnergy: number,
    context: PersonalityContext
  ): number {
    let adjustedEnergy = baseEnergy;

    // Adjust for emotional state
    const emotionModulator = this.energyModulators.get(context.currentEmotionalState) || 1.0;
    adjustedEnergy *= emotionModulator;

    // Adjust for conversation phase
    const phaseEnergy = this.enthusiasmLevels.get(context.conversationPhase) || 0.7;
    adjustedEnergy = (adjustedEnergy + phaseEnergy) / 2;

    // Age-based adjustments
    if (context.ageGroup === '3-5') {
      adjustedEnergy = Math.min(adjustedEnergy * 1.1, 1.0); // Slightly higher for young children
    } else if (context.ageGroup === '11+') {
      adjustedEnergy *= 0.9; // Slightly more contained for older children
    }

    return Math.max(0.1, Math.min(1.0, adjustedEnergy));
  }

  private craftEnthusiasticResponse(
    topic: string,
    energy: number,
    context: PersonalityContext
  ): string {
    const baseResponses = {
      low: "That's really nice!",
      medium: "That's so wonderful!",
      high: "Oh my goodness, that's absolutely amazing!",
      extreme: "WOW! That's the most incredible thing ever!"
    };

    let energyLevel: keyof typeof baseResponses;
    if (energy < 0.3) energyLevel = 'low';
    else if (energy < 0.6) energyLevel = 'medium';
    else if (energy < 0.9) energyLevel = 'high';
    else energyLevel = 'extreme';

    let response = baseResponses[energyLevel];

    // Add topic-specific enthusiasm
    response = this.addTopicEnthusiasm(response, topic, context);

    // Add age-appropriate language
    response = this.addYouthfulLanguage(response, context.ageGroup, energy);

    return response;
  }

  private identifyEnthusiasmMarkers(response: string): string[] {
    const markers: string[] = [];

    if (response.includes('!')) markers.push('exclamation points');
    if (response.includes('WOW') || response.includes('wow')) markers.push('wow expressions');
    if (response.includes('amazing') || response.includes('incredible')) markers.push('superlatives');
    if (response.includes('so ') || response.includes('really ')) markers.push('intensifiers');
    if (/\b(absolutely|totally|completely)\b/.test(response)) markers.push('absolute terms');

    return markers;
  }

  private extractBoundlessElements(response: string): string[] {
    const elements: string[] = [];

    if (response.includes('most') || response.includes('ever')) elements.push('boundless comparisons');
    if (response.includes('infinite') || response.includes('endless')) elements.push('infinity concepts');
    if (response.includes('beyond') || response.includes('more than')) elements.push('transcendent language');
    if (/\b(all|every|always|never)\b/.test(response)) elements.push('absolute expressions');

    return elements;
  }

  private createWonderExpression(
    trigger: string,
    intensity: number,
    context: PersonalityContext
  ): string {
    const wonderExpressions = this.wonderExpressions.get(context.ageGroup) || [];
    
    if (wonderExpressions.length === 0) {
      return "That's wonderful!";
    }

    // Select expression based on intensity
    const expressionIndex = Math.floor(intensity * wonderExpressions.length);
    const selectedExpression = wonderExpressions[Math.min(expressionIndex, wonderExpressions.length - 1)];

    // Personalize for the trigger
    return this.personalizeWonderExpression(selectedExpression, trigger, context);
  }

  private calculateAmazementLevel(trigger: string, context: PersonalityContext): number {
    let amazement = 0.7; // Base level

    // Increase amazement for creative triggers
    const creativeWords = ['character', 'story', 'magic', 'adventure', 'imagination'];
    const creativeMatches = creativeWords.filter(word => 
      trigger.toLowerCase().includes(word)
    ).length;
    amazement += creativeMatches * 0.1;

    // Age adjustments
    if (context.ageGroup === '3-5') {
      amazement += 0.2; // Younger children inspire more wonder
    }

    return Math.min(1.0, amazement);
  }

  private identifyMagicalElements(expression: string): string[] {
    const elements: string[] = [];

    const magicalWords = ['magic', 'magical', 'wonder', 'amazing', 'incredible', 'extraordinary'];
    magicalWords.forEach(word => {
      if (expression.toLowerCase().includes(word)) {
        elements.push(word);
      }
    });

    return elements;
  }

  private extractCuriosityInducers(expression: string): string[] {
    const inducers: string[] = [];

    if (expression.includes('how') || expression.includes('what')) inducers.push('question words');
    if (expression.includes('imagine') || expression.includes('think')) inducers.push('imagination prompts');
    if (expression.includes('wonder') || expression.includes('curious')) inducers.push('wonder words');

    return inducers;
  }

  private transformToYouthfulLanguage(
    message: string,
    ageGroup: AgeGroup,
    youthfulness: number
  ): string {
    let youthfulMessage = message;
    const youthfulWords = this.youthfulLanguage.get(ageGroup) || [];

    // Apply youthful transformations based on level
    if (youthfulness > 0.3) {
      youthfulMessage = this.addYouthfulIntensifiers(youthfulMessage, youthfulWords);
    }

    if (youthfulness > 0.6) {
      youthfulMessage = this.addYouthfulExclamations(youthfulMessage);
    }

    if (youthfulness > 0.8) {
      youthfulMessage = this.addYouthfulSuperlatives(youthfulMessage, youthfulWords);
    }

    return youthfulMessage;
  }

  private identifyTransformations(original: string, transformed: string): string[] {
    const transformations: string[] = [];

    if (transformed.length > original.length) {
      transformations.push('added youthful language');
    }

    if (transformed.includes('!') && !original.includes('!')) {
      transformations.push('added exclamations');
    }

    if (/\b(super|really|so)\b/.test(transformed) && !/\b(super|really|so)\b/.test(original)) {
      transformations.push('added intensifiers');
    }

    return transformations;
  }

  private identifyEnergyBoosts(message: string): string[] {
    const boosts: string[] = [];

    const energyWords = ['super', 'really', 'so', 'totally', 'absolutely', 'incredibly'];
    energyWords.forEach(word => {
      if (message.toLowerCase().includes(word)) {
        boosts.push(word);
      }
    });

    return boosts;
  }

  private calculateAgeAlignment(message: string, ageGroup: AgeGroup): number {
    const ageWords = this.youthfulLanguage.get(ageGroup) || [];
    const matchCount = ageWords.filter(word => 
      message.toLowerCase().includes(word.toLowerCase())
    ).length;

    return Math.min(1.0, matchCount * 0.2 + 0.5);
  }

  private calculateBalancedEnergy(
    baseEnergy: number,
    modulator: number,
    context: PersonalityContext
  ): number {
    let balanced = baseEnergy * modulator;

    // Additional context-based adjustments
    if (context.conversationPhase === 'greeting') {
      balanced = Math.min(balanced * 1.1, 1.0);
    } else if (context.conversationPhase === 'farewell') {
      balanced *= 0.9;
    }

    return Math.max(0.1, Math.min(1.0, balanced));
  }

  private explainEnergyAdjustment(emotion: EmotionalState, adjustedEnergy: number): string {
    const explanations = {
      sad: "Lowered energy to provide gentle comfort",
      anxious: "Reduced energy to avoid overwhelming",
      shy: "Moderated energy to create safe space",
      excited: "Matched high energy to share excitement",
      happy: "Increased energy to celebrate together",
      frustrated: "Balanced energy to provide support without pressure"
    };

    return explanations[emotion] || "Adjusted energy to match emotional needs";
  }

  private identifySensitivityFactors(emotion: EmotionalState, context: PersonalityContext): string[] {
    const factors: string[] = [];

    if (['sad', 'anxious', 'overwhelmed'].includes(emotion)) {
      factors.push('emotional vulnerability');
    }

    if (emotion === 'shy') {
      factors.push('social comfort level');
    }

    if (context.ageGroup === '3-5') {
      factors.push('developmental sensitivity');
    }

    return factors;
  }

  private determineEnergyExpression(energy: number, context: PersonalityContext): string {
    if (energy < 0.3) return 'gentle and calm';
    if (energy < 0.6) return 'warm and encouraging';
    if (energy < 0.8) return 'enthusiastic and engaging';
    return 'boundlessly excited';
  }

  private craftInfectiousMessage(
    trigger: string,
    contagion: number,
    context: PersonalityContext
  ): string {
    const baseMessage = `I'm so excited about ${trigger}!`;
    
    if (contagion > 0.8) {
      return `OH WOW! ${baseMessage} This is going to be absolutely AMAZING! I can hardly contain my excitement!`;
    } else if (contagion > 0.6) {
      return `${baseMessage} This is going to be so much fun! I'm getting more excited just thinking about it!`;
    } else if (contagion > 0.4) {
      return `${baseMessage} I have such a good feeling about this!`;
    } else {
      return baseMessage;
    }
  }

  private identifyContagionFactors(message: string): string[] {
    const factors: string[] = [];

    if (message.includes('WOW') || message.includes('OH')) factors.push('explosive expressions');
    if (message.includes('hardly contain') || message.includes('bursting')) factors.push('overflow language');
    if (message.includes('getting more') || message.includes('building')) factors.push('escalating excitement');
    if (message.includes('we') || message.includes('together')) factors.push('inclusive language');

    return factors;
  }

  private extractExcitementAmplifiers(message: string): string[] {
    const amplifiers: string[] = [];

    const amplifierWords = ['absolutely', 'incredibly', 'amazingly', 'fantastically', 'spectacularly'];
    amplifierWords.forEach(word => {
      if (message.toLowerCase().includes(word)) {
        amplifiers.push(word);
      }
    });

    return amplifiers;
  }

  private calculateEngagementPotential(message: string, context: PersonalityContext): number {
    let potential = 0.5;

    // Exclamation points increase engagement
    const exclamationCount = (message.match(/!/g) || []).length;
    potential += exclamationCount * 0.1;

    // Positive words increase engagement
    const positiveWords = ['amazing', 'wonderful', 'fantastic', 'incredible', 'awesome'];
    const positiveCount = positiveWords.filter(word => 
      message.toLowerCase().includes(word)
    ).length;
    potential += positiveCount * 0.1;

    // Age-appropriate adjustments
    if (context.ageGroup === '3-5') {
      potential += 0.1; // Younger children are more easily engaged
    }

    return Math.min(1.0, potential);
  }

  private applyEnergyBoundaries(energy: number, context: PersonalityContext): number {
    let bounded = energy;

    // Maximum energy limits by age
    const maxEnergyLimits = {
      '3-5': 0.9,   // High but not overwhelming
      '6-8': 1.0,   // Full energy allowed
      '9-10': 0.95, // Slightly moderated
      '11+': 0.9    // More sophisticated, less bouncy
    };

    const maxEnergy = maxEnergyLimits[context.ageGroup] || 1.0;
    bounded = Math.min(bounded, maxEnergy);

    // Emotional state boundaries
    if (['sad', 'anxious', 'overwhelmed'].includes(context.currentEmotionalState)) {
      bounded = Math.min(bounded, 0.4);
    }

    return bounded;
  }

  private identifyBoundaryReasons(
    original: number,
    adjusted: number,
    context: PersonalityContext
  ): string[] {
    const reasons: string[] = [];

    if (adjusted < original) {
      if (['sad', 'anxious', 'overwhelmed'].includes(context.currentEmotionalState)) {
        reasons.push('emotional sensitivity');
      }
      
      if (context.ageGroup === '11+') {
        reasons.push('age-appropriate moderation');
      }
      
      if (adjusted < 0.5) {
        reasons.push('overstimulation prevention');
      }
    }

    return reasons;
  }

  private determineSafetyMeasures(energy: number, context: PersonalityContext): string[] {
    const measures: string[] = [];

    if (energy > 0.8) {
      measures.push('monitor for overstimulation');
    }

    if (context.currentEmotionalState === 'anxious' && energy > 0.4) {
      measures.push('watch for increased anxiety');
    }

    if (context.ageGroup === '3-5' && energy > 0.7) {
      measures.push('ensure age-appropriate boundaries');
    }

    return measures;
  }

  private calculateAppropriatenessScore(energy: number, context: PersonalityContext): number {
    let score = 0.8; // Base appropriateness

    // Adjust for emotional context
    const emotionAppropriateEnergy = {
      happy: 0.8,
      excited: 1.0,
      sad: 0.3,
      anxious: 0.4,
      shy: 0.5,
      frustrated: 0.6
    };

    const appropriateLevel = emotionAppropriateEnergy[context.currentEmotionalState] || 0.7;
    const energyDifference = Math.abs(energy - appropriateLevel);
    score -= energyDifference * 0.5;

    return Math.max(0.1, Math.min(1.0, score));
  }

  // Helper methods
  private addTopicEnthusiasm(response: string, topic: string, context: PersonalityContext): string {
    const topicEnthusiasm = {
      'character': 'I love creating characters!',
      'story': 'Stories are the most magical things!',
      'adventure': 'Adventures are so exciting!',
      'magic': 'Magic makes everything wonderful!'
    };

    const enthusiasm = Object.entries(topicEnthusiasm).find(([key]) => 
      topic.toLowerCase().includes(key)
    )?.[1];

    return enthusiasm ? `${response} ${enthusiasm}` : response;
  }

  private addYouthfulLanguage(response: string, ageGroup: AgeGroup, energy: number): string {
    const youthfulWords = this.youthfulLanguage.get(ageGroup) || [];
    
    if (energy > 0.6 && youthfulWords.length > 0) {
      const randomWord = youthfulWords[Math.floor(Math.random() * youthfulWords.length)];
      return response.replace(/\b(good|nice)\b/, randomWord);
    }

    return response;
  }

  private personalizeWonderExpression(
    expression: string,
    trigger: string,
    context: PersonalityContext
  ): string {
    // Replace generic terms with specific trigger
    return expression.replace(/that/gi, trigger);
  }

  private addYouthfulIntensifiers(message: string, youthfulWords: string[]): string {
    const intensifiers = youthfulWords.filter(word => 
      ['super', 'really', 'so', 'totally', 'absolutely'].includes(word)
    );

    if (intensifiers.length > 0) {
      const intensifier = intensifiers[Math.floor(Math.random() * intensifiers.length)];
      return message.replace(/\b(good|nice|great)\b/, `${intensifier} $1`);
    }

    return message;
  }

  private addYouthfulExclamations(message: string): string {
    if (!message.includes('!')) {
      return `${message}!`;
    }
    return message;
  }

  private addYouthfulSuperlatives(message: string, youthfulWords: string[]): string {
    const superlatives = youthfulWords.filter(word => 
      ['amazing', 'awesome', 'incredible', 'fantastic'].includes(word)
    );

    if (superlatives.length > 0) {
      const superlative = superlatives[Math.floor(Math.random() * superlatives.length)];
      return `${message} It's ${superlative}!`;
    }

    return message;
  }
}