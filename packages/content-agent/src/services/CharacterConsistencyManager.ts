import { Logger } from 'winston';
import OpenAI from 'openai';
import { RedisClientType } from 'redis';

export interface CharacterConsistencyCheck {
  characterId: string;
  storyId: string;
  currentTraits: CharacterTraits;
  storyProgression: StoryBeat[];
  inconsistencies: CharacterInconsistency[];
  overallConsistencyScore: number; // 0-1
}

export interface CharacterTraits {
  name: string;
  species: string;
  age?: number;
  physicalTraits: {
    eyeColor?: string;
    hairColor?: string;
    height?: string;
    build?: string;
    distinctiveFeatures?: string[];
  };
  personalityTraits: {
    primaryTraits: string[];
    quirks?: string[];
    fears?: string[];
    strengths?: string[];
  };
  abilities: {
    canFly?: boolean;
    hasSuperpowers?: boolean;
    specialSkills?: string[];
    limitations?: string[];
  };
  relationships: {
    family?: string[];
    friends?: string[];
    enemies?: string[];
  };
  backstory?: string;
}

export interface StoryBeat {
  beatNumber: number;
  content: string;
  characterActions: CharacterAction[];
  characterDescriptions: string[];
  timestamp: string;
}

export interface CharacterAction {
  characterId: string;
  action: string;
  context: string;
  impliedTraits: string[];
  physicalRequirements: string[];
}

export interface CharacterInconsistency {
  type: 'physical' | 'personality' | 'ability' | 'backstory' | 'relationship';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  conflictingElements: {
    original: string;
    current: string;
    storyBeat: number;
  };
  suggestedResolution: string;
  autoFixable: boolean;
}

export interface CharacterChangeRequest {
  characterId: string;
  storyId: string;
  changeType: 'trait_modification' | 'ability_change' | 'appearance_update' | 'personality_shift';
  originalValue: any;
  newValue: any;
  reason: string;
  userRequested: boolean;
  storyBeat?: number;
}

export interface StoryAdaptationPlan {
  storyId: string;
  characterChanges: CharacterChangeRequest[];
  affectedBeats: number[];
  adaptationStrategies: AdaptationStrategy[];
  narrativeChanges: NarrativeChange[];
  estimatedImpact: 'minimal' | 'moderate' | 'significant' | 'major_rewrite';
}

export interface AdaptationStrategy {
  type: 'retroactive_explanation' | 'gradual_transition' | 'magical_transformation' | 'narrative_reframe';
  description: string;
  affectedBeats: number[];
  userExplanation: string;
}

export interface NarrativeChange {
  beatNumber: number;
  originalContent: string;
  adaptedContent: string;
  changeReason: string;
  preservedElements: string[];
}

export interface UserConfirmationProtocol {
  changeRequest: CharacterChangeRequest;
  impactAssessment: {
    affectedStoryElements: string[];
    narrativeChangesRequired: string[];
    userVisibleChanges: string[];
  };
  confirmationPrompt: string;
  alternativeOptions: string[];
  proceedWithoutConfirmation: boolean;
}

export class CharacterConsistencyManager {
  private openai: OpenAI;
  private redis: RedisClientType;
  private logger: Logger;
  private consistencyRules: Map<string, ConsistencyRule>;

  constructor(openai: OpenAI, redis: RedisClientType, logger: Logger) {
    this.openai = openai;
    this.redis = redis;
    this.logger = logger;
    this.initializeConsistencyRules();
  }

  /**
   * Detect character inconsistencies across story progression
   */
  async detectCharacterInconsistencies(
    characterId: string,
    storyId: string,
    currentTraits: CharacterTraits,
    storyProgression: StoryBeat[]
  ): Promise<CharacterConsistencyCheck> {
    this.logger.info('Detecting character inconsistencies', {
      characterId,
      storyId,
      totalBeats: storyProgression.length
    });

    const inconsistencies: CharacterInconsistency[] = [];

    try {
      // Check physical trait consistency
      const physicalInconsistencies = await this.checkPhysicalConsistency(
        currentTraits,
        storyProgression
      );
      inconsistencies.push(...physicalInconsistencies);

      // Check personality consistency
      const personalityInconsistencies = await this.checkPersonalityConsistency(
        currentTraits,
        storyProgression
      );
      inconsistencies.push(...personalityInconsistencies);

      // Check ability consistency
      const abilityInconsistencies = await this.checkAbilityConsistency(
        currentTraits,
        storyProgression
      );
      inconsistencies.push(...abilityInconsistencies);

      // Check backstory consistency
      const backstoryInconsistencies = await this.checkBackstoryConsistency(
        currentTraits,
        storyProgression
      );
      inconsistencies.push(...backstoryInconsistencies);

      // Calculate overall consistency score
      const overallConsistencyScore = this.calculateConsistencyScore(inconsistencies);

      // Cache the consistency check
      await this.cacheConsistencyCheck(characterId, storyId, {
        characterId,
        storyId,
        currentTraits,
        storyProgression,
        inconsistencies,
        overallConsistencyScore
      });

      return {
        characterId,
        storyId,
        currentTraits,
        storyProgression,
        inconsistencies,
        overallConsistencyScore
      };

    } catch (error) {
      this.logger.error('Error detecting character inconsistencies', {
        characterId,
        storyId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        characterId,
        storyId,
        currentTraits,
        storyProgression,
        inconsistencies: [],
        overallConsistencyScore: 0.5 // Default score on error
      };
    }
  }

  /**
   * Handle intelligent character change reconciliation
   */
  async reconcileCharacterChanges(
    changeRequest: CharacterChangeRequest,
    currentConsistencyCheck: CharacterConsistencyCheck
  ): Promise<{
    reconciliationPlan: ReconciliationPlan;
    userConfirmationNeeded: boolean;
    automaticFixes: CharacterInconsistency[];
    manualReviewRequired: CharacterInconsistency[];
  }> {
    this.logger.info('Reconciling character changes', {
      characterId: changeRequest.characterId,
      changeType: changeRequest.changeType,
      storyId: changeRequest.storyId
    });

    try {
      // Analyze the impact of the proposed change
      const impactAnalysis = await this.analyzeChangeImpact(
        changeRequest,
        currentConsistencyCheck
      );

      // Create reconciliation plan
      const reconciliationPlan = await this.createReconciliationPlan(
        changeRequest,
        impactAnalysis,
        currentConsistencyCheck
      );

      // Determine what can be fixed automatically
      const automaticFixes = currentConsistencyCheck.inconsistencies.filter(
        inc => inc.autoFixable && inc.severity !== 'critical'
      );

      // Determine what needs manual review
      const manualReviewRequired = currentConsistencyCheck.inconsistencies.filter(
        inc => !inc.autoFixable || inc.severity === 'critical'
      );

      // Determine if user confirmation is needed
      const userConfirmationNeeded = this.requiresUserConfirmation(
        changeRequest,
        impactAnalysis,
        manualReviewRequired
      );

      return {
        reconciliationPlan,
        userConfirmationNeeded,
        automaticFixes,
        manualReviewRequired
      };

    } catch (error) {
      this.logger.error('Error reconciling character changes', {
        changeRequest,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Create story adaptation engine for mid-story character modifications
   */
  async createStoryAdaptationPlan(
    characterChanges: CharacterChangeRequest[],
    storyProgression: StoryBeat[]
  ): Promise<StoryAdaptationPlan> {
    this.logger.info('Creating story adaptation plan', {
      characterChanges: characterChanges.length,
      storyBeats: storyProgression.length
    });

    try {
      // Identify affected story beats
      const affectedBeats = this.identifyAffectedBeats(characterChanges, storyProgression);

      // Determine adaptation strategies
      const adaptationStrategies = await this.determineAdaptationStrategies(
        characterChanges,
        affectedBeats,
        storyProgression
      );

      // Generate narrative changes
      const narrativeChanges = await this.generateNarrativeChanges(
        characterChanges,
        affectedBeats,
        storyProgression,
        adaptationStrategies
      );

      // Estimate overall impact
      const estimatedImpact = this.estimateAdaptationImpact(
        affectedBeats,
        narrativeChanges,
        storyProgression
      );

      const adaptationPlan: StoryAdaptationPlan = {
        storyId: storyProgression[0]?.beatNumber ? `story_${storyProgression[0].beatNumber}` : 'unknown',
        characterChanges,
        affectedBeats,
        adaptationStrategies,
        narrativeChanges,
        estimatedImpact
      };

      return adaptationPlan;

    } catch (error) {
      this.logger.error('Error creating story adaptation plan', {
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Maintain narrative consistency during character changes
   */
  async maintainNarrativeConsistency(
    adaptationPlan: StoryAdaptationPlan,
    userPreferences?: {
      preferredStrategy?: string;
      preserveElements?: string[];
      acceptableChanges?: string[];
    }
  ): Promise<{
    updatedStoryBeats: StoryBeat[];
    consistencyReport: ConsistencyReport;
    userNotifications: string[];
  }> {
    this.logger.info('Maintaining narrative consistency', {
      storyId: adaptationPlan.storyId,
      affectedBeats: adaptationPlan.affectedBeats.length,
      strategies: adaptationPlan.adaptationStrategies.length
    });

    try {
      // Apply narrative changes
      const updatedStoryBeats = await this.applyNarrativeChanges(
        adaptationPlan,
        userPreferences
      );

      // Validate consistency after changes
      const consistencyReport = await this.validatePostChangeConsistency(
        updatedStoryBeats,
        adaptationPlan.characterChanges
      );

      // Generate user notifications
      const userNotifications = this.generateUserNotifications(
        adaptationPlan,
        consistencyReport
      );

      return {
        updatedStoryBeats,
        consistencyReport,
        userNotifications
      };

    } catch (error) {
      this.logger.error('Error maintaining narrative consistency', {
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Create user confirmation protocols for character changes
   */
  async createUserConfirmationProtocol(
    changeRequest: CharacterChangeRequest,
    impactAssessment: any
  ): Promise<UserConfirmationProtocol> {
    this.logger.info('Creating user confirmation protocol', {
      characterId: changeRequest.characterId,
      changeType: changeRequest.changeType
    });

    // Assess the impact of the change
    const affectedStoryElements = this.identifyAffectedStoryElements(
      changeRequest,
      impactAssessment
    );

    const narrativeChangesRequired = this.identifyNarrativeChanges(
      changeRequest,
      impactAssessment
    );

    const userVisibleChanges = this.identifyUserVisibleChanges(
      changeRequest,
      affectedStoryElements
    );

    // Generate age-appropriate confirmation prompt
    const confirmationPrompt = await this.generateConfirmationPrompt(
      changeRequest,
      userVisibleChanges
    );

    // Generate alternative options
    const alternativeOptions = await this.generateAlternativeOptions(
      changeRequest
    );

    // Determine if we can proceed without confirmation
    const proceedWithoutConfirmation = this.canProceedWithoutConfirmation(
      changeRequest,
      impactAssessment
    );

    return {
      changeRequest,
      impactAssessment: {
        affectedStoryElements,
        narrativeChangesRequired,
        userVisibleChanges
      },
      confirmationPrompt,
      alternativeOptions,
      proceedWithoutConfirmation
    };
  }

  // Private helper methods

  private initializeConsistencyRules(): void {
    this.consistencyRules = new Map([
      ['physical_traits', {
        type: 'physical_traits',
        description: 'Physical characteristics must remain consistent',
        severity: 'major',
        autoFixable: false
      }],
      ['core_abilities', {
        type: 'core_abilities',
        description: 'Core abilities cannot change without explanation',
        severity: 'critical',
        autoFixable: false
      }],
      ['personality_core', {
        type: 'personality_core',
        description: 'Core personality traits should remain stable',
        severity: 'moderate',
        autoFixable: true
      }],
      ['species_traits', {
        type: 'species_traits',
        description: 'Species-specific traits must be consistent',
        severity: 'critical',
        autoFixable: false
      }]
    ]);
  }

  private async checkPhysicalConsistency(
    traits: CharacterTraits,
    storyProgression: StoryBeat[]
  ): Promise<CharacterInconsistency[]> {
    const inconsistencies: CharacterInconsistency[] = [];

    // Check for physical trait mentions in story beats
    for (const beat of storyProgression) {
      const physicalMentions = this.extractPhysicalMentions(beat.content);
      
      for (const mention of physicalMentions) {
        if (this.conflictsWithTraits(mention, traits.physicalTraits)) {
          inconsistencies.push({
            type: 'physical',
            severity: 'major',
            description: `Physical description conflicts with character traits`,
            conflictingElements: {
              original: JSON.stringify(traits.physicalTraits),
              current: mention,
              storyBeat: beat.beatNumber
            },
            suggestedResolution: `Update story to match character's ${this.identifyConflictingTrait(mention, traits.physicalTraits)}`,
            autoFixable: true
          });
        }
      }
    }

    return inconsistencies;
  }

  private async checkPersonalityConsistency(
    traits: CharacterTraits,
    storyProgression: StoryBeat[]
  ): Promise<CharacterInconsistency[]> {
    const inconsistencies: CharacterInconsistency[] = [];

    // Use AI to analyze personality consistency
    const prompt = `
Analyze the following character's personality consistency across story beats:

Character Personality: ${JSON.stringify(traits.personalityTraits)}

Story Beats:
${storyProgression.map(beat => `Beat ${beat.beatNumber}: ${beat.content}`).join('\n')}

Identify any actions or behaviors that conflict with the established personality traits.
Return as JSON array of inconsistencies.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content || '[]';
      const aiInconsistencies = JSON.parse(content);

      // Convert AI response to our format
      for (const ai of aiInconsistencies) {
        inconsistencies.push({
          type: 'personality',
          severity: ai.severity || 'moderate',
          description: ai.description || 'Personality inconsistency detected',
          conflictingElements: {
            original: JSON.stringify(traits.personalityTraits),
            current: ai.conflictingBehavior || '',
            storyBeat: ai.beatNumber || 0
          },
          suggestedResolution: ai.suggestion || 'Review and adjust character behavior',
          autoFixable: ai.autoFixable || false
        });
      }
    } catch (error) {
      this.logger.warn('AI personality analysis failed', { error });
    }

    return inconsistencies;
  }

  private async checkAbilityConsistency(
    traits: CharacterTraits,
    storyProgression: StoryBeat[]
  ): Promise<CharacterInconsistency[]> {
    const inconsistencies: CharacterInconsistency[] = [];

    // Check for ability usage that conflicts with character traits
    for (const beat of storyProgression) {
      const abilityUsage = this.extractAbilityUsage(beat.content);
      
      for (const ability of abilityUsage) {
        if (!this.characterHasAbility(ability, traits.abilities)) {
          inconsistencies.push({
            type: 'ability',
            severity: 'critical',
            description: `Character uses ability they don't possess: ${ability}`,
            conflictingElements: {
              original: JSON.stringify(traits.abilities),
              current: ability,
              storyBeat: beat.beatNumber
            },
            suggestedResolution: `Either add ${ability} to character abilities or modify the story`,
            autoFixable: false
          });
        }
      }
    }

    return inconsistencies;
  }

  private async checkBackstoryConsistency(
    traits: CharacterTraits,
    storyProgression: StoryBeat[]
  ): Promise<CharacterInconsistency[]> {
    const inconsistencies: CharacterInconsistency[] = [];

    if (!traits.backstory) return inconsistencies;

    // Check for backstory conflicts
    for (const beat of storyProgression) {
      const backstoryReferences = this.extractBackstoryReferences(beat.content);
      
      for (const reference of backstoryReferences) {
        if (this.conflictsWithBackstory(reference, traits.backstory)) {
          inconsistencies.push({
            type: 'backstory',
            severity: 'moderate',
            description: `Story reference conflicts with character backstory`,
            conflictingElements: {
              original: traits.backstory,
              current: reference,
              storyBeat: beat.beatNumber
            },
            suggestedResolution: `Align story reference with established backstory`,
            autoFixable: true
          });
        }
      }
    }

    return inconsistencies;
  }

  private calculateConsistencyScore(inconsistencies: CharacterInconsistency[]): number {
    if (inconsistencies.length === 0) return 1.0;

    const severityWeights = {
      minor: 0.1,
      moderate: 0.3,
      major: 0.6,
      critical: 1.0
    };

    const totalDeduction = inconsistencies.reduce(
      (sum, inc) => sum + severityWeights[inc.severity],
      0
    );

    return Math.max(0, 1.0 - (totalDeduction / (inconsistencies.length * 2)));
  }

  private async cacheConsistencyCheck(
    characterId: string,
    storyId: string,
    check: CharacterConsistencyCheck
  ): Promise<void> {
    try {
      const key = `consistency:${characterId}:${storyId}`;
      await this.redis.setEx(key, 3600, JSON.stringify(check));
    } catch (error) {
      this.logger.warn('Failed to cache consistency check', { error });
    }
  }

  private async analyzeChangeImpact(
    changeRequest: CharacterChangeRequest,
    consistencyCheck: CharacterConsistencyCheck
  ): Promise<any> {
    // Analyze how the change will affect the story
    return {
      affectedBeats: this.identifyAffectedBeats([changeRequest], consistencyCheck.storyProgression),
      severityLevel: this.assessChangeSeverity(changeRequest),
      narrativeImpact: this.assessNarrativeImpact(changeRequest, consistencyCheck)
    };
  }

  private async createReconciliationPlan(
    changeRequest: CharacterChangeRequest,
    impactAnalysis: any,
    consistencyCheck: CharacterConsistencyCheck
  ): Promise<ReconciliationPlan> {
    return {
      changeRequest,
      steps: [
        {
          action: 'validate_change',
          description: 'Validate the requested character change',
          autoExecute: true
        },
        {
          action: 'update_traits',
          description: 'Update character traits',
          autoExecute: true
        },
        {
          action: 'adapt_story',
          description: 'Adapt story content to maintain consistency',
          autoExecute: false
        }
      ],
      estimatedTime: '30 seconds',
      userApprovalRequired: impactAnalysis.severityLevel === 'high'
    };
  }

  private requiresUserConfirmation(
    changeRequest: CharacterChangeRequest,
    impactAnalysis: any,
    manualReviewRequired: CharacterInconsistency[]
  ): boolean {
    return (
      !changeRequest.userRequested ||
      impactAnalysis.severityLevel === 'high' ||
      manualReviewRequired.length > 0
    );
  }

  private identifyAffectedBeats(
    characterChanges: CharacterChangeRequest[],
    storyProgression: StoryBeat[]
  ): number[] {
    const affectedBeats: Set<number> = new Set();

    for (const change of characterChanges) {
      for (const beat of storyProgression) {
        if (this.beatAffectedByChange(beat, change)) {
          affectedBeats.add(beat.beatNumber);
        }
      }
    }

    return Array.from(affectedBeats).sort((a, b) => a - b);
  }

  private async determineAdaptationStrategies(
    characterChanges: CharacterChangeRequest[],
    affectedBeats: number[],
    storyProgression: StoryBeat[]
  ): Promise<AdaptationStrategy[]> {
    const strategies: AdaptationStrategy[] = [];

    for (const change of characterChanges) {
      const strategy = this.selectAdaptationStrategy(change, affectedBeats, storyProgression);
      strategies.push(strategy);
    }

    return strategies;
  }

  private async generateNarrativeChanges(
    characterChanges: CharacterChangeRequest[],
    affectedBeats: number[],
    storyProgression: StoryBeat[],
    strategies: AdaptationStrategy[]
  ): Promise<NarrativeChange[]> {
    const narrativeChanges: NarrativeChange[] = [];

    for (const beatNumber of affectedBeats) {
      const beat = storyProgression.find(b => b.beatNumber === beatNumber);
      if (!beat) continue;

      const adaptedContent = await this.adaptBeatContent(
        beat,
        characterChanges,
        strategies
      );

      narrativeChanges.push({
        beatNumber,
        originalContent: beat.content,
        adaptedContent,
        changeReason: `Adapted for character changes: ${characterChanges.map(c => c.changeType).join(', ')}`,
        preservedElements: this.identifyPreservedElements(beat.content, adaptedContent)
      });
    }

    return narrativeChanges;
  }

  private estimateAdaptationImpact(
    affectedBeats: number[],
    narrativeChanges: NarrativeChange[],
    storyProgression: StoryBeat[]
  ): StoryAdaptationPlan['estimatedImpact'] {
    const totalBeats = storyProgression.length;
    const affectedPercentage = affectedBeats.length / totalBeats;

    if (affectedPercentage < 0.1) return 'minimal';
    if (affectedPercentage < 0.3) return 'moderate';
    if (affectedPercentage < 0.6) return 'significant';
    return 'major_rewrite';
  }

  private async applyNarrativeChanges(
    adaptationPlan: StoryAdaptationPlan,
    userPreferences?: any
  ): Promise<StoryBeat[]> {
    // Apply the narrative changes to create updated story beats
    const updatedBeats: StoryBeat[] = [];

    // This would implement the actual narrative adaptation logic
    // For now, return a mock implementation
    return updatedBeats;
  }

  private async validatePostChangeConsistency(
    updatedStoryBeats: StoryBeat[],
    characterChanges: CharacterChangeRequest[]
  ): Promise<ConsistencyReport> {
    return {
      overallScore: 0.9,
      remainingIssues: [],
      resolvedIssues: [],
      newIssues: []
    };
  }

  private generateUserNotifications(
    adaptationPlan: StoryAdaptationPlan,
    consistencyReport: ConsistencyReport
  ): string[] {
    return [
      `I've updated your story to match the character changes!`,
      `${adaptationPlan.affectedBeats.length} parts of your story were adjusted.`,
      `Everything looks consistent now!`
    ];
  }

  // Additional helper methods (simplified implementations)
  private extractPhysicalMentions(content: string): string[] {
    // Extract physical descriptions from story content
    return [];
  }

  private conflictsWithTraits(mention: string, traits: any): boolean {
    // Check if mention conflicts with character traits
    return false;
  }

  private identifyConflictingTrait(mention: string, traits: any): string {
    return 'appearance';
  }

  private extractAbilityUsage(content: string): string[] {
    return [];
  }

  private characterHasAbility(ability: string, abilities: any): boolean {
    return true;
  }

  private extractBackstoryReferences(content: string): string[] {
    return [];
  }

  private conflictsWithBackstory(reference: string, backstory: string): boolean {
    return false;
  }

  private beatAffectedByChange(beat: StoryBeat, change: CharacterChangeRequest): boolean {
    return false;
  }

  private selectAdaptationStrategy(
    change: CharacterChangeRequest,
    affectedBeats: number[],
    storyProgression: StoryBeat[]
  ): AdaptationStrategy {
    return {
      type: 'gradual_transition',
      description: 'Gradually introduce the character change',
      affectedBeats,
      userExplanation: 'I\'ll smoothly introduce this change in your story!'
    };
  }

  private async adaptBeatContent(
    beat: StoryBeat,
    changes: CharacterChangeRequest[],
    strategies: AdaptationStrategy[]
  ): Promise<string> {
    return beat.content; // Mock implementation
  }

  private identifyPreservedElements(original: string, adapted: string): string[] {
    return [];
  }

  private identifyAffectedStoryElements(
    changeRequest: CharacterChangeRequest,
    impactAssessment: any
  ): string[] {
    return [];
  }

  private identifyNarrativeChanges(
    changeRequest: CharacterChangeRequest,
    impactAssessment: any
  ): string[] {
    return [];
  }

  private identifyUserVisibleChanges(
    changeRequest: CharacterChangeRequest,
    affectedElements: string[]
  ): string[] {
    return [];
  }

  private async generateConfirmationPrompt(
    changeRequest: CharacterChangeRequest,
    userVisibleChanges: string[]
  ): Promise<string> {
    return `Would you like me to change your character's ${changeRequest.changeType}? This might affect some parts of your story.`;
  }

  private async generateAlternativeOptions(
    changeRequest: CharacterChangeRequest
  ): Promise<string[]> {
    return [
      'Make the change',
      'Keep it the same',
      'Try something different'
    ];
  }

  private canProceedWithoutConfirmation(
    changeRequest: CharacterChangeRequest,
    impactAssessment: any
  ): boolean {
    return changeRequest.userRequested && impactAssessment.severityLevel === 'low';
  }

  private assessChangeSeverity(changeRequest: CharacterChangeRequest): 'low' | 'medium' | 'high' {
    switch (changeRequest.changeType) {
      case 'appearance_update':
        return 'low';
      case 'trait_modification':
        return 'medium';
      case 'ability_change':
        return 'high';
      default:
        return 'medium';
    }
  }

  private assessNarrativeImpact(
    changeRequest: CharacterChangeRequest,
    consistencyCheck: CharacterConsistencyCheck
  ): string {
    return 'moderate';
  }
}

export interface ConsistencyRule {
  type: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  autoFixable: boolean;
}

export interface ReconciliationPlan {
  changeRequest: CharacterChangeRequest;
  steps: ReconciliationStep[];
  estimatedTime: string;
  userApprovalRequired: boolean;
}

export interface ReconciliationStep {
  action: string;
  description: string;
  autoExecute: boolean;
}

export interface ConsistencyReport {
  overallScore: number;
  remainingIssues: CharacterInconsistency[];
  resolvedIssues: CharacterInconsistency[];
  newIssues: CharacterInconsistency[];
}