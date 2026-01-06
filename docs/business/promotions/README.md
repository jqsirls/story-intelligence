# Promotional Campaigns Documentation

**Last Updated**: 2025-12-14  
**Audience**: Marketing | Sales | Business Development  
**Status**: ✅ Production Ready

## Overview

This directory contains comprehensive promotional campaigns documentation including campaign types, discount code management, campaign tracking and analytics.

## Documentation Files

1. **[Campaign Types](./campaign-types.md)** - Seasonal promotions, referral campaigns, educational discounts, launch promotions, retention campaigns
2. **[Discount Codes](./discount-codes.md)** - Code generation and management, Stripe integration, usage limits and restrictions, analytics and reporting

## Promotional Campaign Overview

Storytailor uses promotional campaigns to drive customer acquisition, retention, and engagement. Campaigns include discount codes, seasonal promotions, referral programs, and educational discounts.

### Campaign Objectives

- **Acquisition**: Attract new customers with promotional offers
- **Retention**: Re-engage existing customers with special offers
- **Upsell**: Encourage upgrades to higher tiers
- **Seasonal**: Capitalize on seasonal trends and holidays
- **Educational**: Support educational institutions and organizations

## Campaign Types

### Seasonal Promotions

- **Holiday Campaigns**: Black Friday, Cyber Monday, holiday season
- **Back-to-School**: Educational discounts for fall semester
- **Summer Promotions**: Summer reading and activity campaigns
- **New Year**: New year resolution and goal-setting campaigns

### Referral Campaigns

- **Refer-a-Friend**: Existing customers refer new customers
- **Social Sharing**: Share on social media for discounts
- **Community Building**: Build community through referrals

### Educational Discounts

- **School Discounts**: Discounts for schools and educational institutions
- **Teacher Discounts**: Special pricing for educators
- **Student Discounts**: Discounts for students (with verification)
- **Non-Profit Discounts**: Discounts for non-profit organizations

### Launch Promotions

- **Product Launches**: Promotions for new features or products
- **Platform Launches**: Promotions for new platform integrations
- **Beta Programs**: Early access and beta testing promotions

### Retention Campaigns

- **Win-Back**: Re-engage lapsed customers
- **Loyalty Rewards**: Rewards for long-term subscribers
- **Anniversary Offers**: Special offers on subscription anniversaries

## Discount Code Management

### Code Types

- **Percentage Discount**: X% off (e.g., 20% off)
- **Fixed Amount Discount**: $X off (e.g., $5 off)
- **Free Trial**: Extended free trial period
- **Tier Upgrade**: Discount on tier upgrades

### Code Generation

- **Manual Generation**: Marketing team creates codes manually
- **Bulk Generation**: Generate multiple codes for campaigns
- **Automatic Generation**: System generates codes for specific events

### Code Validation

- **Expiration Dates**: Codes expire after specified date
- **Usage Limits**: Maximum number of uses per code
- **User Limits**: Maximum uses per user
- **Tier Restrictions**: Codes apply to specific tiers only

## Campaign Tracking and Analytics

### Conversion Tracking

- **Code Usage**: Track how many times codes are used
- **Conversion Rate**: Track conversion from code usage to subscription
- **Revenue Attribution**: Attribute revenue to specific campaigns
- **ROI Calculation**: Calculate return on investment for campaigns

### Performance Metrics

- **Code Redemption Rate**: Percentage of codes used
- **Conversion Rate**: Percentage of code users who subscribe
- **Average Order Value**: Average revenue per code redemption
- **Customer Lifetime Value**: LTV of customers acquired via campaigns

## Related Documentation

- **Campaign Types**: See [Campaign Types](./campaign-types.md)
- **Discount Codes**: See [Discount Codes](./discount-codes.md)
- **Pricing Strategy**: See [Pricing Strategy](../pricing-strategy.md)
- **Marketing**: See [Marketing Documentation](../marketing/README.md)

## Production System Information

**Region**: us-east-1  
**Payment Processing**: Stripe (discount codes)  
**Database**: Supabase PostgreSQL (discount code tracking)

**Source**: `docs/PRODUCTION_STATE_VERIFICATION.md`
