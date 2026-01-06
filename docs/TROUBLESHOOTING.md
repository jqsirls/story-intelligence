# TROUBLESHOOTING (errors, retries, logs, replays)

## Where to look first (production)

## Health endpoint contract (FROZEN)

**Endpoint**: `GET /health` (served by Universal Agent)

This response shape is **contractual**. Do not change keys without updating this doc.

### Response keys (always present)

- **status**: string, expected `"healthy"`
- **version**: string (Universal Agent version string; informational)
- **timestamp**: ISO timestamp string
- **uptime**: number (seconds)
- **checks**: object (production safety signals)
  - **assetCdnUrl**: string | null (value of `ASSET_CDN_URL`)
  - **assetCdnUrlOk**: boolean (true iff `assetCdnUrl === "https://assets.storytailor.dev"`)
  - **supabaseServiceKeyPresent**: boolean (true iff Supabase server key env is present)
  - **redis**: object
    - **reachable**: boolean | null
      - `true`: Redis ping succeeded
      - `false`: Redis ping failed
      - `null`: Redis check skipped because `REDIS_URL` is not set
    - **error**: string | null (reason when `reachable` is false, or `"REDIS_URL not set (skipped)"`)

### What “bad” looks like + what to do next

- **assetCdnUrlOk = false**
  - **Meaning**: Public asset URLs may not be served from `assets.storytailor.dev` (branding + frontend wiring risk).
  - **Next**: Fix the `ASSET_CDN_URL` env var in SSM for Universal Agent and Content Agent deployments.

- **supabaseServiceKeyPresent = false**
  - **Meaning**: Universal Agent cannot perform required Supabase server operations.
  - **Next**: Ensure `SUPABASE_SERVICE_ROLE_KEY` (or equivalent) is set via SSM and attached to the Lambda env.

- **checks.redis.reachable = false**
  - **Meaning**: Middleware/features that require Redis may degrade (idempotency, orchestration, some routing).
  - **Next**: Verify `REDIS_URL` is correct, Redis is running/reachable in the environment, and security groups/NACLs allow access.

### CloudWatch log groups

- **Universal Agent**: `/aws/lambda/storytailor-universal-agent-production`
- **Content Agent**: `/aws/lambda/storytailor-content-agent-production`
- **Asset Worker**: `/aws/lambda/<asset-worker-function-name>`

## Common failures

### 1) Assets never land (story stays generating)

Symptoms:
- `stories.status` remains `"generating"`
- one or more URLs remain null: `cover_art_url`, `scene_art_urls[*]`, `audio_url`, `pdf_url`, `qr_code_url`

Actions:
- Call `GET /api/v1/stories/:id/assets/status` and inspect:
  - `data.jobs[]` for `status: queued|generating|failed`
  - `error_message` if failed
- If jobs are **queued** for a long time:
  - Asset Worker may be throttled/backlogged (it processes max 10 queued jobs per run).
- If jobs are **failed**:
  - Replay them (see “Replay jobs” below).

### 2) Quota blocks smoke tests

- `402 CHARACTER_QUOTA_EXCEEDED`: not retryable without upgrading or using a different test user.
- `402 STORY_QUOTA_EXCEEDED`: same.

`scripts/smoke-test.sh` automatically falls back to an existing complete character if character creation is quota-blocked.

## Replay jobs (minimal, production-safe)

### Option A (preferred): enqueue via API

Generate all assets:

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/stories/<STORY_ID>/assets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{ "assetTypes": ["audio","cover","scene_1","scene_2","scene_3","scene_4","pdf","qr","activities"], "priority":"normal" }'
```

### Option B: replay a specific asset

- Create a single job row in `asset_generation_jobs` for `asset_type='audio'|'pdf'|'qr'|...` and `status='queued'`.
- Asset Worker will pick it up and invoke Content Agent `generate_asset`.

## QR must never use third-party services

If you ever see a third-party QR generator URL anywhere, that is a regression:
- The runtime QR generation must be local in Content Agent and stored as `assets.storytailor.dev/...png`.

## Audio must be CDN-served

If you ever see `https://storytailor-audio.s3.amazonaws.com/...` in `stories.audio_url`, that is a regression:
- Audio must be uploaded into the assets bucket (CloudFront) and stored as `https://assets.storytailor.dev/...mp3`.


