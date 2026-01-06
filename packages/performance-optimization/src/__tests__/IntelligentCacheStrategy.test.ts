import { IntelligentCacheStrategy } from '../cache/IntelligentCacheStrategy';
import { 
  CacheConfig, 
  PredictiveLoadingConfig, 
  ResourceAllocationConfig,
  CacheKey 
} from '../types';

describe('IntelligentCacheStrategy', () => {
  let cacheStrategy: IntelligentCacheStrategy;
  let mockConfig: CacheConfig;
  let mockPredictiveConfig: PredictiveLoadingConfig;
  let mockResourceConfig: ResourceAllocationConfig;

  beforeEach(() => {
    mockConfig = {
      redis: {
        host: 'localhost',
        port: 6379,
        ttl: 3600
      },
      memory: {
        maxSize: 100,
        ttl: 1800
      },
      cdn: {
        endpoint: 'https://cdn.example.com',
        bucketName: 'test-bucket',
        ttl: 86400
      },
      s3: {
        bucketName: 'test-s3-bucket',
        region: 'us-east-1',
        ttl: 86400
      }
    };

    mockPredictiveConfig = {
      enabled: true,
      maxPredictions: 100,
      confidenceThreshold: 0.7,
      lookAheadTime: 5,
      patterns: {
        storyProgression: true,
        userBehavior: true,
        timeBasedAccess: true
      }
    };

    mockResourceConfig = {
      maxMemoryUsage: 512,
      maxRedisConnections: 10,
      maxConcurrentRequests: 100,
      adaptiveScaling: {
        enabled: true,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 300
      }
    };

    cacheStrategy = new IntelligentCacheStrategy(
      mockConfig,
      mockPredictiveConfig,
      mockResourceConfig
    );
  });

  afterEach(async () => {
    await cacheStrategy.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(cacheStrategy.initialize()).resolves.not.toThrow();
    });

    it('should emit initialized event', async () => {
      const initPromise = new Promise(resolve => {
        cacheStrategy.once('initialized', resolve);
      });

      await cacheStrategy.initialize();
      await expect(initPromise).resolves.toBeDefined();
    });
  });

  describe('cache operations', () => {
    beforeEach(async () => {
      await cacheStrategy.initialize();
    });

    it('should set and get cache entries', async () => {
      const cacheKey: CacheKey = {
        type: 'story',
        id: 'test-story-1',
        userId: 'user-123'
      };
      const testData = { title: 'Test Story', content: 'Once upon a time...' };

      await cacheStrategy.set(cacheKey, testData, 'high', 'user-123');
      const retrieved = await cacheStrategy.get<typeof testData>(cacheKey, 'user-123');

      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const cacheKey: CacheKey = {
        type: 'story',
        id: 'non-existent',
        userId: 'user-123'
      };

      const result = await cacheStrategy.get(cacheKey, 'user-123');
      expect(result).toBeNull();
    });

    it('should handle batch operations', async () => {
      const entries = new Map<CacheKey, any>();
      entries.set(
        { type: 'story', id: 'story-1', userId: 'user-123' },
        { title: 'Story 1' }
      );
      entries.set(
        { type: 'story', id: 'story-2', userId: 'user-123' },
        { title: 'Story 2' }
      );

      await cacheStrategy.batchSet(entries, 'medium', 'user-123');

      const batchRequest = {
        keys: Array.from(entries.keys()),
        priority: 'medium' as const,
        timeout: 5000
      };

      const results = await cacheStrategy.batchGet(batchRequest, 'user-123');
      expect(results.results.size).toBe(2);
      expect(results.fromCache.length).toBe(2);
    });
  });

  describe('invalidation', () => {
    beforeEach(async () => {
      await cacheStrategy.initialize();
    });

    it('should invalidate specific cache entries', async () => {
      const cacheKey: CacheKey = {
        type: 'story',
        id: 'test-story',
        userId: 'user-123'
      };
      const testData = { title: 'Test Story' };

      await cacheStrategy.set(cacheKey, testData);
      await cacheStrategy.invalidate(cacheKey);

      const result = await cacheStrategy.get(cacheKey);
      expect(result).toBeNull();
    });

    it('should invalidate user data', async () => {
      const userId = 'user-123';
      const cacheKey: CacheKey = {
        type: 'story',
        id: 'user-story',
        userId
      };

      await cacheStrategy.set(cacheKey, { title: 'User Story' }, 'medium', userId);
      await cacheStrategy.invalidateUser(userId);

      const result = await cacheStrategy.get(cacheKey, userId);
      expect(result).toBeNull();
    });
  });

  describe('metrics and monitoring', () => {
    beforeEach(async () => {
      await cacheStrategy.initialize();
    });

    it('should provide cache metrics', () => {
      const metrics = cacheStrategy.getMetrics();
      
      expect(metrics).toHaveProperty('hitRate');
      expect(metrics).toHaveProperty('missRate');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('memoryUsage');
    });

    it('should provide resource usage stats', () => {
      const usage = cacheStrategy.getResourceUsage();
      
      expect(usage).toHaveProperty('memoryUsage');
      expect(usage).toHaveProperty('redisConnections');
      expect(usage).toHaveProperty('concurrentRequests');
    });

    it('should emit cache events', async () => {
      const hitPromise = new Promise(resolve => {
        cacheStrategy.once('cacheHit', resolve);
      });

      const cacheKey: CacheKey = {
        type: 'story',
        id: 'event-test',
        userId: 'user-123'
      };

      await cacheStrategy.set(cacheKey, { title: 'Event Test' });
      await cacheStrategy.get(cacheKey);

      await expect(hitPromise).resolves.toBeDefined();
    });
  });

  describe('warmup', () => {
    beforeEach(async () => {
      await cacheStrategy.initialize();
    });

    it('should warmup cache with provided keys', async () => {
      const keys: CacheKey[] = [
        { type: 'story', id: 'warmup-1', userId: 'user-123' },
        { type: 'story', id: 'warmup-2', userId: 'user-123' },
        { type: 'character', id: 'char-1', userId: 'user-123' }
      ];

      // This should not throw even if keys don't exist
      await expect(cacheStrategy.warmup(keys, 'user-123')).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const badConfig = {
        ...mockConfig,
        redis: {
          ...mockConfig.redis,
          host: 'invalid-host'
        }
      };

      const badStrategy = new IntelligentCacheStrategy(
        badConfig,
        mockPredictiveConfig,
        mockResourceConfig
      );

      // Should handle connection errors gracefully
      await expect(badStrategy.initialize()).rejects.toThrow();
      await badStrategy.shutdown();
    });
  });
});