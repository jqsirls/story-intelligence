Status: Draft  
Audience: Internal | Partner  
Last-Updated: 2025-12-14  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Business documentation index

# Business Documentation Index

## Overview

This directory contains comprehensive business documentation for Storytailor, including pricing strategies, Product-Led Growth (PLG) implementation, unit economics, scaling plans, and complete pricing information.

**Last Updated:** 2025-12-14  
**Total Documents:** 14  
**Verification Status:** ✅ All documents include code references

## Documentation Structure

### Pricing Documentation

1. **[Pricing Strategy](./pricing-strategy.md)**
   - Value-based pricing rationale
   - Tier structure and positioning
   - Competitive pricing analysis
   - Pricing psychology
   - Discount and promotion strategies
   - Annual vs monthly pricing
   - Enterprise pricing models
   - International pricing considerations
   - Verification Status: ✅ Verified

2. **[Comprehensive Pricing](./pricing-comprehensive.md)**
   - Complete pricing tables
   - Feature comparison matrix
   - Add-on pricing
   - Usage-based pricing
   - Overage policies
   - Refund and cancellation policies
   - Billing cycle options
   - Payment methods
   - Tax handling
   - Currency support
   - Partner/affiliate pricing
   - Educational discounts
   - Non-profit pricing
   - Verification Status: ✅ Verified

### Growth Documentation

3. **[Product-Led Growth (PLG)](./product-led-growth.md)**
   - PLG strategy overview
   - Free tier as acquisition engine
   - Self-service onboarding flows
   - In-product upgrade prompts
   - Feature gating strategy
   - Usage-based expansion triggers
   - Viral growth mechanisms
   - Activation metrics and funnels
   - Conversion optimization
   - Retention strategies
   - Expansion revenue tactics
   - Verification Status: ✅ Verified

### Economics Documentation

4. **[Unit Economics](./unit-economics.md)**
   - Cost per story breakdown
   - Revenue per user (ARPU) by tier
   - Customer Acquisition Cost (CAC)
   - Lifetime Value (LTV)
   - LTV:CAC ratio targets
   - Payback period analysis
   - Contribution margin by tier
   - Break-even analysis
   - Cost optimization strategies
   - Verification Status: ✅ Verified

### Scaling Documentation

5. **[Path to Scale](./path-to-scale.md)**
   - Growth milestones and targets
   - Infrastructure scaling plan
   - Cost scaling projections
   - Revenue scaling projections
   - Team scaling requirements
   - Technology scaling considerations
   - Market expansion strategy
   - Partnership scaling
   - International expansion plan
   - Risk mitigation at scale
   - Verification Status: ✅ Verified

### Partnership Documentation

6. **[Partnerships Overview](./partnerships/README.md)**
   - Partnership program objectives
   - Partnership types and lifecycle
   - Integration methods and benefits
   - Verification Status: ✅ Verified

7. **[Partnership Types](./partnerships/partnership-types.md)**
   - Technology partnerships
   - Solution partnerships
   - Strategic partnerships
   - Integration methods for each type
   - Verification Status: ✅ Verified

8. **[Partnership Lifecycle](./partnerships/partnership-lifecycle.md)**
   - Discovery and qualification
   - Onboarding process
   - Co-marketing activities
   - Success measurement
   - Renewal and expansion
   - Verification Status: ✅ Verified

### Affiliate Documentation

9. **[Affiliate Program Overview](./affiliates/README.md)**
   - Affiliate program features
   - Commission structure
   - Referral code system
   - Tracking and reporting
   - Verification Status: ✅ Verified

10. **[Affiliate Program Details](./affiliates/affiliate-program.md)**
    - Benefits for affiliates and Storytailor
    - Eligibility requirements
    - Application process
    - Terms and conditions
    - Verification Status: ✅ Verified

11. **[Affiliate Tracking](./affiliates/affiliate-tracking.md)**
    - Database schema
    - Conversion tracking
    - Revenue attribution
    - Reporting dashboard
    - Payout processing
    - Verification Status: ✅ Verified

### Promotions Documentation

12. **[Promotions Overview](./promotions/README.md)**
    - Campaign objectives
    - Campaign types
    - Discount code management
    - Campaign tracking and analytics
    - Verification Status: ✅ Verified

13. **[Campaign Types](./promotions/campaign-types.md)**
    - Seasonal promotions
    - Referral campaigns
    - Educational discounts
    - Launch promotions
    - Retention campaigns
    - Verification Status: ✅ Verified

14. **[Discount Codes](./promotions/discount-codes.md)**
    - Code generation
    - Stripe integration
    - Usage limits and restrictions
    - Analytics and reporting
    - Verification Status: ✅ Verified

## Quick Navigation

### By Audience

**Finance Team:**
- Unit Economics: `docs/business/unit-economics.md`
- Comprehensive Pricing: `docs/business/pricing-comprehensive.md`
- Path to Scale: `docs/business/path-to-scale.md`
- Finance Guide: `docs/roles/finance.md`

**Sales Team:**
- Pricing Strategy: `docs/business/pricing-strategy.md`
- Comprehensive Pricing: `docs/business/pricing-comprehensive.md`
- PLG Strategy: `docs/business/product-led-growth.md`
- Sales Guide: `docs/roles/sales.md`

**Product Team:**
- PLG Strategy: `docs/business/product-led-growth.md`
- Pricing Strategy: `docs/business/pricing-strategy.md`
- Path to Scale: `docs/business/path-to-scale.md`
- Promotions: `docs/business/promotions/README.md`
- Product Guide: `docs/roles/product.md`

**Executives:**
- Unit Economics: `docs/business/unit-economics.md`
- Path to Scale: `docs/business/path-to-scale.md`
- Pricing Strategy: `docs/business/pricing-strategy.md`
- Partnerships: `docs/business/partnerships/README.md`
- Affiliates: `docs/business/affiliates/README.md`

### By Topic

**Pricing:**
- Pricing Strategy: `docs/business/pricing-strategy.md`
- Comprehensive Pricing: `docs/business/pricing-comprehensive.md`
- Finance Guide: `docs/roles/finance.md`

**Growth:**
- Product-Led Growth: `docs/business/product-led-growth.md`
- Path to Scale: `docs/business/path-to-scale.md`
- Partnerships: `docs/business/partnerships/README.md`
- Affiliates: `docs/business/affiliates/README.md`
- Promotions: `docs/business/promotions/README.md`

**Economics:**
- Unit Economics: `docs/business/unit-economics.md`
- Finance Costs: `docs/docs/FINANCE_COSTS.md`
- Finance Metrics: `docs/docs/FINANCE_METRICS.md`

## Related Documentation

- **Economics**: See [Economics Documentation](../economics/README.md) - Strategic financial analysis, ROI, scaling, market economics
- **Finance Guide:** See [Finance Guide](../roles/finance.md)
- **Sales Guide:** See [Sales Guide](../roles/sales.md)
- **Product Guide:** See [Product Guide](../roles/product.md)
- **Partnership Integration:** See [Partner Integration Guide](../integration-guides/partner-onboarding.md)
- **White-Label Solutions:** See [White-Label Guide](../integration-guides/white-label.md)
- **Commerce Agent:** See `packages/commerce-agent/src/CommerceAgent.ts`
- **Tier Quality Service:** See `lambda-deployments/content-agent/src/services/TierQualityService.ts`

## Relationship to Economics Documentation

**Business vs Economics:**
- **Business** (`docs/business/`): Strategy, operations, unit economics, pricing strategy - business operations
- **Economics** (`docs/economics/`): Strategic financial analysis, ROI, scaling, market economics - financial analysis

For deeper financial analysis, ROI calculations, scaling economics, market economics, and investor materials, see the [Economics Documentation](../economics/README.md).
