/**
 * Smart Sampler - Intelligent event sampling for cost reduction
 * Uses adaptive sampling based on event priority and anomaly detection
 */

import { Event, SamplingRule } from '../types';
import { Logger } from '../utils/logger';

export class SmartSampler {
  private logger: Logger;
  private samplingRules: Map<string, SamplingRule>;
  private recentMetrics: Map<string, number[]> = new Map();

  constructor() {
    this.logger = new Logger('SmartSampler');
    this.samplingRules = this.initializeDefaultRules();
  }

  /**
   * Initialize default sampling rules
   */
  private initializeDefaultRules(): Map<string, SamplingRule> {
    const rules = new Map<string, SamplingRule>();

    // Critical events: 100% sampling
    const criticalEvents = [
      'account_deleted',
      'payment_failed',
      'support_ticket',
      'error_critical',
      'subscription_cancelled'
    ];

    for (const eventType of criticalEvents) {
      rules.set(eventType, {
        eventType,
        priority: 'critical',
        samplingRate: 1.0,
        adaptiveThreshold: undefined
      });
    }

    // Medium priority: 10% sampling
    const mediumEvents = [
      'story_created',
      'feature_used',
      'session_end',
      'character_customized'
    ];

    for (const eventType of mediumEvents) {
      rules.set(eventType, {
        eventType,
        priority: 'medium',
        samplingRate: 0.1,
        adaptiveThreshold: 0.2
      });
    }

    // Low priority: 1% sampling
    const lowEvents = [
      'page_view',
      'button_click',
      'scroll',
      'hover'
    ];

    for (const eventType of lowEvents) {
      rules.set(eventType, {
        eventType,
        priority: 'low',
        samplingRate: 0.01,
        adaptiveThreshold: 0.3
      });
    }

    return rules;
  }

  /**
   * Determine if an event should be analyzed
   */
  shouldAnalyze(event: Event): boolean {
    const rule = this.getSamplingRule(event.event_type);
    
    // Always store event (cheap)
    // Decision is whether to do deep analysis (expensive)

    // Check if we should increase sampling due to anomaly
    const adaptiveSamplingRate = this.getAdaptiveSamplingRate(event, rule);

    // Random sampling based on rate
    const random = Math.random();
    return random < adaptiveSamplingRate;
  }

  /**
   * Get sampling rule for event type
   */
  private getSamplingRule(eventType: string): SamplingRule {
    // Exact match
    if (this.samplingRules.has(eventType)) {
      return this.samplingRules.get(eventType)!;
    }

    // Pattern match for similar event types
    for (const [key, rule] of this.samplingRules.entries()) {
      if (eventType.includes(key) || key.includes(eventType)) {
        return rule;
      }
    }

    // Default rule for unknown events
    return {
      eventType,
      priority: 'medium',
      samplingRate: 0.1,
      adaptiveThreshold: 0.2
    };
  }

  /**
   * Get adaptive sampling rate based on anomaly detection
   */
  private getAdaptiveSamplingRate(event: Event, rule: SamplingRule): number {
    if (!rule.adaptiveThreshold) {
      return rule.samplingRate;
    }

    // Track recent frequency of this event type
    const recentCounts = this.recentMetrics.get(event.event_type) || [];
    
    // Keep last 24 hours worth (rolling window)
    if (recentCounts.length >= 24) {
      recentCounts.shift();
    }
    recentCounts.push(1);
    this.recentMetrics.set(event.event_type, recentCounts);

    // Calculate if current frequency is anomalous
    if (recentCounts.length < 10) {
      // Not enough data for adaptive sampling
      return rule.samplingRate;
    }

    const recentAvg = recentCounts.slice(-6).reduce((a, b) => a + b, 0) / 6;
    const historicalAvg = recentCounts.slice(0, -6).reduce((a, b) => a + b, 0) / (recentCounts.length - 6);

    if (historicalAvg === 0) return rule.samplingRate;

    const percentChange = Math.abs(recentAvg - historicalAvg) / historicalAvg;

    // If anomaly detected, increase sampling
    if (percentChange > rule.adaptiveThreshold) {
      const increasedRate = Math.min(rule.samplingRate * 5, 0.5);
      this.logger.info(
        `Anomaly detected for ${event.event_type}: ${(percentChange * 100).toFixed(1)}% change. ` +
        `Increasing sampling from ${rule.samplingRate} to ${increasedRate}`
      );
      return increasedRate;
    }

    return rule.samplingRate;
  }

  /**
   * Get sampling statistics
   */
  getSamplingStatistics(): any {
    const stats: any = {
      totalRules: this.samplingRules.size,
      rules: []
    };

    for (const [eventType, rule] of this.samplingRules.entries()) {
      const recentCounts = this.recentMetrics.get(eventType) || [];
      stats.rules.push({
        eventType,
        priority: rule.priority,
        samplingRate: rule.samplingRate,
        recentEvents: recentCounts.length,
        adaptiveActive: recentCounts.length >= 10
      });
    }

    return stats;
  }

  /**
   * Update sampling rule dynamically
   */
  updateSamplingRule(eventType: string, samplingRate: number): void {
    const rule = this.getSamplingRule(eventType);
    rule.samplingRate = samplingRate;
    this.samplingRules.set(eventType, rule);
    this.logger.info(`Updated sampling rate for ${eventType} to ${samplingRate}`);
  }
}
