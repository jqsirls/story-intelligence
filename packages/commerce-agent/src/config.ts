import { CommerceAgentConfig, PlanConfig } from './types';

export const getCommerceConfig = (): CommerceAgentConfig => ({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  redisUrl: process.env.REDIS_URL,
});

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    id: 'pro_individual',
    name: 'Pro Individual',
    type: 'individual',
    priceId: process.env.STRIPE_PRO_INDIVIDUAL_PRICE_ID || '',
    features: [
      'Unlimited stories',
      'Character library',
      'Audio generation',
      'PDF export',
      'Educational activities'
    ]
  },
  {
    id: 'pro_organization',
    name: 'Pro Organization',
    type: 'organization',
    priceId: process.env.STRIPE_PRO_ORGANIZATION_PRICE_ID || '',
    seatBased: true,
    maxSeats: 1000,
    features: [
      'All Pro Individual features',
      'Bulk student management',
      'Teacher dashboard',
      'Curriculum alignment',
      'Enhanced content filtering',
      'Organization analytics'
    ]
  }
];

export const DISCOUNT_CODES = {
  USER_INVITE: {
    percentage: 15,
    description: '15% off first month for invited users'
  },
  STORY_TRANSFER: {
    percentage: 20,
    description: '20% off first month for story transfer recipients'
  }
};