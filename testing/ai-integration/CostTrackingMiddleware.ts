import { CostOptimizationSystem, CostMetrics } from './CostOptimizationSystem';

export interface AIServiceRequest {
  service: string;
  operation: string;
  model?: string;
  tokens?: number;
  requestId?: string;
  timestamp: Date;
}

export interface AIServiceResponse {
  success: boolean;
  cost: number;
  duration: number;
  tokens?: number;
  cached?: boolean;
  cacheKey?: string;
  error?: string;
}

export interface CostTrackingConfig {
  enableCaching: boolean;
  cacheThreshold: number; // Minimum cost to cache
  defaultCacheTTL: number; // Default cache TTL in seconds
  costCalculators: Map<string, (request: AIServiceRequest, response: any) => number>;
}

export class CostTrackingMiddleware {
  private costOptimizer: CostOptimizationSystem;
  private config: CostTrackingConfig;
  private responseCache: Map<string, { data: any; timestamp: Date; ttl: number; cost: number }> = new Map();
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  constructor(costOptimizer: CostOptimizationSystem, config?: Partial<CostTrackingConfig>) {
    this.costOptimizer = costOptimizer;
    this.config = {
      enableCaching: true,
      cacheThreshold: 0.01, // Cache responses that cost more than $0.01
      defaultCacheTTL: 3600, // 1 hour
      costCalculators: new Map(),
      ...config
    };

    this.initializeCostCalculators();
    this.startCacheCleanup();
  }

  /**
   * Clean up resources and stop timers
   */
  destroy(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
  }

  /**
   * Wrap AI service calls with cost tracking and caching
   */
  async wrapServiceCall<T>(
    request: AIServiceRequest,
    serviceCall: () => Promise<T>,
    options?: {
      cacheable?: boolean;
      cacheTTL?: number;
      cacheKey?: string;
    }
  ): Promise<{ data: T; metrics: CostMetrics }> {
    const startTime = Date.now();
    const cacheKey = options?.cacheKey || this.generateCacheKey(request);
    
    // Check cache first
    if (this.config.enableCaching && options?.cacheable !== false) {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        this.costOptimizer.recordCacheEvent(cacheKey, true);
        
        const metrics: CostMetrics = {
          service: request.service,
          operation: request.operation,
          cost: 0, // Cached responses have no cost
          timestamp: new Date(),
          requestId: request.requestId || this.generateRequestId(),
          duration: Date.now() - startTime,
          tokens: request.tokens,
          model: request.model
        };

        return { data: cached.data, metrics };
      } else {
        this.costOptimizer.recordCacheEvent(cacheKey, false);
      }
    }

    try {
      // Execute the service call
      const data = await serviceCall();
      const duration = Date.now() - startTime;
      
      // Calculate cost
      const cost = this.calculateCost(request, data);
      
      // Cache the response if it meets criteria
      if (this.shouldCache(cost, options)) {
        this.cacheResponse(cacheKey, data, options?.cacheTTL || this.config.defaultCacheTTL, cost);
      }

      // Track the cost
      this.costOptimizer.trackUsageCosts(
        request.service,
        request.operation,
        cost,
        {
          tokens: request.tokens,
          model: request.model,
          duration,
          requestId: request.requestId
        }
      );

      const metrics: CostMetrics = {
        service: request.service,
        operation: request.operation,
        cost,
        timestamp: new Date(),
        requestId: request.requestId || this.generateRequestId(),
        duration,
        tokens: request.tokens,
        model: request.model
      };

      return { data, metrics };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Track failed request (no cost but still track for analytics)
      const metrics: CostMetrics = {
        service: request.service,
        operation: request.operation,
        cost: 0,
        timestamp: new Date(),
        requestId: request.requestId || this.generateRequestId(),
        duration,
        tokens: request.tokens,
        model: request.model
      };

      throw error;
    }
  }

  /**
   * Get optimal model for a request based on cost/quality requirements
   */
  getOptimalModel(
    service: string,
    qualityRequirement: number,
    maxCost?: number
  ): string | null {
    const profile = this.costOptimizer.optimizeModelSelection(
      service,
      qualityRequirement,
      maxCost
    );
    
    return profile?.model || null;
  }

  /**
   * Batch multiple requests for cost optimization
   */
  async batchRequests<T>(
    requests: AIServiceRequest[],
    batchServiceCall: (requests: AIServiceRequest[]) => Promise<T[]>,
    options?: {
      maxBatchSize?: number;
      batchDelay?: number;
    }
  ): Promise<Array<{ data: T; metrics: CostMetrics }>> {
    const maxBatchSize = options?.maxBatchSize || 10;
    const batchDelay = options?.batchDelay || 100;
    
    const results: Array<{ data: T; metrics: CostMetrics }> = [];
    
    // Split requests into batches
    for (let i = 0; i < requests.length; i += maxBatchSize) {
      const batch = requests.slice(i, i + maxBatchSize);
      
      if (i > 0 && batchDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
      
      const startTime = Date.now();
      
      try {
        const batchResults = await batchServiceCall(batch);
        const duration = Date.now() - startTime;
        
        // Process each result in the batch
        for (let j = 0; j < batch.length; j++) {
          const request = batch[j];
          const data = batchResults[j];
          const cost = this.calculateCost(request, data) / batch.length; // Distribute batch cost
          
          this.costOptimizer.trackUsageCosts(
            request.service,
            request.operation,
            cost,
            {
              tokens: request.tokens,
              model: request.model,
              duration: duration / batch.length,
              requestId: request.requestId
            }
          );

          const metrics: CostMetrics = {
            service: request.service,
            operation: request.operation,
            cost,
            timestamp: new Date(),
            requestId: request.requestId || this.generateRequestId(),
            duration: duration / batch.length,
            tokens: request.tokens,
            model: request.model
          };

          results.push({ data, metrics });
        }
        
      } catch (error) {
        // Handle batch failure
        for (const request of batch) {
          const metrics: CostMetrics = {
            service: request.service,
            operation: request.operation,
            cost: 0,
            timestamp: new Date(),
            requestId: request.requestId || this.generateRequestId(),
            duration: 0,
            tokens: request.tokens,
            model: request.model
          };
          
          results.push({ data: null as any, metrics });
        }
        
        throw error;
      }
    }
    
    return results;
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    costSaved: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    let totalSize = 0;
    let costSaved = 0;
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;

    for (const [key, entry] of this.responseCache.entries()) {
      totalSize += JSON.stringify(entry.data).length;
      costSaved += entry.cost;
      
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    // Calculate hit rate from cost optimizer
    let totalHits = 0;
    let totalMisses = 0;
    
    // This would need to be implemented in the cost optimizer
    // For now, return basic stats
    
    return {
      totalEntries: this.responseCache.size,
      totalSize,
      hitRate: totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0,
      costSaved,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Clear cache entries
   */
  clearCache(pattern?: string): number {
    let cleared = 0;
    
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.responseCache.entries()) {
        if (regex.test(key)) {
          this.responseCache.delete(key);
          cleared++;
        }
      }
    } else {
      cleared = this.responseCache.size;
      this.responseCache.clear();
    }
    
    return cleared;
  }

  private initializeCostCalculators(): void {
    // OpenAI cost calculator
    this.config.costCalculators.set('openai', (request, response) => {
      if (request.tokens && request.model) {
        const costPerToken = this.getTokenCost(request.model);
        return request.tokens * costPerToken;
      }
      
      // Fallback cost estimation
      return this.getDefaultCost(request.service, request.operation);
    });

    // ElevenLabs cost calculator
    this.config.costCalculators.set('elevenlabs', (request, response) => {
      if (response && response.duration) {
        // Cost based on audio duration (approximate)
        return response.duration * 0.0001; // $0.0001 per second
      }
      
      return this.getDefaultCost(request.service, request.operation);
    });
  }

  private calculateCost(request: AIServiceRequest, response: any): number {
    const calculator = this.config.costCalculators.get(request.service);
    
    if (calculator) {
      return calculator(request, response);
    }
    
    return this.getDefaultCost(request.service, request.operation);
  }

  private getTokenCost(model: string): number {
    const costs: Record<string, number> = {
      'gpt-4': 0.00003,
      'gpt-3.5-turbo': 0.000002,
      'text-davinci-003': 0.00002,
      'text-curie-001': 0.000002
    };
    
    return costs[model] || 0.00001; // Default cost
  }

  private getDefaultCost(service: string, operation: string): number {
    const defaultCosts: Record<string, Record<string, number>> = {
      openai: {
        'story-generation': 0.01,
        'text-completion': 0.005,
        'chat-completion': 0.008
      },
      elevenlabs: {
        'voice-synthesis': 0.05,
        'voice-cloning': 0.1
      }
    };
    
    return defaultCosts[service]?.[operation] || 0.001;
  }

  private generateCacheKey(request: AIServiceRequest): string {
    const keyData = {
      service: request.service,
      operation: request.operation,
      model: request.model,
      // Add other relevant request parameters for cache key
    };
    
    return `cache_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  private getCachedResponse(cacheKey: string): any | null {
    const cached = this.responseCache.get(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache entry has expired
    const now = new Date();
    const expiryTime = new Date(cached.timestamp.getTime() + cached.ttl * 1000);
    
    if (now > expiryTime) {
      this.responseCache.delete(cacheKey);
      return null;
    }
    
    return cached;
  }

  private cacheResponse(cacheKey: string, data: any, ttl: number, cost: number): void {
    this.responseCache.set(cacheKey, {
      data,
      timestamp: new Date(),
      ttl,
      cost
    });
    
    // Implement cache strategy
    this.costOptimizer.implementCaching(cacheKey, ttl, cost);
  }

  private shouldCache(cost: number, options?: { cacheable?: boolean }): boolean {
    if (options?.cacheable === false) {
      return false;
    }
    
    return this.config.enableCaching && cost >= this.config.cacheThreshold;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCacheCleanup(): void {
    // Clean up expired cache entries every 5 minutes
    this.cacheCleanupInterval = setInterval(() => {
      const now = new Date();
      
      for (const [key, entry] of this.responseCache.entries()) {
        const expiryTime = new Date(entry.timestamp.getTime() + entry.ttl * 1000);
        
        if (now > expiryTime) {
          this.responseCache.delete(key);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
}