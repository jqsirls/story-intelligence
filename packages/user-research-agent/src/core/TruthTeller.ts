/**
 * Truth Teller - Self-deception detection and BS calling
 * Identifies vanity metrics, narrative-reality gaps, and team blind spots
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SelfDeceptionAlert, Evidence, Event } from '../types';
import { Logger } from '../utils/logger';
import { ModelOrchestrator } from './ModelOrchestrator';

export class TruthTeller {
  private supabase: SupabaseClient;
  private logger: Logger;
  private modelOrchestrator: ModelOrchestrator;

  constructor(supabase: SupabaseClient, modelOrchestrator: ModelOrchestrator) {
    this.supabase = supabase;
    this.modelOrchestrator = modelOrchestrator;
    this.logger = new Logger('TruthTeller');
  }

  /**
   * Detect self-deception patterns
   */
  async detectSelfDeception(
    tenantId: string,
    timeframe: string = '7 days'
  ): Promise<SelfDeceptionAlert | null> {
    this.logger.info(`Running self-deception detection for tenant ${tenantId}`);

    // Check for vanity metric traps
    const vanityMetricIssue = await this.detectVanityMetricTraps();
    if (vanityMetricIssue) return vanityMetricIssue;

    // Check for narrative-reality gaps
    const narrativeGap = await this.detectNarrativeRealityGaps();
    if (narrativeGap) return narrativeGap;

    // Check for consensus hallucinations
    const consensusHallucination = await this.detectConsensusHallucinations();
    if (consensusHallucination) return consensusHallucination;

    // Check for feature Stockholm syndrome
    const featureStockholm = await this.detectFeatureStockholmSyndrome();
    if (featureStockholm) return featureStockholm;

    return null;
  }

  /**
   * Detect vanity metric traps
   * Example: "Engagement up 40%" but completion rate down
   */
  private async detectVanityMetricTraps(): Promise<SelfDeceptionAlert | null> {
    // Query for common vanity metrics vs actual outcome metrics
    const { data: events } = await this.supabase
      .from('event_store')
      .select('event_type, data')
      .gte('event_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .in('event_type', ['session_start', 'session_end', 'story_created', 'story_completed']);

    if (!events || events.length === 0) return null;

    const sessionStarts = events.filter(e => e.event_type === 'session_start').length;
    const storyCreated = events.filter(e => e.event_type === 'story_created').length;
    const storyCompleted = events.filter(e => e.event_type === 'story_completed').length;

    // Check for engagement increasing but completion decreasing
    if (storyCreated > 0 && storyCompleted > 0) {
      const completionRate = storyCompleted / storyCreated;
      
      if (completionRate < 0.5) {
        return {
          claim: 'Story creation is up (engagement metric)',
          reality: `Only ${Math.round(completionRate * 100)}% of stories are actually completed`,
          evidence: [{
            metric: 'Completion rate',
            value: Math.round(completionRate * 100),
            source: 'event_store',
            sampleSize: storyCreated
          }],
          recommendation: 'Focus on completion rate, not creation count. High starts + low completion = friction.'
        };
      }
    }

    return null;
  }

  /**
   * Detect narrative-reality gaps
   * Example: "Brings families together" but 94% are single-parent sessions
   */
  private async detectNarrativeRealityGaps(): Promise<SelfDeceptionAlert | null> {
    // This would compare marketing claims to actual behavior
    // For now, check session patterns
    
    const { data: sessions } = await this.supabase
      .from('event_store')
      .select('session_id, data')
      .eq('event_type', 'session_start')
      .gte('event_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1000);

    if (!sessions || sessions.length === 0) return null;

    // Analyze session characteristics
    const multiUserSessions = sessions.filter(s => 
      s.data?.userCount && s.data.userCount > 1
    ).length;

    const singleUserPercentage = ((sessions.length - multiUserSessions) / sessions.length) * 100;

    if (singleUserPercentage > 85) {
      return {
        claim: 'Product brings families together',
        reality: `${Math.round(singleUserPercentage)}% of sessions are single-user`,
        evidence: [{
          metric: 'Single-user sessions',
          value: Math.round(singleUserPercentage),
          source: 'event_store',
          sampleSize: sessions.length
        }],
        recommendation: 'Either build features for solo use or add multi-user functionality. The narrative doesn\'t match reality.'
      };
    }

    return null;
  }

  /**
   * Detect consensus hallucinations
   * Example: "Users want feature X" but no data supports this
   */
  private async detectConsensusHallucinations(): Promise<SelfDeceptionAlert | null> {
    // Check if recent features have low adoption despite team believing they're important
    const { data: recentFeatures } = await this.supabase
      .from('event_store')
      .select('event_type, data')
      .like('event_type', '%feature%')
      .gte('event_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!recentFeatures || recentFeatures.length === 0) return null;

    // Group by feature
    const featureUsage = new Map<string, number>();
    for (const event of recentFeatures) {
      const feature = event.data?.featureName || event.event_type;
      const count = featureUsage.get(feature) || 0;
      featureUsage.set(feature, count + 1);
    }

    // Find features with very low usage
    for (const [feature, usage] of featureUsage.entries()) {
      if (usage < 10) {
        return {
          claim: `Feature "${feature}" is valuable`,
          reality: `Only ${usage} uses in 30 days`,
          evidence: [{
            metric: 'Feature usage',
            value: usage,
            source: 'event_store'
          }],
          recommendation: 'Either promote this feature better or admit it\'s not resonating. Low usage suggests it\'s not solving a real problem.'
        };
      }
    }

    return null;
  }

  /**
   * Detect feature Stockholm syndrome
   * Example: "We spent 6 weeks building X" but usage is 0.7%
   */
  private async detectFeatureStockholmSyndrome(): Promise<SelfDeceptionAlert | null> {
    // Check for features with disproportionately low usage given development investment
    // This would ideally integrate with issue tracking to see effort vs usage
    
    // Simplified: Check any feature with < 5% usage
    const { data: allSessions } = await this.supabase
      .from('event_store')
      .select('session_id')
      .eq('event_type', 'session_start')
      .gte('event_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const totalSessions = allSessions?.length || 0;
    if (totalSessions === 0) return null;

    const { data: featureEvents } = await this.supabase
      .from('event_store')
      .select('data')
      .like('event_type', '%voice_modulation%')
      .gte('event_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const featureUsage = featureEvents?.length || 0;
    const usagePercentage = (featureUsage / totalSessions) * 100;

    if (usagePercentage < 5 && featureUsage > 0) {
      return {
        claim: 'Voice modulation feature is valuable',
        reality: `Only ${usagePercentage.toFixed(1)}% of users tried it`,
        evidence: [{
          metric: 'Feature adoption rate',
          value: usagePercentage.toFixed(1),
          source: 'event_store',
          sampleSize: totalSessions
        }],
        recommendation: 'Usage is too low to justify maintenance. Consider deprecating or significantly improving discoverability.'
      };
    }

    return null;
  }

  /**
   * Detect confirmation bias in metrics
   */
  async detectConfirmationBias(): Promise<string[]> {
    const biases: string[] = [];

    // Check if we're only measuring positive metrics
    const { data: metrics } = await this.supabase
      .from('event_store')
      .select('event_type')
      .gte('event_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1000);

    if (!metrics) return biases;

    const eventTypes = new Set(metrics.map(m => m.event_type));
    
    // Check for lack of negative event tracking
    const hasErrorTracking = Array.from(eventTypes).some(t => t.includes('error'));
    const hasAbandonTracking = Array.from(eventTypes).some(t => t.includes('abandon'));
    const hasChurnTracking = Array.from(eventTypes).some(t => t.includes('churn'));

    if (!hasErrorTracking) {
      biases.push('No error event tracking - may be missing problems');
    }
    if (!hasAbandonTracking) {
      biases.push('No abandonment tracking - missing drop-off insights');
    }
    if (!hasChurnTracking) {
      biases.push('No churn tracking - may be ignoring retention issues');
    }

    return biases;
  }
}
