Status: Draft  
Audience: Internal | Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Comprehensive Product-Led Growth strategy documentation

# Product-Led Growth (PLG) Strategy

## Overview

Storytailor employs a Product-Led Growth strategy where the product itself drives user acquisition, activation, conversion, and expansion. The free tier serves as the primary acquisition engine, with in-product experiences guiding users through the value journey.

**Code References:**
- `COMPLETE_INTEGRATION_STATUS.md:173-193` - PLG features implementation
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:181-226` - Upgrade suggestions
- `PRICING_IMPLEMENTATION_STATUS.md:79-91` - Tier quality system

## PLG Strategy Overview

### Core Principles

1. **Free Tier as Acquisition Engine**: Low-friction entry point
2. **Self-Service Onboarding**: Users discover value independently
3. **In-Product Conversion**: Upgrade prompts within product experience
4. **Usage-Based Expansion**: Natural upgrade triggers based on usage
5. **Viral Growth Mechanisms**: Referrals and sharing drive acquisition

### PLG Funnel

**AARRR Metrics (Pirate Metrics):**
- **Acquisition**: Free tier signups
- **Activation**: First story created
- **Retention**: Return usage
- **Revenue**: Free-to-paid conversion
- **Referral**: Viral sharing and referrals

## Free Tier as Acquisition Engine

### Free Tier Design

**Purpose:**
- Remove barriers to entry
- Demonstrate value quickly
- Build user habit
- Create upgrade desire

**Limitations (Intentional):**
- Story limit (1-5 per month)
- Quality tier (GPT-5.1-mini, 2 images, Polly voice)
- Platform restriction (web only)
- Feature gating (basic character creation)

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:30-36` - Free tier configuration
- `lambda-deployments/router/src/services/StoryLimitHandler.ts:72-79` - Story limits

### Conversion Strategy

**Free Tier → Paid Conversion:**
- Usage-based triggers (80% of limit)
- Quality upgrade prompts
- Feature unlock messaging
- Value demonstration

**Conversion Targets:**
- 10-15% free-to-paid conversion rate
- Average time to conversion: 7-14 days
- Primary conversion tier: Individual ($12.99/month)

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:189-197` - Usage-based upgrade triggers

## Self-Service Onboarding Flows

### Onboarding Journey

**Step 1: Signup (Frictionless)**
- Email or social login
- Age verification (COPPA compliance)
- Parent consent if needed
- Immediate access to free tier

**Step 2: First Story (Activation)**
- Guided character creation
- Story type selection
- First story generation
- Quality demonstration

**Step 3: Value Discovery**
- Library management
- Character consistency
- Story quality appreciation
- Platform exploration

**Step 4: Upgrade Consideration**
- Limit approaching (80% trigger)
- Quality comparison prompts
- Feature unlock messaging
- Value proposition reinforcement

**Code References:**
- `packages/universal-agent/src/api/AuthRoutes.ts` - Registration flow
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:148-161` - Limit checking

### Activation Metrics

**Key Activation Events:**
1. Account created
2. First character created
3. First story generated
4. Second story generated (7-day retention)
5. Story shared/exported
6. Character reused

**Activation Targets:**
- 60%+ create characters
- 40%+ create 2nd character in 7 days
- 70%+ stories use custom characters

**Code References:**
- `COMPLETE_INTEGRATION_STATUS.md:467-477` - Expected activation metrics

## In-Product Upgrade Prompts

### Upgrade Trigger Points

**1. Usage-Based Triggers:**
- 80% of story limit reached
- Limit exceeded (block with upgrade option)
- Quality comparison (show premium quality)

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:189-197` - Usage triggers

**2. Feature Unlock Triggers:**
- Attempt to use premium feature
- Platform restriction (mobile/voice on free tier)
- Advanced character creation
- Video generation
- Live avatar

**3. Quality Upgrade Triggers:**
- Show quality difference
- Demonstrate GPT-5.1 vs GPT-5.1-mini
- ElevenLabs vs Polly comparison
- Image count (2 vs 5)

**4. Pack Spending Triggers:**
- 2+ story packs purchased → suggest subscription
- Cost analysis (packs more expensive than subscription)

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:199-214` - Pack spending triggers

### Upgrade Messaging

**Messaging Strategy:**
- Value-focused (not feature-focused)
- Time-sensitive (limit approaching)
- Quality demonstration
- Cost savings (packs vs subscription)

**Example Messages:**
- "You have 1 story left this month! Upgrade to unlock unlimited stories."
- "You've purchased 2 story packs. A subscription saves you money!"
- "Unlock premium quality with GPT-5.1 and 5 images per story."

## Feature Gating Strategy

### Gated Features by Tier

**Free Tier Restrictions:**
- Story limit (1-5/month)
- Platform (web only)
- Quality (GPT-5.1-mini, 2 images, Polly)
- Basic character creation
- Standard story types

**Paid Tier Unlocks:**
- Unlimited stories (Premium)
- All platforms (web, mobile, voice)
- Premium quality (GPT-5.1, 5 images, ElevenLabs)
- Advanced character creation
- All story types
- Smart home integration
- Priority queue (Premium)

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:29-72` - Tier configurations

### Feature Gate Implementation

**Code Pattern:**
```typescript
const tierInfo = await tierQualityService.getUserTierInfo(userId);
if (tierInfo.tier === 'free' && featureRequiresPaid) {
  return upgradePrompt();
}
```

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:139-161` - Feature gating logic

## Usage-Based Expansion Triggers

### Expansion Revenue Tactics

**1. Tier Upgrades:**
- Free → Individual
- Individual → Premium
- Premium → Family

**2. Add-On Purchases:**
- Story packs
- Premium voices
- Video stories
- Smart Home Pro

**3. Seat Expansion (Enterprise):**
- Additional child profiles
- Organization seats
- Classroom licenses

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:216-224` - Power user upgrades

### Expansion Triggers

**Usage Patterns:**
- High usage (25+ stories/month) → Premium tier
- Multiple children → Family tier
- Professional use → Professional tier
- Organization needs → Enterprise tier

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:216-224` - Power user detection

## Viral Growth Mechanisms

### Referral System

**Implementation:**
- Referral codes for user invites
- Revenue share tracking
- Discount codes for referrals
- Affiliate partner system

**Code References:**
- `packages/commerce-agent/src/types.ts:42-46` - Referral tracking
- `PRICING_IMPLEMENTATION_STATUS.md:62-63` - Affiliate system
- `supabase/migrations/20241013000001_pricing_and_usage.sql` - Affiliate tables

### Sharing Mechanisms

**Story Sharing:**
- Export stories (PDF)
- Share library with family
- Organization member invites
- Social sharing (planned)

**Code References:**
- `COMPLETE_INTEGRATION_STATUS.md:191-192` - Sharing features

### Organization Features

**Viral Growth via Organizations:**
- Invite system for organizations
- Shared libraries
- Member management
- Bulk account creation

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Organization management

## Activation Metrics and Funnels

### Activation Funnel

**Funnel Stages:**
1. **Signup** → Account created
2. **Onboarding** → First character created
3. **Activation** → First story generated
4. **Engagement** → Second story (7-day retention)
5. **Conversion** → Free-to-paid upgrade

**Target Conversion Rates:**
- Signup → Onboarding: 80%+
- Onboarding → Activation: 70%+
- Activation → Engagement: 40%+
- Engagement → Conversion: 10-15%

**Code References:**
- `COMPLETE_INTEGRATION_STATUS.md:467-477` - Expected metrics

### Key Activation Metrics

**Primary Metrics:**
- **Activation Rate**: % of signups creating first story
- **7-Day Retention**: % creating second story within 7 days
- **Character Creation Rate**: % creating characters
- **Character Reuse Rate**: % reusing characters

**Secondary Metrics:**
- Time to first story
- Stories per user (free tier)
- Feature usage rates
- Platform usage distribution

## Conversion Optimization

### Conversion Funnel Optimization

**Free Tier Optimization:**
- Reduce friction in signup
- Improve onboarding flow
- Demonstrate value quickly
- Create upgrade desire

**Conversion Point Optimization:**
- Strategic upgrade prompts
- Value demonstration
- Quality comparisons
- Cost savings messaging

### A/B Testing Opportunities

**Test Variables:**
- Free tier story limit (1 vs 5)
- Upgrade prompt timing
- Messaging variations
- Pricing display
- Feature gating thresholds

### Conversion Rate Targets

**Target Metrics:**
- Free-to-paid conversion: 10-15%
- Trial-to-paid conversion: 20-30%
- Pack-to-subscription conversion: 15-25%
- Tier upgrade rate: 5-10%

## Retention Strategies

### Retention Mechanisms

**1. Quality Retention:**
- Award-caliber story quality
- Character consistency
- Emotional engagement
- Therapeutic value

**2. Habit Formation:**
- Regular story creation
- Character library growth
- Family bonding routine
- Bedtime story habit

**3. Platform Stickiness:**
- Multi-platform access
- Cross-device continuity
- Smart home integration
- Voice-first experience

**4. Community Features:**
- Shared libraries
- Organization features
- Family sharing
- Character consistency

### Churn Prevention

**Churn Risk Indicators:**
- Declining usage
- Approaching limits
- Feature frustration
- Quality dissatisfaction

**Intervention Strategies:**
- Re-engagement campaigns
- Upgrade offers
- Feature education
- Quality improvements

**Code References:**
- `COMPLETE_INTEGRATION_STATUS.md:179` - Retention campaigns

## Expansion Revenue Tactics

### Upsell Opportunities

**1. Tier Upgrades:**
- Free → Individual ($12.99/month)
- Individual → Premium ($19.99/month)
- Premium → Family ($24.99/month)

**2. Add-On Sales:**
- Story packs ($4.99-$14.99)
- Premium voices
- Video stories
- Smart Home Pro

**3. Annual Conversion:**
- Monthly → Annual (20% discount)
- Improved cash flow
- Reduced churn

**4. Enterprise Expansion:**
- Individual → Professional
- Professional → Enterprise
- Seat expansion
- Custom features

### Expansion Revenue Targets

**Target Metrics:**
- Expansion revenue: 20-30% of MRR
- Upsell rate: 5-10% of customers
- Add-on attach rate: 15-25%
- Annual conversion: 30-40% of subscribers

## PLG Implementation Status

### Completed Features

**Email & Lifecycle:**
- Welcome emails (SES templates)
- Receipt emails (invoice.paid webhook)
- Invite emails (org members)
- Re-engagement campaigns

**Code References:**
- `COMPLETE_INTEGRATION_STATUS.md:175-179` - Email lifecycle

**Analytics & Insights:**
- Funnel tracking (FunnelAnalyticsService)
- Cohort analysis (CohortAnalysisService)
- A/B testing (ABTestingService)
- Predictive churn (PredictivePLGService)
- NPS feedback (FeedbackService)

**Code References:**
- `COMPLETE_INTEGRATION_STATUS.md:181-186` - Analytics features

**Viral Growth:**
- Referral codes (promo_redemptions table)
- Promotion codes (Stripe integration)
- Shared libraries (organization permissions)
- Invite system (organization members)

**Code References:**
- `COMPLETE_INTEGRATION_STATUS.md:188-192` - Viral features

## Related Documentation

- **Pricing Strategy:** See [Pricing Strategy](./pricing-strategy.md)
- **Unit Economics:** See [Unit Economics](./unit-economics.md)
- **Path to Scale:** See [Path to Scale](./path-to-scale.md)
- **Commerce Agent:** See `packages/commerce-agent/src/CommerceAgent.ts`
