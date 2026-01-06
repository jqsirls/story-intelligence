Status: Draft  
Audience: Internal | Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Comprehensive pricing strategy documentation

# Pricing Strategy

## Overview

Storytailor uses a value-based pricing model that positions the platform as a premium storytelling solution while maintaining accessibility through a free tier and flexible subscription options.

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:1-320` - Pricing implementation details
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:29-72` - Tier configurations
- `packages/commerce-agent/src/config.ts:11-41` - Plan configurations

## Pricing Philosophy

### Value-Based Pricing Rationale

**Core Principles:**
1. **Premium Positioning**: Award-caliber storytelling quality justifies premium pricing
2. **Therapeutic Value**: Mental health and developmental support add significant value
3. **Time Savings**: Automated story creation saves parents hours per week
4. **Quality Differentiation**: Story Intelligence™ delivers publishing-quality content

**Value Proposition:**
- "Award-quality stories for less than the cost of one children's book"
- "Less than a coffee per week for unlimited stories"
- "Professional tools for less than a therapy session"

**Code References:**
- `docs/sales/sales-pricing.md:39-61` - Value propositions by tier

## Tier Structure and Positioning

### Free Tier

**Price:** $0/month

**Features:**
- 1 story per month (per `StoryLimitHandler.ts:73`)
- Basic character creation
- Web access only
- Standard story types
- GPT-5.1-mini model (lightweight)
- 2 images per story
- AWS Polly voice synthesis

**Code References:**
- `lambda-deployments/router/src/services/StoryLimitHandler.ts:73` - Free tier limit: 1 story/month
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:30-36` - Free tier configuration

**Purpose:**
- Acquisition engine for PLG strategy
- Low-friction onboarding
- Demonstrates value before conversion

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:30-36` - Free tier config
- `lambda-deployments/router/src/services/StoryLimitHandler.ts:72-79` - Story limits

### Alexa+ Starter Tier

**Price:** $9.99/month ($99.00/year)

**Features:**
- 10 stories per month (per `StoryLimitHandler.ts:75`)
- GPT-5.1 model
- 5 images per story
- ElevenLabs voice synthesis
- All platforms (web, mobile, voice)
- Smart home integration

**Code References:**
- `lambda-deployments/router/src/services/StoryLimitHandler.ts:75` - Alexa+ Starter limit: 10 stories/month
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:44-50` - Alexa+ Starter configuration

**Positioning:**
- Entry-level paid tier
- Voice-first experience
- Best for Alexa users

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:16-17` - Stripe price IDs

### Individual Tier

**Price:** $12.99/month ($129.00/year)

**Features:**
- 30 stories per month (per `StoryLimitHandler.ts:76`)
- GPT-5.1 model
- 5 images per story
- ElevenLabs voice synthesis
- All platforms
- All story types
- Kid Communication Intelligence
- Smart home integration

**Code References:**
- `lambda-deployments/router/src/services/StoryLimitHandler.ts:76` - Individual tier limit: 30 stories/month
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:51-57` - Individual tier configuration

**Positioning:**
- Primary consumer tier
- Best value for individual families
- Most popular paid tier

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:18-19` - Stripe price IDs
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:51-57` - Individual tier config

### Premium Tier

**Price:** $19.99/month ($199.00/year)

**Features:**
- Unlimited stories (per `StoryLimitHandler.ts:78` - limit: -1)
- GPT-5.1 model
- 5 images per story
- ElevenLabs voice synthesis
- Priority queue (faster generation)
- All platforms
- All story types
- Advanced character creation
- Multiple child profiles
- Advanced analytics

**Code References:**
- `lambda-deployments/router/src/services/StoryLimitHandler.ts:78` - Premium tier: unlimited (limit: -1)
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:58-64` - Premium tier configuration

**Positioning:**
- Power user tier
- Best for families with multiple children
- Priority processing

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:20-21` - Stripe price IDs
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:58-64` - Premium tier config

### Family Tier

**Price:** $24.99/month ($249.00/year)

**Features:**
- 20 stories per month (per `StoryLimitHandler.ts:77`)
- GPT-5.1 model
- 5 images per story
- ElevenLabs voice synthesis
- All platforms
- All story types
- Multiple child profiles
- Family library sharing

**Code References:**
- `lambda-deployments/router/src/services/StoryLimitHandler.ts:77` - Family tier limit: 20 stories/month
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:65-71` - Family tier configuration

**Positioning:**
- Family-focused tier
- Shared library features
- Best for larger families

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:22-23` - Stripe price IDs
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:65-71` - Family tier config

### Professional Tier

**Price:** $29.99/month

**Features:**
- Everything in Family Tier
- Multiple child profiles
- Advanced analytics
- Classroom tools
- API access
- Webhook integrations
- White-label options

**Positioning:**
- Educator and therapist tier
- Professional tools
- Best for power users and professionals

**Code References:**
- `docs/finance/finance-pricing.md:29-38` - Professional tier features

### Enterprise Tier

**Price:** Custom

**Features:**
- Everything in Professional Tier
- Custom integrations
- Dedicated support
- SLA guarantees
- Custom branding
- Volume discounts
- Bulk account management

**Positioning:**
- Schools and organizations
- Custom solutions
- Volume pricing

**Code References:**
- `docs/docs/FINANCE_PRICING.md:40-48` - Enterprise tier features

## Competitive Pricing Analysis

### Market Position

**Premium Tier:**
- Higher than basic storytelling apps ($0-5/month)
- Competitive with educational platforms ($10-30/month)
- Lower than premium educational services ($50-100/month)

**Value Differentiation:**
- Story Intelligence™ quality
- Therapeutic focus
- Multi-platform access
- COPPA compliance

### Competitive Advantages

1. **Quality**: Award-caliber storytelling
2. **Safety**: COPPA/GDPR compliant
3. **Platform**: Multi-channel (web, mobile, voice)
4. **Intelligence**: Story Intelligence™ proprietary system
5. **Therapeutic**: Mental health and developmental support

## Pricing Psychology

### Anchoring Strategy

**Premium Anchor:**
- Professional Tier ($29.99) serves as anchor
- Makes Family Tier ($9.99-24.99) appear more affordable
- Creates perception of value

### Decoy Effect

**Tier Positioning:**
- Individual Tier ($12.99) makes Premium ($19.99) attractive
- Family Tier ($24.99) makes Professional ($29.99) reasonable
- Strategic tier spacing maximizes conversions

### Price Points

**Psychological Pricing:**
- $9.99 (under $10 threshold)
- $12.99 (mid-range anchor)
- $19.99 (under $20 threshold)
- $24.99 (premium but accessible)
- $29.99 (professional tier)

**Last Updated**: 2025-12-14  
**Status**: ✅ Production Ready  
**Region**: us-east-1

## Discount and Promotion Strategies

### Annual Discounts

**Strategy:**
- 20% discount on annual plans
- Encourages annual commitments
- Improves cash flow and reduces churn

**Examples:**
- Family Monthly: $9.99/month = $119.88/year
- Family Annual: $99.00/year (save $20.88)
- Individual Monthly: $12.99/month = $155.88/year
- Individual Annual: $129.00/year (save $26.88)

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:16-23` - Annual pricing

### Story Packs (One-Time Purchases)

**Pricing:**
- 5 Story Pack: $4.99
- 10 Story Pack: $8.99
- 20 Story Pack: $14.99

**Purpose:**
- Bridge free tier to paid conversion
- Low-commitment entry point
- Upsell opportunity

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:25-28` - Story pack pricing
- `packages/commerce-agent/src/CommerceAgent.ts:120-134` - Story pack purchase flow

### Promotion Codes

**Types:**
- Referral codes (user invites)
- Discount codes (marketing campaigns)
- Educational discounts
- Non-profit discounts

**Campaign Types:**
- Seasonal promotions (Black Friday, holidays)
- Referral campaigns
- Educational discounts
- Launch promotions
- Retention campaigns

**Code References:**
- `packages/commerce-agent/src/config.ts:43-52` - Discount code configuration
- `packages/commerce-agent/src/CommerceAgent.ts:96-98` - Discount application
- `docs/business/promotions/campaign-types.md` - Complete campaign documentation
- `docs/business/promotions/discount-codes.md` - Discount code management

### Referral System

**Implementation:**
- Referral tracking via `affiliate_conversions` table
- Revenue share for partners
- Discount codes for referrals

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:62-63` - Affiliate system
- `packages/commerce-agent/src/types.ts:42-46` - Referral tracking interface

## Annual vs Monthly Pricing Strategy

### Annual Pricing Benefits

**For Customers:**
- 20% savings
- Lower monthly effective cost
- Commitment to platform

**For Business:**
- Improved cash flow
- Reduced churn (annual commitment)
- Lower payment processing costs
- Better LTV

### Monthly Pricing Benefits

**For Customers:**
- Lower upfront cost
- Flexibility to cancel
- Try before annual commitment

**For Business:**
- Lower barrier to entry
- Easier conversion from free tier
- Higher conversion rate

### Strategy

**Hybrid Approach:**
- Offer both monthly and annual
- Default to monthly (lower barrier)
- Promote annual savings prominently
- Annual discount incentivizes commitment

## Enterprise Pricing Models

### Custom Pricing Factors

**Volume Discounts:**
- Based on number of seats/users
- Tiered pricing for larger organizations
- Custom contracts

**Usage-Based Components:**
- API usage metering
- Story generation limits
- Custom feature access

**Service Level Agreements:**
- Uptime guarantees
- Response time commitments
- Dedicated support

**Code References:**
- `packages/commerce-agent/src/config.ts:26-40` - Organization plan config

## International Pricing Considerations

### Currency Support

**Current:**
- USD primary currency
- Multi-currency support planned

**Future Considerations:**
- Regional pricing adjustments
- Local payment methods
- Tax handling by region
- Currency conversion

### Regional Pricing Strategy

**Factors:**
- Local purchasing power
- Competitive landscape
- Regulatory requirements
- Payment method availability

## Pricing Optimization

### A/B Testing Opportunities

**Test Variables:**
- Tier price points
- Feature gating
- Discount amounts
- Annual vs monthly promotion

### Conversion Optimization

**Free Tier Limits:**
- Story count (1 vs 5 per month)
- Feature restrictions
- Quality differences (GPT-5.1-mini vs GPT-5.1)

**Upgrade Triggers:**
- Usage-based prompts (80% of limit)
- Feature unlock prompts
- Quality upgrade suggestions

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:181-226` - Upgrade suggestion logic

## Related Documentation

- **Comprehensive Pricing:** See [Comprehensive Pricing Documentation](./pricing-comprehensive.md)
- **Unit Economics:** See [Unit Economics](./unit-economics.md)
- **PLG Strategy:** See [Product-Led Growth](./product-led-growth.md)
- **Finance Guide:** See [Finance Guide](../roles/finance.md)
