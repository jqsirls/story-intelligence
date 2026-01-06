# User Research Agent - Where

**Status**: ✅ Active  
**Audience**: Engineering | DevOps  
**Last Updated**: 2025-12-14

## Where It's Deployed

### Production Lambda Functions

#### API Lambda Function
- **Function Name**: `storytailor-fieldnotes-api-production`
- **Region**: us-east-1 (US East - N. Virginia)
- **Runtime**: nodejs22.x
- **Memory**: 512 MB
- **Timeout**: 60 seconds
- **Handler**: `dist/lambda.handler`
- **Last Modified**: 2025-12-14T21:33:08.081+0000
- **Status**: ✅ Active

#### Scheduled Tasks Lambda Function
- **Function Name**: `storytailor-fieldnotes-scheduled-production`
- **Region**: us-east-1 (US East - N. Virginia)
- **Runtime**: nodejs22.x
- **Memory**: 512 MB
- **Timeout**: 300 seconds (5 minutes)
- **Handler**: `dist/lambda-scheduled.handler`
- **Last Modified**: 2025-12-14T21:33:17.075+0000
- **Status**: ✅ Active

**Code References:**
- [Deployment Inventory](../../system/deployment-inventory.md) - Production function details
- [Agent to Lambda Mapping](../../deployment/agent-to-lambda-mapping.md) - Mapping documentation

### Function URL

- **URL**: `https://jtefgwkgd54fggqcf62hhhw3d40rwrbj.lambda-url.us-east-1.on.aws/`
- **Auth Type**: NONE (API key required for endpoints)
- **CORS**: Enabled for all origins
- **Status**: ✅ Active

**Get Function URL:**
```bash
aws lambda get-function-url-config \
  --function-name storytailor-fieldnotes-api-production \
  --region us-east-1 \
  --query 'FunctionUrl' \
  --output text
```

### EventBridge Scheduled Rules

All rules are **ENABLED** and configured in us-east-1:

| Rule Name | Schedule | Target Lambda | Status |
|-----------|----------|---------------|--------|
| `fieldnotes-hourly-production` | `rate(1 hour)` | `storytailor-fieldnotes-scheduled-production` | ✅ ENABLED |
| `fieldnotes-daily-production` | `cron(0 2 * * ? *)` (2 AM UTC daily) | `storytailor-fieldnotes-scheduled-production` | ✅ ENABLED |
| `fieldnotes-weekly-production` | `cron(0 9 ? * MON *)` (9 AM UTC Mondays) | `storytailor-fieldnotes-scheduled-production` | ✅ ENABLED |

**List EventBridge Rules:**
```bash
aws events list-rules \
  --name-prefix fieldnotes-production \
  --region us-east-1
```

## Where the Code Lives

### Source Code

- **Package**: `packages/user-research-agent/`
- **Main Entry**: `packages/user-research-agent/src/index.ts`
- **Core Engine**: `packages/user-research-agent/src/core/ResearchEngine.ts`
- **Lambda Handlers**:
  - API: `packages/user-research-agent/src/lambda.ts`
  - Scheduled: `packages/user-research-agent/src/lambda-scheduled.ts`
- **Tracks**: `packages/user-research-agent/src/core/tracks/`
- **Integrations**: `packages/user-research-agent/src/integrations/`
- **API Server**: `packages/user-research-agent/src/api/server.ts`
- **MCP Server**: `packages/user-research-agent/src/mcp/server.ts`
- **SDK**: `packages/user-research-agent/src/sdk/index.ts`

**Code References:**
- `packages/user-research-agent/README.md` - Package documentation
- `packages/user-research-agent/docs/API.md` - API reference
- `packages/user-research-agent/docs/COST_OPTIMIZATION.md` - Cost optimization guide

### Deployment Script

- **Location**: `scripts/deploy-user-research-agent.sh`
- **Usage**: `./scripts/deploy-user-research-agent.sh production`
- **Region**: us-east-1

## Where Documentation Exists

### Primary Documentation
- **Agent Documentation**: `docs/agents/user-research-agent/` (this directory)
- **Package README**: `packages/user-research-agent/README.md`
- **API Reference**: `packages/user-research-agent/docs/API.md`
- **Cost Optimization**: `packages/user-research-agent/docs/COST_OPTIMIZATION.md`
- **Deployment Guide**: `packages/user-research-agent/PRODUCTION_DEPLOYMENT.md`

### System Documentation
- **Deployment Inventory**: `docs/system/deployment-inventory.md`
- **Agent to Lambda Mapping**: `docs/deployment/agent-to-lambda-mapping.md`
- **System Inventory**: `docs/system/inventory.md`

## Where to Find Logs

### CloudWatch Logs

- **API Logs**: `/aws/lambda/storytailor-fieldnotes-api-production`
- **Scheduled Logs**: `/aws/lambda/storytailor-fieldnotes-scheduled-production`
- **Region**: us-east-1

**View Logs:**
```bash
# API logs
aws logs tail /aws/lambda/storytailor-fieldnotes-api-production \
  --follow --region us-east-1

# Scheduled tasks logs
aws logs tail /aws/lambda/storytailor-fieldnotes-scheduled-production \
  --follow --region us-east-1
```

**Access**: AWS Console → CloudWatch → Log Groups

## Where Configuration Lives

### Environment Variables

All environment variables are stored in AWS SSM Parameter Store at `/storytailor-production/`:

- `SUPABASE_URL` - `/storytailor-production/supabase/url`
- `SUPABASE_SERVICE_ROLE_KEY` - `/storytailor-production/supabase/service_key`
- `SUPABASE_ANON_KEY` - `/storytailor-production/supabase/anon_key`
- `REDIS_URL` - `/storytailor-production/redis-url` or `/storytailor-production/redis/url`
- `OPENAI_API_KEY` - `/storytailor-production/openai/api_key`
- `ANTHROPIC_API_KEY` - `/storytailor-production/anthropic/api_key` (if exists)
- `FIELDNOTES_API_KEY` - `/storytailor-production/fieldnotes/api-key`

**Get API Key:**
```bash
aws ssm get-parameter \
  --name "/storytailor-production/fieldnotes/api-key" \
  --with-decryption \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text
```

### Database Schema

- **Location**: `supabase/migrations/20250114000000_user_research_agent_schema.sql`
- **Database**: Supabase (production instance)
- **Tables**:
  - `research_tenants` - Tenant configurations
  - `research_insights` - Generated insights
  - `research_briefs` - Weekly briefs
  - `research_pre_launch_memos` - Pre-launch risk memos
  - `research_cost_tracking` - Cost tracking per tenant
  - `research_usage_metrics` - Usage metrics

### Tenant Configuration

- **Location**: `packages/user-research-agent/src/config/tenants/storytailor.ts`
- **Database**: Stored in `research_tenants` table
- **Initialization**: Run tenant initialization function after migration

## Where to Access the API

### Function URL

**Production API Endpoint:**
```
https://jtefgwkgd54fggqcf62hhhw3d40rwrbj.lambda-url.us-east-1.on.aws/
```

### API Endpoints

- `GET /health` - Health check (no auth required)
- `GET /` - API information
- `POST /api/v1/analyze` - On-demand analysis
- `GET /api/v1/brief` - Get weekly brief
- `POST /api/v1/pre-launch` - Generate pre-launch memo
- `POST /api/v1/challenge` - Challenge an agent
- `GET /api/v1/cost/status` - Get cost tracking status

### MCP Server

- **Transport**: stdio (for MCP protocol)
- **Available Tools**:
  - `fieldnotes_analyze`
  - `fieldnotes_challenge_decision`
  - `fieldnotes_generate_brief`
  - `fieldnotes_interrogate_agent`

**Usage**: Connect via MCP client (Claude Desktop, Cursor, etc.)

### SDK

- **Package**: `@alexa-multi-agent/user-research-agent/sdk`
- **Location**: `packages/user-research-agent/src/sdk/index.ts`
- **Export**: `FieldnotesClient` class

## Where Data is Stored

### Supabase Database

- **Production**: Supabase cloud instance
- **Tables**: All research data stored in Supabase with RLS policies
- **Multi-tenant**: Data isolated per tenant via RLS

### Redis Cache

- **Purpose**: Conversation state caching, insight caching
- **Location**: Redis cloud instance (configured via `REDIS_URL`)
- **Key Prefix**: `storytailor:`

## Related Documentation

- [Deployment Inventory](../../system/deployment-inventory.md) - Complete deployment details
- [Agent to Lambda Mapping](../../deployment/agent-to-lambda-mapping.md) - Lambda function mapping
- [System Inventory](../../system/inventory.md) - System component inventory
