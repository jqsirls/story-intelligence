import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { PatternAnalysisRequest, ParentalReport, StoryRecommendationInfluence } from '../types';
import { EmotionPattern, DateRange } from '@alexa-multi-agent/shared-types';
export declare class PatternAnalysisService {
    private supabase;
    private redis;
    private logger;
    constructor(supabase: SupabaseClient, redis: RedisClientType | undefined, logger: Logger);
    /**
     * Analyze emotion patterns over time ranges per sub-library
     * Requirements: 7.3, 7.4
     */
    analyzePatterns(request: PatternAnalysisRequest): Promise<EmotionPattern[]>;
    /**
     * Generate parental report showing child's emotional trends
     * Requirements: 7.3, 7.4
     */
    generateParentalReport(userId: string, libraryId: string, timeRange: DateRange): Promise<ParentalReport>;
    /**
     * Get story recommendation influence based on current emotional state
     * Requirements: 7.4
     */
    getStoryRecommendationInfluence(userId: string, libraryId?: string): Promise<StoryRecommendationInfluence>;
    /**
     * Get emotions within a specific time range
     */
    private getEmotionsInRange;
    /**
     * Group emotions by time period (daily, weekly)
     */
    private groupEmotionsByPeriod;
    /**
     * Calculate mood distribution across emotions
     */
    private calculateMoodDistribution;
    /**
     * Generate emotion trends from grouped data
     */
    private generateTrends;
    /**
     * Generate insights from emotion data
     */
    private generateInsights;
    /**
     * Generate parental insights from emotion patterns
     */
    private generateParentalInsights;
    /**
     * Generate parental recommendations
     */
    private generateParentalRecommendations;
    /**
     * Get recommended story tone based on current mood and patterns
     */
    private getRecommendedTone;
    /**
     * Get recommended story types based on mood and patterns
     */
    private getRecommendedStoryTypes;
    /**
     * Generate reasoning for story recommendations
     */
    private generateRecommendationReasoning;
}
//# sourceMappingURL=PatternAnalysisService.d.ts.map