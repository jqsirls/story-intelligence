# Router Agent - Developer Documentation

**Status**: Draft  
**Audience**: Engineering  
**Last Updated**: 2025-12-11

## Technical Architecture

### Core Components

1. **Router** (`packages/router/src/Router.ts`)
   - Main orchestrator class
   - Coordinates all components
   - Handles conversation flow
   - Lines of Code: ~866

2. **IntentClassifier** (`packages/router/src/services/IntentClassifier.ts`)
   - OpenAI-powered intent recognition
   - Story type classification
   - Confidence scoring

3. **AgentDelegator** (`packages/router/src/services/AgentDelegator.ts`)
   - Circuit breaker-enabled agent routing
   - Retry logic with exponential backoff
   - Parallel processing support
   - Lines of Code: ~646

4. **ConversationStateManager** (`packages/router/src/services/ConversationStateManager.ts`)
   - Redis-based state persistence
   - Session management
   - Conversation history tracking

5. **ConversationInterruptionHandler** (`packages/router/src/services/ConversationInterruptionHandler.ts`)
   - Handles user interruptions
   - Checkpoint management
   - Multi-user support

## API Endpoints

Router is typically invoked via:
- **Universal Agent**: Routes requests to Router
- **Direct Lambda Invoke**: For internal agent-to-agent communication
- **MCP Server**: Via `router.route` tool

**Code References:**
- `packages/universal-agent/src/lambda.ts` - Universal Agent integration
- `docs/platform/mcp/overview.md:49-80` - MCP router.route tool

## Integration Guide

### Basic Integration

```typescript
import { Router, createDefaultConfig } from '@alexa-multi-agent/router';
import * as winston from 'winston';

const logger = winston.createLogger({ level: 'info' });
const config = createDefaultConfig();
const router = new Router(config, logger);

await router.initialize();

const response = await router.route({
  userId: 'user-123',
  sessionId: 'session-456',
  userInput: "Let's create a story!",
  channel: 'web',
  locale: 'en-US',
  timestamp: new Date().toISOString(),
});
```

### Configuration

**Environment Variables:**
```bash
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5.1-mini  # or from SSM
REDIS_URL=redis://...
AUTH_AGENT_ENDPOINT=http://...
CONTENT_AGENT_ENDPOINT=http://...
# ... other agent endpoints
```

**Code References:**
- `packages/router/src/config.ts:8-64` - Default configuration
- `packages/router/src/config.ts:21-51` - Agent endpoint configuration

## Code Examples

### Intent Classification

```typescript
const intent = await router.intentClassifier.classifyIntent(
  turnContext,
  classificationContext
);
// Returns: { type: 'CREATE_STORY', storyType: 'ADVENTURE', confidence: 0.95 }
```

**Code References:**
- `packages/router/src/Router.ts:144` - Intent classification call

### Agent Delegation

```typescript
const agentResponse = await router.agentDelegator.delegate(
  intent,
  turnContext,
  memoryState
);
```

**Code References:**
- `packages/router/src/Router.ts:158` - Agent delegation call
- `packages/router/src/services/AgentDelegator.ts:36-101` - Delegation implementation

### Parallel Agent Processing

```typescript
const responses = await router.agentDelegator.delegateParallel([
  { intent: emotionIntent, context, memoryState },
  { intent: safetyIntent, context, memoryState },
  { intent: localizationIntent, context, memoryState },
]);
```

**Code References:**
- `packages/router/src/services/AgentDelegator.ts:106-149` - Parallel processing

## Configuration Options

### Circuit Breaker Settings

```typescript
circuitBreaker: {
  failureThreshold: 5,        // Open after 5 failures
  resetTimeout: 60000,        // 1 minute
  monitoringPeriod: 300000,   // 5 minutes
}
```

**Code References:**
- `packages/router/src/config.ts:53-57` - Circuit breaker configuration

### Agent Endpoint Configuration

```typescript
agents: {
  auth: {
    endpoint: process.env.AUTH_AGENT_ENDPOINT,
    timeout: 5000,
    retries: 3,
  },
  // ... other agents
}
```

**Code References:**
- `packages/router/src/config.ts:21-51` - Agent configuration

## Error Handling

### Circuit Breaker Errors

```typescript
if (this.isCircuitBreakerOpen(agentName)) {
  throw new RouterError(
    RouterErrorCode.CIRCUIT_BREAKER_OPEN,
    `Circuit breaker is open for agent: ${agentName}`
  );
}
```

**Code References:**
- `packages/router/src/services/AgentDelegator.ts:51-57` - Circuit breaker check

### Fallback Responses

```typescript
if (this.config.fallback.enabled) {
  return this.getFallbackResponse(agentName, intent, error);
}
```

**Code References:**
- `packages/router/src/services/AgentDelegator.ts:95-97` - Fallback handling

## Testing Guide

### Unit Tests

```typescript
import { Router, createTestConfig } from '@alexa-multi-agent/router';

const config = createTestConfig();
const router = new Router(config, testLogger);

// Test intent classification
const intent = await router.intentClassifier.classifyIntent(...);

// Test agent delegation
const response = await router.agentDelegator.delegate(...);
```

**Code References:**
- `packages/router/src/config.ts:70-126` - Test configuration

### Integration Tests

Test Router with mock agents:
```typescript
// Mock agent endpoints
process.env.CONTENT_AGENT_ENDPOINT = 'http://localhost:3002/content';

// Test full routing flow
const response = await router.route(turnContext);
```

## Deployment Instructions

### Lambda Deployment

Router is deployed as `storytailor-router-production`:
- **Runtime**: nodejs22.x
- **Memory**: 1024 MB (staging), 512 MB (production - verify)
- **Timeout**: 300 seconds (staging), 30 seconds (production - verify)
- **Handler**: `dist/lambda.handler`

**Code References:**
- `docs/system/deployment_inventory.md:57` - Staging configuration
- `scripts/deploy-all-agents.sh:170` - Deployment script reference

### Environment Variables

Set via SSM Parameter Store:
- `/storytailor-production/openai/api-key`
- `/storytailor-production/openai/model-routing`
- `/storytailor-production/redis/url`
- Agent endpoint environment variables

**Code References:**
- `docs/system/ssm_parameters_inventory.md` - SSM parameters
