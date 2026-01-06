# Revenue Models

**Last Updated**: 2025-12-14  
**Audience**: Finance Team | Executive | Investors | Product  
**Status**: Draft

## Overview

This document provides comprehensive analysis of Storytailor's revenue models, including subscription revenue, one-time purchases, hybrid models, expansion revenue, churn impact, revenue recognition, revenue mix targets, and revenue forecasting methodology.

**Code References:**
- `docs/business/pricing-comprehensive.md` - Complete pricing tables and models
- `docs/business/pricing-strategy.md` - Pricing rationale and strategy
- `docs/business/product-led-growth.md` - Expansion revenue tactics

## Subscription Revenue Model

### Monthly Subscriptions

**Tier Structure:**
- Individual: $12.99/month
- Premium: $19.99/month
- Family: $24.99/month
- Professional: $29.99/month

**Revenue Characteristics:**
- Recurring revenue (predictable)
- Monthly billing cycle
- Higher ARPU (no annual discount)
- More frequent billing (cash flow)

**Revenue Recognition:**
- Recognized monthly as service is delivered
- Deferred revenue for prepaid months

**Code References:**
- `docs/business/pricing-comprehensive.md:22-33` - Subscription tiers

### Annual Subscriptions

**Tier Structure:**
- Individual: $129.00/year (save $26.88)
- Premium: $199.00/year (save $40.88)
- Family: $249.00/year (save $50.88)

**Revenue Characteristics:**
- Upfront payment (better cash flow)
- Annual discount (customer incentive)
- Lower effective ARPU (discount applied)
- Reduced churn risk (annual commitment)

**Revenue Recognition:**
- Recognized monthly over 12 months
- Deferred revenue for unearned months

**Target Mix:** 40-60% annual subscriptions (balance cash flow and ARPU)

### Multi-Year Subscriptions

**Future Consideration:**
- 2-year subscriptions (additional discount)
- 3-year subscriptions (maximum discount)
- Enterprise contracts (custom terms)

**Revenue Characteristics:**
- Significant upfront payment
- Maximum discount (customer incentive)
- Long-term commitment (low churn)
- Lower effective ARPU (discount applied)

## One-Time Purchase Model

### Story Packs

**Pricing:**
- 5 Story Pack: $4.99
- 10 Story Pack: $8.99
- 20 Story Pack: $14.99

**Revenue Characteristics:**
- Immediate revenue recognition
- No recurring commitment
- Lower price per story (volume discount)
- Customer acquisition tool (low barrier to entry)

**Usage:**
- Credits never expire
- Can be used across billing periods
- Purchasable by free and paid users

**Revenue Recognition:**
- Recognized when story pack is purchased
- Deferred revenue for unused credits (if applicable)

**Code References:**
- `docs/business/pricing-comprehensive.md:38-48` - Story pack pricing

### Add-On Purchases

**Types:**
- Video generation add-ons
- Live avatar add-ons
- Premium features (one-time unlock)

**Revenue Characteristics:**
- One-time revenue
- Higher margin (no recurring cost)
- Upsell opportunity
- Feature expansion

## Hybrid Model

### Subscription + Add-Ons

**Model Structure:**
- Base subscription (recurring)
- Add-on purchases (one-time or recurring)
- Usage-based add-ons (pay-per-use)

**Revenue Mix:**
- 70-80% subscription revenue (base)
- 20-30% add-on revenue (expansion)

**Benefits:**
- Predictable base revenue
- Expansion revenue opportunities
- Customer flexibility
- Higher total revenue per customer

### Subscription + Story Packs

**Model Structure:**
- Base subscription (monthly stories included)
- Story packs (additional stories beyond limit)

**Revenue Mix:**
- 80-90% subscription revenue
- 10-20% story pack revenue

**Use Cases:**
- Customers exceeding monthly limits
- One-time story needs
- Gift purchases

## Expansion Revenue

### Upgrades

**Upgrade Paths:**
- Free → Paid (acquisition)
- Individual → Premium (feature upgrade)
- Premium → Family (family expansion)
- Any tier → Professional (professional use)

**Upgrade Revenue:**
- Additional ARPU from upgrade
- Higher LTV (upgraded customers)
- Reduced churn (higher commitment)

**Target:** 10-15% of customers upgrade annually

**Code References:**
- `docs/business/product-led-growth.md` - Expansion revenue tactics

### Add-Ons

**Types:**
- Feature add-ons (recurring)
- Usage add-ons (pay-per-use)
- Service add-ons (premium support)

**Add-On Revenue:**
- Incremental revenue per customer
- Higher margins (add-on features)
- Customer retention (more invested)

**Target:** 20-30% of customers purchase add-ons

### Usage-Based Expansion

**Model:**
- Base subscription (included usage)
- Overage charges (beyond included usage)
- Pay-per-story (beyond limits)

**Usage-Based Revenue:**
- Revenue scales with usage
- Higher engagement = higher revenue
- Fair pricing (pay for what you use)

**Target:** 5-10% of revenue from usage-based

## Churn Impact on Revenue

### Monthly Churn Rate

**Definition:** Percentage of customers who cancel each month

**Target:** < 5% monthly churn

**Impact on Revenue:**
- 5% monthly churn = 60% annual churn
- Revenue loss = Churn Rate × ARPU × Customers
- Example: 5% churn × $15 ARPU × 1,000 customers = $750/month lost

**Churn Reduction Strategies:**
- Annual subscriptions (lower churn)
- Engagement features (higher retention)
- Customer success (proactive support)
- Value demonstration (ROI communication)

**Code References:**
- `docs/business/unit-economics.md:214-216` - Churn rate targets

### Annual Churn Rate

**Definition:** Percentage of customers who cancel over 12 months

**Target:** < 40% annual churn (for monthly subscriptions)

**Impact:**
- Higher annual churn = lower LTV
- Revenue predictability reduced
- Customer acquisition pressure increased

### Revenue Churn

**Definition:** Percentage of revenue lost to churn and downgrades

**Components:**
- Customer churn (lost customers)
- Downgrades (reduced ARPU)
- Cancellations (lost revenue)

**Target:** < 3% monthly revenue churn

**Impact:**
- Revenue churn < customer churn (good - upgrades offset)
- Revenue churn > customer churn (bad - downgrades)

### Net Revenue Retention (NRR)

**Definition:** Revenue retention including expansion revenue

**Formula:**
```
NRR = (Starting Revenue + Expansion Revenue - Churned Revenue) / Starting Revenue × 100%
```

**Target:** > 100% (expansion exceeds churn)

**Components:**
- Starting revenue (base)
- Expansion revenue (upgrades, add-ons)
- Churned revenue (cancellations, downgrades)

**Storytailor Target:** 110-120% NRR (expansion-driven growth)

## Revenue Recognition

### Subscription Revenue

**Recognition Method:** Monthly recognition over subscription period

**Monthly Subscriptions:**
- Recognized monthly as service is delivered
- Deferred revenue for prepaid months (if any)

**Annual Subscriptions:**
- Recognized monthly over 12 months
- Deferred revenue for unearned months
- Example: $129 annual = $10.75/month recognition

### One-Time Revenue

**Recognition Method:** Immediate recognition upon purchase

**Story Packs:**
- Recognized when purchased
- No deferral (credits are prepaid service)

**Add-Ons:**
- Recognized when purchased
- If recurring add-on, recognized monthly

### Usage-Based Revenue

**Recognition Method:** Recognized when usage occurs

**Overage Charges:**
- Recognized when story is generated (usage)
- Billed at end of billing period

## Revenue Mix Targets

### Subscription vs One-Time

**Target Mix:**
- Subscription: 80-90% of revenue
- One-Time: 10-20% of revenue

**Rationale:**
- Predictable recurring revenue (subscriptions)
- Customer acquisition and flexibility (one-time)

### Monthly vs Annual

**Target Mix:**
- Monthly: 40-60% of subscriptions
- Annual: 40-60% of subscriptions

**Rationale:**
- Balance cash flow (monthly) and churn reduction (annual)
- Annual discount incentive

### Tier Distribution

**Target Mix:**
- Individual: 40% of paid subscribers
- Premium: 20% of paid subscribers
- Family: 30% of paid subscribers
- Professional: 10% of paid subscribers

**Blended ARPU:** $12-15/month

**Code References:**
- `docs/business/unit-economics.md:158-170` - Blended ARPU calculation

## Revenue per Customer Lifecycle Stage

### Acquisition Stage (Month 1)

**Revenue:**
- First month subscription
- Potential story pack purchase
- **Average: $15-20**

### Growth Stage (Month 2-6)

**Revenue:**
- Recurring subscription
- Potential upgrades
- Add-on purchases
- **Average: $15-25/month**

### Maturity Stage (Month 7-24)

**Revenue:**
- Stable subscription
- Occasional add-ons
- Referral generation
- **Average: $15-20/month**

### Expansion Stage (Month 12+)

**Revenue:**
- Subscription renewal
- Upgrade opportunities
- Add-on expansion
- **Average: $20-30/month**

## Revenue Forecasting Methodology

### Bottom-Up Forecasting

**Components:**
- Customer acquisition (new customers/month)
- Churn rate (lost customers/month)
- ARPU by tier (revenue per customer)
- Expansion revenue (upgrades, add-ons)

**Formula:**
```
Monthly Revenue = (Starting Customers - Churned Customers + New Customers) × ARPU + Expansion Revenue
```

### Top-Down Forecasting

**Components:**
- Market size (TAM/SAM/SOM)
- Market penetration targets
- Market share assumptions
- Revenue per market share point

**Formula:**
```
Revenue = Market Size × Penetration Rate × Market Share × ARPU
```

### Scenario Planning

**Scenarios:**
- Base case (most likely)
- Optimistic case (best case)
- Pessimistic case (worst case)

**Key Variables:**
- Customer acquisition rate
- Churn rate
- ARPU
- Expansion revenue

**Code References:**
- `docs/business/path-to-scale.md:22-47` - Growth milestones
- `docs/finance/finance-metrics.md:219-243` - Revenue scenarios

## Revenue Model Evolution

### Current State (2025)

**Model:**
- Subscription-based (primary)
- Story packs (secondary)
- Add-ons (emerging)

**Revenue Mix:**
- 85% subscription
- 10% story packs
- 5% add-ons

### Future State (2026-2027)

**Potential Additions:**
- Usage-based pricing (pay-per-story)
- Enterprise contracts (custom pricing)
- White-label licensing (B2B revenue)
- API access (developer revenue)
- Marketplace (third-party content)

**Revenue Mix Target:**
- 70% subscription
- 10% story packs
- 10% add-ons
- 10% new revenue streams

## Related Documentation

- **Pricing Strategy**: See [Business Pricing Strategy](../business/pricing-strategy.md) - Pricing rationale
- **Comprehensive Pricing**: See [Business Comprehensive Pricing](../business/pricing-comprehensive.md) - Complete pricing tables
- **Product-Led Growth**: See [Business PLG](../business/product-led-growth.md) - Expansion revenue tactics
- **Financial Projections**: See [Financial Projections](./financial-projections.md) - Revenue projections
- **Unit Economics**: See [Business Unit Economics](../business/unit-economics.md) - ARPU and LTV
