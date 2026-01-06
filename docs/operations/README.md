# Operations Documentation

**Last Updated**: 2025-12-14  
**Audience**: Operations | DevOps | Support Team

## Overview

This directory contains operational procedures, runbooks, and operational guides for the Storytailor platform.

## Operational Areas

### Customer Service

- **[Customer Service Documentation](./customer-service/README.md)** - Support workflows, troubleshooting, and escalation procedures
- **[Support Workflows](./customer-service/support-workflows.md)** - Ticket routing, response SLAs, escalation paths
- **[Troubleshooting Guide](./customer-service/troubleshooting.md)** - Common issues, technical troubleshooting, account management
- **[Team Handoff](./team-handoff.md)** - Team handoff documentation

### Monitoring and Alerting

- **Health Monitoring**: See [Health Monitoring Agent](../agents/health-monitoring/README.md)
- **CloudWatch**: Lambda function logs and metrics
- **System Metrics**: See [System Inventory](../system/inventory.md)

### Deployment Operations

- **Deployment Process**: See [Deployment Documentation](../deployment/README.md)
- **Lambda Functions**: 35 production functions in us-east-1
- **Region**: All production resources in us-east-1

### Incident Response

- **Health Checks**: `/health` endpoint on Universal Agent
- **Logs**: CloudWatch Logs for all Lambda functions
- **Alerts**: CloudWatch Alarms for critical metrics

### Data Management

- **Database**: Supabase (PostgreSQL) with RLS
- **Cache**: Redis for conversation state
- **Storage**: S3 for assets and backups

### Operational Runbooks

- **[PII Handling Runbook](./pii-handling-runbook.md)** - PII handling procedures and compliance
- **[Secrets Management](./secrets-management.md)** - Secrets management and security practices
- **[Performance Monitoring](./performance-monitoring.md)** - Performance monitoring and optimization

## Related Documentation

- **System Documentation**: See [System Documentation](../system/README.md)
- **Deployment**: See [Deployment Documentation](../deployment/README.md)
- **Monitoring**: See [Monitoring Package](../packages/supporting/monitoring.md)
- **Child Safety**: See [Child Safety Documentation](../compliance/child-safety.md)
- **Agent Handoff**: See [Agent Handoff Documentation](./agent-handoff.md)

