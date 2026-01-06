# AGENTS.md

A guide for AI coding agents working on the Storytailor Multi-Agent System.

## Project Overview

This is a production-ready monorepo implementing a hub-and-spoke multi-agent architecture for Alexa integration. The system uses:
- **Turbo** for monorepo build orchestration
- **TypeScript** with strict mode
- **Supabase** for PostgreSQL database with RLS
- **Redis** for conversation state caching
- **gRPC** for inter-agent communication
- **Jest** for testing

## Setup Commands

### Initial Setup
```bash
# Install dependencies
npm install

# Start infrastructure (Supabase + Redis)
npm run infrastructure:start

# Build all packages
npm run build
```

### Development Environment
```bash
# Start all agents in watch mode
npm run dev

# Or start specific infrastructure services
npm run supabase:start
npm run redis:start
```

## Monorepo Structure

This is a **Turbo monorepo** with workspaces in `packages/*`. Key packages:

- `router/` - Intent classification and delegation orchestrator
- `storytailor-agent/` - Universal conversation agent
- `auth-agent/` - Authentication and account linking
- `content-agent/` - Story and character generation
- `library-agent/` - Library management with RLS
- `emotion-agent/` - Emotion tracking
- `commerce-agent/` - Subscription and billing
- `insights-agent/` - Pattern analysis
- `shared-types/` - Shared TypeScript types and gRPC schemas

### Working with Packages

- **Build a specific package**: `turbo run build --filter=<package-name>`
- **Test a specific package**: `turbo run test --filter=<package-name>`
- **Lint a specific package**: `turbo run lint --filter=<package-name>`
- **Find package location**: Check `packages/<package-name>/package.json` for the actual name

### Package Dependencies

- Turbo handles dependency ordering automatically via `dependsOn` in `turbo.json`
- Build order: `shared-types` → other packages
- Test order: Tests depend on `build` completing first

## Code Style

- **TypeScript strict mode** - All code must pass strict type checking
- **Single quotes** preferred (check existing codebase)
- **No semicolons** (check existing codebase)
- **Functional patterns** where possible
- **90% test coverage** requirement
- **Conventional commit messages** required

### Type Checking
```bash
# Type check all packages
npm run type-check

# Type check specific package
turbo run type-check --filter=<package-name>
```

## Testing Instructions

### Test Commands
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run smoke tests
npm run test:smoke

# Test specific package
turbo run test --filter=<package-name>
```

### Test Requirements

- **All tests must pass** before committing
- **Add tests** for new code, even if not explicitly requested
- **Fix failing tests** immediately - don't leave broken tests
- Tests depend on `build` completing first (configured in `turbo.json`)

### Test Structure

- Unit tests: `src/__tests__/` in each package
- Integration tests: `jest.integration.config.js`
- E2E tests: `jest.e2e.config.js`
- Test utilities: `packages/testing/src/helpers/`

### Lambda-Deployments Testing (IMPORTANT)

**Lambda-deployments tests run via standalone Node.js scripts, NOT Jest.**

**Why**: lambda-deployments is NOT a workspace package (only `packages/*` are workspaces). Scripts require built code from `dist/`, not source.

**Pattern (PROVEN - Generated 100+ successful images):**
```bash
# 1. Build first
cd lambda-deployments/content-agent
npm run build
cd ../..

# 2. Run standalone script
node scripts/test-comprehensive-inclusivity-validation.js

# 3. Results logged to markdown
# Check: COMPREHENSIVE_VALIDATION_RESULTS.md
```

**Available Scripts:**
- `scripts/test-comprehensive-inclusivity-validation.js` - ALL 39 traits validation (80 images, $3.20, ~2.5 hours)
- `scripts/test-halo-imagination-variants.js` - Halo device specific testing

**Historical Results:**
- `docs/testing/validation-results/halo-device-validation-2025-12-21.md` (8 images)
- `docs/testing/validation-results/species-adaptation-validation-2025-12-19.md` (26 images)

**Documentation:**
- `docs/testing/HOW_TO_RUN_INCLUSIVITY_TESTS.md` - Complete testing guide
- `docs/testing/INCLUSIVITY_TESTING_PLAYBOOK.md` - When/how/what/where reference

**NEVER use `npm test` for lambda-deployments** - it won't find the tests. Always use standalone scripts with built code.

## Build Commands

```bash
# Build all packages
npm run build

# Build specific package
turbo run build --filter=<package-name>

# Clean build artifacts
npm run clean
```

### Build Dependencies

- Turbo automatically handles build order
- `shared-types` must build before other packages
- Protocol buffers: `npm run proto:build` (builds gRPC schemas)

## Infrastructure Requirements

### Before Development

**Infrastructure must be running** for most operations:

```bash
# Start Supabase and Redis
npm run infrastructure:start

# Or individually
npm run supabase:start
npm run redis:start
```

### Supabase

- Local Supabase Studio: http://localhost:54323
- Migrations auto-apply on start
- Reset database: `npm run supabase:reset`

### Redis

- Used for conversation state caching
- Key prefix: `storytailor:`
- Redis Commander: http://localhost:8081
- Default database: 0

## Common Workflows

### Adding a New Feature

1. **Identify the package** - Check which agent handles the feature
2. **Start infrastructure**: `npm run infrastructure:start`
3. **Build dependencies**: `npm run build`
4. **Make changes** in the appropriate package
5. **Run tests**: `turbo run test --filter=<package-name>`
6. **Type check**: `turbo run type-check --filter=<package-name>`
7. **Lint**: `turbo run lint --filter=<package-name>`
8. **Fix any errors** before finishing

### Fixing a Bug

1. **Reproduce the issue** - Run relevant tests or integration tests
2. **Identify the package** - Check error stack traces
3. **Fix the code**
4. **Run tests** - Ensure existing tests still pass
5. **Add regression test** if missing
6. **Verify fix** - Run full test suite for that package

### Working with gRPC

- Protocol definitions: `packages/shared-types/src/schemas/agent-rpc.proto`
- Rebuild protos: `npm run proto:build`
- gRPC services defined per agent in the proto file

## Linting

```bash
# Lint all packages
npm run lint

# Lint and fix
npm run lint:fix

# Lint specific package
turbo run lint --filter=<package-name>
```

## CI/CD Validation

Before committing, ensure:
```bash
npm run ci:validate  # Runs: lint + type-check + test
```

## Important Gotchas

1. **Infrastructure must be running** - Most operations require Supabase and Redis
2. **Build order matters** - `shared-types` builds first, then `voice-synthesis` and `router` before `universal-agent`
3. **Tests depend on build** - Run `build` before `test`
4. **TypeScript strict mode** - All code must pass strict type checking
5. **RLS policies** - Database operations respect Row Level Security
6. **PII handling** - PII is tokenized (SHA-256) in logs
7. **Correlation IDs** - All services use correlation IDs for tracing
8. **Lambda module resolution** - Direct file requires in Lambda may trigger package resolution if `package.json` exists in that directory
9. **Router initialization** - Router requires Redis connection; initialization has 5-second timeout
10. **Voice synthesis config** - VoiceService requires full config object with all fields (elevenlabs, polly, failover, cost, redis)
11. **Production URLs** - Always verify working production domains before updating code defaults. Test endpoints with `curl` before making changes.
12. **URL consistency** - When updating URLs, update code defaults, SSM parameters, documentation, tests, and CI/CD configs consistently
13. **Content Agent Dual Implementation** - Content Agent has TWO separate codebases:
   - `lambda-deployments/content-agent/` - **PRODUCTION VERSION** (1,555+ lines, 94 files)
     - Contains full 39-trait inclusivity system (NEVER DELETE)
     - generateReferenceImagesWithValidation() with species-first language
     - ComprehensiveInclusivityDatabase.ts (3,442 lines)
     - CharacterImageGenerator.ts with context-sensitive transformations
     - SpeciesAnatomyProfiles.ts for 9 species
   - `packages/content-agent/` - **LEGACY/INCOMPLETE** (904 lines, 43 files)
     - Missing inclusivity system
     - DO NOT USE for production development
     - DO NOT copy to lambda-deployments (will lose critical features)
   
   **ALWAYS work in `lambda-deployments/content-agent/` for character/image generation features.**
   **Tests will FAIL if inclusivity system is removed.**

14. **OpenAPI Extensions are Law** - The `docs/api/OPENAPI_EXTENSIONS.md` document defines canonical rules that MUST be followed:
   - Every endpoint MUST have `x-scope` and `x-visibility` extensions
   - All mutations MUST have `x-idempotency` and `x-quota` extensions
   - State-changing operations MUST use `enforceLifecycle()` middleware
   - Run `npx ts-node scripts/validate-openapi-extensions.ts` before PRs
   - **No endpoint ships without these extensions. No exceptions.**

## Sacred Documents (Cannot Be Simplified or Bypassed)

These documents define system law. They are not guidelines. They are not suggestions.
Changes require explicit approval and must maintain all existing guarantees.

| Document | Purpose | Protection |
|----------|---------|------------|
| `docs/api/OPENAPI_EXTENSIONS.md` | Extension contract for all API endpoints | CI validation enforced |
| `docs/api/SYSTEM_BEHAVIOR_GUARANTEES.md` | Idempotency, quota, retry semantics | User-facing promises |
| `docs/api/SAFETY_BOUNDARIES.md` | Mental health/crisis handling rules | COPPA/GDPR compliance |
| `docs/api/LIFECYCLE_STATE_MACHINES.md` | Valid state transitions | Middleware enforcement |
| `lambda-deployments/content-agent/src/constants/ComprehensiveInclusivityDatabase.ts` | 39-trait inclusivity system | Test suite protection |

**Enforcement Mechanisms:**
- `scripts/validate-openapi-extensions.ts` - CI rejects endpoints missing extensions
- `packages/universal-agent/src/middleware/LifecycleEnforcementMiddleware.ts` - ERR_6003 on invalid transitions
- `packages/universal-agent/src/middleware/ScopeAuthorizationMiddleware.ts` - 403 on scope violations
- `packages/universal-agent/src/middleware/IdempotencyMiddleware.ts` - 409 on duplicate requests

## Environment Variables

Required environment variables (see `.env.example`):
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `REDIS_HOST` - Redis host (default: 127.0.0.1)
- `REDIS_PORT` - Redis port (default: 6379)
- `OPENAI_API_KEY` - OpenAI API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `APP_URL` - Frontend application URL (default: `https://storytailor.com`)
- `A2A_BASE_URL` - A2A protocol base URL (configured via SSM, overrides code defaults)
- `API_BASE_URL` - Main API base URL (default: `https://api.storytailor.dev`)

## Production URLs & Endpoints

**Important**: Always verify which URLs are actually working in production before using them in code or documentation. Environment variables from SSM Parameter Store override code defaults.

### Verified Working Production Domains

- **A2A API**: `https://storyintelligence.dev` (verified working - A2A protocol endpoints)
- **Main API**: `https://api.storytailor.dev` (verified working - REST API)
- **Frontend**: `https://storytailor.com` (verified working - web application)

### Code Defaults

These are the fallback URLs used in source code when environment variables are not set:

- **A2A Adapter** (`packages/universal-agent/src/api/RESTAPIGateway.ts`):
  - `baseUrl`: `https://api.storytailor.dev` (default)
  - `webhookUrl`: `https://api.storytailor.dev/a2a/webhook` (default)
  - `healthUrl`: `https://api.storytailor.dev/health` (default)

- **API Contract** (`packages/api-contract/src/index.ts`):
  - `production`: `https://api-v2.storytailor.com` (default)
  - `staging`: `https://staging-api.storytailor.dev` (default)

- **API Channel Adapter** (`packages/universal-agent/src/conversation/adapters/APIChannelAdapter.ts`):
  - `baseUrl`: `https://api.storytailor.dev` (default)

### Lambda Function URLs

- **Universal Agent**: `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/`
  - **Region**: `us-east-1`
  - **Status**: ✅ Configured and accessible
  - **AuthType**: NONE (authentication handled by adapters)
  - **CORS**: Configured for cross-origin requests

### URL Verification Guidance

Before updating URLs in code or documentation:

1. **Test the endpoint**: `curl -I https://example.com/health` to verify it's accessible
2. **Check SSM Parameters**: Environment variables in SSM override code defaults
3. **Verify CloudFront/DNS**: Custom domains may point to Lambda Function URLs
4. **Check documentation**: `docs/platform/a2a/where.md` contains verified production endpoints
5. **Update consistently**: When changing URLs, update:
   - Code defaults (if appropriate)
   - Environment variables (SSM Parameter Store)
   - Documentation
   - Tests
   - CI/CD workflows

### A2A Protocol Endpoints

- `GET https://storyintelligence.dev/a2a/discovery` - Agent discovery
- `POST https://storyintelligence.dev/a2a/message` - JSON-RPC 2.0 messaging
- `POST https://storyintelligence.dev/a2a/task` - Task delegation
- `GET https://storyintelligence.dev/a2a/status` - Task status (with optional SSE)
- `POST https://storyintelligence.dev/a2a/webhook` - Webhook notifications
- `GET https://storyintelligence.dev/health` - Health check

**Code References:**
- `docs/platform/a2a/where.md` - Verified A2A endpoints
- `docs/platform/a2a/deployment-verification.md` - Deployment verification details

## Security & Compliance

- **COPPA compliance** - Verified parent email for under-13 users
- **GDPR compliance** - Right to be forgotten, data export
- **PII detection** - Automated detection and redaction
- **RLS policies** - Database-level security enforcement

## Performance Targets

- **Voice response**: <800ms
- **Cold start**: <150ms
- **Circuit breakers** for external API failures

## PR Instructions

- **Title format**: `[<package-name>] <Description>`
- **Run validation**: `npm run ci:validate` before committing
- **Update tests** for any code changes
- **Update documentation** for API changes
- **Check coverage** - Maintain 90% test coverage

## Deployment

### General Deployment
- **Staging**: `npm run deploy:staging`
- **Production**: `npm run deploy:production`
- **CI Build**: `npm run ci:build` (builds + integration tests)

### Universal Agent Lambda Deployment

**Critical**: The Universal Agent has complex module bundling requirements. Use the dedicated deployment script:

```bash
# Deploy Universal Agent to Lambda
./scripts/deploy-universal-agent-proper.sh [environment]
```

#### Build Order (CRITICAL)
The deployment script automatically builds dependencies in this order:
1. `shared-types` - Must build first (contains shared types)
2. `voice-synthesis` - Required for WebVTT service
3. `router` - Required for Universal Agent routing
4. `universal-agent` - Builds last

#### Module Bundling Gotchas

**Router Module Resolution**:
- Router is bundled to both `node_modules/@alexa-multi-agent/router` AND `dist/router/`
- **CRITICAL**: `dist/router/package.json` is REMOVED to prevent Node.js from treating it as a package during direct file requires
- Router's `package.json` only exists in `node_modules/@alexa-multi-agent/router/package.json`
- This prevents module resolution errors when requiring router files directly

**Voice Synthesis Bundling**:
- Voice synthesis is bundled to `node_modules/@alexa-multi-agent/voice-synthesis/dist/`
- Also copied to `dist/voice-synthesis/` as fallback for direct require paths
- WebVTTService uses multiple loading strategies (package → direct path → source)
- VoiceService requires full config with all environment variables

**Workspace Dependencies**:
- All workspace packages must be built BEFORE universal-agent
- Dependencies are copied into deployment package's `node_modules/`
- Each bundled package gets a `package.json` with correct `main` field

#### Lambda Deployment Checklist

Before deploying Universal Agent:
1. ✅ Build all workspace dependencies (`shared-types`, `voice-synthesis`, `router`)
2. ✅ Verify router `dist/` exists and is not corrupted
3. ✅ Check that `dist/router/package.json` is removed (prevents module resolution issues)
4. ✅ Verify voice-synthesis `dist/` exists
5. ✅ Ensure all environment variables are set in SSM Parameter Store
6. ✅ Test locally if possible: `node dist/lambda.js` (with proper env vars)

#### Environment Variables (SSM Parameters)

The deployment script reads from SSM Parameter Store:
- `/{prefix}/supabase/url` or `/{prefix}/supabase-url`
- `/{prefix}/supabase/service-key` or `/{prefix}/supabase-service-key`
- `/{prefix}/supabase/anon-key` or `/{prefix}/supabase-anon-key`
- `/{prefix}/redis-url` or `/{prefix}/redis/url`
- `/{prefix}/openai-api-key`
- `/{prefix}/elevenlabs-api-key`
- And more (see deployment script for full list)

#### Common Deployment Issues

**"Cannot find module '@alexa-multi-agent/router'"**:
- Check that router was built: `cd packages/router && npm run build`
- Verify `dist/router/package.json` is removed (deployment script does this)
- Check that router files exist in `node_modules/@alexa-multi-agent/router/dist/`

**Voice Synthesis Not Available**:
- Verify voice-synthesis was built: `cd packages/voice-synthesis && npm run build`
- Check that files exist in deployment package
- Review WebVTTService logs for initialization errors

**Module Resolution Errors**:
- Ensure `package.json` files have correct `main` field pointing to `dist/` files
- Check that `type: "commonjs"` is set in bundled package.json files
- Verify no conflicting `package.json` files in `dist/` directories used for direct requires

## Getting Help

- Check package-specific `README.md` files in each package
- Review `README.md` for architecture overview
- Check `turbo.json` for build pipeline configuration
- Review test files for usage examples

## Nested AGENTS.md Files

For package-specific guidance, see:
- `lambda-deployments/content-agent/AGENTS.md` - Content generation, 39-trait inclusivity system
- `packages/universal-agent/AGENTS.md` - Multi-agent orchestration, module bundling
- `packages/router/AGENTS.md` - Intent classification, Redis requirements

The closest AGENTS.md in the directory tree takes precedence for that context.

## Version History

**Version**: 2.0  
**Last Updated**: December 22, 2025  

**Major Changes in v2.0**:
- Added lambda-deployments testing section (standalone script pattern documented)
- Added Content Agent dual implementation warning (gotcha #13)
- Added inclusivity system protection mechanisms (6-layer defense)
- Enhanced with 39-trait universal inclusivity system documentation
- Added testing playbook references

**Version**: 1.0 (Initial)  
**Created**: 2024
