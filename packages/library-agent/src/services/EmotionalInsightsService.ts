import { Database } from '@alexa-multi-agent/shared-types';
import {
  LibraryOperationContext,
  EmotionalPattern,
  LibraryError,
  PermissionError,
  MoodType
} from '../types';
import { LibrarySupabaseClient } from '../db/client';

export interface EmotionalCheckin {
  id: string;
  user_id: string;
  library_id: string | null;
  sub_library_id: string | null;
  mood: MoodType;
  confidence: number;
  context: any;
  created_at: string | null;
}

export interface SubLibraryEmotionalPattern {
  mood: string;
  frequency: number;
  avg_confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export class EmotionalInsightsService {
  constructor(private supabase: LibrarySupabaseClient) {}

  async recordEmotionalCheckin(
    subLibraryId: string,
    mood: MoodType,
    confidence: number,
    context: any,
    operationContext: LibraryOperationContext
  ): Promise<EmotionalCheckin> {
    // Check permission on sub-library
    const hasPermission = await this.checkLibraryPermission(subLibraryId, 'Viewer', operationContext.user_id);
    if (!hasPermission) {
      throw new PermissionError('Access denied to sub-library for emotional check-in');
    }

    // Validate mood
    const validMoods: MoodType[] = ['happy', 'sad', 'scared', 'angry', 'neutral'];
    if (!validMoods.includes(mood)) {
      throw new LibraryError('Invalid mood type', 'INVALID_INPUT');
    }

    // Validate confidence
    if (confidence < 0 || confidence > 1) {
      throw new LibraryError('Confidence must be between 0 and 1', 'INVALID_INPUT');
    }

    // Get parent library ID
    const { data: library, error: libraryError } = await this.supabase
      .from('libraries')
      .select('parent_library')
      .eq('id', subLibraryId)
      .single();

    if (libraryError) {
      throw new LibraryError(`Failed to get library info: ${libraryError.message}`, 'GET_FAILED');
    }

    // Record emotional check-in
    const { data: checkin, error } = await this.supabase
      .from('emotions')
      .insert({
        user_id: operationContext.user_id,
        library_id: library.parent_library,
        sub_library_id: subLibraryId,
        mood,
        confidence,
        context: {
          ...context,
          session_id: operationContext.session_id,
          recorded_via: 'sub_library_checkin'
        }
      })
      .select()
      .single();

    if (error) {
      throw new LibraryError(`Failed to record emotional check-in: ${error.message}`, 'CREATE_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('emotional_checkin_recorded', {
      sub_library_id: subLibraryId,
      mood,
      confidence
    }, operationContext);

    return {
      id: checkin.id,
      user_id: checkin.user_id,
      library_id: checkin.library_id,
      sub_library_id: checkin.sub_library_id,
      mood: checkin.mood as MoodType,
      confidence: checkin.confidence,
      context: checkin.context,
      created_at: checkin.created_at
    };
  }

  async getSubLibraryEmotionalPatterns(
    subLibraryId: string,
    daysBack: number = 30,
    context: LibraryOperationContext
  ): Promise<SubLibraryEmotionalPattern[]> {
    // Check permission
    const hasPermission = await this.checkLibraryPermission(subLibraryId, 'Viewer', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Access denied to sub-library emotional patterns');
    }

    const { data: patterns, error } = await this.supabase
      .rpc('get_sub_library_emotional_patterns', {
        p_sub_library_id: subLibraryId,
        p_days_back: daysBack
      });

    if (error) {
      throw new LibraryError(`Failed to get emotional patterns: ${error.message}`, 'GET_FAILED');
    }

    return patterns?.map((pattern: any) => ({
      mood: pattern.mood,
      frequency: Number(pattern.frequency),
      avg_confidence: Number(pattern.avg_confidence),
      trend: pattern.trend as 'increasing' | 'decreasing' | 'stable'
    })) || [];
  }

  async getSubLibraryEmotionalHistory(
    subLibraryId: string,
    limit: number = 50,
    context: LibraryOperationContext
  ): Promise<EmotionalCheckin[]> {
    // Check permission
    const hasPermission = await this.checkLibraryPermission(subLibraryId, 'Viewer', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Access denied to sub-library emotional history');
    }

    const { data: checkins, error } = await this.supabase
      .from('emotions')
      .select('*')
      .eq('sub_library_id', subLibraryId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new LibraryError(`Failed to get emotional history: ${error.message}`, 'GET_FAILED');
    }

    return checkins?.map(checkin => ({
      id: checkin.id,
      user_id: checkin.user_id,
      library_id: checkin.library_id,
      sub_library_id: checkin.sub_library_id,
      mood: checkin.mood as MoodType,
      confidence: checkin.confidence,
      context: checkin.context,
      created_at: checkin.created_at
    })) || [];
  }

  async getSubLibraryMoodSummary(
    subLibraryId: string,
    context: LibraryOperationContext
  ): Promise<{
    current_mood: MoodType | null;
    mood_distribution: { [mood: string]: number };
    trend: 'improving' | 'declining' | 'stable';
    last_checkin: string | null;
  }> {
    // Check permission
    const hasPermission = await this.checkLibraryPermission(subLibraryId, 'Viewer', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Access denied to sub-library mood summary');
    }

    // Get recent emotional data
    const { data: recentEmotions, error } = await this.supabase
      .from('emotions')
      .select('mood, confidence, created_at')
      .eq('sub_library_id', subLibraryId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get mood summary: ${error.message}`, 'GET_FAILED');
    }

    if (!recentEmotions || recentEmotions.length === 0) {
      return {
        current_mood: null,
        mood_distribution: {},
        trend: 'stable',
        last_checkin: null
      };
    }

    // Calculate mood distribution
    const moodCounts: { [mood: string]: number } = {};
    recentEmotions.forEach(emotion => {
      moodCounts[emotion.mood] = (moodCounts[emotion.mood] || 0) + 1;
    });

    const totalEmotions = recentEmotions.length;
    const moodDistribution: { [mood: string]: number } = {};
    Object.entries(moodCounts).forEach(([mood, count]) => {
      moodDistribution[mood] = (count / totalEmotions) * 100;
    });

    // Determine current mood (most recent)
    const currentMood = recentEmotions[0]?.mood as MoodType;

    // Simple trend analysis (comparing first half vs second half of period)
    const midpoint = Math.floor(recentEmotions.length / 2);
    const recentHalf = recentEmotions.slice(0, midpoint);
    const olderHalf = recentEmotions.slice(midpoint);

    const recentPositive = recentHalf.filter(e => ['happy'].includes(e.mood)).length;
    const olderPositive = olderHalf.filter(e => ['happy'].includes(e.mood)).length;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentPositive > olderPositive) {
      trend = 'improving';
    } else if (recentPositive < olderPositive) {
      trend = 'declining';
    }

    return {
      current_mood: currentMood,
      mood_distribution: moodDistribution,
      trend,
      last_checkin: recentEmotions[0]?.created_at || null
    };
  }

  async compareSubLibraryEmotions(
    subLibraryIds: string[],
    context: LibraryOperationContext
  ): Promise<{
    [subLibraryId: string]: {
      average_mood_score: number;
      dominant_mood: string;
      activity_level: number;
    };
  }> {
    const results: { [subLibraryId: string]: any } = {};

    for (const subLibraryId of subLibraryIds) {
      try {
        // Check permission for each sub-library
        const hasPermission = await this.checkLibraryPermission(subLibraryId, 'Viewer', context.user_id);
        if (!hasPermission) {
          continue; // Skip libraries without permission
        }

        const patterns = await this.getSubLibraryEmotionalPatterns(subLibraryId, 30, context);
        
        // Calculate average mood score (happy=5, neutral=3, sad/scared/angry=1)
        const moodScores: { [mood: string]: number } = {
          happy: 5,
          neutral: 3,
          sad: 1,
          scared: 1,
          angry: 1
        };

        let totalScore = 0;
        let totalFrequency = 0;
        let dominantMood = 'neutral';
        let maxFrequency = 0;

        patterns.forEach(pattern => {
          const score = moodScores[pattern.mood] || 3;
          totalScore += score * pattern.frequency;
          totalFrequency += pattern.frequency;

          if (pattern.frequency > maxFrequency) {
            maxFrequency = pattern.frequency;
            dominantMood = pattern.mood;
          }
        });

        const averageMoodScore = totalFrequency > 0 ? totalScore / totalFrequency : 3;

        results[subLibraryId] = {
          average_mood_score: averageMoodScore,
          dominant_mood: dominantMood,
          activity_level: totalFrequency
        };
      } catch (error) {
        console.error(`Error processing sub-library ${subLibraryId}:`, error);
        // Continue with other sub-libraries
      }
    }

    return results;
  }

  // Private helper methods
  private async checkLibraryPermission(
    libraryId: string,
    requiredRole: string,
    userId: string
  ): Promise<boolean> {
    const { data: hasPermission, error } = await this.supabase
      .rpc('check_library_permission_with_coppa', {
        lib_id: libraryId,
        required_role: requiredRole
      });

    if (error) {
      console.error('Permission check error:', error);
      return false;
    }

    return hasPermission || false;
  }

  private async logAuditEvent(
    action: string,
    payload: any,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_audit_event_enhanced', {
        p_agent_name: 'EmotionalInsightsService',
        p_action: action,
        p_payload: payload,
        p_session_id: context.session_id ?? undefined,
        p_correlation_id: context.correlation_id ?? undefined,
        p_ip_address: context.ip_address ?? undefined,
        p_user_agent: context.user_agent ?? undefined
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}