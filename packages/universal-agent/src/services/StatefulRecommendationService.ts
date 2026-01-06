/**
 * Stateful Recommendation Service
 * 
 * Tracks recommendation outcomes and learns from mistakes.
 * Prevents repeating failed suggestions.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';

export interface Recommendation {
  userId: string;
  type: 'story_theme' | 'character' | 'timing' | 'therapeutic_pathway' | 'user_action';
  recommendation: string;
  context: Record<string, any>;
}

export interface RecommendationOutcome {
  recommendationId: string;
  userFollowed: boolean;
  effectivenessResult?: number;
  outcome: 'SUCCESS' | 'DECLINED' | 'IGNORED' | 'PENDING';
}

export class StatefulRecommendationService {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger
  ) {}
  
  async generateRecommendation(
    userId: string,
    type: Recommendation['type'],
    context: Record<string, any>
  ): Promise<string | null> {
    // Check previous recommendation
    const { data: previous } = await this.supabase
      .from('recommendation_outcomes')
      .select('*')
      .eq('user_id', userId)
      .eq('recommendation_type', type)
      .order('issued_at', { ascending: false })
      .limit(1)
      .single();
    
    // Don't repeat failed recommendations
    if (previous?.outcome === 'DECLINED' || 
        (previous?.outcome === 'SUCCESS' && (previous.effectiveness_result || 0) < 60)) {
      this.logger.info('Previous recommendation failed, finding alternative', {
        failedRecommendation: previous.recommendation
      });
      return this.findAlternative(userId, type, context, previous.recommendation);
    }
    
    // If pending recently, wait
    if (previous?.outcome === 'PENDING' && 
        new Date(previous.issued_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) {
      return null; // Silence
    }
    
    // Generate new recommendation
    const recommendation = await this.calculateRecommendation(userId, type, context);
    
    // Log recommendation
    await this.supabase
      .from('recommendation_outcomes')
      .insert({
        user_id: userId,
        recommendation_type: type,
        recommendation,
        context,
        issued_at: new Date().toISOString(),
        outcome: 'PENDING'
      });
    
    return recommendation;
  }
  
  private async findAlternative(
    userId: string,
    type: string,
    context: Record<string, any>,
    avoid: string
  ): Promise<string | null> {
    // Simple alternative logic (would be more sophisticated in production)
    return 'alternative recommendation';
  }
  
  private async calculateRecommendation(
    userId: string,
    type: string,
    context: Record<string, any>
  ): Promise<string> {
    return 'calculated recommendation';
  }
}

