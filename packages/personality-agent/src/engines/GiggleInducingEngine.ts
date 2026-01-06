import {
  AgeGroup,
  PersonalityContext,
  EmotionalState
} from '../types';

/**
 * Giggle-inducing engine that creates age-appropriate humor and silly wordplay
 * Implements Requirement 19.2: Age-appropriate humor and silly wordplay that induces giggles
 */
export class GiggleInducingEngine {
  private ageAppropriateHumor: Map<AgeGroup, string[]> = new Map();
  private sillyWordplay: Map<AgeGroup, string[]> = new Map();
  private giggleTriggers: Map<string, string[]> = new Map();
  private humorTiming: Map<EmotionalState, number> = new Map();

  constructor() {
    this.initializeAgeAppropriateHumor();
    this.initializeSillyWordplay();
    this.initializeGiggleTriggers();
    this.initializeHumorTiming();
  }

  /**
   * Generates age-appropriate humor that makes children giggle
   * Adapts humor complexity and style based on developmental stage
   */
  generateAgeAppropriateHumor(
    context: PersonalityContext,
    topic: string,
    humorIntensity: number = 0.7
  ): {
    humorousContent: string;
    gigglePotential: number;
    humorElements: string[];
    ageAppropriateness: number;
  } {
    const humorousContent = this.createHumorousContent(topic, humorIntensity, context);
    const gigglePotential = this.calculateGigglePotential(humorousContent, context);
    const humorElements = this.identifyHumorElements(humorousContent);
    const ageAppropriateness = this.assessAgeAppropriateness(humorousContent, context);

    return {
      humorousContent,
      gigglePotential,
      humorElements,
      ageAppropriateness
    };
  }

  /**
   * Creates silly wordplay that delights children
   * Uses rhymes, alliteration, and playful word combinations
   */
  createSillyWordplay(
    baseWords: string[],
    context: PersonalityContext,
    playfulnessLevel: number = 0.8
  ): {
    wordplayResult: string;
    playfulElements: string[];
    sillinessScore: number;
    linguisticCreativity: number;
  } {
    const wordplayResult = this.generateWordplay(baseWords, playfulnessLevel, context);
    const playfulElements = this.identifyPlayfulElements(wordplayResult);
    const sillinessScore = this.calculateSillinessScore(wordplayResult, context);
    const linguisticCreativity = this.assessLinguisticCreativity(wordplayResult);

    return {
      wordplayResult,
      playfulElements,
      sillinessScore,
      linguisticCreativity
    };
  }

  /**
   * Times humor appropriately based on emotional context
   * Knows when to be silly and when to be more gentle
   */
  timeHumorAppropriately(
    context: PersonalityContext,
    proposedHumor: string,
    emotionalSensitivity: number = 0.8
  ): {
    appropriateHumor: string;
    timingScore: number;
    adjustmentReasons: string[];
    emotionalConsideration: number;
  } {
    const timingScore = this.assessHumorTiming(context, proposedHumor);
    const appropriateHumor = this.adjustHumorForTiming(
      proposedHumor,
      timingScore,
      context,
      emotionalSensitivity
    );
    const adjustmentReasons = this.identifyTimingAdjustments(
      proposedHumor,
      appropriateHumor,
      context
    );
    const emotionalConsideration = this.calculateEmotionalConsideration(
      appropriateHumor,
      context
    );

    return {
      appropriateHumor,
      timingScore,
      adjustmentReasons,
      emotionalConsideration
    };
  }

  /**
   * Creates interactive humor that engages children
   * Invites participation and builds on child's responses
   */
  createInteractiveHumor(
    context: PersonalityContext,
    childResponse?: string,
    interactionLevel: number = 0.7
  ): {
    interactiveContent: string;
    participationInvites: string[];
    engagementLevel: number;
    responseBuilding: string[];
  } {
    const interactiveContent = this.generateInteractiveHumorContent(
      context,
      childResponse,
      interactionLevel
    );
    const participationInvites = this.identifyParticipationInvites(interactiveContent);
    const engagementLevel = this.calculateEngagementLevel(interactiveContent, context);
    const responseBuilding = this.identifyResponseBuilding(interactiveContent, childResponse);

    return {
      interactiveContent,
      participationInvites,
      engagementLevel,
      responseBuilding
    };
  }

  /**
   * Balances humor with story focus
   * Ensures silliness enhances rather than distracts from storytelling
   */
  balanceHumorWithStoryFocus(
    humor: string,
    storyContext: any,
    focusLevel: number = 0.8
  ): {
    balancedHumor: string;
    storyRelevance: number;
    focusPreservation: number;
    integrationQuality: number;
  } {
    const balancedHumor = this.integrateHumorWithStory(humor, storyContext, focusLevel);
    const storyRelevance = this.calculateStoryRelevance(balancedHumor, storyContext);
    const focusPreservation = this.assessFocusPreservation(balancedHumor, storyContext);
    const integrationQuality = this.evaluateIntegrationQuality(balancedHumor, humor);

    return {
      balancedHumor,
      storyRelevance,
      focusPreservation,
      integrationQuality
    };
  }

  /**
   * Adapts humor style to individual child preferences
   * Learns what makes each child laugh and adjusts accordingly
   */
  adaptHumorToChild(
    baseHumor: string,
    context: PersonalityContext,
    childPreferences: any = {},
    humorHistory: any[] = []
  ): {
    adaptedHumor: string;
    personalizationElements: string[];
    preferenceAlignment: number;
    humorEvolution: string[];
  } {
    const adaptedHumor = this.personalizeHumor(
      baseHumor,
      context,
      childPreferences,
      humorHistory
    );
    const personalizationElements = this.identifyPersonalizationElements(
      baseHumor,
      adaptedHumor
    );
    const preferenceAlignment = this.calculatePreferenceAlignment(
      adaptedHumor,
      childPreferences
    );
    const humorEvolution = this.trackHumorEvolution(adaptedHumor, humorHistory);

    return {
      adaptedHumor,
      personalizationElements,
      preferenceAlignment,
      humorEvolution
    };
  }

  private initializeAgeAppropriateHumor(): void {
    this.ageAppropriateHumor.set('3-5', [
      'peek-a-boo surprises',
      'silly animal sounds (moo, oink, quack)',
      'simple rhyming games',
      'funny face descriptions',
      'tickle references',
      'bouncing and wiggling words',
      'color mixing silliness',
      'size comparisons (tiny-huge)'
    ]);

    this.ageAppropriateHumor.set('6-8', [
      'clever wordplay and puns',
      'silly scenario descriptions',
      'playful exaggerations',
      'funny character quirks',
      'imaginative comparisons',
      'silly sound effects',
      'playful rule-breaking',
      'absurd combinations'
    ]);

    this.ageAppropriateHumor.set('9-10', [
      'witty observations',
      'creative absurdity',
      'clever word combinations',
      'humorous situations',
      'playful logic twists',
      'sophisticated wordplay',
      'ironic situations',
      'creative metaphors'
    ]);

    this.ageAppropriateHumor.set('11+', [
      'sophisticated wordplay',
      'subtle irony',
      'clever references',
      'witty dialogue',
      'creative metaphors',
      'intellectual humor',
      'satirical observations',
      'complex puns'
    ]);
  }

  private initializeSillyWordplay(): void {
    this.sillyWordplay.set('3-5', [
      'wibbly-wobbly',
      'jiggly-wiggly',
      'bubbly-bubbly',
      'giggly-giggly',
      'tickly-tickly',
      'bouncy-bouncy',
      'squiggly-squiggly',
      'cuddly-cuddly'
    ]);

    this.sillyWordplay.set('6-8', [
      'flibber-floo',
      'snickle-snackle',
      'wiggle-waggle',
      'bubble-babble',
      'giggle-gaggle',
      'tickle-tackle',
      'dribble-drabble',
      'nibble-nabble'
    ]);

    this.sillyWordplay.set('9-10', [
      'whimsical-mystical',
      'fantastic-elastic',
      'magical-tragical',
      'wonderful-blunderful',
      'creative-native',
      'amazing-blazing',
      'incredible-edible',
      'spectacular-tacular'
    ]);

    this.sillyWordplay.set('11+', [
      'extraordinarily-ordinarily',
      'magnificently-significantly',
      'intellectually-effectually',
      'creatively-natively',
      'innovatively-ovatively',
      'imaginatively-natively',
      'inspirationally-nationally',
      'phenomenally-nominally'
    ]);
  }

  private initializeGiggleTriggers(): void {
    this.giggleTriggers.set('physical', [
      'boop!', 'squish!', 'bounce!', 'wiggle!', 'tickle!',
      'poke!', 'squeeze!', 'pat!', 'tap!', 'nudge!'
    ]);

    this.giggleTriggers.set('sounds', [
      'pop!', 'whoosh!', 'zing!', 'boing!', 'splat!',
      'zoom!', 'whizz!', 'kapow!', 'tadah!', 'sproing!'
    ]);

    this.giggleTriggers.set('silly_words', [
      'banana', 'pickle', 'noodle', 'bubble', 'giggle',
      'wiggle', 'tickle', 'squirrel', 'penguin', 'monkey'
    ]);

    this.giggleTriggers.set('absurd_combinations', [
      'dancing pickles', 'singing socks', 'flying pancakes',
      'giggling trees', 'bouncing clouds', 'tickling rainbows'
    ]);
  }

  private initializeHumorTiming(): void {
    // How appropriate humor is for different emotional states (0-1 scale)
    this.humorTiming.set('happy', 1.0);
    this.humorTiming.set('excited', 1.0);
    this.humorTiming.set('curious', 0.9);
    this.humorTiming.set('confident', 0.8);
    this.humorTiming.set('calm', 0.7);
    this.humorTiming.set('neutral', 0.6);
    this.humorTiming.set('shy', 0.4);
    this.humorTiming.set('tired', 0.3);
    this.humorTiming.set('frustrated', 0.2);
    this.humorTiming.set('sad', 0.1);
    this.humorTiming.set('anxious', 0.1);
    this.humorTiming.set('overwhelmed', 0.1);
  }

  private createHumorousContent(
    topic: string,
    intensity: number,
    context: PersonalityContext
  ): string {
    const ageHumor = this.ageAppropriateHumor.get(context.ageGroup) || [];
    
    if (ageHumor.length === 0) {
      return "That's so silly and fun!";
    }

    // Select humor type based on intensity
    const humorIndex = Math.floor(intensity * ageHumor.length);
    const selectedHumorType = ageHumor[Math.min(humorIndex, ageHumor.length - 1)];

    return this.generateSpecificHumor(selectedHumorType, topic, context);
  }

  private calculateGigglePotential(content: string, context: PersonalityContext): number {
    let potential = 0.5; // Base potential

    // Count giggle triggers
    const allTriggers = Array.from(this.giggleTriggers.values()).flat();
    const triggerCount = allTriggers.filter(trigger =>
      content.toLowerCase().includes(trigger.toLowerCase())
    ).length;

    potential += triggerCount * 0.1;

    // Exclamation points increase giggle potential
    const exclamationCount = (content.match(/!/g) || []).length;
    potential += exclamationCount * 0.05;

    // Age-specific adjustments
    if (context.ageGroup === '3-5') {
      potential += 0.2; // Younger children giggle more easily
    } else if (context.ageGroup === '11+') {
      potential -= 0.1; // Older children have more sophisticated humor
    }

    return Math.min(1.0, potential);
  }

  private identifyHumorElements(content: string): string[] {
    const elements: string[] = [];

    // Check for different types of humor elements
    if (/\b\w+-\w+\b/.test(content)) elements.push('hyphenated silliness');
    if (content.includes('!')) elements.push('exclamatory emphasis');
    if (/\b(silly|funny|giggly|wiggly)\b/.test(content)) elements.push('silly descriptors');
    if (/\b(boop|pop|zoom|whoosh)\b/.test(content)) elements.push('sound effects');

    return elements;
  }

  private assessAgeAppropriateness(content: string, context: PersonalityContext): number {
    const ageHumor = this.ageAppropriateHumor.get(context.ageGroup) || [];
    
    // Check how well the content matches age-appropriate humor
    let appropriateness = 0.5;

    ageHumor.forEach(humorType => {
      if (this.contentMatchesHumorType(content, humorType)) {
        appropriateness += 0.1;
      }
    });

    return Math.min(1.0, appropriateness);
  }

  private generateWordplay(
    baseWords: string[],
    playfulness: number,
    context: PersonalityContext
  ): string {
    const wordplayOptions = this.sillyWordplay.get(context.ageGroup) || [];
    
    if (baseWords.length === 0 || wordplayOptions.length === 0) {
      return "That's wonderfully wibbly-wobbly!";
    }

    const baseWord = baseWords[0];
    
    if (playfulness > 0.8) {
      // High playfulness: create complex wordplay
      const sillyVersion = this.createComplexWordplay(baseWord, context.ageGroup);
      return `That's ${sillyVersion}!`;
    } else if (playfulness > 0.5) {
      // Medium playfulness: add silly suffix
      const sillyVersion = this.addSillySuffix(baseWord, context.ageGroup);
      return `How ${sillyVersion}!`;
    } else {
      // Low playfulness: simple rhyme
      const rhyme = this.createSimpleRhyme(baseWord);
      return `${baseWord} and ${rhyme}!`;
    }
  }

  private identifyPlayfulElements(wordplay: string): string[] {
    const elements: string[] = [];

    if (wordplay.includes('-')) elements.push('hyphenated combinations');
    if (/\b\w+ly\b/.test(wordplay)) elements.push('silly adverbs');
    if (/\b\w+ful\b/.test(wordplay)) elements.push('playful adjectives');
    if (wordplay.includes('!')) elements.push('enthusiastic punctuation');

    return elements;
  }

  private calculateSillinessScore(wordplay: string, context: PersonalityContext): number {
    let silliness = 0.3; // Base silliness

    // Count silly elements
    const sillyWords = ['wibbly', 'wobbly', 'jiggly', 'giggly', 'bubbly', 'tickly'];
    const sillyCount = sillyWords.filter(word =>
      wordplay.toLowerCase().includes(word)
    ).length;

    silliness += sillyCount * 0.2;

    // Hyphenated words increase silliness
    const hyphenCount = (wordplay.match(/-/g) || []).length;
    silliness += hyphenCount * 0.1;

    return Math.min(1.0, silliness);
  }

  private assessLinguisticCreativity(wordplay: string): number {
    let creativity = 0.4; // Base creativity

    // Novel word combinations increase creativity
    if (/\b\w+-\w+\b/.test(wordplay)) creativity += 0.2;
    
    // Alliteration increases creativity
    if (this.hasAlliteration(wordplay)) creativity += 0.2;
    
    // Rhyming increases creativity
    if (this.hasRhyming(wordplay)) creativity += 0.2;

    return Math.min(1.0, creativity);
  }

  private assessHumorTiming(context: PersonalityContext, humor: string): number {
    const emotionTiming = this.humorTiming.get(context.currentEmotionalState) || 0.5;
    
    // Adjust based on conversation phase
    let phaseAdjustment = 0;
    if (context.conversationPhase === 'greeting') {
      phaseAdjustment = 0.2; // Good time for humor
    } else if (context.conversationPhase === 'farewell') {
      phaseAdjustment = 0.1; // Moderate time for humor
    }

    return Math.min(1.0, emotionTiming + phaseAdjustment);
  }

  private adjustHumorForTiming(
    humor: string,
    timingScore: number,
    context: PersonalityContext,
    sensitivity: number
  ): string {
    if (timingScore < 0.3) {
      // Poor timing - tone down the humor significantly
      return this.toneDownHumor(humor, context);
    } else if (timingScore < 0.6) {
      // Moderate timing - gentle humor
      return this.makeHumorGentle(humor, context);
    } else {
      // Good timing - keep or enhance humor
      return humor;
    }
  }

  private identifyTimingAdjustments(
    original: string,
    adjusted: string,
    context: PersonalityContext
  ): string[] {
    const adjustments: string[] = [];

    if (adjusted.length < original.length) {
      adjustments.push('reduced humor intensity');
    }

    if (adjusted !== original) {
      if (['sad', 'anxious', 'overwhelmed'].includes(context.currentEmotionalState)) {
        adjustments.push('emotional sensitivity adjustment');
      }
    }

    return adjustments;
  }

  private calculateEmotionalConsideration(humor: string, context: PersonalityContext): number {
    let consideration = 0.5; // Base consideration

    // Higher consideration for vulnerable emotions
    const vulnerableEmotions = ['sad', 'anxious', 'shy', 'overwhelmed'];
    if (vulnerableEmotions.includes(context.currentEmotionalState)) {
      consideration += 0.3;
    }

    // Check if humor is gentle enough for the emotional state
    const humorIntensity = this.calculateHumorIntensity(humor);
    const emotionTiming = this.humorTiming.get(context.currentEmotionalState) || 0.5;

    if (humorIntensity <= emotionTiming) {
      consideration += 0.2; // Appropriate intensity
    }

    return Math.min(1.0, consideration);
  }

  private generateInteractiveHumorContent(
    context: PersonalityContext,
    childResponse?: string,
    interactionLevel: number = 0.7
  ): string {
    if (childResponse) {
      return this.buildOnChildResponse(childResponse, context, interactionLevel);
    } else {
      return this.createParticipationInvite(context, interactionLevel);
    }
  }

  private identifyParticipationInvites(content: string): string[] {
    const invites: string[] = [];

    if (content.includes('can you')) invites.push('direct invitation');
    if (content.includes('what if')) invites.push('imagination prompt');
    if (content.includes('let\'s')) invites.push('collaborative invitation');
    if (content.includes('?')) invites.push('question engagement');

    return invites;
  }

  private calculateEngagementLevel(content: string, context: PersonalityContext): number {
    let engagement = 0.4; // Base engagement

    // Questions increase engagement
    const questionCount = (content.match(/\?/g) || []).length;
    engagement += questionCount * 0.2;

    // Interactive words increase engagement
    const interactiveWords = ['you', 'we', 'let\'s', 'can', 'what', 'how'];
    const interactiveCount = interactiveWords.filter(word =>
      content.toLowerCase().includes(word)
    ).length;

    engagement += interactiveCount * 0.1;

    return Math.min(1.0, engagement);
  }

  private identifyResponseBuilding(content: string, childResponse?: string): string[] {
    const building: string[] = [];

    if (childResponse) {
      // Check if content builds on child's response
      const childWords = childResponse.toLowerCase().split(' ');
      const contentWords = content.toLowerCase().split(' ');
      
      const sharedWords = childWords.filter(word => 
        contentWords.includes(word) && word.length > 3
      );

      if (sharedWords.length > 0) {
        building.push('vocabulary building');
      }

      if (content.includes('yes') || content.includes('and')) {
        building.push('affirmative building');
      }
    }

    return building;
  }

  private integrateHumorWithStory(
    humor: string,
    storyContext: any,
    focusLevel: number
  ): string {
    if (!storyContext) return humor;

    // Integrate humor with story elements
    let integratedHumor = humor;

    if (storyContext.characterName) {
      integratedHumor = integratedHumor.replace(
        /character/gi,
        storyContext.characterName
      );
    }

    if (focusLevel > 0.7) {
      // High focus - make humor very story-relevant
      integratedHumor = this.makeHumorStoryRelevant(integratedHumor, storyContext);
    }

    return integratedHumor;
  }

  private calculateStoryRelevance(humor: string, storyContext: any): number {
    if (!storyContext) return 0.3;

    let relevance = 0.3; // Base relevance

    if (storyContext.characterName && humor.includes(storyContext.characterName)) {
      relevance += 0.3;
    }

    if (storyContext.storyType && humor.toLowerCase().includes(storyContext.storyType.toLowerCase())) {
      relevance += 0.2;
    }

    if (storyContext.currentScene && humor.toLowerCase().includes(storyContext.currentScene.toLowerCase())) {
      relevance += 0.2;
    }

    return Math.min(1.0, relevance);
  }

  private assessFocusPreservation(humor: string, storyContext: any): number {
    // Assess how well humor preserves story focus
    let preservation = 0.6; // Base preservation

    // Shorter humor preserves focus better
    if (humor.length < 50) {
      preservation += 0.2;
    }

    // Story-relevant humor preserves focus
    const relevance = this.calculateStoryRelevance(humor, storyContext);
    preservation += relevance * 0.2;

    return Math.min(1.0, preservation);
  }

  private evaluateIntegrationQuality(balancedHumor: string, originalHumor: string): number {
    let quality = 0.5; // Base quality

    // If humor was enhanced with story elements
    if (balancedHumor.length > originalHumor.length) {
      quality += 0.2;
    }

    // If humor maintains its core elements
    const originalElements = this.identifyHumorElements(originalHumor);
    const balancedElements = this.identifyHumorElements(balancedHumor);
    
    const preservedElements = originalElements.filter(element =>
      balancedElements.includes(element)
    );

    quality += (preservedElements.length / Math.max(originalElements.length, 1)) * 0.3;

    return Math.min(1.0, quality);
  }

  private personalizeHumor(
    baseHumor: string,
    context: PersonalityContext,
    preferences: any,
    history: any[]
  ): string {
    let personalizedHumor = baseHumor;

    // Adapt to preferred humor style
    if (preferences.preferredHumorStyle === 'wordplay') {
      personalizedHumor = this.enhanceWordplay(personalizedHumor, context.ageGroup);
    } else if (preferences.preferredHumorStyle === 'silly') {
      personalizedHumor = this.enhanceSilliness(personalizedHumor);
    } else if (preferences.preferredHumorStyle === 'gentle') {
      personalizedHumor = this.makeHumorGentle(personalizedHumor, context);
    }

    // Learn from successful humor in history
    if (history.length > 0) {
      const successfulHumor = history.filter(h => h.giggleResponse === true);
      if (successfulHumor.length > 0) {
        personalizedHumor = this.incorporateSuccessfulElements(
          personalizedHumor,
          successfulHumor
        );
      }
    }

    return personalizedHumor;
  }

  private identifyPersonalizationElements(original: string, adapted: string): string[] {
    const elements: string[] = [];

    if (adapted.includes('wordplay') || adapted.includes('-')) {
      elements.push('enhanced wordplay');
    }

    if (adapted.length > original.length) {
      elements.push('expanded content');
    }

    if (adapted !== original) {
      elements.push('style adaptation');
    }

    return elements;
  }

  private calculatePreferenceAlignment(humor: string, preferences: any): number {
    let alignment = 0.5; // Base alignment

    if (preferences.preferredHumorStyle) {
      if (preferences.preferredHumorStyle === 'wordplay' && humor.includes('-')) {
        alignment += 0.3;
      } else if (preferences.preferredHumorStyle === 'silly' && /silly|giggly|wiggly/.test(humor)) {
        alignment += 0.3;
      } else if (preferences.preferredHumorStyle === 'gentle' && !humor.includes('!')) {
        alignment += 0.3;
      }
    }

    return Math.min(1.0, alignment);
  }

  private trackHumorEvolution(humor: string, history: any[]): string[] {
    const evolution: string[] = [];

    if (history.length > 0) {
      const recentHumor = history.slice(-3);
      
      // Check for increasing complexity
      const avgLength = recentHumor.reduce((sum, h) => sum + h.content.length, 0) / recentHumor.length;
      if (humor.length > avgLength) {
        evolution.push('increased complexity');
      }

      // Check for new humor elements
      const historicalElements = recentHumor.flatMap(h => h.humorElements || []);
      const currentElements = this.identifyHumorElements(humor);
      const newElements = currentElements.filter(e => !historicalElements.includes(e));
      
      if (newElements.length > 0) {
        evolution.push('new humor elements');
      }
    }

    return evolution;
  }

  // Helper methods
  private generateSpecificHumor(humorType: string, topic: string, context: PersonalityContext): string {
    const humorGenerators = {
      'silly animal sounds': () => `${topic} goes "moo-oink-quack" in the silliest way!`,
      'simple rhyming games': () => `${topic} and ${this.createSimpleRhyme(topic)}!`,
      'funny face descriptions': () => `${topic} has the wiggliest, giggliest expression!`,
      'clever wordplay': () => `That's ${topic}-tastic and ${topic}-ular!`,
      'playful exaggerations': () => `${topic} is more amazing than a dancing elephant!`,
      'witty observations': () => `${topic} is like a puzzle that solves itself!`,
      'sophisticated wordplay': () => `${topic} is extraordinarily ${topic}-esque!`
    };

    const generator = humorGenerators[humorType];
    return generator ? generator() : `${topic} is wonderfully silly!`;
  }

  private contentMatchesHumorType(content: string, humorType: string): boolean {
    const typeKeywords = {
      'silly animal sounds': ['moo', 'oink', 'quack', 'woof', 'meow'],
      'simple rhyming': ['rhyme', 'time', 'fun', 'sun'],
      'wordplay': ['-', 'tastic', 'ular', 'ful'],
      'exaggerations': ['more than', 'bigger than', 'sillier than']
    };

    const keywords = typeKeywords[humorType] || [];
    return keywords.some(keyword => content.toLowerCase().includes(keyword));
  }

  private createComplexWordplay(word: string, ageGroup: AgeGroup): string {
    if (ageGroup === '3-5') {
      return `${word}y-${word}`;
    } else if (ageGroup === '6-8') {
      return `${word}-a-rific`;
    } else if (ageGroup === '9-10') {
      return `${word}-tastic-elastic`;
    } else {
      return `extraordinarily-${word}-inary`;
    }
  }

  private addSillySuffix(word: string, ageGroup: AgeGroup): string {
    const suffixes = {
      '3-5': ['y', 'ly', 'ish'],
      '6-8': ['tastic', 'rific', 'ular'],
      '9-10': ['tacular', 'icious', 'astic'],
      '11+': ['esque', 'atory', 'ific']
    };

    const ageSuffixes = suffixes[ageGroup] || suffixes['6-8'];
    const randomSuffix = ageSuffixes[Math.floor(Math.random() * ageSuffixes.length)];
    
    return `${word}${randomSuffix}`;
  }

  private createSimpleRhyme(word: string): string {
    const rhymes = {
      'cat': 'hat', 'dog': 'frog', 'fun': 'sun', 'play': 'day',
      'story': 'glory', 'magic': 'tragic', 'happy': 'snappy'
    };

    return rhymes[word.toLowerCase()] || `${word.slice(0, -1)}y`;
  }

  private hasAlliteration(text: string): boolean {
    const words = text.toLowerCase().split(' ');
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i][0] === words[i + 1][0]) {
        return true;
      }
    }
    return false;
  }

  private hasRhyming(text: string): boolean {
    // Simple rhyme detection - could be enhanced
    return /-\w+/.test(text) || /\b\w+y\b.*\b\w+y\b/.test(text);
  }

  private toneDownHumor(humor: string, context: PersonalityContext): string {
    return humor
      .replace(/!/g, '.')
      .replace(/WOW|AMAZING/gi, 'nice')
      .replace(/super|incredibly|amazingly/gi, 'really');
  }

  private makeHumorGentle(humor: string, context: PersonalityContext): string {
    return humor
      .replace(/!/g, '.')
      .replace(/silly/gi, 'sweet')
      .replace(/crazy/gi, 'fun');
  }

  private calculateHumorIntensity(humor: string): number {
    let intensity = 0.3; // Base intensity

    const exclamationCount = (humor.match(/!/g) || []).length;
    intensity += exclamationCount * 0.1;

    const intensifiers = ['super', 'incredibly', 'amazingly', 'fantastically'];
    const intensifierCount = intensifiers.filter(word =>
      humor.toLowerCase().includes(word)
    ).length;

    intensity += intensifierCount * 0.2;

    return Math.min(1.0, intensity);
  }

  private buildOnChildResponse(
    childResponse: string,
    context: PersonalityContext,
    interactionLevel: number
  ): string {
    const responseWords = childResponse.toLowerCase().split(' ');
    const interestingWord = responseWords.find(word => word.length > 4) || responseWords[0];

    if (interactionLevel > 0.7) {
      return `Oh, ${interestingWord}! That's so ${interestingWord}-tastic! What if we made it even more ${interestingWord}-ular?`;
    } else {
      return `${interestingWord} is wonderful! I love how you think about ${interestingWord}!`;
    }
  }

  private createParticipationInvite(context: PersonalityContext, interactionLevel: number): string {
    if (interactionLevel > 0.7) {
      return "Can you help me make the silliest sound ever? Let's try it together!";
    } else {
      return "What do you think would be the funniest thing ever?";
    }
  }

  private makeHumorStoryRelevant(humor: string, storyContext: any): string {
    if (storyContext.storyType === 'adventure') {
      return humor.replace(/silly/gi, 'adventurous');
    } else if (storyContext.storyType === 'bedtime') {
      return humor.replace(/exciting/gi, 'cozy');
    }
    return humor;
  }

  private enhanceWordplay(humor: string, ageGroup: AgeGroup): string {
    const words = humor.split(' ');
    const enhancedWords = words.map(word => {
      if (word.length > 4 && Math.random() > 0.7) {
        return this.addSillySuffix(word, ageGroup);
      }
      return word;
    });
    return enhancedWords.join(' ');
  }

  private enhanceSilliness(humor: string): string {
    return humor
      .replace(/good/gi, 'giggly-good')
      .replace(/fun/gi, 'wibbly-wobbly fun')
      .replace(/nice/gi, 'tickly-nice');
  }

  private incorporateSuccessfulElements(humor: string, successfulHumor: any[]): string {
    // Find common elements in successful humor
    const successfulElements = successfulHumor.flatMap(h => h.humorElements || []);
    const mostSuccessful = successfulElements.reduce((acc, element) => {
      acc[element] = (acc[element] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topElement = Object.entries(mostSuccessful)
      .sort(([,a], [,b]) => b - a)[0];

    if (topElement && topElement[0] === 'sound effects' && !humor.includes('!')) {
      return `${humor} Boop!`;
    }

    return humor;
  }
}