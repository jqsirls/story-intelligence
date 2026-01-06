# Automatic Pipeline System - Testing Guide

**Audience**: QA/Testing Team  
**Version**: 1.0  
**Date**: December 25, 2025  
**Target Coverage**: 90%

---

## Testing Strategy

### Test Pyramid

```
        /\
       /  \  E2E Tests (5%)
      /____\
     /      \  Integration Tests (25%)
    /________\
   /          \  Unit Tests (70%)
  /__________\
```

---

## Unit Tests

### Test Structure

```
packages/universal-agent/src/services/__tests__/
  IntelligenceCurator.test.ts
  ConsumptionAnalyticsService.test.ts
  ReferralRewardService.test.ts
  DailyDigestService.test.ts
  WeeklyInsightsService.test.ts
  StoryEffectivenessService.test.ts
  PowerUserDetectionService.test.ts
  OrganizationHealthService.test.ts
  UserTypeRouter.test.ts
  CrisisAlertService.test.ts
  UnifiedDailyMomentService.test.ts
  TherapeuticAutoAssignService.test.ts
  AssetFailureService.test.ts
  SeatManagementService.test.ts
  StatefulRecommendationService.test.ts
  HumanOverrideService.test.ts
```

### Critical Test Cases

#### IntelligenceCurator Tests

```typescript
describe('IntelligenceCurator', () => {
  describe('Veto Authority', () => {
    it('vetoes when signal count insufficient', async () => {
      const decision = await curator.curate({
        type: 'daily_digest',
        userId: 'test-user',
        data: { signalCount: 1, confidence: 0.8 }, // Need 2+
        triggeredAt: new Date()
      });
      
      expect(decision.execute).toBe(false);
      expect(decision.vetoReason).toBe('INSUFFICIENT_SIGNAL');
    });
    
    it('vetoes when confidence too low', async () => {
      const decision = await curator.curate({
        type: 'therapeutic_suggestion',
        userId: 'test-user',
        data: { signalCount: 5, confidence: 0.6 }, // Need 0.9
        triggeredAt: new Date()
      });
      
      expect(decision.execute).toBe(false);
      expect(decision.vetoReason).toBe('LOW_CONFIDENCE');
    });
    
    it('vetoes when kill switch active', async () => {
      // Mock SSM to return 'false'
      mockSSM.getParameter.mockResolvedValue({ Parameter: { Value: 'false' } });
      
      const decision = await curator.curate({
        type: 'daily_digest',
        userId: 'test-user',
        data: { signalCount: 3, confidence: 0.8 },
        triggeredAt: new Date()
      });
      
      expect(decision.execute).toBe(false);
      expect(decision.vetoReason).toBe('KILL_SWITCH_ACTIVE');
    });
    
    it('vetoes when emotional SLA missed', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      
      const decision = await curator.curate({
        type: 'crisis_alert',
        userId: 'test-user',
        data: { signalCount: 1, confidence: 0.96 },
        triggeredAt: fiveMinutesAgo // 6 minutes ago (SLA is 5)
      });
      
      expect(decision.execute).toBe(false);
      expect(decision.vetoReason).toBe('SLA_MISSED');
    });
    
    it('approves when all checks pass', async () => {
      const decision = await curator.curate({
        type: 'daily_digest',
        userId: 'test-user',
        data: { signalCount: 3, confidence: 0.8 },
        triggeredAt: new Date()
      });
      
      expect(decision.execute).toBe(true);
      expect(decision.confidence).toBe(0.8);
    });
  });
  
  describe('Comparative Intelligence', () => {
    it('generates comparative insight with baseline', async () => {
      // Mock 5 baseline stories
      mockSupabase.from('consumption_metrics').select.mockResolvedValueOnce({
        data: [
          { engagement_score: 70, total_duration_seconds: 1020 },
          { engagement_score: 72, total_duration_seconds: 1080 },
          { engagement_score: 68, total_duration_seconds: 960 },
          { engagement_score: 71, total_duration_seconds: 1050 },
          { engagement_score: 69, total_duration_seconds: 1000 }
        ]
      });
      
      // This story: higher engagement, shorter duration
      mockSupabase.from('consumption_metrics').select.mockResolvedValueOnce({
        data: {
          engagement_score: 85,
          total_duration_seconds: 720 // 5 minutes faster
        }
      });
      
      const insight = await curator.generateComparativeInsight(
        'user-id',
        'story-id',
        'bedtime'
      );
      
      expect(insight).not.toBeNull();
      expect(insight.improvements).toHaveLength(2);
      expect(insight.improvements[0].interpretation).toContain('more engaged');
      expect(insight.improvements[1].interpretation).toContain('faster');
    });
    
    it('returns null when no meaningful improvements', async () => {
      // Mock baseline
      mockSupabase.from('consumption_metrics').select.mockResolvedValue({
        data: Array(5).fill({ engagement_score: 70 })
      });
      
      // This story: same as baseline
      mockSupabase.from('consumption_metrics').select.mockResolvedValueOnce({
        data: { engagement_score: 70 }
      });
      
      const insight = await curator.generateComparativeInsight(
        'user-id',
        'story-id',
        'bedtime'
      );
      
      expect(insight).toBeNull(); // No insight - no improvement
    });
  });
});
```

#### ReferralRewardService Tests

```typescript
describe('ReferralRewardService', () => {
  it('issues $10 credit on referral conversion', async () => {
    await service.processReferralConversion({
      referrerId: 'referrer-id',
      refereeId: 'referee-id',
      rewardType: 'casual',
      rewardAmount: 1000,
      subscriptionId: 'sub_xxx'
    });
    
    // Verify Stripe balance transaction
    expect(mockStripe.customers.createBalanceTransaction).toHaveBeenCalledWith(
      'cus_xxx',
      expect.objectContaining({
        amount: -1000,
        currency: 'usd'
      })
    );
    
    // Verify reward ledger insert
    const { data } = await supabase
      .from('reward_ledger')
      .select()
      .eq('user_id', 'referrer-id')
      .single();
    
    expect(data.amount).toBe(1000);
    expect(data.status).toBe('applied');
  });
  
  it('applies 50% coupon at 10 referrals', async () => {
    // Mock 10 successful referrals
    mockSupabase.from('referral_tracking').select.mockResolvedValue({
      count: 10
    });
    
    await service.checkMilestones('user-id');
    
    // Verify coupon created
    expect(mockStripe.coupons.create).toHaveBeenCalledWith({
      id: 'storytailor-legend-10-referrals',
      percent_off: 50,
      duration: 'forever'
    });
    
    // Verify coupon applied
    expect(mockStripe.customers.update).toHaveBeenCalledWith(
      'cus_xxx',
      { coupon: 'storytailor-legend-10-referrals' }
    );
  });
});
```

#### ConsumptionAnalyticsService Tests

```typescript
describe('ConsumptionAnalyticsService', () => {
  it('tracks consumption event', async () => {
    await service.trackEvent({
      storyId: 'story-id',
      userId: 'user-id',
      eventType: 'play_complete',
      timestamp: new Date(),
      duration: 720
    });
    
    // Verify RPC called
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'track_consumption_event',
      expect.objectContaining({
        p_story_id: 'story-id',
        p_user_id: 'user-id'
      })
    );
  });
  
  it('calculates engagement score correctly', () => {
    const score = service['calculateEngagementScore']({
      completionRate: 95,
      replayCount: 2,
      readCount: 3,
      pausePatterns: []
    });
    
    // completionRate * 0.4 + replays * 3 * 0.3 + reads * 4 * 0.2 + 10 (no pauses)
    // = 95 * 0.4 + 2 * 3 * 0.3 + 3 * 4 * 0.2 + 10
    // = 38 + 1.8 + 2.4 + 10 = 52.2
    expect(score).toBeCloseTo(52.2, 1);
  });
});
```

---

## Integration Tests

### Test Database Functions

```typescript
describe('Database Functions', () => {
  it('track_consumption_event updates metrics', async () => {
    // Insert initial metrics
    await supabase.from('consumption_metrics').insert({
      story_id: 'story-1',
      user_id: 'user-1',
      read_count: 1
    });
    
    // Call function
    await supabase.rpc('track_consumption_event', {
      p_story_id: 'story-1',
      p_user_id: 'user-1',
      p_event_data: { duration_seconds: 300 }
    });
    
    // Verify updated
    const { data } = await supabase
      .from('consumption_metrics')
      .select()
      .eq('story_id', 'story-1')
      .single();
    
    expect(data.read_count).toBe(2);
    expect(data.total_duration_seconds).toBe(300);
  });
  
  it('calculate_story_effectiveness returns comparative score', async () => {
    // Setup: Insert metrics for this story and baseline
    // ...
    
    const { data: score } = await supabase.rpc('calculate_story_effectiveness', {
      p_story_id: 'story-1',
      p_user_id: 'user-1'
    });
    
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

### Test EventBridge Integration

```typescript
describe('EventBridge Jobs', () => {
  it('daily_digest job processes all active users', async () => {
    // Mock active users
    await insertMockConsumptionData(3); // 3 users with activity
    
    // Invoke Lambda with daily_digest job type
    const response = await lambda.invoke({
      FunctionName: 'storytailor-intelligence-curator-staging',
      Payload: JSON.stringify({
        detail: { jobType: 'daily_digest' }
      })
    });
    
    // Verify emails sent
    const { count } = await supabase
      .from('email_delivery_log')
      .select('id', { count: 'exact' })
      .eq('email_type', 'daily_digest')
      .gte('sent_at', testStartTime);
    
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
```

### Test Stripe Webhook Flow

```typescript
describe('Stripe Webhook → Referral Reward', () => {
  it('issues credit when referee subscribes', async () => {
    // 1. Create referral tracking
    await supabase.from('referral_tracking').insert({
      referrer_id: 'referrer-1',
      referred_id: 'referee-1',
      referral_code: 'REF123',
      status: 'signed_up'
    });
    
    // 2. Simulate subscription webhook
    const webhook = mockStripeWebhook('customer.subscription.created', {
      customer: 'cus_referee',
      metadata: { userId: 'referee-1' }
    });
    
    await commerceAgent.handleWebhook(webhook);
    
    // 3. Verify credit issued
    const { data: reward } = await supabase
      .from('reward_ledger')
      .select()
      .eq('user_id', 'referrer-1')
      .single();
    
    expect(reward.amount).toBe(1000);
    expect(reward.status).toBe('applied');
    
    // 4. Verify Stripe balance
    expect(mockStripe.customers.createBalanceTransaction).toHaveBeenCalled();
    
    // 5. Verify email sent
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'referrer@example.com',
        subject: expect.stringContaining('$10 credit')
      })
    );
  });
});
```

---

## E2E Tests

### Complete User Journey

```typescript
describe('Complete Pipeline Journey', () => {
  it('signup → story → consumption → digest → reward', async () => {
    // 1. User signs up with referral code
    const user = await createUser({
      email: 'test@example.com',
      referralCode: 'REF123'
    });
    expect(user.id).toBeDefined();
    
    // 2. User subscribes
    await simulateStripeCheckout(user.id, 'premium');
    
    // Wait for webhook processing
    await waitFor(() => 
      getReferralReward(referrerId) !== null
    );
    
    // 3. Referrer receives $10 credit
    const credit = await getReferralReward(referrerId);
    expect(credit.amount).toBe(1000);
    
    // 4. User creates story
    const story = await createStory(user.id, {
      title: 'Test Story',
      character: 'Test Character'
    });
    
    // 5. Wait for assets to generate
    await waitForAssets(story.id, 60000); // 60s timeout
    
    // 6. User consumes story
    await trackConsumption(story.id, user.id, {
      eventType: 'play_complete',
      duration: 720
    });
    
    // 7. Wait for daily digest time (or trigger manually)
    await triggerDailyDigest();
    
    // 8. Verify digest email sent
    const emails = await getEmailDeliveryLog(user.id);
    const digest = emails.find(e => e.email_type === 'daily_digest');
    expect(digest).toBeDefined();
    expect(digest.status).toBe('sent');
    
    // 9. User clicks email link
    await simulateEmailClick(digest.id);
    
    // 10. Verify click tracked
    const updated = await getEmailDeliveryLog(user.id);
    const clicked = updated.find(e => e.id === digest.id);
    expect(clicked.status).toBe('clicked');
  });
});
```

---

## Test Data Setup

### Mock Users

```typescript
const mockUsers = {
  parent: {
    id: 'parent-1',
    email: 'parent@example.com',
    user_type: 'parent',
    first_name: 'Sarah'
  },
  teacher: {
    id: 'teacher-1',
    email: 'teacher@example.com',
    user_type: 'teacher',
    first_name: 'Ms. Johnson'
  },
  therapist: {
    id: 'therapist-1',
    email: 'therapist@example.com',
    user_type: 'therapist',
    first_name: 'Dr. Smith'
  }
};
```

### Mock Consumption Data

```typescript
async function createMockConsumptionData(userId: string, storyId: string) {
  return await supabase.from('consumption_metrics').insert({
    story_id: storyId,
    user_id: userId,
    read_count: 3,
    total_duration_seconds: 720,
    completion_rate: 95,
    replay_count: 2,
    engagement_score: 85,
    first_read_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    last_read_at: new Date()
  });
}
```

### Mock Referral Data

```typescript
async function createMockReferral(referrerId: string, refereeId: string) {
  return await supabase.from('referral_tracking').insert({
    referrer_id: referrerId,
    referred_id: refereeId,
    referral_code: `REF${Math.random().toString(36).substring(7)}`,
    status: 'signed_up',
    created_at: new Date()
  });
}
```

---

## Manual Testing Scenarios

### Scenario 1: Daily Digest

**Setup**:
1. Create test user
2. Track 3 story consumption events today
3. Wait for 8pm UTC (or trigger manually)

**Expected**:
- Email received
- Contains 3 stories
- Top story highlighted
- Comparative insights included
- Single CTA

**Verify**:
- Email opens
- Link works
- Preferences respected (if user opted out, no email)

### Scenario 2: Referral Reward

**Setup**:
1. User A shares referral link
2. User B signs up with code
3. User B subscribes

**Expected**:
- User A receives $10 credit within 5 minutes
- Email sent: "$10 credit earned"
- Stripe balance shows -$10
- reward_ledger shows 'applied'
- Next invoice will use credit

**Verify**:
- Credit balance correct
- Stripe balance correct
- Email received
- Applied to invoice

### Scenario 3: Therapeutic Suggestion

**Setup**:
1. Create child profile
2. Submit 5 emotion check-ins (anxiety, high confidence)
3. Wait for processing

**Expected** (if clinical review complete):
- Email sent to parent
- Subject: "Stories might help with [Child]'s worries"
- Body includes: Pattern observation, pathway suggestion, opt-in/decline, crisis resources
- Language is non-diagnostic
- Professional referral included

**Verify**:
- Email tone appropriate
- No forbidden clinical language
- Crisis resources present
- Opt-in/decline buttons work

### Scenario 4: Crisis Alert

**Setup**:
1. Simulate high-confidence crisis detection (0.96)
2. Trigger within SLA window (< 5 minutes)

**Expected**:
- Push notification sent immediately
- Email sent within 5 minutes
- Subject: "URGENT: Check in with your child"
- Body includes: Crisis resources, non-diagnostic language
- Logged in crisis_responses table

**Verify**:
- SLA met (<5 minutes)
- Multi-channel (push + email)
- Crisis resources present
- Parent receives alert

---

## Performance Tests

### Load Test: Batch Processing

```typescript
describe('Load Tests', () => {
  it('processes 1000 users in daily digest < 30s', async () => {
    // Create 1000 users with consumption data
    for (let i = 0; i < 1000; i++) {
      await createMockConsumptionData(`user-${i}`, `story-${i}`);
    }
    
    const startTime = Date.now();
    
    await dailyDigestService.processBatchDigests();
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(30000); // < 30 seconds
  });
});
```

### Stress Test: High Veto Rate

```typescript
it('handles high veto rate efficiently', async () => {
  // Create 100 users with insufficient signal (will all veto)
  for (let i = 0; i < 100; i++) {
    await createMockConsumptionData(`user-${i}`, `story-${i}`, {
      events: 1 // Below threshold
    });
  }
  
  const startTime = Date.now();
  
  await dailyDigestService.processBatchDigests();
  
  const duration = Date.now() - startTime;
  
  // Should complete quickly even with 100% veto rate
  expect(duration).toBeLessThan(5000); // < 5 seconds
  
  // Verify no emails sent
  const { count } = await supabase
    .from('email_delivery_log')
    .select('id', { count: 'exact' })
    .gte('sent_at', new Date(startTime));
  
  expect(count).toBe(0);
});
```

---

## Test Coverage Requirements

### Per Service (90% minimum)

```bash
# Run with coverage
npm run test:coverage

# Check coverage report
open coverage/lcov-report/index.html
```

**Targets**:
- Statements: >90%
- Branches: >85%
- Functions: >90%
- Lines: >90%

### Critical Paths (100% required)

- Veto decision logic
- Confidence threshold checks
- Signal count validation
- SLA enforcement
- Therapeutic language validation
- Kill switch checks
- Frequency cap logic
- Credit calculation
- Stripe integration

---

## CI/CD Integration

### Test Pipeline

```yaml
# .github/workflows/test-pipelines.yml
name: Pipeline Tests

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:pipelines
      
      - name: Check coverage
        run: npm run test:coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
      
      - name: Fail if coverage < 90%
        run: |
          COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
          if (( $(echo "$COVERAGE < 90" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 90%"
            exit 1
          fi
```

---

## Test Utilities

### Helper Functions

```typescript
// test-helpers/pipeline-helpers.ts

export async function createTestPipelineEvent(
  type: string,
  overrides = {}
): Promise<PipelineEvent> {
  return {
    type,
    userId: 'test-user',
    data: {
      signalCount: 3,
      confidence: 0.8,
      ...overrides
    },
    triggeredAt: new Date()
  };
}

export async function expectVeto(
  decision: CurationDecision,
  reason: VetoReason
) {
  expect(decision.execute).toBe(false);
  expect(decision.vetoReason).toBe(reason);
}

export async function expectApproval(decision: CurationDecision) {
  expect(decision.execute).toBe(true);
  expect(decision.vetoReason).toBeUndefined();
}
```

---

## Regression Test Suite

### Critical Flows to Test

1. **Story complete → Email** (transactional)
2. **Referral conversion → Credit** (financial)
3. **Crisis detection → Alert** (safety)
4. **Daily digest → Veto** (intelligence)
5. **Therapeutic suggestion → Gated** (compliance)

**Run before every deploy**:
```bash
npm run test:regression
```

---

## Test Environment Setup

### Local Testing

```bash
# Start infrastructure
npm run infrastructure:start

# Run migrations
supabase db push

# Seed test data
npm run test:seed

# Run tests
npm run test:pipelines
```

### Staging Testing

```bash
# Point to staging
export SUPABASE_URL=$STAGING_SUPABASE_URL
export SUPABASE_KEY=$STAGING_SUPABASE_KEY

# Run integration tests
npm run test:integration -- --env=staging
```

---

## Bug Report Template

```markdown
### Bug Description
[Clear description of the issue]

### Pipeline Type
[daily_digest, weekly_insights, etc.]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happened]

### Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Evidence
- User ID: [user-id]
- Story ID: [story-id]
- Timestamp: [ISO 8601]
- Pipeline execution ID: [from pipeline_executions table]
- Veto reason: [if vetoed]
- Confidence: [score]
- Signal count: [count]

### Logs
```
[Relevant CloudWatch log entries]
```

### Database State
```sql
-- pipeline_executions
SELECT * FROM pipeline_executions WHERE id = 'execution-id';

-- email_delivery_log
SELECT * FROM email_delivery_log WHERE user_id = 'user-id' ORDER BY sent_at DESC LIMIT 5;
```

### Impact
- Severity: [P1/P2/P3/P4]
- Users affected: [count]
- Revenue impact: [if applicable]
```

---

**For testing support**: [Slack: #qa-pipeline-testing]  
**For test infrastructure**: [DevOps contact]

