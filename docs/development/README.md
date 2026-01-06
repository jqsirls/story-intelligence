# Development Documentation

**Last Updated**: 2025-12-13  
**Audience**: Developers | Engineering Team

## Overview

This directory contains development documentation including architecture guides, developer guides, and multi-agent orchestration documentation.

## Documentation Files

- **[Multi-Agent Orchestration Flow](./01-multi-agent-orchestration-flow.md)** - Complete orchestration flow documentation
- **[Complete Developer Guide](./02-complete-developer-guide.md)** - Comprehensive developer guide
- **[Multi-Agent Connection Protocol](./multi-agent-connection-protocol.md)** - Agent-to-agent communication protocol
- **[Orchestration Capabilities Analysis](./03-orchestration-capabilities-analysis.md)** - Orchestration system analysis

## Quick Start

### Setup

```bash
# Install dependencies
npm install

# Start infrastructure (Supabase + Redis)
npm run infrastructure:start

# Build all packages
npm run build
```

### Development

```bash
# Start all agents in watch mode
npm run dev

# Build specific package
turbo run build --filter=<package-name>

# Test specific package
turbo run test --filter=<package-name>
```

## Build System

- **Turbo**: Monorepo build orchestration
- **TypeScript**: Strict mode, all packages
- **Build Order**: `shared-types` → other packages (handled by Turbo)

## Related Documentation

- **AGENTS.md**: See [AGENTS.md](../../../AGENTS.md) for complete development guide
- **API Reference**: See [API Reference Documentation](../api-reference/README.md)
- **Testing**: See [Testing Documentation](../testing/README.md)

