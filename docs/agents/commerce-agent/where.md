# Commerce Agent - Deployment and Location

**Status**: Draft  
**Audience**: Engineering | DevOps  
**Last Updated**: 2025-12-13

## Where It's Deployed

### Production Lambda Function
- **Function Name**: `storytailor-commerce-agent-production`
- **Region**: us-east-1 (US East - N. Virginia)
- **Runtime**: nodejs22.x
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Last Modified**: 2025-12-04

**Code References:**
- `docs/system/deployment_inventory.md:47` - Production function details

### Function URL
- **Status**: Not configured
- **Invocation Method**: Lambda invoke (direct) or via Universal Agent
- **Note**: Typically invoked via Universal Agent for webhook handling

## Where the Code Lives

### Source Code
- **Package**: `packages/commerce-agent/`
- **Main File**: `packages/commerce-agent/src/CommerceAgent.ts`
- **Services**: (if exists in structure)
- **Types**: `packages/commerce-agent/src/types.ts`

**Code References:**
- `packages/commerce-agent/README.md` - Package documentation

## Where Documentation Exists

### Primary Documentation
- **Agent Documentation**: `docs/agents/commerce-agent/` (this directory)
- **Package README**: `packages/commerce-agent/README.md`
- **Agentic UX**: `docs/agents/commerce-agent.md`

## Where to Find Logs

### CloudWatch Logs
- **Log Group**: `/aws/lambda/storytailor-commerce-agent-production`
- **Region**: us-east-1
- **Access**: AWS Console → CloudWatch → Log Groups

## Where Configuration Lives

### Environment Variables
- **SSM Parameter Store**: `/storytailor/production/stripe/secret-key`
- **SSM Parameter Store**: `/storytailor/production/stripe/webhook-secret`
- **SSM Parameter Store**: `/storytailor/production/supabase/url`
- **SSM Parameter Store**: `/storytailor/production/supabase/service-key`
- **SSM Parameter Store**: `/storytailor/production/sendgrid-api-key`

