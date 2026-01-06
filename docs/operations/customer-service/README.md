# Customer Service Documentation

**Last Updated**: 2025-12-14  
**Audience**: Customer Service Team | Support Operations  
**Status**: ✅ Production Ready

## Overview

This directory contains comprehensive customer service documentation including support workflows, troubleshooting guides, escalation procedures, and integration with child safety protocols.

## Documentation Files

1. **[Support Workflows](./support-workflows.md)** - Ticket routing, response SLAs, escalation paths
2. **[Troubleshooting Guide](./troubleshooting.md)** - Common issues, technical troubleshooting, account management

## Support Channels

### Primary Support Channels
- **Email**: support@storytailor.com
- **In-App**: Help center and contact form
- **Phone**: Available for Professional and Enterprise tiers

### Support Hours
- **Standard Support**: Monday-Friday, 9 AM - 5 PM EST
- **Priority Support**: 24/7 for Professional and Enterprise tiers
- **Emergency Support**: 24/7 for child safety issues

## Integration with Child Safety

**Critical**: All customer service interactions must respect child safety protocols:

- **Crisis Detection**: If a child safety issue is detected, immediately escalate to Child Safety Agent
- **Privacy**: Never share child's personal information without parental consent
- **COPPA Compliance**: All interactions with children under 13 require parental consent
- **Mandatory Reporting**: Follow mandatory reporting procedures for safety concerns

**Code References:**
- `docs/compliance/child-safety.md` - Complete child safety procedures
- `packages/child-safety-agent/src/ChildSafetyAgent.ts` - Child safety agent implementation

## Support Workflow Overview

1. **Ticket Creation**: User submits support request via email, in-app, or phone
2. **Initial Triage**: Classify issue type (technical, billing, account, safety)
3. **Routing**: Route to appropriate team based on issue type
4. **Response**: Respond within SLA timeframe
5. **Resolution**: Resolve issue and follow up
6. **Escalation**: Escalate if needed (technical, safety, executive)

## Response SLAs

| Tier | Initial Response | Resolution Target |
|------|------------------|-------------------|
| Free | 48 hours | 5 business days |
| Alexa+ Starter | 24 hours | 3 business days |
| Individual | 24 hours | 3 business days |
| Premium | 12 hours | 2 business days |
| Family | 12 hours | 2 business days |
| Professional | 4 hours | 1 business day |
| Enterprise | 1 hour | Same day |

## Escalation Paths

### Technical Issues
1. **Level 1**: Customer Service (general troubleshooting)
2. **Level 2**: Technical Support (advanced troubleshooting)
3. **Level 3**: Engineering Team (bug fixes, system issues)

### Billing Issues
1. **Level 1**: Customer Service (payment issues, refunds)
2. **Level 2**: Finance Team (complex billing, enterprise contracts)
3. **Level 3**: Executive Team (disputes, special cases)

### Safety Issues
1. **Immediate**: Child Safety Agent (crisis detection, mandatory reporting)
2. **Level 1**: Safety Team (safety concerns, content moderation)
3. **Level 2**: Legal/Compliance (mandatory reporting, legal issues)

### Account Issues
1. **Level 1**: Customer Service (password reset, account access)
2. **Level 2**: Technical Support (account recovery, data issues)
3. **Level 3**: Engineering Team (system-level account issues)

## Common Issue Categories

### Technical Issues
- Story generation not working
- Voice synthesis issues
- Platform integration problems
- API errors
- Performance issues

### Account Issues
- Login problems
- Password reset
- Account access
- Profile management
- Subscription management

### Billing Issues
- Payment failures
- Subscription changes
- Refund requests
- Invoice questions
- Discount code application

### Content Issues
- Story quality concerns
- Inappropriate content
- Character consistency
- Age-appropriateness

### Safety Issues
- Crisis detection
- Content moderation
- Privacy concerns
- COPPA compliance questions

## Related Documentation

- **Child Safety**: See [Child Safety Documentation](../compliance/child-safety.md)
- **Compliance**: See [Compliance Documentation](../compliance/README.md)
- **Operations**: See [Operations Documentation](../README.md)
- **Deployment**: See [Deployment Documentation](../deployment/README.md)

## Production System Information

**Region**: us-east-1  
**Lambda Functions**: 35 production functions  
**API Endpoints**: 60+ REST endpoints  
**Database**: Supabase PostgreSQL (120+ tables)  
**External Services**: Supabase, Redis, SendGrid, Stripe, OpenAI, ElevenLabs

**Source**: `docs/PRODUCTION_STATE_VERIFICATION.md`
