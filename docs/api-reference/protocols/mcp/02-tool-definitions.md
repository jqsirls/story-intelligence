# MCP — Tool Definitions (Complete)

Source of truth:
- [`packages/user-research-agent/src/mcp/server.ts`](../../../../packages/user-research-agent/src/mcp/server.ts)

This server exposes exactly six tools (four Fieldnotes research tools + two Storytailor ID tools).

## Tool: `fieldnotes_analyze`

### Description

Analyze user behavior patterns and surface insights.

### Input schema (exact)

```json
{
  "type": "object",
  "properties": {
    "events": {
      "type": "array",
      "items": {"type": "object"},
      "description": "Array of events to analyze"
    },
    "timeframe": {
      "type": "string",
      "description": "Time period to analyze (e.g., \"7 days\", \"30 days\")",
      "default": "7 days"
    },
    "focus": {
      "type": "string",
      "enum": ["buyer", "user", "all"],
      "description": "Analysis focus: buyer persona, user persona, or both",
      "default": "all"
    }
  }
}
```

## Tool: `fieldnotes_challenge_decision`

### Input schema (exact)

```json
{
  "type": "object",
  "properties": {
    "feature": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "description": {"type": "string"},
        "targetAudience": {"type": "string"},
        "successMetrics": {
          "type": "array",
          "items": {"type": "string"}
        }
      },
      "required": ["name", "description", "targetAudience"],
      "description": "Feature specification to analyze"
    }
  },
  "required": ["feature"]
}
```

## Tool: `fieldnotes_generate_brief`

### Input schema (exact)

```json
{
  "type": "object",
  "properties": {
    "tracks": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "continuous_insight_mining",
          "buyer_reality_check",
          "user_experience_guardrails",
          "concept_interrogation",
          "brand_consistency"
        ]
      },
      "description": "Tracks to include in brief (default: all)"
    },
    "format": {
      "type": "string",
      "enum": ["markdown", "json"],
      "description": "Output format",
      "default": "markdown"
    }
  }
}
```

## Tool: `fieldnotes_interrogate_agent`

### Input schema (exact)

```json
{
  "type": "object",
  "properties": {
    "agentName": {
      "type": "string",
      "description": "Name of the agent to challenge (e.g., \"content-agent\")"
    },
    "question": {
      "type": "string",
      "description": "Data-backed question to ask the agent"
    }
  },
  "required": ["agentName", "question"]
}
```

## Tool: `storytailor_id_create`

### Description

Create a new Storytailor ID (narrative identity for a child, represented through a character). Supports character-first creation. This tool delegates to the REST API endpoint `POST /api/v1/storytailor-ids`.

### Input schema (exact)

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the Storytailor ID (e.g., \"Emma's Stories\")"
    },
    "primary_character_id": {
      "type": "string",
      "description": "Optional: UUID of character to use as primary identity (character-first creation)"
    },
    "age_range": {
      "type": "string",
      "enum": ["3-5", "6-8", "9-10", "11-12", "13-15", "16-17"],
      "description": "Optional: Age range for child Storytailor IDs"
    },
    "is_minor": {
      "type": "boolean",
      "description": "Optional: Whether this is a child Storytailor ID"
    },
    "parent_storytailor_id": {
      "type": "string",
      "description": "Optional: Parent Storytailor ID UUID (creates child Storytailor ID)"
    },
    "access_token": {
      "type": "string",
      "description": "Bearer token for authentication (required)"
    }
  },
  "required": ["name", "access_token"]
}
```

### Example request

```json
{
  "name": "storytailor_id_create",
  "arguments": {
    "name": "Emma's Stories",
    "primary_character_id": "char-123",
    "age_range": "6-8",
    "is_minor": true,
    "access_token": "[REDACTED_JWT]"
  }
}
```

### Example response

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"success\": true,\n  \"storytailorId\": {\n    \"id\": \"550e8400-e29b-41d4-a716-446655440000\",\n    \"name\": \"Emma's Stories\",\n    \"primaryCharacterId\": \"char-123\",\n    \"ageRange\": \"6-8\",\n    \"isMinor\": true,\n    \"consentStatus\": \"pending\",\n    \"createdAt\": \"2025-12-26T12:00:00.000Z\"\n  }\n}"
    }
  ]
}
```

## Tool: `storytailor_id_list`

### Description

List all Storytailor IDs owned by the authenticated user. This tool delegates to the REST API endpoint `GET /api/v1/storytailor-ids`.

### Input schema (exact)

```json
{
  "type": "object",
  "properties": {
    "access_token": {
      "type": "string",
      "description": "Bearer token for authentication (required)"
    }
  },
  "required": ["access_token"]
}
```

### Example request

```json
{
  "name": "storytailor_id_list",
  "arguments": {
    "access_token": "[REDACTED_JWT]"
  }
}
```

### Example response

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"success\": true,\n  \"storytailorIds\": [\n    {\n      \"id\": \"550e8400-e29b-41d4-a716-446655440000\",\n      \"name\": \"My Stories\",\n      \"primaryCharacterId\": null,\n      \"ageRange\": null,\n      \"isMinor\": false,\n      \"consentStatus\": \"none\",\n      \"createdAt\": \"2025-12-20T10:00:00.000Z\"\n    }\n  ]\n}"
    }
  ]
}
```

### Error response

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: access_token is required for Storytailor ID operations"
    }
  ],
  "isError": true
}
```
