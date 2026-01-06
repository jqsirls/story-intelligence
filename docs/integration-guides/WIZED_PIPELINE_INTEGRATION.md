# Wized + Storytailor Pipeline Integration Guide

**Date**: December 25, 2025  
**Wized Version**: Embed 2.0  
**API Base**: https://api.storytailor.dev/api/v1  
**Status**: ✅ All Pipeline Endpoints Available

---

## Overview

Integrate Storytailor's automatic pipeline intelligence into Webflow using Wized Embed 2.0. No BuildShip needed - Wized connects directly to your REST API.

**Reference**: [Wized Documentation](https://docs.wized.com/)

---

## Architecture

```
Webflow (Design) → Wized (Logic) → Storytailor API → AWS Lambda
```

**No middleware needed** - Wized handles REST API calls, authentication, and data binding.

---

## Step 1: Configure Storytailor App in Wized

### Create App

In [Wized Dashboard](https://app.wized.com):

1. **Apps** → **Create New App**
2. **Name**: Storytailor API
3. **Base URL**: `https://api.storytailor.dev/api/v1`
4. **Auth Type**: Bearer Token
5. **Token Variable**: `v.accessToken`

---

## Step 2: Create Authentication Requests

### Request: Login

```javascript
Name: Login
Method: POST
Endpoint: /auth/login
Body Type: JSON
Body:
{
  "email": v.loginEmail,
  "password": v.loginPassword
}

On Success (Workflow):
  v.accessToken = r.login.data.accessToken
  v.userId = r.login.data.user.id
  v.userEmail = r.login.data.user.email
  Navigate to: /dashboard
```

### Request: Signup

```javascript
Name: Signup
Method: POST
Endpoint: /auth/signup
Body:
{
  "email": v.signupEmail,
  "password": v.signupPassword,
  "firstName": v.firstName,
  "userType": v.userType,
  "referralCode": v.referralCode // Optional
}

On Success:
  v.accessToken = r.signup.data.accessToken
  v.userId = r.signup.data.user.id
  Navigate to: /onboarding
```

---

## Step 3: Pipeline Intelligence Requests

### Consumption Tracking

**Request: Track Play Event**

```javascript
Name: TrackConsumption
Method: POST
Endpoint: /stories/{v.currentStoryId}/consumption
Headers:
  Authorization: Bearer {v.accessToken}
Body:
{
  "eventType": v.playEventType, // "play_start", "play_pause", "play_complete"
  "position": v.currentPosition,
  "duration": v.eventDuration,
  "metadata": {
    "device": "web",
    "context": v.storyContext // "bedtime", "morning", etc.
  }
}

On Success:
  // Silent success - just tracking
```

**When to call**:
- `play_start`: When story begins
- `play_pause`: When user pauses
- `play_complete`: When story finishes
- `replay`: When user replays

**Request: Get Story Metrics**

```javascript
Name: GetStoryMetrics
Method: GET
Endpoint: /stories/{v.currentStoryId}/metrics
Headers:
  Authorization: Bearer {v.accessToken}

On Success:
  v.storyMetrics = r.GetStoryMetrics.data
  // Contains: readCount, engagementScore, replayCount, etc.
```

**Request: Get Story Effectiveness**

```javascript
Name: GetStoryEffectiveness
Method: GET
Endpoint: /stories/{v.currentStoryId}/effectiveness
Headers:
  Authorization: Bearer {v.accessToken}

On Success:
  v.storyEffectiveness = r.GetStoryEffectiveness.data
  // Contains: effectivenessScore, improvements[], recommendation
```

### Email Preferences

**Request: Get Email Preferences**

```javascript
Name: GetEmailPreferences
Method: GET
Endpoint: /users/me/email-preferences
Headers:
  Authorization: Bearer {v.accessToken}

On Success:
  v.emailPrefs = r.GetEmailPreferences.data
  // Contains: insights, marketing, reminders, digestFrequency, quietHours
```

**Request: Update Email Preferences**

```javascript
Name: UpdateEmailPreferences
Method: PATCH
Endpoint: /users/me/email-preferences
Headers:
  Authorization: Bearer {v.accessToken}
Body:
{
  "insights": v.emailPrefsInsights,
  "marketing": v.emailPrefsMarketing,
  "digestFrequency": v.emailPrefsDigestFreq,
  "quietHours": {
    "start": v.quietHoursStart,
    "end": v.quietHoursEnd
  }
}

On Success:
  v.emailPrefs = r.UpdateEmailPreferences.data
  Show success message
```

### Referral & Rewards

**Request: Get Credits**

```javascript
Name: GetCredits
Method: GET
Endpoint: /users/me/credits
Headers:
  Authorization: Bearer {v.accessToken}

On Success:
  v.availableCredits = r.GetCredits.data.availableCredits
  v.creditsFormatted = r.GetCredits.data.formattedAmount
```

**Request: Get Reward History**

```javascript
Name: GetRewards
Method: GET
Endpoint: /users/me/rewards
Headers:
  Authorization: Bearer {v.accessToken}
Parameters:
  limit: 50

On Success:
  v.rewardHistory = r.GetRewards.data.rewards
  v.totalEarned = r.GetRewards.data.totalEarned
  v.totalApplied = r.GetRewards.data.totalApplied
```

**Request: Get Referral Link**

```javascript
Name: GetReferralLink
Method: GET
Endpoint: /users/me/referral-link
Headers:
  Authorization: Bearer {v.accessToken}

On Success:
  v.referralCode = r.GetReferralLink.data.referralCode
  v.referralLink = r.GetReferralLink.data.referralLink
  v.totalReferrals = r.GetReferralLink.data.totalReferrals
  v.nextMilestone = r.GetReferralLink.data.nextMilestone
```

### Insights

**Request: Get Daily Insights**

```javascript
Name: GetDailyInsights
Method: GET
Endpoint: /users/me/insights/daily
Headers:
  Authorization: Bearer {v.accessToken}
Parameters:
  date: v.selectedDate // Optional, defaults to today

On Success:
  v.dailyInsights = r.GetDailyInsights.data
  // Contains: storiesConsumed, topStory, recommendations
```

**Request: Get Top Effective Stories**

```javascript
Name: GetTopStories
Method: GET
Endpoint: /users/me/effectiveness/top-stories
Headers:
  Authorization: Bearer {v.accessToken}
Parameters:
  limit: 10

On Success:
  v.topStories = r.GetTopStories.data.topStories
  // Array of stories with effectiveness scores
```

---

## Step 4: Webflow Page Examples

### Page 1: Story Player with Tracking

**Webflow Elements**:
```html
<!-- Story Player Container -->
<div wized="story-player">
  <h1 wized="story-title">{v.currentStory.title}</h1>
  <img wized="cover-art" src="{v.currentStory.cover_art_url}" />
  
  <audio wized="audio-player" 
         wized-event-play="trackPlayStart"
         wized-event-pause="trackPlayPause"
         wized-event-ended="trackPlayComplete">
    <source src="{v.currentStory.audio_url}" />
  </audio>
  
  <!-- Effectiveness Badge (if available) -->
  <div wized="effectiveness-badge" wized-show="v.storyEffectiveness.effectivenessScore > 70">
    <span>⭐ Highly Effective</span>
    <p>{v.storyEffectiveness.improvements[0].interpretation}</p>
  </div>
</div>
```

**Wized Workflows**:
```javascript
Workflow: "Track Play Start"
Trigger: Audio play event
Actions:
  1. Set v.playEventType = "play_start"
  2. Set v.currentPosition = 0
  3. Run request: TrackConsumption

Workflow: "Track Play Complete"
Trigger: Audio ended event
Actions:
  1. Set v.playEventType = "play_complete"
  2. Run request: TrackConsumption
  3. Run request: GetStoryEffectiveness
  4. Show effectiveness insights (if any)
```

### Page 2: Referral Dashboard

**Webflow Elements**:
```html
<div wized="referral-dashboard">
  <!-- Credits Display -->
  <div wized="credits-card">
    <h2>Available Credits</h2>
    <p wized="credits-amount">{v.creditsFormatted}</p>
    <small>Auto-applies to your next invoice</small>
  </div>
  
  <!-- Referral Link -->
  <div wized="referral-link-card">
    <h3>Your Referral Link</h3>
    <input wized="referral-input" 
           value="{v.referralLink}" 
           readonly />
    <button wized="copy-link" wized-action="copyReferralLink">
      Copy Link
    </button>
  </div>
  
  <!-- Milestone Progress -->
  <div wized="milestone-progress" wized-show="v.nextMilestone">
    <h3>Next Milestone</h3>
    <p>{v.nextMilestone.count - v.totalReferrals} more referrals until {v.nextMilestone.reward}</p>
    <progress value="{v.totalReferrals}" max="{v.nextMilestone.count}"></progress>
  </div>
  
  <!-- Reward History -->
  <div wized="reward-history">
    <h3>Reward History</h3>
    <div wized-list="v.rewardHistory">
      <div wized-item>
        <p>{item.description}</p>
        <span>{item.amount / 100} USD</span>
        <span wized="status-badge">{item.status}</span>
      </div>
    </div>
  </div>
</div>
```

**Wized Page Load**:
```javascript
On Page Load:
  1. Run request: GetCredits
  2. Run request: GetReferralLink
  3. Run request: GetRewards
```

### Page 3: Email Preferences

**Webflow Elements**:
```html
<form wized="email-preferences-form" wized-submit="UpdateEmailPreferences">
  <!-- Category Toggles -->
  <label>
    <input type="checkbox" 
           wized="insights-toggle" 
           wized-bind="v.emailPrefsInsights" />
    Insights Emails
    <small>Daily digests, weekly reports, story effectiveness</small>
  </label>
  
  <label>
    <input type="checkbox" 
           wized="marketing-toggle" 
           wized-bind="v.emailPrefsMarketing" />
    Marketing Emails
    <small>New features, special offers</small>
  </label>
  
  <!-- Digest Frequency -->
  <label>
    Daily Moment:
    <select wized="digest-frequency" wized-bind="v.emailPrefsDigestFreq">
      <option value="morning">Morning</option>
      <option value="evening">Evening</option>
      <option value="off">Off</option>
    </select>
  </label>
  
  <!-- Quiet Hours -->
  <label>
    Quiet Hours Start:
    <input type="time" wized="quiet-start" wized-bind="v.quietHoursStart" />
  </label>
  
  <label>
    Quiet Hours End:
    <input type="time" wized="quiet-end" wized-bind="v.quietHoursEnd" />
  </label>
  
  <button type="submit">Save Preferences</button>
</form>
```

**Wized Page Load**:
```javascript
On Page Load:
  1. Run request: GetEmailPreferences
  2. Populate form fields from v.emailPrefs
```

### Page 4: Insights Dashboard

**Webflow Elements**:
```html
<div wized="insights-dashboard">
  <!-- Daily Summary -->
  <div wized="daily-summary" wized-show="v.dailyInsights.storiesConsumed > 0">
    <h2>Today</h2>
    <p>{v.dailyInsights.storiesConsumed} stories, {v.dailyInsights.totalListenTime} minutes</p>
    
    <!-- Top Story -->
    <div wized="top-story" wized-show="v.dailyInsights.topStory">
      <h3>Favorite: {v.dailyInsights.topStory.title}</h3>
      <p>{v.dailyInsights.topStory.improvement}</p>
    </div>
  </div>
  
  <!-- Top Effective Stories -->
  <div wized="top-effective-stories">
    <h2>Your Most Effective Stories</h2>
    <div wized-list="v.topStories">
      <div wized-item>
        <img src="{item.stories.cover_art_url}" />
        <h3>{item.stories.title}</h3>
        <p>Effectiveness: {item.effectiveness_score}/100</p>
        <p>{item.engagement_vs_baseline > 0 ? '+' : ''}{item.engagement_vs_baseline}% vs baseline</p>
      </div>
    </div>
  </div>
</div>
```

**Wized Page Load**:
```javascript
On Page Load:
  1. Run request: GetDailyInsights
  2. Run request: GetTopStories
```

---

## Step 5: Wized Data Store Variables

### Authentication Variables

```javascript
v.accessToken: string | null
v.userId: string | null
v.userEmail: string | null
v.userType: string | null
```

### Story Variables

```javascript
v.currentStory: object | null
v.currentStoryId: string | null
v.userStories: array
v.storyMetrics: object | null
v.storyEffectiveness: object | null
```

### Pipeline Variables

```javascript
v.availableCredits: number
v.creditsFormatted: string
v.referralCode: string
v.referralLink: string
v.totalReferrals: number
v.nextMilestone: object | null
v.rewardHistory: array
v.emailPrefs: object
v.dailyInsights: object | null
v.topStories: array
```

### Playback Variables

```javascript
v.playEventType: string
v.currentPosition: number
v.eventDuration: number
v.storyContext: string // "bedtime", "morning", etc.
```

---

## Step 6: Wized Workflows

### Workflow: Track Story Play

```javascript
Name: Track Story Play
Trigger: Audio element play event
Conditions: v.currentStoryId is not null
Actions:
  1. Set Variable:
     v.playEventType = "play_start"
     v.currentPosition = 0
  2. Run Request: TrackConsumption
```

### Workflow: Track Story Complete

```javascript
Name: Track Story Complete
Trigger: Audio element ended event
Actions:
  1. Set Variable:
     v.playEventType = "play_complete"
  2. Run Request: TrackConsumption
  3. Wait 1 second
  4. Run Request: GetStoryEffectiveness
  5. If v.storyEffectiveness.improvements.length > 0:
     Show modal: "This story was effective!"
```

### Workflow: Copy Referral Link

```javascript
Name: Copy Referral Link
Trigger: Button click (copy-link button)
Actions:
  1. Copy to clipboard: v.referralLink
  2. Show notification: "Link copied!"
  3. Set Variable: v.showCopiedMessage = true
  4. Wait 3 seconds
  5. Set Variable: v.showCopiedMessage = false
```

---

## Step 7: Webflow + Wized Complete Pages

### Dashboard Page

**Webflow Structure**:
```
┌─────────────────────────────────────┐
│  Welcome back, {v.userEmail}!       │
├─────────────────────────────────────┤
│                                     │
│  📊 Today's Activity                │
│  {v.dailyInsights.storiesConsumed} stories │
│  {v.dailyInsights.totalListenTime} min     │
│                                     │
│  💰 Available Credits               │
│  {v.creditsFormatted}               │
│                                     │
│  🔗 Referral Link                   │
│  [Copy Link]                        │
│                                     │
│  ⭐ Top Effective Stories           │
│  [Story Grid - wized-list]          │
│                                     │
└─────────────────────────────────────┘
```

**Wized Page Load Workflow**:
```javascript
On Page Load:
  1. Run: GetDailyInsights
  2. Run: GetCredits
  3. Run: GetReferralLink
  4. Run: GetTopStories
```

### Story Player Page

**Webflow Structure**:
```
┌─────────────────────────────────────┐
│  {v.currentStory.title}             │
│  ─────────────────────────────────  │
│                                     │
│  [Cover Art]                        │
│                                     │
│  [▶️ Audio Player]                  │
│  [Progress Bar]                     │
│                                     │
│  📊 Effectiveness (if available)    │
│  {v.storyEffectiveness.improvements}│
│                                     │
└─────────────────────────────────────┘
```

**Wized Events**:
- Audio play → TrackConsumption (play_start)
- Audio pause → TrackConsumption (play_pause)
- Audio ended → TrackConsumption (play_complete) + GetStoryEffectiveness

### Preferences Page

**Webflow Structure**:
```
┌─────────────────────────────────────┐
│  Email Preferences                  │
│  ─────────────────────────────────  │
│                                     │
│  ☑️ Insights (daily/weekly)         │
│  ☑️ Marketing                       │
│  ☐ Reminders                        │
│                                     │
│  Daily Moment: [Evening ▼]         │
│  Quiet Hours: [21:00] to [07:00]   │
│                                     │
│  [Save Preferences]                 │
│                                     │
└─────────────────────────────────────┘
```

**Wized Form Submit**:
- Form submit → UpdateEmailPreferences → Show success

---

## Step 8: Comparative Insights Display

### Show Effectiveness Badge

**In Webflow** (on story card):
```html
<div wized="story-card">
  <img src="{item.cover_art_url}" />
  <h3>{item.title}</h3>
  
  <!-- Effectiveness Badge (conditional) -->
  <div wized="effectiveness-badge" 
       wized-show="item.effectiveness_score > 70">
    <span>⭐ Highly Effective</span>
  </div>
</div>
```

### Show Comparative Insights

**After story completes**:
```html
<div wized="effectiveness-modal" wized-show="v.storyEffectiveness.improvements.length > 0">
  <h2>This story was effective!</h2>
  
  <div wized-list="v.storyEffectiveness.improvements">
    <p wized-item>{item.interpretation}</p>
  </div>
  
  <p><strong>Recommendation:</strong> {v.storyEffectiveness.recommendation}</p>
  
  <button wized-action="createSimilarStory">Create Another</button>
</div>
```

---

## Step 9: Real-Time Updates (Optional)

### Supabase Realtime via Wized

**Request: Subscribe to Notifications**

```javascript
Name: SubscribeNotifications
Method: Supabase Realtime
Table: notifications
Filter: user_id = {v.userId}
Event: INSERT

On New Row:
  v.notifications.unshift(payload.new)
  v.unreadCount = v.unreadCount + 1
  Show notification toast
```

**Reference**: [Wized Supabase Real-time](https://docs.wized.com/requests/supabase-requests/database/unsubscribe-real-time)

---

## Step 10: Error Handling

### Wized Error Handling

```javascript
Request: Any Pipeline Request
On Error:
  If status = 401:
    Clear v.accessToken
    Navigate to: /login
  Else if status = 429:
    Show message: "Too many requests, please wait"
  Else if status >= 500:
    Show message: "Server error, please try again"
    Log error to console
  Else:
    Show message: response.error || "Something went wrong"
```

---

## Complete Wized Configuration Checklist

### Apps

- [ ] Storytailor API app created
- [ ] Base URL: `https://api.storytailor.dev/api/v1`
- [ ] Auth: Bearer token from `v.accessToken`

### Requests (15 total)

**Auth** (2):
- [ ] Login
- [ ] Signup

**Stories** (5):
- [ ] GetStories
- [ ] GetStory
- [ ] CreateStory
- [ ] TrackConsumption
- [ ] GetStoryMetrics
- [ ] GetStoryEffectiveness

**Pipeline** (8):
- [ ] GetEmailPreferences
- [ ] UpdateEmailPreferences
- [ ] GetCredits
- [ ] GetRewards
- [ ] GetReferralLink
- [ ] GetDailyInsights
- [ ] GetTopStories

### Variables (20+)

- [ ] Authentication (accessToken, userId, etc.)
- [ ] Story data (currentStory, userStories, etc.)
- [ ] Pipeline data (credits, referrals, insights, etc.)
- [ ] UI state (loading, errors, modals, etc.)

### Workflows (10+)

- [ ] Login flow
- [ ] Story play tracking
- [ ] Effectiveness display
- [ ] Referral link copy
- [ ] Preference updates
- [ ] Error handling

---

## Testing Checklist

### Test in Wized Preview

1. **Login** → Verify token stored
2. **Create story** → Verify appears in library
3. **Play story** → Check network tab for consumption tracking
4. **View referral dashboard** → Verify credits/link display
5. **Update preferences** → Verify saves correctly
6. **View insights** → Verify daily data loads

### Test in Webflow Preview

1. Publish to staging subdomain
2. Test all Wized requests work
3. Verify responsive design
4. Test on mobile
5. Check console for errors

---

## Deployment to Webflow

### Step 1: Publish Wized Project

In Wized:
1. **Settings** → **Publish**
2. Copy Wized script tag

### Step 2: Add to Webflow

In Webflow:
1. **Project Settings** → **Custom Code**
2. **Before </body> tag** → Paste Wized script
3. **Publish** site

### Step 3: Test Live

1. Visit published Webflow site
2. Test all features
3. Monitor for errors
4. Check API logs in CloudWatch

---

## Performance Optimization

### Wized Caching

```javascript
// Cache story list for 5 minutes
Request: GetStories
Cache: 300 seconds
Cache Key: `stories-${v.userId}`
```

### Lazy Loading

```javascript
// Only load insights when dashboard visited
Workflow: "Load Dashboard Data"
Trigger: Navigate to /dashboard
Actions:
  Run: GetDailyInsights
  Run: GetCredits
  Run: GetTopStories
```

---

## Troubleshooting

### Issue: Consumption tracking not working

**Check**:
1. Is database migration applied? (consumption_metrics table exists?)
2. Is request configured correctly in Wized?
3. Check CloudWatch logs for errors

### Issue: Credits showing 0

**Check**:
1. Is database migration applied? (reward_ledger table + function exists?)
2. Has user actually earned credits?
3. Check reward_ledger table directly

### Issue: Effectiveness not calculating

**Check**:
1. Has story been consumed 3+ times OR 7+ days old?
2. Is story_effectiveness table populated?
3. Check CloudWatch logs

---

## Summary: Wized + Storytailor

### ✅ What Works NOW

- Story creation/viewing
- Character management
- Consumption tracking ⭐ NEW
- Email preferences ⭐ NEW
- Referral rewards ⭐ NEW
- Effectiveness insights ⭐ NEW
- Daily insights ⭐ NEW

### 🎯 No BuildShip Needed

- Wized → Your REST API → AWS Lambda
- Direct integration
- No middleware required

### 📚 Resources

- **Wized Docs**: https://docs.wized.com/
- **Webflow API**: https://developers.webflow.com/
- **Storytailor API**: https://api.storytailor.dev/api/v1
- **This Guide**: Complete Wized configuration examples

---

**You're ready to build in Webflow + Wized with full pipeline intelligence!** 🚀

