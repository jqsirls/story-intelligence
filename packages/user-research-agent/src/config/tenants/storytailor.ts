/**
 * Storytailor Tenant Configuration
 * First tenant of Fieldnotes - defines personas, brand voice, and delivery preferences
 */

import { TenantConfig } from '../../types';

export const storytailorConfig: TenantConfig = {
  tenantId: 'storytailor',
  
  dataSources: [
    {
      type: 'supabase',
      tables: ['event_store', 'users', 'stories', 'sessions']
    },
    {
      type: 'webhook',
      webhookUrl: process.env.FIELDNOTES_WEBHOOK_URL
    }
  ],
  
  personas: {
    buyer: {
      name: 'Parents',
      priorities: [
        'Time (bedtime crunch)',
        'Safety and privacy',
        'Trust in content quality',
        'Value for money'
      ],
      painPoints: [
        'Bedtime crunch (7pm-8pm peak usage)',
        'Setup time and complexity',
        'Cost concerns',
        'Uncertainty about age-appropriateness'
      ],
      contextualFactors: [
        '7pm-8pm usage spike (bedtime window)',
        'Mobile-first usage (parents on-the-go)',
        'One tired parent + one wired kid typical scenario',
        'Decision made quickly - must prove value fast'
      ]
    },
    
    endUser: {
      name: 'Children (ages 4-8)',
      priorities: [
        'Fun and delight',
        'Character connection',
        'Simplicity and clarity',
        'Immediate engagement'
      ],
      painPoints: [
        'Confusion (unclear what to do)',
        'Boredom (not engaging enough)',
        'Cognitive overload (too complex)',
        'Waiting (kids have no patience)'
      ]
    }
  },
  
  brandVoice: {
    tone: 'Playful, warm, trustworthy - never corporate or preachy',
    avoid: [
      'Corporate speak',
      'Educational jargon',
      'Pressure tactics',
      'Optimize',
      'Leverage',
      'Synergy',
      'Touch base',
      'Circle back'
    ],
    examples: [
      {
        good: 'Make bedtime magical',
        bad: 'Optimize sleep routines'
      },
      {
        good: 'Your child will love this',
        bad: 'Enhance engagement metrics'
      },
      {
        good: 'Stories that spark imagination',
        bad: 'Leverage AI for content generation'
      },
      {
        good: 'Quick and fun',
        bad: 'Streamlined user experience'
      }
    ]
  },
  
  tracks: [
    'continuous_insight_mining',
    'buyer_reality_check', // Parent reality checks
    'user_experience_guardrails', // Child experience guardrails
    'concept_interrogation',
    'brand_consistency'
  ],
  
  delivery: {
    slack: {
      enabled: true,
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
      channel: '#product-insights',
      schedule: 'Monday 9am PST',
      alertSeverities: ['high', 'critical']
    },
    email: {
      enabled: true,
      recipients: [
        'product@storytailor.com',
        'team@storytailor.com'
      ],
      format: 'html'
    },
    webhook: {
      enabled: true,
      url: process.env.FIELDNOTES_WEBHOOK_URL || '',
      events: [
        'new_insight',
        'weekly_brief',
        'critical_finding',
        'pre_launch_memo'
      ]
    }
  },
  
  models: {
    primary: 'gpt-4o-mini', // 90% of tasks
    critique: 'claude-haiku', // Adversarial analysis
    synthesis: 'claude-sonnet', // Weekly brief synthesis
    costLimit: 300 // $300/month internal budget
  }
};

/**
 * Initialize Storytailor tenant in database
 */
export async function initializeStorytalorTenant(supabase: any): Promise<void> {
  const { data: existing } = await supabase
    .from('research_tenants')
    .select('tenant_id')
    .eq('tenant_id', 'storytailor')
    .single();

  if (existing) {
    console.log('Storytailor tenant already exists');
    return;
  }

  await supabase
    .from('research_tenants')
    .insert([{
      tenant_id: storytailorConfig.tenantId,
      config: storytailorConfig,
      cost_limit: storytailorConfig.models.costLimit,
      is_active: true
    }]);

  console.log('Storytailor tenant initialized successfully');

  // Initialize cost tracking for current month
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await supabase
    .from('research_cost_tracking')
    .insert([{
      tenant_id: 'storytailor',
      period: 'month',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      events_processed: 0,
      llm_tokens_used: {
        'gpt-4o-mini': 0,
        'claude-haiku': 0,
        'claude-sonnet': 0
      },
      analyses_generated: 0,
      estimated_cost: 0,
      cost_limit: 300,
      status: 'normal'
    }]);

  console.log('Cost tracking initialized for Storytailor tenant');
}
