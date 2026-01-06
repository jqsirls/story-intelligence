export { MonitoringOrchestrator } from './MonitoringOrchestrator';
export type { 
  MonitoringConfig,
  MetricEvent,
  LogEvent,
  AlertConfig,
  HealthCheck,
  DashboardWidget 
} from './MonitoringOrchestrator';

export {
  createExpressMonitoring,
  createLambdaMonitoring,
  monitorAgentCommunication,
  monitorPerformance,
  BusinessMetrics,
  StructuredLogger
} from './middleware/MonitoringMiddleware';

// Re-export common types
export type { 
  Request, 
  Response, 
  NextFunction 
} from 'express';

export type { 
  APIGatewayProxyEvent, 
  APIGatewayProxyResult, 
  Context 
} from 'aws-lambda';

/**
 * Factory function to create monitoring instance with default configuration
 */
export function createMonitoring(serviceName: string, customConfig?: Partial<MonitoringConfig>) {
  const defaultConfig = {
    serviceName,
    environment: process.env.ENVIRONMENT || 'development',
    region: process.env.AWS_REGION || 'us-east-1',
    cloudWatchLogGroup: `/aws/lambda/${serviceName}`,
    cloudWatchLogStream: `${serviceName}-${Date.now()}`,
    metricsNamespace: 'Storytailor',
    enableTracing: process.env.ENABLE_TRACING === 'true',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    enableLogs: process.env.ENABLE_LOGS !== 'false',
    alertingEnabled: process.env.ENABLE_ALERTING === 'true',
    customDimensions: {
      version: process.env.SERVICE_VERSION || '1.0.0'
    }
  };

  return new MonitoringOrchestrator({
    ...defaultConfig,
    ...customConfig
  });
}

/**
 * Monitoring presets for different agent types
 */
export const MonitoringPresets = {
  /**
   * Router agent monitoring configuration
   */
  router: {
    metricsNamespace: 'Storytailor/Router',
    customDimensions: {
      agentType: 'router'
    }
  },

  /**
   * Content generation agent monitoring
   */
  contentAgent: {
    metricsNamespace: 'Storytailor/Content',
    customDimensions: {
      agentType: 'content'
    }
  },

  /**
   * Auth agent monitoring with enhanced security tracking
   */
  authAgent: {
    metricsNamespace: 'Storytailor/Auth',
    alertingEnabled: true,
    customDimensions: {
      agentType: 'auth'
    }
  },

  /**
   * Child safety agent with critical alerting
   */
  childSafetyAgent: {
    metricsNamespace: 'Storytailor/Safety',
    alertingEnabled: true,
    customDimensions: {
      agentType: 'child-safety',
      critical: 'true'
    }
  },

  /**
   * Commerce agent with transaction tracking
   */
  commerceAgent: {
    metricsNamespace: 'Storytailor/Commerce',
    alertingEnabled: true,
    customDimensions: {
      agentType: 'commerce'
    }
  }
};

/**
 * Standard health checks for agents
 */
export const StandardHealthChecks = {
  /**
   * Database connectivity check
   */
  database: (dbClient: any) => async () => {
    try {
      await dbClient.raw('SELECT 1');
      return { healthy: true };
    } catch (error) {
      return { 
        healthy: false, 
        details: { error: error.message } 
      };
    }
  },

  /**
   * Redis connectivity check
   */
  redis: (redisClient: any) => async () => {
    try {
      await redisClient.ping();
      return { healthy: true };
    } catch (error) {
      return { 
        healthy: false, 
        details: { error: error.message } 
      };
    }
  },

  /**
   * External API health check
   */
  externalApi: (apiUrl: string, timeout: number = 5000) => async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(apiUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      return { 
        healthy: response.ok,
        details: { 
          status: response.status,
          statusText: response.statusText 
        }
      };
    } catch (error) {
      return { 
        healthy: false, 
        details: { error: error.message } 
      };
    }
  },

  /**
   * AWS service health check
   */
  awsService: (service: any, operation: string) => async () => {
    try {
      await service[operation]().promise();
      return { healthy: true };
    } catch (error) {
      return { 
        healthy: false, 
        details: { 
          service: service.constructor.name,
          operation,
          error: error.message 
        } 
      };
    }
  }
};

/**
 * Common metric names used across the system
 */
export const MetricNames = {
  // API metrics
  API_REQUEST_COUNT: 'api.request.count',
  API_REQUEST_DURATION: 'api.request.duration',
  API_REQUEST_ERROR: 'api.request.error',
  
  // Agent communication
  AGENT_COMM_COUNT: 'agent.communication.count',
  AGENT_COMM_DURATION: 'agent.communication.duration',
  AGENT_COMM_ERROR: 'agent.communication.error',
  
  // Business metrics
  STORY_CREATED: 'business.story.created',
  USER_REGISTERED: 'business.user.registered',
  AUDIO_GENERATED: 'business.audio.generated',
  PURCHASE_COMPLETED: 'business.purchase.completed',
  
  // Performance metrics
  COLD_START: 'lambda.cold_start',
  COLD_START_DURATION: 'lambda.cold_start.duration',
  MEMORY_HEAP_USED: 'memory.heap.used',
  MEMORY_HEAP_TOTAL: 'memory.heap.total',
  
  // Health metrics
  HEALTH_CHECK_STATUS: 'health.check.status',
  HEALTH_CHECK_LATENCY: 'health.check.latency'
};

/**
 * Common log contexts
 */
export const LogContexts = {
  /**
   * Add request context to logs
   */
  request: (req: any) => ({
    method: req.method,
    path: req.path || req.url,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers?.['user-agent'],
    referer: req.headers?.referer
  }),

  /**
   * Add Lambda context to logs
   */
  lambda: (context: any) => ({
    requestId: context.requestId,
    functionName: context.functionName,
    functionVersion: context.functionVersion,
    memoryLimit: context.memoryLimitInMB,
    remainingTime: context.getRemainingTimeInMillis?.()
  }),

  /**
   * Add error context to logs
   */
  error: (error: Error) => ({
    errorType: error.name,
    errorMessage: error.message,
    errorStack: error.stack
  }),

  /**
   * Add user context to logs
   */
  user: (userId?: string, sessionId?: string) => ({
    userId,
    sessionId
  })
};

/**
 * Monitoring utilities
 */
export const MonitoringUtils = {
  /**
   * Calculate percentile from array of numbers
   */
  percentile: (values: number[], p: number): number => {
    if (values.length === 0) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  },

  /**
   * Format bytes for human readability
   */
  formatBytes: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Create correlation ID if not present
   */
  ensureCorrelationId: (headers: any): string => {
    return headers?.['x-correlation-id'] || 
           headers?.['x-request-id'] || 
           `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};