import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailService } from '../services/EmailService';

export type UserTier = 'free_never_paid' | 'former_paid' | 'current_paid' | 'institutional';

export interface InactivityThresholds {
  freeUser: number; // days
  formerPaid: number; // days
  institutional: number; // days
}

export class InactivityMonitorService {
  private thresholds: InactivityThresholds;
  private emailService: EmailService;

  constructor(
    private supabase: SupabaseClient,
    private logger: Logger,
    emailService?: EmailService
  ) {
    // Get thresholds from environment or use defaults
    this.thresholds = {
      freeUser: parseInt(process.env.INACTIVITY_FREE_USER_THRESHOLD || '180'), // 6 months
      formerPaid: parseInt(process.env.INACTIVITY_FORMER_PAID_THRESHOLD || '540'), // 18 months
      institutional: parseInt(process.env.INACTIVITY_INSTITUTIONAL_THRESHOLD || '720') // 24 months
    };

    this.emailService = emailService || new EmailService(supabase, logger);
  }

  /**
   * Check for inactive users and send warnings (called by daily cron)
   */
  async checkInactiveUsers(): Promise<{ checked: number; warningsSent: number; errors: number }> {
    let checked = 0;
    let warningsSent = 0;
    let errors = 0;

    try {
      // Get all user tiers
      const { data: userTiers, error } = await this.supabase
        .from('user_tiers')
        .select('*, users!inner(id, email, age, is_coppa_protected)')
        .is('hibernation_eligible', false);

      if (error) throw error;

      for (const tier of userTiers || []) {
        checked++;
        try {
          const daysInactive = this.calculateDaysInactive(tier);
          const threshold = this.getThresholdForTier(tier.tier as UserTier);

          if (daysInactive >= threshold) {
            // Send warning email
            await this.sendInactivityWarning(
              tier.user_id,
              tier.tier as UserTier,
              daysInactive
            );
            warningsSent++;
          }
        } catch (error) {
          errors++;
          this.logger.error('Error checking user inactivity', { userId: tier.user_id, error });
        }
      }

      return { checked, warningsSent, errors };
    } catch (error) {
      this.logger.error('Error checking inactive users', { error });
      throw error;
    }
  }

  /**
   * Send inactivity warning email
   */
  async sendInactivityWarning(
    userId: string,
    tier: UserTier,
    monthsInactive: number
  ): Promise<void> {
    try {
      // Get user info
      const { data: user } = await this.supabase
        .from('users')
        .select('email, age, is_coppa_protected')
        .eq('id', userId)
        .single();

      if (!user) {
        throw new Error('User not found');
      }

      // Determine warning level
      const threshold = this.getThresholdForTier(tier);
      const daysInactive = monthsInactive * 30;
      const daysUntilDeletion = threshold - daysInactive;

      let emailType: string;
      if (daysUntilDeletion <= 7) {
        emailType = 'inactivity-warning-final';
      } else if (daysUntilDeletion <= 30) {
        emailType = 'inactivity-warning-7-days';
      } else if (daysUntilDeletion <= threshold * 0.5) {
        emailType = 'inactivity-warning-threshold';
      } else {
        emailType = 'inactivity-warning-month-before';
      }

      // Generate engagement token
      const engagementToken = this.generateEngagementToken(userId, emailType);

      // Send email
      await this.emailService.sendInactivityWarning({
        to: user.email,
        userId,
        tier,
        daysInactive,
        daysUntilDeletion,
        engagementToken
      });

      // Update user_tiers
      await this.supabase
        .from('user_tiers')
        .update({
          inactivity_warnings_sent: (await this.getWarningCount(userId)) + 1,
          next_warning_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      this.logger.info('Inactivity warning sent', { userId, tier, daysInactive, emailType });
    } catch (error) {
      this.logger.error('Error sending inactivity warning', { userId, tier, error });
      throw error;
    }
  }

  /**
   * Update user tier
   */
  async updateUserTier(userId: string, newTier: UserTier): Promise<void> {
    try {
      await this.supabase.rpc('update_user_tier', { p_user_id: userId });

      // Manually update if needed
      await this.supabase
        .from('user_tiers')
        .upsert({
          user_id: userId,
          tier: newTier,
          tier_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      this.logger.info('User tier updated', { userId, newTier });
    } catch (error) {
      this.logger.error('Error updating user tier', { userId, newTier, error });
      throw error;
    }
  }

  /**
   * Track engagement (email opens/clicks)
   */
  async trackEngagement(
    userId: string,
    engagementType: 'open' | 'click',
    engagementToken: string,
    clickUrl?: string
  ): Promise<void> {
    try {
      // Get email type from token
      const { data: tracking } = await this.supabase
        .from('email_engagement_tracking')
        .select('email_type')
        .eq('engagement_token', engagementToken)
        .single();

      if (!tracking) {
        this.logger.warn('Engagement token not found', { engagementToken });
        return;
      }

      // Track engagement
      await this.supabase.rpc('track_email_engagement', {
        p_user_id: userId,
        p_email_type: tracking.email_type,
        p_engagement_type: engagementType,
        p_engagement_token: engagementToken,
        p_click_url: clickUrl || null
      });

      // Reset inactivity timer on engagement
      await this.resetInactivityTimer(userId);

      this.logger.info('Engagement tracked', { userId, engagementType, emailType: tracking.email_type });
    } catch (error) {
      this.logger.error('Error tracking engagement', { userId, engagementType, error });
      throw error;
    }
  }

  /**
   * Reset inactivity timer (called on login or engagement)
   */
  async resetInactivityTimer(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_tiers')
        .update({
          last_login_at: new Date().toISOString(),
          last_engagement_at: new Date().toISOString(),
          inactivity_warnings_sent: 0,
          next_warning_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      this.logger.info('Inactivity timer reset', { userId });
    } catch (error) {
      this.logger.error('Error resetting inactivity timer', { userId, error });
      throw error;
    }
  }

  /**
   * Calculate days since last activity
   */
  private calculateDaysInactive(tier: any): number {
    const lastActivity = tier.last_engagement_at || tier.last_login_at;
    if (!lastActivity) return 0;

    const lastActivityDate = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - lastActivityDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Get inactivity threshold for tier
   */
  private getThresholdForTier(tier: UserTier): number {
    switch (tier) {
      case 'free_never_paid':
        return this.thresholds.freeUser;
      case 'former_paid':
        return this.thresholds.formerPaid;
      case 'institutional':
        return this.thresholds.institutional;
      case 'current_paid':
        return Infinity; // Never delete active paid users
      default:
        return this.thresholds.freeUser;
    }
  }

  /**
   * Get warning count for user
   */
  private async getWarningCount(userId: string): Promise<number> {
    const { data } = await this.supabase
      .from('user_tiers')
      .select('inactivity_warnings_sent')
      .eq('user_id', userId)
      .single();

    return data?.inactivity_warnings_sent || 0;
  }

  /**
   * Generate unique engagement token
   */
  private generateEngagementToken(userId: string, emailType: string): string {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    return `${userId}-${emailType}-${token}`;
  }
}

