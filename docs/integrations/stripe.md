Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 7 - Stripe integration documentation with privacy statement

# Stripe Integration

## Overview

Stripe provides payment processing and subscription management for Storytailor, enabling individual and organization account subscriptions.

**SSM Parameters:** `/storytailor-{ENV}/stripe/secret-key`, `/storytailor-{ENV}/stripe/webhook-secret`
**Status:** ✅ Active

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts:1-1111` - Commerce Agent implementation
- `docs/system/inventory.md:207` - Service status

## Features

### Payment Processing

**Checkout Sessions:**
- Individual account checkout
- Organization account checkout
- Discount code support

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts:50-100` - Individual checkout
- `packages/commerce-agent/src/CommerceAgent.ts:100-200` - Organization checkout

### Subscription Management

**Subscription Operations:**
- Create subscriptions
- Update subscriptions
- Cancel subscriptions
- Transfer subscriptions

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Subscription management

### Webhook Handling

**Stripe Webhooks:**
- Payment success
- Subscription updates
- Payment failures
- Invoice events

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Webhook handling

## TAG: PRIVACY

### Child-Identifying Data Flow

**Data Sent to Stripe:**
- **User Email**: Sent (for checkout and invoice delivery)
- **Payment Information**: Sent (credit card details, processed by Stripe)
- **Subscription Details**: Sent (plan ID, pricing)
- **User ID**: Not sent (only email used)
- **Age Information**: Not sent
- **Child Profile Data**: Not sent
- **Story Content**: Not sent

**Data Protection Measures:**
1. **PCI Compliance**: Stripe handles all payment card data (PCI-DSS compliant)
2. **No Card Data Storage**: Storytailor never stores or processes credit card numbers
3. **Email Only**: Only user email sent to Stripe (for checkout and invoices)
4. **Parental Consent**: Children under 13 cannot create subscriptions (parent must create account)
5. **Encrypted Transmission**: All API calls use HTTPS/TLS encryption
6. **API Key Security**: Stripe API keys stored encrypted in AWS SSM Parameter Store
7. **Webhook Security**: Webhook signatures verified using HMAC

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts:50-100` - Checkout implementation
- `packages/universal-agent/src/middleware/AuthMiddleware.ts:83-108` - Parent consent middleware

**Compliance Status:**
- ✅ **COPPA Compliant**: No child-identifying data sent to Stripe (only parent email for subscriptions)
- ✅ **GDPR Compliant**: Data minimization, secure transmission, PCI compliance
- ✅ **PCI-DSS Compliant**: Stripe handles all payment card data

**Privacy Risk Assessment:**
- **Risk Level**: Low
- **Mitigation**: PCI compliance, no card data storage, email only, parental consent required
- **Parental Consent**: Required for children under 13 (parent must create subscription)

## Configuration

### SSM Parameters

**Required Parameters:**
- `/storytailor-{ENV}/stripe/secret-key` - Stripe secret key (SecureString)
- `/storytailor-{ENV}/stripe/webhook-secret` - Stripe webhook secret (SecureString)

**Code References:**
- `docs/system/ssm_parameters_inventory.md:140-155` - SSM parameter inventory

### Environment Variables

**Lambda Functions:**
- `STRIPE_SECRET_KEY` - Stripe secret key (from SSM)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (from SSM)

## Related Documentation

- **Commerce Agent:** See `docs/agents/commerce-agent.md`
