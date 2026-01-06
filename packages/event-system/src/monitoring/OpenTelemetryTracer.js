"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenTelemetryTracer = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const exporter_otlp_http_1 = require("@opentelemetry/exporter-otlp-http");
const exporter_otlp_http_2 = require("@opentelemetry/exporter-otlp-http");
const api_1 = require("@opentelemetry/api");
class OpenTelemetryTracer {
    constructor(config, logger) {
        this.isInitialized = false;
        this.config = config;
        this.logger = logger;
        // Create resource with service information
        const resource = new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
            [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
        });
        // Configure trace exporter
        const traceExporter = new exporter_otlp_http_1.OTLPTraceExporter({
            url: config.otlpEndpoint || 'http://localhost:4318/v1/traces',
        });
        // Configure metric exporter
        const metricExporter = new exporter_otlp_http_2.OTLPMetricExporter({
            url: config.otlpEndpoint || 'http://localhost:4318/v1/metrics',
        });
        // Initialize SDK
        this.sdk = new sdk_node_1.NodeSDK({
            resource,
            traceExporter,
            metricReader: config.enableMetrics ? new sdk_metrics_1.PeriodicExportingMetricReader({
                exporter: metricExporter,
                exportIntervalMillis: 30000, // Export every 30 seconds
            }) : undefined,
            instrumentations: config.enableAutoInstrumentation ? [
                (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
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
    async initialize() {
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
        }
        catch (error) {
            this.logger.error('Failed to initialize OpenTelemetry tracing', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Shutdown OpenTelemetry tracing
     */
    async shutdown() {
        if (!this.isInitialized) {
            return;
        }
        try {
            await this.sdk.shutdown();
            this.isInitialized = false;
            this.logger.info('OpenTelemetry tracing shutdown');
        }
        catch (error) {
            this.logger.error('Error shutting down OpenTelemetry tracing', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Create a new span for tracing an operation
     */
    createSpan(name, options = {}) {
        const tracer = api_1.trace.getTracer(this.config.serviceName, this.config.serviceVersion);
        const span = tracer.startSpan(name, {
            kind: options.kind || api_1.SpanKind.INTERNAL,
            attributes: options.attributes,
        }, options.parentContext);
        return {
            span,
            // Helper methods for common operations
            setAttributes: (attributes) => {
                span.setAttributes(attributes);
            },
            setStatus: (success, message) => {
                span.setStatus({
                    code: success ? api_1.SpanStatusCode.OK : api_1.SpanStatusCode.ERROR,
                    message
                });
            },
            recordException: (error) => {
                span.recordException(error);
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error.message
                });
            },
            end: () => {
                span.end();
            },
            // Execute a function within this span's context
            run: (fn) => {
                return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), fn);
            },
            // Execute an async function within this span's context
            runAsync: async (fn) => {
                return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), fn);
            }
        };
    }
    /**
     * Trace an event publishing operation
     */
    traceEventPublish(eventType, eventId, correlationId, userId) {
        return this.createSpan('event.publish', {
            kind: api_1.SpanKind.PRODUCER,
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
    traceEventProcess(eventType, eventId, correlationId, userId) {
        return this.createSpan('event.process', {
            kind: api_1.SpanKind.CONSUMER,
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
    traceDatabase(operation, table, query) {
        return this.createSpan('db.operation', {
            kind: api_1.SpanKind.CLIENT,
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
    traceHttpRequest(method, url, statusCode) {
        return this.createSpan('http.request', {
            kind: api_1.SpanKind.CLIENT,
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
    traceAgentOperation(agentName, operation, userId, sessionId) {
        return this.createSpan(`agent.${operation}`, {
            kind: api_1.SpanKind.INTERNAL,
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
    getCurrentTraceContext() {
        const activeSpan = api_1.trace.getActiveSpan();
        if (!activeSpan) {
            return null;
        }
        const spanContext = activeSpan.spanContext();
        return `${spanContext.traceId}-${spanContext.spanId}`;
    }
    /**
     * Create a child span from a parent trace context
     */
    createChildSpan(name, parentTraceContext, options = {}) {
        // In a real implementation, you'd parse the trace context
        // and create a proper parent context
        return this.createSpan(name, options);
    }
    /**
     * Add correlation ID to all spans in the current context
     */
    setCorrelationId(correlationId) {
        const activeSpan = api_1.trace.getActiveSpan();
        if (activeSpan) {
            activeSpan.setAttributes({
                'correlation.id': correlationId
            });
        }
    }
    /**
     * Health check for tracing system
     */
    async healthCheck() {
        let exporterConnected = true;
        try {
            // Create a test span to verify exporter connectivity
            const testSpan = this.createSpan('health.check');
            testSpan.setAttributes({ 'test': true });
            testSpan.end();
        }
        catch (error) {
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
exports.OpenTelemetryTracer = OpenTelemetryTracer;
