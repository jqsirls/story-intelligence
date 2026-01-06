Status: Published  
Audience: Partner | Developer  
Last-Updated: 2025-12-17  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  

# A2A Protocol Integration Guide

## Overview

This guide walks you through integrating with Storytailor's A2A (Agent-to-Agent) protocol. The A2A protocol enables external agents and partner platforms to communicate with Storytailor's agent system using standardized JSON-RPC 2.0 messaging.

## Prerequisites

- API key or OAuth 2.0 credentials from Storytailor
- HTTP client library (curl, axios, fetch, etc.)
- Understanding of JSON-RPC 2.0 protocol
- (Optional) SSE client for real-time task updates

## Quick Start

### 1. Discover Agent Capabilities

First, discover what the Storytailor agent can do:

```bash
curl https://storyintelligence.dev/a2a/discovery
```

**Response:**
```json
{
  "agentCard": {
    "id": "storytailor-agent",
    "name": "Storytailor Agent",
    "capabilities": ["storytelling", "emotional-check-in", "crisis-detection"],
    "endpoints": {
      "service": "https://storyintelligence.dev/a2a",
      "webhook": "https://storyintelligence.dev/a2a/webhook"
    }
  }
}
```

### 2. Authenticate

Choose an authentication method:

**Option A: API Key**
```bash
curl -H "X-API-Key: [REDACTED_API_KEY]" https://d3su0gpyy6qhel.cloudfront.net/a2a/message ...
```

**Option B: OAuth 2.0 Bearer Token**
```bash
curl -H "Authorization: Bearer [REDACTED_JWT]" https://storyintelligence.dev/a2a/message ...
```

### 3. Send a Message

Send a JSON-RPC 2.0 message:

```bash
curl -X POST https://storyintelligence.dev/a2a/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: [REDACTED_API_KEY]" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "story.generate",
    "params": {
      "characterId": "char_123",
      "storyType": "Adventure"
    }
  }'
```

## Integration Patterns

### Pattern 1: Synchronous Request-Response

For quick operations that complete in < 5 seconds:

```javascript
async function generateStory(characterId, storyType) {
  const response = await fetch('https://storyintelligence.dev/a2a/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.STORYTAILOR_API_KEY
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: 'story.generate',
      params: {
        characterId,
        storyType
      }
    })
  });

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`A2A Error: ${result.error.message}`);
  }
  
  return result.result;
}
```

### Pattern 2: Asynchronous Task with Polling

For long-running operations:

```javascript
async function generateStoryAsync(characterId, storyType) {
  // 1. Create task
  const taskResponse = await fetch('https://storyintelligence.dev/a2a/task', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.STORYTAILOR_API_KEY
    },
    body: JSON.stringify({
      method: 'story.generate',
      params: { characterId, storyType },
      clientAgentId: 'my-agent-id'
    })
  });

  const task = await taskResponse.json();
  const taskId = task.taskId;

  // 2. Poll for completion
  while (true) {
    const statusResponse = await fetch(
      `https://storyintelligence.dev/a2a/status?taskId=${taskId}`,
      {
        headers: {
          'X-API-Key': process.env.STORYTAILOR_API_KEY
        }
      }
    );

    const status = await statusResponse.json();

    if (status.state === 'completed') {
      return status.result;
    } else if (status.state === 'failed') {
      throw new Error(`Task failed: ${status.error?.message || 'Unknown error'}`);
    } else if (status.state === 'canceled') {
      throw new Error('Task was canceled');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### Pattern 3: Asynchronous Task with SSE Streaming

For real-time progress updates:

```javascript
async function generateStoryWithStream(characterId, storyType) {
  // 1. Create task
  const taskResponse = await fetch('https://storyintelligence.dev/a2a/task', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.STORYTAILOR_API_KEY
    },
    body: JSON.stringify({
      method: 'story.generate',
      params: { characterId, storyType },
      clientAgentId: 'my-agent-id'
    })
  });

  const task = await taskResponse.json();
  const taskId = task.taskId;

  // 2. Stream updates
  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(
      `https://storyintelligence.dev/a2a/status?taskId=${taskId}&stream=true`,
      {
        headers: {
          'X-API-Key': process.env.STORYTAILOR_API_KEY
        }
      }
    );

    eventSource.onmessage = (event) => {
      const status = JSON.parse(event.data);

      if (status.state === 'completed') {
        eventSource.close();
        resolve(status.result);
      } else if (status.state === 'failed') {
        eventSource.close();
        reject(new Error(`Task failed: ${status.error?.message || 'Unknown error'}`));
      } else if (status.state === 'canceled') {
        eventSource.close();
        reject(new Error('Task was canceled'));
      } else {
        // Update progress
        console.log(`Progress: ${status.progress || 0}%`);
      }
    };

    eventSource.onerror = (error) => {
      eventSource.close();
      reject(error);
    };
  });
}
```

### Pattern 4: Webhook Notifications

For event-driven architectures:

```javascript
// Configure webhook endpoint
const webhookUrl = 'https://your-service.com/webhooks/storytailor';

// In your webhook handler
app.post('/webhooks/storytailor', async (req, res) => {
  // Verify signature
  const signature = req.headers['x-a2a-signature'];
  const timestamp = req.headers['x-a2a-timestamp'];
  
  // Verify HMAC-SHA256 signature
  const expectedSignature = generateSignature(req.body, timestamp, webhookSecret);
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, taskId, data } = req.body;

  switch (event) {
    case 'task.completed':
      // Handle completed task
      await handleTaskCompleted(taskId, data);
      break;
    case 'task.failed':
      // Handle failed task
      await handleTaskFailed(taskId, data);
      break;
    case 'task.input_required':
      // Handle input required
      await handleInputRequired(taskId, data);
      break;
  }

  res.json({ success: true });
});
```

## Available Methods

### story.generate

Generate a therapeutic story for a character.

**Method:** `story.generate`

**Required Scope:** `a2a:write`

**Parameters:**
```json
{
  "characterId": "string (required)",
  "storyType": "string (required)",
  "theme": "string (optional)",
  "length": "number (optional)"
}
```

**Response:**
```json
{
  "storyId": "string",
  "status": "generated",
  "content": "string",
  "metadata": {}
}
```

### emotion.checkin

Perform an emotional check-in assessment.

**Method:** `emotion.checkin`

**Required Scope:** `a2a:write`

**Parameters:**
```json
{
  "userId": "string (required)",
  "sessionId": "string (optional)"
}
```

**Response:**
```json
{
  "assessmentId": "string",
  "emotionalState": "string",
  "recommendations": []
}
```

### crisis.detect

Detect potential crisis indicators.

**Method:** `crisis.detect`

**Required Scope:** `a2a:write`

**Parameters:**
```json
{
  "userId": "string (required)",
  "message": "string (required)",
  "sessionId": "string (optional)"
}
```

**Response:**
```json
{
  "riskLevel": "low" | "medium" | "high",
  "indicators": [],
  "recommendations": []
}
```

### library.list

List items in a user's library.

**Method:** `library.list`

**Required Scope:** `a2a:read`

**Parameters:**
```json
{
  "userId": "string (required)",
  "type": "string (optional)",
  "limit": "number (optional)",
  "offset": "number (optional)"
}
```

**Response:**
```json
{
  "items": [],
  "total": 0,
  "limit": 10,
  "offset": 0
}
```

## Error Handling

Always check for errors in responses:

```javascript
const response = await fetch('https://storyintelligence.dev/a2a/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey
  },
  body: JSON.stringify(request)
});

const result = await response.json();

if (result.error) {
  // Handle error
  switch (result.error.code) {
    case -32006: // Authentication failed
      // Retry with new credentials
      break;
    case -32007: // Rate limit exceeded
      // Wait and retry
      await sleep(60000); // Wait 1 minute
      break;
    case -32602: // Invalid params
      // Fix parameters and retry
      break;
    default:
      // Handle other errors
      console.error('A2A Error:', result.error);
  }
} else {
  // Success
  return result.result;
}
```

## Best Practices

### 1. Use Appropriate Pattern

- **Synchronous:** For operations < 5 seconds
- **Asynchronous with Polling:** For operations 5-30 seconds
- **Asynchronous with SSE:** For operations > 30 seconds or when progress updates are valuable
- **Webhooks:** For event-driven architectures

### 2. Handle Rate Limits

```javascript
async function makeRequestWithRetry(request, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('https://storyintelligence.dev/a2a/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(request)
      });

      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        await sleep(retryAfter * 1000);
        continue;
      }

      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

### 3. Validate Responses

```javascript
function validateA2AResponse(response) {
  if (!response.jsonrpc || response.jsonrpc !== '2.0') {
    throw new Error('Invalid JSON-RPC response');
  }

  if (response.error) {
    throw new A2AError(response.error.code, response.error.message, response.error.data);
  }

  if (!response.result) {
    throw new Error('Response missing result');
  }

  return response.result;
}
```

### 4. Implement Proper Timeouts

```javascript
async function makeRequestWithTimeout(request, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://storyintelligence.dev/a2a/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}
```

## Testing

### Test with Mock Responses

```javascript
// Mock A2A adapter for testing
const mockA2AAdapter = {
  async sendMessage(method, params) {
    // Return mock response
    return {
      jsonrpc: '2.0',
      id: '1',
      result: {
        storyId: 'mock-story-123',
        status: 'generated'
      }
    };
  }
};
```

### Integration Testing

```javascript
describe('A2A Integration', () => {
  it('should generate story', async () => {
    const response = await fetch('https://storyintelligence.dev/a2a/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.TEST_API_KEY
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'story.generate',
        params: {
          characterId: 'test-char',
          storyType: 'Adventure'
        }
      })
    });

    const result = await response.json();
    expect(result.result).toBeDefined();
    expect(result.result.storyId).toBeDefined();
  });
});
```

## Security Considerations

1. **Never expose API keys** in client-side code
2. **Use HTTPS** for all requests
3. **Verify webhook signatures** before processing
4. **Implement rate limiting** on your side
5. **Validate all inputs** before sending to A2A
6. **Use OAuth 2.0** for production integrations when possible

## Support

For integration support:
- **Documentation:** `docs/platform/a2a/`
- **API Reference:** `docs/platform/a2a/api-reference.md`
- **Issues:** Contact Storytailor support team

## Related Documentation

- **API Reference:** `docs/platform/a2a/api-reference.md`
- **Overview:** `docs/platform/a2a/overview.md`
- **Protocol Specification:** https://a2a-protocol.org/v0.2.0/specification
