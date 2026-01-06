# Conversation Agent - Who

**Last Updated**: 2025-12-14

## Team Ownership

### Primary Maintainer

**Team**: Product Engineering  
**Role**: Senior Backend Engineer  
**Responsibilities**:
- Core agent development and maintenance
- ElevenLabs integration and optimization
- Conversation state management
- Smart home integration
- Performance and reliability

### Supporting Teams

**Conversation Intelligence Team**:
- Advanced NLU integration
- Contextual memory personalization
- Emotion detection improvements
- Developmental psychology integration

**Safety Team**:
- Safety protocol implementation
- Parent notification system
- Crisis detection integration
- COPPA compliance

**Infrastructure Team**:
- Lambda deployment and configuration
- API Gateway setup
- Redis cluster management
- Monitoring and observability

**Product Team**:
- Feature requirements and prioritization
- User experience design
- Age-adaptive interaction guidelines
- Accessibility requirements

## Contact Information

### For Development Issues

**Slack Channel**: `#conversation-agent`  
**On-Call Rotation**: See PagerDuty schedule  
**Escalation Path**: Product Engineering Lead → CTO

### For Product Questions

**Product Manager**: [Product Manager Name]  
**Slack**: `#product-conversation-agent`  
**Email**: product@storytailor.com

### For Safety Concerns

**Child Safety Team**: Immediate escalation  
**Slack**: `#child-safety-alerts`  
**On-Call**: 24/7 coverage

## Code Ownership

### Repository Structure

**Primary Location**: `lambda-deployments/conversation-agent/`

**Key Files**:
- `src/ConversationAgent.ts` - Main orchestrator
- `src/ElevenLabsAgentClient.ts` - WebSocket client
- `src/ConversationStateManager.ts` - State persistence
- `src/integrations/HueConversationIntegration.ts` - Smart home integration
- `src/prompts/FrankieSystemPrompt.ts` - System prompt builder
- `lambda.js` - Lambda handler

### Code Review Process

**Required Reviewers**:
- At least 1 senior engineer from Product Engineering
- Safety team review for safety-related changes
- Infrastructure team review for deployment changes

**Review Criteria**:
- Code quality and maintainability
- Safety protocol compliance
- Performance and scalability
- Test coverage (90% target)
- Documentation updates

## Decision Authority

### Technical Decisions

**Agent Maintainer**:
- Implementation approach
- Library and dependency choices
- Performance optimizations
- Code structure and architecture

**Product Engineering Lead**:
- Major architectural changes
- New feature additions
- Integration with other agents
- Breaking API changes

### Product Decisions

**Product Manager**:
- Feature prioritization
- User experience design
- Age-adaptive guidelines
- Conversation flow changes

**Safety Team**:
- Safety protocol changes
- Parent notification requirements
- Crisis detection thresholds
- Compliance requirements

### Infrastructure Decisions

**Infrastructure Team**:
- Deployment configuration
- Lambda settings (memory, timeout)
- API Gateway configuration
- Monitoring and alerting setup

## Collaboration

### With Other Agents

**Conversation Intelligence Agent**:
- Weekly sync on NLU improvements
- Shared emotion detection models
- Contextual memory integration

**Emotion Agent**:
- Emotion pattern sharing
- Long-term emotion tracking
- Developmental assessment integration

**Smart Home Agent**:
- Lighting control API
- Device connection management
- Room-specific configurations

**Child Safety Agent**:
- Tier 3 emotion alerts
- Crisis detection protocols
- Parent notification coordination

### With External Services

**ElevenLabs**:
- Platform updates and new features
- API changes and deprecations
- Performance optimization
- Support and troubleshooting

**Supabase**:
- Database schema changes
- Authentication integration
- Conversation history storage
- Parent notification system

## Onboarding

### For New Team Members

1. **Read Documentation**:
   - [What](./what.md) - Core capabilities
   - [Development](./development.md) - Technical implementation
   - [When](./when.md) - Usage guidelines

2. **Set Up Development Environment**:
   - Clone repository
   - Install dependencies
   - Configure environment variables
   - Set up local Redis instance
   - Get ElevenLabs API credentials

3. **Run Tests**:
   ```bash
   cd lambda-deployments/conversation-agent
   npm test
   ```

4. **Review Code**:
   - Start with `ConversationAgent.ts`
   - Review `ElevenLabsAgentClient.ts`
   - Understand state management in `ConversationStateManager.ts`

5. **Join Communication Channels**:
   - `#conversation-agent` (development)
   - `#product-conversation-agent` (product)
   - `#child-safety-alerts` (safety)

## Escalation Path

### Level 1: Agent Maintainer

**Issues**:
- Bug fixes
- Performance optimizations
- Feature enhancements
- Code reviews

**Response Time**: Within 24 hours

### Level 2: Product Engineering Lead

**Issues**:
- Architectural decisions
- Major feature additions
- Integration challenges
- Resource allocation

**Response Time**: Within 48 hours

### Level 3: CTO

**Issues**:
- Strategic direction
- Major platform changes
- Resource conflicts
- Critical production issues

**Response Time**: Immediate for critical issues

### Safety Escalation

**Tier 3 Emotions**: Immediate escalation to Child Safety Team  
**Crisis Detection**: Immediate escalation to Child Safety Team + On-Call  
**Parent Notification Failures**: Escalate to Safety Team within 1 hour

## Knowledge Sharing

### Documentation

**Internal Docs**:
- This documentation set (9 files)
- Code comments and JSDoc
- Architecture diagrams
- Runbooks for common operations

**External Docs**:
- ElevenLabs API documentation
- Supabase documentation
- Redis best practices
- AWS Lambda guides

### Regular Meetings

**Weekly Standup**: Monday 10 AM  
**Bi-Weekly Architecture Review**: Every other Friday  
**Monthly Retrospective**: First Monday of month  
**Quarterly Planning**: Beginning of each quarter

### Knowledge Base

**Confluence**: Internal knowledge base  
**Notion**: Product requirements and user research  
**GitHub Wiki**: Technical implementation details

## Responsibilities Matrix

| Responsibility | Owner | Collaborators |
|---------------|-------|---------------|
| Core Development | Agent Maintainer | Product Engineering |
| Safety Protocols | Safety Team | Agent Maintainer |
| Infrastructure | Infrastructure Team | Agent Maintainer |
| Product Features | Product Manager | Agent Maintainer |
| Performance | Agent Maintainer | Infrastructure Team |
| Monitoring | Infrastructure Team | Agent Maintainer |
| Documentation | Agent Maintainer | Product Team |
| On-Call Support | Agent Maintainer | Infrastructure Team |

## Success Metrics

### Team Health

- **Code Review Time**: <24 hours average
- **Bug Resolution Time**: <48 hours for P1, <1 week for P2
- **Feature Delivery**: On-time delivery rate >80%
- **Test Coverage**: Maintain >90%

### Agent Performance

- **Uptime**: >99.9%
- **Response Time**: <800ms average
- **Error Rate**: <0.1%
- **Safety Alert Response**: <5 minutes

### Team Satisfaction

- **On-Call Load**: <2 incidents per week
- **Documentation Quality**: Team satisfaction >4/5
- **Knowledge Sharing**: Regular contributions from all team members

