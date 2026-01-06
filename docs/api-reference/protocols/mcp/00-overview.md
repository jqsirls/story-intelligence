# MCP (Model Context Protocol) — Overview (Production) — Exhaustive

MCP is used to expose Storytailor’s **Fieldnotes research agent** as a tool server for AI assistants (e.g., Claude Desktop, Cursor).

Source of truth:
- MCP server implementation: [`packages/user-research-agent/src/mcp/server.ts`](../../../../packages/user-research-agent/src/mcp/server.ts)

## What MCP is (as implemented here)

- A local tool protocol implemented using `@modelcontextprotocol/sdk`.
- Transport: **stdio** (`StdioServerTransport`).
- Capabilities: **tools**.

## Server identity

The server reports:
- `name`: `fieldnotes-research-agent`
- `version`: `1.0.0`

## Tools exposed (complete)

The server exposes exactly these tool names:
- `fieldnotes_analyze`
- `fieldnotes_challenge_decision`
- `fieldnotes_generate_brief`
- `fieldnotes_interrogate_agent`
- `storytailor_id_create` (delegates to REST API)
- `storytailor_id_list` (delegates to REST API)

Each tool's input schema is a JSON Schema object and is returned via `tools/list`.

**Note**: Storytailor ID tools (`storytailor_id_*`) delegate directly to REST API endpoints via HTTP calls. They require an `access_token` parameter for authentication.

## Output shape

Tool calls return an object with:

- `content`: array of content items
- optional `isError: true`

This server returns only `type: 'text'` content items.

Example:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"some\": \"json\"\n}"
    }
  ]
}
```

On errors:

```json
{
  "content": [
    {"type": "text", "text": "Error: <message>"}
  ],
  "isError": true
}
```

## Environment dependencies

The server initializes the research engine with:
- `SUPABASE_URL` (required for production usefulness)
- `SUPABASE_SERVICE_ROLE_KEY` (required)
- `REDIS_URL` (defaults to `redis://localhost:6379`)

## Relationship to A2A and REST

- **REST**: customer/product API.
- **A2A**: partner integration protocol (JSON-RPC + tasks + webhooks).
- **MCP**: local tool bridge for AI assistants.
