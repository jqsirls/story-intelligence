import { EventEmitter } from 'events';
import { PredictiveResponseGenerator } from './PredictiveResponseGenerator';
import { ConnectionPoolManager } from './ConnectionPoolManager';
import { RequestPrioritizer } from './RequestPrioritizer';
import { AdaptiveTimeoutManager } from './AdaptiveTimeoutManager';

export interface LatencyConfig {
  predictiveGeneration: {
    enabled: boolean;
    maxPredictions: number;
    confidenceThreshold: number;
  };
  connectionPooling: {
    maxConnections: number;
    keepAliveTimeout: number;
    idleTimeout: number;
  };
  requestPrioritization: {
    enabled: boolean;
    maxConcurrentRequests: number;
    priorityLevels: number;
  };
  adaptiveTimeouts: {
    enabled: boolean;
    baseTimeout: number;
    maxTimeout: number;
    adjustmentFactor: number;
  };
  performanceTargets: {
    p50Latency: number; // ms
    p95Latency: number; // ms
    p99Latency: number; // ms
  };
}

export interface LatencyMetrics {
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  requestsPerSecond: number;
  errorRate: number;
  timeoutRate: number;
  connectionPoolUtilization: number;
  predictiveHitRate: number;
}

export interface OptimizationRequest {
  id: string;
  type: 'story_generation' | 'character_creation' | 'asset_generation' | 'conversation';
  priority: 'high' | 'medium' | 'low';
  userId: string;
  context: any;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffTime: number;
}

export class LatencyOptimizer extends EventEmitter {
  private config: LatencyConfig;
  private predictiveGenerator: PredictiveResponseGenerator;
  private connectionPool: ConnectionPoolManager;
  private requestPrioritizer: RequestPrioritizer;
  private timeoutManager: AdaptiveTimeoutManager;
  private metrics: LatencyMetrics;
  private latencyHistory: number[] = [];
  private requestTimes: Map<string, number> = new Map();

  constructor(config: LatencyConfig) {
    super();
    this.config = config;
    this.initializeComponents();
    this.setupMetrics();
  }

  private initializeComponents(): void {
    this.predictiveGenerator = new PredictiveResponseGenerator(
      this.config.predictiveGeneration
    );
    
    this.connectionPool = new ConnectionPoolManager(
      this.config.connectionPooling
    );
    
    this.requestPrioritizer = new RequestPrioritizer(
      this.config.requestPrioritization
    );
    
    this.timeoutManager = new AdaptiveTimeoutManager(
      this.config.adaptiveTimeouts
    );

    this.setupEventHandlers();
  }

  private setupMetrics(): void {
    this.metrics = {
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      timeoutRate: 0,
      connectionPoolUtilization: 0,
      predictiveHitRate: 0
    };

    // Update metrics every 10 seconds
    setInterval(() => this.updateMetrics(), 10000);
  }

  async optimizeRequest<T>(
    request: OptimizationRequest,
    handler: (request: OptimizationRequest) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    this.requestTimes.set(request.id, startTime);

    try {
      // Check for predictive response first
      if (this.config.predictiveGeneration.enabled) {
        const predictiveResponse = await this.predictiveGenerator.getPredictiveResponse<T>(
          request.type,
          request.context
        );
        
        if (predictiveResponse) {
          this.recordLatency(request.id, Date.now() - startTime);
          this.emit('predictiveHit', { requestId: request.id, type: request.type });
          return predictiveResponse;
        }
      }

      // Prioritize request
      if (this.config.requestPrioritization.enabled) {
        await this.requestPrioritizer.enqueue(request);
      }

      // Get optimized connection
      const connection = await this.connectionPool.getConnection(request.type);
      
      try {
        // Set adaptive timeout
        const timeout = this.timeoutManager.getTimeout(request.type, request.context);
        const timeoutPromise = this.createTimeoutPromise<T>(timeout);
        
        // Execute request with timeout
        const result = await Promise.race([
          handler(request),
          timeoutPromise
        ]);

        // Record successful request
        this.recordLatency(request.id, Date.now() - startTime);
        this.timeoutManager.recordSuccess(request.type, Date.now() - startTime);
        
        // Store for predictive generation
        if (this.config.predictiveGeneration.enabled) {
          await this.predictiveGenerator.storeResponse(
            request.type,
            request.context,
            result
          );
        }

        return result;

      } finally {
        this.connectionPool.releaseConnection(connection);
        
        if (this.config.requestPrioritization.enabled) {
          this.requestPrioritizer.complete(request.id);
        }
      }

    } catch (error) {
      this.recordError(request.id, error as Error);
      
      // Update timeout manager with failure
      this.timeoutManager.recordFailure(request.type);
      
      // Retry if policy allows
      if (request.retryPolicy && this.shouldRetry(error as Error, request)) {
        return this.retryRequest(request, handler);
      }
      
      throw error;
    }
  }

  async batchOptimize<T>(
    requests: OptimizationRequest[],
    handler: (request: OptimizationRequest) => Promise<T>
  ): Promise<Map<string, T | Error>> {
    const results = new Map<string, T | Error>();
    
    // Group requests by priority
    const priorityGroups = this.groupByPriority(requests);
    
    // Process high priority first, then medium, then low
    for (const priority of ['high', 'medium', 'low'] as const) {
      const group = priorityGroups.get(priority);
      if (!group || group.length === 0) continue;

      // Process in parallel within priority group
      const promises = group.map(async (request) => {
        try {
          const result = await this.optimizeRequest(request, handler);
          results.set(request.id, result);
        } catch (error) {
          results.set(request.id, error as Error);
        }
      });

      await Promise.allSettled(promises);
    }

    return results;
  }

  preloadPredictiveResponses(
    type: string,
    contexts: any[],
    priority: 'high' | 'medium' | 'low' = 'low'
  ): void {
    if (!this.config.predictiveGeneration.enabled) return;

    this.predictiveGenerator.preloadResponses(type, contexts, priority);
  }

  getMetrics(): LatencyMetrics {
    return { ...this.metrics };
  }

  getPerformanceReport(): PerformanceReport {
    const now = Date.now();
    const recentLatencies = this.latencyHistory.filter(
      time => now - time < 300000 // Last 5 minutes
    );

    return {
      currentMetrics: this.getMetrics(),
      performanceTargets: this.config.performanceTargets,
      targetsMet: {
        p50: this.metrics.p50Latency <= this.config.performanceTargets.p50Latency,
        p95: this.metrics.p95Latency <= this.config.performanceTargets.p95Latency,
        p99: this.metrics.p99Latency <= this.config.performanceTargets.p99Latency
      },
      recommendations: this.generateRecommendations(),
      recentTrends: {
        latencyTrend: this.calculateTrend(recentLatencies),
        requestVolumeTrend: this.calculateRequestVolumeTrend()
      }
    };
  }

  adjustConfiguration(updates: Partial<LatencyConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Update components with new config
    if (updates.predictiveGeneration) {
      this.predictiveGenerator.updateConfig(updates.predictiveGeneration);
    }
    
    if (updates.connectionPooling) {
      this.connectionPool.updateConfig(updates.connectionPooling);
    }
    
    if (updates.requestPrioritization) {
      this.requestPrioritizer.updateConfig(updates.requestPrioritization);
    }
    
    if (updates.adaptiveTimeouts) {
      this.timeoutManager.updateConfig(updates.adaptiveTimeouts);
    }

    this.emit('configurationUpdated', this.config);
  }

  private async retryRequest<T>(
    request: OptimizationRequest,
    handler: (request: OptimizationRequest) => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    if (!request.retryPolicy || attempt > request.retryPolicy.maxRetries) {
      throw new Error(`Max retries exceeded for request ${request.id}`);
    }

    const backoffTime = Math.min(
      request.retryPolicy.backoffMultiplier * Math.pow(2, attempt - 1) * 1000,
      request.retryPolicy.maxBackoffTime
    );

    await this.sleep(backoffTime);

    try {
      return await this.optimizeRequest(request, handler);
    } catch (error) {
      return this.retryRequest(request, handler, attempt + 1);
    }
  }

  private shouldRetry(error: Error, request: OptimizationRequest): boolean {
    // Don't retry client errors (4xx) or certain server errors
    if (error.message.includes('400') || 
        error.message.includes('401') || 
        error.message.includes('403') || 
        error.message.includes('404')) {
      return false;
    }

    // Retry on timeout, 5xx errors, network errors
    return error.message.includes('timeout') ||
           error.message.includes('500') ||
           error.message.includes('502') ||
           error.message.includes('503') ||
           error.message.includes('ECONNRESET') ||
           error.message.includes('ETIMEDOUT');
  }

  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  private groupByPriority(
    requests: OptimizationRequest[]
  ): Map<string, OptimizationRequest[]> {
    const groups = new Map<string, OptimizationRequest[]>();
    
    for (const request of requests) {
      const group = groups.get(request.priority) || [];
      group.push(request);
      groups.set(request.priority, group);
    }
    
    return groups;
  }

  private recordLatency(requestId: string, latency: number): void {
    this.latencyHistory.push(latency);
    
    // Keep only last 1000 entries
    if (this.latencyHistory.length > 1000) {
      this.latencyHistory = this.latencyHistory.slice(-1000);
    }
    
    this.requestTimes.delete(requestId);
    this.emit('latencyRecorded', { requestId, latency });
  }

  private recordError(requestId: string, error: Error): void {
    const startTime = this.requestTimes.get(requestId);
    if (startTime) {
      const latency = Date.now() - startTime;
      this.recordLatency(requestId, latency);
    }
    
    this.emit('requestError', { requestId, error });
  }

  private updateMetrics(): void {
    if (this.latencyHistory.length === 0) return;

    const sorted = [...this.latencyHistory].sort((a, b) => a - b);
    
    this.metrics.averageLatency = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;
    this.metrics.p50Latency = sorted[Math.floor(sorted.length * 0.5)];
    this.metrics.p95Latency = sorted[Math.floor(sorted.length * 0.95)];
    this.metrics.p99Latency = sorted[Math.floor(sorted.length * 0.99)];
    
    // Update other metrics from components
    this.metrics.connectionPoolUtilization = this.connectionPool.getUtilization();
    this.metrics.predictiveHitRate = this.predictiveGenerator.getHitRate();
    
    this.emit('metricsUpdated', this.metrics);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.p95Latency > this.config.performanceTargets.p95Latency) {
      recommendations.push('Consider increasing connection pool size');
      recommendations.push('Enable predictive response generation');
    }
    
    if (this.metrics.connectionPoolUtilization > 0.8) {
      recommendations.push('Increase maximum connections in pool');
    }
    
    if (this.metrics.predictiveHitRate < 0.3 && this.config.predictiveGeneration.enabled) {
      recommendations.push('Tune predictive generation parameters');
    }
    
    if (this.metrics.timeoutRate > 0.05) {
      recommendations.push('Adjust adaptive timeout settings');
    }
    
    return recommendations;
  }

  private calculateTrend(values: number[]): 'improving' | 'stable' | 'degrading' {
    if (values.length < 10) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change < -0.1) return 'improving';
    if (change > 0.1) return 'degrading';
    return 'stable';
  }

  private calculateRequestVolumeTrend(): 'increasing' | 'stable' | 'decreasing' {
    // Simplified implementation - would track request volume over time
    return 'stable';
  }

  private setupEventHandlers(): void {
    this.predictiveGenerator.on('hit', () => {
      this.emit('predictiveHit');
    });
    
    this.connectionPool.on('connectionCreated', (data) => {
      this.emit('connectionCreated', data);
    });
    
    this.requestPrioritizer.on('queueFull', (data) => {
      this.emit('queueFull', data);
    });
    
    this.timeoutManager.on('timeoutAdjusted', (data) => {
      this.emit('timeoutAdjusted', data);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface PerformanceReport {
  currentMetrics: LatencyMetrics;
  performanceTargets: {
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
  };
  targetsMet: {
    p50: boolean;
    p95: boolean;
    p99: boolean;
  };
  recommendations: string[];
  recentTrends: {
    latencyTrend: 'improving' | 'stable' | 'degrading';
    requestVolumeTrend: 'increasing' | 'stable' | 'decreasing';
  };
}