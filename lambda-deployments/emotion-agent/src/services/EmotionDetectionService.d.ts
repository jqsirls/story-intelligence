import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { LaughterDetectionRequest, EmotionUpdateRequest } from '../types';
import { Emotion, EmotionResult, SentimentResult } from '@alexa-multi-agent/shared-types';
export declare class EmotionDetectionService {
    private supabase;
    private redis;
    private logger;
    constructor(supabase: SupabaseClient, redis: RedisClientType | undefined, logger: Logger);
    /**
     * Detect laughter from audio data during story creation sessions
     * Requirements: 7.2
     */
    detectLaughter(request: LaughterDetectionRequest): Promise<EmotionResult>;
    /**
     * Update user's emotional state when positive signals are detected
     * Requirements: 7.2, 7.4
     */
    updateEmotionalState(request: EmotionUpdateRequest): Promise<Emotion>;
    /**
     * Analyze sentiment from story interaction transcripts
     * Requirements: 7.3, 7.4
     */
    analyzeSentiment(transcript: string): Promise<SentimentResult>;
    /**
     * Analyze audio data for laughter patterns
     * This is a simplified implementation - in production would use ML models
     */
    private analyzAudioForLaughter;
    /**
     * Get recent mood for comparison
     */
    private getRecentMood;
    /**
     * Calculate mood improvement score
     */
    private calculateMoodImprovement;
    /**
     * Update story tone influence cache for real-time recommendations
     */
    private updateStoryToneInfluence;
    /**
     * Get recommended story tone based on mood
     */
    private getRecommendedTone;
    /**
     * Get recommended story types based on mood
     */
    private getRecommendedStoryTypes;
    /**
     * Perform sentiment analysis on transcript text
     */
    private performSentimentAnalysis;
    /**
     * Log audit event for compliance tracking
     */
    private logAuditEvent;
}
//# sourceMappingURL=EmotionDetectionService.d.ts.map