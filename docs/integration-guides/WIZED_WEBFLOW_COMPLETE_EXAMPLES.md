# Wized + Webflow Complete Integration Examples

**Date**: December 25, 2025  
**Complete Flows**: 8 end-to-end user journeys  
**For**: Design team implementing in Webflow

---

## Example 1: Story Creation with Asset Tracking

### User Journey

```
User fills form → Story created → Assets generate → Track progress → Story ready → Navigate to player
```

### Wized Configuration

**Page**: `/stories/create`

**Requests Needed**:
1. GetCharacters (on page load)
2. GetLibraries (on page load)
3. CreateStory (on form submit)
4. GetAssetStatus (polling)

**Variables**:
```javascript
v.storyTitle: string
v.selectedCharacterId: string
v.selectedLibraryId: string
v.ageRange: string
v.storyLength: string
v.selectedThemes: array
v.generatePDF: boolean
v.createdStory: object
v.assetStatus: object
v.isCreating: boolean
```

**Complete Flow**:

```javascript
// Step 1: Page Load
Workflow: "Load Story Creator"
Trigger: Page load
Actions:
  1. v.isLoading = true
  2. Run: GetCharacters
  3. Run: GetLibraries
  4. v.isLoading = false
  5. v.generatePDF = true // Default to true

// Step 2: Form Submit
Workflow: "Create Story"
Trigger: Form submit
Actions:
  1. v.isCreating = true
  2. Run: CreateStory
  3. v.currentStoryId = v.createdStory.id
  4. Navigate to: `/story/${v.currentStoryId}`

// Step 3: Asset Polling (on story page)
Workflow: "Poll Asset Status"
Trigger: Page load (story page)
Conditions: v.currentStoryId is not null
Actions:
  1. Run: GetAssetStatus
  2. If v.assetStatus.overall != 'complete':
     Wait 5 seconds
     Go to step 1 (loop)
  3. Else:
     v.showCompletionMessage = true
     Run: GetStory (refresh with complete data)

// Step 4: Show Success
Workflow: "Assets Complete"
Trigger: v.assetStatus.overall = 'complete'
Actions:
  1. Show toast: "All assets ready!"
  2. Enable play button
  3. Run: GetStory
```

**Webflow HTML**:
```html
<!-- Create Form Page -->
<form wized="create-form" wized-submit="createStory">
  <input wized-bind="v.storyTitle" placeholder="Story title" required />
  <select wized-bind="v.selectedCharacterId" required>
    <option wized-list="v.userCharacters" wized-item value="{item.id}">
      {item.name}
    </option>
  </select>
  <button type="submit" wized-loading="v.isCreating">Create Story</button>
</form>

<!-- Story Page (Asset Progress) -->
<div wized-show="v.assetStatus.overall != 'complete'" class="asset-progress">
  <h3>Generating Assets...</h3>
  <div class="progress-item">
    <span>Audio: {v.assetStatus.audio}</span>
  </div>
  <div class="progress-item">
    <span>Artwork: {v.assetStatus.art}</span>
  </div>
  <p>ETA: {v.assetStatus.estimatedCompletion}s</p>
</div>

<!-- Story Ready -->
<div wized-show="v.assetStatus.overall = 'complete'">
  <h2>✓ Story Ready!</h2>
  <button wized-action="playStory">Play Now</button>
</div>
```

---

## Example 2: Story Player with Consumption Tracking & Effectiveness

### User Journey

```
Navigate to story → Load story → Play audio → Track consumption → Audio ends → Show effectiveness insights
```

### Wized Configuration

**Page**: `/story/:storyId`

**Requests Needed**:
1. GetStory (on page load)
2. GetStoryMetrics (on page load)
3. TrackConsumption (on play/pause/complete)
4. GetStoryEffectiveness (after play complete)

**Variables**:
```javascript
v.currentStory: object
v.storyMetrics: object
v.storyEffectiveness: object
v.playEventType: string
v.audioCurrentTime: number
v.playStartTime: number
v.showEffectivenessModal: boolean
```

**Complete Flow**:

```javascript
// Step 1: Load Story
Workflow: "Load Story Page"
Trigger: Page load
Actions:
  1. v.currentStoryId = URL.params.storyId
  2. v.isLoading = true
  3. Run: GetStory
  4. Run: GetStoryMetrics
  5. v.isLoading = false

// Step 2: Track Play Start
Workflow: "Track Play Start"
Trigger: Audio play event (element: story-audio)
Actions:
  1. v.playEventType = 'play_start'
  2. v.playStartTime = Date.now()
  3. v.audioCurrentTime = audio.currentTime
  4. Run: TrackConsumption

// Step 3: Track Play Pause
Workflow: "Track Play Pause"
Trigger: Audio pause event
Actions:
  1. v.playEventType = 'play_pause'
  2. v.eventDuration = (Date.now() - v.playStartTime) / 1000
  3. v.audioCurrentTime = audio.currentTime
  4. Run: TrackConsumption

// Step 4: Track Complete & Get Effectiveness
Workflow: "Track Play Complete"
Trigger: Audio ended event
Actions:
  1. v.playEventType = 'play_complete'
  2. v.eventDuration = audio.duration
  3. Run: TrackConsumption
  4. Wait 2 seconds
  5. Run: GetStoryEffectiveness
  6. If v.storyEffectiveness.improvements.length > 0:
     v.showEffectivenessModal = true

// Step 5: Create Similar Story
Workflow: "Create Similar"
Trigger: Click "Create Similar" button in modal
Actions:
  1. v.storyTitle = `Story like "${v.currentStory.title}"`
  2. v.selectedCharacterId = v.currentStory.character.id
  3. v.selectedThemes = v.currentStory.themes
  4. Navigate to: /stories/create
```

**Webflow HTML**:
```html
<div class="story-player">
  <!-- Story Info -->
  <h1>{v.currentStory.title}</h1>
  <img src="{v.currentStory.cover_art_url}" />
  
  <!-- Metrics Display -->
  <div wized-show="v.storyMetrics.readCount > 0">
    <p>You've played this {v.storyMetrics.readCount} times</p>
    <p>Engagement: {v.storyMetrics.engagementScore}/100</p>
  </div>
  
  <!-- Audio Player -->
  <audio id="story-audio" 
         wized-event-play="trackPlayStart"
         wized-event-pause="trackPlayPause"
         wized-event-ended="trackPlayComplete"
         controls>
    <source src="{v.currentStory.audio_url}" />
  </audio>
  
  <!-- Effectiveness Modal (After Play) -->
  <div wized-show="v.showEffectivenessModal" class="modal">
    <h2>⭐ This story was effective!</h2>
    <ul wized-list="v.storyEffectiveness.improvements">
      <li wized-item>{item.interpretation}</li>
    </ul>
    <p>{v.storyEffectiveness.recommendation}</p>
    <button wized-action="createSimilar">Create Another</button>
    <button wized-action="closeModal">Close</button>
  </div>
</div>
```

---

## Example 3: Referral Dashboard with Viral Loop

### User Journey

```
Load dashboard → Show credits → Display referral link → Copy link → Share → Friend signs up → Credits earned
```

### Complete Flow

```javascript
// Step 1: Load Referral Dashboard
Workflow: "Load Referral Dashboard"
Trigger: Page load (/referrals)
Actions:
  1. v.isLoading = true
  2. Run: GetCredits
  3. Run: GetReferralLink
  4. Run: GetRewards
  5. v.isLoading = false

// Step 2: Copy Link
Workflow: "Copy Referral Link"
Trigger: Click copy button
Actions:
  1. navigator.clipboard.writeText(v.referralLink)
  2. v.showCopiedMessage = true
  3. Show toast: "Link copied!"
  4. Wait 3 seconds
  5. v.showCopiedMessage = false

// Step 3: Social Share
Workflow: "Share on Facebook"
Trigger: Click Facebook button
Actions:
  1. Open window: `https://facebook.com/sharer?u=${v.referralLink}`

// Step 4: Auto-Refresh Credits (Real-time)
Workflow: "Watch for New Rewards"
Trigger: Supabase Realtime - reward_ledger INSERT
Filter: user_id = v.userId
Actions:
  1. Run: GetCredits
  2. Run: GetRewards
  3. Show toast: "🎉 New credit earned: $10!"
  4. Confetti animation
```

**Webflow HTML**:
```html
<div class="referral-dashboard">
  <!-- Hero: Credits -->
  <div class="credits-hero">
    <h1>{v.creditsFormatted}</h1>
    <p>Available Credits</p>
  </div>
  
  <!-- Referral Link -->
  <div class="referral-link-card">
    <h3>Share Your Link</h3>
    <p>Earn $10 when friends subscribe</p>
    <div class="link-input-group">
      <input value="{v.referralLink}" readonly />
      <button wized-action="copyReferralLink">
        <span wized-show="!v.showCopiedMessage">Copy</span>
        <span wized-show="v.showCopiedMessage">✓ Copied!</span>
      </button>
    </div>
    
    <!-- Social Share -->
    <div class="social-buttons">
      <button wized-action="shareOnFacebook">Share on Facebook</button>
      <button wized-action="shareOnTwitter">Share on Twitter</button>
      <button wized-action="shareViaEmail">Email to Friend</button>
    </div>
  </div>
  
  <!-- Milestone Progress -->
  <div wized-show="v.nextMilestone" class="milestone-card">
    <h3>Next Milestone: {v.nextMilestone.reward}</h3>
    <progress value="{v.totalReferrals}" max="{v.nextMilestone.count}"></progress>
    <p>{v.nextMilestone.count - v.totalReferrals} more referrals!</p>
  </div>
  
  <!-- Reward History -->
  <div class="reward-history">
    <h3>Reward History</h3>
    <div wized-list="v.rewardHistory" class="reward-list">
      <div wized-item class="reward-item">
        <div>
          <p>{item.description}</p>
          <small>{new Date(item.createdAt).toLocaleDateString()}</small>
        </div>
        <div>
          <span class="amount">${item.amount / 100}</span>
          <span class="status-{item.status}">{item.status}</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## Example 4: User-Type Conditional Routing

### User Journey

```
Login → Detect user type → Route to appropriate dashboard → Show type-specific features
```

### Complete Flow

```javascript
// Step 1: Login
Workflow: "Login"
Trigger: Login form submit
Actions:
  1. Run: Login
  2. v.accessToken = r.Login.data.accessToken
  3. v.userId = r.Login.data.user.id
  4. v.userType = r.Login.data.user.userType
  5. v.isAuthenticated = true
  6. Navigate based on user type (see step 2)

// Step 2: Route by User Type
Workflow: "Route After Login"
Trigger: v.isAuthenticated = true AND v.userType is set
Actions:
  Switch v.userType:
    Case 'parent':
      Navigate to: /dashboard
    Case 'teacher':
      Navigate to: /classroom
    Case 'therapist':
      Navigate to: /clients
    Case 'child':
      Navigate to: /stories
    Case 'admin':
      Navigate to: /admin
    Default:
      Navigate to: /dashboard

// Step 3: Conditional Page Features
Workflow: "Show User-Type Features"
Trigger: Page load (any page)
Actions:
  1. v.showParentFeatures = (v.userType in ['parent', 'guardian', 'grandparent'])
  2. v.showTeacherFeatures = (v.userType in ['teacher', 'librarian'])
  3. v.showTherapistFeatures = (v.userType in ['therapist', 'child_life_specialist'])
  4. v.showB2BFeatures = (v.orgRole = 'admin')
```

**Webflow HTML** (Conditional Navigation):
```html
<nav class="main-nav">
  <!-- Common Links -->
  <a href="/dashboard">Dashboard</a>
  <a href="/stories">Stories</a>
  <a href="/characters">Characters</a>
  
  <!-- Parent-Only Links -->
  <div wized-show="v.showParentFeatures">
    <a href="/referrals">Referrals</a>
    <a href="/insights">Insights</a>
  </div>
  
  <!-- Teacher-Only Links -->
  <div wized-show="v.showTeacherFeatures">
    <a href="/classroom">Classroom</a>
    <a href="/students">Students</a>
    <a href="/batch-create">Batch Create</a>
  </div>
  
  <!-- Therapist-Only Links -->
  <div wized-show="v.showTherapistFeatures">
    <a href="/clients">Clients</a>
    <a href="/progress">Progress Reports</a>
  </div>
  
  <!-- B2B Admin Links -->
  <div wized-show="v.showB2BFeatures">
    <a href="/organization">Organization</a>
    <a href="/members">Team Members</a>
  </div>
</nav>
```

---

## Example 5: Email Preferences Management

### User Journey

```
Navigate to settings → Load preferences → Modify toggles → Save → Show confirmation
```

### Complete Flow

```javascript
// Step 1: Load Preferences
Workflow: "Load Email Preferences"
Trigger: Page load (/settings/email)
Actions:
  1. Run: GetEmailPreferences
  2. v.emailPrefsInsights = v.emailPrefs.insights
  3. v.emailPrefsMarketing = v.emailPrefs.marketing
  4. v.emailPrefsReminders = v.emailPrefs.reminders
  5. v.digestFrequency = v.emailPrefs.digestFrequency
  6. v.insightsFrequency = v.emailPrefs.insightsFrequency
  7. v.quietHoursStart = v.emailPrefs.quietHours.start
  8. v.quietHoursEnd = v.emailPrefs.quietHours.end

// Step 2: Save Preferences
Workflow: "Save Email Preferences"
Trigger: Form submit
Actions:
  1. v.isSaving = true
  2. Run: UpdateEmailPreferences
  3. v.emailPrefs = r.UpdateEmailPreferences.data
  4. Show toast: "Preferences saved successfully"
  5. v.isSaving = false
```

---

## Example 6: Real-Time Notifications

### User Journey

```
User logged in → Subscribe to notifications → New notification arrives → Show toast → Update bell count
```

### Complete Flow

```javascript
// Step 1: Subscribe (on login)
Workflow: "Subscribe to Notifications"
Trigger: v.isAuthenticated = true
Actions:
  1. Supabase Realtime Subscribe:
     Channel: notifications
     Table: notifications
     Event: INSERT
     Filter: user_id = v.userId
  2. On new row:
     v.notifications.unshift(payload.new)
     v.unreadCount = v.unreadCount + 1
     Show toast: payload.new.title

// Step 2: Mark as Read
Workflow: "Mark Notification Read"
Trigger: Click notification item
Actions:
  1. v.selectedNotificationId = item.id
  2. Run: MarkNotificationRead
  3. Update local: v.notifications.find(n => n.id = item.id).read = true
  4. v.unreadCount = v.unreadCount - 1
```

---

## Example 7: Pagination & Infinite Scroll

### User Journey

```
View library → Load page 1 → Click next → Load page 2 → Scroll down → Auto-load more
```

### Pagination Version

```javascript
Workflow: "Next Page"
Trigger: Click next button
Conditions: v.currentPage < v.totalPages
Actions:
  1. v.currentPage = v.currentPage + 1
  2. v.isLoading = true
  3. Run: GetStories
  4. v.isLoading = false
  5. Scroll to top
```

### Infinite Scroll Version

```javascript
Workflow: "Load More Stories"
Trigger: Scroll near bottom (intersection observer)
Conditions: v.hasMoreStories AND !v.isLoadingMore
Actions:
  1. v.isLoadingMore = true
  2. v.currentPage = v.currentPage + 1
  3. Run: GetStories
  4. v.userStories = [...v.userStories, ...r.GetStories.data.stories]
  5. v.hasMoreStories = r.GetStories.data.pagination.hasNext
  6. v.isLoadingMore = false
```

---

## Example 8: Complete User Journey (E2E)

### Full Journey

```
Signup → Create character → Create story → Track progress → Play story → See effectiveness → Refer friend → Earn credit
```

### Step-by-Step Flow

```javascript
// 1. Signup with Referral
Page: /signup
Workflow: Submit signup form
Actions:
  1. v.referralCode = URL.params.ref // From referral link
  2. Run: Signup
  3. v.accessToken = response.data.accessToken
  4. Navigate to: /onboarding

// 2. Create First Character
Page: /onboarding (step 1)
Workflow: Submit character form
Actions:
  1. Run: CreateCharacter
  2. v.firstCharacterId = response.data.character.id
  3. Navigate to: /onboarding?step=2

// 3. Create First Story
Page: /onboarding (step 2)
Workflow: Submit story form
Actions:
  1. v.selectedCharacterId = v.firstCharacterId
  2. Run: CreateStory
  3. Navigate to: /story/{v.createdStory.id}

// 4. Wait for Assets
Page: /story/:id
Workflow: Poll assets
Actions:
  Loop until complete (see Example 1)

// 5. Play Story & Track
Workflow: Audio events
Actions:
  Track play_start, play_complete (see Example 2)

// 6. Show Effectiveness
Workflow: After audio ends
Actions:
  Run: GetStoryEffectiveness
  Show modal with insights

// 7. Get Referral Link
Page: /referrals
Workflow: Page load
Actions:
  1. Run: GetReferralLink
  2. Show referral link
  3. User copies and shares

// 8. Friend Signs Up
(External user clicks referral link)
Workflow: On their signup with v.referralCode
Backend: Issues $10 credit automatically

// 9. Original User Sees Credit
Workflow: Realtime reward_ledger INSERT
Actions:
  1. Run: GetCredits
  2. Show toast: "🎉 $10 credit earned!"
```

---

## Common Patterns Library

### Pattern: Auto-Refresh Token

```javascript
// Global Workflow
Name: "Auto Refresh Token"
Trigger: Any Request Error (status = 401)
Actions:
  1. Run: RefreshToken
  2. If successful:
     v.accessToken = r.RefreshToken.data.accessToken
     Retry original request
  3. If failed:
     v.accessToken = null
     v.isAuthenticated = false
     Navigate to: /login
     Show message: "Please log in again"
```

### Pattern: Form Validation

```javascript
// Before Submit
Workflow: "Validate Form"
Trigger: Form submit
Actions:
  1. v.errors = {}
  2. If !v.storyTitle:
     v.errors.title = "Title is required"
     Cancel submit
  3. If !v.selectedCharacterId:
     v.errors.character = "Please select a character"
     Cancel submit
  4. If v.storyTitle.length < 3:
     v.errors.title = "Title must be at least 3 characters"
     Cancel submit
  5. If no errors:
     Proceed with request
```

### Pattern: Optimistic Updates

```javascript
// Mark notification as read (optimistic)
Workflow: "Mark Read Optimistically"
Trigger: Click notification
Actions:
  1. // Update UI immediately (optimistic)
     v.notifications.find(n => n.id = item.id).read = true
     v.unreadCount = v.unreadCount - 1
  2. // Then make API call
     Run: MarkNotificationRead
  3. // If fails, rollback
     On Error:
       v.notifications.find(n => n.id = item.id).read = false
       v.unreadCount = v.unreadCount + 1
```

### Pattern: Debounced Search

```javascript
// Search Stories
Workflow: "Search Stories"
Trigger: Input change (search input)
Debounce: 500ms
Actions:
  1. v.searchQuery = input.value
  2. v.currentPage = 1
  3. Run: GetStories (includes search param)
```

---

## Testing Checklist

### Test Each Flow

- [ ] Story creation → Assets complete → Player works
- [ ] Consumption tracking → Metrics update → Effectiveness calculates
- [ ] Referral link copy → Share → Credits earned (mock)
- [ ] Email prefs update → Save successful → Verified in database
- [ ] Pagination → Next/prev work → Data loads correctly
- [ ] User-type routing → Correct dashboard → Right features shown
- [ ] Real-time notifications → New item appears → Bell updates
- [ ] Error handling → 401 refreshes token → 429 shows rate limit

### Cross-Browser Testing

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Mobile browsers

### Responsive Testing

- [ ] Mobile (320px - 767px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1025px+)

---

## Summary: 8 Complete Integration Examples

1. **Story Creation** - Form → API → Asset tracking → Player
2. **Story Player** - Load → Play → Track → Effectiveness insights
3. **Referral Dashboard** - Load → Display → Copy link → Viral loop
4. **User-Type Routing** - Login → Detect type → Route → Show features
5. **Email Preferences** - Load → Modify → Save → Confirm
6. **Real-Time Notifications** - Subscribe → Receive → Display → Mark read
7. **Pagination** - Load → Next/prev → Infinite scroll option
8. **Complete Journey** - Signup → Character → Story → Play → Refer → Earn

**All examples include**:
- Complete Wized workflows
- Webflow HTML structure
- Variable management
- Error handling
- Testing checklist

**Use these as templates for building all 19 pages.**

