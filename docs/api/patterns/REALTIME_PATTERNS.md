# Real-time & Streaming Patterns

**Progressive Loading with Supabase Realtime**

---

## Overview

Storytailor uses real-time updates for:
- Asset generation progress
- Emotion detection events
- Notification delivery
- Collaborative features

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │◀───▶│  Supabase   │◀───▶│   Backend   │
│   (Wized)   │     │  Realtime   │     │   (Lambda)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    │
       │  Subscribe to     │                    │
       │  channel          │                    │
       │──────────────────▶│                    │
       │                   │                    │
       │                   │  Update DB row     │
       │                   │◀───────────────────│
       │                   │                    │
       │  Receive change   │                    │
       │◀──────────────────│                    │
```

---

## Supabase Realtime Channels

### Asset Generation Progress

```typescript
// Backend: Update story with progress
async function updateAssetProgress(
  storyId: string,
  assetType: string,
  status: 'pending' | 'generating' | 'ready' | 'failed',
  progress?: number,
  url?: string
) {
  const { data: current } = await supabase
    .from('stories')
    .select('asset_generation_status')
    .eq('id', storyId)
    .single();
  
  const newStatus = {
    ...current?.asset_generation_status,
    assets: {
      ...current?.asset_generation_status?.assets,
      [assetType]: { status, progress, url, updatedAt: new Date().toISOString() }
    }
  };
  
  // Determine overall status
  const assets = Object.values(newStatus.assets);
  if (assets.every(a => a.status === 'ready')) {
    newStatus.overall = 'completed';
  } else if (assets.some(a => a.status === 'failed')) {
    newStatus.overall = 'partial';
  } else if (assets.some(a => a.status === 'generating')) {
    newStatus.overall = 'generating';
  }
  
  await supabase
    .from('stories')
    .update({
      asset_generation_status: newStatus,
      ...(status === 'ready' && url ? { [`${assetType}_url`]: url } : {})
    })
    .eq('id', storyId);
}
```

### Frontend Subscription (Wized)

```javascript
// Subscribe to story asset updates
window.Wized.push(async (Wized) => {
  const storyId = Wized.data.v.currentStoryId;
  
  const channel = supabase
    .channel(`story:${storyId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'stories',
        filter: `id=eq.${storyId}`
      },
      (payload) => {
        const status = payload.new.asset_generation_status;
        updateAssetUI(status);
      }
    )
    .subscribe();
  
  // Cleanup on page leave
  window.addEventListener('beforeunload', () => {
    channel.unsubscribe();
  });
});

function updateAssetUI(status) {
  // Update skeleton loaders based on status
  const assets = status.assets || {};
  
  for (const [type, data] of Object.entries(assets)) {
    const element = document.querySelector(`[data-asset="${type}"]`);
    if (!element) continue;
    
    switch (data.status) {
      case 'pending':
        element.classList.add('skeleton');
        element.dataset.progress = '0';
        break;
      case 'generating':
        element.classList.add('skeleton', 'animating');
        element.dataset.progress = data.progress || '50';
        break;
      case 'ready':
        element.classList.remove('skeleton', 'animating');
        loadAssetContent(element, type, data.url);
        break;
      case 'failed':
        element.classList.remove('skeleton');
        element.classList.add('error');
        showRetryButton(element, type);
        break;
    }
  }
}
```

---

## Server-Sent Events (SSE)

### Emotion Stream Endpoint

```typescript
// GET /api/v1/profiles/:profileId/emotions/stream
app.get('/api/v1/profiles/:profileId/emotions/stream',
  authMiddleware,
  async (req, res) => {
    const { profileId } = req.params;
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Send initial connection event
    res.write(`event: connected\ndata: {"profileId":"${profileId}"}\n\n`);
    
    // Subscribe to emotion events
    const channel = supabase
      .channel(`emotions:${profileId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'emotion_check_ins',
        filter: `profile_id=eq.${profileId}`
      }, (payload) => {
        const event = {
          type: 'emotion_detected',
          emotion: payload.new.emotion,
          intensity: payload.new.intensity,
          timestamp: payload.new.created_at
        };
        res.write(`event: emotion\ndata: ${JSON.stringify(event)}\n\n`);
      })
      .subscribe();
    
    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`:keepalive\n\n`);
    }, 30000);
    
    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      channel.unsubscribe();
    });
  }
);
```

### Client SSE Connection

```javascript
function connectEmotionStream(profileId, callbacks) {
  const token = Wized.data.v.accessToken;
  const url = `${API_BASE}/profiles/${profileId}/emotions/stream`;
  
  const eventSource = new EventSource(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  eventSource.addEventListener('connected', (e) => {
    console.log('Emotion stream connected');
    callbacks.onConnected?.(JSON.parse(e.data));
  });
  
  eventSource.addEventListener('emotion', (e) => {
    const data = JSON.parse(e.data);
    callbacks.onEmotion?.(data);
  });
  
  eventSource.onerror = (e) => {
    console.error('SSE error', e);
    callbacks.onError?.(e);
    
    // Reconnect after delay
    setTimeout(() => {
      if (eventSource.readyState === EventSource.CLOSED) {
        connectEmotionStream(profileId, callbacks);
      }
    }, 5000);
  };
  
  return eventSource;
}

// Usage
const stream = connectEmotionStream('uuid', {
  onEmotion: (data) => {
    showEmotionBadge(data.emotion);
    updateEmotionGraph(data);
  }
});
```

---

## Broadcast Channels

### Notification Broadcast

```typescript
// Send notification to user
async function sendNotification(
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: object;
  }
) {
  // Store in database
  const { data } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      ...notification
    })
    .select()
    .single();
  
  // Also broadcast for immediate delivery
  await supabase
    .channel(`notifications:${userId}`)
    .send({
      type: 'broadcast',
      event: 'new_notification',
      payload: data
    });
  
  return data;
}
```

### Notification Subscription

```javascript
// Subscribe to notifications
function subscribeToNotifications(userId) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on('broadcast', { event: 'new_notification' }, (payload) => {
      showNotificationToast(payload.payload);
      incrementUnreadBadge();
    })
    .subscribe();
  
  return channel;
}
```

---

## Progressive Loading UI

### Skeleton Loader Pattern

```html
<!-- Story card with skeleton states -->
<div class="story-card" data-story-id="{{storyId}}">
  <div class="cover-image skeleton" data-asset="cover">
    <div class="progress-bar" style="width: 0%"></div>
  </div>
  
  <div class="story-content">
    <h3 class="title">{{title}}</h3>
    
    <div class="audio-player skeleton" data-asset="audio">
      <span class="status">Generating audio...</span>
    </div>
    
    <div class="pdf-download skeleton" data-asset="pdf">
      <span class="status">Creating PDF...</span>
    </div>
  </div>
</div>

<style>
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton.animating .progress-bar {
  transition: width 0.3s ease;
}

.error {
  background: #fee;
  border: 1px solid #f99;
}
</style>
```

### Load Order Strategy

```javascript
// Assets load in priority order
const ASSET_PRIORITY = [
  'text',      // Immediate - story text
  'cover',     // Fast - cover image
  'audio',     // Medium - narration
  'scenes',    // Medium - scene images
  'activities', // Slow - AI-generated activities
  'pdf'        // Last - depends on others
];

// Update UI based on what's ready
function renderAvailableAssets(status) {
  for (const asset of ASSET_PRIORITY) {
    const data = status.assets[asset];
    if (data?.status === 'ready') {
      renderAsset(asset, data);
    } else if (data?.status === 'generating') {
      showProgress(asset, data.progress);
    } else {
      showPending(asset);
    }
  }
}
```

---

## Connection Management

### Reconnection Logic

```javascript
class RealtimeManager {
  constructor() {
    this.channels = new Map();
    this.connectionState = 'disconnected';
  }
  
  subscribe(channelName, config, handlers) {
    const channel = supabase
      .channel(channelName, {
        config: {
          presence: { key: channelName }
        }
      })
      .on('postgres_changes', config, handlers.onChange)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.connectionState = 'connected';
          handlers.onConnect?.();
        } else if (status === 'CHANNEL_ERROR') {
          this.connectionState = 'error';
          handlers.onError?.();
          this.reconnect(channelName, config, handlers);
        }
      });
    
    this.channels.set(channelName, { channel, config, handlers });
    return channel;
  }
  
  reconnect(channelName, config, handlers) {
    setTimeout(() => {
      console.log(`Reconnecting to ${channelName}...`);
      this.subscribe(channelName, config, handlers);
    }, 3000);
  }
  
  unsubscribe(channelName) {
    const entry = this.channels.get(channelName);
    if (entry) {
      entry.channel.unsubscribe();
      this.channels.delete(channelName);
    }
  }
  
  unsubscribeAll() {
    for (const [name] of this.channels) {
      this.unsubscribe(name);
    }
  }
}

// Usage
const realtime = new RealtimeManager();

realtime.subscribe(
  `story:${storyId}`,
  { event: 'UPDATE', schema: 'public', table: 'stories', filter: `id=eq.${storyId}` },
  {
    onChange: updateUI,
    onConnect: () => console.log('Connected'),
    onError: () => showConnectionError()
  }
);
```

---

**Last Updated**: December 23, 2025

