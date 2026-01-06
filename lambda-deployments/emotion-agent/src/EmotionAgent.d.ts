import { Logger } from 'winston';
import { VoicePatternAnalysis } from './services/VoicePatternAnalyzer';
import { ResponseLatencyData, EngagementMetrics, EngagementPattern } from './services/ResponseLatencyAnalyzer';
import { StoryChoice, ChoicePattern, EmotionalChoiceCorrelation } from './services/StoryChoicePatternAnalyzer';
import { EmotionalTrendData } from './services/LongitudinalTrendTracker';
import { EarlyInterventionSignal, RiskAssessment } from './services/EarlyInterventionDetector';
import { StoryRecommendation, MoodBasedRecommendationContext, TherapeuticStoryPathway, EmotionalJourney } from './services/MoodBasedStoryRecommendationEngine';
import { CrisisIndicator, CrisisResponse, SafetyPlan } from './services/CrisisEscalationProtocol';
import { DailyCheckinRequest, DailyCheckinResult, LaughterDetectionRequest, EmotionUpdateRequest, PatternAnalysisRequest, ParentalReport, StoryRecommendationInfluence, AudioData } from './types';
import { Emotion, EmotionResult, EmotionPattern, SentimentResult, Mood, DateRange } from '@alexa-multi-agent/shared-types';
export interface EmotionAgentConfig {
    supabaseUrl: string;
    supabaseKey: string;
    redisUrl?: string;
    logLevel?: string;
}
export declare class EmotionAgent {
    private supabase;
    private redis?;
    private logger;
    private dailyCheckinService;
    private emotionDetectionService;
    private patternAnalysisService;
    private voicePatternAnalyzer;
    private responseLatencyAnalyzer;
    private storyChoicePatternAnalyzer;
    private longitudinalTrendTracker;
    private earlyInterventionDetector;
    private moodBasedRecommendationEngine;
    private crisisEscalationProtocol;
    constructor(config: EmotionAgentConfig, logger: Logger);
    /**
     * Perform daily emotional check-in for a user
     * Requirements: 7.1, 7.2, 4.4
     */
    performDailyCheckin(request: DailyCheckinRequest): Promise<DailyCheckinResult>;
    /**
     * Detect laughter from audio data during story sessions
     * Requirements: 7.2
     */
    detectLaughter(request: LaughterDetectionRequest): Promise<EmotionResult>;
    /**
     * Update user's emotional state when positive signals are detected
     * Requirements: 7.2, 7.4
     */
    updateEmotionalState(request: EmotionUpdateRequest): Promise<Emotion>;
    /**
     * Analyze emotion patterns over time for a user
     * Requirements: 7.3, 7.4
     */
    analyzeEmotionPatterns(request: PatternAnalysisRequest): Promise<EmotionPattern[]>;
    /**
     * Generate parental report for child's emotional trends
     * Requirements: 7.3, 7.4
     */
    generateParentalReport(userId: string, libraryId: string, timeRange: DateRange): Promise<ParentalReport>;
    /**
     * Analyze sentiment from story interaction transcripts
     * Requirements: 7.3, 7.4
     */
    analyzeSentiment(transcript: string): Promise<SentimentResult>;
    /**
     * Get story recommendation influence based on current emotional state
     * Requirements: 7.4
     */
    getStoryRecommendationInfluence(userId: string, libraryId?: string): Promise<StoryRecommendationInfluence>;
    /**
     * Get recent emotions for a user (for internal use by other agents)
     */
    getRecentEmotions(userId: string, libraryId?: string, limit?: number): Promise<Emotion[]>;
    /**
     * Check if user has completed daily check-in today
     */
    hasCompletedDailyCheckin(userId: string, libraryId?: string): Promise<boolean>;
    /**
     * Clean up expired emotion data (called by scheduled job)
     */
    cleanupExpiredData(): Promise<void>;
    /**
     * Analyze voice patterns for sophisticated emotion detection
     * Requirements: 7.1, 7.2, 7.3
     */
    analyzeVoicePatterns(audioData: AudioData): Promise<VoicePatternAnalysis>;
    /**
     * Record response latency for engagement analysis
     * Requirements: 7.1, 7.2
     */
    recordResponseLatency(data: ResponseLatencyData): Promise<void>;
    /**
     * Analyze engagement metrics for a user session
     * Requirements: 7.1, 7.2
     */
    analyzeEngagementMetrics(userId: string, sessionId: string): Promise<EngagementMetrics>;
    /**
     * Analyze engagement patterns over time
     * Requirements: 7.1, 7.3
     */
    analyzeEngagementPatterns(userId: string, timeRange: {
        start: string;
        end: string;
    }): Promise<EngagementPattern[]>;
    /**
     * Record story choice for pattern analysis
     * Requirements: 7.1, 7.2, 7.3
     */
    recordStoryChoice(choice: StoryChoice): Promise<void>;
    /**
     * Analyze story choice patterns for developmental insights
     * Requirements: 7.1, 7.2, 7.3
     */
    analyzeChoicePatterns(userId: string, timeRange?: {
        start: string;
        end: string;
    }): Promise<ChoicePattern[]>;
    /**
     * Analyze emotional correlations with story choices
     * Requirements: 7.1, 7.2, 7.3
     */
    analyzeEmotionalChoiceCorrelations(userId: string): Promise<EmotionalChoiceCorrelation[]>;
    /**
     * Analyze longitudinal emotional trends
     * Requirements: 7.1, 7.2, 7.3
     */
    analyzeLongitudinalTrends(userId: string, timeRange: DateRange): Promise<EmotionalTrendData>;
    /**
     * Detect comprehensive intervention triggers from all analysis sources
     * Requirements: 7.1, 7.2, 7.3
     */
    detectInterventionTriggers(userId: string, sessionId?: string): Promise<{
        interventionNeeded: boolean;
        triggers: Array<{
            source: 'latency' | 'choice_patterns' | 'voice_analysis' | 'longitudinal_trends';
            type: string;
            severity: 'low' | 'medium' | 'high';
            description: string;
            recommendations: string[];
        }>;
        overallRecommendations: string[];
    }>;
    /**
     * Generate comprehensive emotional intelligence report
     * Requirements: 7.1, 7.2, 7.3
     */
    generateEmotionalIntelligenceReport(userId: string, timeRange: DateRange): Promise<{
        summary: {
            overallTrend: string;
            dominantMood: Mood;
            engagementLevel: string;
            developmentalInsights: string[];
        };
        voiceAnalysis: {
            emotionalMarkers: number;
            stressIndicators: number;
            confidenceLevel: number;
        };
        choicePatterns: ChoicePattern[];
        engagementMetrics: {
            averageResponseTime: number;
            attentionSpan: number;
            fatigueIndicators: number;
        };
        longitudinalTrends: EmotionalTrendData;
        interventionRecommendations: string[];
    }>;
    /**
     * Get recent session IDs for a user (helper method)
     */
    private getRecentSessionIds;
    /**
     * Detect early intervention signals for proactive support
     * Requirements: 7.3, 7.4
     */
    detectEarlyInterventionSignals(userId: string): Promise<EarlyInterventionSignal[]>;
    /**
     * Perform comprehensive risk assessment
     * Requirements: 7.3, 7.4
     */
    performRiskAssessment(userId: string): Promise<RiskAssessment>;
    /**
     * Generate mood-based story recommendations
     * Requirements: 7.3, 7.4
     */
    generateMoodBasedRecommendations(context: MoodBasedRecommendationContext): Promise<StoryRecommendation[]>;
    /**
     * Create therapeutic story pathway for emotional support
     * Requirements: 7.3, 7.4
     */
    createTherapeuticPathway(userId: string, targetEmotions: Mood[], currentEmotionalState: Mood, therapeuticGoals: string[]): Promise<TherapeuticStoryPathway>;
    /**
     * Start emotional journey for a user
     * Requirements: 7.3, 7.4
     */
    startEmotionalJourney(userId: string, pathway: TherapeuticStoryPathway): Promise<EmotionalJourney>;
    /**
     * Progress emotional journey to next step
     * Requirements: 7.3, 7.4
     */
    progressEmotionalJourney(userId: string, emotionalResponse: Mood, engagementLevel: 'high' | 'medium' | 'low', sessionFeedback?: string): Promise<{
        journey: EmotionalJourney;
        nextRecommendation: StoryRecommendation;
        adaptationsNeeded: boolean;
    }>;
    /**
     * Detect crisis indicators and execute response protocol
     * Requirements: 7.3, 7.4
     */
    detectAndRespondToCrisis(userId: string, sessionId: string, analysisData: {
        voiceAnalysis?: any;
        textContent?: string;
        behavioralPatterns?: any;
        emotionalState?: Mood;
    }, context: {
        userAge?: number;
        parentContactInfo?: any;
        previousIncidents?: any[];
        sessionDuration: number;
        timeOfDay: string;
    }): Promise<{
        crisisDetected: boolean;
        crisisResponse?: CrisisResponse;
        immediateActions: string[];
    }>;
    /**
     * Create safety plan for user
     * Requirements: 7.3, 7.4
     */
    createSafetyPlan(userId: string, crisisIndicators: CrisisIndicator[], userAge?: number): Promise<SafetyPlan>;
    /**
     * Generate comprehensive predictive emotional support recommendations
     * Requirements: 7.3, 7.4
     */
    generatePredictiveEmotionalSupport(userId: string): Promise<{
        earlyInterventionSignals: EarlyInterventionSignal[];
        riskAssessment: RiskAssessment;
        storyRecommendations: StoryRecommendation[];
        therapeuticPathway?: TherapeuticStoryPathway;
        predictiveInsights: any;
        supportPlan: {
            immediateActions: string[];
            shortTermGoals: string[];
            longTermObjectives: string[];
            monitoringPlan: string[];
        };
    }>;
    /**
     * Helper method to create support plan
     */
    private createSupportPlan;
    /**
     * Helper method to get current time of day
     */
    private getTimeOfDay;
    /**
     * Close connections and cleanup resources
     */
    close(): Promise<void>;
}
//# sourceMappingURL=EmotionAgent.d.ts.map