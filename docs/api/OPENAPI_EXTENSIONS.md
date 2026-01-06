# OpenAPI Extension Patterns

> **Version**: 1.1  
> **Last Updated**: December 23, 2025  
> **Status**: SACRED - Cannot be simplified or bypassed

This document defines custom OpenAPI extensions used in the Storytailor® API specification. These extensions provide machine-readable metadata for:
- Idempotency requirements
- Scope-based authorization
- Lifecycle state transitions
- Rate limiting behavior
- Quota consumption

**⚠️ ENFORCEMENT**: No endpoint ships without these extensions. Missing metadata fails CI. No exceptions.

---

## 0. Canonical Rules (Inviolable)

These rules are law. They are not guidelines. They are not suggestions.

### Quota Rule

> Quota is reserved at `request` OR confirmed at `success`, never both.  
> `refundable: true` means automatic refund on terminal failure within 24 hours.

### Scope Rule

> Every operation MUST declare `x-scope` and `x-visibility`.  
> Missing metadata fails CI. No defaults. No exceptions.

### Lifecycle Rule

> Operations called from invalid states return `ERR_6003 INVALID_STATE_TRANSITION`.  
> No silent recovery. Predictability beats forgiveness.

### Idempotency Rule

> All mutating operations (`POST`, `PUT`, `PATCH`, `DELETE`) MUST declare `x-idempotency`.  
> Either `required: true` or explicitly `required: false` with justification.

### Visibility Rule

> `internal-only` endpoints are NEVER documented publicly.  
> `restricted` endpoints require partner agreement.  
> `public` endpoints are contractual obligations.

---

## 1. Extension Summary

| Extension | Type | Purpose |
|-----------|------|---------|
| `x-scope` | string | Required authorization scope |
| `x-idempotency` | object | Idempotency configuration |
| `x-lifecycle` | object | State machine transitions |
| `x-rate-limit` | object | Per-endpoint rate limits |
| `x-quota` | object | Quota consumption details |
| `x-visibility` | string | API visibility tier |

---

## 2. x-scope Extension

Defines the authorization scope required to access an endpoint.

### Schema

```yaml
x-scope:
  type: string
  enum: [public, child-safe, parent-facing, educator-facing, org-admin, platform-admin, internal-only]
```

### Values

| Value | Description |
|-------|-------------|
| `public` | No authentication required |
| `child-safe` | Safe for child tokens, read-only access |
| `parent-facing` | Requires parent/guardian authentication |
| `educator-facing` | Requires educator role |
| `org-admin` | Requires organization admin role |
| `platform-admin` | Storytailor internal admins only |
| `internal-only` | Service-to-service only |

### Example

```yaml
paths:
  /v1/emotions/patterns:
    get:
      x-scope: parent-facing
      summary: Get emotion patterns for child
      description: Only parents can view emotion pattern analysis
```

---

## 3. x-idempotency Extension

Defines idempotency requirements and behavior.

### Schema

```yaml
x-idempotency:
  type: object
  properties:
    required:
      type: boolean
      description: Whether X-Idempotency-Key header is required
    lockKey:
      type: string
      description: Redis key pattern for idempotency lock
    ttlSeconds:
      type: integer
      description: How long to cache the response
    consumesQuota:
      type: boolean
      description: Whether this operation consumes quota
    retrySafe:
      type: boolean
      description: Whether retrying with same key is safe
```

### Example

```yaml
paths:
  /v1/stories:
    post:
      x-idempotency:
        required: true
        lockKey: "create:story:{idempotency_key}"
        ttlSeconds: 86400
        consumesQuota: true
        retrySafe: true
      summary: Create a new story
      
  /v1/stories/{storyId}/assets/regenerate:
    post:
      x-idempotency:
        required: false
        consumesQuota: true
        retrySafe: false  # Intentionally non-idempotent
      summary: Regenerate all assets
```

---

## 4. x-lifecycle Extension

Defines state machine transitions for stateful resources.

### Schema

```yaml
x-lifecycle:
  type: object
  properties:
    resource:
      type: string
      description: The resource type being modified
    fromStates:
      type: array
      items:
        type: string
      description: Valid source states for this operation
    toState:
      type: string
      description: Target state after operation
    sideEffects:
      type: array
      items:
        type: string
      description: Side effects triggered by transition
```

### Example

```yaml
paths:
  /v1/stories/{storyId}/assets/generate:
    post:
      x-lifecycle:
        resource: story
        fromStates: [draft]
        toState: generating
        sideEffects:
          - reserve_quota
          - create_jobs
          - send_progress_events
      summary: Generate all assets for story

  /v1/stories/{storyId}/assets/{assetId}/retry:
    post:
      x-lifecycle:
        resource: asset
        fromStates: [failed, stale]
        toState: generating
        sideEffects:
          - restart_job
```

---

## 5. x-rate-limit Extension

Defines per-endpoint rate limiting rules.

### Schema

```yaml
x-rate-limit:
  type: object
  properties:
    limit:
      type: integer
      description: Requests allowed per window
    window:
      type: integer
      description: Window size in seconds
    scope:
      type: string
      enum: [user, ip, global]
      description: Rate limit scope
    tier:
      type: string
      description: Tier multiplier reference
```

### Example

```yaml
paths:
  /v1/auth/login:
    post:
      x-rate-limit:
        limit: 5
        window: 60
        scope: ip
      summary: Login to account

  /v1/stories/{storyId}/audio:
    post:
      x-rate-limit:
        limit: 5
        window: 60
        scope: user
        tier: generation
      summary: Generate audio for story
```

---

## 6. x-quota Extension

Defines quota consumption for the operation.

### Schema

```yaml
x-quota:
  type: object
  properties:
    type:
      type: string
      enum: [story, audio, character, none]
      description: Type of quota consumed
    cost:
      type: integer
      description: Units consumed per operation
    refundable:
      type: boolean
      description: Whether quota is refunded on failure
    reservedAt:
      type: string
      enum: [request, success]
      description: When quota is reserved
```

### Example

```yaml
paths:
  /v1/stories:
    post:
      x-quota:
        type: story
        cost: 1
        refundable: true
        reservedAt: request
      summary: Create a new story

  /v1/stories/{storyId}/assets/{assetId}/retry:
    post:
      x-quota:
        type: none
        cost: 0
      summary: Retry failed asset (no quota consumed)
```

---

## 7. x-visibility Extension

Defines the API visibility tier.

### Schema

```yaml
x-visibility:
  type: string
  enum: [public, restricted, internal]
```

### Values

| Value | Description | Documentation |
|-------|-------------|---------------|
| `public` | Available to all API consumers | Full docs |
| `restricted` | Partner/enterprise only | Limited docs |
| `internal` | Storytailor internal only | No public docs |

### Example

```yaml
paths:
  /v1/stories:
    get:
      x-visibility: public
      summary: List user's stories

  /internal/cache-invalidate:
    post:
      x-visibility: internal
      summary: Invalidate cache (internal only)
```

---

## 8. Complete Endpoint Example

```yaml
paths:
  /v1/stories:
    post:
      tags: [Stories]
      summary: Create a new story
      description: |
        Creates a new personalized story for the specified child profile.
        Requires an idempotency key to prevent duplicate story creation.
      operationId: createStory
      
      # Custom extensions
      x-scope: parent-facing
      x-visibility: public
      x-idempotency:
        required: true
        lockKey: "create:story:{idempotency_key}"
        ttlSeconds: 86400
        consumesQuota: true
        retrySafe: true
      x-quota:
        type: story
        cost: 1
        refundable: true
        reservedAt: request
      x-rate-limit:
        limit: 10
        window: 60
        scope: user
      x-lifecycle:
        resource: story
        fromStates: []
        toState: draft
        sideEffects:
          - create_story_record
          
      # Standard OpenAPI
      security:
        - bearerAuth: []
      parameters:
        - name: X-Idempotency-Key
          in: header
          required: true
          schema:
            type: string
          description: Unique key for idempotent operation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateStoryRequest'
      responses:
        '201':
          description: Story created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Story'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '402':
          $ref: '#/components/responses/QuotaExhausted'
        '409':
          $ref: '#/components/responses/Conflict'
        '429':
          $ref: '#/components/responses/RateLimited'
```

---

## 9. Canonical Operation Table

All cost/state-changing endpoints with their behavior:

| Endpoint | Idempotent | Lock Key | Retry Safe | Costed | Scope |
|----------|------------|----------|------------|--------|-------|
| `POST /stories` | Yes | `create:story:{key}` | Yes | Yes | parent |
| `POST /stories/:id/assets/generate` | Yes | `gen:asset:{id}` | Yes | Yes | parent |
| `POST /stories/:id/assets/regenerate` | No | - | No | Yes | parent |
| `POST /stories/:id/assets/:id/retry` | Yes | `retry:{id}` | Yes | No | parent |
| `POST /stories/:id/audio` | Yes | `gen:audio:{id}` | Yes | Yes | parent |
| `POST /audio/:id/regenerate` | No | - | No | Yes | parent |
| `POST /emotions/check-in` | Yes | `checkin:{id}:{min}` | Yes | No | child-safe |
| `POST /transfers` | Yes | `transfer:{id}` | Yes | No | parent |
| `POST /transfers/:id/accept` | Yes | `accept:{id}` | Yes | No | parent |
| `PUT /subscriptions` | Yes | `sub:{user}` | Yes | No | parent |
| `POST /conversations` | Yes | `conv:{key}` | Yes | No | child-safe |
| `POST /conversations/:id/message` | No | - | No | No | child-safe |

---

## 10. Code Generation Support

These extensions enable code generation for:

### Client SDK Generation

```typescript
// Generated from x-idempotency
interface CreateStoryOptions {
  idempotencyKey?: string; // Auto-generated if not provided when x-idempotency.required
}

// Generated from x-scope
interface StorytellerClient {
  // @scope: parent-facing
  createStory(data: CreateStoryRequest, options?: CreateStoryOptions): Promise<Story>;
  
  // @scope: child-safe
  listStories(): Promise<Story[]>;
}
```

### Middleware Generation

```typescript
// Generated from x-scope
const routeMiddleware = {
  'POST /stories': [requireAuth, requireScope('parent-facing'), rateLimit(10, 60)],
  'GET /stories': [requireAuth, requireScope('child-safe'), rateLimit(120, 60)],
};
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2024-12-23 | Added canonical rules section (Section 0), marked as SACRED |
| 1.0 | 2024-12-23 | Initial release |

---

## Enforcement

This document is enforced by:
- **CI Validation**: `npm run validate:openapi` - Rejects PRs with missing extensions
- **Lifecycle Middleware**: `enforceLifecycle()` returns ERR_6003 on invalid transitions  
- **Scope Middleware**: `requireScope()` returns 403 on scope violations
- **Idempotency Middleware**: `requireIdempotency()` returns 409 on duplicates

---

*This document defines the contract for OpenAPI extensions. The implementation guide and OpenAPI spec are its executable mirrors. Changes require explicit approval.*

