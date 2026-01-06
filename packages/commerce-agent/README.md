# Commerce Agent

The Commerce Agent handles comprehensive subscription management, billing, and commerce features for the Alexa Multi-Agent System. It integrates with Stripe for payment processing and provides features for individual and organization accounts, discount systems, and referral tracking.

## Features

### 🔐 Stripe Integration (Task 9.1)
- **Individual Account Checkout**: Create checkout sessions for Pro individual accounts
- **Organization Account Checkout**: Seat-based pricing for organization accounts
- **Webhook Handling**: Process payment events and subscription changes
- **Subscription Tracking**: Monitor subscription status and generate invoices
- **Separate Billing**: Handle individual vs organization account billing

### 📊 Subscription Management (Task 9.2)
- **Plan Changes**: Upgrade/downgrade Pro plans for individual users
- **Seat Management**: Add/remove seats for organization accounts
- **Library Separation**: Organization libraries separate from personal libraries
- **Subscription Transfer**: Transfer between individual and organization accounts
- **Cancellation**: Handle subscription cancellations

### 🎁 Invite & Discount System (Task 9.3)
- **User Invitations**: 15% first-month discount for invited users
- **Story Transfer Invites**: 20% discount for story transfer recipients
- **Coupon Management**: Create and manage discount codes
- **Referral Tracking**: Track referrals and rewards
- **Email Templates**: Automated invitation email delivery

## Installation

```bash
npm install @alexa-multi-agent/commerce-agent
```

## Configuration

Set the following environment variables:

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_INDIVIDUAL_PRICE_ID=price_...
STRIPE_PRO_ORGANIZATION_PRICE_ID=price_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[REDACTED_SUPABASE_SERVICE_ROLE_KEY]
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://storytailor.com
```

## Usage

### Basic Setup

```typescript
import { CommerceAgent } from '@alexa-multi-agent/commerce-agent';

const commerceAgent = new CommerceAgent({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  redisUrl: process.env.REDIS_URL
});
```

### Individual Checkout

```typescript
// Create checkout session for individual user
const checkout = await commerceAgent.createIndividualCheckout(
  'user-123',
  'pro_individual',
  'DISCOUNT15' // Optional discount code
);

console.log('Checkout URL:', checkout.url);
```

### Organization Checkout

```typescript
// Create checkout session for organization
const orgCheckout = await commerceAgent.createOrganizationCheckout(
  'admin-user-id',
  'Acme Elementary School',
  25 // Number of seats
);

console.log('Organization checkout URL:', orgCheckout.url);
```

### Subscription Management

```typescript
// Get current subscription status
const subscription = await commerceAgent.getSubscriptionStatus('user-123');

// Change subscription plan
const result = await commerceAgent.changePlan('user-123', 'pro_organization');

// Cancel subscription
await commerceAgent.cancelSubscription('user-123', false); // false = at period end
```

### Organization Seat Management

```typescript
// Add seats to organization
await commerceAgent.manageOrganizationSeats({
  organizationId: 'org-123',
  action: 'add',
  seatCount: 5
});

// Add specific user to organization
await commerceAgent.manageOrganizationSeats({
  organizationId: 'org-123',
  action: 'add',
  seatCount: 1,
  userId: 'new-user-456'
});
```

### Invite System

```typescript
// Create user invitation with 15% discount
const invite = await commerceAgent.createUserInvite(
  'referrer-user-id',
  'friend@example.com'
);

console.log('Invite code:', invite.inviteCode);
console.log('Invite URL:', invite.inviteUrl);

// Create story transfer invitation with 20% discount
const storyInvite = await commerceAgent.createStoryTransferInvite(
  'sender-user-id',
  'recipient@example.com',
  'story-id-123'
);
```

### Discount Management

```typescript
// Apply discount code
const discount = await commerceAgent.applyCoupon('user-123', 'INVITE15');

// Create custom discount code
const discountCode = await commerceAgent.createDiscountCode(
  'admin-user-id',
  'user_invite',
  15, // 15% discount
  30  // Valid for 30 days
);
```

### Referral Tracking

```typescript
// Get referral statistics
const stats = await commerceAgent.getReferralStats('user-123');
console.log('Total referrals:', stats.totalReferrals);
console.log('Completed referrals:', stats.completedReferrals);
console.log('Total rewards:', stats.totalRewards);
```

### Webhook Handling

```typescript
// Handle Stripe webhooks
app.post('/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const payload = req.body;
  const signature = req.headers['stripe-signature'];

  try {
    await commerceAgent.handleWebhook(payload, signature);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});
```

## Database Schema

The Commerce Agent uses the following database tables:

- **subscriptions**: Store subscription information
- **organization_accounts**: Organization account details
- **organization_members**: Organization membership
- **invite_discounts**: Discount codes and invitations
- **referral_tracking**: Referral tracking and rewards
- **billing_events**: Audit trail for billing events

See `supabase/migrations/20240101000007_commerce_agent_tables.sql` for the complete schema.

## API Reference

### Core Methods

#### `createIndividualCheckout(userId, planId?, discountCode?)`
Creates a Stripe checkout session for individual accounts.

#### `createOrganizationCheckout(userId, organizationName, seatCount, planId?)`
Creates a Stripe checkout session for organization accounts with seat-based pricing.

#### `handleWebhook(payload, signature)`
Processes Stripe webhook events for subscription changes.

#### `getSubscriptionStatus(userId)`
Retrieves current subscription status for a user.

#### `changePlan(userId, newPlanId)`
Changes subscription plan for individual users.

#### `manageOrganizationSeats(request)`
Manages organization seat allocation and user assignment.

#### `createUserInvite(inviterId, inviteeEmail)`
Creates user invitation with 15% discount.

#### `createStoryTransferInvite(senderId, recipientEmail, storyId)`
Creates story transfer invitation with 20% discount.

#### `applyCoupon(userId, couponCode)`
Validates and applies discount codes.

#### `getReferralStats(userId)`
Gets referral statistics for a user.

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Error Handling

The Commerce Agent includes comprehensive error handling:

- **Stripe API Errors**: Proper error handling for payment failures
- **Database Errors**: Graceful handling of database connection issues
- **Validation Errors**: Input validation with meaningful error messages
- **Webhook Security**: Signature verification for webhook endpoints

## Security

- **Webhook Verification**: All webhooks are verified using Stripe signatures
- **Row Level Security**: Database access is protected with RLS policies
- **PII Protection**: Sensitive data is hashed in audit logs
- **Rate Limiting**: Built-in protection against abuse

## Compliance

- **COPPA Compliance**: Special handling for users under 13
- **GDPR Compliance**: Data retention and deletion policies
- **Audit Trail**: Complete audit trail for all billing events
- **Data Encryption**: Sensitive data is encrypted at rest

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass

## License

This package is part of the Alexa Multi-Agent System and follows the same license terms.