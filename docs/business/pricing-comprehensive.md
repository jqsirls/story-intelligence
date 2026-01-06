Status: ✅ Production Ready  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-14  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Comprehensive pricing tables and policies documentation - Updated with current production pricing

# Comprehensive Pricing Documentation

## Overview

This document provides complete pricing information for all Storytailor tiers, features, add-ons, policies, and billing options.

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:1-320` - Pricing implementation
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:29-72` - Tier configurations
- `packages/commerce-agent/src/config.ts:11-41` - Plan configurations

## Complete Pricing Table

### Subscription Tiers

| Tier | Monthly | Annual | Savings | Stories/Month | Key Features |
|------|---------|--------|---------|---------------|--------------|
| **Free** | $0 | $0 | - | 1 | Web only, basic features, GPT-5.1-mini, 2 images, Polly |
| **Alexa+ Starter** | $9.99 | $99.00 | $20.88 | 10 | Voice-first, all platforms, GPT-5.1, 5 images, ElevenLabs |
| **Individual** | $12.99 | $129.00 | $26.88 | 30 | Full features, all platforms, GPT-5.1, 5 images, ElevenLabs |
| **Premium** | $19.99 | $199.00 | $40.88 | Unlimited | Priority queue, GPT-5.1, 5 images, ElevenLabs |
| **Family** | $24.99 | $249.00 | $50.88 | 20 | Family sharing, GPT-5.1, 5 images, ElevenLabs |
| **Professional** | $29.99 | Custom | - | Unlimited | API access, analytics, white-label |
| **Enterprise** | Custom | Custom | - | Custom | Custom solutions, SLA |

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:16-23` - Stripe price IDs
- `docs/finance/finance-pricing.md:10-48` - Tier features

### Story Packs (One-Time Purchases)

| Pack | Price | Stories | Price per Story | Best For |
|------|-------|---------|-----------------|----------|
| **5 Story Pack** | $4.99 | 5 | $0.998 | Trying premium quality |
| **10 Story Pack** | $8.99 | 10 | $0.899 | Occasional use |
| **20 Story Pack** | $14.99 | 20 | $0.7495 | Regular use |

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:25-28` - Story pack pricing
- `packages/commerce-agent/src/CommerceAgent.ts:120-134` - Purchase flow

## Feature Comparison Matrix

### Core Features

| Feature | Free | Alexa+ Starter | Individual | Premium | Family | Professional | Enterprise |
|---------|------|----------------|------------|---------|--------|--------------|------------|
| **Stories/Month** | 1-5 | 10 | 30 | Unlimited | 20 | Unlimited | Custom |
| **Platforms** | Web | All | All | All | All | All | All |
| **Story Types** | Standard | All | All | All | All | All | All |
| **Character Creation** | Basic | Advanced | Advanced | Advanced | Advanced | Advanced | Advanced |
| **Image Count** | 2 | 5 | 5 | 5 | 5 | 5 | 5 |
| **Voice Synthesis** | Polly | ElevenLabs | ElevenLabs | ElevenLabs | ElevenLabs | ElevenLabs | ElevenLabs |
| **AI Model** | GPT-5.1-mini | GPT-5.1 | GPT-5.1 | GPT-5.1 | GPT-5.1 | GPT-5.1 | GPT-5.1 |
| **Priority Queue** | No | No | No | Yes | No | No | Yes |
| **Smart Home** | No | Yes | Yes | Yes | Yes | Yes | Yes |
| **Kid Intelligence** | No | Yes | Yes | Yes | Yes | Yes | Yes |
| **Multiple Profiles** | No | No | No | Yes | Yes | Yes | Yes |
| **Analytics** | Basic | Basic | Basic | Basic | Basic | Advanced | Advanced |
| **API Access** | No | No | No | No | No | Yes | Yes |
| **White-Label** | No | No | No | No | No | Yes | Yes |
| **Support** | Community | Standard | Standard | Standard | Standard | Priority | Dedicated |

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:29-72` - Feature configurations

### Advanced Features

| Feature | Free | Paid Tiers | Enterprise |
|---------|------|------------|------------|
| **Video Generation** | No | Add-on | Included |
| **Live Avatar** | No | Add-on | Included |
| **PDF Export** | Limited | Full | Full |
| **Classroom Tools** | No | No | Professional+ |
| **Webhook Integration** | No | No | Professional+ |
| **Custom Integrations** | No | No | Enterprise |
| **SLA Guarantees** | No | No | Enterprise |
| **Custom Branding** | No | No | Enterprise |

## Add-On Pricing

### Story Packs

**One-Time Purchases:**
- 5 Story Pack: $4.99
- 10 Story Pack: $8.99
- 20 Story Pack: $14.99

**Usage:**
- Credits never expire
- Can be used across billing periods
- Purchasable by free and paid users

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:116-140` - Story pack implementation

### Premium Features (Planned)

**Premium Voices:**
- Additional voice options
- Custom voice cloning
- Pricing: TBD

**Video Stories:**
- Sora-2 video generation
- Animated stories
- Pricing: TBD

**Smart Home Pro:**
- Advanced lighting controls
- Multi-room synchronization
- Pricing: TBD

## Usage-Based Pricing Components

### API Usage (Professional+)

**Pricing Model:**
- Metered by API calls
- Tiered pricing:
  - Developer: $X/month + usage
  - Business: $X/month + usage
  - Enterprise: Custom

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:64-65` - API usage tracking

### Overage Policies

**Story Limits:**
- Free tier: Hard limit (upgrade required)
- Paid tiers: Soft limit with upgrade prompts
- Premium: Unlimited

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:148-161` - Limit enforcement

## Refund and Cancellation Policies

### Refund Policy

**Subscription Refunds:**
- Case-by-case basis
- Pro-rated refunds for annual plans
- No refunds for monthly plans (standard)

**Story Pack Refunds:**
- Non-refundable (digital goods)
- Credits remain if account active

### Cancellation Policy

**Self-Service Cancellation:**
- Users can cancel anytime
- Access continues until end of billing period
- No cancellation fees

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Subscription management

## Billing Cycle Options

### Monthly Billing

**Benefits:**
- Lower barrier to entry
- Flexibility
- Easier conversion from free tier

**Pricing:**
- Full monthly rate
- Recurring monthly charges
- Auto-renewal

### Annual Billing

**Benefits:**
- 20% discount
- Improved cash flow
- Reduced churn

**Pricing:**
- 20% off monthly rate
- Annual commitment
- Auto-renewal

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:16-23` - Annual pricing

## Payment Method Support

### Credit Cards

**Supported:**
- Visa
- Mastercard
- American Express
- Discover (via Stripe)

**Processing:**
- Stripe Checkout
- PCI-DSS compliant
- Secure tokenization

**Code References:**
- `docs/integrations/stripe.md:1-200` - Stripe integration

### ACH (Enterprise)

**Availability:**
- Enterprise customers only
- Custom billing terms
- Invoice-based

### Invoice (Enterprise)

**Availability:**
- Enterprise customers
- Custom terms
- Net-30, Net-60 options

## Tax Handling

### Tax Collection

**Current:**
- Stripe handles tax calculation
- Based on customer location
- Automatic tax collection

**Future:**
- Custom tax handling
- Enterprise invoicing
- Tax-exempt organizations

**Code References:**
- `docs/integrations/stripe.md` - Stripe tax handling

## Currency Support

### Current Currency

**Primary:**
- USD (United States Dollar)

**Future:**
- Multi-currency support planned
- Regional pricing adjustments
- Local payment methods

## Partner/Affiliate Pricing

### Affiliate Program

**Revenue Share:**
- Tracked via `affiliate_conversions` table
- Revenue share agreements
- Referral codes

**Commission Rates:**
- Standard Affiliate: 20% of first-year revenue
- Premium Affiliate: 25% of first-year revenue
- Enterprise Affiliate: 30% of first-year revenue (or custom)

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:62-63` - Affiliate system
- `supabase/migrations/20241013000001_pricing_and_usage.sql` - Affiliate tables
- `docs/business/affiliates/affiliate-program.md` - Complete affiliate program documentation

### White-Label Pricing

**Pricing Model:**
- Custom licensing
- Revenue share
- Per-seat pricing
- Volume discounts

**Code References:**
- `packages/commerce-agent/src/config.ts:26-40` - Organization plans

## Educational Discounts

### Educational Pricing

**Availability:**
- Schools and educational institutions
- Classroom plans
- Volume discounts

**Discount Structure:**
- Custom pricing
- Seat-based pricing
- Annual commitments

**Code References:**
- `docs/docs/FINANCE_PRICING.md:29-38` - Professional tier (educational use)

## Non-Profit Pricing

### Non-Profit Discounts

**Availability:**
- Verified non-profit organizations
- Custom pricing
- Discounted rates

**Verification:**
- Non-profit verification required
- Custom approval process

## Pricing Policies Summary

### General Policies

**Trial Period:**
- Free tier serves as trial
- No credit card required for free tier
- 7-day trial for paid tiers (planned)

**Upgrade/Downgrade:**
- Instant upgrades
- Prorated billing
- Downgrade at end of billing period

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Subscription management

### Enterprise Policies

**Custom Terms:**
- Custom pricing
- Custom billing cycles
- Volume discounts
- SLA guarantees
- Dedicated support

## Related Documentation

- **Pricing Strategy:** See [Pricing Strategy](./pricing-strategy.md)
- **Unit Economics:** See [Unit Economics](./unit-economics.md)
- **Finance Guide:** See [Finance Guide](../roles/finance.md)
- **Stripe Integration:** See [Stripe Integration](../integrations/stripe.md)
