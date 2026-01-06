# Affiliate Program Documentation

**Last Updated**: 2025-12-14  
**Audience**: Business Development | Affiliates | Marketing  
**Status**: ✅ Production Ready

## Overview

This directory contains comprehensive affiliate program documentation including program overview, commission structure, referral code system, tracking and reporting, and payout procedures.

## Documentation Files

1. **[Affiliate Program](./affiliate-program.md)** - Program benefits, eligibility, application process, commission rates, terms and conditions
2. **[Affiliate Tracking](./affiliate-tracking.md)** - Technical implementation, conversion tracking, revenue attribution, reporting dashboard

## Affiliate Program Overview

The Storytailor Affiliate Program enables partners to earn commissions by referring customers to Storytailor. Affiliates receive revenue share based on successful referrals and conversions.

### Key Features

- **Revenue Share**: Earn commissions on referred customer subscriptions
- **Referral Codes**: Unique codes for tracking referrals
- **Real-Time Tracking**: Monitor conversions and earnings in real-time
- **Flexible Payouts**: Monthly payouts via Stripe or bank transfer
- **Marketing Support**: Access to marketing materials and resources

## Commission Structure

### Commission Rates

| Tier | Commission Rate | Minimum Payout |
|------|----------------|----------------|
| Standard Affiliate | 20% of first-year revenue | $50 |
| Premium Affiliate | 25% of first-year revenue | $50 |
| Enterprise Affiliate | 30% of first-year revenue | $100 |

### Commission Calculation

- **Base Commission**: Percentage of subscription revenue
- **Recurring Commissions**: Earn on subscription renewals (first year only)
- **One-Time Purchases**: 10% commission on story pack purchases
- **Enterprise Deals**: Custom commission structure

**Code References:**
- `supabase/migrations/` - Affiliate tracking tables (affiliate_conversions)
- `docs/business/pricing-comprehensive.md` - Affiliate pricing details

## Referral Code System

### How It Works

1. **Code Generation**: Affiliates receive unique referral codes
2. **Code Distribution**: Affiliates share codes via links, emails, social media
3. **Conversion Tracking**: System tracks when users sign up with referral code
4. **Commission Attribution**: Commissions attributed to referring affiliate
5. **Payout Processing**: Monthly payouts processed automatically

### Referral Code Format

- **Format**: `AFFILIATE-XXXXX` (e.g., `AFFILIATE-ABC123`)
- **Uniqueness**: Each affiliate has unique code
- **Validation**: Codes validated at signup and checkout
- **Expiration**: Codes do not expire (unless affiliate account closed)

## Tracking and Reporting

### Conversion Tracking

- **Signup Tracking**: Tracks when user signs up with referral code
- **Conversion Tracking**: Tracks when user completes first paid subscription
- **Revenue Attribution**: Attributes subscription revenue to referring affiliate
- **Real-Time Updates**: Dashboard updates in real-time

### Reporting Dashboard

Affiliates can access reporting dashboard to view:
- Total referrals
- Conversion rate
- Total commissions earned
- Pending payouts
- Payment history
- Performance metrics

**Code References:**
- `supabase/migrations/` - Affiliate tracking schema
- `docs/business/affiliates/affiliate-tracking.md` - Technical implementation

## Payout Procedures

### Payout Schedule

- **Frequency**: Monthly payouts
- **Processing**: First week of each month
- **Minimum**: $50 minimum payout threshold
- **Method**: Stripe or bank transfer

### Payout Process

1. **Calculation**: Commissions calculated at end of month
2. **Verification**: Affiliate account and payment info verified
3. **Processing**: Payout processed via Stripe or bank transfer
4. **Notification**: Affiliate notified via email
5. **Reporting**: Payout details available in dashboard

## Eligibility Requirements

### Standard Affiliate

- Active website, blog, or social media presence
- Relevant audience (parents, educators, children's content)
- Minimum 1,000 followers/subscribers
- No competing products or services

### Premium Affiliate

- Active website, blog, or social media presence
- Relevant audience (parents, educators, children's content)
- Minimum 10,000 followers/subscribers
- Established content creation track record
- No competing products or services

### Enterprise Affiliate

- Established business or organization
- Significant audience reach (50,000+)
- Strategic partnership potential
- Custom agreement terms

## Application Process

1. **Submit Application**: Complete affiliate application form
2. **Review**: Application reviewed by Business Development team
3. **Approval**: Approved affiliates receive welcome email
4. **Onboarding**: Access to affiliate dashboard and resources
5. **Code Generation**: Unique referral code generated
6. **Start Earning**: Begin sharing referral code and earning commissions

## Terms and Conditions

### Affiliate Responsibilities

- Promote Storytailor accurately and ethically
- Comply with all applicable laws and regulations
- Do not engage in spam or unethical marketing
- Maintain brand guidelines and messaging
- Report any issues or concerns promptly

### Program Rules

- One affiliate account per person/organization
- Referral codes cannot be shared with other affiliates
- Commissions only paid on legitimate referrals
- Fraudulent activity results in account termination
- Storytailor reserves right to modify program terms

## Related Documentation

- **Affiliate Program Details**: See [Affiliate Program](./affiliate-program.md)
- **Technical Implementation**: See [Affiliate Tracking](./affiliate-tracking.md)
- **Pricing**: See [Pricing Comprehensive](../pricing-comprehensive.md)
- **Business Development**: See [Business Development](../bizdev/README.md)

## Production System Information

**Region**: us-east-1  
**Database**: Supabase PostgreSQL (affiliate_conversions table)  
**Payment Processing**: Stripe  
**Tracking**: Real-time conversion tracking via database

**Source**: `docs/PRODUCTION_STATE_VERIFICATION.md`
