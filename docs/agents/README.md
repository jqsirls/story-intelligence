# Agent Documentation Index

**Last Updated**: 2025-12-14  
**Total Agents**: 25+ specialized agents  
**Documentation Status**: ✅ Complete (all agents have 9-file structure)  
**Region**: us-east-1

## Documentation Structure

Each agent has comprehensive documentation in `docs/agents/{agent-name}/` with 9 files:

1. **README.md** - Overview and quick start
2. **what.md** - Detailed functionality and capabilities
3. **why.md** - Business rationale and value proposition
4. **when.md** - Usage guidelines and integration points
5. **where.md** - Deployment location and Lambda configuration
6. **who.md** - Team ownership and maintainers
7. **development.md** - Technical implementation and API reference
8. **marketing.md** - Value proposition and features
9. **cost.md** - Cost per operation and economics

## All Agents (Complete Documentation)

### Core Orchestration
- ✅ **[Universal Agent](./universal-agent/)** - Central API Gateway and orchestration
- ✅ **[Router](./router/)** - Intent classification and agent delegation

### Content & Story Generation
- ✅ **[Content Agent](./content-agent/)** - Story and character generation
- ✅ **[Storytailor Agent](./storytailor-agent/)** - Story orchestration and multi-agent coordination
- ✅ **[Library Agent](./library-agent/)** - Library management with RLS
- ✅ **[Character Agent](./character-agent/)** - Character creation and design

### Intelligence & Understanding
- ✅ **[Kid Communication Intelligence](./kid-communication-intelligence/)** - Audio preprocessing and transcription
- ✅ **[Emotion Agent](./emotion-agent/)** - Daily emotional check-ins and pattern detection
- ✅ **[Conversation Intelligence](./conversation-intelligence/)** - Advanced NLU and contextual memory
- ✅ **[Analytics Intelligence](./analytics-intelligence/)** - Privacy-preserving analytics
- ✅ **[Insights Agent](./insights-agent/)** - Pattern analysis and recommendations
- ✅ **[User Research Agent](./user-research-agent/)** - Standing research team providing adversarial truth-telling insights (Fieldnotes)

### Safety & Compliance
- ✅ **[Child Safety Agent](./child-safety-agent/)** - Crisis detection and mandatory reporting
- ✅ **[Content Safety](./content-safety/)** - Prompt sanitization and content filtering
- ✅ **[Security Framework](./security-framework/)** - Security and compliance framework

### User & Identity
- ✅ **[Auth Agent](./auth-agent/)** - Authentication and account management
- ✅ **[IDP Agent](./idp-agent/)** - OAuth 2.0 and OpenID Connect

### Specialized Domains
- ✅ **[Personality Agent](./personality-agent/)** - Brand voice and character consistency
- ✅ **[Educational Agent](./educational-agent/)** - Classroom tools and assessments
- ✅ **[Therapeutic Agent](./therapeutic-agent/)** - Evidence-based therapeutic pathways
- ✅ **[Knowledge Base Agent](./knowledge-base-agent/)** - Knowledge management
- ✅ **[Accessibility Agent](./accessibility-agent/)** - Accessibility features
- ✅ **[Localization Agent](./localization-agent/)** - Multi-language support
- ✅ **[Smart Home Agent](./smart-home-agent/)** - Smart home integration
- ✅ **[Commerce Agent](./commerce-agent/)** - Stripe integration and subscriptions

### Infrastructure & Services
- ✅ **[Voice Synthesis](./voice-synthesis/)** - TTS orchestration with failover
- ✅ **[Event System](./event-system/)** - Event publishing and subscription
- ✅ **[Health Monitoring](./health-monitoring/)** - Service health monitoring
- ✅ **[Avatar Agent](./avatar-agent/)** - Live avatar sessions (staging)

## Documentation Status

- **Total Agents**: 25+
- **Complete Documentation**: 25/25 (100%)
- **Total Files**: 225+ (25 agents × 9 files)
- **Region**: us-east-1 (all production resources)
- **Last Updated**: 2025-12-14

## Quick Navigation

### By Category
- **Core Orchestration**: Universal Agent, Router
- **Content & Story**: Content Agent, Storytailor Agent, Library Agent, Character Agent
- **Intelligence**: Kid Communication, Emotion, Conversation, Analytics, Insights, User Research
- **Safety**: Child Safety, Content Safety, Security Framework
- **User & Identity**: Auth Agent, IDP Agent
- **Specialized**: Personality, Educational, Therapeutic, Knowledge Base, Accessibility, Localization, Smart Home, Commerce
- **Infrastructure**: Voice Synthesis, Event System, Health Monitoring, Avatar Agent

### By Deployment Status
- **Production (us-east-1)**: All agents except Avatar Agent (staging only)
- **Lambda Functions**: All agents deployed as `storytailor-{agent-name}-production`

## Related Documentation

- **System Documentation**: See [System Documentation](../system/README.md)
- **Global Index**: See [Global Documentation Index](../GLOBAL_INDEX.md)
- **Platform Documentation**: See [Platform Documentation](../platform/README.md)
- **Story Intelligence**: See [Story Intelligence Documentation](../story-intelligence/README.md)
