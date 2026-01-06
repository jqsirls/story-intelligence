# User Research Agent - What

**Status**: ✅ Active  
**Last Updated**: 2025-12-14

## Core Functionality

Fieldnotes (User Research Agent) operates as a standing internal research team that never sleeps. It provides adversarial truth-telling insights through five parallel analysis tracks, continuously observing behavior, synthesizing signals, challenging assumptions, and surfacing risks early.

## Five Parallel Tracks

### 1. Continuous Insight Mining

**Purpose**: Turn raw behavior into clear insights

**What it watches:**
- Product usage patterns
- Abandoned flows and drop-offs
- Retries and rage clicks
- Story creation patterns
- Prompt edits and iterations
- Feature adoption rates

**Output**: Weekly insights with evidence and recommendations

**Implementation**: `packages/user-research-agent/src/core/tracks/ContinuousInsightMining.ts`

### 2. Buyer Reality Checks

**Purpose**: Simulate and pressure-test buyer/decision-maker expectations

**For Storytailor**: Parent persona evaluation
- Time constraints (busy parents)
- Trust factors (child safety)
- Value perception (worth the subscription?)
- Patience limits (when do they quit?)

**For B2B**: Decision-maker persona
- ROI expectations
- Integration complexity
- Security concerns
- Budget constraints

**Output**: Buyer lens analysis for features and flows

**Implementation**: `packages/user-research-agent/src/core/tracks/BuyerRealityCheck.ts`

### 3. User Experience Guardrails

**Purpose**: Evaluate outcomes through end-user lens

**For Storytailor**: Child perspective
- Fun density (delight per minute)
- Cognitive load (too complex?)
- Emotional tone (engaging or preachy?)
- Delight moments (what makes them smile?)

**For B2B**: End-user perspective (developers, ICs)
- Developer experience
- API usability
- Documentation clarity
- Onboarding friction

**Output**: User experience flags and recommendations

**Implementation**: `packages/user-research-agent/src/core/tracks/UserExperienceGuardrails.ts`

### 4. Concept Interrogation

**Purpose**: Pre-mortem analysis before building features

**Questions it asks:**
- WHO is this for? (prove with data)
- WHEN would they quit?
- WHAT will confuse them?
- WHY would they care?
- WHERE will they get stuck?

**Output**: Pre-launch risk memo with ship/don't ship/fix first recommendation

**Implementation**: `packages/user-research-agent/src/core/tracks/ConceptInterrogation.ts`

### 5. Brand Consistency

**Purpose**: Audit language, onboarding, and flows against brand voice

**What it flags:**
- Generic, corporate language
- Off-brand messaging
- Inconsistent tone
- Missing brand personality
- Generic onboarding flows

**Output**: Language and UX flags with specific recommendations

**Implementation**: `packages/user-research-agent/src/core/tracks/BrandConsistency.ts`

## Adversarial Components

### Truth Teller

Detects self-deception and uncomfortable truths:

- **Self-deception detection**: Identifies when teams are lying to themselves
- **Reality checks**: Compares claims against actual data
- **Uncomfortable truths**: Surfaces facts that challenge assumptions

**Implementation**: `packages/user-research-agent/src/core/TruthTeller.ts`

### Tension Mapper

Identifies conflicting priorities across tracks:

- **Tension detection**: Finds where tracks conflict
- **Priority conflicts**: Buyer needs vs user needs
- **Resource tensions**: What to fix first

**Implementation**: `packages/user-research-agent/src/core/TensionMapper.ts`

### Agent Challenger

Enables challenging other agents with data-backed questions:

- **Agent interrogation**: Questions other agents' outputs
- **Data-backed challenges**: Uses research data to challenge decisions
- **Cross-agent validation**: Ensures consistency across agents

**Implementation**: `packages/user-research-agent/src/core/AgentChallenger.ts`

## Cost Optimization

Fieldnotes achieves $150-300/month costs through:

### Batch Processing
- **Hourly**: Data aggregation (SQL only, $0 cost)
- **Daily**: Pattern detection (cheap LLM, ~$2-5/day)
- **Weekly**: Brief generation (premium LLM, ~$10-20/week)

### Smart Sampling
- Analyzes 10% of events, maintains 95% accuracy
- Adaptive sampling increases when anomalies detected
- Critical events analyzed at 100% rate

### Model Tiering
- 90% of operations use cheap models (GPT-4o-mini, Claude Haiku)
- 10% use premium models (Claude Sonnet) for strategic synthesis
- Weighted average cost: $0.28 per operation

### Aggressive Caching
- Stable metrics cached for 7 days
- Only re-computes when significant change detected
- 60-80% cost reduction on stable periods

**Implementation**: See `packages/user-research-agent/src/core/ModelOrchestrator.ts`, `BatchProcessor.ts`, `SmartSampler.ts`, `CostController.ts`

## Outputs

### Weekly Research Brief

Delivered every Monday at 9 AM UTC:

- 🔴 **CRITICAL**: Fix this week (with evidence)
- 🟡 **TENSIONS**: Choose soon (conflicting priorities)
- 🟢 **OPPORTUNITY**: Worth exploring (patterns suggesting new features)
- 🗑️ **KILL LIST**: Features not earning their keep
- ⚠️ **WHAT WE'RE LYING TO OURSELVES ABOUT**: Self-deception alerts

**Format**: Plain language, no fluff, actionable recommendations

### Pre-Launch Risk Memo

Generated on-demand for proposed features:

- **WHO is this for?** (with data proof)
- **WHEN would they quit?** (drop-off points)
- **WHAT will confuse them?** (friction points)
- **Buyer lens analysis** (decision-maker perspective)
- **User lens analysis** (end-user perspective)
- **Recommendation**: Ship / Don't Ship / Fix First

### Agent Challenges

Research agent can interrogate other agents:

- Data-backed questions to other agents
- Cross-validation of agent outputs
- Synthesis of conflicting information

## Data Sources

Fieldnotes has access to:

- **Product analytics**: Event store, user behavior
- **User-generated content**: Stories, edits, prompts
- **Support tickets**: Customer issues and feedback
- **Internal roadmaps**: Planned features and experiments
- **All other agents**: Can challenge and interrogate

## Integration Methods

### REST API
- HTTP endpoints for programmatic access
- API key authentication
- Function URL: `https://jtefgwkgd54fggqcf62hhhw3d40rwrbj.lambda-url.us-east-1.on.aws/`

### MCP Server
- Model Context Protocol for AI assistant integration
- Available tools: `fieldnotes_analyze`, `fieldnotes_challenge_decision`, `fieldnotes_generate_brief`, `fieldnotes_interrogate_agent`

### Client SDK
- TypeScript SDK for easy integration
- `@alexa-multi-agent/user-research-agent/sdk`

### Delivery Channels
- **Slack**: Weekly briefs and critical findings
- **Email**: Scheduled reports and alerts
- **Webhooks**: Custom integrations (Make.com, Zapier, Buildship)

## Multi-Tenant Architecture

Fieldnotes is multi-tenant from day 1:

- **Storytailor**: Tenant #1 (internal use)
- **Future tenants**: Ready for external customers
- **Isolated data**: RLS policies per tenant
- **Custom personas**: Buyer + user personas per tenant
- **Independent cost tracking**: Per-tenant budgets and limits

## Technical Architecture

```
ResearchEngine (orchestrator)
├── Five Track Implementations
│   ├── ContinuousInsightMining
│   ├── BuyerRealityCheck
│   ├── UserExperienceGuardrails
│   ├── ConceptInterrogation
│   └── BrandConsistency
├── Cost Optimization
│   ├── ModelOrchestrator (LLM routing)
│   ├── BatchProcessor (batch processing)
│   ├── SmartSampler (event sampling)
│   └── CostController (budget enforcement)
├── Adversarial Components
│   ├── TruthTeller (self-deception detection)
│   ├── TensionMapper (conflict identification)
│   └── AgentChallenger (agent interrogation)
└── Integrations
    ├── SlackAdapter
    ├── EmailAdapter
    └── WebhookAdapter
```

## Key Capabilities

1. **Continuous observation** - Never stops watching
2. **Adversarial analysis** - Challenges assumptions
3. **Cost-efficient** - $150-300/month operation
4. **Integration-native** - Works where you work
5. **Multi-tenant** - Ready for external customers
6. **Agent interrogation** - Can challenge other agents
7. **Plain language** - No fluff, actionable insights
