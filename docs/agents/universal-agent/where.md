# Universal Agent - Deployment and Location

**Status**: Draft  
**Audience**: Engineering | DevOps  
**Last Updated**: 2025-12-13

## Where It's Deployed

### Production Lambda Function
- **Function Name**: `storytailor-universal-agent-production`
- **Region**: us-east-1 (US East - N. Virginia)
- **Runtime**: nodejs22.x
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Handler**: `dist/lambda.handler`
- **Last Modified**: 2025-12-11

**Code References:**
- `docs/system/deployment_inventory.md:34` - Production function details
- `docs/PRODUCTION_STATE_VERIFICATION.md` - Production verification

### Function URL
- **Status**: ✅ Configured
- **Invocation Method**: Function URL (public) or Lambda invoke
- **Note**: Primary entry point for REST API integrations

## Where the Code Lives

### Source Code
- **Package**: `packages/universal-agent/`
- **Main Files**:
  - `packages/universal-agent/src/lambda.ts` - Lambda handler
  - `packages/universal-agent/src/api/RESTAPIGateway.ts` - REST API routes
  - `packages/universal-agent/src/UniversalStorytellerAPI.ts` - Core API class
  - `packages/universal-agent/src/conversation/UniversalConversationEngine.ts` - Conversation engine
- **Services**:
  - `packages/universal-agent/src/services/EmailService.ts` - Email service
  - `packages/universal-agent/src/services/DeletionService.ts` - Deletion service
  - `packages/universal-agent/src/services/InactivityMonitorService.ts` - Inactivity monitoring
  - `packages/universal-agent/src/services/StorageLifecycleService.ts` - Storage lifecycle
- **Types**: `packages/universal-agent/src/types.ts`

### Deployment Code
- **Deployment Script**: `scripts/deploy-universal-agent-proper.sh`
- **Build Output**: `packages/universal-agent/dist/`

**Code References:**
- `scripts/deploy-universal-agent-proper.sh` - Deployment script
- `packages/universal-agent/package.json` - Package configuration

## Where Documentation Exists

### Primary Documentation
- **Agent Documentation**: `docs/agents/universal-agent/` (this directory)
- **API Documentation**: `docs/system/api_endpoints_inventory.md`
- **Deployment Inventory**: `docs/system/deployment_inventory.md`

### Related Documentation
- **Production Verification**: `docs/PRODUCTION_STATE_VERIFICATION.md`
- **Region Strategy**: `docs/system/REGION_STRATEGY.md`
- **Deletion System**: `docs/deletion-system.md`

## Where to Find Logs

### CloudWatch Logs
- **Log Group**: `/aws/lambda/storytailor-universal-agent-production`
- **Region**: us-east-1
- **Access**: AWS Console → CloudWatch → Log Groups

### Log Format
```json
{
  "level": "info",
  "message": "Processing API request",
  "method": "POST",
  "path": "/api/v1/conversation/start",
  "userId": "user-123",
  "timestamp": "2025-12-13T..."
}
```

## Where to Monitor Metrics

### CloudWatch Metrics
- **Namespace**: `AWS/Lambda`
- **Function**: `storytailor-universal-agent-production`
- **Key Metrics**:
  - Invocations
  - Duration
  - Errors
  - Throttles

### Custom Metrics
- API endpoint response times
- Deletion system metrics
- Email delivery rates
- Conversation session counts

## Where Configuration Lives

### Environment Variables
- **SSM Parameter Store**: `/storytailor/production/supabase/url`
- **SSM Parameter Store**: `/storytailor/production/supabase/service-key`
- **SSM Parameter Store**: `/storytailor/production/redis/url`
- **SSM Parameter Store**: `/storytailor/production/sendgrid-api-key`
- **SSM Parameter Store**: `/storytailor/production/email-from`

**Code References:**
- `docs/system/ssm_parameters_inventory.md` - SSM parameters
- `scripts/deploy-universal-agent-proper.sh` - Environment variable setup

## Where to Test

### Local Testing
```bash
cd packages/universal-agent
npm test
```

### Integration Testing
- **Test Endpoints**: Use staging environment
- **Test Function**: `storytailor-universal-staging`
- **Health Check**: `GET /health`

### Production Testing
- **Health Check**: `GET {function-url}/health`
- **API Documentation**: `GET {function-url}/docs`

