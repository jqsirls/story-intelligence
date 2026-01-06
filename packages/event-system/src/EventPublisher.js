"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPublisher = void 0;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
const uuid_1 = require("uuid");
class EventPublisher {
    constructor(config, logger, eventStore) {
        this.correlationMap = new Map();
        this.config = config;
        this.logger = logger;
        this.eventStore = eventStore;
        this.eventBridge = new client_eventbridge_1.EventBridgeClient({
            region: config.region
        });
    }
    /**
     * Publish a single event
     */
    async publishEvent(eventType, data, options = {}) {
        const eventId = (0, uuid_1.v4)();
        const correlationId = options.correlationId || (0, uuid_1.v4)();
        const event = {
            specversion: '1.0',
            type: eventType,
            source: this.config.source,
            id: eventId,
            time: new Date().toISOString(),
            datacontenttype: 'application/json',
            subject: options.subject,
            data,
            correlationid: correlationId,
            userid: options.userId,
            sessionid: options.sessionId,
            agentname: options.agentName,
            platform: options.platform
        };
        try {
            // Store event for replay and debugging if store is available
            if (this.eventStore) {
                await this.eventStore.store(event);
            }
            // Update correlation tracking
            await this.updateCorrelationTracking(event, options.parentEventId);
            // Publish to EventBridge
            await this.publishToEventBridge([event]);
            this.logger.info('Event published successfully', {
                eventId,
                eventType,
                correlationId,
                source: this.config.source
            });
            return eventId;
        }
        catch (error) {
            this.logger.error('Failed to publish event', {
                eventId,
                eventType,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Publish multiple events in batch
     */
    async publishBatch(events) {
        const cloudEvents = events.map(event => ({
            specversion: '1.0',
            type: event.eventType,
            source: this.config.source,
            id: (0, uuid_1.v4)(),
            time: new Date().toISOString(),
            datacontenttype: 'application/json',
            subject: event.subject,
            data: event.data,
            correlationid: event.correlationId || (0, uuid_1.v4)(),
            userid: event.userId,
            sessionid: event.sessionId,
            agentname: event.agentName,
            platform: event.platform
        }));
        try {
            // Store events for replay and debugging
            if (this.eventStore) {
                await Promise.all(cloudEvents.map(event => this.eventStore.store(event)));
            }
            // Update correlation tracking for all events
            await Promise.all(cloudEvents.map(event => this.updateCorrelationTracking(event)));
            // Publish to EventBridge in batches
            const batchSize = this.config.batchSize || 10;
            const batches = this.chunkArray(cloudEvents, batchSize);
            for (const batch of batches) {
                await this.publishToEventBridge(batch);
            }
            const eventIds = cloudEvents.map(event => event.id);
            this.logger.info('Event batch published successfully', {
                eventCount: cloudEvents.length,
                eventIds,
                source: this.config.source
            });
            return eventIds;
        }
        catch (error) {
            this.logger.error('Failed to publish event batch', {
                eventCount: events.length,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Publish correlated event (part of a workflow)
     */
    async publishCorrelatedEvent(eventType, data, parentEventId, options = {}) {
        // Get correlation ID from parent event
        const parentCorrelation = Array.from(this.correlationMap.values())
            .find(c => c.rootEventId === parentEventId || c.relatedEvents.includes(parentEventId));
        const correlationId = parentCorrelation?.correlationId || (0, uuid_1.v4)();
        return this.publishEvent(eventType, data, {
            ...options,
            correlationId,
            parentEventId
        });
    }
    /**
     * Create event correlation for workflow tracking
     */
    async createCorrelation(rootEventId, description) {
        const correlationId = (0, uuid_1.v4)();
        const correlation = {
            correlationId,
            rootEventId,
            relatedEvents: [rootEventId],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.correlationMap.set(correlationId, correlation);
        if (this.eventStore) {
            await this.eventStore.updateCorrelation(correlation);
        }
        this.logger.debug('Event correlation created', {
            correlationId,
            rootEventId,
            description
        });
        return correlationId;
    }
    /**
     * Get correlation information
     */
    async getCorrelation(correlationId) {
        // Try memory first
        const memoryCorrelation = this.correlationMap.get(correlationId);
        if (memoryCorrelation) {
            return memoryCorrelation;
        }
        // Try event store
        if (this.eventStore) {
            return await this.eventStore.getCorrelation(correlationId);
        }
        return null;
    }
    /**
     * Get metrics for monitoring
     */
    async getMetrics() {
        // This would typically pull from a metrics store
        // For now, returning basic metrics
        return {
            eventsPublished: 0, // Would track actual count
            batchesPublished: 0,
            correlationsActive: this.correlationMap.size,
            averagePublishTime: 0,
            errorRate: 0
        };
    }
    /**
     * Health check
     */
    async healthCheck() {
        let eventBridgeHealthy = false;
        let eventStoreHealthy = true; // Optional service
        try {
            // Test EventBridge connection by listing rules
            await this.eventBridge.send(new client_eventbridge_1.PutEventsCommand({
                Entries: []
            }));
            eventBridgeHealthy = true;
        }
        catch (error) {
            this.logger.warn('EventBridge health check failed', { error });
        }
        if (this.eventStore) {
            try {
                // Test event store connection
                await this.eventStore.query({ limit: 1 });
                eventStoreHealthy = true;
            }
            catch (error) {
                this.logger.warn('Event store health check failed', { error });
                eventStoreHealthy = false;
            }
        }
        const isHealthy = eventBridgeHealthy && eventStoreHealthy;
        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            eventBridge: eventBridgeHealthy,
            eventStore: eventStoreHealthy,
            timestamp: new Date().toISOString()
        };
    }
    // Private helper methods
    async publishToEventBridge(events) {
        const entries = events.map(event => ({
            Source: event.source,
            DetailType: event.type,
            Detail: JSON.stringify(event),
            EventBusName: this.config.eventBusName,
            Time: new Date(event.time)
        }));
        const command = new client_eventbridge_1.PutEventsCommand({
            Entries: entries
        });
        const response = await this.eventBridge.send(command);
        // Check for failed entries
        if (response.FailedEntryCount && response.FailedEntryCount > 0) {
            const failedEntries = response.Entries?.filter(entry => entry.ErrorCode) || [];
            this.logger.error('Some events failed to publish', {
                failedCount: response.FailedEntryCount,
                failedEntries: failedEntries.map(entry => ({
                    errorCode: entry.ErrorCode,
                    errorMessage: entry.ErrorMessage
                }))
            });
            throw new Error(`${response.FailedEntryCount} events failed to publish`);
        }
    }
    async updateCorrelationTracking(event, parentEventId) {
        if (!event.correlationid)
            return;
        let correlation = this.correlationMap.get(event.correlationid);
        if (!correlation) {
            correlation = {
                correlationId: event.correlationid,
                rootEventId: parentEventId || event.id,
                parentEventId,
                relatedEvents: [event.id],
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }
        else {
            correlation.relatedEvents.push(event.id);
            correlation.updatedAt = new Date();
            if (parentEventId) {
                correlation.parentEventId = parentEventId;
            }
        }
        this.correlationMap.set(event.correlationid, correlation);
        if (this.eventStore) {
            await this.eventStore.updateCorrelation(correlation);
        }
    }
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}
exports.EventPublisher = EventPublisher;
