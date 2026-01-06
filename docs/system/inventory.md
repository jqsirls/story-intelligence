Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-14  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 1 - Comprehensive system inventory incorporating Phase 0.5 deployment verification results

# System Inventory

## Overview

This document provides a comprehensive inventory of all system components, services, packages, integrations, and infrastructure in the Storytailor platform. This inventory incorporates deployment verification results from Phase 0.5 and maps all components to their code locations, deployment status, and dependencies.

## Inventory Methodology

- **Code Location**: Verified against `packages/` directory structure
- **Deployment Status**: Verified against AWS Lambda function list (Phase 0.5)
- **Dependencies**: Extracted from `package.json` files
- **External Services**: Verified against SSM parameters and code references
- **Database Schema**: Verified against migration files (Phase 0.5)

## System Components

### Core Orchestration Layer

| Component | Package Location | Lambda Function | Deployment Status | Handler | Code Reference |
|-----------|------------------|-----------------|-------------------|---------|----------------|
| **Universal Agent** | `packages/universal-agent/` | `storytailor-universal-agent-{ENV}` | ✅ Deployed (production, staging) | `dist/lambda.handler` | `packages/universal-agent/src/lambda.ts:1-100` |
| **Router** | `packages/router/` | `storytailor-router-{ENV}` | ✅ Deployed (staging) | Unknown | `packages/router/src/Router.ts:25-866` |
| **Storytailor Agent** | `packages/storytailor-agent/` | Unknown (may be bundled) | ⚠️ May be bundled | Unknown | `packages/storytailor-agent/src/index.ts:1-191` |

**Key Files:**
- `packages/universal-agent/src/UniversalStorytellerAPI.ts:68-863` - Main API class
- `packages/universal-agent/src/api/RESTAPIGateway.ts:74-3511` - REST API Gateway (60+ endpoints)
- `packages/router/src/Router.ts:25-866` - Central orchestrator
- `packages/router/src/services/AgentDelegator.ts:18-646` - Agent delegation with circuit breaker
- `packages/router/src/services/IntentClassifier.ts` - Intent classification

**Verified Against:**
- `docs/system/deployment_inventory.md:30,52`
- `docs/system/code_to_deployment_mapping.md:23-55`

### Agent Ecosystem (20+ Agents)

#### Content & Story Generation Agents

| Agent | Package Location | Lambda Function | Deployment Status | Code Reference |
|-------|------------------|-----------------|-------------------|----------------|
| **Content Agent** | `packages/content-agent/` | `storytailor-content-{ENV}` | ✅ Deployed (production, staging) | `packages/content-agent/src/ContentAgent.ts:1-1422` |
| **Character Agent** | `lambda-deployments/character-agent/` | `storytailor-character-agent-{ENV}` | ✅ Deployed (production, staging) | `lambda-deployments/character-agent/` (12 files) |
| **Library Agent** | `packages/library-agent/` | `storytailor-library-agent-{ENV}` | ✅ Deployed (production, staging) | `packages/library-agent/src/` |
| **Personality Agent** | `packages/personality-agent/` | `storytailor-personality-agent-{ENV}` | ⚠️ Staging only | `packages/personality-agent/src/` |

#### Intelligence & Understanding Agents

| Agent | Package Location | Lambda Function | Deployment Status | Code Reference |
|-------|------------------|-----------------|-------------------|----------------|
| **Emotion Agent** | `packages/emotion-agent/` | `storytailor-emotion-agent-{ENV}` | ✅ Deployed (production, staging) | `packages/emotion-agent/src/` |
| **Conversation Intelligence** | `packages/conversation-intelligence/` | `storytailor-conversation-intelligence-{ENV}` | ✅ Deployed (staging) | `packages/conversation-intelligence/src/` |
| **Analytics Intelligence** | `packages/analytics-intelligence/` | `storytailor-analytics-intelligence-{ENV}` | ✅ Deployed (staging) | `packages/analytics-intelligence/src/` |
| **Insights Agent** | `packages/insights-agent/` | `storytailor-insights-agent-{ENV}` | ✅ Deployed (staging) | `packages/insights-agent/src/` |
| **User Research Agent (Fieldnotes)** | `packages/user-research-agent/` | `storytailor-fieldnotes-api-{ENV}`, `storytailor-fieldnotes-scheduled-{ENV}` | ✅ Deployed (production) | `packages/user-research-agent/src/core/ResearchEngine.ts`, `packages/user-research-agent/src/lambda.ts`, `packages/user-research-agent/src/lambda-scheduled.ts` |
| **Kid Communication Intelligence** | `packages/kid-communication-intelligence/` | Unknown (feature flag) | ⚠️ Feature flag controlled | `packages/kid-communication-intelligence/src/` |

**Code Reference:**
- `packages/universal-agent/src/UniversalStorytellerAPI.ts:99-100` - Kid Intelligence feature flag check

#### Safety & Compliance Agents

| Agent | Package Location | Lambda Function | Deployment Status | Code Reference |
|-------|------------------|-----------------|-------------------|----------------|
| **Child Safety Agent** | `packages/child-safety-agent/` | `storytailor-child-safety-agent-{ENV}` | ✅ Deployed (production, staging) | `packages/child-safety-agent/src/` |
| **Content Safety** | `packages/content-safety/` | Unknown | ❌ Not deployed | `packages/content-safety/src/` |
| **Security Framework** | `packages/security-framework/` | `storytailor-security-framework-{ENV}` | ✅ Deployed (production, staging) | `packages/security-framework/src/` |

#### User & Identity Agents

| Agent | Package Location | Lambda Function | Deployment Status | Code Reference |
|-------|------------------|-----------------|-------------------|----------------|
| **Auth Agent** | `packages/auth-agent/` | `storytailor-auth-agent-{ENV}` | ✅ Deployed (production, staging) | `packages/auth-agent/src/auth-agent.ts:31-450+` |
| **IDP Agent** | `packages/idp-agent/` | `storytailor-idp-agent-{ENV}` | ✅ Deployed (production, staging) | `packages/idp-agent/src/` |

#### Specialized Domain Agents

| Agent | Package Location | Lambda Function | Deployment Status | Code Reference |
|-------|------------------|-----------------|-------------------|----------------|
| **Educational Agent** | `packages/educational-agent/` | `storytailor-educational-agent-{ENV}` | ✅ Deployed (production, staging) | `packages/educational-agent/src/EducationalAgent.ts:27-532` |
| **Therapeutic Agent** | `packages/therapeutic-agent/` | `storytailor-therapeutic-agent-{ENV}` | ✅ Deployed (production, staging) | `packages/therapeutic-agent/src/TherapeuticAgent.ts:26-` |
| **Knowledge Base Agent** | `packages/knowledge-base-agent/` | `storytailor-knowledge-base-{ENV}` | ⚠️ Staging only | `packages/knowledge-base-agent/src/KnowledgeBaseAgent.ts:400+` |
| **Accessibility Agent** | `packages/accessibility-agent/` | `storytailor-accessibility-agent-{ENV}` | ✅ Deployed (production, staging) | `packages/accessibility-agent/src/` |
| **Localization Agent** | `packages/localization-agent/` | `storytailor-localization-agent-{ENV}` | ✅ Deployed (production, staging) | `packages/localization-agent/src/LocalizationAgent.ts:20-411` |
| **Smart Home Agent** | `packages/smart-home-agent/` | `storytailor-smart-home-agent-{ENV}` | ✅ Deployed (staging) | `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:18-606` |
| **Commerce Agent** | `packages/commerce-agent/` | `storytailor-commerce-agent-{ENV}` | ✅ Deployed (production, staging) | `packages/commerce-agent/src/CommerceAgent.ts` |
| **Voice Synthesis Agent** | `packages/voice-synthesis/` | `storytailor-voice-synthesis-agent-{ENV}` | ✅ Deployed (production, staging) | `packages/voice-synthesis/src/` |

#### Infrastructure & Support Agents

| Agent | Package Location | Lambda Function | Deployment Status | Code Reference |
|-------|------------------|-----------------|-------------------|----------------|
| **Health Monitoring** | `packages/health-monitoring/` | `storytailor-health-monitoring-agent-{ENV}` | ✅ Deployed (production) | `packages/health-monitoring/src/` |
| **Event System** | `packages/event-system/` | `storytailor-event-system-{ENV}` | ✅ Deployed (production) | `packages/event-system/src/` |
| **Token Service** | `packages/token-service/` | `storytailor-token-service-{ENV}` | ✅ Deployed (staging) | `packages/token-service/src/TokenServiceAgent.ts:48-` |

**Verified Against:**
- `docs/system/deployment_inventory.md:26-80`
- `docs/AGENT_INDEX.md:1-93`

### SDKs and Client Libraries

| SDK | Package Location | Target Platform | Status | Code Reference |
|-----|------------------|-----------------|--------|----------------|
| **Web SDK** | `packages/web-sdk/` | Web (JavaScript) | ✅ Available | `packages/web-sdk/` |
| **Mobile SDK iOS** | `packages/mobile-sdk-ios/` | iOS (Swift) | ✅ Available | `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift` |
| **Mobile SDK Android** | `packages/mobile-sdk-android/` | Android (Kotlin) | ✅ Available | `packages/mobile-sdk-android/` |
| **React Native SDK** | `packages/mobile-sdk-react-native/` | React Native | ✅ Available | `packages/mobile-sdk-react-native/` |
| **Embeddable Widget** | `packages/storytailor-embed/` | Web (React) | ✅ Available | `packages/storytailor-embed/` |

**Code References:**
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift` - Main iOS SDK
- `packages/mobile-sdk-ios/Sources/APIClient.swift` - API client
- `packages/mobile-sdk-ios/Sources/VoiceProcessor.swift` - Voice processing

### Shared Libraries

| Library | Package Location | Purpose | Used By |
|---------|------------------|---------|---------|
| **Shared Types** | `packages/shared-types/` | Type definitions, gRPC schemas | All agents |
| **API Contract** | `packages/api-contract/` | API schemas (OpenAPI) | Universal Agent, SDKs |
| **UI Tokens** | `packages/ui-tokens/` | Design tokens | Web SDK, Widget |
| **Testing** | `packages/testing/` | Test utilities | All packages |
| **Performance Optimization** | `packages/performance-optimization/` | Performance utilities | Universal Agent, Router |
| **Monitoring** | `packages/monitoring/` | Monitoring utilities | All agents |

**Code References:**
- `packages/shared-types/src/index.ts:1-170` - Core type exports
- `packages/shared-types/src/types/` - Domain type definitions

## Infrastructure Components

### AWS Services

| Service | Purpose | Configuration | Status | Code Reference |
|---------|---------|---------------|--------|----------------|
| **AWS Lambda** | Function execution | 44 functions deployed | ✅ Active | `docs/system/deployment_inventory.md:24-80` |
| **AWS SSM Parameter Store** | Secrets and configuration | 50+ parameters | ✅ Active | `docs/system/ssm_parameters_inventory.md` |
| **AWS IAM** | Access control | `storytailor-lambda-role-{ENV}` | ✅ Active | `scripts/deploy-universal-agent-proper.sh:41` |
| **AWS S3** | Asset storage, Lambda deployments | `storytailor-lambda-deploys` bucket | ✅ Active | `scripts/deploy-universal-agent-proper.sh:567-575` |
| **AWS API Gateway** | HTTP API (if used) | Unknown | ⚠️ Unknown | Unknown |
| **AWS EventBridge** | Event-driven communication | Unknown | ⚠️ Unknown | Unknown |

**Verified Against:**
- `docs/system/deployment_inventory.md:81-187`
- `docs/system/ssm_parameters_inventory.md:24-220`

### Database (Supabase PostgreSQL)

| Component | Purpose | Status | Code Reference |
|-----------|---------|--------|----------------|
| **PostgreSQL Database** | Primary data store | ✅ Active | `supabase/migrations/` (26 files) |
| **Row Level Security (RLS)** | Data access control | ✅ Enabled on all tables | `supabase/migrations/20240101000001_rls_policies.sql` |
| **Database Tables** | Data storage | 120+ tables | `docs/system/database_schema_inventory.md:24-343` |
| **Migrations** | Schema management | 26 migration files | `supabase/migrations/*.sql` |

**Verified Against:**
- `docs/system/database_schema_inventory.md:24-343`
- `supabase/migrations/20240101000000_initial_schema.sql:1-166`

### Caching & State Management

| Component | Purpose | Status | Code Reference |
|-----------|---------|--------|----------------|
| **Redis** | State caching, rate limiting | ✅ Active | `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` |
| **Conversation States** | Conversation state storage | ✅ Active | `supabase/migrations/20240101000000_initial_schema.sql:124-132` |

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` - Redis rate limiting
- `packages/router/src/services/ConversationStateManager.ts` - State management

## External Service Integrations

### AI & Content Generation Services

| Service | Purpose | SSM Parameter | Status | Code Reference |
|---------|---------|---------------|--------|----------------|
| **OpenAI** | Story generation, content filtering | `/storytailor-{ENV}/openai/api-key` | ✅ Active | Used by Content Agent, Router |
| **Stability AI** | Image generation | `/storytailor-production/stability/api-key` | ✅ Active | `packages/content-agent/src/services/ArtGenerationService.ts` |
| **ElevenLabs** | Voice synthesis | `/storytailor-{ENV}/tts/elevenlabs/api-key` | ✅ Active | `packages/voice-synthesis/src/` |

**Verified Against:**
- `docs/system/ssm_parameters_inventory.md:78-88, 150-160`

### Voice & Avatar Services

| Service | Purpose | SSM Parameter | Status | Code Reference |
|---------|---------|---------------|--------|----------------|
| **ElevenLabs** | Voice synthesis | `/storytailor-{ENV}/tts/elevenlabs/api-key` | ✅ Active | `packages/voice-synthesis/src/` |
| **Hedra** | Avatar generation | `/storytailor-production/hedra/api-key` | ✅ Active | Unknown |
| **LiveKit** | Real-time video/audio | `/storytailor-production/livekit/url`, `/api-key`, `/api-secret` | ✅ Active | Unknown |

**Verified Against:**
- `docs/system/ssm_parameters_inventory.md:120-140`

### Payment & Commerce Services

| Service | Purpose | SSM Parameter | Status | Code Reference |
|---------|---------|---------------|--------|----------------|
| **Stripe** | Payment processing | `/storytailor-{ENV}/stripe/secret-key`, `/webhook-secret` | ✅ Active | `packages/commerce-agent/src/CommerceAgent.ts` |

**Verified Against:**
- `docs/system/ssm_parameters_inventory.md:140-155`

### Smart Home Services

| Service | Purpose | SSM Parameter | Status | Code Reference |
|---------|---------|---------------|--------|----------------|
| **Philips Hue** | Smart lighting | `/storytailor-{ENV}/hue/client-id`, `/client-secret`, `/redirect-uri` | ✅ Active | `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:18-606` |

**Code References:**
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:18-606` - Hue device manager
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:49-95` - Bridge discovery
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:100-` - Authentication

**Verified Against:**
- `docs/system/ssm_parameters_inventory.md:95-120`

### Communication Services

| Service | Purpose | SSM Parameter | Status | Code Reference |
|---------|---------|---------------|--------|----------------|
| **SendGrid** | Email delivery | Hardcoded in deployment | ✅ Active | `packages/universal-agent/src/` (EmailService) |

**Code References:**
- `scripts/deploy-universal-agent-proper.sh:592, 614` - SENDGRID_FROM_EMAIL hardcoded

### Database & Authentication Services

| Service | Purpose | SSM Parameter | Status | Code Reference |
|---------|---------|---------------|--------|----------------|
| **Supabase** | Database, authentication | `/storytailor-{ENV}/supabase/url`, `/service-key`, `/anon-key` | ✅ Active | All agents |

**Verified Against:**
- `docs/system/ssm_parameters_inventory.md:24-50`

## API Endpoints

### REST API Gateway

**Location:** `packages/universal-agent/src/api/RESTAPIGateway.ts:74-3511`

**Total Endpoints:** 60+ REST API endpoints

**Endpoint Groups:**
- Conversation: 8 endpoints (`/v1/conversation/*`)
- Stories: 6 endpoints (`/v1/stories/*`)
- Characters: 3 endpoints (`/v1/characters/*`)
- Auth: 5+ endpoints (`/v1/auth/*`)
- Smart Home: 3 endpoints (`/v1/smarthome/*`)
- Webhooks: 7 endpoints (`/v1/webhooks/*`)
- Analytics: 3 endpoints (`/v1/analytics/*`)
- Developer: 4 endpoints (`/developer/*`)
- Localization: 8 endpoints (`/v1/localization/*`)
- Therapeutic Groups: 13 endpoints (`/v1/therapeutic-groups/*`)
- Partner Integration: 9 endpoints (`/v1/partner/*`)

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:537-619` - Route setup
- `packages/universal-agent/src/api/RESTAPIGateway.ts:621-794` - Conversation routes
- `packages/universal-agent/src/api/RESTAPIGateway.ts:906-971` - Character routes

**Verified Against:**
- `docs/system/api_endpoints_inventory.md:24-360`

### GraphQL API

**Location:** `packages/universal-agent/src/api/RESTAPIGateway.ts:109`

**Status:** ✅ Implemented

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:109` - setupGraphQL method

### WebSocket API

**Location:** `packages/universal-agent/src/api/RESTAPIGateway.ts:110, 2507-2576`

**Status:** ✅ Implemented

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2507-2576` - WebSocket setup

### WebVTT API

**Location:** `packages/universal-agent/src/api/WebVTTRoutes.ts`

**Status:** ✅ Implemented (Phase 1)

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:1350-1357` - WebVTT route setup

## Data Models

### Core Domain Models

| Model | Location | Purpose | Code Reference |
|-------|----------|---------|----------------|
| **Story** | `packages/shared-types/src/types/story.ts` | Story data model | Shared types |
| **Character** | `packages/shared-types/src/types/character.ts` | Character data model | Shared types |
| **Library** | `packages/shared-types/src/types/library.ts` | Library data model | Shared types |
| **Emotion** | `packages/shared-types/src/types/emotion.ts` | Emotion tracking | Shared types |
| **Conversation** | `packages/shared-types/src/types/conversation.ts` | Conversation state | Shared types |
| **Intent** | `packages/router/src/types.ts:19-88` | Intent classification | `packages/router/src/types.ts:79-88` |

**Code References:**
- `packages/router/src/types.ts:1-273` - Router type definitions
- `packages/shared-types/src/index.ts:1-170` - Type exports

## Deployment Infrastructure

### Lambda Functions

**Total Deployed:** 44 functions
- **Production:** 17 functions
- **Staging:** 27 functions

**Runtime Distribution:**
- nodejs22.x: 39 functions
- nodejs20.x: 3 functions (legacy)
- nodejs18.x: 2 functions (legacy)

**Memory Distribution:**
- 1024 MB: 18 functions (complex agents)
- 512 MB: 20 functions (standard agents)
- 256 MB: 6 functions (lightweight agents)

**Verified Against:**
- `docs/system/deployment_inventory.md:81-187`

### Deployment Scripts

**Total Scripts:** 15+ deployment scripts found

**Pattern:** Most agents follow `scripts/deploy-{agent-name}.sh` pattern

**Missing Scripts:** 5 functions deployed but no deployment script found

**Verified Against:**
- `docs/system/code_to_deployment_mapping.md:23-353`
- `docs/system/gap_analysis.md:64-72`

### Environment Configuration

**Environments:**
- `production` - Production environment
- `staging` - Staging environment

**SSM Parameter Prefix:**
- Production: `/storytailor-production/`
- Staging: `/storytailor-staging/`

**Region:** `us-east-1` (default) ✅

**Note:** All production resources migrated from `us-east-2` to `us-east-1` on December 13, 2025. See [Region Migration Complete](./region-migration-complete.md) for details.

**Verified Against:**
- `docs/system/ssm_parameters_inventory.md:24-220`
- `scripts/deploy-universal-agent-proper.sh:40`

## Development Tools

| Tool | Location | Purpose | Status |
|------|----------|---------|--------|
| **Turbo** | Root `package.json` | Monorepo build system | ✅ Active |
| **TypeScript** | All packages | Type checking | ✅ Active |
| **Jest** | Test packages | Unit testing | ✅ Active |
| **ESLint** | Root config | Code linting | ✅ Active |
| **Prettier** | Root config | Code formatting | ✅ Active |

**Code References:**
- `package.json:9-41` - Scripts and dependencies
- `packages/universal-agent/package.json:7-15` - Package scripts

## Testing Infrastructure

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| **Unit Tests** | `packages/*/src/__tests__/` | Agent unit tests | ✅ Active |
| **Integration Tests** | `tests/` | Integration test suites | ✅ Active |
| **Test Utilities** | `packages/testing/` | Shared test utilities | ✅ Active |

## Documentation System

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| **Agent Documentation** | `docs/agents/` | 21 agent docs | ✅ Active |
| **Developer Documentation** | `docs/developer-docs/` | 46 comprehensive docs | ✅ Active |
| **API Documentation** | `docs/docs/API_DOCUMENTATION.md` | API reference | ✅ Active |
| **Platform Overview** | `docs/docs/PLATFORM_OVERVIEW.md` | Platform overview | ✅ Active |
| **System Documentation** | `docs/system/` | System-level docs | ✅ Active (Phase 0.5) |

**Verified Against:**
- `docs/system/recovery_notes.md:32-85`

## Summary Statistics

### Components

- **Total Agent Packages:** 30+ packages in `packages/`
- **Deployed Lambda Functions:** 44 functions
- **SDKs:** 5 SDKs (Web, iOS, Android, React Native, Embeddable Widget)
- **Shared Libraries:** 6 shared packages
- **Database Tables:** 120+ tables
- **API Endpoints:** 60+ REST endpoints, GraphQL, WebSocket, WebVTT
- **External Services:** 10+ integrated services
- **SSM Parameters:** 50+ parameters

### Deployment Status

- **Production Functions:** 17/17 active
- **Staging Functions:** 27/27 active
- **Deployment Scripts:** 15/44 functions have scripts
- **Runtime Versions:** 39/44 on nodejs22.x (89%)

### Code Coverage

- **Total Packages:** 30+ packages
- **Total Files:** 1000+ TypeScript files
- **Total Lines:** Estimated 50,000+ lines of code
- **Test Coverage:** Unknown (requires analysis)

## Gaps Identified

From Phase 0.5 gap analysis:

1. **Missing Deployment Scripts:** 5 functions deployed but no script found
2. **Missing Documentation:** 5 agents deployed but not documented
3. **Runtime Version Gaps:** 5 functions still on legacy runtimes
4. **Handler Paths Unknown:** 43/44 functions handler paths not verified
5. **Environment Variables Unknown:** 43/44 functions environment variables not fully documented

**Verified Against:**
- `docs/system/gap_analysis.md:22-209`

TAG: RISK  
TODO[DEVOPS]: Create missing deployment scripts for 5 functions  
TODO[ENGINEERING]: Document missing agents (character, health-monitoring, event-system, avatar, content-safety)  
TODO[DEVOPS]: Update legacy runtime versions to nodejs22.x  
TODO[DEVOPS]: Verify handler paths for all Lambda functions  
TODO[DEVOPS]: Document environment variables for all functions
