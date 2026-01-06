# Router Agent

**Status**: ✅ Active  
**Package**: `@alexa-multi-agent/router`  
**Lambda Function**: `storytailor-router-production`  
**Last Updated**: 2025-12-11

## Overview

The Router is the central orchestrator in Storytailor's hub-and-spoke multi-agent architecture. It serves as the intelligent traffic controller that classifies user intent, selects appropriate specialized agents, and coordinates multi-agent responses for seamless storytelling conversations.

## Quick Start

### What It Does

The Router:
- **Classifies Intent**: Uses OpenAI to understand what users want (create story, view library, check emotions, etc.)
- **Delegates to Agents**: Routes requests to the right specialized agent (Content Agent, Library Agent, Emotion Agent, etc.)
- **Manages State**: Maintains conversation context across multiple turns
- **Handles Failures**: Uses circuit breakers to gracefully handle agent failures

### When to Use It

The Router is used for:
- All user conversations (voice, text, API)
- Intent classification and routing
- Multi-agent orchestration
- Conversation state management

### Quick Integration Example

```typescript
import { Router, createDefaultConfig } from '@alexa-multi-agent/router';

const router = new Router(createDefaultConfig(), logger);
await router.initialize();

const response = await router.route({
  userId: 'user-123',
  sessionId: 'session-456',
  userInput: "Let's create an adventure story!",
  channel: 'web',
});
```

## Documentation Links

- [Marketing Information](./marketing.md) - Value proposition and features
- [Cost Analysis](./cost.md) - Cost per operation and economics
- [Development Guide](./development.md) - Technical implementation
- [Who](./who.md) - Team and ownership
- [What](./what.md) - Complete functionality
- [Why](./why.md) - Business rationale
- [When](./when.md) - Usage guidelines
- [Where](./where.md) - Deployment and location
