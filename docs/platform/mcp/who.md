# MCP (Model Context Protocol) - Who

**Last Updated**: 2025-12-17

## Team Ownership

MCP (Model Context Protocol) server is a critical component of the Storytailor platform, with primary ownership residing within the **Platform Integration & AI Tooling Team**.

### Primary Owner

- **Team**: Platform Integration & AI Tooling Team
- **Lead**: [Lead Engineer Name/Alias]
- **Contact**: #platform-integration-ai-tooling on Slack

### Secondary Contacts / Contributors

- **Team**: Core AI & Conversational Experience Team (for Router integration and agent coordination)
- **Team**: Platform Infrastructure Team (for deployment, scaling, and AWS Lambda configuration)
- **Team**: Developer Productivity Team (for AI assistant integration and developer experience)
- **Team**: Product Management (for feature roadmap and integration priorities)

## Key Stakeholders

- **Product Management**: Defines integration priorities, AI assistant support roadmap, and developer productivity goals.
- **Engineering Team**: Responsible for MCP server implementation, tool development, and protocol compliance.
- **Developer Productivity Team**: Leverages MCP for AI assistant integration (Cursor, Claude Desktop) and developer tooling.
- **Platform Infrastructure Team**: Ensures MCP server's infrastructure (Lambda, Function URL) is properly configured, scaled, and monitored.
- **Marketing Team**: Leverages AI assistant integration capabilities for developer-focused messaging and positioning.

## On-Call / Support

- **Primary On-Call**: Platform Integration & AI Tooling Team
- **Escalation**: Platform Infrastructure Team
- **Support Channel**: #engineering-support on Slack

## Contribution Guidelines

- All code changes must be reviewed and approved by at least one member of the Platform Integration & AI Tooling Team.
- Significant architectural changes (e.g., new tool additions, protocol changes) require an RFC (Request for Comments) process involving relevant stakeholders.
- Tool implementations must follow JSON-RPC 2.0 protocol standards.
- Documentation updates are highly encouraged and should follow the established [Naming Conventions](../../NAMING.md) and documentation guidelines.
- Security reviews are required for any changes affecting authentication, authorization, or rate limiting.
