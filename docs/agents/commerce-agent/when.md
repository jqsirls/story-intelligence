# Commerce Agent - Usage Guidelines

**Status**: Draft  
**Audience**: Engineering | Product  
**Last Updated**: 2025-12-13

## When to Use This Agent

### Always Use Commerce Agent For:
1. **Payment Processing**: All payment and checkout operations
2. **Subscription Management**: All subscription operations
3. **Webhook Handling**: All Stripe webhook events
4. **Organization Management**: Organization account operations
5. **Discount Management**: All discount and coupon operations
6. **Referral Tracking**: All referral operations

### Use Cases

#### Individual Checkout
**When**: User wants to subscribe to Pro individual plan
**Commerce Agent Action**: Creates Stripe checkout session with discount support

#### Organization Checkout
**When**: Organization wants to subscribe with multiple seats
**Commerce Agent Action**: Creates Stripe checkout session with seat-based pricing

#### Subscription Changes
**When**: User wants to upgrade/downgrade subscription
**Commerce Agent Action**: Updates subscription plan via Stripe

#### Webhook Processing
**When**: Stripe sends webhook event (payment, subscription change)
**Commerce Agent Action**: Processes webhook, updates database, sends emails

#### Invite Creation
**When**: User wants to invite friend
**Commerce Agent Action**: Creates invitation with 15% discount, sends email

## When NOT to Use It

### Direct Stripe API Calls
- **Use Commerce Agent**: Always use Commerce Agent for Stripe operations
- **No Direct Calls**: Don't bypass Commerce Agent for Stripe operations
- **Exception**: Admin operations that require direct Stripe access

## Integration Patterns

### Checkout Creation
```typescript
const checkout = await commerceAgent.createIndividualCheckout(
  'user-123',
  'pro_individual',
  'DISCOUNT15'
);
```

### Webhook Handling
```typescript
await commerceAgent.handleWebhook(payload, signature);
```

### Subscription Management
```typescript
await commerceAgent.changePlan('user-123', 'pro_organization');
```

## Timing Considerations

### Request Timing
- **Checkout Creation**: <500ms
- **Webhook Processing**: <200ms
- **Subscription Changes**: <1000ms
- **Seat Management**: <500ms

### Rate Limits
- **Stripe API**: Subject to Stripe rate limits
- **Webhook Processing**: No limit (async processing)
- **Checkout Creation**: No limit (but monitor for abuse)

## Best Practices

1. **Always Verify Webhooks**: Verify Stripe webhook signatures
2. **Handle Errors Gracefully**: Proper error handling for payment failures
3. **Send Email Notifications**: Notify users of subscription changes
4. **Audit Everything**: Complete audit trail for billing events
5. **Respect Grace Periods**: Honor cancellation grace periods

