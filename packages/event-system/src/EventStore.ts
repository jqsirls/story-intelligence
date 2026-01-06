import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { 
  CloudEvent, 
  EventStore as IEventStore,
  EventQueryCriteria,
  EventReplayConfig,
  EventCorrelation
} from './types';

export class EventStore implements IEventStore {
  private supabase: SupabaseClient;
  private logger: Logger;

  constructor(supabase: SupabaseClient, logger: Logger) {
    this.supabase = supabase;
    this.logger = logger;
  }

  /**
   * Store an event for replay and debugging
   */
  async store(event: CloudEvent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('event_store')
        .insert({
          event_id: event.id,
          event_type: event.type,
          source: event.source,
          spec_version: event.specversion,
          event_time: event.time,
          data_content_type: event.datacontenttype,
          data_schema: event.dataschema,
          subject: event.subject,
          data: event.data,
          correlation_id: event.correlationid,
          user_id: event.userid,
          session_id: event.sessionid,
          agent_name: event.agentname,
          platform: event.platform,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to store event: ${error.message}`);
      }

      this.logger.debug('Event stored successfully', {
        eventId: event.id,
        eventType: event.type
      });

    } catch (error) {
      this.logger.error('Error storing event', {
        eventId: event.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Retrieve a specific event by ID
   */
  async retrieve(eventId: string): Promise<CloudEvent | null> {
    try {
      const { data, error } = await this.supabase
        .from('event_store')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw new Error(`Failed to retrieve event: ${error.message}`);
      }

      return this.mapToCloudEvent(data);

    } catch (error) {
      this.logger.error('Error retrieving event', {
        eventId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Query events based on criteria
   */
  async query(criteria: EventQueryCriteria): Promise<CloudEvent[]> {
    try {
      let query = this.supabase
        .from('event_store')
        .select('*')
        .order('event_time', { ascending: false });

      // Apply filters
      if (criteria.eventTypes && criteria.eventTypes.length > 0) {
        query = query.in('event_type', criteria.eventTypes);
      }

      if (criteria.sources && criteria.sources.length > 0) {
        query = query.in('source', criteria.sources);
      }

      if (criteria.startTime) {
        query = query.gte('event_time', criteria.startTime.toISOString());
      }

      if (criteria.endTime) {
        query = query.lte('event_time', criteria.endTime.toISOString());
      }

      if (criteria.correlationId) {
        query = query.eq('correlation_id', criteria.correlationId);
      }

      if (criteria.userId) {
        query = query.eq('user_id', criteria.userId);
      }

      if (criteria.sessionId) {
        query = query.eq('session_id', criteria.sessionId);
      }

      // Apply pagination
      if (criteria.limit) {
        query = query.limit(criteria.limit);
      }

      if (criteria.offset) {
        query = query.range(criteria.offset, (criteria.offset + (criteria.limit || 100)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to query events: ${error.message}`);
      }

      return (data || []).map(row => this.mapToCloudEvent(row));

    } catch (error) {
      this.logger.error('Error querying events', {
        criteria,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Replay events to a destination
   */
  async replay(config: EventReplayConfig): Promise<string> {
    try {
      // Store replay configuration
      const { data: replayRecord, error: insertError } = await this.supabase
        .from('event_replays')
        .insert({
          replay_name: config.replayName,
          event_source_arn: config.eventSourceArn,
          start_time: config.startTime.toISOString(),
          end_time: config.endTime.toISOString(),
          destination: config.destination,
          description: config.description,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create replay record: ${insertError.message}`);
      }

      // In a real implementation, this would trigger an AWS EventBridge replay
      // For now, we'll simulate the replay process
      this.logger.info('Event replay initiated', {
        replayId: replayRecord.id,
        replayName: config.replayName,
        startTime: config.startTime,
        endTime: config.endTime
      });

      // Update status to running (in real implementation, this would be done by the replay service)
      await this.supabase
        .from('event_replays')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', replayRecord.id);

      return replayRecord.id;

    } catch (error) {
      this.logger.error('Error initiating event replay', {
        config,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get correlation information
   */
  async getCorrelation(correlationId: string): Promise<EventCorrelation | null> {
    try {
      const { data, error } = await this.supabase
        .from('event_correlations')
        .select('*')
        .eq('correlation_id', correlationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw new Error(`Failed to get correlation: ${error.message}`);
      }

      return {
        correlationId: data.correlation_id,
        rootEventId: data.root_event_id,
        parentEventId: data.parent_event_id,
        causedBy: data.caused_by,
        relatedEvents: data.related_events || [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

    } catch (error) {
      this.logger.error('Error getting correlation', {
        correlationId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update correlation information
   */
  async updateCorrelation(correlation: EventCorrelation): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('event_correlations')
        .upsert({
          correlation_id: correlation.correlationId,
          root_event_id: correlation.rootEventId,
          parent_event_id: correlation.parentEventId,
          caused_by: correlation.causedBy,
          related_events: correlation.relatedEvents,
          created_at: correlation.createdAt.toISOString(),
          updated_at: correlation.updatedAt.toISOString()
        });

      if (error) {
        throw new Error(`Failed to update correlation: ${error.message}`);
      }

      this.logger.debug('Correlation updated successfully', {
        correlationId: correlation.correlationId,
        relatedEventsCount: correlation.relatedEvents.length
      });

    } catch (error) {
      this.logger.error('Error updating correlation', {
        correlationId: correlation.correlationId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Clean up old events based on retention policy
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { data, error } = await this.supabase
        .from('event_store')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('event_id');

      if (error) {
        throw new Error(`Failed to cleanup events: ${error.message}`);
      }

      const deletedCount = data?.length || 0;

      this.logger.info('Event cleanup completed', {
        deletedCount,
        cutoffDate: cutoffDate.toISOString()
      });

      return deletedCount;

    } catch (error) {
      this.logger.error('Error during event cleanup', {
        retentionDays,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStatistics(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySource: Record<string, number>;
    oldestEvent: string | null;
    newestEvent: string | null;
    storageSize: number;
  }> {
    try {
      // Get total count
      const { count: totalEvents, error: countError } = await this.supabase
        .from('event_store')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Failed to get event count: ${countError.message}`);
      }

      // Get events by type
      const { data: typeData, error: typeError } = await this.supabase
        .from('event_store')
        .select('event_type')
        .order('event_type');

      if (typeError) {
        throw new Error(`Failed to get events by type: ${typeError.message}`);
      }

      const eventsByType: Record<string, number> = {};
      typeData?.forEach(row => {
        eventsByType[row.event_type] = (eventsByType[row.event_type] || 0) + 1;
      });

      // Get events by source
      const { data: sourceData, error: sourceError } = await this.supabase
        .from('event_store')
        .select('source')
        .order('source');

      if (sourceError) {
        throw new Error(`Failed to get events by source: ${sourceError.message}`);
      }

      const eventsBySource: Record<string, number> = {};
      sourceData?.forEach(row => {
        eventsBySource[row.source] = (eventsBySource[row.source] || 0) + 1;
      });

      // Get oldest and newest events
      const { data: oldestData, error: oldestError } = await this.supabase
        .from('event_store')
        .select('event_time')
        .order('event_time', { ascending: true })
        .limit(1);

      const { data: newestData, error: newestError } = await this.supabase
        .from('event_store')
        .select('event_time')
        .order('event_time', { ascending: false })
        .limit(1);

      return {
        totalEvents: totalEvents || 0,
        eventsByType,
        eventsBySource,
        oldestEvent: oldestData?.[0]?.event_time || null,
        newestEvent: newestData?.[0]?.event_time || null,
        storageSize: 0 // Would need to calculate actual storage size
      };

    } catch (error) {
      this.logger.error('Error getting event statistics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Private helper methods

  private mapToCloudEvent(row: any): CloudEvent {
    return {
      specversion: row.spec_version,
      type: row.event_type,
      source: row.source,
      id: row.event_id,
      time: row.event_time,
      datacontenttype: row.data_content_type,
      dataschema: row.data_schema,
      subject: row.subject,
      data: row.data,
      correlationid: row.correlation_id,
      userid: row.user_id,
      sessionid: row.session_id,
      agentname: row.agent_name,
      platform: row.platform
    };
  }
}