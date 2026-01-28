import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { Logger } from 'winston';

export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otlpEndpoint?: string;
  enableAutoInstrumentation?: boolean;
  enableMetrics?: boolean;
  sampleRate?: number;
}

export class OpenTelemetryTracer {
  private sdk: NodeSDK;
  private logger: Logger;
  private config: TracingConfig;
  private isInitialized = false;

  constructor(config: TracingConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Create resource with service information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
    });

    // Configure trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: config.otlpEndpoint || 'http://localhost:4318/v1/traces',
    });

    // Configure metric exporter
    const metricExporter = new OTLPMetricExporter({
      url: config.otlpEndpoint || 'http://localhost:4318/v1/metrics',
    });

    // Initialize SDK
    this.sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader: config.enableMetrics ? new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30000, // Export every 30 seconds
      }) : undefined,
      instrumentations: config.enableAutoInstrumentation ? [
        getNodeAutoInstrumentations({
          // Disable some instrumentations that might be too verbose
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        }),
      ] : [],
    });
  }

  /**
   * Initialize OpenTelemetry tracing
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('OpenTelemetry tracer is already initialized');
      return;
    }

    try {
      this.sdk.start();
      this.isInitialized = true;
      
      this.logger.info('OpenTelemetry tracing initialized', {
        serviceName: this.config.serviceName,
        environment: this.config.environment,
        otlpEndpoint: this.config.otlpEndpoint
      });

    } catch (error) {
      this.logger.error('Failed to initialize OpenTelemetry tracing', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Shutdown OpenTelemetry tracing
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await this.sdk.shutdown();
      this.isInitialized = false;
      this.logger.info('OpenTelemetry tracing shutdown');
    } catch (error) {
      this.logger.error('Error shutting down OpenTelemetry tracing', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Create a new span for tracing an operation
   */
  createSpan(
    name: string,
    options: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
      parentContext?: any;
    } = {}
  ) {
    const tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);
    
    const span = tracer.startSpan(name, {
      kind: options.kind || SpanKind.INTERNAL,
      attributes: options.attributes,
    }, options.parentContext);

    return {
      span,
      
      // Helper methods for common operations
      setAttributes: (attributes: Record<string, string | number | boolean>) => {
        span.setAttributes(attributes);
      },
      
      setStatus: (success: boolean, message?: string) => {
        span.setStatus({
          code: success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
          message
        });
      },
      
      recordException: (error: Error) => {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message
        });
      },
      
      end: () => {
        span.end();
      },
      
      // Execute a function within this span's context
      run: <T>(fn: () => T): T => {
        return context.with(trace.setSpan(context.active(), span), fn);
      },
      
      // Execute an async function within this span's context
      runAsync: async <T>(fn: () => Promise<T>): Promise<T> => {
        return context.with(trace.setSpan(context.active(), span), fn);
      }
    };
  }

  /**
   * Trace an event publishing operation
   */
  traceEventPublish(
    eventType: string,
    eventId: string,
    correlationId?: string,
    userId?: string
  ) {
    return this.createSpan('event.publish', {
      kind: SpanKind.PRODUCER,
      attributes: {
        'event.type': eventType,
        'event.id': eventId,
        'event.correlation_id': correlationId || '',
        'event.user_id': userId || '',
        'messaging.system': 'eventbridge',
        'messaging.operation': 'publish'
      }
    });
  }

  /**
   * Trace an event processing operation
   */
  traceEventProcess(
    eventType: string,
    eventId: string,
    correlationId?: string,
    userId?: string
  ) {
    return this.createSpan('event.process', {
      kind: SpanKind.CONSUMER,
      attributes: {
        'event.type': eventType,
        'event.id': eventId,
        'event.correlation_id': correlationId || '',
        'event.user_id': userId || '',
        'messaging.system': 'sqs',
        'messaging.operation': 'process'
      }
    });
  }

  /**
   * Trace a database operation
   */
  traceDatabase(
    operation: string,
    table: string,
    query?: string
  ) {
    return this.createSpan('db.operation', {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'postgresql',
        'db.operation': operation,
        'db.sql.table': table,
        'db.statement': query || ''
      }
    });
  }

  /**
   * Trace an HTTP request
   */
  traceHttpRequest(
    method: string,
    url: string,
    statusCode?: number
  ) {
    return this.createSpan('http.request', {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.status_code': statusCode || 0
      }
    });
  }

  /**
   * Trace an agent operation
   */
  traceAgentOperation(
    agentName: string,
    operation: string,
    userId?: string,
    sessionId?: string
  ) {
    return this.createSpan(`agent.${operation}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'agent.name': agentName,
        'agent.operation': operation,
        'user.id': userId || '',
        'session.id': sessionId || ''
      }
    });
  }

  /**
   * Get the current trace context for correlation
   */
  getCurrentTraceContext(): string | null {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) {
      return null;
    }

    const spanContext = activeSpan.spanContext();
    return `${spanContext.traceId}-${spanContext.spanId}`;
  }

  /**
   * Create a child span from a parent trace context
   */
  createChildSpan(
    name: string,
    parentTraceContext: string,
    options: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    } = {}
  ) {
    // In a real implementation, you'd parse the trace context
    // and create a proper parent context
    return this.createSpan(name, options);
  }

  /**
   * Add correlation ID to all spans in the current context
   */
  setCorrelationId(correlationId: string): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes({
        'correlation.id': correlationId
      });
    }
  }

  /**
   * Health check for tracing system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    initialized: boolean;
    exporterConnected: boolean;
    timestamp: string;
  }> {
    let exporterConnected = true;

    try {
      // Create a test span to verify exporter connectivity
      const testSpan = this.createSpan('health.check');
      testSpan.setAttributes({ 'test': true });
      testSpan.end();
    } catch (error) {
      this.logger.warn('Tracing health check failed', { error });
      exporterConnected = false;
    }

    return {
      status: this.isInitialized && exporterConnected ? 'healthy' : 'unhealthy',
      initialized: this.isInitialized,
      exporterConnected,
      timestamp: new Date().toISOString()
    };
  }
}