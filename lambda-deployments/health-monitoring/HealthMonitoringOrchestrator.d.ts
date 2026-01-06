/**
 * @storytailor/health-monitoring
 * Comprehensive health monitoring orchestrator for all agents and services
 * Powered by Story Intelligence™
 */
import { EventEmitter } from 'events';
import { Logger } from 'winston';
export interface ServiceHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    lastCheck: Date;
    responseTime: number;
    errorRate: number;
    uptime: number;
    metadata: Record<string, any>;
}
export interface SystemHealth {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: ServiceHealth[];
    alerts: Alert[];
    metrics: SystemMetrics;
    timestamp: Date;
    version: string;
    environment: string;
}
export interface Alert {
    id: string;
    service: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
    resolvedAt?: Date;
}
export interface SystemMetrics {
    cpu: {
        usage: number;
        loadAverage: number[];
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    requests: {
        total: number;
        errorsPerMinute: number;
        avgResponseTime: number;
    };
    agents: {
        active: number;
        total: number;
        healthy: number;
    };
    database: {
        connections: number;
        queryTime: number;
    };
    external: {
        openai: boolean;
        elevenlabs: boolean;
        supabase: boolean;
    };
}
export interface HealthCheckConfig {
    services: string[];
    checkInterval: number;
    alertThresholds: {
        responseTime: number;
        errorRate: number;
        uptime: number;
    };
    notifications: {
        slack?: {
            webhook: string;
            channel: string;
        };
        email?: {
            to: string[];
            smtp: any;
        };
        pagerduty?: {
            apiKey: string;
            serviceKey: string;
        };
    };
}
export declare class HealthMonitoringOrchestrator extends EventEmitter {
    private config;
    private logger;
    private services;
    private alerts;
    private checkInterval?;
    private isRunning;
    private startTime;
    constructor(config: HealthCheckConfig, logger: Logger);
    /**
     * Initialize all services for monitoring
     */
    private initializeServices;
    /**
     * Start health monitoring
     */
    start(): Promise<void>;
    /**
     * Stop health monitoring
     */
    stop(): void;
    /**
     * Perform health checks for all services
     */
    private performHealthChecks;
    /**
     * Check health of individual service
     */
    private checkServiceHealth;
    /**
     * Perform actual health check for a service
     */
    private performServiceCheck;
    /**
     * Check Lambda function health
     */
    private checkLambdaHealth;
    /**
     * Check agent health (for embedded agents)
     */
    private checkAgentHealth;
    /**
     * Check Supabase health
     */
    private checkSupabaseHealth;
    /**
     * Check OpenAI health
     */
    private checkOpenAIHealth;
    /**
     * Check ElevenLabs health
     */
    private checkElevenLabsHealth;
    /**
     * Calculate service uptime
     */
    private calculateUptime;
    /**
     * Check alert thresholds
     */
    private checkAlertThresholds;
    /**
     * Create an alert
     */
    private createAlert;
    /**
     * Send alert notifications
     */
    private sendNotifications;
    /**
     * Evaluate overall system health
     */
    private evaluateSystemHealth;
    /**
     * Get current system health
     */
    getSystemHealth(): Promise<SystemHealth>;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string): Promise<boolean>;
    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string): Promise<boolean>;
}
//# sourceMappingURL=HealthMonitoringOrchestrator.d.ts.map