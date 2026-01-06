# User Research Agent

**Status**: ✅ Active  
**Package**: `@alexa-multi-agent/user-research-agent`  
**Product Name**: Fieldnotes  
**Region**: us-east-1  
**Last Updated**: 2025-12-14

## Overview

Fieldnotes is a standing internal research team that never sleeps. It provides adversarial truth-telling insights through five parallel analysis tracks, operating as a full research team with access to all agents and functions.

**What Fieldnotes is NOT:**
- A chatbot that summarizes feedback
- A dashboard you check manually
- A one-time research study

**What Fieldnotes IS:**
- A standing internal research team
- Continuous behavior observation
- Adversarial truth-telling
- Risk mitigation before shipping
- Integration-native (Slack, Email, Webhooks)

## Quick Start

### What It Does

Fieldnotes runs five tracks in parallel at all times:

1. **Continuous Insight Mining** - Watches product usage, abandoned flows, retries, rage clicks, drop-offs
2. **Buyer Reality Checks** - Simulates and pressure-tests buyer/decision-maker expectations
3. **User Experience Guardrails** - Evaluates outcomes through end-user lens
4. **Concept Interrogation** - Pre-mortem analysis before building features
5. **Brand Consistency** - Audits language, onboarding, and flows against brand voice

### Key Features

- **Multi-tenant design** - Storytailor is tenant #1, ready for external customers
- **Cost-optimized** - $150-300/month for internal use through intelligent architecture
- **Integration-native** - Delivers insights WHERE YOU WORK (Slack, Email, Webhooks)
- **Adversarial AI** - Built-in mechanisms to challenge assumptions and detect self-deception
- **Scheduled + On-demand** - Automatic weekly briefs + on-demand analysis

## Documentation Links

- [What It Does](./what.md) - Detailed functionality and capabilities
- [Why It Exists](./why.md) - Business rationale and value proposition
- [When to Use](./when.md) - Usage guidelines and integration points
- [Where It's Deployed](./where.md) - Deployment location and Lambda configuration
- [Who Owns It](./who.md) - Team ownership and maintainers
- [Development Guide](./development.md) - Technical implementation and API reference
- [Marketing Information](./marketing.md) - Value proposition and features
- [Cost Analysis](./cost.md) - Cost per operation and economics

## Configuration

### Environment Variables

All environment variables are loaded from AWS SSM Parameter Store at `/storytailor-production/`:

- `SUPABASE_URL` - From `/storytailor-production/supabase/url`
- `SUPABASE_SERVICE_ROLE_KEY` - From `/storytailor-production/supabase/service_key`
- `SUPABASE_ANON_KEY` - From `/storytailor-production/supabase/anon_key`
- `REDIS_URL` - From `/storytailor-production/redis-url` or `/storytailor-production/redis/url`
- `OPENAI_API_KEY` - From `/storytailor-production/openai/api_key`
- `ANTHROPIC_API_KEY` - From `/storytailor-production/anthropic/api_key` (if exists)
- `FIELDNOTES_API_KEY` - Stored in `/storytailor-production/fieldnotes/api-key`

### Lambda Configuration

- **API Function**: `storytailor-fieldnotes-api-production`
  - Runtime: Node.js 22.x
  - Memory: 512 MB
  - Timeout: 60 seconds
  - Handler: `dist/lambda.handler`

- **Scheduled Function**: `storytailor-fieldnotes-scheduled-production`
  - Runtime: Node.js 22.x
  - Memory: 512 MB
  - Timeout: 300 seconds (5 minutes)
  - Handler: `dist/lambda-scheduled.handler`

- **Region**: us-east-1

## Status

✅ **Production Ready**
- Deployed to AWS Lambda (us-east-1)
- EventBridge rules configured (hourly, daily, weekly)
- Function URL available for API access
- Multi-tenant architecture operational
- Cost optimization active

## Access

### Function URL
```
https://jtefgwkgd54fggqcf62hhhw3d40rwrbj.lambda-url.us-east-1.on.aws/
```

### API Key
Retrieve from SSM Parameter Store:
```bash
aws ssm get-parameter \
  --name "/storytailor-production/fieldnotes/api-key" \
  --with-decryption \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text
```

## Related Documentation

- **Package README**: `packages/user-research-agent/README.md`
- **API Reference**: `packages/user-research-agent/docs/API.md`
- **Cost Optimization**: `packages/user-research-agent/docs/COST_OPTIMIZATION.md`
- **Deployment Guide**: `packages/user-research-agent/PRODUCTION_DEPLOYMENT.md`
