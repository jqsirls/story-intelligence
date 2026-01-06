Status: Draft  
Audience: Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 4 - REST API documentation with code references

# Storytailor REST API

## Overview

The Storytailor REST API provides comprehensive third-party integration capabilities through a robust REST API, GraphQL endpoint, webhook system, and developer dashboard.

**Implementation:** `packages/universal-agent/src/api/RESTAPIGateway.ts`
**Base URL (Production):** `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/v1` ✅
**Base URL (Production):** `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/v1`

**Note:** Production resources are in `us-east-1`. The legacy URL may be for staging/legacy purposes. Verify which URL to use for your environment.

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:74-3500` - Complete REST API Gateway implementation
- `docs/storytailor/partner_integration.md:148-266` - REST API endpoints
- `docs/system/api_endpoints_inventory.md` - Complete endpoint inventory

## Authentication

### API Key Authentication

**Header Format:**
```
Authorization: Bearer <api_key>
```

**Alternative:**
```
X-API-Key: <api_key>
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:381-419` - API key validation middleware
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2970-2994` - API key hashing

### JWT Token Authentication

**Header Format:**
```
Authorization: Bearer <jwt_token>
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` - JWT validation middleware

## Core Endpoints

### Conversation Endpoints

**Start Conversation:**
```http
POST /v1/conversation/start
Content-Type: application/json

{
  "platform": "web",
  "language": "en",
  "voiceEnabled": true,
  "smartHomeEnabled": false
}
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:625-657` - Start conversation endpoint

**Send Message:**
```http
POST /v1/conversation/message
Content-Type: application/json

{
  "sessionId": "session-123",
  "message": {
    "type": "text",
    "content": "Create an adventure story"
  }
}
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:660-683` - Send message endpoint

**Stream Conversation:**
```http
POST /v1/conversation/stream
Content-Type: text/event-stream

{
  "sessionId": "session-123",
  "message": {
    "type": "text",
    "content": "Continue the story"
  }
}
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:715-735` - Stream endpoint

### Story Endpoints

**Create Story:**
```http
POST /v1/stories
Content-Type: application/json

{
  "character": {
    "name": "Brave Knight",
    "age": 7
  },
  "storyType": "adventure"
}
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:825-848` - Story creation endpoint

**Get Story:**
```http
GET /v1/stories/:id
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:850-875` - Story retrieval endpoint

**List Stories:**
```http
GET /v1/stories?limit=10&offset=0
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:877-905` - Story listing endpoint

### Character Endpoints

**Create Character:**
```http
POST /v1/characters
Content-Type: application/json

{
  "name": "Brave Knight",
  "age": 7,
  "species": "human"
}
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - Character endpoints

## GraphQL Endpoint

**Endpoint:** `/graphql`

**Interactive Playground:** Available in development mode

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2300-2420` - GraphQL setup
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2415-2420` - GraphiQL interface

## WebSocket Support

**Endpoint:** `ws://<host>/ws`

**Message Types:**
- `start_conversation` - Start conversation
- `send_message` - Send message
- `stream_message` - Stream message
- `subscribe_webhooks` - Subscribe to webhooks

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2507-2576` - WebSocket setup

## Webhooks

### Create Webhook

```http
POST /v1/webhooks
Content-Type: application/json

{
  "url": "https://example.com/webhook",
  "events": ["story.created", "story.completed"],
  "secret": "webhook-secret"
}
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - Webhook management endpoints

### Webhook Delivery

Webhooks are delivered with HMAC-SHA256 signatures for verification.

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2768-2803` - Webhook delivery with HMAC
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2782-2787` - HMAC signature generation

## Rate Limiting

**Default:** 1000 requests per hour per API key

**Headers:**
- `X-RateLimit-Limit` - Maximum requests per window
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Time when limit resets

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:340-380` - Rate limiting middleware
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2890-2893` - Per-API-key rate limits

## API Documentation

### Swagger/OpenAPI

**Endpoint:** `/api-docs`

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2422-2505` - Swagger documentation setup

### API Reference

**Endpoint:** `/docs`

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:550-579` - API documentation endpoint

## Complete Endpoint Inventory

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

**Code References:**
- `docs/storytailor/partner_integration.md:247-262` - Complete endpoint categories
- `docs/system/api_endpoints_inventory.md` - Complete endpoint inventory

## Related Documentation

- **Partner Integration:** See [Partner Integration Guide](../../storytailor/partner_integration.md)
- **Web SDK:** See [Web SDK Documentation](./web-sdk.md)
- **Widget:** See [Embeddable Widget](../widget.md)
