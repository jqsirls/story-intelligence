# Content Agent - Deployment and Location

**Status**: Draft  
**Audience**: Engineering | DevOps  
**Last Updated**: 2025-12-11

## Where It's Deployed

### Production Lambda Function
- **Function Name**: `storytailor-content-production`
- **Region**: us-east-1
- **Runtime**: nodejs22.x
- **Memory**: 1024 MB
- **Timeout**: 300 seconds
- **Last Modified**: 2025-12-11

**Code References:**
- `docs/system/deployment_inventory.md:39` - Deployment configuration

### Alternative Function Name
- **Function Name**: `storytailor-content-agent-production`
- **Status**: Also exists (may be duplicate or alternative deployment)
- **Last Modified**: 2025-12-04

**Code References:**
- `../../deployment/agent-to-lambda-mapping.md` - Function mapping

### Function URL
- **Status**: Not configured (most agents don't have Function URLs)
- **Invocation Method**: Invoked via Router or Universal Agent
- **Note**: Content Agent is typically invoked internally, not exposed directly

## Where the Code Lives

### Source Code
- **Package**: `packages/content-agent/`
- **Main File**: `packages/content-agent/src/ContentAgent.ts` (~1,422 lines)
- **Services**:
  - `packages/content-agent/src/services/StoryTypeClassifier.ts`
  - `packages/content-agent/src/services/StoryCreationService.ts`
  - `packages/content-agent/src/services/CharacterGenerationService.ts`
  - `packages/content-agent/src/services/ArtGenerationService.ts`
  - `packages/content-agent/src/services/AssetGenerationPipeline.ts`
  - `packages/content-agent/src/services/ContentModerator.ts`
  - `packages/content-agent/src/services/CharacterConsistencyManager.ts`
  - And more...
- **Types**: `packages/content-agent/src/types.ts`
- **Config**: `packages/content-agent/src/config.ts`

### Deployment Code
- **Lambda Deployment**: `lambda-deployments/content-agent/` (if exists)
- **Deployment Script**: `scripts/deploy-content-agent.sh` (if exists)

**Code References:**
- `packages/content-agent/README.md` - Package documentation
- `docs/agents/content-agent.md` - Agent documentation

## Where Documentation Exists

### Primary Documentation
- **Package README**: `packages/content-agent/README.md`
- **Agent Documentation**: `docs/agents/content-agent.md`
- **Comprehensive Docs**: `docs/agents/content-agent/` (this directory)
- **Architecture Docs**: `docs/developer-docs/01_CORE_ARCHITECTURE/01_Multi_Agent_Orchestration_Flow.md`

### Related Documentation
- **Deployment Inventory**: `docs/system/deployment_inventory.md`
- **Code Mapping**: `docs/system/code_to_deployment_mapping.md`
- **Orchestration Flow**: `docs/developer-docs/01_CORE_ARCHITECTURE/01_Multi_Agent_Orchestration_Flow.md`

## Where to Find Logs

### CloudWatch Logs
- **Log Group**: `/aws/lambda/storytailor-content-production`
- **Region**: us-east-1
- **Access**: AWS Console → CloudWatch → Log Groups

### Log Format
```json
{
  "level": "info",
  "message": "Creating story draft",
  "characterId": "char-123",
  "storyType": "ADVENTURE",
  "timestamp": "2025-12-11T..."
}
```

**Code References:**
- `packages/content-agent/src/ContentAgent.ts:47-50` - Logging example

## Where to Monitor Metrics

### CloudWatch Metrics
- **Namespace**: `AWS/Lambda`
- **Function**: `storytailor-content-production`
- **Key Metrics**:
  - Invocations
  - Duration
  - Errors
  - Throttles

### Custom Metrics (if implemented)
- Story generation success rate
- Asset generation success rate
- Content moderation results
- Average story generation time
- Average asset generation time

### Monitoring Dashboard
- **Location**: AWS CloudWatch Dashboards
- **Dashboard Name**: `storytailor-content-production` (if exists)

## Where Configuration Lives

### Environment Variables
- **SSM Parameter Store**: `/storytailor-production/openai/api-key`
- **SSM Parameter Store**: `/storytailor-production/openai/model-story`
- **SSM Parameter Store**: `/storytailor-production/openai/model-image`
- **SSM Parameter Store**: `/storytailor-production/openai/model-video`
- **SSM Parameter Store**: `/storytailor-production/supabase/url`
- **SSM Parameter Store**: `/storytailor-production/supabase/service-key`
- **SSM Parameter Store**: `/storytailor-production/redis/url`

**Code References:**
- `docs/system/ssm_parameters_inventory.md` - SSM parameters

## Where to Test

### Local Testing
```bash
cd packages/content-agent
npm test
```

### Integration Testing
- **Test Endpoints**: Use staging environment
- **Test Function**: `storytailor-content-staging`
- **Universal Agent**: Test via Universal Agent API endpoints

### Production Testing
- **Via Universal Agent**: `POST /v1/stories`
- **Via Router**: Router delegates to Content Agent
- **Direct Lambda Invoke**: For internal testing
