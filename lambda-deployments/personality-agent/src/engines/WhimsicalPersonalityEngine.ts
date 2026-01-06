import {
  AgeGroup,
  WhimsicalElements,
  PersonalityContext,
  PersonalityTraits,
  WhimsyBalance
} from '../types';

/**
 * Whimsical personality engine that generates playful, nonsensical language that makes children giggle
 * Implements Requirement 19.2: Whimsical, slightly nonsensical language that makes children giggle
 */
export class WhimsicalPersonalityEngine {
  private whimsicalElements: WhimsicalElements;
  private whimsyBalance: WhimsyBalance;
  private giggleInducers: Map<AgeGroup, string[]> = new Map();
  private playfulPhrases: Map<string, string[]> = new Map();

  constructor() {
    this.initializeWhimsicalElements();
    this.initializeWhimsyBalance();
    this.initializeGiggleInducers();
    this.initializePlayfulPhrases();
  }

  /**
   * Generates whimsical language elements appropriate for the child's age
   * Creates silly words and phrases that induce giggles while maintaining story focus
   */
  generateWhimsicalLanguage(
    context: PersonalityContext,
    baseMessage: string,
    intensity: number = 0.5
  ): {
    whimsicalMessage: string;
    whimsicalElements: string[];
    giggleFactors: string[];
  } {
    const ageAppropriateElements = this.selectAgeAppropriateElements(context.ageGroup);
    const balancedIntensity = this.balanceWhimsyIntensity(intensity, context);
    
    const whimsicalElements = this.injectWhimsicalElements(
      baseMessage,
      ageAppropriateElements,
      balancedIntensity
    );

    const giggleFactors = this.addGiggleInducers(
      whimsicalElements.message,
      context.ageGroup,
      balancedIntensity
    );

    return {
      whimsicalMessage: giggleFactors.message,
      whimsicalElements: whimsicalElements.elements,
      giggleFactors: giggleFactors.factors
    };
  }

  /**
   * Creates playful wordplay and nonsensical elements
   * Balances silliness with maintaining story coherence
   */
  createPlayfulWordplay(
    targetWords: string[],
    ageGroup: AgeGroup,
    context: string
  ): {
    wordplay: string[];
    nonsensicalElements: string[];
    sillySubstitutions: Map<string, string>;
  } {
    const wordplay = this.generateWordplay(targetWords, ageGroup);
    const nonsensicalElements = this.createNonsensicalElements(context, ageGroup);
    const sillySubstitutions = this.createSillySubstitutions(targetWords, ageGroup);

    return {
      wordplay,
      nonsensicalElements,
      sillySubstitutions
    };
  }

  /**
   * Generates age-appropriate humor that makes children giggle
   * Adapts humor style based on developmental stage
   */
  generateAgeAppropriateHumor(
    ageGroup: AgeGroup,
    context: PersonalityContext,
    topic?: string
  ): {
    humorElements: string[];
    deliveryStyle: string;
    gigglePotential: number;
  } {
    const humorElements = this.selectHumorForAge(ageGroup, topic);
    const deliveryStyle = this.determineDeliveryStyle(ageGroup, context);
    const gigglePotential = this.calculateGigglePotential(humorElements, ageGroup);

    return {
      humorElements,
      deliveryStyle,
      gigglePotential
    };
  }

  /**
   * Balances whimsy with emotional context
   * Reduces silliness when child needs comfort, increases when they're happy
   */
  balanceWhimsyWithEmotion(
    baseWhimsy: number,
    emotionalState: string,
    context: PersonalityContext
  ): number {
    const emotionalModifiers = this.whimsyBalance.emotionalModifiers;
    const modifier = emotionalModifiers[emotionalState] || 0;
    
    const ageModifier = this.whimsyBalance.ageModifiers[context.ageGroup] || 0;
    const contextModifier = this.getContextModifier(context.conversationPhase);
    
    const adjustedWhimsy = baseWhimsy + modifier + ageModifier + contextModifier;
    
    return Math.max(
      this.whimsyBalance.minIntensity,
      Math.min(this.whimsyBalance.maxIntensity, adjustedWhimsy)
    );
  }

  /**
   * Creates silly sound effects and onomatopoeia
   * Adds playful audio elements that children love
   */
  generateSillySounds(
    context: string,
    ageGroup: AgeGroup,
    intensity: number
  ): {
    sounds: string[];
    placement: string[];
    timing: string[];
  } {
    const sounds = this.selectSillySounds(context, ageGroup);
    const placement = this.determineSoundPlacement(sounds, intensity);
    const timing = this.calculateSoundTiming(sounds, ageGroup);

    return { sounds, placement, timing };
  }

  /**
   * Maintains story focus while adding whimsical elements
   * Ensures silliness enhances rather than distracts from storytelling
   */
  maintainStoryFocus(
    whimsicalMessage: string,
    storyContext: any,
    whimsyLevel: number
  ): {
    focusedMessage: string;
    storyRelevance: number;
    whimsyIntegration: string[];
  } {
    const focusedMessage = this.integrateWithStoryContext(whimsicalMessage, storyContext);
    const storyRelevance = this.calculateStoryRelevance(focusedMessage, storyContext);
    const whimsyIntegration = this.identifyWhimsyIntegration(focusedMessage);

    return {
      focusedMessage,
      storyRelevance,
      whimsyIntegration
    };
  }

  private initializeWhimsicalElements(): void {
    this.whimsicalElements = {
      sillyWords: [
        'giggly', 'wibbly', 'wobbly', 'jiggly', 'bubbly', 'squiggly',
        'tickly', 'wiggly', 'giggly-wiggly', 'bobbly', 'hobbly',
        'snuggly', 'cuddly', 'puddly', 'muddly', 'fuddly'
      ],
      playfulPhrases: [
        'oh my giggly goodness!',
        'well butter my biscuits!',
        'holy moly guacamole!',
        'sweet sizzling salamanders!',
        'jumping jellybeans!',
        'bouncing blueberries!',
        'dancing daisies!',
        'wiggling watermelons!'
      ],
      nonsensicalElements: [
        'flibber-floo',
        'wibbly-wobbly',
        'jiggly-wiggly',
        'snickle-snackle',
        'tickle-tackle',
        'giggle-gaggle',
        'bubble-babble',
        'wiggle-waggle'
      ],
      giggleInducers: [
        'boop!',
        'squish!',
        'pop!',
        'bounce!',
        'wiggle!',
        'giggle!',
        'tickle!',
        'snuggle!'
      ],
      ageAppropriateHumor: {
        '3-5': [
          'peek-a-boo surprises',
          'silly animal sounds',
          'rhyming nonsense',
          'simple wordplay',
          'funny faces descriptions'
        ],
        '6-8': [
          'clever wordplay',
          'silly scenarios',
          'playful exaggeration',
          'funny character quirks',
          'imaginative comparisons'
        ],
        '9-10': [
          'witty observations',
          'creative absurdity',
          'clever word combinations',
          'humorous situations',
          'playful logic twists'
        ],
        '11+': [
          'sophisticated wordplay',
          'ironic humor',
          'clever references',
          'witty dialogue',
          'creative metaphors'
        ]
      }
    };
  }

  private initializeWhimsyBalance(): void {
    this.whimsyBalance = {
      baseLevel: 0.6,
      emotionalModifiers: {
        happy: 0.2,
        excited: 0.3,
        curious: 0.1,
        calm: 0.0,
        sad: -0.3,
        anxious: -0.2,
        shy: -0.1,
        frustrated: -0.2,
        confident: 0.1,
        tired: -0.2,
        overwhelmed: -0.3,
        neutral: 0.0
      },
      contextModifiers: {
        greeting: 0.2,
        character_creation: 0.1,
        story_building: 0.0,
        editing: -0.1,
        farewell: 0.1
      },
      ageModifiers: {
        '3-5': 0.3,
        '6-8': 0.2,
        '9-10': 0.1,
        '11+': 0.0
      },
      maxIntensity: 1.0,
      minIntensity: 0.1
    };
  }

  private initializeGiggleInducers(): void {
    this.giggleInducers.set('3-5', [
      'boop your nose!',
      'wiggle your toes!',
      'tickle your funny bone!',
      'make silly faces!',
      'do a happy dance!',
      'give a big squeeze!',
      'bounce like a bunny!',
      'giggle like a goose!'
    ]);

    this.giggleInducers.set('6-8', [
      'that\'s more fun than a barrel of monkeys!',
      'you\'re as clever as a fox wearing glasses!',
      'that idea is shinier than a unicorn\'s horn!',
      'you\'re bubbling with creativity!',
      'that\'s as exciting as finding treasure!',
      'you\'re sparkling with imagination!',
      'that\'s cooler than a penguin\'s pajamas!',
      'you\'re as bright as a shooting star!'
    ]);

    this.giggleInducers.set('9-10', [
      'that\'s more brilliant than a disco ball!',
      'you\'re cooking with creative gas!',
      'that idea just did a backflip!',
      'you\'re thinking outside the pizza box!',
      'that\'s as awesome as a dragon riding a skateboard!',
      'your imagination is doing cartwheels!',
      'that\'s cooler than a polar bear\'s ice cream!',
      'you\'re as sharp as a tack wearing a graduation cap!'
    ]);

    this.giggleInducers.set('11+', [
      'that\'s more ingenious than a robot butler!',
      'you\'re operating on a whole different wavelength!',
      'that idea just earned a PhD in awesomeness!',
      'you\'re thinking in technicolor!',
      'that\'s as sophisticated as a penguin in a tuxedo!',
      'your creativity is off the charts!',
      'that\'s smoother than a jazz-playing dolphin!',
      'you\'re as wise as an owl with a library card!'
    ]);
  }

  private initializePlayfulPhrases(): void {
    this.playfulPhrases.set('encouragement', [
      'You\'re doing fantastically!',
      'That\'s absolutely wonderful!',
      'You\'re a creative genius!',
      'I\'m so proud of your imagination!',
      'You\'re making magic happen!',
      'That\'s incredibly clever!',
      'You\'re a storytelling superstar!',
      'Your ideas are sparkling!'
    ]);

    this.playfulPhrases.set('transition', [
      'Now, let\'s sprinkle some more magic!',
      'Ready for the next adventure?',
      'Let\'s add another layer of awesome!',
      'Time for more creative fun!',
      'Shall we continue our magical journey?',
      'Let\'s keep the creativity flowing!',
      'Ready for more storytelling magic?',
      'Let\'s dive deeper into the fun!'
    ]);

    this.playfulPhrases.set('celebration', [
      'Hip hip hooray!',
      'That\'s cause for celebration!',
      'Time for a happy dance!',
      'You deserve a round of applause!',
      'That calls for confetti!',
      'Cue the celebration music!',
      'That\'s worth a victory lap!',
      'Time to ring the success bells!'
    ]);
  }

  private selectAgeAppropriateElements(ageGroup: AgeGroup): WhimsicalElements {
    const baseElements = this.whimsicalElements;
    
    // Filter elements based on age appropriateness
    return {
      sillyWords: this.filterWordsForAge(baseElements.sillyWords, ageGroup),
      playfulPhrases: this.filterPhrasesForAge(baseElements.playfulPhrases, ageGroup),
      nonsensicalElements: this.filterNonsenseForAge(baseElements.nonsensicalElements, ageGroup),
      giggleInducers: this.giggleInducers.get(ageGroup) || baseElements.giggleInducers,
      ageAppropriateHumor: baseElements.ageAppropriateHumor
    };
  }

  private balanceWhimsyIntensity(intensity: number, context: PersonalityContext): number {
    return this.balanceWhimsyWithEmotion(
      intensity,
      context.currentEmotionalState,
      context
    );
  }

  private injectWhimsicalElements(
    message: string,
    elements: WhimsicalElements,
    intensity: number
  ): { message: string; elements: string[] } {
    let whimsicalMessage = message;
    const usedElements: string[] = [];

    // Add silly words based on intensity
    if (intensity > 0.3) {
      const sillyWord = this.selectRandomElement(elements.sillyWords);
      whimsicalMessage = this.insertSillyWord(whimsicalMessage, sillyWord);
      usedElements.push(`silly word: ${sillyWord}`);
    }

    // Add playful phrases based on intensity
    if (intensity > 0.5) {
      const playfulPhrase = this.selectRandomElement(elements.playfulPhrases);
      whimsicalMessage = this.insertPlayfulPhrase(whimsicalMessage, playfulPhrase);
      usedElements.push(`playful phrase: ${playfulPhrase}`);
    }

    // Add nonsensical elements for high intensity
    if (intensity > 0.7) {
      const nonsense = this.selectRandomElement(elements.nonsensicalElements);
      whimsicalMessage = this.insertNonsensicalElement(whimsicalMessage, nonsense);
      usedElements.push(`nonsensical: ${nonsense}`);
    }

    return { message: whimsicalMessage, elements: usedElements };
  }

  private addGiggleInducers(
    message: string,
    ageGroup: AgeGroup,
    intensity: number
  ): { message: string; factors: string[] } {
    const giggleInducers = this.giggleInducers.get(ageGroup) || [];
    const factors: string[] = [];

    if (intensity > 0.4 && giggleInducers.length > 0) {
      const inducer = this.selectRandomElement(giggleInducers);
      const enhancedMessage = `${message} ${inducer}`;
      factors.push(inducer);
      
      return { message: enhancedMessage, factors };
    }

    return { message, factors };
  }

  private generateWordplay(words: string[], ageGroup: AgeGroup): string[] {
    const wordplay: string[] = [];

    words.forEach(word => {
      // Simple rhyming for younger children
      if (ageGroup === '3-5') {
        wordplay.push(this.createSimpleRhyme(word));
      }
      // Alliteration and more complex wordplay for older children
      else if (ageGroup === '6-8' || ageGroup === '9-10') {
        wordplay.push(this.createAlliteration(word));
        wordplay.push(this.createWordTwist(word));
      }
      // Sophisticated wordplay for oldest group
      else {
        wordplay.push(this.createCleverWordplay(word));
      }
    });

    return wordplay.filter(play => play.length > 0);
  }

  private createNonsensicalElements(context: string, ageGroup: AgeGroup): string[] {
    const nonsensical: string[] = [];
    
    // Age-appropriate nonsense generation
    if (ageGroup === '3-5') {
      nonsensical.push(...this.createSimpleNonsense());
    } else if (ageGroup === '6-8') {
      nonsensical.push(...this.createPlayfulNonsense());
    } else {
      nonsensical.push(...this.createCleverNonsense());
    }

    return nonsensical;
  }

  private createSillySubstitutions(words: string[], ageGroup: AgeGroup): Map<string, string> {
    const substitutions = new Map<string, string>();
    
    words.forEach(word => {
      const sillyVersion = this.makeSillyVersion(word, ageGroup);
      if (sillyVersion !== word) {
        substitutions.set(word, sillyVersion);
      }
    });

    return substitutions;
  }

  private selectHumorForAge(ageGroup: AgeGroup, topic?: string): string[] {
    const ageHumor = this.whimsicalElements.ageAppropriateHumor[ageGroup] || [];
    
    if (topic) {
      // Filter humor relevant to the topic
      return ageHumor.filter(humor => 
        humor.toLowerCase().includes(topic.toLowerCase()) ||
        this.isHumorRelevant(humor, topic)
      );
    }
    
    return ageHumor;
  }

  private determineDeliveryStyle(ageGroup: AgeGroup, context: PersonalityContext): string {
    const styles = {
      '3-5': 'simple and bouncy',
      '6-8': 'playful and energetic',
      '9-10': 'clever and engaging',
      '11+': 'witty and sophisticated'
    };
    
    return styles[ageGroup] || 'playful and engaging';
  }

  private calculateGigglePotential(elements: string[], ageGroup: AgeGroup): number {
    // Base potential on number and type of humor elements
    let potential = elements.length * 0.2;
    
    // Age-specific adjustments
    const ageMultipliers = {
      '3-5': 1.2, // Younger children giggle more easily
      '6-8': 1.0,
      '9-10': 0.8,
      '11+': 0.6 // Older children have more sophisticated humor
    };
    
    potential *= ageMultipliers[ageGroup] || 1.0;
    
    return Math.min(1.0, potential);
  }

  private getContextModifier(phase: string): number {
    return this.whimsyBalance.contextModifiers[phase] || 0;
  }

  private selectSillySounds(context: string, ageGroup: AgeGroup): string[] {
    const soundLibrary = {
      '3-5': ['boop!', 'pop!', 'squish!', 'bounce!', 'giggle!'],
      '6-8': ['whoosh!', 'zing!', 'kapow!', 'sproing!', 'tadah!'],
      '9-10': ['swoosh!', 'kaboom!', 'whizz!', 'zoom!', 'pow!'],
      '11+': ['whomp!', 'thwack!', 'kerchow!', 'bazinga!', 'voila!']
    };
    
    return soundLibrary[ageGroup] || soundLibrary['6-8'];
  }

  private determineSoundPlacement(sounds: string[], intensity: number): string[] {
    const placements = ['beginning', 'middle', 'end'];
    const numPlacements = Math.ceil(intensity * placements.length);
    
    return placements.slice(0, numPlacements);
  }

  private calculateSoundTiming(sounds: string[], ageGroup: AgeGroup): string[] {
    // Younger children prefer more frequent sounds
    const timingMap = {
      '3-5': ['frequent', 'immediate'],
      '6-8': ['moderate', 'well-timed'],
      '9-10': ['strategic', 'impactful'],
      '11+': ['subtle', 'perfectly-timed']
    };
    
    return timingMap[ageGroup] || timingMap['6-8'];
  }

  private integrateWithStoryContext(message: string, storyContext: any): string {
    if (!storyContext) return message;
    
    // Ensure whimsical elements relate to story elements
    let integratedMessage = message;
    
    if (storyContext.characterName) {
      integratedMessage = integratedMessage.replace(
        /\b(character|friend|buddy)\b/gi,
        storyContext.characterName
      );
    }
    
    return integratedMessage;
  }

  private calculateStoryRelevance(message: string, storyContext: any): number {
    if (!storyContext) return 0.5;
    
    let relevanceScore = 0.5;
    
    // Check for story element mentions
    if (storyContext.characterName && message.includes(storyContext.characterName)) {
      relevanceScore += 0.2;
    }
    
    if (storyContext.storyType && message.toLowerCase().includes(storyContext.storyType.toLowerCase())) {
      relevanceScore += 0.2;
    }
    
    return Math.min(1.0, relevanceScore);
  }

  private identifyWhimsyIntegration(message: string): string[] {
    const integrations: string[] = [];
    
    // Identify how whimsy was integrated
    if (message.includes('!')) integrations.push('exclamation emphasis');
    if (/\b\w+ly\b/.test(message)) integrations.push('silly adverbs');
    if (/\b\w+-\w+\b/.test(message)) integrations.push('hyphenated nonsense');
    
    return integrations;
  }

  // Helper methods for word manipulation
  private filterWordsForAge(words: string[], ageGroup: AgeGroup): string[] {
    // Simple filtering - could be enhanced with more sophisticated age-appropriateness logic
    return words;
  }

  private filterPhrasesForAge(phrases: string[], ageGroup: AgeGroup): string[] {
    return phrases;
  }

  private filterNonsenseForAge(nonsense: string[], ageGroup: AgeGroup): string[] {
    return nonsense;
  }

  private selectRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private insertSillyWord(message: string, sillyWord: string): string {
    // Insert silly word in a natural way
    const words = message.split(' ');
    const insertIndex = Math.floor(words.length / 2);
    words.splice(insertIndex, 0, sillyWord);
    return words.join(' ');
  }

  private insertPlayfulPhrase(message: string, phrase: string): string {
    return `${phrase} ${message}`;
  }

  private insertNonsensicalElement(message: string, nonsense: string): string {
    return `${message} (${nonsense})`;
  }

  private createSimpleRhyme(word: string): string {
    // Simple rhyming logic
    const rhymes = {
      'cat': 'hat',
      'dog': 'frog',
      'fun': 'sun',
      'play': 'day'
    };
    return rhymes[word.toLowerCase()] || `${word}-y`;
  }

  private createAlliteration(word: string): string {
    const firstLetter = word[0].toLowerCase();
    const alliterations = {
      'b': 'bouncy',
      'c': 'cuddly',
      'd': 'dancing',
      'f': 'funny',
      'g': 'giggly',
      'h': 'happy',
      's': 'silly',
      'w': 'wiggly'
    };
    return alliterations[firstLetter] || `${firstLetter}${firstLetter}${firstLetter}`;
  }

  private createWordTwist(word: string): string {
    // Create playful word variations
    return `${word}-a-roo`;
  }

  private createCleverWordplay(word: string): string {
    // More sophisticated wordplay for older children
    return `${word}tastic`;
  }

  private createSimpleNonsense(): string[] {
    return ['wibbly-wobbly', 'jiggly-wiggly', 'bubbly-bubbly'];
  }

  private createPlayfulNonsense(): string[] {
    return ['flibber-jibber', 'snickle-snackle', 'wiggle-waggle'];
  }

  private createCleverNonsense(): string[] {
    return ['whimsical-mystical', 'fantastic-elastic', 'magical-tragical'];
  }

  private makeSillyVersion(word: string, ageGroup: AgeGroup): string {
    if (ageGroup === '3-5') {
      return `${word}y-${word}`;
    } else if (ageGroup === '6-8') {
      return `super-${word}`;
    } else {
      return `ultra-${word}-matic`;
    }
  }

  private isHumorRelevant(humor: string, topic: string): boolean {
    // Simple relevance check - could be enhanced
    return humor.toLowerCase().includes('character') && topic.toLowerCase().includes('character');
  }
}