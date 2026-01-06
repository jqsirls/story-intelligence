import { Logger } from 'winston';
import { EventSubscription, EventDebugInfo } from './types';
export declare class EventSubscriber {
    private eventBridge;
    private sqs;
    private logger;
    private subscriptions;
    private isRunning;
    private pollingIntervals;
    private processingMetrics;
    constructor(region: string, logger: Logger);
    /**
     * Subscribe to specific event types
     */
    subscribe(subscriptionId: string, subscription: EventSubscription, queueUrl: string): Promise<void>;
    /**
     * Unsubscribe from events
     */
    unsubscribe(subscriptionId: string): Promise<void>;
    /**
     * Start processing events for all subscriptions
     */
    start(): Promise<void>;
    /**
     * Stop processing events
     */
    stop(): Promise<void>;
    /**
     * Get processing metrics for monitoring
     */
    getMetrics(): {
        subscriptions: number;
        eventsProcessed: number;
        averageProcessingTime: number;
        errorRate: number;
        activePollers: number;
    };
    /**
     * Get debug information for an event
     */
    getEventDebugInfo(eventId: string): EventDebugInfo | null;
    /**
     * Health check
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        eventBridge: boolean;
        sqs: boolean;
        subscriptions: number;
        activePollers: number;
        timestamp: string;
    }>;
    private startPolling;
    private stopPolling;
    private pollQueue;
    private processMessage;
    private deleteMessage;
    private validateEvent;
    private buildEventPattern;
    private getQueueArn;
    private recordProcessingMetrics;
}
