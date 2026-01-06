import { Logger } from 'winston';
import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
export interface ResponseLatencyData {
    userId: string;
    sessionId: string;
    questionType: 'character_trait' | 'story_choice' | 'emotional_checkin' | 'general';
    question: string;
    responseTime: number;
    timestamp: string;
    context?: Record<string, any>;
}
export interface EngagementMetrics {
    averageResponseTime: number;
    responseTimeVariance: number;
    engagementLevel: 'high' | 'medium' | 'low';
    attentionSpan: number;
    fatigueIndicators: FatigueIndicator[];
    recommendations: string[];
}
export interface FatigueIndicator {
    type: 'increasing_latency' | 'inconsistent_responses' | 'shortened_answers' | 'distraction_signs';
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    detectedAt: string;
    description: string;
}
export interface EngagementPattern {
    userId: string;
    sessionId: string;
    timeRange: {
        start: string;
        end: string;
    };
    totalInteractions: number;
    averageLatency: number;
    engagementTrend: 'improving' | 'declining' | 'stable';
    optimalInteractionTime: number;
    fatigueOnsetTime?: number;
}
/**
 * Analyzes response latency patterns to measure engagement and detect fatigue
 * Requirements: 7.1, 7.2, 7.3
 */
export declare class ResponseLatencyAnalyzer {
    private supabase;
    private redis;
    private logger;
    constructor(supabase: SupabaseClient, redis: RedisClientType | undefined, logger: Logger);
    /**
     * Record response latency data for analysis
     */
    recordResponseLatency(data: ResponseLatencyData): Promise<void>;
    /**
     * Analyze engagement metrics for a user session
     */
    analyzeEngagementMetrics(userId: string, sessionId: string): Promise<EngagementMetrics>;
    /**
     * Analyze engagement patterns over time for a user
     */
    analyzeEngagementPatterns(userId: string, timeRange: {
        start: string;
        end: string;
    }): Promise<EngagementPattern[]>;
    /**
     * Detect intervention triggers for distress or disengagement
     */
    detectInterventionTriggers(userId: string, sessionId: string): Promise<{
        interventionNeeded: boolean;
        triggerType: 'fatigue' | 'distress' | 'disengagement' | 'confusion';
        severity: 'low' | 'medium' | 'high';
        recommendations: string[];
    }>;
    /**
     * Get session latency data from database
     */
    private getSessionLatencyData;
    /**
     * Analyze real-time engagement during active session
     */
    private analyzeRealTimeEngagement;
    /**
     * Calculate variance of response times
     */
    private calculateVariance;
    /**
     * Determine engagement level based on response metrics
     */
    private determineEngagementLevel;
    /**
     * Estimate attention span based on response patterns
     */
    private estimateAttentionSpan;
    /**
     * Detect fatigue indicators from latency patterns
     */
    private detectFatigueIndicators;
    /**
     * Generate engagement recommendations
     */
    private generateEngagementRecommendations;
    /**
     * Group session data by session ID
     */
    private groupBySession;
    /**
     * Analyze engagement pattern for a single session
     */
    private analyzeSessionPattern;
    /**
     * Calculate optimal interaction time based on response consistency
     */
    private calculateOptimalInteractionTime;
    /**
     * Detect when fatigue onset occurs in a session
     */
    private detectFatigueOnset;
    /**
     * Get default engagement metrics when no data is available
     */
    private getDefaultEngagementMetrics;
}
//# sourceMappingURL=ResponseLatencyAnalyzer.d.ts.map