# MCP — Integration Examples (Claude Desktop / Cursor / Custom Clients)

This document provides practical integration guidance.

## 1) Run the server

The MCP server is a Node process that runs over stdio.

Entry point:
- `packages/user-research-agent/src/mcp/server.ts`

## 2) Claude Desktop configuration (example)

A typical Claude Desktop MCP config points to a command that starts the server.

Example (conceptual):

```json
{
  "mcpServers": {
    "fieldnotes": {
      "command": "node",
      "args": ["dist/mcp/server.js"],
      "env": {
        "SUPABASE_URL": "...",
        "SUPABASE_SERVICE_ROLE_KEY": "...",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  }
}
```

## 3) Cursor integration

Cursor can use MCP servers through its MCP configuration. Provide the same `command`, `args`, and `env` values.

## 4) Custom client behavior

Clients typically:
- call `tools/list`
- call `tools/call` with the selected tool name and arguments
- parse returned `content` text

## 5) Error handling

If `isError: true`, treat `content[0].text` as an error string.

## 6) Output parsing

All successful tool outputs are stringified JSON (pretty-printed) in `content[0].text`, except:
- `fieldnotes_generate_brief` when `format = 'markdown'` returns markdown in `content[0].text`.
