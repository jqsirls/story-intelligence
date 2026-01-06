Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 9 - Finance guide with verification status

# Finance Guide

## Storytailor and Story Intelligence from Finance Perspective

### What is Storytailor?

**Storytailor** is a child-focused storytelling platform that generates revenue through subscription-based pricing models. It processes payments via Stripe and manages subscriptions through the Commerce Agent.

**Key Facts (Verified):**
- Payment processing via Stripe
- Subscription management system
- Individual and organization account types
- Webhook handling for payment events

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts:1-1111` - Commerce Agent implementation
- `docs/integrations/stripe.md:1-200` - Stripe integration

### What is Story Intelligence™?

**Story Intelligence™** is Storytailor's proprietary AI system that powers story generation. It does not have separate pricing; it is included as part of Storytailor platform subscriptions.

**Key Facts (Verified):**
- Included in Storytailor platform
- No separate pricing model
- Powers core story generation features

**Code References:**
- `docs/story-intelligence/overview.md:1-150` - Story Intelligence overview

## Pricing Models and Subscription Plans

### Subscription Types

**Individual Accounts:**
- Personal subscription plans
- Checkout session creation
- Discount code support

**Organization Accounts:**
- Organization subscription plans
- Bulk account management
- Transfer capabilities

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts:50-200` - Subscription management
- `docs/integrations/stripe.md:1-200` - Stripe integration

### Payment Processing

**Stripe Integration:**
- Payment processing via Stripe
- Webhook handling for payment events
- Subscription management
- Invoice generation

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts:1-1111` - Commerce Agent
- `docs/integrations/stripe.md:1-200` - Stripe integration

**TAG: PRIVACY:**
- Payment information processed by Stripe (PCI-DSS compliant)
- Only parent email sent to Stripe (not child email)
- No child-identifying data sent to Stripe

## Where to Look

### Key Documentation

1. **Commerce Agent**
   - Location: `packages/commerce-agent/src/CommerceAgent.ts`
   - Purpose: Payment processing and subscription management
   - Verification Status: ✅ Verified against code

2. **Stripe Integration**
   - Location: `docs/integrations/stripe.md`
   - Purpose: Stripe integration details and privacy statement
   - Verification Status: ✅ Verified against code

3. **System Inventory**
   - Location: `docs/system/inventory.md`
   - Purpose: Service inventory including payment processing
   - Verification Status: ✅ Verified against code

## What Not to Assume

### Pricing Details

**Do Not Assume:**
- Specific pricing amounts (verify with Product team)
- Subscription tier details (verify with Product team)
- Discount code policies (verify with Product team)

**Where to Verify:**
- Product: See [Product Guide](./product.md)
- Commerce Agent: See `packages/commerce-agent/src/CommerceAgent.ts`

### Revenue Recognition

**Do Not Assume:**
- Revenue recognition policies (verify with Accounting team)
- Subscription billing cycles (verify with Product team)
- Refund policies (verify with Legal team)

**Where to Verify:**
- Accounting: Contact Accounting team
- Product: See [Product Guide](./product.md)
- Legal: Contact Legal team

### Contract Terms

**Do Not Assume:**
- Contract terms (verify with Legal team)
- Terms of service (verify with Legal team)
- Service level agreements (verify with Legal team)

**Where to Verify:**
- Legal: Contact Legal team

## Common Questions and Sources

### Q: How are payments processed?

**Answer:** Payments are processed via Stripe. Storytailor uses Stripe Checkout for individual and organization subscriptions, with webhook handling for payment events.

**Source:** `docs/integrations/stripe.md:1-200`

### Q: What subscription types are supported?

**Answer:** Storytailor supports individual accounts and organization accounts, each with their own subscription management flows.

**Source:** `packages/commerce-agent/src/CommerceAgent.ts:50-200`

### Q: Is payment data secure?

**Answer:** Yes, all payment card data is processed by Stripe (PCI-DSS compliant). Storytailor never stores or processes credit card numbers.

**Source:** `docs/integrations/stripe.md:1-200`

## Related Documentation

- **Stripe Integration:** See [Stripe Integration](../integrations/stripe.md)
- **Commerce Agent:** See `packages/commerce-agent/src/CommerceAgent.ts`
