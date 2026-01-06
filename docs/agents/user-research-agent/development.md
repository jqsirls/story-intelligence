# User Research Agent - Development

**Status**: ✅ Active  
**Last Updated**: 2025-12-14

## Technical Implementation

Fieldnotes is built as a standalone, multi-tenant system with three external interfaces: REST API, MCP Server, and TypeScript SDK.

## Architecture

### Core Components

```
ResearchEngine (orchestrator)
├── Five Track Implementations
│   ├── ContinuousInsightMining
│   ├── BuyerRealityCheck
│   ├── UserExperienceGuardrails
│   ├── ConceptInterrogation
│   └── BrandConsistency
├── Cost Optimization
│   ├── ModelOrchestrator (LLM routing)
│   ├── BatchProcessor (batch processing)
│   ├── SmartSampler (event sampling)
│   └── CostController (budget enforcement)
├── Adversarial Components
│   ├── TruthTeller (self-deception detection)
│   ├── TensionMapper (conflict identification)
│   └── AgentChallenger (agent interrogation)
└── Integrations
    ├── SlackAdapter
    ├── EmailAdapter
    └── WebhookAdapter
```

**Code Location**: `packages/user-research-agent/src/core/`

## REST API

### Base URL

**Production**: `https://jtefgwkgd54fggqcf62hhhw3d40rwrbj.lambda-url.us-east-1.on.aws/`

### Authentication

All endpoints require API key authentication:

```bash
# Header method
X-API-Key: your-api-key

# Or Bearer token
Authorization: Bearer your-api-key
```

### Endpoints

#### GET /health

Health check endpoint (no authentication required).

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "service": "fieldnotes",
    "environment": "production"
  },
  "timestamp": "2025-12-14T21:00:00Z"
}
```

#### POST /api/v1/analyze

On-demand behavior analysis.

**Request:**
```json
{
  "tenantId": "storytailor",
  "timeframe": "7 days",
  "focus": "all",
  "events": []
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [...],
    "patterns": [...],
    "trackEvaluations": [...],
    "costUsed": 0.5,
    "generatedAt": "2025-12-14T21:00:00Z"
  },
  "timestamp": "2025-12-14T21:00:00Z"
}
```

#### GET /api/v1/brief

Get the most recent weekly research brief.

**Query Parameters:**
- `tenantId` (optional, default: "storytailor")

**Response:**
```json
{
  "success": true,
  "data": {
    "brief": {
      "id": "uuid",
      "weekOf": "2025-12-13",
      "critical": {...},
      "tensions": [...],
      "opportunities": [...],
      "content": "..."
    }
  },
  "timestamp": "2025-12-14T21:00:00Z"
}
```

#### POST /api/v1/pre-launch

Generate pre-launch risk assessment for a feature.

**Request:**
```json
{
  "tenantId": "storytailor",
  "feature": {
    "name": "Quick Story Mode",
    "description": "Fast-path story creation in 3 taps",
    "targetAudience": "parents",
    "successMetrics": ["completion_rate", "time_to_story"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "featureName": "Quick Story Mode",
    "recommendation": "fix_first",
    "confidence": 0.75,
    "whoIsThisFor": {...},
    "whenWouldTheyQuit": [...],
    "whatWillConfuse": [...],
    "buyerLens": {...},
    "userLens": {...},
    "languageAudit": {...},
    "tensionMap": {...}
  },
  "timestamp": "2025-12-14T21:00:00Z"
}
```

#### POST /api/v1/challenge

Challenge another agent with a data-backed question.

**Request:**
```json
{
  "tenantId": "storytailor",
  "agentName": "content-agent",
  "question": "Why are princess stories showing low retention?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "challengedAgent": "content-agent",
    "question": "...",
    "synthesis": "...",
    "actionable": true,
    "createdAt": "2025-12-14T21:00:00Z"
  },
  "timestamp": "2025-12-14T21:00:00Z"
}
```

#### GET /api/v1/cost/status

Get cost tracking status for a tenant.

**Query Parameters:**
- `tenantId` (optional, default: "storytailor")

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "normal",
    "cost": 145.32,
    "limit": 300
  },
  "timestamp": "2025-12-14T21:00:00Z"
}
```

**Code Reference**: `packages/user-research-agent/src/api/server.ts`

## MCP Server

Model Context Protocol server for AI assistant integration.

### Available Tools

#### fieldnotes_analyze

Analyze user behavior patterns and surface insights.

**Parameters:**
```typescript
{
  events?: Event[],
  timeframe?: string,  // "7 days", "30 days", etc.
  focus?: 'buyer' | 'user' | 'all'
}
```

**Returns:** AnalysisResult with insights, patterns, and track evaluations.

#### fieldnotes_challenge_decision

Run adversarial pre-mortem analysis on a proposed feature.

**Parameters:**
```typescript
{
  feature: {
    name: string,
    description: string,
    targetAudience: string,
    successMetrics?: string[]
  }
}
```

**Returns:** PreLaunchMemo with ship/don't ship/fix first recommendation.

#### fieldnotes_generate_brief

Generate research brief with insights from all tracks.

**Parameters:**
```typescript
{
  tracks?: string[],  // Optional: specific tracks to include
  format?: 'markdown' | 'json'
}
```

**Returns:** Complete research brief.

#### fieldnotes_interrogate_agent

Challenge another agent with a data-backed question.

**Parameters:**
```typescript
{
  agentName: string,  // e.g., "content-agent"
  question: string    // Data-backed challenge
}
```

**Returns:** AgentChallenge with synthesis and actionability.

**Code Reference**: `packages/user-research-agent/src/mcp/server.ts`

**Usage**: Connect via MCP client (Claude Desktop, Cursor, etc.)

## TypeScript SDK

Client SDK for programmatic access.

### Installation

```typescript
import { FieldnotesClient } from '@alexa-multi-agent/user-research-agent/sdk';
```

### Usage

```typescript
const client = new FieldnotesClient({
  apiUrl: 'https://jtefgwkgd54fggqcf62hhhw3d40rwrbj.lambda-url.us-east-1.on.aws/',
  apiKey: process.env.FIELDNOTES_API_KEY
});

// Analyze behavior
const insights = await client.analyze({
  timeframe: 'week',
  focus: 'all'
});

// Generate pre-launch memo
const memo = await client.preLaunchMemo({
  name: 'Quick Story Mode',
  description: 'Fast-path story creation',
  targetAudience: 'parents',
  successMetrics: ['completion_rate']
});

// Get latest brief
const brief = await client.getLatestBrief('storytailor');

// Challenge another agent
const challenge = await client.challengeAgent(
  'content-agent',
  'Why are princess stories showing low retention?'
);

// Get usage statistics
const usage = await client.getUsage('storytailor');
```

**Code Reference**: `packages/user-research-agent/src/sdk/index.ts`

## Database Schema

### Tables

- `research_tenants` - Tenant configurations
- `research_insights` - Generated insights
- `research_briefs` - Weekly briefs
- `research_pre_launch_memos` - Pre-launch risk memos
- `research_cost_tracking` - Cost tracking per tenant
- `research_usage_metrics` - Usage metrics

**Migration**: `supabase/migrations/20250114000000_user_research_agent_schema.sql`

### Row Level Security (RLS)

All tables have RLS policies ensuring tenant isolation:
- Tenants can only access their own data
- Service role has full access for operations
- Multi-tenant isolation enforced at database level

## Environment Variables

All environment variables are loaded from AWS SSM Parameter Store at runtime:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `REDIS_URL` - Redis connection URL
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key (if configured)
- `FIELDNOTES_API_KEY` - API key for authentication

## Deployment

### Lambda Functions

**API Function:**
- Name: `storytailor-fieldnotes-api-production`
- Handler: `dist/lambda.handler`
- Runtime: Node.js 22.x
- Memory: 512 MB
- Timeout: 60 seconds

**Scheduled Function:**
- Name: `storytailor-fieldnotes-scheduled-production`
- Handler: `dist/lambda-scheduled.handler`
- Runtime: Node.js 22.x
- Memory: 512 MB
- Timeout: 300 seconds

**Deployment Script**: `scripts/deploy-user-research-agent.sh`

### EventBridge Rules

- `fieldnotes-hourly-production` - Runs every hour
- `fieldnotes-daily-production` - Runs daily at 2 AM UTC
- `fieldnotes-weekly-production` - Runs every Monday at 9 AM UTC

## Development

### Building

```bash
cd packages/user-research-agent
npm install
npm run build
```

### Testing

```bash
# Unit tests
npm run test

# Integration tests (requires infrastructure)
npm run test -- integration

# Coverage report
npm run test -- --coverage
```

**Target**: 90% coverage across all modules

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Code Structure

```
packages/user-research-agent/
├── src/
│   ├── core/                    # Intelligence engine
│   │   ├── tracks/              # Five track implementations
│   │   ├── ResearchEngine.ts    # Main orchestrator
│   │   ├── ModelOrchestrator.ts # LLM routing
│   │   ├── BatchProcessor.ts    # Batch processing
│   │   ├── SmartSampler.ts      # Event sampling
│   │   ├── CostController.ts     # Cost monitoring
│   │   ├── TruthTeller.ts       # Self-deception detection
│   │   ├── TensionMapper.ts      # Conflict identification
│   │   └── AgentChallenger.ts   # Agent interrogation
│   ├── api/                     # REST API server
│   │   └── server.ts
│   ├── mcp/                     # MCP server
│   │   └── server.ts
│   ├── sdk/                     # Client SDK
│   │   └── index.ts
│   ├── integrations/            # Slack, Email, Webhook
│   ├── config/                  # Tenant configurations
│   ├── types/                   # TypeScript types
│   └── utils/                   # Utilities
├── lambda.ts                    # Lambda handler (API)
├── lambda-scheduled.ts          # Lambda handler (scheduled)
└── scheduler.ts                 # Cron scheduler
```

## Related Documentation

- [API Reference](../../../packages/user-research-agent/docs/API.md) - Complete API documentation
- [Cost Optimization](../../../packages/user-research-agent/docs/COST_OPTIMIZATION.md) - Cost optimization strategies
- [Where It's Deployed](./where.md) - Deployment details
