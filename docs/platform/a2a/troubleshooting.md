# A2A Protocol Troubleshooting Guide

**Last Updated:** December 2025  
**Audience:** Partner Developers, Integration Engineers  
**Purpose:** Common issues and solutions for A2A protocol integration

## Overview

This guide helps you diagnose and fix common issues when integrating with the Storytailor A2A (Agent2Agent) protocol.

---

## Authentication Issues

### Issue: "Authentication Failed" (-32006)

**Symptoms:**
- All requests returning authentication error
- Recently working, now broken
- 403 or 401 responses

**Diagnosis:**
1. Check API key in `X-API-Key` header
2. For OAuth: Verify Bearer token and scopes
3. For JWKS: Verify token signature and issuer

**Solutions:**

**API Key method:**
```http
POST /a2a/message
X-API-Key: your-api-key-here
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": "req-123",
  "method": "story.generate",
  "params": {...}
}
```

**OAuth method:**
```http
POST /a2a/message
Authorization: Bearer your-oauth-token
Content-Type: application/json
```

Verify token has required scopes:
- `a2a:read` - For read operations
- `a2a:write` - For write operations

---

### Issue: JWKS Token Verification Failing

**Symptoms:**
- OAuth tokens being rejected
- Error: "Token signature invalid"
- Works with API key but not OAuth

**Diagnosis:**
1. Verify JWKS URL is accessible
2. Check token issuer matches configuration
3. Verify token audience matches
4. Check token hasn't expired

**Solutions:**
- Verify token claims:
  ```json
  {
    "iss": "https://accounts.google.com",  // Must match A2A_TOKEN_ISSUER
    "aud": "storytailor-a2a-api",         // Must match A2A_TOKEN_AUDIENCE
    "sub": "agent-id",
    "scope": "a2a:read a2a:write",
    "exp": 1705318260
  }
  ```

- Test JWKS endpoint:
  ```bash
  curl https://www.googleapis.com/oauth2/v3/certs
  # Should return public keys
  ```

---

## Task Management Issues

### Issue: Task Stuck in "working" State

**Symptoms:**
- Task stays in "working" for extended time
- Progress not updating
- No completion or failure

**Diagnosis:**
1. Check how long task has been running
2. Verify task type and expected duration
3. Check for agent availability issues

**Solutions:**
- Story generation typically takes 30-60 seconds
- If > 2 minutes: Likely stuck
- Cancel and retry:
  ```json
  POST /a2a/task/{taskId}/cancel
  
  // Then create new task
  POST /a2a/task
  ```

- Implement timeout in client:
  ```javascript
  async function waitForTaskWithTimeout(taskId, timeout = 120000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const task = await getTaskStatus(taskId);
      
      if (task.state === 'completed' || task.state === 'failed') {
        return task;
      }
      
      await sleep(2000);  // Poll every 2 seconds
    }
    
    // Timeout reached - cancel task
    await cancelTask(taskId);
    throw new Error('Task timeout');
  }
  ```

---

### Issue: "Task Not Found" (-32000) After Completion

**Symptoms:**
- Task completed successfully
- Later status check returns "not found"
- Missing task results

**Diagnosis:**
1. Check how long ago task completed
2. Verify task retention period (24 hours)
3. Check if task was explicitly deleted

**Solutions:**
- Retrieve results immediately after completion:
  ```javascript
  // Don't rely on task storage
  const task = await waitForTask(taskId);
  
  if (task.state === 'completed') {
    // Store result locally immediately
    saveResultLocally(task.result);
  }
  ```

- Tasks are deleted after retention period:
  - Completed: 24 hours
  - Failed: 24 hours
  - Canceled: 1 hour

**See also:** [Task Lifecycle](./task-lifecycle.md#task-retention-and-cleanup)

---

## Webhook Issues

### Issue: Webhooks Not Being Delivered

**Symptoms:**
- Webhook registered successfully
- Tasks completing but no webhook received
- No POST requests to webhook URL

**Diagnosis:**
1. Verify webhook URL is publicly accessible
2. Check webhook registration is active
3. Test webhook endpoint manually
4. Review webhook logs (if available)

**Solutions:**
- Test webhook URL publicly:
  ```bash
  curl -X POST https://yourapp.com/webhooks/a2a \
    -H "Content-Type: application/json" \
    -H "X-A2A-Signature: test" \
    -d '{"event": "test", "taskId": "test-123"}'
  
  # Should return 200 OK
  ```

- Verify webhook registration:
  ```json
  GET /a2a/webhooks
  
  // Check status is "active"
  {
    "webhooks": [
      {
        "id": "webhook-id",
        "url": "https://yourapp.com/webhooks/a2a",
        "status": "active",  // Must be active
        "events": ["task.completed", "task.failed"]
      }
    ]
  }
  ```

- Implement signature verification:
  ```javascript
  // Webhook handler must verify signature
  const signature = req.headers['x-a2a-signature'];
  const timestamp = req.headers['x-a2a-timestamp'];
  
  const expectedSignature = createHMAC('sha256', webhookSecret)
    .update(timestamp + '.' + JSON.stringify(req.body))
    .digest('hex');
  
  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  handleWebhookEvent(req.body);
  res.status(200).send('OK');
  ```

---

### Issue: Webhook Signature Verification Failing

**Symptoms:**
- Webhooks being received
- Signature verification failing
- Rejecting legitimate webhooks

**Diagnosis:**
1. Check webhook secret matches registration
2. Verify signature algorithm (HMAC-SHA256)
3. Check timestamp is included
4. Verify body hasn't been modified

**Solutions:**
- Correct signature verification:
  ```javascript
  import crypto from 'crypto';
  
  function verifyWebhookSignature(body, signature, timestamp, secret) {
    // Reconstruct signed content
    const signedContent = `${timestamp}.${JSON.stringify(body)}`;
    
    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedContent)
      .digest('hex');
    
    // Compare (constant-time comparison)
    return signature === `sha256=${expectedSignature}`;
  }
  ```

- Prevent replay attacks:
  ```javascript
  // Check timestamp is recent (within 5 minutes)
  const requestTime = parseInt(timestamp);
  const currentTime = Math.floor(Date.now() / 1000);
  
  if (Math.abs(currentTime - requestTime) > 300) {
    throw new Error('Webhook timestamp too old');
  }
  ```

---

## Task Input Issues

### Issue: Task Stuck in "input-required"

**Symptoms:**
- Task waiting for input
- Input provided but task not resuming
- Invalid input error

**Diagnosis:**
1. Check input format matches required format
2. Verify input field name is correct
3. Check if input value is valid

**Solutions:**
- Match required input format:
  ```javascript
  // Task status shows what's needed
  const task = await GET(`/a2a/status/${taskId}`);
  
  if (task.state === 'input-required') {
    const { field, type, options } = task.requiredInput;
    
    // Provide input matching requirements
    await POST(`/a2a/task/${taskId}/input`, {
      field: field,               // Must match exactly
      value: options[0]           // Must be valid option if choices provided
    });
  }
  ```

---

## Performance and Scaling

### Issue: Slow Task Completion

**Symptoms:**
- Tasks taking longer than expected
- Timeouts occurring
- Users reporting slowness

**Diagnosis:**
1. Check task type (story generation naturally slower)
2. Monitor OpenAI API response times
3. Check if hitting rate limits
4. Verify webhook vs. polling efficiency

**Solutions:**
- Use webhooks instead of polling:
  ```javascript
  // Register webhook once
  await POST('/a2a/webhooks', {
    url: 'https://yourapp.com/webhooks/a2a',
    events: ['task.completed', 'task.failed']
  });
  
  // Submit task - no polling needed
  const { taskId } = await POST('/a2a/task', {...});
  
  // Webhook will notify when complete
  ```

- If using polling, use appropriate intervals:
  ```javascript
  // Don't poll every 100ms - wasteful
  // Poll every 2-5 seconds for normal tasks
  const task = await pollWithInterval(taskId, 2000);
  ```

---

## Integration Testing

### Testing A2A Integration

**Critical test scenarios:**

1. **Basic task flow:**
   ```bash
   # Submit task
   POST /a2a/task → taskId
   
   # Check status
   GET /a2a/status/{taskId} → working
   
   # Wait and check again
   GET /a2a/status/{taskId} → completed
   ```

2. **Input-required flow:**
   - Submit task that requires input
   - Handle input-required state
   - Provide input
   - Verify task resumes

3. **Error handling:**
   - Submit invalid task
   - Verify error response
   - Handle gracefully

4. **Webhook delivery:**
   - Register webhook
   - Submit task
   - Verify webhook received
   - Verify signature

---

## Related Documentation

- **Task Lifecycle:** [Complete Task States](./task-lifecycle.md) - All states and transitions
- **API Reference:** [A2A API Documentation](./api-reference.md) - Complete endpoint reference
- **Error Reference:** [API Reference Error Codes](./api-reference.md#detailed-error-reference) - All error codes
- **REST API Troubleshooting:** [REST Issues](../../api-reference/troubleshooting.md) - General API issues

---

**Storytailor Inc.**  
A2A Protocol Documentation
