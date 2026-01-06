/**
 * Power User Detection Service
 * 
 * Detects free users hitting limits and auto-generates upsell offers.
 * Triggers: 10 stories in 1 week, using advanced features, pattern of heavy usage.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailService } from './EmailService';

export class PowerUserDetectionService {
  constructor(
    private supabase: SupabaseClient,
    private emailService: EmailService,
    private logger: Logger
  ) {}
  
  async detectAndNotify(userId: string): Promise<void> {
    try {
      // Check if user is on free tier
      const { data: subscription } = await this.supabase
        .from('subscriptions')
        .select('plan_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      
      const isFreeTier = !subscription || subscription.plan_id === 'free';
      
      if (!isFreeTier) {
        return; // Already paying
      }
      
      // Check usage patterns
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { count: storiesThisWeek } = await this.supabase
        .from('stories')
        .select('id', { count: 'exact', head: true })
        .eq('creator_user_id', userId)
        .gte('created_at', weekAgo.toISOString());
      
      // Power user threshold: 10 stories in 7 days
      if ((storiesThisWeek || 0) >= 10) {
        await this.sendUpsellEmail(userId, 'high_usage');
      }
      
    } catch (error) {
      this.logger.error('Power user detection failed', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
    }
  }
  
  private async sendUpsellEmail(userId: string, reason: string): Promise<void> {
    const { data: user } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    
    if (user?.email) {
      // Send power user email with 30% discount
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Power user! 30% off upgrade',
        html: '<p>You created 10 stories this week. You need Premium!</p><p>30% off if you upgrade today.</p>',
        text: 'You created 10 stories this week. You need Premium! 30% off if you upgrade today.'
      });
    }
  }
}

