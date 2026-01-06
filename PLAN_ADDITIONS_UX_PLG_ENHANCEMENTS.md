# Plan Additions - UX, PLG & User-Facing Features

**Date**: December 26, 2025  
**Status**: ✅ Critical additions to commerce/quota/pagination/feedback plan

---

## 🎯 **ADDITIONS TO PLAN**

These features are **MISSING** from the current plan and must be added for complete PLG/commerce/UX coverage.

---

## **Phase 7: Stripe Product Verification** (30 min - DO FIRST)

### Required Before Implementation

**9 Stripe Products Must Exist**:

**Subscriptions** (2):
1. Pro Individual Monthly - Check SSM: `/storytailor-production/stripe/pro_individual_price_id`
2. Pro Organization Per-Seat - Check SSM: `/storytailor-production/stripe/pro_organization_price_id`

**Story Packs** (3):
3. 5-Story Pack - $4.99 one-time
4. 10-Story Pack - $8.99 one-time
5. 25-Story Pack - $14.99 one-time

**Gift Cards** (4):
6. 1-Month Gift - $9.99
7. 3-Month Gift - $27.99
8. 6-Month Gift - $49.99
9. 12-Month Gift - $99.99

### Verification Steps

```bash
# 1. Check SSM
aws ssm get-parameter --name "/storytailor-production/stripe/price_ids_complete"

# 2. List Stripe products
stripe products list

# 3. Create if missing
stripe products create --name "10-Story Pack"
stripe prices create --product prod_... --unit-amount 899 --currency usd
```

### Update Code

**File**: `packages/commerce-agent/src/config.ts`

```typescript
export const STRIPE_PRICE_IDS = {
  pro_individual: process.env.STRIPE_PRO_INDIVIDUAL_PRICE_ID || 'price_...',
  pro_organization: process.env.STRIPE_PRO_ORGANIZATION_PRICE_ID || 'price_...',
  story_pack_5: process.env.STRIPE_STORY_PACK_5_PRICE_ID || 'price_...',
  story_pack_10: process.env.STRIPE_STORY_PACK_10_PRICE_ID || 'price_...',
  story_pack_25: process.env.STRIPE_STORY_PACK_25_PRICE_ID || 'price_...',
  gift_1_month: process.env.STRIPE_GIFT_1_MONTH_PRICE_ID || 'price_...',
  gift_3_month: process.env.STRIPE_GIFT_3_MONTH_PRICE_ID || 'price_...',
  gift_6_month: process.env.STRIPE_GIFT_6_MONTH_PRICE_ID || 'price_...',
  gift_12_month: process.env.STRIPE_GIFT_12_MONTH_PRICE_ID || 'price_...'
};
```

---

## **Phase 8: User-Facing UX Enhancements** (2 hours)

### 8.1 Parent Dashboard Enhancement (30 min)

**Endpoint**: `GET /api/v1/dashboard/parent` (line 7295)

**Currently Returns** (BARE):
```typescript
{
  profiles: [...],
  recentStories: [...5],
  emotionSummary: {recent: [...]},
  recommendations: []  // Empty!
}
```

**MUST ENHANCE TO**:
```typescript
{
  profiles: [...],
  
  // ADD: Quota Display
  quota: {
    tier: "free",
    subscription: null,
    storiesUsed: 1,
    storiesLimit: 2,
    creditsAvailable: 1.0,
    canCreate: true,
    nextAction: "Complete profile for +1 story"
  },
  
  // ADD: Earning Opportunities
  earningOpportunities: [
    {
      action: "complete_profile",
      reward: 1.0,
      available: true,
      completed: false,
      description: "Add your child's age and interests",
      ctaUrl: "/profile",
      ctaText: "Complete Profile",
      estimatedTime: "2 minutes"
    },
    {
      action: "connect_smart_home",
      reward: 2.0,
      available: true,
      completed: false,
      description: "Connect Philips Hue for immersive storytelling",
      ctaUrl: "/settings/smart-home",
      ctaText: "Connect Hue",
      estimatedTime: "5 minutes"
    },
    {
      action: "invite_friend",
      reward: 1.0,
      available: true,
      repeatable: true,
      completed: false,
      description: "Invite a friend, both get story credits + discount",
      ctaUrl: "/invite",
      ctaText: "Send Invite",
      benefits: ["Your friend gets 15% off", "You both get +1 story"]
    }
  ],
  
  // ADD: Story Statistics
  storyStats: {
    total: 15,
    thisWeek: 3,
    thisMonth: 8,
    mostPopularType: "adventure",
    totalListenTime: 4320,  // seconds
    avgCompletionRate: 0.87,
    favoriteCharacter: "Luna the Dragon"
  },
  
  recentStories: [...],  // Keep existing
  
  // ENHANCE: Emotion Summary (add patterns)
  emotionSummary: {
    recent: [...],  // Keep existing
    patterns: {
      dominantEmotion: "happy",
      emotionalTrend: "positive",
      weeklyDistribution: {happy: 0.7, neutral: 0.2, worried: 0.1},
      concerningPatterns: [],
      riskLevel: "low"
    },
    insights: [
      "Your child has been consistently happy this week! 🌟",
      "Adventure stories bring the most joy"
    ]
  },
  
  // ENHANCE: Recommendations (populate, not empty!)
  recommendations: [
    {
      type: "story_type",
      title: "Try bedtime stories",
      reason: "Child showed stress indicators this week",
      impact: "May help establish calming bedtime routine",
      priority: "high",
      ctaUrl: "/stories/create?type=bedtime",
      ctaText: "Create Bedtime Story"
    },
    {
      type: "character",
      title: "Create a dragon character",
      reason: "Child loves dragons (mentioned 5 times)",
      impact: "Increased engagement expected",
      priority: "medium",
      ctaUrl: "/characters/create?species=dragon",
      ctaText: "Create Dragon"
    },
    {
      type: "activity",
      title: "Dragon drawing activity",
      reason: "Reinforces child's interests",
      impact: "Creative expression + learning",
      priority: "low",
      activityDescription: "Draw your favorite dragon scene",
      materials: ["Paper", "Crayons"]
    }
  ],
  
  // ADD: Upgrade Suggestion
  upgradeSuggestion: {
    show: true,  // Show if: hitting limits OR high usage
    message: "You've created 2 stories. Upgrade for unlimited!",
    benefits: [
      "Unlimited stories",
      "Premium voice (ElevenLabs)",
      "PDF export",
      "Educational activities"
    ],
    plans: [
      {
        planId: "pro_individual",
        name: "Pro Individual",
        price: "$9.99/month",
        ctaUrl: "/checkout?planId=pro_individual",
        ctaText: "Upgrade to Pro"
      },
      {
        planId: "story_pack_10",
        name: "10-Story Pack",
        price: "$8.99",
        features: ["10 stories", "No subscription"],
        ctaUrl: "/story-packs/buy?packType=10_pack",
        ctaText: "Buy Story Pack"
      }
    ],
    discount: {
      available: true,
      code: "WELCOME15",
      percentage: 15,
      message: "15% off first month"
    }
  }
}
```

**Queries to Add**:
```typescript
// Quota info
const quotaInfo = await this.supabase.rpc('check_story_quota', {p_user_id: userId});

// Earning opportunities
const earningOps = await this.getEarningOpportunities(userId);

// Story stats
const { count: total } = await this.supabase
  .from('stories')
  .select('*', {count: 'exact', head: true})
  .eq('creator_user_id', userId);

const weekAgo = new Date(Date.now() - 7*24*60*60*1000);
const { count: thisWeek } = await this.supabase
  .from('stories')
  .select('*', {count: 'exact', head: true})
  .eq('creator_user_id', userId)
  .gte('created_at', weekAgo.toISOString());

// ... more stat queries

// Emotion patterns (use Insights Agent)
const patterns = await this.getEmotionPatterns(userId);

// Recommendations (use Insights Agent)
const recommendations = await this.getSmartRecommendations(userId);
```

### 8.2 Library Stats (20 min)

**Endpoint**: `GET /api/v1/libraries/:id` (line ~1829)

**Currently Returns**: Basic library data

**MUST ADD**:
```typescript
{
  id: "...",
  name: "My Stories",
  owner: "...",
  created_at: "...",
  
  // ADD: Library Statistics
  stats: {
    totalStories: 25,
    totalCharacters: 10,
    storiesThisWeek: 3,
    storiesThisMonth: 12,
    mostPopularStoryType: "adventure",
    storyTypeDistribution: {
      adventure: 10,
      bedtime: 8,
      educational: 5,
      birthday: 2
    },
    averageCompletionRate: 0.92,
    totalListenTime: 14400,  // seconds
    storiesShared: 3,  // Transferred out
    storiesReceived: 2,  // Transferred in
    mostActiveDay: "Monday",
    peakUsageTime: "7:00 PM"
  },
  
  // ADD: Recent Activity (last 10)
  recentActivity: [
    {
      type: "story_created",
      date: "2025-12-26T19:30:00Z",
      title: "Dragon Adventure",
      by: userId,
      byName: "Sarah"
    },
    {
      type: "story_transferred_in",
      date: "2025-12-25T14:20:00Z",
      title: "Bedtime Story",
      from: "teacher@school.edu",
      fromName: "Mrs. Johnson"
    },
    {
      type: "character_created",
      date: "2025-12-24T10:15:00Z",
      name: "Luna the Brave",
      species: "dragon"
    }
  ],
  
  // ADD: Top Stories (by engagement)
  topStories: [
    {
      id: "...",
      title: "Dragon Adventure",
      plays: 15,
      completions: 13,
      rating: 4.8,
      lastPlayed: "2025-12-26T08:00:00Z",
      type: "adventure"
    },
    {
      id: "...",
      title: "Bedtime Dreams",
      plays: 12,
      completions: 12,
      rating: 4.9,
      lastPlayed: "2025-12-25T20:00:00Z",
      type: "bedtime"
    }
  ]
}
```

### 8.3 Story/Character Stats (20 min)

**Endpoints**: 
- `GET /api/v1/stories/:id`
- `GET /api/v1/characters/:id`

**ADD to Story Response**:
```typescript
{
  ...storyData,  // Keep all existing fields
  
  // ADD: Engagement Statistics
  stats: {
    plays: 12,
    completions: 10,
    avgCompletionRate: 0.83,
    totalListenTime: 840,  // seconds
    lastPlayed: "2025-12-26T10:30:00Z",
    uniqueListeners: 3,
    shareCount: 2,
    favoriteStatus: true  // User marked as favorite
  },
  
  // ADD: Feedback Summary
  feedbackSummary: {
    total: 10,
    positive: 8,
    neutral: 1,
    negative: 1,
    averageRating: 4.5,
    sentimentScore: 0.85,  // -1 to 1
    latestFeedback: [
      {
        sentiment: "positive",
        rating: 5,
        message: "My daughter loves this!",
        date: "2025-12-26",
        from: "parent"
      }
    ]
  },
  
  // ADD: Recommendations
  relatedStories: [
    {id: "...", title: "Similar adventure", similarity: 0.92}
  ],
  suggestedNextStory: {
    type: "bedtime",
    reason: "Balance adventure with calming content"
  }
}
```

**Queries**:
```typescript
// From consumption_metrics table
const { data: metrics } = await this.supabase
  .from('consumption_metrics')
  .select('*')
  .eq('story_id', storyId)
  .single();

// From story_feedback table (use aggregate function)
const feedbackSummary = await this.supabase
  .rpc('get_story_feedback_summary', {p_story_id: storyId});
```

### 8.4 Daily Insights Enhancement (30 min)

**Endpoint**: `GET /api/v1/users/me/insights/daily` (line 9408)

**Currently Returns**: Basic digest

**MUST ENHANCE WITH**:
```typescript
{
  date: "2025-12-26",
  userId: "...",
  
  // KEEP: Existing fields
  storiesConsumed: 5,
  totalListenTime: 1200,
  topStory: {...},
  
  // ADD: Learning Insights
  learning: {
    newWords: 15,
    conceptsExplored: ["counting", "colors", "friendship", "sharing"],
    skillsImproved: ["vocabulary", "listening", "empathy", "problem-solving"],
    educationalProgress: {
      mathematics: 0.65,
      language: 0.78,
      social: 0.82,
      creativity: 0.90
    },
    readingLevel: "grade-2",
    vocabularyGrowth: 0.15  // 15% growth this week
  },
  
  // ADD: Emotional Patterns
  emotional: {
    dominantEmotion: "happy",
    emotionDistribution: {
      happy: 0.70,
      neutral: 0.20,
      worried: 0.08,
      scared: 0.02
    },
    emotionalTrend: "positive",  // positive, neutral, negative, concerning
    moodChanges: [
      {from: "worried", to: "happy", trigger: "bedtime story", time: "20:00"}
    ],
    concerningPatterns: [],  // Array if risks detected
    riskLevel: "low",  // low, medium, high
    riskIndicators: []
  },
  
  // ADD: Milestones & Achievements
  milestones: [
    {
      type: "story_count",
      achievement: "10th story created",
      date: "2025-12-26",
      message: "10 stories! Your child's imagination is thriving! 🌟",
      badge: "storyteller_10"
    },
    {
      type: "consistency",
      achievement: "7-day streak",
      date: "2025-12-26",
      message: "A week of daily stories - fantastic routine! 🎯",
      badge: "consistent_week"
    },
    {
      type: "character",
      achievement: "First character created",
      date: "2025-12-20",
      message: "Luna the Dragon was born! 🐉"
    }
  ],
  
  // ENHANCE: Recommendations (with priority, impact, CTAs)
  recommendations: [
    {
      type: "story_type",
      title: "Try bedtime stories",
      reason: "Child showed stress indicators this week",
      impact: "May help establish calming bedtime routine",
      priority: "high",
      confidence: 0.85,
      ctaUrl: "/stories/create?type=bedtime",
      ctaText: "Create Bedtime Story",
      benefits: ["Better sleep", "Reduced anxiety", "Calming routine"]
    },
    {
      type: "character",
      title: "Create a dragon character",
      reason: "Child loves dragons (mentioned 5 times)",
      impact: "Higher engagement expected",
      priority: "medium",
      confidence: 0.92,
      ctaUrl: "/characters/create?species=dragon",
      ctaText: "Create Dragon Character"
    },
    {
      type: "activity",
      title: "Drawing: Dragon scene",
      reason: "Combines child's interest with creative expression",
      impact: "Reinforces learning through art",
      priority: "low",
      materials: ["Paper", "Crayons", "Stickers"],
      duration: "15-20 minutes"
    }
  ]
}
```

**Data Sources**:
- Insights Agent (emotional patterns, recommendations)
- Analytics Intelligence (learning progress)
- Consumption metrics (engagement data)
- Milestones from user activity

---

## **Phase 9: Pagination for User Lists** (30 min)

**3 Additional Endpoints Need Full Pagination**:

### 9.1 Notifications List

**Location**: line 3947 `GET /api/v1/users/me/notifications`

**Current**: Has `limit/offset`, no pagination metadata

**Add**: Full pagination structure (page, totalPages, hasNext, hasPrevious)

```typescript
// Same pattern as stories:
const page = Math.max(1, parseInt(req.query.page as string) || 1);
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
const offset = (page - 1) * limit;

const { count } = await this.supabase
  .from('notifications')
  .select('*', {count: 'exact', head: true})
  .eq('user_id', userId);

const { data: notifications } = await this.supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', {ascending: false})
  .range(offset, offset + limit - 1);

res.json({
  success: true,
  data: notifications || [],
  pagination: {
    page,
    limit,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
    hasNext: (page * limit) < (count || 0),
    hasPrevious: page > 1
  }
});
```

### 9.2 Rewards History

**Location**: line 9305 `GET /api/v1/users/me/rewards`

**Current**: Has `limit` only

**Add**: Full pagination

### 9.3 Emotion History

**Location**: line 4659 `GET /api/v1/profiles/:profileId/emotions/history`

**Current**: Returns filtered list

**Add**: Full pagination

**Summary**: 6 endpoints total with pagination (stories, characters, libraries, notifications, rewards, emotions)

---

## **Phase 10: EventBridge Rules Setup** (30 min)

### Create 3 Rules for Email Nudges

```bash
# Rule 1: Day 3 Nudge
aws events put-rule \
  --name plg-nudge-day3-production \
  --schedule-expression "cron(0 10 * * ? *)" \
  --state ENABLED \
  --description "Day 3 earning reminders for free users" \
  --region us-east-1

aws events put-targets \
  --rule plg-nudge-day3-production \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:326181217496:function:storytailor-intelligence-curator-production","Input"='{"action":"day3_nudge"}' \
  --region us-east-1

aws lambda add-permission \
  --function-name storytailor-intelligence-curator-production \
  --statement-id plg-nudge-day3 \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:us-east-1:326181217496:rule/plg-nudge-day3-production" \
  --region us-east-1

# Rule 2: Day 7 Nudge (similar)
# Rule 3: Day 14 Nudge (similar)
```

### Update Intelligence Curator Lambda

**File**: `lambda-deployments/intelligence-curator/src/lambda.ts`

**Add Cases** (after line ~106):
```typescript
case 'day3_nudge':
  // Send reminder to users at Day 3 with no earning actions
  const plgService = new PLGNudgeService(supabase, emailService, logger);
  await plgService.sendDay3Reminders();
  break;

case 'day7_nudge':
  // Send social proof + upgrade CTA to Day 7 users
  await plgService.sendDay7SocialProof();
  break;

case 'day14_nudge':
  // Send re-engagement to Day 14 users
  await plgService.sendDay14ReEngagement();
  break;
```

**Create Service**: `packages/universal-agent/src/services/PLGNudgeService.ts`

```typescript
export class PLGNudgeService {
  async sendDay3Reminders(): Promise<void> {
    // Query: users with available_story_credits === 0, profile_completed === false, created_at = 3 days ago
    const targetUsers = await this.findDay3Users();
    
    for (const user of targetUsers) {
      await this.emailService.sendEmail({
        to: user.email,
        templateId: 'plg-day3-reminder',
        dynamicData: {
          firstName: user.first_name,
          creditsAvailable: user.available_story_credits,
          profileCompleteUrl: "https://storytailor.com/profile"
        }
      });
    }
  }
  
  // Similar for Day 7, Day 14
}
```

---

## Testing Requirements (EXPANDED)

### Additional Test Cases (20+)

**Parent Dashboard**:
1. Verify quota display correct for free user
2. Verify earning opportunities show available actions only
3. Verify completed actions don't show as available
4. Verify story stats accurate
5. Verify recommendations populated (not empty)
6. Verify upgrade suggestion shows when appropriate

**Library Stats**:
7. Verify total counts match actual data
8. Verify popular type calculation correct
9. Verify recent activity shows last 10 actions
10. Verify top stories sorted by plays

**Story/Character Stats**:
11. Verify play counts from consumption_metrics
12. Verify feedback summary aggregates correctly
13. Verify stats null-safe (new stories have 0 plays)

**User List Pagination**:
14. Verify notifications paginate correctly
15. Verify rewards history paginates
16. Verify emotion history paginates

**EventBridge**:
17. Verify rules created in AWS
18. Verify Lambda permissions added
19. Verify Intelligence Curator receives events
20. Verify emails sent on schedule

**Total Test Cases**: 80+ (was 60+)

---

## Updated Success Criteria

### User-Facing UX
- [x] Parent dashboard: quota + earning + stats + recommendations + upgrade CTAs
- [x] Library GET: stats + recent activity + top stories
- [x] Story/character GET: play stats + feedback summaries
- [x] Daily insights: learning + emotional patterns + milestones
- [x] 6 endpoints paginated (stories, characters, libraries, notifications, rewards, emotions)

### Stripe Integration
- [x] All 9 Stripe products verified or created
- [x] Price IDs in config.ts and SSM
- [x] Products match docs pricing

### Email Automation
- [x] 3 EventBridge rules created
- [x] Intelligence Curator integrates PLGNudgeService
- [x] Emails trigger on schedule

### Testing
- [x] 80+ test cases pass
- [x] All UX enhancements verified
- [x] No shortcuts or placeholders

---

**Plan Updated**: December 26, 2025  
**New Total Estimate**: 20-22 hours (was 18-20)  
**New Features Added**: 11  
**New Endpoints Enhanced**: 6  
**New Test Cases**: 20+

