import { EventPublisher } from '../EventPublisher';
import { EventStore } from '../EventStore';
import { EventPublisherConfig } from '../types';
import { Logger } from 'winston';

// Mock AWS SDK
jest.mock('@aws-sdk/client-eventbridge');

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
} as unknown as Logger;

const mockEventStore = {
  store: jest.fn(),
  updateCorrelation: jest.fn(),
  getCorrelation: jest.fn()
} as unknown as EventStore;

const mockConfig: EventPublisherConfig = {
  eventBusName: 'test-event-bus',
  region: 'us-east-1',
  source: 'com.storytailor.test-agent',
  enableReplay: true,
  batchSize: 10
};

describe('EventPublisher', () => {
  let publisher: EventPublisher;

  beforeEach(() => {
    jest.clearAllMocks();
    publisher = new EventPublisher(mockConfig, mockLogger, mockEventStore);
  });

  describe('publishEvent', () => {
    it('should publish a single event successfully', async () => {
      const eventType = 'com.storytailor.test.event-published';
      const data = { message: 'test event' };
      const options = {
        userId: 'user-123',
        sessionId: 'session-456'
      };

      const eventId = await publisher.publishEvent(eventType, data, options);

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
      expect(mockEventStore.store).toHaveBeenCalledWith(
        expect.objectContaining({
          type: eventType,
          source: mockConfig.source,
          data,
          userid: options.userId,
          sessionid: options.sessionId
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Event published successfully',
        expect.objectContaining({
          eventType,
          source: mockConfig.source
        })
      );
    });

    it('should handle publishing errors gracefully', async () => {
      const eventType = 'com.storytailor.test.event-published';
      const data = { message: 'test event' };

      // Create a new publisher with a mocked EventBridge that throws an error
      const mockEventBridgeClient = {
        send: jest.fn().mockRejectedValue(new Error('EventBridge error'))
      };
      
      // Replace the EventBridge client in the publisher
      (publisher as any).eventBridge = mockEventBridgeClient;

      await expect(
        publisher.publishEvent(eventType, data)
      ).rejects.toThrow('EventBridge error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.objectContaining({
          eventType,
          error: 'EventBridge error'
        })
      );
    });

    it('should generate correlation ID if not provided', async () => {
      const eventType = 'com.storytailor.test.event-published';
      const data = { message: 'test event' };

      await publisher.publishEvent(eventType, data);

      expect(mockEventStore.store).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationid: expect.any(String)
        })
      );
    });

    it('should use provided correlation ID', async () => {
      const eventType = 'com.storytailor.test.event-published';
      const data = { message: 'test event' };
      const correlationId = 'custom-correlation-id';

      await publisher.publishEvent(eventType, data, { correlationId });

      expect(mockEventStore.store).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationid: correlationId
        })
      );
    });
  });

  describe('publishBatch', () => {
    it('should publish multiple events in batch', async () => {
      const events = [
        {
          eventType: 'com.storytailor.test.event-1' as const,
          data: { message: 'event 1' },
          userId: 'user-1'
        },
        {
          eventType: 'com.storytailor.test.event-2' as const,
          data: { message: 'event 2' },
          userId: 'user-2'
        }
      ];

      const eventIds = await publisher.publishBatch(events);

      expect(eventIds).toHaveLength(2);
      expect(eventIds.every(id => typeof id === 'string')).toBe(true);
      expect(mockEventStore.store).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Event batch published successfully',
        expect.objectContaining({
          eventCount: 2,
          eventIds
        })
      );
    });

    it('should handle empty batch', async () => {
      const eventIds = await publisher.publishBatch([]);

      expect(eventIds).toHaveLength(0);
      expect(mockEventStore.store).not.toHaveBeenCalled();
    });
  });

  describe('publishCorrelatedEvent', () => {
    it('should publish event with parent correlation', async () => {
      const eventType = 'com.storytailor.test.correlated-event';
      const data = { message: 'correlated event' };
      const parentEventId = 'parent-event-123';

      // Mock correlation lookup
      (mockEventStore.getCorrelation as jest.Mock).mockResolvedValue({
        correlationId: 'existing-correlation-id',
        rootEventId: 'root-event-123',
        relatedEvents: [parentEventId]
      });

      const eventId = await publisher.publishCorrelatedEvent(
        eventType,
        data,
        parentEventId
      );

      expect(eventId).toBeDefined();
      expect(mockEventStore.store).toHaveBeenCalledWith(
        expect.objectContaining({
          type: eventType,
          data,
          correlationid: expect.any(String)
        })
      );
    });
  });

  describe('createCorrelation', () => {
    it('should create new correlation', async () => {
      const rootEventId = 'root-event-123';
      const description = 'Test workflow';

      const correlationId = await publisher.createCorrelation(rootEventId, description);

      expect(correlationId).toBeDefined();
      expect(typeof correlationId).toBe('string');
      expect(mockEventStore.updateCorrelation).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId,
          rootEventId,
          relatedEvents: [rootEventId]
        })
      );
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are working', async () => {
      // Mock successful EventBridge call
      const mockEventBridge = require('@aws-sdk/client-eventbridge').EventBridgeClient;
      mockEventBridge.prototype.send = jest.fn().mockResolvedValue({});

      // Mock successful event store call
      (mockEventStore as any).query = jest.fn().mockResolvedValue([]);

      const health = await publisher.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.eventBridge).toBe(true);
      expect(health.eventStore).toBe(true);
      expect(health.timestamp).toBeDefined();
    });

    it('should return unhealthy status when EventBridge fails', async () => {
      // Create a new publisher with a mocked EventBridge that throws an error
      const mockEventBridgeClient = {
        send: jest.fn().mockRejectedValue(new Error('EventBridge error'))
      };
      
      // Replace the EventBridge client in the publisher
      (publisher as any).eventBridge = mockEventBridgeClient;

      const health = await publisher.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.eventBridge).toBe(false);
    });
  });

  describe('getMetrics', () => {
    it('should return publisher metrics', async () => {
      const metrics = await publisher.getMetrics();

      expect(metrics).toEqual({
        eventsPublished: expect.any(Number),
        batchesPublished: expect.any(Number),
        correlationsActive: expect.any(Number),
        averagePublishTime: expect.any(Number),
        errorRate: expect.any(Number)
      });
    });
  });
});