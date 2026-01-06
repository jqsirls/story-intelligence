# Router Agent - Usage Guidelines

**Status**: Draft  
**Audience**: Engineering | Product  
**Last Updated**: 2025-12-11

## When to Use This Agent

### Always Use Router For:
1. **All User Conversations**: Every user interaction should go through Router
2. **Intent Classification**: When you need to understand what the user wants
3. **Multi-Agent Coordination**: When multiple agents need to work together
4. **State Management**: When you need to maintain conversation context
5. **Error Handling**: When you need circuit breaker protection

### Use Cases

#### Story Creation
**When**: User wants to create a story
**Router Action**: Classify intent → Delegate to Content Agent → Coordinate with Emotion Agent, Child Safety Agent

#### Library Access
**When**: User wants to view their stories
**Router Action**: Classify intent → Delegate to Library Agent

#### Emotional Check-In
**When**: User expresses emotions or needs support
**Router Action**: Classify intent → Delegate to Emotion Agent → Coordinate with Therapeutic Agent if needed

#### Account Management
**When**: User wants to manage account, subscriptions, or payments
**Router Action**: Classify intent → Delegate to Auth Agent or Commerce Agent

## When NOT to Use It

### Direct Agent Calls (Rare Cases)
Only bypass Router when:
1. **Internal Agent-to-Agent Communication**: Agents calling each other directly (though EventBridge is preferred)
2. **Health Checks**: Direct health check endpoints
3. **Admin Operations**: Internal admin operations that don't need intent classification

**Note**: Even in these cases, consider if Router would provide value (state management, monitoring, etc.)

## Timing Considerations

### Request Timing
- **Intent Classification**: Should complete in <500ms
- **Agent Delegation**: Should complete in <2s (depends on target agent)
- **Total Router Time**: Should be <1s for most requests

### State Management Timing
- **State Read**: <50ms (Redis)
- **State Write**: <50ms (Redis)
- **Checkpoint Creation**: <200ms (includes database write)

**Code References:**
- `packages/router/src/services/ConversationStateManager.ts` - State operations

## Best Practices

### 1. Always Initialize Router
```typescript
await router.initialize();
// Router must be initialized before use
```

**Code References:**
- `packages/router/src/Router.ts:78-98` - Initialization

### 2. Handle Errors Gracefully
```typescript
try {
  const response = await router.route(turnContext);
} catch (error) {
  // Router provides fallback responses
  // Handle gracefully
}
```

**Code References:**
- `packages/router/src/services/AgentDelegator.ts:95-97` - Fallback handling

### 3. Provide Complete Context
```typescript
const turnContext: TurnContext = {
  userId: 'user-123',
  sessionId: 'session-456',
  userInput: "Let's create a story!",
  channel: 'web',
  locale: 'en-US',
  timestamp: new Date().toISOString(),
  // Include all available context
};
```

### 4. Monitor Circuit Breakers
```typescript
const health = router.agentDelegator.getAgentHealth();
// Monitor circuit breaker states
```

**Code References:**
- `packages/router/src/services/AgentDelegator.ts:221-230` - Health check

## Common Patterns

### Pattern 1: Simple Intent → Single Agent
```typescript
// User: "Show me my stories"
// Router → Library Agent
const response = await router.route(turnContext);
```

### Pattern 2: Complex Intent → Multiple Agents
```typescript
// User: "Create an adventure story"
// Router → Content Agent (primary)
// Router → Emotion Agent (parallel)
// Router → Child Safety Agent (parallel)
const response = await router.route(turnContext);
```

### Pattern 3: Multi-Turn Conversation
```typescript
// Turn 1: "Let's create a story"
const response1 = await router.route(turnContext1);
// Router maintains state

// Turn 2: "Make it about pirates"
const response2 = await router.route(turnContext2);
// Router uses previous state
```

**Code References:**
- `packages/router/src/Router.ts:138` - State retrieval
- `packages/router/src/Router.ts:155` - State update

## Anti-Patterns to Avoid

1. **Bypassing Router**: Don't call agents directly unless absolutely necessary
2. **Ignoring State**: Always provide sessionId for state management
3. **Not Handling Errors**: Always handle Router errors gracefully
4. **Missing Context**: Provide complete TurnContext for accurate classification
