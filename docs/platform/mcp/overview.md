Status: Draft  
Audience: Internal | Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 4 - MCP server overview with code references

# MCP (Model Context Protocol) Server Overview

## What is MCP?

The Storytailor MCP (Model Context Protocol) server allows Cursor and other AI assistants to interact with Storytailor's agent system through standardized tools using JSON-RPC 2.0 protocol.

**Status**: ✅ **Deployed to Production**
- **Function**: `storytailor-mcp-server-production`
- **Region**: us-east-1 ✅ (migrated December 13, 2025)
- **State**: Active & Successful

**Code References:**
- `docs/docs/MCP_SETUP.md:10-15` - MCP server status
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:36-59` - MCP deployment status
- `tmp-ci/repo/services/mcp-server/src/index.ts:1-237` - MCP server implementation

## Available Tools

### 1. router.health

**Purpose:** Check router health status

**Endpoint:** `GET /tools/router.health` or `POST /call` with `{ "tool": "router.health" }`

**Response:**
```json
{
  "ok": true,
  "upstream": {
    "status": 200,
    "body": { "status": "healthy" }
  }
}
```

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/tools.ts:26-31` - routerHealth() implementation
- `tmp-ci/repo/services/mcp-server/src/index.ts:84-90` - GET endpoint handler
- `tmp-ci/repo/services/mcp-server/src/index.ts:133-139` - POST /call handler

### 2. router.route

**Purpose:** Route requests to agents (pass-through to router API)

**Endpoint:** `POST /tools/router.route` or `POST /call` with `{ "tool": "router.route", "params": {...} }`

**Request:**
```json
{
  "method": "GET" | "POST",
  "path": "/v1/conversation/message",
  "headers": {},
  "body": {},
  "bearerToken": "optional-token"
}
```

**Response:**
```json
{
  "ok": true,
  "upstream": {
    "status": 200,
    "body": { /* router response */ }
  }
}
```

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/tools.ts:33-96` - routerRoute() implementation with JSON Schema validation
- `tmp-ci/repo/services/mcp-server/src/index.ts:92-118` - POST endpoint handler
- `tmp-ci/repo/services/mcp-server/src/index.ts:141-146` - POST /call handler

**Authentication:** Requires `router:route` scope

### 3. jwks.get

**Purpose:** Get JWKS (JSON Web Key Set) for authentication

**Endpoint:** `GET /tools/jwks.get` or `POST /call` with `{ "tool": "jwks.get" }`

**Response:**
```json
{
  "ok": true,
  "upstream": {
    "status": 200,
    "body": { "keys": [...] }
  }
}
```

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/tools.ts:98-103` - jwksGet() implementation
- `tmp-ci/repo/services/mcp-server/src/index.ts:212-218` - GET endpoint handler
- `tmp-ci/repo/services/mcp-server/src/index.ts:148-152` - POST /call handler

### Additional Tools

**Hue Integration Tools:**
- `hue.start` - Start Hue OAuth flow
- `hue.callback` - Handle Hue OAuth callback
- `hue.pair` - Pair Hue device
- `hue.finalize` - Finalize Hue connection

**Content Tools:**
- `content.generate` - Generate story content
- `content.stream` - Stream content generation

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/index.ts:153-194` - Additional tool handlers

## Protocol Implementation

### JSON-RPC 2.0 Compliance

The MCP server implements JSON-RPC 2.0 protocol for standardized tool calling.

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/index.ts:78-222` - HTTP server with JSON-RPC handling
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:43` - JSON-RPC 2.0 compliance

### Legacy Support

**Unified HTTP Adapter:** `POST /call` endpoint for backward compatibility

**Request:**
```json
{
  "tool": "router.health",
  "params": {}
}
```

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/index.ts:120-201` - Unified /call endpoint

## Capabilities Endpoint

**Endpoint:** `GET /capabilities`

**Response:**
```json
{
  "ok": true,
  "capabilities": {
    "tools": [
      "router.health",
      "router.route",
      "jwks.get",
      "hue.start",
      "hue.callback",
      "hue.pair",
      "hue.finalize",
      "content.generate",
      "content.stream"
    ],
    "transport": ["http", "ws"],
    "scopes": [
      "router:read",
      "router:route",
      "auth:jwks:read",
      "hue:link",
      "content:generate",
      "content:stream"
    ],
    "rateLimits": {
      "defaultPerMinute": 60
    }
  }
}
```

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/index.ts:203-211` - Capabilities endpoint

## Authentication

### JWT Authentication

The MCP server supports JWT authentication with JWKS verification.

**Token Verification:**
- JWKS URL from environment or SSM
- Token issuer validation
- Scope checking per tool

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/index.ts:9-40` - JWT verification logic
- `tmp-ci/repo/services/mcp-server/src/index.ts:129-134` - Scope checking

### Required Scopes

- `router:read` - For `router.health`
- `router:route` - For `router.route`
- `hue:link` - For Hue tools
- `content:generate` - For content generation
- `content:stream` - For content streaming

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/index.ts:134,142,154,161,168,175,182,189` - Scope checks

## Rate Limiting

**Default:** 60 requests per minute per caller

**Configuration:** `MCP_RATE_PER_MINUTE` environment variable

**Implementation:** Fixed-window per-minute rate limiter

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/index.ts:54-76` - Rate limiting implementation
- `tmp-ci/repo/services/mcp-server/src/index.ts:6` - Rate limit configuration

## Deployment

### Lambda Function

**Function Name:** `storytailor-mcp-server-production`
**Region:** us-east-1 ✅ (migrated December 13, 2025)
**Runtime:** Node.js

**Code References:**
- `docs/docs/MCP_SETUP.md:12-15` - Deployment status
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:46-49` - Deployment details

### Function URL

The MCP server is accessible via Lambda Function URL.

**Get Function URL:**
```bash
aws lambda get-function-url-config \
  --function-name storytailor-mcp-server-production \
  --region us-east-1 \
  --query 'FunctionUrl' \
  --output text
```

**Code References:**
- `docs/docs/MCP_SETUP.md:40-61` - Function URL configuration

## Configuration

### Environment Variables

- `ROUTER_BASE_URL` - Router API base URL (from SSM or env)
- `AUTH_JWKS_URL` - JWKS URL for token verification (optional)
- `TOKEN_ISSUER` - Token issuer (optional)
- `MCP_RATE_PER_MINUTE` - Rate limiting (default: 60)

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/config.ts` - Configuration loading
- `tmp-ci/repo/services/mcp-server/src/index.ts:5-6` - Environment variables

## Integration with Cursor

### Cursor MCP Configuration

**Location:** `~/.cursor/mcp.json`

**Configuration:**
```json
{
  "mcpServers": {
    "storytailor": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "https://<your-mcp-server-endpoint>"
      ],
      "env": {
        "STORYTAILOR_API_KEY": "your-api-key-if-needed"
      }
    }
  }
}
```

**Code References:**
- `docs/docs/MCP_SETUP.md:63-86` - Cursor configuration

## Related Documentation

- **Setup Guide:** See `docs/docs/MCP_SETUP.md`
- **Status Report:** See `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md`
- **Server Implementation:** See `tmp-ci/repo/services/mcp-server/src/`
