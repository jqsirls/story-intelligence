# Conversation Agent

**Last Updated**: 2025-12-14  
**Status**: Production  
**Region**: us-east-2  
**Lambda Function**: `storytailor-conversation-agent-production`

## Overview

The Conversation Agent provides real-time, empathetic voice conversations with children using the ElevenLabs Conversational AI platform. It creates award-caliber personal stories through emotionally intelligent dialogue, adapting to each child's age, emotional state, and communication style.

## Key Features

- **Real-time Voice Conversations**: WebSocket-based bidirectional communication with ElevenLabs Agents Platform
- **Emotion-Aware Storytelling**: 3-tier emotion handling system (everyday feelings, big feelings, concerning cues)
- **Age-Adaptive Interactions**: Adjusts conversation style, vocabulary, and choices based on child's age (3-9 years)
- **Smart Home Integration**: Dynamic Philips Hue lighting that responds to conversation context, emotions, and story progress
- **Conversation State Management**: Redis-backed state persistence for seamless session continuity
- **Safety-First Design**: Built-in safety responses and parent notification system
- **Accessibility Support**: Specialized handling for AAC, stuttering, bilingual code-switching, and unclear speech

## Quick Start

### Prerequisites

- ElevenLabs API key and Agent ID configured
- Redis connection for state management
- Supabase for user data
- Smart Home Agent URL (optional, for Hue integration)

### Basic Usage

```typescript
import { ConversationAgent } from '@storytailor/conversation-agent';

const agent = new ConversationAgent({
  elevenLabsAgentId: process.env.ELEVENLABS_AGENT_ID,
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
  redisUrl: process.env.REDIS_URL,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY
});

await agent.initialize();

// Start a conversation
const state = await agent.startConversation(
  connectionId,
  userId,
  sessionId,
  { userAge: 7, userName: 'Alex', isReturningUser: false }
);

// Send a message
await agent.sendMessage(connectionId, 'Hello Frankie!', {
  emotion: 'excited',
  audioUrl: 's3://...'
});

// End conversation
await agent.endConversation(connectionId);
```

## Architecture

The Conversation Agent consists of:

- **ConversationAgent**: Main orchestrator managing conversations
- **ElevenLabsAgentClient**: WebSocket client for ElevenLabs platform
- **ConversationStateManager**: Redis-based state persistence
- **HueConversationIntegration**: Smart lighting integration
- **ConnectionManager**: WebSocket connection lifecycle management
- **FrankieSystemPrompt**: Age-adaptive system prompt builder

## Documentation

- **[What](./what.md)** - Detailed functionality and capabilities
- **[Why](./why.md)** - Business rationale and value proposition
- **[When](./when.md)** - Usage guidelines and integration points
- **[Where](./where.md)** - Deployment location and Lambda configuration
- **[Who](./who.md)** - Team ownership and maintainers
- **[Development](./development.md)** - Technical implementation and API reference
- **[Marketing](./marketing.md)** - Value proposition and features
- **[Cost](./cost.md)** - Cost per operation and economics

## Related Agents

- **Conversation Intelligence**: Advanced NLU and contextual memory
- **Emotion Agent**: Emotion tracking and pattern detection
- **Smart Home Agent**: Philips Hue device management
- **Child Safety Agent**: Crisis detection and mandatory reporting

## Support

For issues or questions, see [Development](./development.md) or contact the team listed in [Who](./who.md).

