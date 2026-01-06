# Library Agent - Deployment and Location

**Status**: Draft  
**Audience**: Engineering | DevOps  
**Last Updated**: 2025-12-11

## Where It's Deployed

### Production Lambda Function
- **Function Name**: `storytailor-library-agent-production`
- **Region**: us-east-1
- **Runtime**: nodejs22.x
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Last Modified**: 2025-12-08

**Code References:**
- `docs/system/deployment_inventory.md:36` - Deployment configuration

### Function URL
- **URL**: `https://4lx7abj4gr5dbfwqyatsqtjdzu0atdon.lambda-url.us-east-1.on.aws/`
- **Status**: ✅ Configured and accessible
- **Health Check**: ✅ **HEALTHY** - `{"agentName":"library","success":true,"data":{"message":"Library agent ready"}}`

## Where the Code Lives

### Source Code
- **Package**: `packages/library-agent/`
- **Main File**: `packages/library-agent/src/LibraryAgent.ts` (~600+ lines)
- **Services**: Library-specific services
- **Types**: `packages/library-agent/src/types.ts`
- **Config**: `packages/library-agent/src/config.ts`

### Deployment Code
- **Lambda Deployment**: `lambda-deployments/library-agent/` (if exists)
- **Deployment Script**: `scripts/deploy-library-agent.sh` (if exists)

**Code References:**
- `packages/library-agent/README.md` - Package documentation
- `docs/agents/library-agent.md` - Agent documentation

## Where Documentation Exists

### Primary Documentation
- **Package README**: `packages/library-agent/README.md`
- **Agent Documentation**: `docs/agents/library-agent.md`
- **Comprehensive Docs**: `docs/agents/library-agent/` (this directory)

### Related Documentation
- **Deployment Inventory**: `docs/system/deployment_inventory.md`
- **Code Mapping**: `docs/system/code_to_deployment_mapping.md`

## Where to Find Logs

### CloudWatch Logs
- **Log Group**: `/aws/lambda/storytailor-library-agent-production`
- **Region**: us-east-1
- **Access**: AWS Console → CloudWatch → Log Groups

## Where to Monitor Metrics

### CloudWatch Metrics
- **Namespace**: `AWS/Lambda`
- **Function**: `storytailor-library-agent-production`
- **Key Metrics**:
  - Invocations
  - Duration
  - Errors
  - Throttles

## Where Configuration Lives

### Environment Variables
- **SSM Parameter Store**: `/storytailor-production/supabase/url`
- **SSM Parameter Store**: `/storytailor-production/supabase/service-key`
- **SSM Parameter Store**: `/storytailor-production/redis/url`

**Code References:**
- `docs/system/ssm_parameters_inventory.md` - SSM parameters

## Where to Test

### Health Check
```bash
curl -X GET "https://4lx7abj4gr5dbfwqyatsqtjdzu0atdon.lambda-url.us-east-1.on.aws/health"
```

**Result**: ✅ `{"agentName":"library","success":true,"data":{"message":"Library agent ready"}}`

### Integration Testing
- **Test Endpoints**: Use staging environment
- **Test Function**: `storytailor-staging-library-agent`
- **Universal Agent**: Test via Universal Agent API endpoints

### Production Testing
- **Via Universal Agent**: `GET /v1/stories`, `GET /v1/characters`
- **Via Router**: Router delegates to Library Agent for library access
- **Direct Function URL**: Health check endpoint available
