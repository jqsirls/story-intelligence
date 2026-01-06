# MCP (Model Context Protocol) - When

**Last Updated**: 2025-12-17

## When to Use MCP

Use MCP when:

1. **AI Assistant Integration**: Integrating with AI assistants like Cursor, Claude Desktop, or other MCP-compatible tools
2. **Developer Tooling**: Providing AI-powered developer tools that need access to Storytailor capabilities
3. **Standardized Tool Access**: Need standardized JSON-RPC 2.0 protocol for tool calling
4. **AI-Powered Development**: Enabling AI assistants to interact with Storytailor's agent system during development workflows

## When NOT to Use MCP

Do NOT use MCP for:

- ❌ **Internal Agent Communication**: Use gRPC instead for high-performance internal agent-to-agent calls
- ❌ **External Partner Integration**: Use A2A (Agent-to-Agent) protocol instead for partner platform integration
- ❌ **Direct API Access**: Use REST API directly for programmatic access without AI assistant context
- ❌ **High-Throughput Production Workloads**: Use gRPC or REST API for production traffic requiring high performance

## Integration Scenarios

### Scenario 1: Cursor AI Assistant Integration

**When**: Developers using Cursor want AI assistance with Storytailor-related tasks

**How**: Configure Cursor's MCP settings to connect to Storytailor MCP server

**Example**:
```json
{
  "mcpServers": {
    "storytailor": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "https://gri66fqbukqq3ghgqb4kfrqabi0dupql.lambda-url.us-east-1.on.aws"
      ]
    }
  }
}
```

**Use Cases**:
- AI assistant checking router health during development
- AI assistant routing requests to test agent functionality
- AI assistant generating story content for testing

### Scenario 2: Claude Desktop Integration

**When**: Users want Claude Desktop to interact with Storytailor capabilities

**How**: Configure Claude Desktop MCP settings similar to Cursor

**Use Cases**:
- Conversational interaction with Storytailor through Claude
- Content generation assistance
- Smart home device control via Hue integration

### Scenario 3: Custom AI Assistant Integration

**When**: Building custom AI assistant tools that need Storytailor integration

**How**: Implement MCP client following JSON-RPC 2.0 protocol and connect to MCP server

**Use Cases**:
- Custom development tools
- Internal AI-powered workflows
- Testing and automation tools

## Protocol Comparison

| Feature | MCP | A2A | gRPC |
|---------|-----|-----|------|
| **Primary Use Case** | AI assistant integration | External partner integration | Internal agent communication |
| **Protocol** | JSON-RPC 2.0 | JSON-RPC 2.0 | gRPC (Protocol Buffers) |
| **Performance** | Medium (HTTP-based) | Medium (HTTP-based) | High (binary, streaming) |
| **Complexity** | Low (standardized tools) | Medium (task lifecycle) | Low (direct calls) |
| **Authentication** | JWT with JWKS | API Key, OAuth 2.0, OpenID Connect | Internal (service-to-service) |
| **Rate Limiting** | Per-caller (60/min default) | Per-agent (configurable) | Not applicable (internal) |
| **Best For** | AI assistants, developer tools | Partner platforms, external agents | Internal services, high throughput |

## Usage Guidelines

### Best Practices

- **Use Appropriate Authentication**: Always use JWT tokens with proper scopes for tool access
- **Respect Rate Limits**: Be aware of 60 requests/minute default limit and implement backoff if needed
- **Handle Errors Gracefully**: Implement proper error handling for JSON-RPC 2.0 error responses
- **Cache When Possible**: Cache router health checks and JWKS keys to reduce API calls
- **Use Correct Scopes**: Ensure JWT tokens have appropriate scopes for the tools you're calling

### Common Pitfalls

- **Avoid Using for Production Traffic**: MCP is designed for AI assistant integration, not high-volume production workloads
- **Don't Bypass Rate Limits**: Rate limiting is in place for a reason - respect it
- **Don't Use Without Authentication**: Always authenticate requests with valid JWT tokens
- **Avoid Mixing Protocols**: Use MCP for AI assistants, A2A for partners, gRPC for internal calls

### Integration Checklist

Before integrating with MCP:

- ✅ Verify MCP server is accessible (check Function URL)
- ✅ Obtain JWT token with appropriate scopes
- ✅ Configure JWKS URL for token verification (if using custom auth)
- ✅ Test with `router.health` tool first
- ✅ Implement rate limiting and error handling
- ✅ Review available tools via `/capabilities` endpoint

## Related Documentation

- [MCP Overview](./overview.md) - Complete technical overview
- [MCP What](./what.md) - Detailed functionality
- [A2A Protocol](../a2a/overview.md) - For partner integration
- [gRPC Protocol](../../packages/shared-types/src/schemas/agent-rpc.proto) - For internal agent communication
