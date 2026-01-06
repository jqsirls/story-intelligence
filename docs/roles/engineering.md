Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 9 - Engineering guide with verification status

# Engineering Guide

## Storytailor and Story Intelligence from Engineering Perspective

### What is Storytailor?

**Storytailor** is a multi-agent system built on AWS Lambda, Supabase PostgreSQL, and Redis. It consists of 29+ specialized agents orchestrated by a Router, with REST API, SDK, and voice platform integrations.

**Key Facts (Verified):**
- 44 Lambda functions deployed (17 production, 27 staging)
- 29+ specialized agents
- Supabase PostgreSQL database (120+ tables)
- Redis for state caching and rate limiting
- REST API with 60+ endpoints

**Code References:**
- `docs/system/architecture.md:1-300` - System architecture
- `docs/system/inventory.md:1-400` - System inventory
- `docs/system/deployment_inventory.md:24-80` - Deployment inventory

### What is Story Intelligence™?

**Story Intelligence™** is Storytailor's proprietary AI system implemented across multiple agents (Content Agent, Character Agent, Emotion Agent, Personality Agent). It uses OpenAI for story generation and content moderation.

**Key Facts (Verified):**
- Four-pillar architecture (Narrative, Developmental, Personal, Literary Excellence)
- Implemented in Content Agent, Character Agent, Emotion Agent, Personality Agent
- Uses OpenAI GPT-4, GPT-3.5-turbo, DALL-E 3, Sora-2
- Age-appropriate content generation

**Code References:**
- `docs/story-intelligence/architecture.md:1-200` - Story Intelligence architecture
- `packages/content-agent/src/ContentAgent.ts:75-77` - OpenAI integration

## Technical Architecture

### System Architecture

**Architecture Pattern:** Hub-and-spoke model with Router as central orchestrator

**Components:**
- Router Agent (central orchestrator)
- 29+ specialized agents
- Supabase PostgreSQL database
- Redis for state caching
- AWS Lambda for serverless execution

**Code References:**
- `docs/system/architecture.md:1-300` - System architecture
- `docs/agents/README.md:1-100` - Agent ecosystem

### Deployment Infrastructure

**Lambda Functions:**
- 44 functions deployed
- Runtime: nodejs22.x (primary), nodejs20.x, nodejs18.x
- Memory: 256MB - 2048MB
- Timeout: 5s - 300s

**Code References:**
- `docs/system/deployment_inventory.md:24-80` - Lambda function inventory
- `docs/system/inventory.md:319-329` - Deployment status

### Database Schema

**Supabase PostgreSQL:**
- 120+ tables
- Row Level Security (RLS) enabled on all tables
- 26 migration files
- Data retention policies configured

**Code References:**
- `docs/system/database_schema_inventory.md:1-343` - Complete schema inventory
- `supabase/migrations/` - Migration files

## Development Workflows

### Local Development

**Setup:**
```bash
# Install dependencies
npm install

# Start Supabase
npm run supabase:start

# Start Redis
npm run redis:start

# Run tests
npm test
```

**Code References:**
- `package.json:27-34` - Infrastructure scripts

### Testing

**Test Framework:** Jest (TypeScript)
**Test Types:** Unit, Integration, E2E, Load, Security, Compliance

**Running Tests:**
```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

**Code References:**
- `jest.config.js:1-40` - Jest configuration
- `package.json:12-22` - Test scripts

### CI/CD

**GitHub Actions:**
- `.github/workflows/ci.yml` - Continuous integration
- `.github/workflows/comprehensive-ci-cd.yml` - Comprehensive CI/CD
- `.github/workflows/staging-deploy.yml` - Staging deployment
- `.github/workflows/production-deploy.yml` - Production deployment

**Code References:**
- `.github/workflows/ci.yml` - CI workflow
- `package.json:39-41` - CI scripts

## API Documentation

### REST API

**Endpoints:** 60+ REST API endpoints
**Location:** `packages/universal-agent/src/api/RESTAPIGateway.ts:74-3511`

**Endpoint Groups:**
- Conversation: 8 endpoints
- Stories: 6 endpoints
- Characters: 3 endpoints
- Auth: 5+ endpoints
- Smart Home: 3 endpoints
- Webhooks: 7 endpoints

**Code References:**
- `docs/system/api_endpoints_inventory.md:24-360` - API endpoints inventory
- `docs/platform/sdks/rest-api.md:1-200` - REST API documentation

### SDKs

**Web SDK:**
- Location: `packages/web-sdk/`
- Language: JavaScript/TypeScript
- Documentation: `docs/platform/sdks/web-sdk.md`

**iOS SDK:**
- Location: `packages/mobile-sdk-ios/`
- Language: Swift
- Documentation: `docs/platform/sdks/ios-sdk.md`

**Android SDK:**
- Location: `packages/mobile-sdk-android/`
- Language: Kotlin
- Documentation: `docs/platform/sdks/android-sdk.md`

**Code References:**
- `docs/platform/sdks/README.md:1-100` - SDK overview

## Where to Look

### Key Documentation

1. **System Architecture**
   - Location: `docs/system/architecture.md`
   - Purpose: Complete system architecture
   - Verification Status: ✅ Verified against code

2. **System Inventory**
   - Location: `docs/system/inventory.md`
   - Purpose: Complete system inventory
   - Verification Status: ✅ Verified against code

3. **API Endpoints Inventory**
   - Location: `docs/system/api_endpoints_inventory.md`
   - Purpose: Complete API endpoint reference
   - Verification Status: ✅ Verified against code

4. **Database Schema Inventory**
   - Location: `docs/system/database_schema_inventory.md`
   - Purpose: Complete database schema reference
   - Verification Status: ✅ Verified against code

5. **Agent Ecosystem**
   - Location: `docs/agents/`
   - Purpose: Agent capabilities and implementation
   - Verification Status: ✅ Verified against code

6. **Testing Documentation**
   - Location: `docs/testing/`
   - Purpose: Testing frameworks and quality gates
   - Verification Status: ✅ Verified against code

## What Not to Assume

### Feature Availability

**Do Not Assume:**
- Feature implementation status (verify with code)
- Deployment status (verify with AWS CLI)
- API endpoint availability (verify with API documentation)

**Where to Verify:**
- Code: See `packages/` and `lambda-deployments/`
- Deployment: See `docs/system/deployment_inventory.md`
- API: See `docs/system/api_endpoints_inventory.md`

### Performance Characteristics

**Do Not Assume:**
- Response times (verify with load tests)
- Scalability limits (verify with load tests)
- Cost projections (verify with AWS Cost Explorer)

**Where to Verify:**
- Load Tests: See `testing/load/k6-load-tests.js`
- Performance: See `docs/testing/testing-and-quality.md`

## Common Questions and Sources

### Q: How do agents communicate?

**Answer:** Agents communicate through the Router orchestration layer using standardized protocols. The Event System uses AWS EventBridge for asynchronous communication.

**Source:** `docs/system/architecture.md:1-300`, `docs/agents/event-system.md:1-100`

### Q: What is the database schema?

**Answer:** Storytailor uses Supabase PostgreSQL with 120+ tables, Row Level Security enabled on all tables, and 26 migration files.

**Source:** `docs/system/database_schema_inventory.md:1-343`

### Q: How are Lambda functions deployed?

**Answer:** Lambda functions are deployed via deployment scripts in `scripts/` directory, with 44 functions total (17 production, 27 staging).

**Source:** `docs/system/deployment_inventory.md:24-80`

### Q: What testing frameworks are used?

**Answer:** Storytailor uses Jest for unit/integration tests, K6 for load tests, OWASP ZAP for security tests, and Cypress for E2E tests.

**Source:** `docs/testing/testing-and-quality.md:1-300`

## Related Documentation

- **System Architecture:** See [System Architecture](../system/architecture.md)
- **System Inventory:** See [System Inventory](../system/inventory.md)
- **Testing:** See [Testing Documentation](../testing/README.md)
- **Agent Ecosystem:** See `docs/agents/README.md`
