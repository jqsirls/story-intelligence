Status: Draft  
Audience: Internal | Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Comprehensive unit economics documentation

# Unit Economics

## Overview

This document provides detailed unit economics analysis for Storytailor, including cost per story breakdown, revenue per user, customer acquisition cost, lifetime value, and profitability metrics.

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:29-72` - Tier cost configurations
- `docs/finance/finance-costs.md:1-168` - Infrastructure costs
- `docs/finance/finance-metrics.md:1-216` - Revenue metrics

## Cost Per Story Breakdown

### AI Model Costs

**Text Generation (GPT-5.1):**
- **Free Tier**: GPT-5.1-mini
  - Cost: ~$0.01-0.02 per story (estimated)
  - Usage: Story generation, character creation
- **Paid Tiers**: GPT-5.1
  - Cost: ~$0.05-0.10 per story (estimated)
  - Usage: Premium story generation

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:31,45,52,59,66` - Model selection by tier

**Image Generation (gpt-image-1):**
- **Cost**: ~$0.02-0.04 per image (estimated)
- **Free Tier**: 2 images per story = ~$0.04-0.08 per story
- **Paid Tiers**: 5 images per story = ~$0.10-0.20 per story

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:32,46,53,60,67` - Image count by tier
- `packages/content-agent/src/services/ArtGenerationService.ts:504` - Image generation

**Video Generation (Sora-2):**
- **Cost**: ~$0.50-1.00 per video (estimated)
- **Usage**: Premium feature, add-on purchase

**Code References:**
- `lambda-deployments/content-agent/src/services/AnimationService.ts:210-264` - Video generation

### Voice Synthesis Costs

**AWS Polly (Free Tier):**
- **Cost**: ~$0.004 per 1,000 characters
- **Average Story**: ~5,000 characters
- **Cost per Story**: ~$0.02

**ElevenLabs (Paid Tiers):**
- **Cost**: ~$0.18 per 1,000 characters (Creator plan)
- **Average Story**: ~5,000 characters
- **Cost per Story**: ~$0.90

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:33,47,54,61,68` - Audio provider by tier

### Infrastructure Costs

**Lambda Execution:**
- **Cost**: ~$0.0000166667 per GB-second
- **Average Story Generation**: ~30 seconds, 512 MB
- **Cost per Story**: ~$0.00025

**API Gateway:**
- **Cost**: ~$0.0000035 per request
- **Requests per Story**: ~10-20 requests
- **Cost per Story**: ~$0.000035-0.00007

**Supabase:**
- **Cost**: ~$25/month (Pro plan)
- **Per-Story Cost**: Depends on user base
- **At 1,000 stories/month**: ~$0.025 per story

**Redis:**
- **Cost**: ~$10-50/month (usage-based)
- **Per-Story Cost**: Minimal (caching reduces costs)

**Code References:**
- `docs/finance/finance-costs.md:72-87` - Infrastructure costs

### Third-Party Service Costs

**SendGrid (Email):**
- **Cost**: ~$15/month (Essentials plan)
- **Per-Story Cost**: Minimal (transactional emails)

**Stripe (Payment Processing):**
- **Cost**: 2.9% + $0.30 per transaction
- **Per-Story Cost**: N/A (subscription-based)

**Code References:**
- `docs/finance/finance-costs.md:80-86` - External service costs

### Total Cost Per Story

**Free Tier:**
- GPT-5.1-mini: ~$0.01-0.02
- Images (2): ~$0.04-0.08
- Voice (Polly): ~$0.02
- Infrastructure: ~$0.03
- **Total**: ~$0.10-0.15 per story

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:35` - Free tier cost: $0.15

**Paid Tiers:**
- GPT-5.1: ~$0.05-0.10
- Images (5): ~$0.10-0.20
- Voice (ElevenLabs): ~$0.90
- Infrastructure: ~$0.03
- **Total**: ~$1.00-1.20 per story

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:49,56,63,70` - Paid tier cost: $1.00

## Revenue Per User (ARPU)

### ARPU by Tier

**Free Tier:**
- **ARPU**: $0/month
- **Purpose**: Acquisition funnel
- **Value**: User acquisition and engagement

**Individual Tier:**
- **ARPU**: $12.99/month
- **Annual ARPU**: $155.88/year (monthly) or $129.00/year (annual)
- **Target Mix**: 40% of paid subscribers

**Premium Tier:**
- **ARPU**: $19.99/month
- **Annual ARPU**: $239.88/year (monthly) or $199.00/year (annual)
- **Target Mix**: 20% of paid subscribers

**Family Tier:**
- **ARPU**: $24.99/month
- **Annual ARPU**: $299.88/year (monthly) or $249.00/year (annual)
- **Target Mix**: 30% of paid subscribers

**Professional Tier:**
- **ARPU**: $29.99/month
- **Annual ARPU**: $359.88/year
- **Target Mix**: 10% of paid subscribers

**Code References:**
- `PRICING_IMPLEMENTATION_STATUS.md:16-23` - Tier pricing
- `docs/finance/finance-metrics.md:22-25` - ARPU targets

### Blended ARPU

**Calculation:**
- Weighted average of all tiers
- Accounts for tier distribution
- Includes annual discounts

**Target Blended ARPU:**
- $12-15/month per paid subscriber
- Assumes mix: 40% Individual, 30% Family, 20% Premium, 10% Professional

**Code References:**
- `docs/finance/finance-metrics.md:24` - ARPU target

## Customer Acquisition Cost (CAC)

### CAC Calculation

**Formula:**
```
CAC = (Marketing Costs + Sales Costs) / New Customers Acquired
```

**Components:**
- Marketing spend (advertising, content, SEO)
- Sales costs (sales team, commissions)
- Onboarding costs (infrastructure, support)

### CAC Targets

**Target CAC:**
- < $50 per customer
- < $30 for free-to-paid conversion
- < $100 for enterprise customers

**Code References:**
- `docs/finance/finance-metrics.md:31-34` - CAC targets

### CAC Optimization

**Strategies:**
- PLG reduces sales costs
- Free tier reduces marketing costs
- Referral system reduces CAC
- Content marketing (SEO)

## Lifetime Value (LTV)

### LTV Calculation

**Formula:**
```
LTV = ARPU × Average Customer Lifetime (months)
```

**Average Customer Lifetime:**
- Based on churn rate
- Target: 20-24 months
- Calculation: 1 / Monthly Churn Rate

### LTV by Tier

**Individual Tier:**
- ARPU: $12.99/month
- Lifetime: 20 months (5% monthly churn)
- **LTV**: $259.80

**Premium Tier:**
- ARPU: $19.99/month
- Lifetime: 24 months (4% monthly churn)
- **LTV**: $479.76

**Family Tier:**
- ARPU: $24.99/month
- Lifetime: 24 months (4% monthly churn)
- **LTV**: $599.76

**Professional Tier:**
- ARPU: $29.99/month
- Lifetime: 30 months (3% monthly churn)
- **LTV**: $899.70

**Code References:**
- `docs/finance/finance-metrics.md:36-39` - LTV targets

### Blended LTV

**Target:**
- > $200 per customer
- Assumes tier mix and churn rates
- Accounts for annual discounts

**Code References:**
- `docs/finance/finance-metrics.md:38` - LTV target

## LTV:CAC Ratio

### Ratio Targets

**Target Ratio:**
- > 3:1 (healthy)
- 3:1 to 5:1 (good)
- > 5:1 (excellent)

**Calculation:**
- LTV: $200+ (blended)
- CAC: < $50
- **Ratio**: 4:1 to 5:1

**Code References:**
- `docs/finance/finance-metrics.md:41-44` - LTV:CAC targets

### Ratio by Acquisition Channel

**PLG (Free Tier):**
- CAC: ~$10-20 (low marketing cost)
- LTV: $200+
- **Ratio**: 10:1 to 20:1

**Paid Marketing:**
- CAC: ~$50-100
- LTV: $200+
- **Ratio**: 2:1 to 4:1

**Enterprise Sales:**
- CAC: ~$500-1,000
- LTV: $5,000+
- **Ratio**: 5:1 to 10:1

## Payback Period Analysis

### Payback Period Calculation

**Formula:**
```
Payback Period (months) = CAC / ARPU
```

### Payback by Tier

**Individual Tier:**
- CAC: $50
- ARPU: $12.99/month
- **Payback**: 3.8 months

**Premium Tier:**
- CAC: $50
- ARPU: $19.99/month
- **Payback**: 2.5 months

**Family Tier:**
- CAC: $50
- ARPU: $24.99/month
- **Payback**: 2.0 months

**Target Payback:**
- < 3 months (healthy)
- < 6 months (acceptable)

**Code References:**
- `docs/finance/finance-metrics.md:236` - Payback period analysis

## Contribution Margin by Tier

### Contribution Margin Calculation

**Formula:**
```
Contribution Margin = (Revenue - Variable Costs) / Revenue
```

### Margin by Tier

**Free Tier:**
- Revenue: $0
- Variable Cost: $0.15/story
- **Margin**: N/A (acquisition cost)

**Individual Tier:**
- Revenue: $12.99/month
- Variable Cost: ~$1.00/story × 30 stories = $30/month
- **Margin**: Negative (needs optimization or limit adjustment)

**Note:** Individual tier at 30 stories/month may need adjustment. Consider:
- Lower story limit (e.g., 20 stories/month)
- Higher pricing
- Cost optimization

**Premium Tier:**
- Revenue: $19.99/month
- Variable Cost: ~$1.00/story × unlimited = Variable
- **Margin**: Depends on usage (target: 50%+ at reasonable usage)

**Family Tier:**
- Revenue: $24.99/month
- Variable Cost: ~$1.00/story × 20 stories = $20/month
- **Margin**: ~20% (needs optimization)

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:29-72` - Tier costs
- `PRICING_IMPLEMENTATION_STATUS.md:93-101` - Quality tiers

### Margin Optimization

**Strategies:**
1. **Usage Limits**: Adjust story limits to maintain margins
2. **Cost Optimization**: Reduce AI costs through caching, batching
3. **Tier Adjustments**: Optimize tier pricing and limits
4. **Add-On Revenue**: Story packs, premium features

## Break-Even Analysis

### Break-Even Point

**Monthly Infrastructure Costs:**
- Minimum: ~$257/month
- Average: ~$500/month
- Peak: ~$1,012/month

**Break-Even Calculation:**
- At $500/month costs:
  - Family Tier ($9.99): ~50 subscribers
  - Individual Tier ($12.99): ~39 subscribers
  - Premium Tier ($19.99): ~25 subscribers
  - Professional Tier ($29.99): ~17 subscribers
  - Blended ($15/month): ~33 subscribers

**Code References:**
- `docs/docs/FINANCE_PRICING.md:88-92` - Infrastructure costs
- `docs/docs/FINANCE_PRICING.md:122-127` - Break-even analysis

### Path to Profitability

**Timeline:**
- **Month 1-3**: Customer acquisition focus
- **Month 4-6**: Reach break-even point
- **Month 7-12**: Achieve profitability
- **Year 2+**: Scale and optimize

**Targets:**
- Break-even: 33-50 subscribers
- Profitability: 100+ subscribers
- Growth: 500+ subscribers (60%+ margin)

**Code References:**
- `docs/finance/finance-metrics.md:133-137` - Path to profitability

## Cost Optimization Strategies

### AI Cost Optimization

**1. Model Selection:**
- Use GPT-5.1-mini for free tier (lower cost)
- Use GPT-5.1 for paid tiers (premium quality)
- Cache responses when possible

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:31,45` - Model selection

**2. Caching Strategy:**
- Cache story templates
- Cache character descriptions
- Cache common responses
- Redis caching for API responses

**3. Batching:**
- Batch image generation requests
- Batch API calls when possible
- Optimize prompt efficiency

### Infrastructure Optimization

**1. Lambda Optimization:**
- Function optimization (reduce execution time)
- Reserved capacity for predictable workloads
- Cold start reduction

**2. Database Optimization:**
- Query optimization
- Connection pooling
- Indexing strategy
- Caching frequently accessed data

**3. CDN and Caching:**
- CloudFront for static assets
- Redis for API response caching
- Aggressive caching strategy

**Code References:**
- `docs/finance/finance-costs.md:64-91` - Cost optimization opportunities

### Usage-Based Optimization

**1. Rate Limiting:**
- Prevent abuse
- Control costs
- Fair usage policies

**2. Tier Enforcement:**
- Strict limit enforcement
- Quality tier differentiation
- Feature gating

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:139-161` - Tier enforcement

## Unit Economics Summary

### Key Metrics

| Metric | Target | Current Status |
|--------|--------|----------------|
| **Cost per Story (Free)** | $0.15 | ✅ Implemented |
| **Cost per Story (Paid)** | $1.00 | ✅ Implemented |
| **ARPU** | $12-15/month | TBD (tracking) |
| **CAC** | < $50 | TBD (tracking) |
| **LTV** | > $200 | TBD (tracking) |
| **LTV:CAC** | > 3:1 | TBD (tracking) |
| **Payback Period** | < 3 months | TBD (tracking) |
| **Contribution Margin** | 50%+ | Needs optimization |

### Profitability Targets

**At 100 Subscribers:**
- Revenue: ~$1,500/month
- Costs: ~$600/month (infrastructure + variable)
- **Margin**: ~60%

**At 500 Subscribers:**
- Revenue: ~$7,500/month
- Costs: ~$2,250/month
- **Margin**: ~70%

**At 1,000 Subscribers:**
- Revenue: ~$15,000/month
- Costs: ~$3,750/month
- **Margin**: ~75%

**Code References:**
- `docs/docs/FINANCE_PRICING.md:128-131` - Profit margins

## Related Documentation

- **Pricing Strategy:** See [Pricing Strategy](./pricing-strategy.md)
- **Path to Scale:** See [Path to Scale](./path-to-scale.md)
- **Finance Costs:** See `docs/docs/FINANCE_COSTS.md`
- **Finance Metrics:** See `docs/docs/FINANCE_METRICS.md`
