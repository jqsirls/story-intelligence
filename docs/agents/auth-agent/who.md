# Auth Agent - Team and Ownership

**Status**: Draft  
**Audience**: Internal  
**Last Updated**: 2025-12-11

## Ownership

### Primary Owner
- **Team**: Platform Engineering
- **Role**: Authentication & Security
- **Contact**: TBD

### Stakeholders
- **Product**: User experience and feature requirements
- **Security**: Security and compliance requirements
- **DevOps**: Deployment and infrastructure
- **Legal**: COPPA/GDPR compliance

## Team Responsibilities

### Platform Engineering
- **Development**: Feature development and bug fixes
- **Maintenance**: Ongoing maintenance and updates
- **Security**: Security reviews and vulnerability fixes
- **Documentation**: Technical documentation

### Product Team
- **Requirements**: Feature requirements and user stories
- **Prioritization**: Feature prioritization
- **User Experience**: UX design and testing

### Security Team
- **Security Reviews**: Code and architecture reviews
- **Compliance**: COPPA/GDPR compliance verification
- **Vulnerability Management**: Security vulnerability handling

### DevOps Team
- **Deployment**: Deployment and infrastructure
- **Monitoring**: Monitoring and alerting setup
- **Incident Response**: Production incident handling

## Code Ownership

### Source Code
- **Package**: `packages/auth-agent/`
- **Maintainers**: Platform Engineering team
- **Reviewers**: Security team for security-related changes

### Deployment
- **Lambda Function**: `storytailor-auth-agent-production`
- **Deployment Script**: `scripts/deploy-auth-agent.sh`
- **Infrastructure**: Managed by DevOps team

## Contact Information

### For Issues
- **GitHub Issues**: Create issue in repository
- **Slack Channel**: #platform-auth (if exists)
- **Email**: TBD

### For Questions
- **Technical Questions**: Platform Engineering team
- **Security Questions**: Security team
- **Compliance Questions**: Legal team

## Decision Making

### Feature Requests
- **Approval**: Product team + Platform Engineering
- **Security Review**: Required for security-related features
- **Compliance Review**: Required for COPPA/GDPR changes

### Breaking Changes
- **Approval**: Requires team lead approval
- **Communication**: Must communicate to all stakeholders
- **Migration**: Must provide migration path
