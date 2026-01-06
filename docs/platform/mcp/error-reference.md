# MCP Protocol Error Reference

**Last Updated:** December 2025  
**Audience:** AI Assistant Developers, Cursor Integration Developers  
**Purpose:** Complete MCP error code reference with recovery steps

## Overview

The MCP (Model Context Protocol) server uses JSON-RPC 2.0 error codes. This document provides comprehensive error documentation specific to MCP tool integration.

---

## Error Response Format

All MCP errors follow JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "details": "Additional error context"
    }
  }
}
```

---

## Standard JSON-RPC 2.0 Errors

### -32700: Parse Error

**What it means:** Invalid JSON was received by the server.

**Common causes:**
- Malformed JSON in request body
- Missing closing braces/brackets
- Invalid escape sequences
- Trailing commas

**How to fix:**
1. Validate JSON before sending
2. Use JSON.stringify() for request body
3. Check for syntax errors

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32700,
    "message": "Parse error",
    "data": {
      "received": "Invalid JSON string",
      "position": 45
    }
  }
}
```

---

### -32600: Invalid Request

**What it means:** The JSON sent is not a valid JSON-RPC 2.0 Request object.

**Common causes:**
- Missing `jsonrpc` field
- Missing `method` field
- Invalid `id` field
- Wrong JSON-RPC version

**How to fix:**
1. Include all required fields: `jsonrpc`, `method`, `id`
2. Use `"jsonrpc": "2.0"` exactly
3. Ensure `id` is string or number

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "missing": ["method"],
      "suggestion": "Request must include 'method' field"
    }
  }
}
```

**Correct request format:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "method": "router.health",
  "params": {}
}
```

---

### -32601: Method Not Found

**What it means:** The method/tool does not exist.

**Common causes:**
- Tool name typo
- Tool not available in this MCP server
- Using deprecated tool name

**How to fix:**
1. Check available tools: `GET /capabilities`
2. Verify tool name spelling
3. Check if tool requires specific scopes

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "error": {
    "code": -32601,
    "message": "Method not found",
    "data": {
      "method": "router.healh",  // Typo
      "suggestion": "Did you mean 'router.health'?",
      "availableMethods": ["router.health", "router.route", "jwks.get"]
    }
  }
}
```

---

### -32602: Invalid Params

**What it means:** Invalid method parameters provided.

**Common causes:**
- Missing required parameters
- Wrong parameter type
- Invalid parameter value
- Extra unexpected parameters

**How to fix:**
1. Check tool schema in `/capabilities`
2. Provide all required parameters
3. Match expected parameter types
4. Remove unexpected parameters

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "tool": "router.route",
      "missing": ["path"],
      "required": ["method", "path"],
      "provided": ["method", "body"]
    }
  }
}
```

---

### -32603: Internal Error

**What it means:** Internal JSON-RPC error in the MCP server.

**Common causes:**
- Unexpected server error
- Unhandled exception
- System malfunction

**How to fix:**
1. Retry request once
2. If persists: Likely server issue
3. Contact support with error details

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "errorId": "error-uuid-for-tracking",
      "retryable": true
    }
  }
}
```

---

## MCP-Specific Errors

### Authentication Errors

**Missing JWT Token:**
```json
{
  "error": {
    "code": -32001,
    "message": "Authentication required",
    "data": {
      "required": "JWT token with valid scopes"
    }
  }
}
```

**Invalid Scope:**
```json
{
  "error": {
    "code": -32002,
    "message": "Insufficient permissions",
    "data": {
      "requiredScope": "router:route",
      "providedScopes": ["router:health"]
    }
  }
}
```

---

### Rate Limiting

**Rate Limit Exceeded:**
```json
{
  "error": {
    "code": -32003,
    "message": "Rate limit exceeded",
    "data": {
      "limit": 60,
      "window": "1 minute",
      "resetAt": "2025-01-15T10:31:00Z",
      "retryAfter": 45
    }
  }
}
```

**How to handle:**
```javascript
if (error.code === -32003) {
  const retryAfter = error.data.retryAfter || 60;
  await sleep(retryAfter * 1000);
  // Retry request
}
```

---

## Tool-Specific Errors

### router.route Errors

**Upstream Error:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "result": {
    "ok": false,
    "upstream": {
      "status": 500,
      "body": {
        "error": "Story generation failed"
      }
    }
  }
}
```

Note: `router.route` wraps upstream errors in result, not error field.

---

### jwks.get Errors

**JWKS Unavailable:**
```json
{
  "error": {
    "code": -32603,
    "message": "Failed to fetch JWKS",
    "data": {
      "jwksUrl": "https://www.googleapis.com/oauth2/v3/certs",
      "reason": "Connection timeout"
    }
  }
}
```

---

## Error Recovery Patterns

### Pattern 1: Retry with Backoff
```javascript
async function callMCPToolWithRetry(tool, params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callMCPTool(tool, params);
    } catch (error) {
      // Retry on transient errors
      if ([-32603, -32003].includes(error.code) && i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

### Pattern 2: Handle Tool-Specific Errors
```javascript
async function routeToAgent(path, body) {
  const result = await callMCPTool('router.route', {
    method: 'POST',
    path,
    body
  });
  
  // router.route wraps errors in result.upstream
  if (!result.ok) {
    throw new Error(result.upstream.body.error);
  }
  
  return result.upstream.body;
}
```

---

## Related Documentation

- **MCP Overview:** [MCP Documentation](./overview.md) - Complete MCP reference
- **MCP Troubleshooting:** [Troubleshooting Guide](./troubleshooting.md) - Common issues
- **REST API Errors:** [Error Catalog](../../api-reference/error-catalog.md) - REST API errors
- **A2A Errors:** [A2A Reference](../a2a/api-reference.md#detailed-error-reference) - A2A protocol errors

---

**Storytailor Inc.**  
MCP Protocol Documentation
