# Pipeline Veto Rules

**Status**: SACRED - Prevents Noise  
**Version**: 1.0  
**Date**: December 25, 2025  
**Enforcement**: Confidence thresholds, veto reasons logged in `pipeline_executions`

---

## Purpose

The Intelligence Curator has **authority to say "No"** to pipeline execution.

**Silence is a first-class output.** Not every event deserves an email. Not every pattern deserves a notification. Knowing when to be quiet is how you earn trust at scale.

---

## Core Principle: Veto Authority

The Intelligence Curator is NOT just a router. It's a curator with judgment.

**Authority to veto includes**:
- No email (insufficient signal)
- No reward (low confidence detection)
- No notification (noise, not insight)
- No therapeutic suggestion (pattern unclear)
- **Silence is valid, not failure**

---

## Veto Reasons (Enumerated)

```typescript
export type VetoReason = 
  | 'INSUFFICIENT_SIGNAL'      // Not enough data points
  | 'LOW_CONFIDENCE'           // Below confidence threshold
  | 'NOISE_REDUCTION'          // True but not actionable
  | 'FREQUENCY_CAP'            // Too many emails recently
  | 'QUIET_HOURS'              // User preference/timing
  | 'CONSOLIDATION_PENDING'    // Will batch with digest
  | 'SLA_MISSED'               // Too late, don't send
  | 'KILL_SWITCH_ACTIVE';      // Pipeline disabled via SSM
```

**Every veto is logged**: `pipeline_executions.veto_reason`

---

## Confidence Thresholds (Enforced)

### By Pipeline Type

```typescript
const CONFIDENCE_THRESHOLDS = {
  // Transactional (always send)
  story_complete: 1.0,
  payment_events: 1.0,
  account_security: 1.0,
  
  // Insights (medium bar)
  daily_digest: 0.6,           // 2+ events minimum
  weekly_insights: 0.7,        // 3+ activities minimum
  consumption_report: 0.7,
  
  // Emotional (high bar)
  emotion_alert: 0.7,          // Clear pattern needed
  early_intervention: 0.8,     // 3+ day pattern
  therapeutic_suggestion: 0.9, // 5+ day pattern, VERY confident
  crisis_alert: 0.95,          // Cannot afford false positives
  
  // Recommendations (variable)
  story_recommendation: 0.7,
  character_suggestion: 0.6,
  timing_optimization: 0.7
};
```

**Below threshold = automatic veto.**

### Minimum Signal Count

Not just confidence - also need sufficient data points:

```typescript
const MIN_SIGNAL_COUNT = {
  daily_digest: 2,              // 2+ events today
  weekly_insights: 3,           // 3+ activities this week
  therapeutic_suggestion: 5,    // 5+ day pattern
  crisis_alert: 1,              // Immediate (but very high confidence)
  story_recommendation: 3,      // 3+ data points
  referral_notification: 1      // Actual subscription (not just signup)
};
```

**Example**:
```typescript
// Scenario: User has 1 event today, wants daily digest
shouldExecutePipeline('daily_digest', { eventsToday: 1, confidence: 0.8 })
→ { execute: false, vetoReason: 'INSUFFICIENT_SIGNAL' }

// Scenario: 3 days of sadness detected at 0.6 confidence
shouldExecutePipeline('therapeutic_suggestion', { dayCount: 3, confidence: 0.6 })
→ { execute: false, vetoReason: 'LOW_CONFIDENCE' }  // Needs 0.9
→ { execute: false, vetoReason: 'INSUFFICIENT_SIGNAL' }  // Needs 5+ days
```

---

## Frequency Caps (Code-Enforced)

### By Email Category

```typescript
const FREQUENCY_CAPS = {
  insights: { 
    daily: 1,    // Max 1 insight email per day
    weekly: 1,   // Max 1 weekly report
    monthly: 1   // Max 1 monthly report
  },
  marketing: { 
    daily: 0,    // No daily marketing
    weekly: 2,   // Max 2 marketing emails/week
    monthly: 4   // Max 4 marketing emails/month
  },
  reminders: { 
    daily: 1,    // Max 1 reminder per day
    weekly: 3    // Max 3 reminders per week
  }
};
```

**Rule**: If cap reached, veto with reason `FREQUENCY_CAP`.

**Exception**: Crisis alerts override frequency caps.

---

## Quiet Hours Respect

### User Preferences

```typescript
interface QuietHours {
  start: string; // "21:00"
  end: string;   // "07:00"
  timezone: string; // "America/New_York"
}
```

**Rule**: Non-urgent emails queued until morning.

**Crisis overrides**: Crisis alerts sent immediately regardless of time.

**Implementation**:
```typescript
async function respectQuietHours(userId: string, pipelineType: string): Promise<boolean> {
  // Get user preferences
  const prefs = await getEmailPreferences(userId);
  
  // Crisis always sends
  if (pipelineType === 'crisis_alert') {
    return true;
  }
  
  // Check if within quiet hours
  if (isWithinQuietHours(prefs.quietHours, prefs.timezone)) {
    logger.info('Veto: Quiet hours active', {
      userId,
      pipelineType,
      vetoReason: 'QUIET_HOURS'
    });
    
    // Queue for morning instead
    await queueForMorning(userId, pipelineType);
    
    return false;
  }
  
  return true;
}
```

---

## Emotional SLA (Time-Sensitive Vetos)

### Principle: "Late empathy reads as noise"

**Crisis alert sent 6 hours late is worse than not sent at all.**

**SLA Targets**:
```typescript
const EMOTIONAL_SLA_MINUTES = {
  crisis_alert: 5,              // Must notify within 5 minutes
  early_intervention: 120,      // Within 2 hours
  story_failure: 60,            // Within 1 hour
  asset_timeout: 30,            // Within 30 minutes
  therapeutic_suggestion: 1440, // 24 hours (can batch)
  positive_celebration: 1440    // 24 hours (not urgent)
};
```

**Enforcement**:
```typescript
async function checkEmotionalSLA(
  pipelineType: string,
  eventTimestamp: Date
): Promise<boolean> {
  const sla = EMOTIONAL_SLA_MINUTES[pipelineType];
  if (!sla) return true; // No SLA for this pipeline
  
  const elapsed = (Date.now() - eventTimestamp.getTime()) / 60000; // minutes
  
  if (elapsed > sla) {
    logger.warn('Emotional SLA missed, suppressing', {
      pipelineType,
      elapsed,
      sla,
      vetoReason: 'SLA_MISSED'
    });
    
    return false; // Veto: too late
  }
  
  return true;
}
```

**If you're too late, stay quiet.** Don't compound lateness with awkward delayed concern.

---

## Consolidation Rules

### Batch Minor Events

**Don't send**:
- 5 separate emails for 5 QR scans
- 3 emails for 3 character uses
- Multiple asset completion emails per story

**Instead**:
- 1 email: "Your stories were shared 5 times this week"
- 1 email: "Character starred in 3 stories"
- 1 email per story: "Story complete with all assets"

**Implementation**:
```typescript
async function shouldConsolidate(event: PipelineEvent): Promise<boolean> {
  // Minor events consolidate into daily digest
  const MINOR_EVENTS = ['qr_scan', 'character_usage', 'library_view'];
  
  if (MINOR_EVENTS.includes(event.type)) {
    logger.info('Minor event, batching to daily digest', {
      eventType: event.type,
      vetoReason: 'CONSOLIDATION_PENDING'
    });
    
    await queueForDailyDigest(event);
    return true; // Veto immediate send
  }
  
  return false;
}
```

---

## Kill Switches (Operational Veto)

### SSM-Based Instant Disable

**Every pipeline type has a kill switch**:
```bash
/storytailor-production/pipelines/daily-digest/enabled (true/false)
/storytailor-production/pipelines/weekly-insights/enabled
/storytailor-production/pipelines/therapeutic-suggestions/enabled
/storytailor-production/pipelines/referral-notifications/enabled
```

**Check before EVERY execution**:
```typescript
async function checkKillSwitch(pipelineType: string): Promise<boolean> {
  const enabled = await getSSMParam(`/pipelines/${pipelineType}/enabled`);
  
  if (enabled === 'false') {
    logger.info('Pipeline disabled via kill switch', {
      pipelineType,
      vetoReason: 'KILL_SWITCH_ACTIVE'
    });
    return true; // Veto: kill switch active
  }
  
  return false;
}
```

**Use case**: Ship confidently, pull plug instantly if users are upset.

---

## Veto Decision Flow

```typescript
interface CurationDecision {
  execute: boolean;
  confidence: number;
  reasoning: string;
  vetoReason?: VetoReason;
}

async function curate(event: PipelineEvent): Promise<CurationDecision> {
  // 1. Kill switch (instant disable)
  if (await checkKillSwitch(event.type)) {
    return {
      execute: false,
      confidence: 0,
      reasoning: 'Pipeline disabled via SSM kill switch',
      vetoReason: 'KILL_SWITCH_ACTIVE'
    };
  }
  
  // 2. Emotional SLA (time-sensitive)
  if (!await checkEmotionalSLA(event)) {
    return {
      execute: false,
      confidence: 0,
      reasoning: 'Emotional SLA missed - late empathy is noise',
      vetoReason: 'SLA_MISSED'
    };
  }
  
  // 3. Signal count (enough data?)
  if (event.signalCount < MIN_SIGNAL_COUNT[event.type]) {
    return {
      execute: false,
      confidence: event.signalCount / MIN_SIGNAL_COUNT[event.type],
      reasoning: `Insufficient signal: ${event.signalCount} < ${MIN_SIGNAL_COUNT[event.type]}`,
      vetoReason: 'INSUFFICIENT_SIGNAL'
    };
  }
  
  // 4. Confidence threshold
  if (event.confidence < CONFIDENCE_THRESHOLDS[event.type]) {
    return {
      execute: false,
      confidence: event.confidence,
      reasoning: `Low confidence: ${event.confidence} < ${CONFIDENCE_THRESHOLDS[event.type]}`,
      vetoReason: 'LOW_CONFIDENCE'
    };
  }
  
  // 5. Frequency caps
  if (!await checkFrequencyCaps(event)) {
    return {
      execute: false,
      confidence: event.confidence,
      reasoning: 'Frequency cap exceeded',
      vetoReason: 'FREQUENCY_CAP'
    };
  }
  
  // 6. User preferences
  if (!await checkUserPreferences(event)) {
    return {
      execute: false,
      confidence: event.confidence,
      reasoning: 'User preferences or quiet hours prevent sending',
      vetoReason: 'QUIET_HOURS'
    };
  }
  
  // All checks passed - execute
  return {
    execute: true,
    confidence: event.confidence,
    reasoning: `Approved: ${event.signalCount} signals, ${event.confidence} confidence`
  };
}
```

---

## Learning from Vetoes

### Track Veto Patterns

```sql
-- Monthly analysis
SELECT 
  pipeline_type,
  veto_reason,
  COUNT(*) as veto_count,
  AVG(confidence_score) as avg_confidence
FROM pipeline_executions
WHERE vetoed = TRUE
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY pipeline_type, veto_reason
ORDER BY veto_count DESC;
```

**Insights from vetoes**:
- If `INSUFFICIENT_SIGNAL` common → Users not engaging enough (product issue?)
- If `LOW_CONFIDENCE` common → Algorithm needs tuning
- If `FREQUENCY_CAP` common → Too aggressive sending
- If `SLA_MISSED` common → Processing too slow

### Auto-Adjustment

```typescript
// If SLA violations spike, alert ops team
async function monitorSLAViolations(): Promise<void> {
  const violations = await db
    .from('pipeline_executions')
    .select()
    .eq('vetoed', true)
    .eq('veto_reason', 'SLA_MISSED')
    .gte('created_at', oneHourAgo);
  
  if (violations.length > 5) {
    await alertOpsTeam('Emotional SLA violations spiking', {
      count: violations.length,
      pipelines: violations.map(v => v.pipeline_type)
    });
  }
}
```

---

## How to Earn Trust

**Trust is earned by**:
1. **Selectivity**: Send only when signal is strong
2. **Timeliness**: Send quickly or not at all
3. **Respect**: Honor user preferences
4. **Learning**: Adjust based on vetoes
5. **Silence**: Know when not to send

**Example of good curation**:
```
Monday: Crisis detected at 0.97 confidence → Send immediately
Tuesday: 2 minor events → Batch to daily digest
Wednesday: Therapeutic pattern at 0.65 confidence → Veto (need 0.9)
Thursday: 5 events but user opened 0 recent emails → Reduce frequency
Friday: Strong insight at 0.92 confidence → Send
```

**Example of poor curation** (what we prevent):
```
Monday: Every tiny event → Immediate email (fatigue)
Tuesday: Low confidence suggestions → Users ignore (noise)
Wednesday: 3am email during quiet hours → Annoyance
Thursday: 5th email this week → Unsubscribe spike
Friday: Crisis alert 6 hours late → Looks uncaring
```

---

## Veto Override Conditions

### When Veto Can Be Overridden

**Manual override allowed for**:
- Admin/ops team testing
- Parent explicitly requests report
- Legal/compliance requirement
- Emergency situation

**Never override for**:
- Product metrics pressure
- "But we built this feature" (sunk cost)
- Revenue targets
- Engagement goals

**Code enforcement**:
```typescript
async function executeWithOverride(
  event: PipelineEvent,
  overrideReason: string,
  approvedBy: string
): Promise<void> {
  // Log override
  await logOverride({
    pipelineType: event.type,
    systemDecision: 'VETO',
    humanOverride: 'EXECUTE',
    overrideReason,
    approvedBy
  });
  
  // Execute despite veto
  await executePipeline(event);
}
```

---

## Sacred Status

This document is marked SACRED in `AGENTS.md`:
- Veto authority cannot be bypassed for product goals
- Thresholds cannot be lowered without approval
- Learning from vetoes is mandatory
- Monthly veto pattern review required

**"Send more emails" is not a valid success metric if users hate them.**

---

## Monitoring Dashboard

### Veto Rate by Pipeline

```
Pipeline                 | Executions | Vetoes | Veto Rate | Top Reason
------------------------|------------|--------|-----------|------------------
daily_digest            | 1,234      | 456    | 37%       | INSUFFICIENT_SIGNAL
therapeutic_suggestion  | 89         | 67     | 75%       | LOW_CONFIDENCE
weekly_insights         | 456        | 123    | 27%       | FREQUENCY_CAP
story_recommendation    | 2,345      | 234    | 10%       | NOISE_REDUCTION
```

**Healthy veto rates**:
- Insight pipelines: 30-50% (we're selective)
- Therapeutic: 70-80% (very high bar)
- Transactional: <5% (almost always send)
- Crisis: <2% (high confidence)

**Unhealthy veto rates**:
- Insight pipelines: <10% (sending too much noise)
- Therapeutic: <50% (not selective enough)
- Crisis: >10% (algorithm needs tuning)

---

## Implementation Example

```typescript
// Intelligence Curator curate() method
async curate(event: PipelineEvent): Promise<CurationDecision> {
  const config = PIPELINE_CONFIGS[event.type];
  
  // 1. Kill switch
  if (await checkKillSwitch(event.type)) {
    return veto('KILL_SWITCH_ACTIVE', 'Pipeline disabled');
  }
  
  // 2. Emotional SLA
  if (config.emotionalSLA && !await checkSLA(event, config.emotionalSLA)) {
    return veto('SLA_MISSED', 'Late empathy reads as noise');
  }
  
  // 3. Signal count
  const signalCount = event.data.signalCount || 1;
  if (signalCount < config.minSignalCount) {
    return veto('INSUFFICIENT_SIGNAL', 
      `${signalCount} < ${config.minSignalCount}`);
  }
  
  // 4. Confidence
  const confidence = event.data.confidence || 0;
  if (confidence < config.minConfidence) {
    return veto('LOW_CONFIDENCE',
      `${confidence} < ${config.minConfidence}`);
  }
  
  // 5. Frequency caps
  if (!await checkFrequencyCaps(event.userId, event.type, config)) {
    return veto('FREQUENCY_CAP', 'User email limit reached');
  }
  
  // 6. User preferences
  if (!await checkUserPreferences(event.userId, event.type)) {
    return veto('QUIET_HOURS', 'Respecting user preferences');
  }
  
  // Approved - execute
  return {
    execute: true,
    confidence,
    reasoning: `Approved: ${signalCount} signals, ${confidence} confidence`
  };
}

function veto(reason: VetoReason, explanation: string): CurationDecision {
  return {
    execute: false,
    confidence: 0,
    reasoning: explanation,
    vetoReason: reason
  };
}
```

---

## Success Metric

**Good curation is measured by**:
- Email open rate >40% (industry: 20%)
- Unsubscribe rate <0.2% (industry: 0.5%)
- User feedback: "helpful, not annoying"
- Support tickets NOT about email volume

**Bad metrics (what we prevent)**:
- High email volume, low open rates
- Unsubscribe spike
- Support complaints: "Too many emails"
- Users marking as spam

**The Curator's job: Earn trust by knowing when to be quiet.**

