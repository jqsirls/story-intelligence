import { SpanKind } from '@opentelemetry/api';
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
export declare class OpenTelemetryTracer {
    private sdk;
    private logger;
    private config;
    private isInitialized;
    constructor(config: TracingConfig, logger: Logger);
    /**
     * Initialize OpenTelemetry tracing
     */
    initialize(): Promise<void>;
    /**
     * Shutdown OpenTelemetry tracing
     */
    shutdown(): Promise<void>;
    /**
     * Create a new span for tracing an operation
     */
    createSpan(name: string, options?: {
        kind?: SpanKind;
        attributes?: Record<string, string | number | boolean>;
        parentContext?: any;
    }): {
        span: import("@opentelemetry/api").Span;
        setAttributes: (attributes: Record<string, string | number | boolean>) => void;
        setStatus: (success: boolean, message?: string) => void;
        recordException: (error: Error) => void;
        end: () => void;
        run: <T>(fn: () => T) => T;
        runAsync: <T>(fn: () => Promise<T>) => Promise<T>;
    };
    /**
     * Trace an event publishing operation
     */
    traceEventPublish(eventType: string, eventId: string, correlationId?: string, userId?: string): {
        span: import("@opentelemetry/api").Span;
        setAttributes: (attributes: Record<string, string | number | boolean>) => void;
        setStatus: (success: boolean, message?: string) => void;
        recordException: (error: Error) => void;
        end: () => void;
        run: <T>(fn: () => T) => T;
        runAsync: <T>(fn: () => Promise<T>) => Promise<T>;
    };
    /**
     * Trace an event processing operation
     */
    traceEventProcess(eventType: string, eventId: string, correlationId?: string, userId?: string): {
        span: import("@opentelemetry/api").Span;
        setAttributes: (attributes: Record<string, string | number | boolean>) => void;
        setStatus: (success: boolean, message?: string) => void;
        recordException: (error: Error) => void;
        end: () => void;
        run: <T>(fn: () => T) => T;
        runAsync: <T>(fn: () => Promise<T>) => Promise<T>;
    };
    /**
     * Trace a database operation
     */
    traceDatabase(operation: string, table: string, query?: string): {
        span: import("@opentelemetry/api").Span;
        setAttributes: (attributes: Record<string, string | number | boolean>) => void;
        setStatus: (success: boolean, message?: string) => void;
        recordException: (error: Error) => void;
        end: () => void;
        run: <T>(fn: () => T) => T;
        runAsync: <T>(fn: () => Promise<T>) => Promise<T>;
    };
    /**
     * Trace an HTTP request
     */
    traceHttpRequest(method: string, url: string, statusCode?: number): {
        span: import("@opentelemetry/api").Span;
        setAttributes: (attributes: Record<string, string | number | boolean>) => void;
        setStatus: (success: boolean, message?: string) => void;
        recordException: (error: Error) => void;
        end: () => void;
        run: <T>(fn: () => T) => T;
        runAsync: <T>(fn: () => Promise<T>) => Promise<T>;
    };
    /**
     * Trace an agent operation
     */
    traceAgentOperation(agentName: string, operation: string, userId?: string, sessionId?: string): {
        span: import("@opentelemetry/api").Span;
        setAttributes: (attributes: Record<string, string | number | boolean>) => void;
        setStatus: (success: boolean, message?: string) => void;
        recordException: (error: Error) => void;
        end: () => void;
        run: <T>(fn: () => T) => T;
        runAsync: <T>(fn: () => Promise<T>) => Promise<T>;
    };
    /**
     * Get the current trace context for correlation
     */
    getCurrentTraceContext(): string | null;
    /**
     * Create a child span from a parent trace context
     */
    createChildSpan(name: string, parentTraceContext: string, options?: {
        kind?: SpanKind;
        attributes?: Record<string, string | number | boolean>;
    }): {
        span: import("@opentelemetry/api").Span;
        setAttributes: (attributes: Record<string, string | number | boolean>) => void;
        setStatus: (success: boolean, message?: string) => void;
        recordException: (error: Error) => void;
        end: () => void;
        run: <T>(fn: () => T) => T;
        runAsync: <T>(fn: () => Promise<T>) => Promise<T>;
    };
    /**
     * Add correlation ID to all spans in the current context
     */
    setCorrelationId(correlationId: string): void;
    /**
     * Health check for tracing system
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        initialized: boolean;
        exporterConnected: boolean;
        timestamp: string;
    }>;
}
