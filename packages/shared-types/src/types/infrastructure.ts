import { z } from 'zod';

// Redis Cache Types
export const CacheKeySchema = z.object({
  prefix: z.string(),
  userId: z.string(),
  sessionId: z.string().optional(),
  suffix: z.string().optional(),
});

export const CacheEntrySchema = z.object({
  key: z.string(),
  value: z.string(),
  ttl: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

export type CacheKey = z.infer<typeof CacheKeySchema>;
export type CacheEntry = z.infer<typeof CacheEntrySchema>;

// gRPC Service Types
export const ServiceHealthSchema = z.object({
  service: z.string(),
  status: z.enum(['SERVING', 'NOT_SERVING', 'UNKNOWN']),
  timestamp: z.string(),
  version: z.string(),
  uptime: z.number(),
});

export const ServiceMetricsSchema = z.object({
  service: z.string(),
  requestCount: z.number(),
  errorCount: z.number(),
  averageLatency: z.number(),
  p95Latency: z.number(),
  p99Latency: z.number(),
  timestamp: z.string(),
});

export type ServiceHealth = z.infer<typeof ServiceHealthSchema>;
export type ServiceMetrics = z.infer<typeof ServiceMetricsSchema>;

// Circuit Breaker Types
export const CircuitBreakerStateSchema = z.enum(['CLOSED', 'OPEN', 'HALF_OPEN']);

export const CircuitBreakerConfigSchema = z.object({
  failureThreshold: z.number().default(5),
  recoveryTimeout: z.number().default(60000), // 60 seconds
  monitoringPeriod: z.number().default(10000), // 10 seconds
  expectedExceptionTypes: z.array(z.string()).default([]),
});

export const CircuitBreakerStatusSchema = z.object({
  state: CircuitBreakerStateSchema,
  failureCount: z.number(),
  lastFailureTime: z.string().optional(),
  nextAttemptTime: z.string().optional(),
  config: CircuitBreakerConfigSchema,
});

export type CircuitBreakerState = z.infer<typeof CircuitBreakerStateSchema>;
export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;
export type CircuitBreakerStatus = z.infer<typeof CircuitBreakerStatusSchema>;

// Event Bus Types
export const EventSchema = z.object({
  id: z.string(),
  type: z.string(),
  source: z.string(),
  subject: z.string(),
  time: z.string(),
  data: z.record(z.any()),
  correlationId: z.string().optional(),
  userId: z.string().optional(),
});

export const EventHandlerSchema = z.object({
  eventType: z.string(),
  handler: z.string(),
  retryPolicy: z.object({
    maxRetries: z.number().default(3),
    backoffMultiplier: z.number().default(2),
    initialDelay: z.number().default(1000),
  }).optional(),
});

export type Event = z.infer<typeof EventSchema>;
export type EventHandler = z.infer<typeof EventHandlerSchema>;

// Logging Types
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

export const LogEntrySchema = z.object({
  level: LogLevelSchema,
  message: z.string(),
  timestamp: z.string(),
  service: z.string(),
  correlationId: z.string().optional(),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  error: z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
  }).optional(),
});

export type LogLevel = z.infer<typeof LogLevelSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;

// Rate Limiting Types
export const RateLimitConfigSchema = z.object({
  windowMs: z.number(),
  max: z.number(),
  keyGenerator: z.string().optional(),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
});

export const RateLimitStatusSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  resetTime: z.string(),
  retryAfter: z.number().optional(),
});

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export type RateLimitStatus = z.infer<typeof RateLimitStatusSchema>;