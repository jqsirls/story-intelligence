import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { CloudEvent, EventStore as IEventStore, EventQueryCriteria, EventReplayConfig, EventCorrelation } from './types';
export declare class EventStore implements IEventStore {
    private supabase;
    private logger;
    constructor(supabase: SupabaseClient, logger: Logger);
    /**
     * Store an event for replay and debugging
     */
    store(event: CloudEvent): Promise<void>;
    /**
     * Retrieve a specific event by ID
     */
    retrieve(eventId: string): Promise<CloudEvent | null>;
    /**
     * Query events based on criteria
     */
    query(criteria: EventQueryCriteria): Promise<CloudEvent[]>;
    /**
     * Replay events to a destination
     */
    replay(config: EventReplayConfig): Promise<string>;
    /**
     * Get correlation information
     */
    getCorrelation(correlationId: string): Promise<EventCorrelation | null>;
    /**
     * Update correlation information
     */
    updateCorrelation(correlation: EventCorrelation): Promise<void>;
    /**
     * Clean up old events based on retention policy
     */
    cleanup(retentionDays?: number): Promise<number>;
    /**
     * Get storage statistics
     */
    getStatistics(): Promise<{
        totalEvents: number;
        eventsByType: Record<string, number>;
        eventsBySource: Record<string, number>;
        oldestEvent: string | null;
        newestEvent: string | null;
        storageSize: number;
    }>;
    private mapToCloudEvent;
}
