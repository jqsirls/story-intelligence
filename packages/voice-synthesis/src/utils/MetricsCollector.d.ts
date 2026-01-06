import { Logger } from 'winston';
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
export declare class MetricsCollector {
    private config;
    private logger;
    private redis;
    private isInitialized;
    constructor(config: RedisConfig, logger: Logger);
    /**
     * Initialize the metrics collector
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the metrics collector
     */
    shutdown(): Promise<void>;
    /**
     * Record voice synthesis metrics
     */
    recordMetrics(metrics: VoiceMetrics): Promise<void>;
    /**
     * Get metrics for a time range
     */
    getMetrics(timeRangeMs: number): Promise<VoiceMetrics[]>;
    /**
     * Get aggregated metrics for monitoring dashboards
     */
    getAggregatedMetrics(timeRangeMs?: number): Promise<{
        totalRequests: number;
        successRate: number;
        avgLatency: number;
        totalCost: number;
        engineBreakdown: {
            elevenlabs: {
                requests: number;
                avgLatency: number;
                successRate: number;
            };
            polly: {
                requests: number;
                avgLatency: number;
                successRate: number;
            };
        };
    }>;
    /**
     * Get latency percentiles for performance monitoring
     */
    getLatencyPercentiles(timeRangeMs?: number): Promise<{
        p50: number;
        p95: number;
        p99: number;
    }>;
    /**
     * Private helper methods
     */
    private updateAggregatedMetrics;
    private updateAggregateKey;
    private startCleanupTask;
}
export {};
//# sourceMappingURL=MetricsCollector.d.ts.map