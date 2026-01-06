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
    attentionSpan: number;
    previousSessionOutcome?: 'positive' | 'neutral' | 'negative';
}
export interface UserPreferences {
    favoriteStoryTypes: string[];
    preferredCharacterTraits: string[];
    avoidedThemes: string[];
    responseToTones: Record<string, 'positive' | 'neutral' | 'negative'>;
    optimalSessionLength: number;
}
export interface TherapeuticStoryPathway {
    pathwayName: string;
    targetEmotions: Mood[];
    storyProgression: TherapeuticStoryStep[];
    expectedOutcomes: string[];
    duration: number;
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
    emotionalImprovement: number;
    engagementImprovement: number;
    behavioralChanges: string[];
    parentFeedback?: string;
}
/**
 * Mood-based story recommendation engine with therapeutic pathways
 * Requirements: 7.3, 7.4
 */
export declare class MoodBasedStoryRecommendationEngine {
    private supabase;
    private redis;
    private logger;
    constructor(supabase: SupabaseClient, redis: RedisClientType | undefined, logger: Logger);
    /**
     * Generate mood-based story recommendations
     */
    generateMoodBasedRecommendations(context: MoodBasedRecommendationContext): Promise<StoryRecommendation[]>;
    /**
     * Create therapeutic story pathway for emotional support
     */
    createTherapeuticPathway(userId: string, targetEmotions: Mood[], currentEmotionalState: Mood, therapeuticGoals: string[]): Promise<TherapeuticStoryPathway>;
    /**
     * Start emotional journey for a user
     */
    startEmotionalJourney(userId: string, pathway: TherapeuticStoryPathway): Promise<EmotionalJourney>;
    /**
     * Progress emotional journey to next step
     */
    progressEmotionalJourney(userId: string, emotionalResponse: Mood, engagementLevel: 'high' | 'medium' | 'low', sessionFeedback?: string): Promise<{
        journey: EmotionalJourney;
        nextRecommendation: StoryRecommendation;
        adaptationsNeeded: boolean;
    }>;
    /**
     * Generate primary recommendation based on mood and goal
     */
    private generatePrimaryRecommendation;
    /**
     * Generate alternative recommendations
     */
    private generateAlternativeRecommendations;
    /**
     * Apply user-specific adaptations to recommendations
     */
    private applyUserAdaptations;
    /**
     * Generate session-specific adaptations
     */
    private generateSessionAdaptations;
    /**
     * Calculate recommendation confidence
     */
    private calculateRecommendationConfidence;
    /**
     * Generate trend-based recommendation
     */
    private generateTrendBasedRecommendation;
    private determinePathwayName;
    private generateTherapeuticProgression;
    private defineExpectedOutcomes;
    private calculatePathwayDuration;
    private defineAdaptationTriggers;
    private storeTherapeuticPathway;
    private storeEmotionalJourney;
    private getCurrentJourney;
    private extractKeyInsights;
    private checkForAdaptations;
    private applyJourneyAdaptations;
    private generateNextStepRecommendation;
    private updateEmotionalJourney;
}
//# sourceMappingURL=MoodBasedStoryRecommendationEngine.d.ts.map