/**
 * Daily Digest Service
 * 
 * Generates consolidated daily consumption reports.
 * Runs every evening (8pm user's timezone) to summarize the day's activity.
 * 
 * Features:
 * - Consolidates minor events (no email spam)
 * - Comparative insights (vs user's baseline)
 * - User-type-aware content
 * - Respects frequency caps and preferences
 * - Integrates with unified daily moment
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailService } from './EmailService';
import { ConsumptionAnalyticsService } from './ConsumptionAnalyticsService';
import { IntelligenceCurator, PipelineEvent } from './IntelligenceCurator';
import { UserTypeRouter } from './UserTypeRouter';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface DailyDigestData {
  userId: string;
  date: Date;
  
  // Consumption summary
  storiesConsumed: number;
  totalListenTime: number; // Minutes
  charactersUsed: string[];
  
  // Highlights
  topStory?: {
    id: string;
    title: string;
    engagement: number;
    improvement: string; // "5 minutes faster than usual"
  };
  
  // Events
  qrScans?: number;
  shares?: number;
  newCharacters?: number;
  
  // Emotional tone
  emotionalTone: string;
  moodShift?: string; // "sad → calm"
  
  // Recommendations
  recommendations: string[];
  
  // User type specific
  userType: string;
  customInsights: string[];
}

// ============================================================================
// Daily Digest Service
// ============================================================================

export class DailyDigestService {
  constructor(
    private supabase: SupabaseClient,
    private emailService: EmailService,
    private consumptionService: ConsumptionAnalyticsService,
    private curator: IntelligenceCurator,
    private userTypeRouter: UserTypeRouter,
    private logger: Logger
  ) {}
  
  /**
   * Generate and send daily digest for user
   */
  async sendDailyDigest(userId: string, date: Date = new Date()): Promise<void> {
    try {
      this.logger.info('Generating daily digest', { userId, date });
      
      // Generate digest data
      const digest = await this.generateDigest(userId, date);
      
      if (!digest) {
        this.logger.info('No activity for daily digest', { userId, date });
        return;
      }
      
      // Create pipeline event for curation
      const event: PipelineEvent = {
        type: 'daily_digest',
        userId,
        data: {
          signalCount: digest.storiesConsumed,
          confidence: digest.storiesConsumed >= 2 ? 0.8 : 0.5,
          digest
        },
        triggeredAt: new Date()
      };
      
      // Curate - check if should send
      const decision = await this.curator.curate(event);
      
      if (!decision.execute) {
        this.logger.info('Daily digest vetoed', {
          userId,
          vetoReason: decision.vetoReason,
          reasoning: decision.reasoning
        });
        return;
      }
      
      // Get user email
      const { data: user } = await this.supabase
        .from('users')
        .select('email, first_name')
        .eq('id', userId)
        .single();
      
      if (!user?.email) {
        this.logger.warn('User email not found', { userId });
        return;
      }
      
      // Route to user-type-specific variant
      const emailVariant = await this.userTypeRouter.routeEmailVariant(userId, 'daily_digest');
      
      // Send email
      await this.sendDigestEmail(user.email, digest, emailVariant);
      
      // Log email sent
      await this.supabase
        .from('email_delivery_log')
        .insert({
          user_id: userId,
          email_type: 'daily_digest',
          template_id: emailVariant,
          provider: 'sendgrid',
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      
      this.logger.info('Daily digest sent', { userId, variant: emailVariant });
      
    } catch (error) {
      this.logger.error('Failed to send daily digest', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
    }
  }
  
  /**
   * Generate digest data for user
   */
  private async generateDigest(userId: string, date: Date): Promise<DailyDigestData | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get consumption data for today
    const { data: consumed } = await this.supabase
      .from('consumption_metrics')
      .select(`
        *,
        stories(id, title)
      `)
      .eq('user_id', userId)
      .gte('last_read_at', startOfDay.toISOString())
      .lte('last_read_at', endOfDay.toISOString());
    
    if (!consumed || consumed.length === 0) {
      return null; // No activity today
    }
    
    // Calculate totals
    const storiesConsumed = consumed.length;
    const totalListenTime = Math.round(
      consumed.reduce((sum, c) => sum + (c.total_duration_seconds || 0), 0) / 60
    );
    
    // Get top story (highest engagement)
    const topStory = consumed.sort((a, b) => 
      (b.engagement_score || 0) - (a.engagement_score || 0)
    )[0];
    
    // Get comparative insight for top story
    const topStoryInsight = await this.curator.generateComparativeInsight(
      userId,
      topStory.story_id,
      'default'
    );
    
    // Get emotional tone
    const emotionalTone = await this.getEmotionalTone(userId, date);
    
    // Get user type context
    const userContext = await this.userTypeRouter.getUserTypeContext(userId);
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(userId, consumed, userContext.userType);
    
    // Get characters used
    const charactersUsed = await this.getCharactersUsedToday(userId, date);
    
    // Get other events (QR scans, shares, etc.)
    const events = await this.getTodayEvents(userId, date);
    
    return {
      userId,
      date,
      storiesConsumed,
      totalListenTime,
      charactersUsed,
      topStory: topStoryInsight ? {
        id: topStory.story_id,
        title: (topStory.stories as any)?.title || 'Unknown',
        engagement: topStory.engagement_score || 0,
        improvement: topStoryInsight.improvements[0]?.interpretation || ''
      } : undefined,
      qrScans: events.qrScans,
      shares: events.shares,
      newCharacters: events.newCharacters,
      emotionalTone: emotionalTone.primary,
      moodShift: emotionalTone.shift,
      recommendations,
      userType: userContext.userType,
      customInsights: []
    };
  }
  
  /**
   * Send digest email
   */
  private async sendDigestEmail(
    to: string,
    digest: DailyDigestData,
    variant: string
  ): Promise<void> {
    // Generate email body based on user type
    const subject = this.generateSubject(digest);
    const body = this.generateBody(digest);
    
    // For now, send via generic email method
    // In production, would use SendGrid template
    await this.emailService.sendEmail({
      to,
      subject,
      html: body,
      text: this.stripHTML(body)
    });
  }
  
  /**
   * Generate subject line
   */
  private generateSubject(digest: DailyDigestData): string {
    if (digest.storiesConsumed === 1) {
      return `${digest.topStory?.title || 'Story'} today`;
    } else {
      return `${digest.storiesConsumed} stories today`;
    }
  }
  
  /**
   * Generate email body
   */
  private generateBody(digest: DailyDigestData): string {
    let body = '';
    
    // Opening
    if (digest.topStory) {
      body += `${digest.topStory.title} was the favorite.\n\n`;
      
      if (digest.topStory.improvement) {
        body += `${digest.topStory.improvement}.\n\n`;
      }
    }
    
    // Summary
    body += `Today: ${digest.storiesConsumed} ${digest.storiesConsumed === 1 ? 'story' : 'stories'}, `;
    body += `${digest.totalListenTime} minutes.\n\n`;
    
    // Mood shift
    if (digest.moodShift) {
      body += `Mood: ${digest.moodShift}.\n\n`;
    }
    
    // Recommendations
    if (digest.recommendations.length > 0) {
      body += `${digest.recommendations[0]}\n\n`;
    }
    
    return body;
  }
  
  /**
   * Strip HTML for plain text version
   */
  private stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
  
  /**
   * Get emotional tone for today
   */
  private async getEmotionalTone(userId: string, date: Date): Promise<{
    primary: string;
    shift?: string;
  }> {
    // Query emotional_trends or emotion_check_ins for today
    // Simplified for now
    return {
      primary: 'neutral',
      shift: undefined
    };
  }
  
  /**
   * Generate recommendations
   */
  private async generateRecommendations(
    userId: string,
    consumed: any[],
    userType: string
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Based on user type
    if (userType === 'parent') {
      recommendations.push('Create another bedtime story');
    } else if (userType === 'teacher') {
      recommendations.push('Create stories for tomorrow\'s lesson');
    }
    
    return recommendations;
  }
  
  /**
   * Get characters used today
   */
  private async getCharactersUsedToday(userId: string, date: Date): Promise<string[]> {
    // Query story_character_links for stories consumed today
    return [];
  }
  
  /**
   * Get today's events (QR scans, shares, etc.)
   */
  private async getTodayEvents(userId: string, date: Date): Promise<{
    qrScans?: number;
    shares?: number;
    newCharacters?: number;
  }> {
    return {};
  }
  
  /**
   * Batch process daily digests for all eligible users
   */
  async processBatchDigests(date: Date = new Date()): Promise<void> {
    this.logger.info('Processing batch daily digests', { date });
    
    // Get users who had activity today
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const { data: activeUsers } = await this.supabase
      .from('consumption_metrics')
      .select('user_id')
      .gte('last_read_at', startOfDay.toISOString())
      .order('user_id');
    
    if (!activeUsers || activeUsers.length === 0) {
      this.logger.info('No active users for daily digest');
      return;
    }
    
    // Deduplicate users
    const uniqueUsers = [...new Set(activeUsers.map(u => u.user_id))];
    
    this.logger.info('Processing digests for users', {
      count: uniqueUsers.length
    });
    
    // Process each user
    for (const userId of uniqueUsers) {
      try {
        await this.sendDailyDigest(userId, date);
      } catch (error) {
        this.logger.error('Failed to send digest for user', {
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue with next user
      }
    }
    
    this.logger.info('Batch daily digests complete', {
      processed: uniqueUsers.length
    });
  }
}

