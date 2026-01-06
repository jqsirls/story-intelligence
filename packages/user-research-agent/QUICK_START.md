# Fieldnotes Quick Start

Get Fieldnotes running in 5 minutes.

## 1. Start Infrastructure

```bash
# From root of monorepo
npm run infrastructure:start
```

Wait for Supabase to start (30-60 seconds). Verify at http://localhost:54323

## 2. Configure Environment

```bash
cd packages/user-research-agent
cp .env.example .env
```

Edit `.env` and add:
- `SUPABASE_SERVICE_ROLE_KEY` (from Supabase Studio > Settings > API)
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `SLACK_WEBHOOK_URL` (optional)

## 3. Build & Initialize

```bash
npm run build
./scripts/setup.sh
```

## 4. Start Service

**REST API:**
```bash
npm run start:api
```

**MCP Server:**
```bash
npm run start:mcp
```

**Scheduler:**
```bash
node dist/scheduler.js
```

## 5. Test

```bash
# Health check
curl http://localhost:3000/health

# Test analysis (requires API key)
curl -X POST http://localhost:3000/api/v1/analyze \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "storytailor", "timeRange": "7 days"}'
```

## That's It!

Fieldnotes is now running. Check:
- **API:** http://localhost:3000
- **Supabase Studio:** http://localhost:54323
- **Weekly briefs** will be delivered to your configured channels

For detailed setup, see `SETUP_GUIDE.md`.
