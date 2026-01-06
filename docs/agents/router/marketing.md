# Router Agent - Marketing Information

**Status**: Draft  
**Audience**: Marketing | Sales  
**Last Updated**: 2025-12-11

## Value Proposition

The Router Agent is Storytailor's **intelligent orchestration brain** that ensures every user interaction is routed to the right specialized agent at the right time, delivering seamless, context-aware storytelling experiences.

## Key Features and Benefits

### Intelligent Intent Recognition
- **OpenAI-Powered Classification**: Understands natural language with high accuracy
- **11 Story Types Supported**: Adventure, Bedtime, Educational, Therapeutic, and more
- **Context-Aware**: Considers conversation history and user preferences
- **Confidence Scoring**: Requests clarification when uncertain

**Code References:**
- `packages/router/src/services/IntentClassifier.ts` - Intent classification implementation
- `packages/router/src/Router.ts:144` - Intent classification call

### Seamless Agent Coordination
- **Automatic Routing**: No manual agent selection needed
- **Multi-Agent Orchestration**: Coordinates multiple agents working together
- **Parallel Processing**: Executes multiple agents simultaneously for faster responses
- **Failover Protection**: Circuit breakers ensure system resilience

**Code References:**
- `packages/router/src/services/AgentDelegator.ts:36-101` - Agent delegation
- `packages/router/src/services/AgentDelegator.ts:106-149` - Parallel processing

### Conversation Continuity
- **State Persistence**: Maintains context across conversation turns
- **Session Management**: Tracks user sessions and conversation history
- **Interruption Handling**: Gracefully handles user interruptions
- **Checkpoint System**: Saves conversation state at critical points

**Code References:**
- `packages/router/src/services/ConversationStateManager.ts` - State management
- `packages/router/src/services/ConversationInterruptionHandler.ts` - Interruption handling

## Use Cases and Examples

### Story Creation Flow
**User**: "I want to create a bedtime story about a brave bunny"

**Router Actions**:
1. Classifies intent as `CREATE_STORY` with story type `BEDTIME`
2. Delegates to Content Agent for story generation
3. Coordinates with Emotion Agent for emotional tone
4. Coordinates with Child Safety Agent for content screening
5. Returns complete, safe, age-appropriate story

### Library Access
**User**: "Show me my stories"

**Router Actions**:
1. Classifies intent as `VIEW_LIBRARY`
2. Delegates to Library Agent
3. Retrieves user's story library
4. Returns formatted list of stories

### Emotional Check-In
**User**: "I'm feeling sad today"

**Router Actions**:
1. Classifies intent as `EMOTION_CHECKIN`
2. Delegates to Emotion Agent
3. Analyzes emotional state
4. Provides appropriate response and recommendations

## Competitive Advantages

1. **Intelligent Orchestration**: Unlike simple rule-based routing, Router uses AI to understand context and intent
2. **Resilient Architecture**: Circuit breakers and failover ensure 99.9% uptime
3. **Scalable Design**: Handles thousands of concurrent conversations
4. **Multi-Channel Support**: Works across web, mobile, voice (Alexa, Google Assistant)

## Marketing Copy and Messaging

### Primary Message
"Storytailor's Router Agent is the intelligent orchestrator that ensures every conversation is handled by the right specialized agent, delivering personalized, context-aware storytelling experiences."

### Key Talking Points
- "AI-powered intent recognition understands what users want"
- "Seamless coordination of 20+ specialized agents"
- "Maintains conversation context across multiple turns"
- "Resilient architecture with automatic failover"

## Customer Testimonials

*To be added as available*
