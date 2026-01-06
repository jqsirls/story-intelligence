# MCP — Requests and Responses (Complete)

This file shows the concrete request/response shapes used by the Fieldnotes MCP server.

## 1) `tools/list`

### Example request (conceptual)

Clients send a `tools/list` request per MCP SDK.

### Example response

```json
{
  "tools": [
    {
      "name": "fieldnotes_analyze",
      "description": "Analyze user behavior patterns and surface insights from Fieldnotes research intelligence",
      "inputSchema": {
        "type": "object",
        "properties": {
          "events": {"type": "array", "items": {"type": "object"}},
          "timeframe": {"type": "string", "default": "7 days"},
          "focus": {"type": "string", "enum": ["buyer", "user", "all"], "default": "all"}
        }
      }
    }
  ]
}
```

## 2) `tools/call`

### Request parameters

- `params.name`: tool name
- `params.arguments`: tool argument object

### Example call: `fieldnotes_analyze`

Request params:

```json
{
  "name": "fieldnotes_analyze",
  "arguments": {
    "timeframe": "7 days",
    "focus": "all",
    "events": [
      {"type": "story_created", "timestamp": "2025-12-18T12:00:00Z"}
    ]
  }
}
```

Response:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"insights\": [],\n  \"confidence\": 0.8\n}"
    }
  ]
}
```

## 3) Error response

If a tool is unknown or throws:

```json
{
  "content": [
    {"type": "text", "text": "Error: Unknown tool: fieldnotes_nope"}
  ],
  "isError": true
}
```

## Content types

This MCP server uses only:
- `type: 'text'`

It does not return file/data content types.
