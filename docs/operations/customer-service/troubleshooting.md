# Customer Service Troubleshooting Guide

**Last Updated**: 2025-12-14  
**Audience**: Customer Service Team | Support Operations  
**Status**: ✅ Production Ready

## Overview

This guide provides step-by-step troubleshooting procedures for common customer issues, account management procedures, and billing support.

## Common User Issues

### Story Generation Not Working

**Symptoms:**
- Story creation fails
- Error messages during story generation
- Stories not appearing in library

**Troubleshooting Steps:**

1. **Check User Tier**
   - Verify user has available story quota
   - Free tier: 1 story/month
   - Check subscription status in Stripe

2. **Check API Status**
   - Verify Lambda function status: `storytailor-content-agent-production`
   - Check CloudWatch logs for errors
   - Verify OpenAI API key is valid

3. **Check User Account**
   - Verify account is active
   - Check for account restrictions
   - Verify email is confirmed

4. **Check Story Library**
   - Verify story was created but not visible
   - Check library filters
   - Verify user has access to library

**Code References:**
- `packages/content-agent/src/ContentAgent.ts` - Story generation logic
- `lambda-deployments/content-agent/src/lambda-production.ts` - Production Lambda

**Resolution:**
- If tier issue: Guide user to upgrade
- If API issue: Escalate to Technical Support
- If account issue: Reset account or escalate
- If library issue: Refresh library or check filters

### Voice Synthesis Issues

**Symptoms:**
- Voice not playing
- Voice quality issues
- Wrong voice selected

**Troubleshooting Steps:**

1. **Check Voice Service**
   - Verify ElevenLabs API key is valid
   - Check voice synthesis Lambda: `storytailor-voice-synthesis-agent-production`
   - Verify user tier has ElevenLabs access (not Free tier)

2. **Check Audio Generation**
   - Verify audio file was generated
   - Check S3 storage for audio files
   - Verify audio format is supported

3. **Check User Settings**
   - Verify voice preference is set
   - Check platform compatibility
   - Verify audio permissions

**Code References:**
- `packages/voice-synthesis/src/VoiceService.ts` - Voice synthesis service
- `lambda-deployments/voice-synthesis-agent/` - Voice synthesis Lambda

**Resolution:**
- If API issue: Escalate to Technical Support
- If audio issue: Regenerate audio or escalate
- If settings issue: Update user preferences

### Platform Integration Problems

**Symptoms:**
- Alexa skill not working
- Mobile app errors
- Web SDK issues

**Troubleshooting Steps:**

1. **Check Platform Status**
   - Verify platform-specific Lambda functions
   - Check platform API status
   - Verify platform credentials

2. **Check Integration**
   - Verify API keys are valid
   - Check webhook configuration
   - Verify platform permissions

3. **Check User Account**
   - Verify account is linked to platform
   - Check platform-specific settings
   - Verify platform access

**Code References:**
- `docs/integration-guides/` - Platform integration guides
- `packages/router/src/Router.ts` - Router for platform routing

**Resolution:**
- If platform issue: Check platform status page
- If integration issue: Re-link account or escalate
- If account issue: Reset platform link

### API Errors

**Symptoms:**
- API requests failing
- Authentication errors
- Rate limiting errors

**Troubleshooting Steps:**

1. **Check Authentication**
   - Verify API key is valid
   - Check API key permissions
   - Verify API key is not revoked

2. **Check Rate Limits**
   - Verify user hasn't exceeded rate limits
   - Check tier-based rate limits
   - Verify rate limit configuration

3. **Check API Status**
   - Verify Universal Agent Lambda: `storytailor-universal-agent-production`
   - Check CloudWatch logs for errors
   - Verify API endpoint is accessible

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - REST API implementation
- `docs/api-reference/README.md` - API documentation

**Resolution:**
- If auth issue: Regenerate API key
- If rate limit: Wait or upgrade tier
- If API issue: Escalate to Technical Support

## Account Management Procedures

### Password Reset

**Procedure:**
1. User requests password reset via email or in-app
2. System sends password reset email via SendGrid
3. User clicks reset link and sets new password
4. System updates password in Supabase

**Code References:**
- `packages/auth-agent/src/auth-agent.ts` - Authentication logic
- `supabase/migrations/` - User authentication schema

**Common Issues:**
- Email not received: Check spam folder, verify email address
- Reset link expired: Request new reset link
- Password not updating: Escalate to Technical Support

### Account Access Issues

**Procedure:**
1. Verify user email and account status
2. Check for account restrictions or suspensions
3. Verify email confirmation status
4. Check for COPPA compliance issues (under-13 users)

**Code References:**
- `packages/universal-agent/src/middleware/AuthMiddleware.ts` - Authentication middleware
- `docs/compliance/coppa.md` - COPPA compliance procedures

**Common Issues:**
- Email not confirmed: Resend confirmation email
- Account suspended: Check reason and escalate
- COPPA issue: Verify parental consent

### Subscription Management

**Procedure:**
1. User requests subscription change
2. Verify current subscription status in Stripe
3. Process subscription change via Commerce Agent
4. Update user tier in database
5. Confirm change via email

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Commerce operations
- `docs/integrations/stripe.md` - Stripe integration

**Common Issues:**
- Payment failure: Verify payment method, check Stripe
- Subscription not updating: Escalate to Finance Team
- Refund request: Process via Stripe or escalate

## Billing Support Procedures

### Payment Failures

**Procedure:**
1. Check Stripe for payment failure reason
2. Verify payment method is valid
3. Check for account restrictions
4. Guide user to update payment method

**Common Reasons:**
- Insufficient funds
- Expired card
- Card declined
- Billing address mismatch

**Resolution:**
- Update payment method
- Retry payment
- Escalate to Finance Team if needed

### Refund Requests

**Procedure:**
1. Verify refund eligibility (within refund window)
2. Check subscription status and usage
3. Process refund via Stripe
4. Update subscription status
5. Confirm refund via email

**Refund Policy:**
- 30-day money-back guarantee for annual subscriptions
- Prorated refunds for mid-cycle cancellations
- Case-by-case for special circumstances

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts:800-900` - Refund processing
- `docs/business/pricing-comprehensive.md` - Refund policies

### Invoice Questions

**Procedure:**
1. Retrieve invoice from Stripe
2. Verify invoice details
3. Explain charges to user
4. Provide invoice PDF if needed

**Common Questions:**
- What am I being charged for?
- Why was I charged twice?
- Can I get an invoice?
- How do I update billing information?

## Technical Troubleshooting Steps

### Check System Status

1. **Verify Lambda Functions**
   - Check CloudWatch for Lambda function status
   - Verify all 35 production functions are active
   - Check for recent deployments

2. **Check External Services**
   - Supabase: Verify database connectivity
   - Redis: Verify cache connectivity
   - Stripe: Verify payment processing
   - SendGrid: Verify email delivery
   - OpenAI: Verify API access
   - ElevenLabs: Verify voice synthesis

3. **Check Logs**
   - CloudWatch Logs for Lambda functions
   - Supabase logs for database issues
   - Application logs for errors

**Code References:**
- `docs/PRODUCTION_STATE_VERIFICATION.md` - Production system status
- `docs/system/inventory.md` - System inventory

### Escalation Criteria

**Escalate to Technical Support:**
- API errors not resolved by standard troubleshooting
- System-wide issues
- Performance problems
- Integration failures

**Escalate to Engineering:**
- Bugs requiring code fixes
- System architecture issues
- Security vulnerabilities
- Data integrity issues

**Escalate to Safety Team:**
- Child safety concerns
- Content moderation issues
- Privacy violations
- COPPA compliance issues

## Related Documentation

- **Support Workflows**: See [Support Workflows](./support-workflows.md)
- **Child Safety**: See [Child Safety Documentation](../compliance/child-safety.md)
- **Operations**: See [Operations Documentation](../README.md)
- **Production State**: See [Production State Verification](../../system/production-state-verification.md)
