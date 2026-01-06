import { SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from './EmailService';
import { Logger } from 'winston';

/**
 * PLG Nudge Service
 * Sends product-led growth emails to encourage upgrades and earning actions
 */
export class PLGNudgeService {
  constructor(
    private supabase: SupabaseClient,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  /**
   * Send Day 3 reminder (no earning action taken)
   */
  async sendDay3Reminders(): Promise<void> {
    try {
      // Query users: credits=0, profile_completed=false, created_at=3d ago, no upgrade
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

      const { data: users, error } = await this.supabase
        .from('users')
        .select('id, email, first_name, available_story_credits, profile_completed, created_at')
        .eq('available_story_credits', 0)
        .eq('profile_completed', false)
        .gte('created_at', fourDaysAgo.toISOString())
        .lte('created_at', threeDaysAgo.toISOString())
        .not('id', 'in', `(SELECT user_id FROM subscriptions WHERE status = 'active' AND plan_id != 'free')`);

      if (error) {
        this.logger.error('Failed to query Day 3 users', { error });
        return;
      }

      for (const user of users || []) {
        try {
          await this.emailService.sendEmail({
            to: user.email,
            templateId: 'plg-day3-reminder',
            dynamicTemplateData: {
              firstName: user.first_name || 'there',
              profileUrl: 'https://storytailor.com/profile'
            }
          });

          this.logger.info('Day 3 reminder sent', { userId: user.id, email: user.email });
        } catch (emailError) {
          this.logger.error('Failed to send Day 3 reminder', {
            userId: user.id,
            error: emailError instanceof Error ? emailError.message : String(emailError)
          });
        }
      }
    } catch (error) {
      this.logger.error('Day 3 reminders failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Send Day 7 social proof email (no upgrade)
   */
  async sendDay7SocialProof(): Promise<void> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

      const { data: users, error } = await this.supabase
        .from('users')
        .select('id, email, first_name, created_at')
        .gte('created_at', eightDaysAgo.toISOString())
        .lte('created_at', sevenDaysAgo.toISOString())
        .not('id', 'in', `(SELECT user_id FROM subscriptions WHERE status = 'active' AND plan_id != 'free')`);

      if (error) {
        this.logger.error('Failed to query Day 7 users', { error });
        return;
      }

      for (const user of users || []) {
        try {
          await this.emailService.sendEmail({
            to: user.email,
            templateId: 'plg-day7-social-proof',
            dynamicTemplateData: {
              firstName: user.first_name || 'there',
              checkoutUrl: 'https://storytailor.com/checkout?planId=pro_individual'
            }
          });

          this.logger.info('Day 7 social proof sent', { userId: user.id, email: user.email });
        } catch (emailError) {
          this.logger.error('Failed to send Day 7 social proof', {
            userId: user.id,
            error: emailError instanceof Error ? emailError.message : String(emailError)
          });
        }
      }
    } catch (error) {
      this.logger.error('Day 7 social proof failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Send Day 14 re-engagement email (final push)
   */
  async sendDay14ReEngagement(): Promise<void> {
    try {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

      const { data: users, error } = await this.supabase
        .from('users')
        .select('id, email, first_name, created_at')
        .gte('created_at', fifteenDaysAgo.toISOString())
        .lte('created_at', fourteenDaysAgo.toISOString())
        .not('id', 'in', `(SELECT user_id FROM subscriptions WHERE status = 'active' AND plan_id != 'free')`);

      if (error) {
        this.logger.error('Failed to query Day 14 users', { error });
        return;
      }

      for (const user of users || []) {
        try {
          await this.emailService.sendEmail({
            to: user.email,
            templateId: 'plg-day14-re-engagement',
            dynamicTemplateData: {
              firstName: user.first_name || 'there',
              checkoutUrl: 'https://storytailor.com/checkout?planId=pro_individual&discount=WELCOME15'
            }
          });

          this.logger.info('Day 14 re-engagement sent', { userId: user.id, email: user.email });
        } catch (emailError) {
          this.logger.error('Failed to send Day 14 re-engagement', {
            userId: user.id,
            error: emailError instanceof Error ? emailError.message : String(emailError)
          });
        }
      }
    } catch (error) {
      this.logger.error('Day 14 re-engagement failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Send Day 0 earning opportunities (after Story 2)
   * Called immediately after user creates their 2nd story
   */
  async sendDay0EarningOpportunities(userId: string): Promise<void> {
    try {
      const { data: user } = await this.supabase
        .from('users')
        .select('email, first_name, available_story_credits, profile_completed, smart_home_connected')
        .eq('id', userId)
        .single();

      if (!user?.email) {
        this.logger.warn('User email not found for Day 0 nudge', { userId });
        return;
      }

      await this.emailService.sendEmail({
        to: user.email,
        templateId: 'plg-day0-earning-opportunities',
            dynamicTemplateData: {
              firstName: user.first_name || 'there',
              profileUrl: 'https://storytailor.com/profile',
              smartHomeUrl: 'https://storytailor.com/settings/smart-home',
              inviteUrl: 'https://storytailor.com/invite'
            }
      });

      this.logger.info('Day 0 earning opportunities sent', { userId, email: user.email });
    } catch (error) {
      this.logger.error('Day 0 earning opportunities failed', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Send immediate credit earned confirmation
   */
  async sendEarningConfirmation(userId: string, creditType: string, amount: number): Promise<void> {
    try {
      const { data: user } = await this.supabase
        .from('users')
        .select('email, first_name, available_story_credits')
        .eq('id', userId)
        .single();

      if (!user?.email) {
        this.logger.warn('User email not found for earning confirmation', { userId });
        return;
      }

      const creditTypeNames: Record<string, string> = {
        'profile_complete': 'Profile Completion',
        'smart_home_connect': 'Smart Home Connection',
        'referral_accepted': 'Friend Invitation'
      };

      await this.emailService.sendEmail({
        to: user.email,
        templateId: 'plg-credit-earned',
        dynamicTemplateData: {
          firstName: user.first_name || 'there',
          creditType: creditTypeNames[creditType] || creditType,
          amount,
          totalCredits: user.available_story_credits || 0,
          createStoryUrl: 'https://storytailor.com/stories/create'
        }
      });

      this.logger.info('Earning confirmation sent', { userId, creditType, amount });
    } catch (error) {
      this.logger.error('Earning confirmation failed', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Send referral reward email
   */
  async sendReferralReward(userId: string, friendEmail: string): Promise<void> {
    try {
      const { data: user } = await this.supabase
        .from('users')
        .select('email, first_name, available_story_credits')
        .eq('id', userId)
        .single();

      if (!user?.email) {
        this.logger.warn('User email not found for referral reward', { userId });
        return;
      }

      await this.emailService.sendEmail({
        to: user.email,
        templateId: 'plg-referral-reward',
        dynamicTemplateData: {
          firstName: user.first_name || 'there',
          friendEmail,
          totalCredits: user.available_story_credits || 0,
          createStoryUrl: 'https://storytailor.com/stories/create'
        }
      });

      this.logger.info('Referral reward sent', { userId, friendEmail });
    } catch (error) {
      this.logger.error('Referral reward failed', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

