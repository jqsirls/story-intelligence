import { Request, Response, NextFunction } from 'express';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { MonitoringOrchestrator } from '../MonitoringOrchestrator';
import { v4 as uuidv4 } from 'uuid';

interface MonitoringContext {
  correlationId: string;
  traceId: string;
  spanId: string;
  userId?: string;
  startTime: number;
}

/**
 * Express middleware for API monitoring
 */
export function createExpressMonitoring(monitor: MonitoringOrchestrator) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const context: MonitoringContext = {
      correlationId: req.headers['x-correlation-id'] as string || uuidv4(),
      traceId: req.headers['x-trace-id'] as string || uuidv4(),
      spanId: uuidv4(),
      userId: req.headers['x-user-id'] as string,
      startTime: Date.now()
    };

    // Attach monitoring context to request
    (req as any).monitoringContext = context;

    // Log request start
    await monitor.log({
      level: 'info',
      message: `Request started: ${req.method} ${req.path}`,
      context: {
        method: req.method,
        path: req.path,
        query: req.query,
        headers: sanitizeHeaders(req.headers),
        ip: req.ip
      },
      correlationId: context.correlationId,
      traceId: context.traceId,
      spanId: context.spanId,
      userId: context.userId
    });

    // Capture response
    const originalSend = res.send;
    res.send = function(data: any) {
      res.send = originalSend;
      
      // Track request completion
      const duration = Date.now() - context.startTime;
      
      monitor.trackRequest({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userId: context.userId,
        error: res.statusCode >= 400 ? new Error(`HTTP ${res.statusCode}`) : undefined
      }).catch(err => console.error('Failed to track request:', err));

      // Log response
      monitor.log({
        level: res.statusCode >= 400 ? 'error' : 'info',
        message: `Request completed: ${req.method} ${req.path} - ${res.statusCode}`,
        context: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          responseSize: Buffer.byteLength(data)
        },
        correlationId: context.correlationId,
        traceId: context.traceId,
        spanId: context.spanId,
        userId: context.userId
      }).catch(err => console.error('Failed to log response:', err));

      return originalSend.call(res, data);
    };

    // Error handling
    res.on('finish', () => {
      if (res.statusCode >= 500) {
        monitor.recordMetric({
          name: 'api.server_error',
          value: 1,
          unit: 'Count',
          dimensions: {
            path: req.path,
            method: req.method
          }
        }).catch(err => console.error('Failed to record error metric:', err));
      }
    });

    next();
  };
}

/**
 * Lambda middleware for monitoring
 */
export function createLambdaMonitoring(monitor: MonitoringOrchestrator) {
  return (handler: (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>) => {
    return async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
      const monitoringContext: MonitoringContext = {
        correlationId: event.headers?.['x-correlation-id'] || uuidv4(),
        traceId: event.headers?.['x-trace-id'] || uuidv4(),
        spanId: uuidv4(),
        userId: event.headers?.['x-user-id'],
        startTime: Date.now()
      };

      // Track Lambda cold start
      if (context.coldStart !== false) {
        await monitor.trackColdStart(Date.now() - monitoringContext.startTime);
      }

      // Log request
      await monitor.log({
        level: 'info',
        message: `Lambda invoked: ${event.httpMethod} ${event.path}`,
        context: {
          method: event.httpMethod,
          path: event.path,
          query: event.queryStringParameters,
          headers: sanitizeHeaders(event.headers),
          requestContext: {
            requestId: context.requestId,
            functionName: context.functionName,
            functionVersion: context.functionVersion,
            memoryLimit: context.memoryLimitInMB,
            remainingTime: context.getRemainingTimeInMillis()
          }
        },
        correlationId: monitoringContext.correlationId,
        traceId: monitoringContext.traceId,
        spanId: monitoringContext.spanId,
        userId: monitoringContext.userId
      });

      try {
        // Execute handler
        const result = await handler(event, context);
        const duration = Date.now() - monitoringContext.startTime;

        // Track request
        await monitor.trackRequest({
          method: event.httpMethod || 'UNKNOWN',
          path: event.path || '/',
          statusCode: result.statusCode,
          duration,
          userId: monitoringContext.userId
        });

        // Log response
        await monitor.log({
          level: 'info',
          message: `Lambda completed: ${event.httpMethod} ${event.path} - ${result.statusCode}`,
          context: {
            statusCode: result.statusCode,
            duration,
            memoryUsed: process.memoryUsage().heapUsed,
            remainingTime: context.getRemainingTimeInMillis()
          },
          correlationId: monitoringContext.correlationId,
          traceId: monitoringContext.traceId,
          spanId: monitoringContext.spanId,
          userId: monitoringContext.userId
        });

        // Track memory usage
        await monitor.trackMemoryUsage();

        return result;

      } catch (error: any) {
        const duration = Date.now() - monitoringContext.startTime;

        // Log error
        await monitor.log({
          level: 'error',
          message: `Lambda error: ${event.httpMethod} ${event.path}`,
          error: error,
          context: {
            method: event.httpMethod,
            path: event.path,
            duration,
            errorType: error.name,
            errorMessage: error.message
          },
          correlationId: monitoringContext.correlationId,
          traceId: monitoringContext.traceId,
          spanId: monitoringContext.spanId,
          userId: monitoringContext.userId
        });

        // Track error
        await monitor.trackRequest({
          method: event.httpMethod || 'UNKNOWN',
          path: event.path || '/',
          statusCode: 500,
          duration,
          userId: monitoringContext.userId,
          error
        });

        // Re-throw to maintain Lambda error behavior
        throw error;
      }
    };
  };
}

/**
 * Agent communication monitoring wrapper
 */
export function monitorAgentCommunication(
  monitor: MonitoringOrchestrator,
  sourceAgent: string
) {
  return (handler: (event: any) => Promise<any>) => {
    return async (event: any): Promise<any> => {
      const startTime = Date.now();
      const targetAgent = event.targetAgent || 'unknown';
      const eventType = event.type || 'unknown';

      try {
        const result = await handler(event);
        const duration = Date.now() - startTime;

        await monitor.trackAgentCommunication({
          sourceAgent,
          targetAgent,
          eventType,
          success: true,
          duration,
          payload: event
        });

        return result;

      } catch (error: any) {
        const duration = Date.now() - startTime;

        await monitor.trackAgentCommunication({
          sourceAgent,
          targetAgent,
          eventType,
          success: false,
          duration,
          payload: event,
          error
        });

        throw error;
      }
    };
  };
}

/**
 * Performance monitoring decorator
 */
export function monitorPerformance(
  monitor: MonitoringOrchestrator,
  operation: string
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const startTime = Date.now();
      const metadata: Record<string, any> = {
        className: target.constructor.name,
        methodName: propertyKey,
        timestamp: new Date().toISOString()
      };

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        await monitor.trackPerformance({
          operation: `${operation}.${propertyKey}`,
          duration,
          success: true,
          metadata
        });

        return result;

      } catch (error: any) {
        const duration = Date.now() - startTime;

        await monitor.trackPerformance({
          operation: `${operation}.${propertyKey}`,
          duration,
          success: false,
          metadata: {
            ...metadata,
            error: error.message
          }
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Business metric tracking helper
 */
export class BusinessMetrics {
  constructor(private monitor: MonitoringOrchestrator) {}

  async trackStoryCreated(userId: string, characterId: string): Promise<void> {
    await this.monitor.trackBusinessMetric({
      name: 'story.created',
      value: 1,
      dimensions: { userId, characterId }
    });
  }

  async trackUserRegistered(userId: string, registrationType: string): Promise<void> {
    await this.monitor.trackBusinessMetric({
      name: 'user.registered',
      value: 1,
      dimensions: { userId, registrationType }
    });
  }

  async trackAudioGenerated(storyId: string, duration: number): Promise<void> {
    await this.monitor.trackBusinessMetric({
      name: 'audio.generated',
      value: 1,
      dimensions: { storyId }
    });

    await this.monitor.recordMetric({
      name: 'audio.duration',
      value: duration,
      unit: 'Milliseconds'
    });
  }

  async trackPurchase(userId: string, amount: number, currency: string): Promise<void> {
    await this.monitor.trackBusinessMetric({
      name: 'purchase.completed',
      value: amount,
      dimensions: { userId, currency }
    });
  }

  async trackCharacterInteraction(userId: string, characterId: string, interactionType: string): Promise<void> {
    await this.monitor.trackBusinessMetric({
      name: 'character.interaction',
      value: 1,
      dimensions: { userId, characterId, interactionType }
    });
  }

  async trackLibraryAccess(userId: string, libraryId: string): Promise<void> {
    await this.monitor.trackBusinessMetric({
      name: 'library.accessed',
      value: 1,
      dimensions: { userId, libraryId }
    });
  }

  async trackSafetyIntervention(userId: string, interventionType: string): Promise<void> {
    await this.monitor.trackBusinessMetric({
      name: 'safety.intervention',
      value: 1,
      dimensions: { userId, interventionType }
    });
  }
}

/**
 * Structured logging helper
 */
export class StructuredLogger {
  constructor(
    private monitor: MonitoringOrchestrator,
    private defaultContext: Record<string, any> = {}
  ) {}

  async debug(message: string, context?: Record<string, any>): Promise<void> {
    await this.monitor.log({
      level: 'debug',
      message,
      context: { ...this.defaultContext, ...context }
    });
  }

  async info(message: string, context?: Record<string, any>): Promise<void> {
    await this.monitor.log({
      level: 'info',
      message,
      context: { ...this.defaultContext, ...context }
    });
  }

  async warn(message: string, context?: Record<string, any>): Promise<void> {
    await this.monitor.log({
      level: 'warn',
      message,
      context: { ...this.defaultContext, ...context }
    });
  }

  async error(message: string, error?: Error, context?: Record<string, any>): Promise<void> {
    await this.monitor.log({
      level: 'error',
      message,
      error,
      context: { ...this.defaultContext, ...context }
    });
  }

  async critical(message: string, error?: Error, context?: Record<string, any>): Promise<void> {
    await this.monitor.log({
      level: 'critical',
      message,
      error,
      context: { ...this.defaultContext, ...context }
    });
  }

  child(context: Record<string, any>): StructuredLogger {
    return new StructuredLogger(
      this.monitor,
      { ...this.defaultContext, ...context }
    );
  }
}

// Helper functions
function sanitizeHeaders(headers: any): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

  for (const [key, value] of Object.entries(headers || {})) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = String(value);
    }
  }

  return sanitized;
}