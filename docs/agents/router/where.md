# Router Agent - Deployment and Location

**Status**: Draft  
**Audience**: Engineering | DevOps  
**Last Updated**: 2025-12-11

## Where It's Deployed

### Production Lambda Function
- **Function Name**: `storytailor-router-production`
- **Region**: us-east-1
- **Runtime**: nodejs22.x
- **Memory**: 512 MB (verify - staging shows 1024 MB)
- **Timeout**: 30 seconds (verify - staging shows 300 seconds)
- **Last Modified**: 2025-12-11

**Code References:**
- `docs/system/deployment_inventory.md:19` - Router function (staging)
- `../../deployment/agent-to-lambda-mapping.md` - Function mapping

### Staging Lambda Function
- **Function Name**: `storytailor-staging-router`
- **Region**: us-east-1
- **Runtime**: nodejs22.x
- **Memory**: 1024 MB
- **Timeout**: 300 seconds
- **Last Modified**: 2025-11-23

**Code References:**
- `docs/system/deployment_inventory.md:57` - Staging configuration

### Function URL
- **Status**: Not configured (most agents don't have Function URLs)
- **Invocation Method**: Lambda invoke (direct) or via Universal Agent
- **Note**: Router is typically invoked internally, not exposed directly

## Where the Code Lives

### Source Code
- **Package**: `packages/router/`
- **Main File**: `packages/router/src/Router.ts` (~866 lines)
- **Services**:
  - `packages/router/src/services/IntentClassifier.ts`
  - `packages/router/src/services/AgentDelegator.ts` (~646 lines)
  - `packages/router/src/services/ConversationStateManager.ts`
  - `packages/router/src/services/ConversationInterruptionHandler.ts`
- **Types**: `packages/router/src/types.ts`
- **Config**: `packages/router/src/config.ts`

### Deployment Code
- **Lambda Deployment**: `lambda-deployments/router/` (if exists)
- **Deployment Script**: `scripts/deploy-all-agents.sh:170` (references router deployment)

**Code References:**
- `packages/router/README.md` - Package documentation
- `scripts/deploy-all-agents.sh:170` - Deployment script

## Where Documentation Exists

### Primary Documentation
- **Package README**: `packages/router/README.md`
- **Agent Documentation**: `docs/agents/router.md`
- **Comprehensive Docs**: `docs/agents/router/` (this directory)
- **Architecture Docs**: `docs/developer-docs/01_CORE_ARCHITECTURE/01_Multi_Agent_Orchestration_Flow.md`

### Related Documentation
- **Deployment Inventory**: `docs/system/deployment_inventory.md`
- **Code Mapping**: `docs/system/code_to_deployment_mapping.md`
- **Orchestration Flow**: `docs/developer-docs/01_CORE_ARCHITECTURE/01_Multi_Agent_Orchestration_Flow.md`

## Where to Find Logs

### CloudWatch Logs
- **Log Group**: `/aws/lambda/storytailor-router-production`
- **Region**: us-east-1
- **Access**: AWS Console → CloudWatch → Log Groups

### Log Format
```json
{
  "level": "info",
  "message": "Processing turn context",
  "userId": "user-123",
  "sessionId": "session-456",
  "channel": "web",
  "timestamp": "2025-12-11T..."
}
```

**Code References:**
- `packages/router/src/Router.ts:130-135` - Logging example

## Where to Monitor Metrics

### CloudWatch Metrics
- **Namespace**: `AWS/Lambda`
- **Function**: `storytailor-router-production`
- **Key Metrics**:
  - Invocations
  - Duration
  - Errors
  - Throttles

### Custom Metrics (if implemented)
- Intent classification accuracy
- Agent delegation success rate
- Circuit breaker states
- Average response time

### Monitoring Dashboard
- **Location**: AWS CloudWatch Dashboards
- **Dashboard Name**: `storytailor-router-production` (if exists)

## Where Configuration Lives

### Environment Variables
- **SSM Parameter Store**: `/storytailor-production/openai/api-key`
- **SSM Parameter Store**: `/storytailor-production/openai/model-routing`
- **SSM Parameter Store**: `/storytailor-production/redis/url`
- **Lambda Environment**: Agent endpoint environment variables

**Code References:**
- `docs/system/ssm_parameters_inventory.md` - SSM parameters
- `packages/router/src/config.ts` - Configuration source

### Agent Endpoint Configuration
- **Environment Variables**: `AUTH_AGENT_ENDPOINT`, `CONTENT_AGENT_ENDPOINT`, etc.
- **Default Values**: `packages/router/src/config.ts:21-51`
- **Production Values**: Set in Lambda environment variables

## Where to Test

### Local Testing
```bash
cd packages/router
npm test
```

### Integration Testing
- **Test Endpoints**: Use staging environment
- **Test Function**: `storytailor-staging-router`
- **MCP Server**: Test via MCP `router.route` tool

**Code References:**
- `docs/platform/mcp/overview.md:49-80` - MCP router.route tool

### Production Testing
- **Health Check**: Via MCP `router.health` tool
- **Function URL**: Not available (use Lambda invoke or Universal Agent)
