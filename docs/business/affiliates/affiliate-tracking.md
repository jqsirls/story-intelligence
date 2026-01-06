# Affiliate Tracking - Technical Implementation

**Last Updated**: 2025-12-14  
**Audience**: Engineering | Business Development | Affiliates  
**Status**: ✅ Production Ready

## Overview

This document describes the technical implementation of affiliate tracking, conversion tracking, revenue attribution, and reporting dashboard.

## Database Schema

### Affiliate Conversions Table

**Table**: `affiliate_conversions`

**Schema:**
```sql
CREATE TABLE affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id),
  user_id UUID REFERENCES users(id),
  referral_code TEXT NOT NULL,
  conversion_type TEXT NOT NULL, -- 'signup', 'subscription', 'purchase'
  subscription_tier TEXT,
  revenue_amount DECIMAL(10, 2),
  commission_amount DECIMAL(10, 2),
  commission_rate DECIMAL(5, 2),
  conversion_date TIMESTAMPTZ DEFAULT NOW(),
  payout_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  payout_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Code References:**
- `supabase/migrations/` - Database migration files
- `docs/system/database_schema_inventory.md` - Complete database schema

### Affiliates Table

**Table**: `affiliates`

**Schema:**
```sql
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  affiliate_tier TEXT NOT NULL, -- 'standard', 'premium', 'enterprise'
  commission_rate DECIMAL(5, 2) NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  payment_method TEXT, -- 'stripe', 'bank_transfer'
  payment_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Conversion Tracking

### Signup Tracking

**Process:**
1. User clicks affiliate referral link or uses referral code
2. Referral code stored in session/cookie
3. User completes registration
4. System creates affiliate_conversion record with type 'signup'
5. Affiliate dashboard updated in real-time

**Code Implementation:**
```typescript
// Pseudo-code for signup tracking
async function trackAffiliateSignup(userId: string, referralCode: string) {
  const affiliate = await getAffiliateByCode(referralCode);
  if (affiliate && affiliate.status === 'active') {
    await createAffiliateConversion({
      affiliate_id: affiliate.id,
      user_id: userId,
      referral_code: referralCode,
      conversion_type: 'signup',
      conversion_date: new Date()
    });
  }
}
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - Registration endpoint
- `packages/auth-agent/src/auth-agent.ts` - Authentication logic

### Subscription Conversion Tracking

**Process:**
1. User with affiliate referral completes paid subscription
2. System checks for existing affiliate_conversion record (signup)
3. System creates new affiliate_conversion record with type 'subscription'
4. Commission calculated based on affiliate tier and subscription revenue
5. Affiliate dashboard updated with conversion and commission

**Code Implementation:**
```typescript
// Pseudo-code for subscription conversion tracking
async function trackAffiliateSubscription(
  userId: string,
  subscriptionTier: string,
  revenueAmount: number
) {
  const signupConversion = await getAffiliateConversionByUser(userId, 'signup');
  if (signupConversion) {
    const affiliate = await getAffiliateById(signupConversion.affiliate_id);
    const commissionRate = affiliate.commission_rate;
    const commissionAmount = revenueAmount * (commissionRate / 100);
    
    await createAffiliateConversion({
      affiliate_id: affiliate.id,
      user_id: userId,
      referral_code: signupConversion.referral_code,
      conversion_type: 'subscription',
      subscription_tier: subscriptionTier,
      revenue_amount: revenueAmount,
      commission_amount: commissionAmount,
      commission_rate: commissionRate,
      conversion_date: new Date()
    });
  }
}
```

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Subscription processing
- `docs/integrations/stripe.md` - Stripe integration

### Purchase Conversion Tracking

**Process:**
1. User with affiliate referral makes one-time purchase (story pack)
2. System checks for affiliate referral
3. System creates affiliate_conversion record with type 'purchase'
4. Commission calculated (10% of purchase amount)
5. Affiliate dashboard updated

**Code Implementation:**
```typescript
// Pseudo-code for purchase conversion tracking
async function trackAffiliatePurchase(
  userId: string,
  purchaseAmount: number
) {
  const signupConversion = await getAffiliateConversionByUser(userId, 'signup');
  if (signupConversion) {
    const affiliate = await getAffiliateById(signupConversion.affiliate_id);
    const commissionRate = 10; // 10% for one-time purchases
    const commissionAmount = purchaseAmount * (commissionRate / 100);
    
    await createAffiliateConversion({
      affiliate_id: affiliate.id,
      user_id: userId,
      referral_code: signupConversion.referral_code,
      conversion_type: 'purchase',
      revenue_amount: purchaseAmount,
      commission_amount: commissionAmount,
      commission_rate: commissionRate,
      conversion_date: new Date()
    });
  }
}
```

## Revenue Attribution

### Attribution Window

- **Attribution Period**: Lifetime (user remains attributed to original affiliate)
- **Commission Period**: First 12 months of subscription
- **Recurring Commissions**: Earned on monthly/annual renewals during first year

### Attribution Rules

1. **First Touch**: User attributed to first affiliate who referred them
2. **Lifetime Attribution**: User remains attributed to original affiliate
3. **No Override**: Subsequent referrals do not change attribution
4. **Self-Referral Prevention**: Users cannot refer themselves

## Reporting Dashboard

### Dashboard Features

**Real-Time Metrics:**
- Total referrals
- Conversion rate (signups to subscriptions)
- Total commissions earned
- Pending payouts
- Payment history
- Performance trends

**Conversion Analytics:**
- Signup conversions
- Subscription conversions
- Purchase conversions
- Revenue by tier
- Commission breakdown

**Performance Metrics:**
- Click-through rate (if tracking available)
- Conversion rate
- Average commission per conversion
- Total revenue generated
- Commission earnings

### Dashboard API

**Endpoints:**
- `GET /v1/affiliate/dashboard` - Dashboard overview
- `GET /v1/affiliate/conversions` - Conversion history
- `GET /v1/affiliate/commissions` - Commission details
- `GET /v1/affiliate/payouts` - Payout history

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - API endpoints
- `docs/api-reference/README.md` - API documentation

## Payout Processing

### Payout Calculation

**Monthly Payout Process:**
1. Calculate total commissions for previous month
2. Verify minimum payout threshold ($50 standard, $100 enterprise)
3. Generate payout record
4. Process payment via Stripe or bank transfer
5. Update affiliate_conversion records with payout status
6. Send payout notification email

**Code Implementation:**
```typescript
// Pseudo-code for payout processing
async function processMonthlyPayouts() {
  const affiliates = await getActiveAffiliates();
  
  for (const affiliate of affiliates) {
    const pendingCommissions = await getPendingCommissions(
      affiliate.id,
      previousMonth
    );
    
    const totalCommission = pendingCommissions.reduce(
      (sum, conv) => sum + conv.commission_amount,
      0
    );
    
    if (totalCommission >= affiliate.minimum_payout) {
      await processPayout(affiliate, totalCommission);
      await updateConversionPayoutStatus(
        pendingCommissions.map(c => c.id),
        'paid'
      );
    }
  }
}
```

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Payment processing
- `docs/integrations/stripe.md` - Stripe payout integration

### Payout Schedule

- **Frequency**: Monthly
- **Processing**: First week of each month
- **Period**: Previous month's commissions
- **Method**: Stripe or bank transfer
- **Notification**: Email notification sent upon processing

## Integration Points

### Registration Integration

**Location**: User registration endpoint
- Track referral code at signup
- Create affiliate_conversion record
- Update affiliate dashboard

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:973-1077` - Registration endpoint

### Subscription Integration

**Location**: Subscription checkout and processing
- Check for affiliate referral
- Track subscription conversion
- Calculate and record commission

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Subscription processing
- `docs/integrations/stripe.md` - Stripe checkout integration

### Purchase Integration

**Location**: Story pack purchase processing
- Check for affiliate referral
- Track purchase conversion
- Calculate and record commission

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts:120-134` - Purchase flow

## Security and Privacy

### Data Protection

- **Affiliate Data**: Stored securely in Supabase with RLS
- **User Privacy**: Affiliate tracking respects user privacy
- **GDPR Compliance**: Affiliate data handling complies with GDPR
- **COPPA Compliance**: No tracking of children under 13

**Code References:**
- `docs/compliance/gdpr.md` - GDPR compliance
- `docs/compliance/coppa.md` - COPPA compliance

### Fraud Prevention

- **Self-Referral Prevention**: Users cannot refer themselves
- **Duplicate Prevention**: One conversion per user per affiliate
- **Verification**: Conversions verified before commission payment
- **Monitoring**: Fraud detection and monitoring systems

## Related Documentation

- **Affiliate Program**: See [Affiliate Program](./affiliate-program.md)
- **Pricing**: See [Pricing Comprehensive](../pricing-comprehensive.md)
- **Database Schema**: See [Database Schema Inventory](../../system/database_schema_inventory.md)
- **API Reference**: See [API Reference](../../api-reference/README.md)

## Production System Information

**Region**: us-east-1  
**Database**: Supabase PostgreSQL  
**Payment Processing**: Stripe  
**Tracking**: Real-time via database triggers and API endpoints

**Source**: `docs/PRODUCTION_STATE_VERIFICATION.md`
