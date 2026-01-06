# Auth Agent - Deployment and Location

**Status**: Draft  
**Audience**: Engineering | DevOps  
**Last Updated**: 2025-12-11

## Where It's Deployed

### Production Lambda Function
- **Function Name**: `storytailor-auth-agent-production`
- **Region**: us-east-1
- **Runtime**: nodejs22.x (estimated)
- **Memory**: 512 MB (estimated)
- **Timeout**: 30 seconds (estimated)

**Code References:**
- `docs/system/deployment_inventory.md` - Deployment configuration
- `../../deployment/agent-to-lambda-mapping.md:24` - Lambda function mapping

### Function URL
- **URL**: `https://nfunet3jojvau5s5rpim7fu3ze0spcii.lambda-url.us-east-1.on.aws/`
- **Status**: ✅ Configured and accessible
- **Health Check**: Available via Router delegation

**Code References:**
- `../../system/AGENT_ENDPOINT_VERIFICATION.md:14` - Endpoint configuration

## Where the Code Lives

### Source Code
- **Package**: `packages/auth-agent/`
- **Main File**: `packages/auth-agent/src/auth-agent.ts` (~794 lines)
- **Services**: 
  - `packages/auth-agent/src/services/account-linking.ts`
  - `packages/auth-agent/src/services/voice-code.ts`
  - `packages/auth-agent/src/services/token.ts`
- **Types**: `packages/auth-agent/src/types.ts`
- **Config**: `packages/auth-agent/src/config.ts`

### Deployment Code
- **Lambda Deployment**: `lambda-deployments/auth-agent/` (if exists)
- **Deployment Script**: `scripts/deploy-auth-agent.sh` (if exists)

**Code References:**
- `packages/auth-agent/README.md` - Package documentation
- `docs/agents/auth-agent.md` - Agent documentation

## Where Documentation Exists

### Primary Documentation
- **Package README**: `packages/auth-agent/README.md`
- **Agent Documentation**: `docs/agents/auth-agent.md`
- **Comprehensive Docs**: `docs/agents/auth-agent/` (this directory)

### Related Documentation
- **Deployment Inventory**: `docs/system/deployment_inventory.md`
- **Code Mapping**: `docs/system/code_to_deployment_mapping.md:57-81`

## Where to Find Logs

### CloudWatch Logs
- **Log Group**: `/aws/lambda/storytailor-auth-agent-production`
- **Region**: us-east-1
- **Access**: AWS Console → CloudWatch → Log Groups

## Where to Monitor Metrics

### CloudWatch Metrics
- **Namespace**: `AWS/Lambda`
- **Function**: `storytailor-auth-agent-production`
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
- **SSM Parameter Store**: `/storytailor-production/jwt/secret` (if exists)

**Code References:**
- `docs/system/ssm_parameters_inventory.md` - SSM parameters

## Where to Test

### Health Check
```bash
curl -X POST "https://nfunet3jojvau5s5rpim7fu3ze0spcii.lambda-url.us-east-1.on.aws/" \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'
```

### Integration Testing
- **Test Endpoints**: Use staging environment
- **Test Function**: `storytailor-auth-agent-staging`
- **Universal Agent**: Test via Universal Agent API endpoints (`/v1/auth/*`)

### Production Testing
- **Via Universal Agent**: `POST /v1/auth/register`, `POST /v1/auth/login`
- **Via Router**: Router delegates to Auth Agent for authentication
- **Direct Function URL**: Available for direct testing
