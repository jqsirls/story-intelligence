Status: Draft  
Audience: Customer Service Team | Support Operations  
Last-Updated: 2025-12-14  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Customer service role guide

# Customer Service Guide

## Overview

This guide provides customer service team members with essential information about Storytailor, key documentation locations, support workflows, and common questions with sources.

## What is Storytailor?

Storytailor is an AI-powered storytelling platform that creates personalized, age-appropriate stories for children. It integrates with voice platforms (Alexa, Google Assistant), mobile apps, and web applications.

**Key Features:**
- Personalized story generation using Story Intelligence™
- Multi-platform integration (voice, mobile, web)
- Age-appropriate content filtering
- COPPA-compliant child safety features
- Subscription-based pricing tiers

**Source:** `docs/storytailor/product-overview.md`

## What is Story Intelligence™?

Story Intelligence™ is Storytailor's proprietary AI system with four pillars:
1. **Narrative Intelligence** - Story structure and flow
2. **Developmental Intelligence** - Age-appropriate content
3. **Personal Intelligence** - Personalization based on user preferences
4. **Literary Excellence** - Quality writing and engagement

**Source:** `docs/story-intelligence/overview.md`

## Key Documentation

### Support Workflows
- **Support Workflows:** `docs/operations/customer-service/support-workflows.md`
  - Ticket routing procedures
  - Response SLAs by tier
  - Escalation paths
  - Issue classification

### Troubleshooting
- **Troubleshooting Guide:** `docs/operations/customer-service/troubleshooting.md`
  - Common technical issues
  - Account management procedures
  - Billing troubleshooting
  - Platform integration issues

### Child Safety
- **Child Safety Procedures:** `docs/compliance/child-safety.md`
  - Crisis detection protocols
  - Mandatory reporting procedures
  - COPPA compliance requirements
  - Privacy protection guidelines

### Compliance
- **COPPA Compliance:** `docs/compliance/coppa.md`
- **GDPR Compliance:** `docs/compliance/gdpr.md`
- **Compliance Overview:** `docs/compliance/README.md`

### Product Information
- **Product Overview:** `docs/storytailor/product-overview.md`
- **Pricing Information:** `docs/business/pricing-comprehensive.md`
- **Subscription Tiers:** See pricing documentation

### System Information
- **Production Status:** `docs/executive/system-status.md`
- **System Architecture:** `docs/system/README.md`

## Support Channels

### Primary Support Channels
- **Email**: support@storytailor.com
- **In-App**: Help center and contact form
- **Phone**: Available for Professional and Enterprise tiers

### Support Hours
- **Standard Support**: Monday-Friday, 9 AM - 5 PM EST
- **Priority Support**: 24/7 for Professional and Enterprise tiers
- **Emergency Support**: 24/7 for child safety issues

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

**Source:** `docs/operations/customer-service/support-workflows.md`

## Common Issue Categories

### Technical Issues
- Story generation not working
- Voice synthesis issues
- Platform integration problems
- API errors
- Performance issues

**Troubleshooting:** `docs/operations/customer-service/troubleshooting.md`

### Account Issues
- Login problems
- Password reset
- Account access
- Profile management
- Subscription management

**Troubleshooting:** `docs/operations/customer-service/troubleshooting.md`

### Billing Issues
- Payment failures
- Subscription changes
- Refund requests
- Invoice questions
- Discount code application

**Pricing Information:** `docs/business/pricing-comprehensive.md`

### Content Issues
- Story quality concerns
- Inappropriate content
- Character consistency
- Age-appropriateness

**Escalation:** Route to Content Team or Child Safety Agent if safety concern

### Safety Issues
- Crisis detection
- Content moderation
- Privacy concerns
- COPPA compliance questions
- Mandatory reporting triggers

**Critical:** Immediately escalate to Child Safety Agent
**Source:** `docs/compliance/child-safety.md`

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

**Source:** `docs/operations/customer-service/support-workflows.md`

## Production System Information

**Region**: us-east-1  
**Lambda Functions**: 35 production functions  
**API Endpoints**: 60+ REST endpoints  
**Database**: Supabase PostgreSQL (120+ tables)  
**External Services**: Supabase, Redis, SendGrid, Stripe, OpenAI, ElevenLabs

**Source:** `docs/PRODUCTION_STATE_VERIFICATION.md`

## What NOT to Assume

1. **Don't assume all users are adults** - Always verify age and COPPA compliance
2. **Don't share child's personal information** - Privacy protection is critical
3. **Don't ignore safety concerns** - Always escalate child safety issues immediately
4. **Don't make technical changes** - Route technical issues to appropriate teams
5. **Don't process refunds without approval** - Follow billing escalation procedures
6. **Don't skip documentation** - Always reference official documentation

## Common Questions

### Q: How do I reset a user's password?
**A:** See password reset procedures in `docs/operations/customer-service/troubleshooting.md`

### Q: What are the current pricing tiers?
**A:** See `docs/business/pricing-comprehensive.md` for complete pricing information

### Q: How do I handle a child safety concern?
**A:** Immediately escalate to Child Safety Agent. See `docs/compliance/child-safety.md` for procedures

### Q: What's the difference between Storytailor and Story Intelligence?
**A:** Storytailor is the product; Story Intelligence™ is the AI system powering it. See `docs/story-intelligence/overview.md`

### Q: How do I process a refund?
**A:** Follow billing escalation procedures in `docs/operations/customer-service/support-workflows.md`

### Q: What platforms does Storytailor support?
**A:** Voice platforms (Alexa, Google Assistant), mobile apps (iOS, Android), and web applications. See `docs/integration-guides/README.md`

### Q: How do I check system status?
**A:** See `docs/executive/system-status.md` for current system health and status

## Related Documentation

- **Customer Service Documentation:** `docs/operations/customer-service/README.md`
- **Support Workflows:** `docs/operations/customer-service/support-workflows.md`
- **Troubleshooting Guide:** `docs/operations/customer-service/troubleshooting.md`
- **Child Safety:** `docs/compliance/child-safety.md`
- **Compliance:** `docs/compliance/README.md`
- **Product Overview:** `docs/storytailor/product-overview.md`
- **Pricing:** `docs/business/pricing-comprehensive.md`
