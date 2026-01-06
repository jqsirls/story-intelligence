# MCP (Model Context Protocol) - Overview

**Status**: ✅ Active
**Lambda Function**: `storytailor-mcp-server-production`
**Region**: us-east-1
**Last Updated**: 2025-12-17

## Overview

The Storytailor MCP (Model Context Protocol) server allows Cursor and other AI assistants to interact with Storytailor's agent system through standardized tools using JSON-RPC 2.0 protocol.

## Key Features

- **JSON-RPC 2.0 Protocol**: Standardized tool calling protocol for AI assistants
- **Router Integration**: Direct access to router health checks and routing capabilities
- **JWKS Support**: Authentication key management for secure access
- **Hue Integration**: Smart home device control tools
- **Content Generation**: Story content generation and streaming tools
- **Rate Limiting**: Built-in rate limiting (60 requests/minute default)
- **JWT Authentication**: Secure token-based authentication with scope checking

## Quick Links

- [What It Does](./what.md) - Detailed functionality and capabilities
- [Why It Exists](./why.md) - Business rationale and value proposition
- [When to Use](./when.md) - Usage guidelines and integration points
- [Where It's Deployed](./where.md) - Deployment location and Lambda configuration
- [Who Owns It](./who.md) - Team ownership and maintainers
- [Development Guide](./development.md) - Technical implementation and API reference
- [Marketing Information](./marketing.md) - Value proposition and features
- [Cost Analysis](./cost.md) - Cost per operation and economics

## Available Tools

- **router.health** - Check router health status
- **router.route** - Route requests to agents (pass-through to router API)
- **jwks.get** - Get JWKS (JSON Web Key Set) for authentication
- **hue.start** - Start Hue OAuth flow
- **hue.callback** - Handle Hue OAuth callback
- **hue.pair** - Pair Hue device
- **hue.finalize** - Finalize Hue connection
- **content.generate** - Generate story content
- **content.stream** - Stream content generation

## Documentation

### Protocol Documentation
- **[Overview](./overview.md)** - Complete MCP reference
- **[Error Reference](./error-reference.md)** - All MCP error codes
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

### Related Documentation

- [MCP Overview](./overview.md) - Complete technical overview
- [MCP Setup Guide](../../docs/MCP_SETUP.md) - Setup and configuration instructions

## Code References

- `tmp-ci/repo/services/mcp-server/src/index.ts:1-237` - MCP server implementation
- `tmp-ci/repo/services/mcp-server/src/tools.ts` - Tool implementations
