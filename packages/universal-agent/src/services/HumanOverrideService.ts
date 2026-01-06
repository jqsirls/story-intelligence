/**
 * Human Override Service
 * 
 * Logs when humans intervene or correct system decisions.
 * Enables system learning from corrections.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';

export type OverrideType =
  | 'ESCALATED_TO_PROFESSIONAL'
  | 'FALSE_POSITIVE'
  | 'RECOMMENDATION_IGNORED'
  | 'PREFERENCE_CONFLICT'
  | 'BETTER_ALTERNATIVE'
  | 'TIMING_WRONG';

export interface HumanOverride {
  pipelineType: string;
  systemAction: string;
  systemConfidence: number;
  humanOverride: string;
  overrideType: OverrideType;
  reasoning: string;
  userId: string;
}

export class HumanOverrideService {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger
  ) {}
  
  async logOverride(override: HumanOverride): Promise<void> {
    await this.supabase
      .from('human_overrides')
      .insert({
        pipeline_type: override.pipelineType,
        system_action: override.systemAction,
        system_confidence: override.systemConfidence,
        human_override: override.humanOverride,
        override_type: override.overrideType,
        reasoning: override.reasoning,
        user_id: override.userId,
        occurred_at: new Date().toISOString()
      });
    
    this.logger.info('Human override logged', { override });
  }
  
  async analyzeOverridePatterns(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: patterns } = await this.supabase
      .from('human_overrides')
      .select('pipeline_type, override_type, system_confidence')
      .gte('occurred_at', thirtyDaysAgo.toISOString());
    
    if (!patterns) {
      return;
    }
    
    // Analyze false positive rates
    const byPipeline = patterns.reduce((acc: any, p) => {
      if (!acc[p.pipeline_type]) {
        acc[p.pipeline_type] = { total: 0, falsePositives: 0 };
      }
      acc[p.pipeline_type].total++;
      if (p.override_type === 'FALSE_POSITIVE') {
        acc[p.pipeline_type].falsePositives++;
      }
      return acc;
    }, {});
    
    // Log recommendations
    for (const [pipelineType, stats] of Object.entries(byPipeline) as any) {
      const fpRate = stats.falsePositives / stats.total;
      if (fpRate > 0.3) {
        this.logger.warn(`High false positive rate for ${pipelineType}`, {
          rate: fpRate,
          recommendation: 'Increase confidence threshold'
        });
      }
    }
  }
}

