# Conversation Intelligence - Deployment and Location

**Status**: Draft  
**Audience**: Engineering | DevOps  
**Last Updated**: 2025-12-13

## Where It's Deployed

### Production Lambda Function
- **Function Name**: `storytailor-conversation-intelligence-production`
- **Region**: us-east-1 (US East - N. Virginia)
- **Runtime**: nodejs22.x
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Last Modified**: [To be verified]

**Code References:**
- `docs/system/deployment_inventory.md` - Production function details
- `docs/PRODUCTION_STATE_VERIFICATION.md` - Production verification

### Function URL
- **Status**: Not configured (typically)
- **Invocation Method**: Lambda invoke (direct) or via Universal Agent
- **Note**: Typically invoked via Universal Agent or Router

## Where the Code Lives

### Source Code
- **Package**: `packages/conversation-intelligence/`
- **Main File**: `packages/conversation-intelligence/src/` (structure to be verified)
- **Code References:**
  - `packages/conversation-intelligence/README.md` - Package documentation

## Where Documentation Exists

### Primary Documentation
- **Agent Documentation**: `docs/agents/conversation-intelligence/` (this directory)
- **Agentic UX**: `docs/agents/conversation-intelligence.md`

## Where to Find Logs

### CloudWatch Logs
- **Log Group**: `/aws/lambda/storytailor-conversation-intelligence-production`
- **Region**: us-east-1
- **Access**: AWS Console → CloudWatch → Log Groups

## Where Configuration Lives

### Environment Variables
- **SSM Parameter Store**: `/storytailor/production/supabase/url`
- **SSM Parameter Store**: `/storytailor/production/supabase/service-key`
