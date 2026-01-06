# Error Handling Patterns

**Consistent Error Responses & Recovery**

---

## Standard Error Response

All API errors follow this format:

```typescript
interface APIError {
  success: false;
  error: string;       // Human-readable message
  code: string;        // Machine-readable code (ERR_XXXX)
  details?: object;    // Optional additional context
  correlationId?: string; // Request tracking ID
}
```

### Example

```json
{
  "success": false,
  "error": "Story not found",
  "code": "ERR_3001",
  "details": {
    "resource": "story",
    "id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "correlationId": "req_abc123xyz"
}
```

---

## Error Code Registry

### Authentication Errors (1xxx)

| Code | HTTP | Description |
|------|------|-------------|
| `ERR_1001` | 401 | Missing or invalid authorization |
| `ERR_1002` | 401 | Token format invalid |
| `ERR_1003` | 401 | Token expired |
| `ERR_1004` | 403 | Insufficient permissions |
| `ERR_1005` | 403 | COPPA consent required |
| `ERR_1006` | 403 | Account suspended |
| `ERR_1007` | 403 | Email not verified |

### Validation Errors (2xxx)

| Code | HTTP | Description |
|------|------|-------------|
| `ERR_2001` | 400 | Validation failed |
| `ERR_2002` | 400 | Required field missing |
| `ERR_2003` | 400 | Invalid field format |
| `ERR_2004` | 400 | Value out of range |
| `ERR_2005` | 400 | Invalid enum value |
| `ERR_2006` | 400 | Invalid UUID format |

### Resource Errors (3xxx)

| Code | HTTP | Description |
|------|------|-------------|
| `ERR_3001` | 404 | Resource not found |
| `ERR_3002` | 409 | Resource already exists |
| `ERR_3003` | 409 | Conflict - resource modified |
| `ERR_3004` | 410 | Resource deleted |
| `ERR_3005` | 423 | Resource locked |

### Rate Limiting Errors (4xxx)

| Code | HTTP | Description |
|------|------|-------------|
| `ERR_4001` | 429 | Rate limit exceeded |
| `ERR_4002` | 429 | Quota exceeded |
| `ERR_4003` | 429 | Concurrent request limit |
| `ERR_4004` | 503 | Service temporarily unavailable |

### Server Errors (5xxx)

| Code | HTTP | Description |
|------|------|-------------|
| `ERR_5001` | 500 | Internal server error |
| `ERR_5002` | 502 | Upstream service error |
| `ERR_5003` | 503 | Service unavailable |
| `ERR_5004` | 504 | Timeout |
| `ERR_5005` | 500 | Database error |

### Business Logic Errors (6xxx)

| Code | HTTP | Description |
|------|------|-------------|
| `ERR_6001` | 402 | Subscription required |
| `ERR_6002` | 403 | Feature not available for tier |
| `ERR_6003` | 400 | Invalid operation state |
| `ERR_6004` | 400 | Transfer already processed |
| `ERR_6005` | 400 | Generation in progress |

---

## Error Handler Implementation

```typescript
// Global error handler
function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const correlationId = req.headers['x-correlation-id'] || 
                        `req_${Date.now().toString(36)}`;
  
  // Log error with context
  logger.error('API Error', {
    correlationId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.userId,
    body: sanitizeBody(req.body)
  });
  
  // Determine error type and response
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'ERR_2001',
      details: err.details,
      correlationId
    });
  }
  
  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: err.message,
      code: 'ERR_3001',
      details: { resource: err.resource, id: err.resourceId },
      correlationId
    });
  }
  
  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      success: false,
      error: err.message,
      code: err.code || 'ERR_1001',
      correlationId
    });
  }
  
  if (err instanceof RateLimitError) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      code: 'ERR_4001',
      details: {
        limit: err.limit,
        remaining: 0,
        resetAt: err.resetAt
      },
      correlationId
    });
  }
  
  // Default to 500 for unhandled errors
  return res.status(500).json({
    success: false,
    error: 'An unexpected error occurred',
    code: 'ERR_5001',
    correlationId
  });
}
```

---

## Custom Error Classes

```typescript
class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: object
  ) {
    super(message);
    this.name = 'APIError';
  }
}

class ValidationError extends APIError {
  constructor(message: string, details?: object) {
    super(message, 'ERR_2001', 400, details);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends APIError {
  constructor(
    public resource: string,
    public resourceId: string
  ) {
    super(`${resource} not found`, 'ERR_3001', 404, { resource, id: resourceId });
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends APIError {
  constructor(message = 'Unauthorized', code = 'ERR_1001') {
    super(message, code, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends APIError {
  constructor(message = 'Forbidden', code = 'ERR_1004') {
    super(message, code, 403);
    this.name = 'ForbiddenError';
  }
}

class RateLimitError extends APIError {
  constructor(
    public limit: number,
    public resetAt: string
  ) {
    super('Rate limit exceeded', 'ERR_4001', 429, { limit, resetAt });
    this.name = 'RateLimitError';
  }
}
```

---

## Validation Error Details

```typescript
// Joi validation with detailed errors
function validateRequest(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
        type: d.type
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'ERR_2001',
        details: { fields: details }
      });
    }
    
    req.body = value;
    next();
  };
}

// Example response
{
  "success": false,
  "error": "Validation failed",
  "code": "ERR_2001",
  "details": {
    "fields": [
      {
        "field": "email",
        "message": "\"email\" must be a valid email",
        "type": "string.email"
      },
      {
        "field": "name",
        "message": "\"name\" is required",
        "type": "any.required"
      }
    ]
  }
}
```

---

## Client-Side Error Handling

### Wized Error Handler

```javascript
// Global error handler for Wized requests
window.Wized.push((Wized) => {
  Wized.on('requestError', (event) => {
    const { error, request } = event;
    const response = error.response?.data;
    
    // Handle by error code
    switch (response?.code) {
      case 'ERR_1003': // Token expired
        handleTokenExpiry();
        break;
      case 'ERR_4001': // Rate limited
        showRateLimitMessage(response.details);
        break;
      case 'ERR_6001': // Subscription required
        showUpgradePrompt();
        break;
      default:
        showGenericError(response?.error || 'An error occurred');
    }
  });
});

function handleTokenExpiry() {
  // Try to refresh token
  Wized.requests.execute('refreshToken')
    .then(() => {
      // Retry original request
      location.reload();
    })
    .catch(() => {
      // Redirect to login
      window.location.href = '/login';
    });
}

function showRateLimitMessage(details) {
  const resetTime = new Date(details.resetAt).toLocaleTimeString();
  alert(`Rate limit exceeded. Please try again after ${resetTime}`);
}
```

---

## Retry Strategies

```typescript
// Exponential backoff for transient errors
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryableCodes?: string[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    retryableCodes = ['ERR_5002', 'ERR_5003', 'ERR_5004', 'ERR_4004']
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if retryable
      if (!retryableCodes.includes(error.code)) {
        throw error;
      }
      
      // Don't retry after max attempts
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

---

## Error Logging

```typescript
// Structured error logging
function logError(error: Error, context: object) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    code: (error as APIError).code,
    stack: error.stack,
    ...context,
    // Mask sensitive data
    body: context.body ? maskSensitiveFields(context.body) : undefined
  };
  
  // Log to CloudWatch/console
  console.error(JSON.stringify(logEntry));
  
  // Send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: context });
  }
}

function maskSensitiveFields(obj: object): object {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'ssn'];
  const masked = { ...obj };
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***REDACTED***';
    }
  }
  
  return masked;
}
```

---

**Last Updated**: December 23, 2025

