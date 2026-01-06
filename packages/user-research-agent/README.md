# Fieldnotes (User Research Agent)

**Internal name:** User Research Agent  
**Product name:** Fieldnotes

> A standing internal research team that never sleeps. Provides adversarial truth-telling insights through five parallel analysis tracks.

## What is Fieldnotes?

Fieldnotes is **not** a chatbot that summarizes feedback. It is a standing internal research team that:

- **Observes behavior** - Watches everything users do
- **Synthesizes signals** - Turns data into clear insights
- **Challenges assumptions** - Calls out when you're lying to yourself
- **Surfaces risks early** - Pre-mortem analysis before you ship
- **Validates direction** - Ensures features solve real problems
- **Reports in plain language** - No fluff, no vanity metrics

## Core Responsibilities: Five Tracks

Fieldnotes runs five tracks in parallel at all times:

### 1. Continuous Insight Mining
Watches product usage, abandoned flows, retries, rage clicks, and drop-offs. Turns raw behavior into clear weekly insights.

### 2. Buyer Reality Checks  
Simulates and pressure-tests buyer/decision-maker expectations. For Storytailor: parent persona. For B2B: decision-maker persona. Evaluates time constraints, trust factors, value perception, and patience limits.

### 3. User Experience Guardrails
Evaluates outcomes through end-user lens. For Storytailor: child perspective (fun density, delight, cognitive load). For B2B: end-user perspective (developers, ICs).

### 4. Concept Interrogation
Pre-mortem analysis before building features. Stress-tests concepts: WHO is this for? WHEN would they quit? WHAT will confuse them?

### 5. Brand Consistency
Audits language, onboarding, and flows against brand voice. Flags generic, corporate, or off-brand content.

## Architecture

Fieldnotes is built as a standalone, multi-tenant system with three external interfaces:

- **MCP Server** - Model Context Protocol for AI assistant integration
- **REST API** - HTTP API for programmatic access
- **Client SDK** - TypeScript SDK for easy integration

### Integration-Native Design

Fieldnotes delivers insights WHERE YOU WORK:
- Slack channels
- Email inbox  
- Custom webhooks (Make.com, Zapier, Buildship)
- Your internal tools

**No dashboard to check. No login required. Just insights in your workflow.**

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase (local or cloud)
- Redis (local or cloud)
- OpenAI API key
- Anthropic API key

### Installation

```bash
cd packages/user-research-agent
npm install
```

### Environment Variables

Create `.env` file:

```bash
# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-key

# Redis
REDIS_URL=redis://localhost:6379

# AI Models
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Slack (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Fieldnotes API
FIELDNOTES_API_KEY=your-secret-key
FIELDNOTES_WEBHOOK_URL=https://...

# Cost limits
FIELDNOTES_COST_LIMIT_STORYTAILOR=300
```

### Database Setup

Run the migration:

```bash
# From root of monorepo
npm run supabase:start
# Migration runs automatically
```

Initialize Storytailor tenant:

```bash
cd packages/user-research-agent
npm run build
node -e "require('./dist/config/tenants/storytailor').initializeStorytalorTenant(require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY))"
```

### Running Fieldnotes

**Option 1: MCP Server**
```bash
npm run start:mcp
```

**Option 2: REST API**
```bash
npm run start:api
```

**Option 3: Scheduled Jobs**
```bash
node dist/scheduler.js
```

## Usage

### Via MCP (AI Assistants)

```typescript
// Available MCP tools:
- fieldnotes_analyze
- fieldnotes_challenge_decision
- fieldnotes_generate_brief
- fieldnotes_interrogate_agent
```

### Via REST API

```bash
# Analyze behavior
curl -X POST http://localhost:3000/api/v1/analyze \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"timeframe": "7 days", "focus": "all"}'

# Generate pre-launch memo
curl -X POST http://localhost:3000/api/v1/pre-mortem \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"feature": {"name": "Quick Story", "description": "...", "targetAudience": "parents"}}'

# Get latest brief
curl http://localhost:3000/api/v1/briefs/latest?tenantId=storytailor \
  -H "X-API-Key: your-key"
```

### Via SDK

```typescript
import { FieldnotesClient } from '@alexa-multi-agent/user-research-agent/sdk';

const client = new FieldnotesClient({
  apiUrl: 'http://localhost:3000',
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

// Challenge another agent
const challenge = await client.challengeAgent(
  'content-agent',
  'Why are princess stories showing low retention?'
);
```

## Cost Optimization

Fieldnotes is designed for cost-efficiency:

- **Batch processing:** Hourly → Daily → Weekly (not real-time)
- **Smart sampling:** 10% of events analyzed, 95% accuracy maintained
- **Model tiering:** 90% cheap models, 10% premium models
- **Aggressive caching:** Don't re-analyze stable metrics
- **Adaptive sampling:** Increase sampling when anomalies detected

**Expected costs:**
- Internal use (Storytailor): $150-300/month
- External customers: $50-200/month per tenant (75% margin)

See [`docs/COST_OPTIMIZATION.md`](docs/COST_OPTIMIZATION.md) for details.

## Outputs

### Weekly Research Brief
Delivered every Monday at 9am:
- 🔴 **CRITICAL:** Fix this week
- 🟡 **TENSIONS:** Choose soon  
- 🟢 **OPPORTUNITY:** Worth exploring
- 🗑️ **KILL LIST:** Features not earning their keep
- ⚠️ **WHAT WE'RE LYING TO OURSELVES ABOUT**

### Pre-Launch Risk Memo
Generated on-demand for proposed features:
- WHO is this for? (prove with data)
- WHEN would they quit?
- WHAT will confuse them?
- Buyer lens analysis
- User lens analysis
- Ship/Don't Ship/Fix First recommendation

### Agent Challenges
Research agent can interrogate other agents with data-backed questions.

## Development

```bash
# Build
npm run build

# Development mode (watch)
npm run dev

# Run tests
npm run test

# Run tests with coverage
npm run test -- --coverage

# Type check
npm run type-check

# Lint
npm run lint
```

## Architecture

```
packages/user-research-agent/
├── core/                    # Intelligence engine
│   ├── tracks/              # Five track implementations
│   ├── ResearchEngine.ts    # Main orchestrator
│   ├── ModelOrchestrator.ts # LLM routing
│   ├── BatchProcessor.ts    # Batch processing
│   ├── SmartSampler.ts      # Event sampling
│   ├── CostController.ts    # Cost monitoring
│   ├── TruthTeller.ts       # Self-deception detection
│   ├── TensionMapper.ts     # Conflict identification
│   └── AgentChallenger.ts   # Agent interrogation
├── api/                     # REST API server
├── mcp/                     # MCP server
├── sdk/                     # Client SDK
├── integrations/            # Slack, Email, Webhook
└── config/                  # Tenant configurations
```

## Multi-Tenant Design

Fieldnotes is multi-tenant from day 1. Storytailor is tenant #1. Future tenants can be added via configuration:

```typescript
const newTenant: TenantConfig = {
  tenantId: 'acme-corp',
  dataSources: [...],
  personas: {...},
  brandVoice: {...},
  tracks: [...],
  delivery: {...},
  models: {...}
};
```

Each tenant has:
- Isolated data (RLS policies)
- Custom personas (buyer + user)
- Custom brand voice
- Independent cost tracking
- Separate delivery configuration

## Testing

```bash
# Unit tests
npm run test

# Integration tests (requires infrastructure)
npm run test -- integration

# Coverage report
npm run test -- --coverage
```

Target: 90% coverage across all modules.

## Deployment

**Development:**
```bash
npm run build
npm run start:api    # REST API on port 3000
npm run start:mcp    # MCP server on stdio
node dist/scheduler.js  # Cron jobs
```

**Production:**
Deploy as three separate processes:
1. API server (Express on port 3000)
2. MCP server (stdio transport)
3. Scheduler (cron jobs)

## Documentation

- [API Reference](docs/API.md) - REST and MCP API documentation
- [Cost Optimization](docs/COST_OPTIMIZATION.md) - Strategies for keeping costs low
- [Tenant Configuration](docs/TENANT_CONFIG.md) - How to configure tenants
- [Integration Guide](docs/INTEGRATIONS.md) - Slack, Email, Webhooks

## License

Proprietary - Storytailor Inc.

## Internal Use Only

Fieldnotes is currently for internal Storytailor use only. External productization is planned for future consideration.
