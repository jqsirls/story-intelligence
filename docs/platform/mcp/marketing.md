# MCP (Model Context Protocol) - Marketing Information

**Last Updated**: 2025-12-17

## Value Proposition

The Storytailor MCP server enables AI assistants like Cursor and Claude Desktop to directly interact with Storytailor's agent system, dramatically improving developer productivity and making Storytailor capabilities accessible through standardized tools.

## Key Marketing Messages

- **"AI-Powered Development"**: Use Cursor or Claude Desktop to interact with Storytailor agents directly from your IDE, reducing development time and improving workflow efficiency
- **"Standardized Tool Access"**: Access all Storytailor capabilities through a consistent JSON-RPC 2.0 interface, compatible with any MCP-compatible AI assistant
- **"Developer-First Platform"**: Storytailor prioritizes developer experience with cutting-edge AI assistant integration, making it easier than ever to build with our platform

## Target Audience Messaging

### For Developers

- "Integrate Storytailor with Cursor or Claude Desktop in minutes. Get AI assistance with router health checks, content generation, and agent routing without leaving your IDE."
- "Access Storytailor capabilities as native tools in your AI assistant. No custom APIs to learn, no complex integration patterns - just standardized MCP tools."
- "Accelerate your development workflow with AI-powered Storytailor integration. Check system health, route requests, and generate content with simple tool calls."

### For AI Assistant Users

- "Connect Cursor or Claude Desktop to Storytailor with a simple configuration. Access Storytailor capabilities as discoverable tools in your AI assistant."
- "Get AI assistance with Storytailor-specific tasks. Content generation, router health checks, and smart home device control - all accessible through your AI assistant."

### For Platform Partners

- "Storytailor supports MCP protocol for AI assistant integration, making it easy for developers to build with our platform using their preferred AI tools."
- "Standardized JSON-RPC 2.0 interface ensures compatibility with any MCP-compatible AI assistant, opening Storytailor to a broader developer community."

## Unique Selling Propositions (USPs)

1. **First-Mover Advantage**: Early adoption of MCP protocol for AI assistant integration, positioning Storytailor as a developer-friendly platform
2. **Standardized Protocol**: Industry-standard JSON-RPC 2.0 protocol ensures broad compatibility and ease of integration
3. **Comprehensive Tool Set**: Exposes multiple Storytailor capabilities (router, content generation, smart home) as discoverable tools
4. **Developer Productivity**: Significantly reduces development time by enabling AI assistants to interact with Storytailor directly from the IDE
5. **Easy Integration**: Simple configuration in Cursor or Claude Desktop - no complex setup required

## Use Cases

### Use Case 1: AI-Powered Development Workflow

**Scenario**: Developer using Cursor wants to check router health and generate test content

**How MCP Helps**:
- Developer asks Cursor to check router health
- Cursor calls `router.health` tool via MCP
- Developer asks Cursor to generate test story content
- Cursor calls `content.generate` tool via MCP
- All without leaving the IDE or writing custom API calls

**Value**: Saves time, reduces context switching, improves developer experience

### Use Case 2: Content Generation Assistance

**Scenario**: Developer needs help generating story content during development

**How MCP Helps**:
- Developer asks AI assistant to generate a test story
- AI assistant uses `content.generate` or `content.stream` tool
- Content is generated and returned directly in the IDE
- Developer can iterate quickly without manual API calls

**Value**: Faster content generation, better development workflow, improved productivity

### Use Case 3: System Health Monitoring

**Scenario**: Developer wants to monitor router health during development

**How MCP Helps**:
- Developer asks AI assistant to check system health
- AI assistant calls `router.health` tool periodically
- Health status is available in IDE without manual checks
- Developer can focus on coding while AI assistant monitors system

**Value**: Proactive monitoring, better visibility, improved reliability

## Related Documentation

- [MCP Overview](./overview.md) - Complete technical overview
- [MCP What](./what.md) - Detailed functionality
- [MCP Why](./why.md) - Business rationale
