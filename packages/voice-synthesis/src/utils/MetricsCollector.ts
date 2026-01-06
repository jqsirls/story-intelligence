import { Logger } from 'winston';
import { createClient, RedisClientType } from 'redis';
import { VoiceMetrics } from '../types';

interface RedisConfig {
  url: string;
  keyPrefix: string;
  metricsRetentionMs: number;
}

/**
 * Metrics collector for voice synthesis performance tracking
 * Uses Redis for fast time-series data storage
 */
export class MetricsCollector {
  private redis: RedisClientType;
  private isInitialized = false;

  constructor(
    private config: RedisConfig,
    private logger: Logger
  ) {
    this.redis = createClient({ url: config.url });
  }

  /**
   * Initialize the metrics collector
   */
  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      this.isInitialized = true;
      this.logger.info('MetricsCollector initialized successfully');

      // Start cleanup task
      this.startCleanupTask();

    } catch (error) {
      this.logger.error('Failed to initialize MetricsCollector', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Shutdown the metrics collector
   */
  async shutdown(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.isInitialized = false;
      this.logger.info('MetricsCollector shutdown completed');
    } catch (error) {
      this.logger.error('Error during MetricsCollector shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Record voice synthesis metrics
   */
  async recordMetrics(metrics: VoiceMetrics): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      const timestamp = metrics.timestamp.getTime();
      const key = `${this.config.keyPrefix}:metrics:${timestamp}`;

      // Store metrics with expiration
      const metricsData = JSON.stringify({
        engine: metrics.engine,
        latency: metrics.latency,
        success: metrics.success,
        cost: metrics.cost,
        characterCount: metrics.characterCount,
        userId: metrics.userId,
        sessionId: metrics.sessionId,
        timestamp: timestamp,
      });

      await this.redis.setEx(key, Math.ceil(this.config.metricsRetentionMs / 1000), metricsData);

      // Update aggregated metrics
      await this.updateAggregatedMetrics(metrics);

    } catch (error) {
      this.logger.error('Failed to record metrics', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: metrics.sessionId,
      });
    }
  }

  /**
   * Get metrics for a time range
   */
  async getMetrics(timeRangeMs: number): Promise<VoiceMetrics[]> {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const now = Date.now();
      const startTime = now - timeRangeMs;
      const pattern = `${this.config.keyPrefix}:metrics:*`;

      const keys = await this.redis.keys(pattern);
      const metrics: VoiceMetrics[] = [];

      for (const key of keys) {
        const timestamp = parseInt(key.split(':').pop() || '0');
        
        if (timestamp >= startTime && timestamp <= now) {
          const data = await this.redis.get(key);
          if (data) {
            const parsed = JSON.parse(data);
            metrics.push({
              engine: parsed.engine,
              latency: parsed.latency,
              success: parsed.success,
              cost: parsed.cost,
              characterCount: parsed.characterCount,
              userId: parsed.userId,
              sessionId: parsed.sessionId,
              timestamp: new Date(parsed.timestamp),
            });
          }
        }
      }

      return metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    } catch (error) {
      this.logger.error('Failed to get metrics', {
        error: error instanceof Error ? error.message : String(error),
        timeRangeMs,
      });
      return [];
    }
  }

  /**
   * Get aggregated metrics for monitoring dashboards
   */
  async getAggregatedMetrics(timeRangeMs: number = 3600000): Promise<{
    totalRequests: number;
    successRate: number;
    avgLatency: number;
    totalCost: number;
    engineBreakdown: {
      elevenlabs: { requests: number; avgLatency: number; successRate: number };
      polly: { requests: number; avgLatency: number; successRate: number };
    };
  }> {
    try {
      const metrics = await this.getMetrics(timeRangeMs);

      if (metrics.length === 0) {
        return {
          totalRequests: 0,
          successRate: 1,
          avgLatency: 0,
          totalCost: 0,
          engineBreakdown: {
            elevenlabs: { requests: 0, avgLatency: 0, successRate: 1 },
            polly: { requests: 0, avgLatency: 0, successRate: 1 },
          },
        };
      }

      const totalRequests = metrics.length;
      const successfulRequests = metrics.filter(m => m.success).length;
      const successRate = successfulRequests / totalRequests;
      const avgLatency = metrics.reduce((sum, m) => sum + m.latency, 0) / totalRequests;
      const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);

      // Engine breakdown
      const elevenLabsMetrics = metrics.filter(m => m.engine === 'elevenlabs');
      const pollyMetrics = metrics.filter(m => m.engine === 'polly');

      const engineBreakdown = {
        elevenlabs: {
          requests: elevenLabsMetrics.length,
          avgLatency: elevenLabsMetrics.length > 0 
            ? elevenLabsMetrics.reduce((sum, m) => sum + m.latency, 0) / elevenLabsMetrics.length 
            : 0,
          successRate: elevenLabsMetrics.length > 0 
            ? elevenLabsMetrics.filter(m => m.success).length / elevenLabsMetrics.length 
            : 1,
        },
        polly: {
          requests: pollyMetrics.length,
          avgLatency: pollyMetrics.length > 0 
            ? pollyMetrics.reduce((sum, m) => sum + m.latency, 0) / pollyMetrics.length 
            : 0,
          successRate: pollyMetrics.length > 0 
            ? pollyMetrics.filter(m => m.success).length / pollyMetrics.length 
            : 1,
        },
      };

      return {
        totalRequests,
        successRate,
        avgLatency,
        totalCost,
        engineBreakdown,
      };

    } catch (error) {
      this.logger.error('Failed to get aggregated metrics', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        totalRequests: 0,
        successRate: 1,
        avgLatency: 0,
        totalCost: 0,
        engineBreakdown: {
          elevenlabs: { requests: 0, avgLatency: 0, successRate: 1 },
          polly: { requests: 0, avgLatency: 0, successRate: 1 },
        },
      };
    }
  }

  /**
   * Get latency percentiles for performance monitoring
   */
  async getLatencyPercentiles(timeRangeMs: number = 3600000): Promise<{
    p50: number;
    p95: number;
    p99: number;
  }> {
    try {
      const metrics = await this.getMetrics(timeRangeMs);
      
      if (metrics.length === 0) {
        return { p50: 0, p95: 0, p99: 0 };
      }

      const latencies = metrics.map(m => m.latency).sort((a, b) => a - b);
      
      const p50Index = Math.floor(latencies.length * 0.5);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p99Index = Math.floor(latencies.length * 0.99);

      return {
        p50: latencies[p50Index] || 0,
        p95: latencies[p95Index] || 0,
        p99: latencies[p99Index] || 0,
      };

    } catch (error) {
      this.logger.error('Failed to calculate latency percentiles', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { p50: 0, p95: 0, p99: 0 };
    }
  }

  /**
   * Private helper methods
   */

  private async updateAggregatedMetrics(metrics: VoiceMetrics): Promise<void> {
    try {
      const hourKey = `${this.config.keyPrefix}:hourly:${Math.floor(metrics.timestamp.getTime() / 3600000)}`;
      const dayKey = `${this.config.keyPrefix}:daily:${Math.floor(metrics.timestamp.getTime() / 86400000)}`;

      // Update hourly aggregates
      await this.updateAggregateKey(hourKey, metrics, 3600);
      
      // Update daily aggregates
      await this.updateAggregateKey(dayKey, metrics, 86400);

    } catch (error) {
      this.logger.error('Failed to update aggregated metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async updateAggregateKey(key: string, metrics: VoiceMetrics, ttlSeconds: number): Promise<void> {
    const multi = this.redis.multi();

    // Increment counters
    multi.hIncrBy(key, 'total_requests', 1);
    multi.hIncrBy(key, `${metrics.engine}_requests`, 1);
    
    if (metrics.success) {
      multi.hIncrBy(key, 'successful_requests', 1);
      multi.hIncrBy(key, `${metrics.engine}_successful`, 1);
    }

    // Add to latency sum for average calculation
    multi.hIncrBy(key, 'latency_sum', metrics.latency);
    multi.hIncrBy(key, `${metrics.engine}_latency_sum`, metrics.latency);

    // Add to cost sum
    multi.hIncrBy(key, 'cost_sum', Math.round(metrics.cost * 10000)); // Store as cents * 100 for precision

    // Add to character count sum
    multi.hIncrBy(key, 'character_sum', metrics.characterCount);

    // Set expiration
    multi.expire(key, ttlSeconds * 2); // Keep for 2x the period

    await multi.exec();
  }

  private startCleanupTask(): void {
    // Clean up expired metrics every hour
    setInterval(async () => {
      try {
        const cutoffTime = Date.now() - this.config.metricsRetentionMs;
        const pattern = `${this.config.keyPrefix}:metrics:*`;
        const keys = await this.redis.keys(pattern);

        let deletedCount = 0;
        for (const key of keys) {
          const timestamp = parseInt(key.split(':').pop() || '0');
          if (timestamp < cutoffTime) {
            await this.redis.del(key);
            deletedCount++;
          }
        }

        if (deletedCount > 0) {
          this.logger.info('Cleaned up expired metrics', { deletedCount });
        }

      } catch (error) {
        this.logger.error('Metrics cleanup failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 3600000); // Run every hour
  }
}