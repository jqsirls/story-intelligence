import { Logger } from 'winston';
import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Mood, DateRange } from '@alexa-multi-agent/shared-types';
export interface EmotionalTrendData {
    userId: string;
    timeRange: DateRange;
    dataPoints: EmotionalDataPoint[];
    trendAnalysis: TrendAnalysis;
    developmentalMilestones: DevelopmentalMilestone[];
    riskFactors: RiskFactor[];
    protectiveFactors: ProtectiveFactor[];
}
export interface EmotionalDataPoint {
    timestamp: string;
    mood: Mood;
    confidence: number;
    context: string;
    source: 'daily_checkin' | 'laughter_detection' | 'voice_analysis' | 'choice_pattern';
    sessionId?: string;
    storyId?: string;
}
export interface TrendAnalysis {
    overallTrend: 'improving' | 'declining' | 'stable' | 'volatile';
    trendStrength: number;
    significantChanges: SignificantChange[];
    seasonalPatterns: SeasonalPattern[];
    weeklyPatterns: WeeklyPattern[];
    correlations: EmotionalCorrelation[];
}
export interface SignificantChange {
    timestamp: string;
    changeType: 'improvement' | 'decline' | 'volatility_increase' | 'volatility_decrease';
    magnitude: number;
    duration: number;
    possibleCauses: string[];
    confidence: number;
}
export interface SeasonalPattern {
    pattern: 'seasonal_affective' | 'school_year_cycle' | 'holiday_impact' | 'weather_correlation';
    strength: number;
    description: string;
    predictedImpact: string[];
}
export interface WeeklyPattern {
    dayOfWeek: string;
    averageMood: Mood;
    moodVariability: number;
    typicalTrend: string;
    recommendations: string[];
}
export interface EmotionalCorrelation {
    factor: 'story_type' | 'time_of_day' | 'session_length' | 'choice_patterns' | 'response_latency';
    correlation: number;
    significance: number;
    description: string;
}
export interface DevelopmentalMilestone {
    milestone: string;
    achievedAt: string;
    significance: 'low' | 'medium' | 'high';
    description: string;
    supportingEvidence: string[];
}
export interface RiskFactor {
    factor: string;
    severity: 'low' | 'medium' | 'high';
    persistence: number;
    firstDetected: string;
    lastObserved: string;
    interventionRecommendations: string[];
}
export interface ProtectiveFactor {
    factor: string;
    strength: 'low' | 'medium' | 'high';
    consistency: number;
    firstObserved: string;
    reinforcementStrategies: string[];
}
/**
 * Tracks longitudinal emotional trends and developmental patterns
 * Requirements: 7.1, 7.2, 7.3
 */
export declare class LongitudinalTrendTracker {
    private supabase;
    private redis;
    private logger;
    constructor(supabase: SupabaseClient, redis: RedisClientType | undefined, logger: Logger);
    /**
     * Analyze comprehensive emotional trends for a user over time
     */
    analyzeEmotionalTrends(userId: string, timeRange: DateRange): Promise<EmotionalTrendData>;
    /**
     * Detect intervention triggers based on longitudinal patterns
     */
    detectLongitudinalInterventionTriggers(userId: string): Promise<{
        urgentTriggers: InterventionTrigger[];
        watchTriggers: InterventionTrigger[];
        recommendations: string[];
    }>;
    /**
     * Generate predictive insights based on historical patterns
     */
    generatePredictiveInsights(userId: string): Promise<{
        predictions: EmotionalPrediction[];
        confidence: number;
        timeHorizon: number;
        recommendations: string[];
    }>;
    /**
     * Gather all emotional data points from various sources
     */
    private gatherEmotionalDataPoints;
    /**
     * Perform comprehensive trend analysis
     */
    private performTrendAnalysis;
    /**
     * Calculate overall emotional trend
     */
    private calculateOverallTrend;
    /**
     * Calculate trend strength
     */
    private calculateTrendStrength;
    /**
     * Identify significant changes in emotional patterns
     */
    private identifySignificantChanges;
    /**
     * Analyze seasonal patterns in emotional data
     */
    private analyzeSeasonalPatterns;
    /**
     * Analyze weekly patterns in emotional data
     */
    private analyzeWeeklyPatterns;
    /**
     * Calculate emotional correlations with various factors
     */
    private calculateEmotionalCorrelations;
    /**
     * Helper methods
     */
    private determineDataSource;
    private calculateAverageMoodValue;
    private valueToMood;
    private calculateMoodVariability;
    private inferPossibleCauses;
    private calculateStoryTypeCorrelation;
    private calculateTimeOfDayCorrelation;
    private moodToValue;
    private calculateAverageForHours;
    private getMinimalTrendData;
    private identifyDevelopmentalMilestones;
    private detectRiskFactors;
    private identifyProtectiveFactors;
    private checkForUrgentTriggers;
    private checkForWatchTriggers;
    private generateLongitudinalRecommendations;
    private generateEmotionalPredictions;
    private calculatePredictionConfidence;
    private determineTimeHorizon;
    private generatePredictiveRecommendations;
}
interface InterventionTrigger {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendations: string[];
}
interface EmotionalPrediction {
    predictedMood: Mood;
    timeframe: string;
    confidence: number;
    factors: string[];
}
export {};
//# sourceMappingURL=LongitudinalTrendTracker.d.ts.map