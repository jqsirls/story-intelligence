# Fieldnotes Cost Optimization Guide

How Fieldnotes achieves $150-300/month operation costs through intelligent architecture.

## Cost Architecture Overview

**Target costs:**
- Internal use (Storytailor): $150-300/month
- External customer (Starter): $50-80/month (73-83% margin)
- External customer (Professional): $150-200/month (75-81% margin)
- External customer (Enterprise): $400-500/month (75-80% margin)

**Cost breakdown:**
- LLM API calls: 95% of costs
- Storage: 3% of costs
- Compute: 2% of costs

## Strategy 1: Batch Processing (98% Cost Reduction)

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

**Implementation:** See `BatchProcessor.ts`

### Cost Savings: 98.8%

## Strategy 2: Smart Sampling (85-95% Cost Reduction)

**Don't analyze everything. Sample intelligently:**

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

**Adaptive sampling:** Increase rate when anomalies detected.

**Implementation:** See `SmartSampler.ts`

**Result:**
- Analyze 5-15% of events instead of 100%
- Maintain 95% statistical accuracy
- Cost reduction: 85-95%

## Strategy 3: Model Tiering (90% Cost Reduction)

**Use cheapest model that works:**

```typescript
const MODEL_COSTS_PER_1M_TOKENS = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },    // Cheap
  'claude-haiku': { input: 0.25, output: 1.25 },   // Medium
  'claude-sonnet': { input: 3.00, output: 15.00 }  // Expensive
};

const TASK_ALLOCATION = {
  dataAggregation: 'gpt-4o-mini',      // 70% of operations
  patternDetection: 'gpt-4o-mini',     // 20% of operations
  adversarialCritique: 'claude-haiku',  // 8% of operations
  strategicSynthesis: 'claude-sonnet'   // 2% of operations
};
```

**Weighted average cost:**
- 90% of operations use cheap models
- 10% use premium models
- Average cost per operation: $0.28

**Implementation:** See `ModelOrchestrator.ts`

## Strategy 4: Aggressive Caching (60-80% Cost Reduction)

**Don't re-compute stable metrics:**

```typescript
// Check cache first
const cached = await getCachedInsight(metricKey, currentValue);

if (cached && percentChange < 10%) {
  return cached.insight; // $0 cost
}

// Only compute if significant change
const newInsight = await computeInsight(); // $0.05-0.20 cost
await cacheInsight(metricKey, newInsight); // Cache for 7 days
```

**Example:**
- Week 1: Story completion 67% → Compute ($0.15)
- Week 2: Still 67% → Cache hit ($0.00)
- Week 3: Still 68% → Cache hit ($0.00)
- Week 4: Drops to 58% → Re-compute ($0.15)

**Cost reduction on stable periods: 60-80%**

**Implementation:** See `BatchProcessor.ts`

## Strategy 5: Incremental Analysis (Constant Cost)

**Analyze deltas, not entire history:**

```typescript
// Bad: Re-analyze everything weekly
const allTimeData = await getAllEvents(); // Growing dataset
const insights = await llm.analyze(allTimeData);
// Week 1: $50, Week 10: $500, Week 50: $2,500

// Good: Only analyze new data + trends
const thisWeekData = await getThisWeekEvents(); // Fixed size
const trends = await getCachedTrends(); // Summary
const insights = await llm.analyze({ thisWeekData, trends });
// Week 1: $50, Week 10: $50, Week 50: $50 (constant)
```

**Cost growth: Zero**

## Strategy 6: Per-Tenant Cost Caps

**Prevent runaway costs:**

```typescript
const COST_THRESHOLDS = {
  80: 'warning',    // Alert owner
  90: 'throttled',  // Reduce sampling, use cheaper models
  100: 'blocked'    // Defer analysis to next period
};
```

**Throttling strategies:**
- Reduce sampling rate by 50%
- Switch to cheaper models only
- Skip non-critical analyses
- Queue for next billing period

**Implementation:** See `CostController.ts`

## Real Cost Projections

### Storytailor Internal Use

**Month 1-3 (MVP):**
- Events: 10K-50K/month
- Sampled: 1K-5K analyzed
- Briefs: 4/month
- Cost: $80-120/month

**Month 6-12 (Production):**
- Events: 100K-500K/month  
- Sampled: 10K-50K analyzed (10%)
- Briefs: 4/month
- Pre-launch memos: 4/month
- Agent interrogations: 20/month
- Cost: $150-250/month

**Month 12+ (Scale):**
- Events: 1M+/month
- Sampled: 100K analyzed (10%)
- Full feature usage
- Cost: $250-400/month

### External Customer Costs

**Starter Tier:**
- 50K events/month → 5K analyzed
- Weekly briefs only
- **Cost to us:** $50-80/month
- **Price:** $299/month
- **Margin:** 73-83%

**Professional Tier:**
- 500K events/month → 50K analyzed
- Weekly briefs + on-demand
- All integrations
- **Cost to us:** $150-200/month
- **Price:** $799/month
- **Margin:** 75-81%

**Enterprise Tier:**
- Unlimited events → 100K analyzed
- Real-time monitoring
- Custom integrations
- **Cost to us:** $400-500/month
- **Price:** $1,999/month
- **Margin:** 75-80%

## Cost Per Insight

**The real metric:**

```
Smart approach:
$200/month ÷ 20 insights = $10/insight

Value of ONE good insight:
"Quick Story mode" → +35% completion → +200 users/week → $2,400/month ARR

ROI: 12x first month, infinite thereafter
```

## Monitoring Costs

**Track costs in real-time:**

```bash
# Via API
curl http://localhost:3000/api/v1/tenants/storytailor/usage \
  -H "X-API-Key: your-key"

# Via SDK
const usage = await client.getUsage('storytailor');
console.log(`Current cost: $${usage.totalCost}`);
```

**Database query:**
```sql
SELECT * FROM research_cost_tracking
WHERE tenant_id = 'storytailor'
  AND period = 'month'
  AND period_start >= DATE_TRUNC('month', NOW());
```

## Cost Optimization Checklist

- [ ] Batch processing enabled (hourly → daily → weekly)
- [ ] Smart sampling configured (10% medium, 1% low priority)
- [ ] Model tiering active (90% cheap, 10% premium)
- [ ] Cache TTL set (7 days for stable metrics)
- [ ] Cost caps configured per tenant
- [ ] Throttling enabled at 90%
- [ ] Cost tracking monitored weekly
- [ ] Old cache entries cleaned up (cron job)

## Emergency Cost Controls

If costs spike unexpectedly:

1. **Immediate:** Check `research_cost_tracking` table
2. **Identify culprit:** Which tenant? Which operation?
3. **Throttle:** Reduce sampling rates automatically
4. **Alert:** Notify ops team
5. **Investigate:** Review recent changes

**Automated controls trigger at 2x historical average.**

## Cost Comparison

**Traditional Research:**
- User research study: $5K-20K per study
- Research consultant: $10K-50K/month
- Analytics tools: $500-3K/month (data only)

**Fieldnotes:**
- $299-1,999/month
- Continuous insights (not one-time)
- 90% cheaper than alternatives

## What NOT to Do

**Cost Anti-Patterns:**

1. ❌ Real-time analysis (100x multiplier)
2. ❌ Using GPT-4 for everything (10x vs GPT-4o-mini)
3. ❌ Analyzing raw events instead of aggregates (50x volume)
4. ❌ Daily reports instead of weekly (7x frequency)
5. ❌ No caching (3x redundant analysis)
6. ❌ Full conversation replays ($1-5 per conversation)

**Avoid these and stay under budget.**

## Future Optimizations

**When needed:**
- Fine-tuned models for specific tasks (50% cost reduction)
- Vector embeddings for similarity (cheaper than full LLM)
- On-device analysis for privacy-sensitive data (zero API costs)
- Streaming responses (pay only for tokens used)

**Not needed yet. Current architecture is cost-efficient enough.**
