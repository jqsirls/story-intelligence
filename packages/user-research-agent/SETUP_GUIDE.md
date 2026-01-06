# Fieldnotes Setup Guide

Complete step-by-step guide to get Fieldnotes running.

## Prerequisites

- Node.js 18+
- Supabase CLI installed (`npm install -g supabase`)
- Docker (for Redis)
- Environment variables configured

## Step 1: Install Dependencies

**Note:** If you encounter `workspace:*` protocol errors, this is a monorepo workspace configuration issue. The dependencies should already be installed at the root level.

```bash
# From root of monorepo
cd packages/user-research-agent
npm install
```

If workspace protocol errors persist, dependencies are likely already installed at root. Proceed to Step 2.

## Step 2: Start Infrastructure

Start Supabase and Redis:

```bash
# From root of monorepo
npm run infrastructure:start
```

This will:
- Start Supabase on `http://localhost:54321`
- Start Redis on `localhost:6379`
- Auto-apply database migrations (including Fieldnotes schema)

**Verify Supabase is running:**
- Studio: http://localhost:54323
- API: http://localhost:54321

## Step 3: Configure Environment Variables

Create `.env` file in `packages/user-research-agent/`:

```bash
# Supabase (get from Supabase Studio > Settings > API)
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Redis
REDIS_URL=redis://localhost:6379

# AI Models
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Slack (optional - for delivery)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Fieldnotes API (for webhook delivery)
FIELDNOTES_API_KEY=your-secret-api-key
FIELDNOTES_WEBHOOK_URL=https://your-webhook-endpoint.com/fieldnotes

# Cost limits
FIELDNOTES_COST_LIMIT_STORYTAILOR=300
```

**Get Supabase keys:**
1. Open Supabase Studio: http://localhost:54323
2. Go to Settings > API
3. Copy `service_role` key (secret) and `anon` key

## Step 4: Build the Package

```bash
cd packages/user-research-agent
npm run build
```

## Step 5: Initialize Storytailor Tenant

Run the setup script:

```bash
./scripts/setup.sh
```

Or manually:

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const { initializeStorytalorTenant } = require('./dist/config/tenants/storytailor');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

initializeStorytalorTenant(supabase)
  .then(() => console.log('✅ Tenant initialized'))
  .catch(err => console.error('❌ Error:', err.message));
"
```

This creates:
- Storytailor tenant configuration
- Cost tracking record
- Database entries for research operations

## Step 6: Configure Delivery Channels

### Slack Integration

1. Create a Slack webhook:
   - Go to https://api.slack.com/apps
   - Create new app or use existing
   - Go to "Incoming Webhooks"
   - Create webhook for `#product-insights` channel
   - Copy webhook URL

2. Add to `.env`:
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

3. Update tenant config (optional - already defaults to env var):
   ```typescript
   // packages/user-research-agent/src/config/tenants/storytailor.ts
   delivery: {
     slack: {
       enabled: true,
       webhookUrl: process.env.SLACK_WEBHOOK_URL,
       channel: '#product-insights',
       schedule: 'Monday 9am PST'
     }
   }
   ```

### Email Integration

Update recipients in tenant config:

```typescript
// packages/user-research-agent/src/config/tenants/storytailor.ts
delivery: {
  email: {
    enabled: true,
    recipients: [
      'product@storytailor.com',
      'team@storytailor.com'
    ],
    format: 'html'
  }
}
```

**Note:** For local development, emails are captured by Inbucket (Supabase's email testing server):
- View at: http://localhost:54324

### Webhook Integration (Make.com, Zapier, etc.)

1. Set webhook URL in `.env`:
   ```bash
   FIELDNOTES_WEBHOOK_URL=https://your-webhook-endpoint.com/fieldnotes
   ```

2. Configure your webhook endpoint to receive:
   - `new_insight` - New critical finding
   - `weekly_brief` - Weekly research brief
   - `critical_finding` - Urgent issue detected
   - `pre_launch_memo` - Pre-launch risk memo

## Step 7: Start Services

### Option A: REST API

```bash
npm run start:api
```

API runs on `http://localhost:3000`

**Test it:**
```bash
curl -X POST http://localhost:3000/api/v1/analyze \
  -H "X-API-Key: [REDACTED_API_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "storytailor",
    "timeRange": "7 days"
  }'
```

### Option B: MCP Server

```bash
npm run start:mcp
```

MCP server runs on `stdio` (for AI assistants like Claude Desktop).

**Available MCP tools:**
- `fieldnotes_analyze` - Run analysis
- `fieldnotes_challenge_decision` - Challenge a product decision
- `fieldnotes_generate_brief` - Generate weekly brief
- `fieldnotes_interrogate_agent` - Challenge another agent

### Option C: Scheduler (Scheduled Jobs)

```bash
node dist/scheduler.js
```

This runs:
- **Hourly:** Event aggregation (SQL only, $0 cost)
- **Daily:** Pattern detection (cheap LLM)
- **Weekly:** Brief generation (premium LLM)
- **Monthly:** Cost reset

### Option D: All Services

Use separate terminals:

```bash
# Terminal 1: REST API
npm run start:api

# Terminal 2: MCP Server
npm run start:mcp

# Terminal 3: Scheduler
node dist/scheduler.js
```

Or use the convenience script:

```bash
./scripts/start-services.sh all
```

## Step 8: Verify Setup

### Check Database

1. Open Supabase Studio: http://localhost:54323
2. Go to Table Editor
3. Verify tables exist:
   - `research_tenants`
   - `research_insights`
   - `research_briefs`
   - `research_pre_launch_memos`
   - `research_cost_tracking`
   - `research_cache`
   - `research_agent_challenges`

4. Check `research_tenants` table:
   ```sql
   SELECT * FROM research_tenants WHERE tenant_id = 'storytailor';
   ```

### Test API

```bash
# Health check
curl http://localhost:3000/health

# Get cost status
curl -H "X-API-Key: your-key" \
  http://localhost:3000/api/v1/cost/status?tenantId=storytailor
```

### Test Scheduler

The scheduler runs automatically. Check logs for:
- Hourly aggregation completion
- Daily pattern detection
- Weekly brief generation

## Troubleshooting

### "Cannot find module" errors

Dependencies may not be installed. Try:
```bash
# From root
npm install

# Or from package directory
npm install --legacy-peer-deps
```

### Supabase connection errors

1. Verify Supabase is running: `npm run supabase:status`
2. Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
3. Test connection:
   ```bash
   curl http://localhost:54321/rest/v1/
   ```

### Redis connection errors

1. Verify Redis is running: `docker ps | grep redis`
2. Check `REDIS_URL` in `.env`
3. Test connection:
   ```bash
   redis-cli ping
   ```

### Cost limit errors

If you hit cost limits:
1. Check `research_cost_tracking` table
2. Update cost limit in tenant config
3. Or reset cost tracking:
   ```sql
   UPDATE research_cost_tracking
   SET estimated_cost = 0, status = 'normal'
   WHERE tenant_id = 'storytailor';
   ```

## Next Steps

1. **Configure data sources** - Ensure `event_store` table has data
2. **Set up monitoring** - Monitor cost tracking and delivery success
3. **Customize personas** - Update parent/child personas in tenant config
4. **Adjust schedules** - Modify cron schedules in `scheduler.ts`
5. **Add more tenants** - Create additional tenant configs

## Support

- See `README.md` for architecture overview
- See `docs/API.md` for API reference
- See `docs/COST_OPTIMIZATION.md` for cost strategies
