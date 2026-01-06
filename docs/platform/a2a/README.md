Status: Published  
Audience: Internal | Partner | Developer  
Last-Updated: 2025-12-17  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  

# A2A Protocol Documentation

## Overview

The A2A (Agent-to-Agent) Protocol enables external agents and partner platforms to integrate with Storytailor's agent system using standardized JSON-RPC 2.0 messaging.

**Status:** ✅ **IMPLEMENTED & DEPLOYED**

## Documentation Index

### Getting Started

1. **[Overview](./overview.md)** - Protocol introduction, boundaries, and architecture
2. **[API Reference](./api-reference.md)** - Complete API endpoint documentation
3. **[Integration Guide](./integration-guide.md)** - Step-by-step integration instructions

### Operations

4. **[Deployment Guide](./deployment.md)** - Deployment procedures and configuration

### Platform Documentation

5. **[What It Does](./what.md)** - Detailed functionality and capabilities
6. **[Why It Exists](./why.md)** - Business rationale and value proposition
7. **[When to Use](./when.md)** - Usage guidelines and protocol boundaries
8. **[Where It's Deployed](./where.md)** - Deployment location and Lambda configuration
9. **[Who Owns It](./who.md)** - Team ownership and maintainers
10. **[Development Guide](./development.md)** - Technical implementation and API reference
11. **[Marketing Information](./marketing.md)** - Value proposition and features
12. **[Cost Analysis](./cost.md)** - Cost per operation and economics

## Quick Links

- **Base URL:** `https://storyintelligence.dev/a2a`
- **Discovery:** `GET /a2a/discovery`
- **Package:** `packages/a2a-adapter/`
- **Lambda Function:** `storytailor-universal-agent-production`

## Key Features

- ✅ JSON-RPC 2.0 compliant messaging
- ✅ Agent Card discovery
- ✅ Task lifecycle management
- ✅ Server-Sent Events (SSE) for real-time updates
- ✅ Webhook notifications
- ✅ Full JWT signature verification with JWKS
- ✅ API Key and OAuth 2.0 authentication
- ✅ Rate limiting per agent

## Protocol Boundaries

**Use A2A for:**
- External agent/partner integration
- Cross-platform communication
- Task-based workflows
- Webhook notifications

**Do NOT use A2A for:**
- Internal agent-to-agent calls (use gRPC)
- AI assistant tool integration (use MCP)

## Support

For questions or issues:
- **Documentation:** This directory
- **Code:** `packages/a2a-adapter/`
- **Implementation Plan:** `.cursor/plans/a2a_protocol_implementation_7468315e.plan.md`
