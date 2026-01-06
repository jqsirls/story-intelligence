/**
 * Story Effectiveness Service
 * 
 * Calculates comparative effectiveness scores for stories (relative to user's baseline).
 * Runs after story has been consumed 3+ times OR after 7 days.
 * 
 * Focus: Comparative intelligence (better/worse than before) not absolute scores.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailService } from './EmailService';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface StoryEffectiveness {
  storyId: string;
  userId: string;
  effectivenessScore: number; // 0-100, relative to baseline
  moodImpact: {
    before: string;
    after: string;
    delta: number;
  };
  engagementVsBaseline: number; // +15% vs average
  completionVsBaseline: number; // -5 minutes vs average
  contextTags: string[];
  comparisonBaseline: {
    avgEngagement: number;
    avgDuration: number;
    avgReplays: number;
  };
  recommendedFor: string[];
  confidenceScore: number;
}

export interface ImpactInsight {
  storyTitle: string;
  improvements: string[];
  recommendation: string;
  comparative: boolean; // True if has baseline for comparison
}

// ============================================================================
// Story Effectiveness Service
// ============================================================================

export class StoryEffectivenessService {
  constructor(
    private supabase: SupabaseClient,
    private emailService: EmailService,
    private logger: Logger
  ) {}
  
  /**
   * Calculate effectiveness score for a story (comparative)
   */
  async calculateEffectiveness(storyId: string, userId: string): Promise<StoryEffectiveness | null> {
    try {
      this.logger.info('Calculating story effectiveness', { storyId, userId });
      
      // Call database function
      const { data: score, error } = await this.supabase
        .rpc('calculate_story_effectiveness', {
          p_story_id: storyId,
          p_user_id: userId
        });
      
      if (error) {
        throw error;
      }
      
      // Get effectiveness record
      const { data: effectiveness } = await this.supabase
        .from('story_effectiveness')
        .select('*')
        .eq('story_id', storyId)
        .eq('user_id', userId)
        .single();
      
      if (!effectiveness) {
        return null;
      }
      
      return {
        storyId: effectiveness.story_id,
        userId: effectiveness.user_id,
        effectivenessScore: effectiveness.effectiveness_score,
        moodImpact: effectiveness.mood_impact || {},
        engagementVsBaseline: effectiveness.engagement_vs_baseline || 0,
        completionVsBaseline: effectiveness.completion_vs_baseline || 0,
        contextTags: effectiveness.context_tags || [],
        comparisonBaseline: effectiveness.comparison_baseline || {},
        recommendedFor: effectiveness.recommended_for || [],
        confidenceScore: effectiveness.confidence_score || 0
      };
      
    } catch (error) {
      this.logger.error('Failed to calculate effectiveness', {
        error: error instanceof Error ? error.message : String(error),
        storyId,
        userId
      });
      return null;
    }
  }
  
  /**
   * Generate impact insight email (after 3 reads OR 7 days)
   */
  async generateImpactInsight(storyId: string, userId: string): Promise<ImpactInsight | null> {
    try {
      // Check if ready for scoring
      const ready = await this.isReadyForScoring(storyId, userId);
      if (!ready) {
        return null;
      }
      
      // Calculate effectiveness
      const effectiveness = await this.calculateEffectiveness(storyId, userId);
      if (!effectiveness) {
        return null;
      }
      
      // Get story title
      const { data: story } = await this.supabase
        .from('stories')
        .select('title')
        .eq('id', storyId)
        .single();
      
      const storyTitle = story?.title || 'This story';
      
      // Generate comparative improvements
      const improvements: string[] = [];
      
      if (effectiveness.engagementVsBaseline > 5) {
        improvements.push(`${effectiveness.engagementVsBaseline.toFixed(0)}% more engaging than usual`);
      }
      
      if (effectiveness.completionVsBaseline < -60) {
        improvements.push(`Fell asleep ${Math.abs(Math.round(effectiveness.completionVsBaseline / 60))} minutes faster`);
      }
      
      if (effectiveness.moodImpact?.before && effectiveness.moodImpact?.after) {
        improvements.push(`Mood: ${effectiveness.moodImpact.before} → ${effectiveness.moodImpact.after}`);
      }
      
      // Only return insight if meaningful improvements
      if (improvements.length === 0) {
        return null;
      }
      
      // Generate recommendation
      const recommendation = `Create more stories like "${storyTitle}"`;
      
      return {
        storyTitle,
        improvements,
        recommendation,
        comparative: true
      };
      
    } catch (error) {
      this.logger.error('Failed to generate impact insight', {
        error: error instanceof Error ? error.message : String(error),
        storyId,
        userId
      });
      return null;
    }
  }
  
  /**
   * Send impact insight email
   */
  async sendImpactInsight(userId: string, storyId: string): Promise<void> {
    try {
      const insight = await this.generateImpactInsight(storyId, userId);
      
      if (!insight) {
        this.logger.info('No impact insight to send', { userId, storyId });
        return;
      }
      
      // Get user email
      const { data: user } = await this.supabase
        .from('users')
        .select('email, first_name')
        .eq('id', userId)
        .single();
      
      if (!user?.email) {
        return;
      }
      
      // Generate email
      const subject = `${insight.storyTitle} was effective`;
      const body = this.generateImpactEmail(insight);
      
      await this.emailService.sendEmail({
        to: user.email,
        subject,
        html: body,
        text: this.stripHTML(body)
      });
      
      // Log email sent
      await this.supabase
        .from('email_delivery_log')
        .insert({
          user_id: userId,
          email_type: 'story_impact_insight',
          provider: 'sendgrid',
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: { storyId }
        });
      
      this.logger.info('Impact insight email sent', { userId, storyId });
      
    } catch (error) {
      this.logger.error('Failed to send impact insight', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        storyId
      });
    }
  }
  
  /**
   * Check if story is ready for scoring
   */
  private async isReadyForScoring(storyId: string, userId: string): Promise<boolean> {
    const { data: metrics } = await this.supabase
      .from('consumption_metrics')
      .select('read_count, first_read_at')
      .eq('story_id', storyId)
      .eq('user_id', userId)
      .single();
    
    if (!metrics) {
      return false;
    }
    
    // Ready if: 3+ reads OR 7+ days since first read
    const daysSinceFirst = metrics.first_read_at 
      ? (Date.now() - new Date(metrics.first_read_at).getTime()) / (24 * 60 * 60 * 1000)
      : 0;
    
    return metrics.read_count >= 3 || daysSinceFirst >= 7;
  }
  
  /**
   * Generate impact email body
   */
  private generateImpactEmail(insight: ImpactInsight): string {
    let body = `<p>${insight.storyTitle} worked well.</p>`;
    
    if (insight.improvements.length > 0) {
      body += '<p>';
      insight.improvements.forEach(improvement => {
        body += `• ${improvement}<br>`;
      });
      body += '</p>';
    }
    
    body += `<p>${insight.recommendation}</p>`;
    
    return body;
  }
  
  /**
   * Strip HTML
   */
  private stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
  
  /**
   * Batch process effectiveness scoring for all eligible stories
   */
  async processBatchScoring(): Promise<void> {
    this.logger.info('Processing batch story effectiveness scoring');
    
    // Get stories ready for scoring (3+ reads OR 7+ days old)
    const { data: ready } = await this.supabase
      .from('consumption_metrics')
      .select('story_id, user_id, read_count, first_read_at')
      .or(`read_count.gte.3,first_read_at.lte.${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`);
    
    if (!ready || ready.length === 0) {
      this.logger.info('No stories ready for effectiveness scoring');
      return;
    }
    
    this.logger.info('Processing effectiveness for stories', {
      count: ready.length
    });
    
    // Process each story
    for (const item of ready) {
      try {
        await this.calculateEffectiveness(item.story_id, item.user_id);
        
        // Send impact insight email
        await this.sendImpactInsight(item.user_id, item.story_id);
        
      } catch (error) {
        this.logger.error('Failed to process story effectiveness', {
          storyId: item.story_id,
          userId: item.user_id,
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue with next story
      }
    }
    
    this.logger.info('Batch effectiveness scoring complete', {
      processed: ready.length
    });
  }
}

