import { EventEmitter } from 'events';
import { 
  CacheConfig, 
  CacheKey, 
  CachePriority, 
  PredictiveLoadingConfig, 
  ResourceAllocationConfig,
  CacheMetrics,
  BatchRequest,
  BatchResponse
} from '../types';
import { MultiTierCacheManager } from './MultiTierCacheManager';
import { PredictiveLoader } from './PredictiveLoader';
import { ResourceAllocator } from './ResourceAllocator';

export class IntelligentCacheStrategy extends EventEmitter {
  private cacheManager: MultiTierCacheManager;
  private predictiveLoader: PredictiveLoader;
  private resourceAllocator: ResourceAllocator;
  private config: CacheConfig;
  private isInitialized: boolean = false;

  constructor(
    cacheConfig: CacheConfig,
    predictiveConfig: PredictiveLoadingConfig,
    resourceConfig: ResourceAllocationConfig
  ) {
    super();
    this.config = cacheConfig;
    
    this.cacheManager = new MultiTierCacheManager(cacheConfig);
    this.predictiveLoader = new PredictiveLoader(predictiveConfig, this.cacheManager);
    this.resourceAllocator = new ResourceAllocator(resourceConfig);
    
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize cache manager
      await this.cacheManager.warmup([]);
      
      // Start predictive loading
      this.predictiveLoader.start();
      
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('initializationError', error);
      throw error;
    }
  }

  async get<T>(cacheKey: CacheKey, userId?: string): Promise<T | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check resource allocation
    if (this.resourceAllocator.shouldThrottleRequest()) {
      const delay = this.resourceAllocator.getThrottleDelay();
      await this.sleep(delay);
    }

    // Allocate resources
    const memoryAllocated = this.resourceAllocator.allocateResources('memory', 1024); // 1KB estimate
    if (!memoryAllocated) {
      throw new Error('Insufficient memory resources');
    }

    try {
      const result = await this.cacheManager.get<T>(cacheKey);
      
      // Record access for predictive loading
      if (userId) {
        this.predictiveLoader.recordAccess(userId, cacheKey);
      }
      
      return result;
    } finally {
      this.resourceAllocator.releaseResources('memory', 1024);
    }
  }

  async set<T>(
    cacheKey: CacheKey, 
    data: T, 
    priority: CachePriority = 'medium',
    userId?: string
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const dataSize = this.estimateDataSize(data);
    
    // Check resource allocation
    const memoryAllocated = this.resourceAllocator.allocateResources('memory', dataSize);
    if (!memoryAllocated) {
      // Try to free up memory by evicting low-priority items
      await this.evictLowPriorityItems(dataSize);
      
      // Try again
      const retryAllocated = this.resourceAllocator.allocateResources('memory', dataSize);
      if (!retryAllocated) {
        throw new Error('Insufficient memory resources after eviction');
      }
    }

    try {
      await this.cacheManager.set(cacheKey, data, priority);
      
      // Record access for predictive loading
      if (userId) {
        this.predictiveLoader.recordAccess(userId, cacheKey);
      }
    } finally {
      this.resourceAllocator.releaseResources('memory', dataSize);
    }
  }

  async batchGet<T>(request: BatchRequest, userId?: string): Promise<BatchResponse<T>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Optimize batch size based on current resource usage
    const optimalBatchSize = this.resourceAllocator.getOptimalBatchSize('batch_get');
    
    if (request.keys.length > optimalBatchSize) {
      // Split into smaller batches
      return await this.processBatchesSequentially<T>(request, optimalBatchSize, userId);
    }

    const estimatedMemory = request.keys.length * 1024; // 1KB per key estimate
    const memoryAllocated = this.resourceAllocator.allocateResources('memory', estimatedMemory);
    
    if (!memoryAllocated) {
      throw new Error('Insufficient memory resources for batch operation');
    }

    try {
      const result = await this.cacheManager.batchGet<T>(request);
      
      // Record accesses for predictive loading
      if (userId) {
        for (const key of request.keys) {
          this.predictiveLoader.recordAccess(userId, key);
        }
      }
      
      return result;
    } finally {
      this.resourceAllocator.releaseResources('memory', estimatedMemory);
    }
  }

  async batchSet<T>(
    entries: Map<CacheKey, T>, 
    priority: CachePriority = 'medium',
    userId?: string
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const totalSize = Array.from(entries.values())
      .reduce((sum, data) => sum + this.estimateDataSize(data), 0);
    
    const memoryAllocated = this.resourceAllocator.allocateResources('memory', totalSize);
    if (!memoryAllocated) {
      throw new Error('Insufficient memory resources for batch set operation');
    }

    try {
      await this.cacheManager.batchSet(entries, priority);
      
      // Record accesses for predictive loading
      if (userId) {
        for (const [key] of entries) {
          this.predictiveLoader.recordAccess(userId, key);
        }
      }
    } finally {
      this.resourceAllocator.releaseResources('memory', totalSize);
    }
  }

  async invalidate(cacheKey: CacheKey): Promise<void> {
    await this.cacheManager.invalidate(cacheKey);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    await this.cacheManager.invalidatePattern(pattern);
  }

  async invalidateUser(userId: string): Promise<void> {
    // Clear user data from predictive loader
    this.predictiveLoader.clearUserData(userId);
    
    // Invalidate user's cache entries
    await this.cacheManager.invalidatePattern(`*:u${this.hashUserId(userId)}:*`);
  }

  async warmup(keys: CacheKey[], userId?: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Optimize warmup batch size
    const optimalBatchSize = this.resourceAllocator.getOptimalBatchSize('warmup');
    
    for (let i = 0; i < keys.length; i += optimalBatchSize) {
      const batch = keys.slice(i, i + optimalBatchSize);
      await this.cacheManager.warmup(batch);
      
      // Record accesses for predictive loading
      if (userId) {
        for (const key of batch) {
          this.predictiveLoader.recordAccess(userId, key);
        }
      }
      
      // Small delay between batches to prevent overwhelming the system
      if (i + optimalBatchSize < keys.length) {
        await this.sleep(100);
      }
    }
  }

  getMetrics(): CacheMetrics {
    return this.cacheManager.getMetrics();
  }

  getResourceUsage() {
    return this.resourceAllocator.getResourceUsage();
  }

  getPredictiveStats(userId: string) {
    return {
      usagePattern: this.predictiveLoader.getUsagePattern(userId),
      predictionQueue: this.predictiveLoader.getPredictionQueue()
    };
  }

  async cleanup(): Promise<void> {
    await this.cacheManager.cleanup();
  }

  async shutdown(): Promise<void> {
    this.predictiveLoader.stop();
    this.resourceAllocator.stop();
    await this.cleanup();
    this.emit('shutdown');
  }

  private setupEventHandlers(): void {
    // Cache manager events
    this.cacheManager.on('hit', (data) => this.emit('cacheHit', data));
    this.cacheManager.on('miss', (data) => this.emit('cacheMiss', data));
    this.cacheManager.on('error', (data) => this.emit('cacheError', data));
    this.cacheManager.on('metricsUpdated', (metrics) => {
      this.resourceAllocator.updateMetrics(metrics);
      this.emit('metricsUpdated', metrics);
    });

    // Predictive loader events
    this.predictiveLoader.on('predictiveHit', (data) => this.emit('predictiveHit', data));
    this.predictiveLoader.on('predictiveLoad', (data) => this.emit('predictiveLoad', data));
    this.predictiveLoader.on('predictiveLoadError', (data) => this.emit('predictiveLoadError', data));

    // Resource allocator events
    this.resourceAllocator.on('scaledUp', (data) => this.emit('resourceScaledUp', data));
    this.resourceAllocator.on('scaledDown', (data) => this.emit('resourceScaledDown', data));
    this.resourceAllocator.on('memoryAllocationFailed', (data) => this.emit('memoryAllocationFailed', data));
  }

  private async processBatchesSequentially<T>(
    request: BatchRequest, 
    batchSize: number,
    userId?: string
  ): Promise<BatchResponse<T>> {
    const results = new Map<string, any>();
    const errors = new Map<string, Error>();
    const fromCache: string[] = [];
    const fromSource: string[] = [];

    for (let i = 0; i < request.keys.length; i += batchSize) {
      const batchKeys = request.keys.slice(i, i + batchSize);
      const batchRequest: BatchRequest = {
        keys: batchKeys,
        priority: request.priority,
        timeout: request.timeout
      };

      try {
        const batchResult = await this.cacheManager.batchGet<T>(batchRequest);
        
        // Merge results
        for (const [key, value] of batchResult.results) {
          results.set(key, value);
        }
        for (const [key, error] of batchResult.errors) {
          errors.set(key, error);
        }
        fromCache.push(...batchResult.fromCache);
        fromSource.push(...batchResult.fromSource);

        // Record accesses for predictive loading
        if (userId) {
          for (const key of batchKeys) {
            this.predictiveLoader.recordAccess(userId, key);
          }
        }

      } catch (error) {
        // Record error for all keys in this batch
        for (const key of batchKeys) {
          errors.set(this.generateKeyString(key), error as Error);
        }
      }

      // Small delay between batches
      if (i + batchSize < request.keys.length) {
        await this.sleep(50);
      }
    }

    return { results, errors, fromCache, fromSource };
  }

  private async evictLowPriorityItems(requiredSpace: number): Promise<void> {
    // This would implement intelligent eviction based on priority, access patterns, etc.
    // For now, we'll emit an event to let the cache manager handle it
    this.emit('evictionRequested', { requiredSpace });
  }

  private estimateDataSize(data: any): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  private generateKeyString(cacheKey: CacheKey): string {
    return `${cacheKey.type}:${cacheKey.id}`;
  }

  private hashUserId(userId: string): string {
    // Simple hash for user ID - in practice, use crypto.createHash
    return userId.split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0).toString(16).substring(0, 8);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}