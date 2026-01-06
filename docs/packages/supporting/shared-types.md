# @alexa-multi-agent/shared-types

**Package**: `@alexa-multi-agent/shared-types`  
**Location**: `packages/shared-types/`  
**Version**: 1.0.0

## Overview

Shared TypeScript types and gRPC schemas for the Storytailor multi-agent system. This package provides type definitions used across all agents and services, ensuring type safety and consistency.

## Features

- **TypeScript Type Definitions**: Complete type system for agents, conversations, stories, and more
- **gRPC Schemas**: Protocol buffer definitions for inter-agent communication
- **Database Types**: Supabase database schema types
- **Agent Interfaces**: Standardized agent communication interfaces

## Installation

```bash
npm install @alexa-multi-agent/shared-types
```

## Usage

### TypeScript Types

```typescript
import {
  AgentRequest,
  AgentResponse,
  ConversationState,
  Story,
  Character
} from '@alexa-multi-agent/shared-types';

// Type-safe agent requests
const request: AgentRequest = {
  agentName: 'content-agent',
  intent: 'create_story',
  context: { userId: 'user-123' }
};
```

### gRPC Communication

```typescript
import { AgentRPCClient } from '@alexa-multi-agent/shared-types';

// gRPC client for agent-to-agent communication
const client = new AgentRPCClient('content-agent:50051');
const response = await client.invoke(request);
```

## Key Types

- **AgentRequest/Response**: Standard agent communication types
- **ConversationState**: Conversation state management
- **Story/Character**: Story and character data structures
- **User**: User profile and authentication types
- **Database Types**: Supabase table types

## Build Commands

```bash
# Build TypeScript types
npm run build

# Build with gRPC schemas
npm run build:with-proto

# Build without gRPC (faster)
npm run build:skip-proto

# Build gRPC schemas only
npm run build:proto
```

## Related Documentation

- **API Contract**: See [API Contract Documentation](./api-contract.md)
- **Agent Documentation**: See [Agent Documentation](../../agents/README.md)

