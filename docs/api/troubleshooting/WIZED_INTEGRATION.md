# Wized Integration Troubleshooting

**Fixing Common Wized Embed 2.0 Integration Issues**

---

## Authentication Issues

### Issue 1: Token Not Persisting

**Symptom:** User gets logged out on page refresh

**Solution:**
```javascript
window.Wized.push((Wized) => {
  // Store token in localStorage via Wized
  Wized.data.v.accessToken = response.data.accessToken;
  
  // Also persist to localStorage for page reloads
  localStorage.setItem('st_access_token', response.data.accessToken);
  localStorage.setItem('st_refresh_token', response.data.refreshToken);
  localStorage.setItem('st_token_expiry', response.data.expiresAt);
});

// On page load, restore from localStorage
window.Wized.push((Wized) => {
  const token = localStorage.getItem('st_access_token');
  if (token) {
    Wized.data.v.accessToken = token;
  }
});
```

---

### Issue 2: Request Authorization Header Missing

**Symptom:** API returns 401 despite being logged in

**Diagnosis:**
```javascript
// Check if token is in Wized variables
console.log('Token:', Wized.data.v.accessToken);
```

**Solution:**
```javascript
// Wized Request Configuration
// In Wized dashboard, set Authorization header:
// Header Name: Authorization
// Header Value: Bearer {{v.accessToken}}
```

---

### Issue 3: Token Refresh Not Working

**Solution:**
```javascript
window.Wized.push((Wized) => {
  // Intercept 401 responses
  Wized.on('requestError', async (event) => {
    if (event.error?.status === 401) {
      const refreshToken = localStorage.getItem('st_refresh_token');
      
      if (refreshToken) {
        try {
          const result = await Wized.requests.execute('refreshToken', {
            refreshToken
          });
          
          // Update stored tokens
          Wized.data.v.accessToken = result.data.accessToken;
          localStorage.setItem('st_access_token', result.data.accessToken);
          localStorage.setItem('st_refresh_token', result.data.refreshToken);
          
          // Retry failed request
          window.location.reload();
        } catch (e) {
          // Refresh failed, redirect to login
          window.location.href = '/login';
        }
      }
    }
  });
});
```

---

## Request/Response Issues

### Issue 1: Request Body Not Sending

**Symptom:** Server receives empty body

**Diagnosis:**
```javascript
// Check request in Wized
Wized.on('requestStart', (event) => {
  console.log('Request body:', event.request.body);
});
```

**Solution:**
```javascript
// Ensure Content-Type header is set
// In Wized request settings:
// Header: Content-Type
// Value: application/json

// Body should be JSON formatted
// Use double curly braces for variables: {{v.formData}}
```

---

### Issue 2: Response Data Not Accessible

**Symptom:** `Wized.data.r.requestName.data` is undefined

**Solutions:**

1. **Check request name:**
```javascript
// Request name in Wized dashboard must match
const data = Wized.data.r.Get_Stories.data;  // Case-sensitive
```

2. **Wait for request completion:**
```javascript
Wized.on('request', async (event) => {
  if (event.name === 'Get_Stories') {
    // Request complete, data available
    console.log(Wized.data.r.Get_Stories.data);
  }
});
```

3. **Check response format:**
```javascript
// API returns nested data
const stories = Wized.data.r.Get_Stories.data.data.items;
// First .data is request result, second is API response structure
```

---

### Issue 3: Dynamic Parameters Not Interpolating

**Symptom:** URL contains literal `{{v.storyId}}` instead of value

**Solutions:**

1. **Check variable exists:**
```javascript
console.log('Variable value:', Wized.data.v.storyId);
```

2. **Set variable before request:**
```javascript
// In Wized action before request
Wized.data.v.storyId = 'actual-story-id';
await Wized.requests.execute('Get_Story');
```

3. **Use correct syntax:**
```
// URL: /api/v1/stories/{{v.storyId}}
// NOT: /api/v1/stories/${v.storyId}
```

---

## Reactivity Issues

### Issue 1: UI Not Updating

**Symptom:** Data changes but UI doesn't reflect

**Solutions:**

1. **Use Wized reactivity:**
```javascript
Wized.reactivity.effect(() => {
  const stories = Wized.data.r.Get_Stories?.data?.data?.items || [];
  // This runs whenever Get_Stories data changes
  renderStories(stories);
});
```

2. **Trigger re-render:**
```javascript
// Force update by setting a reactive variable
Wized.data.v.lastUpdate = Date.now();
```

3. **Check element bindings:**
```html
<!-- In Webflow, ensure element has Wized binding -->
<div w-el="story-list">
  <!-- Wized will populate this -->
</div>
```

---

### Issue 2: Infinite Loop in Effect

**Symptom:** Page freezes, console shows repeated logs

**Cause:** Effect modifies data it depends on

**Solution:**
```javascript
// ❌ Wrong - creates infinite loop
Wized.reactivity.effect(() => {
  const data = Wized.data.v.counter;
  Wized.data.v.counter = data + 1;  // Triggers effect again
});

// ✅ Correct - separate trigger
let initialized = false;
Wized.reactivity.effect(() => {
  const data = Wized.data.v.counter;
  if (!initialized) {
    initialized = true;
    // One-time initialization
  }
});
```

---

## Real-time Integration

### Issue 1: Supabase + Wized Conflict

**Symptom:** Supabase events not updating Wized data

**Solution:**
```javascript
// Bridge Supabase realtime to Wized
window.Wized.push((Wized) => {
  const channel = supabase
    .channel('stories')
    .on('postgres_changes', { ... }, (payload) => {
      // Update Wized variable to trigger reactivity
      Wized.data.v.latestStoryUpdate = payload.new;
      
      // Or refresh the request
      Wized.requests.execute('Get_Stories');
    })
    .subscribe();
});
```

---

### Issue 2: SSE with Wized

**Solution:**
```javascript
window.Wized.push((Wized) => {
  const storyId = Wized.data.v.currentStoryId;
  const token = Wized.data.v.accessToken;
  
  // Create EventSource with auth (requires polyfill for headers)
  const es = new EventSourcePolyfill(
    `${API_BASE}/stories/${storyId}/assets/stream`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  es.addEventListener('asset_update', (e) => {
    const data = JSON.parse(e.data);
    Wized.data.v.assetStatus = data;  // Triggers Wized reactivity
  });
});
```

---

## Debugging Tips

### Enable Wized Debug Mode

```javascript
// In browser console
localStorage.setItem('wized-debug', 'true');
// Reload page - Wized will log all operations
```

### Log All Requests

```javascript
window.Wized.push((Wized) => {
  Wized.on('requestStart', (event) => {
    console.log('[Wized] Request starting:', event.name, event.request);
  });
  
  Wized.on('request', (event) => {
    console.log('[Wized] Request complete:', event.name, event.response);
  });
  
  Wized.on('requestError', (event) => {
    console.error('[Wized] Request error:', event.name, event.error);
  });
});
```

### Inspect Wized State

```javascript
// In browser console
console.log('Variables:', window.Wized.data.v);
console.log('Requests:', window.Wized.data.r);
```

---

## Best Practices

1. **Always check for data existence:**
```javascript
const items = Wized.data.r.Get_Stories?.data?.data?.items || [];
```

2. **Use try-catch for requests:**
```javascript
try {
  await Wized.requests.execute('Create_Story');
} catch (error) {
  console.error('Request failed:', error);
  showError('Failed to create story');
}
```

3. **Clean up subscriptions:**
```javascript
window.addEventListener('beforeunload', () => {
  channel?.unsubscribe();
  eventSource?.close();
});
```

---

**Last Updated**: December 23, 2025

