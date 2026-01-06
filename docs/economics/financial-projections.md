# Financial Projections

**Last Updated**: 2025-12-14  
**Audience**: Finance Team | Executive | Investors  
**Status**: Draft

## Overview

This document provides comprehensive financial projections for Storytailor, including P&L projections, cash flow projections, scenario planning, sensitivity analysis, break-even analysis, path to profitability, capital requirements, and funding milestones.

**Code References:**
- `docs/finance/finance-costs.md` - Cost basis and infrastructure costs
- `docs/finance/finance-metrics.md` - Revenue metrics and projections
- `docs/business/path-to-scale.md` - Scaling milestones and projections
- `docs/business/unit-economics.md` - Break-even analysis

## P&L Projections

### Year 1 (2026) - Base Case

**Revenue:**
- Q1: $5,000 MRR → $15,000 quarterly
- Q2: $10,000 MRR → $30,000 quarterly
- Q3: $15,000 MRR → $45,000 quarterly
- Q4: $20,000 MRR → $60,000 quarterly
- **Annual Revenue: $150,000**

**Costs:**
- Infrastructure: $6,000/year ($500/month average)
- AI Services: $30,000/year (variable, scales with usage)
- Team: $300,000/year (5-10 people)
- Marketing: $50,000/year
- Operations: $20,000/year
- **Total Costs: $406,000/year**

**Net Income: -$256,000** (investment phase)

**Code References:**
- `docs/finance/finance-costs.md:72-108` - Infrastructure costs
- `docs/business/path-to-scale.md:22-47` - Year 1 milestones

### Year 2 (2027) - Base Case

**Revenue:**
- Q1: $50,000 MRR → $150,000 quarterly
- Q2: $75,000 MRR → $225,000 quarterly
- Q3: $100,000 MRR → $300,000 quarterly
- Q4: $125,000 MRR → $375,000 quarterly
- **Annual Revenue: $1,050,000**

**Costs:**
- Infrastructure: $24,000/year ($2,000/month)
- AI Services: $210,000/year (variable, scales with usage)
- Team: $600,000/year (10-20 people)
- Marketing: $150,000/year
- Operations: $50,000/year
- **Total Costs: $1,034,000/year**

**Net Income: $16,000** (breakeven/profitability)

### Year 3 (2028) - Base Case

**Revenue:**
- Q1: $200,000 MRR → $600,000 quarterly
- Q2: $300,000 MRR → $900,000 quarterly
- Q3: $400,000 MRR → $1,200,000 quarterly
- Q4: $500,000 MRR → $1,500,000 quarterly
- **Annual Revenue: $4,200,000**

**Costs:**
- Infrastructure: $60,000/year ($5,000/month)
- AI Services: $840,000/year (variable)
- Team: $1,200,000/year (20-30 people)
- Marketing: $400,000/year
- Operations: $150,000/year
- **Total Costs: $2,650,000/year**

**Net Income: $1,550,000** (37% margin)

## Cash Flow Projections

### Year 1 Cash Flow

**Operating Activities:**
- Revenue: $150,000
- Operating Expenses: -$406,000
- **Operating Cash Flow: -$256,000**

**Investing Activities:**
- Infrastructure: -$10,000
- **Investing Cash Flow: -$10,000**

**Financing Activities:**
- Funding: $500,000 (assumed)
- **Financing Cash Flow: +$500,000**

**Net Cash Flow: +$234,000**
**Ending Cash: $234,000**

### Year 2 Cash Flow

**Operating Activities:**
- Revenue: $1,050,000
- Operating Expenses: -$1,034,000
- **Operating Cash Flow: +$16,000**

**Investing Activities:**
- Infrastructure: -$20,000
- **Investing Cash Flow: -$20,000**

**Financing Activities:**
- Additional Funding: $200,000 (if needed)
- **Financing Cash Flow: +$200,000**

**Net Cash Flow: +$196,000**
**Ending Cash: $430,000**

### Year 3 Cash Flow

**Operating Activities:**
- Revenue: $4,200,000
- Operating Expenses: -$2,650,000
- **Operating Cash Flow: +$1,550,000**

**Investing Activities:**
- Infrastructure: -$50,000
- **Investing Cash Flow: -$50,000**

**Financing Activities:**
- No additional funding needed
- **Financing Cash Flow: $0**

**Net Cash Flow: +$1,500,000**
**Ending Cash: $1,930,000**

## Scenario Planning

### Base Case Scenario

**Assumptions:**
- Moderate customer acquisition (5-10% monthly growth)
- Standard churn rates (5% monthly)
- Tier mix as projected (40% Individual, 30% Family, 20% Premium, 10% Professional)
- Cost optimization at scale

**Results:**
- Year 1: -$256,000 (investment phase)
- Year 2: $16,000 (breakeven)
- Year 3: $1,550,000 (profitable)

**Code References:**
- `docs/business/path-to-scale.md:22-47` - Growth milestones

### Optimistic Scenario

**Assumptions:**
- High customer acquisition (10-15% monthly growth)
- Low churn rates (3% monthly)
- Higher tier mix (more Premium/Professional)
- Efficient cost scaling

**Results:**
- Year 1: -$200,000 (lower loss)
- Year 2: $200,000 (profitable earlier)
- Year 3: $2,500,000 (higher profitability)

### Pessimistic Scenario

**Assumptions:**
- Low customer acquisition (2-5% monthly growth)
- High churn rates (7% monthly)
- Lower tier mix (more Individual, less Premium)
- Higher cost scaling

**Results:**
- Year 1: -$350,000 (higher loss)
- Year 2: -$100,000 (still unprofitable)
- Year 3: $500,000 (lower profitability)

## Key Assumptions and Drivers

### Revenue Drivers

**Primary Drivers:**
- Customer acquisition rate (new customers/month)
- Churn rate (customer retention)
- ARPU (average revenue per user)
- Expansion revenue (upgrades, add-ons)

**Sensitivity:**
- 10% increase in acquisition = 10% revenue increase
- 10% decrease in churn = 5-10% revenue increase
- 10% increase in ARPU = 10% revenue increase

### Cost Drivers

**Primary Drivers:**
- Infrastructure costs (scales with usage)
- AI service costs (scales with stories generated)
- Team costs (scales with headcount)
- Marketing costs (scales with acquisition)

**Sensitivity:**
- 10% increase in usage = 5-10% cost increase
- 10% increase in headcount = 10% cost increase
- 10% increase in marketing = variable (depends on efficiency)

## Sensitivity Analysis

### Revenue Sensitivity

**Customer Acquisition Impact:**
- +20% acquisition: +$30,000 Year 1 revenue
- -20% acquisition: -$30,000 Year 1 revenue

**Churn Impact:**
- -20% churn (better retention): +$15,000 Year 1 revenue
- +20% churn (worse retention): -$15,000 Year 1 revenue

**ARPU Impact:**
- +10% ARPU: +$15,000 Year 1 revenue
- -10% ARPU: -$15,000 Year 1 revenue

### Cost Sensitivity

**Infrastructure Cost Impact:**
- +20% infrastructure: +$1,200 Year 1 costs
- -20% infrastructure: -$1,200 Year 1 costs

**AI Service Cost Impact:**
- +20% AI costs: +$6,000 Year 1 costs
- -20% AI costs: -$6,000 Year 1 costs

**Team Cost Impact:**
- +20% team costs: +$60,000 Year 1 costs
- -20% team costs: -$60,000 Year 1 costs

## Break-Even Analysis

### Break-Even Point

**Monthly Break-Even:**
- Fixed Costs: $30,000/month (infrastructure, team, operations)
- Variable Costs: $1.00/story × stories generated
- Revenue per Customer: $15/month (blended ARPU)
- Contribution Margin: $15 - variable costs per customer

**Break-Even Customers:**
- At $500/month infrastructure: ~33 customers (at $15 ARPU)
- At $1,000/month infrastructure: ~67 customers
- At $2,000/month infrastructure: ~133 customers

**Code References:**
- `docs/business/unit-economics.md:368-404` - Break-even analysis

### Path to Profitability Timeline

**Month 1-3:**
- Focus: Customer acquisition
- Revenue: $5,000-10,000/month
- Status: Investment phase

**Month 4-6:**
- Focus: Conversion optimization
- Revenue: $10,000-15,000/month
- Status: Approaching break-even

**Month 7-12:**
- Focus: Retention and expansion
- Revenue: $15,000-25,000/month
- Status: Break-even to profitability

**Code References:**
- `docs/business/path-to-scale.md:22-47` - Growth milestones

## Capital Requirements

### Year 1 Capital Needs

**Total Capital Required: $500,000**

**Use of Funds:**
- Team (60%): $300,000
- Marketing (20%): $100,000
- Infrastructure (10%): $50,000
- Operations (10%): $50,000

**Runway:** 12-18 months at current burn rate

### Year 2 Capital Needs

**Total Capital Required: $200,000 (optional)**

**Use of Funds:**
- Team expansion (50%): $100,000
- Marketing scale (30%): $60,000
- Infrastructure (10%): $20,000
- Operations (10%): $20,000

**Runway:** May not be needed if Year 1 targets met

## Funding Milestones

### Seed Round (Completed/Assumed)

**Amount:** $500,000
**Use:** Year 1 operations
**Milestones:**
- Product launch
- Initial customer acquisition
- Market validation

### Series A (Year 2)

**Target Amount:** $2,000,000
**Use:** Scale operations, team expansion
**Milestones:**
- $1M ARR run rate
- 1,000+ paid customers
- Product-market fit validation
- Path to profitability

### Series B (Year 3)

**Target Amount:** $5,000,000
**Use:** Market expansion, international
**Milestones:**
- $4M ARR run rate
- 5,000+ paid customers
- Profitable operations
- Market leadership

## Unit Economics at Scale

### At 100 Customers

**Revenue:** $1,500/month ($15 ARPU)
**Costs:** $600/month (infrastructure + variable)
**Margin:** 60%

**Code References:**
- `docs/business/unit-economics.md:481-494` - Profitability targets

### At 500 Customers

**Revenue:** $7,500/month ($15 ARPU)
**Costs:** $2,250/month (infrastructure + variable)
**Margin:** 70%

### At 1,000 Customers

**Revenue:** $15,000/month ($15 ARPU)
**Costs:** $3,750/month (infrastructure + variable)
**Margin:** 75%

### At 10,000 Customers

**Revenue:** $150,000/month ($15 ARPU)
**Costs:** $37,500/month (infrastructure + variable, optimized)
**Margin:** 75-80%

**Code References:**
- `docs/business/path-to-scale.md:51-64` - Year 2+ milestones
- `docs/economics/scaling-economics.md` - Scaling efficiency

## Related Documentation

- **Finance Costs**: See [Finance Costs](../finance/finance-costs.md) - Cost basis
- **Finance Metrics**: See [Finance Metrics](../finance/finance-metrics.md) - Revenue metrics
- **Path to Scale**: See [Business Path to Scale](../business/path-to-scale.md) - Scaling projections
- **Unit Economics**: See [Business Unit Economics](../business/unit-economics.md) - Break-even analysis
- **Scaling Economics**: See [Scaling Economics](./scaling-economics.md) - Cost curves and efficiency
- **Investor Materials**: See [Investor Materials](./investor-materials.md) - Executive summary
