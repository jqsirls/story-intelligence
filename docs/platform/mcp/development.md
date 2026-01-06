# MCP (Model Context Protocol) - Development Guide

**Status**: ✅ Active
**Last Updated**: 2025-12-17

## Local Development Setup

1. **Clone and Install**:
   ```bash
   git clone [repository-url]
   cd Storytailor-Agent
   npm install
   cd tmp-ci/repo/services/mcp-server
   npm install
   ```

2. **Environment Variables**: Create `.env` file or set environment variables:
   ```bash
   ROUTER_BASE_URL=https://g372yobqhadsjw6ek7szqka3aq0rkyvt.lambda-url.us-east-1.on.aws
   AUTH_JWKS_URL=https://your-jwks-url/.well-known/jwks.json
   TOKEN_ISSUER=https://your-issuer
   MCP_RATE_PER_MINUTE=60
   ```

3. **Start Local Server**:
   ```bash
   npm run dev
   # Or
   node src/index.ts
   ```

4. **Build**:
   ```bash
   npm run build
   ```

5. **Run Tests**:
   ```bash
   npm test
   ```

## Code Structure

### Package Organization

```
tmp-ci/repo/services/mcp-server/
├── src/
│   ├── index.ts          # Main HTTP server and request handling
│   ├── tools.ts          # Tool implementations
│   └── config.ts         # Configuration loading
├── dist/                 # Compiled output
└── package.json
```

### Key Components

- **MCP Server** (`src/index.ts`): Main HTTP server handling JSON-RPC 2.0 requests, authentication, rate limiting, and tool routing
  - **Key Methods**:
    - `handleRequest(req, res)`: Main request handler
    - `verifyJWT(token)`: JWT token verification
    - `checkRateLimit(callerId)`: Rate limiting check
    - `handleToolCall(tool, params)`: Tool invocation

- **Tool Handlers** (`src/tools.ts`): Individual tool implementations
  - **Key Methods**:
    - `routerHealth()`: Check router health
    - `routerRoute(params)`: Route requests to router
    - `jwksGet()`: Get JWKS keys

- **Configuration** (`src/config.ts`): Configuration loading from environment variables and SSM

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/index.ts:1-237` - Main server implementation
- `tmp-ci/repo/services/mcp-server/src/tools.ts` - Tool implementations

## API Reference

### Health Endpoint

**Endpoint**: `GET /health`

**Response**:
```json
{
  "ok": true,
  "service": "mcp-server",
  "time": "2025-12-17T12:00:00.000Z"
}
```

### Capabilities Endpoint

**Endpoint**: `GET /capabilities`

**Response**:
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

### Tool Call Endpoint

**Endpoint**: `POST /call`

**Request**:
```json
{
  "tool": "router.health",
  "params": {}
}
```

**Response**:
```json
{
  "ok": true,
  "result": {
    "status": 200,
    "body": { "service": "router", "status": "healthy" }
  }
}
```

### Tool: router.health

**Purpose**: Check router health status

**Request**:
```json
{
  "tool": "router.health"
}
```

**Response**:
```json
{
  "ok": true,
  "result": {
    "status": 200,
    "body": { "service": "router", "status": "healthy" }
  }
}
```

**Code Reference**: `tmp-ci/repo/services/mcp-server/src/tools.ts:26-31`

### Tool: router.route

**Purpose**: Route requests to agents via router API

**Request**:
```json
{
  "tool": "router.route",
  "params": {
    "method": "GET",
    "path": "/v1/conversation/message",
    "headers": {},
    "body": {},
    "bearerToken": "optional-token"
  }
}
```

**Response**:
```json
{
  "ok": true,
  "result": {
    "status": 200,
    "body": { /* router response */ }
  }
}
```

**Authentication**: Requires `router:route` scope

**Code Reference**: `tmp-ci/repo/services/mcp-server/src/tools.ts:33-96`

### Tool: jwks.get

**Purpose**: Get JWKS (JSON Web Key Set) for authentication

**Request**:
```json
{
  "tool": "jwks.get"
}
```

**Response**:
```json
{
  "ok": true,
  "result": {
    "status": 200,
    "body": { "keys": [...] }
  }
}
```

**Code Reference**: `tmp-ci/repo/services/mcp-server/src/tools.ts:98-103`

## Testing

### Running Tests

```bash
npm test
npm run test:coverage
```

### Test Structure

- Unit tests: Test individual tool implementations
- Integration tests: Test end-to-end tool calls
- E2E tests: Test with actual router Lambda

### Testing Tools Locally

```bash
# Test router.health
curl -X POST http://localhost:3000/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "router.health"}'

# Test router.route
curl -X POST http://localhost:3000/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "tool": "router.route",
    "params": {
      "method": "GET",
      "path": "/health"
    }
  }'
```

## Common Workflows

### Workflow 1: Adding a New Tool

1. **Define Tool in `tools.ts`**:
   ```typescript
   export async function newTool(params: any) {
     // Tool implementation
     return { status: 200, body: { result: "success" } };
   }
   ```

2. **Register Tool in `index.ts`**:
   ```typescript
   const toolHandlers = {
     "new.tool": newTool,
     // ... other tools
   };
   ```

3. **Add to Capabilities Endpoint**:
   ```typescript
   capabilities.tools.push("new.tool");
   ```

4. **Add Authentication Scope** (if needed):
   ```typescript
   if (tool === "new.tool" && !hasScope(token, "new:scope")) {
     return res.status(403).json({ error: "Insufficient scope" });
   }
   ```

### Workflow 2: Testing with Cursor

1. **Start Local Server**:
   ```bash
   npm run dev
   ```

2. **Configure Cursor** (`~/.cursor/mcp.json`):
   ```json
   {
     "mcpServers": {
       "storytailor": {
         "command": "npx",
         "args": [
           "-y",
           "@modelcontextprotocol/server-fetch",
           "http://localhost:3000"
         ]
       }
     }
   }
   ```

3. **Restart Cursor** and test tools

## Troubleshooting

### Issue 1: Router Connection Failed

**Symptoms**: `router.health` or `router.route` returns connection errors

**Solution**:
- Verify `ROUTER_BASE_URL` environment variable is set correctly
- Check router Lambda function is running and accessible
- Verify network connectivity to router Function URL

### Issue 2: JWT Verification Failed

**Symptoms**: Authentication errors when calling tools

**Solution**:
- Verify `AUTH_JWKS_URL` is set correctly
- Check JWT token is valid and not expired
- Verify token has required scopes for the tool

### Issue 3: Rate Limit Exceeded

**Symptoms**: 429 Too Many Requests errors

**Solution**:
- Reduce request frequency
- Increase `MCP_RATE_PER_MINUTE` if appropriate
- Implement exponential backoff in client

## Related Documentation

- [MCP Overview](./overview.md) - Complete technical overview
- [MCP What](./what.md) - Detailed functionality
- [MCP Setup Guide](../../docs/MCP_SETUP.md) - Setup instructions
