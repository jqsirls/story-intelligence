import { CloudWatch, CloudWatchLogs } from 'aws-sdk';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import { StatsD } from 'node-statsd';
import { createClient } from 'redis';
import { OpenTelemetryAPI } from '@opentelemetry/api';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

interface MonitoringConfig {
  serviceName: string;
  environment: string;
  region: string;
  cloudWatchLogGroup: string;
  cloudWatchLogStream: string;
  metricsNamespace: string;
  enableTracing: boolean;
  enableMetrics: boolean;
  enableLogs: boolean;
  alertingEnabled: boolean;
  customDimensions?: Record<string, string>;
}

interface MetricEvent {
  name: string;
  value: number;
  unit: 'Count' | 'Milliseconds' | 'Bytes' | 'Percent';
  dimensions?: Record<string, string>;
  timestamp?: Date;
}

interface LogEvent {
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  context?: Record<string, any>;
  error?: Error;
  traceId?: string;
  spanId?: string;
  userId?: string;
  correlationId?: string;
}

interface AlertConfig {
  metricName: string;
  threshold: number;
  comparisonOperator: 'GreaterThanThreshold' | 'LessThanThreshold' | 'GreaterThanOrEqualToThreshold' | 'LessThanOrEqualToThreshold';
  evaluationPeriods: number;
  period: number;
  statistic: 'Average' | 'Sum' | 'Minimum' | 'Maximum' | 'SampleCount';
  actionsEnabled: boolean;
  alarmActions?: string[];
  description?: string;
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastCheck: Date;
  details?: Record<string, any>;
}

interface DashboardWidget {
  type: 'metric' | 'log' | 'alarm' | 'custom';
  title: string;
  metrics?: string[];
  query?: string;
  width: number;
  height: number;
  position: { x: number; y: number };
}

export class MonitoringOrchestrator {
  private cloudWatch: CloudWatch;
  private cloudWatchLogs: CloudWatchLogs;
  private eventBridge: EventBridge;
  private logger: winston.Logger;
  private statsd: StatsD;
  private redisClient: ReturnType<typeof createClient>;
  private tracerProvider?: BasicTracerProvider;
  private config: MonitoringConfig;
  private healthChecks: Map<string, HealthCheck> = new Map();

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.cloudWatch = new CloudWatch({ region: config.region });
    this.cloudWatchLogs = new CloudWatchLogs({ region: config.region });
    this.eventBridge = new EventBridge({ region: config.region });
    
    // Initialize StatsD for real-time metrics
    this.statsd = new StatsD({
      host: process.env.STATSD_HOST || 'localhost',
      port: parseInt(process.env.STATSD_PORT || '8125'),
      prefix: `${config.serviceName}.${config.environment}.`
    });

    // Initialize Redis for distributed state
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    // Initialize logger
    this.logger = this.initializeLogger();

    // Initialize OpenTelemetry if tracing is enabled
    if (config.enableTracing) {
      this.initializeTracing();
    }
  }

  /**
   * Initialize comprehensive logging system
   */
  private initializeLogger(): winston.Logger {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      })
    ];

    // Add CloudWatch transport
    if (this.config.enableLogs) {
      transports.push(new CloudWatchTransport({
        logGroupName: this.config.cloudWatchLogGroup,
        logStreamName: this.config.cloudWatchLogStream,
        cloudWatchLogs: this.cloudWatchLogs
      }));
    }

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      defaultMeta: {
        service: this.config.serviceName,
        environment: this.config.environment,
        ...this.config.customDimensions
      },
      transports
    });
  }

  /**
   * Initialize OpenTelemetry tracing
   */
  private initializeTracing(): void {
    const jaegerExporter = new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
    });

    this.tracerProvider = new BasicTracerProvider();
    this.tracerProvider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
    this.tracerProvider.register();
  }

  /**
   * Log structured event
   */
  async log(event: LogEvent): Promise<void> {
    const logData = {
      ...event.context,
      level: event.level,
      message: event.message,
      timestamp: new Date().toISOString(),
      traceId: event.traceId,
      spanId: event.spanId,
      userId: event.userId,
      correlationId: event.correlationId
    };

    // Add error details if present
    if (event.error) {
      logData.error = {
        name: event.error.name,
        message: event.error.message,
        stack: event.error.stack
      };
    }

    // Log to Winston
    this.logger.log(event.level, event.message, logData);

    // Send critical errors to EventBridge for alerting
    if (event.level === 'critical' || event.level === 'error') {
      await this.publishErrorEvent(event);
    }
  }

  /**
   * Record custom metric
   */
  async recordMetric(metric: MetricEvent): Promise<void> {
    if (!this.config.enableMetrics) return;

    // Send to StatsD for real-time monitoring
    switch (metric.unit) {
      case 'Count':
        this.statsd.increment(metric.name, metric.value);
        break;
      case 'Milliseconds':
        this.statsd.timing(metric.name, metric.value);
        break;
      case 'Bytes':
      case 'Percent':
        this.statsd.gauge(metric.name, metric.value);
        break;
    }

    // Send to CloudWatch for long-term storage
    const params = {
      Namespace: this.config.metricsNamespace,
      MetricData: [{
        MetricName: metric.name,
        Value: metric.value,
        Unit: metric.unit,
        Timestamp: metric.timestamp || new Date(),
        Dimensions: this.buildDimensions(metric.dimensions)
      }]
    };

    try {
      await this.cloudWatch.putMetricData(params).promise();
    } catch (error) {
      this.logger.error('Failed to send metric to CloudWatch', { error, metric });
    }
  }

  /**
   * Create or update CloudWatch alarm
   */
  async createAlarm(name: string, config: AlertConfig): Promise<void> {
    if (!this.config.alertingEnabled) return;

    const params = {
      AlarmName: `${this.config.serviceName}-${this.config.environment}-${name}`,
      ComparisonOperator: config.comparisonOperator,
      EvaluationPeriods: config.evaluationPeriods,
      MetricName: config.metricName,
      Namespace: this.config.metricsNamespace,
      Period: config.period,
      Statistic: config.statistic,
      Threshold: config.threshold,
      ActionsEnabled: config.actionsEnabled,
      AlarmActions: config.alarmActions,
      AlarmDescription: config.description,
      Dimensions: this.buildDimensions()
    };

    try {
      await this.cloudWatch.putMetricAlarm(params).promise();
      this.logger.info('Alarm created/updated', { alarmName: params.AlarmName });
    } catch (error) {
      this.logger.error('Failed to create alarm', { error, alarmName: name });
    }
  }

  /**
   * Track API request
   */
  async trackRequest(request: {
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    userId?: string;
    error?: Error;
  }): Promise<void> {
    // Log the request
    await this.log({
      level: request.error ? 'error' : 'info',
      message: `${request.method} ${request.path} - ${request.statusCode}`,
      context: {
        method: request.method,
        path: request.path,
        statusCode: request.statusCode,
        duration: request.duration,
        userId: request.userId
      },
      error: request.error
    });

    // Record metrics
    await this.recordMetric({
      name: 'api.request.count',
      value: 1,
      unit: 'Count',
      dimensions: {
        method: request.method,
        path: request.path,
        statusCode: request.statusCode.toString()
      }
    });

    await this.recordMetric({
      name: 'api.request.duration',
      value: request.duration,
      unit: 'Milliseconds',
      dimensions: {
        method: request.method,
        path: request.path
      }
    });

    // Track error rate
    if (request.statusCode >= 400) {
      await this.recordMetric({
        name: 'api.request.error',
        value: 1,
        unit: 'Count',
        dimensions: {
          method: request.method,
          path: request.path,
          statusCode: request.statusCode.toString()
        }
      });
    }
  }

  /**
   * Track agent communication
   */
  async trackAgentCommunication(event: {
    sourceAgent: string;
    targetAgent: string;
    eventType: string;
    success: boolean;
    duration: number;
    payload?: any;
    error?: Error;
  }): Promise<void> {
    await this.log({
      level: event.success ? 'info' : 'error',
      message: `Agent communication: ${event.sourceAgent} -> ${event.targetAgent}`,
      context: {
        sourceAgent: event.sourceAgent,
        targetAgent: event.targetAgent,
        eventType: event.eventType,
        success: event.success,
        duration: event.duration,
        payloadSize: event.payload ? JSON.stringify(event.payload).length : 0
      },
      error: event.error
    });

    await this.recordMetric({
      name: 'agent.communication.count',
      value: 1,
      unit: 'Count',
      dimensions: {
        source: event.sourceAgent,
        target: event.targetAgent,
        eventType: event.eventType,
        success: event.success.toString()
      }
    });

    await this.recordMetric({
      name: 'agent.communication.duration',
      value: event.duration,
      unit: 'Milliseconds',
      dimensions: {
        source: event.sourceAgent,
        target: event.targetAgent
      }
    });
  }

  /**
   * Track business metrics
   */
  async trackBusinessMetric(metric: {
    name: string;
    value: number;
    dimensions?: Record<string, string>;
  }): Promise<void> {
    await this.recordMetric({
      name: `business.${metric.name}`,
      value: metric.value,
      unit: 'Count',
      dimensions: metric.dimensions
    });

    // Log significant business events
    if (metric.name.includes('story.created') || metric.name.includes('user.registered')) {
      await this.log({
        level: 'info',
        message: `Business event: ${metric.name}`,
        context: {
          metric: metric.name,
          value: metric.value,
          ...metric.dimensions
        }
      });
    }
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(metric: {
    operation: string;
    duration: number;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.recordMetric({
      name: `performance.${metric.operation}.duration`,
      value: metric.duration,
      unit: 'Milliseconds',
      dimensions: {
        success: metric.success.toString()
      }
    });

    // Alert on slow operations
    if (metric.duration > 5000) {
      await this.log({
        level: 'warn',
        message: `Slow operation detected: ${metric.operation}`,
        context: {
          operation: metric.operation,
          duration: metric.duration,
          ...metric.metadata
        }
      });
    }
  }

  /**
   * Register health check
   */
  async registerHealthCheck(
    service: string,
    checker: () => Promise<{ healthy: boolean; details?: any }>
  ): Promise<void> {
    // Run health check periodically
    setInterval(async () => {
      const start = Date.now();
      try {
        const result = await checker();
        const latency = Date.now() - start;

        const health: HealthCheck = {
          service,
          status: result.healthy ? 'healthy' : 'unhealthy',
          latency,
          lastCheck: new Date(),
          details: result.details
        };

        this.healthChecks.set(service, health);

        // Record health metrics
        await this.recordMetric({
          name: 'health.check.status',
          value: result.healthy ? 1 : 0,
          unit: 'Count',
          dimensions: { service }
        });

        await this.recordMetric({
          name: 'health.check.latency',
          value: latency,
          unit: 'Milliseconds',
          dimensions: { service }
        });

      } catch (error) {
        this.healthChecks.set(service, {
          service,
          status: 'unhealthy',
          latency: Date.now() - start,
          lastCheck: new Date(),
          details: { error: error.message }
        });

        await this.log({
          level: 'error',
          message: `Health check failed for ${service}`,
          error: error as Error
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthCheck[];
  }> {
    const services = Array.from(this.healthChecks.values());
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }

    return { overall, services };
  }

  /**
   * Create CloudWatch dashboard
   */
  async createDashboard(name: string, widgets: DashboardWidget[]): Promise<void> {
    const dashboardBody = {
      widgets: widgets.map(widget => ({
        type: 'metric',
        properties: {
          metrics: widget.metrics?.map(m => [
            this.config.metricsNamespace,
            m,
            { stat: 'Average' }
          ]),
          period: 300,
          stat: 'Average',
          region: this.config.region,
          title: widget.title,
          width: widget.width,
          height: widget.height,
          x: widget.position.x,
          y: widget.position.y
        }
      }))
    };

    try {
      await this.cloudWatch.putDashboard({
        DashboardName: `${this.config.serviceName}-${this.config.environment}-${name}`,
        DashboardBody: JSON.stringify(dashboardBody)
      }).promise();

      this.logger.info('Dashboard created', { dashboardName: name });
    } catch (error) {
      this.logger.error('Failed to create dashboard', { error, dashboardName: name });
    }
  }

  /**
   * Search logs
   */
  async searchLogs(query: {
    startTime: Date;
    endTime: Date;
    filter?: string;
    limit?: number;
  }): Promise<any[]> {
    const params = {
      logGroupName: this.config.cloudWatchLogGroup,
      startTime: query.startTime.getTime(),
      endTime: query.endTime.getTime(),
      filterPattern: query.filter,
      limit: query.limit || 100
    };

    try {
      const result = await this.cloudWatchLogs.filterLogEvents(params).promise();
      return result.events || [];
    } catch (error) {
      this.logger.error('Failed to search logs', { error, query });
      return [];
    }
  }

  /**
   * Get metric statistics
   */
  async getMetricStats(query: {
    metricName: string;
    startTime: Date;
    endTime: Date;
    period?: number;
    stat?: string;
    dimensions?: Record<string, string>;
  }): Promise<any> {
    const params = {
      Namespace: this.config.metricsNamespace,
      MetricName: query.metricName,
      Dimensions: this.buildDimensions(query.dimensions),
      StartTime: query.startTime,
      EndTime: query.endTime,
      Period: query.period || 300,
      Statistics: [query.stat || 'Average']
    };

    try {
      const result = await this.cloudWatch.getMetricStatistics(params).promise();
      return result.Datapoints || [];
    } catch (error) {
      this.logger.error('Failed to get metric statistics', { error, query });
      return [];
    }
  }

  /**
   * Setup default alarms
   */
  async setupDefaultAlarms(): Promise<void> {
    // API error rate alarm
    await this.createAlarm('high-error-rate', {
      metricName: 'api.request.error',
      threshold: 10,
      comparisonOperator: 'GreaterThanThreshold',
      evaluationPeriods: 2,
      period: 300,
      statistic: 'Sum',
      actionsEnabled: true,
      description: 'API error rate is too high'
    });

    // API latency alarm
    await this.createAlarm('high-latency', {
      metricName: 'api.request.duration',
      threshold: 3000,
      comparisonOperator: 'GreaterThanThreshold',
      evaluationPeriods: 2,
      period: 300,
      statistic: 'Average',
      actionsEnabled: true,
      description: 'API latency is too high'
    });

    // Agent communication failure alarm
    await this.createAlarm('agent-communication-failure', {
      metricName: 'agent.communication.count',
      threshold: 5,
      comparisonOperator: 'GreaterThanThreshold',
      evaluationPeriods: 1,
      period: 300,
      statistic: 'Sum',
      actionsEnabled: true,
      description: 'Too many agent communication failures'
    });

    // Health check failure alarm
    await this.createAlarm('health-check-failure', {
      metricName: 'health.check.status',
      threshold: 0.8,
      comparisonOperator: 'LessThanThreshold',
      evaluationPeriods: 2,
      period: 300,
      statistic: 'Average',
      actionsEnabled: true,
      description: 'Health checks are failing'
    });
  }

  /**
   * Track Lambda cold starts
   */
  async trackColdStart(duration: number): Promise<void> {
    await this.recordMetric({
      name: 'lambda.cold_start',
      value: 1,
      unit: 'Count'
    });

    await this.recordMetric({
      name: 'lambda.cold_start.duration',
      value: duration,
      unit: 'Milliseconds'
    });

    await this.log({
      level: 'info',
      message: 'Lambda cold start detected',
      context: { duration }
    });
  }

  /**
   * Track memory usage
   */
  async trackMemoryUsage(): Promise<void> {
    const usage = process.memoryUsage();

    await this.recordMetric({
      name: 'memory.heap.used',
      value: usage.heapUsed,
      unit: 'Bytes'
    });

    await this.recordMetric({
      name: 'memory.heap.total',
      value: usage.heapTotal,
      unit: 'Bytes'
    });

    await this.recordMetric({
      name: 'memory.external',
      value: usage.external,
      unit: 'Bytes'
    });

    // Alert on high memory usage
    const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
    if (heapUsagePercent > 90) {
      await this.log({
        level: 'warn',
        message: 'High memory usage detected',
        context: {
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          percentage: heapUsagePercent
        }
      });
    }
  }

  // Helper methods
  private buildDimensions(additional?: Record<string, string>): any[] {
    const dimensions = [
      { Name: 'Service', Value: this.config.serviceName },
      { Name: 'Environment', Value: this.config.environment }
    ];

    if (this.config.customDimensions) {
      Object.entries(this.config.customDimensions).forEach(([key, value]) => {
        dimensions.push({ Name: key, Value: value });
      });
    }

    if (additional) {
      Object.entries(additional).forEach(([key, value]) => {
        dimensions.push({ Name: key, Value: value });
      });
    }

    return dimensions;
  }

  private async publishErrorEvent(event: LogEvent): Promise<void> {
    try {
      await this.eventBridge.putEvents({
        Entries: [{
          Source: `storytailor.${this.config.serviceName}`,
          DetailType: 'Error Event',
          Detail: JSON.stringify({
            level: event.level,
            message: event.message,
            service: this.config.serviceName,
            environment: this.config.environment,
            timestamp: new Date().toISOString(),
            error: event.error ? {
              name: event.error.name,
              message: event.error.message,
              stack: event.error.stack
            } : undefined,
            context: event.context
          })
        }]
      });
    } catch (error) {
      this.logger.error('Failed to publish error event', { error });
    }
  }
}

/**
 * Custom CloudWatch Logs Transport for Winston
 */
class CloudWatchTransport extends Transport {
  private cloudWatchLogs: CloudWatchLogs;
  private logGroupName: string;
  private logStreamName: string;
  private sequenceToken?: string;

  constructor(options: {
    logGroupName: string;
    logStreamName: string;
    cloudWatchLogs: CloudWatchLogs;
  }) {
    super();
    this.cloudWatchLogs = options.cloudWatchLogs;
    this.logGroupName = options.logGroupName;
    this.logStreamName = options.logStreamName;
    this.ensureLogStream();
  }

  async log(info: any, callback: () => void): Promise<void> {
    const message = JSON.stringify(info);

    try {
      const params: any = {
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [{
          message,
          timestamp: Date.now()
        }]
      };

      if (this.sequenceToken) {
        params.sequenceToken = this.sequenceToken;
      }

      const result = await this.cloudWatchLogs.putLogEvents(params).promise();
      this.sequenceToken = result.nextSequenceToken;

    } catch (error: any) {
      if (error.code === 'InvalidSequenceTokenException') {
        this.sequenceToken = error.expectedSequenceToken;
        // Retry
        await this.log(info, callback);
        return;
      }
      console.error('Failed to send log to CloudWatch:', error);
    }

    callback();
  }

  private async ensureLogStream(): Promise<void> {
    try {
      await this.cloudWatchLogs.createLogStream({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName
      }).promise();
    } catch (error: any) {
      if (error.code !== 'ResourceAlreadyExistsException') {
        console.error('Failed to create log stream:', error);
      }
    }
  }
}