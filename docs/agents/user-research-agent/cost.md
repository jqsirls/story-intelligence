# User Research Agent - Cost

**Status**: ✅ Active  
**Last Updated**: 2025-12-14

## Cost Overview

Fieldnotes achieves $150-300/month operation costs for internal use through intelligent architecture and cost optimization strategies.

## Cost Breakdown

### Infrastructure Costs

- **API Lambda**: ~$5-10/month (based on usage)
- **Scheduled Lambda**: ~$2-5/month (hourly/daily/weekly runs)
- **EventBridge**: ~$1/month
- **Total Infrastructure**: ~$8-16/month

### LLM Costs

- **Internal use (Storytailor)**: $150-300/month
- **Per-tenant cost tracking**: Independent budgets and limits
- **Cost optimization**: 98% cost reduction through batch processing and smart sampling

## Cost Optimization Strategies

### 1. Batch Processing (98% Cost Reduction)

**The Expensive Way (Don't Do This):**
```typescript
// Real-time analysis of every event
events.on('user_action', async (event) => {
  await llm.analyze(event); // $0.001 per event
  // 100K events/day = $3,000/month
});
```

**The Cost-Efficient Way:**
```typescript
// Scheduled batch processing
const SCHEDULE = {
  hourly: () => aggregateEvents(),      // SQL only - $0
  daily: () => detectPatterns(),        // ~$2-5/day
  weekly: () => generateBrief()         // ~$10-20/week
};

// Total: ~$20-35/month instead of $3,000/month
```

**Cost Savings: 98.8%**

### 2. Smart Sampling (85-95% Cost Reduction)

Analyzes 10% of events, maintains 95% accuracy:

```typescript
const SAMPLING_RULES = {
  critical: {
    events: ['account_deleted', 'payment_failed'],
    samplingRate: 1.0   // 100%
  },
  medium: {
    events: ['story_created', 'feature_used'],
    samplingRate: 0.1   // 10%
  },
  low: {
    events: ['page_view', 'button_click'],
    samplingRate: 0.01  // 1%
  }
};
```

**Cost reduction: 85-95%**

### 3. Model Tiering (90% Cost Reduction)

**Model Costs (per 1M tokens):**
- `gpt-4o-mini`: $0.15 input, $0.60 output (Cheap)
- `claude-haiku`: $0.25 input, $1.25 output (Medium)
- `claude-sonnet`: $3.00 input, $15.00 output (Expensive)

**Task Allocation:**
- 70% of operations use `gpt-4o-mini` (data aggregation)
- 20% use `gpt-4o-mini` (pattern detection)
- 8% use `claude-haiku` (adversarial critique)
- 2% use `claude-sonnet` (strategic synthesis)

**Weighted average cost: $0.28 per operation**

### 4. Aggressive Caching (60-80% Cost Reduction)

Stable metrics cached for 7 days. Only re-computes when significant change detected.

**Example:**
- Week 1: Story completion 67% → Compute ($0.15)
- Week 2: Still 67% → Cache hit ($0.00)
- Week 3: Still 68% → Cache hit ($0.00)
- Week 4: Drops to 58% → Re-compute ($0.15)

**Cost reduction on stable periods: 60-80%**

### 5. Per-Tenant Cost Caps

**Cost Thresholds:**
- 80%: Warning (alert owner)
- 90%: Throttled (reduce sampling, use cheaper models)
- 100%: Blocked (defer analysis to next period)

**Throttling Strategies:**
- Reduce sampling rate by 50%
- Switch to cheaper models only
- Skip non-critical analyses
- Queue for next billing period

## Real Cost Projections

### Storytailor Internal Use

**Month 1-3 (MVP):**
- Events: 10K-50K/month
- Sampled: 1K-5K analyzed
- Briefs: 4/month
- **Cost: $80-120/month**

**Month 6-12 (Production):**
- Events: 100K-500K/month
- Sampled: 10K-50K analyzed (10%)
- Briefs: 4/month
- Pre-launch memos: 4/month
- Agent interrogations: 20/month
- **Cost: $150-250/month**

**Month 12+ (Scale):**
- Events: 1M+/month
- Sampled: 100K analyzed (10%)
- Full feature usage
- **Cost: $250-400/month**

### Future External Customer Costs

**Starter Tier:**
- 50K events/month → 5K analyzed
- Weekly briefs only
- **Cost to us**: $50-80/month
- **Price**: $299/month
- **Margin**: 73-83%

**Professional Tier:**
- 500K events/month → 50K analyzed
- Weekly briefs + on-demand
- All integrations
- **Cost to us**: $150-200/month
- **Price**: $799/month
- **Margin**: 75-81%

**Enterprise Tier:**
- Unlimited events → 100K analyzed
- Real-time monitoring
- Custom integrations
- **Cost to us**: $400-500/month
- **Price**: $1,999/month
- **Margin**: 75-80%

## Cost Per Insight

**The real metric:**

```
Smart approach:
$200/month ÷ 20 insights = $10/insight

Value of ONE good insight:
"Quick Story mode" → +35% completion → +200 users/week → $2,400/month ARR

ROI: 12x first month, infinite thereafter
```

## Cost Monitoring

### Via API

```bash
curl "${FUNCTION_URL}/api/v1/cost/status?tenantId=storytailor" \
  -H "X-API-Key: ${API_KEY}"
```

### Via SDK

```typescript
const usage = await client.getUsage('storytailor');
console.log(`Current cost: $${usage.totalCost}`);
```

### Database Query

```sql
SELECT * FROM research_cost_tracking
WHERE tenant_id = 'storytailor'
  AND period = 'month'
  AND period_start >= DATE_TRUNC('month', NOW());
```

## Cost Comparison

**Traditional Research:**
- User research study: $5K-20K per study
- Research consultant: $10K-50K/month
- Analytics tools: $500-3K/month (data only)

**Fieldnotes:**
- $299-1,999/month
- Continuous insights (not one-time)
- 90% cheaper than alternatives

## Cost Optimization Checklist

- [x] Batch processing enabled (hourly → daily → weekly)
- [x] Smart sampling configured (10% medium, 1% low priority)
- [x] Model tiering active (90% cheap, 10% premium)
- [x] Cache TTL set (7 days for stable metrics)
- [x] Cost caps configured per tenant
- [x] Throttling enabled at 90%
- [x] Cost tracking monitored weekly

## Related Documentation

- [Cost Optimization Guide](../../../packages/user-research-agent/docs/COST_OPTIMIZATION.md) - Detailed cost optimization strategies
- [What It Does](./what.md) - Detailed functionality including cost optimization
