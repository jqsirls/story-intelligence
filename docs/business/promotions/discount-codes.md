# Discount Code Management

**Last Updated**: 2025-12-14  
**Audience**: Marketing | Engineering | Business Development  
**Status**: ✅ Production Ready

## Overview

This document describes discount code generation and management, Stripe integration, usage limits and restrictions, and analytics and reporting.

## Code Generation

### Code Format

**Standard Format:**
- **Pattern**: `[CAMPAIGN]-[CODE]` (e.g., `BLACKFRIDAY-2024`, `EDU25-SCHOOL`)
- **Length**: 8-20 characters
- **Characters**: Alphanumeric, hyphens, underscores
- **Case**: Uppercase (standardized)

**Custom Formats:**
- Campaign-specific formats
- Branded codes (e.g., `STORYTAILOR-25`)
- Memorable codes (e.g., `SUMMER2024`)

### Generation Methods

**Manual Generation:**
- Marketing team creates codes manually
- Used for specific campaigns or promotions
- Full control over code format and parameters

**Bulk Generation:**
- Generate multiple codes for campaigns
- Useful for large-scale promotions
- Automated code validation

**Automatic Generation:**
- System generates codes for specific events
- User-specific codes (referral codes)
- Time-limited codes

### Code Parameters

**Discount Type:**
- **Percentage**: X% off (e.g., 20% off)
- **Fixed Amount**: $X off (e.g., $5 off)
- **Free Trial**: Extended free trial period
- **Tier Upgrade**: Discount on tier upgrades

**Discount Amount:**
- Percentage: 5% to 50% (typical range)
- Fixed: $1 to $50 (typical range)
- Custom amounts for enterprise deals

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Discount code processing
- `docs/integrations/stripe.md` - Stripe discount code integration

## Stripe Integration

### Stripe Coupon Creation

**Coupon Creation:**
- Discount codes created in Stripe
- Coupons linked to discount codes
- Applied at checkout via Stripe Checkout

**Code Implementation:**
```typescript
// Pseudo-code for Stripe coupon creation
async function createStripeCoupon(
  code: string,
  discountType: 'percentage' | 'fixed',
  discountAmount: number,
  expirationDate?: Date
) {
  const coupon = await stripe.coupons.create({
    id: code,
    percent_off: discountType === 'percentage' ? discountAmount : undefined,
    amount_off: discountType === 'fixed' ? discountAmount * 100 : undefined, // Stripe uses cents
    currency: 'usd',
    duration: 'once', // or 'forever', 'repeating'
    redeem_by: expirationDate ? Math.floor(expirationDate.getTime() / 1000) : undefined,
    max_redemptions: undefined, // or set limit
  });
  
  return coupon;
}
```

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Stripe integration
- `docs/integrations/stripe.md` - Stripe API documentation

### Checkout Integration

**Stripe Checkout:**
- Discount codes entered at checkout
- Stripe validates and applies discount
- Discount reflected in checkout total

**Code Implementation:**
```typescript
// Pseudo-code for checkout with discount code
async function createCheckoutSession(
  userId: string,
  priceId: string,
  discountCode?: string
) {
  const sessionParams: any = {
    customer: userId,
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    mode: 'subscription',
  };
  
  if (discountCode) {
    sessionParams.discounts = [{
      coupon: discountCode,
    }];
  }
  
  const session = await stripe.checkout.sessions.create(sessionParams);
  return session;
}
```

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts:400-500` - Checkout session creation
- `docs/integrations/stripe.md` - Stripe Checkout integration

## Usage Limits and Restrictions

### Expiration Dates

**Expiration Types:**
- **No Expiration**: Codes valid indefinitely
- **Fixed Date**: Codes expire on specific date
- **Time-Limited**: Codes expire after X days from creation

**Implementation:**
- Expiration stored in Stripe coupon `redeem_by` field
- System validates expiration before applying code
- Expired codes rejected at checkout

### Usage Limits

**Per-Code Limits:**
- **Unlimited**: No limit on code usage
- **Limited**: Maximum number of redemptions
- **One-Time**: Single use per code

**Per-User Limits:**
- **Unlimited**: User can use code multiple times
- **One-Time**: User can use code only once
- **Time-Based**: User can use code once per time period (e.g., per month)

**Implementation:**
- Stripe `max_redemptions` for per-code limits
- Database tracking for per-user limits
- Validation at checkout

### Tier Restrictions

**Tier-Specific Codes:**
- Codes apply to specific subscription tiers only
- Tier restrictions validated at checkout
- Invalid tier combinations rejected

**Example:**
- `EDU25` applies to Professional tier only
- `FAMILY20` applies to Family tier only
- `PREMIUM30` applies to Premium tier only

**Implementation:**
- Tier restrictions stored in database
- Validated against user's selected tier at checkout
- Error message if tier mismatch

### User Restrictions

**Eligibility Rules:**
- **New Customers Only**: Codes valid for new customers only
- **Existing Customers Only**: Codes valid for existing customers only
- **Specific User Groups**: Codes valid for specific user segments

**Implementation:**
- User eligibility checked at checkout
- Database flags for user eligibility
- Validation before code application

## Analytics and Reporting

### Code Usage Tracking

**Metrics Tracked:**
- Total code redemptions
- Unique users who used code
- Revenue generated from code
- Conversion rate (redemption to subscription)
- Average order value with code

**Database Schema:**
```sql
CREATE TABLE discount_code_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  subscription_tier TEXT,
  discount_amount DECIMAL(10, 2),
  revenue_amount DECIMAL(10, 2),
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Code References:**
- `supabase/migrations/` - Database schema
- `docs/system/database_schema_inventory.md` - Complete schema

### Campaign Performance

**Campaign Metrics:**
- Total codes generated
- Total codes redeemed
- Redemption rate
- Revenue attributed to campaign
- ROI calculation

**Reporting Dashboard:**
- Real-time code usage statistics
- Campaign performance overview
- Revenue attribution by campaign
- Conversion funnel analysis

### Revenue Attribution

**Attribution Rules:**
- Revenue attributed to campaign when code used
- Lifetime value of customers acquired via campaign
- Multi-touch attribution (if applicable)

**Calculation:**
- Revenue = Subscription revenue from code users
- Commission = Revenue × Commission rate (if applicable)
- ROI = (Revenue - Campaign Cost) / Campaign Cost

## Code Management

### Code Creation Workflow

1. **Campaign Planning**: Define campaign parameters
2. **Code Generation**: Generate codes with parameters
3. **Stripe Integration**: Create Stripe coupons
4. **Database Tracking**: Store codes in database
5. **Distribution**: Distribute codes via marketing channels
6. **Monitoring**: Monitor code usage and performance

### Code Validation

**Validation Rules:**
- Code format validation
- Expiration date validation
- Usage limit validation
- Tier restriction validation
- User eligibility validation

**Error Handling:**
- Invalid code: "Invalid discount code"
- Expired code: "This code has expired"
- Usage limit reached: "This code has reached its usage limit"
- Tier mismatch: "This code is not valid for your selected tier"
- User ineligible: "This code is not available for your account"

## Security and Fraud Prevention

### Fraud Prevention

**Measures:**
- Code format validation
- Rate limiting on code attempts
- User verification for high-value codes
- Monitoring for suspicious patterns

**Detection:**
- Unusual redemption patterns
- Multiple accounts using same code
- Automated code testing
- Code sharing violations

### Code Security

**Best Practices:**
- Codes stored securely in database
- Codes not exposed in client-side code
- Server-side validation only
- Rate limiting on code validation

## Related Documentation

- **Campaign Types**: See [Campaign Types](./campaign-types.md)
- **Pricing Strategy**: See [Pricing Strategy](../pricing-strategy.md)
- **Stripe Integration**: See [Stripe Integration](../../integrations/stripe.md)
- **Commerce Agent**: See [Commerce Agent Documentation](../../agents/commerce-agent/README.md)

## Production System Information

**Region**: us-east-1  
**Payment Processing**: Stripe (coupon system)  
**Database**: Supabase PostgreSQL (code tracking)  
**Lambda Function**: `storytailor-commerce-agent-production`

**Source**: `docs/PRODUCTION_STATE_VERIFICATION.md`
