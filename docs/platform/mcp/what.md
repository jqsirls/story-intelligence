# MCP (Model Context Protocol) - What

**Status**: ✅ Active
**Last Updated**: 2025-12-17

## Core Functionality

The MCP (Model Context Protocol) server provides a standardized interface for AI assistants (like Cursor and Claude Desktop) to interact with Storytailor's agent system. Its primary functions include:

1. **Tool Exposure**: Exposes Storytailor capabilities as standardized MCP tools using JSON-RPC 2.0 protocol
2. **Router Integration**: Provides direct access to router health checks and routing capabilities
3. **Authentication Management**: Handles JWT authentication with JWKS verification and scope checking
4. **Rate Limiting**: Implements per-caller rate limiting to prevent abuse
5. **Protocol Compliance**: Ensures full JSON-RPC 2.0 protocol compliance for AI assistant integration

## Technical Architecture

### Core Components

- **MCP Server** (`tmp-ci/repo/services/mcp-server/src/index.ts`): Main HTTP server handling JSON-RPC 2.0 requests, authentication, rate limiting, and tool routing
- **Tool Handlers** (`tmp-ci/repo/services/mcp-server/src/tools.ts`): Individual tool implementations (router.health, router.route, jwks.get, etc.)
- **JWT Verification** (`tmp-ci/repo/services/mcp-server/src/index.ts:9-40`): JWT token verification with JWKS support and scope checking
- **Rate Limiter** (`tmp-ci/repo/services/mcp-server/src/index.ts:54-76`): Fixed-window per-minute rate limiting implementation

### Protocol Implementation

The MCP server implements JSON-RPC 2.0 protocol for standardized tool calling:

- **Request Format**: JSON-RPC 2.0 compliant requests
- **Response Format**: JSON-RPC 2.0 compliant responses with error handling
- **Transport**: HTTP (Lambda Function URL) with WebSocket support planned
- **Authentication**: JWT tokens with JWKS verification and scope-based authorization

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/index.ts:78-222` - HTTP server with JSON-RPC handling
- `tmp-ci/repo/services/mcp-server/src/index.ts:120-201` - Unified /call endpoint for backward compatibility

## Key Features

### Router Tools

**router.health**:
- **Purpose**: Check router health status
- **Endpoint**: `GET /tools/router.health` or `POST /call` with `{ "tool": "router.health" }`
- **Response**: Router health status
- **Code Reference**: `tmp-ci/repo/services/mcp-server/src/tools.ts:26-31`

**router.route**:
- **Purpose**: Route requests to agents (pass-through to router API)
- **Endpoint**: `POST /tools/router.route` or `POST /call` with `{ "tool": "router.route", "params": {...} }`
- **Authentication**: Requires `router:route` scope
- **Code Reference**: `tmp-ci/repo/services/mcp-server/src/tools.ts:33-96`

### Authentication Tools

**jwks.get**:
- **Purpose**: Get JWKS (JSON Web Key Set) for authentication
- **Endpoint**: `GET /tools/jwks.get` or `POST /call` with `{ "tool": "jwks.get" }`
- **Response**: JWKS keys for token verification
- **Code Reference**: `tmp-ci/repo/services/mcp-server/src/tools.ts:98-103`

### Smart Home Integration

**Hue Tools** (hue.start, hue.callback, hue.pair, hue.finalize):
- **Purpose**: Philips Hue smart home device integration
- **Authentication**: Requires `hue:link` scope
- **Code Reference**: `tmp-ci/repo/services/mcp-server/src/index.ts:153-194`

### Content Generation

**content.generate** and **content.stream**:
- **Purpose**: Generate and stream story content
- **Authentication**: Requires `content:generate` or `content:stream` scope
- **Code Reference**: `tmp-ci/repo/services/mcp-server/src/index.ts:153-194`

## Protocol Details

### JSON-RPC 2.0 Compliance

The MCP server is fully compliant with JSON-RPC 2.0 specification:

- **Method Invocation**: Standard JSON-RPC 2.0 method calls
- **Error Handling**: JSON-RPC 2.0 error codes and messages
- **Request/Response Format**: Standard JSON-RPC 2.0 structure

### Capabilities Endpoint

**Endpoint**: `GET /capabilities`

Returns available tools, transport methods, scopes, and rate limits:

```json
{
  "ok": true,
  "capabilities": {
    "tools": ["router.health", "router.route", "jwks.get", ...],
    "transport": ["http", "ws"],
    "scopes": ["router:read", "router:route", ...],
    "rateLimits": {
      "defaultPerMinute": 60
    }
  }
}
```

**Code Reference**: `tmp-ci/repo/services/mcp-server/src/index.ts:203-211`

### Authentication

**JWT Authentication**:
- Token verification via JWKS URL (from environment or SSM)
- Token issuer validation
- Scope-based authorization per tool

**Required Scopes**:
- `router:read` - For `router.health`
- `router:route` - For `router.route`
- `auth:jwks:read` - For `jwks.get`
- `hue:link` - For Hue tools
- `content:generate` - For content generation
- `content:stream` - For content streaming

**Code Reference**: `tmp-ci/repo/services/mcp-server/src/index.ts:9-40` - JWT verification logic

### Rate Limiting

**Default**: 60 requests per minute per caller

**Configuration**: `MCP_RATE_PER_MINUTE` environment variable

**Implementation**: Fixed-window per-minute rate limiter

**Code Reference**: `tmp-ci/repo/services/mcp-server/src/index.ts:54-76`

## Integration Points

### Internal Systems

- **Router Lambda**: Direct integration with `storytailor-router-production` for health checks and routing
- **Agent System**: Indirect access to all Storytailor agents through router

### External Systems

- **Cursor**: AI code editor integration via MCP protocol
- **Claude Desktop**: AI assistant integration via MCP protocol
- **Other AI Assistants**: Any MCP-compatible AI assistant can integrate

### Cursor Integration

The MCP server integrates with Cursor via configuration in `~/.cursor/mcp.json`:

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

**Code Reference**: `docs/docs/MCP_SETUP.md:63-86` - Cursor configuration
