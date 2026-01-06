# Conversation Agent - Where

**Last Updated**: 2025-12-14

## Deployment Location

### Production Environment

**Region**: `us-east-2` (Ohio)  
**Lambda Function**: `storytailor-conversation-agent-production`  
**Runtime**: Node.js 20.x  
**Architecture**: x86_64  
**Memory**: 1024 MB  
**Timeout**: 30 seconds (direct invocation), 300 seconds (WebSocket)

### Infrastructure

**AWS Lambda Function**:
- Deployed as serverless function
- Auto-scales based on concurrent connections
- WebSocket API Gateway integration for real-time connections
- Direct invocation support for health checks and admin operations

**API Gateway**:
- WebSocket API for real-time bidirectional communication
- Connection management and lifecycle
- Route selection for different actions
- Integration with Lambda function

**Redis Cluster**:
- Region: `us-east-2`
- Used for conversation state persistence
- 1-hour TTL on conversation states
- Auto-save every 30 seconds

**Supabase**:
- Region: `us-east-1` (primary)
- Used for user authentication and profile data
- Conversation history storage
- Parent notification system

### External Dependencies

**ElevenLabs Conversational AI**:
- Platform: `api.elevenlabs.io`
- WebSocket endpoint: `wss://api.elevenlabs.io/v1/agents/{agentId}/conversation`
- Region: Global (anycast)
- Requires API key and Agent ID

**Smart Home Agent**:
- Lambda Function URL: `https://aqxdnlkqwqyqfmfaiwlqjjqp4u0jgxvx.lambda-url.us-east-2.on.aws/`
- Region: `us-east-2`
- Used for Philips Hue device control
- Optional dependency (conversation continues if unavailable)

## Lambda Configuration

### Function Settings

```yaml
FunctionName: storytailor-conversation-agent-production
Runtime: nodejs20.x
Handler: lambda.handler
MemorySize: 1024
Timeout: 30  # Direct invocation
Timeout: 300 # WebSocket (via API Gateway)
Architecture: x86_64
Environment:
  ELEVENLABS_AGENT_ID: ${ssm:/storytailor-production/elevenlabs-agent-id}
  ELEVENLABS_API_KEY: ${ssm:/storytailor-production/elevenlabs-api-key}
  REDIS_URL: ${ssm:/storytailor-production/redis-url}
  SUPABASE_URL: ${ssm:/storytailor-production/supabase-url}
  SUPABASE_SERVICE_KEY: ${ssm:/storytailor-production/supabase-service-key}
  SMART_HOME_AGENT_URL: https://aqxdnlkqwqyqfmfaiwlqjjqp4u0jgxvx.lambda-url.us-east-2.on.aws/
```

### IAM Permissions

**Required Permissions**:
- `lambda:InvokeFunction` (for Smart Home Agent)
- `ssm:GetParameter` (for environment variables)
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` (for CloudWatch)
- `execute-api:ManageConnections` (for WebSocket API Gateway)

### VPC Configuration

**No VPC Required**:
- Lambda function runs in default VPC
- Direct internet access for ElevenLabs and Supabase
- Redis accessed via public endpoint (with authentication)

### API Gateway Configuration

**WebSocket API**:
- Route: `$connect` - Connection establishment
- Route: `$disconnect` - Connection termination
- Route: `$default` - Message handling
- Route: `sendMessage` - Send message action
- Route: `getState` - Get conversation state

**Integration**:
- Integration type: Lambda Function
- Integration URI: `arn:aws:lambda:us-east-2:ACCOUNT_ID:function:storytailor-conversation-agent-production`
- Timeout: 300 seconds
- Content handling: Passthrough

## Environment Variables

### Required Variables

**ElevenLabs Configuration**:
- `ELEVENLABS_AGENT_ID`: ElevenLabs Agent ID for Frankie
- `ELEVENLABS_API_KEY`: ElevenLabs API key for authentication

**State Management**:
- `REDIS_URL`: Redis connection URL (format: `redis://host:port`)

**Database**:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key

### Optional Variables

**Smart Home Integration**:
- `SMART_HOME_AGENT_URL`: Smart Home Agent Lambda Function URL (defaults to production URL)

**Logging**:
- `LOG_LEVEL`: Logging level (default: `info`)
- `LOG_FORMAT`: Log format (default: `json`)

## Deployment Process

### Build and Deploy

1. **Build the package**:
   ```bash
   cd lambda-deployments/conversation-agent
   npm install
   npm run build
   ```

2. **Package for deployment**:
   ```bash
   zip -r conversation-agent.zip dist/ node_modules/ package.json
   ```

3. **Deploy to Lambda**:
   ```bash
   aws lambda update-function-code \
     --function-name storytailor-conversation-agent-production \
     --zip-file fileb://conversation-agent.zip \
     --region us-east-2
   ```

### CI/CD Pipeline

**Automated Deployment**:
- Triggered on merge to `main` branch
- Builds TypeScript to JavaScript
- Runs tests and linting
- Packages and deploys to Lambda
- Updates API Gateway integration if needed
- Runs smoke tests post-deployment

### Rollback Procedure

1. **Identify previous version**:
   ```bash
   aws lambda list-versions-by-function \
     --function-name storytailor-conversation-agent-production \
     --region us-east-2
   ```

2. **Update to previous version**:
   ```bash
   aws lambda update-alias \
     --function-name storytailor-conversation-agent-production \
     --name production \
     --function-version PREVIOUS_VERSION \
     --region us-east-2
   ```

## Monitoring and Observability

### CloudWatch Metrics

**Function Metrics**:
- `Invocations`: Number of function invocations
- `Duration`: Function execution time
- `Errors`: Number of function errors
- `Throttles`: Number of throttled invocations
- `ConcurrentExecutions`: Number of concurrent executions

**Custom Metrics**:
- `ConversationStarted`: Number of conversations started
- `ConversationEnded`: Number of conversations ended
- `EmotionDetected`: Emotion detection events (by tier)
- `SafetyAlert`: Tier 3 emotion alerts
- `ConnectionReconnected`: WebSocket reconnection events

### CloudWatch Logs

**Log Group**: `/aws/lambda/storytailor-conversation-agent-production`

**Key Log Events**:
- Conversation lifecycle (start, end, pause, resume)
- Emotion detection (tier, intensity, response)
- Safety events (Tier 3 alerts, parent notifications)
- Connection events (connect, disconnect, reconnect)
- Error events (connection failures, state persistence failures)

### X-Ray Tracing

**Enabled**: Yes (for production debugging)

**Traced Operations**:
- ElevenLabs WebSocket communication
- Redis state operations
- Supabase queries
- Smart Home Agent calls
- Lambda function execution

## Regional Considerations

### Data Residency

**User Data**:
- Stored in `us-east-1` (Supabase)
- Conversation state in `us-east-2` (Redis)
- Compliant with US data residency requirements

**Future Expansion**:
- EU region support planned for GDPR compliance
- Multi-region deployment for latency optimization
- Regional data residency for international users

### Latency Optimization

**Current Setup**:
- Lambda in `us-east-2` for central US users
- Redis in `us-east-2` for low-latency state access
- Supabase in `us-east-1` (acceptable latency)

**Optimization Opportunities**:
- Regional Lambda deployments for global users
- Regional Redis clusters for state management
- CDN for static assets (if added)
- Edge locations for WebSocket connections

## Disaster Recovery

### Backup and Recovery

**State Persistence**:
- Redis snapshots every 5 minutes
- Conversation state TTL: 1 hour (configurable)
- Transcripts stored in Supabase for long-term retention

**Function Code**:
- Versioned in Git
- Lambda versioning enabled
- Previous versions retained for 30 days

### Failover Procedures

**ElevenLabs Unavailable**:
- Graceful error message to user
- State preservation for session resumption
- Fallback to text-based interaction if available

**Redis Unavailable**:
- In-memory state management as fallback
- Periodic retry for state persistence
- Warning logs for state loss risk

**Lambda Function Failure**:
- Automatic retry with exponential backoff
- Dead letter queue for failed invocations
- Alert to on-call engineer

## Security

### Network Security

**VPC**: Default VPC (no VPC required)
**Security Groups**: Default Lambda security group
**Network ACLs**: Default network ACLs

### Data Security

**Encryption in Transit**:
- TLS 1.2+ for all external connections
- WebSocket over WSS (secure WebSocket)
- Redis connection over TLS

**Encryption at Rest**:
- Supabase data encrypted at rest
- Redis data encrypted at rest (if enabled)
- Lambda environment variables encrypted

### Access Control

**IAM Roles**:
- Least privilege principle
- No public access
- Role-based access control

**API Authentication**:
- WebSocket connections authenticated via Supabase
- Direct invocations require IAM authentication
- API Gateway authorizers for WebSocket routes

## Cost Optimization

### Lambda Costs

**Memory**: 1024 MB (optimized for WebSocket handling)
**Duration**: Average 2-5 seconds per invocation
**Concurrent Executions**: Auto-scales based on demand

### Optimization Strategies

- **Reserved Concurrency**: Not set (allows auto-scaling)
- **Provisioned Concurrency**: Not used (cold start acceptable)
- **Memory Optimization**: Tuned for WebSocket message handling
- **Timeout Optimization**: 30 seconds for direct, 300 for WebSocket

### External Service Costs

**ElevenLabs**: Pay-per-conversation-minute
**Redis**: Pay-per-GB-hour
**Supabase**: Pay-per-request
**API Gateway**: Pay-per-message (WebSocket)

