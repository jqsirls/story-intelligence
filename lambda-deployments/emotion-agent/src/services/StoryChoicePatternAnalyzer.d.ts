import { Logger } from 'winston';
import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Mood } from '@alexa-multi-agent/shared-types';
export interface StoryChoice {
    userId: string;
    sessionId: string;
    storyId: string;
    choicePoint: string;
    choiceOptions: string[];
    selectedChoice: string;
    responseTime: number;
    emotionalContext?: Mood;
    timestamp: string;
}
export interface ChoicePattern {
    userId: string;
    patternType: 'risk_taking' | 'safety_seeking' | 'creative_exploration' | 'social_preference' | 'problem_solving';
    frequency: number;
    confidence: number;
    examples: string[];
    emotionalCorrelation?: {
        mood: Mood;
        correlation: number;
    };
    developmentalInsights: string[];
}
export interface EmotionalChoiceCorrelation {
    mood: Mood;
    preferredChoiceTypes: string[];
    avoidedChoiceTypes: string[];
    responseTimePattern: 'faster' | 'slower' | 'normal';
    confidence: number;
}
export interface LongitudinalTrend {
    userId: string;
    timeRange: {
        start: string;
        end: string;
    };
    trendType: 'increasing_confidence' | 'decreasing_confidence' | 'changing_preferences' | 'stable_patterns';
    description: string;
    significance: number;
    recommendations: string[];
}
/**
 * Analyzes story choice patterns to understand emotional preferences and development
 * Requirements: 7.1, 7.2, 7.3
 */
export declare class StoryChoicePatternAnalyzer {
    private supabase;
    private redis;
    private logger;
    constructor(supabase: SupabaseClient, redis: RedisClientType | undefined, logger: Logger);
    /**
     * Record a story choice for pattern analysis
     */
    recordStoryChoice(choice: StoryChoice): Promise<void>;
    /**
     * Analyze choice patterns for a user
     */
    analyzeChoicePatterns(userId: string, timeRange?: {
        start: string;
        end: string;
    }): Promise<ChoicePattern[]>;
    /**
     * Analyze emotional correlations with story choices
     */
    analyzeEmotionalChoiceCorrelations(userId: string): Promise<EmotionalChoiceCorrelation[]>;
    /**
     * Track longitudinal emotional trends through choice patterns
     */
    trackLongitudinalTrends(userId: string, timeRange: {
        start: string;
        end: string;
    }): Promise<LongitudinalTrend[]>;
    /**
     * Detect intervention triggers based on choice patterns
     */
    detectChoiceBasedInterventionTriggers(userId: string): Promise<{
        interventionNeeded: boolean;
        triggerType: 'emotional_distress' | 'developmental_concern' | 'behavioral_pattern';
        severity: 'low' | 'medium' | 'high';
        description: string;
        recommendations: string[];
    }>;
    /**
     * Get user choices from database
     */
    private getUserChoices;
    /**
     * Update choice pattern cache for real-time analysis
     */
    private updateChoicePatternCache;
    /**
     * Trigger pattern analysis if enough data is available
     */
    private triggerPatternAnalysisIfReady;
    /**
     * Analyze risk-taking patterns in choices
     */
    private analyzeRiskTakingPatterns;
    /**
     * Analyze safety-seeking patterns in choices
     */
    private analyzeSafetySeekingPatterns;
    /**
     * Analyze creative exploration patterns
     */
    private analyzeCreativeExplorationPatterns;
    /**
     * Analyze social preference patterns
     */
    private analyzeSocialPreferencePatterns;
    /**
     * Analyze problem-solving patterns
     */
    private analyzeProblemSolvingPatterns;
    /**
     * Group choices by emotional context
     */
    private groupChoicesByMood;
    /**
     * Calculate emotional correlation for a specific mood
     */
    private calculateEmotionalCorrelation;
    /**
     * Categorize choices into preferred and avoided types
     */
    private categorizeChoices;
    /**
     * Calculate choice consistency for confidence scoring
     */
    private calculateChoiceConsistency;
    /**
     * Analyze confidence trend over time
     */
    private analyzeConfidenceTrend;
    /**
     * Analyze preference changes over time
     */
    private analyzePreferenceChanges;
    /**
     * Analyze emotional development through choices
     */
    private analyzeEmotionalDevelopment;
    /**
     * Calculate emotional complexity score
     */
    private calculateEmotionalComplexity;
    /**
     * Identify concerning patterns that may need intervention
     */
    private identifyConcerningPatterns;
}
//# sourceMappingURL=StoryChoicePatternAnalyzer.d.ts.map