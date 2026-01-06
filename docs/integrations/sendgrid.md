Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 7 - SendGrid integration documentation with privacy statement

# SendGrid Integration

## Overview

SendGrid provides email delivery services for Storytailor, enabling parent notifications, transactional emails, and system communications.

**Configuration:** Hardcoded in deployment scripts
**Status:** ✅ Active

**Code References:**
- `packages/universal-agent/src/` - EmailService implementation
- `scripts/deploy-universal-agent-proper.sh:592, 614` - SENDGRID_FROM_EMAIL hardcoded
- `docs/system/inventory.md:230` - Service status

## Features

### Email Delivery

**Email Types:**
- Parent notifications
- Transactional emails
- System notifications

**Code References:**
- `packages/child-safety-agent/src/services/ParentNotificationService.ts:17-68` - Parent notifications
- `packages/universal-agent/src/` - EmailService

## TAG: PRIVACY

### Child-Identifying Data Flow

**Data Sent to SendGrid:**
- **Parent Email Addresses**: Sent (for parent notifications)
- **Email Content**: Sent (notification text, safety alerts)
- **User ID**: Not sent (only email addresses)
- **Child Age**: Not sent (only in email content if relevant to notification)
- **Story Content**: Not sent (only safety incident summaries)
- **Child Name**: Not sent (only generic references like "your child")

**Data Protection Measures:**
1. **Parent Email Only**: Only parent email addresses sent (not child emails)
2. **Content Minimization**: Email content limited to necessary information
3. **No PII in Headers**: User IDs and other PII not included in email headers
4. **Encrypted Transmission**: All email delivery uses TLS encryption
5. **API Key Security**: SendGrid API keys stored securely (hardcoded in deployment, should be moved to SSM)
6. **Purpose Limitation**: Emails sent only for notifications and transactional purposes

**Code References:**
- `packages/child-safety-agent/src/services/ParentNotificationService.ts:17-68` - Parent notifications
- `packages/child-safety-agent/src/services/ParentNotificationService.ts:99-210` - Email content generation

**Compliance Status:**
- ✅ **COPPA Compliant**: Only parent emails sent (not child emails)
- ✅ **GDPR Compliant**: Data minimization, encrypted transmission, purpose limitation

**Privacy Risk Assessment:**
- **Risk Level**: Low
- **Mitigation**: Parent emails only, content minimization, encrypted transmission
- **Parental Consent**: Required for children under 13 (parent email required)

## Configuration

### Environment Variables

**Lambda Functions:**
- `SENDGRID_FROM_EMAIL` - SendGrid from email address (hardcoded in deployment)

**Code References:**
- `scripts/deploy-universal-agent-proper.sh:592, 614` - Hardcoded configuration

**TODO[DEVOPS]:** Move SendGrid API key to SSM Parameter Store

## Related Documentation

- **Child Safety Agent:** See `docs/agents/child-safety-agent.md`
- **Compliance:** See [Compliance Documentation](../compliance/README.md)
