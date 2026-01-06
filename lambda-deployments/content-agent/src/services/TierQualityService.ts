/**
 * Tier Quality Service
 * Determines story generation quality based on user's subscription tier
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface TierQualityConfig {
  gptModel: string;
  imageCount: number;
  audioProvider: 'polly' | 'elevenlabs';
  priorityQueue: boolean;
  costPerStory: number;
}

export interface UserTierInfo {
  tier: string;
  storyLimit: number;
  storiesUsed: number;
  canCreate: boolean;
  hasCredits: boolean;
  credits: number;
}

export class TierQualityService {
  private supabase: SupabaseClient;
  
  // Tier quality configurations
  private tierConfigs: Record<string, TierQualityConfig> = {
    free: {
      gptModel: 'gpt-4-turbo-preview',
      imageCount: 2,
      audioProvider: 'polly',
      priorityQueue: false,
      costPerStory: 0.15
    },
    alexa_free: {
      gptModel: 'gpt-4-turbo-preview',
      imageCount: 2,
      audioProvider: 'polly',
      priorityQueue: false,
      costPerStory: 0.15
    },
    alexa_starter: {
      gptModel: 'gpt-5',
      imageCount: 5,
      audioProvider: 'elevenlabs',
      priorityQueue: false,
      costPerStory: 1.00
    },
    individual: {
      gptModel: 'gpt-5',
      imageCount: 5,
      audioProvider: 'elevenlabs',
      priorityQueue: false,
      costPerStory: 1.00
    },
    premium: {
      gptModel: 'gpt-5',
      imageCount: 5,
      audioProvider: 'elevenlabs',
      priorityQueue: true,
      costPerStory: 1.00
    },
    family: {
      gptModel: 'gpt-5',
      imageCount: 5,
      audioProvider: 'elevenlabs',
      priorityQueue: false,
      costPerStory: 1.00
    }
  };

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get user's tier information and usage
   */
  async getUserTierInfo(userId: string): Promise<UserTierInfo> {
    // Check subscription
    const { data: subscription } = await this.supabase
      .from('subscriptions')
      .select('tier, story_limit, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    const tier = subscription?.tier || 'free';
    const storyLimit = subscription?.story_limit ?? 1;

    // Check current usage
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: usage } = await this.supabase
      .from('story_usage')
      .select('stories_used')
      .eq('user_id', userId)
      .gte('billing_period_start', periodStart.toISOString())
      .lte('billing_period_end', periodEnd.toISOString())
      .single();

    const storiesUsed = usage?.stories_used || 0;

    // Check credits
    const { data: credits } = await this.supabase
      .from('story_credits')
      .select('credits_remaining')
      .eq('user_id', userId)
      .or('expires_at.is.null,expires_at.gt.' + now.toISOString());

    const totalCredits = credits?.reduce((sum, c: any) => sum + (c.credits_remaining || 0), 0) || 0;

    const canCreate = (storyLimit === -1) || (storiesUsed < storyLimit) || (totalCredits > 0);

    return {
      tier,
      storyLimit,
      storiesUsed,
      canCreate,
      hasCredits: totalCredits > 0,
      credits: totalCredits
    };
  }

  /**
   * Get quality configuration for tier
   */
  getQualityConfig(tier: string): TierQualityConfig {
    return this.tierConfigs[tier] || this.tierConfigs.free;
  }

  /**
   * Check if user can create story and return quality config
   */
  async checkAndGetQuality(userId: string): Promise<{
    allowed: boolean;
    quality: TierQualityConfig;
    tierInfo: UserTierInfo;
    message?: string;
  }> {
    const tierInfo = await this.getUserTierInfo(userId);
    const quality = this.getQualityConfig(tierInfo.tier);

    if (!tierInfo.canCreate) {
      return {
        allowed: false,
        quality,
        tierInfo,
        message: `Story limit reached (${tierInfo.storiesUsed}/${tierInfo.storyLimit}). Upgrade or purchase story pack to continue.`
      };
    }

    return {
      allowed: true,
      quality,
      tierInfo
    };
  }

  /**
   * Increment usage after story creation
   */
  async incrementUsage(userId: string): Promise<void> {
    const tierInfo = await this.getUserTierInfo(userId);
    
    // Call the database function
    await this.supabase.rpc('increment_story_usage', {
      p_user_id: userId,
      p_tier: tierInfo.tier,
      p_limit: tierInfo.storyLimit
    });
  }

  /**
   * Check if user should see upgrade suggestion
   */
  async shouldSuggestUpgrade(userId: string): Promise<{
    suggest: boolean;
    fromTier: string;
    toTier: string;
    reason: string;
  } | null> {
    const tierInfo = await this.getUserTierInfo(userId);

    // Approaching limit
    if (tierInfo.storyLimit > 0 && tierInfo.storiesUsed >= tierInfo.storyLimit * 0.8) {
      return {
        suggest: true,
        fromTier: tierInfo.tier,
        toTier: this.getUpgradeTier(tierInfo.tier),
        reason: 'usage_exceeded'
      };
    }

    // Check pack spending
    const { data: packs } = await this.supabase
      .from('story_credits')
      .select('credits_purchased')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const packsPurchased = packs?.length || 0;
    if (packsPurchased >= 2 && tierInfo.tier === 'free') {
      return {
        suggest: true,
        fromTier: 'free',
        toTier: 'individual',
        reason: 'pack_spending'
      };
    }

    // Power user
    if (tierInfo.tier === 'individual' && tierInfo.storiesUsed >= 25) {
      return {
        suggest: true,
        fromTier: 'individual',
        toTier: 'premium',
        reason: 'power_user'
      };
    }

    return null;
  }

  private getUpgradeTier(currentTier: string): string {
    const upgrades: Record<string, string> = {
      free: 'individual',
      alexa_free: 'alexa_starter',
      alexa_starter: 'individual',
      individual: 'premium',
      premium: 'family',
      family: 'family' // Already at top
    };
    return upgrades[currentTier] || 'individual';
  }
}

