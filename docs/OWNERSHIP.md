# Ownership

**Last Updated**: 2025-12-13

## Ownership Model

### Code Ownership

**Primary Owners**: Engineering Team
- **All packages**: Engineering team owns all code
- **Documentation**: Engineering + Product team
- **Infrastructure**: Engineering + DevOps

### Domain Ownership

#### Authentication & Security
- **Owner**: Engineering (Security focus)
- **Packages**: `auth-agent`, `security-framework`, `child-safety-agent`
- **Approvals**: Security review required for changes

#### Content & Storytelling
- **Owner**: Engineering + Product
- **Packages**: `content-agent`, `library-agent`, `storytailor-agent`
- **Approvals**: Product approval for content generation changes

#### User Experience
- **Owner**: Product + Design
- **Areas**: User journeys, SDKs, UI components
- **Approvals**: Design review for UX changes

#### Infrastructure & Operations
- **Owner**: Engineering + DevOps
- **Areas**: Deployment, monitoring, database
- **Approvals**: DevOps approval for infrastructure changes

#### Compliance & Legal
- **Owner**: Legal + Engineering
- **Areas**: COPPA, GDPR, privacy, data handling
- **Approvals**: Legal review required for compliance changes

## Decision Authority

### Code Changes
- **Small changes** (< 100 lines): Engineering team
- **Medium changes** (100-500 lines): Engineering lead approval
- **Large changes** (> 500 lines): Engineering + Product approval
- **Breaking changes**: Engineering + Product + Stakeholder approval

### Documentation Changes
- **Technical docs**: Engineering team
- **User-facing docs**: Product + Engineering
- **Compliance docs**: Legal + Engineering

### Infrastructure Changes
- **Development**: Engineering team
- **Staging**: Engineering + DevOps
- **Production**: Engineering + DevOps + Stakeholder approval

## Escalation Path

### Level 1: Team Lead
- **When**: Disagreement on approach, unclear requirements
- **Who**: Engineering Lead or Product Lead
- **Time**: < 24 hours

### Level 2: Cross-Functional Review
- **When**: Impact across multiple teams, significant changes
- **Who**: Engineering + Product + Relevant stakeholders
- **Time**: < 48 hours

### Level 3: Executive Review
- **When**: Strategic decisions, major architectural changes
- **Who**: CTO/CEO + Relevant executives
- **Time**: < 1 week

## Approval Requirements

### Code Reviews
- **Minimum**: 1 reviewer (same domain)
- **Large changes**: 2 reviewers (different domains)
- **Security changes**: Security team review required
- **Compliance changes**: Legal review required

### Documentation Reviews
- **Technical docs**: Engineering review
- **User docs**: Product + Engineering review
- **Compliance docs**: Legal review required

### Deployment Approvals
- **Development**: No approval needed
- **Staging**: Engineering lead approval
- **Production**: Engineering + DevOps + Stakeholder approval

## Responsibilities

### Engineering Team
- Code quality and maintainability
- Test coverage (90% target)
- Documentation accuracy
- Performance and scalability
- Security best practices

### Product Team
- Feature requirements and prioritization
- User experience consistency
- Documentation clarity for users
- Business logic correctness

### DevOps Team
- Infrastructure reliability
- Deployment processes
- Monitoring and alerting
- Cost optimization

### Legal/Compliance Team
- COPPA/GDPR compliance
- Privacy policy accuracy
- Data handling procedures
- Terms of service updates

## Change Process

### Proposing Changes
1. **Create issue/PR**: Document the change
2. **Get feedback**: Share with relevant owners
3. **Get approval**: Follow approval requirements
4. **Implement**: Make the change
5. **Review**: Code/documentation review
6. **Merge**: After approvals

### Emergency Changes
- **Definition**: Production issues, security vulnerabilities
- **Process**: Fix first, document after
- **Approval**: Post-hoc approval from owners
- **Communication**: Notify team immediately

## Related Documentation

- [How We Work](./HOW_WE_WORK.md) - Development workflow
- [Decisions](./DECISIONS.md) - Decision log
