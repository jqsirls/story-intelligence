# Asset Generation Troubleshooting

**Fixing Story Asset Generation Issues**

---

## Asset Generation Flow

```
Story Created → Assets Queued → Generation Started → Progress Updates → Complete/Failed
     ↓              ↓                  ↓                    ↓              ↓
 Return 201    Status: pending    Status: generating    Realtime       Email Sent
                                                        Updates
```

---

## Common Issues

### Issue 1: Assets Stuck in "Pending"

**Symptom:** Asset status remains "pending" indefinitely

**Diagnosis:**
```javascript
// Check asset status
const response = await fetch(`/api/v1/stories/${storyId}/assets/status`);
const status = await response.json();
console.log('Status:', status.data);
```

**Causes:**
1. Generation queue backed up
2. Worker process not running
3. Database update failed

**Solutions:**

1. **Check queue health:**
```bash
# Redis queue status
redis-cli LLEN storytailor:queue:assets
```

2. **Restart generation:**
```http
POST /api/v1/stories/{storyId}/assets/retry
Authorization: Bearer {token}

{
  "assetTypes": ["audio", "cover"]
}
```

3. **Check worker logs:**
```bash
# CloudWatch query
fields @timestamp, @message
| filter @message like /AssetGenerationPipeline/
| filter storyId = 'story-uuid'
| sort @timestamp desc
```

---

### Issue 2: Audio Generation Fails

**Error:**
```json
{
  "assetType": "audio",
  "status": "failed",
  "error": "Voice synthesis timeout"
}
```

**Causes:**
1. ElevenLabs API unavailable
2. Story text too long
3. Invalid voice ID

**Solutions:**

1. **Check ElevenLabs status:**
```bash
curl -H "xi-api-key: $ELEVENLABS_KEY" \
  https://api.elevenlabs.io/v1/voices
```

2. **Verify voice ID:**
```http
GET /api/v1/audio/voices
```

3. **Retry with different voice:**
```http
POST /api/v1/stories/{storyId}/audio
{
  "voiceId": "alloy",
  "regenerate": true
}
```

---

### Issue 3: Image Generation Fails

**Error:**
```json
{
  "assetType": "cover",
  "status": "failed",
  "error": "Content policy violation"
}
```

**Causes:**
1. Prompt triggered safety filters
2. API rate limit exceeded
3. Invalid character traits

**Solutions:**

1. **Check content:**
- Review story for potentially flagged content
- Check character description

2. **Retry with simplified prompt:**
```http
POST /api/v1/stories/{storyId}/assets/retry
{
  "assetTypes": ["cover"],
  "options": {
    "simplifyPrompt": true
  }
}
```

3. **Manual regeneration:**
```http
POST /api/v1/stories/{storyId}/art/regenerate
{
  "sceneIndex": 0,
  "style": "illustrated"
}
```

---

### Issue 4: PDF Generation Fails

**Error:**
```json
{
  "assetType": "pdf",
  "status": "failed",
  "error": "Missing required assets"
}
```

**Cause:** PDF requires other assets (art, text) to be complete first

**Solution:**
```javascript
// Wait for dependencies
const status = await getAssetStatus(storyId);
const hasArt = status.assets.cover?.status === 'ready';
const hasText = status.assets.text?.status === 'ready';

if (hasArt && hasText) {
  await retryAsset(storyId, 'pdf');
}
```

---

### Issue 5: Partial Generation

**Symptom:** Some assets complete, others fail

**Response:**
```json
{
  "overall": "partial",
  "assets": {
    "text": { "status": "ready" },
    "cover": { "status": "ready" },
    "audio": { "status": "failed", "error": "..." },
    "pdf": { "status": "pending" }
  }
}
```

**Solutions:**

1. **Retry failed assets only:**
```http
POST /api/v1/stories/{storyId}/assets/retry
{
  "assetTypes": ["audio"]
}
```

2. **Skip failed and continue:**
```http
POST /api/v1/stories/{storyId}/assets/continue
{
  "skipFailed": true
}
```

---

### Issue 6: Progress Updates Not Appearing

**Symptom:** UI shows pending but no progress

**Diagnosis:**
```javascript
// Check Supabase subscription
const channel = supabase
  .channel(`story:${storyId}`)
  .on('postgres_changes', { 
    event: 'UPDATE', 
    schema: 'public', 
    table: 'stories',
    filter: `id=eq.${storyId}`
  }, (payload) => {
    console.log('Update received:', payload);
  })
  .subscribe((status) => {
    console.log('Subscription status:', status);
  });
```

**Solutions:**

1. **Verify subscription is connected**
2. **Check RLS policies allow reading**
3. **Verify realtime is enabled for table**

See [Realtime Issues](./REALTIME_ISSUES.md) for detailed troubleshooting.

---

## Quota & Tier Issues

### Issue 7: Generation Blocked by Quota

**Error:**
```json
{
  "success": false,
  "error": "Daily generation quota exceeded",
  "code": "ERR_4002"
}
```

**Solutions:**

1. **Check current usage:**
```http
GET /api/v1/users/me/usage
```

2. **Wait for reset (midnight UTC)**

3. **Upgrade subscription for higher limits**

---

### Issue 8: Asset Not Available for Tier

**Error:**
```json
{
  "success": false,
  "error": "PDF generation is not available on your plan",
  "code": "ERR_6002"
}
```

**Solution:**
- Upgrade to a tier that includes the asset type
- See tier comparison at `/pricing`

---

## Retry Strategies

### Automatic Retry

The system automatically retries failed assets:
- **Max retries:** 3
- **Backoff:** Exponential (1s, 2s, 4s)
- **Retryable errors:** Timeouts, rate limits, transient failures

### Manual Retry

```http
POST /api/v1/stories/{storyId}/assets/retry
Authorization: Bearer {token}

{
  "assetTypes": ["audio", "cover"],
  "force": true
}
```

### Cancel & Restart

```http
# Cancel current generation
POST /api/v1/stories/{storyId}/assets/cancel

# Start fresh
POST /api/v1/stories/{storyId}/assets/generate
{
  "assetTypes": ["audio", "cover", "pdf"]
}
```

---

## Monitoring Asset Generation

### Get Detailed Status

```http
GET /api/v1/stories/{storyId}/assets/status?detailed=true
```

**Response:**
```json
{
  "overall": "generating",
  "assets": {
    "audio": {
      "status": "generating",
      "progress": 65,
      "startedAt": "2024-01-01T12:00:00Z",
      "estimatedCompletion": "2024-01-01T12:01:30Z"
    }
  },
  "jobs": [
    {
      "id": "job-uuid",
      "assetType": "audio",
      "status": "running",
      "retryCount": 0
    }
  ]
}
```

### Subscribe to Updates

```javascript
// Real-time status updates
const unsubscribe = subscribeToAssetUpdates(storyId, (update) => {
  console.log(`${update.assetType}: ${update.status}`);
  
  if (update.status === 'ready') {
    loadAsset(update.assetType, update.url);
  } else if (update.status === 'failed') {
    showRetryButton(update.assetType, update.error);
  }
});
```

---

## Cost Estimation

Before generating, estimate costs:

```http
POST /api/v1/stories/{storyId}/assets/estimate
{
  "assetTypes": ["audio", "cover", "pdf"]
}
```

**Response:**
```json
{
  "estimates": {
    "audio": { "cost": 0.15, "time": 30 },
    "cover": { "cost": 0.02, "time": 15 },
    "pdf": { "cost": 0.01, "time": 10 }
  },
  "total": { "cost": 0.18, "time": 55 },
  "tier": "premium",
  "included": true
}
```

---

**Last Updated**: December 23, 2025

