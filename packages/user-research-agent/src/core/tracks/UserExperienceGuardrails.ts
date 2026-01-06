/**
 * Track 3: User Experience Guardrails
 * Evaluates outcomes through end-user lens
 * For Storytailor: Child lens (fun, delight, cognitive load)
 * For B2B: End-user lens (developers, ICs, etc.)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  TrackEvaluation,
  EndUserPersona,
  Evidence,
  Event,
  UserExperienceEvaluation
} from '../../types';
import { Logger } from '../../utils/logger';

export class UserExperienceGuardrails {
  private supabase: SupabaseClient;
  private logger: Logger;
  private persona: EndUserPersona;

  constructor(supabase: SupabaseClient, persona: EndUserPersona) {
    this.supabase = supabase;
    this.persona = persona;
    this.logger = new Logger('UserExperienceGuardrails');
  }

  /**
   * Run the track analysis
   */
  async run(tenantId: string, timeframe: string = '7 days'): Promise<TrackEvaluation> {
    this.logger.info(`Running User Experience Guardrails for persona: ${this.persona.name}`);

    const events = await this.collectEvents(timeframe);
    const evaluation = await this.evaluateUserExperience(events);

    return {
      trackName: 'user_experience_guardrails',
      currentState: evaluation.status,
      evidence: evaluation.evidence,
      tensions: [],
      recommendations: [{
        action: evaluation.recommendation,
        rationale: evaluation.findings.join('; '),
        urgency: evaluation.urgency
      }],
      timestamp: new Date()
    };
  }

  /**
   * Evaluate overall user experience
   */
  private async evaluateUserExperience(events: Event[]): Promise<UserExperienceEvaluation> {
    const findings: string[] = [];
    const evidence: Evidence[] = [];

    // Emotional tone analysis
    const emotionalEvidence = await this.analyzeEmotionalTone(events);
    if (emotionalEvidence) {
      evidence.push(emotionalEvidence);
      if (typeof emotionalEvidence.value === 'number' && emotionalEvidence.value < 50) {
        findings.push('Emotional tone indicators are concerning');
      }
    }

    // Delight per minute
    const delightEvidence = await this.measureDelightPerMinute(events);
    if (delightEvidence) {
      evidence.push(delightEvidence);
      if (typeof delightEvidence.value === 'number' && delightEvidence.value < 0.5) {
        findings.push('Delight density is below target');
      }
    }

    // Cognitive load
    const cognitiveEvidence = await this.assessCognitiveLoad(events);
    if (cognitiveEvidence) {
      evidence.push(cognitiveEvidence);
      if (cognitiveEvidence.value === 'high') {
        findings.push('Cognitive load is too high for target audience');
      }
    }

    // Friction points
    const frictionEvidence = await this.identifyFrictionPoints(events);
    evidence.push(...frictionEvidence);
    if (frictionEvidence.length > 3) {
      findings.push('Multiple friction points detected in user flow');
    }

    // Determine status
    let status: 'healthy' | 'concerning' | 'critical';
    if (findings.length >= 3) {
      status = 'critical';
    } else if (findings.length >= 1) {
      status = 'concerning';
    } else {
      status = 'healthy';
    }

    return {
      status,
      findings,
      evidence,
      recommendation: this.generateRecommendation(findings),
      urgency: status === 'critical' ? 'critical' : status === 'concerning' ? 'high' : 'low'
    };
  }

  /**
   * Analyze emotional tone through event patterns
   */
  private async analyzeEmotionalTone(events: Event[]): Promise<Evidence | null> {
    // Look for positive indicators: completion, success, repeat usage
    const positiveEvents = events.filter(e =>
      e.event_type.includes('complete') ||
      e.event_type.includes('success') ||
      e.event_type.includes('favorite') ||
      e.event_type.includes('share')
    );

    // Look for negative indicators: errors, abandonment, support requests
    const negativeEvents = events.filter(e =>
      e.event_type.includes('error') ||
      e.event_type.includes('abandon') ||
      e.event_type.includes('support')
    );

    const totalRelevantEvents = positiveEvents.length + negativeEvents.length;
    if (totalRelevantEvents === 0) return null;

    const positiveRatio = (positiveEvents.length / totalRelevantEvents) * 100;

    return {
      metric: 'Positive emotional indicators',
      value: Math.round(positiveRatio),
      source: 'event_store',
      sampleSize: totalRelevantEvents
    };
  }

  /**
   * Measure delight per minute
   */
  private async measureDelightPerMinute(events: Event[]): Promise<Evidence | null> {
    // Calculate delight indicators per minute of engagement
    const delightEvents = events.filter(e =>
      e.event_type.includes('favorite') ||
      e.event_type.includes('love') ||
      e.event_type.includes('replay') ||
      e.event_type.includes('share')
    );

    // Calculate total engagement time
    const sessionsWithDuration = events.filter(e => e.data?.duration);
    const totalMinutes = sessionsWithDuration.reduce(
      (sum, e) => sum + (e.data.duration / 60000),
      0
    );

    if (totalMinutes === 0) return null;

    const delightPerMinute = delightEvents.length / totalMinutes;

    return {
      metric: 'Delight events per minute',
      value: delightPerMinute.toFixed(2),
      source: 'event_store',
      sampleSize: events.length
    };
  }

  /**
   * Assess cognitive load
   */
  private async assessCognitiveLoad(events: Event[]): Promise<Evidence> {
    // Indicators of high cognitive load:
    // - Many retries
    // - Long time on simple tasks
    // - Back-and-forth navigation
    // - Help/support requests

    const retryEvents = events.filter(e => e.event_type.includes('retry'));
    const helpEvents = events.filter(e => 
      e.event_type.includes('help') || 
      e.event_type.includes('support')
    );

    const totalEvents = events.length;
    const complexityIndicators = retryEvents.length + (helpEvents.length * 2);
    const complexityRatio = complexityIndicators / totalEvents;

    let cognitiveLoad: 'low' | 'medium' | 'high';
    if (complexityRatio > 0.15) {
      cognitiveLoad = 'high';
    } else if (complexityRatio > 0.08) {
      cognitiveLoad = 'medium';
    } else {
      cognitiveLoad = 'low';
    }

    return {
      metric: 'Cognitive load assessment',
      value: cognitiveLoad,
      source: 'event_store',
      sampleSize: totalEvents
    };
  }

  /**
   * Identify friction points
   */
  private async identifyFrictionPoints(events: Event[]): Promise<Evidence[]> {
    const frictionPoints: Evidence[] = [];

    // Look for error events
    const errorEvents = events.filter(e => e.event_type.includes('error'));
    if (errorEvents.length > 100) {
      frictionPoints.push({
        metric: 'Error frequency',
        value: errorEvents.length,
        source: 'event_store'
      });
    }

    // Look for abandoned flows
    const abandonEvents = events.filter(e => e.event_type.includes('abandon'));
    if (abandonEvents.length > 50) {
      frictionPoints.push({
        metric: 'Abandoned flows',
        value: abandonEvents.length,
        source: 'event_store'
      });
    }

    // Look for excessive page time (confusion)
    const longDurationEvents = events.filter(e => 
      e.data?.duration && e.data.duration > 300000 // 5 minutes
    );
    if (longDurationEvents.length > 30) {
      frictionPoints.push({
        metric: 'Excessive time on task',
        value: longDurationEvents.length,
        source: 'event_store'
      });
    }

    return frictionPoints;
  }

  /**
   * Check pain points
   */
  private async checkPainPoints(events: Event[]): Promise<Evidence[]> {
    const evidence: Evidence[] = [];

    for (const painPoint of this.persona.painPoints) {
      // Map pain points to observable metrics
      if (painPoint.toLowerCase().includes('confusion')) {
        const confusionEvents = events.filter(e =>
          e.event_type.includes('help') ||
          e.event_type.includes('retry') ||
          e.event_type.includes('back')
        );
        
        if (confusionEvents.length > 0) {
          evidence.push({
            metric: `Confusion indicators: ${painPoint}`,
            value: confusionEvents.length,
            source: 'event_store'
          });
        }
      }
    }

    return evidence;
  }

  /**
   * Analyze contextual factors specific to end users
   */
  private async analyzeContextualFactors(events: Event[]): Promise<Evidence[]> {
    const evidence: Evidence[] = [];

    // Platform-specific analysis
    const mobileEvents = events.filter(e => e.data?.platform === 'mobile');
    const desktopEvents = events.filter(e => e.data?.platform === 'desktop');

    if (mobileEvents.length > 0 || desktopEvents.length > 0) {
      const mobilePercentage = (mobileEvents.length / events.length) * 100;
      evidence.push({
        metric: 'Mobile usage percentage',
        value: Math.round(mobilePercentage),
        source: 'event_store'
      });
    }

    return evidence;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendation(findings: string[]): string {
    if (findings.length === 0) {
      return `User experience is healthy for ${this.persona.name}`;
    }

    return `Address ${findings.length} user experience concerns: ${findings[0]}`;
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
