# Child Safety Agent - Deployment and Location

**Status**: Draft  
**Audience**: Engineering | DevOps  
**Last Updated**: 2025-12-13

## Where It's Deployed

### Production Lambda Function
- **Function Name**: `storytailor-child-safety-agent-production`
- **Region**: us-east-1 (US East - N. Virginia)
- **Runtime**: nodejs22.x
- **Memory**: 256 MB
- **Timeout**: 30 seconds
- **Last Modified**: 2025-11-23

**Code References:**
- `docs/system/deployment_inventory.md:44` - Production function details

### Function URL
- **Status**: Not configured
- **Invocation Method**: Lambda invoke (direct) or via Universal Agent
- **Note**: Typically invoked via Universal Agent or Router

## Where the Code Lives

### Source Code
- **Package**: `packages/child-safety-agent/`
- **Main File**: `packages/child-safety-agent/src/ChildSafetyAgent.ts` (if exists)
- **Services**:
  - `packages/child-safety-agent/src/services/DisclosureDetectionService.ts`
  - `packages/child-safety-agent/src/services/CrisisInterventionService.ts`
  - `packages/child-safety-agent/src/services/MandatoryReportingService.ts`
  - `packages/child-safety-agent/src/services/DistressDetectionService.ts`
  - `packages/child-safety-agent/src/services/InappropriateContentHandler.ts`

**Code References:**
- `packages/child-safety-agent/README.md` - Package documentation

## Where Documentation Exists

### Primary Documentation
- **Agent Documentation**: `docs/agents/child-safety-agent/` (this directory)
- **Package README**: `packages/child-safety-agent/README.md`
- **Agentic UX**: `docs/agents/child-safety-agent.md`
- **Compliance Docs**: `docs/compliance/child-safety.md`

## Where to Find Logs

### CloudWatch Logs
- **Log Group**: `/aws/lambda/storytailor-child-safety-agent-production`
- **Region**: us-east-1
- **Access**: AWS Console → CloudWatch → Log Groups

## Where Configuration Lives

### Environment Variables
- **SSM Parameter Store**: `/storytailor/production/supabase/url`
- **SSM Parameter Store**: `/storytailor/production/supabase/service-key`

