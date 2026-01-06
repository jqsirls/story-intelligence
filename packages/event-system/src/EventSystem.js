"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSystem = void 0;
const EventPublisher_1 = require("./EventPublisher");
const EventSubscriber_1 = require("./EventSubscriber");
const EventStore_1 = require("./EventStore");
class EventSystem {
    constructor(config, logger) {
        this.isInitialized = false;
        this.config = config;
        this.logger = logger;
        // Initialize Supabase client
        this.supabase = require('@supabase/supabase-js').createClient(config.supabase.url, config.supabase.apiKey);
        // Initialize event store
        this.eventStore = new EventStore_1.EventStore(this.supabase, logger);
        // Initialize publisher
        const publisherConfig = {
            eventBusName: config.eventBridge.eventBusName,
            region: config.eventBridge.region,
            source: config.publisher.source,
            enableReplay: config.publisher.enableReplay,
            enableDeadLetterQueue: config.publisher.enableDeadLetterQueue,
            retryAttempts: config.publisher.retryAttempts,
            batchSize: config.publisher.batchSize
        };
        this.publisher = new EventPublisher_1.EventPublisher(publisherConfig, logger, this.eventStore);
        // Initialize subscriber
        this.subscriber = new EventSubscriber_1.EventSubscriber(config.subscriber.region, logger);
    }
    /**
     * Initialize the event system
     */
    async initialize() {
        if (this.isInitialized) {
            this.logger.warn('EventSystem is already initialized');
            return;
        }
        try {
            // Test database connection
            const { error } = await this.supabase.from('event_store').select('id').limit(1);
            if (error) {
                throw new Error(`Database connection failed: ${error.message}`);
            }
            // Start subscriber
            await this.subscriber.start();
            this.isInitialized = true;
            this.logger.info('EventSystem initialized successfully');
            // Publish system startup event
            await this.publishEvent('com.storytailor.system.agent-started', {
                agentName: this.config.publisher.source,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            this.logger.error('Failed to initialize EventSystem', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Shutdown the event system
     */
    async shutdown() {
        if (!this.isInitialized) {
            return;
        }
        try {
            // Publish system shutdown event
            await this.publishEvent('com.storytailor.system.agent-stopped', {
                agentName: this.config.publisher.source,
                timestamp: new Date().toISOString()
            });
            // Stop subscriber
            await this.subscriber.stop();
            this.isInitialized = false;
            this.logger.info('EventSystem shutdown successfully');
        }
        catch (error) {
            this.logger.error('Error during EventSystem shutdown', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Publish a single event
     */
    async publishEvent(eventType, data, options = {}) {
        this.ensureInitialized();
        return await this.publisher.publishEvent(eventType, data, options);
    }
    /**
     * Publish multiple events in batch
     */
    async publishBatch(events) {
        this.ensureInitialized();
        return await this.publisher.publishBatch(events);
    }
    /**
     * Publish correlated event (part of a workflow)
     */
    async publishCorrelatedEvent(eventType, data, parentEventId, options = {}) {
        this.ensureInitialized();
        return await this.publisher.publishCorrelatedEvent(eventType, data, parentEventId, options);
    }
    /**
     * Subscribe to specific event types
     */
    async subscribe(subscriptionId, subscription, queueUrl) {
        this.ensureInitialized();
        return await this.subscriber.subscribe(subscriptionId, subscription, queueUrl);
    }
    /**
     * Unsubscribe from events
     */
    async unsubscribe(subscriptionId) {
        this.ensureInitialized();
        return await this.subscriber.unsubscribe(subscriptionId);
    }
    /**
     * Create event correlation for workflow tracking
     */
    async createCorrelation(rootEventId, description) {
        this.ensureInitialized();
        return await this.publisher.createCorrelation(rootEventId, description);
    }
    /**
     * Get correlation information
     */
    async getCorrelation(correlationId) {
        this.ensureInitialized();
        return await this.publisher.getCorrelation(correlationId);
    }
    /**
     * Query events from the event store
     */
    async queryEvents(criteria) {
        this.ensureInitialized();
        return await this.eventStore.query(criteria);
    }
    /**
     * Retrieve a specific event by ID
     */
    async getEvent(eventId) {
        this.ensureInitialized();
        return await this.eventStore.retrieve(eventId);
    }
    /**
     * Replay events to a destination
     */
    async replayEvents(config) {
        this.ensureInitialized();
        return await this.eventStore.replay(config);
    }
    /**
     * Get comprehensive metrics for monitoring
     */
    async getMetrics() {
        this.ensureInitialized();
        const [publisherMetrics, subscriberMetrics, storeStats] = await Promise.all([
            this.publisher.getMetrics(),
            this.subscriber.getMetrics(),
            this.eventStore.getStatistics()
        ]);
        return {
            publisher: publisherMetrics,
            subscriber: subscriberMetrics,
            store: storeStats
        };
    }
    /**
     * Health check for the entire event system
     */
    async healthCheck() {
        const startTime = Date.now();
        // Test database connection
        let dbHealthy = false;
        let dbResponseTime = 0;
        try {
            const dbStart = Date.now();
            const { error } = await this.supabase.from('event_store').select('id').limit(1);
            dbResponseTime = Date.now() - dbStart;
            dbHealthy = !error;
        }
        catch (error) {
            this.logger.warn('Database health check failed', { error });
        }
        const [publisherHealth, subscriberHealth] = await Promise.all([
            this.publisher.healthCheck(),
            this.subscriber.healthCheck()
        ]);
        const overallHealthy = publisherHealth.status === 'healthy' &&
            subscriberHealth.status === 'healthy' &&
            dbHealthy;
        return {
            status: overallHealthy ? 'healthy' : 'unhealthy',
            components: {
                publisher: publisherHealth,
                subscriber: subscriberHealth,
                database: {
                    status: dbHealthy ? 'healthy' : 'unhealthy',
                    connected: dbHealthy,
                    responseTime: dbResponseTime
                }
            },
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Clean up old events based on retention policy
     */
    async cleanupOldEvents(retentionDays = 90) {
        this.ensureInitialized();
        return await this.eventStore.cleanup(retentionDays);
    }
    /**
     * Record processing metrics for an event
     */
    async recordMetrics(eventType, source, processingTimeMs, options = {}) {
        try {
            await this.supabase.rpc('record_event_metrics', {
                p_event_type: eventType,
                p_source: source,
                p_processing_time_ms: processingTimeMs,
                p_queue_time_ms: options.queueTimeMs || 0,
                p_handler_time_ms: options.handlerTimeMs || 0,
                p_network_time_ms: options.networkTimeMs || 0,
                p_retry_count: options.retryCount || 0,
                p_success: options.success !== false,
                p_error_message: options.errorMessage,
                p_correlation_id: options.correlationId,
                p_user_id: options.userId,
                p_session_id: options.sessionId
            });
        }
        catch (error) {
            this.logger.error('Failed to record event metrics', {
                eventType,
                source,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Get event analytics for the last 24 hours
     */
    async getAnalytics() {
        this.ensureInitialized();
        try {
            const { data, error } = await this.supabase
                .from('event_analytics')
                .select('*')
                .order('hour', { ascending: false });
            if (error) {
                throw new Error(`Failed to get event analytics: ${error.message}`);
            }
            return data || [];
        }
        catch (error) {
            this.logger.error('Failed to get event analytics', {
                error: error instanceof Error ? error.message : String(error)
            });
            return [];
        }
    }
    // Private helper methods
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('EventSystem not initialized. Call initialize() first.');
        }
    }
}
exports.EventSystem = EventSystem;
