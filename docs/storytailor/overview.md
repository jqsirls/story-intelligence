Status: Draft  
Audience: Internal | Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 2 - Storytailor platform overview with code references

# Storytailor Platform Overview

## Executive Summary

Storytailor is a comprehensive platform that creates award-caliber stories for children using Story Intelligence™ - a system combining narrative mastery, child development expertise, and therapeutic insights. The platform operates through a multi-agent architecture deployed on AWS Lambda, with 30+ specialized agents working together to deliver stories across web, mobile, and voice platforms.

### Platform Statistics

- **30+ Specialized Agents**: All operational and bundled in Universal Agent
- **60+ API Endpoints**: REST, GraphQL, WebSocket, WebVTT
- **Multi-Platform Support**: Web, mobile (iOS/Android/React Native), voice (Alexa/Google/Apple)
- **Production Status**: ✅ Fully deployed and operational
- **Database**: Supabase (PostgreSQL) with 120+ tables
- **Infrastructure**: AWS Lambda (us-east-1), 35 production functions deployed
- **External Services**: 10+ integrated services (OpenAI, ElevenLabs, Stripe, Hue, etc.)

**Verified Against:**
- `docs/system/deployment_inventory.md:81-187` - Deployment statistics
- `docs/system/inventory.md:24-220` - Component inventory
- `docs/system/api_endpoints_inventory.md:24-360` - API endpoint count

## Core Platform Capabilities

### Story Creation

Storytailor enables users to create stories through multiple interaction modes:

1. **Conversational Story Creation**: Interactive dialogue-based story building
   - Character creation through conversation (`packages/content-agent/src/services/CharacterConversationManager.ts`)
   - Story type classification (`packages/content-agent/src/services/StoryTypeClassifier.ts:15-68`)
   - Story beat generation (`packages/content-agent/src/services/StoryCreationService.ts:83-100`)
   - Choose-your-adventure style continuation (`packages/content-agent/src/services/StoryCreationService.ts:83-100`)

2. **REST API Story Creation**: Programmatic story generation
   - `POST /v1/stories` endpoint (`packages/universal-agent/src/api/RESTAPIGateway.ts:825-848`)
   - Character and story type specification
   - Batch story generation support

3. **Voice-First Story Creation**: Voice platform integration
   - Alexa Skills integration (`packages/universal-agent/src/conversation/adapters/AlexaChannelAdapter.ts:7-441`)
   - Google Assistant support
   - Apple Siri integration

**Code References:**
- `packages/content-agent/src/ContentAgent.ts:34-1458` - Main Content Agent implementation
- `packages/content-agent/src/services/StoryCreationService.ts:46-78` - Story draft creation
- `packages/universal-agent/src/api/RESTAPIGateway.ts:621-794` - Conversation routes

### Story Types

The platform supports 11 story types, each optimized for specific use cases:

| Story Type | Purpose | Code Reference |
|------------|---------|----------------|
| **Adventure** | Action-packed journeys, quests, exploration | `packages/router/src/types.ts:4-16` |
| **Bedtime** | Calm, soothing stories for sleep time | `packages/content-agent/src/services/StoryTypeClassifier.ts:74-94` |
| **Birthday** | Celebration-themed stories for special occasions | `packages/content-agent/src/services/StoryTypeClassifier.ts:74-94` |
| **Educational** | Learning-focused stories that teach concepts | `packages/content-agent/src/services/StoryTypeClassifier.ts:74-94` |
| **Financial Literacy** | Money management and financial concepts | `packages/content-agent/src/services/StoryTypeClassifier.ts:74-94` |
| **Language Learning** | Stories that help learn new languages | `packages/content-agent/src/services/StoryTypeClassifier.ts:74-94` |
| **Medical Bravery** | Coping with medical procedures or health challenges | `packages/content-agent/src/services/StoryTypeClassifier.ts:74-94` |
| **Mental Health** | Emotional well-being and coping strategies | `packages/content-agent/src/services/StoryTypeClassifier.ts:74-94` |
| **Milestones** | Celebrating achievements and life transitions | `packages/content-agent/src/services/StoryTypeClassifier.ts:74-94` |
| **New Chapter Sequel** | Continuing stories from previous sessions | `packages/content-agent/src/services/StoryTypeClassifier.ts:74-94` |
| **Tech Readiness** | Technology concepts and digital literacy | `packages/content-agent/src/services/StoryTypeClassifier.ts:74-94` |

**Code References:**
- `packages/router/src/types.ts:4-16` - StoryType enum definition
- `packages/content-agent/src/services/StoryTypeClassifier.ts:15-68` - Story type classification logic
- `packages/content-agent/src/services/PromptSelector.ts:18-30` - Age-appropriate prompt selection

### Character Management

Characters are created and managed through the Character Agent:

- **Character Creation**: Interactive character building (`packages/content-agent/src/services/CharacterGenerationService.ts`)
- **Character Database**: Persistent character storage (`packages/content-agent/src/services/CharacterDatabaseService.ts`)
- **Character Consistency**: Maintains character traits across stories (`packages/content-agent/src/services/CharacterConsistencyManager.ts`)
- **Character Sharing**: Library-based character sharing (`packages/library-agent/src/LibraryAgent.ts:25-495`)

**Code References:**
- `packages/content-agent/src/services/CharacterGenerationService.ts` - Character generation
- `packages/content-agent/src/services/CharacterConversationManager.ts` - Conversation-based character creation
- `packages/universal-agent/src/api/RESTAPIGateway.ts:906-971` - Character API endpoints

### Library Management

Users can organize stories and characters into libraries:

- **Library CRUD Operations**: Create, read, update, delete libraries (`packages/library-agent/src/LibraryAgent.ts:52-95`)
- **Permission Management**: Share libraries with family members (`packages/library-agent/src/services/PermissionService.ts`)
- **Story Transfer**: Move stories between libraries (`packages/library-agent/src/LibraryAgent.ts:200-250`)
- **Library Insights**: Analytics and recommendations (`packages/library-agent/src/services/InsightsService.ts`)

**Code References:**
- `packages/library-agent/src/LibraryAgent.ts:52-95` - Library CRUD operations
- `packages/library-agent/src/services/PermissionService.ts` - Permission management
- `packages/universal-agent/src/api/RESTAPIGateway.ts:796-824` - Library API endpoints

## Platform Architecture

### Multi-Agent System

Storytailor uses a hub-and-spoke orchestration model:

1. **Universal Agent**: Central API gateway and orchestration layer
   - Location: `packages/universal-agent/`
   - Lambda Function: `storytailor-universal-agent-{ENV}`
   - Code: `packages/universal-agent/src/UniversalStorytellerAPI.ts:68-863`

2. **Router**: Intent classification and agent delegation
   - Location: `packages/router/`
   - Code: `packages/router/src/Router.ts:25-866`
   - Intent Classification: `packages/router/src/services/IntentClassifier.ts:43-95`
   - Agent Delegation: `packages/router/src/services/AgentDelegator.ts:36-100`

3. **Specialized Agents**: 30+ domain-specific agents
   - Content Agent: Story and character creation (`packages/content-agent/src/ContentAgent.ts:34-1458`)
   - Emotion Agent: Emotional check-ins and pattern detection
   - Library Agent: Story library management (`packages/library-agent/src/LibraryAgent.ts:25-495`)
   - Auth Agent: Authentication and authorization (`packages/auth-agent/src/auth-agent.ts:31-450+`)
   - And 26+ more specialized agents

**Verified Against:**
- `docs/system/architecture.md:24-200` - Architecture diagrams
- `docs/system/inventory.md:24-150` - Agent inventory

### Data Flow

1. **Request Reception**: REST API Gateway receives request (`packages/universal-agent/src/api/RESTAPIGateway.ts:74-3511`)
2. **Authentication**: JWT or API key validation (`packages/universal-agent/src/api/RESTAPIGateway.ts:320-536`)
3. **Intent Classification**: Router classifies user intent (`packages/router/src/services/IntentClassifier.ts:43-95`)
4. **Agent Delegation**: Router delegates to appropriate agent (`packages/router/src/services/AgentDelegator.ts:36-100`)
5. **Agent Processing**: Specialized agent processes request
6. **Data Persistence**: Results stored in Supabase (`supabase/migrations/`)
7. **Response Formation**: Formatted response returned to client

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` - Authentication middleware
- `packages/router/src/Router.ts:100-200` - Request processing flow
- `packages/router/src/services/AgentDelegator.ts:36-100` - Agent delegation

## Integration Points

### REST API

**Base URL:** `https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging` (staging)

**Authentication:**
- JWT tokens: `Authorization: Bearer <token>`
- API keys: `Authorization: Bearer <api-key>`

**Key Endpoints:**
- `POST /v1/stories` - Create story (`packages/universal-agent/src/api/RESTAPIGateway.ts:825-848`)
- `GET /v1/stories/:id` - Get story (`packages/universal-agent/src/api/RESTAPIGateway.ts:850-875`)
- `POST /v1/characters` - Create character (`packages/universal-agent/src/api/RESTAPIGateway.ts:906-971`)
- `GET /v1/libraries` - List libraries (`packages/universal-agent/src/api/RESTAPIGateway.ts:796-824`)
- `POST /v1/conversation/start` - Start conversation (`packages/universal-agent/src/api/RESTAPIGateway.ts:621-794`)

**Verified Against:**
- `docs/system/api_endpoints_inventory.md:24-360` - Complete endpoint inventory
- `packages/universal-agent/src/api/RESTAPIGateway.ts:537-619` - Route setup

### GraphQL API

**Endpoint:** `/graphql` (configured in RESTAPIGateway)

**Status:** ✅ Implemented

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:109` - GraphQL setup method

### WebSocket API

**Endpoint:** WebSocket connection for real-time communication

**Status:** ✅ Implemented

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2507-2576` - WebSocket setup

### Webhooks

**Webhook Management:**
- `POST /v1/webhooks` - Create webhook (`packages/universal-agent/src/api/RESTAPIGateway.ts:2705-2750`)
- `GET /v1/webhooks` - List webhooks (`packages/universal-agent/src/api/RESTAPIGateway.ts:2752-2780`)
- `DELETE /v1/webhooks/:id` - Delete webhook (`packages/universal-agent/src/api/RESTAPIGateway.ts:2782-2805`)

**Webhook Delivery:**
- HMAC signature generation (`packages/universal-agent/src/api/RESTAPIGateway.ts:2782-2787`)
- Retry logic with exponential backoff (`packages/universal-agent/src/api/RESTAPIGateway.ts:2608-2703`)
- Delivery status tracking (`supabase/migrations/20240101000018_api_keys_and_webhooks.sql:73-120`)

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2608-2703` - Webhook delivery system
- `supabase/migrations/20240101000018_api_keys_and_webhooks.sql:73-120` - Webhook tables

## Platform Features

### Multi-Channel Support

Storytailor supports multiple interaction channels:

1. **Web Chat**: Browser-based chat interface
   - Adapter: `packages/universal-agent/src/conversation/adapters/WebChatChannelAdapter.ts:7-517`
   - Features: Markdown support, file uploads, voice input

2. **Voice Platforms**: Alexa, Google Assistant, Apple Siri
   - Alexa Adapter: `packages/universal-agent/src/conversation/adapters/AlexaChannelAdapter.ts:7-441`
   - SSML optimization for voice delivery
   - Voice-specific response formatting

3. **Mobile Apps**: iOS, Android, React Native
   - SDKs: `packages/mobile-sdk-ios/`, `packages/mobile-sdk-android/`, `packages/mobile-sdk-react-native/`
   - Offline support, push notifications

4. **REST API**: Direct API integration
   - Full API access for programmatic integration
   - API key management (`packages/universal-agent/src/api/RESTAPIGateway.ts:2995-3230`)

**Code References:**
- `packages/universal-agent/src/conversation/UniversalConversationEngine.ts:247-1649` - Universal conversation engine
- `packages/universal-agent/src/conversation/adapters/` - Channel adapters

### Smart Home Integration

**Philips Hue Integration:**
- Bridge discovery (`packages/smart-home-agent/src/devices/PhilipsHueManager.ts:49-95`)
- Device authentication (`packages/smart-home-agent/src/devices/PhilipsHueManager.ts:100-`)
- Lighting orchestration for narrative experiences
- API endpoints: `POST /v1/smarthome/connect`, `POST /v1/smarthome/control` (`packages/universal-agent/src/api/RESTAPIGateway.ts:1079-1131`)

**Code References:**
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:18-606` - Hue device manager
- `packages/universal-agent/src/api/RESTAPIGateway.ts:1079-1131` - Smart home routes

### Content Safety

**Multi-Layer Safety:**
- Content moderation (`packages/content-agent/src/services/ContentModerator.ts`)
- Age-appropriate filtering (`packages/content-agent/src/services/PromptSelector.ts:35-89`)
- Crisis detection (`packages/child-safety-agent/src/`)
- Bias detection and mitigation

**Code References:**
- `packages/content-agent/src/services/ContentModerator.ts` - Content moderation
- `packages/content-agent/src/services/PromptSelector.ts:35-89` - Age-appropriate constraints

## Technology Stack

### Runtime & Language

- **Primary Runtime**: Node.js 22.x (39/44 functions)
- **Language**: TypeScript (all packages)
- **Framework**: Express.js (`packages/universal-agent/src/api/RESTAPIGateway.ts`)

### Database

- **Primary Database**: Supabase (PostgreSQL 15)
- **Tables**: 120+ tables with Row Level Security enabled
- **Migrations**: 26 migration files (`supabase/migrations/`)

### Caching

- **Redis**: State caching and rate limiting
- **Usage**: Conversation state, rate limiting, session management
- **Code**: `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253`

### External Services

| Service | Purpose | Code Reference |
|---------|---------|----------------|
| **OpenAI** | Story generation, content filtering | Content Agent, Router |
| **ElevenLabs** | Voice synthesis | Voice Synthesis Agent |
| **Stripe** | Payment processing | Commerce Agent |
| **Supabase** | Database and authentication | All agents |
| **Redis** | Caching and state management | Universal Agent, Router |
| **Philips Hue** | Smart lighting | Smart Home Agent |
| **Stability AI** | Image generation | Content Agent |
| **SendGrid** | Email delivery | Auth Agent |

**Verified Against:**
- `docs/system/inventory.md:220-280` - External service inventory
- `docs/system/ssm_parameters_inventory.md:78-220` - Service configuration

## Deployment

### Infrastructure

- **Platform**: AWS Lambda
- **Region**: us-east-1 ✅ (migrated December 13, 2025)
- **Functions Deployed**: 44 (17 production, 27 staging)
- **Runtime Distribution**: 39 nodejs22.x, 3 nodejs20.x, 2 nodejs18.x

### Configuration Management

- **SSM Parameter Store**: 50+ parameters for secrets and configuration
- **Environment Variables**: Retrieved from SSM at deployment time
- **Deployment Scripts**: 15+ deployment scripts in `scripts/`

**Verified Against:**
- `docs/system/deployment_inventory.md:24-187` - Deployment inventory
- `docs/system/ssm_parameters_inventory.md:24-220` - SSM parameters

## Security & Compliance

### Authentication

- **JWT Tokens**: User authentication (`packages/universal-agent/src/api/RESTAPIGateway.ts:320-536`)
- **API Keys**: Programmatic access with hashed storage (`supabase/migrations/20240101000018_api_keys_and_webhooks.sql:5-56`)
- **OAuth**: Support for OAuth-based integrations (`packages/universal-agent/src/api/RESTAPIGateway.ts:2283-2315`)

### Data Protection

- **Row Level Security**: Enabled on all database tables
- **API Key Hashing**: Secure storage using key_hash (`supabase/migrations/20240101000018_api_keys_and_webhooks.sql:57-72`)
- **Webhook HMAC**: Signature verification for webhook delivery (`packages/universal-agent/src/api/RESTAPIGateway.ts:2782-2787`)
- **Encryption**: SSM SecureString parameters for sensitive data

### Compliance

- **COPPA Compliance**: Age verification, parent consent workflows
- **GDPR Compliance**: Data minimization, privacy controls
- **Content Safety**: Multi-layer content moderation
- **Crisis Detection**: Automatic detection and intervention

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` - Authentication middleware
- `supabase/migrations/20240101000018_api_keys_and_webhooks.sql:5-56` - API key schema
- `packages/child-safety-agent/src/` - Child safety implementation

## Platform Status

### Production Readiness

✅ **Fully Operational**
- All core agents deployed
- 60+ API endpoints functional
- Multi-platform support active
- Database schema complete
- External integrations operational

### Known Gaps

From Phase 0.5 gap analysis:
- 5 functions deployed but no deployment script found
- 5 agents deployed but not documented
- 5 functions still on legacy runtimes (nodejs18.x, nodejs20.x)

**Verified Against:**
- `docs/system/gap_analysis.md:22-209` - Gap analysis

TAG: RISK  
TODO[DEVOPS]: Create missing deployment scripts  
TODO[ENGINEERING]: Document missing agents  
TODO[DEVOPS]: Update legacy runtime versions
