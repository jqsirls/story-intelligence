/**
 * Event Collector - Data ingestion from various sources
 * Connects to Supabase, webhooks, and future integrations (Segment, Mixpanel)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Event, DataSource } from '../types';
import { Logger } from '../utils/logger';

export class EventCollector {
  private supabase: SupabaseClient;
  private logger: Logger;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.logger = new Logger('EventCollector');
  }

  /**
   * Collect events for a time period
   */
  async collectEvents(
    dataSources: DataSource[],
    timeframe: string = '7 days'
  ): Promise<Event[]> {
    this.logger.info(`Collecting events for timeframe: ${timeframe}`);

    const timeframeDate = this.parseTimeframe(timeframe);
    let allEvents: Event[] = [];

    for (const source of dataSources) {
      try {
        const events = await this.collectFromSource(source, timeframeDate);
        allEvents = allEvents.concat(events);
      } catch (error) {
        this.logger.error(`Failed to collect from source ${source.type}`, error);
      }
    }

    this.logger.info(`Collected ${allEvents.length} events from ${dataSources.length} source(s)`);
    return allEvents;
  }

  /**
   * Collect from specific data source
   */
  private async collectFromSource(
    source: DataSource,
    since: Date
  ): Promise<Event[]> {
    switch (source.type) {
      case 'supabase':
        return this.collectFromSupabase(source, since);
      case 'webhook':
        return this.collectFromWebhook(source, since);
      case 'segment':
        return this.collectFromSegment(source, since);
      case 'mixpanel':
        return this.collectFromMixpanel(source, since);
      default:
        this.logger.warn(`Unknown source type: ${source.type}`);
        return [];
    }
  }

  /**
   * Collect from Supabase event_store
   */
  private async collectFromSupabase(
    source: DataSource,
    since: Date
  ): Promise<Event[]> {
    const tables = source.tables || ['event_store'];
    let allEvents: Event[] = [];

    for (const table of tables) {
      const { data: events, error } = await this.supabase
        .from(table)
        .select('*')
        .gte('event_time', since.toISOString())
        .order('event_time', { ascending: false })
        .limit(10000);

      if (error) {
        this.logger.error(`Failed to collect from ${table}`, error);
        continue;
      }

      if (events) {
        allEvents = allEvents.concat(events as Event[]);
      }
    }

    return allEvents;
  }

  /**
   * Collect from webhook (future implementation)
   */
  private async collectFromWebhook(
    source: DataSource,
    since: Date
  ): Promise<Event[]> {
    this.logger.info('Webhook collection not yet implemented');
    // Future: Query stored webhook events
    return [];
  }

  /**
   * Collect from Segment (future implementation)
   */
  private async collectFromSegment(
    source: DataSource,
    since: Date
  ): Promise<Event[]> {
    this.logger.info('Segment integration not yet implemented');
    // Future: Call Segment API
    return [];
  }

  /**
   * Collect from Mixpanel (future implementation)
   */
  private async collectFromMixpanel(
    source: DataSource,
    since: Date
  ): Promise<Event[]> {
    this.logger.info('Mixpanel integration not yet implemented');
    // Future: Call Mixpanel API
    return [];
  }

  /**
   * Setup webhook listener for real-time events
   */
  async setupWebhookListener(
    port: number = 3001,
    path: string = '/webhook/events'
  ): Promise<void> {
    this.logger.info(`Webhook listener would be set up on port ${port}${path}`);
    // Future: Express endpoint to receive webhooks
    // Store in database for batch processing
  }

  /**
   * Parse timeframe string to Date
   */
  private parseTimeframe(timeframe: string): Date {
    const match = timeframe.match(/(\d+)\s*(day|hour|week|month)s?/);
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
      case 'month':
        return new Date(now - amount * 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(since: Date): Promise<any> {
    const { data, error } = await this.supabase
      .rpc('get_event_statistics');

    if (error) {
      this.logger.error('Failed to get event statistics', error);
      return null;
    }

    return data;
  }
}
