# Comparative Intelligence Guide

**Status**: MANDATORY PATTERN - All insights must follow  
**Version**: 1.0  
**Date**: December 25, 2025  
**Enforcement**: Code review, user testing, mandatory for all insight emails

---

## Core Principle

**Absolute metrics are storage. Comparative judgments are intelligence.**

Users don't care about scores. They care about "better or worse than before, and why?"

---

## The Problem with Absolute Scoring

### Wrong: Absolute Metrics (Not Actionable)

```javascript
Story X: 82/100 effectiveness
Story Y: 76/100 effectiveness
Story Z: 88/100 effectiveness

// User's reaction: "So what? What does 82 mean? What should I do?"
```

**Problems**:
- No context (is 82 good?)
- No baseline (better than what?)
- No action (what should I do?)
- Feels like a grade (judging, not helping)

### Right: Comparative Insights (Actionable)

```javascript
"The Brave Dragon" worked better than your last 3 bedtime stories for Emma:
  • Fell asleep 5 minutes faster (12 min vs 17 min average)
  • Replayed dragon scene 3x (other stories: 0 replays)
  • Mood shift: sad → calm (others: sad → neutral)
  
→ Create more dragon stories for bedtime
```

**Benefits**:
- Clear context (bedtime stories for Emma)
- Baseline comparison (vs her last 3)
- Specific improvements (5 minutes faster)
- Clear action (create more dragon stories)

---

## Implementation Pattern

### Data Structure

```typescript
interface ComparativeInsight {
  subject: string;          // "The Brave Dragon"
  context: string;          // "bedtime stories for Emma"
  comparedTo: string[];     // IDs of baseline stories
  
  improvements: Array<{
    metric: string;         // "sleep_time"
    delta: number;          // -5 (negative = improvement for duration)
    baseline: number;       // 17 minutes average
    interpretation: string; // "5 minutes faster"
  }>;
  
  recommendation: string;   // "Create more dragon stories for bedtime"
  confidence: number;       // 0.9
}
```

### Generation Process

```typescript
async function generateComparativeInsight(
  storyId: string,
  userId: string,
  context: string
): Promise<ComparativeInsight | null> {
  // 1. Get THIS story's metrics
  const storyMetrics = await getConsumptionMetrics(storyId, userId);
  
  // 2. Get user's baseline (last N stories in SAME context)
  const baseline = await getUserBaseline(userId, context, limit: 5);
  
  if (baseline.length < 3) {
    return null; // Not enough baseline data
  }
  
  // 3. Calculate deltas
  const avgEngagement = baseline.reduce((sum, s) => sum + s.engagement, 0) / baseline.length;
  const avgDuration = baseline.reduce((sum, s) => sum + s.duration, 0) / baseline.length;
  
  const engagementDelta = storyMetrics.engagement - avgEngagement;
  const durationDelta = storyMetrics.duration - avgDuration;
  
  // 4. Generate improvements array
  const improvements = [];
  
  if (engagementDelta > 5) {
    improvements.push({
      metric: 'engagement',
      delta: engagementDelta,
      baseline: avgEngagement,
      interpretation: `${engagementDelta.toFixed(0)}% more engaged`
    });
  }
  
  if (durationDelta < -60 && context === 'bedtime') {
    improvements.push({
      metric: 'sleep_time',
      delta: durationDelta,
      baseline: avgDuration,
      interpretation: `Fell asleep ${Math.abs(Math.round(durationDelta / 60))} minutes faster`
    });
  }
  
  // 5. Return insight ONLY if meaningful improvements
  if (improvements.length === 0) {
    return null; // No insight to share
  }
  
  return {
    subject: storyMetrics.title,
    context,
    comparedTo: baseline.map(s => s.id),
    improvements,
    recommendation: `Create more stories like "${storyMetrics.title}" for ${context}`,
    confidence: improvements.length >= 2 ? 0.9 : 0.7
  };
}
```

---

## Context-Aware Baselines

### Why Context Matters

**Wrong**: Compare all stories together (apples to oranges)
```
Emma's average engagement: 72
"The Brave Dragon" engagement: 85
→ "13% better than average"  // Not actionable - average of what?
```

**Right**: Compare within same context (apples to apples)
```
Emma's bedtime story average: 68
Emma's morning story average: 82
"The Brave Dragon" (bedtime): 85
→ "17% better than your bedtime stories"  // Actionable!
```

### Context Categories

```typescript
enum Context {
  BEDTIME = 'bedtime',
  MORNING = 'morning',
  EDUCATIONAL = 'educational',
  THERAPEUTIC = 'therapeutic',
  WEEKEND = 'weekend',
  TRAVEL = 'travel'
}

// Context can be inferred or explicit
function detectContext(story: Story, timestamp: Date): Context {
  // Time-based
  const hour = timestamp.getHours();
  if (hour >= 19 && hour <= 22) return Context.BEDTIME;
  if (hour >= 6 && hour <= 9) return Context.MORNING;
  
  // Tag-based
  if (story.tags.includes('educational')) return Context.EDUCATIONAL;
  if (story.tags.includes('therapeutic')) return Context.THERAPEUTIC;
  
  return Context.WEEKEND; // Default
}
```

---

## Metric Interpretation Rules

### Sleep Time (Bedtime Stories)

```typescript
if (durationDelta < -60) {
  // Fell asleep faster = good
  interpretation: `Fell asleep ${Math.abs(Math.round(durationDelta / 60))} minutes faster`;
}
```

### Engagement Score

```typescript
if (engagementDelta > 5) {
  // Higher engagement = good
  interpretation: `${engagementDelta.toFixed(0)}% more engaged than usual`;
}
```

### Replay Count

```typescript
if (replaysDelta > 0) {
  // Replays indicate love
  interpretation: `Replayed ${replaysDelta} more times (strong interest)`;
}
```

### Completion Rate

```typescript
if (completionDelta > 10) {
  // Higher completion = kept attention
  interpretation: `Completed ${completionDelta}% more of the story`;
}
```

### Pause Patterns

```typescript
if (pausesDelta < -2) {
  // Fewer pauses = more engaged
  interpretation: `${Math.abs(pausesDelta)} fewer interruptions`;
}
```

---

## Email Templates (Comparative Framing)

### Template Structure

```typescript
Subject: [Specific insight]

[Subject] [comparison to baseline]

[Specific improvements, bullet list]

[Single action] [Link]
```

### Example 1: Story Effectiveness

```
Subject: Emma loved "The Brave Dragon"

Emma loved "The Brave Dragon."

Better than your last 3 bedtime stories:
  • Fell asleep 5 minutes faster (12 min vs 17 min average)
  • Replayed dragon scene 3x (other stories: 0 replays)
  • Mood shift: sad → calm (others: sad → neutral)

Create another dragon story? [Link]
```

### Example 2: Character Popularity

```
Subject: Ruby the Fox is Emma's favorite

Ruby the Fox appeared in 5 stories this month.

More than any other character:
  • 3x more than second place (Bella the Bear: 2 stories)
  • 100% completion rate (Emma finishes every Ruby story)
  • Requests Ruby by name

Create another Ruby adventure? [Link]
```

### Example 3: Therapeutic Outcome

```
Subject: Anxiety stories are helping

Emma's anxiety patterns improved this week.

Better than last month's baseline:
  • 4 fewer anxiety check-ins (3 this week vs 7/week before)
  • Sleep improved (15 min vs 20 min to fall asleep)
  • Requested "Brave Heart" story 2x (calming technique working)

Continue pathway? [Yes] [Pause]
```

---

## Never Show Raw Scores

### Storage vs Display

**Store in database** (for calculation):
```sql
story_effectiveness (
  effectiveness_score DECIMAL(5,2), -- 82.50
  engagement_score DECIMAL(5,2)     -- 78.25
)
```

**Display to users** (comparative):
```
"Better than your last 5 stories"
"Top 3 most impactful stories this month"
"Above your average for bedtime"
```

**Never**:
```
❌ "Story effectiveness: 82/100"
❌ "Engagement score: 78.25"
❌ "Overall rating: B+"
```

---

## Minimum Baseline Requirements

### Need Sufficient History

**Minimum requirements**:
- 3 stories in same context (minimum for comparison)
- 5 stories preferred (stable baseline)
- 10+ stories optimal (confident insights)

**Implementation**:
```typescript
async function hasMinimumBaseline(userId: string, context: string): Promise<boolean> {
  const { count } = await supabase
    .from('consumption_metrics')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('context', context);
  
  return (count || 0) >= 3;
}

// If insufficient baseline
if (!await hasMinimumBaseline(userId, context)) {
  return null; // No insight - not enough data
}
```

---

## Comparative Intelligence Checklist

Before sending ANY insight email:
- [ ] Compared to user's OWN baseline (not global average)
- [ ] Baseline is in SAME context (bedtime vs bedtime)
- [ ] Minimum 3 baseline data points
- [ ] Deltas are meaningful (>5% or significant time)
- [ ] Interpretation is clear ("5 minutes faster")
- [ ] Recommendation is specific ("Create more dragon stories")
- [ ] NO raw scores shown ("82/100" forbidden)
- [ ] Confidence >0.7 for comparison

---

## Edge Cases

### New User (No Baseline)

```javascript
// First 3 stories - no comparison possible
if (userStoryCount < 3) {
  return null; // Wait for baseline
}

// OR: Use global baseline cautiously
"Many parents find [story type] helpful for [context]"
// But don't claim user-specific improvement
```

### Context Shift

```javascript
// User usually reads bedtime stories, tries morning story
if (context !== user.primaryContext) {
  // Can't compare across contexts
  return null; // OR use generic encouragement
}
```

### Outlier Detection

```javascript
// Story is 10x better than baseline - suspicious
if (improvement > 10 * baseline) {
  // Verify data, might be error
  logger.warn('Outlier detected', {storyId, improvement, baseline});
  return null; // Don't send potentially wrong insight
}
```

---

## Success Metrics

**Good comparative intelligence shows**:
- User engagement with insights >15% (click recommendation link)
- Positive feedback ("This was helpful!")
- Behavior change (actually create more dragon stories)
- Low unsubscribe rate (<0.2%)

**Poor comparative intelligence shows**:
- Low engagement (<5%)
- Feedback: "Not relevant"
- No behavior change
- Unsubscribe spike

---

## Code Enforcement

### Validate Before Sending

```typescript
interface ComparisonValidation {
  hasBaseline: boolean;
  baselineCount: number;
  deltaSignificant: boolean;
  contextMatch: boolean;
}

function validateComparison(insight: ComparativeInsight): ComparisonValidation {
  return {
    hasBaseline: insight.comparedTo.length >= 3,
    baselineCount: insight.comparedTo.length,
    deltaSignificant: insight.improvements.length > 0,
    contextMatch: true // Would check context consistency
  };
}

// Block send if invalid
const validation = validateComparison(insight);
if (!validation.hasBaseline) {
  throw new Error('Insufficient baseline for comparison');
}
if (!validation.deltaSignificant) {
  return null; // No significant improvement, don't send
}
```

---

## Examples Across Pipeline Types

### Story Effectiveness

```
"The Brave Dragon" worked better for Emma:
  • 5 minutes faster to sleep
  • 3 replays (other bedtime stories: 0)
  • Mood: sad → calm

Create another? [Link]
```

### Character Popularity

```
Ruby the Fox is Emma's #1 character:
  • 5 stories this month (Bella: 2, Max: 1)
  • 100% completion rate
  • Emma requests Ruby by name

Another Ruby adventure? [Link]
```

### Educational Progress

```
Emma's reading improved this month:
  • 3 minutes faster completion (vs last month)
  • 15% more words per minute
  • Asks to read more often (+2x)

Keep the momentum? [Link]
```

### Therapeutic Outcome

```
Bedtime anxiety improving:
  • Falls asleep 8 minutes faster than 2 weeks ago
  • Requests calming stories (vs avoiding bedtime)
  • Reports feeling "brave" (new vocabulary)

Continue pathway? [Yes] [Pause]
```

---

## Sacred Status

This document is marked SACRED in `AGENTS.md`:
- All insights MUST use comparative framing
- Raw scores NEVER shown to users
- Baselines must be user-specific
- Context must match for valid comparison

**Absolute metrics are for engineers, comparative insights are for users.**

