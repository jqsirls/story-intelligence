# Automatic Pipeline System - Architecture Overview

**Audience**: Engineering Team  
**Version**: 1.0  
**Date**: December 25, 2025

---

## System Purpose

The Automatic Pipeline System connects Storytailor's 29 production agents to event-driven workflows that deliver insights, notifications, and rewards to users across 17 user types.

**Core Innovation**: Intelligence Curator with **veto authority** - knows when NOT to send (silence as feature).

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     EVENT SOURCES                            │
├─────────────────────────────────────────────────────────────┤
│  • Supabase DB Triggers                                     │
│  • Stripe Webhooks                                          │
│  • EventBridge Scheduled Jobs                               │
│  • REST API Calls                                           │
│  • Agent Actions (EmotionAgent, ContentAgent, etc.)         │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│              INTELLIGENCE CURATOR                            │
│              (Veto Authority)                                │
├─────────────────────────────────────────────────────────────┤
│  1. Check Kill Switch (SSM)                                 │
│  2. Validate Emotional SLA                                  │
│  3. Check Signal Count                                      │
│  4. Validate Confidence                                     │
│  5. Check Frequency Caps                                    │
│  6. Respect User Preferences                                │
│                                                             │
│  Decision: EXECUTE or VETO                                  │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼ (if EXECUTE)
┌─────────────────────────────────────────────────────────────┐
│              USER TYPE ROUTER                                │
│              (Personalization)                               │
├─────────────────────────────────────────────────────────────┤
│  • Detect user type (17 types)                             │
│  • Route to variant (parent/teacher/therapist)             │
│  • Select value proposition                                │
│  • Determine frequency                                     │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│              SPECIALIZED SERVICES                            │
├─────────────────────────────────────────────────────────────┤
│  • DailyDigestService                                       │
│  • WeeklyInsightsService                                    │
│  • ConsumptionAnalyticsService                             │
│  • ReferralRewardService                                    │
│  • StoryEffectivenessService                               │
│  • CrisisAlertService                                       │
│  • TherapeuticAutoAssignService                            │
│  • PowerUserDetectionService                               │
│  • OrganizationHealthService                               │
│  • ... (18 total)                                          │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│              DELIVERY CHANNELS                               │
├─────────────────────────────────────────────────────────────┤
│  • Email (SendGrid/SES)                                     │
│  • Push Notifications                                       │
│  • In-app Notifications                                     │
│  • Database (audit logs)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Intelligence Curator

**Location**: `packages/universal-agent/src/services/IntelligenceCurator.ts`

**Responsibility**: Central decision-maker with veto authority.

**Key Methods**:
```typescript
async curate(event: PipelineEvent): Promise<CurationDecision>
async routeByUserType(event: PipelineEvent): Promise<string>
async generateComparativeInsight(userId, storyId, context): Promise<ComparativeInsight>
async executePipeline(event: PipelineEvent, decision: CurationDecision): Promise<void>
```

**Decision Flow**:
1. Check kill switch (SSM)
2. Validate emotional SLA (time-sensitive)
3. Check signal count (minimum data points)
4. Validate confidence (threshold per pipeline)
5. Check frequency caps (daily/weekly limits)
6. Respect user preferences (quiet hours, opt-outs)

**Veto Reasons**:
- `INSUFFICIENT_SIGNAL` - Not enough data
- `LOW_CONFIDENCE` - Below threshold
- `NOISE_REDUCTION` - True but not actionable
- `FREQUENCY_CAP` - Too many emails
- `QUIET_HOURS` - User preference
- `CONSOLIDATION_PENDING` - Will batch
- `SLA_MISSED` - Too late
- `KILL_SWITCH_ACTIVE` - Disabled via SSM

### 2. User Type Router

**Location**: `packages/universal-agent/src/services/UserTypeRouter.ts`

**Responsibility**: Personalize flows based on 17 user types.

**User Types**:
- Family: parent, guardian, grandparent, aunt_uncle, older_sibling, foster_caregiver
- Educators: teacher, librarian, afterschool_leader
- Medical: therapist, child_life_specialist, medical_professional
- Other: childcare_provider, nanny, coach_mentor, enthusiast, child, other

**Key Methods**:
```typescript
async getUserTypeContext(userId: string): Promise<UserTypeContext>
async routeEmailVariant(userId: string, baseEmailType: string): Promise<string>
async getPersonalizedContent(userId: string, contentType: string): Promise<PersonalizedContent>
```

**Personalization Dimensions**:
- Email variant (parent vs teacher vs therapist)
- Content focus (emotional vs educational vs clinical)
- Language (warm vs professional vs clinical)
- CTA type (create_story vs batch_create vs pathway_continue)
- Value proposition (magical moments vs classroom engagement vs therapeutic support)
- Recommended frequency (daily vs weekly vs monthly)

### 3. Consumption Analytics Service

**Location**: `packages/universal-agent/src/services/ConsumptionAnalyticsService.ts`

**Responsibility**: Track post-facto story consumption (REST-exclusive feature).

**Key Methods**:
```typescript
async trackEvent(event: ConsumptionEvent): Promise<void>
async getMetrics(storyId: string, userId: string): Promise<ConsumptionMetrics>
async analyzeEngagementPattern(storyId, userId): Promise<EngagementPattern>
async generateDailyDigest(userId: string, date: Date): Promise<ConsumptionDigest>
async getCreatorConsumerAttribution(storyId): Promise<Attribution>
```

**Metrics Tracked**:
- Read count, total duration, completion rate
- Replay count and patterns
- Engagement score (0-100)
- Pause patterns
- Interaction events
- First/last read timestamps

**Engagement Patterns**:
- `perfect` - Completed in one sitting
- `high_replay` - 3+ replays (strong interest)
- `fast_completion` - Quick, engaged listener
- `abandoned` - <50% completion
- `partial_completion` - Default

### 4. Referral Reward Service

**Location**: `packages/universal-agent/src/services/ReferralRewardService.ts`

**Responsibility**: PLG referral system with Stripe integration.

**Reward Tiers**:
- 1 referral: $10 credit
- 3 referrals: +$5 bonus
- 5 referrals: +$10 bonus (1 month free)
- 10 referrals: 50% off forever (Stripe coupon)
- Teacher referrals: $50 credit

**Key Methods**:
```typescript
async processReferralConversion(conversion: ReferralConversion): Promise<void>
async issueCredit(params: IssueCreditParams): Promise<ReferralReward>
async checkMilestones(userId: string): Promise<void>
async getAvailableCredits(userId: string): Promise<number>
async rewardStoryShare(userId: string, storyId: string): Promise<void>
```

**Stripe Integration**:
```typescript
// Create negative balance transaction (credit)
await stripe.customers.createBalanceTransaction(customerId, {
  amount: -1000, // -$10
  currency: 'usd',
  description: 'Referral reward'
});

// Credits auto-apply to next invoice (Stripe automatic)
```

### 5. Story Effectiveness Service

**Location**: `packages/universal-agent/src/services/StoryEffectivenessService.ts`

**Responsibility**: Comparative scoring (relative to user's baseline, not absolute).

**Key Principle**: "Better or worse than before?"

**Scoring**:
```typescript
// Database function calculates comparative score
effectivenessScore = (engagement + completion + replays*10) / 3

// But displays:
"5 minutes faster than usual"
"3x more replays than other stories"
"Better than your last 3 bedtime stories"

// NEVER displays:
"Score: 82/100"
```

**When to Score**:
- After 3 reads, OR
- After 7 days

**Impact Insights** (sent if meaningful improvements):
- Engagement delta >5%
- Duration delta <-60s (bedtime only)
- Replay delta >0

---

## Data Flow Examples

### Example 1: Story Complete → Email

```
1. Asset generation completes
   ↓
2. DB trigger: notify_story_complete() → creates notification
   ↓
3. Intelligence Curator receives event
   ↓
4. Curator checks:
   - Kill switch: enabled ✅
   - SLA: N/A (transactional)
   - Signal: 1 (sufficient for transactional) ✅
   - Confidence: 1.0 ✅
   - Frequency: Transactional (no cap) ✅
   - Preferences: Transactional (cannot disable) ✅
   ↓
5. Decision: EXECUTE (confidence: 1.0)
   ↓
6. User Type Router:
   - Get user type: "parent"
   - Route to variant: "story-complete-parent"
   - Value prop: "Create magical moments"
   ↓
7. Email sent with user-type-specific messaging
   ↓
8. Log in email_delivery_log
```

### Example 2: Daily Digest → Vetoed

```
1. EventBridge triggers daily_digest job (8pm UTC)
   ↓
2. Daily Digest Service generates digest for user
   - Stories consumed: 1
   - Total duration: 5 minutes
   ↓
3. Intelligence Curator receives event
   ↓
4. Curator checks:
   - Kill switch: enabled ✅
   - SLA: N/A
   - Signal: 1 (need 2+) ❌
   ↓
5. Decision: VETO (reason: INSUFFICIENT_SIGNAL)
   ↓
6. Email NOT sent
   ↓
7. Veto logged in pipeline_executions
```

### Example 3: Referral Conversion → Reward

```
1. Stripe webhook: customer.subscription.created
   ↓
2. CommerceAgent processes webhook
   ↓
3. Checks referral_tracking for this user
   ↓
4. Found referral! Call ReferralRewardService
   ↓
5. Issue $10 credit:
   - Create Stripe balance transaction
   - Insert into reward_ledger
   - Update referral_tracking (status: converted, reward_status: issued)
   ↓
6. Check milestones:
   - Referrer has 10 total referrals? Apply 50% off coupon
   ↓
7. Intelligence Curator receives "referral_reward" event
   ↓
8. Curator approves (transactional, confidence 1.0)
   ↓
9. Email sent to referrer: "$10 credit earned"
```

---

## Database Schema

### Tables by Purpose

**Referral & Rewards**:
- `reward_ledger` - Credit tracking with Stripe integration
- `referral_tracking` - Referral conversions (enhanced with reward columns)

**Consumption & Effectiveness**:
- `consumption_metrics` - Read/play tracking with engagement scoring
- `story_effectiveness` - Comparative scores relative to baseline

**Learning & Adaptation**:
- `recommendation_outcomes` - Track if users follow suggestions
- `human_overrides` - Log when humans correct system

**Email Management**:
- `email_preferences` - User control over communications
- `email_delivery_log` - Frequency cap tracking

**Orchestration**:
- `pipeline_executions` - Curator decisions with veto reasons

### Key Relationships

```sql
-- User → Consumption → Effectiveness
users → consumption_metrics → story_effectiveness
        (per story)          (comparative score)

-- User → Referrals → Rewards
users → referral_tracking → reward_ledger
        (track conversions)  (credits issued)

-- User → Recommendations → Outcomes
users → recommendation_outcomes (learn from mistakes)

-- User → Preferences → Delivery Log
users → email_preferences → email_delivery_log
        (control)            (frequency caps)
```

---

## Service Dependencies

```
IntelligenceCurator
├── EmailService
├── UserTypeRouter
│   └── SupabaseClient
├── ConsumptionAnalyticsService
├── StoryEffectivenessService
└── Various specialized services

DailyDigestService
├── EmailService
├── ConsumptionAnalyticsService
├── IntelligenceCurator
└── UserTypeRouter

WeeklyInsightsService
├── EmailService
├── IntelligenceCurator
└── UserTypeRouter

ReferralRewardService
├── SupabaseClient
├── Stripe SDK
└── Logger
```

---

## Configuration Management

### SSM Parameters

**Kill Switches** (per pipeline):
```
/storytailor-production/pipelines/{pipeline-type}/enabled
```

**Email Templates**:
```
/storytailor-production/email/templates/{template-name}
```

**Confidence Thresholds** (optional overrides):
```
/storytailor-production/pipelines/therapeutic/confidence-threshold
```

### Environment Variables

**Required**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `SENDGRID_API_KEY`
- `AWS_REGION`

**Optional**:
- `LOG_LEVEL` (default: info)
- `EMAIL_FROM` (default: noreply@storytailor.com)
- `APP_URL` (default: https://storytailor.com)

---

## Pipeline Types

### Transactional (Always Send)

- Story/character complete
- Payment events
- Account security
- Crisis alerts

**Characteristics**:
- Confidence: 1.0 (always)
- Frequency cap: None
- Veto rate: <5%
- User cannot disable

### Insights (Selective)

- Daily digest
- Weekly reports
- Story effectiveness
- Consumption reports

**Characteristics**:
- Confidence: 0.6-0.7
- Frequency cap: Daily/weekly limits
- Veto rate: 30-50% (healthy)
- User can opt-out

### Emotional (High Bar)

- Early intervention
- Therapeutic suggestions
- Crisis alerts

**Characteristics**:
- Confidence: 0.7-0.95
- Emotional SLA: 5-120 minutes
- Veto rate: 70-80% for therapeutic
- Medical review required

### Marketing (Controlled)

- Power user detection
- Trial ending
- Upsell offers

**Characteristics**:
- Confidence: 0.6
- Frequency cap: 2/week max
- User can opt-out
- Business objectives balanced with respect

---

## Code Patterns

### Service Creation

```typescript
export class MyPipelineService {
  constructor(
    private supabase: SupabaseClient,
    private emailService: EmailService,
    private curator: IntelligenceCurator,
    private logger: Logger
  ) {}
  
  async execute(userId: string): Promise<void> {
    // 1. Gather data
    const data = await this.gatherData(userId);
    
    // 2. Create pipeline event
    const event: PipelineEvent = {
      type: 'my_pipeline',
      userId,
      data: {
        signalCount: data.length,
        confidence: this.calculateConfidence(data),
        ...data
      },
      triggeredAt: new Date()
    };
    
    // 3. Curate (check if should execute)
    const decision = await this.curator.curate(event);
    
    if (!decision.execute) {
      this.logger.info('Pipeline vetoed', {
        vetoReason: decision.vetoReason
      });
      return;
    }
    
    // 4. Execute pipeline
    await this.executePipeline(userId, data);
  }
}
```

### Comparative Insight Generation

```typescript
async generateComparativeInsight(userId, storyId, context) {
  // 1. Get this story's metrics
  const storyMetrics = await getMetrics(storyId, userId);
  
  // 2. Get user's baseline (last 5 in SAME context)
  const baseline = await getBaseline(userId, context, 5);
  
  if (baseline.length < 3) {
    return null; // Not enough baseline
  }
  
  // 3. Calculate deltas
  const engagementDelta = storyMetrics.engagement - avgBaseline(baseline, 'engagement');
  
  // 4. Generate interpretation
  const improvements = [];
  if (engagementDelta > 5) {
    improvements.push({
      metric: 'engagement',
      delta: engagementDelta,
      interpretation: `${engagementDelta.toFixed(0)}% more engaged`
    });
  }
  
  // 5. Return ONLY if meaningful improvements
  if (improvements.length === 0) {
    return null;
  }
  
  return {
    subject: storyTitle,
    improvements,
    recommendation: `Create more like "${storyTitle}"`,
    confidence: improvements.length >= 2 ? 0.9 : 0.7
  };
}
```

### Database Interaction

```typescript
// Track consumption event
await supabase.rpc('track_consumption_event', {
  p_story_id: storyId,
  p_user_id: userId,
  p_event_data: eventData
});

// Calculate effectiveness (comparative)
const score = await supabase.rpc('calculate_story_effectiveness', {
  p_story_id: storyId,
  p_user_id: userId
});

// Check if should send email
const shouldSend = await supabase.rpc('should_send_email', {
  p_user_id: userId,
  p_email_type: emailType
});
```

---

## EventBridge Integration

### Job Types

**Daily Jobs** (8pm, 4am, 12pm, 1am, 3am UTC):
- `daily_digest` - Evening consumption summary
- `story_scoring` - Calculate effectiveness scores
- `power_user_detection` - Detect free users hitting limits
- `referral_rewards` - Process pending rewards
- `expire_credits` - Expire old credits

**Weekly Jobs** (Sunday 6pm, Friday 4pm UTC):
- `weekly_insights` - User-type-specific reports

**Monthly Jobs** (First Monday 9am UTC):
- `org_health` - B2B organization reports

**Frequent Jobs** (Every 15 minutes):
- `asset_timeout_check` - Detect stuck asset generation

### Lambda Handler

```typescript
export const handler = async (event: EventBridgeEvent) => {
  const jobType = event.detail?.jobType;
  
  switch (jobType) {
    case 'daily_digest':
      await dailyDigestService.processBatchDigests();
      break;
    case 'weekly_insights':
      await weeklyInsightsService.processBatchInsights();
      break;
    // ... other job types
  }
};
```

---

## Testing Strategy

### Unit Tests (Per Service)

```typescript
describe('IntelligenceCurator', () => {
  it('vetoes when signal count insufficient', async () => {
    const decision = await curator.curate({
      type: 'daily_digest',
      userId: 'test',
      data: { signalCount: 1, confidence: 0.8 }, // Need 2+
      triggeredAt: new Date()
    });
    
    expect(decision.execute).toBe(false);
    expect(decision.vetoReason).toBe('INSUFFICIENT_SIGNAL');
  });
  
  it('vetoes when confidence too low', async () => {
    const decision = await curator.curate({
      type: 'therapeutic_suggestion',
      userId: 'test',
      data: { signalCount: 5, confidence: 0.6 }, // Need 0.9
      triggeredAt: new Date()
    });
    
    expect(decision.execute).toBe(false);
    expect(decision.vetoReason).toBe('LOW_CONFIDENCE');
  });
  
  it('approves when all checks pass', async () => {
    const decision = await curator.curate({
      type: 'daily_digest',
      userId: 'test',
      data: { signalCount: 3, confidence: 0.8 },
      triggeredAt: new Date()
    });
    
    expect(decision.execute).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Referral Reward Flow', () => {
  it('issues credit when referee subscribes', async () => {
    // 1. Create referral tracking
    await createReferral(referrerId, refereeId);
    
    // 2. Simulate Stripe subscription webhook
    await processWebhook('customer.subscription.created', {
      metadata: { userId: refereeId }
    });
    
    // 3. Verify credit issued
    const credits = await getAvailableCredits(referrerId);
    expect(credits).toBe(1000); // $10
    
    // 4. Verify Stripe balance transaction
    const balance = await stripe.customers.retrieve(referrerId);
    expect(balance.balance).toBe(-1000);
    
    // 5. Verify referral tracking updated
    const tracking = await getReferralTracking(referrerId, refereeId);
    expect(tracking.status).toBe('converted');
    expect(tracking.reward_status).toBe('issued');
  });
});
```

---

## Performance Considerations

### Batch Processing

**All services support batch mode**:
```typescript
// Process all active users (not one-by-one API calls)
await dailyDigestService.processBatchDigests();
await weeklyInsightsService.processBatchInsights();
await effectivenessService.processBatchScoring();
```

**Pagination** (for large datasets):
```typescript
let offset = 0;
const batchSize = 100;

while (true) {
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .range(offset, offset + batchSize - 1);
  
  if (!users || users.length === 0) break;
  
  for (const user of users) {
    await processUser(user.id);
  }
  
  offset += batchSize;
}
```

### Caching

**SSM Parameters** (5-minute cache):
```typescript
private ssmCache: Map<string, { value: string; expiry: number }>;

async getSSMParam(name: string): Promise<string> {
  const cached = this.ssmCache.get(name);
  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }
  
  // Fetch from SSM, cache for 5 minutes
  const value = await fetchFromSSM(name);
  this.ssmCache.set(name, {
    value,
    expiry: Date.now() + 300000
  });
  
  return value;
}
```

**Template IDs** (indefinite cache):
```typescript
private templateIdCache: Map<string, string>;

async getTemplateId(name: string): Promise<string> {
  if (this.templateIdCache.has(name)) {
    return this.templateIdCache.get(name)!;
  }
  
  const id = await fetchTemplateId(name);
  this.templateIdCache.set(name, id);
  return id;
}
```

---

## Error Handling

### Graceful Degradation

```typescript
try {
  await sendEmail(user);
} catch (error) {
  logger.error('Email failed, continuing with next user', {
    userId: user.id,
    error
  });
  // Don't throw - continue batch processing
}
```

### Retry Logic

```typescript
const MAX_RETRIES = 3;

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    await executeAction();
    break; // Success
  } catch (error) {
    if (attempt === MAX_RETRIES) {
      logger.error('Max retries reached', { error });
      throw error;
    }
    
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    await sleep(delay);
  }
}
```

---

## Monitoring & Observability

### Logging Standards

```typescript
// Every curator decision
logger.info('Pipeline decision', {
  pipelineType: event.type,
  userId: event.userId,
  execute: decision.execute,
  confidence: decision.confidence,
  vetoReason: decision.vetoReason,
  correlationId: event.correlationId
});

// Every email sent
logger.info('Email sent', {
  userId,
  emailType,
  variant,
  provider: 'sendgrid'
});

// Every veto
logger.info('Pipeline vetoed', {
  pipelineType,
  vetoReason,
  signalCount,
  confidence
});
```

### Metrics to Emit

```typescript
await cloudwatch.putMetricData({
  Namespace: 'Storytailor/Pipelines',
  MetricData: [
    {
      MetricName: 'PipelineExecutions',
      Value: 1,
      Dimensions: [
        { Name: 'PipelineType', Value: event.type },
        { Name: 'Vetoed', Value: decision.execute ? 'false' : 'true' }
      ]
    }
  ]
});
```

---

## Security Considerations

### RLS Policies

All new tables have RLS enabled:
- Users can view their own data
- Service role has full access
- Admin role has read-only access (for dashboards)

### PII Handling

**Tokenized in logs**:
- Email addresses hashed
- User IDs only (not names)
- Correlation IDs for tracing

**Retention**:
- Audit logs: 365 days
- Consumption metrics: Indefinite
- Email delivery log: 90 days
- Pipeline executions: 90 days

---

## Deployment Architecture

```
┌─────────────────┐
│   EventBridge   │ (8 scheduled rules)
│   Rules         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Intelligence   │ (Lambda function)
│  Curator        │ Memory: 512MB, Timeout: 300s
└────────┬────────┘
         │
         ├──────────────────────┬─────────────────────┐
         │                      │                     │
         ▼                      ▼                     ▼
┌─────────────────┐    ┌─────────────────┐  ┌─────────────────┐
│   Supabase      │    │   SendGrid      │  │   Stripe        │
│   (Database)    │    │   (Email)       │  │   (Payments)    │
└─────────────────┘    └─────────────────┘  └─────────────────┘
```

---

## Best Practices

### Adding New Pipeline

1. Define pipeline config in `IntelligenceCurator.ts`:
   ```typescript
   'my_pipeline': {
     name: 'My Pipeline',
     type: 'insight',
     minConfidence: 0.7,
     minSignalCount: 2,
     enabled: true
   }
   ```

2. Create service in `packages/universal-agent/src/services/`:
   ```typescript
   export class MyPipelineService {
     async execute(userId: string): Promise<void> {
       // Create event
       const event = { type: 'my_pipeline', userId, ... };
       
       // Curate
       const decision = await this.curator.curate(event);
       if (!decision.execute) return;
       
       // Execute
       await this.doWork(userId);
     }
   }
   ```

3. Add handler in `lambda-deployments/intelligence-curator/src/lambda.ts`:
   ```typescript
   case 'my_pipeline':
     await myPipelineService.processBatch();
     break;
   ```

4. Create EventBridge rule (if scheduled):
   ```bash
   aws events put-rule \
     --name storytailor-my-pipeline-production \
     --schedule-expression "cron(...)"
   ```

5. Add tests:
   ```typescript
   describe('MyPipelineService', () => {
     it('executes when criteria met', ...);
     it('vetoes when insufficient signal', ...);
   });
   ```

### Adding New User Type Variant

1. Add to `UserTypeRouter.ts` variant map:
   ```typescript
   'my_email': {
     'new_user_type': 'my-email-new-variant'
   }
   ```

2. Create SendGrid template: `storytailor-my-email-new-variant`

3. Store template ID in SSM:
   ```bash
   /storytailor-production/email/templates/my-email-new-variant
   ```

---

## Common Issues & Solutions

### Issue: Pipeline Not Executing

**Check**:
1. Kill switch enabled? `/pipelines/{type}/enabled`
2. Sufficient signal count?
3. Confidence above threshold?
4. Frequency cap reached?
5. User preferences blocking?

**Debug**:
```sql
SELECT * FROM pipeline_executions
WHERE pipeline_type = 'my_pipeline'
AND vetoed = TRUE
ORDER BY created_at DESC
LIMIT 10;
```

### Issue: Emails Not Sending

**Check**:
1. SendGrid template ID in SSM?
2. User email preferences allow?
3. Quiet hours active?
4. SendGrid API key valid?

**Debug**:
```sql
SELECT * FROM email_delivery_log
WHERE user_id = 'xxx'
AND status = 'failed'
ORDER BY sent_at DESC;
```

### Issue: High Veto Rate

**Expected veto rates**:
- Insights: 30-50% (healthy)
- Therapeutic: 70-80% (very selective)
- Transactional: <5%

**If too high** (>80% for insights):
- Lower confidence threshold
- Reduce minimum signal count
- Check if data collection working

**If too low** (<10% for insights):
- Raise confidence threshold
- Increase minimum signal count
- Users might be getting noise

---

## References

- **Sacred Documents**: `docs/api/THERAPEUTIC_DOCTRINE.md`, `PIPELINE_VETO_RULES.md`, etc.
- **Implementation Summary**: `AUTOMATIC_PIPELINE_IMPLEMENTATION_SUMMARY.md`
- **Deployment Checklist**: `PIPELINE_DEPLOYMENT_CHECKLIST.md`
- **Database Schema**: `supabase/migrations/20251225000000_automatic_pipeline_system.sql`
- **Plan**: `.cursor/plans/automatic_pipeline_system_49a053c8.plan.md`

---

**For questions or support**: Contact engineering lead or see `PIPELINE_SYSTEM_COMPLETE.md`

