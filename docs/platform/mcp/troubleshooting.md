# MCP Protocol Troubleshooting Guide

**Last Updated:** December 2025  
**Audience:** Cursor Developers, AI Assistant Integrators  
**Purpose:** Common issues and solutions for MCP protocol integration

## Overview

This guide helps diagnose and fix common issues when integrating with the Storytailor MCP (Model Context Protocol) server.

---

## Authentication Issues

### Issue: "Authentication required" Error

**Symptoms:**
- All tool calls returning authentication error
- "JWT token required" message
- Cannot access any tools

**Diagnosis:**
1. Check if JWT token is provided
2. Verify token format
3. Check token hasn't expired

**Solutions:**
- Include JWT token in request:
  ```http
  POST /call
  Authorization: Bearer your-jwt-token
  Content-Type: application/json
  
  {
    "tool": "router.health"
  }
  ```

- Verify token is valid JWT:
  - Should have three parts separated by dots
  - Format: `header.payload.signature`
  - Decode to verify claims

---

### Issue: "Insufficient permissions" - Scope Error

**Symptoms:**
- Authentication works for some tools
- Specific tools return permission error
- Error mentions "required scope"

**Diagnosis:**
1. Check which tool requires which scope
2. Verify token includes required scopes
3. Check scope claim in JWT

**Solutions:**
- Tool scope requirements:
  - `router.health` - No scope required (public)
  - `router.route` - Requires `router:route` scope
  - `jwks.get` - No scope required (public)
  - `content.generate` - Requires `content:generate` scope
  - `hue.*` - Requires `hue:link` scope

- Verify token scopes:
  ```javascript
  // Decode JWT to check scopes
  const decoded = jwt_decode(token);
  console.log('Token scopes:', decoded.scope);
  // Should include required scopes like "router:route content:generate"
  ```

- Request token with correct scopes from OAuth provider

---

## Tool Invocation Issues

### Issue: "Method not found" (-32601)

**Symptoms:**
- Tool name not recognized
- Error: "Method not found"
- Recently worked, now broken

**Diagnosis:**
1. Check tool name spelling
2. Verify tool is available in this MCP server
3. Check if using deprecated tool name

**Solutions:**
- List available tools:
  ```http
  GET /capabilities
  
  Response:
  {
    "tools": ["router.health", "router.route", "jwks.get", ...]
  }
  ```

- Common typos:
  - `router.healh` → `router.health`
  - `routerHealth` → `router.health` (use dot notation)
  - `Router.Health` → `router.health` (lowercase)

---

### Issue: "Invalid params" (-32602)

**Symptoms:**
- Tool recognized but parameters rejected
- Error about missing or invalid parameters

**Diagnosis:**
1. Check tool's parameter schema
2. Verify all required parameters provided
3. Check parameter types match schema

**Solutions:**
- Check tool schema in capabilities:
  ```http
  GET /capabilities
  
  // Find tool schema
  {
    "tools": {
      "router.route": {
        "params": {
          "method": { "type": "string", "required": true },
          "path": { "type": "string", "required": true },
          "body": { "type": "object", "required": false }
        }
      }
    }
  }
  ```

- Provide all required parameters:
  ```json
  {
    "jsonrpc": "2.0",
    "id": "req-123",
    "method": "router.route",
    "params": {
      "method": "POST",      // Required
      "path": "/v1/stories", // Required
      "body": {...}          // Optional but included
    }
  }
  ```

---

## Rate Limiting Issues

### Issue: "Rate limit exceeded"

**Symptoms:**
- Requests suddenly failing
- Error about too many requests
- Works for a while, then stops

**Diagnosis:**
1. Check rate limit: Default is 60 requests/minute
2. Count requests in last minute
3. Check if polling too aggressively

**Solutions:**
- Implement rate limit tracking:
  ```javascript
  class RateLimiter {
    constructor(limit = 60, window = 60000) {
      this.limit = limit;
      this.window = window;
      this.requests = [];
    }
    
    async throttle() {
      const now = Date.now();
      // Remove old requests outside window
      this.requests = this.requests.filter(t => now - t < this.window);
      
      if (this.requests.length >= this.limit) {
        // Wait until oldest request expires
        const oldestRequest = Math.min(...this.requests);
        const waitTime = this.window - (now - oldestRequest);
        await sleep(waitTime);
      }
      
      this.requests.push(now);
    }
  }
  
  // Use before each request
  await rateLimiter.throttle();
  const result = await callMCPTool('router.health');
  ```

- Don't poll every second:
  ```javascript
  // Bad: Too frequent
  setInterval(() => checkStatus(), 1000);
  
  // Good: Reasonable interval
  setInterval(() => checkStatus(), 5000);  // Every 5 seconds
  ```

---

## Connection Issues

### Issue: "Connection timeout" or "ECONNREFUSED"

**Symptoms:**
- Cannot connect to MCP server
- Connection timeout errors
- Network errors

**Diagnosis:**
1. Check MCP server URL is correct
2. Verify MCP server is running
3. Check network connectivity
4. Verify firewall/security groups

**Solutions:**
- Verify MCP server URL:
  ```
  Production: https://[mcp-lambda-url].lambda-url.us-east-1.on.aws/
  ```

- Test connectivity:
  ```bash
  curl https://[mcp-server-url]/capabilities
  # Should return available tools
  ```

- Check Lambda function status in AWS console

---

## Tool-Specific Issues

### Issue: router.route Returns Upstream Error

**Symptoms:**
- `router.route` call succeeds
- But `ok: false` in result
- Upstream error in response

**Diagnosis:**
1. Check upstream status code
2. Review upstream error message
3. Verify router is accessible

**Solutions:**
- Handle upstream errors:
  ```javascript
  const result = await callMCPTool('router.route', {
    method: 'POST',
    path: '/v1/stories',
    body: {...}
  });
  
  if (!result.ok) {
    // Handle upstream error
    console.error('Router error:', result.upstream.body);
    throw new Error(result.upstream.body.error || 'Router request failed');
  }
  
  // Success
  return result.upstream.body;
  ```

- Common upstream errors:
  - Authentication error from router
  - Invalid request to router
  - Router service unavailable

**See also:** [REST API Error Catalog](../../api-reference/error-catalog.md)

---

## Best Practices

### Robust MCP Client Implementation

```javascript
class MCPClient {
  constructor(serverUrl, authToken) {
    this.serverUrl = serverUrl;
    this.authToken = authToken;
    this.requestId = 0;
  }
  
  async callTool(tool, params = {}) {
    const request = {
      jsonrpc: "2.0",
      id: `req-${++this.requestId}`,
      method: tool,
      params
    };
    
    try {
      const response = await fetch(`${this.serverUrl}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(request)
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new MCPError(data.error);
      }
      
      return data.result;
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError) {
        throw new Error('Network error: Cannot reach MCP server');
      }
      throw error;
    }
  }
}
```

### Error Handling Strategy

```javascript
try {
  const result = await mcpClient.callTool('router.route', {...});
} catch (error) {
  if (error.code === -32601) {
    // Method not found - check tool name
    console.error('Invalid tool name');
  } else if (error.code === -32602) {
    // Invalid params - check parameters
    console.error('Invalid parameters:', error.data);
  } else if (error.code === -32003) {
    // Rate limit - backoff and retry
    await sleep(error.data.retryAfter * 1000);
    return await mcpClient.callTool('router.route', {...});
  } else {
    // Unknown error - log and escalate
    console.error('MCP error:', error);
    throw error;
  }
}
```

---

## Debugging Tips

### Enable Verbose Logging

```javascript
// Log all MCP requests/responses
const originalCall = mcpClient.callTool;
mcpClient.callTool = async function(tool, params) {
  console.log(`[MCP] Calling ${tool} with:`, params);
  try {
    const result = await originalCall.call(this, tool, params);
    console.log(`[MCP] Result:`, result);
    return result;
  } catch (error) {
    console.error(`[MCP] Error:`, error);
    throw error;
  }
};
```

### Test Tools Individually

```bash
# Test router.health
curl -X POST https://[mcp-server]/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":"test-1","method":"router.health","params":{}}'

# Test jwks.get
curl -X POST https://[mcp-server]/call \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"test-2","method":"jwks.get","params":{}}'
```

---

## Related Documentation

- **MCP Error Reference:** [Complete Error Codes](./error-reference.md) - All MCP error codes
- **MCP Overview:** [MCP Documentation](./overview.md) - Complete MCP reference
- **Tool Documentation:** [Development Guide](./development.md) - Tool-by-tool documentation
- **REST API Issues:** [REST Troubleshooting](../../api-reference/troubleshooting.md) - General API issues

---

**Storytailor Inc.**  
MCP Protocol Documentation
