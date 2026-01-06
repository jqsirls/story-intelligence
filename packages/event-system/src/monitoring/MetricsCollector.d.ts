import { Logger } from 'winston';
import { SupabaseClient } from '@supabase/supabase-js';
export interface MetricsConfig {
    collectionInterval: number;
    retentionDays: number;
    enableDetailedMetrics: boolean;
    datadogApiKey?: string;
    datadogAppKey?: string;
}
export interface SystemMetrics {
    timestamp: Date;
    cpu: {
        usage: number;
        loadAverage: number[];
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    eventSystem: {
        eventsPublished: number;
        eventsProcessed: number;
        averageLatency: number;
        errorRate: number;
        queueDepth: number;
    };
    agents: {
        [agentName: string]: {
            requestCount: number;
            averageResponseTime: number;
            errorCount: number;
            activeConnections: number;
        };
    };
}
export interface AlertRule {
    id: string;
    name: string;
    metric: string;
    threshold: number;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    duration: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
    lastTriggered?: Date;
}
export declare class MetricsCollector {
    private supabase;
    private logger;
    private config;
    private collectionInterval?;
    private isRunning;
    private alertRules;
    private metricHistory;
    constructor(supabase: SupabaseClient, logger: Logger, config: MetricsConfig);
    /**
     * Start metrics collection
     */
    start(): Promise<void>;
    /**
     * Stop metrics collection
     */
    stop(): Promise<void>;
    /**
     * Collect system metrics
     */
    private collectMetrics;
    /**
     * Gather system metrics from various sources
     */
    private gatherSystemMetrics;
    /**
     * Get event system specific metrics
     */
    private getEventSystemMetrics;
    /**
     * Get agent-specific metrics
     */
    private getAgentMetrics;
    /**
     * Store metrics in database
     */
    private storeMetrics;
    /**
     * Check alert rules against current metrics
     */
    private checkAlerts;
    /**
     * Get metric value by path
     */
    private getMetricValue;
    /**
     * Evaluate alert condition
     */
    private evaluateAlertCondition;
    /**
     * Trigger an alert
     */
    private triggerAlert;
    /**
     * Send alert to external system
     */
    private sendExternalAlert;
    /**
     * Send metrics to Datadog
     */
    private sendToDatadog;
    /**
     * Load alert rules from database
     */
    private loadAlertRules;
    /**
     * Add or update an alert rule
     */
    setAlertRule(rule: Omit<AlertRule, 'id'>): Promise<string>;
    /**
     * Get current metrics
     */
    getCurrentMetrics(): Promise<SystemMetrics>;
    /**
     * Get metrics history
     */
    getMetricsHistory(startTime: Date, endTime: Date, interval?: 'minute' | 'hour' | 'day'): Promise<SystemMetrics[]>;
    /**
     * Health check
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        running: boolean;
        alertRules: number;
        lastCollection: Date | null;
        timestamp: string;
    }>;
}
