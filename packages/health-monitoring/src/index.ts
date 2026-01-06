/**
 * @storytailor/health-monitoring
 * Comprehensive health monitoring for Storytailor platform
 * Powered by Story Intelligence™
 */

export { HealthMonitoringOrchestrator } from './HealthMonitoringOrchestrator';
export * from './HealthMonitoringOrchestrator';

// Default configuration
export const DEFAULT_HEALTH_CONFIG = {
  services: [
    'storytailor-api-staging',
    'storytailor-knowledge-base-staging',
    'supabase',
    'openai',
    'elevenlabs'
  ],
  checkInterval: 30000, // 30 seconds
  alertThresholds: {
    responseTime: 5000, // 5 seconds
    errorRate: 0.1, // 10%
    uptime: 99.0 // 99%
  },
  notifications: {}
} as const;
 
 
 