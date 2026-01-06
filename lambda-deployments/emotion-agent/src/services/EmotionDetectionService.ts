import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { 
  LaughterDetectionRequest, 
  EmotionUpdateRequest, 
  AudioData 
} from '../types';
import { 
  Emotion, 
  EmotionResult, 
  SentimentResult, 
  Mood 
} from '@alexa-multi-agent/shared-types';

export class EmotionDetectionService {
  constructor(
    private supabase: SupabaseClient,
    private redis: RedisClientType | undefined,
    private logger: Logger
  ) {}

  /**
   * Detect laughter from audio data during story creation sessions
   * Requirements: 7.2
   */
  async detectLaughter(request: LaughterDetectionRequest): Promise<EmotionResult> {
    const { audioData, userId, sessionId, context } = request;

    try {
      // Analyze audio for laughter patterns
      const laughterDetected = await this.analyzAudioForLaughter(audioData);

      if (laughterDetected.detected) {
        // Update emotional state with positive signal
        await this.updateEmotionalState({
          userId,
          mood: 'happy',
          confidence: laughterDetected.confidence,
          context: {
            type: 'laughter_detection',
            sessionId,
            audioMetadata: {
              duration: audioData.duration,
              format: audioData.format,
              sampleRate: audioData.sampleRate
            },
            detectionContext: context,
            timestamp: new Date().toISOString()
          }
        });

        // Cache positive emotion signal for story tone influence
        if (this.redis) {
          const cacheKey = `emotion_signal:${userId}:${sessionId}`;
          await this.redis.setEx(cacheKey, 3600, JSON.stringify({
            mood: 'happy',
            confidence: laughterDetected.confidence,
            timestamp: new Date().toISOString(),
            source: 'laughter_detection'
          }));
        }

        this.logger.info('Laughter detected and emotion updated', {
          userId,
          sessionId,
          confidence: laughterDetected.confidence
        });
      }

      return {
        detected: laughterDetected.detected ? [{
          mood: 'happy',
          confidence: laughterDetected.confidence,
          createdAt: new Date().toISOString(),
          context: { type: 'laughter_detection' }
        }] : [],
        primary: laughterDetected.detected ? {
          mood: 'happy',
          confidence: laughterDetected.confidence,
          createdAt: new Date().toISOString(),
          context: { type: 'laughter_detection' }
        } : undefined
      };

    } catch (error) {
      this.logger.error('Error detecting laughter:', error);
      throw error;
    }
  }

  /**
   * Update user's emotional state when positive signals are detected
   * Requirements: 7.2, 7.4
   */
  async updateEmotionalState(request: EmotionUpdateRequest): Promise<Emotion> {
    const { userId, libraryId, mood, confidence, context, sessionId } = request;

    try {
      // Validate UUIDs - if not valid UUIDs, skip database save but still return emotion data
      const isValidUUID = (str: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      const userIdIsValid = userId && isValidUUID(userId);
      const libraryIdIsValid = !libraryId || isValidUUID(libraryId);

      // If user ID is not a valid UUID, return emotion data without saving to database
      if (!userIdIsValid || !libraryIdIsValid) {
        this.logger.warn('Skipping database save - invalid UUID format', {
          userId,
          libraryId,
          userIdIsValid,
          libraryIdIsValid
        });

        // Return emotion data without database ID
        return {
          id: `temp-${Date.now()}`,
          userId: userId,
          libraryId: libraryId || undefined,
          mood,
          confidence,
          context: {
            ...context,
            sessionId,
            timestamp: new Date().toISOString(),
            saved: false,
            reason: 'Invalid UUID format'
          },
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        };
      }

      // Check for mood improvement tracking
      const previousMood = await this.getRecentMood(userId, libraryId);
      const moodImprovement = this.calculateMoodImprovement(previousMood, mood);

      // Create emotion record
      const emotionData = {
        user_id: userId,
        library_id: libraryId,
        mood,
        confidence,
        context: {
          ...context,
          sessionId,
          moodImprovement,
          previousMood: previousMood?.mood,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      const { data, error } = await this.supabase
        .from('emotions')
        .insert(emotionData)
        .select()
        .single();

      if (error) {
        // Handle foreign key constraint (user doesn't exist) gracefully
        if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
          this.logger.warn('Skipping database save - user does not exist in users table', {
            userId,
            error: error.message
          });
          
          // Return emotion data without database ID
          return {
            id: `temp-${Date.now()}`,
            userId: userId,
            libraryId: libraryId || undefined,
            mood,
            confidence,
            context: {
              ...context,
              sessionId,
              timestamp: new Date().toISOString(),
              saved: false,
              reason: 'User not found in database'
            },
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          };
        }
        throw error;
      }

      // Update story tone influence cache
      if (sessionId) {
        await this.updateStoryToneInfluence(userId, sessionId, mood, confidence);
      }

      // Log audit event
      await this.logAuditEvent(userId, 'emotion_updated', {
        mood,
        confidence,
        libraryId,
        sessionId,
        moodImprovement,
        source: context?.type || 'manual_update'
      });

      return {
        id: data.id,
        userId: data.user_id,
        libraryId: data.library_id,
        mood: data.mood,
        confidence: data.confidence,
        context: data.context,
        createdAt: data.created_at,
        expiresAt: data.expires_at
      };

    } catch (error) {
      this.logger.error('Error updating emotional state:', error);
      throw error;
    }
  }

  /**
   * Analyze sentiment from story interaction transcripts
   * Requirements: 7.3, 7.4
   */
  async analyzeSentiment(transcript: string): Promise<SentimentResult> {
    try {
      // Simple keyword-based sentiment analysis
      // In production, this would use a more sophisticated NLP service
      const sentimentAnalysis = this.performSentimentAnalysis(transcript);
      
      return sentimentAnalysis;
    } catch (error) {
      this.logger.error('Error analyzing sentiment:', error);
      throw error;
    }
  }

  /**
   * Analyze audio data for laughter patterns
   * This is a simplified implementation - in production would use ML models
   */
  private async analyzAudioForLaughter(audioData: AudioData): Promise<{ detected: boolean; confidence: number }> {
    // Simplified laughter detection based on audio characteristics
    // In production, this would use ML models trained on laughter detection
    
    const { duration, sampleRate } = audioData;
    
    // Basic heuristics for laughter detection
    let confidence = 0;
    let detected = false;

    // Check duration (laughter typically 0.5-3 seconds)
    if (duration >= 0.5 && duration <= 3.0) {
      confidence += 0.3;
    }

    // Check sample rate (higher sample rates better for laughter detection)
    if (sampleRate >= 16000) {
      confidence += 0.2;
    }

    // Simulate audio analysis (in production, would analyze frequency patterns)
    // For now, we'll use a random factor to simulate detection
    const audioAnalysisScore = Math.random();
    if (audioAnalysisScore > 0.7) {
      confidence += 0.5;
      detected = true;
    }

    // Ensure confidence is within bounds
    confidence = Math.min(confidence, 0.9);
    
    return { detected, confidence };
  }

  /**
   * Get recent mood for comparison
   */
  private async getRecentMood(userId: string, libraryId?: string): Promise<Emotion | null> {
    // Validate UUIDs before querying database
    const isValidUUID = (str: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    if (!userId || !isValidUUID(userId)) {
      this.logger.warn('Skipping database query - invalid UUID format', { userId });
      return null;
    }

    if (libraryId && !isValidUUID(libraryId)) {
      this.logger.warn('Skipping library filter - invalid UUID format', { libraryId });
      libraryId = undefined; // Don't filter by library if invalid
    }

    let query = this.supabase
      .from('emotions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (libraryId) {
      query = query.eq('library_id', libraryId);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Error getting recent mood:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const emotion = data[0];
    return {
      id: emotion.id,
      userId: emotion.user_id,
      libraryId: emotion.library_id,
      mood: emotion.mood,
      confidence: emotion.confidence,
      context: emotion.context,
      createdAt: emotion.created_at,
      expiresAt: emotion.expires_at
    };
  }

  /**
   * Calculate mood improvement score
   */
  private calculateMoodImprovement(previousMood: Emotion | null, currentMood: Mood): number {
    if (!previousMood) {
      return 0;
    }

    const moodValues = {
      'sad': 1,
      'scared': 2,
      'angry': 2,
      'neutral': 3,
      'happy': 5
    };

    const previousValue = ({ happy: 5, sad: 1, scared: 2, angry: 2, neutral: 3 } as Record<Mood, number>)[previousMood.mood as Mood];
    const currentValue = ({ happy: 5, sad: 1, scared: 2, angry: 2, neutral: 3 } as Record<Mood, number>)[currentMood];

    return currentValue - previousValue;
  }

  /**
   * Update story tone influence cache for real-time recommendations
   */
  private async updateStoryToneInfluence(userId: string, sessionId: string, mood: Mood, confidence: number): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const influenceData = {
        mood,
        confidence,
        timestamp: new Date().toISOString(),
        recommendedTone: this.getRecommendedTone(mood),
        storyTypes: this.getRecommendedStoryTypes(mood)
      };

      const cacheKey = `story_tone_influence:${userId}:${sessionId}`;
      await this.redis.setEx(cacheKey, 1800, JSON.stringify(influenceData)); // 30 minutes TTL

      // Also update user's general mood cache
      const userMoodKey = `current_mood:${userId}`;
      await this.redis.setEx(userMoodKey, 3600, JSON.stringify({
        mood,
        confidence,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      this.logger.error('Error updating story tone influence cache:', error);
      // Don't throw - cache failure shouldn't break the main flow
    }
  }

  /**
   * Get recommended story tone based on mood
   */
  private getRecommendedTone(mood: Mood): 'uplifting' | 'calming' | 'energetic' | 'gentle' | 'neutral' {
    const toneMap: Record<Mood, 'uplifting' | 'calming' | 'energetic' | 'gentle' | 'neutral'> = {
      happy: 'energetic',
      sad: 'uplifting',
      scared: 'calming',
      angry: 'gentle',
      neutral: 'neutral'
    };

    return toneMap[mood];
  }

  /**
   * Get recommended story types based on mood
   */
  private getRecommendedStoryTypes(mood: Mood): string[] {
    const storyTypeMap: Record<Mood, string[]> = {
      happy: ['Adventure', 'Birthday', 'Milestones'],
      sad: ['Mental Health', 'Bedtime', 'New Chapter Sequel'],
      scared: ['Medical Bravery', 'Mental Health', 'Bedtime'],
      angry: ['Mental Health', 'Educational', 'Bedtime'],
      neutral: ['Educational', 'Adventure', 'Language Learning']
    };

    return storyTypeMap[mood] || ['Educational'];
  }

  /**
   * Perform sentiment analysis on transcript text
   */
  private performSentimentAnalysis(transcript: string): SentimentResult {
    const positiveWords = [
      'happy', 'joy', 'love', 'excited', 'wonderful', 'amazing', 'great', 'awesome',
      'fun', 'laugh', 'smile', 'good', 'best', 'fantastic', 'brilliant', 'perfect'
    ];

    const negativeWords = [
      'sad', 'angry', 'hate', 'terrible', 'awful', 'bad', 'worst', 'horrible',
      'scared', 'worried', 'upset', 'disappointed', 'frustrated', 'annoyed'
    ];

    const words = transcript.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    const detectedEmotions: Mood[] = [];

    words.forEach(word => {
      if (positiveWords.includes(word)) {
        positiveScore++;
        if (!detectedEmotions.includes('happy')) {
          detectedEmotions.push('happy');
        }
      }
      if (negativeWords.includes(word)) {
        negativeScore++;
        // Add specific negative emotions based on keywords
        if (['sad', 'cry', 'upset'].includes(word) && !detectedEmotions.includes('sad')) {
          detectedEmotions.push('sad');
        }
        if (['angry', 'mad', 'hate'].includes(word) && !detectedEmotions.includes('angry')) {
          detectedEmotions.push('angry');
        }
        if (['scared', 'afraid', 'worried'].includes(word) && !detectedEmotions.includes('scared')) {
          detectedEmotions.push('scared');
        }
      }
    });

    let sentiment: 'positive' | 'negative' | 'neutral';
    let confidence: number;

    if (positiveScore > negativeScore) {
      sentiment = 'positive';
      confidence = Math.min(0.9, 0.5 + (positiveScore / words.length) * 0.4);
    } else if (negativeScore > positiveScore) {
      sentiment = 'negative';
      confidence = Math.min(0.9, 0.5 + (negativeScore / words.length) * 0.4);
    } else {
      sentiment = 'neutral';
      confidence = 0.5;
    }

    if (detectedEmotions.length === 0) {
      detectedEmotions.push('neutral');
    }

    return {
      sentiment,
      confidence,
      score: confidence,
      emotions: detectedEmotions.map(m => ({ mood: m }))
    };
  }

  /**
   * Log audit event for compliance tracking
   */
  private async logAuditEvent(userId: string, action: string, payload: Record<string, any>): Promise<void> {
    try {
      await this.supabase.rpc('log_audit_event_enhanced', {
        p_agent_name: 'EmotionAgent',
        p_action: action,
        p_payload: payload,
        p_session_id: payload.sessionId,
        p_correlation_id: `emotion_${Date.now()}`
      });
    } catch (error) {
      this.logger.error('Failed to log audit event:', error);
      // Don't throw - audit logging failure shouldn't break the main flow
    }
  }
}