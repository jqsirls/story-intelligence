# Conversation Agent - When

**Last Updated**: 2025-12-14

## When to Use

The Conversation Agent is the primary interface for real-time voice conversations with children. Use it whenever you need:

- **Real-time voice conversations** with children ages 3-9
- **Emotion-aware storytelling** that adapts to child's emotional state
- **Age-adaptive interactions** that match developmental stage
- **Personalized story creation** through collaborative dialogue
- **Smart home integration** for immersive storytelling experiences

## Usage Guidelines

### Primary Use Cases

#### 1. Story Creation Sessions

**When**: Child wants to create a new story with Frankie

**Flow**:
1. Child initiates conversation: "I want to tell a story"
2. Conversation Agent starts session with age-appropriate greeting
3. Character creation phase (multi-turn)
4. Story building with choices and collaboration
5. Story completion and reflection

**Duration**: 5-15 minutes depending on age (3-4: 5-7 min, 5-6: 7-10 min, 7-9: 10-12 min)

#### 2. Returning User Sessions

**When**: Child returns for another conversation

**Flow**:
1. Agent recognizes returning user: "Welcome back, Captain Jellybean!"
2. References past adventures and characters
3. Offers to continue previous story or start new one
4. Maintains continuity with previous sessions

**Key Features**:
- Returning user recognition
- Past story references
- Character continuity
- Emotional pattern awareness

#### 3. Emotion-Focused Sessions

**When**: Child expresses emotions during conversation

**Flow**:
1. Agent detects emotion (Tier 1, 2, or 3)
2. Applies appropriate emotion handling protocol
3. Integrates emotion into story narrative
4. Provides age-appropriate emotional support
5. Tags for parent notification if Tier 2 or 3

**Emotion Tiers**:
- **Tier 1**: Everyday feelings - integrated into story naturally
- **Tier 2**: Big feelings - slowed pace, breathing prompts, parent notification
- **Tier 3**: Concerning cues - gentle stop, parent/authority alert

#### 4. Bedtime Story Sessions

**When**: Child requests bedtime story

**Flow**:
1. Agent recognizes bedtime context
2. Adjusts lighting to dim, calming colors (Steel Blue, 15% brightness)
3. Slower pace, gentler tone
4. Calming story themes
5. Gradual fade-out for sleep

**Smart Home Integration**:
- Dim lighting (15% brightness)
- Calming colors (Steel Blue)
- Slow transitions (10 seconds)
- Gradual fade-out

#### 5. Educational Story Sessions

**When**: Child wants to learn through storytelling

**Flow**:
1. Agent identifies educational intent
2. Adjusts lighting to bright, focused colors (White, 70% brightness)
3. Incorporates age-appropriate learning concepts
4. Encourages questions and exploration
5. Provides gentle feedback and encouragement

## Integration Points

### With Other Agents

**Conversation Intelligence Agent**:
- Provides advanced NLU and contextual memory
- Enhances emotion detection and response
- Personalizes conversation based on long-term patterns

**Emotion Agent**:
- Tracks emotional patterns over time
- Provides emotion history for personalization
- Identifies concerning patterns requiring intervention

**Smart Home Agent**:
- Manages Philips Hue device connections
- Controls lighting based on conversation context
- Handles room-specific lighting requests

**Child Safety Agent**:
- Receives Tier 3 emotion alerts
- Handles crisis detection and mandatory reporting
- Provides safety protocol guidance

**Content Agent**:
- May be called for story content generation
- Provides character and story templates
- Supplies age-appropriate content suggestions

### With External Services

**ElevenLabs Conversational AI**:
- Primary conversation engine
- Real-time voice synthesis and understanding
- Emotion detection from audio

**Redis**:
- Conversation state persistence
- Session management
- Transcript storage

**Supabase**:
- User authentication and profile data
- Conversation history storage
- Parent notification system

## When NOT to Use

### Use Other Agents For:

**Text-Based Interactions**:
- Use Universal Agent or Router for text-based conversations
- Conversation Agent is optimized for voice/WebSocket

**Non-Conversational Story Generation**:
- Use Content Agent for batch story generation
- Conversation Agent is for real-time, interactive storytelling

**Analytics and Insights**:
- Use Insights Agent for pattern analysis
- Use Analytics Intelligence for privacy-preserving analytics
- Conversation Agent focuses on real-time interaction

**Authentication and Account Management**:
- Use Auth Agent for login, signup, account linking
- Conversation Agent assumes authenticated user

## Timing Considerations

### Session Length

**Ages 3-4**: 5-7 minutes, 6-8 story beats
**Ages 5-6**: 7-10 minutes, 8-12 story beats
**Ages 7-9**: 10-12 minutes, 10-14 story beats
**Ages 10+**: 12-15 minutes, 12-16 story beats

### Conversation Rhythm

**Every 90-120 seconds**:
- Warm scan: "How are you feeling right now?"
- Small choice: "Do you want more action, more silly, or more cozy right now?"

**Pause and Reflect**:
- When feelings appear, pause story to acknowledge
- Provide breathing prompts for big feelings
- Give child control over story direction

### Break Handling

**When Child Needs Break**:
- "Good plan. I will hold the sky for you. Your place is saved."
- State persists for 1 hour (configurable)
- Re-entry: "Welcome back. Our hero is waiting. Do we fly or walk?"

## Error Handling

### Connection Issues

**WebSocket Disconnection**:
- Automatic reconnection with exponential backoff
- Message queuing until connection restored
- Maximum 5 reconnection attempts (configurable)

**ElevenLabs Platform Unavailable**:
- Graceful error message to user
- State preservation for session resumption
- Fallback to text-based interaction if available

### State Management

**Redis Unavailable**:
- In-memory state management as fallback
- Periodic retry for state persistence
- Warning logs for state loss risk

**State Expiration**:
- 1-hour TTL on conversation state
- Graceful handling of expired states
- Option to resume with new state if needed

### Smart Home Integration

**Hue Not Connected**:
- Conversation continues without lighting
- No error thrown, graceful degradation
- Logs warning for debugging

**Hue Service Unavailable**:
- Conversation continues without lighting
- Automatic retry for lighting updates
- No impact on core conversation functionality

## Best Practices

### Initialization

1. **Always initialize** before use:
   ```typescript
   await agent.initialize();
   ```

2. **Check connection status** before starting conversation:
   ```typescript
   const isConnected = await agent.isHueConnected();
   ```

3. **Handle initialization errors** gracefully:
   ```typescript
   try {
     await agent.initialize();
   } catch (error) {
     logger.error('Failed to initialize', error);
     // Fallback behavior
   }
   ```

### Conversation Management

1. **Always start conversation** before sending messages:
   ```typescript
   const state = await agent.startConversation(connectionId, userId, sessionId, metadata);
   ```

2. **Save state regularly** (auto-save every 30 seconds, but manual save recommended):
   ```typescript
   await agent.getConversationState(connectionId);
   ```

3. **End conversation** when session completes:
   ```typescript
   await agent.endConversation(connectionId);
   ```

### Error Recovery

1. **Monitor connection health**:
   ```typescript
   const stats = await agent.getConnectionStats();
   if (stats.activeConnections === 0) {
     // Handle no active connections
   }
   ```

2. **Handle reconnection**:
   ```typescript
   agent.on('reconnected', () => {
     // Process queued messages
   });
   ```

3. **Graceful degradation**:
   ```typescript
   if (!agent.isHueConnected()) {
     // Continue without lighting
   }
   ```

## Monitoring and Observability

### Key Metrics

- **Connection Health**: Active connections, reconnection rate
- **Conversation Duration**: Average session length by age group
- **Emotion Detection**: Tier 1/2/3 distribution
- **Safety Alerts**: Tier 3 detection rate, parent notification time
- **Error Rate**: Connection failures, state persistence failures
- **Latency**: Response time, WebSocket message round-trip time

### Logging

- **Conversation Lifecycle**: Start, end, pause, resume
- **Emotion Detection**: Tier, intensity, response
- **Safety Events**: Tier 3 alerts, parent notifications
- **Connection Events**: Connect, disconnect, reconnect
- **Error Events**: Connection failures, state persistence failures

### Alerts

- **Tier 3 Emotions**: Immediate alert to Child Safety Agent
- **Connection Failures**: Alert if >5% failure rate
- **State Persistence Failures**: Alert if Redis unavailable
- **High Latency**: Alert if response time >800ms

