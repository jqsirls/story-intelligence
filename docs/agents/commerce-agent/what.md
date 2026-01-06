# Commerce Agent - Detailed Functionality

**Status**: Draft  
**Audience**: Engineering | Product  
**Last Updated**: 2025-12-13

## Complete Feature List

### Stripe Integration
- **Individual Account Checkout**: Create checkout sessions for Pro individual accounts
- **Organization Account Checkout**: Seat-based pricing for organization accounts
- **Webhook Handling**: Process payment events and subscription changes
- **Subscription Tracking**: Monitor subscription status and generate invoices
- **Separate Billing**: Handle individual vs organization account billing

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Commerce agent implementation
- `packages/commerce-agent/README.md:7-18` - Stripe integration features

### Subscription Management
- **Plan Changes**: Upgrade/downgrade Pro plans for individual users
- **Seat Management**: Add/remove seats for organization accounts
- **Library Separation**: Organization libraries separate from personal libraries
- **Subscription Transfer**: Transfer between individual and organization accounts
- **Cancellation**: Handle subscription cancellations with grace periods

**Code References:**
- `packages/commerce-agent/README.md:20-25` - Subscription management

### Invite & Discount System
- **User Invitations**: 15% first-month discount for invited users
- **Story Transfer Invites**: 20% discount for story transfer recipients
- **Coupon Management**: Create and manage discount codes
- **Referral Tracking**: Track referrals and rewards
- **Email Templates**: Automated invitation email delivery via EmailService

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Invite and discount methods
- `packages/commerce-agent/README.md:27-32` - Discount system

### Email Integration
- **Receipt Emails**: Send receipt emails via EmailService
- **Payment Failed Emails**: Notify users of payment failures
- **Subscription Emails**: Upgrade/downgrade/cancellation confirmations
- **Invitation Emails**: Send invitation emails with discount codes

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Email integration
- `packages/universal-agent/src/services/EmailService.ts` - Email service

## Technical Specifications

### Performance
- **Checkout Creation**: <500ms
- **Webhook Processing**: <200ms
- **Subscription Changes**: <1000ms
- **Seat Management**: <500ms

### Dependencies
- **Stripe**: Payment processing and subscription management
- **Supabase**: Database for subscriptions, organizations, discounts
- **EmailService**: Email delivery for receipts and invitations
- **Redis**: Caching for performance (optional)

## Limitations

1. **Stripe Dependency**: Requires Stripe API access
2. **Webhook Security**: Requires webhook signature verification
3. **Rate Limits**: Subject to Stripe API rate limits
4. **Regional**: Stripe account must be in compatible region

