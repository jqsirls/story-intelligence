import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { 
  DailyCheckinRequest, 
  DailyCheckinResult, 
  CheckinResponse 
} from '../types';
import { Emotion, Mood } from '@alexa-multi-agent/shared-types';

export class DailyCheckinService {
  constructor(
    private supabase: SupabaseClient,
    private redis: RedisClientType | undefined,
    private logger: Logger
  ) {}

  /**
   * Perform daily emotional check-in for a user
   * Requirements: 7.1, 7.2, 4.4
   */
  async performCheckin(request: DailyCheckinRequest): Promise<DailyCheckinResult> {
    const { userId, libraryId, sessionId, responses } = request;

    // Check if user has already completed check-in today
    const alreadyCompleted = await this.hasCompletedToday(userId, libraryId);
    
    if (alreadyCompleted) {
      const nextAvailable = this.getNextCheckinTime();
      return {
        success: false,
        emotion: {} as Emotion, // Will be populated with today's existing emotion
        alreadyCompletedToday: true,
        nextCheckinAvailable: nextAvailable
      };
    }

    // Analyze responses to determine mood and confidence
    const { mood, confidence } = this.analyzCheckinResponses(responses);

    // Create emotion record with 365-day TTL
    const emotion = await this.createEmotionRecord({
      userId,
      libraryId,
      mood,
      confidence,
      context: {
        type: 'daily_checkin',
        sessionId,
        responses: responses.map(r => ({
          question: r.question,
          answer: r.answer
        })),
        timestamp: new Date().toISOString()
      }
    });

    // Cache the completion status in Redis for quick lookup
    if (this.redis) {
      const cacheKey = this.getDailyCheckinCacheKey(userId, libraryId);
      await this.redis.setEx(cacheKey, 86400, 'completed'); // 24 hour TTL
    }

    // Log audit event for compliance
    await this.logAuditEvent(userId, 'daily_checkin_completed', {
      mood,
      confidence,
      libraryId,
      sessionId
    });

    const nextAvailable = this.getNextCheckinTime();

    return {
      success: true,
      emotion,
      alreadyCompletedToday: false,
      nextCheckinAvailable: nextAvailable
    };
  }

  /**
   * Check if user has completed daily check-in today
   */
  async hasCompletedToday(userId: string, libraryId?: string): Promise<boolean> {
    // First check Redis cache for quick lookup
    if (this.redis) {
      const cacheKey = this.getDailyCheckinCacheKey(userId, libraryId);
      const cached = await this.redis.get(cacheKey);
      if (cached === 'completed') {
        return true;
      }
    }

    // Check database for today's check-in
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let query = this.supabase
      .from('emotions')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .eq('context->>type', 'daily_checkin');

    if (libraryId) {
      query = query.eq('library_id', libraryId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      this.logger.error('Error checking daily check-in status:', error);
      throw error;
    }

    const hasCompleted = data && data.length > 0;

    // Update cache if not completed
    if (!hasCompleted && this.redis) {
      const cacheKey = this.getDailyCheckinCacheKey(userId, libraryId);
      await this.redis.setEx(cacheKey, 3600, 'not_completed'); // 1 hour TTL for negative cache
    }

    return hasCompleted;
  }

  /**
   * Get surface-level check-in questions appropriate for children
   */
  getCheckinQuestions(): string[] {
    return [
      "How are you feeling today?",
      "What made you smile today?",
      "How was your day?",
      "What's one thing that happened today?",
      "How do you feel right now?"
    ];
  }

  /**
   * Analyze check-in responses to determine mood and confidence
   */
  private analyzCheckinResponses(responses: CheckinResponse[]): { mood: Mood; confidence: number } {
    // Simple keyword-based analysis for mood detection
    const moodKeywords = {
      happy: ['happy', 'good', 'great', 'awesome', 'fun', 'excited', 'smile', 'laugh', 'joy', 'wonderful'],
      sad: ['sad', 'down', 'upset', 'cry', 'lonely', 'miss', 'hurt', 'disappointed'],
      scared: ['scared', 'afraid', 'worried', 'nervous', 'anxious', 'frightened'],
      angry: ['angry', 'mad', 'frustrated', 'annoyed', 'upset', 'grumpy'],
      neutral: ['okay', 'fine', 'normal', 'alright', 'nothing', 'same']
    };

    const moodScores: Record<Mood, number> = {
      happy: 0,
      sad: 0,
      scared: 0,
      angry: 0,
      neutral: 0
    };

    let totalWords = 0;
    let matchedWords = 0;

    // Analyze each response
    responses.forEach(response => {
      if (response.mood && response.confidence) {
        // If explicit mood provided, use it with higher weight
        moodScores[response.mood] += response.confidence * 2;
        matchedWords += 2;
      } else {
        // Analyze text for mood indicators
        const words = response.answer.toLowerCase().split(/\s+/);
        totalWords += words.length;

        words.forEach(word => {
          Object.entries(moodKeywords).forEach(([mood, keywords]) => {
            if (keywords.includes(word)) {
              moodScores[mood as Mood] += 1;
              matchedWords++;
            }
          });
        });
      }
    });

    // Determine dominant mood
    const dominantMood = Object.entries(moodScores).reduce((a, b) => 
      moodScores[a[0] as Mood] > moodScores[b[0] as Mood] ? a : b
    )[0] as Mood;

    // Calculate confidence based on keyword matches and response clarity
    let confidence = 0.5; // Base confidence
    
    if (matchedWords > 0) {
      confidence = Math.min(0.9, 0.3 + (matchedWords / Math.max(totalWords, 1)) * 0.6);
    }

    // If no clear mood detected, default to neutral with lower confidence
    if (moodScores[dominantMood] === 0) {
      return { mood: 'neutral', confidence: 0.3 };
    }

    return { mood: dominantMood, confidence };
  }

  /**
   * Create emotion record in database with proper TTL and scoping
   */
  private async createEmotionRecord(params: {
    userId: string;
    libraryId?: string;
    mood: Mood;
    confidence: number;
    context: Record<string, any>;
  }): Promise<Emotion> {
    const { userId, libraryId, mood, confidence, context } = params;

    const emotionData = {
      user_id: userId,
      library_id: libraryId,
      mood,
      confidence,
      context,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 365 days
    };

    const { data, error } = await this.supabase
      .from('emotions')
      .insert(emotionData)
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating emotion record:', error);
      throw error;
    }

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
  }

  /**
   * Get cache key for daily check-in status
   */
  private getDailyCheckinCacheKey(userId: string, libraryId?: string): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `daily_checkin:${userId}:${libraryId || 'main'}:${today}`;
  }

  /**
   * Get next available check-in time (tomorrow at midnight)
   */
  private getNextCheckinTime(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
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