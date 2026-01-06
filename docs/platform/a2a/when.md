# A2A (Agent-to-Agent) Protocol - When

**Last Updated**: 2025-12-17

## When to Use A2A

Use A2A when:

1. **External Agent Integration**: Integrating with external agents or partner platforms that require standardized agent-to-agent communication
2. **Partner Requirements**: Partner specifically requires A2A protocol (e.g., Amazon Alexa+)
3. **Cross-Platform Communication**: Communicating with agents on different platforms or systems
4. **Task-Based Workflows**: Need task lifecycle management with status tracking, progress updates, and state management
5. **Webhook Notifications**: Require webhook-based event notifications for asynchronous task completion
6. **Real-Time Status Updates**: Need Server-Sent Events (SSE) for real-time task status streaming

## When NOT to Use A2A

Do NOT use A2A for:

- ❌ **Internal Agent Communication**: Use gRPC instead for high-performance internal agent-to-agent calls
- ❌ **AI Assistant Integration**: Use MCP (Model Context Protocol) instead for AI assistant tool integration (Cursor, Claude Desktop)
- ❌ **High-Throughput Internal Services**: Use gRPC for production traffic requiring high performance and low latency
- ❌ **Direct API Access**: Use REST API directly for programmatic access without agent context

## Integration Scenarios

### Scenario 1: Amazon Alexa+ Integration

**When**: Partner platform (Amazon Alexa+) requires A2A protocol for agent integration

**How**: Configure A2A adapter to handle Alexa+ agent requests via A2A endpoints

**Example**:
```json
// Alexa+ agent discovers Storytailor
GET /a2a/discovery

// Alexa+ agent delegates story generation task
POST /a2a/task
{
  "taskId": "alexa-task-123",
  "targetAgent": "content-agent",
  "taskType": "story-generation",
  "parameters": { "storyType": "Adventure" }
}

// Alexa+ agent monitors task status via SSE
GET /a2a/status?taskId=alexa-task-123
```

**Use Cases**:
- Story generation for Alexa+ users
- Emotional check-ins via Alexa+
- Crisis detection integration

### Scenario 2: Third-Party Agent Platform

**When**: External agent platform wants to integrate with Storytailor capabilities

**How**: External platform uses A2A protocol to discover, message, and delegate tasks to Storytailor

**Use Cases**:
- Content generation for external platforms
- Wellness assessment integration
- Safety screening services

### Scenario 3: Task-Based Workflow

**When**: Need complex task workflows with status tracking and progress updates

**How**: Use A2A task delegation with SSE for real-time status updates

**Example**:
```json
// Submit task
POST /a2a/task
{
  "taskId": "workflow-123",
  "taskType": "story-generation",
  "parameters": { ... }
}

// Monitor via SSE
GET /a2a/status?taskId=workflow-123
// Receives real-time updates:
// data: {"status": "working", "progress": 25}
// data: {"status": "working", "progress": 50}
// data: {"status": "completed", "result": {...}}
```

**Use Cases**:
- Long-running content generation tasks
- Multi-step agent workflows
- Tasks requiring user input

## Protocol Comparison

| Feature | A2A | gRPC | MCP |
|---------|-----|------|-----|
| **Primary Use Case** | External partner integration | Internal agent communication | AI assistant integration |
| **Protocol** | JSON-RPC 2.0 | gRPC (Protocol Buffers) | JSON-RPC 2.0 |
| **Performance** | Medium (HTTP-based) | High (binary, streaming) | Medium (HTTP-based) |
| **Complexity** | Medium (task lifecycle) | Low (direct calls) | Low (standardized tools) |
| **Authentication** | API Key, OAuth 2.0, OpenID Connect | Internal (service-to-service) | JWT with JWKS |
| **Task Management** | ✅ Full lifecycle support | ❌ Not applicable | ❌ Not applicable |
| **Webhooks** | ✅ Supported | ❌ Not applicable | ❌ Not applicable |
| **SSE Streaming** | ✅ Supported | ✅ Native streaming | ❌ Not applicable |
| **Best For** | Partner platforms, external agents | Internal services, high throughput | AI assistants, developer tools |

## Usage Guidelines

### Best Practices

- **Use Appropriate Authentication**: Choose authentication scheme based on partner requirements (API Key for simple, OAuth 2.0 for complex)
- **Implement Task State Management**: Use A2A task lifecycle for long-running operations
- **Monitor Task Status**: Use SSE for real-time status updates on important tasks
- **Handle Webhooks Securely**: Verify webhook signatures and validate payloads
- **Respect Rate Limits**: Be aware of rate limits (60 requests/minute default per agent)
- **Use Agent Discovery**: Always discover agent capabilities before integration

### Common Pitfalls

- **Avoid Using for Internal Calls**: A2A is designed for external integration - use gRPC for internal calls
- **Don't Mix Protocols**: Use A2A for partners, gRPC for internal, MCP for AI assistants
- **Don't Ignore Task Lifecycle**: Use proper task state management for reliable workflows
- **Avoid Bypassing Authentication**: Always authenticate A2A requests properly

### Integration Checklist

Before integrating with A2A:

- ✅ Verify A2A endpoints are accessible (check Universal Agent Lambda)
- ✅ Discover agent capabilities via `GET /a2a/discovery`
- ✅ Obtain appropriate authentication credentials (API Key, OAuth token, etc.)
- ✅ Test with simple message first (`POST /a2a/message`)
- ✅ Implement task lifecycle management for complex workflows
- ✅ Set up webhook endpoints for task notifications (if needed)
- ✅ Review available methods and capabilities

## Protocol Boundaries

### Clear Separation

**A2A Protocol**:
- External agent/partner integration
- Task-based workflows
- Webhook notifications
- Cross-platform communication

**gRPC Protocol**:
- Internal agent-to-agent calls
- High-performance services
- Binary protocol for efficiency
- Service-to-service communication

**MCP Protocol**:
- AI assistant integration
- Developer tooling
- Standardized tool access
- IDE integration

### Protocol Coexistence

All three protocols coexist and route through the same Router:

```
External Agent (A2A) ──┐
                       │
AI Assistant (MCP) ────┼──> Router ──> Content Agent
                       │              └──> Emotion Agent
Internal Agent (gRPC) ─┘              └──> Library Agent
```

**Key Points**:
- Each protocol has its own entry point but uses the same backend
- A2A and MCP translate JSON-RPC calls to router intents
- Router uses gRPC internally for high-performance agent calls
- Protocols don't conflict - they're complementary

## Related Documentation

- [A2A Overview](./overview.md) - Complete protocol overview
- [A2A What](./what.md) - Detailed functionality
- [A2A Integration Guide](./integration-guide.md) - Step-by-step integration
- [A2A API Reference](./api-reference.md) - Complete API documentation
- [MCP Protocol](../mcp/overview.md) - For AI assistant integration
- [gRPC Protocol](../../packages/shared-types/src/schemas/agent-rpc.proto) - For internal agent communication
