# A2A (Agent-to-Agent) Protocol - What

**Status**: ✅ Active
**Last Updated**: 2025-12-17

## Core Functionality

The A2A (Agent-to-Agent) Protocol provides a standardized interface for external agents and partner platforms to integrate with Storytailor's agent system. Its primary functions include:

1. **Agent Discovery**: Allows agents to discover other agents and their capabilities via Agent Card
2. **JSON-RPC 2.0 Messaging**: Standardized JSON-RPC 2.0 messaging between agents
3. **Task Delegation**: Task lifecycle management with state machine (submitted, working, input-required, completed, failed, canceled)
4. **Real-Time Status Updates**: Server-Sent Events (SSE) for real-time task status streaming
5. **Webhook Notifications**: Webhook delivery and receipt for event notifications
6. **Authentication**: OpenAPI-compatible authentication (API key, OAuth 2.0, OpenID Connect with JWKS)

## Technical Architecture

### Core Components

- **A2AAdapter** (`packages/a2a-adapter/src/A2AAdapter.ts`): Main adapter orchestrator coordinating all A2A services
- **AgentCard** (`packages/a2a-adapter/src/AgentCard.ts`): Agent Card generation and validation
- **JsonRpcHandler** (`packages/a2a-adapter/src/JsonRpcHandler.ts`): JSON-RPC 2.0 request handling
- **TaskManager** (`packages/a2a-adapter/src/TaskManager.ts`): Task lifecycle management with state machine
- **MessageHandler** (`packages/a2a-adapter/src/MessageHandler.ts`): Agent-to-agent messaging
- **SSEStreamer** (`packages/a2a-adapter/src/SSEStreamer.ts`): Server-Sent Events for task status streaming
- **WebhookHandler** (`packages/a2a-adapter/src/WebhookHandler.ts`): Webhook delivery and receipt
- **Authentication** (`packages/a2a-adapter/src/Authentication.ts`): OpenAPI-compatible authentication schemes
- **RouterIntegration** (`packages/a2a-adapter/src/RouterIntegration.ts`): Integration with internal router

### Protocol Implementation

The A2A adapter implements JSON-RPC 2.0 protocol for standardized agent communication:

- **Request Format**: JSON-RPC 2.0 compliant requests
- **Response Format**: JSON-RPC 2.0 compliant responses with error handling
- **Transport**: HTTP REST API (bundled with Universal Agent)
- **Authentication**: API Key, OAuth 2.0 Bearer Token, or OpenID Connect (JWT with JWKS)

**Code References:**
- `packages/a2a-adapter/src/JsonRpcHandler.ts` - JSON-RPC 2.0 handler
- `packages/a2a-adapter/src/Authentication.ts` - Authentication schemes

## Key Features

### Agent Discovery

**Endpoint**: `GET /a2a/discovery`

**Purpose**: Agent Card discovery - allows agents to discover other agents and their capabilities

**Response**:
```json
{
  "agentCard": {
    "id": "storytailor-agent",
    "name": "Storytailor Agent",
    "version": "1.0.0",
    "capabilities": [
      "storytelling",
      "emotional-check-in",
      "crisis-detection"
    ],
    "endpoints": {
      "webhook": "https://storyintelligence.dev/a2a/webhook",
      "health": "https://storyintelligence.dev/health"
    }
  }
}
```

**Code Reference**: `packages/a2a-adapter/src/AgentCard.ts`

### JSON-RPC 2.0 Messaging

**Endpoint**: `POST /a2a/message`

**Purpose**: Send JSON-RPC 2.0 messages between agents

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "msg-123",
  "method": "story.generate",
  "params": {
    "characterId": "char_123",
    "storyType": "Adventure"
  }
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "msg-123",
  "result": {
    "storyId": "story_123",
    "status": "generated"
  }
}
```

**Code Reference**: `packages/a2a-adapter/src/JsonRpcHandler.ts`

### Task Delegation

**Endpoint**: `POST /a2a/task`

**Purpose**: Delegate tasks to other agents with full lifecycle management

**Request**:
```json
{
  "taskId": "task-123",
  "targetAgent": "content-agent",
  "taskType": "story-generation",
  "parameters": {
    "characterId": "char_123",
    "storyType": "Adventure"
  }
}
```

**Response**:
```json
{
  "taskId": "task-123",
  "status": "accepted",
  "estimatedCompletion": "2025-12-13T12:00:00Z"
}
```

**Task States**: submitted → working → input-required → completed/failed/canceled

**Code Reference**: `packages/a2a-adapter/src/TaskManager.ts`

### Task Status (SSE)

**Endpoint**: `GET /a2a/status?taskId=task-123`

**Purpose**: Get task status with optional Server-Sent Events (SSE) support

**SSE Response**:
```
data: {"taskId": "task-123", "status": "processing", "progress": 50}

data: {"taskId": "task-123", "status": "completed", "result": {...}}
```

**Code Reference**: `packages/a2a-adapter/src/SSEStreamer.ts`

### Webhook Notifications

**Endpoint**: `POST /a2a/webhook`

**Purpose**: Receive webhook notifications from other agents

**Request**:
```json
{
  "event": "task.completed",
  "taskId": "task-123",
  "data": {
    "storyId": "story_123",
    "status": "completed"
  },
  "timestamp": "2025-12-13T12:00:00Z"
}
```

**Code Reference**: `packages/a2a-adapter/src/WebhookHandler.ts`

## Protocol Compliance

### JSON-RPC 2.0

**Compliance**: ✅ 100% compliant with JSON-RPC 2.0 specification

**Reference**: https://www.jsonrpc.org/specification

**Implementation**: `packages/a2a-adapter/src/JsonRpcHandler.ts`

### Agent Card Structure

**Compliance**: ✅ Full Agent Card structure support per A2A spec

**Reference**: https://a2a-protocol.org/v0.2.5/topics/key-concepts

**Implementation**: `packages/a2a-adapter/src/AgentCard.ts`

### Task Lifecycle Management

**Compliance**: ✅ Complete task lifecycle support (submitted, working, input-required, completed, failed, canceled)

**Reference**: https://agent2agent.info/docs/concepts/task

**Implementation**: `packages/a2a-adapter/src/TaskManager.ts`

**Database**: Supabase `a2a_tasks` table with full state machine validation

### Authentication Support

**Compliance**: ✅ Authentication support with OpenAPI-compatible schemes

**Supported Schemes**:
- API Key (header: `X-API-Key`)
- OAuth 2.0 Bearer Token (header: `Authorization: Bearer <token>`)
- OpenID Connect (JWT validation with JWKS)

**Implementation**: `packages/a2a-adapter/src/Authentication.ts`

## Integration Points

### Internal Systems

- **Universal Agent Lambda**: A2A adapter is bundled with Universal Agent (`storytailor-universal-agent-production`)
- **Router**: A2A methods map to router/agent calls via `RouterIntegration.ts`
- **Supabase**: Stores task state in `a2a_tasks` table
- **Redis**: Caching for fast task access (optional)

### External Systems

- **External Agents**: Any A2A-compatible agent can integrate
- **Partner Platforms**: Amazon Alexa+, third-party agent platforms
- **Webhook Endpoints**: External webhook URLs for task notifications

### Router Integration

A2A methods map to router/agent calls:
- `story.generate` → Router → Content Agent
- `character.create` → Router → Content Agent (with full inclusivity trait support)
- `emotion.checkin` → Router → Emotion Agent
- `crisis.detect` → Router → Emotion Agent
- `library.list` → Router → Library Agent

**Code Reference**: `packages/a2a-adapter/src/RouterIntegration.ts`

### Character Creation with Inclusivity Traits

The `character.create` method supports Storytailor's comprehensive inclusivity system with **39 traits working across 9 species**.

**Example Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "character.create",
  "params": {
    "name": "Brave the Dragon",
    "species": "magical_creature",
    "age": 8,
    "inclusivityTraits": [
      {
        "type": "down_syndrome",
        "description": "Character with Down syndrome features"
      },
      {
        "type": "wheelchair_power",
        "description": "Uses power wheelchair with joystick"
      }
    ],
    "personality": ["brave", "kind", "curious"],
    "appearance": {
      "eyeColor": "gold",
      "hairColor": "purple scales"
    }
  },
  "id": 1
}
```

**Conditional Traits Example:**
For traits like autism or ADHD, visual elements are shown ONLY if the user mentions them:

```json
{
  "jsonrpc": "2.0",
  "method": "character.create",
  "params": {
    "name": "Alex",
    "species": "human",
    "age": 7,
    "inclusivityTraits": [
      {
        "type": "autism",
        "userDescription": "wears purple noise-canceling headphones when overwhelmed"
      }
    ]
  },
  "id": 2
}
```

**Abstract Traits Example:**
Traits like dyslexia have no visual manifestation - they're integrated into story/personality:

```json
{
  "jsonrpc": "2.0",
  "method": "character.create",
  "params": {
    "name": "Sam",
    "species": "human",
    "age": 9,
    "inclusivityTraits": [
      {
        "type": "dyslexia",
        "description": "Learning difference - shows through story strengths, not visual markers"
      }
    ]
  },
  "id": 3
}
```

**Supported Trait Types:**
All 39 traits are supported. See `packages/shared-types/src/types/character.ts` for complete list.

**Key Features:**
- ✅ **Universal Species Support**: Any trait works on any species (dragon with Down syndrome, robot with wheelchair)
- ✅ **Context-Sensitive Transformations**: Medical devices transform in fantasy contexts (wheelchair → rocket vehicle, halo → power crown)
- ✅ **Conditional Logic**: Visual elements shown only if user mentioned (respects individual differences)
- ✅ **100% Filter Success**: All traits pass OpenAI safety filters across ages 5-8

**Documentation References:**
- `docs/inclusivity/README.md` - Complete inclusivity system overview
- `docs/inclusivity/technical/TRAIT_DATABASE.md` - Full trait reference
- `docs/inclusivity/technical/VISUAL_VS_ABSTRACT_TRAITS.md` - Classification guide

## Advertised Capabilities

Storytailor advertises the following capabilities via A2A:

1. **Storytelling**: Therapeutic story generation
2. **Emotional Check-In**: Daily wellness assessments
3. **Crisis Detection**: Real-time safety screening

**Code Reference**: `packages/a2a-adapter/src/AgentCard.ts`
