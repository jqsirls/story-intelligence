# Automatic Pipeline System - Frontend Integration Guide

**Audience**: Frontend Developers  
**Version**: 1.0  
**Date**: December 25, 2025

---

## Overview

The Automatic Pipeline System provides backend intelligence that surfaces in frontend via:
- Real-time notifications (Supabase Realtime)
- Email links (deep linking to app)
- REST API endpoints (consumption data, preferences)
- Push notifications (future)

---

## REST API Endpoints

### Base URL

```
Production: https://api.storytailor.dev/api/v1
Staging: https://staging-api.storytailor.dev/api/v1
```

### Consumption Tracking

**Track story play/read event**:
```typescript
POST /api/v1/stories/:storyId/consumption
Authorization: Bearer {jwt}

Body:
{
  "eventType": "play_start" | "play_pause" | "play_resume" | "play_complete" | "replay",
  "position": 120, // Seconds into story
  "duration": 300, // Duration of this event
  "metadata": {
    "device": "mobile",
    "context": "bedtime"
  }
}

Response: 200 OK
```

**Get consumption metrics**:
```typescript
GET /api/v1/stories/:storyId/metrics
Authorization: Bearer {jwt}

Response:
{
  "storyId": "uuid",
  "readCount": 3,
  "totalDurationSeconds": 720,
  "completionRate": 95.5,
  "replayCount": 2,
  "engagementScore": 85.2,
  "firstReadAt": "2025-12-20T19:30:00Z",
  "lastReadAt": "2025-12-24T20:15:00Z"
}
```

**Get story effectiveness (comparative)**:
```typescript
GET /api/v1/stories/:storyId/effectiveness
Authorization: Bearer {jwt}

Response:
{
  "effectivenessScore": 87.5, // Relative to user's baseline
  "improvements": [
    {
      "metric": "engagement",
      "delta": 15.2,
      "interpretation": "15% more engaging than usual"
    },
    {
      "metric": "sleep_time",
      "delta": -300,
      "interpretation": "Fell asleep 5 minutes faster"
    }
  ],
  "recommendation": "Create more dragon stories for bedtime",
  "confidence": 0.92
}
```

### Email Preferences

**Get user preferences**:
```typescript
GET /api/v1/users/me/email-preferences
Authorization: Bearer {jwt}

Response:
{
  "transactional": true, // Cannot disable
  "insights": true,
  "marketing": false,
  "reminders": true,
  "digestFrequency": "evening", // "morning" | "evening" | "off"
  "insightsFrequency": "weekly", // "weekly" | "monthly" | "off"
  "quietHours": {
    "start": "21:00",
    "end": "07:00",
    "timezone": "America/New_York"
  },
  "dailyMoment": "evening" // "morning" | "evening" | "off"
}
```

**Update preferences**:
```typescript
PATCH /api/v1/users/me/email-preferences
Authorization: Bearer {jwt}

Body:
{
  "insights": false, // Opt out of insights
  "digestFrequency": "off", // No daily digests
  "quietHours": {
    "start": "22:00",
    "end": "06:00"
  }
}

Response: 200 OK
```

### Referral & Rewards

**Get available credits**:
```typescript
GET /api/v1/users/me/credits
Authorization: Bearer {jwt}

Response:
{
  "availableCredits": 1500, // In cents ($15)
  "pendingRewards": [
    {
      "source": "referral",
      "amount": 1000,
      "description": "Friend subscribed",
      "expiresAt": "2026-03-25T00:00:00Z"
    }
  ],
  "appliedCredits": 500
}
```

**Get reward ledger**:
```typescript
GET /api/v1/users/me/rewards
Authorization: Bearer {jwt}

Response:
{
  "rewards": [
    {
      "id": "uuid",
      "source": "referral",
      "amount": 1000,
      "status": "applied",
      "appliedToInvoice": "in_xxx",
      "appliedAt": "2025-12-20T00:00:00Z",
      "description": "Referral reward - Sarah subscribed"
    }
  ],
  "totalEarned": 2500,
  "totalApplied": 1000,
  "available": 1500
}
```

### Notifications

**Get notifications** (includes pipeline-generated):
```typescript
GET /api/v1/users/me/notifications
Authorization: Bearer {jwt}

Response:
{
  "notifications": [
    {
      "id": "uuid",
      "type": "story_ready",
      "title": "Your story is ready!",
      "message": "\"The Brave Dragon\" is complete with all assets.",
      "data": {
        "storyId": "uuid",
        "storyTitle": "The Brave Dragon"
      },
      "read": false,
      "createdAt": "2025-12-24T20:00:00Z"
    },
    {
      "id": "uuid",
      "type": "referral_reward",
      "title": "$10 credit earned",
      "message": "Sarah subscribed using your referral.",
      "data": {
        "refereeId": "uuid",
        "amount": 1000
      },
      "read": false,
      "createdAt": "2025-12-24T19:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 45
  }
}
```

---

## Real-Time Integration

### Supabase Realtime Subscriptions

**Listen for notifications**:
```typescript
const notifications = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // New notification received
    showNotification(payload.new);
  })
  .subscribe();
```

**Listen for consumption metrics updates**:
```typescript
const metrics = supabase
  .channel('consumption-metrics')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'consumption_metrics',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Metrics updated
    updateEngagementScore(payload.new);
  })
  .subscribe();
```

**Listen for reward ledger updates**:
```typescript
const rewards = supabase
  .channel('rewards')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'reward_ledger',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // New credit earned!
    showRewardNotification(payload.new);
  })
  .subscribe();
```

---

## Deep Linking from Emails

### Story Complete Email

**Link**: `https://storytailor.com/story/{storyId}?source=email&campaign=story_complete`

**Frontend Action**:
1. Navigate to story page
2. Auto-play if `?autoplay=true` in URL
3. Track source for attribution

### Daily Digest Email

**Link**: `https://storytailor.com/insights/digest?date={date}&source=email`

**Frontend Action**:
1. Navigate to insights page
2. Show digest for specified date
3. Highlight top story

### Referral Reward Email

**Link**: `https://storytailor.com/referrals?source=email&highlight=rewards`

**Frontend Action**:
1. Navigate to referrals page
2. Show reward ledger
3. Highlight newly earned reward
4. Show share link for more referrals

### Therapeutic Pathway Email

**Link**: `https://storytailor.com/pathways/{pathwayId}/learn-more?source=email`

**Frontend Action**:
1. Navigate to pathway explanation page
2. Show 8-week program details
3. Provide opt-in button
4. Provide decline button (no friction)

---

## UI Components Needed

### 1. Email Preferences Panel

**Location**: Account Settings

**Features**:
- Toggle insights emails on/off
- Toggle marketing emails on/off
- Toggle reminders on/off
- Select digest frequency (morning/evening/off)
- Set quiet hours (start/end/timezone)
- Save preferences

**API Integration**:
```typescript
// Fetch preferences
const prefs = await api.get('/users/me/email-preferences');

// Update preferences
await api.patch('/users/me/email-preferences', {
  insights: false,
  digestFrequency: 'off'
});
```

### 2. Referral Dashboard

**Location**: `/referrals`

**Features**:
- Show referral link/code
- Display reward ledger
- Show available credits
- Show milestone progress (3/5/10 referrals)
- Social share buttons

**Components**:
- `<ReferralLink />` - Copy link with share buttons
- `<RewardLedger />` - List of earned rewards
- `<AvailableCredits />` - Current balance display
- `<MilestoneProgress />` - Progress to next bonus

### 3. Consumption Insights

**Location**: `/insights` or story detail page

**Features**:
- Show engagement score (comparative)
- Display improvements vs baseline
- Show replay hotspots
- Display pause patterns
- Recommendations

**Components**:
- `<EngagementScore />` - Visual score with comparison
- `<ComparativeInsights />` - "5 minutes faster than usual"
- `<RecommendationCard />` - Actionable suggestions

### 4. Story Effectiveness Badge

**Location**: Story list/detail

**Features**:
- Visual indicator of effectiveness
- Tooltip with comparative data
- "Top performer" badge

**Example**:
```tsx
<StoryCard story={story}>
  {story.effectivenessScore > 80 && (
    <EffectivenessBadge 
      score={story.effectivenessScore}
      comparison="Better than 80% of your stories"
      icon="⭐"
    />
  )}
</StoryCard>
```

---

## User Flows

### Flow 1: Story Complete Notification

```
1. User creates story via app
2. Assets generate (progressive updates via Realtime)
3. When complete, notification appears
4. Email sent (if user has email notifications on)
5. Email link → Deep link to story page
6. Auto-play story
```

### Flow 2: Daily Digest

```
1. User consumed 3 stories today
2. EventBridge triggers daily_digest job (8pm user's timezone)
3. Intelligence Curator generates digest
4. Curator approves (3 stories > 2 minimum)
5. Email sent with top story highlighted
6. Email link → Deep link to insights page
7. Show today's consumption summary
```

### Flow 3: Referral Reward

```
1. User shares referral link
2. Friend clicks link, signs up
3. Friend subscribes
4. Stripe webhook → ReferralRewardService
5. $10 credit issued
6. Real-time notification appears in app
7. Email sent: "$10 credit earned"
8. Email link → Deep link to referral dashboard
9. Show updated credit balance
```

---

## State Management

### Consumption Tracking State

```typescript
// Redux/Zustand store
interface ConsumptionState {
  currentStoryMetrics: ConsumptionMetrics | null;
  userHistory: ConsumptionMetrics[];
  dailyDigest: ConsumptionDigest | null;
  weeklyInsights: WeeklyInsight | null;
}

// Actions
actions: {
  trackPlayEvent: (storyId, event) => {
    api.post(`/stories/${storyId}/consumption`, event);
    // Update local state optimistically
  },
  
  fetchMetrics: async (storyId) => {
    const metrics = await api.get(`/stories/${storyId}/metrics`);
    set({ currentStoryMetrics: metrics });
  }
}
```

### Referral State

```typescript
interface ReferralState {
  referralCode: string;
  referralLink: string;
  availableCredits: number;
  rewardLedger: ReferralReward[];
  referralCount: number;
  nextMilestone: { count: number; reward: string };
}
```

### Email Preferences State

```typescript
interface EmailPreferencesState {
  preferences: EmailPreferences;
  saving: boolean;
  
  updatePreferences: async (updates) => {
    set({ saving: true });
    await api.patch('/users/me/email-preferences', updates);
    set({ preferences: { ...preferences, ...updates }, saving: false });
  }
}
```

---

## UI/UX Guidelines

### Consumption Metrics Display

**Show comparative, not absolute**:
```tsx
// ❌ Bad (absolute)
<div>Engagement Score: 85.2</div>

// ✅ Good (comparative)
<div>
  <strong>15% more engaging</strong> than your other bedtime stories
</div>
```

**Always provide context**:
```tsx
<ComparativeInsight>
  <Icon>⬆️</Icon>
  <Metric>5 minutes faster</Metric>
  <Context>than your usual bedtime stories</Context>
</ComparativeInsight>
```

### Referral Rewards Display

**Show progress to next milestone**:
```tsx
<MilestoneProgress>
  <Progress value={referralCount} max={5} />
  <Text>
    {5 - referralCount} more referrals until $10 bonus + 1 month free!
  </Text>
</MilestoneProgress>
```

**Show available credits prominently**:
```tsx
<CreditsDisplay>
  <Amount>${availableCredits / 100}</Amount>
  <SubText>Auto-applies to your next invoice</SubText>
  <Action>Invite more friends</Action>
</CreditsDisplay>
```

### Email Preferences

**Clear category explanations**:
```tsx
<PreferenceToggle>
  <Label>Insights Emails</Label>
  <Description>
    Daily digests, weekly reports, story effectiveness insights
  </Description>
  <Toggle checked={insights} onChange={updateInsights} />
</PreferenceToggle>

<PreferenceToggle>
  <Label>Transactional Emails</Label>
  <Description>
    Story complete, payment receipts, security alerts
  </Description>
  <Toggle checked={true} disabled />
  <HelpText>Cannot be disabled</HelpText>
</PreferenceToggle>
```

### Notification Badge

```tsx
<NotificationBell>
  {unreadCount > 0 && (
    <Badge>{unreadCount}</Badge>
  )}
</NotificationBell>
```

---

## Analytics Integration

### Track Email Opens from App

**When user clicks email link**:
```typescript
// URL: https://storytailor.com/story/123?source=email&campaign=story_complete

// Track in analytics
analytics.track('Email Link Clicked', {
  campaign: 'story_complete',
  storyId: '123',
  userId
});

// Update email_delivery_log (via API)
api.post('/internal/email-tracking/clicked', {
  userId,
  emailType: 'story_complete',
  timestamp: new Date()
});
```

### Track Consumption Events

```typescript
// On story play
api.post(`/stories/${storyId}/consumption`, {
  eventType: 'play_start',
  timestamp: new Date()
});

// On story pause
api.post(`/stories/${storyId}/consumption`, {
  eventType: 'play_pause',
  position: currentPosition,
  duration: pauseDuration
});

// On story complete
api.post(`/stories/${storyId}/consumption`, {
  eventType: 'play_complete',
  duration: totalDuration
});
```

---

## Error Handling

### API Errors

```typescript
try {
  await api.post('/stories/:id/consumption', event);
} catch (error) {
  if (error.status === 429) {
    // Rate limited - queue for retry
    queueForRetry(event);
  } else if (error.status >= 500) {
    // Server error - retry with backoff
    retryWithBackoff(() => api.post(...));
  } else {
    // Client error - log and continue
    console.error('Consumption tracking failed', error);
  }
  
  // Don't block user experience
}
```

### Offline Support

```typescript
// Queue consumption events when offline
if (!navigator.onLine) {
  queueOfflineEvent(event);
  return;
}

// Sync when back online
window.addEventListener('online', () => {
  syncOfflineEvents();
});
```

---

## Testing

### Mock API Responses

```typescript
// Mock consumption metrics
mock.get('/api/v1/stories/:storyId/metrics', {
  readCount: 3,
  engagementScore: 85,
  // ...
});

// Mock effectiveness
mock.get('/api/v1/stories/:storyId/effectiveness', {
  effectivenessScore: 87.5,
  improvements: [
    {
      metric: 'engagement',
      delta: 15.2,
      interpretation: '15% more engaging than usual'
    }
  ]
});
```

### Component Tests

```typescript
describe('ComparativeInsight', () => {
  it('displays comparative data (not absolute scores)', () => {
    render(<ComparativeInsight 
      metric="engagement"
      delta={15.2}
      interpretation="15% more engaging than usual"
    />);
    
    expect(screen.getByText('15% more engaging')).toBeInTheDocument();
    expect(screen.queryByText('85.2')).not.toBeInTheDocument(); // No raw score
  });
});
```

---

## Performance Optimization

### Debounce Consumption Events

```typescript
const trackConsumption = debounce((storyId, event) => {
  api.post(`/stories/${storyId}/consumption`, event);
}, 5000); // Batch events within 5 seconds
```

### Cache Metrics

```typescript
const { data: metrics, isLoading } = useQuery(
  ['story-metrics', storyId],
  () => api.get(`/stories/${storyId}/metrics`),
  {
    staleTime: 60000, // 1 minute
    cacheTime: 300000  // 5 minutes
  }
);
```

---

## Wized + Webflow Integration (NEW)

### Complete Wized Documentation

For building static Webflow sites with full API integration:

**Complete References**:
- [`WIZED_COMPLETE_API_REFERENCE.md`](../integration-guides/WIZED_COMPLETE_API_REFERENCE.md) - All 131 endpoints
- [`WIZED_WEBFLOW_PAGE_TEMPLATES.md`](../integration-guides/WIZED_WEBFLOW_PAGE_TEMPLATES.md) - 19 page templates
- [`WIZED_REQUEST_TEMPLATES.json`](../integration-guides/WIZED_REQUEST_TEMPLATES.json) - Import-ready config
- [`WEBFLOW_COMPONENT_LIBRARY.md`](../integration-guides/WEBFLOW_COMPONENT_LIBRARY.md) - 15 components
- [`WIZED_WEBFLOW_COMPLETE_EXAMPLES.md`](../integration-guides/WIZED_WEBFLOW_COMPLETE_EXAMPLES.md) - 8 complete flows
- [`WIZED_QUICK_START.md`](../integration-guides/WIZED_QUICK_START.md) - 30-minute setup

### Wized Features

**Wized Embed 2.0 provides**:
- REST API integration (all 131 endpoints)
- Authentication handling (JWT)
- Data binding to Webflow elements
- Workflow automation (events → actions)
- Real-time subscriptions (Supabase)
- No BuildShip needed

**Pages you can build**:
- Story library (paginated grid)
- Story player (with consumption tracking)
- Character gallery (with management)
- Referral dashboard (credits + rewards)
- Email preferences (full control panel)
- Insights dashboard (daily/weekly with comparative intelligence)
- User-type-specific dashboards (parent/teacher/therapist/B2B)

### Quick Start

1. Create Wized app: `https://api.storytailor.dev/api/v1`
2. Import request templates from JSON
3. Add Wized script to Webflow
4. Build pages using templates
5. Test user journey

**Timeline**: 30 min setup, 2 hours MVP, 6 hours complete site

---

## Launch Checklist

### Pre-Launch

- [ ] Consumption tracking integrated in story player
- [ ] Email preferences panel implemented
- [ ] Referral dashboard implemented
- [ ] Deep linking configured
- [ ] Real-time subscriptions working
- [ ] Analytics tracking implemented
- [ ] Wized requests configured (if using Wized)
- [ ] User-type routing implemented

### Post-Launch

- [ ] Monitor consumption event volume
- [ ] Verify metrics calculating correctly
- [ ] Check notification delivery
- [ ] Validate deep links working
- [ ] Confirm preferences saving
- [ ] Test Wized integration (if deployed)

---

## Support Resources

- **API Documentation**: `docs/api/REST_API_IMPLEMENTATION_GUIDE.md`
- **Architecture**: `docs/pipelines/ARCHITECTURE_OVERVIEW.md`
- **Wized Integration**: `docs/integration-guides/WIZED_QUICK_START.md`
- **Slack Channel**: #frontend-backend-integration
- **Engineering Contact**: [Engineering Lead]

---

**Integration complete when all API endpoints consumed and real-time subscriptions active (React/Vue) OR all Wized requests configured (Webflow).**

