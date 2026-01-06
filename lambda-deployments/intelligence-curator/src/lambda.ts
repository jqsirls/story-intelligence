/**
 * Intelligence Curator Lambda Handler
 * 
 * Handles EventBridge scheduled jobs and event-driven pipelines.
 * Routes to appropriate services based on jobType.
 */

import { Handler, EventBridgeEvent } from 'aws-lambda';
import { createClient } from '@supabase/supabase-js';
import { createLogger, format, transports } from 'winston';
import { IntelligenceCurator } from '../../../packages/universal-agent/src/services/IntelligenceCurator';
import { EmailService } from '../../../packages/universal-agent/src/services/EmailService';
import { DailyDigestService } from '../../../packages/universal-agent/src/services/DailyDigestService';
import { WeeklyInsightsService } from '../../../packages/universal-agent/src/services/WeeklyInsightsService';
import { StoryEffectivenessService } from '../../../packages/universal-agent/src/services/StoryEffectivenessService';
import { PowerUserDetectionService } from '../../../packages/universal-agent/src/services/PowerUserDetectionService';
import { OrganizationHealthService } from '../../../packages/universal-agent/src/services/OrganizationHealthService';
import { ReferralRewardService } from '../../../packages/universal-agent/src/services/ReferralRewardService';
import { ConsumptionAnalyticsService } from '../../../packages/universal-agent/src/services/ConsumptionAnalyticsService';
import { UserTypeRouter } from '../../../packages/universal-agent/src/services/UserTypeRouter';
import { PLGNudgeService } from '../../../packages/universal-agent/src/services/PLGNudgeService';

// Initialize logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console()
  ]
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize services
// NOTE: This lambda is packaged with its own node_modules, while the imported
// Universal Agent services come from the monorepo workspace. That can result in
// duplicate `@supabase/supabase-js` copies and a TypeScript type mismatch.
// Runtime objects are compatible; we cast here to keep builds clean without refactors.
const emailService = new EmailService(supabase as any, logger);
const consumptionService = new ConsumptionAnalyticsService(supabase as any, logger);
const userTypeRouter = new UserTypeRouter(supabase as any, logger);
const curator = new IntelligenceCurator(supabase as any, emailService, logger);

const dailyDigestService = new DailyDigestService(
  supabase as any,
  emailService,
  consumptionService,
  curator,
  userTypeRouter,
  logger
);

const weeklyInsightsService = new WeeklyInsightsService(
  supabase as any,
  emailService,
  curator,
  userTypeRouter,
  logger
);

const effectivenessService = new StoryEffectivenessService(
  supabase as any,
  emailService,
  logger
);

const powerUserService = new PowerUserDetectionService(
  supabase as any,
  emailService,
  logger
);

const orgHealthService = new OrganizationHealthService(
  supabase as any,
  emailService,
  logger
);

const referralRewardService = new ReferralRewardService(
  supabase as any,
  logger,
  process.env.STRIPE_SECRET_KEY!
);

const plgNudgeService = new PLGNudgeService(
  supabase as any,
  emailService,
  logger
);

// ============================================================================
// Lambda Handler
// ============================================================================

export const handler: Handler = async (event: EventBridgeEvent<string, any>) => {
  const jobType = event.detail?.jobType || event.detail?.type || 'unknown';
  
  logger.info('Intelligence Curator invoked', {
    jobType,
    source: event.source,
    time: event.time
  });
  
  try {
    switch (jobType) {
      case 'daily_digest':
        await dailyDigestService.processBatchDigests();
        break;
      
      case 'weekly_insights':
        await weeklyInsightsService.processBatchInsights();
        break;
      
      case 'story_scoring':
        await effectivenessService.processBatchScoring();
        break;
      
      case 'referral_rewards':
        // Process pending referral rewards
        await processReferralRewards();
        break;
      
      case 'expire_credits':
        await referralRewardService.expireOldCredits();
        break;
      
      case 'org_health':
        await processOrgHealthReports();
        break;
      
      case 'power_user_detection':
        await processPowerUserDetection();
        break;
      
      case 'asset_timeout_check':
        await processAssetTimeouts();
        break;
      
      case 'day3_nudge':
        await plgNudgeService.sendDay3Reminders();
        break;
      
      case 'day7_nudge':
        await plgNudgeService.sendDay7SocialProof();
        break;
      
      case 'day14_nudge':
        await plgNudgeService.sendDay14ReEngagement();
        break;
      
      default:
        logger.warn('Unknown job type', { jobType });
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Job processed successfully',
        jobType
      })
    };
    
  } catch (error) {
    logger.error('Job processing failed', {
      error: error instanceof Error ? error.message : String(error),
      jobType
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
};

// ============================================================================
// Job Processors
// ============================================================================

async function processReferralRewards(): Promise<void> {
  // Process pending referral conversions
  const { data: pending } = await supabase
    .from('referral_tracking')
    .select('*')
    .eq('status', 'converted')
    .eq('reward_status', 'pending');
  
  if (pending) {
    for (const referral of pending) {
      try {
        await referralRewardService.processReferralConversion({
          referrerId: referral.referrer_id,
          refereeId: referral.referred_id,
          rewardType: referral.reward_type || 'casual',
          rewardAmount: referral.reward_value || 1000,
          subscriptionId: referral.subscription_id
        });
      } catch (error) {
        logger.error('Failed to process referral reward', {
          referralId: referral.id,
          error
        });
      }
    }
  }
}

async function processOrgHealthReports(): Promise<void> {
  // Get all organizations
  const { data: orgs } = await supabase
    .from('organization_accounts')
    .select('id');
  
  if (orgs) {
    for (const org of orgs) {
      try {
        await orgHealthService.sendHealthReport(org.id);
      } catch (error) {
        logger.error('Failed to send org health report', {
          orgId: org.id,
          error
        });
      }
    }
  }
}

async function processPowerUserDetection(): Promise<void> {
  // Get free tier users with recent activity
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const { data: activeUsers } = await supabase
    .from('stories')
    .select('creator_user_id')
    .gte('created_at', weekAgo.toISOString());
  
  if (activeUsers) {
    const uniqueUsers = [...new Set(activeUsers.map(s => s.creator_user_id))];
    
    for (const userId of uniqueUsers) {
      try {
        await powerUserService.detectAndNotify(userId);
      } catch (error) {
        logger.error('Failed to detect power user', { userId, error });
      }
    }
  }
}

async function processAssetTimeouts(): Promise<void> {
  // Check for asset jobs stuck in generating for >30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  
  // IMPORTANT: `asset_generation_jobs` schema (see `supabase/migrations/20250101000020_rest_api_asset_tracking.sql`)
  // does NOT include `updated_at`. Use `started_at` (preferred) or `created_at` as fallback.
  const { data: stuck } = await supabase
    .from('asset_generation_jobs')
    .select('*')
    .eq('status', 'generating')
    .or(`started_at.lt.${thirtyMinutesAgo.toISOString()},and(started_at.is.null,created_at.lt.${thirtyMinutesAgo.toISOString()})`);
  
  if (stuck) {
    for (const job of stuck) {
      // Mark as timeout and notify
      await supabase
        .from('asset_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Asset generation timeout',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      // Ensure UI listening on stories gets a realtime UPDATE for this story.
      // Minimal update: mark the specific asset as failed in `stories.asset_generation_status`.
      try {
        const assetType = job.asset_type;
        const { data: story } = await supabase
          .from('stories')
          .select('asset_generation_status')
          .eq('id', job.story_id)
          .single();

        const currentStatus: any = story?.asset_generation_status || { overall: 'generating', assets: {} };
        currentStatus.assets = currentStatus.assets || {};
        currentStatus.assets[assetType] = {
          ...(currentStatus.assets[assetType] || {}),
          status: 'failed',
          progress: 0,
          error: 'Asset generation timeout',
          completedAt: new Date().toISOString()
        };

        // If nothing is still generating, mark overall failed.
        const assetStatuses = Object.values(currentStatus.assets || {});
        const anyGenerating = assetStatuses.some((a: any) => a?.status === 'generating');
        if (!anyGenerating) currentStatus.overall = 'failed';

        await supabase
          .from('stories')
          .update({
            asset_generation_status: currentStatus,
            asset_generation_completed_at: new Date().toISOString()
          })
          .eq('id', job.story_id);
      } catch (storyUpdateErr) {
        logger.warn('Failed to update story after asset timeout', {
          storyId: job.story_id,
          jobId: job.id,
          error: storyUpdateErr instanceof Error ? storyUpdateErr.message : String(storyUpdateErr)
        });
      }

      // Send asset timeout email
      // TODO: Wire to email service
      logger.warn('Asset timeout detected', { jobId: job.id });
    }
  }
}

