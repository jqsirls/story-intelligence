# Storytailor Documentation Onboarding Map

**Last Updated**: 2025-01-15  
**Purpose**: Quick navigation guide for AI IDEs and new teammates to find any documentation  
**Audience**: AI IDEs | New Team Members | Onboarding | Quick Reference

## How to Use This Document

This map is designed for **quick navigation** and **role-based discovery**. For comprehensive listings, see:
- **[GLOBAL_INDEX.md](./GLOBAL_INDEX.md)** - Complete documentation index (460+ files)
- **[README.md](./README.md)** - Documentation overview and quick start

**Quick Navigation:**
- **New to the team?** → Start with [Quick Start by Role](#quick-start-by-role)
- **Looking for something specific?** → Use [I Need to Find...](#i-need-to-find-quick-reference)
- **Want to see everything?** → Browse [Documentation by Category](#documentation-by-category)
- **Need a file path?** → Check [File Location Quick Reference](#file-location-quick-reference)

---

## Quick Start by Role

### New Engineer

**Essential Reading (in order):**
1. **[What This Is](./WHAT_THIS_IS.md)** - Product overview and technical foundation
2. **[Mental Model](./MENTAL_MODEL.md)** - System architecture and boundaries
3. **[How We Work](./HOW_WE_WORK.md)** - Development workflow, code organization, testing
4. **[System Architecture](./system/architecture.md)** - Complete system architecture with diagrams
5. **[Agents Index](./agents/README.md)** - All 26 agents and their documentation
6. **[Development Guide](./development/README.md)** - Development practices and architecture

**Key Resources:**
- **Setup**: `docs/setup/` - Setup and configuration guides
- **Code Organization**: `packages/` - All agent and service code
- **Deployment**: `docs/deployment/README.md` - Deployment guides
- **API Reference**: `docs/api-reference/README.md` - Complete API documentation
- **Testing**: `docs/testing/README.md` - Testing guides and QA reports

### New Product Manager

**Essential Reading (in order):**
1. **[What This Is](./WHAT_THIS_IS.md)** - Product overview and target users
2. **[Product Overview](./storytailor/product-overview.md)** - Product features and capabilities
3. **[User Journeys](./user-journeys/)** - Complete user journey documentation
4. **[Product Documentation](./product/)** - Feature specifications and system design
5. **[Roadmaps](./roadmaps/)** - Development and feature roadmaps

**Key Resources:**
- **User Journeys**: `docs/user-journeys/` - Audio, video, REST API journeys
- **Story Types**: `docs/story-types/` - Complete documentation for all 14 story types
- **Platform Overview**: `docs/storytailor/platform-overview.md` - Platform capabilities
- **Feature Specs**: `docs/product/` - IP attribution, features, system design
- **Business Context**: `docs/business/README.md` - Pricing, PLG, partnerships

### New Designer

**Essential Reading (in order):**
1. **[What This Is](./WHAT_THIS_IS.md)** - Product overview and user experience
2. **[Design System](./design/design-system.md)** - Complete design system
3. **[Brand Guidelines](./brand/)** - Brand positioning and guidelines
4. **[UX Guide](./design/ux-guide.md)** - UX principles and patterns
5. **[Voice and Tone](./design/voice-and-tone.md)** - Communication standards

**Key Resources:**
- **Design System**: `docs/design/design-system.md` - Components, tokens, patterns
- **Brand**: `docs/brand/` - Brand guide, ethical positioning, creator positioning
- **Content Guidelines**: `docs/design/content-creation-guidelines.md` - Content standards
- **Communication**: `docs/design/communication-standards.md` - Communication guidelines

### New Business Team Member

**Essential Reading (in order):**
1. **[What This Is](./WHAT_THIS_IS.md)** - Product overview and market position
2. **[Sales Playbook](./sales/README.md)** - Sales strategy, objections, demos
3. **[Marketing Strategy](./marketing/README.md)** - Marketing and competitive analysis
4. **[Finance Documentation](./finance/README.md)** - Revenue models and unit economics
5. **[Business Documentation](./business/README.md)** - Partnerships, affiliates, promotions

**Key Resources:**
- **Sales**: `docs/sales/` - Playbook, objections, pricing, demos
- **Marketing**: `docs/marketing/` - Strategy, competitive analysis, features
- **Finance**: `docs/finance/` - Costs, metrics, pricing, optimization
- **Economics**: `docs/economics/` - Financial projections, ROI, scaling
- **Partnerships**: `docs/business/partnerships/` - Partnership strategies

### New Operations/DevOps

**Essential Reading (in order):**
1. **[What This Is](./WHAT_THIS_IS.md)** - System overview and technical foundation
2. **[System Inventory](./system/inventory.md)** - Complete system inventory
3. **[Deployment Documentation](./deployment/README.md)** - Deployment guides and checklists
4. **[Operations Documentation](./operations/README.md)** - Operational procedures and runbooks
5. **[System Architecture](./system/architecture.md)** - Infrastructure and architecture

**Key Resources:**
- **Deployment**: `docs/deployment/` - Deployment guides, checklists, agent mapping
- **Operations**: `docs/operations/` - Runbooks, monitoring, customer service
- **System**: `docs/system/` - Inventory, architecture, API endpoints, database schema
- **Monitoring**: `docs/operations/performance-monitoring.md` - Performance monitoring

### New Compliance/Legal

**Essential Reading (in order):**
1. **[What This Is](./WHAT_THIS_IS.md)** - Product overview and compliance context
2. **[Compliance Documentation](./compliance/README.md)** - COPPA, GDPR, child safety
3. **[Privacy Policy](./compliance/privacy-policy.md)** - Privacy policy and data handling
4. **[COPPA Compliance](./compliance/coppa.md)** - COPPA compliance documentation
5. **[GDPR Compliance](./compliance/gdpr.md)** - GDPR compliance documentation

**Key Resources:**
- **Compliance**: `docs/compliance/` - COPPA, GDPR, PRIVO, child safety
- **Privacy**: `docs/compliance/privacy-policy.md` - Privacy policy
- **Security**: `docs/agents/security-framework/` - Security framework
- **Audit**: `docs/system/` - System inventory and architecture for audits

### AI IDE/Agent

**Essential Reading (in order):**
1. **[What This Is](./WHAT_THIS_IS.md)** - System overview
2. **[Mental Model](./MENTAL_MODEL.md)** - System architecture and boundaries
3. **[System Architecture](./system/architecture.md)** - Complete architecture with code references
4. **[Agents Index](./agents/README.md)** - All agents with code locations
5. **[API Reference](./api-reference/README.md)** - Complete API documentation

**Key Resources:**
- **Code References**: All docs include code references (file paths, line numbers)
- **System Inventory**: `docs/system/inventory.md` - Lambda functions, SSM parameters
- **API Endpoints**: `docs/system/api-endpoints-inventory.md` - 60+ REST endpoints
- **Database Schema**: `docs/system/database-schema-inventory.md` - 120+ tables
- **Agent Docs**: `docs/agents/{agent-name}/development.md` - Technical implementation
- **Deployment Mapping**: `docs/system/code-to-deployment-mapping.md` - Code to Lambda mapping

---

## I Need to Find... Quick Reference

| I Need To... | Where to Look | File Path |
|--------------|---------------|-----------|
| **Understand the architecture** | Mental Model, System Architecture | `docs/MENTAL_MODEL.md`, `docs/system/architecture.md` |
| **Deploy something** | Deployment Documentation | `docs/deployment/README.md` |
| **API documentation** | API Reference | `docs/api-reference/README.md` |
| **Add a new agent** | Agent Documentation, Development Guide | `docs/agents/README.md`, `docs/development/README.md` |
| **Compliance information** | Compliance Documentation | `docs/compliance/README.md` |
| **Business metrics** | Executive, Finance Documentation | `docs/executive/key-metrics.md`, `docs/finance/README.md` |
| **Integrate with Storytailor** | Integration Guides | `docs/integration-guides/`, `docs/integrations/README.md` |
| **Understand a specific feature** | Product Docs, User Journeys | `docs/product/`, `docs/user-journeys/` |
| **Find a Lambda function** | System Inventory | `docs/system/inventory.md` |
| **Database schema** | Database Schema Inventory | `docs/system/database-schema-inventory.md` |
| **SSM parameters** | SSM Parameters Inventory | `docs/system/ssm-parameters-inventory.md` |
| **Agent code location** | Agent Documentation | `docs/agents/{agent-name}/where.md` |
| **Development workflow** | How We Work | `docs/HOW_WE_WORK.md` |
| **Testing guides** | Testing Documentation | `docs/testing/README.md` |
| **Design system** | Design Documentation | `docs/design/design-system.md` |
| **Sales materials** | Sales Documentation | `docs/sales/README.md` |
| **Marketing strategy** | Marketing Documentation | `docs/marketing/README.md` |
| **Setup instructions** | Setup Guides | `docs/setup/` |
| **User journey flows** | User Journey Documentation | `docs/user-journeys/` |
| **Partner integration** | Partner Integration | `docs/storytailor/partner-integration.md` |
| **SDK documentation** | Platform SDKs | `docs/platform/sdks/README.md` |

---

## Documentation by Category

### Core Documentation

**Location**: Root of `docs/`

| Document | Purpose | Link |
|----------|---------|------|
| What This Is | Product overview, target users, what it's not | [WHAT_THIS_IS.md](./WHAT_THIS_IS.md) |
| Mental Model | System architecture, boundaries, how parts connect | [MENTAL_MODEL.md](./MENTAL_MODEL.md) |
| How We Work | Development workflow, disposable artifacts policy | [HOW_WE_WORK.md](./HOW_WE_WORK.md) |
| Naming | Naming conventions and shared vocabulary | [NAMING.md](./NAMING.md) |
| Ownership | Ownership by role, approvals, escalation | [OWNERSHIP.md](./OWNERSHIP.md) |
| Decisions | Decision log, short and factual | [DECISIONS.md](./DECISIONS.md) |
| Working Notes | Temporary notes (actively pruned) | [WORKING_NOTES.md](./WORKING_NOTES.md) |
| Definition of Done | DoD checklist | [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) |

### System & Architecture

**Location**: `docs/system/`

| Document | Purpose | Link |
|----------|---------|------|
| System Inventory | Complete system inventory (Lambda, SSM, database) | [system/inventory.md](./system/inventory.md) |
| System Architecture | Complete architecture with diagrams | [system/architecture.md](./system/architecture.md) |
| API Endpoints Inventory | 60+ REST API endpoints | [system/api-endpoints-inventory.md](./system/api-endpoints-inventory.md) |
| Database Schema Inventory | 120+ tables, indexes, RLS policies | [system/database-schema-inventory.md](./system/database-schema-inventory.md) |
| Deployment Inventory | Lambda function deployment status | [system/deployment-inventory.md](./system/deployment-inventory.md) |
| SSM Parameters Inventory | Complete SSM parameter reference | [system/ssm-parameters-inventory.md](./system/ssm-parameters-inventory.md) |
| Code to Deployment Mapping | Code package to Lambda function mapping | [system/code-to-deployment-mapping.md](./system/code-to-deployment-mapping.md) |

### Agents

**Location**: `docs/agents/`

| Resource | Purpose | Link |
|----------|---------|------|
| Agents Index | Index of all 26 agents | [agents/README.md](./agents/README.md) |
| Individual Agent Docs | Each agent has 9 files (what, why, when, where, who, development, marketing, cost, README) | `docs/agents/{agent-name}/` |

**Core Agents:**
- Universal Agent, Router, Content Agent, Storytailor Agent, Library Agent, Character Agent
- Kid Communication Intelligence, Emotion Agent, Conversation Intelligence
- Analytics Intelligence, Insights Agent, User Research Agent
- Child Safety Agent, Content Safety, Security Framework
- Auth Agent, IDP Agent, Commerce Agent, Educational Agent, Therapeutic Agent
- Voice Synthesis, Avatar Agent, Personality Agent, Localization Agent
- Knowledge Base Agent, Smart Home Agent, Accessibility Agent
- Event System, Health Monitoring

### APIs & Integration

**Location**: `docs/api-reference/`, `docs/integration-guides/`, `docs/integrations/`

| Resource | Purpose | Link |
|----------|---------|------|
| API Reference | Complete API documentation | [api-reference/README.md](./api-reference/README.md) |
| Integration Guides | Platform-specific integration guides | [integration-guides/](./integration-guides/) |
| Integrations | Third-party integrations | [integrations/README.md](./integrations/README.md) |
| Platform SDKs | Web, iOS, Android, React Native SDKs | [platform/sdks/README.md](./platform/sdks/README.md) |
| Partner Integration | Partner integration guide | [storytailor/partner-integration.md](./storytailor/partner-integration.md) |

### Product & Features

**Location**: `docs/product/`, `docs/user-journeys/`, `docs/storytailor/`, `docs/story-types/`

| Resource | Purpose | Link |
|----------|---------|------|
| Product Overview | Product features and capabilities | [storytailor/product-overview.md](./storytailor/product-overview.md) |
| Platform Overview | Production platform documentation | [storytailor/platform-overview.md](./storytailor/platform-overview.md) |
| User Journeys | Complete user journey documentation | [user-journeys/](./user-journeys/) |
| Story Types | Complete documentation for all 14 story types | [story-types/README.md](./story-types/README.md) |
| IP Attribution System | IP detection and attribution | [product/ip-attribution-system.md](./product/ip-attribution-system.md) |
| Story Intelligence | Story Intelligence architecture | [story-intelligence/README.md](./story-intelligence/README.md) |

### Business

**Location**: `docs/sales/`, `docs/marketing/`, `docs/finance/`, `docs/economics/`, `docs/business/`

| Resource | Purpose | Link |
|----------|---------|------|
| Sales Playbook | Sales strategy, objections, demos | [sales/README.md](./sales/README.md) |
| Marketing Strategy | Marketing and competitive analysis | [marketing/README.md](./marketing/README.md) |
| Finance Documentation | Revenue models, costs, unit economics | [finance/README.md](./finance/README.md) |
| Economics | Financial projections, ROI, scaling | [economics/README.md](./economics/README.md) |
| Business Documentation | Pricing, PLG, partnerships, affiliates | [business/README.md](./business/README.md) |

### Operations

**Location**: `docs/operations/`, `docs/deployment/`, `docs/testing/`

| Resource | Purpose | Link |
|----------|---------|------|
| Operations Documentation | Operational procedures and runbooks | [operations/README.md](./operations/README.md) |
| Deployment Documentation | Deployment guides and checklists | [deployment/README.md](./deployment/README.md) |
| Testing Documentation | Testing guides and QA reports | [testing/README.md](./testing/README.md) |
| Customer Service | Support workflows and troubleshooting | [operations/customer-service/README.md](./operations/customer-service/README.md) |
| Performance Monitoring | Performance monitoring guide | [operations/performance-monitoring.md](./operations/performance-monitoring.md) |

### Compliance

**Location**: `docs/compliance/`

| Resource | Purpose | Link |
|----------|---------|------|
| Compliance Documentation | COPPA, GDPR, child safety | [compliance/README.md](./compliance/README.md) |
| Privacy Policy | Privacy policy and data handling | [compliance/privacy-policy.md](./compliance/privacy-policy.md) |
| COPPA Compliance | COPPA compliance documentation | [compliance/coppa.md](./compliance/coppa.md) |
| GDPR Compliance | GDPR compliance documentation | [compliance/gdpr.md](./compliance/gdpr.md) |
| PRIVO Certification | PRIVO certification package | [compliance/privo-certification-package.md](./compliance/privo-certification-package.md) |

### Development

**Location**: `docs/development/`, `docs/setup/`, `docs/packages/`

| Resource | Purpose | Link |
|----------|---------|------|
| Development Guide | Development practices and architecture | [development/README.md](./development/README.md) |
| Setup Guides | Setup and configuration guides | [setup/](./setup/) |
| Package Documentation | Supporting and service packages | [packages/README.md](./packages/README.md) |
| Implementation Guides | Step-by-step implementation guides | [implementation-guides/](./implementation-guides/) |
| QA Reports | Quality assurance reports | [qa-reports/](./qa-reports/) |

### Design

**Location**: `docs/design/`, `docs/brand/`

| Resource | Purpose | Link |
|----------|---------|------|
| Design System | Complete design system | [design/design-system.md](./design/design-system.md) |
| UX Guide | UX principles and patterns | [design/ux-guide.md](./design/ux-guide.md) |
| Brand Guidelines | Brand positioning and guidelines | [brand/](./brand/) |
| Voice and Tone | Communication standards | [design/voice-and-tone.md](./design/voice-and-tone.md) |
| Content Guidelines | Content creation guidelines | [design/content-creation-guidelines.md](./design/content-creation-guidelines.md) |

---

## File Location Quick Reference

| What You Need | File Path | Description |
|--------------|-----------|-------------|
| **System architecture** | `docs/system/architecture.md` | Complete system architecture with diagrams |
| **All agents** | `docs/agents/README.md` | Index of all 26 agents |
| **API endpoints** | `docs/api-reference/README.md` | Complete API documentation |
| **Database schema** | `docs/system/database-schema-inventory.md` | 120+ tables, indexes, RLS policies |
| **Lambda functions** | `docs/system/inventory.md` | Complete system inventory |
| **Deployment guides** | `docs/deployment/README.md` | Deployment guides and checklists |
| **Development workflow** | `docs/HOW_WE_WORK.md` | Development workflow and code organization |
| **Product overview** | `docs/storytailor/product-overview.md` | Product features and capabilities |
| **User journeys** | `docs/user-journeys/` | Complete user journey documentation |
| **Integration guides** | `docs/integration-guides/` | Platform-specific integration guides |
| **SDK documentation** | `docs/platform/sdks/README.md` | Web, iOS, Android, React Native SDKs |
| **Sales playbook** | `docs/sales/README.md` | Sales strategy, objections, demos |
| **Marketing strategy** | `docs/marketing/README.md` | Marketing and competitive analysis |
| **Finance documentation** | `docs/finance/README.md` | Revenue models and unit economics |
| **Compliance docs** | `docs/compliance/README.md` | COPPA, GDPR, child safety |
| **Design system** | `docs/design/design-system.md` | Complete design system |
| **Brand guidelines** | `docs/brand/` | Brand positioning and guidelines |
| **Testing guides** | `docs/testing/README.md` | Testing guides and QA reports |
| **Operations runbooks** | `docs/operations/README.md` | Operational procedures and runbooks |
| **Executive metrics** | `docs/executive/key-metrics.md` | Key business and technical metrics |
| **Setup guides** | `docs/setup/` | Setup and configuration guides |
| **Agent code location** | `docs/agents/{agent-name}/where.md` | Deployment location for each agent |
| **Agent development** | `docs/agents/{agent-name}/development.md` | Technical implementation for each agent |
| **SSM parameters** | `docs/system/ssm-parameters-inventory.md` | Complete SSM parameter reference |
| **Code to deployment** | `docs/system/code-to-deployment-mapping.md` | Code package to Lambda mapping |

---

## Common Onboarding Paths

### Engineering Onboarding Path

**Step-by-step reading order:**

1. **[What This Is](./WHAT_THIS_IS.md)** - Understand the product and technical foundation
2. **[Mental Model](./MENTAL_MODEL.md)** - Understand system architecture and boundaries
3. **[How We Work](./HOW_WE_WORK.md)** - Understand development workflow and code organization
4. **[System Architecture](./system/architecture.md)** - Deep dive into system architecture
5. **[Agents Index](./agents/README.md)** - Understand all agents and their roles
6. **[Development Guide](./development/README.md)** - Development practices and architecture
7. **[System Inventory](./system/inventory.md)** - Understand deployed infrastructure
8. **[Deployment Documentation](./deployment/README.md)** - Learn deployment process
9. **[API Reference](./api-reference/README.md)** - Understand API endpoints
10. **[Testing Documentation](./testing/README.md)** - Learn testing practices

**Next Steps:**
- Pick an agent to work on: `docs/agents/{agent-name}/`
- Review code: `packages/{agent-name}/`
- Set up local environment: `docs/setup/`

### Product Onboarding Path

**Step-by-step reading order:**

1. **[What This Is](./WHAT_THIS_IS.md)** - Understand the product and target users
2. **[Product Overview](./storytailor/product-overview.md)** - Product features and capabilities
3. **[Platform Overview](./storytailor/platform-overview.md)** - Platform capabilities
4. **[User Journeys](./user-journeys/)** - Complete user journey documentation
5. **[Product Documentation](./product/)** - Feature specifications and system design
6. **[Roadmaps](./roadmaps/)** - Development and feature roadmaps
7. **[Business Documentation](./business/README.md)** - Pricing, PLG, partnerships

**Next Steps:**
- Review specific features: `docs/product/`
- Understand user flows: `docs/user-journeys/`
- Review business context: `docs/business/`, `docs/sales/`, `docs/marketing/`

### Business Onboarding Path

**Step-by-step reading order:**

1. **[What This Is](./WHAT_THIS_IS.md)** - Understand the product and market position
2. **[Sales Playbook](./sales/README.md)** - Sales strategy, objections, demos
3. **[Marketing Strategy](./marketing/README.md)** - Marketing and competitive analysis
4. **[Finance Documentation](./finance/README.md)** - Revenue models and unit economics
5. **[Economics](./economics/README.md)** - Financial projections, ROI, scaling
6. **[Business Documentation](./business/README.md)** - Partnerships, affiliates, promotions
7. **[Product Overview](./storytailor/product-overview.md)** - Product features

**Next Steps:**
- Review sales materials: `docs/sales/`
- Understand pricing: `docs/business/`, `docs/finance/`
- Review partnerships: `docs/business/partnerships/`

---

## Special Sections

### For AI IDEs

**Essential Resources:**

| Resource | Purpose | Link |
|----------|---------|------|
| **Code References** | All docs include code references (file paths, line numbers) | See any doc |
| **System Inventory** | Lambda functions, SSM parameters, database | [system/inventory.md](./system/inventory.md) |
| **API Endpoints** | 60+ REST API endpoints with schemas | [system/api-endpoints-inventory.md](./system/api-endpoints-inventory.md) |
| **Database Schema** | 120+ tables with relationships | [system/database-schema-inventory.md](./system/database-schema-inventory.md) |
| **Agent Documentation** | Technical implementation for each agent | `docs/agents/{agent-name}/development.md` |
| **Deployment Mapping** | Code package to Lambda function mapping | [system/code-to-deployment-mapping.md](./system/code-to-deployment-mapping.md) |
| **Architecture Diagrams** | Mermaid diagrams and data flows | [system/architecture.md](./system/architecture.md) |

**Key Patterns:**
- All documentation includes code references
- Agent docs follow consistent structure (what, why, when, where, who, development, marketing, cost)
- System docs include verification status and code paths

### For New Teammates

**Role-Specific Guides:**

| Role | Guide Location | Link |
|------|----------------|------|
| **Engineering** | Engineering Role Guide | [roles/engineering.md](./roles/engineering.md) |
| **Product** | Product Role Guide | [roles/product.md](./roles/product.md) |
| **Design** | Design Role Guide | [roles/design.md](./roles/design.md) |
| **Marketing** | Marketing Role Guide | [roles/marketing.md](./roles/marketing.md) |
| **Sales** | Sales Role Guide | [roles/sales.md](./roles/sales.md) |
| **Finance** | Finance Role Guide | [roles/finance.md](./roles/finance.md) |
| **Customer Service** | Customer Service Role Guide | [roles/customer-service.md](./roles/customer-service.md) |

### For Partners

**Integration Resources:**

| Resource | Purpose | Link |
|----------|---------|------|
| **Partner Integration** | Partner integration guide | [storytailor/partner-integration.md](./storytailor/partner-integration.md) |
| **Integration Guides** | Platform-specific integration guides | [integration-guides/](./integration-guides/) |
| **SDK Documentation** | Web, iOS, Android, React Native SDKs | [platform/sdks/README.md](./platform/sdks/README.md) |
| **API Reference** | Complete API documentation | [api-reference/README.md](./api-reference/README.md) |
| **Partner Onboarding** | Partner onboarding guide | [integration-guides/partner-onboarding.md](./integration-guides/partner-onboarding.md) |

### For Auditors

**Compliance & Security Resources:**

| Resource | Purpose | Link |
|----------|---------|------|
| **Compliance Documentation** | COPPA, GDPR, child safety | [compliance/README.md](./compliance/README.md) |
| **Privacy Policy** | Privacy policy and data handling | [compliance/privacy-policy.md](./compliance/privacy-policy.md) |
| **Security Framework** | Security and compliance framework | [agents/security-framework/](./agents/security-framework/) |
| **System Architecture** | Complete architecture for security review | [system/architecture.md](./system/architecture.md) |
| **Database Schema** | Database structure and RLS policies | [system/database-schema-inventory.md](./system/database-schema-inventory.md) |
| **Audit Trail** | System inventory and verification | [system/inventory.md](./system/inventory.md) |

---

## Related Documentation

- **[GLOBAL_INDEX.md](./GLOBAL_INDEX.md)** - Complete documentation index (460+ files)
- **[README.md](./README.md)** - Documentation overview and quick start
- **[Agents Index](./agents/README.md)** - All agent documentation
- **[Package Index](./packages/README.md)** - Supporting and service packages

---

**Last Updated**: 2025-01-15  
**Maintained By**: Documentation Team  
**For Questions**: See [How We Work](./HOW_WE_WORK.md) or [Ownership](./OWNERSHIP.md)
