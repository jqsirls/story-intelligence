# Storytailor Documentation

**Last Updated**: 2025-12-14  
**Total Documentation**: 444+ files  
**Status**: ✅ Complete - All documentation phases completed

Welcome to the comprehensive Storytailor documentation. This documentation suite covers all aspects of the Storytailor platform, from agent architecture to business documentation, from development guides to operational procedures.

## Quick Navigation

### Start Here (Canonical Documentation)

These are the authoritative documents - single source of truth:

- **[What This Is](./WHAT_THIS_IS.md)** - Product overview, target users, what it's not
- **[Mental Model](./MENTAL_MODEL.md)** - System architecture, boundaries, how parts connect
- **[How We Work](./HOW_WE_WORK.md)** - Development workflow, disposable artifacts policy
- **[Naming](./NAMING.md)** - Naming conventions and shared vocabulary
- **[Ownership](./OWNERSHIP.md)** - Ownership by role, approvals, escalation
- **[Decisions](./DECISIONS.md)** - Decision log, short and factual
- **[Working Notes](./WORKING_NOTES.md)** - Temporary notes (actively pruned, non-authoritative)

### Operational Guides
- **[Definition of Done](./DEFINITION_OF_DONE.md)** - DoD checklist
- **[PII Handling Runbook](./operations/pii-handling-runbook.md)** - PII handling procedures
- **[Secrets Management](./operations/secrets-management.md)** - Secrets management guide
- **[Performance Monitoring](./operations/performance-monitoring.md)** - Performance monitoring guide

### For Developers
- **[Agent Documentation](./agents/README.md)** - Complete documentation for all 24+ agents
- **[API Reference](./api-reference/README.md)** - Complete API documentation
- **[Platform SDKs](./platform/sdks/README.md)** - Web, iOS, Android, React Native SDKs
- **[Development Guide](./development/README.md)** - Development and architecture guides
- **[Setup Guides](./setup/)** - Setup and configuration guides
- **[Implementation Guides](./implementation-guides/)** - Step-by-step implementation guides
- **[QA Reports](./qa-reports/)** - Quality assurance reports and analysis

### For Business Teams
- **[Sales Documentation](./sales/README.md)** - Sales playbook, objections, demo guides
- **[Marketing Documentation](./marketing/README.md)** - Marketing strategy and competitive analysis
- **[Finance Documentation](./finance/README.md)** - Revenue models, costs, unit economics
- **[Design Documentation](./design/README.md)** - Design system and brand guidelines
- **[Business Documentation](./business/README.md)** - Pricing, PLG, unit economics, partnerships, affiliates, promotions

### For Operations
- **[Deployment Documentation](./deployment/README.md)** - Deployment guides and checklists
- **[Operations Documentation](./operations/README.md)** - Operational procedures and runbooks
- **[System Documentation](./system/README.md)** - System inventory and architecture

### For Compliance
- **[Compliance Documentation](./compliance/README.md)** - COPPA, GDPR, child safety
- **[Patentability Documentation](./patentability/README.md)** - Story Intelligence innovations

### For Executives
- **[Executive Documentation](./executive/README.md)** - System status, production readiness, key metrics
- **[System Status](./executive/system-status.md)** - Current infrastructure and health metrics
- **[Production Readiness](./executive/production-readiness.md)** - Production readiness checklist
- **[Key Metrics](./executive/key-metrics.md)** - Infrastructure, service, and performance metrics

## Documentation Index

- **[Global Index](./GLOBAL_INDEX.md)** - Complete documentation index
- **[Agents Index](./agents/README.md)** - All agent documentation
- **[Package Index](./packages/README.md)** - Supporting and service packages

## 🔄 **Latest Updates**

### **Version 4.0.0 - January 2025**
- ✅ **FIXED**: Adult registration now works (age validation 3-120)
- ✅ **NEW**: Comprehensive user type system (18 categories)
- ✅ **ENHANCED**: COPPA compliance for children under 13
- ⚠️ **BREAKING**: Registration endpoint requires new fields

**Quick Migration**: Add `firstName`, `lastName`, `age`, and `userType` to registration calls.
**Full Details**: [View Changelog](./CHANGELOG.md)

## Quick Start

- [5-Minute Web Integration](./integration-guides/web-sdk.md)
- [Mobile App Integration](./integration-guides/mobile-sdk.md)
- [Voice Platform Integration](./integration-guides/voice-platforms.md)
- [REST API Integration](./integration-guides/rest-api.md)

## Integration Guides

### Platform-Specific Guides
- [Web SDK Integration](./integration-guides/web-sdk.md) - Embed chat widgets and voice interfaces
- [iOS SDK Integration](./integration-guides/ios-sdk.md) - Native iOS app integration
- [Android SDK Integration](./integration-guides/android-sdk.md) - Native Android app integration
- [React Native Integration](./integration-guides/react-native-sdk.md) - Cross-platform mobile apps
- [Voice Platform Integration](./integration-guides/voice-platforms.md) - Alexa, Google Assistant, Siri
- [REST API Integration](./integration-guides/rest-api.md) - Server-to-server integration

### Advanced Integration
- [Webhook Integration](./integration-guides/webhooks.md) - Real-time event notifications
- [White-Label Solutions](./integration-guides/white-label.md) - Enterprise customization
- [Partner Onboarding](./integration-guides/partner-onboarding.md) - Third-party integrations
- [Email Integration](./integration-guides/email-integration-plan.md) - Email service integration guide

## Developer Tools

- [Interactive API Explorer](./tools/api-explorer.md) - Test APIs with live examples
- [Code Generators](./tools/code-generators.md) - Generate integration code
- [Testing Tools](./tools/testing.md) - Sandbox environment and testing utilities
- [Developer Dashboard](./tools/dashboard.md) - Manage API keys and analytics

## Reference

- [API Reference](./api-reference/README.md) - Complete API documentation
- [SDK Reference](./sdk-reference/README.md) - SDK method documentation
- [Event Reference](./event-reference/README.md) - Webhook events and payloads
- [Error Codes](./reference/error-codes.md) - Error handling guide

## Examples

- [Code Examples](./examples/README.md) - Working code samples
- [Use Cases](./examples/use-cases.md) - Common integration patterns
- [Best Practices](./examples/best-practices.md) - Recommended approaches

## Support

- [Customer Service Documentation](./operations/customer-service/README.md) - Support workflows and troubleshooting
- [Support Workflows](./operations/customer-service/support-workflows.md) - Ticket routing, SLAs, escalation paths
- [Troubleshooting Guide](./operations/customer-service/troubleshooting.md) - Common issues and technical troubleshooting
- [FAQ](./support/faq.md) - Frequently asked questions
- [Troubleshooting](./support/troubleshooting.md) - Common issues and solutions
- [Community](./support/community.md) - Developer community resources
- [Contact Support](./support/contact.md) - Get help from our team

---

## Getting Started

For new team members, start with the canonical documentation:
1. [What This Is](./WHAT_THIS_IS.md) - Understand the product
2. [Mental Model](./MENTAL_MODEL.md) - Understand the architecture
3. [How We Work](./HOW_WE_WORK.md) - Understand the workflow
4. [AGENTS.md](../AGENTS.md) - Guide for AI coding agents
