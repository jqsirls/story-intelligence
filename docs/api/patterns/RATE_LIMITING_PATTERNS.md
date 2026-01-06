# Rate Limiting Patterns

> **Version**: 1.0  
> **Last Updated**: December 23, 2025  
> **Status**: Canonical Reference

**Protecting APIs from Abuse and Ensuring Fair Usage**

---

## Overview

Rate limiting protects the API from:
- Denial of service attacks
- Runaway client scripts
- Fair usage enforcement
- Cost control for expensive operations

---

## 1. Complete Rate/Quota Matrix

### 1.1 Request Rate Limits by Tier

| Tier | Requests/Min | Requests/Hour | Burst (10s) | Concurrent |
|------|--------------|---------------|-------------|------------|
| Free | 30 | 1,000 | 10 | 2 |
| Plus | 60 | 3,000 | 20 | 5 |
| Pro | 120 | 10,000 | 50 | 10 |
| Enterprise | 500 | 50,000 | 200 | 50 |

### 1.2 Generation Quotas by Tier

| Tier | Stories/Month | Audio/Month | Characters/Month | Regenerations/Month |
|------|---------------|-------------|------------------|---------------------|
| Free | 3 | 3 | 5 | 1 |
| Plus | 20 | 20 | 30 | 10 |
| Pro | 100 | 100 | Unlimited | 50 |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited |

### 1.3 Real-Time Connection Limits

| Tier | SSE Connections | Supabase Subscriptions | Idle Timeout |
|------|-----------------|------------------------|--------------|
| Free | 2 | 5 | 2 min |
| Plus | 5 | 10 | 5 min |
| Pro | 10 | 25 | 10 min |
| Enterprise | 50 | 100 | 30 min |

### 1.4 Per-Endpoint Rate Limits

| Endpoint Category | Requests/Min | Notes |
|-------------------|--------------|-------|
| **Authentication** | | |
| `POST /auth/login` | 5 | Per IP |
| `POST /auth/forgot-password` | 3 | Per email |
| `POST /auth/refresh` | 30 | Per token |
| **Read Operations** | | |
| `GET /stories` | 120 | Per user |
| `GET /stories/:id` | 300 | Per user |
| `GET /characters` | 120 | Per user |
| `GET /emotions/*` | 60 | Per user |
| **Write Operations** | | |
| `POST /stories` | 10 | Per user |
| `PUT /stories/:id` | 30 | Per user |
| `DELETE /stories/:id` | 10 | Per user |
| **Generation Operations** | | |
| `POST /stories/:id/assets/generate` | 5 | Consumes quota |
| `POST /stories/:id/assets/regenerate` | 3 | Consumes quota |
| `POST /stories/:id/audio` | 5 | Consumes quota |
| `POST /stories/:id/assets/:id/retry` | 10 | NO quota (retry) |
| **Search** | | |
| `GET /search` | 30 | Per user |
| `GET /catalog/*` | 60 | Cached |
| **Smart Home** | | |
| `PUT /hue/intensity` | 10 | Per session |
| `POST /hue/connect` | 5 | Per user |

### 1.5 Device Class Limits

| Device Class | Request Modifier | Notes |
|--------------|------------------|-------|
| Web Browser | 1x | Standard limits |
| Mobile App | 1.5x | Higher limits for offline sync |
| Alexa/Voice | 0.5x | Lower limits (rate-limited by voice) |
| IoT/Smart Home | 0.25x | Minimal API calls |
| Server/API | 2x | Higher for B2B integrations |

### 1.6 Organization Limits (B2B)

| Org Size | Seats | Shared Quota Multiplier | Concurrent Users |
|----------|-------|-------------------------|------------------|
| Small | 1-10 | 1x per seat | 5 |
| Medium | 11-50 | 0.8x per seat | 25 |
| Large | 51-200 | 0.6x per seat | 100 |
| Enterprise | 200+ | Custom | Custom |

---

## 2. Quota vs Request Rate

### 2.1 What Consumes Quota

| Operation | Quota Type | Cost | Refundable |
|-----------|------------|------|------------|
| Create story | Story quota | 1 | Yes (if failed) |
| Generate audio | Audio quota | 1 | Yes (if failed) |
| Regenerate assets | Story quota | 1 | No (intentional) |
| Create character | Character quota | 1 | No |
| Retry failed asset | None | 0 | N/A |

### 2.2 What Consumes Request Rate Only

| Operation | Notes |
|-----------|-------|
| Read any resource | GET requests |
| Update metadata | PUT requests |
| Delete resources | DELETE requests |
| Search | GET /search |
| SSE subscribe | Connection establishment |

### 2.3 Quota Reservation Flow

```
1. Request received → Quota checked
2. If quota available → Reserve 1 credit
3. Process request
4. If success → Credit consumed
5. If failure → Credit held for retry (24h)
6. If retry succeeds → Credit consumed
7. If retry fails or expires → Credit refunded
```

---

## 3. Rate Limit Tiers (Legacy Format)

| Tier | Requests/Min | Concurrent | Generation/Day |
|------|--------------|------------|----------------|
| Free | 30 | 2 | 5 |
| Starter | 60 | 5 | 20 |
| Family | 120 | 10 | 50 |
| Premium | 300 | 25 | 200 |
| B2B Basic | 500 | 50 | 500 |
| B2B Pro | 1000 | 100 | Unlimited |

---

## Implementation

### Redis-Based Rate Limiter

```typescript
import Redis from 'ioredis';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

class RateLimiter {
  private redis: Redis;
  
  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }
  
  async checkLimit(
    identifier: string,
    limit: number,
    windowSeconds: number = 60
  ): Promise<RateLimitResult> {
    const key = `storytailor:rate:${identifier}`;
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    // Use sorted set with timestamps
    const multi = this.redis.multi();
    
    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);
    
    // Add current request
    multi.zadd(key, now.toString(), `${now}-${Math.random()}`);
    
    // Count requests in window
    multi.zcard(key);
    
    // Set expiry
    multi.expire(key, windowSeconds);
    
    const results = await multi.exec();
    const count = results![2][1] as number;
    
    const resetAt = new Date(now + (windowSeconds * 1000));
    
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      limit
    };
  }
  
  // Sliding window with tokens
  async checkTokenBucket(
    identifier: string,
    tokens: number,
    refillRate: number, // tokens per second
    maxTokens: number
  ): Promise<RateLimitResult> {
    const key = `storytailor:bucket:${identifier}`;
    const now = Date.now();
    
    // Get current bucket state
    const data = await this.redis.get(key);
    let bucket = data ? JSON.parse(data) : {
      tokens: maxTokens,
      lastRefill: now
    };
    
    // Calculate refill
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      maxTokens,
      bucket.tokens + (elapsed * refillRate)
    );
    bucket.lastRefill = now;
    
    // Check if we have enough tokens
    const allowed = bucket.tokens >= tokens;
    if (allowed) {
      bucket.tokens -= tokens;
    }
    
    // Save updated bucket
    await this.redis.setex(key, 3600, JSON.stringify(bucket));
    
    return {
      allowed,
      remaining: Math.floor(bucket.tokens),
      resetAt: new Date(now + ((maxTokens - bucket.tokens) / refillRate) * 1000),
      limit: maxTokens
    };
  }
}
```

### Rate Limit Middleware

```typescript
function rateLimitMiddleware(options: {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
  keyGenerator?: (req: Request) => string;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = options.keyGenerator?.(req) || 
      req.userId || 
      req.ip;
    
    const key = `${options.keyPrefix}:${identifier}`;
    
    const result = await rateLimiter.checkLimit(
      key,
      options.limit,
      options.windowSeconds
    );
    
    // Set rate limit headers
    res.set('X-RateLimit-Limit', result.limit.toString());
    res.set('X-RateLimit-Remaining', result.remaining.toString());
    res.set('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000).toString());
    
    if (!result.allowed) {
      res.set('Retry-After', Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString());
      
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        code: 'ERR_4001',
        details: {
          limit: result.limit,
          resetAt: result.resetAt.toISOString(),
          retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
        }
      });
    }
    
    next();
  };
}
```

---

## Per-Endpoint Limits

```typescript
// Different limits for different endpoints
const rateLimits = {
  // Auth endpoints - stricter limits
  'POST /auth/login': { limit: 5, window: 60 },
  'POST /auth/forgot-password': { limit: 3, window: 60 },
  
  // Standard API endpoints
  'GET /stories': { limit: 120, window: 60 },
  'GET /stories/:id': { limit: 300, window: 60 },
  
  // Expensive operations
  'POST /stories/:id/audio': { limit: 10, window: 60 },
  'POST /stories/:id/assets/generate': { limit: 5, window: 60 },
  
  // Search
  'GET /search': { limit: 30, window: 60 }
};

// Dynamic rate limiter
function dynamicRateLimit(req: Request, res: Response, next: NextFunction) {
  const route = `${req.method} ${req.route?.path || req.path}`;
  const config = rateLimits[route] || { limit: 60, window: 60 };
  
  return rateLimitMiddleware({
    keyPrefix: route.replace(/\W/g, '_'),
    limit: config.limit,
    windowSeconds: config.window
  })(req, res, next);
}
```

---

## Tier-Based Limits

```typescript
async function tierBasedRateLimit(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  // Get user's tier
  const { data: user } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', req.userId)
    .single();
  
  const tier = user?.subscription_tier || 'free';
  
  const tierLimits = {
    free: { limit: 30, concurrent: 2 },
    starter: { limit: 60, concurrent: 5 },
    family: { limit: 120, concurrent: 10 },
    premium: { limit: 300, concurrent: 25 },
    b2b_basic: { limit: 500, concurrent: 50 },
    b2b_pro: { limit: 1000, concurrent: 100 }
  };
  
  const limits = tierLimits[tier] || tierLimits.free;
  
  // Check rate limit
  const result = await rateLimiter.checkLimit(
    `user:${req.userId}`,
    limits.limit,
    60
  );
  
  // Also check concurrent requests
  const concurrent = await checkConcurrent(req.userId, limits.concurrent);
  
  if (!result.allowed || !concurrent.allowed) {
    return res.status(429).json({
      success: false,
      error: result.allowed ? 'Too many concurrent requests' : 'Rate limit exceeded',
      code: result.allowed ? 'ERR_4003' : 'ERR_4001',
      details: {
        tier,
        limit: limits.limit,
        concurrent: limits.concurrent
      }
    });
  }
  
  next();
}
```

---

## Generation Quotas

```typescript
// Daily generation quotas
async function checkGenerationQuota(
  userId: string,
  tier: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const dailyLimits = {
    free: 5,
    starter: 20,
    family: 50,
    premium: 200,
    b2b_basic: 500,
    b2b_pro: Infinity
  };
  
  const limit = dailyLimits[tier] || dailyLimits.free;
  
  // Get today's count
  const today = new Date().toISOString().split('T')[0];
  const key = `storytailor:quota:generation:${userId}:${today}`;
  
  const count = await redis.incr(key);
  
  // Set expiry at end of day
  if (count === 1) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    await redis.expireat(key, Math.floor(tomorrow.getTime() / 1000));
  }
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: tomorrow
  };
}

// Middleware for generation endpoints
async function generationQuotaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { data: user } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', req.userId)
    .single();
  
  const quota = await checkGenerationQuota(
    req.userId,
    user?.subscription_tier || 'free'
  );
  
  if (!quota.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Daily generation quota exceeded',
      code: 'ERR_4002',
      details: {
        remaining: quota.remaining,
        resetAt: quota.resetAt.toISOString(),
        upgradeUrl: '/pricing'
      }
    });
  }
  
  next();
}
```

---

## Concurrent Request Limiting

```typescript
async function checkConcurrent(
  userId: string,
  maxConcurrent: number
): Promise<{ allowed: boolean; current: number }> {
  const key = `storytailor:concurrent:${userId}`;
  
  const current = await redis.incr(key);
  
  // Auto-expire after 60 seconds (failsafe)
  if (current === 1) {
    await redis.expire(key, 60);
  }
  
  if (current > maxConcurrent) {
    await redis.decr(key);
    return { allowed: false, current: current - 1 };
  }
  
  return { allowed: true, current };
}

// Wrap handlers to track concurrent requests
function withConcurrencyLimit(handler: RequestHandler): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } finally {
      // Decrement counter when request completes
      const key = `storytailor:concurrent:${req.userId}`;
      await redis.decr(key);
    }
  };
}
```

---

## Client-Side Handling

### Retry with Backoff

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      console.log(`Rate limited. Retrying in ${retryAfter}s`);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      continue;
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded');
}
```

### Rate Limit UI Indicator

```javascript
// Show remaining requests to user
function updateRateLimitUI(headers) {
  const limit = headers.get('X-RateLimit-Limit');
  const remaining = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');
  
  if (remaining && parseInt(remaining) < 10) {
    showWarning(`${remaining} requests remaining. Resets in ${formatTime(reset)}`);
  }
}
```

---

**Last Updated**: December 23, 2025

