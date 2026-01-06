/**
 * Referral Reward Service
 * 
 * Manages PLG referral system with credit ledger and Stripe integration.
 * Supports tiered rewards, milestone bonuses, and automatic credit application.
 * 
 * Reward Tiers:
 * - Casual (B2C): $10 per referral, tiered bonuses
 * - Teacher: $50 per referral
 * - Affiliate: 20% recurring commission
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import Stripe from 'stripe';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ReferralReward {
  id: string;
  userId: string;
  source: 'referral' | 'story_share' | 'teacher_referral' | 'milestone_bonus' | 'power_user_reward';
  amount: number; // In cents
  currency: string;
  status: 'pending' | 'applied' | 'expired' | 'refunded';
  stripeBalanceTxnId?: string;
  stripeCustomerId?: string;
  appliedToInvoice?: string;
  appliedAt?: Date;
  expiresAt?: Date;
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface ReferralConversion {
  referrerId: string;
  refereeId: string;
  rewardType: 'casual' | 'affiliate' | 'teacher' | 'milestone';
  rewardAmount: number;
  subscriptionId: string;
}

export interface MilestoneBonus {
  referralCount: number;
  bonusAmount: number;
  description: string;
}

// ============================================================================
// Milestone Configuration
// ============================================================================

const MILESTONE_BONUSES: MilestoneBonus[] = [
  {
    referralCount: 3,
    bonusAmount: 500, // $5
    description: '3 referrals milestone'
  },
  {
    referralCount: 5,
    bonusAmount: 1000, // $10 (+ 1 month free = ~$20 value)
    description: '5 referrals milestone - 1 month free'
  },
  {
    referralCount: 10,
    bonusAmount: 0, // 50% off forever (handled via Stripe coupon)
    description: '10 referrals milestone - 50% off forever'
  }
];

const REWARD_AMOUNTS = {
  casual: 1000, // $10
  teacher: 5000, // $50
  affiliate: 0, // 20% recurring (handled separately)
  storyShare: 500 // $5
};

// ============================================================================
// Referral Reward Service
// ============================================================================

export class ReferralRewardService {
  private stripe: Stripe;
  
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger,
    stripeSecretKey: string
  ) {
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16'
    });
  }
  
  /**
   * Process referral conversion (when referee subscribes)
   */
  async processReferralConversion(conversion: ReferralConversion): Promise<void> {
    try {
      this.logger.info('Processing referral conversion', {
        referrerId: conversion.referrerId,
        refereeId: conversion.refereeId,
        rewardType: conversion.rewardType
      });
      
      // Issue credit to referrer
      await this.issueCredit({
        userId: conversion.referrerId,
        amount: conversion.rewardAmount,
        source: conversion.rewardType === 'teacher' ? 'teacher_referral' : 'referral',
        description: `Referral reward - ${conversion.refereeId} subscribed`,
        metadata: {
          refereeId: conversion.refereeId,
          subscriptionId: conversion.subscriptionId,
          rewardType: conversion.rewardType
        }
      });
      
      // Update referral tracking
      const { error: trackingError } = await this.supabase
        .from('referral_tracking')
        .update({
          status: 'converted',
          reward_type: conversion.rewardType,
          reward_value: conversion.rewardAmount,
          reward_status: 'issued',
          converted_at: new Date().toISOString()
        })
        .eq('referrer_id', conversion.referrerId)
        .eq('referred_id', conversion.refereeId);
      
      if (trackingError) {
        this.logger.error('Failed to update referral tracking', {
          error: trackingError
        });
      }
      
      // Check for milestone bonuses
      await this.checkMilestones(conversion.referrerId);
      
    } catch (error) {
      this.logger.error('Failed to process referral conversion', {
        error: error instanceof Error ? error.message : String(error),
        conversion
      });
      throw error;
    }
  }
  
  /**
   * Issue credit to user
   */
  async issueCredit(params: {
    userId: string;
    amount: number;
    source: ReferralReward['source'];
    description: string;
    metadata?: Record<string, any>;
    expiresInDays?: number;
  }): Promise<ReferralReward> {
    try {
      // Get user's Stripe customer ID
      const { data: user } = await this.supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', params.userId)
        .single();
      
      if (!user?.stripe_customer_id) {
        throw new Error('User does not have Stripe customer ID');
      }
      
      // Create Stripe balance transaction
      const balanceTransaction = await this.stripe.customers.createBalanceTransaction(
        user.stripe_customer_id,
        {
          amount: -params.amount, // Negative for credit
          currency: 'usd',
          description: params.description,
          metadata: params.metadata || {}
        }
      );
      
      // Calculate expiry
      const expiresAt = params.expiresInDays
        ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
        : null;
      
      // Insert into reward_ledger
      const { data: reward, error } = await this.supabase
        .from('reward_ledger')
        .insert({
          user_id: params.userId,
          source: params.source,
          amount: params.amount,
          currency: 'usd',
          stripe_balance_txn_id: balanceTransaction.id,
          stripe_customer_id: user.stripe_customer_id,
          status: 'applied', // Stripe applies automatically
          description: params.description,
          metadata: params.metadata || {},
          applied_at: new Date().toISOString(),
          expires_at: expiresAt?.toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      this.logger.info('Credit issued', {
        userId: params.userId,
        amount: params.amount,
        source: params.source,
        balanceTxnId: balanceTransaction.id
      });
      
      return {
        id: reward.id,
        userId: reward.user_id,
        source: reward.source,
        amount: reward.amount,
        currency: reward.currency,
        status: reward.status,
        stripeBalanceTxnId: reward.stripe_balance_txn_id,
        stripeCustomerId: reward.stripe_customer_id,
        appliedToInvoice: reward.applied_to_invoice,
        appliedAt: reward.applied_at ? new Date(reward.applied_at) : undefined,
        expiresAt: reward.expires_at ? new Date(reward.expires_at) : undefined,
        description: reward.description,
        metadata: reward.metadata,
        createdAt: new Date(reward.created_at)
      };
      
    } catch (error) {
      this.logger.error('Failed to issue credit', {
        error: error instanceof Error ? error.message : String(error),
        params
      });
      throw error;
    }
  }
  
  /**
   * Check and issue milestone bonuses
   */
  async checkMilestones(userId: string): Promise<void> {
    try {
      // Get successful referral count
      const { count: referralCount } = await this.supabase
        .from('referral_tracking')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', userId)
        .eq('status', 'converted');
      
      if (!referralCount) {
        return;
      }
      
      this.logger.info('Checking milestones', { userId, referralCount });
      
      // Check for milestone bonuses
      for (const milestone of MILESTONE_BONUSES) {
        if (referralCount === milestone.referralCount) {
          if (milestone.bonusAmount > 0) {
            // Issue credit bonus
            await this.issueCredit({
              userId,
              amount: milestone.bonusAmount,
              source: 'milestone_bonus',
              description: milestone.description,
              metadata: {
                referralCount: milestone.referralCount
              }
            });
          } else if (milestone.referralCount === 10) {
            // Apply 50% off forever coupon
            await this.apply50PercentCoupon(userId);
          }
        }
      }
      
    } catch (error) {
      this.logger.error('Failed to check milestones', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
    }
  }
  
  /**
   * Calculate available credits for user
   */
  async getAvailableCredits(userId: string): Promise<number> {
    try {
      const { data } = await this.supabase.rpc('calculate_user_credits', {
        p_user_id: userId
      });
      
      return data || 0;
      
    } catch (error) {
      this.logger.error('Failed to calculate available credits', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return 0;
    }
  }
  
  /**
   * Get reward ledger for user
   */
  async getRewardLedger(userId: string, limit: number = 50): Promise<ReferralReward[]> {
    try {
      const { data, error } = await this.supabase
        .from('reward_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error || !data) {
        return [];
      }
      
      return data.map(r => ({
        id: r.id,
        userId: r.user_id,
        source: r.source,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        stripeBalanceTxnId: r.stripe_balance_txn_id,
        stripeCustomerId: r.stripe_customer_id,
        appliedToInvoice: r.applied_to_invoice,
        appliedAt: r.applied_at ? new Date(r.applied_at) : undefined,
        expiresAt: r.expires_at ? new Date(r.expires_at) : undefined,
        description: r.description,
        metadata: r.metadata,
        createdAt: new Date(r.created_at)
      }));
      
    } catch (error) {
      this.logger.error('Failed to get reward ledger', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return [];
    }
  }
  
  /**
   * Handle story share reward
   */
  async rewardStoryShare(userId: string, storyId: string): Promise<void> {
    try {
      // Check if this is their first share
      const { count: existingShares } = await this.supabase
        .from('reward_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('source', 'story_share');
      
      const isFirstShare = (existingShares || 0) === 0;
      const amount = REWARD_AMOUNTS.storyShare;
      
      await this.issueCredit({
        userId,
        amount,
        source: 'story_share',
        description: isFirstShare 
          ? 'Story Ambassador - First share reward'
          : 'Story share reward',
        metadata: {
          storyId,
          firstShare: isFirstShare
        },
        expiresInDays: 90
      });
      
    } catch (error) {
      this.logger.error('Failed to reward story share', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        storyId
      });
    }
  }
  
  /**
   * Expire old credits
   */
  async expireOldCredits(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('reward_ledger')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString())
        .select('id');
      
      if (error) {
        throw error;
      }
      
      const expiredCount = data?.length || 0;
      
      if (expiredCount > 0) {
        this.logger.info('Expired old credits', { count: expiredCount });
      }
      
      return expiredCount;
      
    } catch (error) {
      this.logger.error('Failed to expire old credits', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  private async apply50PercentCoupon(userId: string): Promise<void> {
    try {
      // Get user's Stripe customer ID
      const { data: user } = await this.supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();
      
      if (!user?.stripe_customer_id) {
        throw new Error('User does not have Stripe customer ID');
      }
      
      // Create or get the 50% off forever coupon
      const couponId = 'storytailor-legend-10-referrals';
      
      try {
        // Try to create the coupon (idempotent)
        await this.stripe.coupons.create({
          id: couponId,
          percent_off: 50,
          duration: 'forever',
          name: 'Storytailor Legend - 10 Referrals'
        });
      } catch (error: any) {
        // Coupon already exists, that's fine
        if (error.code !== 'resource_already_exists') {
          throw error;
        }
      }
      
      // Apply coupon to customer
      await this.stripe.customers.update(user.stripe_customer_id, {
        coupon: couponId
      });
      
      this.logger.info('Applied 50% off forever coupon', {
        userId,
        customerId: user.stripe_customer_id
      });
      
      // Log in reward ledger for tracking
      await this.supabase
        .from('reward_ledger')
        .insert({
          user_id: userId,
          source: 'milestone_bonus',
          amount: 0, // Coupon, not credit
          currency: 'usd',
          stripe_customer_id: user.stripe_customer_id,
          status: 'applied',
          description: 'Storytailor Legend - 50% off forever (10 referrals)',
          metadata: {
            couponId,
            referralCount: 10
          },
          applied_at: new Date().toISOString()
        });
      
    } catch (error) {
      this.logger.error('Failed to apply 50% off coupon', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      throw error;
    }
  }
}

