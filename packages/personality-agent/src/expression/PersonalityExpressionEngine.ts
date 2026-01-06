import {
  PersonalityContext,
  PersonalityTraits,
  PersonalityConsistency,
  RelationshipMetrics,
  WhimsyBalance,
  EmotionalState,
  AgeGroup
} from '../types';

/**
 * Personality expression and consistency engine
 * Implements Requirement 19.2, 19.3, 19.5: Consistent personality expression with whimsical greetings,
 * encouragement, empathic responses, and relationship building
 */
export class PersonalityExpressionEngine {
  private whimsicalGreetings: Map<AgeGroup, string[]> = new Map();
  private encouragementLibrary: Map<string, string[]> = new Map();
  private empathicResponses: Map<EmotionalState, string[]> = new Map();
  private consistencyTracker: Map<string, PersonalityConsistency> = new Map();
  private relationshipMetrics: Map<string, RelationshipMetrics> = new Map();
  private whimsyBalanceEngine: WhimsyBalance;

  constructor() {
    this.initializeWhimsicalGreetings();
    this.initializeEncouragementLibrary();
    this.initializeEmpathicResponses();
    this.initializeWhimsyBalance();
  }

  /**
   * Builds library of whimsical greetings, encouragement, and empathic responses
   * Creates age-appropriate expressions that maintain personality consistency
   */
  buildExpressionLibrary(
    ageGroup: AgeGroup,
    emotionalContext: EmotionalState,
    interactionType: 'greeting' | 'encouragement' | 'empathy' | 'celebration' | 'farewell'
  ): {
    expressions: string[];
    whimsicalElements: string[];
    empathicElements: string[];
    ageAppropriateFeatures: string[];
  } {
    const expressions = this.selectExpressions(ageGroup, emotionalContext, interactionType);
    const whimsicalElements = this.extractWhimsicalElements(expressions);
    const empathicElements = this.extractEmpathicElements(expressions);
    const ageAppropriateFeatures = this.identifyAgeAppropriateFeatures(expressions, ageGroup);

    return {
      expressions,
      whimsicalElements,
      empathicElements,
      ageAppropriateFeatures
    };
  }

  /**
   * Implements personality consistency engine maintaining warmth across all interactions
   * Ensures core personality traits remain stable while allowing contextual adaptation
   */
  maintainPersonalityConsistency(
    childId: string,
    currentPersonality: PersonalityTraits,
    context: PersonalityContext,
    interactionHistory: any[] = []
  ): {
    consistentPersonality: PersonalityTraits;
    consistencyScore: number;
    deviationAlerts: string[];
    adjustmentRecommendations: string[];
  } {
    const existingConsistency = this.consistencyTracker.get(childId);
    const consistentPersonality = this.enforceConsistencyRules(
      currentPersonality,
      existingConsistency,
      context
    );
    const consistencyScore = this.calculateConsistencyScore(
      consistentPersonality,
      existingConsistency,
      interactionHistory
    );
    const deviationAlerts = this.identifyDeviations(
      currentPersonality,
      consistentPersonality,
      existingConsistency
    );
    const adjustmentRecommendations = this.generateAdjustmentRecommendations(
      deviationAlerts,
      consistencyScore,
      context
    );

    // Update consistency tracker
    this.updateConsistencyTracker(childId, consistentPersonality, consistencyScore);

    return {
      consistentPersonality,
      consistencyScore,
      deviationAlerts,
      adjustmentRecommendations
    };
  }

  /**
   * Adds relationship building system developing ongoing connections with children
   * Tracks interaction patterns and builds deeper emotional connections over time
   */
  buildRelationship(
    childId: string,
    interaction: {
      personalityUsed: PersonalityTraits;
      childResponse: string;
      effectiveness: number;
      emotionalState: EmotionalState;
      context: PersonalityContext;
    }
  ): {
    relationshipStrength: number;
    connectionDepth: number;
    personalizedElements: string[];
    relationshipGrowth: number;
  } {
    const currentMetrics = this.relationshipMetrics.get(childId) || this.initializeRelationshipMetrics(childId);
    const updatedMetrics = this.updateRelationshipMetrics(currentMetrics, interaction);
    const relationshipStrength = this.calculateRelationshipStrength(updatedMetrics);
    const connectionDepth = this.assessConnectionDepth(updatedMetrics, interaction);
    const personalizedElements = this.generatePersonalizedElements(updatedMetrics, interaction);
    const relationshipGrowth = this.calculateRelationshipGrowth(currentMetrics, updatedMetrics);

    // Store updated metrics
    this.relationshipMetrics.set(childId, updatedMetrics);

    return {
      relationshipStrength,
      connectionDepth,
      personalizedElements,
      relationshipGrowth
    };
  }

  /**
   * Creates whimsy balance engine adapting silliness to emotional context
   * Balances playful elements with emotional appropriateness and story focus
   */
  balanceWhimsyWithContext(
    baseWhimsy: number,
    emotionalContext: EmotionalState,
    storyContext: any,
    ageGroup: AgeGroup,
    relationshipDepth: number = 0.5
  ): {
    balancedWhimsy: number;
    whimsyAdjustments: string[];
    contextualFactors: string[];
    balanceReasoning: string;
  } {
    const emotionalModifier = this.whimsyBalanceEngine.emotionalModifiers[emotionalContext] || 0;
    const ageModifier = this.whimsyBalanceEngine.ageModifiers[ageGroup] || 0;
    const storyModifier = this.calculateStoryContextModifier(storyContext);
    const relationshipModifier = this.calculateRelationshipModifier(relationshipDepth);

    const balancedWhimsy = this.calculateBalancedWhimsy(
      baseWhimsy,
      emotionalModifier,
      ageModifier,
      storyModifier,
      relationshipModifier
    );

    const whimsyAdjustments = this.identifyWhimsyAdjustments(
      baseWhimsy,
      balancedWhimsy,
      emotionalContext
    );

    const contextualFactors = this.identifyContextualFactors(
      emotionalContext,
      storyContext,
      ageGroup,
      relationshipDepth
    );

    const balanceReasoning = this.generateBalanceReasoning(
      whimsyAdjustments,
      contextualFactors,
      emotionalContext
    );

    return {
      balancedWhimsy,
      whimsyAdjustments,
      contextualFactors,
      balanceReasoning
    };
  }

  /**
   * Builds personality-story integration adding playful elements while maintaining quality
   * Ensures personality expression enhances rather than detracts from storytelling
   */
  integratePersonalityWithStory(
    personalityExpression: string,
    storyContext: {
      characterName?: string;
      storyType?: string;
      currentScene?: string;
      storyGoal?: string;
    },
    qualityThreshold: number = 0.8
  ): {
    integratedExpression: string;
    storyRelevance: number;
    qualityPreservation: number;
    playfulIntegration: string[];
  } {
    const integratedExpression = this.weavePersonalityIntoStory(
      personalityExpression,
      storyContext
    );

    const storyRelevance = this.calculateStoryRelevance(
      integratedExpression,
      storyContext
    );

    const qualityPreservation = this.assessQualityPreservation(
      personalityExpression,
      integratedExpression,
      storyContext
    );

    const playfulIntegration = this.identifyPlayfulIntegration(
      integratedExpression,
      storyContext
    );

    // Ensure quality threshold is met
    if (qualityPreservation < qualityThreshold) {
      return this.adjustForQuality(
        personalityExpression,
        storyContext,
        qualityThreshold
      );
    }

    return {
      integratedExpression,
      storyRelevance,
      qualityPreservation,
      playfulIntegration
    };
  }

  /**
   * Generates personalized expressions based on relationship history
   * Creates unique, tailored responses that reflect growing connection with child
   */
  generatePersonalizedExpression(
    childId: string,
    baseExpression: string,
    context: PersonalityContext,
    expressionType: 'greeting' | 'encouragement' | 'empathy' | 'celebration'
  ): {
    personalizedExpression: string;
    personalizationElements: string[];
    relationshipReferences: string[];
    uniquenessScore: number;
  } {
    const relationshipMetrics = this.relationshipMetrics.get(childId);
    const consistencyData = this.consistencyTracker.get(childId);

    const personalizedExpression = this.applyPersonalization(
      baseExpression,
      relationshipMetrics,
      consistencyData,
      context,
      expressionType
    );

    const personalizationElements = this.identifyPersonalizationElements(
      baseExpression,
      personalizedExpression
    );

    const relationshipReferences = this.extractRelationshipReferences(
      personalizedExpression,
      relationshipMetrics
    );

    const uniquenessScore = this.calculateUniquenessScore(
      personalizedExpression,
      relationshipMetrics,
      context
    );

    return {
      personalizedExpression,
      personalizationElements,
      relationshipReferences,
      uniquenessScore
    };
  }

  private initializeWhimsicalGreetings(): void {
    this.whimsicalGreetings.set('3-5', [
      "Hello there, my giggly friend!",
      "Hi hi! Ready for some super fun?",
      "Yay! You're here! I'm so happy!",
      "Hello, sunshine! Let's play!",
      "Hi there, little star!",
      "Boop! Hello, wonderful you!",
      "Peek-a-boo! I see you!",
      "Hello, my bouncy buddy!"
    ]);

    this.whimsicalGreetings.set('6-8', [
      "Hey there, amazing storyteller!",
      "Hello, my creative companion!",
      "Greetings, fantastic friend!",
      "Hi there, imagination wizard!",
      "Hello, wonderful wordsmith!",
      "Hey, my brilliant buddy!",
      "Salutations, story superstar!",
      "Hello, my marvelous mate!"
    ]);

    this.whimsicalGreetings.set('9-10', [
      "Hello, my clever collaborator!",
      "Greetings, creative genius!",
      "Hey there, storytelling sage!",
      "Hello, my imaginative inventor!",
      "Hi, my thoughtful friend!",
      "Greetings, narrative navigator!",
      "Hello, my wise wordcrafter!",
      "Hey, my brilliant brainstormer!"
    ]);

    this.whimsicalGreetings.set('11+', [
      "Hello, my sophisticated storyteller!",
      "Greetings, creative intellectual!",
      "Hey there, narrative artist!",
      "Hello, my insightful collaborator!",
      "Hi, my thoughtful creator!",
      "Greetings, literary luminary!",
      "Hello, my perceptive partner!",
      "Hey, my creative confidant!"
    ]);
  }

  private initializeEncouragementLibrary(): void {
    this.encouragementLibrary.set('effort', [
      "I can see how hard you're trying, and that's absolutely wonderful!",
      "Your effort is shining through like the brightest star!",
      "The way you're working on this makes my heart happy!",
      "I'm so proud of how much care you're putting into this!",
      "Your dedication is more beautiful than a rainbow!"
    ]);

    this.encouragementLibrary.set('creativity', [
      "Your imagination is bubbling over with magic!",
      "The creativity flowing from you is absolutely amazing!",
      "You're thinking of things I never would have imagined!",
      "Your creative spirit is dancing with joy!",
      "The way your mind works is truly spectacular!"
    ]);

    this.encouragementLibrary.set('progress', [
      "Look how far you've come! I'm beaming with pride!",
      "Every step you take is a victory worth celebrating!",
      "You're growing and learning right before my eyes!",
      "The progress you're making is absolutely delightful!",
      "I can see you becoming more amazing every moment!"
    ]);

    this.encouragementLibrary.set('courage', [
      "You're braver than a lion wearing a superhero cape!",
      "The courage you're showing makes you shine like a star!",
      "I'm amazed by how brave and strong you are!",
      "Your bravery is more powerful than any magic spell!",
      "You're showing courage that would make heroes proud!"
    ]);
  }

  private initializeEmpathicResponses(): void {
    this.empathicResponses.set('happy', [
      "Your happiness is absolutely contagious! I'm smiling right along with you!",
      "I can feel your joy bubbling up like the most wonderful fizzy drink!",
      "Your happiness makes the whole world feel brighter and more magical!",
      "The joy in your voice is like sunshine on the most perfect day!"
    ]);

    this.empathicResponses.set('excited', [
      "Your excitement is bouncing around like the happiest kangaroo!",
      "I can feel your enthusiasm sparkling like magical glitter!",
      "Your excitement is more infectious than the giggles!",
      "The energy you're radiating could power a whole city of fun!"
    ]);

    this.empathicResponses.set('sad', [
      "I can hear the sadness in your voice, and I want you to know I'm here with you.",
      "It's completely okay to feel sad sometimes. Your feelings are important to me.",
      "I understand that you're feeling sad right now, and that's perfectly normal.",
      "Your sadness shows how much you care, and that's actually quite beautiful."
    ]);

    this.empathicResponses.set('anxious', [
      "I can sense you might be feeling worried, and those feelings are completely valid.",
      "It's natural to feel anxious sometimes. I'm here to support you through it.",
      "I understand you might be feeling nervous, and that's perfectly okay.",
      "Your concerns make complete sense, and I want you to feel safe sharing them."
    ]);

    this.empathicResponses.set('frustrated', [
      "I can tell you're feeling frustrated, and I completely understand why.",
      "Frustration is a normal feeling when things feel challenging.",
      "I hear the frustration in your voice, and I want to help however I can.",
      "It makes perfect sense that you'd feel frustrated right now."
    ]);

    this.empathicResponses.set('shy', [
      "I can tell you might be feeling a little shy, and that's perfectly wonderful.",
      "Being shy is like being a gentle butterfly - beautiful and special.",
      "Take all the time you need. I'm here whenever you're ready.",
      "Your shyness is actually quite endearing, and there's no pressure at all."
    ]);
  }

  private initializeWhimsyBalance(): void {
    this.whimsyBalanceEngine = {
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

  private selectExpressions(
    ageGroup: AgeGroup,
    emotionalContext: EmotionalState,
    interactionType: string
  ): string[] {
    switch (interactionType) {
      case 'greeting':
        return this.whimsicalGreetings.get(ageGroup) || [];
      case 'encouragement':
        return this.encouragementLibrary.get('effort') || [];
      case 'empathy':
        return this.empathicResponses.get(emotionalContext) || [];
      case 'celebration':
        return this.encouragementLibrary.get('progress') || [];
      case 'farewell':
        return this.generateFarewells(ageGroup);
      default:
        return [];
    }
  }

  private extractWhimsicalElements(expressions: string[]): string[] {
    const elements: string[] = [];
    
    expressions.forEach(expression => {
      if (/giggly|bouncy|sparkl|magical|wonderful/.test(expression.toLowerCase())) {
        elements.push('whimsical descriptors');
      }
      if (/boop|peek-a-boo|yay|hi hi/.test(expression.toLowerCase())) {
        elements.push('playful interjections');
      }
      if (/like.*rainbow|more.*than|brighter than/.test(expression.toLowerCase())) {
        elements.push('whimsical comparisons');
      }
    });

    return [...new Set(elements)];
  }

  private extractEmpathicElements(expressions: string[]): string[] {
    const elements: string[] = [];
    
    expressions.forEach(expression => {
      if (/I can.*hear|I can.*feel|I can.*see/.test(expression.toLowerCase())) {
        elements.push('sensory acknowledgment');
      }
      if (/understand|here with you|support/.test(expression.toLowerCase())) {
        elements.push('emotional support');
      }
      if (/okay|normal|valid/.test(expression.toLowerCase())) {
        elements.push('validation');
      }
      if (/proud|amazing|wonderful/.test(expression.toLowerCase())) {
        elements.push('affirmation');
      }
    });

    return [...new Set(elements)];
  }

  private identifyAgeAppropriateFeatures(expressions: string[], ageGroup: AgeGroup): string[] {
    const features: string[] = [];
    
    expressions.forEach(expression => {
      if (ageGroup === '3-5') {
        if (/simple|short|playful/.test(expression.toLowerCase()) || expression.split(' ').length < 8) {
          features.push('simple language');
        }
        if (/boop|peek-a-boo|yay/.test(expression.toLowerCase())) {
          features.push('playful sounds');
        }
      } else if (ageGroup === '6-8') {
        if (/creative|imagination|fantastic/.test(expression.toLowerCase())) {
          features.push('creativity focus');
        }
      } else if (ageGroup === '9-10') {
        if (/clever|thoughtful|wise/.test(expression.toLowerCase())) {
          features.push('intellectual recognition');
        }
      } else {
        if (/sophisticated|insightful|perceptive/.test(expression.toLowerCase())) {
          features.push('mature vocabulary');
        }
      }
    });

    return [...new Set(features)];
  }

  private enforceConsistencyRules(
    currentPersonality: PersonalityTraits,
    existingConsistency: PersonalityConsistency | undefined,
    context: PersonalityContext
  ): PersonalityTraits {
    if (!existingConsistency) {
      return currentPersonality;
    }

    const consistent = { ...currentPersonality };
    const { coreTraits, adaptationRange } = existingConsistency;

    // Ensure traits stay within acceptable ranges
    Object.keys(consistent).forEach(traitKey => {
      const trait = traitKey as keyof PersonalityTraits;
      const currentValue = consistent[trait];
      const coreValue = coreTraits[trait];
      const minValue = adaptationRange.min[trait];
      const maxValue = adaptationRange.max[trait];

      // Keep within adaptation range
      consistent[trait] = Math.max(minValue, Math.min(maxValue, currentValue));

      // Pull toward core values if deviation is too large
      const deviation = Math.abs(currentValue - coreValue);
      if (deviation > 0.3) {
        consistent[trait] = (currentValue + coreValue) / 2;
      }
    });

    return consistent;
  }

  private calculateConsistencyScore(
    currentPersonality: PersonalityTraits,
    existingConsistency: PersonalityConsistency | undefined,
    interactionHistory: any[]
  ): number {
    if (!existingConsistency) {
      return 0.8; // Good starting score
    }

    let consistencyScore = 0;
    const traitKeys = Object.keys(currentPersonality) as (keyof PersonalityTraits)[];
    
    traitKeys.forEach(trait => {
      const currentValue = currentPersonality[trait];
      const coreValue = existingConsistency.coreTraits[trait];
      const deviation = Math.abs(currentValue - coreValue);
      const traitConsistency = Math.max(0, 1 - deviation);
      consistencyScore += traitConsistency;
    });

    consistencyScore /= traitKeys.length;

    // Boost score for stable interaction history
    if (interactionHistory.length > 5) {
      const recentConsistency = this.calculateHistoricalConsistency(interactionHistory);
      consistencyScore = (consistencyScore + recentConsistency) / 2;
    }

    return consistencyScore;
  }

  private identifyDeviations(
    current: PersonalityTraits,
    consistent: PersonalityTraits,
    existing: PersonalityConsistency | undefined
  ): string[] {
    const deviations: string[] = [];
    
    if (!existing) return deviations;

    Object.keys(current).forEach(traitKey => {
      const trait = traitKey as keyof PersonalityTraits;
      const currentValue = current[trait];
      const consistentValue = consistent[trait];
      const coreValue = existing.coreTraits[trait];

      if (Math.abs(currentValue - consistentValue) > 0.1) {
        deviations.push(`${trait} adjusted from ${currentValue.toFixed(2)} to ${consistentValue.toFixed(2)}`);
      }

      if (Math.abs(currentValue - coreValue) > 0.3) {
        deviations.push(`${trait} deviating significantly from core value`);
      }
    });

    return deviations;
  }

  private generateAdjustmentRecommendations(
    deviations: string[],
    consistencyScore: number,
    context: PersonalityContext
  ): string[] {
    const recommendations: string[] = [];

    if (consistencyScore < 0.7) {
      recommendations.push('Consider reducing personality trait variations');
    }

    if (deviations.length > 2) {
      recommendations.push('Multiple traits are deviating - focus on core personality stability');
    }

    if (context.currentEmotionalState === 'sad' && deviations.some(d => d.includes('whimsy'))) {
      recommendations.push('Whimsy reduction for sad context is appropriate');
    }

    return recommendations;
  }

  private updateConsistencyTracker(
    childId: string,
    personality: PersonalityTraits,
    score: number
  ): void {
    const existing = this.consistencyTracker.get(childId);
    
    if (!existing) {
      // Initialize new consistency tracking
      this.consistencyTracker.set(childId, {
        coreTraits: personality,
        adaptationRange: {
          min: this.calculateMinTraits(personality),
          max: this.calculateMaxTraits(personality)
        },
        consistencyScore: score,
        deviationAlerts: []
      });
    } else {
      // Update existing tracking
      existing.consistencyScore = (existing.consistencyScore + score) / 2;
      this.consistencyTracker.set(childId, existing);
    }
  }

  private initializeRelationshipMetrics(childId: string): RelationshipMetrics {
    return {
      childId,
      interactionCount: 0,
      averageEngagement: 0.5,
      preferredPersonalityTraits: {
        warmth: 0.8,
        whimsy: 0.6,
        empathy: 0.8,
        youthfulness: 0.7,
        playfulness: 0.6,
        supportiveness: 0.8
      },
      successfulInteractionPatterns: [],
      challengingScenarios: [],
      relationshipStrength: 0.3
    };
  }

  private updateRelationshipMetrics(
    current: RelationshipMetrics,
    interaction: any
  ): RelationshipMetrics {
    const updated = { ...current };
    
    updated.interactionCount += 1;
    updated.averageEngagement = (updated.averageEngagement + interaction.effectiveness) / 2;

    // Update preferred traits based on successful interactions
    if (interaction.effectiveness > 0.7) {
      Object.keys(interaction.personalityUsed).forEach(trait => {
        const traitKey = trait as keyof PersonalityTraits;
        const currentPref = updated.preferredPersonalityTraits[traitKey];
        const usedValue = interaction.personalityUsed[traitKey];
        updated.preferredPersonalityTraits[traitKey] = (currentPref + usedValue) / 2;
      });

      updated.successfulInteractionPatterns.push({
        emotionalState: interaction.emotionalState,
        personalityUsed: interaction.personalityUsed,
        effectiveness: interaction.effectiveness
      });
    }

    // Track challenging scenarios
    if (interaction.effectiveness < 0.4) {
      updated.challengingScenarios.push({
        emotionalState: interaction.emotionalState,
        context: interaction.context.conversationPhase,
        effectiveness: interaction.effectiveness
      });
    }

    return updated;
  }

  private calculateRelationshipStrength(metrics: RelationshipMetrics): number {
    let strength = 0.3; // Base strength

    // Interaction count contributes to strength
    strength += Math.min(0.3, metrics.interactionCount * 0.02);

    // Average engagement contributes
    strength += metrics.averageEngagement * 0.3;

    // Successful patterns contribute
    strength += Math.min(0.2, metrics.successfulInteractionPatterns.length * 0.05);

    return Math.min(1.0, strength);
  }

  private assessConnectionDepth(metrics: RelationshipMetrics, interaction: any): number {
    let depth = 0.4; // Base depth

    // Long interaction history increases depth
    if (metrics.interactionCount > 10) {
      depth += 0.2;
    }

    // Consistent successful interactions increase depth
    const recentSuccess = metrics.successfulInteractionPatterns.slice(-5);
    if (recentSuccess.length > 3) {
      depth += 0.2;
    }

    // Personal sharing increases depth
    if (interaction.childResponse.length > 50) {
      depth += 0.1;
    }

    return Math.min(1.0, depth);
  }

  private generatePersonalizedElements(metrics: RelationshipMetrics, interaction: any): string[] {
    const elements: string[] = [];

    if (metrics.interactionCount > 5) {
      elements.push('interaction history reference');
    }

    if (metrics.successfulInteractionPatterns.length > 3) {
      elements.push('preferred interaction style');
    }

    if (metrics.relationshipStrength > 0.7) {
      elements.push('deep connection indicators');
    }

    return elements;
  }

  private calculateRelationshipGrowth(
    previous: RelationshipMetrics,
    current: RelationshipMetrics
  ): number {
    const strengthGrowth = current.relationshipStrength - previous.relationshipStrength;
    const engagementGrowth = current.averageEngagement - previous.averageEngagement;
    
    return Math.max(0, (strengthGrowth + engagementGrowth) / 2);
  }

  private calculateStoryContextModifier(storyContext: any): number {
    if (!storyContext) return 0;

    let modifier = 0;

    // Story type affects whimsy
    if (storyContext.storyType === 'comedy') modifier += 0.2;
    if (storyContext.storyType === 'adventure') modifier += 0.1;
    if (storyContext.storyType === 'bedtime') modifier -= 0.1;

    // Story goal affects whimsy
    if (storyContext.storyGoal === 'entertainment') modifier += 0.1;
    if (storyContext.storyGoal === 'education') modifier -= 0.1;

    return modifier;
  }

  private calculateRelationshipModifier(relationshipDepth: number): number {
    // Deeper relationships allow for more personalized whimsy
    return relationshipDepth * 0.1;
  }

  private calculateBalancedWhimsy(
    base: number,
    emotional: number,
    age: number,
    story: number,
    relationship: number
  ): number {
    const adjusted = base + emotional + age + story + relationship;
    return Math.max(
      this.whimsyBalanceEngine.minIntensity,
      Math.min(this.whimsyBalanceEngine.maxIntensity, adjusted)
    );
  }

  private identifyWhimsyAdjustments(
    original: number,
    balanced: number,
    emotion: EmotionalState
  ): string[] {
    const adjustments: string[] = [];

    if (balanced < original) {
      adjustments.push(`reduced whimsy for ${emotion} context`);
    } else if (balanced > original) {
      adjustments.push(`increased whimsy for ${emotion} context`);
    }

    const difference = Math.abs(balanced - original);
    if (difference > 0.2) {
      adjustments.push('significant whimsy adjustment');
    }

    return adjustments;
  }

  private identifyContextualFactors(
    emotion: EmotionalState,
    storyContext: any,
    ageGroup: AgeGroup,
    relationshipDepth: number
  ): string[] {
    const factors: string[] = [];

    if (['sad', 'anxious', 'overwhelmed'].includes(emotion)) {
      factors.push('emotional sensitivity required');
    }

    if (ageGroup === '3-5') {
      factors.push('young age allows high whimsy');
    }

    if (storyContext?.storyType === 'bedtime') {
      factors.push('bedtime story requires calm approach');
    }

    if (relationshipDepth > 0.7) {
      factors.push('deep relationship allows personalized whimsy');
    }

    return factors;
  }

  private generateBalanceReasoning(
    adjustments: string[],
    factors: string[],
    emotion: EmotionalState
  ): string {
    if (adjustments.length === 0) {
      return 'Whimsy level is appropriate for current context';
    }

    const primaryAdjustment = adjustments[0];
    const primaryFactor = factors[0] || 'contextual appropriateness';

    return `${primaryAdjustment} due to ${primaryFactor}`;
  }

  private weavePersonalityIntoStory(
    expression: string,
    storyContext: any
  ): string {
    if (!storyContext) return expression;

    let integrated = expression;

    // Replace generic terms with story-specific ones
    if (storyContext.characterName) {
      integrated = integrated.replace(/character/gi, storyContext.characterName);
    }

    if (storyContext.storyType) {
      integrated = integrated.replace(/story/gi, `${storyContext.storyType} story`);
    }

    return integrated;
  }

  private calculateStoryRelevance(expression: string, storyContext: any): number {
    if (!storyContext) return 0.3;

    let relevance = 0.3;

    if (storyContext.characterName && expression.includes(storyContext.characterName)) {
      relevance += 0.3;
    }

    if (storyContext.storyType && expression.toLowerCase().includes(storyContext.storyType.toLowerCase())) {
      relevance += 0.2;
    }

    if (storyContext.currentScene && expression.toLowerCase().includes(storyContext.currentScene.toLowerCase())) {
      relevance += 0.2;
    }

    return Math.min(1.0, relevance);
  }

  private assessQualityPreservation(
    original: string,
    integrated: string,
    storyContext: any
  ): number {
    let quality = 0.8; // Base quality

    // Check if integration feels natural
    const lengthRatio = integrated.length / original.length;
    if (lengthRatio > 1.5 || lengthRatio < 0.8) {
      quality -= 0.2; // Penalize dramatic length changes
    }

    // Check if story elements are naturally woven in
    if (storyContext.characterName && integrated.includes(storyContext.characterName)) {
      const integration = integrated.toLowerCase();
      if (integration.includes(`${storyContext.characterName.toLowerCase()} is`) ||
          integration.includes(`${storyContext.characterName.toLowerCase()}'s`)) {
        quality += 0.1; // Reward natural integration
      }
    }

    return Math.min(1.0, quality);
  }

  private identifyPlayfulIntegration(expression: string, storyContext: any): string[] {
    const integration: string[] = [];

    if (storyContext.characterName && expression.includes(storyContext.characterName)) {
      integration.push('character name integration');
    }

    if (storyContext.storyType && expression.toLowerCase().includes(storyContext.storyType.toLowerCase())) {
      integration.push('story type integration');
    }

    if (/magical|wonderful|amazing/.test(expression.toLowerCase())) {
      integration.push('whimsical enhancement');
    }

    return integration;
  }

  private adjustForQuality(
    original: string,
    storyContext: any,
    threshold: number
  ): any {
    // Fallback to simpler integration if quality is too low
    const simpleIntegration = storyContext.characterName 
      ? original.replace(/you/gi, storyContext.characterName)
      : original;

    return {
      integratedExpression: simpleIntegration,
      storyRelevance: 0.6,
      qualityPreservation: threshold,
      playfulIntegration: ['simplified integration']
    };
  }

  private applyPersonalization(
    baseExpression: string,
    metrics: RelationshipMetrics | undefined,
    consistency: PersonalityConsistency | undefined,
    context: PersonalityContext,
    expressionType: string
  ): string {
    if (!metrics) return baseExpression;

    let personalized = baseExpression;

    // Add relationship-based elements
    if (metrics.interactionCount > 10) {
      personalized = `As we continue our wonderful journey together, ${personalized.toLowerCase()}`;
    } else if (metrics.interactionCount > 5) {
      personalized = `I'm so glad we're getting to know each other! ${personalized}`;
    }

    // Adapt to preferred personality traits
    if (metrics.preferredPersonalityTraits.whimsy > 0.8 && expressionType === 'greeting') {
      personalized = personalized.replace(/Hello/gi, 'Hello-hello-hello');
    }

    return personalized;
  }

  private identifyPersonalizationElements(original: string, personalized: string): string[] {
    const elements: string[] = [];

    if (personalized.length > original.length) {
      elements.push('relationship context added');
    }

    if (personalized.includes('journey together')) {
      elements.push('shared experience reference');
    }

    if (personalized.includes('getting to know')) {
      elements.push('relationship building language');
    }

    return elements;
  }

  private extractRelationshipReferences(
    expression: string,
    metrics: RelationshipMetrics | undefined
  ): string[] {
    const references: string[] = [];

    if (expression.includes('together')) {
      references.push('togetherness');
    }

    if (expression.includes('journey') || expression.includes('adventure')) {
      references.push('shared journey');
    }

    if (expression.includes('know each other')) {
      references.push('relationship development');
    }

    return references;
  }

  private calculateUniquenessScore(
    expression: string,
    metrics: RelationshipMetrics | undefined,
    context: PersonalityContext
  ): number {
    let uniqueness = 0.5; // Base uniqueness

    if (metrics && metrics.interactionCount > 5) {
      uniqueness += 0.2; // More unique with relationship history
    }

    if (expression.includes(context.childAge.toString())) {
      uniqueness += 0.1; // Age-specific elements
    }

    const personalWords = ['journey', 'together', 'know each other'];
    const personalCount = personalWords.filter(word => 
      expression.toLowerCase().includes(word)
    ).length;

    uniqueness += personalCount * 0.1;

    return Math.min(1.0, uniqueness);
  }

  // Helper methods
  private generateFarewells(ageGroup: AgeGroup): string[] {
    const farewells = {
      '3-5': [
        "Bye-bye, my giggly friend! See you soon!",
        "Until next time, little star!",
        "Goodbye, sunshine! Keep being wonderful!"
      ],
      '6-8': [
        "Farewell, amazing storyteller! Can't wait for our next adventure!",
        "See you later, creative companion!",
        "Until we meet again, fantastic friend!"
      ],
      '9-10': [
        "Goodbye, my thoughtful collaborator!",
        "Until next time, creative genius!",
        "Farewell, my wise wordcrafter!"
      ],
      '11+': [
        "Goodbye, my sophisticated storyteller!",
        "Until we meet again, creative intellectual!",
        "Farewell, my insightful collaborator!"
      ]
    };

    return farewells[ageGroup] || farewells['6-8'];
  }

  private calculateMinTraits(traits: PersonalityTraits): PersonalityTraits {
    return {
      warmth: Math.max(0.6, traits.warmth - 0.2),
      whimsy: Math.max(0.2, traits.whimsy - 0.3),
      empathy: Math.max(0.6, traits.empathy - 0.2),
      youthfulness: Math.max(0.3, traits.youthfulness - 0.3),
      playfulness: Math.max(0.2, traits.playfulness - 0.3),
      supportiveness: Math.max(0.6, traits.supportiveness - 0.2)
    };
  }

  private calculateMaxTraits(traits: PersonalityTraits): PersonalityTraits {
    return {
      warmth: Math.min(1.0, traits.warmth + 0.2),
      whimsy: Math.min(1.0, traits.whimsy + 0.3),
      empathy: Math.min(1.0, traits.empathy + 0.2),
      youthfulness: Math.min(1.0, traits.youthfulness + 0.3),
      playfulness: Math.min(1.0, traits.playfulness + 0.3),
      supportiveness: Math.min(1.0, traits.supportiveness + 0.2)
    };
  }

  private calculateHistoricalConsistency(history: any[]): number {
    if (history.length < 2) return 0.8;

    // Calculate consistency across recent interactions
    let consistency = 0;
    for (let i = 1; i < Math.min(history.length, 5); i++) {
      const current = history[i];
      const previous = history[i - 1];
      
      if (current.personalityUsed && previous.personalityUsed) {
        const traitConsistency = this.comparePersonalityTraits(
          current.personalityUsed,
          previous.personalityUsed
        );
        consistency += traitConsistency;
      }
    }

    return consistency / Math.min(history.length - 1, 4);
  }

  private comparePersonalityTraits(traits1: PersonalityTraits, traits2: PersonalityTraits): number {
    let similarity = 0;
    const traitKeys = Object.keys(traits1) as (keyof PersonalityTraits)[];
    
    traitKeys.forEach(trait => {
      const difference = Math.abs(traits1[trait] - traits2[trait]);
      similarity += (1 - difference);
    });

    return similarity / traitKeys.length;
  }
}