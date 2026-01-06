# Conversation Agent - Development

**Last Updated**: 2025-12-14

## Technical Implementation

### Architecture Overview

The Conversation Agent is built as a serverless Lambda function that orchestrates real-time voice conversations using the ElevenLabs Conversational AI platform. It manages conversation state in Redis, integrates with Supabase for user data, and controls Philips Hue lighting for immersive experiences.

### Core Components

#### ConversationAgent

Main orchestrator that manages the conversation lifecycle:

```typescript
class ConversationAgent {
  private config: ConversationAgentConfig
  private logger: Logger
  private elevenLabsClient: ElevenLabsAgentClient
  private connectionManager: ConnectionManager
  private stateManager: ConversationStateManager
  private hueIntegration: HueConversationIntegration

  async initialize(): Promise<void>
  async startConversation(
    connectionId: string,
    userId: string,
    sessionId: string,
    metadata?: Record<string, unknown>
  ): Promise<ConversationState>
  async sendMessage(
    connectionId: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void>
  async endConversation(connectionId: string): Promise<void>
  async getConversationState(connectionId: string): Promise<ConversationState | null>
  async getUserConversations(userId: string): Promise<ConversationState[]>
  async getConnectionStats(): Promise<ConnectionStats>
  async handleSpecialMoment(
    userId: string,
    momentType: 'giggle' | 'silence' | 'yawn' | 'excitement' | 'fear' | 'calm',
    roomId?: string
  ): Promise<void>
  async updateStoryLighting(
    userId: string,
    storyType: string,
    storyProgress: number,
    characterName?: string,
    roomId?: string
  ): Promise<void>
}
```

#### ElevenLabsAgentClient

WebSocket client for ElevenLabs platform:

```typescript
class ElevenLabsAgentClient {
  async connect(userAge: number, userName?: string, isReturningUser?: boolean): Promise<void>
  async sendMessage(message: string, userId: string, metadata?: Record<string, unknown>): Promise<void>
  async sendToolCall(toolCall: ToolCall): Promise<void>
  onResponse(callback: (response: AgentResponse) => void): void
  async disconnect(): Promise<void>
}
```

**Key Features**:
- Automatic reconnection with exponential backoff
- Message queuing for offline scenarios
- Heartbeat monitoring (ping every 30 seconds)
- Response callback handling

#### ConversationStateManager

Redis-based state persistence:

```typescript
class ConversationStateManager {
  async createConversation(
    conversationId: string,
    userId: string,
    sessionId: string,
    agentId: string
  ): Promise<ConversationState>
  async getConversationState(conversationId: string): Promise<ConversationState | null>
  async saveConversationState(state: ConversationState): Promise<void>
  async addTurn(conversationId: string, turn: ConversationTurn): Promise<void>
  async updateConversationStatus(conversationId: string, status: ConversationStatus): Promise<void>
  async updateConversationMetadata(conversationId: string, metadata: Record<string, unknown>): Promise<void>
  async getUserConversations(userId: string): Promise<ConversationState[]>
}
```

**State Structure**:
```typescript
interface ConversationState {
  conversationId: string
  userId: string
  sessionId: string
  agentId: string
  status: 'active' | 'ended' | 'paused'
  startTime: Date
  lastActivity: Date
  transcript: ConversationTurn[]
  metadata: Record<string, unknown>
}
```

#### HueConversationIntegration

Smart lighting integration:

```typescript
class HueConversationIntegration {
  async initializeHueConnection(userId: string, roomId?: string): Promise<boolean>
  async updateLightingForConversation(context: ConversationContext): Promise<void>
  async handleEmotionLighting(
    userId: string,
    emotion: string,
    intensity: number,
    roomId?: string
  ): Promise<void>
  async handleStoryLighting(
    userId: string,
    storyType: string,
    storyProgress: number,
    characterName?: string,
    roomId?: string
  ): Promise<void>
  async handleSpecialMoment(
    userId: string,
    momentType: 'giggle' | 'silence' | 'yawn' | 'excitement' | 'fear' | 'calm',
    roomId?: string
  ): Promise<void>
  isHueConnected(): boolean
}
```

**Lighting Profiles**:
- Emotion-based: Happy (yellow, 80%), Sad (light blue, 30%), Fear (purple, 20%), Excitement (orange-red, 90%), Calm (light green, 60%)
- Story-based: Adventure (gold, 85%), Bedtime (steel blue, 15%), Educational (white, 70%)
- Special moments: Giggle (pink flash), Silence (dim to black), Yawn (pale yellow dim), Excitement (bright gold), Fear (dark red pulse), Calm (pale cyan fade)

#### FrankieSystemPrompt

Age-adaptive system prompt builder:

```typescript
class FrankieSystemPrompt {
  static build(config: {
    userAge: number
    mode: 'voice' | 'text'
    userName?: string
    isReturningUser?: boolean
  }): string
  static buildForPhase(
    phase: 'greeting' | 'emotion_check' | 'character_creation' | 'story_building' | 'story_editing' | 'completion',
    config: PromptConfig
  ): string
  static getAgeGroup(age: number): '3-4' | '5-6' | '7-9' | '10+'
  static getSessionLength(ageGroup: string): string
  static getChoiceCount(ageGroup: string): string
  static getAgeGuidance(ageGroup: string): string
}
```

## API Reference

### Lambda Handler

**Entry Point**: `lambda.js`

**Actions**:
- `health` - Health check
- `start_conversation` - Start new conversation
- `send_message` - Send message in conversation
- `end_conversation` - End conversation
- `get_state` - Get conversation state
- `get_stats` - Get connection statistics

**Direct Invocation**:
```typescript
{
  action: 'start_conversation',
  connectionId: 'conn_123',
  userId: 'user_456',
  sessionId: 'session_789',
  metadata: {
    userAge: 7,
    userName: 'Alex',
    isReturningUser: false
  }
}
```

**WebSocket Events**:
- `$connect` - Connection established
- `$disconnect` - Connection terminated
- `$default` - Message received
- `sendMessage` - Send message action
- `getState` - Get state action

### ConversationAgent API

#### startConversation

```typescript
const state = await agent.startConversation(
  connectionId: string,
  userId: string,
  sessionId: string,
  metadata?: {
    userAge?: number
    userName?: string
    isReturningUser?: boolean
    roomId?: string
  }
): Promise<ConversationState>
```

**Returns**: Conversation state with `conversationId`, `status`, `startTime`, etc.

#### sendMessage

```typescript
await agent.sendMessage(
  connectionId: string,
  message: string,
  metadata?: {
    emotion?: string
    emotionIntensity?: number
    audioUrl?: string
    timestamp?: Date
  }
): Promise<void>
```

**Side Effects**: 
- Sends message to ElevenLabs
- Updates conversation state
- Adds turn to transcript
- Updates Hue lighting if emotion detected

#### endConversation

```typescript
await agent.endConversation(connectionId: string): Promise<void>
```

**Side Effects**:
- Closes WebSocket connection
- Updates conversation status to 'ended'
- Saves final state
- Cleans up resources

#### getConversationState

```typescript
const state = await agent.getConversationState(connectionId: string): Promise<ConversationState | null>
```

**Returns**: Current conversation state or `null` if not found

#### getUserConversations

```typescript
const conversations = await agent.getUserConversations(userId: string): Promise<ConversationState[]>
```

**Returns**: Array of all conversations for user

#### getConnectionStats

```typescript
const stats = await agent.getConnectionStats(): Promise<{
  totalConnections: number
  activeConnections: number
  userConnections: Record<string, number>
}>
```

**Returns**: Connection statistics

## Development Setup

### Prerequisites

- Node.js 20.x
- npm or yarn
- Redis (local or remote)
- ElevenLabs API key and Agent ID
- Supabase project URL and service key

### Installation

```bash
cd lambda-deployments/conversation-agent
npm install
```

### Environment Variables

Create `.env` file:

```bash
ELEVENLABS_AGENT_ID=your_agent_id
ELEVENLABS_API_KEY=your_api_key
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
SMART_HOME_AGENT_URL=https://your-smart-home-agent-url
LOG_LEVEL=debug
```

### Running Locally

**Start Redis**:
```bash
redis-server
```

**Run Tests**:
```bash
npm test
```

**Run with Coverage**:
```bash
npm run test:coverage
```

**Watch Mode**:
```bash
npm run test:watch
```

**Build**:
```bash
npm run build
```

**Lint**:
```bash
npm run lint
```

### Testing

**Unit Tests**:
- `src/__tests__/ConversationAgent.test.ts`
- `src/__tests__/ElevenLabsAgentClient.test.ts`
- `src/__tests__/ConversationStateManager.test.ts`
- `src/__tests__/HueConversationIntegration.test.ts`
- `src/__tests__/FrankieSystemPrompt.test.ts`

**Integration Tests**:
- `src/__tests__/integration/conversation-flow.test.ts`
- `src/__tests__/integration/state-persistence.test.ts`
- `src/__tests__/integration/hue-integration.test.ts`

**Test Coverage Target**: 90%

### Debugging

**Local Debugging**:
```bash
node --inspect dist/lambda.js
```

**CloudWatch Logs**:
```bash
aws logs tail /aws/lambda/storytailor-conversation-agent-production --follow
```

**X-Ray Tracing**:
- Enabled in production
- View traces in AWS X-Ray console

## Deployment

### Build and Package

```bash
npm run build
zip -r conversation-agent.zip dist/ node_modules/ package.json
```

### Deploy to Lambda

```bash
aws lambda update-function-code \
  --function-name storytailor-conversation-agent-production \
  --zip-file fileb://conversation-agent.zip \
  --region us-east-2
```

### CI/CD

**Automated Pipeline**:
1. Build TypeScript
2. Run tests and linting
3. Package for deployment
4. Deploy to Lambda
5. Run smoke tests
6. Update API Gateway if needed

## Performance Optimization

### Memory and Timeout

**Current Settings**:
- Memory: 1024 MB
- Timeout: 30 seconds (direct), 300 seconds (WebSocket)

**Optimization**:
- Monitor CloudWatch metrics for memory usage
- Adjust based on actual usage patterns
- Consider provisioned concurrency for WebSocket connections

### Connection Pooling

**Redis**:
- Single connection per Lambda instance
- Connection reuse across invocations
- Automatic reconnection on failure

**ElevenLabs**:
- One WebSocket connection per conversation
- Connection pooling not applicable (stateful connections)

### Caching

**Conversation State**:
- Cached in Redis with 1-hour TTL
- Auto-save every 30 seconds
- In-memory cache for active conversations

## Security

### Authentication

**WebSocket Connections**:
- Authenticated via Supabase JWT
- Validated on `$connect` event
- Connection ID tied to user ID

**Direct Invocations**:
- IAM authentication required
- Role-based access control
- No public access

### Data Protection

**Encryption**:
- TLS 1.2+ for all external connections
- WebSocket over WSS
- Redis connection over TLS
- Environment variables encrypted in SSM

**PII Handling**:
- User IDs tokenized in logs
- Conversation transcripts stored securely
- Parent notification system for safety

## Monitoring

### Key Metrics

- **Invocations**: Function call count
- **Duration**: Execution time
- **Errors**: Error rate
- **Concurrent Executions**: Active connections
- **Conversation Started**: New conversations
- **Emotion Detected**: Emotion events by tier
- **Safety Alert**: Tier 3 alerts

### Alerts

- **Tier 3 Emotions**: Immediate alert
- **Connection Failures**: >5% failure rate
- **State Persistence Failures**: Redis unavailable
- **High Latency**: >800ms response time

### Logging

**Structured Logging**:
- JSON format for CloudWatch
- Correlation IDs for tracing
- PII tokenization
- Log levels: debug, info, warn, error

## Troubleshooting

### Common Issues

**WebSocket Connection Failures**:
- Check ElevenLabs API key and Agent ID
- Verify network connectivity
- Review reconnection logic
- Check CloudWatch logs for errors

**State Persistence Failures**:
- Verify Redis connection
- Check Redis cluster health
- Review TTL settings
- Monitor Redis memory usage

**Hue Integration Issues**:
- Verify Smart Home Agent URL
- Check user's Hue connection status
- Review lighting profile generation
- Test with different room IDs

**High Latency**:
- Check ElevenLabs response times
- Review Redis query performance
- Monitor Lambda cold starts
- Optimize state management

## Future Enhancements

### Planned Features

- **Multi-language Support**: Integration with Localization Agent
- **Therapeutic Pathways**: Integration with Therapeutic Agent
- **Educational Content**: Integration with Educational Agent
- **Advanced Emotion Detection**: Integration with Conversation Intelligence
- **Voice Cloning**: Custom voice for each child
- **Parent Dashboard**: Real-time conversation insights

### Technical Improvements

- **Regional Deployments**: Multi-region support for latency
- **Edge Computing**: Edge locations for WebSocket connections
- **Advanced Caching**: Multi-layer caching strategy
- **Performance Monitoring**: Enhanced observability
- **Auto-scaling**: Dynamic concurrency management

