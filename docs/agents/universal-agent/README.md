# Universal Agent

**Status**: ✅ Active  
**Package**: `@alexa-multi-agent/universal-agent`  
**Lambda Function**: `storytailor-universal-agent-production`  
**Region**: us-east-1  
**Last Updated**: 2025-12-13

## Overview

The Universal Agent serves as the unified API gateway and orchestration layer for the Storytailor multi-agent system. It provides comprehensive REST API endpoints, handles authentication, manages conversations, coordinates with specialized agents, and implements the deletion system.

## Quick Start

### What It Does

The Universal Agent:
- **REST API Gateway**: Provides 60+ REST API endpoints for third-party integrations
- **Authentication**: COPPA-compliant user registration, login, and session management
- **Conversation Management**: Channel-agnostic conversation system with cross-channel synchronization
- **Agent Orchestration**: Coordinates with Router and specialized agents
- **Deletion System**: Manages account, story, character, and library member deletions
- **Email Service**: Sends transactional emails via SendGrid and AWS SES

### When to Use It

The Universal Agent is used for:
- All REST API integrations
- Web, mobile, and third-party platform integrations
- User authentication and account management
- Conversation management across channels
- Story and character CRUD operations
- Deletion workflows

### Quick Integration Example

```typescript
// Health check
GET https://{function-url}/health

// Start conversation
POST https://{function-url}/api/v1/conversation/start
Authorization: Bearer {token}
{
  "platform": "web",
  "language": "en",
  "voiceEnabled": true
}
```

## Documentation Links

- [What It Does](./what.md) - Detailed functionality and capabilities
- [Why It Exists](./why.md) - Business rationale and value proposition
- [When to Use](./when.md) - Usage guidelines and integration points
- [Where It's Deployed](./where.md) - Deployment location and Lambda configuration
- [Who Owns It](./who.md) - Team ownership and maintainers
- [Development Guide](./development.md) - Technical implementation and API reference
- [Marketing Information](./marketing.md) - Value proposition and features
- [Cost Analysis](./cost.md) - Cost per operation and economics

## Key Features

### REST API Gateway
- 60+ REST API endpoints
- Authentication and authorization middleware
- Rate limiting and CORS
- Request/response transformation
- Batch operations support

### Conversation System
- Channel-agnostic conversation engine
- Cross-channel synchronization
- Real-time streaming support
- Session management with automatic cleanup
- Platform-specific optimizations

### Deletion System
- Account deletion with grace period
- Story and character deletion
- Library member removal
- Conversation asset clearing
- Hibernation and storage tiering

### Email Service
- SendGrid dynamic templates
- AWS SES fallback
- 28+ email types
- Engagement tracking

## API Endpoints

**Total**: 60+ REST endpoints

### Categories:
- Health & Documentation (2)
- Authentication (4)
- Conversations (8)
- Stories (6)
- Characters (3)
- Smart Home (3)
- Webhooks (6)
- Analytics (multiple)
- Deletion System (11)
- Account Management (multiple)

**See**: [API Endpoints Inventory](../../system/api_endpoints_inventory.md)

## Configuration

### Environment Variables
- `SUPABASE_URL` - From SSM `/storytailor/production/supabase/url`
- `SUPABASE_SERVICE_ROLE_KEY` - From SSM `/storytailor/production/supabase/service-key`
- `REDIS_URL` - From SSM `/storytailor/production/redis/url`
- `SENDGRID_API_KEY` - From SSM `/storytailor/production/sendgrid-api-key`
- `EMAIL_FROM` - From SSM `/storytailor/production/email-from`
- `ENABLE_KID_INTELLIGENCE` - Feature flag
- `AUTO_CONFIRM_USERS` - Testing flag

### Lambda Configuration
- **Runtime**: Node.js 22.x
- **Timeout**: 30 seconds
- **Memory**: 512 MB
- **Region**: us-east-1
- **Handler**: `dist/lambda.handler`

## Deployment

```bash
./scripts/deploy-universal-agent-proper.sh production
```

## Status

✅ **Production Ready**
- Deployed to AWS Lambda (us-east-1)
- All 60+ endpoints functional
- Deletion system operational
- Email service integrated
- Monitoring configured

