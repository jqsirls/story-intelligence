import { Logger } from 'winston';
import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Mood } from '@alexa-multi-agent/shared-types';

export interface StoryRecommendation {
  storyType: string;
  theme: string;
  tone: 'uplifting' | 'calming' | 'energetic' | 'gentle' | 'neutral';
  reasoning: string;
  expectedEmotionalImpact: string;
  confidence: number;
  adaptations: StoryAdaptation[];
}

export interface StoryAdaptation {
  aspect: 'pacing' | 'complexity' | 'character_traits' | 'conflict_level' | 'resolution_style';
  modification: string;
  reason: string;
}

export interface MoodBasedRecommendationContext {
  currentMood: Mood;
  recentMoodHistory: MoodHistoryEntry[];
  emotionalGoal: 'mood_improvement' | 'mood_maintenance' | 'emotional_processing' | 'stress_relief';
  sessionContext: SessionContext;
  userPreferences: UserPreferences;
}

export interface MoodHistoryEntry {
  mood: Mood;
  confidence: number;
  timestamp: string;
  context: string;
}

export interface SessionContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  sessionLength: 'short' | 'medium' | 'long';
  energyLevel: 'low' | 'medium' | 'high';
  attentionSpan: number; // minutes
  previousSessionOutcome?: 'positive' | 'neutral' | 'negative';
}

export interface UserPreferences {
  favoriteStoryTypes: string[];
  preferredCharacterTraits: string[];
  avoidedThemes: string[];
  responseToTones: Record<string, 'positive' | 'neutral' | 'negative'>;
  optimalSessionLength: number; // minutes
}

export interface TherapeuticStoryPathway {
  pathwayName: string;
  targetEmotions: Mood[];
  storyProgression: TherapeuticStoryStep[];
  expectedOutcomes: string[];
  duration: number; // sessions
  adaptationTriggers: AdaptationTrigger[];
}

export interface TherapeuticStoryStep {
  stepNumber: number;
  storyType: string;
  theme: string;
  therapeuticGoals: string[];
  keyElements: string[];
  successMetrics: string[];
  nextStepTriggers: string[];
}

export interface AdaptationTrigger {
  condition: string;
  adaptation: string;
  reasoning: string;
}

export interface EmotionalJourney {
  journeyId: string;
  userId: string;
  startDate: string;
  currentStep: number;
  pathway: TherapeuticStoryPathway;
  progress: JourneyProgress[];
  adaptations: JourneyAdaptation[];
  outcomes: JourneyOutcome[];
}

export interface JourneyProgress {
  stepNumber: number;
  completedAt: string;
  emotionalResponse: Mood;
  engagementLevel: 'high' | 'medium' | 'low';
  keyInsights: string[];
  nextStepRecommendation: string;
}

export interface JourneyAdaptation {
  adaptedAt: string;
  reason: string;
  changes: string[];
  expectedImpact: string;
}

export interface JourneyOutcome {
  measuredAt: string;
  emotionalImprovement: number; // -1 to 1 scale
  engagementImprovement: number; // -1 to 1 scale
  behavioralChanges: string[];
  parentFeedback?: string;
}

/**
 * Mood-based story recommendation engine with therapeutic pathways
 * Requirements: 7.3, 7.4
 */
export class MoodBasedStoryRecommendationEngine {
  constructor(
    private supabase: SupabaseClient,
    private redis: RedisClientType | undefined,
    private logger: Logger
  ) {}

  /**
   * Generate mood-based story recommendations
   */
  async generateMoodBasedRecommendations(context: MoodBasedRecommendationContext): Promise<StoryRecommendation[]> {
    try {
      this.logger.info('Generating mood-based story recommendations', {
        currentMood: context.currentMood,
        emotionalGoal: context.emotionalGoal
      });

      const recommendations: StoryRecommendation[] = [];

      // Generate primary recommendation based on current mood and goal
      const primaryRecommendation = await this.generatePrimaryRecommendation(context);
      recommendations.push(primaryRecommendation);

      // Generate alternative recommendations
      const alternatives = await this.generateAlternativeRecommendations(context);
      recommendations.push(...alternatives);

      // Apply user preferences and adaptations
      const adaptedRecommendations = await this.applyUserAdaptations(recommendations, context);

      // Sort by confidence and expected impact
      adaptedRecommendations.sort((a, b) => b.confidence - a.confidence);

      return adaptedRecommendations.slice(0, 5); // Return top 5 recommendations

    } catch (error) {
      this.logger.error('Error generating mood-based recommendations:', error);
      throw error;
    }
  }

  /**
   * Create therapeutic story pathway for emotional support
   */
  async createTherapeuticPathway(
    userId: string,
    targetEmotions: Mood[],
    currentEmotionalState: Mood,
    therapeuticGoals: string[]
  ): Promise<TherapeuticStoryPathway> {
    try {
      this.logger.info('Creating therapeutic story pathway', {
        userId,
        targetEmotions,
        currentEmotionalState,
        therapeuticGoals
      });

      // Determine pathway type based on goals and emotions
      const pathwayName = this.determinePathwayName(targetEmotions, therapeuticGoals);

      // Generate story progression steps
      const storyProgression = await this.generateTherapeuticProgression(
        currentEmotionalState,
        targetEmotions,
        therapeuticGoals
      );

      // Define expected outcomes
      const expectedOutcomes = this.defineExpectedOutcomes(targetEmotions, therapeuticGoals);

      // Calculate estimated duration
      const duration = this.calculatePathwayDuration(storyProgression, therapeuticGoals);

      // Define adaptation triggers
      const adaptationTriggers = this.defineAdaptationTriggers(targetEmotions, therapeuticGoals);

      const pathway: TherapeuticStoryPathway = {
        pathwayName,
        targetEmotions,
        storyProgression,
        expectedOutcomes,
        duration,
        adaptationTriggers
      };

      // Store pathway in database
      await this.storeTherapeuticPathway(userId, pathway);

      return pathway;

    } catch (error) {
      this.logger.error('Error creating therapeutic pathway:', error);
      throw error;
    }
  }

  /**
   * Start emotional journey for a user
   */
  async startEmotionalJourney(userId: string, pathway: TherapeuticStoryPathway): Promise<EmotionalJourney> {
    try {
      this.logger.info('Starting emotional journey', { userId, pathwayName: pathway.pathwayName });

      const journey: EmotionalJourney = {
        journeyId: `journey_${userId}_${Date.now()}`,
        userId,
        startDate: new Date().toISOString(),
        currentStep: 0,
        pathway,
        progress: [],
        adaptations: [],
        outcomes: []
      };

      // Store journey in database
      await this.storeEmotionalJourney(journey);

      // Cache current journey for quick access
      if (this.redis) {
        await this.redis.setEx(
          `emotional_journey:${userId}`,
          86400 * 30, // 30 days
          JSON.stringify(journey)
        );
      }

      return journey;

    } catch (error) {
      this.logger.error('Error starting emotional journey:', error);
      throw error;
    }
  }

  /**
   * Progress emotional journey to next step
   */
  async progressEmotionalJourney(
    userId: string,
    emotionalResponse: Mood,
    engagementLevel: 'high' | 'medium' | 'low',
    sessionFeedback?: string
  ): Promise<{
    journey: EmotionalJourney;
    nextRecommendation: StoryRecommendation;
    adaptationsNeeded: boolean;
  }> {
    try {
      this.logger.info('Progressing emotional journey', { userId, emotionalResponse, engagementLevel });

      // Get current journey
      const journey = await this.getCurrentJourney(userId);
      if (!journey) {
        throw new Error('No active emotional journey found');
      }

      // Record progress for current step
      const progress: JourneyProgress = {
        stepNumber: journey.currentStep,
        completedAt: new Date().toISOString(),
        emotionalResponse,
        engagementLevel,
        keyInsights: this.extractKeyInsights(emotionalResponse, engagementLevel, sessionFeedback),
        nextStepRecommendation: ''
      };

      journey.progress.push(progress);

      // Check if adaptations are needed
      const adaptationsNeeded = await this.checkForAdaptations(journey, progress);

      if (adaptationsNeeded) {
        await this.applyJourneyAdaptations(journey, progress);
      }

      // Move to next step
      journey.currentStep++;

      // Generate next recommendation
      const nextRecommendation = await this.generateNextStepRecommendation(journey);
      progress.nextStepRecommendation = nextRecommendation.reasoning;

      // Update journey in storage
      await this.updateEmotionalJourney(journey);

      return {
        journey,
        nextRecommendation,
        adaptationsNeeded
      };

    } catch (error) {
      this.logger.error('Error progressing emotional journey:', error);
      throw error;
    }
  }

  /**
   * Generate primary recommendation based on mood and goal
   */
  private async generatePrimaryRecommendation(context: MoodBasedRecommendationContext): Promise<StoryRecommendation> {
    const { currentMood, emotionalGoal, sessionContext, userPreferences } = context;

    // Define mood-based story mappings
    const moodStoryMappings = {
      'sad': {
        'mood_improvement': {
          storyType: 'Mental Health',
          theme: 'overcoming_sadness',
          tone: 'uplifting' as const,
          expectedImpact: 'Gradual mood elevation through hopeful narrative'
        },
        'emotional_processing': {
          storyType: 'New Chapter Sequel',
          theme: 'processing_loss',
          tone: 'gentle' as const,
          expectedImpact: 'Safe space to explore and validate sad feelings'
        }
      },
      'scared': {
        'mood_improvement': {
          storyType: 'Medical Bravery',
          theme: 'courage_building',
          tone: 'calming' as const,
          expectedImpact: 'Building confidence and reducing anxiety'
        },
        'stress_relief': {
          storyType: 'Bedtime',
          theme: 'safety_comfort',
          tone: 'calming' as const,
          expectedImpact: 'Immediate anxiety reduction and comfort'
        }
      },
      'angry': {
        'emotional_processing': {
          storyType: 'Mental Health',
          theme: 'anger_management',
          tone: 'gentle' as const,
          expectedImpact: 'Learning healthy ways to express and manage anger'
        },
        'stress_relief': {
          storyType: 'Bedtime',
          theme: 'peaceful_resolution',
          tone: 'calming' as const,
          expectedImpact: 'Calming angry feelings through peaceful narratives'
        }
      },
      'happy': {
        'mood_maintenance': {
          storyType: 'Adventure',
          theme: 'joyful_exploration',
          tone: 'energetic' as const,
          expectedImpact: 'Maintaining and amplifying positive emotions'
        },
        'emotional_processing': {
          storyType: 'Milestones',
          theme: 'celebrating_growth',
          tone: 'energetic' as const,
          expectedImpact: 'Reinforcing positive self-image and achievements'
        }
      },
      'neutral': {
        'mood_improvement': {
          storyType: 'Educational',
          theme: 'discovery_wonder',
          tone: 'energetic' as const,
          expectedImpact: 'Sparking curiosity and positive engagement'
        },
        'emotional_processing': {
          storyType: 'Adventure',
          theme: 'self_discovery',
          tone: 'neutral' as const,
          expectedImpact: 'Exploring emotions through character development'
        }
      }
    };

    const mapping = moodStoryMappings[currentMood]?.[emotionalGoal] || 
                   moodStoryMappings[currentMood]?.['mood_improvement'] ||
                   moodStoryMappings['neutral']['mood_improvement'];

    // Generate adaptations based on session context
    const adaptations = this.generateSessionAdaptations(sessionContext, userPreferences);

    // Calculate confidence based on mood history and preferences
    const confidence = this.calculateRecommendationConfidence(context, mapping);

    return {
      storyType: mapping.storyType,
      theme: mapping.theme,
      tone: mapping.tone,
      reasoning: `Based on current ${currentMood} mood and goal of ${emotionalGoal.replace('_', ' ')}`,
      expectedEmotionalImpact: mapping.expectedImpact,
      confidence,
      adaptations
    };
  }

  /**
   * Generate alternative recommendations
   */
  private async generateAlternativeRecommendations(context: MoodBasedRecommendationContext): Promise<StoryRecommendation[]> {
    const alternatives: StoryRecommendation[] = [];

    // Generate recommendation for different emotional goal
    const alternativeGoals = ['mood_improvement', 'emotional_processing', 'stress_relief', 'mood_maintenance']
      .filter(goal => goal !== context.emotionalGoal);

    for (const goal of alternativeGoals.slice(0, 2)) {
      const altContext = { ...context, emotionalGoal: goal as any };
      const altRecommendation = await this.generatePrimaryRecommendation(altContext);
      altRecommendation.confidence *= 0.8; // Lower confidence for alternatives
      alternatives.push(altRecommendation);
    }

    // Generate recommendation based on recent mood trends
    if (context.recentMoodHistory.length > 0) {
      const trendRecommendation = this.generateTrendBasedRecommendation(context);
      if (trendRecommendation) {
        alternatives.push(trendRecommendation);
      }
    }

    return alternatives;
  }

  /**
   * Apply user-specific adaptations to recommendations
   */
  private async applyUserAdaptations(
    recommendations: StoryRecommendation[],
    context: MoodBasedRecommendationContext
  ): Promise<StoryRecommendation[]> {
    return recommendations.map(rec => {
      const adaptedRec = { ...rec };

      // Adjust based on user preferences
      if (context.userPreferences.favoriteStoryTypes.includes(rec.storyType)) {
        adaptedRec.confidence *= 1.2;
      }

      if (context.userPreferences.avoidedThemes.some(theme => rec.theme.includes(theme))) {
        adaptedRec.confidence *= 0.7;
      }

      // Adjust based on tone preferences
      const toneResponse = context.userPreferences.responseToTones[rec.tone];
      if (toneResponse === 'positive') {
        adaptedRec.confidence *= 1.1;
      } else if (toneResponse === 'negative') {
        adaptedRec.confidence *= 0.8;
      }

      // Add session-specific adaptations
      const sessionAdaptations = this.generateSessionAdaptations(
        context.sessionContext,
        context.userPreferences
      );
      adaptedRec.adaptations.push(...sessionAdaptations);

      return adaptedRec;
    });
  }

  /**
   * Generate session-specific adaptations
   */
  private generateSessionAdaptations(
    sessionContext: SessionContext,
    userPreferences: UserPreferences
  ): StoryAdaptation[] {
    const adaptations: StoryAdaptation[] = [];

    // Pacing adaptations
    if (sessionContext.energyLevel === 'low') {
      adaptations.push({
        aspect: 'pacing',
        modification: 'Slower, more gentle pacing with longer pauses',
        reason: 'Low energy level detected'
      });
    } else if (sessionContext.energyLevel === 'high') {
      adaptations.push({
        aspect: 'pacing',
        modification: 'More dynamic pacing with engaging action',
        reason: 'High energy level detected'
      });
    }

    // Complexity adaptations
    if (sessionContext.attentionSpan < 5) {
      adaptations.push({
        aspect: 'complexity',
        modification: 'Simplified plot with fewer characters',
        reason: 'Short attention span requires simpler narratives'
      });
    }

    // Time-of-day adaptations
    if (sessionContext.timeOfDay === 'evening' || sessionContext.timeOfDay === 'night') {
      adaptations.push({
        aspect: 'conflict_level',
        modification: 'Lower conflict intensity for calming effect',
        reason: 'Evening/night sessions benefit from calmer content'
      });
    }

    // Session length adaptations
    if (sessionContext.sessionLength === 'short') {
      adaptations.push({
        aspect: 'resolution_style',
        modification: 'Quick, satisfying resolution',
        reason: 'Short session requires efficient story arc'
      });
    }

    return adaptations;
  }

  /**
   * Calculate recommendation confidence
   */
  private calculateRecommendationConfidence(
    context: MoodBasedRecommendationContext,
    mapping: any
  ): number {
    let confidence = 0.7; // Base confidence

    // Boost confidence if mood is consistent
    const recentMoods = context.recentMoodHistory.slice(-3);
    const consistentMood = recentMoods.every(entry => entry.mood === context.currentMood);
    if (consistentMood) {
      confidence += 0.1;
    }

    // Boost confidence if user has positive history with story type
    if (context.userPreferences.favoriteStoryTypes.includes(mapping.storyType)) {
      confidence += 0.15;
    }

    // Reduce confidence if user has negative history with tone
    const toneResponse = context.userPreferences.responseToTones[mapping.tone];
    if (toneResponse === 'negative') {
      confidence -= 0.2;
    } else if (toneResponse === 'positive') {
      confidence += 0.1;
    }

    return Math.min(0.95, Math.max(0.3, confidence));
  }

  /**
   * Generate trend-based recommendation
   */
  private generateTrendBasedRecommendation(context: MoodBasedRecommendationContext): StoryRecommendation | null {
    const recentMoods = context.recentMoodHistory.slice(-5);
    if (recentMoods.length < 3) return null;

    // Analyze mood trend
    const moodValues = {
      'sad': 1,
      'scared': 2,
      'angry': 2,
      'neutral': 3,
      'happy': 5
    };

    const values = recentMoods.map(entry => moodValues[entry.mood]);
    const trend = values[values.length - 1] - values[0];

    if (trend > 1) {
      // Improving trend - maintain momentum
      return {
        storyType: 'Milestones',
        theme: 'celebrating_progress',
        tone: 'energetic',
        reasoning: 'Mood trend shows improvement - reinforcing positive trajectory',
        expectedEmotionalImpact: 'Maintaining and building on recent emotional improvements',
        confidence: 0.75,
        adaptations: []
      };
    } else if (trend < -1) {
      // Declining trend - provide support
      return {
        storyType: 'Mental Health',
        theme: 'resilience_building',
        tone: 'uplifting',
        reasoning: 'Mood trend shows decline - providing supportive content',
        expectedEmotionalImpact: 'Halting negative trend and building emotional resilience',
        confidence: 0.8,
        adaptations: []
      };
    }

    return null;
  }

  // Additional helper methods for therapeutic pathways
  private determinePathwayName(targetEmotions: Mood[], therapeuticGoals: string[]): string {
    if (therapeuticGoals.includes('anxiety_reduction')) {
      return 'Courage and Calm Pathway';
    } else if (therapeuticGoals.includes('mood_improvement')) {
      return 'Hope and Healing Pathway';
    } else if (therapeuticGoals.includes('emotional_regulation')) {
      return 'Balance and Understanding Pathway';
    } else {
      return 'Growth and Discovery Pathway';
    }
  }

  private async generateTherapeuticProgression(
    currentState: Mood,
    targetEmotions: Mood[],
    goals: string[]
  ): Promise<TherapeuticStoryStep[]> {
    // Simplified implementation - would be more sophisticated in production
    return [];
  }

  private defineExpectedOutcomes(targetEmotions: Mood[], goals: string[]): string[] {
    return [
      'Improved emotional regulation',
      'Increased resilience',
      'Better coping strategies',
      'Enhanced self-awareness'
    ];
  }

  private calculatePathwayDuration(steps: TherapeuticStoryStep[], goals: string[]): number {
    return Math.max(5, steps.length); // Minimum 5 sessions
  }

  private defineAdaptationTriggers(targetEmotions: Mood[], goals: string[]): AdaptationTrigger[] {
    return [
      {
        condition: 'No improvement after 3 sessions',
        adaptation: 'Adjust story complexity and pacing',
        reasoning: 'May need simpler or more engaging content'
      },
      {
        condition: 'Negative emotional response',
        adaptation: 'Switch to more supportive themes',
        reasoning: 'Current approach may be too challenging'
      }
    ];
  }

  private async storeTherapeuticPathway(userId: string, pathway: TherapeuticStoryPathway): Promise<void> {
    // Implementation for storing pathway in database
  }

  private async storeEmotionalJourney(journey: EmotionalJourney): Promise<void> {
    // Implementation for storing journey in database
  }

  private async getCurrentJourney(userId: string): Promise<EmotionalJourney | null> {
    // Implementation for retrieving current journey
    return null;
  }

  private extractKeyInsights(
    emotionalResponse: Mood,
    engagementLevel: 'high' | 'medium' | 'low',
    feedback?: string
  ): string[] {
    const insights: string[] = [];
    
    if (engagementLevel === 'high') {
      insights.push('Strong engagement with therapeutic content');
    }
    
    if (emotionalResponse === 'happy') {
      insights.push('Positive emotional response to intervention');
    }
    
    return insights;
  }

  private async checkForAdaptations(journey: EmotionalJourney, progress: JourneyProgress): Promise<boolean> {
    // Check if adaptations are needed based on progress
    return false;
  }

  private async applyJourneyAdaptations(journey: EmotionalJourney, progress: JourneyProgress): Promise<void> {
    // Apply necessary adaptations to the journey
  }

  private async generateNextStepRecommendation(journey: EmotionalJourney): Promise<StoryRecommendation> {
    // Generate recommendation for next step in journey
    return {
      storyType: 'Educational',
      theme: 'growth',
      tone: 'neutral',
      reasoning: 'Next step in therapeutic journey',
      expectedEmotionalImpact: 'Continued progress',
      confidence: 0.8,
      adaptations: []
    };
  }

  private async updateEmotionalJourney(journey: EmotionalJourney): Promise<void> {
    // Update journey in database and cache
  }
}