# A2A (Agent-to-Agent) Protocol - Where

**Last Updated**: 2025-12-17

## Deployment Location

The A2A adapter is deployed as part of the Universal Agent Lambda function in the `us-east-1` region.

- **Primary Region**: `us-east-1` (N. Virginia)
- **Lambda Function Name**: `storytailor-universal-agent-production`
- **Package Location**: `packages/a2a-adapter/`
- **Main Handler**: Bundled with Universal Agent (`dist/lambda.handler`)

## AWS Lambda Configuration

- **Runtime**: `nodejs22.x`
- **Memory**: `512 MB` (shared with Universal Agent)
- **Timeout**: `60 seconds` (sufficient for task operations and agent coordination)
- **Concurrency**: Configured with auto-scaling based on demand
- **Trigger**: Lambda Function URL (HTTP endpoint) or API Gateway
- **IAM Role**: Possesses necessary permissions for:
  - Logging to CloudWatch
  - Accessing AWS Systems Manager (SSM) Parameter Store for configuration
  - Reading from and writing to Supabase (via VPC endpoint or public API)
  - Accessing Redis (for task caching, if configured)
  - Invoking other internal Lambda agents (via Router)

## Function URL

The A2A endpoints are accessible via Universal Agent Lambda Function URL:

- **Function URL**: `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/`
- **Status**: ✅ Configured and accessible
- **AuthType**: NONE (authentication handled by A2A adapter)
- **CORS**: Configured for cross-origin requests from partner platforms

## Production Endpoints

**A2A Base URL**: `https://storyintelligence.dev`

**A2A Endpoints**:
- `GET https://storyintelligence.dev/a2a/discovery` - Agent discovery
- `POST https://storyintelligence.dev/a2a/message` - JSON-RPC 2.0 messaging
- `POST https://storyintelligence.dev/a2a/task` - Task delegation
- `GET https://storyintelligence.dev/a2a/status` - Task status (with optional SSE)
- `POST https://storyintelligence.dev/a2a/webhook` - Webhook notifications
- `GET https://storyintelligence.dev/health` - Health check

**Main API Base URL**: `https://api.storytailor.dev`

**Code References:**
- `docs/platform/a2a/deployment-verification.md:81-86` - Function URL details
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - A2A route registration

## Environment Variables

The following environment variables are configured via AWS Systems Manager (SSM) Parameter Store and injected into the Lambda function:

- `A2A_BASE_URL`: Base URL for A2A endpoints
  - **SSM Path**: `/storytailor-production/a2a/base-url`
  - **Production**: `https://storyintelligence.dev`
- `A2A_WEBHOOK_URL`: Webhook endpoint URL
  - **SSM Path**: `/storytailor-production/a2a/webhook-url`
  - **Production**: `https://storyintelligence.dev/a2a/webhook`
- `A2A_HEALTH_URL`: Health check endpoint URL
  - **SSM Path**: `/storytailor-production/a2a/health-url`
  - **Production**: `https://storyintelligence.dev/health`
- `A2A_JWKS_URL`: JWKS endpoint for OAuth token verification (optional)
  - **SSM Path**: `/storytailor-production/a2a/jwks-url`
- `A2A_TOKEN_ISSUER`: Expected JWT token issuer (optional)
  - **SSM Path**: `/storytailor-production/a2a/token-issuer`
- `A2A_TOKEN_AUDIENCE`: Expected JWT token audience (optional)
  - **SSM Path**: `/storytailor-production/a2a/token-audience`
- `A2A_RATE_LIMIT_PER_MINUTE`: Rate limit per agent (default: 60)
  - **SSM Path**: `/storytailor-production/a2a/rate-limit-per-minute`
- `A2A_TASK_TIMEOUT_MS`: Task timeout in milliseconds (default: 300000)
  - **SSM Path**: `/storytailor-production/a2a/task-timeout-ms`

**Code References:**
- `docs/platform/a2a/deployment.md:44-105` - Environment variable configuration
- `scripts/setup-a2a-ssm-parameters.sh` - SSM parameter setup script

## Monitoring and Logging

- **CloudWatch Logs**: All A2A adapter logs are streamed to CloudWatch for real-time monitoring and debugging
  - **Log Group**: `/aws/lambda/storytailor-universal-agent-production`
- **CloudWatch Metrics**: Key performance indicators monitored:
  - Invocation count
  - Error rate
  - Latency (duration)
  - Task completion rate
  - Webhook delivery success rate
- **Health Monitoring**: Health endpoint available for monitoring
- **Distributed Tracing**: Can be integrated with AWS X-Ray for end-to-end request tracing

**Code References:**
- `docs/platform/a2a/deployment-verification.md:96-101` - Log verification
- `scripts/setup-a2a-monitoring.sh` - Monitoring setup

## Infrastructure Dependencies

### Supabase (PostgreSQL)

- **Purpose**: Stores A2A task state in `a2a_tasks` table
- **Region**: `us-east-1` (primary)
- **Table Schema**: 
  - `id` (UUID, primary key)
  - `task_id` (TEXT, unique)
  - `state` (TEXT, enum: submitted, working, input-required, completed, failed, canceled)
  - `client_agent_id` (TEXT)
  - `remote_agent_id` (TEXT)
  - `method` (TEXT)
  - `params` (JSONB)
  - `result` (JSONB)
  - `error` (JSONB)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

**Code References:**
- `docs/platform/a2a/deployment.md:128-145` - Database setup
- `supabase/migrations/` - Migration files

### Redis (Optional)

- **Purpose**: Caching for fast task access
- **Region**: `us-east-1`
- **Usage**: Optional caching layer for task state

### Router Lambda Function

- **Function Name**: `storytailor-router-production`
- **Region**: `us-east-1`
- **Purpose**: A2A methods map to router/agent calls via `RouterIntegration.ts`
- **Integration**: A2A adapter routes requests to router for agent execution

**Code References:**
- `packages/a2a-adapter/src/RouterIntegration.ts` - Router integration

### AWS Systems Manager (SSM) Parameter Store

- **Purpose**: Manages environment-specific configurations
- **Region**: `us-east-1`
- **Access**: Lambda execution role has read permissions

## Network Configuration

- **VPC**: Not required (public Lambda Function URL)
- **Security Groups**: N/A (Function URL handles security)
- **Internet Gateway**: Required for external access (via Function URL)

## Related Documentation

- [A2A Overview](./overview.md) - Complete protocol overview
- [A2A What](./what.md) - Detailed functionality
- [A2A Deployment Guide](./deployment.md) - Deployment procedures
- [A2A Deployment Verification](./deployment-verification.md) - Production verification
