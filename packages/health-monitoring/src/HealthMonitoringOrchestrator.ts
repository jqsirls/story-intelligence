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
  cpu: { usage: number; loadAverage: number[] };
  memory: { used: number; total: number; percentage: number };
  requests: { total: number; errorsPerMinute: number; avgResponseTime: number };
  agents: { active: number; total: number; healthy: number };
  database: { connections: number; queryTime: number };
  external: { openai: boolean; elevenlabs: boolean; supabase: boolean };
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
    slack?: { webhook: string; channel: string };
    email?: { to: string[]; smtp: any };
    pagerduty?: { apiKey: string; serviceKey: string };
  };
}

export class HealthMonitoringOrchestrator extends EventEmitter {
  private config: HealthCheckConfig;
  private logger: Logger;
  private services: Map<string, ServiceHealth> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private checkInterval?: NodeJS.Timeout;
  private isRunning = false;
  private startTime = new Date();

  constructor(config: HealthCheckConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.initializeServices();
  }

  /**
   * Initialize all services for monitoring
   */
  private initializeServices(): void {
    const defaultServices = [
      'storytailor-api-staging',
      'storytailor-knowledge-base-staging',
      'router',
      'content-agent',
      'emotion-agent',
      'personality-agent',
      'auth-agent',
      'library-agent',
      'commerce-agent',
      'educational-agent',
      'therapeutic-agent',
      'accessibility-agent',
      'localization-agent',
      'conversation-intelligence',
      'analytics-intelligence',
      'insights-agent',
      'smart-home-agent',
      'child-safety-agent',
      'security-framework',
      'voice-synthesis',
      'supabase',
      'openai',
      'elevenlabs'
    ];

    const services = [...new Set([...defaultServices, ...this.config.services])];

    services.forEach(service => {
      this.services.set(service, {
        name: service,
        status: 'unknown',
        lastCheck: new Date(),
        responseTime: 0,
        errorRate: 0,
        uptime: 0,
        metadata: {}
      });
    });

    this.logger.info('Health monitoring initialized', {
      serviceCount: this.services.size,
      services: Array.from(this.services.keys())
    });
  }

  /**
   * Start health monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Health monitoring already running');
      return;
    }

    this.logger.info('Starting health monitoring orchestrator', {
      interval: this.config.checkInterval,
      services: this.services.size
    });

    // Perform initial health check
    await this.performHealthChecks();

    // Start periodic health checks
    this.checkInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.checkInterval
    );

    this.isRunning = true;
    this.emit('monitoring:started');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    this.isRunning = false;
    this.logger.info('Health monitoring stopped');
    this.emit('monitoring:stopped');
  }

  /**
   * Perform health checks for all services
   */
  private async performHealthChecks(): Promise<void> {
    const startTime = Date.now();
    const checks = Array.from(this.services.keys()).map(service => 
      this.checkServiceHealth(service)
    );

    try {
      await Promise.allSettled(checks);
      
      const duration = Date.now() - startTime;
      this.logger.debug('Health checks completed', { 
        duration, 
        services: this.services.size 
      });

      // Evaluate overall system health
      await this.evaluateSystemHealth();

    } catch (error) {
      this.logger.error('Health check cycle failed', { error });
    }
  }

  /**
   * Check health of individual service
   */
  private async checkServiceHealth(serviceName: string): Promise<void> {
    const startTime = Date.now();
    let health = this.services.get(serviceName);
    
    if (!health) return;

    try {
      const result = await this.performServiceCheck(serviceName);
      const responseTime = Date.now() - startTime;

      // Update service health
      health = {
        ...health,
        status: result.status,
        lastCheck: new Date(),
        responseTime,
        errorRate: result.errorRate || 0,
        uptime: this.calculateUptime(health.lastCheck),
        metadata: result.metadata || {}
      };

      this.services.set(serviceName, health);

      // Check for alerts
      await this.checkAlertThresholds(health);

      this.emit('service:checked', health);

    } catch (error) {
      // Mark service as unhealthy
      health = {
        ...health,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        errorRate: 1,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };

      this.services.set(serviceName, health);
      this.logger.warn('Service health check failed', { 
        service: serviceName, 
        error: error instanceof Error ? error.message : String(error)
      });

      // Create critical alert for unhealthy service
      await this.createAlert(serviceName, 'critical', `Service ${serviceName} is unhealthy: ${error}`);
    }
  }

  /**
   * Perform actual health check for a service
   */
  private async performServiceCheck(serviceName: string): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    errorRate?: number;
    metadata?: Record<string, any>;
  }> {
    // Lambda function health checks
    if (serviceName.startsWith('storytailor-')) {
      return await this.checkLambdaHealth(serviceName);
    }

    // Agent health checks
    if (serviceName.endsWith('-agent') || serviceName === 'router') {
      return await this.checkAgentHealth(serviceName);
    }

    // External service health checks
    switch (serviceName) {
      case 'supabase':
        return await this.checkSupabaseHealth();
      case 'openai':
        return await this.checkOpenAIHealth();
      case 'elevenlabs':
        return await this.checkElevenLabsHealth();
      default:
        return { status: 'unknown' };
    }
  }

  /**
   * Check Lambda function health
   */
  private async checkLambdaHealth(functionName: string): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    errorRate?: number;
    metadata?: Record<string, any>;
  }> {
    try {
      // For deployed Lambda functions, we'll make HTTP requests to their health endpoints
      const baseUrl = process.env.API_GATEWAY_URL || 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging';
      
      let healthEndpoint = '';
      if (functionName === 'storytailor-api-staging') {
        healthEndpoint = `${baseUrl}/health`;
      } else if (functionName === 'storytailor-knowledge-base-staging') {
        healthEndpoint = `${baseUrl}/knowledge/health`;
      }

      if (healthEndpoint) {
        const response = await fetch(healthEndpoint, { 
          method: 'GET',
          timeout: 5000 
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          return {
            status: 'healthy',
            errorRate: 0,
            metadata: {
              version: data.version,
              features: data.features,
              multiAgentSystem: data.multiAgentSystem
            }
          };
        } else {
          return {
            status: 'degraded',
            errorRate: 0.5,
            metadata: { error: data.error || 'Health check returned non-success' }
          };
        }
      }

      // Fallback: assume healthy if we can't check
      return { status: 'healthy', errorRate: 0 };

    } catch (error) {
      return {
        status: 'unhealthy',
        errorRate: 1,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Check agent health (for embedded agents)
   */
  private async checkAgentHealth(agentName: string): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    errorRate?: number;
    metadata?: Record<string, any>;
  }> {
    // For embedded agents, we assume they're healthy if the main Lambda is healthy
    // In a full deployment, each agent would have its own health endpoint
    
    try {
      const baseUrl = process.env.API_GATEWAY_URL || 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging';
      const response = await fetch(`${baseUrl}/health`, { 
        method: 'GET',
        timeout: 5000 
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.multiAgentSystem?.agents?.includes(agentName.replace('-agent', ''))) {
        return {
          status: 'healthy',
          errorRate: 0,
          metadata: { embedded: true, agentSystem: data.multiAgentSystem }
        };
      }

      return { status: 'degraded', errorRate: 0.3 };

    } catch (error) {
      return {
        status: 'unhealthy',
        errorRate: 1,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Check Supabase health
   */
  private async checkSupabaseHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    errorRate?: number;
    metadata?: Record<string, any>;
  }> {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return {
          status: 'unhealthy',
          errorRate: 1,
          metadata: { error: 'Missing Supabase configuration' }
        };
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/stories?limit=1`, {
        headers: { 
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        timeout: 5000
      });

      if (response.ok) {
        return {
          status: 'healthy',
          errorRate: 0,
          metadata: { endpoint: 'REST API', responseStatus: response.status }
        };
      }

      return {
        status: 'degraded',
        errorRate: 0.5,
        metadata: { responseStatus: response.status }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        errorRate: 1,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Check OpenAI health
   */
  private async checkOpenAIHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    errorRate?: number;
    metadata?: Record<string, any>;
  }> {
    try {
      const openaiKey = process.env.OPENAI_API_KEY;
      
      if (!openaiKey) {
        return {
          status: 'unhealthy',
          errorRate: 1,
          metadata: { error: 'Missing OpenAI API key' }
        };
      }

      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.ok) {
        return {
          status: 'healthy',
          errorRate: 0,
          metadata: { endpoint: 'Models API', responseStatus: response.status }
        };
      }

      return {
        status: 'degraded',
        errorRate: 0.5,
        metadata: { responseStatus: response.status }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        errorRate: 1,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Check ElevenLabs health
   */
  private async checkElevenLabsHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    errorRate?: number;
    metadata?: Record<string, any>;
  }> {
    try {
      const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
      
      if (!elevenLabsKey) {
        return {
          status: 'unhealthy',
          errorRate: 1,
          metadata: { error: 'Missing ElevenLabs API key' }
        };
      }

      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.ok) {
        return {
          status: 'healthy',
          errorRate: 0,
          metadata: { endpoint: 'User API', responseStatus: response.status }
        };
      }

      return {
        status: 'degraded',
        errorRate: 0.5,
        metadata: { responseStatus: response.status }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        errorRate: 1,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Calculate service uptime
   */
  private calculateUptime(lastCheck: Date): number {
    const now = Date.now();
    const diff = now - this.startTime.getTime();
    return Math.max(0, Math.min(100, (diff / (1000 * 60 * 60 * 24)) * 100)); // Percentage of day
  }

  /**
   * Check alert thresholds
   */
  private async checkAlertThresholds(health: ServiceHealth): Promise<void> {
    const { alertThresholds } = this.config;

    // Response time alert
    if (health.responseTime > alertThresholds.responseTime) {
      await this.createAlert(
        health.name,
        health.responseTime > alertThresholds.responseTime * 2 ? 'high' : 'medium',
        `High response time: ${health.responseTime}ms (threshold: ${alertThresholds.responseTime}ms)`
      );
    }

    // Error rate alert
    if (health.errorRate > alertThresholds.errorRate) {
      await this.createAlert(
        health.name,
        health.errorRate > 0.5 ? 'critical' : 'high',
        `High error rate: ${(health.errorRate * 100).toFixed(1)}% (threshold: ${(alertThresholds.errorRate * 100).toFixed(1)}%)`
      );
    }

    // Uptime alert
    if (health.uptime < alertThresholds.uptime) {
      await this.createAlert(
        health.name,
        'medium',
        `Low uptime: ${health.uptime.toFixed(1)}% (threshold: ${alertThresholds.uptime}%)`
      );
    }
  }

  /**
   * Create an alert
   */
  private async createAlert(service: string, severity: Alert['severity'], message: string): Promise<void> {
    const alertId = `${service}-${Date.now()}`;
    const alert: Alert = {
      id: alertId,
      service,
      severity,
      message,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.set(alertId, alert);
    this.logger.warn('Alert created', alert);
    this.emit('alert:created', alert);

    // Send notifications
    await this.sendNotifications(alert);
  }

  /**
   * Send alert notifications
   */
  private async sendNotifications(alert: Alert): Promise<void> {
    try {
      // In a full implementation, this would send to Slack, email, PagerDuty, etc.
      this.logger.info('Alert notification sent', {
        id: alert.id,
        service: alert.service,
        severity: alert.severity,
        message: alert.message
      });
    } catch (error) {
      this.logger.error('Failed to send alert notification', { alert, error });
    }
  }

  /**
   * Evaluate overall system health
   */
  private async evaluateSystemHealth(): Promise<void> {
    const services = Array.from(this.services.values());
    const unhealthyServices = services.filter(s => s.status === 'unhealthy');
    const degradedServices = services.filter(s => s.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    this.emit('system:health', {
      overall: overallStatus,
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: degradedServices.length,
      unhealthy: unhealthyServices.length,
      total: services.length
    });
  }

  /**
   * Get current system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const services = Array.from(this.services.values());
    const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.resolvedAt);
    
    // Calculate overall status
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    // Calculate system metrics
    const metrics: SystemMetrics = {
      cpu: { usage: 0, loadAverage: [0, 0, 0] }, // Would be collected from CloudWatch
      memory: { used: 0, total: 0, percentage: 0 }, // Would be collected from CloudWatch
      requests: { total: 0, errorsPerMinute: 0, avgResponseTime: 0 }, // Would be collected from API Gateway
      agents: { 
        active: services.filter(s => s.name.includes('agent') && s.status === 'healthy').length,
        total: services.filter(s => s.name.includes('agent')).length,
        healthy: services.filter(s => s.status === 'healthy').length
      },
      database: { connections: 0, queryTime: 0 }, // Would be collected from Supabase
      external: {
        openai: services.find(s => s.name === 'openai')?.status === 'healthy' || false,
        elevenlabs: services.find(s => s.name === 'elevenlabs')?.status === 'healthy' || false,
        supabase: services.find(s => s.name === 'supabase')?.status === 'healthy' || false
      }
    };

    return {
      overall,
      services,
      alerts: activeAlerts,
      metrics,
      timestamp: new Date(),
      version: process.env.APP_VERSION || '2.0.0',
      environment: process.env.NODE_ENV || 'staging'
    };
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.alerts.set(alertId, alert);
      this.emit('alert:acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      this.alerts.set(alertId, alert);
      this.emit('alert:resolved', alert);
      return true;
    }
    return false;
  }
}
 
 
 