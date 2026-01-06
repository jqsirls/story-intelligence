import { Logger } from 'winston';
import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
export interface EarlyInterventionSignal {
    signalType: 'emotional_decline' | 'behavioral_change' | 'engagement_drop' | 'stress_accumulation' | 'social_withdrawal';
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    detectedAt: string;
    indicators: InterventionIndicator[];
    predictedOutcome: string;
    timeToIntervention: number;
    recommendedActions: string[];
}
export interface InterventionIndicator {
    type: 'mood_pattern' | 'response_latency' | 'choice_pattern' | 'voice_analysis' | 'longitudinal_trend';
    value: number;
    threshold: number;
    description: string;
    weight: number;
}
export interface RiskAssessment {
    userId: string;
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: RiskFactor[];
    protectiveFactors: ProtectiveFactor[];
    interventionUrgency: 'none' | 'monitor' | 'schedule' | 'immediate';
    recommendedInterventions: InterventionRecommendation[];
    nextAssessmentDue: string;
}
export interface RiskFactor {
    factor: string;
    severity: 'low' | 'medium' | 'high';
    persistence: number;
    trend: 'improving' | 'stable' | 'worsening';
    impact: number;
    description: string;
}
export interface ProtectiveFactor {
    factor: string;
    strength: 'low' | 'medium' | 'high';
    consistency: number;
    trend: 'strengthening' | 'stable' | 'weakening';
    impact: number;
    description: string;
}
export interface InterventionRecommendation {
    type: 'immediate_support' | 'therapeutic_story' | 'parent_notification' | 'professional_referral' | 'environmental_change';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
    expectedOutcome: string;
    timeframe: string;
    resources: string[];
}
export interface PredictiveModel {
    modelType: 'emotional_trajectory' | 'behavioral_pattern' | 'engagement_forecast' | 'crisis_prediction';
    accuracy: number;
    lastTrained: string;
    features: string[];
    predictions: ModelPrediction[];
}
export interface ModelPrediction {
    timeHorizon: number;
    predictedState: string;
    confidence: number;
    factors: string[];
    interventionOpportunities: string[];
}
/**
 * Early intervention detection system for proactive emotional support
 * Requirements: 7.3, 7.4
 */
export declare class EarlyInterventionDetector {
    private supabase;
    private redis;
    private logger;
    constructor(supabase: SupabaseClient, redis: RedisClientType | undefined, logger: Logger);
    /**
     * Detect early intervention signals from multiple data sources
     */
    detectEarlyInterventionSignals(userId: string): Promise<EarlyInterventionSignal[]>;
    /**
     * Perform comprehensive risk assessment
     */
    performRiskAssessment(userId: string): Promise<RiskAssessment>;
    /**
     * Generate predictive insights using machine learning models
     */
    generatePredictiveInsights(userId: string): Promise<{
        models: PredictiveModel[];
        overallPrediction: {
            timeHorizon: number;
            predictedTrajectory: 'improving' | 'stable' | 'declining' | 'crisis_risk';
            confidence: number;
            keyFactors: string[];
        };
        interventionOpportunities: {
            optimal_timing: string[];
            high_impact_actions: string[];
            preventive_measures: string[];
        };
    }>;
    /**
     * Detect emotional decline patterns
     */
    private detectEmotionalDecline;
    /**
     * Detect behavioral changes in story choices and interactions
     */
    private detectBehavioralChanges;
    /**
     * Detect engagement drops from response latency patterns
     */
    private detectEngagementDrop;
    /**
     * Detect stress accumulation from voice analysis and response patterns
     */
    private detectStressAccumulation;
    /**
     * Detect social withdrawal patterns from story choices
     */
    private detectSocialWithdrawal;
    /**
     * Helper methods for pattern analysis
     */
    private analyzeChoicePatterns;
    private compareChoicePatterns;
    private calculateSocialScore;
    private identifyRiskFactors;
    private identifyProtectiveFactors;
    private calculateOverallRiskLevel;
    private determineInterventionUrgency;
    private generateInterventionRecommendations;
    private calculateNextAssessmentDate;
    private initializePredictiveModels;
    private generateModelPredictions;
    private combineModelPredictions;
    private identifyInterventionOpportunities;
}
//# sourceMappingURL=EarlyInterventionDetector.d.ts.map