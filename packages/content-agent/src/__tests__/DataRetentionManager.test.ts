import { DataRetentionManager } from '../services/DataRetentionManager';
import { createLogger } from 'winston';
import { createClient } from 'redis';

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    connect: jest.fn(),
    quit: jest.fn()
  }))
}));

describe('DataRetentionManager', () => {
  let manager: DataRetentionManager;
  let mockRedis: any;
  let logger: any;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    mockRedis = {
      setEx: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      connect: jest.fn(),
      quit: jest.fn()
    };
    manager = new DataRetentionManager(mockRedis, logger);
  });

  describe('storeEphemeralData', () => {
    it('should store emotional response data with 24h expiration', async () => {
      const data = {
        sessionId: 'session123',
        userId: 'user123',
        dataType: 'emotional_response' as const,
        data: { intensity: 7, emotions: ['sadness', 'processing'] }
      };

      await manager.storeEphemeralData(data);

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'therapeutic:emotional_response:session123:user123',
        24 * 3600, // 24 hours in seconds
        expect.stringContaining('"sessionId":"session123"')
      );
    });

    it('should store support session data with 12h expiration', async () => {
      const data = {
        sessionId: 'session123',
        userId: 'user123',
        dataType: 'support_session' as const,
        data: { sessionPlan: 'breathing exercises' }
      };

      await manager.storeEphemeralData(data);

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'therapeutic:support_session:session123:user123',
        12 * 3600, // 12 hours in seconds
        expect.stringContaining('"sessionId":"session123"')
      );
    });

    it('should store crisis data with 72h expiration', async () => {
      const data = {
        sessionId: 'session123',
        userId: 'user123',
        dataType: 'crisis_data' as const,
        data: { indicators: ['high_intensity', 'overwhelmed'] }
      };

      await manager.storeEphemeralData(data);

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'therapeutic:crisis_data:session123:user123',
        72 * 3600, // 72 hours in seconds
        expect.stringContaining('"sessionId":"session123"')
      );
    });
  });

  describe('getEphemeralData', () => {
    it('should retrieve non-expired data', async () => {
      const futureDate = new Date(Date.now() + 60000).toISOString(); // 1 minute in future
      const storedData = {
        sessionId: 'session123',
        userId: 'user123',
        dataType: 'emotional_response',
        data: { test: 'data' },
        createdAt: new Date().toISOString(),
        expiresAt: futureDate
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(storedData));

      const result = await manager.getEphemeralData('emotional_response', 'session123', 'user123');

      expect(result).toEqual(storedData);
      expect(mockRedis.get).toHaveBeenCalledWith('therapeutic:emotional_response:session123:user123');
    });

    it('should return null for expired data and delete it', async () => {
      const pastDate = new Date(Date.now() - 60000).toISOString(); // 1 minute in past
      const expiredData = {
        sessionId: 'session123',
        userId: 'user123',
        dataType: 'emotional_response',
        data: { test: 'data' },
        createdAt: new Date().toISOString(),
        expiresAt: pastDate
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(expiredData));

      const result = await manager.getEphemeralData('emotional_response', 'session123', 'user123');

      expect(result).toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith('therapeutic:emotional_response:session123:user123');
    });

    it('should return null for non-existent data', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await manager.getEphemeralData('emotional_response', 'session123', 'user123');

      expect(result).toBeNull();
    });
  });

  describe('purgeSessionData', () => {
    it('should delete all data types for a session', async () => {
      await manager.purgeSessionData('session123', 'user123');

      expect(mockRedis.del).toHaveBeenCalledTimes(4); // 4 data types
      expect(mockRedis.del).toHaveBeenCalledWith('therapeutic:emotional_response:session123:user123');
      expect(mockRedis.del).toHaveBeenCalledWith('therapeutic:support_session:session123:user123');
      expect(mockRedis.del).toHaveBeenCalledWith('therapeutic:crisis_data:session123:user123');
      expect(mockRedis.del).toHaveBeenCalledWith('therapeutic:therapeutic_context:session123:user123');
    });
  });

  describe('purgeUserTherapeuticData', () => {
    it('should delete all therapeutic data for a user', async () => {
      const mockKeys = [
        'therapeutic:emotional_response:session1:user123',
        'therapeutic:support_session:session2:user123',
        'therapeutic:crisis_data:session3:user123'
      ];

      mockRedis.keys.mockResolvedValue(mockKeys);

      await manager.purgeUserTherapeuticData('user123');

      expect(mockRedis.keys).toHaveBeenCalledWith('therapeutic:*:user123');
      expect(mockRedis.del).toHaveBeenCalledWith(mockKeys);
    });
  });

  describe('sanitizeStoryForStorage', () => {
    it('should remove PII from story content', () => {
      const storyContent = 'My email is john@example.com and my phone is 555-123-4567. My child who died was named Sarah.';
      
      const result = manager.sanitizeStoryForStorage(storyContent, 'Child Loss');

      expect(result.sanitizedContent).toContain('[EMAIL]');
      expect(result.sanitizedContent).toContain('[PHONE]');
      expect(result.sanitizedContent).toContain('[THERAPEUTIC_CONTEXT]');
      expect(result.sanitizedContent).not.toContain('john@example.com');
      expect(result.sanitizedContent).not.toContain('555-123-4567');
      expect(result.sanitizedContent).not.toContain('my child who died');
    });

    it('should identify therapeutic story types', () => {
      const result = manager.sanitizeStoryForStorage('A story about healing', 'Inner Child');

      expect(result.metadata.containsTherapeuticElements).toBe(true);
      expect(result.metadata.storyType).toBe('Inner Child');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should not flag non-therapeutic stories', () => {
      const result = manager.sanitizeStoryForStorage('A fun adventure story', 'Adventure');

      expect(result.metadata.containsTherapeuticElements).toBe(false);
      expect(result.metadata.storyType).toBe('Adventure');
    });
  });

  describe('runScheduledCleanup', () => {
    it('should clean up expired records', async () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();
      const futureDate = new Date(Date.now() + 60000).toISOString();
      
      const expiredData = {
        sessionId: 'session1',
        userId: 'user1',
        dataType: 'emotional_response',
        data: {},
        createdAt: new Date().toISOString(),
        expiresAt: pastDate
      };

      const validData = {
        sessionId: 'session2',
        userId: 'user2',
        dataType: 'emotional_response',
        data: {},
        createdAt: new Date().toISOString(),
        expiresAt: futureDate
      };

      mockRedis.keys.mockResolvedValue(['key1', 'key2']);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(expiredData))
        .mockResolvedValueOnce(JSON.stringify(validData));

      const result = await manager.runScheduledCleanup();

      expect(result.cleaned).toBe(1);
      expect(result.errors).toBe(0);
      expect(mockRedis.del).toHaveBeenCalledWith('key1');
    });
  });

  describe('emergencyPurgeAllTherapeuticData', () => {
    it('should delete all therapeutic data', async () => {
      const allKeys = [
        'therapeutic:emotional_response:session1:user1',
        'therapeutic:support_session:session2:user2',
        'therapeutic:crisis_data:session3:user3'
      ];

      mockRedis.keys.mockResolvedValue(allKeys);

      const result = await manager.emergencyPurgeAllTherapeuticData();

      expect(result.purged).toBe(3);
      expect(result.errors).toHaveLength(0);
      expect(mockRedis.keys).toHaveBeenCalledWith('therapeutic:*');
      expect(mockRedis.del).toHaveBeenCalledWith(allKeys);
    });
  });
});