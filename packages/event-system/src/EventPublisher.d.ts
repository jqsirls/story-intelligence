import { Logger } from 'winston';
import { EventType, EventPublisherConfig, EventCorrelation, EventStore } from './types';
export declare class EventPublisher {
    private eventBridge;
    private config;
    private logger;
    private eventStore?;
    private correlationMap;
    constructor(config: EventPublisherConfig, logger: Logger, eventStore?: EventStore);
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
        parentEventId?: string;
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
     * Create event correlation for workflow tracking
     */
    createCorrelation(rootEventId: string, description?: string): Promise<string>;
    /**
     * Get correlation information
     */
    getCorrelation(correlationId: string): Promise<EventCorrelation | null>;
    /**
     * Get metrics for monitoring
     */
    getMetrics(): Promise<{
        eventsPublished: number;
        batchesPublished: number;
        correlationsActive: number;
        averagePublishTime: number;
        errorRate: number;
    }>;
    /**
     * Health check
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        eventBridge: boolean;
        eventStore: boolean;
        timestamp: string;
    }>;
    private publishToEventBridge;
    private updateCorrelationTracking;
    private chunkArray;
}
