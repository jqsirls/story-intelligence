# Deployment Documentation

**Last Updated**: 2025-12-14  
**Audience**: DevOps | Engineering | Deployment Team  
**Status**: Updated - user-research-agent now in git (commit `8341f2e03`)

## Overview

This directory contains deployment documentation, checklists, and guides for deploying Storytailor services to AWS Lambda in production.

## Documentation Files

- **[Knowledge Base Deployment Checklist](./01-knowledge-base-deployment-checklist.md)** - Knowledge base deployment guide
- **[Critical Age Validation Bug Fix](./02-critical-age-validation-bug-fix.md)** - Age validation fix documentation

## Production Deployment

### Region
- **Primary Region**: us-east-1 (US East - N. Virginia)
- **All Production Resources**: Deployed in us-east-1

### Deployment Scripts

**Location**: `scripts/`

#### Universal Agent
- **Script**: `scripts/deploy-universal-agent-proper.sh`
- **Lambda Function**: `storytailor-universal-agent-production`
- **Region**: us-east-1

#### Individual Agents
- **Commerce Agent**: `scripts/deploy-commerce-agent-proper.sh`
- **Library Agent**: `scripts/deploy-library-agent-proper.sh`
- **Voice Synthesis**: `scripts/deploy-voice-synthesis-agent.sh`
- **User Research Agent (Fieldnotes)**: `scripts/deploy-user-research-agent.sh`
  - **Lambda Functions**: `storytailor-fieldnotes-api-production`, `storytailor-fieldnotes-scheduled-production`
  - **Region**: us-east-1
  - **EventBridge Rules**: `fieldnotes-hourly-production`, `fieldnotes-daily-production`, `fieldnotes-weekly-production`
  - **Git Status**: ✅ Committed to git (commit `8341f2e03`)
  - **Source**: `packages/user-research-agent/`
- **All Other Agents**: Individual deployment scripts in `scripts/`

#### Processors
- **Deletion Processor**: `scripts/deploy-deletion-processors.sh`
- **Inactivity Processor**: `scripts/deploy-deletion-processors.sh`

### Deployment Process

1. **Build Dependencies**: Build `shared-types` first, then dependent packages
2. **Build Package**: Build the target package
3. **Bundle Dependencies**: Bundle workspace dependencies
4. **Deploy to Lambda**: Deploy to AWS Lambda in us-east-1
5. **Verify Deployment**: Check Lambda function status and logs

### Environment Variables

All environment variables are stored in AWS SSM Parameter Store:
- **Path**: `/storytailor/production/`
- **Access**: Lambda functions read from SSM at runtime

## Related Documentation

- **System Inventory**: See [Deployment Inventory](../system/deployment-inventory.md)
- **Development Guide**: See [AGENTS.md](../../../AGENTS.md)
- **Infrastructure**: See [System Documentation](../../system/README.md)

