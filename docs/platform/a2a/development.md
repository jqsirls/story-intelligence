# A2A (Agent-to-Agent) Protocol - Development Guide

**Status**: ✅ Active
**Last Updated**: 2025-12-17

## Local Development Setup

1. **Clone and Install**:
   ```bash
   git clone [repository-url]
   cd Storytailor-Agent
   npm install
   cd packages/a2a-adapter
   npm install
   ```

2. **Environment Variables**: Create `.env` file or set environment variables:
   ```bash
   A2A_BASE_URL=https://storyintelligence.dev
   A2A_WEBHOOK_URL=https://storyintelligence.dev/a2a/webhook
   A2A_HEALTH_URL=https://storyintelligence.dev/health
   A2A_JWKS_URL=https://www.googleapis.com/oauth2/v3/certs
   A2A_TOKEN_ISSUER=https://accounts.google.com
   A2A_TOKEN_AUDIENCE=storytailor-api
   A2A_RATE_LIMIT_PER_MINUTE=60
   A2A_TASK_TIMEOUT_MS=300000
   ```

3. **Start Infrastructure**:
   ```bash
   npm run infrastructure:start  # Starts Supabase and Redis
   ```

4. **Build**:
   ```bash
   npm run build
   ```

5. **Run Tests**:
   ```bash
   npm test
   npm run test:coverage
   ```

## Code Structure

### Package Organization

```
packages/a2a-adapter/
├── src/
│   ├── index.ts                    # Main exports
│   ├── types.ts                    # Type definitions
│   ├── AgentCard.ts                # Agent Card generation
│   ├── JsonRpcHandler.ts           # JSON-RPC 2.0 handler
│   ├── TaskManager.ts              # Task lifecycle management
│   ├── MessageHandler.ts           # Message processing
│   ├── SSEStreamer.ts              # Server-Sent Events
│   ├── WebhookHandler.ts           # Webhook delivery/receipt
│   ├── Authentication.ts           # Authentication schemes
│   ├── RouterIntegration.ts        # Router method mapping
│   ├── A2AAdapter.ts               # Main adapter orchestrator
│   └── __tests__/                  # Test files
└── package.json
```

### Key Components

- **A2AAdapter** (`src/A2AAdapter.ts`): Main adapter orchestrator coordinating all A2A services
  - **Key Methods**:
    - `handleDiscovery()`: Agent Card discovery
    - `handleMessage()`: JSON-RPC 2.0 message handling
    - `handleTask()`: Task delegation
    - `handleStatus()`: Task status retrieval with SSE support
    - `handleWebhook()`: Webhook receipt

- **TaskManager** (`src/TaskManager.ts`): Task lifecycle management with state machine
  - **Key Methods**:
    - `createTask()`: Create new task
    - `updateTaskState()`: Update task state (with validation)
    - `getTask()`: Retrieve task by ID
    - `listTasks()`: List tasks with filters

- **JsonRpcHandler** (`src/JsonRpcHandler.ts`): JSON-RPC 2.0 request handling
  - **Key Methods**:
    - `handleRequest()`: Process JSON-RPC 2.0 request
    - `validateRequest()`: Validate request format
    - `formatResponse()`: Format JSON-RPC 2.0 response
    - `formatError()`: Format JSON-RPC 2.0 error

- **Authentication** (`src/Authentication.ts`): OpenAPI-compatible authentication
  - **Key Methods**:
    - `authenticate()`: Authenticate request (API Key, OAuth 2.0, OpenID Connect)
    - `verifyJWT()`: Verify JWT token with JWKS
    - `validateAPIKey()`: Validate API key

**Code References:**
- `packages/a2a-adapter/src/index.ts` - Main exports
- `packages/a2a-adapter/src/A2AAdapter.ts` - Main adapter
- `packages/a2a-adapter/src/TaskManager.ts` - Task management

## API Reference

### Agent Discovery

**Endpoint**: `GET /a2a/discovery`

**Response**:
```json
{
  "agentCard": {
    "id": "storytailor-agent",
    "name": "Storytailor Agent",
    "version": "1.0.0",
    "capabilities": ["storytelling", "emotional-check-in", "crisis-detection"],
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

**Code Reference**: `packages/a2a-adapter/src/TaskManager.ts`

### Task Status (SSE)

**Endpoint**: `GET /a2a/status?taskId=task-123`

**SSE Response**:
```
data: {"taskId": "task-123", "status": "processing", "progress": 50}

data: {"taskId": "task-123", "status": "completed", "result": {...}}
```

**Code Reference**: `packages/a2a-adapter/src/SSEStreamer.ts`

## Testing

### Running Tests

```bash
npm test
npm run test:coverage
```

### Test Structure

- Unit tests: `src/__tests__/unit/`
- Integration tests: `src/__tests__/integration/`
- E2E tests: Test with actual Universal Agent Lambda

### Testing A2A Endpoints Locally

```bash
# Test agent discovery
curl http://localhost:3000/a2a/discovery

# Test JSON-RPC message
curl -X POST http://localhost:3000/a2a/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: [REDACTED_API_KEY]" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-1",
    "method": "story.generate",
    "params": {"storyType": "Adventure"}
  }'

# Test task delegation
curl -X POST http://localhost:3000/a2a/task \
  -H "Content-Type: application/json" \
  -H "X-API-Key: [REDACTED_API_KEY]" \
  -d '{
    "taskId": "test-task-1",
    "taskType": "story-generation",
    "parameters": {"storyType": "Adventure"}
  }'
```

## Common Workflows

### Workflow 1: Adding a New A2A Method

1. **Define Method in RouterIntegration**:
   ```typescript
   // packages/a2a-adapter/src/RouterIntegration.ts
   export const METHOD_MAP = {
     "story.generate": async (params) => {
       // Route to Content Agent via Router
       return await router.route("content-agent", "generateStory", params);
     },
     "new.method": async (params) => {
       // New method implementation
       return await router.route("target-agent", "method", params);
     }
   };
   ```

2. **Add to Agent Card Capabilities**:
   ```typescript
   // packages/a2a-adapter/src/AgentCard.ts
   capabilities.push("new-capability");
   ```

3. **Update Documentation**: Add method to API reference

### Workflow 2: Testing Task Lifecycle

1. **Create Task**:
   ```bash
   POST /a2a/task
   {
     "taskId": "test-1",
     "taskType": "story-generation",
     "parameters": {...}
   }
   ```

2. **Monitor Status via SSE**:
   ```bash
   GET /a2a/status?taskId=test-1
   # Receives real-time updates
   ```

3. **Verify State Transitions**: Check task state in Supabase `a2a_tasks` table

## Troubleshooting

### Issue 1: Task State Validation Failed

**Symptoms**: Task state update fails with validation error

**Solution**:
- Verify task state transition is valid (check state machine in TaskManager)
- Ensure task exists in database
- Check task state enum values

### Issue 2: Authentication Failed

**Symptoms**: 401 Unauthorized errors

**Solution**:
- Verify API key is valid (if using API Key auth)
- Check JWT token is valid and not expired (if using OAuth)
- Verify JWKS URL is accessible (if using OpenID Connect)
- Check token has required scopes

### Issue 3: Router Integration Failed

**Symptoms**: Methods fail to route to agents

**Solution**:
- Verify Router Lambda is running and accessible
- Check method mapping in RouterIntegration
- Verify router endpoint configuration
- Check router logs for errors

## Related Documentation

- [A2A Overview](./overview.md) - Complete protocol overview
- [A2A What](./what.md) - Detailed functionality
- [A2A Integration Guide](./integration-guide.md) - Step-by-step integration
- [A2A API Reference](./api-reference.md) - Complete API documentation
