export interface CloudEvent {
    specversion: '1.0';
    type: string;
    source: string;
    id: string;
    time: string;
    datacontenttype?: string;
    dataschema?: string;
    subject?: string;
    data?: any;
    correlationid?: string;
    userid?: string;
    sessionid?: string;
    agentname?: string;
    platform?: string;
}
export type EventType = 'com.storytailor.auth.account-linked' | 'com.storytailor.auth.verification-completed' | 'com.storytailor.auth.login-attempted' | 'com.storytailor.auth.password-reset' | 'com.storytailor.story.creation-started' | 'com.storytailor.story.character-created' | 'com.storytailor.story.story-generated' | 'com.storytailor.story.assets-generated' | 'com.storytailor.story.story-finalized' | 'com.storytailor.smarthome.device-connected' | 'com.storytailor.smarthome.lighting-changed' | 'com.storytailor.smarthome.narrative-sync' | 'com.storytailor.smarthome.device-disconnected' | 'com.storytailor.privacy.consent-given' | 'com.storytailor.privacy.consent-withdrawn' | 'com.storytailor.privacy.data-deleted' | 'com.storytailor.privacy.parental-verification' | 'com.storytailor.emotion.checkin-completed' | 'com.storytailor.emotion.pattern-detected' | 'com.storytailor.emotion.mood-updated' | 'com.storytailor.system.agent-started' | 'com.storytailor.system.agent-stopped' | 'com.storytailor.system.error-occurred' | 'com.storytailor.system.health-check' | 'com.storytailor.commerce.subscription-created' | 'com.storytailor.commerce.payment-processed' | 'com.storytailor.commerce.subscription-cancelled';
export type EventSource = 'com.storytailor.auth-agent' | 'com.storytailor.content-agent' | 'com.storytailor.library-agent' | 'com.storytailor.emotion-agent' | 'com.storytailor.commerce-agent' | 'com.storytailor.smarthome-agent' | 'com.storytailor.router' | 'com.storytailor.storytailor-agent' | 'com.storytailor.system';
export interface EventPublisherConfig {
    eventBusName: string;
    region: string;
    source: EventSource;
    enableReplay?: boolean;
    enableDeadLetterQueue?: boolean;
    retryAttempts?: number;
    batchSize?: number;
    maxBatchWaitTime?: number;
}
export interface EventSubscription {
    eventTypes: EventType[];
    source?: EventSource;
    handler: EventHandler;
    filterPattern?: Record<string, any>;
    deadLetterQueue?: string;
    retryPolicy?: {
        maximumRetryAttempts: number;
        maximumEventAge: number;
    };
}
export interface EventHandler {
    handle(event: CloudEvent): Promise<void>;
}
export interface EventReplayConfig {
    replayName: string;
    eventSourceArn: string;
    startTime: Date;
    endTime: Date;
    destination: string;
    description?: string;
}
export interface EventCorrelation {
    correlationId: string;
    rootEventId: string;
    parentEventId?: string;
    causedBy?: string;
    relatedEvents: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface EventMetrics {
    eventType: EventType;
    source: EventSource;
    count: number;
    averageProcessingTime: number;
    errorRate: number;
    lastProcessed: Date;
}
export interface EventDebugInfo {
    eventId: string;
    correlationId?: string;
    processingSteps: EventProcessingStep[];
    errors: EventError[];
    performance: EventPerformanceMetrics;
}
export interface EventProcessingStep {
    step: string;
    timestamp: Date;
    duration: number;
    success: boolean;
    metadata?: Record<string, any>;
}
export interface EventError {
    step: string;
    error: string;
    timestamp: Date;
    retryable: boolean;
    metadata?: Record<string, any>;
}
export interface EventPerformanceMetrics {
    totalProcessingTime: number;
    queueTime: number;
    handlerTime: number;
    networkTime: number;
    retryCount: number;
}
export interface EventStore {
    store(event: CloudEvent): Promise<void>;
    retrieve(eventId: string): Promise<CloudEvent | null>;
    query(criteria: EventQueryCriteria): Promise<CloudEvent[]>;
    replay(config: EventReplayConfig): Promise<string>;
    getCorrelation(correlationId: string): Promise<EventCorrelation | null>;
    updateCorrelation(correlation: EventCorrelation): Promise<void>;
}
export interface EventQueryCriteria {
    eventTypes?: EventType[];
    sources?: EventSource[];
    startTime?: Date;
    endTime?: Date;
    correlationId?: string;
    userId?: string;
    sessionId?: string;
    limit?: number;
    offset?: number;
}
export interface EventValidationSchema {
    eventType: EventType;
    requiredFields: string[];
    dataSchema?: any;
    maxSize?: number;
    allowedSources?: EventSource[];
}
