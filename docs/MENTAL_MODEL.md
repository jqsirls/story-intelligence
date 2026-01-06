# Mental Model

**Last Updated**: 2025-12-13

## System Overview

Storytailor uses a **hub-and-spoke multi-agent architecture** where a central Router orchestrates specialized agents that handle different aspects of the storytelling experience.

## Core Components

### Router (Hub)
- **Purpose**: Intent classification and delegation
- **Location**: `packages/router/`
- **Responsibilities**:
  - Classifies user intents from conversations
  - Routes requests to appropriate agents
  - Manages conversation state
  - Handles platform-specific adapters (Alexa, web, mobile)

### Universal Agent (Spoke)
- **Purpose**: Main conversation agent
- **Location**: `packages/universal-agent/`
- **Responsibilities**:
  - Handles general conversation flow
  - Coordinates with specialized agents
  - Manages multi-turn conversations
  - Platform-agnostic conversation logic

### Specialized Agents (Spokes)
Each agent handles a specific domain:

- **AuthAgent** (`packages/auth-agent/`): Authentication, account linking
- **ContentAgent** (`packages/content-agent/`): Story and character generation
- **LibraryAgent** (`packages/library-agent/`): Library management, permissions
- **EmotionAgent** (`packages/emotion-agent/`): Emotion tracking and analysis
- **CommerceAgent** (`packages/commerce-agent/`): Subscriptions and billing
- **InsightsAgent** (`packages/insights-agent/`): Pattern analysis and recommendations
- **ChildSafetyAgent** (`packages/child-safety-agent/`): Safety monitoring and crisis intervention
- **KnowledgeBaseAgent** (`packages/knowledge-base-agent/`): Platform guidance and knowledge

## Data Flow

```
User Input → Router → Intent Classification → Agent Selection → Agent Processing → Response → User
```

### Conversation Flow Example

1. **User**: "Tell me a story about a dragon"
2. **Router**: Classifies as content generation intent
3. **Router**: Delegates to ContentAgent
4. **ContentAgent**: 
   - Checks user's library (via LibraryAgent)
   - Checks user's preferences (via EmotionAgent)
   - Generates personalized story
5. **Router**: Formats response for platform (Alexa/Web/Mobile)
6. **User**: Receives personalized story

## System Boundaries

### What's Inside
- Agent orchestration and communication
- Conversation state management
- Content generation and personalization
- Library and user data management
- Safety and compliance features

### What's Outside
- **Frontend Applications**: Web apps, mobile apps (consume APIs)
- **Voice Platforms**: Alexa, Google Assistant (integrate via adapters)
- **Third-Party Services**: OpenAI, ElevenLabs, Stripe (called by agents)
- **Infrastructure**: AWS, Supabase, Redis (hosting and data)

## Communication Patterns

### Inter-Agent Communication
- **gRPC**: For synchronous agent-to-agent calls
- **Event System**: For asynchronous notifications
- **Shared Types**: Common TypeScript types in `packages/shared-types/`

### External Communication
- **REST APIs**: For web/mobile clients
- **Alexa SDK**: For voice platform integration
- **Webhooks**: For partner integrations

## State Management

### Conversation State
- **Redis**: Short-term conversation state (session-based)
- **Key Pattern**: `storytailor:conversation:{userId}:{sessionId}`
- **TTL**: Session-based expiration

### Persistent Data
- **Supabase (PostgreSQL)**: User data, stories, characters, library
- **Row Level Security (RLS)**: Enforces data access policies
- **PII Handling**: Tokenized (SHA-256) in logs, encrypted at rest

## Error Handling

### Circuit Breakers
- External API calls use circuit breakers
- Prevents cascade failures
- Automatic retry with exponential backoff

### Graceful Degradation
- If ContentAgent fails, fallback to library stories
- If EmotionAgent fails, continue without emotion tracking
- Always provide some response to user

## Scalability

### Horizontal Scaling
- All agents are stateless
- Lambda functions scale automatically
- Redis handles session state distribution

### Performance Targets
- Voice response: <800ms
- Cold start: <150ms
- API response: <200ms

## Security Boundaries

### Data Isolation
- RLS policies enforce user data isolation
- Agents only access data they need
- No cross-user data access

### Compliance
- COPPA: Verified parent email for under-13 users
- GDPR: Right to be forgotten, data export
- PII: Automated detection and redaction

## Related Documentation

- [What This Is](./WHAT_THIS_IS.md) - Product overview
- [Architecture](./system/architecture.md) - Detailed technical architecture
- [Agent Documentation](./agents/README.md) - Individual agent documentation
