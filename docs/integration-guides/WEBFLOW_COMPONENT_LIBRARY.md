# Webflow Component Library - Reusable Patterns

**Date**: December 25, 2025  
**Components**: 15 reusable patterns  
**For**: Design team building in Webflow + Wized

---

## Component 1: Story Card

**Use**: Story library grid, top stories, search results

**Webflow HTML**:
```html
<div class="story-card">
  <div class="card-image">
    <img wized="cover-art" src="{item.cover_art_url}" alt="{item.title}" />
    
    <!-- Status Badge (top-right) -->
    <div wized-show="item.status = 'generating'" class="badge badge-generating">
      ⏳ Generating
    </div>
    <div wized-show="item.status = 'ready'" class="badge badge-ready">
      ✓ Ready
    </div>
    
    <!-- Effectiveness Badge (top-left) -->
    <div wized-show="item.effectiveness_score > 70" class="badge badge-effective">
      ⭐ {item.effectiveness_score}
    </div>
  </div>
  
  <div class="card-content">
    <h3 wized="story-title">{item.title}</h3>
    <p class="character">{item.character.name}</p>
    <p class="duration">{Math.floor(item.audio_duration / 60)} min</p>
    
    <!-- Comparative Insight (if available) -->
    <p wized-show="item.engagement_vs_baseline" class="comparative">
      {item.engagement_vs_baseline > 0 ? '+' : ''}{item.engagement_vs_baseline}% vs your average
    </p>
  </div>
  
  <div class="card-actions">
    <button wized-action="playStory(item.id)" class="btn-primary">Play</button>
    <button wized-action="viewDetails(item.id)" class="btn-secondary">Details</button>
  </div>
</div>
```

**CSS Classes**:
```css
.story-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.story-card:hover {
  transform: translateY(-4px);
}

.card-image {
  position: relative;
  aspect-ratio: 16/9;
}

.badge {
  position: absolute;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge-generating {
  top: 8px;
  right: 8px;
  background: #FFA500;
  color: white;
}

.badge-effective {
  top: 8px;
  left: 8px;
  background: #4F46E5;
  color: white;
}

.comparative {
  font-size: 14px;
  color: #059669;
  font-weight: 600;
}
```

---

## Component 2: Character Card

**Use**: Character gallery, character selection

**Webflow HTML**:
```html
<div class="character-card">
  <div class="character-image">
    <img src="{item.reference_images.headshot.url}" alt="{item.name}" />
    
    <!-- Usage Badge -->
    <div wized-show="item.usage_count > 10" class="badge badge-popular">
      🌟 Popular ({item.usage_count} stories)
    </div>
  </div>
  
  <div class="character-info">
    <h3>{item.name}</h3>
    <p class="species">{item.traits?.species || 'Unknown species'}</p>
    <div class="traits">
      <span wized-list="(item.traits?.personality || []).slice(0, 3)">
        <span wized-item class="trait-tag">{item}</span>
      </span>
    </div>
  </div>
  
  <!-- Birth Certificate -->
  <div wized-show="item.birth_certificate_url" class="certificate-link">
    <a href="{item.birth_certificate_url}" target="_blank">
      📜 Birth Certificate
    </a>
  </div>
  
  <button wized-action="selectCharacter(item.id)">Use Character</button>
</div>
```

---

## Component 3: Pagination Controls

**Use**: All paginated lists (stories, characters, notifications)

**Webflow HTML**:
```html
<div class="pagination">
  <button wized-show="v.pagination.hasPrev" 
          wized-action="previousPage"
          class="btn-pagination">
    ← Previous
  </button>
  
  <div class="page-numbers">
    <span>Page {v.currentPage} of {v.totalPages}</span>
  </div>
  
  <button wized-show="v.pagination.hasNext" 
          wized-action="nextPage"
          class="btn-pagination">
    Next →
  </button>
</div>
```

**Wized Workflows**:
```javascript
Workflow: "Previous Page"
Conditions: v.currentPage > 1
Actions:
  1. v.currentPage = v.currentPage - 1
  2. v.isLoading = true
  3. Run Request: [GetStories|GetCharacters|GetNotifications]
  4. Scroll to top
  5. v.isLoading = false

Workflow: "Next Page"
Conditions: v.currentPage < v.totalPages
Actions:
  1. v.currentPage = v.currentPage + 1
  2. v.isLoading = true
  3. Run Request: [GetStories|GetCharacters|GetNotifications]
  4. Scroll to top
  5. v.isLoading = false
```

---

## Component 4: Loading State

**Use**: While requests are processing

**Webflow HTML**:
```html
<!-- Skeleton Loader for Story Card -->
<div wized-show="v.isLoading" class="skeleton-card">
  <div class="skeleton-image"></div>
  <div class="skeleton-title"></div>
  <div class="skeleton-text"></div>
  <div class="skeleton-button"></div>
</div>

<!-- Spinner -->
<div wized-show="v.isLoading" class="spinner-overlay">
  <div class="spinner"></div>
  <p>Loading...</p>
</div>

<!-- Inline Loading -->
<button wized-loading="v.isCreatingStory">
  <span wized-show="!v.isCreatingStory">Create Story</span>
  <span wized-show="v.isCreatingStory">Creating...</span>
</button>
```

**CSS**:
```css
.skeleton-card {
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-image {
  height: 200px;
  background: #E5E7EB;
  border-radius: 8px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4F46E5;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## Component 5: Effectiveness Badge

**Use**: Story cards, player page (comparative intelligence)

**Webflow HTML**:
```html
<div wized="effectiveness-badge" 
     wized-show="item.effectiveness_score > 70"
     class="effectiveness-badge">
  <span class="score">⭐ {item.effectiveness_score}</span>
  <div class="tooltip">
    {item.engagement_vs_baseline > 0 ? '+' : ''}{item.engagement_vs_baseline}% vs your average
  </div>
</div>

<!-- Full Effectiveness Panel -->
<div wized="effectiveness-panel" 
     wized-show="v.storyEffectiveness.improvements.length > 0">
  <h3>⭐ This story was effective!</h3>
  <ul class="improvements-list">
    <li wized-list="v.storyEffectiveness.improvements" wized-item>
      {item.interpretation}
    </li>
  </ul>
  <p class="recommendation">
    <strong>Recommendation:</strong> {v.storyEffectiveness.recommendation}
  </p>
</div>
```

**Remember**: Show comparative ("15% more engaging"), never absolute ("score: 82")

---

## Component 6: Referral Progress Bar

**Use**: Referral dashboard, milestone tracking

**Webflow HTML**:
```html
<div class="milestone-progress">
  <h3>Progress to Next Milestone</h3>
  <p wized-show="v.nextMilestone">
    {v.nextMilestone.count - v.totalReferrals} more referrals until 
    <strong>{v.nextMilestone.reward}</strong>
  </p>
  
  <div class="progress-bar">
    <div class="progress-fill" 
         style="width: {(v.totalReferrals / v.nextMilestone.count * 100)}%">
    </div>
  </div>
  
  <div class="milestone-markers">
    <div class="marker" class:achieved="v.totalReferrals >= 3">
      <div class="marker-icon">3</div>
      <p>$5 bonus</p>
    </div>
    <div class="marker" class:achieved="v.totalReferrals >= 5">
      <div class="marker-icon">5</div>
      <p>$10 + 1 mo free</p>
    </div>
    <div class="marker" class:achieved="v.totalReferrals >= 10">
      <div class="marker-icon">10</div>
      <p>50% off forever</p>
    </div>
  </div>
</div>
```

---

## Component 7: Email Preference Toggle

**Use**: Preferences page

**Webflow HTML**:
```html
<label class="preference-toggle">
  <input type="checkbox" wized-bind="v.emailPrefsInsights" />
  <div class="toggle-content">
    <div class="toggle-header">
      <strong>Insights Emails</strong>
      <div class="toggle-switch">
        <div class="toggle-slider" class:on="v.emailPrefsInsights"></div>
      </div>
    </div>
    <p class="toggle-description">
      Daily digests, weekly reports, story effectiveness insights
    </p>
  </div>
</label>
```

---

## Component 8: Notification Toast

**Use**: Success/error messages

**Webflow HTML**:
```html
<div wized-show="v.showToast" class="toast toast-{v.toastType}">
  <span class="toast-icon">
    {v.toastType = 'success' ? '✓' : 
     v.toastType = 'error' ? '✗' : 'ℹ'}
  </span>
  <p>{v.toastMessage}</p>
  <button wized-action="closeToast">×</button>
</div>

<!-- Workflow: Show Toast -->
Function: showToast(message, type)
Actions:
  1. v.toastMessage = message
  2. v.toastType = type
  3. v.showToast = true
  4. Wait 5 seconds
  5. v.showToast = false
```

---

## Component 9: Audio Player with Tracking

**Use**: Story player page

**Webflow HTML**:
```html
<div class="audio-player">
  <audio id="story-audio"
         wized="audio-player"
         wized-event-play="trackPlayStart"
         wized-event-pause="trackPlayPause"
         wized-event-ended="trackPlayComplete"
         wized-event-timeupdate="updateProgress"
         controls>
    <source src="{v.currentStory.audio_url}" type="audio/mpeg" />
  </audio>
  
  <!-- Custom Progress Bar -->
  <div class="custom-progress">
    <div class="progress-bar">
      <div class="progress-fill" style="width: {v.audioProgress}%"></div>
    </div>
    <span class="time-current">{v.audioCurrentFormatted}</span>
    <span class="time-total">{v.audioDurationFormatted}</span>
  </div>
</div>

<!-- Workflows -->
Workflow: "Update Progress"
Trigger: Audio timeupdate event
Actions:
  1. v.audioProgress = (audio.currentTime / audio.duration * 100)
  2. v.audioCurrentFormatted = formatTime(audio.currentTime)
```

---

## Component 10: Credits Display

**Use**: Dashboard, referral page

**Webflow HTML**:
```html
<div class="credits-card">
  <div class="credits-amount">
    <h2>{v.creditsFormatted}</h2>
    <p>Available Credits</p>
  </div>
  <div class="credits-info">
    <p>Auto-applies to your next invoice</p>
    <a href="/referrals">Earn more credits →</a>
  </div>
</div>
```

---

## Component 11: Notification Bell

**Use**: Header/nav on all pages

**Webflow HTML**:
```html
<div class="notification-bell" wized-action="toggleNotifications">
  <svg><!-- Bell icon --></svg>
  <span wized-show="v.unreadCount > 0" class="notification-badge">
    {v.unreadCount}
  </span>
</div>

<!-- Notification Dropdown -->
<div wized-show="v.showNotifications" class="notification-dropdown">
  <div class="notification-header">
    <h4>Notifications</h4>
    <button wized-action="markAllRead">Mark all read</button>
  </div>
  
  <div wized-list="v.notifications.slice(0, 5)" class="notification-list">
    <div wized-item class="notification-item" class:unread="!item.read">
      <div class="notification-content">
        <h5>{item.title}</h5>
        <p>{item.message}</p>
        <span class="time">{timeAgo(item.createdAt)}</span>
      </div>
      <button wized-action="dismissNotification(item.id)">×</button>
    </div>
  </div>
  
  <a href="/notifications" class="view-all">View all notifications</a>
</div>
```

---

## Component 12: Form Error Display

**Use**: All forms

**Webflow HTML**:
```html
<!-- Field Error (inline) -->
<div wized-show="v.errors.email" class="field-error">
  {v.errors.email}
</div>

<!-- Form Error (top of form) -->
<div wized-show="v.formError" class="form-error-banner">
  <span class="error-icon">⚠️</span>
  <p>{v.formError}</p>
  <button wized-action="dismissError">×</button>
</div>

<!-- Success Message -->
<div wized-show="v.formSuccess" class="form-success-banner">
  <span class="success-icon">✓</span>
  <p>{v.formSuccess}</p>
</div>
```

---

## Component 13: User Type Badge

**Use**: Profile pages, member lists

**Webflow HTML**:
```html
<span class="user-type-badge badge-{v.userType}">
  {v.userType = 'parent' ? '👨‍👩‍👧 Parent' :
   v.userType = 'teacher' ? '👩‍🏫 Teacher' :
   v.userType = 'therapist' ? '🩺 Therapist' :
   v.userType}
</span>
```

---

## Component 14: Asset Generation Progress

**Use**: Story player while assets generating

**Webflow HTML**:
```html
<div wized-show="v.assetStatus.overall != 'complete'" class="asset-progress">
  <h4>Generating Assets...</h4>
  
  <div class="asset-item">
    <span>Audio</span>
    <span class="status-{v.assetStatus.audio}">{v.assetStatus.audio}</span>
  </div>
  
  <div class="asset-item">
    <span>Artwork</span>
    <span class="status-{v.assetStatus.art}">{v.assetStatus.art}</span>
  </div>
  
  <div class="asset-item">
    <span>PDF</span>
    <span class="status-{v.assetStatus.pdf}">{v.assetStatus.pdf}</span>
  </div>
  
  <p>Estimated: {v.assetStatus.estimatedCompletion} seconds</p>
</div>

<!-- Workflow: Poll Asset Status -->
Workflow: "Poll Assets"
Trigger: Page load (story page)
Conditions: v.assetStatus.overall != 'complete'
Actions:
  1. Run: GetAssetStatus
  2. Wait 5 seconds
  3. If v.assetStatus.overall != 'complete': Repeat from step 1
  4. Else: Show success message
```

---

## Component 15: Comparative Insights Modal

**Use**: After story complete, effectiveness display

**Webflow HTML**:
```html
<div wized-show="v.showEffectivenessModal" class="modal-overlay">
  <div class="modal effectiveness-modal">
    <button class="modal-close" wized-action="closeModal">×</button>
    
    <div class="modal-content">
      <h2>⭐ This story was effective!</h2>
      
      <!-- Comparative Improvements (Not Absolute Scores!) -->
      <ul class="improvements-list">
        <li wized-list="v.storyEffectiveness.improvements" wized-item>
          <span class="improvement-icon">
            {item.delta > 0 ? '📈' : '📉'}
          </span>
          <span class="improvement-text">{item.interpretation}</span>
        </li>
      </ul>
      
      <!-- Mood Impact -->
      <div wized-show="v.storyEffectiveness.moodImpact" class="mood-impact">
        <p>Mood: {v.storyEffectiveness.moodImpact.before} → {v.storyEffectiveness.moodImpact.after}</p>
      </div>
      
      <!-- Recommendation -->
      <div class="recommendation">
        <p><strong>Recommendation:</strong></p>
        <p>{v.storyEffectiveness.recommendation}</p>
      </div>
      
      <button wized-action="createSimilar" class="btn-primary">
        Create Similar Story
      </button>
    </div>
  </div>
</div>

<!-- Workflow: Show After Play -->
Workflow: "Show Effectiveness"
Trigger: Audio ended event
Actions:
  1. Run: TrackConsumption (play_complete)
  2. Wait 2 seconds
  3. Run: GetStoryEffectiveness
  4. If v.storyEffectiveness.improvements.length > 0:
     v.showEffectivenessModal = true
```

---

## Responsive Breakpoints

### Mobile (<768px)

```css
@media (max-width: 767px) {
  .story-grid {
    grid-template-columns: 1fr;
  }
  
  .character-grid {
    grid-template-columns: 1fr;
  }
  
  .dashboard-container {
    padding: 16px;
  }
}
```

### Tablet (768px - 1024px)

```css
@media (min-width: 768px) and (max-width: 1024px) {
  .story-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .character-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

### Desktop (>1024px)

```css
@media (min-width: 1025px) {
  .story-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  
  .character-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## Component Library Summary

**15 Reusable Components**:
1. Story Card (with effectiveness badge)
2. Character Card (with Birth Certificate link)
3. Pagination Controls (prev/next/pages)
4. Loading States (skeleton, spinner)
5. Effectiveness Badge (comparative)
6. Referral Progress Bar (milestones)
7. Email Preference Toggle (category control)
8. Notification Toast (success/error)
9. Audio Player (with tracking)
10. Credits Display (formatted amount)
11. Notification Bell (with dropdown)
12. Form Error Display (inline + banner)
13. User Type Badge (role indicator)
14. Asset Generation Progress (live status)
15. Comparative Insights Modal (effectiveness)

**All components are**:
- Responsive (mobile/tablet/desktop)
- Wized-ready (attributes included)
- Reusable (copy/paste across pages)
- Accessible (semantic HTML)

**Use these to build all 19 pages consistently.**

