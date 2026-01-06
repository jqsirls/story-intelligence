# Wized Progressive Loading Guide - Beat-by-Beat Story Generation

**Date**: December 28, 2025  
**Wized Version**: Embed 2.0  
**API Base**: `https://api.storytailor.dev/api/v1`  
**Supabase Realtime**: Required for progressive loading

---

## Overview

This guide shows you how to implement progressive loading in Webflow using Wized and Supabase Realtime. Assets (cover, beat images, audio, etc.) appear in the UI as they complete, providing a smooth user experience.

---

## Step 1: Add Supabase SDK to Webflow

### In Webflow Project Settings

1. Go to **Project Settings** → **Custom Code** → **Head Code**
2. Add the Supabase SDK:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

3. Save and publish

---

## Step 2: Initialize Supabase in Wized

### In Wized App Settings → Custom Code

```javascript
// Initialize Supabase client
const supabaseUrl = 'https://lendybmmnlqelrhkhdyc.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // Get from Supabase Dashboard → Settings → API

const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Make available globally for workflows
window._supabase = supabase;
```

**Important**: Replace `YOUR_SUPABASE_ANON_KEY` with your actual Supabase anonymous key.

---

## Step 3: Create Story with Progressive Loading

### Wized Request: Create Story

**Name**: `Create_Story`  
**Method**: `POST`  
**Endpoint**: `/stories`  
**Headers**:
```
Authorization: Bearer {v.accessToken}
Content-Type: application/json
```

**Body**:
```json
{
  "title": "{v.storyTitle}",
  "characterId": "{v.selectedCharacterId}",
  "storyType": "{v.storyType}",
  "userAge": "{v.userAge}",
  "theme": "{v.theme}",
  "generateAssets": true
}
```

### On Success Workflow

```javascript
// Store story ID
v.storyId = r.Create_Story.data.id;

// Initialize status variables
v.storyStatus = 'generating';
v.storyText = null;
v.coverUrl = null;
v.beat1Url = null;
v.beat2Url = null;
v.beat3Url = null;
v.beat4Url = null;
v.audioUrl = null;
v.webvttUrl = null;
v.pdfUrl = null;
v.activities = null;

// Subscribe to progressive updates
const channel = window._supabase
  .channel(`stories:id=${v.storyId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'stories',
    filter: `id=eq.${v.storyId}`
  }, (payload) => {
    const story = payload.new;
    const status = story.asset_generation_status?.assets || {};
    
    // Update story text when ready
    if (status.content?.status === 'ready' && story.content?.text) {
      v.storyText = story.content.text;
      console.log('Story text ready');
    }
    
    // Update cover image when ready
    if (status.cover?.status === 'ready' && story.cover_art_url) {
      v.coverUrl = story.cover_art_url;
      console.log('Cover image ready:', v.coverUrl);
    }
    
    // Update individual beat images as they complete
    if (status.scene_1?.status === 'ready' && story.scene_art_urls?.[0]) {
      v.beat1Url = story.scene_art_urls[0];
      console.log('Beat 1 ready:', v.beat1Url);
    }
    
    if (status.scene_2?.status === 'ready' && story.scene_art_urls?.[1]) {
      v.beat2Url = story.scene_art_urls[1];
      console.log('Beat 2 ready:', v.beat2Url);
    }
    
    if (status.scene_3?.status === 'ready' && story.scene_art_urls?.[2]) {
      v.beat3Url = story.scene_art_urls[2];
      console.log('Beat 3 ready:', v.beat3Url);
    }
    
    if (status.scene_4?.status === 'ready' && story.scene_art_urls?.[3]) {
      v.beat4Url = story.scene_art_urls[3];
      console.log('Beat 4 ready:', v.beat4Url);
    }
    
    // Update audio when ready
    if (status.audio?.status === 'ready' && story.audio_url) {
      v.audioUrl = story.audio_url;
      v.webvttUrl = story.webvtt_url;
      console.log('Audio ready:', v.audioUrl);
    }
    
    // Update PDF when ready
    if (status.pdf?.status === 'ready' && story.pdf_url) {
      v.pdfUrl = story.pdf_url;
      console.log('PDF ready:', v.pdfUrl);
    }
    
    // Update activities when ready
    if (status.activities?.status === 'ready' && story.activities) {
      v.activities = story.activities;
      console.log('Activities ready');
    }
    
    // Check if all assets are ready
    if (story.asset_generation_status?.overall === 'ready') {
      v.storyStatus = 'ready';
      console.log('All assets ready!');
    }
  })
  .subscribe();

// Store channel for cleanup
v._storyChannel = channel;

// Navigate to story page
Navigate to: /story/{v.storyId}
```

---

## Step 4: Webflow Page Structure

### Story Player Page Layout

```
Story Container (Div)
├─ Cover Image (Image Element)
│  └─ Bind src to: {v.coverUrl}
│  └─ Conditional visibility: Show when {v.coverUrl} exists
│  └─ Skeleton loader: Show when {v.coverUrl} is null
│
├─ Story Title (Heading)
│  └─ Bind text to: {v.storyTitle}
│
├─ Story Text (Rich Text)
│  └─ Bind HTML to: {v.storyText}
│  └─ Conditional visibility: Show when {v.storyText} exists
│  └─ Skeleton loader: Show when {v.storyText} is null
│
├─ Beat Images Grid (Collection)
│  ├─ Beat 1 Image (Image Element)
│  │  └─ Bind src to: {v.beat1Url}
│  │  └─ Conditional visibility: Show when {v.beat1Url} exists
│  │  └─ Skeleton loader: Show when {v.beat1Url} is null
│  │
│  ├─ Beat 2 Image (Image Element)
│  │  └─ Bind src to: {v.beat2Url}
│  │  └─ Conditional visibility: Show when {v.beat2Url} exists
│  │  └─ Skeleton loader: Show when {v.beat2Url} is null
│  │
│  ├─ Beat 3 Image (Image Element)
│  │  └─ Bind src to: {v.beat3Url}
│  │  └─ Conditional visibility: Show when {v.beat3Url} exists
│  │  └─ Skeleton loader: Show when {v.beat3Url} is null
│  │
│  └─ Beat 4 Image (Image Element)
│     └─ Bind src to: {v.beat4Url}
│     └─ Conditional visibility: Show when {v.beat4Url} exists
│     └─ Skeleton loader: Show when {v.beat4Url} is null
│
├─ Audio Player (Audio Element)
│  └─ Bind src to: {v.audioUrl}
│  └─ Conditional visibility: Show when {v.audioUrl} exists
│  └─ Disabled state: When {v.audioUrl} is null
│
└─ Activities Section (Div)
   └─ Bind content to: {v.activities}
   └─ Conditional visibility: Show when {v.activities} exists
```

---

## Step 5: Skeleton Loaders in Webflow

### Creating Skeleton Loaders

1. **Cover Skeleton**:
   - Create a Div with gray background (`#E5E7EB`)
   - Set dimensions: 400px width × 600px height
   - Add pulse animation (Webflow → Interactions → Animation)
   - Show when `{v.coverUrl}` is null
   - Hide when `{v.coverUrl}` exists

2. **Beat Image Skeletons**:
   - Create 4 Divs with gray background
   - Set dimensions: 300px width × 400px height
   - Add pulse animation
   - Show when corresponding beat URL is null
   - Hide when beat URL exists

3. **Text Skeleton**:
   - Create multiple gray Divs (lines)
   - Varying widths (80%, 90%, 70%, 85%)
   - Height: 20px each
   - Spacing: 10px between lines
   - Add pulse animation
   - Show when `{v.storyText}` is null

### Wized Conditional Visibility

In Wized, use conditional visibility:

```javascript
// Show skeleton when URL is null
Show skeleton when: {v.coverUrl} is null

// Show image when URL exists
Show image when: {v.coverUrl} is not null
```

---

## Step 6: Page Load Workflow (Existing Story)

### When User Navigates to Story Page

**Wized Workflow: Page Load**

```javascript
// Extract story ID from URL
const urlParams = new URLSearchParams(window.location.search);
v.storyId = urlParams.get('id') || window.location.pathname.split('/').pop();

// Fetch story details
Execute Request: Get_Story
  Endpoint: /stories/{v.storyId}
  On Success:
    v.storyTitle = r.Get_Story.data.title;
    v.storyText = r.Get_Story.data.content?.text || null;
    v.coverUrl = r.Get_Story.data.cover_art_url || null;
    v.beat1Url = r.Get_Story.data.scene_art_urls?.[0] || null;
    v.beat2Url = r.Get_Story.data.scene_art_urls?.[1] || null;
    v.beat3Url = r.Get_Story.data.scene_art_urls?.[2] || null;
    v.beat4Url = r.Get_Story.data.scene_art_urls?.[3] || null;
    v.audioUrl = r.Get_Story.data.audio_url || null;
    v.webvttUrl = r.Get_Story.data.webvtt_url || null;
    v.pdfUrl = r.Get_Story.data.pdf_url || null;
    v.activities = r.Get_Story.data.activities || null;
    
    // Check if still generating
    const status = r.Get_Story.data.asset_generation_status?.overall || 'ready';
    if (status === 'generating') {
      // Subscribe to updates
      const channel = window._supabase
        .channel(`stories:id=${v.storyId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'stories',
          filter: `id=eq.${v.storyId}`
        }, (payload) => {
          // Same update logic as story creation
          // ... (copy from Step 3)
        })
        .subscribe();
      
      v._storyChannel = channel;
    }
```

---

## Step 7: Cleanup on Page Unload

### Wized Workflow: Page Unload

```javascript
// Unsubscribe from Supabase Realtime
if (v._storyChannel) {
  window._supabase.removeChannel(v._storyChannel);
  v._storyChannel = null;
}
```

**Important**: Always clean up channels to prevent memory leaks and unnecessary subscriptions.

---

## Step 8: Character Art Progressive Loading

### Character Creation with Progressive Loading

**Wized Request: Create_Character**

```javascript
// On Success
v.characterId = r.Create_Character.data.id;
v.characterHeadshotUrl = null;
v.characterBodyUrl = null;

// Subscribe to character updates
const channel = window._supabase
  .channel(`characters:id=${v.characterId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'characters',
    filter: `id=eq.${v.characterId}`
  }, (payload) => {
    const character = payload.new;
    
    if (character.reference_images?.headshot?.cdnUrl) {
      v.characterHeadshotUrl = character.reference_images.headshot.cdnUrl;
    }
    
    if (character.reference_images?.body?.cdnUrl) {
      v.characterBodyUrl = character.reference_images.body.cdnUrl;
    }
  })
  .subscribe();

v._characterChannel = channel;
```

---

## Complete Example: Story Creation Flow

### Full Wized Workflow

```javascript
// 1. User fills form and clicks "Create Story"
// 2. Execute Create_Story request
// 3. On Success:

v.storyId = r.Create_Story.data.id;
v.storyStatus = 'generating';

// Initialize all asset URLs as null
v.storyText = null;
v.coverUrl = null;
v.beat1Url = null;
v.beat2Url = null;
v.beat3Url = null;
v.beat4Url = null;
v.audioUrl = null;

// Subscribe to updates
const channel = window._supabase
  .channel(`stories:id=${v.storyId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'stories',
    filter: `id=eq.${v.storyId}`
  }, (payload) => {
    const story = payload.new;
    const status = story.asset_generation_status?.assets || {};
    
    // Progressive updates
    if (status.content?.status === 'ready' && story.content?.text) {
      v.storyText = story.content.text;
    }
    
    if (status.cover?.status === 'ready' && story.cover_art_url) {
      v.coverUrl = story.cover_art_url;
    }
    
    if (status.scene_1?.status === 'ready' && story.scene_art_urls?.[0]) {
      v.beat1Url = story.scene_art_urls[0];
    }
    
    if (status.scene_2?.status === 'ready' && story.scene_art_urls?.[1]) {
      v.beat2Url = story.scene_art_urls[1];
    }
    
    if (status.scene_3?.status === 'ready' && story.scene_art_urls?.[2]) {
      v.beat3Url = story.scene_art_urls[2];
    }
    
    if (status.scene_4?.status === 'ready' && story.scene_art_urls?.[3]) {
      v.beat4Url = story.scene_art_urls[3];
    }
    
    if (status.audio?.status === 'ready' && story.audio_url) {
      v.audioUrl = story.audio_url;
    }
    
    if (story.asset_generation_status?.overall === 'ready') {
      v.storyStatus = 'ready';
    }
  })
  .subscribe();

v._storyChannel = channel;

// Navigate to story page
Navigate to: /story/{v.storyId}
```

---

## Webflow Attribute Bindings

### Image Elements

1. Select Image element
2. Go to **Element Settings** → **Custom Attributes**
3. Add attribute: `src`
4. Bind to Wized variable: `{v.coverUrl}` (or `{v.beat1Url}`, etc.)

### Conditional Visibility

1. Select element (image or skeleton)
2. Go to **Element Settings** → **Display**
3. Add conditional:
   - **Show when**: `{v.coverUrl}` is not null (for image)
   - **Show when**: `{v.coverUrl}` is null (for skeleton)

### Audio Player

1. Select Audio element
2. Bind `src` attribute to `{v.audioUrl}`
3. Add conditional visibility: Show when `{v.audioUrl}` is not null

---

## Troubleshooting

### Supabase Realtime Not Working

1. **Check Supabase Dashboard**:
   - Go to **Database** → **Replication**
   - Ensure `stories` table has replication enabled
   - Ensure `characters` table has replication enabled

2. **Check Browser Console**:
   - Look for Supabase connection errors
   - Verify channel subscription messages

3. **Verify API Key**:
   - Use Supabase **anon key** (not service role key)
   - Check key is correct in Wized custom code

### Images Not Appearing

1. **Check CDN URLs**:
   - Verify URLs start with `https://assets.storytailor.dev/`
   - Test URL in browser directly

2. **Check Wized Variables**:
   - Use browser console: `console.log(v.coverUrl)`
   - Verify variable is being set

3. **Check Conditional Visibility**:
   - Ensure skeleton is hidden when URL exists
   - Ensure image is shown when URL exists

### Status Updates Not Received

1. **Check Channel Subscription**:
   - Verify channel is subscribed: `channel.subscribe()`
   - Check for subscription errors in console

2. **Check Database Updates**:
   - Verify `asset_generation_status` is being updated in Supabase
   - Check CloudWatch logs for Content Agent updates

---

## Best Practices

1. **Always initialize variables as null** before subscribing
2. **Clean up channels** on page unload
3. **Use skeleton loaders** for better UX
4. **Handle errors gracefully** (show error message if generation fails)
5. **Log updates to console** for debugging
6. **Test with slow network** to see progressive loading in action

---

## Additional Resources

- [REST API Complete Reference](../api/REST_API_COMPLETE_REFERENCE.md)
- [Complete Pipeline Process](../pipelines/COMPLETE_PIPELINE_PROCESS.md)
- [Wized Documentation](https://docs.wized.com/)
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)

