import { Emotion, EmotionResult, EmotionPattern, EmotionTrend, SentimentResult, Mood, DateRange } from '@alexa-multi-agent/shared-types';
export interface DailyCheckinRequest {
    userId: string;
    libraryId?: string;
    sessionId?: string;
    responses: CheckinResponse[];
}
export interface CheckinResponse {
    question: string;
    answer: string;
    mood?: Mood;
    confidence?: number;
}
export interface DailyCheckinResult {
    success: boolean;
    emotion: Emotion;
    alreadyCompletedToday: boolean;
    nextCheckinAvailable: string;
}
export interface LaughterDetectionRequest {
    audioData: AudioData;
    userId: string;
    sessionId: string;
    context?: Record<string, any>;
}
export interface AudioData {
    buffer: Buffer;
    format: 'wav' | 'mp3' | 'ogg';
    sampleRate: number;
    duration: number;
}
export interface EmotionUpdateRequest {
    userId: string;
    libraryId?: string;
    mood: Mood;
    confidence: number;
    context?: Record<string, any>;
    sessionId?: string;
}
export interface PatternAnalysisRequest {
    userId: string;
    libraryId?: string;
    timeRange: DateRange;
    includeAnonymized?: boolean;
}
export interface ParentalReport {
    childId: string;
    libraryId: string;
    timeRange: DateRange;
    emotionalTrends: EmotionTrend[];
    insights: ParentalInsight[];
    recommendations: string[];
    privacyCompliant: boolean;
}
export interface ParentalInsight {
    type: 'mood_improvement' | 'mood_decline' | 'pattern_detected' | 'milestone_reached';
    description: string;
    confidence: number;
    actionable: boolean;
    recommendation?: string;
}
export interface StoryRecommendationInfluence {
    userId: string;
    currentMood: Mood;
    recentPatterns: EmotionPattern[];
    recommendedTone: 'uplifting' | 'calming' | 'energetic' | 'gentle' | 'neutral';
    storyTypes: string[];
    reasoning: string;
}
export type { VoicePatternAnalysis, VoiceCharacteristics, EmotionalMarker, StressIndicator } from './services/VoicePatternAnalyzer';
export type { ResponseLatencyData, EngagementMetrics, FatigueIndicator, EngagementPattern } from './services/ResponseLatencyAnalyzer';
export type { StoryChoice, ChoicePattern, EmotionalChoiceCorrelation, LongitudinalTrend } from './services/StoryChoicePatternAnalyzer';
export type { EmotionalTrendData, EmotionalDataPoint, TrendAnalysis, SignificantChange, SeasonalPattern, WeeklyPattern, EmotionalCorrelation, DevelopmentalMilestone, RiskFactor } from './services/LongitudinalTrendTracker';
export type { EarlyInterventionSignal, InterventionIndicator, RiskAssessment, RiskFactor as EarlyRiskFactor, ProtectiveFactor, InterventionRecommendation, PredictiveModel, ModelPrediction } from './services/EarlyInterventionDetector';
export type { StoryRecommendation, StoryAdaptation, MoodBasedRecommendationContext, MoodHistoryEntry, SessionContext, UserPreferences, TherapeuticStoryPathway, TherapeuticStoryStep, AdaptationTrigger, EmotionalJourney, JourneyProgress, JourneyAdaptation, JourneyOutcome } from './services/MoodBasedStoryRecommendationEngine';
export type { CrisisIndicator, CrisisContext, ContactInfo, PreviousIncident, EscalationAction, CrisisResponse, ParentNotification, ProfessionalReferral, FollowUpSchedule, SafetyPlan } from './services/CrisisEscalationProtocol';
export type { Emotion, EmotionResult, EmotionPattern, EmotionTrend, SentimentResult, Mood, DateRange };
//# sourceMappingURL=types.d.ts.map