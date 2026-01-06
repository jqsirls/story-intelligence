# Wized Complete API Reference - All 130+ Storytailor Endpoints

**Date**: December 26, 2025  
**Total Endpoints**: 150+ (131 original + 19 new commerce/PLG/UX endpoints)  
**API Base**: `https://api.storytailor.dev/api/v1`  
**Wized Version**: Embed 2.0  
**Documentation**: https://docs.wized.com/

## New Features (December 26, 2025)

### Commerce & Subscriptions
- Individual and organization checkout endpoints
- Subscription management (status, cancel, upgrade)
- Story packs (5, 10, 25 story credits)
- Gift cards (1, 3, 6, 12 month subscriptions with stacking)

### Product-Led Growth (PLG)
- Earning opportunities endpoint
- Story credit earning system (profile completion, smart home, referrals)
- Free tier limits (2 base stories + earnable credits)

### Pagination
- All list endpoints now support pagination (`page`, `limit` parameters)
- Consistent pagination response with `total`, `totalPages`, `hasNext`, `hasPrevious`

### Feedback System
- Story and character feedback endpoints
- Sentiment tracking (positive/neutral/negative)
- Rating system (1-5 stars)
- Support alerts for negative feedback

### UX Enhancements
- Enhanced parent dashboard with quota, earning opportunities, stats
- Library stats (totals, activity, top stories)
- Story/character stats (plays, completions, feedback summary)

---

## Progressive Loading with Supabase Realtime

All AI generation endpoints (story creation, character art, asset generation) return Supabase Realtime metadata for progressive loading. Assets appear in the UI as they complete.

### Response Format

```json
{
  "success": true,
  "data": {
    "id": "story_123",
    "title": "My Story",
    "realtimeChannel": "stories:id=story_123",
    "subscribePattern": {
      "table": "stories",
      "filter": "id=eq.story_123",
      "event": "UPDATE"
    }
  }
}
```

### Wized Supabase Realtime Integration

**1. Initialize Supabase Client** (in Wized App Settings → Custom Code):

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lendybmmnlqelrhkhdyc.supabase.co',
  'YOUR_SUPABASE_ANON_KEY'
)
```

**2. Subscribe to Story Updates** (in Wized Workflow):

```javascript
// After story creation response
const storyId = r.CreateStory.data.id
const channel = supabase
  .channel(`stories:id=${storyId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'stories',
    filter: `id=eq.${storyId}`
  }, (payload) => {
    // Update UI as assets complete
    if (payload.new.audio_url) {
      v.storyAudioUrl = payload.new.audio_url
      // Show audio player
    }
    if (payload.new.cover_url) {
      v.storyCoverUrl = payload.new.cover_url
      // Update cover image
    }
    // Individual beat images (progressive loading)
    const status = payload.new.asset_generation_status?.assets || {};
    if (status.scene_1?.status === 'ready' && payload.new.scene_art_urls?.[0]) {
      v.storyBeat1Url = payload.new.scene_art_urls[0];
      // Show beat 1 image
    }
    if (status.scene_2?.status === 'ready' && payload.new.scene_art_urls?.[1]) {
      v.storyBeat2Url = payload.new.scene_art_urls[1];
      // Show beat 2 image
    }
    if (status.scene_3?.status === 'ready' && payload.new.scene_art_urls?.[2]) {
      v.storyBeat3Url = payload.new.scene_art_urls[2];
      // Show beat 3 image
    }
    if (status.scene_4?.status === 'ready' && payload.new.scene_art_urls?.[3]) {
      v.storyBeat4Url = payload.new.scene_art_urls[3];
      // Show beat 4 image
    }
  })
  .subscribe()

// Store channel for cleanup
v.realtimeChannels = v.realtimeChannels || []
v.realtimeChannels.push(channel)
```

**3. Character Art Updates**:

```javascript
// After character creation
const characterId = r.CreateCharacter.data.id
const channel = supabase
  .channel(`characters:id=${characterId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'characters',
    filter: `id=eq.${characterId}`
  }, (payload) => {
    if (payload.new.reference_images) {
      v.characterImages = payload.new.reference_images
      // Update character images
    }
    if (payload.new.appearance_url) {
      v.characterAppearanceUrl = payload.new.appearance_url
      // Update appearance
    }
  })
  .subscribe()
```

**4. Cleanup on Page Unload**:

```javascript
// In Wized Page Settings → On Page Unload
if (v.realtimeChannels) {
  v.realtimeChannels.forEach(channel => {
    supabase.removeChannel(channel)
  })
  v.realtimeChannels = []
}
```

### Asset Status Indicators

Use skeleton loaders while assets generate:

```javascript
// Story creation response
v.storyStatus = 'generating'
v.storyAudioStatus = 'pending'
v.storyCoverStatus = 'pending'
v.storyBeatImagesStatus = 'pending'

// Realtime updates
if (payload.new.audio_url) {
  v.storyAudioStatus = 'ready'
}
if (payload.new.cover_url) {
  v.storyCoverStatus = 'ready'
}
if (payload.new.beat_images && payload.new.beat_images.length === 4) {
  v.storyBeatImagesStatus = 'ready'
}
```

---

## Wized App Configuration

### Create Storytailor API App

In Wized Dashboard → Apps → Create New App:

```javascript
{
  "name": "Storytailor API",
  "baseUrl": "https://api.storytailor.dev/api/v1",
  "authType": "bearer",
  "tokenVariable": "v.accessToken",
  "headers": {
    "Content-Type": "application/json"
  }
}
```

---

## Category 1: Authentication (5 endpoints)

### 1.1 Signup

```javascript
// Wized Request Configuration
Name: Signup
Method: POST
Endpoint: /auth/signup
Body: {
  "email": v.signupEmail,
  "password": v.signupPassword,
  "firstName": v.firstName,
  "lastName": v.lastName,
  "userType": v.userType, // parent, teacher, therapist, etc.
  "age": v.userAge,
  "referralCode": v.referralCode // Optional
}

// On Success Workflow
v.accessToken = r.Signup.data.accessToken
v.refreshToken = r.Signup.data.refreshToken
v.userId = r.Signup.data.user.id
v.userEmail = r.Signup.data.user.email
v.userType = r.Signup.data.user.userType
Navigate to: /onboarding

// On Error
If status = 400: Show "Email already exists"
If status = 422: Show "Invalid email or password"
```

### 1.2 Login

```javascript
Name: Login
Method: POST
Endpoint: /auth/login
Body: {
  "email": v.loginEmail,
  "password": v.loginPassword
}

// On Success
v.accessToken = r.Login.data.accessToken
v.refreshToken = r.Login.data.refreshToken
v.userId = r.Login.data.user.id
v.userType = r.Login.data.user.userType

// User-Type Routing
If v.userType = 'parent': Navigate to /dashboard
If v.userType = 'teacher': Navigate to /classroom
If v.userType = 'therapist': Navigate to /clients
If v.userType = 'child': Navigate to /stories
```

### 1.3 Refresh Token

```javascript
Name: RefreshToken
Method: POST
Endpoint: /auth/refresh
Body: {
  "refreshToken": v.refreshToken
}

// On Success
v.accessToken = r.RefreshToken.data.accessToken
v.refreshToken = r.RefreshToken.data.refreshToken

// Auto-Refresh Pattern
Global Event: Request Error (401)
Actions:
  1. Run Request: RefreshToken
  2. If successful: Retry original request
  3. If failed: Navigate to /login
```

### 1.4 Logout

```javascript
Name: Logout
Method: POST
Endpoint: /auth/logout

// On Success
v.accessToken = null
v.refreshToken = null
v.userId = null
v.userType = null
Navigate to: /login
```

### 1.5 Forgot Password

```javascript
Name: ForgotPassword
Method: POST
Endpoint: /auth/forgot-password
Body: {
  "email": v.resetEmail
}

// On Success
Show message: "Password reset email sent"
v.showResetConfirmation = true
```

---

## Category 2: Stories (15 endpoints)

### 2.1 List Stories (with Pagination)

```javascript
Name: GetStories
Method: GET
Endpoint: /stories
Params: {
  "page": v.currentPage || 1,
  "perPage": v.perPage || 20,
  "sort": v.sortBy || "created_at",
  "order": v.sortOrder || "desc",
  "status": v.filterStatus, // draft, generating, ready, failed
  "libraryId": v.selectedLibraryId
}

// On Success
v.userStories = r.GetStories.data.stories
v.pagination = r.GetStories.data.pagination
v.currentPage = r.GetStories.data.pagination.page
v.totalPages = r.GetStories.data.pagination.totalPages

// Response Structure
{
  success: true,
  data: {
    stories: [
      {
        id: "uuid",
        title: "The Brave Dragon",
        cover_art_url: "https://...",
        audio_url: "https://...",
        audio_duration: 720,
        status: "ready",
        created_at: "2025-12-20T19:30:00Z",
        character: {
          id: "uuid",
          name: "Ruby the Fox",
          headshot_url: "https://..."
        },
        effectiveness_score: 87.5 // From pipeline
      }
    ],
    pagination: {
      page: 1,
      perPage: 20,
      total: 145,
      totalPages: 8,
      hasNext: true,
      hasPrev: false
    }
  }
}

// Webflow Binding
<div wized-list="v.userStories">
  <div wized-item class="story-card">
    <img wized="cover-art" src="{item.cover_art_url}" alt="{item.title}" />
    <h3 wized="story-title">{item.title}</h3>
    <p wized="character-name">{item.character.name}</p>
    <div wized-show="item.effectiveness_score > 70" class="effectiveness-badge">
      ⭐ {item.effectiveness_score}/100
    </div>
    <button wized-action="playStory(item.id)">Play</button>
  </div>
</div>

// Pagination Controls
<button wized-show="v.pagination.hasPrev" 
        wized-action="previousPage">← Previous</button>
<span>Page {v.currentPage} of {v.totalPages}</span>
<button wized-show="v.pagination.hasNext" 
        wized-action="nextPage">Next →</button>
```

### 2.2 Get Single Story

```javascript
Name: GetStory
Method: GET
Endpoint: /stories/{v.currentStoryId}

// On Success
v.currentStory = r.GetStory.data

// Response Structure
{
  success: true,
  data: {
    id: "uuid",
    title: "The Brave Dragon",
    content: "Once upon a time...",
    cover_art_url: "https://...",
    scene_art_urls: ["https://...", "https://..."],
    audio_url: "https://...",
    webvtt_url: "https://...",
    audio_duration: 720,
    pdf_url: "https://...",
    qr_code_url: "https://...",
    activities: [{...}],
    character: {
      id: "uuid",
      name: "Ruby",
      species: "fox",
      headshot_url: "https://..."
    },
    status: "ready",
    asset_generation_status: {
      overall: "complete",
      audio: "complete",
      art: "complete",
      pdf: "complete",
      activities: "complete"
    },
    created_at: "2025-12-20T19:30:00Z"
  }
}
```

### 2.3 Create Story

```javascript
Name: CreateStory
Method: POST
Endpoint: /stories
Body: {
  "title": v.storyTitle,
  "character_id": v.selectedCharacterId,
  "library_id": v.selectedLibraryId,
  "age_range": v.ageRange, // "4-6", "7-9", "10-12"
  "story_length": v.storyLength, // "short", "medium", "long"
  "themes": v.selectedThemes, // ["adventure", "bedtime"]
  "educational_focus": v.educationalFocus,
  "moral_lesson": v.moralLesson,
  "generate_assets": {
    "audio": true,
    "art": true,
    "pdf": v.generatePDF,
    "activities": v.generateActivities,
    "qr_code": false
  }
}

// On Success
v.createdStory = r.CreateStory.data.story
v.currentStoryId = r.CreateStory.data.story.id
v.estimatedCompletion = r.CreateStory.data.estimatedCompletionTime
Navigate to: /story/{v.currentStoryId}

// Start Polling Asset Status
Run Request: GetAssetStatus
Wait 5 seconds
If v.assetStatus.overall != 'complete': Repeat
```

### 2.4 Update Story

```javascript
Name: UpdateStory
Method: PATCH
Endpoint: /stories/{v.currentStoryId}
Body: {
  "title": v.storyTitle,
  "content": v.storyContent
}
```

### 2.5 Delete Story

```javascript
Name: DeleteStory
Method: DELETE
Endpoint: /stories/{v.storyId}

// On Success
Remove item from v.userStories array
Show message: "Story deleted"
```

### 2.6-2.15 Additional Story Endpoints

- `POST /stories/:id/duplicate` - Duplicate story
- `POST /stories/:id/regenerate` - Regenerate content
- `GET /stories/:id/assets/status` - Asset generation status
- `GET /stories/:id/assets/stream` - SSE real-time updates
- `POST /stories/:id/assets/cancel` - Cancel generation
- `POST /stories/:id/assets/retry` - Retry failed assets
- `POST /stories/:id/qr` - Generate QR code
- `GET /stories/:id/audio` - Get audio
- `GET /stories/:id/webvtt` - Get captions
- `GET /stories/:id/pdf` - Get PDF

---

## Category 3: Characters (8 endpoints)

### 3.1 List Characters

```javascript
Name: GetCharacters
Method: GET
Endpoint: /characters
Params: {
  "page": v.currentPage || 1,
  "perPage": 20,
  "libraryId": v.selectedLibraryId
}

// On Success
v.userCharacters = r.GetCharacters.data.characters
v.characterPagination = r.GetCharacters.data.pagination

// Webflow Binding
<div wized-list="v.userCharacters">
  <div wized-item class="character-card">
    <!-- Use first reference image (headshot) or appearance_url as fallback -->
    <img src="{item.reference_images?.[0]?.url || item.appearance_url || '/placeholder-character.png'}" 
         alt="{item.name}" />
    <h3>{item.name}</h3>
    <p class="species">{item.traits?.species || 'Unknown species'}</p>
    <p class="personality">{item.traits?.personality?.join(', ') || 'No traits'}</p>
    <div wized-show="item.birth_certificate_url">
      <a href="{item.birth_certificate_url}" target="_blank">
        Download Birth Certificate
      </a>
    </div>
  </div>
</div>
```

### 3.2 Get Single Character

```javascript
Name: GetCharacter
Method: GET
Endpoint: /characters/{v.characterId}

// On Success
v.currentCharacter = r.GetCharacter.data

// Response includes:
// - id, library_id, name
// - traits (JSONB object with personality, species, age, etc.)
// - art_prompt, appearance_url
// - reference_images (array of {type, url, prompt, traitsValidated, createdAt})
// - created_at, updated_at
```

### 3.3 Create Character

```javascript
Name: CreateCharacter
Method: POST
Endpoint: /characters
Body: {
  "name": v.characterName,
  "libraryId": v.selectedLibraryId,  // Optional: uses default library if not provided
  "traits": {
    "personality": v.personalityTraits,  // Array: ["brave", "curious", "kind"]
    "species": v.characterSpecies,       // String: "unicorn", "human", etc.
    "age": v.characterAge,               // Number
    "abilities": v.specialAbilities      // Array or object
  },
  "artPrompt": v.artPrompt,              // Optional: text description for visualization
  "appearanceUrl": v.appearanceUrl       // Optional: URL to character image
}

// On Success
v.createdCharacter = r.CreateCharacter.data.character
v.characterArtStatus = r.CreateCharacter.data.assetsStatus.referenceImages // "generating"
v.realtimeChannel = r.CreateCharacter.data.realtimeChannel // "characters:id=<characterId>"

// Subscribe to character art updates (see Progressive Loading section)
Navigate to: /character/{v.createdCharacter.id}
```

**Note**: 
- The old fields (`species`, `personality_traits`, `backstory`, `special_abilities`, `library_id`) are no longer supported. All character data should be in the `traits` object (JSONB).
- The `libraryId` field is optional - if not provided, the system uses the user's default library or creates one.
- **Character art generation is automatic**: After character creation, art generation is triggered asynchronously. Use Supabase Realtime to receive updates when `reference_images` and `appearance_url` are ready.

### 3.4 Update Character

```javascript
Name: UpdateCharacter
Method: PUT
Endpoint: /characters/{v.characterId}
Body: {
  "name": v.characterName,              // Optional
  "traits": {                           // Optional: partial update
    "personality": v.personalityTraits,
    "species": v.characterSpecies,
    "age": v.characterAge
  },
  "artPrompt": v.artPrompt,            // Optional: null to clear
  "appearanceUrl": v.appearanceUrl      // Optional: null to clear
}

// On Success
v.updatedCharacter = r.UpdateCharacter.data
```

**Note**: Only include fields you want to update. The `traits` object can be partially updated (only include the properties you want to change).

### 3.5-3.8 Additional Character Endpoints

- `GET /characters/:id` - Get single character
- `DELETE /characters/:id` - Delete character
- `POST /characters/:id/regenerate` - Regenerate images (if supported)
- Transfer endpoints

---

## Category 4: Pipeline Intelligence (10 endpoints - NEW)

### 4.1 Track Consumption

```javascript
Name: TrackConsumption
Method: POST
Endpoint: /stories/{v.currentStoryId}/consumption
Body: {
  "eventType": v.playEventType, // play_start, play_pause, play_complete, replay
  "position": v.audioCurrentTime,
  "duration": v.eventDuration,
  "metadata": {
    "device": "web",
    "context": v.storyContext, // bedtime, morning, etc.
    "browser": navigator.userAgent
  }
}

// Wized Audio Player Events
Audio Element ID: story-audio

Workflow: "Track Play Start"
Trigger: Audio play event
Actions:
  1. v.playEventType = 'play_start'
  2. v.playStartTime = Date.now()
  3. v.audioCurrentTime = audio.currentTime
  4. Run Request: TrackConsumption

Workflow: "Track Play Pause"
Trigger: Audio pause event
Actions:
  1. v.playEventType = 'play_pause'
  2. v.eventDuration = (Date.now() - v.playStartTime) / 1000
  3. Run Request: TrackConsumption

Workflow: "Track Play Complete"
Trigger: Audio ended event
Actions:
  1. v.playEventType = 'play_complete'
  2. v.eventDuration = audio.duration
  3. Run Request: TrackConsumption
  4. Wait 2 seconds
  5. Run Request: GetStoryEffectiveness
```

### 4.2 Get Story Metrics

```javascript
Name: GetStoryMetrics
Method: GET
Endpoint: /stories/{v.storyId}/metrics

// Response
{
  success: true,
  data: {
    storyId: "uuid",
    userId: "uuid",
    readCount: 3,
    totalDurationSeconds: 720,
    completionRate: 95.5,
    replayCount: 2,
    engagementScore: 85.2,
    firstReadAt: "2025-12-20T19:30:00Z",
    lastReadAt: "2025-12-24T20:15:00Z"
  }
}

// Webflow Display
<div wized="metrics-panel">
  <p>Played {v.storyMetrics.readCount} times</p>
  <p>Engagement: {v.storyMetrics.engagementScore}/100</p>
  <p>Last played: {v.storyMetrics.lastReadAt}</p>
</div>
```

### 4.3 Get Story Effectiveness (Comparative)

```javascript
Name: GetStoryEffectiveness
Method: GET
Endpoint: /stories/{v.storyId}/effectiveness

// Response (Comparative Intelligence)
{
  success: true,
  data: {
    effectivenessScore: 87.5,
    moodImpact: {
      before: "worried",
      after: "calm",
      delta: 2
    },
    engagementVsBaseline: 15.2, // +15% vs user's average
    completionVsBaseline: -300, // -5 minutes
    improvements: [
      {
        metric: "engagement",
        delta: 15.2,
        interpretation: "15% more engaging than usual"
      },
      {
        metric: "sleep_time",
        delta: -300,
        interpretation: "Fell asleep 5 minutes faster"
      }
    ],
    recommendation: "Create more dragon stories for bedtime",
    confidence: 0.92
  }
}

// Webflow Display (Comparative - Not Absolute!)
<div wized="effectiveness-modal" 
     wized-show="v.storyEffectiveness.improvements.length > 0">
  <h2>⭐ This story was effective!</h2>
  <ul wized-list="v.storyEffectiveness.improvements">
    <li wized-item>{item.interpretation}</li>
  </ul>
  <p><strong>Recommendation:</strong> {v.storyEffectiveness.recommendation}</p>
  <button wized-action="createSimilar">Create Another</button>
</div>
```

### 4.4 Get Email Preferences

```javascript
Name: GetEmailPreferences
Method: GET
Endpoint: /users/me/email-preferences

// Response
{
  success: true,
  data: {
    transactional: true,
    insights: true,
    marketing: false,
    reminders: true,
    digestFrequency: 'evening', // morning, evening, off
    insightsFrequency: 'weekly', // weekly, monthly, off
    quietHours: {
      start: '21:00',
      end: '07:00',
      timezone: 'America/New_York'
    },
    dailyMoment: 'evening'
  }
}

// On Success
v.emailPrefs = r.GetEmailPreferences.data
```

### 4.5 Update Email Preferences

```javascript
Name: UpdateEmailPreferences
Method: PATCH
Endpoint: /users/me/email-preferences
Body: {
  "insights": v.emailPrefsInsights,
  "marketing": v.emailPrefsMarketing,
  "reminders": v.emailPrefsReminders,
  "digestFrequency": v.digestFrequency,
  "insightsFrequency": v.insightsFrequency,
  "quietHours": {
    "start": v.quietHoursStart,
    "end": v.quietHoursEnd,
    "timezone": v.userTimezone
  }
}

// On Success
v.emailPrefs = r.UpdateEmailPreferences.data
Show message: "Preferences saved"
```

### 4.6 Get Credits

```javascript
Name: GetCredits
Method: GET
Endpoint: /users/me/credits

// Response
{
  success: true,
  data: {
    availableCredits: 1500, // In cents
    formattedAmount: "$15.00"
  }
}

// Webflow Display
<div wized="credits-display">
  <h2>{v.creditsFormatted}</h2>
  <p>Available credits</p>
  <small>Auto-applies to next invoice</small>
</div>
```

### 4.7 Get Reward History

```javascript
Name: GetRewards
Method: GET
Endpoint: /users/me/rewards
Params: {
  "limit": 50
}

// Response
{
  success: true,
  data: {
    rewards: [
      {
        id: "uuid",
        source: "referral", // referral, story_share, milestone_bonus
        amount: 1000,
        description: "Referral reward - Sarah subscribed",
        status: "applied",
        appliedAt: "2025-12-20T..."
      }
    ],
    totalEarned: 2500,
    totalApplied: 1000,
    available: 1500
  }
}

// Webflow Display
<div wized-list="v.rewardHistory">
  <div wized-item class="reward-item">
    <p>{item.description}</p>
    <span class="amount">${item.amount / 100}</span>
    <span class="status status-{item.status}">{item.status}</span>
    <small>{item.appliedAt}</small>
  </div>
</div>
```

### 4.8 Get Referral Link

```javascript
Name: GetReferralLink
Method: GET
Endpoint: /users/me/referral-link

// Response
{
  success: true,
  data: {
    referralCode: "ST12345678",
    referralLink: "https://storytailor.com/signup?ref=ST12345678",
    totalReferrals: 4,
    nextMilestone: {
      count: 5,
      reward: "$10 bonus + 1 month free"
    }
  }
}

// Webflow Display
<div wized="referral-dashboard">
  <h3>Your Referral Link</h3>
  <input wized="referral-input" 
         value="{v.referralLink}" 
         readonly />
  <button wized-action="copyReferralLink">Copy Link</button>
  
  <div wized-show="v.nextMilestone" class="milestone-progress">
    <p>{v.nextMilestone.count - v.totalReferrals} more until {v.nextMilestone.reward}</p>
    <progress value="{v.totalReferrals}" max="{v.nextMilestone.count}"></progress>
  </div>
  
  <p>Total Referrals: {v.totalReferrals}</p>
</div>

// Copy Link Workflow
Workflow: "Copy Referral Link"
Trigger: Click copy button
Actions:
  1. navigator.clipboard.writeText(v.referralLink)
  2. v.showCopiedMessage = true
  3. Wait 3 seconds
  4. v.showCopiedMessage = false
```

### 4.9 Get Daily Insights

```javascript
Name: GetDailyInsights
Method: GET
Endpoint: /users/me/insights/daily
Params: {
  "date": v.selectedDate // Optional, defaults to today
}

// Response
{
  success: true,
  data: {
    userId: "uuid",
    date: "2025-12-24",
    storiesConsumed: 3,
    totalListenTime: 45, // Minutes
    charactersUsed: ["Ruby", "Max"],
    topStory: {
      id: "uuid",
      title: "The Brave Dragon",
      engagement: 92,
      improvement: "15% more engaging than usual"
    },
    emotionalTone: "happy",
    moodShift: "worried → calm",
    recommendations: ["Create more dragon stories"]
  }
}

// Webflow Display
<div wized="daily-insights">
  <h2>Today</h2>
  <p>{v.dailyInsights.storiesConsumed} stories</p>
  <p>{v.dailyInsights.totalListenTime} minutes</p>
  
  <div wized-show="v.dailyInsights.topStory">
    <h3>Favorite: {v.dailyInsights.topStory.title}</h3>
    <p>{v.dailyInsights.topStory.improvement}</p>
  </div>
  
  <div wized-show="v.dailyInsights.moodShift">
    <p>Mood: {v.dailyInsights.moodShift}</p>
  </div>
</div>
```

### 4.10 Get Top Effective Stories

```javascript
Name: GetTopStories
Method: GET
Endpoint: /users/me/effectiveness/top-stories
Params: {
  "limit": 10
}

// Response
{
  success: true,
  data: {
    topStories: [
      {
        story_id: "uuid",
        effectiveness_score: 92.5,
        engagement_vs_baseline: 18.5,
        mood_impact: { before: "worried", after: "calm" },
        stories: {
          id: "uuid",
          title: "The Brave Dragon",
          cover_art_url: "https://..."
        }
      }
    ],
    count: 5
  }
}

// Webflow Display
<div wized="top-stories-grid">
  <h2>Your Most Effective Stories</h2>
  <div wized-list="v.topStories">
    <div wized-item class="top-story-card">
      <img src="{item.stories.cover_art_url}" />
      <h3>{item.stories.title}</h3>
      <div class="effectiveness-score">
        ⭐ {item.effectiveness_score}/100
      </div>
      <p class="comparative">
        {item.engagement_vs_baseline > 0 ? '+' : ''}{item.engagement_vs_baseline}% vs your average
      </p>
    </div>
  </div>
</div>
```

---

## Category 5: Libraries (10 endpoints)

### 5.1 List Libraries

```javascript
Name: GetLibraries
Method: GET
Endpoint: /libraries

// Response
{
  success: true,
  data: {
    libraries: [
      {
        id: "uuid",
        name: "Emma's Library",
        role: "owner", // owner, admin, editor, viewer
        story_count: 23,
        character_count: 5,
        created_at: "2025-01-01T..."
      }
    ]
  }
}

// Webflow Display
<select wized="library-select" wized-bind="v.selectedLibraryId">
  <option wized-list="v.userLibraries" 
          wized-item 
          value="{item.id}">{item.name} ({item.story_count} stories)</option>
</select>
```

### 5.2-5.10 Library Endpoints

- `GET /libraries/:id` - Get library details
- `POST /libraries` - Create library
- `PATCH /libraries/:id` - Update
- `DELETE /libraries/:id` - Delete
- `GET /libraries/:id/stories` - Stories in library
- `GET /libraries/:id/characters` - Characters in library
- `GET /libraries/:id/members` - Library members
- `POST /libraries/:id/members` - Add member
- `DELETE /libraries/:id/members/:userId` - Remove member

---

## Category 6: Notifications (6 endpoints)

### 6.1 List Notifications

```javascript
Name: GetNotifications
Method: GET
Endpoint: /users/me/notifications
Params: {
  "page": 1,
  "perPage": 20,
  "unread": v.showUnreadOnly // Optional filter
}

// Response
{
  success: true,
  data: {
    notifications: [
      {
        id: "uuid",
        type: "story_ready",
        title: "Your story is ready!",
        message: "\"The Brave Dragon\" is complete.",
        data: { storyId: "uuid" },
        read: false,
        createdAt: "2025-12-24T20:00:00Z"
      }
    ],
    pagination: { page: 1, total: 15 }
  }
}

// Webflow Display
<div wized="notification-center">
  <div wized-list="v.notifications">
    <div wized-item class="notification" class:unread="!item.read">
      <h4>{item.title}</h4>
      <p>{item.message}</p>
      <button wized-action="markRead(item.id)">Mark Read</button>
      <button wized-action="dismiss(item.id)">Dismiss</button>
    </div>
  </div>
</div>

// Notification Badge
<div wized="notification-bell">
  🔔
  <span wized-show="v.unreadCount > 0" class="badge">
    {v.unreadCount}
  </span>
</div>
```

### 6.2-6.6 Notification Endpoints

- `POST /users/me/notifications/:id/read` - Mark as read
- `POST /users/me/notifications/:id/dismiss` - Dismiss
- `GET /users/me/notifications/settings` - Get settings
- `PATCH /users/me/notifications/settings` - Update settings
- `POST /users/me/push-notifications/register` - Register device

---

## Complete Endpoint Inventory

### Core Features (65 endpoints)

**Authentication** (5):
- Signup, Login, Refresh, Logout, Forgot Password

**Stories** (15):
- List, Get, Create, Update, Delete, Duplicate, Regenerate
- Asset status/stream/cancel/retry
- QR code, Audio, WebVTT, PDF

**Characters** (8):
- List, Get, Create, Update, Delete, Regenerate, Transfers

**Libraries** (10):
- List, Get, Create, Update, Delete
- Get stories/characters/members
- Add/remove members

**Transfers** (6):
- Transfer story/character
- Respond to transfer (accept/reject)
- List transfers

**Invitations** (8):
- Invite friend/family/teacher
- Respond to invite
- List invites

**Emotion Intelligence** (8):
- Check-in, Patterns, Story emotions, Streaming

**Notifications** (6):
- List, Read, Dismiss, Settings, Push registration

### Pipeline Intelligence (10 endpoints - NEW)

- Track consumption
- Get metrics
- Get effectiveness
- Email preferences (get/update)
- Credits, Rewards, Referral link
- Daily insights, Top stories

### Advanced Features (56 endpoints)

**User Preferences** (4):
- Get, Update, Reset preferences
- Notification settings

**Audio & Assets** (12):
- Voice catalog, Music catalog, SFX catalog
- Generate audio, Mix audio
- Asset management

**Collections & Tags** (8):
- Create/list collections
- Add stories to collections
- Manage tags

**Search & Discovery** (3):
- Search stories
- Search characters
- Filter by tags/themes

**Parent Dashboard** (10):
- Child profiles (list/create/update/delete)
- Profile library access
- Profile insights

**B2B Organizations** (15):
- Create/manage organizations
- Member management (add/remove/update)
- Seat management
- Shared library
- Organization health reports

**Affiliate Program** (5):
- Get status
- List referrals
- Request payout
- Get statistics

**Export & Import** (5):
- Request data export
- Download export
- Import data

**Admin APIs** (10):
- System health
- Metrics
- User management
- Job monitoring
- Moderation tools

**Total**: 131 endpoints

---

## Wized Data Store Setup

### Authentication & User

```javascript
v.accessToken: string | null
v.refreshToken: string | null
v.userId: string | null
v.userEmail: string | null
v.userName: string | null
v.userType: string | null // parent, teacher, therapist, etc.
v.isAuthenticated: boolean
```

### Stories & Characters

```javascript
v.userStories: array
v.currentStory: object | null
v.currentStoryId: string | null
v.storyStatus: string
v.assetStatus: object | null
v.userCharacters: array
v.selectedCharacterId: string | null
v.currentCharacter: object | null
```

### Pipeline Intelligence

```javascript
v.storyMetrics: object | null
v.storyEffectiveness: object | null
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

### Libraries & Navigation

```javascript
v.userLibraries: array
v.selectedLibraryId: string | null
v.currentLibrary: object | null
```

### UI State

```javascript
v.isLoading: boolean
v.errorMessage: string | null
v.showModal: boolean
v.modalContent: string | null
v.currentPage: number
v.totalPages: number
v.perPage: number
v.sortBy: string
v.sortOrder: string
v.filterStatus: string
```

### Notifications

```javascript
v.notifications: array
v.unreadCount: number
v.showNotifications: boolean
```

---

## Common Wized Patterns

### Pagination Pattern

```javascript
// Next Page Workflow
Trigger: Click next button
Conditions: v.currentPage < v.totalPages
Actions:
  1. v.currentPage = v.currentPage + 1
  2. v.isLoading = true
  3. Run Request: GetStories
  4. Scroll to top
  5. v.isLoading = false

// Previous Page Workflow
Trigger: Click previous button
Conditions: v.currentPage > 1
Actions:
  1. v.currentPage = v.currentPage - 1
  2. v.isLoading = true
  3. Run Request: GetStories
  4. Scroll to top
  5. v.isLoading = false
```

### Loading State Pattern

```javascript
// Before Request
v.isLoading = true
v.errorMessage = null

// After Success
v.isLoading = false

// After Error
v.isLoading = false
v.errorMessage = error.message
```

### Error Handling Pattern

```javascript
// Global Error Workflow
Trigger: Any Request Error
Actions:
  If status = 401:
    Clear v.accessToken
    Navigate to /login
  Else if status = 429:
    Show message: "Too many requests, please wait"
  Else if status >= 500:
    Show message: "Server error, please try again"
  Else:
    Show message: response.error || "Something went wrong"
```

### User-Type Routing Pattern

```javascript
// On Login Success
Workflow: "Route By User Type"
Actions:
  If v.userType = 'parent': Navigate to /dashboard
  If v.userType = 'teacher': Navigate to /classroom
  If v.userType = 'therapist': Navigate to /clients
  If v.userType = 'child': Navigate to /stories
  If v.userType in ['admin', 'moderator']: Navigate to /admin
  Else: Navigate to /dashboard
```

---

## Quick Reference: Most Used Endpoints

### Top 20 for MVP

1. `POST /auth/login` - Authentication
2. `GET /stories` - List stories
3. `GET /stories/:id` - Get story details
4. `POST /stories` - Create story
5. `GET /stories/:id/assets/status` - Asset polling
6. `GET /characters` - List characters
7. `POST /characters` - Create character
8. `GET /libraries` - List libraries
9. `GET /libraries/:id/stories` - Library stories
10. `POST /stories/:id/consumption` - Track play
11. `GET /stories/:id/metrics` - Get metrics
12. `GET /stories/:id/effectiveness` - Get insights
13. `GET /users/me/credits` - Show credits
14. `GET /users/me/referral-link` - Referral dashboard
15. `GET /users/me/notifications` - Notifications
16. `GET /users/me/email-preferences` - Settings
17. `PATCH /users/me/email-preferences` - Update settings
18. `GET /users/me/insights/daily` - Daily digest
19. `GET /users/me/effectiveness/top-stories` - Top stories
20. `GET /users/me/rewards` - Reward history

---

## Next Steps

For complete Wized configurations of all 131 endpoints, see:
- **Page Templates**: Coming in next document
- **JSON Configuration**: Coming in next document
- **Component Library**: Coming in next document

---

**This reference covers all 131 endpoints. Each has Wized request configuration, response structure, Webflow binding examples, and workflow patterns.**

