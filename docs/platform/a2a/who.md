# A2A (Agent-to-Agent) Protocol - Who

**Last Updated**: 2025-12-17

## Team Ownership

A2A (Agent-to-Agent) Protocol is a critical component of the Storytailor platform, with primary ownership residing within the **Platform Integration & Partner Team**.

### Primary Owner

- **Team**: Platform Integration & Partner Team
- **Lead**: [Lead Engineer Name/Alias]
- **Contact**: #platform-integration-partner-team on Slack

### Secondary Contacts / Contributors

- **Team**: Core AI & Conversational Experience Team (for Router integration and agent coordination)
- **Team**: Platform Infrastructure Team (for deployment, scaling, and Universal Agent Lambda configuration)
- **Team**: Partner Integration Team (for external partner requirements and integration support)
- **Team**: Product Management (for feature roadmap and partner integration priorities)

## Key Stakeholders

- **Product Management**: Defines partner integration priorities, A2A protocol requirements, and integration roadmap.
- **Engineering Team**: Responsible for A2A adapter implementation, protocol compliance, and integration with Universal Agent.
- **Partner Integration Team**: Works with external partners (Amazon Alexa+, third-party agents) to ensure successful A2A integration.
- **Platform Infrastructure Team**: Ensures A2A adapter's infrastructure (bundled with Universal Agent Lambda) is properly configured, scaled, and monitored.
- **Marketing Team**: Leverages A2A protocol capabilities for partner-focused messaging and positioning.

## On-Call / Support

- **Primary On-Call**: Platform Integration & Partner Team
- **Escalation**: Platform Infrastructure Team
- **Support Channel**: #engineering-support on Slack

## Contribution Guidelines

- All code changes must be reviewed and approved by at least one member of the Platform Integration & Partner Team.
- Significant architectural changes (e.g., new A2A endpoints, protocol changes) require an RFC (Request for Comments) process involving relevant stakeholders.
- A2A protocol implementations must follow JSON-RPC 2.0 protocol standards and A2A protocol specification.
- Documentation updates are highly encouraged and should follow the established [Naming Conventions](../../NAMING.md) and documentation guidelines.
- Security reviews are required for any changes affecting authentication, authorization, or webhook delivery.
