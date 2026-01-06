# Router Package

Intent classification and agent delegation router for Storytailor's multi-agent platform. The Router serves as the central orchestrator that interprets user intent, selects appropriate sub-agents, and aggregates responses for seamless storytelling conversations.

## 🎯 Purpose

The Router acts as the **central hub** in Storytailor's hub-and-spoke multi-agent architecture, providing:

- **Intent Classification**: Uses OpenAI function calling to understand user intentions
- **Agent Delegation**: Routes requests to appropriate specialized agents
- **Conversation State Management**: Maintains context across conversation turns
- **Circuit Breaker Pattern**: Ensures system resilience with intelligent failover
- **Multi-channel Support**: Handles Alexa, web, mobile, and future channels

## 🏗️ Architecture

### Core Components

1. **IntentClassifier**: OpenStory Intelligence™ powered intent recognition with story type mapping
2. **AgentDelegator**: Circuit breaker-enabled agent routing with retry logic
3. **ConversationStateManager**: Redis-based conversation context persistence
4. **Router**: Main orchestrator that coordinates all components

### Story Types Supported

The router can classify and route 11 different story types:

- **Adventure**: Exciting journeys with quests and exploration
- **Bedtime**: Calm, soothing stories for winding down
- **Birthday**: Celebratory stories about special occasions
- **Educational**: Learning-focused stories teaching concepts
- **Financial Literacy**: Money management and financial responsibility
- **Language Learning**: Stories incorporating language and culture
- **Medical Bravery**: Stories helping children cope with medical situations
- **Mental Health**: Stories addressing emotions and wellness
- **Milestones**: Stories about growing up and achievements
- **New Chapter Sequel**: Continuing stories with existing characters
- **Tech Readiness**: Stories about technology and digital citizenship

## 🚀 Quick Start

### Installation

```bash
npm install @alexa-multi-agent/router
```

### Basic Usage

```typescript
import { Router, createDefaultConfig } from '@alexa-multi-agent/router';
import * as winston from 'winston';

const logger = winston.createLogger({ level: 'info' });
const config = createDefaultConfig();
const router = new Router(config, logger);

await router.initialize();

// Process a conversation turn
const turnContext = {
  userId: 'user-123',
  sessionId: 'session-456',
  requestId: 'req-789',
  userInput: "Let's create a bedtime story!",
  channel: 'alexa',
  locale: 'en-US',
  timestamp: new Date().toISOString(),
};

const response = await router.route(turnContext);
console.log(`Response: ${response.message}`);
console.log(`Next phase: ${response.conversationPhase}`);
```

## 📋 Configuration

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4-1106-preview
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.3

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=router
REDIS_DEFAULT_TTL=3600

# Agent Endpoints
AUTH_AGENT_ENDPOINT=http://localhost:3001/auth
CONTENT_AGENT_ENDPOINT=http://localhost:3002/content
LIBRARY_AGENT_ENDPOINT=http://localhost:3003/library
EMOTION_AGENT_ENDPOINT=http://localhost:3004/emotion
COMMERCE_AGENT_ENDPOINT=http://localhost:3005/commerce
INSIGHTS_AGENT_ENDPOINT=http://localhost:3006/insights

# Circuit Breaker Settings
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=60000
CIRCUIT_BREAKER_MONITORING_PERIOD=300000

# Fallback Configuration
FALLBACK_ENABLED=true
FALLBACK_DEFAULT_RESPONSE="Let's try creating a story together!"
```

### Configuration Validation

```typescript
import { validateEnvironment } from '@alexa-multi-agent/router';

const envCheck = validateEnvironment();
if (!envCheck.valid) {
  console.error('Missing required environment variables:', envCheck.missing);
}
```

## 🎙️ Core Features

### 1. Intent Classification

The router uses OpenAI function calling to classify user intents with high accuracy:

```typescript
// Automatic intent classification from natural language
const turnContext = {
  userInput: "I want to create an adventure story about pirates!",
  // ... other context
};

const response = await router.route(turnContext);
// Automatically classifies as CREATE_STORY intent with ADVENTURE story type
```

### 2. Agent Delegation

Intelligent routing to specialized agents with circuit breaker protection:

```typescript
// Agents are automatically selected based on intent
const intents = {
  CREATE_STORY: 'content',      // → ContentAgent
  VIEW_LIBRARY: 'library',      // → LibraryAgent  
  EMOTION_CHECKIN: 'emotion',   // → EmotionAgent
  ACCOUNT_LINKING: 'auth',      // → AuthAgent
  // ... etc
};
```

### 3. Conversation State Management

Persistent conversation context across turns:

```typescript
// State is automatically managed across conversation turns
const summary = await router.getConversationSummary(userId, sessionId);
console.log(`Current phase: ${summary.phase}`);
console.log(`Story in progress: ${summary.storyId}`);
console.log(`Duration: ${summary.duration}ms`);
```

### 4. Circuit Breaker Pattern

Automatic failover when agents become unavailable:

```typescript
// Circuit breakers automatically open when agents fail
const health = await router.getHealthStatus();
console.log(`Overall status: ${health.status}`);

// Manually reset if needed
router.resetAgentCircuitBreaker('content');
```

### 5. Multi-channel Support

Consistent experience across different interaction channels:

```typescript
// Same router handles all channels
const alexaTurn = { channel: 'alexa', deviceType: 'voice', ... };
const webTurn = { channel: 'web', deviceType: 'web', ... };
const mobileTurn = { channel: 'mobile', deviceType: 'mobile', ... };

// Responses are automatically adapted for each channel
```

## 🔄 Conversation Flow

### Conversation Phases

The router tracks conversation through these phases:

1. **GREETING**: Initial interaction and welcome
2. **EMOTION_CHECK**: Daily emotional check-in
3. **CHARACTER_CREATION**: Creating story characters
4. **STORY_BUILDING**: Building the narrative
5. **STORY_EDITING**: Making changes to existing content
6. **ASSET_GENERATION**: Creating art, audio, and PDFs
7. **COMPLETION**: Wrapping up the session

### Intent Types

The router recognizes these intent categories:

#### Story Management
- `CREATE_STORY`: Start a new story
- `CONTINUE_STORY`: Continue existing story
- `EDIT_STORY`: Modify story content
- `FINISH_STORY`: Complete and finalize story

#### Character Management
- `CREATE_CHARACTER`: Create new character
- `EDIT_CHARACTER`: Modify character details
- `CONFIRM_CHARACTER`: Finalize character creation

#### Library Operations
- `VIEW_LIBRARY`: Browse story collection
- `SHARE_STORY`: Share stories with others
- `DELETE_STORY`: Remove stories

#### System Operations
- `ACCOUNT_LINKING`: Connect Alexa account
- `EMOTION_CHECKIN`: Daily mood check
- `SUBSCRIPTION_MANAGEMENT`: Billing operations
- `HELP`: Get assistance
- `GOODBYE`: End conversation

## 📊 Monitoring & Health

### Health Monitoring

```typescript
const health = await router.getHealthStatus();

console.log(`Status: ${health.status}`); // healthy, degraded, unhealthy
console.log(`Uptime: ${health.uptime}s`);
console.log(`Memory: ${health.memoryUsage.heapUsed}MB`);

// Check individual agent health
Object.entries(health.agents).forEach(([name, state]) => {
  console.log(`${name}: ${state.isOpen ? 'CIRCUIT OPEN' : 'HEALTHY'}`);
});
```

### Event Monitoring

```typescript
router.on('turn_completed', (data) => {
  console.log(`✅ ${data.intent.type} → ${data.agentResponse.agentName} (${data.processingTime}ms)`);
});

router.on('turn_failed', (data) => {
  console.log(`❌ Turn failed: ${data.error.message}`);
});

router.on('initialized', () => {
  console.log('🚀 Router ready');
});
```

## 🔒 Security & Resilience

### Circuit Breaker Protection

- **Failure Threshold**: Configurable failure count before opening
- **Reset Timeout**: Automatic recovery after cooldown period
- **Graceful Degradation**: Fallback responses when agents unavailable

### Rate Limiting

- **Per-user Limits**: Prevent abuse from individual users
- **Global Limits**: Protect system resources
- **Exponential Backoff**: Intelligent retry strategies

### Error Handling

```typescript
// Comprehensive error handling with specific error codes
try {
  const response = await router.route(turnContext);
} catch (error) {
  if (error.code === 'AUTHENTICATION_REQUIRED') {
    // Handle auth redirect
  } else if (error.code === 'CIRCUIT_BREAKER_OPEN') {
    // Handle service unavailable
  }
}
```

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Load Testing

The router is designed to handle high concurrency with:
- Stateless operation design
- Redis-based state management
- Circuit breaker protection
- Intelligent caching strategies

## 📈 Performance

### Latency Targets

| Operation | Target | Typical |
|-----------|--------|---------|
| Intent Classification | <200ms | ~100ms |
| Agent Delegation | <1000ms | ~300ms |
| State Management | <50ms | ~20ms |
| Total Turn Processing | <800ms | ~400ms |

### Scalability Features

- **Stateless Design**: Easy horizontal scaling
- **Redis Clustering**: Distributed state management
- **Circuit Breakers**: Prevent cascade failures
- **Connection Pooling**: Efficient resource usage

## 🔧 Advanced Configuration

### Custom Intent Classification

```typescript
// Extend intent types for custom use cases
enum CustomIntentType {
  CUSTOM_STORY_TYPE = 'custom_story_type',
  SPECIAL_FEATURE = 'special_feature',
}

// Add custom story types
enum CustomStoryType {
  SCIENCE_FICTION = 'science_fiction',
  MYSTERY = 'mystery',
}
```

### Agent Configuration

```typescript
const customConfig = {
  agents: {
    custom_agent: {
      endpoint: 'http://localhost:3007/custom',
      timeout: 5000,
      retries: 2,
    },
  },
  circuitBreaker: {
    failureThreshold: 3,
    resetTimeout: 30000,
  },
};
```

### Conversation Context

```typescript
// Access and modify conversation context
const memoryState = await router.stateManager.getMemoryState(userId, sessionId);

// Add custom context data
await router.stateManager.updateContext(userId, sessionId, {
  customData: 'value',
  preferences: { theme: 'dark' },
});
```

## 🚨 Error Handling

### Error Types

- `INVALID_INPUT`: Malformed request data
- `INTENT_CLASSIFICATION_FAILED`: OpenAI classification error
- `AGENT_UNAVAILABLE`: Target agent unreachable
- `TIMEOUT`: Request exceeded time limit
- `CIRCUIT_BREAKER_OPEN`: Agent circuit breaker activated
- `AUTHENTICATION_REQUIRED`: User needs to authenticate
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Unexpected system error

### Error Recovery

```typescript
// Automatic fallback responses
const config = {
  fallback: {
    enabled: true,
    defaultResponse: "Let's try creating a story together!",
    maxRetries: 2,
  },
};

// Manual circuit breaker reset
router.resetAgentCircuitBreaker('content');
```

## 📚 API Reference

### Router Class

#### Methods

- `initialize()`: Initialize router and services
- `shutdown()`: Graceful shutdown
- `route(turnContext)`: Process conversation turn
- `getHealthStatus()`: Get system health
- `resetAgentCircuitBreaker(agentName)`: Reset circuit breaker
- `getConversationSummary(userId, sessionId)`: Get conversation state

#### Events

- `initialized`: Router ready
- `shutdown`: Router stopped
- `turn_completed`: Turn processed successfully
- `turn_failed`: Turn processing failed

### IntentClassifier

#### Methods

- `classifyIntent(turnContext, context?)`: Classify user intent
- `suggestStoryTypes(input, age?)`: Get story type suggestions
- `validateClassification(result, context)`: Validate classification

### AgentDelegator

#### Methods

- `delegate(intent, context, memoryState)`: Route to agent
- `delegateParallel(requests)`: Parallel agent calls
- `getAgentHealth()`: Get circuit breaker states
- `resetCircuitBreaker(agentName)`: Reset specific breaker

### ConversationStateManager

#### Methods

- `getMemoryState(userId, sessionId)`: Get conversation state
- `saveMemoryState(memoryState)`: Save conversation state
- `updateConversationPhase(userId, sessionId, phase)`: Update phase
- `createMemoryState(userId, sessionId, context?)`: Create new state
- `deleteMemoryState(userId, sessionId)`: Delete conversation
- `extendSession(userId, sessionId, ttl?)`: Extend expiration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- GitHub Issues: [Report bugs](https://github.com/storytailor/router/issues)
- Documentation: [Full API docs](https://docs.storytailor.com/router)
- Email: support@storytailor.com

---

**Built with ❤️ for intelligent storytelling conversations**