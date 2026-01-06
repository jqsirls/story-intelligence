import { Logger } from 'winston';
import { EventType, EventSource, EventSubscription, CloudEvent, EventCorrelation } from './types';
export interface EventSystemConfig {
    eventBridge: {
        region: string;
        eventBusName: string;
    };
    supabase: {
        url: string;
        apiKey: string;
    };
    publisher: {
        source: EventSource;
        enableReplay?: boolean;
        enableDeadLetterQueue?: boolean;
        retryAttempts?: number;
        batchSize?: number;
    };
    subscriber: {
        region: string;
    };
}
export declare class EventSystem {
    private publisher;
    private subscriber;
    private eventStore;
    private supabase;
    private logger;
    private config;
    private isInitialized;
    constructor(config: EventSystemConfig, logger: Logger);
    /**
     * Initialize the event system
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the event system
     */
    shutdown(): Promise<void>;
    /**
     * Publish a single event
     */
    publishEvent(eventType: EventType, data: any, options?: {
        subject?: string;
        correlationId?: string;
        userId?: string;
        sessionId?: string;
        agentName?: string;
        platform?: string;
    }): Promise<string>;
    /**
     * Publish multiple events in batch
     */
    publishBatch(events: Array<{
        eventType: EventType;
        data: any;
        subject?: string;
        correlationId?: string;
        userId?: string;
        sessionId?: string;
        agentName?: string;
        platform?: string;
    }>): Promise<string[]>;
    /**
     * Publish correlated event (part of a workflow)
     */
    publishCorrelatedEvent(eventType: EventType, data: any, parentEventId: string, options?: {
        subject?: string;
        userId?: string;
        sessionId?: string;
        agentName?: string;
        platform?: string;
    }): Promise<string>;
    /**
     * Subscribe to specific event types
     */
    subscribe(subscriptionId: string, subscription: EventSubscription, queueUrl: string): Promise<void>;
    /**
     * Unsubscribe from events
     */
    unsubscribe(subscriptionId: string): Promise<void>;
    /**
     * Create event correlation for workflow tracking
     */
    createCorrelation(rootEventId: string, description?: string): Promise<string>;
    /**
     * Get correlation information
     */
    getCorrelation(correlationId: string): Promise<EventCorrelation | null>;
    /**
     * Query events from the event store
     */
    queryEvents(criteria: {
        eventTypes?: EventType[];
        sources?: EventSource[];
        startTime?: Date;
        endTime?: Date;
        correlationId?: string;
        userId?: string;
        sessionId?: string;
        limit?: number;
        offset?: number;
    }): Promise<CloudEvent[]>;
    /**
     * Retrieve a specific event by ID
     */
    getEvent(eventId: string): Promise<CloudEvent | null>;
    /**
     * Replay events to a destination
     */
    replayEvents(config: {
        replayName: string;
        eventSourceArn: string;
        startTime: Date;
        endTime: Date;
        destination: string;
        description?: string;
    }): Promise<string>;
    /**
     * Get comprehensive metrics for monitoring
     */
    getMetrics(): Promise<{
        publisher: {
            eventsPublished: number;
            batchesPublished: number;
            correlationsActive: number;
            averagePublishTime: number;
            errorRate: number;
        };
        subscriber: {
            subscriptions: number;
            eventsProcessed: number;
            averageProcessingTime: number;
            errorRate: number;
            activePollers: number;
        };
        store: {
            totalEvents: number;
            eventsByType: Record<string, number>;
            eventsBySource: Record<string, number>;
            oldestEvent: string | null;
            newestEvent: string | null;
            storageSize: number;
        };
    }>;
    /**
     * Health check for the entire event system
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        components: {
            publisher: {
                status: 'healthy' | 'unhealthy';
                eventBridge: boolean;
                eventStore: boolean;
            };
            subscriber: {
                status: 'healthy' | 'unhealthy';
                eventBridge: boolean;
                sqs: boolean;
                subscriptions: number;
                activePollers: number;
            };
            database: {
                status: 'healthy' | 'unhealthy';
                connected: boolean;
                responseTime: number;
            };
        };
        timestamp: string;
    }>;
    /**
     * Clean up old events based on retention policy
     */
    cleanupOldEvents(retentionDays?: number): Promise<number>;
    /**
     * Record processing metrics for an event
     */
    recordMetrics(eventType: EventType, source: EventSource, processingTimeMs: number, options?: {
        queueTimeMs?: number;
        handlerTimeMs?: number;
        networkTimeMs?: number;
        retryCount?: number;
        success?: boolean;
        errorMessage?: string;
        correlationId?: string;
        userId?: string;
        sessionId?: string;
    }): Promise<void>;
    /**
     * Get event analytics for the last 24 hours
     */
    getAnalytics(): Promise<Array<{
        eventType: string;
        source: string;
        hour: string;
        eventCount: number;
        uniqueCorrelations: number;
        uniqueUsers: number;
        uniqueSessions: number;
    }>>;
    private ensureInitialized;
}
