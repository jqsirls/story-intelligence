import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EventPublisher } from './EventPublisher';
import { EventSubscriber } from './EventSubscriber';
import { EventStore } from './EventStore';
import { 
  EventType, 
  EventSource, 
  EventPublisherConfig,
  EventSubscription,
  CloudEvent,
  EventCorrelation,
  EventMetrics
} from './types';

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

export class EventSystem {
  private publisher: EventPublisher;
  private subscriber: EventSubscriber;
  private eventStore: EventStore;
  private supabase: SupabaseClient;
  private logger: Logger;
  private config: EventSystemConfig;
  private isInitialized = false;

  constructor(config: EventSystemConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Initialize Supabase client
    this.supabase = require('@supabase/supabase-js').createClient(
      config.supabase.url,
      config.supabase.apiKey
    );

    // Initialize event store
    this.eventStore = new EventStore(this.supabase, logger);

    // Initialize publisher
    const publisherConfig: EventPublisherConfig = {
      eventBusName: config.eventBridge.eventBusName,
      region: config.eventBridge.region,
      source: config.publisher.source,
      enableReplay: config.publisher.enableReplay,
      enableDeadLetterQueue: config.publisher.enableDeadLetterQueue,
      retryAttempts: config.publisher.retryAttempts,
      batchSize: config.publisher.batchSize
    };

    this.publisher = new EventPublisher(publisherConfig, logger, this.eventStore);

    // Initialize subscriber
    this.subscriber = new EventSubscriber(config.subscriber.region, logger);
  }

  /**
   * Initialize the event system
   */
  async initialize(): Promise<void> {
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

    } catch (error) {
      this.logger.error('Failed to initialize EventSystem', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Shutdown the event system
   */
  async shutdown(): Promise<void> {
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

    } catch (error) {
      this.logger.error('Error during EventSystem shutdown', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Publish a single event
   */
  async publishEvent(
    eventType: EventType,
    data: any,
    options: {
      subject?: string;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      agentName?: string;
      platform?: string;
    } = {}
  ): Promise<string> {
    this.ensureInitialized();
    return await this.publisher.publishEvent(eventType, data, options);
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch(
    events: Array<{
      eventType: EventType;
      data: any;
      subject?: string;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      agentName?: string;
      platform?: string;
    }>
  ): Promise<string[]> {
    this.ensureInitialized();
    return await this.publisher.publishBatch(events);
  }

  /**
   * Publish correlated event (part of a workflow)
   */
  async publishCorrelatedEvent(
    eventType: EventType,
    data: any,
    parentEventId: string,
    options: {
      subject?: string;
      userId?: string;
      sessionId?: string;
      agentName?: string;
      platform?: string;
    } = {}
  ): Promise<string> {
    this.ensureInitialized();
    return await this.publisher.publishCorrelatedEvent(eventType, data, parentEventId, options);
  }

  /**
   * Subscribe to specific event types
   */
  async subscribe(
    subscriptionId: string,
    subscription: EventSubscription,
    queueUrl: string
  ): Promise<void> {
    this.ensureInitialized();
    return await this.subscriber.subscribe(subscriptionId, subscription, queueUrl);
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    this.ensureInitialized();
    return await this.subscriber.unsubscribe(subscriptionId);
  }

  /**
   * Create event correlation for workflow tracking
   */
  async createCorrelation(rootEventId: string, description?: string): Promise<string> {
    this.ensureInitialized();
    return await this.publisher.createCorrelation(rootEventId, description);
  }

  /**
   * Get correlation information
   */
  async getCorrelation(correlationId: string): Promise<EventCorrelation | null> {
    this.ensureInitialized();
    return await this.publisher.getCorrelation(correlationId);
  }

  /**
   * Query events from the event store
   */
  async queryEvents(criteria: {
    eventTypes?: EventType[];
    sources?: EventSource[];
    startTime?: Date;
    endTime?: Date;
    correlationId?: string;
    userId?: string;
    sessionId?: string;
    limit?: number;
    offset?: number;
  }): Promise<CloudEvent[]> {
    this.ensureInitialized();
    return await this.eventStore.query(criteria);
  }

  /**
   * Retrieve a specific event by ID
   */
  async getEvent(eventId: string): Promise<CloudEvent | null> {
    this.ensureInitialized();
    return await this.eventStore.retrieve(eventId);
  }

  /**
   * Replay events to a destination
   */
  async replayEvents(config: {
    replayName: string;
    eventSourceArn: string;
    startTime: Date;
    endTime: Date;
    destination: string;
    description?: string;
  }): Promise<string> {
    this.ensureInitialized();
    return await this.eventStore.replay(config);
  }

  /**
   * Get comprehensive metrics for monitoring
   */
  async getMetrics(): Promise<{
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
  }> {
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
  async healthCheck(): Promise<{
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
  }> {
    const startTime = Date.now();

    // Test database connection
    let dbHealthy = false;
    let dbResponseTime = 0;
    try {
      const dbStart = Date.now();
      const { error } = await this.supabase.from('event_store').select('id').limit(1);
      dbResponseTime = Date.now() - dbStart;
      dbHealthy = !error;
    } catch (error) {
      this.logger.warn('Database health check failed', { error });
    }

    const [publisherHealth, subscriberHealth] = await Promise.all([
      this.publisher.healthCheck(),
      this.subscriber.healthCheck()
    ]);

    const overallHealthy = 
      publisherHealth.status === 'healthy' &&
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
  async cleanupOldEvents(retentionDays: number = 90): Promise<number> {
    this.ensureInitialized();
    return await this.eventStore.cleanup(retentionDays);
  }

  /**
   * Record processing metrics for an event
   */
  async recordMetrics(
    eventType: EventType,
    source: EventSource,
    processingTimeMs: number,
    options: {
      queueTimeMs?: number;
      handlerTimeMs?: number;
      networkTimeMs?: number;
      retryCount?: number;
      success?: boolean;
      errorMessage?: string;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
    } = {}
  ): Promise<void> {
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
    } catch (error) {
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
  async getAnalytics(): Promise<Array<{
    eventType: string;
    source: string;
    hour: string;
    eventCount: number;
    uniqueCorrelations: number;
    uniqueUsers: number;
    uniqueSessions: number;
  }>> {
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

    } catch (error) {
      this.logger.error('Failed to get event analytics', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('EventSystem not initialized. Call initialize() first.');
    }
  }
}