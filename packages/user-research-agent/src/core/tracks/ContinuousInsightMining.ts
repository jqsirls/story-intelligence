/**
 * Track 1: Continuous Insight Mining
 * Watches product usage patterns and surfaces insights
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Pattern, Insight, Evidence, TrackEvaluation, Event } from '../../types';
import { Logger } from '../../utils/logger';

export class ContinuousInsightMining {
  private supabase: SupabaseClient;
  private logger: Logger;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.logger = new Logger('ContinuousInsightMining');
  }

  /**
   * Run the track analysis
   */
  async run(tenantId: string, timeframe: string = '7 days'): Promise<TrackEvaluation> {
    this.logger.info(`Running Continuous Insight Mining for tenant ${tenantId}`);

    const events = await this.collectEvents(timeframe);
    
    const patterns: Pattern[] = [];
    patterns.push(...await this.detectAbandonmentPatterns(events));
    patterns.push(...await this.analyzeRetryBehavior(events));
    patterns.push(...await this.identifyConfusionSignals(events));

    const insights = await this.synthesizeInsights(patterns);

    // Determine overall state
    const criticalPatterns = patterns.filter(p => p.confidence > 0.8 && p.frequency > 100);
    const currentState = criticalPatterns.length > 2 ? 'critical' : 
                         criticalPatterns.length > 0 ? 'concerning' : 'healthy';

    return {
      trackName: 'continuous_insight_mining',
      currentState,
      evidence: insights.map(i => i.evidence[0]),
      tensions: [],
      recommendations: insights.map(i => ({
        action: i.recommendation,
        rationale: i.finding,
        urgency: i.severity,
        estimatedImpact: 'TBD'
      })),
      timestamp: new Date()
    };
  }

  /**
   * Collect events for analysis
   */
  private async collectEvents(timeframe: string): Promise<Event[]> {
    const timeframeDate = this.parseTimeframe(timeframe);

    const { data: events, error } = await this.supabase
      .from('event_store')
      .select('*')
      .gte('event_time', timeframeDate.toISOString())
      .order('event_time', { ascending: false })
      .limit(10000);

    if (error) {
      this.logger.error('Failed to collect events', error);
      return [];
    }

    return (events || []) as Event[];
  }

  /**
   * Detect abandonment patterns
   */
  async detectAbandonmentPatterns(events: Event[]): Promise<Pattern[]> {
    this.logger.info('Detecting abandonment patterns');

    // Group events by session and find incomplete flows
    const sessionFlows = new Map<string, Event[]>();
    
    for (const event of events) {
      if (!event.session_id) continue;
      
      const sessionEvents = sessionFlows.get(event.session_id) || [];
      sessionEvents.push(event);
      sessionFlows.set(event.session_id, sessionEvents);
    }

    const abandonmentPoints = new Map<string, number>();
    let totalSessions = 0;

    for (const [sessionId, sessionEvents] of sessionFlows.entries()) {
      totalSessions++;
      
      // Check for common abandonment patterns
      const lastEvent = sessionEvents[sessionEvents.length - 1];
      const eventType = lastEvent.event_type;
      
      if (!eventType.includes('complete') && !eventType.includes('success')) {
        const count = abandonmentPoints.get(eventType) || 0;
        abandonmentPoints.set(eventType, count + 1);
      }
    }

    const patterns: Pattern[] = [];
    for (const [eventType, count] of abandonmentPoints.entries()) {
      if (count / totalSessions > 0.1) { // More than 10% abandon at this point
        patterns.push({
          type: 'abandonment',
          description: `High abandonment at ${eventType}`,
          frequency: count,
          affectedUsers: count,
          confidence: 0.85,
          examples: []
        });
      }
    }

    return patterns;
  }

  /**
   * Analyze retry behavior
   */
  async analyzeRetryBehavior(events: Event[]): Promise<Pattern[]> {
    this.logger.info('Analyzing retry behavior');

    // Look for repeated events in short time windows
    const retryPatterns = new Map<string, number>();
    const eventsBySession = new Map<string, Event[]>();

    for (const event of events) {
      if (!event.session_id) continue;
      
      const sessionEvents = eventsBySession.get(event.session_id) || [];
      sessionEvents.push(event);
      eventsBySession.set(event.session_id, sessionEvents);
    }

    for (const sessionEvents of eventsBySession.values()) {
      // Sort by time
      sessionEvents.sort((a, b) => 
        new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
      );

      // Look for retries (same event type within 30 seconds)
      for (let i = 1; i < sessionEvents.length; i++) {
        const current = sessionEvents[i];
        const previous = sessionEvents[i - 1];
        
        if (current.event_type === previous.event_type) {
          const timeDiff = new Date(current.event_time).getTime() - 
                          new Date(previous.event_time).getTime();
          
          if (timeDiff < 30000) { // 30 seconds
            const count = retryPatterns.get(current.event_type) || 0;
            retryPatterns.set(current.event_type, count + 1);
          }
        }
      }
    }

    const patterns: Pattern[] = [];
    for (const [eventType, count] of retryPatterns.entries()) {
      if (count > 50) {
        patterns.push({
          type: 'retry',
          description: `High retry rate for ${eventType}`,
          frequency: count,
          affectedUsers: count,
          confidence: 0.9,
          examples: []
        });
      }
    }

    return patterns;
  }

  /**
   * Identify confusion signals
   */
  async identifyConfusionSignals(events: Event[]): Promise<Pattern[]> {
    this.logger.info('Identifying confusion signals');

    // Look for back-and-forth navigation, rapid clicks, etc.
    const confusionSignals: Pattern[] = [];

    // Analyze event sequences for confusion patterns
    const eventsBySession = new Map<string, Event[]>();
    
    for (const event of events) {
      if (!event.session_id) continue;
      const sessionEvents = eventsBySession.get(event.session_id) || [];
      sessionEvents.push(event);
      eventsBySession.set(event.session_id, sessionEvents);
    }

    let backAndForthCount = 0;
    let rapidClickCount = 0;

    for (const sessionEvents of eventsBySession.values()) {
      // Check for back-and-forth navigation
      for (let i = 2; i < sessionEvents.length; i++) {
        if (sessionEvents[i].event_type === sessionEvents[i - 2].event_type &&
            sessionEvents[i].event_type !== sessionEvents[i - 1].event_type) {
          backAndForthCount++;
        }
      }

      // Check for rapid clicks (more than 5 events in 5 seconds)
      for (let i = 0; i < sessionEvents.length - 5; i++) {
        const timeWindow = new Date(sessionEvents[i + 4].event_time).getTime() - 
                          new Date(sessionEvents[i].event_time).getTime();
        if (timeWindow < 5000) {
          rapidClickCount++;
        }
      }
    }

    if (backAndForthCount > 100) {
      confusionSignals.push({
        type: 'confusion',
        description: 'High back-and-forth navigation indicating confusion',
        frequency: backAndForthCount,
        affectedUsers: backAndForthCount,
        confidence: 0.75,
        examples: []
      });
    }

    if (rapidClickCount > 100) {
      confusionSignals.push({
        type: 'confusion',
        description: 'Rapid clicking suggesting frustration or confusion',
        frequency: rapidClickCount,
        affectedUsers: rapidClickCount,
        confidence: 0.7,
        examples: []
      });
    }

    return confusionSignals;
  }

  /**
   * Synthesize insights from patterns
   */
  async synthesizeInsights(patterns: Pattern[]): Promise<Insight[]> {
    this.logger.info(`Synthesizing insights from ${patterns.length} patterns`);

    const insights: Insight[] = [];

    for (const pattern of patterns) {
      const insight: Insight = {
        id: crypto.randomUUID(),
        tenantId: 'default', // Will be set by caller
        trackType: 'continuous_insight_mining',
        finding: pattern.description,
        evidence: [{
          metric: pattern.type,
          value: pattern.frequency,
          source: 'event_store',
          sampleSize: pattern.affectedUsers
        }],
        recommendation: this.generateRecommendation(pattern),
        severity: this.determineSeverity(pattern),
        createdAt: new Date()
      };

      insights.push(insight);
    }

    // Limit to top 5 insights by confidence and frequency
    return insights
      .sort((a, b) => {
        const patternA = patterns.find(p => p.description === a.finding)!;
        const patternB = patterns.find(p => p.description === b.finding)!;
        return (patternB.confidence * patternB.frequency) - 
               (patternA.confidence * patternA.frequency);
      })
      .slice(0, 5);
  }

  /**
   * Generate recommendation for a pattern
   */
  private generateRecommendation(pattern: Pattern): string {
    switch (pattern.type) {
      case 'abandonment':
        return 'Investigate and simplify the user flow at this point';
      case 'retry':
        return 'Review error messaging and provide clearer guidance';
      case 'confusion':
        return 'Add contextual help or improve UI clarity';
      default:
        return 'Further investigation recommended';
    }
  }

  /**
   * Determine severity based on pattern characteristics
   */
  private determineSeverity(pattern: Pattern): 'low' | 'medium' | 'high' | 'critical' {
    if (pattern.confidence > 0.9 && pattern.frequency > 500) return 'critical';
    if (pattern.confidence > 0.8 && pattern.frequency > 200) return 'high';
    if (pattern.confidence > 0.7 && pattern.frequency > 100) return 'medium';
    return 'low';
  }

  /**
   * Parse timeframe string to Date
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
