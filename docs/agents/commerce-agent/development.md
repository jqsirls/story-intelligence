# Commerce Agent - Developer Documentation

**Status**: Draft  
**Audience**: Engineering  
**Last Updated**: 2025-12-13

## Technical Architecture

### Core Components

1. **CommerceAgent** (`packages/commerce-agent/src/CommerceAgent.ts`)
   - Main agent class
   - Stripe integration
   - Subscription management
   - Email service integration

2. **Stripe Integration**
   - Checkout session creation
   - Webhook handling
   - Subscription management
   - Invoice generation

3. **Email Integration**
   - Receipt emails via EmailService
   - Payment failed emails
   - Subscription change emails
   - Invitation emails

## API Reference

### Individual Checkout
```typescript
const checkout = await commerceAgent.createIndividualCheckout(
  'user-123',
  'pro_individual',
  'DISCOUNT15' // Optional discount code
);
```

### Organization Checkout
```typescript
const orgCheckout = await commerceAgent.createOrganizationCheckout(
  'admin-user-id',
  'Acme Elementary School',
  25 // Number of seats
);
```

### Webhook Handling
```typescript
await commerceAgent.handleWebhook(payload, signature);
```

### Subscription Management
```typescript
// Get subscription status
const subscription = await commerceAgent.getSubscriptionStatus('user-123');

// Change plan
await commerceAgent.changePlan('user-123', 'pro_organization');

// Cancel subscription
await commerceAgent.cancelSubscription('user-123', false);
```

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Complete API
- `packages/commerce-agent/README.md` - API documentation

## Configuration

### Environment Variables
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_INDIVIDUAL_PRICE_ID=price_...
STRIPE_PRO_ORGANIZATION_PRICE_ID=price_...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[REDACTED_SUPABASE_SERVICE_ROLE_KEY]
REDIS_URL=redis://...  # Optional
SENDGRID_API_KEY=SG...  # For emails
```

### Lambda Configuration
- **Runtime**: Node.js 22.x
- **Timeout**: 30 seconds
- **Memory**: 512 MB
- **Region**: us-east-1

## Testing

### Local Testing
```bash
cd packages/commerce-agent
npm test
```

### Integration Testing
- Test against Stripe test mode
- Verify webhook processing
- Test subscription management

## Database Schema

### Key Tables
- `subscriptions` - Subscription information
- `organization_accounts` - Organization account details
- `organization_members` - Organization membership
- `invite_discounts` - Discount codes and invitations
- `referral_tracking` - Referral tracking and rewards
- `billing_events` - Audit trail for billing events

**Code References:**
- `packages/commerce-agent/README.md:186-197` - Database schema

