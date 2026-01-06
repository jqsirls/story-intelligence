# Caching Patterns

**Redis Caching for Performance**

---

## Overview

Storytailor uses Redis for:
- Response caching
- Session management
- Rate limiting
- Real-time data distribution

---

## Cache Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Gateway   │────▶│    Redis    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           │  Cache miss        │
                           │────────────────────▶
                           │                    │
                    ┌──────▼──────┐             │
                    │  Supabase   │             │
                    └─────────────┘             │
                           │                    │
                           │  Populate cache    │
                           │◀───────────────────│
```

---

## Key Naming Convention

```
storytailor:{resource}:{scope}:{id}:{variant}

Examples:
- storytailor:user:preferences:uuid
- storytailor:story:full:uuid
- storytailor:library:stories:uuid:page-1
- storytailor:search:results:hash(query)
- storytailor:rate:limit:ip:127.0.0.1
```

---

## Implementation

### Cache Service

```typescript
import Redis from 'ioredis';

class CacheService {
  private redis: Redis;
  private prefix = 'storytailor:';
  
  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }
  
  private key(...parts: string[]): string {
    return this.prefix + parts.join(':');
  }
  
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  async set(
    key: string, 
    value: any, 
    ttlSeconds: number = 300
  ): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }
  
  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
  
  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(this.prefix + pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
  
  // Cache-aside pattern
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;
    
    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
```

### Cache Middleware

```typescript
function cacheMiddleware(options: {
  keyPrefix: string;
  ttl: number;
  varyBy?: (req: Request) => string;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') return next();
    
    const variant = options.varyBy?.(req) || '';
    const cacheKey = `${options.keyPrefix}:${req.path}:${variant}`;
    
    // Try cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    // Store original json method
    const originalJson = res.json.bind(res);
    
    res.json = (body: any) => {
      // Cache successful responses
      if (body.success) {
        cache.set(cacheKey, body, options.ttl);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };
    
    next();
  };
}

// Usage
app.get('/api/v1/stories/:storyId',
  authMiddleware,
  cacheMiddleware({
    keyPrefix: 'story:full',
    ttl: 300,
    varyBy: (req) => req.params.storyId
  }),
  getStoryHandler
);
```

---

## TTL Guidelines

| Resource | TTL | Reason |
|----------|-----|--------|
| User preferences | 300s (5min) | Rarely changes |
| Story list | 60s (1min) | Updates on create/delete |
| Story details | 300s (5min) | Updates on edit |
| Character data | 600s (10min) | Rarely changes |
| Search results | 120s (2min) | Fresh results important |
| Voice catalog | 3600s (1hr) | Static content |
| Rate limits | 60s (1min) | Per-minute limits |
| Session data | 900s (15min) | Match token expiry |

---

## Cache Invalidation

### Event-Driven Invalidation

```typescript
// Invalidate on updates
class StoryService {
  async updateStory(storyId: string, updates: Partial<Story>) {
    // Update database
    await supabase
      .from('stories')
      .update(updates)
      .eq('id', storyId);
    
    // Invalidate cache
    await cache.delete(`storytailor:story:full:${storyId}`);
    
    // Also invalidate list caches
    const { data: story } = await supabase
      .from('stories')
      .select('library_id')
      .eq('id', storyId)
      .single();
    
    if (story) {
      await cache.deletePattern(`library:stories:${story.library_id}:*`);
    }
  }
}
```

### Pattern-Based Invalidation

```typescript
// Invalidate all user-related caches
async function invalidateUserCache(userId: string) {
  await cache.deletePattern(`user:*:${userId}`);
}

// Invalidate all library caches
async function invalidateLibraryCache(libraryId: string) {
  await cache.deletePattern(`library:*:${libraryId}:*`);
}
```

---

## Response Caching Headers

```typescript
function setCacheHeaders(res: Response, options: {
  maxAge: number;
  staleWhileRevalidate?: number;
  private?: boolean;
}) {
  const directives = [
    options.private ? 'private' : 'public',
    `max-age=${options.maxAge}`
  ];
  
  if (options.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }
  
  res.set('Cache-Control', directives.join(', '));
}

// Usage
app.get('/api/v1/audio/voices', async (req, res) => {
  setCacheHeaders(res, {
    maxAge: 3600,
    staleWhileRevalidate: 86400,
    private: false
  });
  
  const voices = await getAvailableVoices();
  res.json({ success: true, data: voices });
});
```

---

## Distributed Caching

### Pub/Sub for Invalidation

```typescript
// Publisher: Invalidate across all instances
class CacheInvalidator {
  private pubClient: Redis;
  private subClient: Redis;
  
  constructor(redisUrl: string) {
    this.pubClient = new Redis(redisUrl);
    this.subClient = new Redis(redisUrl);
    
    // Subscribe to invalidation channel
    this.subClient.subscribe('cache:invalidate');
    this.subClient.on('message', (channel, message) => {
      if (channel === 'cache:invalidate') {
        const { pattern } = JSON.parse(message);
        localCache.deletePattern(pattern);
      }
    });
  }
  
  async invalidate(pattern: string) {
    // Invalidate locally
    await cache.deletePattern(pattern);
    
    // Broadcast to other instances
    await this.pubClient.publish('cache:invalidate', 
      JSON.stringify({ pattern })
    );
  }
}
```

---

## Client-Side Caching (Wized)

```javascript
// Cache API responses in Wized variables
window.Wized.push((Wized) => {
  const responseCache = new Map();
  const CACHE_TTL = 60000; // 1 minute
  
  // Wrapper for cached requests
  async function cachedRequest(requestName, params = {}) {
    const cacheKey = JSON.stringify({ requestName, params });
    
    // Check cache
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    
    // Execute request
    const result = await Wized.requests.execute(requestName, params);
    
    // Cache result
    responseCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  // Use cached request
  const story = await cachedRequest('getStory', { id: storyId });
});
```

---

## Monitoring

### Cache Metrics

```typescript
// Track cache hit/miss ratio
class CacheMetrics {
  private hits = 0;
  private misses = 0;
  
  recordHit() { this.hits++; }
  recordMiss() { this.misses++; }
  
  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }
}

// Log metrics periodically
setInterval(() => {
  console.log('Cache stats:', cacheMetrics.getStats());
}, 60000);
```

---

**Last Updated**: December 23, 2025

