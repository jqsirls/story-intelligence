# Performance Troubleshooting Guide

**Diagnosing and Fixing Slow API Responses**

---

## Performance Targets

| Endpoint Type | Target | Warning | Critical |
|---------------|--------|---------|----------|
| Simple reads | <100ms | 200ms | 500ms |
| List queries | <200ms | 500ms | 1000ms |
| Create operations | <500ms | 1000ms | 2000ms |
| Generation requests | <1000ms | 2000ms | 5000ms |
| Search | <300ms | 500ms | 1000ms |

---

## Diagnosing Slow Requests

### Step 1: Check Response Headers

```javascript
const response = await fetch('/api/v1/stories');
console.log({
  duration: response.headers.get('X-Response-Time'),
  cached: response.headers.get('X-Cache'),
  requestId: response.headers.get('X-Request-Id')
});
```

### Step 2: Analyze Timing Breakdown

Use browser DevTools Network tab:
- **DNS Lookup**: Should be <5ms (cached)
- **TCP Connect**: Should be <50ms
- **TLS Handshake**: Should be <100ms
- **Time to First Byte (TTFB)**: Main server response time
- **Content Download**: Depends on payload size

### Step 3: Check Server Metrics

```bash
# CloudWatch Insights query
fields @timestamp, correlationId, duration, path
| filter duration > 1000
| sort duration desc
| limit 50
```

---

## Common Performance Issues

### Issue 1: Large Payload Responses

**Symptom:** High "Content Download" time

**Diagnosis:**
```javascript
const response = await fetch('/api/v1/stories');
const data = await response.json();
console.log(`Payload size: ${JSON.stringify(data).length} bytes`);
```

**Solutions:**

1. **Use pagination:**
```http
GET /api/v1/stories?limit=20&page=1
```

2. **Use field selection:**
```http
GET /api/v1/stories?fields=id,title,createdAt
```

3. **Enable compression:**
```http
Accept-Encoding: gzip, deflate
```

---

### Issue 2: N+1 Query Problem

**Symptom:** Slow list endpoints, duration increases with item count

**Diagnosis:** Check if each item triggers additional queries

**Backend Fix:**
```typescript
// ❌ N+1 Problem
const stories = await supabase.from('stories').select('*');
for (const story of stories) {
  story.character = await supabase
    .from('characters')
    .select('*')
    .eq('id', story.character_id)
    .single();
}

// ✅ Single Query with Join
const stories = await supabase
  .from('stories')
  .select(`
    *,
    character:characters(*)
  `);
```

---

### Issue 3: Missing Database Indexes

**Symptom:** Slow queries on filtered/sorted fields

**Diagnosis:**
```sql
EXPLAIN ANALYZE
SELECT * FROM stories 
WHERE library_id = 'uuid' 
ORDER BY created_at DESC 
LIMIT 20;
```

**Solution:**
```sql
CREATE INDEX idx_stories_library_created 
ON stories (library_id, created_at DESC);
```

---

### Issue 4: Cold Starts

**Symptom:** First request after idle period is slow (Lambda)

**Diagnosis:**
- Response time spikes after 15+ minutes of inactivity
- Consistent fast responses after first request

**Solutions:**

1. **Provisioned Concurrency:**
```json
{
  "ProvisionedConcurrencyConfig": {
    "ProvisionedConcurrentExecutions": 5
  }
}
```

2. **Keep-Warm Strategy:**
```javascript
// Periodic health check every 10 minutes
setInterval(() => {
  fetch('/api/v1/health');
}, 10 * 60 * 1000);
```

---

### Issue 5: Cache Misses

**Symptom:** Responses slower than expected for frequently accessed data

**Diagnosis:**
```javascript
const response = await fetch('/api/v1/stories/popular');
console.log('Cache:', response.headers.get('X-Cache')); // HIT or MISS
```

**Solutions:**

1. **Verify cache configuration:**
```typescript
// Check TTL settings
const cacheConfig = {
  stories: 300,      // 5 minutes
  characters: 600,   // 10 minutes
  voices: 3600       // 1 hour
};
```

2. **Check cache health:**
```bash
redis-cli INFO stats | grep -E 'keyspace_(hits|misses)'
```

---

### Issue 6: External API Latency

**Symptom:** Slow generation endpoints (audio, images)

**Diagnosis:**
```typescript
// Check external call timing
const start = Date.now();
const result = await openai.chat.completions.create(...);
logger.info(`OpenAI call took ${Date.now() - start}ms`);
```

**Solutions:**

1. **Circuit breaker pattern:**
```typescript
// Fail fast when external service is slow
if (externalLatency > 5000) {
  throw new Error('External service timeout');
}
```

2. **Async processing:**
```typescript
// Return immediately, process in background
res.status(202).json({
  success: true,
  data: { jobId, status: 'processing' }
});

// Process async
await queue.add('generate-audio', { storyId });
```

---

## Client-Side Optimizations

### Parallel Requests

```javascript
// ❌ Sequential - slow
const stories = await fetch('/api/v1/stories').then(r => r.json());
const characters = await fetch('/api/v1/characters').then(r => r.json());

// ✅ Parallel - fast
const [stories, characters] = await Promise.all([
  fetch('/api/v1/stories').then(r => r.json()),
  fetch('/api/v1/characters').then(r => r.json())
]);
```

### Request Debouncing

```javascript
// Debounce search input
let timeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    fetch(`/api/v1/search?q=${e.target.value}`);
  }, 300);
});
```

### Optimistic Updates

```javascript
// Show change immediately, sync in background
async function favoriteStory(storyId) {
  // Optimistic update
  updateUI({ favorited: true });
  
  try {
    await fetch('/api/v1/favorites', {
      method: 'POST',
      body: JSON.stringify({ storyId })
    });
  } catch (error) {
    // Rollback on failure
    updateUI({ favorited: false });
    showError('Failed to save favorite');
  }
}
```

---

## Monitoring Setup

### CloudWatch Dashboard Metrics

```yaml
Widgets:
  - Title: API Latency (P95)
    Type: Metric
    MetricName: Duration
    Statistic: p95
    
  - Title: Cache Hit Rate
    Type: Metric
    MetricName: CacheHitRate
    Statistic: Average
    
  - Title: Error Rate
    Type: Metric
    MetricName: Errors
    Statistic: Sum
```

### Alerts

```yaml
Alarms:
  - Name: HighLatency
    Metric: Duration
    Threshold: 1000
    Period: 300
    EvaluationPeriods: 2
    
  - Name: HighErrorRate
    Metric: ErrorRate
    Threshold: 0.05
    Period: 300
```

---

## Performance Checklist

- [ ] Pagination enabled for list endpoints
- [ ] Field selection available
- [ ] Indexes on filtered/sorted columns
- [ ] Caching configured with appropriate TTLs
- [ ] Async processing for heavy operations
- [ ] Compression enabled
- [ ] Connection pooling configured
- [ ] Monitoring and alerts in place

---

**Last Updated**: December 23, 2025

