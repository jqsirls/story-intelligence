Status: Draft  
Audience: Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 2 - Partner integration guide with code references for APIs, SDKs, webhooks, and authentication

# Storytailor Partner Integration Guide

## Overview

This guide provides comprehensive instructions for integrating with the Storytailor platform as a partner. It covers authentication, API usage, SDK integration, webhooks, and best practices. All endpoints and features are verified against actual code with file paths and line numbers.

## Getting Started

### Base URLs

- **Staging**: `https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging`
- **Production**: `https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/production` (when available)

**Code Reference:**
- `docs/system/deployment_inventory.md:30,52` - Lambda function URLs

### Quick Start

1. **Register Account**: `POST /v1/auth/register` (`packages/universal-agent/src/api/RESTAPIGateway.ts:973-1077`)
2. **Create API Key**: `POST /v1/developer/api-keys` (`packages/universal-agent/src/api/RESTAPIGateway.ts:2900-2950`)
3. **Make First Request**: Use API key in `Authorization: Bearer [REDACTED_JWT]

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:973-1077` - Auth routes
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2900-2950` - API key creation

## Authentication

### Authentication Methods

Storytailor supports two authentication methods:

#### 1. JWT Tokens (User Accounts)

**Registration:**
```http
POST /v1/auth/register
Content-Type: application/json

{
  "email": "partner@example.com",
  "password": "secure-password",
  "name": "Partner Name"
}
```

**Login:**
```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "partner@example.com",
  "password": "secure-password"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "[REDACTED_JWT]",
  "user": { "id": "uuid", "email": "partner@example.com" }
}
```

**Usage:**
```http
Authorization: Bearer [REDACTED_JWT]
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:973-1077` - Auth routes setup
- `packages/auth-agent/src/auth-agent.ts:31-450+` - Auth Agent implementation
- `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` - JWT validation middleware

#### 2. API Keys (Recommended for Production)

**Creation:**
```http
POST /v1/developer/api-keys
Authorization: Bearer [REDACTED_JWT]
Content-Type: application/json

{
  "name": "Production API Key",
  "permissions": ["stories:read", "stories:write", "characters:read"],
  "rateLimit": {
    "requests": 10000,
    "window": 3600
  },
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "apiKey": {
    "key": "[REDACTED_API_KEY]",  // ⚠️ Store immediately - only shown once
    "keyPrefix": "st_live_abc",
    "name": "Production API Key",
    "permissions": ["stories:read", "stories:write"],
    "rateLimit": { "requests": 10000, "window": 3600 },
    "createdAt": "2025-12-13T12:00:00Z",
    "isActive": true
  }
}
```

**Usage:**
```http
Authorization: Bearer [REDACTED_JWT]
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2900-2950` - API key creation endpoint
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2995-3037` - API key creation logic
- `packages/universal-agent/src/api/RESTAPIGateway.ts:500-535` - API key validation
- `supabase/migrations/20240101000018_api_keys_and_webhooks.sql:5-56` - API key schema

### API Key Security

**Storage:**
- API keys are hashed using secure hashing algorithm
- Only key prefix stored in database (`key_prefix` column)
- Full key only returned once on creation

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2970-2994` - Key hashing logic
- `supabase/migrations/20240101000018_api_keys_and_webhooks.sql:57-72` - Hash storage schema

**Best Practices:**
- Store API keys securely (environment variables, secret management)
- Never commit API keys to version control
- Rotate keys regularly
- Use different keys for different environments

## REST API Integration

### Core Endpoints

#### Story Management

**Create Story:**
```http
POST /v1/stories
Authorization: Bearer [REDACTED_JWT]
Content-Type: application/json

{
  "character": {
    "name": "Brave Knight",
    "age": 7
  },
  "storyType": "adventure"
}
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:825-848` - Story creation endpoint

**Get Story:**
```http
GET /v1/stories/:id
Authorization: Bearer [REDACTED_JWT]
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:850-875` - Story retrieval endpoint

**List Stories:**
```http
GET /v1/stories?limit=10&offset=0
Authorization: Bearer [REDACTED_JWT]
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:877-905` - Story listing endpoint

#### Character Management

**Create Character:**
```http
POST /v1/characters
Authorization: Bearer [REDACTED_JWT]
Content-Type: application/json

{
  "name": "Brave Knight",
  "age": 7,
  "traits": ["brave", "curious"],
  "preferences": {
    "favoriteColor": "blue",
    "favoriteAnimal": "dragon"
  }
}
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:906-971` - Character endpoints

#### Library Management

**Create Library:**
```http
POST /v1/libraries
Authorization: Bearer [REDACTED_JWT]
Content-Type: application/json

{
  "name": "My Story Library",
  "description": "Collection of adventure stories"
}
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:796-824` - Library endpoints
- `packages/library-agent/src/LibraryAgent.ts:52-95` - Library CRUD operations

**Share Library:**
```http
POST /v1/libraries/:id/share
Authorization: Bearer [REDACTED_JWT]
Content-Type: application/json

{
  "userId": "target-user-uuid",
  "permission": "read"
}
```

**Code Reference:**
- `packages/library-agent/src/services/PermissionService.ts` - Permission management

### Complete API Reference

**Total Endpoints:** 60+ REST API endpoints

**Endpoint Categories:**
- Conversation: 8 endpoints (`/v1/conversation/*`)
- Stories: 6 endpoints (`/v1/stories/*`)
- Characters: 3 endpoints (`/v1/characters/*`)
- Libraries: 5 endpoints (`/v1/libraries/*`)
- Auth: 5+ endpoints (`/v1/auth/*`)
- Smart Home: 3 endpoints (`/v1/smarthome/*`)
- Webhooks: 7 endpoints (`/v1/webhooks/*`)
- Analytics: 3 endpoints (`/v1/analytics/*`)
- Developer: 4 endpoints (`/developer/*`)
- Localization: 8 endpoints (`/v1/localization/*`)
- Therapeutic Groups: 13 endpoints (`/v1/therapeutic-groups/*`)
- Partner Integration: 9 endpoints (`/v1/partners/*`)

**Verified Against:**
- `docs/system/api_endpoints_inventory.md:24-360` - Complete endpoint inventory
- `packages/universal-agent/src/api/RESTAPIGateway.ts:537-619` - Route setup

## SDK Integration

### Web SDK

**Package:** `packages/web-sdk/`

**Installation:**
```bash
npm install @storytailor/web-sdk
```

**Usage:**
```javascript
import { StorytellerSDK } from '@storytailor/web-sdk';

const sdk = new StorytellerSDK({
  apiBaseURL: 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging',
  apiKey: '[REDACTED_API_KEY]'
});

// Start conversation
const session = await sdk.startConversation({
  userId: 'user-123',
  language: 'en'
});

// Send message
const response = await sdk.sendMessage('Create an adventure story');
```

**Code Reference:**
- `packages/web-sdk/src/index.ts` - Web SDK entry point

### iOS SDK

**Package:** `packages/mobile-sdk-ios/`

**Installation:**
```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/storytailor/mobile-sdk-ios", from: "1.0.0")
]
```

**Usage:**
```swift
import StorytellerSDK

let config = StorytellerSDK.Configuration(
    apiBaseURL: "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging",
    apiKey: "[REDACTED_API_KEY]",
    enableVoice: true,
    enableOfflineMode: true
)

let sdk = StorytellerSDK(configuration: config)
try await sdk.initialize()

// Start conversation
let session = try await sdk.startConversation(
    userId: "user-123",
    parentalControls: ParentalControls.default
)

// Send message
let response = try await sdk.sendMessage("Create an adventure story")
```

**Code Reference:**
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift:10-363` - iOS SDK implementation
- `packages/mobile-sdk-ios/Sources/APIClient.swift` - API client
- `packages/mobile-sdk-ios/Sources/VoiceProcessor.swift` - Voice processing

### Android SDK

**Package:** `packages/mobile-sdk-android/`

**Installation:**
```kotlin
// build.gradle.kts
dependencies {
    implementation("com.storytailor:mobile-sdk-android:1.0.0")
}
```

**Code Reference:**
- `packages/mobile-sdk-android/` - Android SDK package

### React Native SDK

**Package:** `packages/mobile-sdk-react-native/`

**Installation:**
```bash
npm install @storytailor/react-native-sdk
```

**Code Reference:**
- `packages/mobile-sdk-react-native/` - React Native SDK package

### Embeddable Widget

**Package:** `packages/storytailor-embed/`

**Installation:**
```html
<script src="https://cdn.storytailor.com/embed/v1/storytailor-embed.js"></script>
```

**Usage:**
```javascript
const embed = new StorytailorEmbed({
  apiKey: '[REDACTED_API_KEY]',
  apiBaseURL: 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging',
  container: '#storytailor-container',
  theme: {
    primaryColor: '#your-brand-color',
    fontFamily: 'Your Font'
  }
});

embed.initialize();
```

**Code Reference:**
- `packages/storytailor-embed/src/index.ts:1-15` - Embed entry point
- `packages/storytailor-embed/src/StorytalorEmbed.ts` - Main embed class

## Webhooks

### Webhook Setup

**Create Webhook:**
```http
POST /v1/webhooks
Authorization: Bearer [REDACTED_JWT]
Content-Type: application/json

{
  "url": "https://your-server.com/webhooks/storytailor",
  "events": [
    "story.created",
    "story.completed",
    "character.created",
    "library.updated"
  ],
  "secret": "your-webhook-secret",
  "retryPolicy": {
    "maxRetries": 3,
    "backoffMultiplier": 2,
    "initialDelayMs": 1000,
    "maxDelayMs": 30000
  },
  "timeout": 10000
}
```

**Response:**
```json
{
  "success": true,
  "webhook": {
    "id": "webhook-uuid",
    "url": "https://your-server.com/webhooks/storytailor",
    "events": ["story.created", "story.completed"],
    "secret": "your-webhook-secret",
    "isActive": true,
    "createdAt": "2025-12-13T12:00:00Z"
  }
}
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2705-2750` - Webhook creation endpoint
- `packages/universal-agent/src/api/RESTAPIGateway.ts:3039-3116` - Webhook creation logic
- `supabase/migrations/20240101000018_api_keys_and_webhooks.sql:73-120` - Webhook schema

### Webhook Events

**Available Events:**
- `story.created` - Story created
- `story.completed` - Story completed
- `story.updated` - Story updated
- `character.created` - Character created
- `character.updated` - Character updated
- `library.created` - Library created
- `library.updated` - Library updated
- `conversation.started` - Conversation started
- `conversation.ended` - Conversation ended

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2608-2703` - Webhook triggering logic

### Webhook Delivery

**Delivery Process:**
1. Event occurs in Storytailor
2. WebhookDeliverySystem triggers delivery (`packages/universal-agent/src/api/RESTAPIGateway.ts:2608-2623`)
3. HMAC signature generated (`packages/universal-agent/src/api/RESTAPIGateway.ts:2782-2787`)
4. HTTP POST to webhook URL
5. Retry logic with exponential backoff on failure
6. Delivery status tracked in database

**Webhook Payload:**
```json
{
  "id": "event-uuid",
  "type": "story.created",
  "data": {
    "storyId": "story-uuid",
    "characterId": "character-uuid",
    "storyType": "adventure",
    "createdAt": "2025-12-13T12:00:00Z"
  },
  "timestamp": "2025-12-13T12:00:00Z",
  "userId": "user-uuid",
  "source": "storytailor-api"
}
```

**HMAC Signature:**
```http
X-Storytailor-Signature: sha256=<signature>
X-Storytailor-Timestamp: 1702214400
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2625-2703` - Webhook delivery
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2782-2787` - HMAC signature generation
- `supabase/migrations/20240101000018_api_keys_and_webhooks.sql:121-180` - Webhook deliveries table

### Webhook Verification

**Verify HMAC Signature:**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret, timestamp) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(timestamp);
  hmac.update('.');
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2782-2787` - HMAC generation logic

### Webhook Management

**List Webhooks:**
```http
GET /v1/webhooks
Authorization: Bearer [REDACTED_JWT]
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2752-2780` - Webhook listing

**Update Webhook:**
```http
PUT /v1/webhooks/:id
Authorization: Bearer [REDACTED_JWT]
Content-Type: application/json

{
  "url": "https://new-url.com/webhooks",
  "events": ["story.created", "story.completed"],
  "isActive": true
}
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:3181-3250` - Webhook update logic

**Delete Webhook:**
```http
DELETE /v1/webhooks/:id
Authorization: Bearer [REDACTED_JWT]
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2807-2830` - Webhook deletion

**Get Webhook Delivery History:**
```http
GET /v1/webhooks/:id/deliveries?limit=10
Authorization: Bearer [REDACTED_JWT]
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:1178-1182` - Delivery history endpoint

## Partner Integration Endpoints

### Integration Management

**List Available Integrations:**
```http
GET /v1/partners/integrations
Authorization: Bearer [REDACTED_JWT]
```

**Response:**
```json
{
  "success": true,
  "integrations": [
    {
      "id": "stripe",
      "name": "Stripe",
      "type": "payment",
      "status": "connected",
      "description": "Payment processing and subscription management"
    },
    {
      "id": "hue",
      "name": "Philips Hue",
      "type": "smart_home",
      "status": "available",
      "description": "Smart lighting integration for narrative experiences"
    }
  ]
}
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2179-2222` - Integration listing

**Connect Integration:**
```http
POST /v1/partners/integrations/:integrationId/connect
Authorization: Bearer [REDACTED_JWT]
Content-Type: application/json

{
  "credentials": {
    "apiKey": "integration-api-key",
    "apiSecret": "integration-api-secret"
  },
  "config": {
    "environment": "production"
  }
}
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2225-2245` - Integration connection

**Get Integration Status:**
```http
GET /v1/partners/integrations/:integrationId/status
Authorization: Bearer [REDACTED_JWT]
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2267-2280` - Integration status

**Test Integration:**
```http
POST /v1/partners/integrations/:integrationId/test
Authorization: Bearer [REDACTED_JWT]
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2318-2332` - Integration testing

### OAuth Integration

**Start OAuth Flow:**
```http
GET /v1/partners/oauth/:provider/start
Authorization: Bearer [REDACTED_JWT]
```

**Response:**
```json
{
  "success": true,
  "provider": "stripe",
  "authUrl": "https://connect.stripe.com/oauth/authorize?state=...",
  "state": "oauth-state-token"
}
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2283-2298` - OAuth start

**OAuth Callback:**
```http
GET /v1/partners/oauth/:provider/callback?code=...&state=...
Authorization: Bearer [REDACTED_JWT]
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2301-2315` - OAuth callback

## Rate Limiting

### Rate Limit Configuration

**Default Limits:**
- 1000 requests per hour per API key
- Configurable per API key on creation

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` - Rate limiter setup
- `packages/universal-agent/src/api/RESTAPIGateway.ts:3001-3002` - API key rate limit configuration

### Rate Limit Headers

**Response Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1702218000
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` - Rate limiting implementation

### Handling Rate Limits

**429 Too Many Requests Response:**
```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded your rate limit of 1000 requests per hour",
  "retryAfter": 3600
}
```

## Error Handling

### Error Response Format

**Standard Error Response:**
```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "additional error details"
  }
}
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:3500-3511` - Error handling

### Common Error Codes

| Status Code | Error Code | Description |
|------------|------------|-------------|
| 400 | `validation_error` | Request validation failed |
| 401 | `unauthorized` | Authentication failed |
| 403 | `forbidden` | Insufficient permissions |
| 404 | `not_found` | Resource not found |
| 429 | `rate_limit_exceeded` | Rate limit exceeded |
| 500 | `internal_error` | Internal server error |

## GraphQL API

**Endpoint:** `/graphql`

**Status:** ✅ Implemented

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:109` - GraphQL setup method
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2373-` - GraphQL implementation

> ASSUMPTION: GraphQL schema and query examples not verified in code - requires code inspection

TAG: RISK  
TODO[ENGINEERING]: Document GraphQL schema and query examples

## WebSocket API

**Endpoint:** WebSocket connection for real-time communication

**Status:** ✅ Implemented

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2507-2576` - WebSocket setup

**Usage:**
```javascript
const ws = new WebSocket('wss://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/ws');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  // Handle real-time updates
});
```

> ASSUMPTION: WebSocket protocol details not fully verified in code

TAG: RISK  
TODO[ENGINEERING]: Document WebSocket protocol and message formats

## Best Practices

### Security

1. **API Key Management**
   - Store API keys securely (environment variables, secret management)
   - Never commit keys to version control
   - Rotate keys regularly
   - Use different keys for different environments

2. **Webhook Security**
   - Always verify HMAC signatures
   - Validate timestamp to prevent replay attacks
   - Use HTTPS for webhook URLs
   - Store webhook secrets securely

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2782-2787` - HMAC signature generation

### Performance

1. **Caching**
   - Cache story and character data when possible
   - Respect cache headers in responses
   - Use ETags for conditional requests

2. **Rate Limiting**
   - Monitor rate limit headers
   - Implement exponential backoff on 429 responses
   - Use appropriate rate limits for your use case

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` - Rate limiting

### Error Handling

1. **Retry Logic**
   - Implement retry with exponential backoff
   - Handle transient errors (5xx status codes)
   - Don't retry on 4xx client errors

2. **Error Logging**
   - Log all API errors with context
   - Monitor error rates
   - Alert on error spikes

## Developer Dashboard

**Endpoint:** `GET /developer/dashboard`

**Response:**
```json
{
  "success": true,
  "dashboard": {
    "apiKeys": [...],
    "webhooks": [...],
    "usage": {
      "totalRequests": 10000,
      "requestsToday": 500,
      "averageResponseTime": 1200,
      "errorRate": 0.5,
      "topEndpoints": [...]
    },
    "analytics": {
      "requestsOverTime": [...],
      "errorsByType": [...],
      "responseTimeDistribution": [...]
    }
  }
}
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:3118-3147` - Dashboard data generation
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2850-2900` - Dashboard endpoint

## Integration Examples

### Web Application Integration

```javascript
// Using fetch
const response = await fetch('https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/stories', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    character: { name: 'Brave Knight', age: 7 },
    storyType: 'adventure'
  })
});

const story = await response.json();
```

### Mobile App Integration (React Native)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1',
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
});

const createStory = async (character, storyType) => {
  const response = await api.post('/stories', {
    character,
    storyType
  });
  return response.data;
};
```

### Webhook Handler Example

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.post('/webhooks/storytailor', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-storytailor-signature'];
  const timestamp = req.headers['x-storytailor-timestamp'];
  const secret = process.env.WEBHOOK_SECRET;
  
  // Verify signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(timestamp);
  hmac.update('.');
  hmac.update(req.body);
  const expectedSignature = hmac.digest('hex');
  
  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  const event = JSON.parse(req.body);
  console.log('Received event:', event.type, event.data);
  
  res.status(200).send('OK');
});
```

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2782-2787` - HMAC signature format

## Support & Resources

### Documentation

- **API Reference**: `docs/system/api_endpoints_inventory.md`
- **System Architecture**: `docs/system/architecture.md`
- **Integration Guides**: `docs/docs/INTEGRATION_GUIDE.md`

### Code References Summary

| Feature | Code Location | Lines |
|---------|---------------|-------|
| **REST API Gateway** | `packages/universal-agent/src/api/RESTAPIGateway.ts` | 74-3511 |
| **Authentication** | `packages/universal-agent/src/api/RESTAPIGateway.ts` | 320-536 |
| **API Key Management** | `packages/universal-agent/src/api/RESTAPIGateway.ts` | 2995-3230 |
| **Webhook System** | `packages/universal-agent/src/api/RESTAPIGateway.ts` | 2608-2703 |
| **Partner Routes** | `packages/universal-agent/src/api/RESTAPIGateway.ts` | 2175-2371 |
| **Auth Agent** | `packages/auth-agent/src/auth-agent.ts` | 31-450+ |
| **Web SDK** | `packages/web-sdk/src/index.ts` | - |
| **iOS SDK** | `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift` | 10-363 |
| **Embed Widget** | `packages/storytailor-embed/src/index.ts` | 1-15 |

## Integration Checklist

- [ ] Register account and obtain API key
- [ ] Configure webhook endpoint (if using webhooks)
- [ ] Implement HMAC signature verification
- [ ] Set up error handling and retry logic
- [ ] Configure rate limiting monitoring
- [ ] Test integration in staging environment
- [ ] Monitor API usage and performance
- [ ] Set up alerting for errors and rate limits

## Known Limitations

1. **GraphQL Documentation**: GraphQL schema not fully documented
2. **WebSocket Protocol**: WebSocket message formats not fully documented
3. **OAuth Integrations**: OAuth flow implementation may be placeholder

TAG: RISK  
TODO[ENGINEERING]: Complete GraphQL schema documentation  
TODO[ENGINEERING]: Document WebSocket protocol  
TODO[ENGINEERING]: Verify OAuth integration implementation
