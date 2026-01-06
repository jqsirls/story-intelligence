# MCP — Protocol Spec (as implemented) — Exhaustive

This file documents the protocol surfaces actually implemented by `packages/user-research-agent/src/mcp/server.ts`.

## Transport

- **stdio** via `StdioServerTransport`

## Methods supported

The server registers request handlers for:

- `tools/list`
- `tools/call`

No other request types are handled.

## `tools/list`

### Request

The server accepts the MCP SDK `tools/list` request.

### Response

```json
{
  "tools": [
    {
      "name": "fieldnotes_analyze",
      "description": "...",
      "inputSchema": {"type": "object", "properties": {}}
    }
  ]
}
```

## `tools/call`

### Request

The handler expects `request.params` to contain:

- `name`: tool name
- `arguments`: tool arguments object

### Response

Successful calls return:

```json
{
  "content": [
    {"type": "text", "text": "..."}
  ]
}
```

Errors return:

```json
{
  "content": [
    {"type": "text", "text": "Error: <message>"}
  ],
  "isError": true
}
```

## Error behavior (complete)

- Unknown tool name → `Error: Unknown tool: <name>` with `isError: true`.
- Any tool execution failure returns `Error: <message>` with `isError: true`.

No structured JSON-RPC error object is returned by this server; errors are communicated inside text content.
