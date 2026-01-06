# Storytailor Platform Overview - Complete System Documentation

**Last Updated**: December 10, 2025  
**Audience**: All Teams (Internal & External)  
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Architecture](#platform-architecture)
3. [Story Intelligence™](#story-intelligencetm)
4. [Multi-Agent System](#multi-agent-system)
5. [API & Integration](#api--integration)
6. [Developer Features](#developer-features)
7. [Safety & Compliance](#safety--compliance)
8. [Production Infrastructure](#production-infrastructure)
9. [Testing & Quality Assurance](#testing--quality-assurance)
10. [Support & Resources](#support--resources)

---

## 🎯 Executive Summary

**Storytailor** is a comprehensive AI-powered platform that creates personalized, award-caliber stories for children using **Story Intelligence™** - a unique combination of narrative mastery, child development expertise, and therapeutic insights.

### Key Metrics
- **30+ Specialized Agents**: All operational and bundled
- **50+ API Endpoints**: REST, GraphQL, WebSocket
- **Multi-Platform**: Web, mobile, voice (Alexa, Google, Apple)
- **Production Status**: ✅ Fully deployed and operational
- **Database**: Supabase (PostgreSQL) with 45+ tables
- **Infrastructure**: AWS Lambda (us-east-1)

### Recent Updates (December 2025)
- ✅ **API Key Management**: Database-backed with secure hashing
- ✅ **Webhook System**: Real-time events with retry logic
- ✅ **Developer Dashboard**: Analytics and usage metrics
- ✅ **Database Migration**: Complete schema deployed

---

## 🏗️ Platform Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│              Universal Agent (Lambda)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ REST API     │  │ GraphQL API  │  │ WebSocket    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Router (Intent Classification)       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ Auth │ │Content│ │Emotion│ │Library│ │Commerce│     │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘          │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │    30+ Specialized Agents (All Bundled)          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │Supabase │          │  Redis  │          │ External│
    │(Postgres)│         │  Cache  │          │ Services│
    └─────────┘          └─────────┘          └─────────┘
```

### Technology Stack

| Component | Technology | Status |
|-----------|-----------|--------|
| **Runtime** | Node.js 22.x | ✅ Production |
| **Language** | TypeScript | ✅ Production |
| **Framework** | Express.js | ✅ Production |
| **Database** | Supabase (PostgreSQL 15) | ✅ Production |
| **Cache** | Redis Cloud | ✅ Production |
| **Deployment** | AWS Lambda | ✅ Production |
| **Region** | us-east-1 | ✅ Production |
| **Authentication** | JWT + Supabase Auth | ✅ Production |
| **Email** | SendGrid | ✅ Production |
| **Payments** | Stripe | ✅ Production |
| **AI/ML** | OpenAI GPT-4 | ✅ Production |
| **Voice** | ElevenLabs | ✅ Production |

---

## 🎨 Story Intelligence™

Story Intelligence™ is Storytailor's proprietary system that combines four pillars of intelligence to create award-caliber stories.

### 1. Narrative Intelligence

**Capabilities:**
- **Hero's Journey Mastery**: Complete narrative arc structure
- **Character Arc Perfection**: Dynamic character development
- **Emotional Rhythm & Pacing**: Age-appropriate story flow
- **Literary Device Integration**: Metaphor, symbolism, foreshadowing
- **Symbolic Language Weaving**: Deep narrative layers
- **Universal Theme Resonance**: Timeless story quality

**Implementation:**
- Content Agent orchestrates narrative structure
- Pulitzer-quality standards enforced
- Award-caliber storytelling techniques

### 2. Developmental Intelligence

**Capabilities:**
- **Cognitive Development Stages**: Age-specific content (0-10+)
- **Emotional Processing Capacity**: Adaptive emotional complexity
- **Language Comprehension Levels**: Age-appropriate vocabulary
- **Attention Span Optimization**: Story length adaptation
- **Learning Style Preferences**: Personalized learning paths
- **Therapeutic Timing Sensitivity**: Mental health awareness

**Implementation:**
- Kid Communication Intelligence System
- 11 specialized components for child understanding
- Age-specific prompts and constraints

### 3. Personal Intelligence

**Capabilities:**
- **Individual Personality Traits**: Character personalization
- **Family Relationship Dynamics**: Context-aware stories
- **Cultural Background Nuances**: Culturally sensitive content
- **Personal Interests & Passions**: Interest-based stories
- **Emotional Needs & Triggers**: Therapeutic story elements
- **Growth Edge Opportunities**: Developmental support

**Implementation:**
- Personality Agent for consistency
- Localization Agent for cultural adaptation
- Emotion Agent for emotional intelligence

### 4. Literary Excellence

**Capabilities:**
- **Award-Caliber Storytelling**: Pulitzer-quality standards
- **Publishing Standards**: Professional-grade content
- **Timeless Quality**: Enduring story value
- **Age-Specific Excellence**: All ages 0-10+ supported

**Implementation:**
- Content Agent enforces quality standards
- Multi-stage review and refinement
- Professional editing techniques

---

## 🤖 Multi-Agent System

### Core Orchestration Agents

#### 1. Universal Agent ✅ **DEPLOYED**
- **Function**: Central API Gateway & Orchestration
- **Status**: ✅ Production (`storytailor-universal-agent-production`)
- **Location**: `packages/universal-agent/`
- **Capabilities**:
  - REST API Gateway (50+ endpoints)
  - GraphQL API
  - WebSocket support
  - Multi-platform support
  - Session management
  - API key & webhook management

#### 2. Router ✅ **BUNDLED**
- **Function**: Intent classification & agent delegation
- **Status**: ✅ Bundled in Universal Agent
- **Location**: `packages/router/`
- **Capabilities**:
  - Intent classification
  - Agent delegation
  - Circuit breaker pattern
  - Parallel processing
  - Conversation continuity

#### 3. Kid Communication Intelligence ✅ **ENABLED**
- **Function**: Enhanced child speech understanding
- **Status**: ✅ Enabled (`ENABLE_KID_INTELLIGENCE=true`)
- **Location**: `packages/kid-communication-intelligence/`
- **Components** (11 total):
  - Audio Intelligence
  - Test-Time Adaptation
  - Multimodal Interpretation
  - Developmental Processing
  - Invented Word Intelligence
  - Child Logic Interpreter
  - Emotional Speech Intelligence
  - Adaptive Transcription
  - Continuous Personalization
  - Confidence System
  - Transcription Service

### Specialized Domain Agents

#### Content & Story Generation
- **Content Agent**: Story & character creation, content moderation
- **Storytailor Agent**: Main story generation orchestrator
- **Library Agent**: Story library management, organization, sharing

#### Intelligence & Understanding
- **Emotion Agent**: Emotional intelligence, check-ins, pattern detection
- **Conversation Intelligence**: Advanced NLU, contextual memory
- **Analytics Intelligence**: Privacy-preserving analytics
- **Insights Agent**: User insights, recommendations

#### Safety & Compliance
- **Child Safety Agent**: Crisis detection, mandatory reporting
- **Content Safety**: Content moderation, bias detection

#### User & Identity
- **Auth Agent**: Authentication, authorization, email verification
- **IDP Agent**: Identity provider integration

#### Specialized Domains
- **Personality Agent**: Brand voice, character personality
- **Educational Agent**: Classroom tools, assessments
- **Therapeutic Agent**: Mental health support
- **Knowledge Base Agent**: Platform guidance
- **Accessibility Agent**: Inclusive design
- **Localization Agent**: Multi-language support
- **Smart Home Agent**: IoT integration
- **Commerce Agent**: Stripe subscriptions, payments

**Total**: 20+ specialized agents, all bundled and operational

---

## 🔌 API & Integration

### API Gateway

**Base URL:**
```
https://c3aaj6avg4odmlb6orgj5k7myu0squts.lambda-url.us-east-1.on.aws/v1
```

### API Categories

#### 1. Authentication API
- User registration
- Login/logout
- Email verification
- Token management
- Account linking

#### 2. Story Management API
- Create, read, update, delete stories
- Story library organization
- Story sharing and transfer
- Story publishing

#### 3. Character Management API
- Create, read, update, delete characters
- Character personalization
- Character library

#### 4. Conversation API
- Start conversation sessions
- Send messages
- Stream responses (SSE)
- Voice input processing
- Batch processing

#### 5. Smart Home API
- Device connection
- Device control
- IoT integration

#### 6. Analytics API
- Usage analytics
- Story analytics
- User analytics
- Conversation analytics

#### 7. Developer API ✅ **NEW**
- API key management
- Webhook management
- Developer dashboard
- Usage metrics

### Integration Methods

1. **REST API**: Standard HTTP/REST endpoints
2. **GraphQL**: Flexible query language
3. **WebSocket**: Real-time bidirectional communication
4. **Webhooks**: Event-driven notifications
5. **SDK**: (Coming soon) Official SDKs for popular languages

---

## 🛠️ Developer Features

### API Key Management ✅ **NEW**

**Features:**
- Secure key generation (prefix + hash storage)
- SHA-256 hashing (never store plaintext)
- Rate limiting per key
- Expiration dates
- Usage tracking (`last_used_at`)
- Immediate revocation

**Endpoints:**
- `POST /v1/developer/api-keys` - Create API key
- `GET /v1/developer/api-keys` - List API keys
- `DELETE /v1/developer/api-keys/:keyId` - Revoke API key

**Security:**
- Keys stored as hashes in database
- Full key only shown once on creation
- Row-level security (users only see their keys)
- Service role has full access

### Webhook System ✅ **NEW**

**Features:**
- Real-time event notifications
- Automatic retry with exponential backoff
- HMAC signature verification
- Configurable retry policies
- Custom headers support
- Full delivery history tracking
- Timeout configuration

**Endpoints:**
- `POST /v1/webhooks` - Create webhook
- `GET /v1/webhooks` - List webhooks
- `GET /v1/webhooks/:webhookId/deliveries` - Delivery history
- `PUT /v1/webhooks/:webhookId` - Update webhook
- `DELETE /v1/webhooks/:webhookId` - Delete webhook
- `POST /v1/webhooks/:webhookId/test` - Test webhook

**Events:**
- `story.created`, `story.updated`, `story.deleted`
- `character.created`, `character.updated`
- `conversation.started`, `conversation.message`, `conversation.ended`
- `webhook.test` (for testing)
- `*` (all events)

**Delivery:**
- HTTP POST to webhook URL
- `X-Storytailor-Signature` header (HMAC)
- Automatic retries on failure
- Delivery status tracked in database

### Developer Dashboard

**Endpoint:** `GET /v1/developer/dashboard`

**Returns:**
- API keys (with usage stats)
- Webhooks (with delivery status)
- Usage analytics
- Request metrics
- Error rates
- Top endpoints

---

## 🛡️ Safety & Compliance

### COPPA Compliance ✅
- Age verification
- Parent consent workflows
- Data minimization
- Privacy-preserving analytics
- Secure data storage

### Content Safety ✅
- Content moderation
- Bias detection
- Quality validation
- Age-appropriate filtering

### Crisis Detection ✅
- Distress pattern recognition
- Mandatory reporting
- Parent notifications
- Emergency intervention

### Security ✅
- JWT authentication
- API key security (hashed storage)
- Webhook HMAC signatures
- Row-level security (RLS)
- Rate limiting
- Input validation

---

## 🏭 Production Infrastructure

### AWS Lambda
- **Function**: `storytailor-universal-agent-production`
- **Region**: us-east-1
- **Runtime**: Node.js 22.x
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Status**: ✅ Active

### Database (Supabase)
- **Type**: PostgreSQL 15
- **Tables**: 45+ tables
- **Migrations**: 21+ migrations
- **RLS**: Enabled on all user tables
- **Status**: ✅ Operational

### External Services
- **Supabase**: Database & Auth ✅
- **Redis**: Caching & Sessions ✅
- **SendGrid**: Email ✅
- **Stripe**: Payments ✅
- **OpenAI**: AI/ML ✅
- **ElevenLabs**: Voice Synthesis ✅

### Monitoring
- CloudWatch Logs
- Lambda metrics
- Error tracking
- Performance monitoring

---

## 🧪 Testing & Quality Assurance

### Testing Resources
- [Testing Guide](./TESTING_GUIDE.md) - Comprehensive manual testing procedures
- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Developer Guide](./DEVELOPER_GUIDE.md) - Technical implementation guide

### Test Coverage
- ✅ Unit tests for core components
- ✅ Integration tests for API endpoints
- ✅ Manual testing procedures documented
- ✅ Database verification scripts

### Quality Assurance
- TypeScript for type safety
- Input validation (Joi schemas)
- Error handling and logging
- Security best practices

---

## 📚 Documentation Structure

### By Audience

**Developers:**
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [MCP Setup](./MCP_SETUP.md)

**Product Managers:**
- [Product Overview](./product-overview.md)
- [Feature Status](./FEATURE_STATUS.md)
- [User Stories](./USER_STORIES.md)

**Designers:**
- [Design System](../design/design-system.md)
- [UX Guide](../design/ux-guide.md)
- [Brand Guidelines](../design/brand-guidelines.md)

**Business Teams:**
- [Sales Playbook](../sales/sales-playbook.md)
- [Marketing Overview](../marketing/marketing-overview.md)
- [Finance Pricing](../finance/finance-pricing.md)

### By Topic

**Platform:**
- [Platform Overview](./platform-overview.md) (this document)
- [Product Overview](./product-overview.md)
- [Agent Index](../AGENT_INDEX.md)

**Technical:**
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)

**Testing:**
- [Testing Guide](./TESTING_GUIDE.md)

---

## 🚀 Quick Start Guides

### For Developers
1. Read [Developer Guide](./DEVELOPER_GUIDE.md)
2. Review [API Documentation](./API_DOCUMENTATION.md)
3. Follow [Testing Guide](./TESTING_GUIDE.md)
4. Check [Integration Guide](./INTEGRATION_GUIDE.md)

### For Product Teams
1. Read [Product Overview](./PRODUCT_OVERVIEW.md)
2. Review [Feature Status](./FEATURE_STATUS.md)
3. Check [User Stories](./USER_STORIES.md)

### For Business Teams
1. Review [Sales Playbook](../sales/sales-playbook.md)
2. Check [Marketing Overview](../marketing/marketing-overview.md)
3. Review [Finance Pricing](./FINANCE_PRICING.md)

---

## 📊 System Status

### Production Readiness: ✅ **READY**

**Verified:**
- ✅ Database migration completed (3 tables, 6 functions, 2 triggers, 11 indexes, 3 policies)
- ✅ Code deployed to production Lambda
- ✅ Environment variables configured
- ✅ Health check responding
- ✅ API endpoints operational
- ✅ Authentication working
- ✅ API key management functional
- ✅ Webhook system operational

### Deployment Status
- **Universal Agent**: ✅ Deployed (`storytailor-universal-agent-production`)
- **Database Schema**: ✅ Migrated
- **External Services**: ✅ Connected
- **Monitoring**: ✅ Active

---

## 🔗 Key Resources

### Documentation
- [Documentation Index](./DOCUMENTATION_INDEX.md)
- [Agent Index](../AGENT_INDEX.md)
- [Production Readiness](../PRODUCTION_READINESS.md)

### External
- [Supabase Dashboard](https://app.supabase.com/project/lendybmmnlqelrhkhdyc)
- [AWS Lambda Console](https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions/storytailor-universal-agent-production)

---

## 📞 Support

### Technical Support
- **Developer Questions**: See [Developer Guide](./DEVELOPER_GUIDE.md)
- **API Questions**: See [API Documentation](./API_DOCUMENTATION.md)
- **Integration Help**: See [Integration Guide](./INTEGRATION_GUIDE.md)

### Testing Support
- **Manual Testing**: See [Testing Guide](./TESTING_GUIDE.md)
- **Test Scenarios**: Comprehensive scenarios documented

---

**Last Updated**: December 10, 2025  
**Status**: ✅ Production Ready - All Systems Operational
