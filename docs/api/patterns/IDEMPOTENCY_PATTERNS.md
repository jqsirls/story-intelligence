# Idempotency Patterns

> **Version**: 1.0  
> **Last Updated**: December 23, 2025  
> **Status**: Canonical Reference

This document defines idempotency patterns for the Storytailor® REST API. Idempotency ensures safe retries and prevents duplicate operations for cost-sensitive and state-changing endpoints.

---

## 1. Overview

### What is Idempotency?

An operation is **idempotent** if executing it multiple times produces the same result as executing it once. For APIs, this means:

- First request: Processes normally, caches result
- Duplicate request (same key): Returns cached result
- No duplicate resources created
- No duplicate charges

### Why Idempotency Matters

| Scenario | Without Idempotency | With Idempotency |
|----------|---------------------|------------------|
| Network timeout | User retries, 2 stories created | User retries, same story returned |
| Double-click | 2 audio generations charged | 1 audio generation, result cached |
| Mobile reconnect | Duplicate check-ins logged | Deduplicated, single entry |

---

## 2. Using Idempotency Keys

### Header Format

```http
X-Idempotency-Key: {client_id}:{operation}:{unique_id}:{timestamp}
```

### Components

| Component | Description | Example |
|-----------|-------------|---------|
| `client_id` | Your client identifier | `web-client`, `ios-app`, `alexa` |
| `operation` | The operation type | `create-story`, `gen-audio` |
| `unique_id` | Client-generated unique ID | `abc123`, UUID |
| `timestamp` | Unix timestamp (seconds) | `1703318400` |

### Examples

```http
# Create a story
X-Idempotency-Key: web-client:create-story:abc123:1703318400

# Generate audio
X-Idempotency-Key: ios-app:gen-audio:story-456:1703318401

# Emotion check-in
X-Idempotency-Key: alexa:checkin:profile-789:1703318402
```

---

## 3. Idempotent Endpoints

### Required Idempotency Key

These endpoints **require** an idempotency key and will return `400` without one:

| Endpoint | Lock Key Pattern | TTL | Notes |
|----------|------------------|-----|-------|
| `POST /stories` | `create:story:{key}` | 24h | Story creation |
| `POST /stories/:id/assets/generate` | `gen:asset:{story_id}:{type}` | 1h | Asset generation |
| `POST /stories/:id/assets/:id/retry` | `retry:asset:{asset_id}` | 10m | Retry failed asset |
| `POST /stories/:id/audio` | `gen:audio:{story_id}` | 1h | Audio generation |
| `POST /transfers` | `transfer:{story_id}:{email}` | 1h | Initiate transfer |
| `POST /transfers/:id/accept` | `accept:transfer:{id}` | 1h | Accept transfer |
| `PUT /subscriptions` | `sub:update:{user_id}` | 5m | Subscription update |

### Optional Idempotency Key

These endpoints accept an idempotency key but don't require it:

| Endpoint | Lock Key Pattern | TTL | Notes |
|----------|------------------|-----|-------|
| `POST /emotions/check-in` | `checkin:{profile_id}:{minute}` | 1m | Deduplication |
| `POST /characters` | `create:char:{key}` | 1h | Character creation |
| `PUT /stories/:id` | `update:story:{id}:{key}` | 5m | Story update |

### Non-Idempotent Endpoints (No Key Accepted)

These endpoints are **intentionally non-idempotent**:

| Endpoint | Reason |
|----------|--------|
| `POST /stories/:id/assets/regenerate` | Always creates new generation, consumes quota |
| `DELETE /stories/:id` | Permanent action, should not be retried |
| `POST /payments` | Handled by Stripe's own idempotency |

---

## 4. Response Behavior

### First Request

```http
POST /stories HTTP/1.1
X-Idempotency-Key: web-client:create-story:abc123:1703318400
Content-Type: application/json

{"title": "Adventure in the Woods", ...}
```

```http
HTTP/1.1 201 Created
X-Idempotency-Key: web-client:create-story:abc123:1703318400
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": "story_xyz789",
    "title": "Adventure in the Woods",
    "status": "draft"
  }
}
```

### Duplicate Request (Same Key)

```http
POST /stories HTTP/1.1
X-Idempotency-Key: web-client:create-story:abc123:1703318400
Content-Type: application/json

{"title": "Adventure in the Woods", ...}
```

```http
HTTP/1.1 200 OK
X-Idempotency-Key: web-client:create-story:abc123:1703318400
X-Idempotency-Replayed: true
X-Idempotency-Original-Timestamp: 2024-12-23T12:00:00Z
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": "story_xyz789",
    "title": "Adventure in the Woods",
    "status": "draft"
  }
}
```

**Note**: Status code is `200` for replayed responses, not `201`.

### Concurrent Request (Operation In Progress)

If another request with the same key is currently being processed:

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "OPERATION_IN_PROGRESS",
    "message": "This operation is currently being processed. Please wait and retry.",
    "details": {
      "idempotencyKey": "web-client:create-story:abc123:1703318400",
      "retryAfter": 5
    }
  }
}
```

### Missing Required Key

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "IDEMPOTENCY_KEY_REQUIRED",
    "message": "X-Idempotency-Key header is required for this operation",
    "details": {
      "format": "{client_id}:{operation}:{unique_id}:{timestamp}",
      "example": "web-client:create-story:abc123:1703318400"
    }
  }
}
```

---

## 5. Client Implementation

### JavaScript/TypeScript

```typescript
import { v4 as uuidv4 } from 'uuid';

class StorytellerClient {
  private clientId: string;
  
  constructor(clientId: string) {
    this.clientId = clientId;
  }
  
  private generateIdempotencyKey(operation: string): string {
    const uniqueId = uuidv4().split('-')[0]; // Short UUID
    const timestamp = Math.floor(Date.now() / 1000);
    return `${this.clientId}:${operation}:${uniqueId}:${timestamp}`;
  }
  
  async createStory(data: CreateStoryRequest): Promise<Story> {
    const idempotencyKey = this.generateIdempotencyKey('create-story');
    
    const response = await fetch('/api/v1/stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(data),
    });
    
    if (response.headers.get('X-Idempotency-Replayed') === 'true') {
      console.log('Request was replayed from cache');
    }
    
    return response.json();
  }
  
  async createStoryWithRetry(
    data: CreateStoryRequest,
    maxRetries = 3
  ): Promise<Story> {
    const idempotencyKey = this.generateIdempotencyKey('create-story');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('/api/v1/stories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            'X-Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(data),
        });
        
        if (response.status === 409) {
          // Operation in progress, wait and retry
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        
        return response.json();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    
    throw new Error('Max retries exceeded');
  }
}
```

### Python

```python
import uuid
import time
import requests

class StorytellerClient:
    def __init__(self, client_id: str, token: str):
        self.client_id = client_id
        self.token = token
        self.base_url = "https://api.storytailor.dev/api/v1"
    
    def _generate_idempotency_key(self, operation: str) -> str:
        unique_id = str(uuid.uuid4())[:8]
        timestamp = int(time.time())
        return f"{self.client_id}:{operation}:{unique_id}:{timestamp}"
    
    def create_story(self, data: dict) -> dict:
        idempotency_key = self._generate_idempotency_key("create-story")
        
        response = requests.post(
            f"{self.base_url}/stories",
            json=data,
            headers={
                "Authorization": f"Bearer {self.token}",
                "X-Idempotency-Key": idempotency_key,
            }
        )
        
        if response.headers.get("X-Idempotency-Replayed") == "true":
            print("Request was replayed from cache")
        
        return response.json()
```

### Swift (iOS)

```swift
class StorytellerClient {
    let clientId: String
    let baseURL = "https://api.storytailor.dev/api/v1"
    
    init(clientId: String) {
        self.clientId = clientId
    }
    
    func generateIdempotencyKey(operation: String) -> String {
        let uniqueId = UUID().uuidString.prefix(8)
        let timestamp = Int(Date().timeIntervalSince1970)
        return "\(clientId):\(operation):\(uniqueId):\(timestamp)"
    }
    
    func createStory(_ data: CreateStoryRequest) async throws -> Story {
        let idempotencyKey = generateIdempotencyKey(operation: "create-story")
        
        var request = URLRequest(url: URL(string: "\(baseURL)/stories")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(idempotencyKey, forHTTPHeaderField: "X-Idempotency-Key")
        request.httpBody = try JSONEncoder().encode(data)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse,
           httpResponse.value(forHTTPHeaderField: "X-Idempotency-Replayed") == "true" {
            print("Request was replayed from cache")
        }
        
        return try JSONDecoder().decode(Story.self, from: data)
    }
}
```

---

## 6. Best Practices

### DO

✅ **Generate unique keys per logical operation**
```typescript
// Good: Each button click gets a unique key
const key = `${clientId}:create-story:${uuid()}:${timestamp}`;
```

✅ **Include enough entropy**
```typescript
// Good: UUID + timestamp ensures uniqueness
const key = `client:op:${uuid()}:${Date.now()}`;
```

✅ **Use consistent key format**
```typescript
// Good: Same format everywhere
const key = `${CLIENT_ID}:${OPERATION}:${UNIQUE}:${TIMESTAMP}`;
```

✅ **Store keys for retry scenarios**
```typescript
// Good: Keep the key for potential retries
const idempotencyKey = generateKey('create-story');
localStorage.setItem(`pending:${storyLocalId}`, idempotencyKey);
```

### DON'T

❌ **Reuse keys for different operations**
```typescript
// Bad: Same key for different stories
const key = 'my-constant-key'; // Will conflict!
```

❌ **Include variable data in key**
```typescript
// Bad: Key changes if request body changes
const key = `op:${hash(requestBody)}:${timestamp}`;
// If user fixes a typo and retries, new story is created
```

❌ **Generate key on server**
```typescript
// Bad: Each retry generates new key
app.post('/stories', (req, res) => {
  const key = uuid(); // Wrong! Client should provide this
});
```

---

## 7. Quota and Retry Interaction

### Quota Reservation

When an idempotent operation consumes quota:

1. **First request**: Quota reserved immediately
2. **Retry (same key)**: No additional quota consumed
3. **Regeneration (new key)**: New quota consumed

```
Timeline:
─────────────────────────────────────────────────────
T0: User clicks "Create Story"
    → Key: abc123, Quota: 9→8 (reserved)
    
T1: Network fails, user retries
    → Key: abc123 (same), Quota: 8 (unchanged)
    
T2: Success returned
    → Key: abc123 cached, Quota: 8 (confirmed)
    
T3: User clicks "Regenerate"
    → Key: xyz789 (new), Quota: 8→7 (new reservation)
```

### Failed Operations

If an operation fails:

1. **Server error (5xx)**: Retry with same key (no quota impact)
2. **Client error (4xx)**: Fix request, use new key (if validation passes, quota consumed)
3. **Timeout**: Retry with same key (will return cached result or complete)

---

## 8. Troubleshooting

### "OPERATION_IN_PROGRESS" Error

**Cause**: Another request with the same key is being processed.

**Solution**: Wait 5 seconds and retry. The system will either:
- Return the cached result from the first request
- Allow your retry to proceed if the first request failed

### "IDEMPOTENCY_KEY_REQUIRED" Error

**Cause**: Endpoint requires idempotency key but none provided.

**Solution**: Add `X-Idempotency-Key` header with proper format.

### Unexpected Cached Response

**Cause**: Accidentally reusing an old idempotency key.

**Solution**: Ensure unique ID and timestamp are fresh for each logical operation.

### Key Expired but Want Same Result

**Cause**: Idempotency key TTL expired (24h for most operations).

**Solution**: Keys are meant for short-term retry protection. After expiry, the operation must use a new key. If you need the same resource, use a GET endpoint.

---

## 9. Implementation Reference

### Middleware Usage (Server-Side)

```typescript
import { 
  requireIdempotency, 
  optionalIdempotency,
  withIdempotency,
  IdempotencyConfigs 
} from '../middleware/IdempotencyMiddleware';

// Required idempotency with config
app.post('/stories', 
  withIdempotency('createStory'),
  createStoryHandler
);

// Custom idempotency
app.post('/custom',
  requireIdempotency('custom:{idempotency_key}', {
    ttlSeconds: 3600,
    consumesQuota: true,
  }),
  customHandler
);

// Optional idempotency
app.post('/comments',
  optionalIdempotency('comment:{post_id}:{idempotency_key}'),
  createCommentHandler
);
```

### Available Configurations

```typescript
const IdempotencyConfigs = {
  createStory: { lockKey: 'create:story:{idempotency_key}', ttlSeconds: 86400 },
  generateAssets: { lockKey: 'gen:asset:{story_id}:{asset_type}', ttlSeconds: 3600 },
  retryAsset: { lockKey: 'retry:asset:{asset_id}', ttlSeconds: 600 },
  generateAudio: { lockKey: 'gen:audio:{story_id}', ttlSeconds: 3600 },
  emotionCheckIn: { lockKey: 'checkin:{profile_id}:{timestamp_minute}', ttlSeconds: 60 },
  initiateTransfer: { lockKey: 'transfer:{story_id}:{recipient_email}', ttlSeconds: 3600 },
  acceptTransfer: { lockKey: 'accept:transfer:{transfer_id}', ttlSeconds: 3600 },
  updateSubscription: { lockKey: 'sub:update:{user_id}', ttlSeconds: 300 },
};
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-23 | Initial release |

---

*See also: [System Behavior Guarantees](../SYSTEM_BEHAVIOR_GUARANTEES.md) for complete retry and quota rules.*

