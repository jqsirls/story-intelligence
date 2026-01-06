/**
 * Tier-Based Asset Generation Service
 * 
 * Determines which assets to auto-generate based on user subscription tier.
 * This ensures users get value appropriate to their plan while managing costs.
 * 
 * Pipeline Flow:
 * Story API → Audio API → Art API → PDF API → QR API → Activities API
 * 
 * Each tier gets progressively more assets auto-generated.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AssetType } from './AssetGenerationPipeline';

/**
 * Subscription tiers ordered by value
 */
export type SubscriptionTier = 'free' | 'starter' | 'family' | 'premium' | 'unlimited' | 'b2b';

/**
 * Assets available per tier
 */
export interface TierAssetConfig {
  tier: SubscriptionTier;
  autoGenerateAssets: AssetType[];
  manualGenerateAssets: AssetType[];
  limits: {
    storiesPerMonth: number;
    audioPerMonth: number;
    artPerMonth: number;
    pdfPerMonth: number;
    activitiesPerMonth: number;
  };
  features: {
    customVoice: boolean;
    customArtStyle: boolean;
    highResArt: boolean;
    advancedPDF: boolean;
    priorityGeneration: boolean;
    smartHomeIntegration: boolean;
    emotionTracking: boolean;
    b2bReporting: boolean;
  };
}

/**
 * Tier configuration map
 */
export const TIER_CONFIGS: Record<SubscriptionTier, TierAssetConfig> = {
  free: {
    tier: 'free',
    autoGenerateAssets: [],
    manualGenerateAssets: ['art'],
    limits: {
      storiesPerMonth: 3,
      audioPerMonth: 0,
      artPerMonth: 3,
      pdfPerMonth: 0,
      activitiesPerMonth: 0
    },
    features: {
      customVoice: false,
      customArtStyle: false,
      highResArt: false,
      advancedPDF: false,
      priorityGeneration: false,
      smartHomeIntegration: false,
      emotionTracking: false,
      b2bReporting: false
    }
  },
  starter: {
    tier: 'starter',
    autoGenerateAssets: ['art'],
    manualGenerateAssets: ['audio', 'activities'],
    limits: {
      storiesPerMonth: 10,
      audioPerMonth: 5,
      artPerMonth: 10,
      pdfPerMonth: 5,
      activitiesPerMonth: 10
    },
    features: {
      customVoice: false,
      customArtStyle: true,
      highResArt: false,
      advancedPDF: false,
      priorityGeneration: false,
      smartHomeIntegration: false,
      emotionTracking: true,
      b2bReporting: false
    }
  },
  family: {
    tier: 'family',
    autoGenerateAssets: ['art', 'audio', 'activities'],
    manualGenerateAssets: ['pdf'],
    limits: {
      storiesPerMonth: 30,
      audioPerMonth: 30,
      artPerMonth: 30,
      pdfPerMonth: 15,
      activitiesPerMonth: 30
    },
    features: {
      customVoice: true,
      customArtStyle: true,
      highResArt: true,
      advancedPDF: false,
      priorityGeneration: false,
      smartHomeIntegration: true,
      emotionTracking: true,
      b2bReporting: false
    }
  },
  premium: {
    tier: 'premium',
    autoGenerateAssets: ['art', 'audio', 'activities', 'pdf'],
    manualGenerateAssets: [],
    limits: {
      storiesPerMonth: 100,
      audioPerMonth: 100,
      artPerMonth: 100,
      pdfPerMonth: 100,
      activitiesPerMonth: 100
    },
    features: {
      customVoice: true,
      customArtStyle: true,
      highResArt: true,
      advancedPDF: true,
      priorityGeneration: true,
      smartHomeIntegration: true,
      emotionTracking: true,
      b2bReporting: false
    }
  },
  unlimited: {
    tier: 'unlimited',
    autoGenerateAssets: ['art', 'audio', 'activities', 'pdf'],
    manualGenerateAssets: [],
    limits: {
      storiesPerMonth: -1, // unlimited
      audioPerMonth: -1,
      artPerMonth: -1,
      pdfPerMonth: -1,
      activitiesPerMonth: -1
    },
    features: {
      customVoice: true,
      customArtStyle: true,
      highResArt: true,
      advancedPDF: true,
      priorityGeneration: true,
      smartHomeIntegration: true,
      emotionTracking: true,
      b2bReporting: false
    }
  },
  b2b: {
    tier: 'b2b',
    autoGenerateAssets: ['art', 'audio', 'activities', 'pdf'],
    manualGenerateAssets: [],
    limits: {
      storiesPerMonth: -1, // unlimited
      audioPerMonth: -1,
      artPerMonth: -1,
      pdfPerMonth: -1,
      activitiesPerMonth: -1
    },
    features: {
      customVoice: true,
      customArtStyle: true,
      highResArt: true,
      advancedPDF: true,
      priorityGeneration: true,
      smartHomeIntegration: true,
      emotionTracking: true,
      b2bReporting: true
    }
  }
};

/**
 * Usage tracking for the current billing period
 */
export interface UserUsage {
  storiesCreated: number;
  audioGenerated: number;
  artGenerated: number;
  pdfGenerated: number;
  activitiesGenerated: number;
  periodStart: string;
  periodEnd: string;
}

/**
 * Result of asset eligibility check
 */
export interface AssetEligibilityResult {
  eligible: boolean;
  assetsToGenerate: AssetType[];
  assetsManualOnly: AssetType[];
  assetsUnavailable: AssetType[];
  usageRemaining: {
    stories: number;
    audio: number;
    art: number;
    pdf: number;
    activities: number;
  };
  upgradeRequired?: {
    tier: SubscriptionTier;
    reason: string;
  };
}

export class TierBasedAssetGeneration {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Get tier configuration for a user
   */
  async getUserTierConfig(userId: string): Promise<TierAssetConfig> {
    try {
      const { data: subscription } = await this.supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      const tier = (subscription?.tier as SubscriptionTier) || 'free';
      return TIER_CONFIGS[tier] || TIER_CONFIGS.free;
    } catch {
      return TIER_CONFIGS.free;
    }
  }

  /**
   * Get user's current usage for the billing period
   */
  async getUserUsage(userId: string): Promise<UserUsage> {
    try {
      // Get current billing period (assuming monthly)
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data: usage } = await this.supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .gte('period_start', periodStart.toISOString())
        .single();

      if (usage) {
        return {
          storiesCreated: usage.stories_created || 0,
          audioGenerated: usage.audio_generated || 0,
          artGenerated: usage.art_generated || 0,
          pdfGenerated: usage.pdf_generated || 0,
          activitiesGenerated: usage.activities_generated || 0,
          periodStart: usage.period_start,
          periodEnd: usage.period_end
        };
      }

      // Create new usage record if none exists
      await this.supabase
        .from('user_usage')
        .insert({
          user_id: userId,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          stories_created: 0,
          audio_generated: 0,
          art_generated: 0,
          pdf_generated: 0,
          activities_generated: 0
        });

      return {
        storiesCreated: 0,
        audioGenerated: 0,
        artGenerated: 0,
        pdfGenerated: 0,
        activitiesGenerated: 0,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString()
      };
    } catch {
      return {
        storiesCreated: 0,
        audioGenerated: 0,
        artGenerated: 0,
        pdfGenerated: 0,
        activitiesGenerated: 0,
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString()
      };
    }
  }

  /**
   * Check which assets a user can generate based on tier and usage
   */
  async checkAssetEligibility(
    userId: string,
    requestedAssets: AssetType[]
  ): Promise<AssetEligibilityResult> {
    const tierConfig = await this.getUserTierConfig(userId);
    const usage = await this.getUserUsage(userId);

    const assetsToGenerate: AssetType[] = [];
    const assetsManualOnly: AssetType[] = [];
    const assetsUnavailable: AssetType[] = [];

    // Calculate remaining usage
    const calcRemaining = (used: number, limit: number) => 
      limit === -1 ? Infinity : Math.max(0, limit - used);

    const usageRemaining = {
      stories: calcRemaining(usage.storiesCreated, tierConfig.limits.storiesPerMonth),
      audio: calcRemaining(usage.audioGenerated, tierConfig.limits.audioPerMonth),
      art: calcRemaining(usage.artGenerated, tierConfig.limits.artPerMonth),
      pdf: calcRemaining(usage.pdfGenerated, tierConfig.limits.pdfPerMonth),
      activities: calcRemaining(usage.activitiesGenerated, tierConfig.limits.activitiesPerMonth)
    };

    for (const asset of requestedAssets) {
      // Check if auto-generate is allowed
      if (tierConfig.autoGenerateAssets.includes(asset)) {
        // Check usage limit
        const limitKey = this.assetToLimitKey(asset);
        if (usageRemaining[limitKey] > 0) {
          assetsToGenerate.push(asset);
        } else {
          assetsUnavailable.push(asset);
        }
      } else if (tierConfig.manualGenerateAssets.includes(asset)) {
        const limitKey = this.assetToLimitKey(asset);
        if (usageRemaining[limitKey] > 0) {
          assetsManualOnly.push(asset);
        } else {
          assetsUnavailable.push(asset);
        }
      } else {
        assetsUnavailable.push(asset);
      }
    }

    // Determine if upgrade is needed
    let upgradeRequired;
    if (assetsUnavailable.length > 0) {
      const nextTier = this.getRecommendedUpgrade(tierConfig.tier);
      if (nextTier) {
        upgradeRequired = {
          tier: nextTier,
          reason: `Unlock ${assetsUnavailable.join(', ')} generation with ${nextTier} plan`
        };
      }
    }

    return {
      eligible: assetsToGenerate.length > 0,
      assetsToGenerate,
      assetsManualOnly,
      assetsUnavailable,
      usageRemaining,
      upgradeRequired
    };
  }

  /**
   * Determine which assets to auto-generate for a new story based on tier
   */
  async getAutoGenerateAssets(userId: string): Promise<AssetType[]> {
    const tierConfig = await this.getUserTierConfig(userId);
    const usage = await this.getUserUsage(userId);

    const eligibleAssets: AssetType[] = [];

    for (const asset of tierConfig.autoGenerateAssets) {
      const limitKey = this.assetToLimitKey(asset);
      const limit = tierConfig.limits[`${limitKey}PerMonth` as keyof typeof tierConfig.limits];
      const used = usage[`${limitKey}Generated` as keyof UserUsage] as number || 0;

      if (limit === -1 || used < limit) {
        eligibleAssets.push(asset);
      }
    }

    return eligibleAssets;
  }

  /**
   * Increment usage counter after asset generation
   */
  async incrementUsage(userId: string, assetType: AssetType): Promise<void> {
    try {
      const usage = await this.getUserUsage(userId);
      const updateField = `${this.assetToLimitKey(assetType)}_generated`;

      await this.supabase
        .from('user_usage')
        .update({
          [updateField]: (usage[`${this.assetToLimitKey(assetType)}Generated` as keyof UserUsage] as number || 0) + 1
        })
        .eq('user_id', userId)
        .gte('period_start', usage.periodStart);
    } catch (error) {
      console.error('Failed to increment usage:', error);
    }
  }

  /**
   * Check if user has a specific feature enabled
   */
  async hasFeature(userId: string, feature: keyof TierAssetConfig['features']): Promise<boolean> {
    const tierConfig = await this.getUserTierConfig(userId);
    return tierConfig.features[feature] || false;
  }

  /**
   * Get priority level for asset generation queue
   */
  async getGenerationPriority(userId: string): Promise<'low' | 'normal' | 'high'> {
    const tierConfig = await this.getUserTierConfig(userId);
    
    if (tierConfig.features.priorityGeneration) {
      return 'high';
    }
    
    if (['family', 'premium', 'unlimited', 'b2b'].includes(tierConfig.tier)) {
      return 'normal';
    }
    
    return 'low';
  }

  // Private helpers

  private assetToLimitKey(asset: AssetType): 'audio' | 'art' | 'pdf' | 'activities' | 'stories' {
    switch (asset) {
      case 'audio': return 'audio';
      case 'art': return 'art';
      case 'pdf': return 'pdf';
      case 'activities': return 'activities';
      default: return 'stories';
    }
  }

  private getRecommendedUpgrade(currentTier: SubscriptionTier): SubscriptionTier | null {
    const upgradePath: Record<SubscriptionTier, SubscriptionTier | null> = {
      free: 'starter',
      starter: 'family',
      family: 'premium',
      premium: 'unlimited',
      unlimited: null,
      b2b: null
    };
    return upgradePath[currentTier];
  }
}

/**
 * Factory function for creating the service
 */
export function createTierBasedAssetGeneration(supabase: SupabaseClient): TierBasedAssetGeneration {
  return new TierBasedAssetGeneration(supabase);
}

