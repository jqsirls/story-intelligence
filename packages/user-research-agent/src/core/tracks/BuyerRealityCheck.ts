/**
 * Track 2: Buyer Reality Check
 * Simulates and pressure-tests buyer/decision-maker expectations
 * For Storytailor: Parent persona. For B2B: Decision-maker persona.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TrackEvaluation, BuyerPersona, Evidence, Event } from '../../types';
import { Logger } from '../../utils/logger';

export class BuyerRealityCheck {
  private supabase: SupabaseClient;
  private logger: Logger;
  private persona: BuyerPersona;

  constructor(supabase: SupabaseClient, persona: BuyerPersona) {
    this.supabase = supabase;
    this.persona = persona;
    this.logger = new Logger('BuyerRealityCheck');
  }

  /**
   * Run the track analysis
   */
  async run(tenantId: string, timeframe: string = '7 days'): Promise<TrackEvaluation> {
    this.logger.info(`Running Buyer Reality Check for persona: ${this.persona.name}`);

    const events = await this.collectEvents(timeframe);
    const evidence: Evidence[] = [];

    // Analyze against buyer priorities
    for (const priority of this.persona.priorities) {
      const priorityEvidence = await this.analyzePriority(priority, events);
      if (priorityEvidence) {
        evidence.push(priorityEvidence);
      }
    }

    // Check pain points
    const painPointIssues = await this.checkPainPoints(events);
    evidence.push(...painPointIssues);

    // Contextual factor analysis
    const contextualInsights = await this.analyzeContextualFactors(events);
    evidence.push(...contextualInsights);

    // Determine overall state
    const criticalIssues = evidence.filter(e => 
      typeof e.value === 'number' && e.value > 50
    );
    const currentState = criticalIssues.length > 2 ? 'critical' :
                         criticalIssues.length > 0 ? 'concerning' : 'healthy';

    return {
      trackName: 'buyer_reality_check',
      currentState,
      evidence,
      tensions: [],
      recommendations: this.generateRecommendations(evidence),
      timestamp: new Date()
    };
  }

  /**
   * Collect events
   */
  private async collectEvents(timeframe: string): Promise<Event[]> {
    const timeframeDate = this.parseTimeframe(timeframe);

    const { data: events, error } = await this.supabase
      .from('event_store')
      .select('*')
      .gte('event_time', timeframeDate.toISOString())
      .order('event_time', { ascending: false });

    if (error) {
      this.logger.error('Failed to collect events', error);
      return [];
    }

    return (events || []) as Event[];
  }

  /**
   * Analyze specific priority
   */
  private async analyzePriority(priority: string, events: Event[]): Promise<Evidence | null> {
    switch (priority.toLowerCase()) {
      case 'time':
        return this.analyzeTimeConstraints(events);
      case 'trust':
      case 'safety':
        return this.analyzeTrustFactors(events);
      case 'value':
        return this.analyzeValuePerception(events);
      default:
        return null;
    }
  }

  /**
   * Analyze time constraints
   */
  private async analyzeTimeConstraints(events: Event[]): Promise<Evidence> {
    // Calculate average session duration
    const sessionsWithDuration = events
      .filter(e => e.data?.duration)
      .map(e => e.data.duration);

    const avgDuration = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((a, b) => a + b, 0) / sessionsWithDuration.length
      : 0;

    return {
      metric: 'Average Session Duration',
      value: Math.round(avgDuration / 1000), // seconds
      source: 'event_store',
      sampleSize: sessionsWithDuration.length
    };
  }

  /**
   * Analyze trust factors
   */
  private async analyzeTrustFactors(events: Event[]): Promise<Evidence> {
    // Look for privacy-related events, security concerns
    const privacyEvents = events.filter(e => 
      e.event_type.includes('privacy') || 
      e.event_type.includes('permission')
    );

    return {
      metric: 'Privacy-related interactions',
      value: privacyEvents.length,
      source: 'event_store',
      sampleSize: events.length
    };
  }

  /**
   * Analyze value perception
   */
  private async analyzeValuePerception(events: Event[]): Promise<Evidence> {
    // Look for pricing page views, upgrade attempts, churn signals
    const valueEvents = events.filter(e =>
      e.event_type.includes('pricing') ||
      e.event_type.includes('upgrade') ||
      e.event_type.includes('subscription')
    );

    return {
      metric: 'Value-exploration events',
      value: valueEvents.length,
      source: 'event_store',
      sampleSize: events.length
    };
  }

  /**
   * Check pain points
   */
  private async checkPainPoints(events: Event[]): Promise<Evidence[]> {
    const evidence: Evidence[] = [];

    for (const painPoint of this.persona.painPoints) {
      // Check if events indicate this pain point is real
      if (painPoint.toLowerCase().includes('setup') || painPoint.toLowerCase().includes('time')) {
        const setupEvents = events.filter(e => 
          e.event_type.includes('onboarding') || 
          e.event_type.includes('setup')
        );
        
        if (setupEvents.length > 0) {
          evidence.push({
            metric: `${painPoint} events`,
            value: setupEvents.length,
            source: 'event_store'
          });
        }
      }
    }

    return evidence;
  }

  /**
   * Analyze contextual factors
   */
  private async analyzeContextualFactors(events: Event[]): Promise<Evidence[]> {
    const evidence: Evidence[] = [];

    for (const factor of this.persona.contextualFactors) {
      // For Storytailor: Check for time-of-day patterns (bedtime crunch)
      if (factor.includes('7pm-8pm') || factor.includes('bedtime')) {
        const eveningEvents = events.filter(e => {
          const hour = new Date(e.event_time).getHours();
          return hour >= 19 && hour <= 20;
        });

        const totalEvents = events.length;
        const eveningPercentage = (eveningEvents.length / totalEvents) * 100;

        evidence.push({
          metric: 'Evening usage (7pm-8pm)',
          value: Math.round(eveningPercentage),
          source: 'event_store',
          sampleSize: totalEvents
        });
      }
    }

    return evidence;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(evidence: Evidence[]): any[] {
    const recommendations = [];

    for (const ev of evidence) {
      if (ev.metric.includes('Duration') && typeof ev.value === 'number' && ev.value > 300) {
        recommendations.push({
          action: 'Reduce time to completion - consider fast-path option',
          rationale: `${this.persona.name} face time constraints`,
          urgency: 'high' as const
        });
      }
    }

    return recommendations;
  }

  /**
   * Parse timeframe
   */
  private parseTimeframe(timeframe: string): Date {
    const match = timeframe.match(/(\d+)\s*(day|hour|week)s?/);
    if (!match) return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const amount = parseInt(match[1]);
    const unit = match[2];

    const now = Date.now();
    switch (unit) {
      case 'hour':
        return new Date(now - amount * 60 * 60 * 1000);
      case 'day':
        return new Date(now - amount * 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now - amount * 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
  }
}
