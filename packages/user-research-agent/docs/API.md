# Fieldnotes API Reference

Complete reference for REST API and MCP tools.

## REST API

Base URL: `http://localhost:3000` (development)

### Authentication

All endpoints require API key authentication:

```bash
# Header method
X-API-Key: your-api-key

# Or Bearer token
Authorization: Bearer your-api-key
```

### Endpoints

#### POST /api/v1/analyze

On-demand behavior analysis.

**Request:**
```json
{
  "tenantId": "storytailor",
  "timeframe": "7 days",
  "focus": "all",
  "events": []
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [...],
    "patterns": [...],
    "trackEvaluations": [...],
    "costUsed": 0.5,
    "generatedAt": "2025-01-14T10:00:00Z"
  },
  "timestamp": "2025-01-14T10:00:00Z"
}
```

#### POST /api/v1/pre-mortem

Generate pre-launch risk assessment for a feature.

**Request:**
```json
{
  "tenantId": "storytailor",
  "feature": {
    "name": "Quick Story Mode",
    "description": "Fast-path story creation in 3 taps",
    "targetAudience": "parents",
    "successMetrics": ["completion_rate", "time_to_story"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "featureName": "Quick Story Mode",
    "recommendation": "fix_first",
    "confidence": 0.75,
    "whoIsThisFor": {...},
    "whenWouldTheyQuit": [...],
    "whatWillConfuse": [...],
    ...
  },
  "timestamp": "2025-01-14T10:00:00Z"
}
```

#### GET /api/v1/insights

List recent insights.

**Query Parameters:**
- `tenantId` (optional, default: "storytailor")
- `limit` (optional, default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [...]
  },
  "timestamp": "2025-01-14T10:00:00Z"
}
```

#### GET /api/v1/briefs/latest

Get the most recent research brief.

**Query Parameters:**
- `tenantId` (optional, default: "storytailor")

**Response:**
```json
{
  "success": true,
  "data": {
    "brief": {...}
  },
  "timestamp": "2025-01-14T10:00:00Z"
}
```

#### POST /api/v1/webhooks/configure

Configure webhook delivery.

**Request:**
```json
{
  "tenantId": "storytailor",
  "url": "https://your-webhook-endpoint.com/fieldnotes",
  "events": ["new_insight", "weekly_brief", "critical_finding"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Webhook configured successfully"
  },
  "timestamp": "2025-01-14T10:00:00Z"
}
```

#### GET /api/v1/tenants/:id/usage

Get usage and cost statistics for a tenant.

**Response:**
```json
{
  "success": true,
  "data": {
    "usage": {
      "totalCost": "145.32",
      "totalTokens": 2456789,
      "operationCount": 487,
      "byModel": {
        "gpt-4o-mini": {...},
        "claude-haiku": {...},
        "claude-sonnet": {...}
      }
    }
  },
  "timestamp": "2025-01-14T10:00:00Z"
}
```

#### POST /api/v1/challenges

Challenge another agent with a data-backed question.

**Request:**
```json
{
  "tenantId": "storytailor",
  "agentName": "content-agent",
  "question": "Why are princess stories generating low retention?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "challengedAgent": "content-agent",
    "question": "...",
    "synthesis": "...",
    "actionable": true,
    "createdAt": "2025-01-14T10:00:00Z"
  },
  "timestamp": "2025-01-14T10:00:00Z"
}
```

## MCP Tools

### fieldnotes_analyze

Analyze user behavior patterns and surface insights.

**Parameters:**
```typescript
{
  events?: Event[],
  timeframe?: string,  // "7 days", "30 days", etc.
  focus?: 'buyer' | 'user' | 'all'
}
```

**Returns:** AnalysisResult with insights, patterns, and track evaluations.

### fieldnotes_challenge_decision

Run adversarial pre-mortem analysis on a proposed feature.

**Parameters:**
```typescript
{
  feature: {
    name: string,
    description: string,
    targetAudience: string,
    successMetrics?: string[]
  }
}
```

**Returns:** PreLaunchMemo with ship/don't ship/fix first recommendation.

### fieldnotes_generate_brief

Generate research brief with insights from all tracks.

**Parameters:**
```typescript
{
  tracks?: string[],  // Optional: specific tracks to include
  format?: 'markdown' | 'json'
}
```

**Returns:** Complete research brief.

### fieldnotes_interrogate_agent

Challenge another agent with a data-backed question.

**Parameters:**
```typescript
{
  agentName: string,  // e.g., "content-agent"
  question: string    // Data-backed challenge
}
```

**Returns:** AgentChallenge with synthesis and actionability.

## Webhook Events

When webhooks are configured, Fieldnotes sends payloads for:

### new_insight
```json
{
  "event": "new_insight",
  "tenantId": "storytailor",
  "data": {
    "id": "uuid",
    "finding": "...",
    "evidence": [...],
    "recommendation": "...",
    "severity": "high"
  },
  "timestamp": "2025-01-14T10:00:00Z",
  "signature": "hmac-sha256-signature"
}
```

### weekly_brief
```json
{
  "event": "weekly_brief",
  "tenantId": "storytailor",
  "data": {
    "id": "uuid",
    "weekOf": "2025-01-13",
    "critical": {...},
    "tensions": [...],
    "content": "..."
  },
  "timestamp": "2025-01-14T10:00:00Z"
}
```

### critical_finding
```json
{
  "event": "critical_finding",
  "tenantId": "storytailor",
  "data": {
    "insight": {...}
  },
  "timestamp": "2025-01-14T10:00:00Z"
}
```

### pre_launch_memo
```json
{
  "event": "pre_launch_memo",
  "tenantId": "storytailor",
  "data": {
    "memo": {...}
  },
  "timestamp": "2025-01-14T10:00:00Z"
}
```

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message here",
  "timestamp": "2025-01-14T10:00:00Z"
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad request (missing parameters)
- `401` - Unauthorized (missing API key)
- `403` - Forbidden (invalid API key)
- `500` - Internal server error

## Rate Limits

Currently no rate limits for internal use. When productized:

- Starter: 100 requests/hour
- Professional: 500 requests/hour
- Enterprise: Unlimited

## Webhooks Security

Webhook payloads include HMAC signature for verification:

```typescript
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## SDK Reference

See [`README.md`](../README.md) for SDK usage examples.

## Support

Internal use only. For questions: `#product-insights` Slack channel.
