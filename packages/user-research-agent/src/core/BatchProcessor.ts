/**
 * Batch Processor - Cost-saving batch processing and caching
 * Implements hourly aggregation, daily analysis, weekly synthesis
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from '../utils/logger';
import { Event, CachedInsight } from '../types';

export class BatchProcessor {
  private supabase: SupabaseClient;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(supabase: SupabaseClient, redis: RedisClientType) {
    this.supabase = supabase;
    this.redis = redis;
    this.logger = new Logger('BatchProcessor');
  }

  /**
   * Hourly aggregation (no LLM, pure SQL)
   */
  async runHourlyAggregation(tenantId: string): Promise<void> {
    this.logger.info(`Running hourly aggregation for tenant ${tenantId}`);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Aggregate events by type
    const { data: aggregated, error } = await this.supabase
      .rpc('aggregate_events_hourly', {
        p_tenant_id: tenantId,
        p_since: oneHourAgo.toISOString()
      });

    if (error) {
      this.logger.error('Hourly aggregation failed', error);
      throw error;
    }

    // Store in Redis cache for daily analysis
    const cacheKey = `fieldnotes:${tenantId}:hourly:${Date.now()}`;
    await this.redis.set(
      cacheKey,
      JSON.stringify(aggregated),
      { EX: 86400 } // 24 hour expiry
    );

    this.logger.info(`Hourly aggregation stored in cache: ${cacheKey}`);
  }

  /**
   * Daily pattern detection (cheap LLM)
   */
  async runDailyPatternDetection(tenantId: string): Promise<any[]> {
    this.logger.info(`Running daily pattern detection for tenant ${tenantId}`);

    // Retrieve hourly aggregations from last 24 hours
    const keys = await this.redis.keys(`fieldnotes:${tenantId}:hourly:*`);
    const hourlyData: any[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        hourlyData.push(JSON.parse(data));
      }
    }

    if (hourlyData.length === 0) {
      this.logger.warn('No hourly data found for pattern detection');
      return [];
    }

    // Store patterns for weekly synthesis
    const patterns = this.detectSimplePatterns(hourlyData);
    
    const patternKey = `fieldnotes:${tenantId}:patterns:${Date.now()}`;
    await this.redis.set(
      patternKey,
      JSON.stringify(patterns),
      { EX: 604800 } // 7 day expiry
    );

    this.logger.info(`Daily patterns detected and cached: ${patterns.length} patterns`);
    return patterns;
  }

  /**
   * Detect simple patterns without LLM
   */
  private detectSimplePatterns(hourlyData: any[]): any[] {
    const patterns: any[] = [];

    // Aggregate all hourly data
    const eventCounts = new Map<string, number>();
    
    for (const hour of hourlyData) {
      if (Array.isArray(hour)) {
        for (const event of hour) {
          const current = eventCounts.get(event.event_type) || 0;
          eventCounts.set(event.event_type, current + (event.count || 1));
        }
      }
    }

    // Identify high-frequency events
    for (const [eventType, count] of eventCounts.entries()) {
      if (count > 100) {
        patterns.push({
          type: eventType,
          frequency: count,
          period: 'daily'
        });
      }
    }

    return patterns;
  }

  /**
   * Check cache for stable insight
   */
  async getCachedInsight(
    tenantId: string,
    metricKey: string,
    currentValue: number
  ): Promise<CachedInsight | null> {
    const cacheKey = `fieldnotes:${tenantId}:insight:${metricKey}`;
    const cached = await this.redis.get(cacheKey);

    if (!cached) return null;

    const cachedInsight: CachedInsight = JSON.parse(cached);

    // Check if metric changed significantly (>10%)
    const percentChange = Math.abs(currentValue - cachedInsight.metricValue) / cachedInsight.metricValue;

    if (percentChange < 0.1) {
      this.logger.info(`Using cached insight for ${metricKey} (${percentChange.toFixed(2)}% change)`);
      return cachedInsight;
    }

    this.logger.info(`Cache miss for ${metricKey} (${percentChange.toFixed(2)}% change)`);
    return null;
  }

  /**
   * Store insight in cache
   */
  async cacheInsight(
    tenantId: string,
    metricKey: string,
    insight: any,
    metricValue: number,
    ttlDays: number = 7
  ): Promise<void> {
    const cacheKey = `fieldnotes:${tenantId}:insight:${metricKey}`;
    
    const cached: CachedInsight = {
      key: cacheKey,
      insight,
      metricValue,
      computedAt: new Date(),
      expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
    };

    await this.redis.set(
      cacheKey,
      JSON.stringify(cached),
      { EX: ttlDays * 86400 }
    );

    this.logger.info(`Cached insight for ${metricKey}`);
  }

  /**
   * Get aggregated data for time period (from cache)
   */
  async getAggregatedData(
    tenantId: string,
    period: 'hour' | 'day' | 'week'
  ): Promise<any[]> {
    const pattern = `fieldnotes:${tenantId}:${period === 'hour' ? 'hourly' : 'patterns'}:*`;
    const keys = await this.redis.keys(pattern);

    const data: any[] = [];
    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        data.push(JSON.parse(value));
      }
    }

    return data;
  }

  /**
   * Clear old cache entries
   */
  async cleanupCache(tenantId: string, olderThanDays: number = 7): Promise<number> {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const pattern = `fieldnotes:${tenantId}:*`;
    const keys = await this.redis.keys(pattern);

    let deleted = 0;
    for (const key of keys) {
      // Extract timestamp from key if present
      const match = key.match(/:(\d+)$/);
      if (match) {
        const timestamp = parseInt(match[1]);
        if (timestamp < cutoff) {
          await this.redis.del(key);
          deleted++;
        }
      }
    }

    this.logger.info(`Cleaned up ${deleted} old cache entries for tenant ${tenantId}`);
    return deleted;
  }
}
