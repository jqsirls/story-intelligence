# MCP — Fieldnotes Tools (Behavior + Full Examples)

Source of truth:
- [`packages/user-research-agent/src/mcp/server.ts`](../../../../packages/user-research-agent/src/mcp/server.ts)

## Tool 1: `fieldnotes_analyze`

### Behavior (exact)

Calls:
- `engine.analyzeOnDemand({ tenantId: 'storytailor', timeframe, focus, events })`

Returns:
- `content[0].text = JSON.stringify(result, null, 2)`

### Example

Input:

```json
{
  "events": [{"type": "story_created", "timestamp": "2025-12-18T12:00:00Z"}],
  "timeframe": "7 days",
  "focus": "all"
}
```

Output (example):

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"tenantId\": \"storytailor\",\n  \"timeframe\": \"7 days\",\n  \"focus\": \"all\",\n  \"insights\": []\n}"
    }
  ]
}
```

## Tool 2: `fieldnotes_challenge_decision`

### Behavior

Calls:
- `engine.generatePreLaunchMemo('storytailor', feature)`

### Example

```json
{
  "feature": {
    "name": "New bedtime mode",
    "description": "Shorter stories with calming music",
    "targetAudience": "Parents",
    "successMetrics": ["conversion", "retention"]
  }
}
```

## Tool 3: `fieldnotes_generate_brief`

### Behavior

Calls:
- `engine.generateWeeklyBrief('storytailor')`

If `args.format === 'json'`:
- returns `JSON.stringify(brief, null, 2)`

Else:
- returns `brief.content` (markdown string)

## Tool 4: `fieldnotes_interrogate_agent`

### Behavior

Calls:
- `engine.challengeAgent('storytailor', agentName, question)`

Returns:
- JSON stringified `challenge`.

## Error handling

All tool errors are returned as:

```json
{
  "content": [{"type": "text", "text": "Error: <message>"}],
  "isError": true
}
```
