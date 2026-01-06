# Child Safety Agent

**Status**: ✅ Active  
**Package**: `@alexa-multi-agent/child-safety-agent`  
**Lambda Function**: `storytailor-child-safety-agent-production`  
**Region**: us-east-1  
**Last Updated**: 2025-12-13

## Overview

The Child Safety Agent provides comprehensive crisis detection, intervention, and mandatory reporting capabilities to ensure child safety during storytelling interactions. It monitors conversations for signs of distress, abuse, or self-harm and provides immediate intervention and professional escalation.

## Quick Start

### What It Does

The Child Safety Agent:
- **Crisis Detection**: Real-time monitoring for signs of distress, abuse, or self-harm
- **Mandatory Reporting**: Automated reporting to appropriate authorities when required
- **Parent Notifications**: Immediate alerts to parents/guardians for safety concerns
- **Professional Escalation**: Integration with mental health professionals and crisis services

### When to Use It

The Child Safety Agent is used for:
- All conversation monitoring
- Crisis detection and intervention
- Mandatory reporting when required
- Parent notifications for safety concerns

## Documentation Links

- [What It Does](./what.md) - Detailed functionality and capabilities
- [Why It Exists](./why.md) - Business rationale and value proposition
- [When to Use](./when.md) - Usage guidelines and integration points
- [Where It's Deployed](./where.md) - Deployment location and Lambda configuration
- [Who Owns It](./who.md) - Team ownership and maintainers
- [Development Guide](./development.md) - Technical implementation and API reference
- [Marketing Information](./marketing.md) - Value proposition and features
- [Cost Analysis](./cost.md) - Cost per operation and economics

## Key Features

### Crisis Detection
- Real-time monitoring for signs of distress, abuse, or self-harm
- Voice pattern analysis for emotional distress
- Interaction monitoring for concerning patterns
- Risk assessment with safety planning

### Mandatory Reporting
- Automated reporting to appropriate authorities when required
- Compliant with state and federal reporting requirements
- Jurisdiction-specific reporting protocols
- Audit trail for all reporting actions

### Parent Notifications
- Immediate alerts to parents/guardians for safety concerns
- Privacy-compliant notification system
- Escalation protocols for different risk levels
- Follow-up monitoring and support

## Configuration

### Environment Variables
- `SUPABASE_URL` - From SSM Parameter Store
- `SUPABASE_SERVICE_ROLE_KEY` - From SSM Parameter Store

### Lambda Configuration
- **Runtime**: Node.js 22.x
- **Timeout**: 30 seconds
- **Memory**: 256 MB
- **Region**: us-east-1

## Status

✅ **Production Ready**
- Deployed to AWS Lambda (us-east-1)
- Crisis detection active
- Mandatory reporting configured
- Parent notifications operational

## Emergency Contacts

- **National Suicide Prevention Lifeline**: 988
- **Childhelp National Child Abuse Hotline**: 1-800-4-A-CHILD (1-800-422-4453)
- **Crisis Text Line**: Text HOME to 741741

