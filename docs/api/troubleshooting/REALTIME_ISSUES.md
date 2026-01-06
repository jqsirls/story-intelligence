# Real-time & Streaming Troubleshooting

**Fixing Supabase Realtime & SSE Issues**

---

## Common Connection Issues

### Issue 1: Connection Not Establishing

**Symptom:** `CHANNEL_ERROR` on subscribe, no events received

**Diagnosis:**
```javascript
const channel = supabase
  .channel('test')
  .subscribe((status) => {
    console.log('Status:', status);
    // Expected: SUBSCRIBED, TIMED_OUT, CLOSED, CHANNEL_ERROR
  });
```

**Solutions:**

1. **Check Supabase project configuration:**
```bash
# Verify realtime is enabled in Supabase dashboard
# Project Settings > API > Realtime
```

2. **Verify authentication:**
```javascript
// Ensure user is authenticated before subscribing
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  await supabase.auth.signInWithPassword({ email, password });
}
```

3. **Check RLS policies:**
```sql
-- Ensure realtime has proper RLS policies
CREATE POLICY "Users can subscribe to their stories"
ON stories FOR SELECT
USING (user_id = auth.uid());
```

---

### Issue 2: Missing Updates

**Symptom:** Database changes not triggering events

**Diagnosis:**
```javascript
// Subscribe with logging
const channel = supabase
  .channel('debug-stories')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'stories' },
    (payload) => {
      console.log('Change received:', payload);
    }
  )
  .subscribe((status, err) => {
    console.log('Subscribe status:', status);
    if (err) console.error('Subscribe error:', err);
  });
```

**Solutions:**

1. **Enable replication for table:**
```sql
-- In Supabase SQL Editor
ALTER TABLE stories REPLICA IDENTITY FULL;
```

2. **Add table to publication:**
```sql
-- Check current publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Add table if missing
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
```

3. **Verify filter syntax:**
```javascript
// Correct filter format
{
  event: 'UPDATE',
  schema: 'public',
  table: 'stories',
  filter: 'id=eq.story-uuid'  // Correct: column=operator.value
}
```

---

### Issue 3: Connection Drops

**Symptom:** Events stop after a period of time

**Solutions:**

1. **Implement heartbeat:**
```javascript
const channel = supabase.channel('stories');

// Send heartbeat every 30 seconds
setInterval(() => {
  channel.send({
    type: 'heartbeat',
    payload: {}
  });
}, 30000);
```

2. **Handle reconnection:**
```javascript
let channel;

function connect() {
  channel = supabase
    .channel('stories')
    .on('postgres_changes', { ... }, handleChange)
    .subscribe((status) => {
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        console.log('Connection lost, reconnecting...');
        setTimeout(connect, 3000);
      }
    });
}

connect();
```

3. **Check for network issues:**
```javascript
window.addEventListener('online', () => {
  console.log('Network restored, reconnecting...');
  channel?.subscribe();
});

window.addEventListener('offline', () => {
  console.log('Network lost');
});
```

---

## SSE Issues

### Issue 1: SSE Not Connecting

**Symptom:** EventSource errors, no events

**Diagnosis:**
```javascript
const es = new EventSource('/api/v1/stories/123/assets/stream');

es.onopen = () => console.log('SSE connected');
es.onerror = (e) => console.error('SSE error:', e);
```

**Solutions:**

1. **Check CORS headers:**
```typescript
// Server must send correct headers
res.setHeader('Access-Control-Allow-Origin', origin);
res.setHeader('Access-Control-Allow-Credentials', 'true');
```

2. **Verify content type:**
```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
```

3. **Disable buffering (Nginx):**
```nginx
location /api/v1/stories/ {
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 86400s;
}
```

---

### Issue 2: SSE Messages Not Parsing

**Symptom:** Events fire but data is undefined

**Correct SSE Format:**
```typescript
// Server must send properly formatted events
res.write(`event: asset_update\n`);
res.write(`data: ${JSON.stringify(payload)}\n`);
res.write(`\n`);  // Empty line ends the event
```

**Client parsing:**
```javascript
const es = new EventSource(url);

es.addEventListener('asset_update', (e) => {
  const data = JSON.parse(e.data);  // Parse the data field
  console.log('Asset update:', data);
});
```

---

### Issue 3: SSE Connection Timeout

**Symptom:** Connection closes after ~60 seconds

**Solutions:**

1. **Send keepalive comments:**
```typescript
// Server: send comment every 30 seconds
const keepAlive = setInterval(() => {
  res.write(`: keepalive\n\n`);  // Comment line
}, 30000);

req.on('close', () => clearInterval(keepAlive));
```

2. **Increase timeout on load balancer:**
```yaml
# AWS ALB
IdleTimeout: 3600  # 1 hour

# CloudFront
OriginReadTimeout: 60
```

3. **Client reconnection:**
```javascript
function connectSSE() {
  const es = new EventSource(url);
  
  es.onerror = () => {
    es.close();
    setTimeout(connectSSE, 1000);
  };
  
  return es;
}
```

---

## Progressive Loading Issues

### Issue 1: Assets Not Updating UI

**Symptom:** Database updates but UI doesn't reflect changes

**Diagnosis:**
```javascript
// Check if subscription is receiving updates
channel.on('postgres_changes', { ... }, (payload) => {
  console.log('Payload received:', payload);
  console.log('New status:', payload.new.asset_generation_status);
});
```

**Solutions:**

1. **Check field in SELECT:**
```javascript
// Ensure subscribing to correct columns
supabase
  .from('stories')
  .select('id, asset_generation_status')  // Include tracked field
  .eq('id', storyId);
```

2. **Force UI update:**
```javascript
// React
const [status, setStatus] = useState({});

useEffect(() => {
  const channel = supabase
    .channel(`story:${storyId}`)
    .on('postgres_changes', { ... }, (payload) => {
      setStatus({ ...payload.new.asset_generation_status });  // New reference
    })
    .subscribe();
    
  return () => channel.unsubscribe();
}, [storyId]);
```

---

### Issue 2: Race Conditions

**Symptom:** UI shows incorrect/stale state

**Solutions:**

1. **Sequence validation:**
```javascript
let lastSequence = 0;

channel.on('postgres_changes', { ... }, (payload) => {
  const sequence = payload.new.sequence_number;
  if (sequence <= lastSequence) {
    console.log('Ignoring out-of-order update');
    return;
  }
  lastSequence = sequence;
  updateUI(payload.new);
});
```

2. **Optimistic locking:**
```typescript
// Include version in updates
await supabase
  .from('stories')
  .update({ 
    status: 'ready',
    version: currentVersion + 1
  })
  .eq('id', storyId)
  .eq('version', currentVersion);  // Only update if version matches
```

---

## Debugging Tools

### Supabase Realtime Inspector

```javascript
// Enable debug logging
const channel = supabase.channel('debug', {
  config: {
    log_level: 'debug'
  }
});
```

### SSE Debug Curl

```bash
# Test SSE endpoint
curl -N -H "Authorization: Bearer $TOKEN" \
  https://api.storytailor.dev/api/v1/stories/123/assets/stream
```

### Network Tab Analysis

1. Open DevTools > Network
2. Filter by "WS" for WebSocket (Supabase)
3. Filter by "EventStream" for SSE
4. Check Messages tab for event flow

---

**Last Updated**: December 23, 2025

