/**
 * @storytailor/health-monitoring
 * Comprehensive health monitoring for Storytailor platform
 * Powered by Story Intelligence™
 */
export { HealthMonitoringOrchestrator } from './HealthMonitoringOrchestrator';
export * from './HealthMonitoringOrchestrator';
export declare const DEFAULT_HEALTH_CONFIG: {
    readonly services: readonly ["storytailor-api-staging", "storytailor-knowledge-base-staging", "supabase", "openai", "elevenlabs"];
    readonly checkInterval: 30000;
    readonly alertThresholds: {
        readonly responseTime: 5000;
        readonly errorRate: 0.1;
        readonly uptime: 99;
    };
    readonly notifications: {};
};
//# sourceMappingURL=index.d.ts.map