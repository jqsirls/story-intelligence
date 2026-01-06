# Logging & Audit Patterns

**Structured Logging & Compliance Tracking**

---

## Overview

Storytailor implements:
- Structured JSON logging
- Request correlation
- PII protection
- Audit trail for compliance
- Performance metrics

---

## Structured Logging

### Log Format

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "correlationId": "req_abc123xyz",
  "service": "rest-api-gateway",
  "message": "Request completed",
  "path": "/api/v1/stories",
  "method": "GET",
  "statusCode": 200,
  "duration": 45,
  "userId": "uuid",
  "metadata": {
    "libraryId": "uuid",
    "count": 20
  }
}
```

### Logger Configuration

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'rest-api-gateway',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development'
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : winston.format.json()
    })
  ]
});

// Add CloudWatch transport in production
if (process.env.NODE_ENV === 'production') {
  const CloudWatchTransport = require('winston-cloudwatch');
  logger.add(new CloudWatchTransport({
    logGroupName: '/storytailor/api',
    logStreamName: () => new Date().toISOString().split('T')[0],
    awsRegion: process.env.AWS_REGION
  }));
}
```

---

## Request Logging Middleware

```typescript
import { v4 as uuidv4 } from 'uuid';

function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Generate or use existing correlation ID
  const correlationId = req.headers['x-correlation-id'] as string || 
                        `req_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  const startTime = Date.now();
  
  // Log request
  logger.info('Request received', {
    correlationId,
    method: req.method,
    path: req.path,
    query: sanitizeData(req.query),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    userId: req.userId
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    const logData = {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.userId
    };
    
    if (res.statusCode >= 500) {
      logger.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });
  
  next();
}
```

---

## PII Protection

### Sanitization Rules

```typescript
const PII_FIELDS = [
  'password', 'token', 'secret', 'apiKey', 'ssn',
  'email', 'phone', 'creditCard', 'address',
  'birthDate', 'parentEmail'
];

const PII_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD]' },
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, replacement: '[SSN]' }
];

function sanitizeData(data: any, depth = 0): any {
  if (depth > 10) return '[MAX_DEPTH]';
  
  if (typeof data === 'string') {
    let sanitized = data;
    for (const { pattern, replacement } of PII_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }
  
  if (data && typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (PII_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value, depth + 1);
      }
    }
    return sanitized;
  }
  
  return data;
}

// SHA-256 tokenization for PII that needs to be searchable
import crypto from 'crypto';

function tokenizePII(value: string): string {
  const salt = process.env.PII_SALT || 'storytailor';
  return crypto
    .createHash('sha256')
    .update(salt + value.toLowerCase())
    .digest('hex')
    .substring(0, 32);
}
```

---

## Audit Logging

### Audit Events

| Event | Description | Required Data |
|-------|-------------|---------------|
| `user.login` | User authenticated | userId, ip, method |
| `user.logout` | User signed out | userId |
| `user.created` | New account | userId, email (tokenized) |
| `story.created` | Story generated | storyId, characterId |
| `story.deleted` | Story removed | storyId, soft/hard |
| `library.shared` | Library shared | libraryId, targetEmail |
| `subscription.changed` | Plan changed | oldPlan, newPlan |
| `consent.granted` | COPPA consent | profileId, parentId |
| `data.exported` | Data export | exportId, format |
| `admin.action` | Admin operation | action, targetId |

### Audit Logger

```typescript
interface AuditEvent {
  event: string;
  userId: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

async function auditLog(event: AuditEvent): Promise<void> {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      event: event.event,
      user_id: event.userId,
      target_id: event.targetId,
      target_type: event.targetType,
      metadata: sanitizeData(event.metadata),
      ip_address: event.ip,
      user_agent: event.userAgent,
      created_at: new Date().toISOString()
    });
  
  if (error) {
    logger.error('Failed to write audit log', {
      event: event.event,
      error: error.message
    });
  }
  
  // Also log to CloudWatch for compliance
  logger.info('Audit event', {
    type: 'audit',
    ...sanitizeData(event)
  });
}

// Audit middleware for sensitive endpoints
function auditEndpoint(eventName: string, getTargetId?: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        auditLog({
          event: eventName,
          userId: req.userId,
          targetId: getTargetId?.(req),
          targetType: req.baseUrl.split('/').pop(),
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          },
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
    });
    next();
  };
}

// Usage
app.delete('/api/v1/stories/:storyId',
  authMiddleware,
  auditEndpoint('story.deleted', req => req.params.storyId),
  deleteStoryHandler
);
```

---

## Performance Logging

```typescript
// Track slow operations
function performanceLogger(threshold = 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime();
    
    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds * 1000 + nanoseconds / 1000000;
      
      if (duration > threshold) {
        logger.warn('Slow request detected', {
          correlationId: req.correlationId,
          path: req.path,
          method: req.method,
          duration: Math.round(duration),
          threshold,
          userId: req.userId
        });
      }
      
      // Emit metrics
      if (process.env.METRICS_ENABLED) {
        emitMetric('api.request.duration', duration, {
          path: req.route?.path || req.path,
          method: req.method,
          status: res.statusCode.toString()
        });
      }
    });
    
    next();
  };
}
```

---

## Log Queries

### CloudWatch Insights Queries

```sql
-- Failed requests in last hour
fields @timestamp, correlationId, path, statusCode, @message
| filter statusCode >= 500
| sort @timestamp desc
| limit 100

-- Slow requests (>2s)
fields @timestamp, correlationId, path, duration
| filter duration > 2000
| stats avg(duration), max(duration), count(*) by path
| sort avg desc

-- User activity
fields @timestamp, event, userId, targetType
| filter ispresent(event)
| stats count(*) as events by event
| sort events desc

-- Error breakdown
fields @timestamp, @message
| filter level = 'error'
| parse @message /code": "(?<errorCode>ERR_\d+)"/
| stats count(*) by errorCode
| sort count desc
```

---

## Retention Policy

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Request logs | 30 days | CloudWatch |
| Error logs | 90 days | CloudWatch |
| Audit logs | 7 years | Supabase + S3 |
| Performance metrics | 14 days | CloudWatch Metrics |
| Debug logs | 7 days | CloudWatch |

---

**Last Updated**: December 23, 2025

