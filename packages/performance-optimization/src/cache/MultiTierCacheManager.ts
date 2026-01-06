import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { S3 } from 'aws-sdk';
import { EventEmitter } from 'events';
import { 
  CacheConfig, 
  CacheKey, 
  CacheEntry, 
  CacheTier, 
  CachePriority, 
  CacheMetrics,
  BatchRequest,
  BatchResponse
} from '../types';
import { CompressionManager } from './CompressionManager';
import { CacheKeyGenerator } from './CacheKeyGenerator';

export class MultiTierCacheManager extends EventEmitter {
  private redis: Redis;
  private memoryCache: LRUCache<string, CacheEntry>;
  private s3: S3;
  private compressionManager: CompressionManager;
  private keyGenerator: CacheKeyGenerator;
  private metrics: CacheMetrics;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    super();
    this.config = config;
    this.initializeComponents();
    this.setupMetrics();
  }

  private initializeComponents(): void {
    // Initialize Redis
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db || 0,
      keyPrefix: this.config.redis.keyPrefix || 'storytailor:cache:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Initialize Memory Cache
    this.memoryCache = new LRUCache<string, CacheEntry>({
      max: 1000, // Max number of entries
      maxSize: this.config.memory.maxSize * 1024 * 1024, // Convert MB to bytes
      ttl: this.config.memory.ttl * 1000, // Convert seconds to milliseconds
      sizeCalculation: (entry) => entry.size,
      dispose: (entry, key) => {
        this.emit('evicted', { key, entry, tier: 'memory' });
      }
    });

    // Initialize S3
    this.s3 = new S3({
      region: this.config.s3.region
    });

    // Initialize utilities
    this.compressionManager = new CompressionManager();
    this.keyGenerator = new CacheKeyGenerator();
  }

  private setupMetrics(): void {
    this.metrics = {
      hitRate: 0,
      missRate: 0,
      evictionRate: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      redisConnections: 0,
      totalRequests: 0,
      errorRate: 0,
      predictiveHitRate: 0
    };

    // Update metrics every 30 seconds
    setInterval(() => this.updateMetrics(), 30000);
  }

  async get<T>(cacheKey: CacheKey): Promise<T | null> {
    const startTime = Date.now();
    const key = this.keyGenerator.generate(cacheKey);
    
    try {
      this.metrics.totalRequests++;

      // Try memory cache first
      const memoryResult = await this.getFromMemory<T>(key);
      if (memoryResult) {
        this.recordHit('memory', Date.now() - startTime);
        return memoryResult;
      }

      // Try Redis cache
      const redisResult = await this.getFromRedis<T>(key);
      if (redisResult) {
        // Promote to memory cache
        await this.setInMemory(key, redisResult);
        this.recordHit('redis', Date.now() - startTime);
        return redisResult.data;
      }

      // Try S3 cache for large assets
      if (this.shouldUseS3(cacheKey)) {
        const s3Result = await this.getFromS3<T>(key);
        if (s3Result) {
          // Promote to Redis
          await this.setInRedis(key, s3Result);
          this.recordHit('s3', Date.now() - startTime);
          return s3Result.data;
        }
      }

      this.recordMiss(Date.now() - startTime);
      return null;

    } catch (error) {
      this.recordError(error as Error);
      throw error;
    }
  }

  async set<T>(cacheKey: CacheKey, data: T, priority: CachePriority = 'medium'): Promise<void> {
    const key = this.keyGenerator.generate(cacheKey);
    const size = this.calculateSize(data);
    
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: this.getTTLForTier('memory'),
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
      tier: 'memory',
      priority
    };

    // Always set in memory for fastest access
    await this.setInMemory(key, entry);

    // Set in Redis for persistence
    await this.setInRedis(key, entry);

    // Set in S3 for large assets or high-priority items
    if (this.shouldUseS3(cacheKey) || priority === 'high') {
      await this.setInS3(key, entry);
    }

    this.emit('set', { key, entry });
  }

  async batchGet<T>(request: BatchRequest): Promise<BatchResponse<T>> {
    const results = new Map<string, CacheEntry<T>>();
    const errors = new Map<string, Error>();
    const fromCache: string[] = [];
    const fromSource: string[] = [];

    const promises = request.keys.map(async (cacheKey) => {
      const key = this.keyGenerator.generate(cacheKey);
      try {
        const result = await this.get<T>(cacheKey);
        if (result) {
          results.set(key, {
            key,
            data: result,
            timestamp: Date.now(),
            ttl: 0,
            accessCount: 0,
            lastAccessed: Date.now(),
            size: this.calculateSize(result),
            tier: 'memory',
            priority: request.priority
          });
          fromCache.push(key);
        } else {
          fromSource.push(key);
        }
      } catch (error) {
        errors.set(key, error as Error);
      }
    });

    await Promise.allSettled(promises);

    return { results, errors, fromCache, fromSource };
  }

  async batchSet<T>(entries: Map<CacheKey, T>, priority: CachePriority = 'medium'): Promise<void> {
    const promises = Array.from(entries.entries()).map(([cacheKey, data]) =>
      this.set(cacheKey, data, priority)
    );

    await Promise.allSettled(promises);
  }

  async invalidate(cacheKey: CacheKey): Promise<void> {
    const key = this.keyGenerator.generate(cacheKey);
    
    // Remove from all tiers
    await Promise.allSettled([
      this.removeFromMemory(key),
      this.removeFromRedis(key),
      this.removeFromS3(key)
    ]);

    this.emit('invalidated', { key });
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Invalidate from Redis using pattern
    const keys = await this.redis.keys(`${this.config.redis.keyPrefix}${pattern}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    // Invalidate from memory cache
    for (const [key] of this.memoryCache.entries()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    this.emit('patternInvalidated', { pattern, count: keys.length });
  }

  async warmup(keys: CacheKey[]): Promise<void> {
    const batchSize = 10;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await this.batchGet({ 
        keys: batch, 
        priority: 'high', 
        timeout: 5000 
      });
    }
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  async cleanup(): Promise<void> {
    // Clean up expired entries
    const now = Date.now();
    
    // Memory cache cleanup (handled by LRU automatically)
    
    // Redis cleanup
    const redisKeys = await this.redis.keys(`${this.config.redis.keyPrefix}*`);
    const expiredKeys = [];
    
    for (const key of redisKeys) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -1 || ttl === 0) {
        expiredKeys.push(key);
      }
    }
    
    if (expiredKeys.length > 0) {
      await this.redis.del(...expiredKeys);
    }

    this.emit('cleanup', { expiredKeys: expiredKeys.length });
  }

  private async getFromMemory<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      return entry.data as T;
    }
    return null;
  }

  private async getFromRedis<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const data = await this.redis.get(key);
      if (data) {
        const entry = JSON.parse(data) as CacheEntry<T>;
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        return entry;
      }
    } catch (error) {
      console.error('Redis get error:', error);
    }
    return null;
  }

  private async getFromS3<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const result = await this.s3.getObject({
        Bucket: this.config.s3.bucketName,
        Key: key
      }).promise();

      if (result.Body) {
        const compressed = result.Body as Buffer;
        const decompressed = await this.compressionManager.decompress(compressed);
        const entry = JSON.parse(decompressed.toString()) as CacheEntry<T>;
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        return entry;
      }
    } catch (error) {
      if ((error as any).code !== 'NoSuchKey') {
        console.error('S3 get error:', error);
      }
    }
    return null;
  }

  private async setInMemory<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    this.memoryCache.set(key, entry);
  }

  private async setInRedis<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const ttl = this.getTTLForTier('redis');
      await this.redis.setex(key, ttl, JSON.stringify(entry));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  private async setInS3<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const data = JSON.stringify(entry);
      const compressed = await this.compressionManager.compress(Buffer.from(data));
      
      await this.s3.putObject({
        Bucket: this.config.s3.bucketName,
        Key: key,
        Body: compressed,
        ContentType: 'application/json',
        ContentEncoding: 'gzip'
      }).promise();
    } catch (error) {
      console.error('S3 set error:', error);
    }
  }

  private async removeFromMemory(key: string): Promise<void> {
    this.memoryCache.delete(key);
  }

  private async removeFromRedis(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  private async removeFromS3(key: string): Promise<void> {
    try {
      await this.s3.deleteObject({
        Bucket: this.config.s3.bucketName,
        Key: key
      }).promise();
    } catch (error) {
      console.error('S3 delete error:', error);
    }
  }

  private shouldUseS3(cacheKey: CacheKey): boolean {
    return cacheKey.type === 'asset' || 
           (cacheKey.metadata && cacheKey.metadata.size > 1024 * 1024); // > 1MB
  }

  private getTTLForTier(tier: CacheTier): number {
    switch (tier) {
      case 'memory': return this.config.memory.ttl;
      case 'redis': return this.config.redis.ttl;
      case 's3': return this.config.s3.ttl;
      case 'cdn': return this.config.cdn.ttl;
      default: return 3600; // 1 hour default
    }
  }

  private calculateSize(data: any): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  private recordHit(tier: CacheTier, responseTime: number): void {
    this.metrics.hitRate = (this.metrics.hitRate * 0.9) + (1 * 0.1);
    this.updateResponseTime(responseTime);
    this.emit('hit', { tier, responseTime });
  }

  private recordMiss(responseTime: number): void {
    this.metrics.missRate = (this.metrics.missRate * 0.9) + (1 * 0.1);
    this.updateResponseTime(responseTime);
    this.emit('miss', { responseTime });
  }

  private recordError(error: Error): void {
    this.metrics.errorRate = (this.metrics.errorRate * 0.9) + (1 * 0.1);
    this.emit('error', { error });
  }

  private updateResponseTime(responseTime: number): void {
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * 0.9) + (responseTime * 0.1);
  }

  private updateMetrics(): void {
    this.metrics.memoryUsage = this.memoryCache.calculatedSize || 0;
    this.emit('metricsUpdated', this.metrics);
  }
}