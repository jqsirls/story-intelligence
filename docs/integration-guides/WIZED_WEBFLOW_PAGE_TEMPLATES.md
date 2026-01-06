# Wized + Webflow Page Templates - All User Types

**Date**: December 25, 2025  
**Total Pages**: 19 templates  
**User Types**: 17 supported  
**For**: Design team building in Webflow

---

## Page Template Index

### Consumer Pages (8) - For Parents/Families
1. Dashboard
2. Story Library
3. Story Player
4. Story Creator
5. Character Gallery
6. Referral Dashboard
7. Email Preferences
8. Account Settings

### Teacher Pages (4) - Educational Focus
9. Classroom Dashboard
10. Batch Story Creator
11. Student Progress
12. Lesson Library

### Therapist Pages (3) - Clinical Focus
13. Client Dashboard
14. Therapeutic Resources (when content built)
15. Progress Reports

### B2B Pages (4) - Organization Admins
16. Organization Dashboard
17. Member Management
18. Shared Library
19. Billing & Usage

---

## Consumer Pages (Parents/Families)

### Page 1: Dashboard

**URL**: `/dashboard`  
**User Type**: Parent, Guardian, Grandparent, Family

**Wized Page Load**:
```javascript
Workflow: "Load Dashboard"
Trigger: Page load
Actions:
  1. Run: GetDailyInsights
  2. Run: GetCredits
  3. Run: GetReferralLink
  4. Run: GetTopStories
  5. Run: GetNotifications (limit: 5)
```

**Webflow Structure**:
```html
<div class="dashboard-container">
  <!-- Header -->
  <header>
    <h1>Welcome back, {v.userName}!</h1>
    <div wized="notification-bell" wized-action="toggleNotifications">
      🔔 <span wized-show="v.unreadCount > 0">{v.unreadCount}</span>
    </div>
  </header>
  
  <!-- Today's Activity -->
  <section wized="daily-activity">
    <h2>Today</h2>
    <div wized-show="v.dailyInsights.storiesConsumed > 0">
      <p>{v.dailyInsights.storiesConsumed} stories, {v.dailyInsights.totalListenTime} minutes</p>
      <div wized-show="v.dailyInsights.topStory">
        <h3>Favorite: {v.dailyInsights.topStory.title}</h3>
        <p>{v.dailyInsights.topStory.improvement}</p>
      </div>
    </div>
    <div wized-show="v.dailyInsights.storiesConsumed = 0">
      <p>No stories today yet. <a href="/stories/create">Create one?</a></p>
    </div>
  </section>
  
  <!-- Available Credits -->
  <section wized="credits-card">
    <h3>Available Credits</h3>
    <p class="amount">{v.creditsFormatted}</p>
    <small>Auto-applies to next invoice</small>
    <a href="/referrals">Earn more →</a>
  </section>
  
  <!-- Top Effective Stories -->
  <section wized="top-stories">
    <h2>Your Most Effective Stories</h2>
    <div wized-list="v.topStories" class="story-grid">
      <div wized-item class="story-card">
        <img src="{item.stories.cover_art_url}" />
        <h3>{item.stories.title}</h3>
        <div class="effectiveness">
          ⭐ {item.effectiveness_score}/100
        </div>
        <p class="comparative">
          {item.engagement_vs_baseline > 0 ? '+' : ''}{item.engagement_vs_baseline}% vs your average
        </p>
        <button wized-action="playStory(item.story_id)">Play</button>
      </div>
    </div>
  </section>
  
  <!-- Quick Actions -->
  <section class="quick-actions">
    <a href="/stories/create" class="btn-primary">Create Story</a>
    <a href="/characters/create" class="btn-secondary">Create Character</a>
  </section>
</div>
```

**Wized Variables Used**:
- `v.userName`, `v.dailyInsights`, `v.creditsFormatted`, `v.topStories`, `v.unreadCount`

---

### Page 2: Story Library

**URL**: `/stories`  
**Features**: Grid view, pagination, filters, sorting

**Wized Page Load**:
```javascript
Workflow: "Load Story Library"
Actions:
  1. v.currentPage = 1
  2. v.perPage = 20
  3. v.sortBy = 'created_at'
  4. v.sortOrder = 'desc'
  5. Run: GetStories
```

**Webflow Structure**:
```html
<div class="library-container">
  <!-- Filters & Sort -->
  <div class="controls">
    <select wized="status-filter" wized-bind="v.filterStatus" wized-change="runGetStories">
      <option value="">All Stories</option>
      <option value="ready">Ready</option>
      <option value="generating">Generating</option>
      <option value="draft">Drafts</option>
    </select>
    
    <select wized="sort-select" wized-bind="v.sortBy" wized-change="runGetStories">
      <option value="created_at">Newest First</option>
      <option value="title">Title A-Z</option>
      <option value="effectiveness_score">Most Effective</option>
    </select>
    
    <select wized="library-filter" wized-bind="v.selectedLibraryId" wized-change="runGetStories">
      <option value="">All Libraries</option>
      <option wized-list="v.userLibraries" wized-item value="{item.id}">
        {item.name}
      </option>
    </select>
  </div>
  
  <!-- Story Grid -->
  <div wized-list="v.userStories" class="story-grid">
    <div wized-item class="story-card">
      <img wized="cover" src="{item.cover_art_url}" alt="{item.title}" />
      
      <!-- Status Badge -->
      <div wized-show="item.status = 'generating'" class="badge generating">
        Generating...
      </div>
      <div wized-show="item.status = 'ready'" class="badge ready">
        Ready
      </div>
      
      <!-- Effectiveness Badge -->
      <div wized-show="item.effectiveness_score > 70" class="badge effective">
        ⭐ Highly Effective
      </div>
      
      <h3>{item.title}</h3>
      <p>{item.character.name}</p>
      <p class="duration">{Math.floor(item.audio_duration / 60)} min</p>
      
      <div class="actions">
        <button wized-action="playStory(item.id)">Play</button>
        <button wized-action="viewDetails(item.id)">Details</button>
      </div>
    </div>
  </div>
  
  <!-- Pagination -->
  <div class="pagination">
    <button wized-show="v.pagination.hasPrev" wized-action="previousPage">
      ← Previous
    </button>
    <span>Page {v.currentPage} of {v.totalPages}</span>
    <button wized-show="v.pagination.hasNext" wized-action="nextPage">
      Next →
    </button>
  </div>
</div>

<!-- Workflows -->
Workflow: "Previous Page"
Actions:
  1. v.currentPage = v.currentPage - 1
  2. Run: GetStories
  3. Scroll to top

Workflow: "Next Page"
Actions:
  1. v.currentPage = v.currentPage + 1
  2. Run: GetStories
  3. Scroll to top
```

---

### Page 3: Story Player

**URL**: `/story/:storyId`  
**Features**: Audio player, consumption tracking, effectiveness insights

**Wized Page Load**:
```javascript
Workflow: "Load Story Player"
Actions:
  1. v.currentStoryId = URL parameter: storyId
  2. Run: GetStory
  3. Run: GetStoryMetrics
  
  // Initialize progressive loading variables
  4. v.storyText = r.GetStory.data.content?.text || null
  5. v.coverUrl = r.GetStory.data.cover_art_url || null
  6. v.beat1Url = r.GetStory.data.scene_art_urls?.[0] || null
  7. v.beat2Url = r.GetStory.data.scene_art_urls?.[1] || null
  8. v.beat3Url = r.GetStory.data.scene_art_urls?.[2] || null
  9. v.beat4Url = r.GetStory.data.scene_art_urls?.[3] || null
  10. v.audioUrl = r.GetStory.data.audio_url || null
  
  // Subscribe to progressive updates if still generating
  11. If r.GetStory.data.asset_generation_status?.overall === 'generating':
      Subscribe to Supabase Realtime channel for story updates
      (See WIZED_PROGRESSIVE_LOADING_GUIDE.md for full code)
```

**Webflow Structure with Progressive Loading**:
```html
<div class="story-player">
  <!-- Story Header -->
  <div class="story-header">
    <!-- Cover Image with Skeleton -->
    <div class="cover-container">
      <!-- Skeleton Loader (show when coverUrl is null) -->
      <div wized-show="v.coverUrl is null" class="skeleton-cover">
        <div class="skeleton-pulse"></div>
      </div>
      <!-- Cover Image (show when coverUrl exists) -->
      <img wized-show="v.coverUrl is not null" 
           class="cover-art" 
           src="{v.coverUrl}" 
           alt="Story cover" />
    </div>
    <div>
      <h1>{v.currentStory.title}</h1>
      <p>By {v.currentStory.character.name}</p>
      <p class="duration">{Math.floor(v.currentStory.audio_duration / 60)} minutes</p>
    </div>
  </div>
  
  <!-- Story Text with Skeleton -->
  <div class="story-text-container">
    <!-- Text Skeleton (show when storyText is null) -->
    <div wized-show="v.storyText is null" class="skeleton-text">
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
    <!-- Story Text (show when storyText exists) -->
    <div wized-show="v.storyText is not null" class="story-text">
      {v.storyText}
    </div>
  </div>
  
  <!-- Beat Images Grid with Individual Skeletons -->
  <div class="beat-images-grid">
    <!-- Beat 1 -->
    <div class="beat-container">
      <div wized-show="v.beat1Url is null" class="skeleton-beat">
        <div class="skeleton-pulse"></div>
      </div>
      <img wized-show="v.beat1Url is not null" 
           src="{v.beat1Url}" 
           alt="Beat 1" 
           class="beat-image" />
    </div>
    
    <!-- Beat 2 -->
    <div class="beat-container">
      <div wized-show="v.beat2Url is null" class="skeleton-beat">
        <div class="skeleton-pulse"></div>
      </div>
      <img wized-show="v.beat2Url is not null" 
           src="{v.beat2Url}" 
           alt="Beat 2" 
           class="beat-image" />
    </div>
    
    <!-- Beat 3 -->
    <div class="beat-container">
      <div wized-show="v.beat3Url is null" class="skeleton-beat">
        <div class="skeleton-pulse"></div>
      </div>
      <img wized-show="v.beat3Url is not null" 
           src="{v.beat3Url}" 
           alt="Beat 3" 
           class="beat-image" />
    </div>
    
    <!-- Beat 4 -->
    <div class="beat-container">
      <div wized-show="v.beat4Url is null" class="skeleton-beat">
        <div class="skeleton-pulse"></div>
      </div>
      <img wized-show="v.beat4Url is not null" 
           src="{v.beat4Url}" 
           alt="Beat 4" 
           class="beat-image" />
    </div>
  </div>
  
  <!-- Audio Player with Conditional Visibility -->
  <div wized-show="v.audioUrl is not null" class="audio-container">
    <audio id="story-audio" 
           wized="audio-player"
           wized-event-play="trackPlayStart"
           wized-event-pause="trackPlayPause"
           wized-event-ended="trackPlayComplete"
           controls>
      <source src="{v.audioUrl}" type="audio/mpeg" />
    </audio>
  </div>
  
  <!-- Audio Skeleton (show when audioUrl is null) -->
  <div wized-show="v.audioUrl is null" class="skeleton-audio">
    <div class="skeleton-pulse"></div>
  </div>
  
  <!-- Consumption Metrics -->
  <div wized="metrics-panel" wized-show="v.storyMetrics.readCount > 0">
    <h3>Your History with This Story</h3>
    <p>Played {v.storyMetrics.readCount} times</p>
    <p>Engagement: {v.storyMetrics.engagementScore}/100</p>
  </div>
  
  <!-- Effectiveness Insights (After Play) -->
  <div wized="effectiveness-panel" 
       wized-show="v.storyEffectiveness.improvements.length > 0"
       class="effectiveness-modal">
    <h2>⭐ This story was effective!</h2>
    <ul wized-list="v.storyEffectiveness.improvements">
      <li wized-item>{item.interpretation}</li>
    </ul>
    <p><strong>Recommendation:</strong> {v.storyEffectiveness.recommendation}</p>
    <button wized-action="createSimilar">Create Similar Story</button>
    <button wized-action="closeModal">Close</button>
  </div>
  
  <!-- Download Links -->
  <div class="downloads">
    <a wized-show="v.currentStory.pdf_url" href="{v.currentStory.pdf_url}" target="_blank">
      Download PDF
    </a>
    <a wized-show="v.currentStory.qr_code_url" href="{v.currentStory.qr_code_url}" target="_blank">
      QR Code
    </a>
  </div>
</div>

<!-- Workflows -->
Workflow: "Track Play Start"
Trigger: Audio play event
Actions:
  1. v.playEventType = 'play_start'
  2. v.playStartTime = Date.now()
  3. v.currentPosition = audio.currentTime
  4. Run: TrackConsumption

Workflow: "Track Play Complete"
Trigger: Audio ended event
Actions:
  1. v.playEventType = 'play_complete'
  2. v.eventDuration = audio.duration
  3. Run: TrackConsumption
  4. Wait 2 seconds
  5. Run: GetStoryEffectiveness
  6. If v.storyEffectiveness.improvements.length > 0:
     Show effectiveness modal
```

---

### Page 4: Story Creator

**URL**: `/stories/create`  
**Features**: Multi-step form, character selection, asset options

**Wized Page Load**:
```javascript
Workflow: "Load Creator"
Actions:
  1. Run: GetCharacters
  2. Run: GetLibraries
  3. v.generatePDF = true
  4. v.generateActivities = true
```

**Webflow Structure** (Multi-step form):
```html
<form wized="create-story-form" wized-submit="createStory">
  <!-- Step 1: Basic Info -->
  <div wized-show="v.formStep = 1">
    <h2>Create a Story</h2>
    <input wized="title-input" 
           wized-bind="v.storyTitle" 
           placeholder="Story title"
           required />
    
    <select wized="character-select" wized-bind="v.selectedCharacterId" required>
      <option value="">Choose a character</option>
      <option wized-list="v.userCharacters" wized-item value="{item.id}">
        {item.name} ({item.species})
      </option>
    </select>
    
    <select wized="library-select" wized-bind="v.selectedLibraryId" required>
      <option wized-list="v.userLibraries" wized-item value="{item.id}">
        {item.name}
      </option>
    </select>
    
    <button type="button" wized-action="nextStep">Next</button>
  </div>
  
  <!-- Step 2: Story Details -->
  <div wized-show="v.formStep = 2">
    <h2>Story Details</h2>
    
    <label>Age Range</label>
    <select wized-bind="v.ageRange">
      <option value="4-6">Ages 4-6</option>
      <option value="7-9">Ages 7-9</option>
      <option value="10-12">Ages 10-12</option>
    </select>
    
    <label>Story Length</label>
    <select wized-bind="v.storyLength">
      <option value="short">Short (5-7 min)</option>
      <option value="medium">Medium (10-12 min)</option>
      <option value="long">Long (15-20 min)</option>
    </select>
    
    <label>Themes</label>
    <div class="theme-checkboxes">
      <label><input type="checkbox" value="adventure" wized-bind="v.themeAdventure" /> Adventure</label>
      <label><input type="checkbox" value="bedtime" wized-bind="v.themeBedtime" /> Bedtime</label>
      <label><input type="checkbox" value="educational" wized-bind="v.themeEducational" /> Educational</label>
      <label><input type="checkbox" value="coping" wized-bind="v.themeCoping" /> Coping Skills</label>
    </div>
    
    <button type="button" wized-action="prevStep">Back</button>
    <button type="button" wized-action="nextStep">Next</button>
  </div>
  
  <!-- Step 3: Asset Generation Options -->
  <div wized-show="v.formStep = 3">
    <h2>Asset Options</h2>
    
    <label>
      <input type="checkbox" wized-bind="v.generatePDF" checked />
      Generate PDF
    </label>
    
    <label>
      <input type="checkbox" wized-bind="v.generateActivities" checked />
      Generate Activities
    </label>
    
    <button type="button" wized-action="prevStep">Back</button>
    <button type="submit" wized-loading="v.isCreatingStory">
      Create Story
    </button>
  </div>
</form>

<!-- Workflows -->
Workflow: "Next Step"
Actions:
  v.formStep = v.formStep + 1

Workflow: "Previous Step"
Actions:
  v.formStep = v.formStep - 1

Workflow: "Create Story"
Trigger: Form submit
Actions:
  1. v.isCreatingStory = true
  2. v.selectedThemes = []
  3. If v.themeAdventure: v.selectedThemes.push('adventure')
  4. If v.themeBedtime: v.selectedThemes.push('bedtime')
  5. If v.themeEducational: v.selectedThemes.push('educational')
  6. If v.themeCoping: v.selectedThemes.push('coping')
  7. Run: CreateStory
  8. Navigate to: /story/{v.createdStory.id}
```

---

### Page 5: Character Gallery

**URL**: `/characters`

**Webflow Structure**:
```html
<div class="character-gallery">
  <header>
    <h1>Your Characters</h1>
    <a href="/characters/create" class="btn-primary">Create Character</a>
  </header>
  
  <div wized-list="v.userCharacters" class="character-grid">
    <div wized-item class="character-card">
      <img src="{item.reference_images?.[0]?.url || item.appearance_url}" alt="{item.name}" />
      <h3>{item.name}</h3>
      <p>{item.traits?.species || 'Unknown species'}</p>
      <p>{item.traits?.personality?.join(', ') || 'No personality traits'}</p>
      
      <!-- Birth Certificate -->
      <div wized-show="item.birth_certificate_url">
        <a href="{item.birth_certificate_url}" target="_blank" class="btn-certificate">
          📜 Birth Certificate
        </a>
      </div>
      
      <button wized-action="viewCharacter(item.id)">View Details</button>
    </div>
  </div>
</div>
```

---

### Page 6: Referral Dashboard

**URL**: `/referrals`

**Wized Page Load**:
```javascript
Workflow: "Load Referral Dashboard"
Actions:
  1. Run: GetCredits
  2. Run: GetReferralLink
  3. Run: GetRewards
```

**Webflow Structure**:
```html
<div class="referral-dashboard">
  <!-- Credits Display -->
  <section class="credits-hero">
    <h1>{v.creditsFormatted}</h1>
    <p>Available Credits</p>
    <small>Automatically applied to your next invoice</small>
  </section>
  
  <!-- Referral Link -->
  <section class="referral-link">
    <h2>Share Your Referral Link</h2>
    <p>Earn $10 when friends subscribe</p>
    
    <div class="link-container">
      <input wized="referral-input" value="{v.referralLink}" readonly />
      <button wized-action="copyReferralLink">
        <span wized-show="!v.showCopiedMessage">Copy Link</span>
        <span wized-show="v.showCopiedMessage">✓ Copied!</span>
      </button>
    </div>
    
    <div class="social-share">
      <a href="https://facebook.com/sharer?u={v.referralLink}" target="_blank">Share on Facebook</a>
      <a href="https://twitter.com/intent/tweet?url={v.referralLink}&text=Check%20out%20Storytailor" target="_blank">Share on Twitter</a>
    </div>
  </section>
  
  <!-- Milestone Progress -->
  <section wized-show="v.nextMilestone" class="milestone">
    <h3>Next Milestone: {v.nextMilestone.reward}</h3>
    <p>{v.nextMilestone.count - v.totalReferrals} more referrals to go!</p>
    <progress value="{v.totalReferrals}" max="{v.nextMilestone.count}"></progress>
    
    <div class="milestones-list">
      <div class="milestone-item" class:achieved="v.totalReferrals >= 3">
        <span>3 referrals</span>
        <span>$5 bonus</span>
      </div>
      <div class="milestone-item" class:achieved="v.totalReferrals >= 5">
        <span>5 referrals</span>
        <span>$10 bonus + 1 month free</span>
      </div>
      <div class="milestone-item" class:achieved="v.totalReferrals >= 10">
        <span>10 referrals</span>
        <span>50% off forever</span>
      </div>
    </div>
  </section>
  
  <!-- Reward History -->
  <section class="reward-history">
    <h2>Reward History</h2>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody wized-list="v.rewardHistory">
        <tr wized-item>
          <td>{item.description}</td>
          <td>${item.amount / 100}</td>
          <td><span class="status-{item.status}">{item.status}</span></td>
          <td>{new Date(item.createdAt).toLocaleDateString()}</td>
        </tr>
      </tbody>
    </table>
  </section>
</div>

<!-- Workflow: Copy Link -->
Workflow: "Copy Referral Link"
Trigger: Click copy button
Actions:
  1. navigator.clipboard.writeText(v.referralLink)
  2. v.showCopiedMessage = true
  3. Wait 3 seconds
  4. v.showCopiedMessage = false
```

---

### Page 7: Email Preferences

**URL**: `/settings/email`

**Webflow Structure**:
```html
<form wized="email-prefs-form" wized-submit="updateEmailPrefs">
  <h1>Email Preferences</h1>
  
  <!-- Category Toggles -->
  <div class="pref-section">
    <h3>Email Categories</h3>
    
    <label class="toggle-label">
      <input type="checkbox" wized-bind="v.emailPrefsInsights" />
      <div>
        <strong>Insights Emails</strong>
        <p>Daily digests, weekly reports, story effectiveness insights</p>
      </div>
    </label>
    
    <label class="toggle-label">
      <input type="checkbox" wized-bind="v.emailPrefsMarketing" />
      <div>
        <strong>Marketing Emails</strong>
        <p>New features, special offers, product updates</p>
      </div>
    </label>
    
    <label class="toggle-label">
      <input type="checkbox" wized-bind="v.emailPrefsReminders" />
      <div>
        <strong>Reminders</strong>
        <p>Trial ending, inactivity nudges, check-in prompts</p>
      </div>
    </label>
    
    <label class="toggle-label disabled">
      <input type="checkbox" checked disabled />
      <div>
        <strong>Transactional Emails</strong>
        <p>Story complete, payment receipts, security alerts (cannot disable)</p>
      </div>
    </label>
  </div>
  
  <!-- Frequency Settings -->
  <div class="pref-section">
    <h3>Email Frequency</h3>
    
    <label>
      Daily Moment:
      <select wized-bind="v.digestFrequency">
        <option value="morning">Morning (with yesterday's digest)</option>
        <option value="evening">Evening (with today's digest)</option>
        <option value="off">Off</option>
      </select>
    </label>
    
    <label>
      Weekly Insights:
      <select wized-bind="v.insightsFrequency">
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="off">Off</option>
      </select>
    </label>
  </div>
  
  <!-- Quiet Hours -->
  <div class="pref-section">
    <h3>Quiet Hours</h3>
    <p>Non-urgent emails will be held during these hours</p>
    
    <label>
      Start:
      <input type="time" wized-bind="v.quietHoursStart" />
    </label>
    
    <label>
      End:
      <input type="time" wized-bind="v.quietHoursEnd" />
    </label>
    
    <label>
      Timezone:
      <select wized-bind="v.userTimezone">
        <option value="America/New_York">Eastern</option>
        <option value="America/Chicago">Central</option>
        <option value="America/Denver">Mountain</option>
        <option value="America/Los_Angeles">Pacific</option>
      </select>
    </label>
  </div>
  
  <button type="submit">Save Preferences</button>
</form>

<!-- Page Load -->
Workflow: "Load Email Preferences"
Trigger: Page load
Actions:
  1. Run: GetEmailPreferences
  2. v.emailPrefsInsights = v.emailPrefs.insights
  3. v.emailPrefsMarketing = v.emailPrefs.marketing
  4. v.emailPrefsReminders = v.emailPrefs.reminders
  5. v.digestFrequency = v.emailPrefs.digestFrequency
  6. v.insightsFrequency = v.emailPrefs.insightsFrequency
  7. v.quietHoursStart = v.emailPrefs.quietHours.start
  8. v.quietHoursEnd = v.emailPrefs.quietHours.end
  9. v.userTimezone = v.emailPrefs.quietHours.timezone

Workflow: "Save Preferences"
Trigger: Form submit
Actions:
  1. Run: UpdateEmailPreferences
  2. Show message: "Preferences saved successfully"
```

---

### Page 8: Account Settings

**URL**: `/settings/account`

Standard account management page with:
- Profile information
- Password change
- Data export
- Account deletion

---

## Teacher Pages

### Page 9: Classroom Dashboard

**URL**: `/classroom` (for teachers)  
**User Type**: teacher, librarian, afterschool_leader

**Wized Page Load**:
```javascript
Workflow: "Load Classroom Dashboard"
Conditions: v.userType in ['teacher', 'librarian', 'afterschool_leader']
Actions:
  1. Run: GetClassroomInsights
  2. Run: GetStudentProfiles
  3. Run: GetTopStories
```

**Webflow Structure**:
```html
<div class="classroom-dashboard">
  <h1>Classroom Overview</h1>
  
  <!-- Class Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <h3>{v.classStats.activeStudents}</h3>
      <p>Active Students</p>
    </div>
    <div class="stat-card">
      <h3>{v.classStats.storiesThisWeek}</h3>
      <p>Stories This Week</p>
    </div>
    <div class="stat-card">
      <h3>{v.classStats.avgEngagement}</h3>
      <p>Avg Engagement</p>
    </div>
  </div>
  
  <!-- Top Performing Students -->
  <section>
    <h2>Top Performers</h2>
    <div wized-list="v.topStudents">
      <div wized-item>{item.name} - {item.engagement}%</div>
    </div>
  </section>
  
  <!-- Students Needing Support -->
  <section>
    <h2>Students Needing Support</h2>
    <div wized-list="v.strugglingStudents">
      <div wized-item class="alert">
        {item.name} - Low engagement: {item.engagement}%
      </div>
    </div>
  </section>
  
  <!-- Quick Actions -->
  <div class="actions">
    <a href="/stories/batch-create" class="btn-primary">Create Stories for Class</a>
    <a href="/reports/weekly" class="btn-secondary">Weekly Report</a>
  </div>
</div>
```

---

### Page 10: Batch Story Creator

**URL**: `/stories/batch-create` (teachers only)

**Features**:
- Create multiple stories at once
- Assign to different students
- Same theme/character for consistency

**Webflow Structure**:
```html
<form wized="batch-creator" wized-submit="createBatchStories">
  <h1>Create Stories for Your Class</h1>
  
  <label>
    Number of Stories:
    <input type="number" wized-bind="v.batchCount" min="1" max="30" value="10" />
  </label>
  
  <label>
    Common Theme:
    <select wized-bind="v.batchTheme">
      <option value="educational">Educational</option>
      <option value="social-skills">Social Skills</option>
      <option value="literacy">Literacy</option>
    </select>
  </label>
  
  <label>
    Character:
    <select wized-bind="v.batchCharacterId">
      <option wized-list="v.userCharacters" wized-item value="{item.id}">
        {item.name}
      </option>
    </select>
  </label>
  
  <button type="submit">Create {v.batchCount} Stories</button>
</form>

Workflow: "Create Batch"
Actions:
  1. v.createdStories = []
  2. For i = 0 to v.batchCount:
     - Set v.storyTitle = `Story ${i+1} for Class`
     - Run: CreateStory
     - v.createdStories.push(r.CreateStory.data.story)
  3. Navigate to: /classroom/batch-status
```

---

## Therapist Pages

### Page 13: Client Dashboard

**URL**: `/clients` (therapists only)  
**User Type**: therapist, child_life_specialist

**Webflow Structure**:
```html
<div class="client-dashboard">
  <h1>Client Progress</h1>
  
  <!-- HIPAA Notice -->
  <div class="hipaa-notice">
    ⚠️ HIPAA-Compliant View. Do not share this screen.
  </div>
  
  <!-- Client List -->
  <div wized-list="v.clientProfiles" class="client-list">
    <div wized-item class="client-card">
      <h3>{item.initials}</h3> <!-- Not full name - HIPAA -->
      <p>Age: {item.age}</p>
      <p>Sessions: {item.sessionCount}</p>
      <p>Progress: {item.pathwayProgress}%</p>
      <button wized-action="viewClient(item.id)">View Details</button>
    </div>
  </div>
  
  <!-- This Week Summary -->
  <section>
    <h2>This Week</h2>
    <p>Sessions completed: {v.weeklyStats.sessionsCompleted}</p>
    <p>Crisis events: {v.weeklyStats.crisisEvents}</p>
    <p>Professional referrals made: {v.weeklyStats.referrals}</p>
  </section>
</div>
```

---

## B2B Pages

### Page 16: Organization Dashboard

**URL**: `/organization` (admins only)

**Wized Page Load**:
```javascript
Workflow: "Load Org Dashboard"
Conditions: v.userRole = 'admin'
Actions:
  1. Run: GetOrganization
  2. Run: GetOrgMembers
  3. Run: GetOrgHealthReport
```

**Webflow Structure**:
```html
<div class="org-dashboard">
  <h1>{v.organization.name}</h1>
  
  <!-- Seat Utilization -->
  <section class="seats">
    <h2>Seat Utilization</h2>
    <progress value="{v.organization.used_seats}" 
              max="{v.organization.seat_count}"></progress>
    <p>{v.organization.used_seats} / {v.organization.seat_count} seats used</p>
    <p class="utilization">{(v.organization.used_seats / v.organization.seat_count * 100).toFixed(0)}% utilization</p>
    
    <button wized-show="v.organization.used_seats >= v.organization.seat_count"
            wized-action="upgradePlan">
      Add More Seats
    </button>
  </section>
  
  <!-- Member List -->
  <section class="members">
    <h2>Team Members</h2>
    <button wized-action="addMember">Add Member</button>
    
    <table wized-list="v.orgMembers">
      <tr wized-item>
        <td>{item.user.email}</td>
        <td>{item.role}</td>
        <td>{item.storiesCreated} stories</td>
        <td>
          <button wized-action="removeMember(item.id)">Remove</button>
        </td>
      </tr>
    </table>
  </section>
  
  <!-- Health Score -->
  <section class="health">
    <h2>Organization Health</h2>
    <div class="health-score">{v.orgHealth.score}/100</div>
    <p>{v.orgHealth.recommendation}</p>
  </section>
</div>
```

---

## Wized Workflows Library

### Common Workflows for All Pages

**Global: Auto-Refresh Token**:
```javascript
Trigger: Any Request Error (401)
Actions:
  1. Run: RefreshToken
  2. If successful:
     Retry original request
  3. If failed:
     Clear v.accessToken
     Navigate to /login
```

**Global: Handle Rate Limiting**:
```javascript
Trigger: Any Request Error (429)
Actions:
  1. Show message: "Too many requests. Please wait 60 seconds."
  2. Disable all buttons
  3. Wait 60 seconds
  4. Enable buttons
```

**Global: Track Page Views**:
```javascript
Trigger: Page load (any page)
Actions:
  1. v.currentPage = window.location.pathname
  2. Log analytics event
```

---

## Summary: 19 Pages Ready for Webflow

### Consumer (8 pages)
1. Dashboard - Daily insights, credits, top stories
2. Story Library - Grid with pagination
3. Story Player - With tracking & effectiveness
4. Story Creator - Multi-step form
5. Character Gallery - With Birth Certificates
6. Referral Dashboard - Credits, rewards, viral loop
7. Email Preferences - Complete control panel
8. Account Settings - Profile management

### Teachers (4 pages)
9. Classroom Dashboard - Student engagement
10. Batch Creator - Multiple stories
11. Student Progress - Individual insights
12. Lesson Library - Curriculum stories

### Therapists (3 pages)
13. Client Dashboard - HIPAA-compliant
14. Therapeutic Resources - Coping programs
15. Progress Reports - Outcome tracking

### B2B (4 pages)
16. Organization Dashboard - Seat utilization
17. Member Management - Add/remove team
18. Shared Library - Org-wide stories
19. Billing & Usage - Cost optimization

---

**All pages include**:
- Wized request configurations
- Webflow HTML structure
- Data binding patterns
- Workflow automations
- Responsive design considerations

