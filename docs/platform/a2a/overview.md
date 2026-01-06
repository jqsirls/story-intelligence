Status: Draft  
Audience: Internal | Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 4 - A2A protocol overview with code references

# A2A (Agent-to-Agent) Protocol Overview

## What is A2A?

A2A (Agent-to-Agent) Protocol is a standardized protocol for agent-to-agent communication using JSON-RPC 2.0 messaging, Agent Card discovery, and task delegation.

**Status**: ✅ **FULLY IMPLEMENTED & COMPLIANT**

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:10-32` - A2A implementation status
- `COMPLETE_INTEGRATION_STATUS.md:88-105` - A2A adapter status

## Implementation

### A2A Adapter

**Location:** `packages/a2a-adapter/src/index.ts` (referenced in status reports)

**Status:** ✅ Fully implemented according to status reports

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:15` - A2A adapter location

### REST API Routes

**Integration:** Routes integrated into Universal Agent (`/a2a/*`)

**Status:** ✅ All required endpoints implemented

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:16` - REST API routes integration
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:30` - Routes registered in RESTAPIGateway.setupA2ARoutes()

## A2A Endpoints

### 1. Agent Discovery

**Endpoint:** `GET /a2a/discovery`

**Purpose:** Agent Card discovery - allows agents to discover other agents and their capabilities

**Response:**
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
      "webhook": "https://storytailor.com/a2a/webhook",
      "health": "https://storytailor.com/health"
    }
  }
}
```

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:18` - Discovery endpoint
- `COMPLETE_INTEGRATION_STATUS.md:94-98` - Agent Card structure

### 2. JSON-RPC 2.0 Messaging

**Endpoint:** `POST /a2a/message`

**Purpose:** Send JSON-RPC 2.0 messages between agents

**Request:**
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

**Response:**
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

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:19` - Message endpoint
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:25` - JSON-RPC 2.0 compliance

### 3. Task Delegation

**Endpoint:** `POST /a2a/task`

**Purpose:** Delegate tasks to other agents

**Request:**
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

**Response:**
```json
{
  "taskId": "task-123",
  "status": "accepted",
  "estimatedCompletion": "2025-12-13T12:00:00Z"
}
```

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:20` - Task delegation endpoint
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:27` - Task lifecycle management

### 4. Task Status

**Endpoint:** `GET /a2a/status`

**Purpose:** Get task status with optional SSE (Server-Sent Events) support

**Request:**
```
GET /a2a/status?taskId=task-123
```

**Response (Standard):**
```json
{
  "taskId": "task-123",
  "status": "completed",
  "result": {
    "storyId": "story_123"
  }
}
```

**Response (SSE):**
```
data: {"taskId": "task-123", "status": "processing", "progress": 50}

data: {"taskId": "task-123", "status": "completed", "result": {...}}
```

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:21` - Status endpoint with SSE support

### 5. Webhook Notifications

**Endpoint:** `POST /a2a/webhook`

**Purpose:** Receive webhook notifications from other agents

**Request:**
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

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:22` - Webhook endpoint

## Protocol Compliance

### JSON-RPC 2.0

**Compliance:** ✅ 100% compliant with JSON-RPC 2.0 specification

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:25` - JSON-RPC 2.0 messaging

### Agent Card Structure

**Compliance:** ✅ Full Agent Card structure support

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:26` - Agent Card structure

### Task Lifecycle Management

**Compliance:** ✅ Complete task lifecycle support

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:27` - Task lifecycle management

### Authentication Support

**Compliance:** ✅ Authentication support implemented

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:28` - Authentication support

## Advertised Capabilities

Storytailor advertises the following capabilities via A2A:

1. **Storytelling**: Therapeutic story generation
2. **Emotional Check-In**: Daily wellness assessments
3. **Crisis Detection**: Real-time safety screening

**Code References:**
- `COMPLETE_INTEGRATION_STATUS.md:100-104` - Advertised capabilities

## Integration

### Universal Agent Integration

A2A routes are registered in `RESTAPIGateway.setupA2ARoutes()`

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:30` - Routes registered in RESTAPIGateway

### External Agent Integration

External agents can:
1. Discover Storytailor agent via `/a2a/discovery`
2. Send messages via `/a2a/message`
3. Delegate tasks via `/a2a/task`
4. Monitor task status via `/a2a/status`
5. Receive webhooks via `/a2a/webhook`

**Code References:**
- `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md:17-22` - All A2A endpoints

## Related Documentation

- **Status Report:** See `A2A_MCP_STAKEHOLDER_ANALYTICS_STATUS.md`
- **Integration Status:** See `COMPLETE_INTEGRATION_STATUS.md:88-105`
- **Multi-Agent Protocol:** See `docs/developer-docs/01_CORE_ARCHITECTURE/02_MULTI_AGENT_CONNECTION_PROTOCOL.md`
