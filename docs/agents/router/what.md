# Router Agent - Detailed Functionality

**Status**: Draft  
**Audience**: Engineering | Product  
**Last Updated**: 2025-12-11

## Complete Feature List

### Intent Classification
- OpenAI-powered intent recognition
- 11 story type classification
- Confidence scoring (0.0-1.0)
- Clarification requests when confidence < threshold
- Context-aware classification (considers conversation history)

**Code References:**
- `packages/router/src/services/IntentClassifier.ts` - Implementation
- `packages/router/src/Router.ts:144` - Classification call

### Agent Delegation
- Automatic agent selection based on intent
- Circuit breaker pattern for resilience
- Retry logic with exponential backoff
- Timeout handling
- Parallel agent processing
- Response aggregation

**Code References:**
- `packages/router/src/services/AgentDelegator.ts:36-101` - Delegation
- `packages/router/src/services/AgentDelegator.ts:106-149` - Parallel processing

### Conversation State Management
- Redis-based state persistence
- Session management
- Conversation history tracking
- Memory state management
- Phase tracking (character, story, editing, finalization)

**Code References:**
- `packages/router/src/services/ConversationStateManager.ts` - State management
- `packages/router/src/Router.ts:138` - State retrieval

### Interruption Handling
- User interruption detection
- Checkpoint creation at critical phases
- Graceful recovery
- Multi-user support
- Session bookmarks

**Code References:**
- `packages/router/src/services/ConversationInterruptionHandler.ts` - Interruption handling
- `packages/router/src/Router.ts:169-185` - Checkpoint creation

## Capabilities

### Supported Story Types
1. Adventure
2. Bedtime
3. Birthday
4. Educational
5. Financial Literacy
6. Language Learning
7. Medical Bravery
8. Mental Health
9. Milestones
10. New Chapter Sequel
11. Tech Readiness

**Code References:**
- `packages/router/README.md:24-40` - Story types list

### Supported Intent Types
- `CREATE_STORY` - Story creation
- `VIEW_LIBRARY` - Library access
- `EMOTION_CHECKIN` - Emotional check-ins
- `ACCOUNT_LINKING` - Authentication
- `COMMERCE` - Subscription/payment
- `INSIGHTS` - User insights

**Code References:**
- `packages/router/src/types.ts:18-50` - Intent type definitions

## Limitations

1. **Agent Endpoint Dependency**: Requires all agent endpoints to be configured
2. **OpenAI Dependency**: Intent classification requires OpenAI API access
3. **Redis Dependency**: State management requires Redis
4. **HTTP-Based**: Currently uses HTTP for agent communication (not Lambda invoke)

**Code References:**
- `packages/router/src/services/AgentDelegator.ts:307` - HTTP endpoint requirement
- `packages/router/src/config.ts:21-51` - Agent endpoint configuration

## Technical Specifications

### Performance
- **Average Response Time**: ~500-1000ms per turn
- **Intent Classification**: ~200-400ms
- **Agent Delegation**: ~100-500ms (depends on target agent)
- **State Management**: ~10-50ms

### Scalability
- **Concurrent Requests**: Handles thousands of concurrent conversations
- **State Storage**: Redis-based, scales horizontally
- **Agent Invocation**: HTTP-based, can scale independently

### Reliability
- **Circuit Breakers**: Prevents cascading failures
- **Retry Logic**: Automatic retry with exponential backoff
- **Fallback Responses**: Graceful degradation on agent failures
- **Timeout Protection**: Prevents hanging requests

**Code References:**
- `packages/router/src/services/AgentDelegator.ts:51-57` - Circuit breaker
- `packages/router/src/services/AgentDelegator.ts:68-100` - Retry and timeout

## Data Models

### TurnContext
```typescript
interface TurnContext {
  userId: string;
  sessionId: string;
  requestId: string;
  userInput: string;
  channel: 'alexa' | 'web' | 'mobile';
  locale: string;
  timestamp: string;
  metadata?: {
    deviceContext?: DeviceContext;
    userPreferences?: UserPreferences;
  };
}
```

**Code References:**
- `packages/router/src/types.ts:52-70` - TurnContext definition

### Intent
```typescript
interface Intent {
  type: IntentType;
  storyType?: StoryType;
  targetAgent: string;
  confidence: number;
  requiresAuth: boolean;
  parameters?: Record<string, any>;
}
```

**Code References:**
- `packages/router/src/types.ts:72-85` - Intent definition

### AgentResponse
```typescript
interface AgentResponse {
  agentName: string;
  success: boolean;
  message?: string;
  data?: any;
  requiresFollowup?: boolean;
  followupAgent?: string;
  nextPhase?: ConversationPhase;
  error?: string;
}
```

**Code References:**
- `packages/router/src/types.ts:87-100` - AgentResponse definition

## Request/Response Schemas

### Router Route Request
```typescript
const turnContext: TurnContext = {
  userId: 'user-123',
  sessionId: 'session-456',
  userInput: "Let's create a story!",
  channel: 'web',
  locale: 'en-US',
  timestamp: new Date().toISOString(),
};
```

### Router Route Response
```typescript
const response: CustomerResponse = {
  message: "Great! Let's create an adventure story...",
  conversationPhase: 'story',
  requiresUserInput: true,
  suggestions: ['Adventure', 'Bedtime', 'Educational'],
  metadata: {
    intent: 'CREATE_STORY',
    storyType: 'ADVENTURE',
  },
};
```

**Code References:**
- `packages/router/src/types.ts:102-120` - CustomerResponse definition
