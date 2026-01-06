# System Behavior Guarantees

> **Version**: 1.0  
> **Last Updated**: December 23, 2025  
> **Status**: Canonical Reference

This document defines explicit behavioral contracts for the Storytailor® API. All clients and internal services MUST adhere to these guarantees. Changes to this document require versioning and migration planning.

---

## 1. Idempotency Guarantees

### 1.1 Idempotent Operations

The following operations are **idempotent** (safe to retry):

| Endpoint | Lock Key | TTL | Behavior |
|----------|----------|-----|----------|
| `POST /stories` | `create:story:{idempotency_key}` | 24h | Same request returns same story ID |
| `POST /assets/generate` | `gen:asset:{story_id}:{asset_type}` | 1h | Returns existing job if running |
| `POST /assets/:id/retry` | `retry:asset:{asset_id}` | 10m | Blocks concurrent retries |
| `POST /audio/generate` | `gen:audio:{story_id}` | 1h | Returns existing audio if complete |
| `POST /emotions/check-in` | `checkin:{profile_id}:{timestamp_minute}` | 1m | Dedupes rapid submissions |

### 1.2 Non-Idempotent Operations (Use Caution)

| Endpoint | Behavior | Risk |
|----------|----------|------|
| `POST /assets/regenerate` | Always creates new generation | Consumes quota |
| `DELETE /stories/:id` | Permanent deletion | Not recoverable |
| `POST /transfers/accept` | State change | Cannot re-accept |

### 1.3 Idempotency Key Format

```http
X-Idempotency-Key: {client_id}:{operation}:{unique_id}:{timestamp}
```

**Example**:
```http
X-Idempotency-Key: web-client:create-story:abc123:1703318400
```

**Rules**:
- Keys MUST be unique per logical operation
- Keys expire after 24 hours
- Reusing a key returns the cached response (HTTP 200) or conflict (HTTP 409)
- Keys are stored in Redis with TTL

---

## 2. Concurrency Guarantees

### 2.1 Per-User Concurrency Limits

| Resource | Free Tier | Plus Tier | Pro Tier | Enterprise |
|----------|-----------|-----------|----------|------------|
| Active story generations | 1 | 3 | 10 | Unlimited |
| Active audio generations | 1 | 2 | 5 | 20 |
| SSE connections | 2 | 5 | 10 | 50 |
| Parallel API requests | 5 | 20 | 100 | 500 |

### 2.2 Lock Semantics

```
Lock Key Format: lock:{resource_type}:{resource_id}:{operation}
Lock TTL: 300 seconds (5 minutes) unless otherwise specified
Lock Refresh: Automatically refreshed every 60 seconds during active processing
```

**Lock Acquisition**:
```typescript
// Pseudo-code
const lockKey = `lock:story:${storyId}:generate`;
const acquired = await redis.set(lockKey, requestId, 'NX', 'EX', 300);

if (!acquired) {
  // Return 409 Conflict with existing job info
  return { status: 409, existingJobId: await redis.get(lockKey) };
}
```

### 2.3 Behavior When Limits Exceeded

| Limit Type | HTTP Status | Response |
|------------|-------------|----------|
| Concurrency limit | 429 | `{ code: "CONCURRENCY_LIMIT", retryAfter: 30 }` |
| Rate limit | 429 | `{ code: "RATE_LIMIT", retryAfter: 60 }` |
| Quota exhausted | 402 | `{ code: "QUOTA_EXHAUSTED", upgradeUrl: "..." }` |

---

## 3. Retry Guarantees

### 3.1 Retry Safety Matrix

| Error Code | Retry Safe | Delay | Max Retries | User Action |
|------------|------------|-------|-------------|-------------|
| 500 | Yes | Exponential (1s, 2s, 4s) | 3 | None |
| 502 | Yes | Exponential | 3 | None |
| 503 | Yes | `Retry-After` header | 5 | None |
| 429 | Yes | `Retry-After` header | 5 | None |
| 409 | No | - | 0 | Check existing resource |
| 400 | No | - | 0 | Fix request |
| 401 | No | - | 0 | Re-authenticate |
| 403 | No | - | 0 | Check permissions |
| 404 | No | - | 0 | Resource doesn't exist |
| 402 | No | - | 0 | Upgrade subscription |

### 3.2 Retry-After Header

All 429 and 503 responses include:
```http
Retry-After: 30
X-RateLimit-Reset: 1703318400
```

### 3.3 Retry Counting

- Failed retries DO NOT consume additional quota
- Successful retries consume quota only once (idempotency)
- Intentional regeneration ALWAYS consumes quota

---

## 4. Quota Guarantees

### 4.1 Quota Reservation

Quota is **reserved at job creation**, not consumption:

```
1. User initiates story generation
2. System reserves 1 story credit immediately
3. If generation fails:
   - Credit remains reserved for retry (24h)
   - After 24h or successful retry: credit consumed
4. If user cancels: credit refunded
```

### 4.2 Quota Types

| Quota | Scope | Period | Refundable |
|-------|-------|--------|------------|
| Story generations | Per user | Monthly | Yes (if failed) |
| Audio generations | Per user | Monthly | Yes (if failed) |
| API requests | Per user | Per minute | No |
| SSE connections | Per user | Concurrent | N/A |

### 4.3 Quota Visibility

```http
GET /account/quota

{
  "stories": { "used": 5, "limit": 10, "resetAt": "2024-02-01T00:00:00Z" },
  "audio": { "used": 3, "limit": 20, "resetAt": "2024-02-01T00:00:00Z" },
  "requests": { "used": 45, "limit": 1000, "resetAt": "2024-01-01T12:00:00Z" }
}
```

---

## 5. Real-Time Guarantees

### 5.1 SSE Connection Rules

| Guarantee | Value |
|-----------|-------|
| Max idle time | 5 minutes (ping every 30s) |
| Reconnect delay | 1 second (client should implement) |
| Reconnect rate limit | 10 connections per minute per user |
| Event delivery | At-least-once |
| Event ordering | Per-stream ordered |

### 5.2 Supabase Realtime

- Subscriptions DO NOT count toward request rate limits
- Max 10 concurrent subscriptions per user
- Auto-reconnect on disconnect
- Events may duplicate on reconnect (use `updated_at` for deduplication)

### 5.3 SSE vs Supabase

| Use Case | Recommended |
|----------|-------------|
| Asset generation progress | SSE |
| Story updates | Supabase Realtime |
| Emotion check-ins | Supabase Realtime |
| Notifications | Supabase Realtime |

---

## 6. Caching Guarantees

### 6.1 Cache Behavior

**Hard Rule**: Cached responses may be stale for up to TTL seconds. Clients MUST tolerate eventual consistency.

| Resource | Cache TTL | Invalidation |
|----------|-----------|--------------|
| Story metadata | 60s | On update |
| Story content | 300s | On update |
| User profile | 60s | On update |
| Catalog (voices, etc.) | 3600s | Daily refresh |
| Asset URLs (presigned) | 86400s (24h) | On expiry |

### 6.2 Cache Headers

All cacheable responses include:
```http
Cache-Control: public, max-age=60, stale-while-revalidate=30
ETag: "abc123"
Last-Modified: Mon, 23 Dec 2024 12:00:00 GMT
```

### 6.3 Cache Bypass

```http
Cache-Control: no-cache
```

Or use query parameter:
```
GET /stories/123?_bust=1703318400
```

---

## 7. State Machine Guarantees

### 7.1 Story Lifecycle

```
draft → generating → ready → archived
          ↓
        failed → retry → generating
```

| Transition | Allowed From | Side Effects |
|------------|--------------|--------------|
| generate | draft | Reserves quota, starts job |
| complete | generating | Marks ready, sends email |
| fail | generating | Marks failed, allows retry |
| retry | failed | Restarts generation (no new quota) |
| archive | ready | Soft delete |

### 7.2 Asset Lifecycle

```
pending → generating → ready
              ↓
           failed → retry → generating
```

| Transition | Idempotent | Consumes Quota |
|------------|------------|----------------|
| generate | Yes | Yes (reserved) |
| retry | Yes | No |
| regenerate | No | Yes |

### 7.3 Conversation Lifecycle

```
created → active → paused → resumed → completed
                      ↓
                   abandoned (after 30 min inactivity)
```

---

## 8. Data Consistency Guarantees

### 8.1 Read-After-Write

- Writes are immediately visible to the writing user
- Writes propagate to other users within 5 seconds
- Use `X-Consistency: strong` header for immediate consistency (higher latency)

### 8.2 Deletion Propagation

| Resource | Soft Delete | Hard Delete | Propagation |
|----------|-------------|-------------|-------------|
| Story | Yes (30 days) | After 30 days | Immediate |
| Character | Yes (30 days) | After 30 days | Immediate |
| User account | Yes (30 days) | After 30 days | 24 hours |
| Assets | No | Immediate | 5 minutes |

### 8.3 Conflict Resolution

Last-write-wins with `updated_at` timestamp. Clients should:
1. Check `updated_at` before update
2. Use `If-Match` header for optimistic locking
3. Handle 409 Conflict by refetching and retrying

---

## 9. Error Response Guarantees

### 9.1 Error Format

All errors follow this structure:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { "field": "email", "reason": "Invalid format" },
    "requestId": "req_abc123",
    "timestamp": "2024-12-23T12:00:00Z"
  }
}
```

### 9.2 Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Valid token, insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Resource state conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `QUOTA_EXHAUSTED` | 402 | Monthly limit reached |
| `INTERNAL_ERROR` | 500 | Server error (retry safe) |
| `SERVICE_UNAVAILABLE` | 503 | Temporary outage (retry safe) |

---

## 10. SLA Guarantees

### 10.1 Availability

| Tier | Target | Measurement |
|------|--------|-------------|
| API availability | 99.9% | Monthly |
| Story generation success | 99% | Per request |
| Audio generation success | 98% | Per request |

### 10.2 Latency (P95)

| Operation | Target |
|-----------|--------|
| Authentication | <100ms |
| Story metadata read | <200ms |
| Story generation start | <500ms |
| Audio generation start | <1s |
| SSE connection establish | <500ms |

### 10.3 Throughput

| Resource | Limit |
|----------|-------|
| Requests per second (global) | 10,000 |
| Concurrent story generations (global) | 1,000 |
| Concurrent SSE connections (global) | 50,000 |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-23 | Initial release |

---

*This document is the canonical reference for API behavior. The OpenAPI specification is its executable mirror.*

