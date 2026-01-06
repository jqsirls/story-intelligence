/**
 * Real-Time Monitoring System
 * Tracks service health, performance metrics, and threshold-based alerting
 */

import { EventEmitter } from 'events';
import { TestResult } from './TestOrchestrator';

export interface HealthMetrics {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  throughput: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  service: string;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorCount: number;
  successCount: number;
  timestamp: number;
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface Alert {
  id: string;
  service: string;
  metric: string;
  threshold: AlertThreshold;
  currentValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface MonitoringDashboard {
  services: HealthMetrics[];
  performance: PerformanceMetrics[];
  activeAlerts: Alert[];
  systemOverview: {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
  };
}

export class RealTimeMonitoringSystem extends EventEmitter {
  private healthMetrics: Map<string, HealthMetrics[]>;
  private performanceMetrics: Map<string, PerformanceMetrics[]>;
  private alertThresholds: Map<string, AlertThreshold[]>;
  private activeAlerts: Map<string, Alert>;
  private monitoringInterval: NodeJS.Timeout | null;
  private retentionPeriod: number;
  private services: Set<string>;

  constructor(retentionPeriod: number = 24 * 60 * 60 * 1000) { // 24 hours default
    super();
    this.healthMetrics = new Map();
    this.performanceMetrics = new Map();
    this.alertThresholds = new Map();
    this.activeAlerts = new Map();
    this.monitoringInterval = null;
    this.retentionPeriod = retentionPeriod;
    this.services = new Set();
    
    this.initializeDefaultThresholds();
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }
    
    console.log('📊 Starting real-time monitoring system...');
    
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      this.checkThresholds();
      this.cleanupOldMetrics();
    }, intervalMs);
    
    this.emit('monitoringStarted', { interval: intervalMs });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('📊 Monitoring system stopped');
      this.emit('monitoringStopped');
    }
  }

  /**
   * Register a service for monitoring
   */
  registerService(serviceName: string, healthEndpoint?: string): void {
    this.services.add(serviceName);
    
    if (!this.healthMetrics.has(serviceName)) {
      this.healthMetrics.set(serviceName, []);
    }
    
    if (!this.performanceMetrics.has(serviceName)) {
      this.performanceMetrics.set(serviceName, []);
    }
    
    console.log(`📋 Registered service for monitoring: ${serviceName}`);
    this.emit('serviceRegistered', { serviceName, healthEndpoint });
  }

  /**
   * Record health metrics for a service
   */
  recordHealthMetrics(metrics: HealthMetrics): void {
    const serviceMetrics = this.healthMetrics.get(metrics.service) || [];
    serviceMetrics.push(metrics);
    this.healthMetrics.set(metrics.service, serviceMetrics);
    
    this.emit('healthMetricsRecorded', metrics);
  }

  /**
   * Record performance metrics for a service
   */
  recordPerformanceMetrics(metrics: PerformanceMetrics): void {
    const serviceMetrics = this.performanceMetrics.get(metrics.service) || [];
    serviceMetrics.push(metrics);
    this.performanceMetrics.set(metrics.service, serviceMetrics);
    
    this.emit('performanceMetricsRecorded', metrics);
  }

  /**
   * Add alert threshold
   */
  addAlertThreshold(service: string, threshold: AlertThreshold): void {
    const serviceThresholds = this.alertThresholds.get(service) || [];
    serviceThresholds.push(threshold);
    this.alertThresholds.set(service, serviceThresholds);
    
    console.log(`🚨 Added alert threshold for ${service}: ${threshold.metric} ${threshold.operator} ${threshold.value}`);
  }

  /**
   * Get current monitoring dashboard
   */
  getDashboard(): MonitoringDashboard {
    const services = this.getCurrentHealthMetrics();
    const performance = this.getCurrentPerformanceMetrics();
    const activeAlerts = Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
    
    // Calculate system overview
    const totalServices = services.length;
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;
    
    const averageResponseTime = services.length > 0 
      ? services.reduce((sum, s) => sum + s.responseTime, 0) / services.length 
      : 0;
    
    const totalRequests = performance.reduce((sum, p) => sum + p.successCount + p.errorCount, 0);
    const totalErrors = performance.reduce((sum, p) => sum + p.errorCount, 0);
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    
    return {
      services,
      performance,
      activeAlerts,
      systemOverview: {
        totalServices,
        healthyServices,
        degradedServices,
        unhealthyServices,
        averageResponseTime,
        totalRequests,
        errorRate
      }
    };
  }

  /**
   * Get service health history
   */
  getServiceHealthHistory(service: string, timeRange?: { start: number; end: number }): HealthMetrics[] {
    const metrics = this.healthMetrics.get(service) || [];
    
    if (!timeRange) {
      return metrics;
    }
    
    return metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end);
  }

  /**
   * Get service performance history
   */
  getServicePerformanceHistory(service: string, timeRange?: { start: number; end: number }): PerformanceMetrics[] {
    const metrics = this.performanceMetrics.get(service) || [];
    
    if (!timeRange) {
      return metrics;
    }
    
    return metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get alert history
   */
  getAlertHistory(timeRange?: { start: number; end: number }): Alert[] {
    const alerts = Array.from(this.activeAlerts.values());
    
    if (!timeRange) {
      return alerts;
    }
    
    return alerts.filter(a => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      
      console.log(`✅ Alert resolved: ${alert.message}`);
      this.emit('alertResolved', alert);
      return true;
    }
    
    return false;
  }

  /**
   * Collect metrics from all registered services
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();
    
    for (const service of this.services) {
      try {
        // Collect health metrics
        const healthMetrics = await this.collectServiceHealth(service, timestamp);
        this.recordHealthMetrics(healthMetrics);
        
        // Collect performance metrics
        const performanceMetrics = await this.collectServicePerformance(service, timestamp);
        this.recordPerformanceMetrics(performanceMetrics);
        
      } catch (error) {
        console.error(`Failed to collect metrics for ${service}:`, error);
        
        // Record unhealthy status
        this.recordHealthMetrics({
          service,
          status: 'unhealthy',
          responseTime: -1,
          errorRate: 1,
          throughput: 0,
          timestamp,
          metadata: { error: error.message }
        });
      }
    }
  }

  /**
   * Collect health metrics for a specific service
   */
  private async collectServiceHealth(service: string, timestamp: number): Promise<HealthMetrics> {
    const startTime = Date.now();
    
    try {
      // Simulate health check (in real implementation, would call actual endpoints)
      const healthEndpoint = this.getHealthEndpoint(service);
      const response = await this.performHealthCheck(healthEndpoint);
      
      const responseTime = Date.now() - startTime;
      const status = this.determineHealthStatus(response, responseTime);
      
      return {
        service,
        status,
        responseTime,
        errorRate: response.errorRate || 0,
        throughput: response.throughput || 0,
        timestamp,
        metadata: response.metadata
      };
      
    } catch (error) {
      return {
        service,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        errorRate: 1,
        throughput: 0,
        timestamp,
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Collect performance metrics for a specific service
   */
  private async collectServicePerformance(service: string, timestamp: number): Promise<PerformanceMetrics> {
    try {
      // Get recent health metrics to calculate performance
      const recentMetrics = this.getRecentHealthMetrics(service, 5); // Last 5 minutes
      
      if (recentMetrics.length === 0) {
        return {
          service,
          averageResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          requestsPerSecond: 0,
          errorCount: 0,
          successCount: 0,
          timestamp
        };
      }
      
      // Calculate performance metrics
      const responseTimes = recentMetrics.map(m => m.responseTime).filter(rt => rt > 0);
      const averageResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
      
      responseTimes.sort((a, b) => a - b);
      const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
      const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;
      
      const errorCount = recentMetrics.filter(m => m.status === 'unhealthy').length;
      const successCount = recentMetrics.filter(m => m.status === 'healthy').length;
      const requestsPerSecond = recentMetrics.length / 5; // 5 minute window
      
      return {
        service,
        averageResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        requestsPerSecond,
        errorCount,
        successCount,
        timestamp
      };
      
    } catch (error) {
      console.error(`Failed to collect performance metrics for ${service}:`, error);
      return {
        service,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        errorCount: 1,
        successCount: 0,
        timestamp
      };
    }
  }

  /**
   * Check thresholds and trigger alerts
   */
  private checkThresholds(): void {
    for (const [service, thresholds] of this.alertThresholds.entries()) {
      const currentHealth = this.getCurrentHealthMetrics().find(h => h.service === service);
      const currentPerformance = this.getCurrentPerformanceMetrics().find(p => p.service === service);
      
      if (!currentHealth || !currentPerformance) continue;
      
      for (const threshold of thresholds) {
        const currentValue = this.getMetricValue(threshold.metric, currentHealth, currentPerformance);
        const shouldAlert = this.evaluateThreshold(currentValue, threshold);
        
        if (shouldAlert) {
          this.triggerAlert(service, threshold, currentValue);
        } else {
          // Check if we should resolve existing alert
          this.checkAlertResolution(service, threshold, currentValue);
        }
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(service: string, threshold: AlertThreshold, currentValue: number): void {
    const alertId = `${service}-${threshold.metric}-${threshold.operator}-${threshold.value}`;
    
    // Don't create duplicate alerts
    if (this.activeAlerts.has(alertId) && !this.activeAlerts.get(alertId)!.resolved) {
      return;
    }
    
    const alert: Alert = {
      id: alertId,
      service,
      metric: threshold.metric,
      threshold,
      currentValue,
      severity: threshold.severity,
      message: `${service}: ${threshold.description} (${threshold.metric} ${threshold.operator} ${threshold.value}, current: ${currentValue})`,
      timestamp: Date.now(),
      resolved: false
    };
    
    this.activeAlerts.set(alertId, alert);
    
    console.log(`🚨 ALERT [${threshold.severity.toUpperCase()}]: ${alert.message}`);
    this.emit('alertTriggered', alert);
  }

  /**
   * Check if alert should be resolved
   */
  private checkAlertResolution(service: string, threshold: AlertThreshold, currentValue: number): void {
    const alertId = `${service}-${threshold.metric}-${threshold.operator}-${threshold.value}`;
    const alert = this.activeAlerts.get(alertId);
    
    if (alert && !alert.resolved) {
      const shouldResolve = !this.evaluateThreshold(currentValue, threshold);
      
      if (shouldResolve) {
        this.resolveAlert(alertId);
      }
    }
  }

  /**
   * Get metric value from health or performance data
   */
  private getMetricValue(metric: string, health: HealthMetrics, performance: PerformanceMetrics): number {
    switch (metric) {
      case 'responseTime':
        return health.responseTime;
      case 'errorRate':
        return health.errorRate;
      case 'throughput':
        return health.throughput;
      case 'averageResponseTime':
        return performance.averageResponseTime;
      case 'p95ResponseTime':
        return performance.p95ResponseTime;
      case 'p99ResponseTime':
        return performance.p99ResponseTime;
      case 'requestsPerSecond':
        return performance.requestsPerSecond;
      case 'errorCount':
        return performance.errorCount;
      default:
        return 0;
    }
  }

  /**
   * Evaluate threshold condition
   */
  private evaluateThreshold(currentValue: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'gt':
        return currentValue > threshold.value;
      case 'gte':
        return currentValue >= threshold.value;
      case 'lt':
        return currentValue < threshold.value;
      case 'lte':
        return currentValue <= threshold.value;
      case 'eq':
        return currentValue === threshold.value;
      default:
        return false;
    }
  }

  /**
   * Get health endpoint for service
   */
  private getHealthEndpoint(service: string): string {
    const endpoints = {
      'universal-agent': 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/health',
      'openai': 'https://api.openai.com/v1/models',
      'elevenlabs': 'https://api.elevenlabs.io/v1/voices',
      'redis': 'http://localhost:6379/ping',
      'supabase': 'https://your-project.supabase.co/rest/v1/'
    };
    
    return endpoints[service] || `http://localhost:3000/${service}/health`;
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(endpoint: string): Promise<any> {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        timeout: 5000
      });
      
      return {
        status: response.status,
        errorRate: response.status >= 400 ? 1 : 0,
        throughput: 1,
        metadata: {
          statusCode: response.status,
          statusText: response.statusText
        }
      };
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Determine health status from response
   */
  private determineHealthStatus(response: any, responseTime: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (response.status >= 500) {
      return 'unhealthy';
    }
    
    if (response.status >= 400 || responseTime > 10000) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Get current health metrics (latest for each service)
   */
  private getCurrentHealthMetrics(): HealthMetrics[] {
    const current: HealthMetrics[] = [];
    
    for (const [service, metrics] of this.healthMetrics.entries()) {
      if (metrics.length > 0) {
        current.push(metrics[metrics.length - 1]);
      }
    }
    
    return current;
  }

  /**
   * Get current performance metrics (latest for each service)
   */
  private getCurrentPerformanceMetrics(): PerformanceMetrics[] {
    const current: PerformanceMetrics[] = [];
    
    for (const [service, metrics] of this.performanceMetrics.entries()) {
      if (metrics.length > 0) {
        current.push(metrics[metrics.length - 1]);
      }
    }
    
    return current;
  }

  /**
   * Get recent health metrics for a service
   */
  private getRecentHealthMetrics(service: string, minutes: number): HealthMetrics[] {
    const metrics = this.healthMetrics.get(service) || [];
    const cutoff = Date.now() - (minutes * 60 * 1000);
    
    return metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Clean up old metrics based on retention period
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.retentionPeriod;
    
    // Clean up health metrics
    for (const [service, metrics] of this.healthMetrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp >= cutoff);
      this.healthMetrics.set(service, filtered);
    }
    
    // Clean up performance metrics
    for (const [service, metrics] of this.performanceMetrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp >= cutoff);
      this.performanceMetrics.set(service, filtered);
    }
    
    // Clean up resolved alerts older than retention period
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoff) {
        this.activeAlerts.delete(alertId);
      }
    }
  }

  /**
   * Initialize default alert thresholds
   */
  private initializeDefaultThresholds(): void {
    const defaultThresholds: Array<{ service: string; threshold: AlertThreshold }> = [
      {
        service: 'universal-agent',
        threshold: {
          metric: 'responseTime',
          operator: 'gt',
          value: 5000,
          severity: 'high',
          description: 'Response time too high'
        }
      },
      {
        service: 'universal-agent',
        threshold: {
          metric: 'errorRate',
          operator: 'gt',
          value: 0.1,
          severity: 'critical',
          description: 'Error rate too high'
        }
      },
      {
        service: 'openai',
        threshold: {
          metric: 'responseTime',
          operator: 'gt',
          value: 15000,
          severity: 'medium',
          description: 'OpenAI response time high'
        }
      },
      {
        service: 'elevenlabs',
        threshold: {
          metric: 'errorRate',
          operator: 'gt',
          value: 0.05,
          severity: 'high',
          description: 'ElevenLabs error rate high'
        }
      }
    ];
    
    for (const { service, threshold } of defaultThresholds) {
      this.addAlertThreshold(service, threshold);
    }
  }

  /**
   * Export monitoring data
   */
  exportData(): {
    healthMetrics: Record<string, HealthMetrics[]>;
    performanceMetrics: Record<string, PerformanceMetrics[]>;
    alerts: Alert[];
    thresholds: Record<string, AlertThreshold[]>;
  } {
    return {
      healthMetrics: Object.fromEntries(this.healthMetrics.entries()),
      performanceMetrics: Object.fromEntries(this.performanceMetrics.entries()),
      alerts: Array.from(this.activeAlerts.values()),
      thresholds: Object.fromEntries(this.alertThresholds.entries())
    };
  }
}