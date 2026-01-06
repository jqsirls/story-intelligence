/**
 * Consumption Analytics Service
 * 
 * Tracks post-facto story consumption (what users READ vs what they CREATED).
 * Provides comparative insights, engagement patterns, and effectiveness scoring.
 * 
 * REST-exclusive feature (conversational merges creation/consumption).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ConsumptionEvent {
  storyId: string;
  userId: string;
  profileId?: string;
  eventType: 'play_start' | 'play_pause' | 'play_resume' | 'play_complete' | 'replay' | 'skip';
  timestamp: Date;
  position?: number; // Seconds into story
  duration?: number; // Duration of this event (for pause)
  metadata?: Record<string, any>;
}

export interface ConsumptionMetrics {
  storyId: string;
  userId: string;
  readCount: number;
  totalDurationSeconds: number;
  completionRate: number;
  replayCount: number;
  replayPatterns: Array<{
    timestamp: string;
    segmentId?: string;
    replayCount: number;
  }>;
  engagementScore: number;
  pausePatterns: Array<{
    timestamp: string;
    duration: number;
    position: number;
  }>;
  interactionEvents: any[];
  firstReadAt?: Date;
  lastReadAt?: Date;
}

export interface EngagementPattern {
  storyId: string;
  userId: string;
  pattern: 'high_replay' | 'fast_completion' | 'partial_completion' | 'abandoned' | 'perfect';
  engagementScore: number;
  insights: string[];
}

export interface ConsumptionDigest {
  userId: string;
  date: Date;
  storiesConsumed: number;
  totalDuration: number;
  topStories: Array<{
    storyId: string;
    title: string;
    engagement: number;
  }>;
  emotionalTone: string;
  recommendations: string[];
}

// ============================================================================
// Consumption Analytics Service
// ============================================================================

export class ConsumptionAnalyticsService {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger
  ) {}
  
  /**
   * Track a consumption event
   */
  async trackEvent(event: ConsumptionEvent): Promise<void> {
    try {
      // Calculate metrics from event
      const metrics = this.calculateMetricsFromEvent(event);
      
      // Call database function to update consumption_metrics
      const { error } = await this.supabase.rpc('track_consumption_event', {
        p_story_id: event.storyId,
        p_user_id: event.userId,
        p_event_data: {
          type: event.eventType,
          timestamp: event.timestamp.toISOString(),
          position: event.position,
          duration_seconds: event.duration || 0,
          completion_rate: metrics.completionRate,
          replay_count: event.eventType === 'replay' ? 1 : 0,
          metadata: event.metadata
        }
      });
      
      if (error) {
        throw error;
      }
      
      this.logger.debug('Consumption event tracked', {
        storyId: event.storyId,
        userId: event.userId,
        eventType: event.eventType
      });
      
    } catch (error) {
      this.logger.error('Failed to track consumption event', {
        error: error instanceof Error ? error.message : String(error),
        event
      });
      throw error;
    }
  }
  
  /**
   * Get consumption metrics for a story/user pair
   */
  async getMetrics(storyId: string, userId: string): Promise<ConsumptionMetrics | null> {
    try {
      const { data, error } = await this.supabase
        .from('consumption_metrics')
        .select('*')
        .eq('story_id', storyId)
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        storyId: data.story_id,
        userId: data.user_id,
        readCount: data.read_count,
        totalDurationSeconds: data.total_duration_seconds,
        completionRate: data.completion_rate,
        replayCount: data.replay_count,
        replayPatterns: data.replay_patterns || [],
        engagementScore: data.engagement_score,
        pausePatterns: data.pause_patterns || [],
        interactionEvents: data.interaction_events || [],
        firstReadAt: data.first_read_at ? new Date(data.first_read_at) : undefined,
        lastReadAt: data.last_read_at ? new Date(data.last_read_at) : undefined
      };
      
    } catch (error) {
      this.logger.error('Failed to get consumption metrics', {
        error: error instanceof Error ? error.message : String(error),
        storyId,
        userId
      });
      return null;
    }
  }
  
  /**
   * Analyze engagement patterns for a story
   */
  async analyzeEngagementPattern(storyId: string, userId: string): Promise<EngagementPattern | null> {
    const metrics = await this.getMetrics(storyId, userId);
    if (!metrics) {
      return null;
    }
    
    const insights: string[] = [];
    let pattern: EngagementPattern['pattern'] = 'partial_completion';
    
    // Determine pattern
    if (metrics.completionRate >= 95 && metrics.replayCount === 0) {
      pattern = 'perfect';
      insights.push('Completed story in one sitting');
    } else if (metrics.replayCount >= 3) {
      pattern = 'high_replay';
      insights.push(`Replayed ${metrics.replayCount} times - strong interest`);
    } else if (metrics.completionRate >= 90 && metrics.totalDurationSeconds < 600) {
      pattern = 'fast_completion';
      insights.push('Quick completion - engaged listener');
    } else if (metrics.completionRate < 50) {
      pattern = 'abandoned';
      insights.push('Did not complete - may need different story');
    }
    
    // Add pause pattern insights
    if (metrics.pausePatterns.length > 5) {
      insights.push('Multiple pauses - may need shorter format');
    }
    
    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(metrics);
    
    return {
      storyId,
      userId,
      pattern,
      engagementScore,
      insights
    };
  }
  
  /**
   * Generate daily consumption digest
   */
  async generateDailyDigest(userId: string, date: Date): Promise<ConsumptionDigest | null> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Get all stories consumed today
      const { data: consumed, error } = await this.supabase
        .from('consumption_metrics')
        .select(`
          *,
          stories(id, title)
        `)
        .eq('user_id', userId)
        .gte('last_read_at', startOfDay.toISOString())
        .lte('last_read_at', endOfDay.toISOString());
      
      if (error || !consumed || consumed.length === 0) {
        return null;
      }
      
      // Calculate totals
      const totalDuration = consumed.reduce((sum, c) => sum + (c.total_duration_seconds || 0), 0);
      
      // Get top stories by engagement
      const topStories = consumed
        .sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))
        .slice(0, 3)
        .map(c => ({
          storyId: c.story_id,
          title: (c.stories as any)?.title || 'Unknown',
          engagement: c.engagement_score || 0
        }));
      
      // Get emotional tone from emotion data (if available)
      const emotionalTone = await this.getEmotionalTone(userId, date);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(userId, consumed);
      
      return {
        userId,
        date,
        storiesConsumed: consumed.length,
        totalDuration,
        topStories,
        emotionalTone,
        recommendations
      };
      
    } catch (error) {
      this.logger.error('Failed to generate daily digest', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        date
      });
      return null;
    }
  }
  
  /**
   * Get consumption insights (who created vs who consumed)
   */
  async getCreatorConsumerAttribution(storyId: string): Promise<{
    createdBy: string;
    consumedBy: string[];
    selfDirected: boolean;
    bulkCreation: boolean;
  } | null> {
    try {
      // Get story creator
      const { data: story } = await this.supabase
        .from('stories')
        .select('creator_user_id, user_id')
        .eq('id', storyId)
        .single();
      
      if (!story) {
        return null;
      }
      
      // Get consumers
      const { data: consumers } = await this.supabase
        .from('consumption_metrics')
        .select('user_id')
        .eq('story_id', storyId);
      
      const consumedBy = consumers?.map(c => c.user_id) || [];
      const createdBy = story.creator_user_id || story.user_id;
      
      // Detect patterns
      const selfDirected = consumedBy.includes(createdBy);
      const bulkCreation = await this.detectBulkCreation(createdBy);
      
      return {
        createdBy,
        consumedBy,
        selfDirected,
        bulkCreation
      };
      
    } catch (error) {
      this.logger.error('Failed to get creator/consumer attribution', {
        error: error instanceof Error ? error.message : String(error),
        storyId
      });
      return null;
    }
  }
  
  /**
   * Get all consumption metrics for a user
   */
  async getUserConsumptionHistory(
    userId: string,
    limit: number = 50
  ): Promise<ConsumptionMetrics[]> {
    try {
      const { data, error } = await this.supabase
        .from('consumption_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('last_read_at', { ascending: false })
        .limit(limit);
      
      if (error || !data) {
        return [];
      }
      
      return data.map(d => ({
        storyId: d.story_id,
        userId: d.user_id,
        readCount: d.read_count,
        totalDurationSeconds: d.total_duration_seconds,
        completionRate: d.completion_rate,
        replayCount: d.replay_count,
        replayPatterns: d.replay_patterns || [],
        engagementScore: d.engagement_score,
        pausePatterns: d.pause_patterns || [],
        interactionEvents: d.interaction_events || [],
        firstReadAt: d.first_read_at ? new Date(d.first_read_at) : undefined,
        lastReadAt: d.last_read_at ? new Date(d.last_read_at) : undefined
      }));
      
    } catch (error) {
      this.logger.error('Failed to get user consumption history', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return [];
    }
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  private calculateMetricsFromEvent(event: ConsumptionEvent): {
    completionRate: number;
  } {
    // Simplified - in production would get story duration and calculate
    let completionRate = 0;
    
    if (event.eventType === 'play_complete') {
      completionRate = 100;
    } else if (event.position !== undefined) {
      // Would need story duration to calculate properly
      completionRate = 50; // Placeholder
    }
    
    return { completionRate };
  }
  
  private calculateEngagementScore(metrics: ConsumptionMetrics): number {
    let score = 0;
    
    // Completion rate contributes 40%
    score += (metrics.completionRate || 0) * 0.4;
    
    // Replay count contributes 30% (capped at 10 replays)
    score += Math.min((metrics.replayCount || 0) * 3, 30);
    
    // Read count contributes 20% (capped at 5 reads)
    score += Math.min((metrics.readCount || 0) * 4, 20);
    
    // Low pause count contributes 10%
    const pausePenalty = Math.min((metrics.pausePatterns?.length || 0) * 2, 10);
    score += (10 - pausePenalty);
    
    return Math.min(Math.max(score, 0), 100);
  }
  
  private async getEmotionalTone(userId: string, date: Date): Promise<string> {
    // Query emotional_trends table for today
    // Simplified - would integrate with EmotionAgent
    return 'neutral';
  }
  
  private async generateRecommendations(
    userId: string,
    consumed: any[]
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Analyze patterns
    const avgEngagement = consumed.reduce((sum, c) => sum + (c.engagement_score || 0), 0) / consumed.length;
    
    if (avgEngagement > 75) {
      recommendations.push('Your stories are highly engaging - create more similar content');
    }
    
    // Check for dominant themes
    const hasReplays = consumed.some(c => (c.replay_count || 0) > 0);
    if (hasReplays) {
      recommendations.push('Stories with replays show strong interest - focus on those themes');
    }
    
    return recommendations;
  }
  
  private async detectBulkCreation(userId: string): Promise<boolean> {
    // Check if user created 5+ stories in last 24 hours (teacher pattern)
    const { count } = await this.supabase
        .from('stories')
      .select('id', { count: 'exact', head: true })
      .eq('creator_user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    return (count || 0) >= 5;
  }
}

