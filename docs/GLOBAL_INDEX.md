Status: Complete  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-14  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: GLOBAL_INDEX_001  
Notes: Complete global documentation index - all files indexed, audited, and organized with standardized naming

# Storytailor Global Documentation Index

## Overview

This is the master index for all Storytailor and Story Intelligence™ documentation. All documentation is verified against actual code, database schemas, and deployment configurations.

**Last Updated:** 2025-12-14  
**Total Documentation Files:** 460+  
**Verification Status:** ✅ All documents include code references  
**Region:** us-east-1 (all production resources)  
**Documentation Status:** ✅ Complete - All phases completed, audit complete, naming standardized  
**Audit Status:** ✅ Complete - All dates, regions, references, and links verified (2025-12-14)  
**Naming Standard:** ✅ All files follow standardized naming conventions (UPPERCASE for root canonical docs, kebab-case for subdirectories)

## Documentation Structure

### System Documentation

**Location:** `docs/system/`

1. **[System Inventory](./system/inventory.md)**
   - Complete system inventory
   - Lambda functions, SSM parameters, database, services
   - Verification Status: ✅ Verified

2. **[System Architecture](./system/architecture.md)**
   - Complete system architecture
   - Mermaid diagrams, data flows, component interactions
   - Verification Status: ✅ Verified

3. **[API Endpoints Inventory](./system/api-endpoints-inventory.md)**
   - Complete API endpoint reference
   - 60+ REST API endpoints
   - Verification Status: ✅ Verified

4. **[Database Schema Inventory](./system/database-schema-inventory.md)**
   - Complete database schema reference
   - 120+ tables, indexes, RLS policies
   - Verification Status: ✅ Verified

5. **[Deployment Inventory](./system/deployment-inventory.md)**
   - Lambda function deployment status
   - 44 functions (17 production, 27 staging)
   - Verification Status: ✅ Verified

6. **[SSM Parameters Inventory](./system/ssm-parameters-inventory.md)**
   - Complete SSM parameter reference
   - 50+ parameters
   - Verification Status: ✅ Verified

7. **[Code to Deployment Mapping](./system/code-to-deployment-mapping.md)**
   - Code package to Lambda function mapping
   - Verification Status: ✅ Verified

8. **[Gap Analysis](./system/gap_analysis.md)**
   - Missing features and implementation gaps
   - Verification Status: ✅ Verified

9. **[Recovery Notes](./system/recovery_notes.md)**
   - Repository recovery and verification notes
   - Verification Status: ✅ Verified

### Storytailor Core Documentation

**Location:** `docs/storytailor/`

1. **[Storytailor Overview](./storytailor/overview.md)**
   - Platform overview and capabilities
   - Story types, character management, library management
   - Verification Status: ✅ Verified

2. **[Platform Overview](./storytailor/platform-overview.md)**
   - Production platform documentation
   - Complete platform capabilities and features
   - Verification Status: ✅ Verified

3. **[Product Overview](./storytailor/product-overview.md)**
   - Product features and capabilities
   - Target users, use cases, pricing tiers
   - Verification Status: ✅ Verified

4. **[Internal Architecture](./storytailor/internal-architecture.md)**
   - Internal system architecture
   - Multi-agent system, data flows, safety-first design
   - Verification Status: ✅ Verified

5. **[Partner Integration](./storytailor/partner-integration.md)**
   - Partner integration guide
   - Authentication, APIs, SDKs, webhooks
   - Verification Status: ✅ Verified

### Story Intelligence Documentation

**Location:** `docs/story-intelligence/`

1. **[Story Intelligence Overview](./story-intelligence/overview.md)**
   - Story Intelligence™ system overview
   - Four pillars (Narrative, Developmental, Personal, Literary Excellence)
   - Verification Status: ✅ Verified

2. **[Story Intelligence Architecture](./story-intelligence/architecture.md)**
   - Technical architecture
   - Multi-agent implementation, prompt engineering
   - Verification Status: ✅ Verified

3. **[Story Intelligence Partner API](./story-intelligence/partner-api.md)**
   - Partner API documentation
   - API endpoints, authentication, usage examples
   - Verification Status: ✅ Verified

4. **[Story Intelligence Complete](./story-intelligence/story-intelligence-complete.md)**
   - Complete Story Intelligence documentation
   - Comprehensive system documentation
   - Verification Status: ✅ Verified

### User Journey Documentation

**Location:** `docs/user-journeys/`

1. **[REST API Journey](./user-journeys/rest-api.md)**
   - REST API conversation flow
   - Code references with line numbers
   - Verification Status: ✅ Verified

2. **[Audio Conversational Journey](./user-journeys/audio-conversational.md)**
   - Voice input/output flow
   - Code references with line numbers
   - Verification Status: ✅ Verified

3. **[Video Conversational Journey](./user-journeys/video-conversational.md)**
   - Video generation flow
   - Code references with line numbers
   - Verification Status: ✅ Verified

4. **[Video with Live Avatar Journey](./user-journeys/video-live-avatar.md)**
   - Live avatar interaction flow
   - Code references with line numbers
   - Verification Status: ✅ Verified

5. **[Cross-Journey Comparison](./user-journeys/cross-journey-comparison.md)**
   - Comparison of all user journeys
   - Verification Status: ✅ Verified

### Prompts Library

**Location:** `docs/prompts-library/`

1. **[Prompts Library README](./prompts-library/README.md)**
   - Prompts library index
   - Verification Status: ✅ Verified

2. **[Conversation Prompts](./prompts-library/conversation.md)**
   - Conversation prompts extracted from code
   - Verification Status: ✅ Verified

3. **[Content Generation Prompts](./prompts-library/content-generation.md)**
   - Story generation prompts
   - Verification Status: ✅ Verified

4. **[Visual Generation Prompts](./prompts-library/visual-generation.md)**
   - Image generation prompts
   - Verification Status: ✅ Verified

5. **[Voice Generation Prompts](./prompts-library/voice-generation.md)**
   - Voice synthesis prompts
   - Verification Status: ✅ Verified

6. **[Safety Prompts](./prompts-library/safety.md)**
   - Safety and moderation prompts
   - Verification Status: ✅ Verified

7. **[Orchestration Prompts](./prompts-library/orchestration.md)**
   - Router and orchestration prompts
   - Verification Status: ✅ Verified

### Platform Documentation

**Location:** `docs/platform/`

1. **[Platform README](./platform/README.md)**
   - Platform documentation index
   - Verification Status: ✅ Verified

2. **[MCP Server](./platform/mcp/overview.md)**
   - Model Context Protocol server
   - Verification Status: ✅ Verified

3. **[A2A Protocol](./platform/a2a/overview.md)**
   - Agent-to-Agent protocol
   - Verification Status: ✅ Verified

4. **[SDKs README](./platform/sdks/README.md)**
   - SDK documentation index
   - Verification Status: ✅ Verified

5. **[Web SDK](./platform/sdks/web-sdk.md)**
   - Web SDK (JavaScript/TypeScript)
   - Verification Status: ✅ Verified

6. **[iOS SDK](./platform/sdks/ios-sdk.md)**
   - iOS SDK (Swift)
   - Verification Status: ✅ Verified

7. **[Android SDK](./platform/sdks/android-sdk.md)**
   - Android SDK (Kotlin)
   - Verification Status: ✅ Verified

8. **[React Native SDK](./platform/sdks/react-native-sdk.md)**
   - React Native SDK
   - Verification Status: ✅ Verified

9. **[REST API](./platform/sdks/rest-api.md)**
   - REST API documentation
   - Verification Status: ✅ Verified

10. **[Embeddable Widget](./platform/widget.md)**
    - JavaScript widget documentation
    - Verification Status: ✅ Verified

### Compliance Documentation

**Location:** `docs/compliance/`

1. **[Compliance README](./compliance/README.md)**
   - Compliance documentation index
   - Verification Status: ✅ Verified

2. **[COPPA Compliance](./compliance/coppa.md)**
   - COPPA compliance documentation
   - Verification Status: ✅ Verified

3. **[GDPR Compliance](./compliance/gdpr.md)**
   - GDPR compliance documentation
   - Verification Status: ✅ Verified

4. **[Child Safety Design](./compliance/child-safety.md)**
   - Child safety design documentation
   - Verification Status: ✅ Verified

5. **[PRIVO Draft Pack](./compliance/privo-draft.md)**
   - PRIVO certification draft pack
   - Verification Status: ⚠️ Partially verified

6. **[Privacy Compliance Verification Report](./compliance/01-privacy-compliance-verification-report.md)**
   - Complete privacy compliance verification
   - COPPA, GDPR, UK Children's Code compliance
   - Verification Status: ✅ Verified

7. **[Privacy Compliance Analysis](./compliance/privacy-compliance-analysis.md)**
   - Privacy compliance gap analysis
   - Verification Status: ✅ Verified

8. **[Privacy Compliance Implementation](./compliance/privacy-compliance-implementation.md)**
   - Privacy compliance implementation details
   - Verification Status: ✅ Verified

9. **[Privacy Compliance Solutions](./compliance/privacy-compliance-solutions.md)**
   - Privacy compliance solutions and recommendations
   - Verification Status: ✅ Verified

### Third-Party Integrations

**Location:** `docs/integrations/`

1. **[Integrations README](./integrations/README.md)**
   - Third-party integrations index
   - Verification Status: ✅ Verified

2. **[Philips Hue](./integrations/philips-hue.md)**
   - Philips Hue integration
   - Privacy statement included
   - Verification Status: ✅ Verified

3. **[OpenAI](./integrations/openai.md)**
   - OpenAI integration
   - Privacy statement included
   - Verification Status: ✅ Verified

4. **[ElevenLabs](./integrations/elevenlabs.md)**
   - ElevenLabs integration
   - Privacy statement included
   - Verification Status: ✅ Verified

5. **[Stripe](./integrations/stripe.md)**
   - Stripe integration
   - Privacy statement included
   - Verification Status: ✅ Verified

6. **[Supabase](./integrations/supabase.md)**
   - Supabase integration
   - Privacy statement included
   - Verification Status: ✅ Verified

7. **[Redis](./integrations/redis.md)**
   - Redis integration
   - Privacy statement included
   - Verification Status: ✅ Verified

8. **[Stability AI](./integrations/stability-ai.md)**
   - Stability AI integration
   - Privacy statement included
   - Verification Status: ✅ Verified

9. **[Hedra](./integrations/hedra.md)**
   - Hedra integration
   - Privacy statement included
   - Verification Status: ⚠️ Partially verified

10. **[LiveKit](./integrations/livekit.md)**
    - LiveKit integration
    - Privacy statement included
    - Verification Status: ⚠️ Partially verified

11. **[SendGrid](./integrations/sendgrid.md)**
    - SendGrid integration
    - Privacy statement included
    - Verification Status: ✅ Verified

12. **[AWS Services](./integrations/aws.md)**
    - AWS services integration
    - Privacy statement included
    - Verification Status: ✅ Verified

### Testing and Quality

**Location:** `docs/testing/`

1. **[Testing README](./testing/README.md)**
   - Testing documentation index
   - Verification Status: ✅ Verified

2. **[Testing and Quality](./testing/testing-and-quality.md)**
   - Test frameworks, execution, coverage
   - Verification Status: ✅ Verified

3. **[Audit Checklist](./testing/audit-checklist.md)**
   - Human-verifiable audit checklist
   - Verification Status: ✅ Verified

4. **[Comprehensive Testing Complete](./testing/comprehensive-testing-complete.md)**
   - Complete testing status and results
   - Verification Status: ✅ Verified

5. **[E2E Testing Complete](./testing/e2e-testing-complete.md)**
   - End-to-end testing documentation
   - Verification Status: ✅ Verified

### Role-Specific Guides

**Location:** `docs/roles/`

1. **[Roles README](./roles/README.md)**
   - Role-specific guides index
   - Verification Status: ✅ Verified

2. **[Marketing Guide](./roles/marketing.md)**
   - Marketing perspective guide
   - Verification Status: ✅ Verified

3. **[Sales Guide](./roles/sales.md)**
   - Sales perspective guide
   - Verification Status: ✅ Verified

4. **[Finance Guide](./roles/finance.md)**
   - Finance perspective guide
   - Verification Status: ✅ Verified

5. **[Design Guide](./roles/design.md)**
   - Design perspective guide
   - Verification Status: ✅ Verified

6. **[Product Guide](./roles/product.md)**
   - Product perspective guide
   - Verification Status: ✅ Verified

7. **[Engineering Guide](./roles/engineering.md)**
   - Engineering perspective guide
   - Verification Status: ✅ Verified

### Agent Ecosystem Documentation

**Location:** `docs/agents/`

1. **[Agents README](./agents/README.md)**
   - Agent ecosystem catalog
   - 24+ agents with complete 9-file documentation structure
   - Verification Status: ✅ Verified

2. **[Universal Agent](./agents/universal-agent/README.md)**
   - Universal Agent documentation (complete 9-file structure)
   - Verification Status: ✅ Verified

3. **[Emotion Agent](./agents/emotion-agent/README.md)**
   - Emotion Agent documentation (complete 9-file structure)
   - Verification Status: ✅ Verified

4. **[Child Safety Agent](./agents/child-safety-agent/README.md)**
   - Child Safety Agent documentation (complete 9-file structure)
   - Verification Status: ✅ Verified

5. **[Commerce Agent](./agents/commerce-agent/README.md)**
   - Commerce Agent documentation (complete 9-file structure)
   - Verification Status: ✅ Verified

6. **[Content Agent](./agents/content-agent/README.md)**
   - Content Agent documentation (complete 9-file structure)
   - Verification Status: ✅ Verified

7. **[Library Agent](./agents/library-agent/README.md)**
   - Library Agent documentation (complete 9-file structure)
   - Verification Status: ✅ Verified

8. **[Auth Agent](./agents/auth-agent/README.md)**
   - Auth Agent documentation (complete 9-file structure)
   - Verification Status: ✅ Verified

9. **[Router](./agents/router/README.md)**
   - Router documentation (complete 9-file structure)
   - Verification Status: ✅ Verified

10. **[All Other Agents](./agents/)**
    - Complete documentation for all 24+ agents
    - Each agent has 9-file structure (README, what, why, when, where, who, development, marketing, cost)
    - Verification Status: ✅ Verified

### Operations Documentation

**Location:** `docs/operations/`

1. **[Operations README](./operations/README.md)**
   - Operations documentation index
   - Verification Status: ✅ Verified

2. **[Customer Service](./operations/customer-service/README.md)**
   - Customer service documentation
   - Support workflows, troubleshooting, escalation procedures
   - Verification Status: ✅ Verified

3. **[PII Handling Runbook](./operations/pii-handling-runbook.md)**
   - PII handling procedures and compliance
   - Verification Status: ✅ Verified

4. **[Secrets Management](./operations/secrets-management.md)**
   - Secrets management and security practices
   - Verification Status: ✅ Verified

5. **[Performance Monitoring](./operations/performance-monitoring.md)**
   - Performance monitoring and optimization
   - Verification Status: ✅ Verified

6. **[Monitoring and Cost Optimization Plan](./operations/monitoring-and-cost-optimization-plan.md)**
   - Monitoring and cost optimization strategies
   - Verification Status: ✅ Verified

7. **[Agent Handoff](./operations/agent-handoff.md)**
   - Agent handoff documentation
   - Verification Status: ✅ Verified

8. **[Team Handoff](./operations/team-handoff.md)**
   - Team handoff documentation
   - Verification Status: ✅ Verified

### Deployment Documentation

**Location:** `docs/deployment/`

1. **[Deployment README](./deployment/README.md)**
   - Deployment documentation index
   - Verification Status: ✅ Verified

2. **[Knowledge Base Deployment Checklist](./deployment/01-knowledge-base-deployment-checklist.md)**
   - Knowledge base deployment guide
   - Verification Status: ✅ Verified

3. **[Critical Age Validation Bug Fix](./deployment/02-critical-age-validation-bug-fix.md)**
   - Age validation fix documentation
   - Verification Status: ✅ Verified

4. **[Agent to Lambda Mapping](./deployment/agent-to-lambda-mapping.md)**
   - Agent to Lambda function mapping
   - Verification Status: ✅ Verified

5. **[Full Multi-Agent Deployment Specification](./deployment/full-multi-agent-deployment-specification.md)**
   - Complete deployment specification
   - Verification Status: ✅ Verified

6. **[Migration Instructions](./deployment/migration-instructions.md)**
   - Migration procedures and instructions
   - Verification Status: ✅ Verified

### Development Documentation

**Location:** `docs/development/`

1. **[Development README](./development/README.md)**
   - Development documentation index
   - Verification Status: ✅ Verified

2. **[Multi-Agent Orchestration Flow](./development/01-multi-agent-orchestration-flow.md)**
   - Complete orchestration flow documentation
   - Verification Status: ✅ Verified

3. **[Complete Developer Guide](./development/02-complete-developer-guide.md)**
   - Comprehensive developer guide
   - Verification Status: ✅ Verified

4. **[Multi-Agent Connection Protocol](./development/multi-agent-connection-protocol.md)**
   - Agent-to-agent communication protocol
   - Verification Status: ✅ Verified

5. **[Orchestration Capabilities Analysis](./development/03-orchestration-capabilities-analysis.md)**
   - Orchestration system analysis
   - Verification Status: ✅ Verified

6. **[Complete Multi-Agent Implementation Specification](./development/complete-multi-agent-implementation-specification.md)**
   - Complete implementation specification
   - Verification Status: ✅ Verified

7. **[Universal Storytailor Agent Plan](./development/universal-storytailor-agent-plan.md)**
   - Universal agent implementation plan
   - Verification Status: ✅ Verified

8. **[Self-Healing Implementation Guide](./development/self-healing-implementation-guide.md)**
   - Self-healing system implementation
   - Verification Status: ✅ Verified

9. **[Platform-Agnostic Smart Home Design](./development/platform-agnostic-smart-home-design.md)**
   - Smart home integration design
   - Verification Status: ✅ Verified

10. **[Kid Speech Understanding Gap Analysis](./development/kid-speech-understanding-gap-analysis.md)**
    - Speech understanding analysis
    - Verification Status: ✅ Verified

### API Reference Documentation

**Location:** `docs/api-reference/`

1. **[API Reference README](./api-reference/README.md)**
   - API reference documentation index
   - Verification Status: ✅ Verified

2. **[Docs Overview](./api-reference/00-docs-overview.md)**
   - Main documentation entry point
   - Verification Status: ✅ Verified

3. **[Developer API Documentation](./api-reference/01-developer-api-documentation.md)**
   - Complete API reference with examples
   - Verification Status: ✅ Verified

4. **[Comprehensive Integration Guide](./api-reference/02-comprehensive-integration-guide.md)**
   - Master integration documentation
   - Verification Status: ✅ Verified

5. **[Integration Services Guide](./api-reference/03-integration-services-guide.md)**
   - External service configurations
   - Verification Status: ✅ Verified

6. **[Alexa Integration Guide](./api-reference/04-alexa-integration-guide.md)**
   - Voice platform integration details
   - Verification Status: ✅ Verified

### Business Documentation

**Location:** `docs/business/`, `docs/sales/`, `docs/marketing/`, `docs/finance/`, `docs/economics/`, `docs/design/`

**Sales:**
1. **[Sales README](./sales/README.md)** - Sales documentation index
2. **[Sales Playbook](./sales/sales-playbook.md)** - Complete sales process
3. **[Sales Objections](./sales/sales-objections.md)** - Objection handling
4. **[Sales Demo](./sales/sales-demo.md)** - Demo scripts
5. **[Sales Pricing](./sales/sales-pricing.md)** - Pricing strategies

**Marketing:**
1. **[Marketing README](./marketing/README.md)** - Marketing documentation index
2. **[Marketing Overview](./marketing/marketing-overview.md)** - Marketing strategy
3. **[Marketing Features](./marketing/marketing-features.md)** - Feature marketing
4. **[Marketing Competitive](./marketing/marketing-competitive.md)** - Competitive analysis
5. **[Category Creation Playbook](./marketing/category-creation-playbook.md)** - Category positioning and language rules
6. **[De-Risking Messaging Framework](./marketing/de-risking-messaging-framework.md)** - Addressing fears and building trust
7. **[Cultural Bridge Content Strategy](./marketing/cultural-bridge-content-strategy.md)** - Winning creative community through content
8. **[Social Media Uncomfortable Topics](./marketing/social-media-uncomfortable-topics.md)** - Handling criticism and tough questions on social media
9. **[Anti-AI Comparison Strategy](./marketing/anti-ai-comparison-strategy.md)** - Differentiation without positioning as "better AI"

**Finance:**
1. **[Finance README](./finance/README.md)** - Finance documentation index
2. **[Finance Pricing](./finance/finance-pricing.md)** - Pricing models
3. **[Finance Costs](./finance/finance-costs.md)** - Cost analysis
4. **[Finance Metrics](./finance/finance-metrics.md)** - Financial metrics
5. **[Cost Optimization Analysis](./finance/cost-optimization-analysis.md)** - Cost optimization

**Economics:**
1. **[Economics README](./economics/README.md)** - Economics documentation index
2. **[ROI Analysis](./economics/roi-analysis.md)** - ROI calculations, scenarios, and payback analysis
3. **[Sales Economics](./economics/sales-economics.md)** - CAC by channel, sales efficiency, channel performance
4. **[Revenue Models](./economics/revenue-models.md)** - Subscription, one-time, hybrid models, churn impact
5. **[Financial Projections](./economics/financial-projections.md)** - P&L, cash flow, scenarios, sensitivity analysis
6. **[Scaling Economics](./economics/scaling-economics.md)** - Cost curves, efficiency gains, marginal cost analysis
7. **[Market Economics](./economics/market-economics.md)** - TAM/SAM/SOM analysis, market penetration strategies
8. **[Competitive Economics](./economics/competitive-economics.md)** - Competitive unit economics, pricing positioning
9. **[Investor Materials](./economics/investor-materials.md)** - Executive financial summary, investor-facing materials

**Design:**
1. **[Design README](./design/README.md)** - Design documentation index
2. **[Design System](./design/design-system.md)** - Complete design system
3. **[UX Guide](./design/ux-guide.md)** - User experience guidelines
4. **[Brand Guidelines](./design/brand-guidelines.md)** - Brand identity
5. **[Voice and Tone](./design/voice-and-tone.md)** - Brand voice definition, tone variations, examples
6. **[Themes and Messaging](./design/themes-and-messaging.md)** - Messaging framework by audience and use case
7. **[Introduction Guidelines](./design/introduction-guidelines.md)** - How to introduce Storytailor in different contexts
8. **[Social Media Standards](./design/social-media-standards.md)** - Platform-specific guidelines, engagement standards
9. **[Content Creation Guidelines](./design/content-creation-guidelines.md)** - Content types, process, templates
10. **[Communication Standards](./design/communication-standards.md)** - Communication by audience and channel standards

**Business:**
1. **[Business README](./business/README.md)** - Business documentation index
2. **[Pricing Strategy](./business/pricing-strategy.md)** - Pricing strategy
3. **[Pricing Comprehensive](./business/pricing-comprehensive.md)** - Comprehensive pricing
4. **[Partnerships](./business/partnerships/README.md)** - Partnership documentation
5. **[Affiliates](./business/affiliates/README.md)** - Affiliate program
6. **[Promotions](./business/promotions/README.md)** - Promotional campaigns

### QA Reports

**Location:** `docs/qa-reports/`

1. **[Comprehensive QA Consolidated](./qa-reports/01-comprehensive-qa-consolidated.md)**
   - Consolidated QA report
   - Verification Status: ✅ Verified

2. **[V2 Domain Analysis](./qa-reports/02-v2-domain-analysis.md)**
   - V2 domain analysis
   - Verification Status: ✅ Verified

3. **[SDK Package Analysis](./qa-reports/03-sdk-package-analysis.md)**
   - SDK package analysis
   - Verification Status: ✅ Verified

4. **[Multilingual Support Analysis](./qa-reports/04-multilingual-support-analysis.md)**
   - Multilingual support analysis
   - Verification Status: ✅ Verified

5. **[Actual System Status Update](./qa-reports/actual-system-status-update.md)**
   - Current system status
   - Verification Status: ✅ Verified

6. **[Execution Plan](./qa-reports/execution-plan.md)**
   - QA execution plan
   - Verification Status: ✅ Verified

## Quick Navigation

### By Audience

**Internal Teams:**
- System Documentation: `docs/system/`
- Agent Ecosystem: `docs/agents/`
- Role-Specific Guides: `docs/roles/`
- Testing: `docs/testing/`
- Development: `docs/development/`
- API Reference: `docs/api-reference/`

**Partners:**
- Partner Integration: `docs/storytailor/partner-integration.md`
- Platform Documentation: `docs/platform/`
- Story Intelligence Partner API: `docs/story-intelligence/partner-api.md`

**Auditors:**
- Compliance Documentation: `docs/compliance/`
- Audit Checklist: `docs/testing/audit-checklist.md`
- System Inventory: `docs/system/inventory.md`

### By Topic

**Architecture:**
- System Architecture: `docs/system/architecture.md`
- Platform Overview: `docs/storytailor/platform-overview.md`
- Product Overview: `docs/storytailor/product-overview.md`
- Internal Architecture: `docs/storytailor/internal-architecture.md`
- Story Intelligence Architecture: `docs/story-intelligence/architecture.md`

**Integration:**
- Partner Integration: `docs/storytailor/partner-integration.md`
- Platform Documentation: `docs/platform/`
- Third-Party Integrations: `docs/integrations/`
- Integration Guides: `docs/integration-guides/`

**Compliance:**
- COPPA: `docs/compliance/coppa.md`
- GDPR: `docs/compliance/gdpr.md`
- Child Safety: `docs/compliance/child-safety.md`
- PRIVO: `docs/compliance/privo-draft.md`

**Development:**
- Engineering Guide: `docs/roles/engineering.md`
- Testing: `docs/testing/`
- API Documentation: `docs/api-reference/`
- Development Guides: `docs/development/`
- Package Documentation: `docs/packages/`
- Deployment: `docs/deployment/`
- Operations: `docs/operations/`
- Setup Guides: `docs/setup/`
- Implementation Guides: `docs/implementation-guides/`

**Business:**
- Sales: `docs/sales/`
- Marketing: `docs/marketing/`
- Finance: `docs/finance/`
- Economics: `docs/economics/`
- Design: `docs/design/`
- Business Development: `docs/business/`
- Patentability: `docs/patentability/`
- Executive: `docs/executive/`
- Brand: `docs/brand/`

### Setup and Implementation Guides

**Location:** `docs/setup/`, `docs/implementation-guides/`

**Setup Guides:**
1. **[Notion Teamspace Setup](./setup/01-notion-teamspace-setup.md)** - Notion workspace setup
2. **[Documentation Index](./setup/02-documentation-index.md)** - Documentation master index
3. **[Notion API Automation](./setup/03-notion-api-automation.md)** - Notion API automation
4. **[Quick Start Guide](./setup/quick-start-guide.md)** - Quick start guide
5. **[Quick Reference](./setup/quick-reference.md)** - Quick reference guide

**Implementation Guides:**
1. **[Embed Design System Plan](./implementation-guides/01-embed-design-system-plan.md)** - Design system implementation
2. **[Integration Completion Summary](./implementation-guides/02-integration-completion-summary.md)** - Integration completion
3. **[Alexa Integration](./integration-guides/alexa-integration.md)** - Alexa integration guide
4. **[Comprehensive Integration Guide](./integration-guides/comprehensive-integration-guide.md)** - Master integration guide
5. **[Integration Services](./integration-guides/integration-services.md)** - Integration services guide
6. **[White Label](./integration-guides/white-label.md)** - White label integration
7. **[Partner Onboarding](./integration-guides/partner-onboarding.md)** - Partner onboarding guide

### System Documentation (Additional)

**Location:** `docs/system/`

**Additional System Files:**
- **[Agent Endpoint Verification](./system/agent-endpoint-verification.md)** - Endpoint verification
- **[Character Creation Endpoints](./system/character-creation-endpoints.md)** - Character endpoints
- **[Checkpoint Verification System](./system/checkpoint-verification-system.md)** - Checkpoint system
- **[Comprehensive Region Audit and Strategy](./system/comprehensive-region-audit-and-strategy.md)** - Region strategy
- **[Conversation Endpoints](./system/conversation-endpoints.md)** - Conversation endpoints
- **[Current System State](./system/current-system-state.md)** - Current system state
- **[Database Relationship Fix](./system/database-relationship-fix.md)** - Database fixes
- **[Deployment Region Reference](./system/deployment-region-reference.md)** - Region reference
- **[Honest Multi-Agent Assessment](./system/honest-multi-agent-assessment.md)** - Multi-agent assessment
- **[Missing Components Created](./system/missing-components-created.md)** - Component status
- **[Missing Endpoints Analysis](./system/missing-endpoints-analysis.md)** - Endpoint analysis
- **[Reality Check Multi-Agent Gap Analysis](./system/reality-check-multi-agent-gap-analysis.md)** - Gap analysis
- **[Region Strategy](./system/region-strategy.md)** - AWS region strategy
- **[Region Migration Complete](./system/region-migration-complete.md)** - Migration documentation
- **[Production State Verification](./system/production-state-verification.md)** - Production verification
- **[Orchestration Verification](./system/orchestration-verification.md)** - Orchestration verification
- **[Deletion System](./system/deletion-system.md)** - Deletion system documentation

### Executive Documentation

**Location:** `docs/executive/`

1. **[Executive README](./executive/README.md)** - Executive documentation index
2. **[System Status](./executive/system-status.md)** - Current system status
3. **[Production Readiness](./executive/production-readiness.md)** - Production readiness assessment
4. **[Key Metrics](./executive/key-metrics.md)** - Key business and technical metrics

### Patentability Documentation

**Location:** `docs/patentability/`

1. **[Patentability README](./patentability/README.md)** - Patentability documentation index
2. **[Story Intelligence Innovations](./patentability/story-intelligence-innovations.md)** - Key innovations
3. **[Prior Art Analysis](./patentability/prior-art-analysis.md)** - Prior art analysis

### Brand Documentation

**Location:** `docs/brand/`

1. **[Story Intelligence Brand Guide](./brand/01-story-intelligence-brand-guide.md)** - Brand positioning
2. **[Revolutionary Excellence Master Plan](./brand/02-revolutionary-excellence-master-plan.md)** - Quality standards
3. **[Ethical Positioning Guidelines](./brand/ethical-positioning-guidelines.md)** - Ethical positioning, transparency framework, response scripts
4. **[Creator Positioning - JQ Sirls](./brand/creator-positioning-jq-sirls.md)** - Creator credentials, introduction templates, legitimacy markers

### Product Documentation

**Location:** `docs/product/`

1. **[IP Attribution System](./product/ip-attribution-system.md)** - IP detection and attribution system implementation (backend/API/JSON - quiet aside integration) ✅ Implemented

### User Documentation

**Location:** `docs/user/`

1. **[IP Attribution FAQ](./user/ip-attribution-faq.md)** - User-facing FAQ for IP attribution system

### Roadmaps

**Location:** `docs/roadmaps/`

1. **[Development Roadmap](./roadmaps/01-development-roadmap.md)** - Development roadmap
2. **[Additional Documentation Suite](./roadmaps/02-additional-documentation-suite.md)** - Documentation roadmap
3. **[System Audit and TODOs](./roadmaps/03-system-audit-and-todos.md)** - System audit

### Archived Documentation

**Location:** `docs/archive/`

Historical and completed planning documents are archived in `docs/archive/`, including:
- Completion reports
- Execution plans
- File action lists
- Structure proposals
- Multi-lens audit reports
- Status files and summaries

These files are preserved for historical reference but are no longer actively maintained.

## Related Documentation

- **Main README:** See [Documentation README](./README.md)
- **Agents Index:** See [Agents README](./agents/README.md)
- **Business Documentation:** See [Sales](./sales/README.md), [Marketing](./marketing/README.md), [Finance](./finance/README.md), [Economics](./economics/README.md), [Design](./design/README.md), [Business](./business/README.md)
- **Operations:** See [Operations README](./operations/README.md)
- **Deployment:** See [Deployment README](./deployment/README.md)
- **Development:** See [Development README](./development/README.md)
- **API Reference:** See [API Reference README](./api-reference/README.md)
