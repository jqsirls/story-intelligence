# Promotional Campaign Types

**Last Updated**: 2025-12-14  
**Audience**: Marketing | Sales | Business Development  
**Status**: ✅ Production Ready

## Overview

This document describes the various types of promotional campaigns used by Storytailor, including seasonal promotions, referral campaigns, educational discounts, launch promotions, and retention campaigns.

## Seasonal Promotions

### Holiday Campaigns

**Black Friday / Cyber Monday**
- **Timing**: Late November
- **Discount**: 30-40% off annual subscriptions
- **Target**: All tiers
- **Objective**: Drive Q4 revenue and annual subscriptions

**Holiday Season**
- **Timing**: December
- **Discount**: 20-30% off gift subscriptions
- **Target**: Family and Premium tiers
- **Objective**: Gift subscriptions and family engagement

**Valentine's Day**
- **Timing**: February
- **Discount**: Special family packages
- **Target**: Family tier
- **Objective**: Family bonding and shared experiences

### Back-to-School Campaigns

**Fall Semester**
- **Timing**: August-September
- **Discount**: Educational institution discounts (20-30% off)
- **Target**: Schools, teachers, educational organizations
- **Objective**: Support educational use cases

**Spring Semester**
- **Timing**: January
- **Discount**: Educational institution discounts (15-25% off)
- **Target**: Schools, teachers, educational organizations
- **Objective**: Support educational use cases

### Summer Promotions

**Summer Reading**
- **Timing**: June-August
- **Discount**: Summer activity packages
- **Target**: Families with children
- **Objective**: Summer engagement and learning

**Summer Activities**
- **Timing**: June-August
- **Discount**: Story pack bundles
- **Target**: All tiers
- **Objective**: Increase story pack sales

## Referral Campaigns

### Refer-a-Friend

**Program Structure:**
- Existing customer refers new customer
- Both receive discount or credit
- Referrer: $10 credit or 1 month free
- Referee: 20% off first subscription

**Implementation:**
- Referral codes generated for existing customers
- Codes shared via email, social media, or direct link
- System tracks referrals and applies discounts

**Code References:**
- `packages/commerce-agent/src/CommerceAgent.ts` - Referral code processing
- `docs/business/affiliates/` - Affiliate program (similar structure)

### Social Sharing Campaigns

**Program Structure:**
- Users share Storytailor on social media
- Receive discount code for sharing
- Discount: 10-15% off next subscription

**Platforms:**
- Facebook
- Twitter/X
- Instagram
- TikTok
- LinkedIn (for professional/educational content)

### Community Building

**Program Structure:**
- Build community through referrals
- Group discounts for communities
- Bulk pricing for organizations

**Use Cases:**
- Parent groups
- Educational communities
- Therapy groups
- Book clubs

## Educational Discounts

### School Discounts

**Eligibility:**
- K-12 schools
- Educational institutions
- Homeschool groups (with verification)

**Discount Structure:**
- **Small Schools** (1-50 students): 20% off
- **Medium Schools** (51-200 students): 25% off
- **Large Schools** (201+ students): 30% off
- **District-Wide**: Custom pricing

**Verification:**
- School email domain verification
- Educational institution documentation
- Enrollment verification

### Teacher Discounts

**Eligibility:**
- Active teachers (K-12, preschool)
- Educational professionals
- Homeschool educators

**Discount Structure:**
- **Individual Teachers**: 25% off Professional tier
- **Teacher Groups**: 30% off for groups of 5+
- **Annual Commitment**: Additional 5% discount

**Verification:**
- School email domain
- Teacher certification
- Employment verification

### Student Discounts

**Eligibility:**
- College students
- Graduate students
- Students in education programs

**Discount Structure:**
- **Individual Students**: 15% off Individual tier
- **Student Groups**: 20% off for groups of 10+

**Verification:**
- Student email domain (.edu)
- Student ID verification
- Enrollment verification

### Non-Profit Discounts

**Eligibility:**
- 501(c)(3) non-profit organizations
- Educational non-profits
- Child-focused organizations

**Discount Structure:**
- **Standard Non-Profits**: 20% off
- **Educational Non-Profits**: 25% off
- **Large Organizations**: Custom pricing

**Verification:**
- 501(c)(3) status verification
- Organization documentation
- Mission alignment review

## Launch Promotions

### Product Launches

**New Feature Launches:**
- Promotions for new features
- Early access for existing customers
- Special pricing for early adopters

**Example:**
- Video generation feature launch
- Early access: 30% off for first 100 users
- Regular pricing after launch

### Platform Launches

**New Platform Integrations:**
- Promotions for new platform support
- Migration incentives
- Platform-specific discounts

**Example:**
- Google Assistant integration launch
- 20% off for users migrating from other platforms
- Platform-specific features highlighted

### Beta Programs

**Early Access Programs:**
- Beta testing opportunities
- Feedback incentives
- Special pricing for beta participants

**Example:**
- New story type beta
- Free access during beta period
- 50% off first year after beta

## Retention Campaigns

### Win-Back Campaigns

**Lapsed Customer Re-engagement:**
- Special offers for lapsed customers
- Win-back discounts
- Re-engagement incentives

**Timing:**
- 30 days after cancellation
- 60 days after cancellation
- 90 days after cancellation

**Discount Structure:**
- **30 Days**: 30% off first month
- **60 Days**: 40% off first 3 months
- **90 Days**: 50% off first 6 months

### Loyalty Rewards

**Long-Term Subscriber Rewards:**
- Rewards for subscription anniversaries
- Loyalty program benefits
- Exclusive features for long-term customers

**Reward Structure:**
- **1 Year**: 1 month free
- **2 Years**: 2 months free + exclusive features
- **3+ Years**: 3 months free + premium features

### Anniversary Offers

**Subscription Anniversary Promotions:**
- Special offers on subscription anniversaries
- Upgrade incentives
- Feature unlocks

**Example:**
- 1-year anniversary: Upgrade to Premium at Family price
- 2-year anniversary: Free story pack
- 3-year anniversary: Custom story creation

## Campaign Planning

### Campaign Calendar

**Annual Campaign Schedule:**
- Q1: New Year, Valentine's Day, Spring educational
- Q2: Spring educational, Summer prep
- Q3: Summer campaigns, Back-to-school
- Q4: Holiday campaigns, Black Friday, Cyber Monday

### Campaign Objectives

**Primary Objectives:**
- Customer acquisition
- Revenue growth
- Customer retention
- Market expansion

**Success Metrics:**
- Conversion rate
- Revenue generated
- Customer acquisition cost (CAC)
- Customer lifetime value (LTV)
- Return on investment (ROI)

## Related Documentation

- **Discount Codes**: See [Discount Codes](./discount-codes.md)
- **Pricing Strategy**: See [Pricing Strategy](../pricing-strategy.md)
- **Marketing**: See [Marketing Documentation](../marketing/README.md)
- **Business Development**: See [Business Development](../bizdev/README.md)

## Production System Information

**Region**: us-east-1  
**Payment Processing**: Stripe (discount code integration)  
**Database**: Supabase PostgreSQL (campaign tracking)

**Source**: `docs/PRODUCTION_STATE_VERIFICATION.md`
