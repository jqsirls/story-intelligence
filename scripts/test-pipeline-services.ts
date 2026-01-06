/**
 * Test Pipeline Services
 * 
 * Direct TypeScript testing of pipeline services
 * Usage: npx ts-node scripts/test-pipeline-services.ts
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger, format, transports } from 'winston';
import Stripe from 'stripe';

// Initialize
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()]
});

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://lendybmmnlqelrhkhdyc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

// Import services
import { ConsumptionAnalyticsService } from '../packages/universal-agent/dist/services/ConsumptionAnalyticsService';
import { StoryEffectivenessService } from '../packages/universal-agent/dist/services/StoryEffectivenessService';
import { ReferralRewardService } from '../packages/universal-agent/dist/services/ReferralRewardService';
import { EmailService } from '../packages/universal-agent/dist/services/EmailService';

// Test IDs (from create-test-data.sh)
const TEST_USER_ID = process.env.TEST_USER_ID || '';
const TEST_STORY_ID = process.env.TEST_STORY_ID || '';

async function testConsumptionService() {
  console.log('\n📊 Testing ConsumptionAnalyticsService...');
  
  try {
    const service = new ConsumptionAnalyticsService(supabase, logger);
    
    // Track event
    await service.trackEvent({
      storyId: TEST_STORY_ID,
      userId: TEST_USER_ID,
      eventType: 'play_complete',
      timestamp: new Date(),
      duration: 720,
      metadata: { device: 'test' }
    });
    
    console.log('✅ Consumption event tracked');
    
    // Get metrics
    const metrics = await service.getMetrics(TEST_STORY_ID, TEST_USER_ID);
    console.log('✅ Metrics retrieved:', {
      readCount: metrics?.readCount,
      engagementScore: metrics?.engagementScore
    });
    
    return true;
  } catch (error) {
    console.error('❌ ConsumptionAnalyticsService failed:', error);
    return false;
  }
}

async function testEffectivenessService() {
  console.log('\n⭐ Testing StoryEffectivenessService...');
  
  try {
    const emailService = new EmailService(supabase, logger);
    const service = new StoryEffectivenessService(supabase, emailService, logger);
    
    // Calculate effectiveness
    const effectiveness = await service.calculateEffectiveness(TEST_STORY_ID, TEST_USER_ID);
    
    if (effectiveness) {
      console.log('✅ Effectiveness calculated:', {
        score: effectiveness.effectivenessScore,
        improvements: effectiveness.improvements?.length || 0
      });
    } else {
      console.log('⚠️  No effectiveness data (may need more consumption data)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ StoryEffectivenessService failed:', error);
    return false;
  }
}

async function testReferralService() {
  console.log('\n💰 Testing ReferralRewardService...');
  
  try {
    const service = new ReferralRewardService(supabase, logger, stripe.apiKey);
    
    // Get available credits
    const credits = await service.getAvailableCredits(TEST_USER_ID);
    console.log('✅ Credits retrieved:', credits);
    
    // Get reward ledger
    const ledger = await service.getRewardLedger(TEST_USER_ID, 10);
    console.log('✅ Reward ledger retrieved:', ledger.length, 'entries');
    
    return true;
  } catch (error) {
    console.error('❌ ReferralRewardService failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Running Pipeline Service Tests\n');
  console.log('Test User ID:', TEST_USER_ID);
  console.log('Test Story ID:', TEST_STORY_ID);
  
  if (!TEST_USER_ID || !TEST_STORY_ID) {
    console.error('❌ TEST_USER_ID and TEST_STORY_ID required');
    console.log('Run: ./scripts/create-test-data.sh first');
    process.exit(1);
  }
  
  const results = {
    consumption: await testConsumptionService(),
    effectiveness: await testEffectivenessService(),
    referral: await testReferralService()
  };
  
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  Object.entries(results).forEach(([service, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${service}: ${status}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n✅ All service tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some service tests failed');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

