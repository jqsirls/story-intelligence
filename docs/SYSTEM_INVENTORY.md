# SYSTEM_INVENTORY (confirmed only)

This document is **ground truth from repo code + production smoke test output**.

## Production services (AWS Lambda)

- **Universal Agent**
  - **Lambda**: `storytailor-universal-agent-production`
  - **Purpose**: REST API for auth/session/channel orchestration; creates `stories` + `asset_generation_jobs` and triggers Content Agent asynchronously.
  - **Source**: `lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts`
  - **Deploy script**: `scripts/deploy-universal-agent-proper.sh production`

- **Content Agent**
  - **Lambda**: `storytailor-content-agent-production`
  - **Purpose**: Generates story content + cover/scene images + PDF + QR + audio; writes URLs onto the `stories` row.
  - **Source**: `lambda-deployments/content-agent/src/lambda.ts`, `lambda-deployments/content-agent/src/RealContentAgent.ts`
  - **Deploy script**: `scripts/deploy-content-agent-with-deps.sh production`
  - **Bundling proof for QR dependency**: deploy script verifies zip contains `node_modules/qrcode/package.json`.

- **Asset Worker**
  - **Lambda**: (configured via `process.env.CONTENT_AGENT_FUNCTION` defaulting to `storytailor-content-agent-production`)
  - **Purpose**: polls `asset_generation_jobs` and dispatches `generate_asset` actions to Content Agent.
  - **Source**: `lambda-deployments/asset-worker/src/lambda.ts`
  - **Trigger**: EventBridge schedule every 5 minutes (not defined in repo; confirmed by worker header comment + observed pipeline behavior).

## Production storage/CDN

- **Assets domain (CloudFront)**: `https://assets.storytailor.dev`
- **Assets S3 bucket (origin)**: `storytailor-assets-production-326181217496`
  - Content Agent uses `ASSET_BUCKET` env var (see deploy output and `lambda-deployments/content-agent/src/utils/cdnUrl.ts`).

## Supabase (Postgres + Realtime)

### Tables (confirmed in code usage)

- `users`
- `libraries`
- `library_permissions`
- `characters`
- `stories`
- `asset_generation_jobs`
- `subscriptions`

### Realtime (Postgres changes)

Used by the smoke test to subscribe to row updates:
- `public.characters` filtered by `id=eq.<characterId>`
- `public.stories` filtered by `id=eq.<storyId>`

See `scripts/smoke-test.sh` for exact filters.

## “No third-party QR” rule (system behavior)

**Mandatory behavior**:
- `stories.qr_public_url` is the destination link (`https://storytailor.com/s/<storyId>`).
- `stories.qr_code_url` is a **Storytailor-hosted PNG** under `https://assets.storytailor.dev/...png`.
- No third-party QR generation service dependency in runtime paths.


