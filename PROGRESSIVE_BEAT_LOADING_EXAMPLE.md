# Progressive Beat Loading - Frontend Implementation Guide

## Overview

The Storytailor API supports **progressive asset loading** where each beat image appears individually as it's generated, providing a better UX than waiting for all assets to complete.

## Asset Generation Timeline

```
0s      → Story created, immediate return with story_id
↓
2-3min  → 🖼️  Cover image ready
↓
4-6min  → 🎨 Beat 1 ready (uses cover as reference)
↓
7-9min  → 🎨 Beat 2 ready (uses cover + beat 1)
↓
10-12min → 🎨 Beat 3 ready (uses cover + beat 1 + beat 2)
↓
13-15min → 🎨 Beat 4 ready (uses cover + beat 1 + beat 2 + beat 3)
↓
15-17min → 🎵 Audio ready
↓
17-18min → 📄 PDF + 🎯 Activities ready
```

## Supabase Realtime Implementation

### 1. Subscribe to Story Updates

```javascript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const channel = supabase
  .channel(`stories:id=${storyId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'stories',
    filter: `id=eq.${storyId}`
  }, (payload) => {
    handleAssetUpdate(payload.new);
  })
  .subscribe();
```

### 2. Handle Progressive Asset Updates

```javascript
function handleAssetUpdate(story) {
  const status = story.asset_generation_status?.assets || {};
  
  // Content (text) - Usually ready immediately
  if (status.content?.status === 'ready') {
    renderStoryText(story.content.text);
  }
  
  // Cover image
  if (status.cover?.status === 'ready' && story.cover_art_url) {
    showCoverImage(story.cover_art_url);
    hideSpinner('cover');
  } else if (status.cover?.status === 'generating') {
    showSpinner('cover', 'Creating cover art...');
  }
  
  // Individual beat images
  const beats = [
    { key: 'scene_1', index: 0, label: 'Scene 1' },
    { key: 'scene_2', index: 1, label: 'Scene 2' },
    { key: 'scene_3', index: 2, label: 'Scene 3' },
    { key: 'scene_4', index: 3, label: 'Scene 4' }
  ];
  
  beats.forEach(({ key, index, label }) => {
    if (status[key]?.status === 'ready' && story.scene_art_urls?.[index]) {
      showBeatImage(index, story.scene_art_urls[index]);
      hideSpinner(`beat-${index}`);
    } else if (status[key]?.status === 'generating') {
      showSpinner(`beat-${index}`, `Illustrating ${label.toLowerCase()}...`);
    }
  });
  
  // Audio narration
  if (status.audio?.status === 'ready' && story.audio_url) {
    enableAudioPlayer(story.audio_url, story.webvtt_url);
    hideSpinner('audio');
  } else if (status.audio?.status === 'generating') {
    showSpinner('audio', 'Recording narration...');
  }
  
  // PDF download
  if (status.pdf?.status === 'ready' && story.pdf_url) {
    enablePDFDownload(story.pdf_url);
  }
  
  // Activities
  if (status.activities?.status === 'ready' && story.activities) {
    renderActivities(story.activities);
  }
}
```

### 3. Initial Loading State

```javascript
// When navigating to /story/:id immediately after creation
useEffect(() => {
  // Show skeleton loaders for all assets
  setLoadingState({
    content: true,
    cover: true,
    beats: [true, true, true, true],
    audio: true
  });
  
  // Subscribe to updates
  const channel = subscribeToStory(storyId);
  
  // Initial fetch
  fetchStory(storyId);
  
  return () => {
    channel.unsubscribe();
  };
}, [storyId]);
```

### 4. UI Skeleton Loaders

```jsx
<div className="story-container">
  {/* Cover - Shows skeleton until ready */}
  {loadingState.cover ? (
    <Skeleton width={400} height={600} />
  ) : (
    <img src={coverUrl} alt="Cover" />
  )}
  
  {/* Story text - Usually ready immediately */}
  {storyText ? (
    <div className="story-text">{storyText}</div>
  ) : (
    <Skeleton count={10} />
  )}
  
  {/* Beat images - Show individually as ready */}
  <div className="beat-images">
    {[0, 1, 2, 3].map(index => (
      <div key={index}>
        {loadingState.beats[index] ? (
          <Skeleton width={300} height={400} />
        ) : beatUrls[index] ? (
          <img src={beatUrls[index]} alt={`Scene ${index + 1}`} />
        ) : null}
      </div>
    ))}
  </div>
  
  {/* Audio player - Shows disabled until ready */}
  <AudioPlayer 
    src={audioUrl} 
    disabled={loadingState.audio}
    placeholder="Audio narration loading..."
  />
</div>
```

## Benefits

### User Experience
- ✅ See story text immediately (< 1 second)
- ✅ See cover in ~2-3 minutes
- ✅ See beat 1 in ~4-6 minutes
- ✅ See beat 2 in ~7-9 minutes
- ✅ See beat 3 in ~10-12 minutes
- ✅ See beat 4 in ~13-15 minutes
- ✅ Enable audio in ~15-17 minutes

Instead of:
- ❌ Wait 15-18 minutes to see anything

### Engagement
- Users stay on the page watching content appear
- Progressive loading feels faster than it is
- Clear indication that work is happening
- Can start reading before all images are ready

## Testing

The updated test script will show:

```
📋 Phase 4: Asset Generation Polling (Progressive)
  ⏳ Polling for asset completion (progressive loading)...
  📝 Story Content ready! (0s)
  🖼️  Cover Image ready! (152s)
  🎨 Beat 1 Image ready! (245s)
  ⏳ Still generating... (270s elapsed, 3/9 assets ready)
  🎨 Beat 2 Image ready! (298s)
  ⏳ Still generating... (300s elapsed, 4/9 assets ready)
  🎨 Beat 3 Image ready! (356s)
  🎨 Beat 4 Image ready! (412s)
  🎵 Audio Narration ready! (478s)
  📄 PDF ready! (492s)
  🎯 Activities ready! (493s)
  ✅ All assets complete! (Total: 495s / 8m 15s)
```

This gives you real-time visibility into the progressive loading behavior!

