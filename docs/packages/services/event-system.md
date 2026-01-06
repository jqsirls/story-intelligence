# @alexa-multi-agent/event-system

**Package**: `@alexa-multi-agent/event-system`  
**Location**: `packages/event-system/`  
**Status**: ✅ Production Ready

## Overview

Event publishing and subscription system for the Storytailor multi-agent system. Provides CloudEvents-compliant event infrastructure for agent coordination and system monitoring.

## Features

- **Event Publishing**: Publish events to EventBridge
- **Event Subscription**: Subscribe to events with filtering
- **CloudEvents Format**: Standard CloudEvents 1.0 format
- **Self-Healing Monitor**: Automatic event system health monitoring

## Installation

```bash
npm install @alexa-multi-agent/event-system
```

## Usage

```typescript
import { EventPublisher, EventSubscriber } from '@alexa-multi-agent/event-system';

// Publish events
const publisher = new EventPublisher({ eventBusName: 'storytailor-events' });
await publisher.publish({
  type: 'story.created',
  source: 'content-agent',
  data: { storyId: 'story-123' }
});

// Subscribe to events
const subscriber = new EventSubscriber({ eventBusName: 'storytailor-events' });
subscriber.subscribe('story.created', (event) => {
  console.log('Story created:', event.data);
});
```

## Related Documentation

- **Event System Agent**: See [Event System Agent Documentation](../../agents/event-system/README.md)
- **Multi-Agent Protocol**: See [Multi-Agent Connection Protocol](../../development/02_MULTI_AGENT_CONNECTION_PROTOCOL.md)

