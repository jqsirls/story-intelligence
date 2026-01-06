# Lambda Invocation Patterns - Best Practices & Common Mistakes

**Version**: 1.0.0  
**Last Updated**: December 28, 2025  
**Audience**: Backend Developers, AI Coding Agents  

---

## Overview

This document provides **production-tested patterns** for invoking AWS Lambda functions in the Storytailor platform. Following these patterns prevents common mistakes that have caused production issues in the past.

**Critical**: This is not theoretical. Every pattern and mistake documented here is based on actual production code and real issues encountered.

---

## Table of Contents

1. [Invocation Types](#invocation-types)
2. [Content Agent Invocation Patterns](#content-agent-invocation-patterns)
3. [Asset Worker Invocation Patterns](#asset-worker-invocation-patterns)
4. [Common Mistakes & Fixes](#common-mistakes--fixes)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)
7. [Testing Lambda Invocations](#testing-lambda-invocations)

---

## Invocation Types

### Event (Async) vs RequestResponse (Sync)

```typescript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

// ✅ CORRECT: Async invocation (Event)
await lambda.send(new InvokeCommand({
  FunctionName: 'storytailor-content-agent-production',
  InvocationType: 'Event', // Don't wait for response
  Payload: JSON.stringify({ action: 'generate_story', storyId: '...' })
}));

// ❌ WRONG: Sync invocation for long-running task
await lambda.send(new InvokeCommand({
  FunctionName: 'storytailor-content-agent-production',
  InvocationType: 'RequestResponse', // API Gateway will timeout!
  Payload: JSON.stringify({ action: 'generate_story', storyId: '...' })
}));
```

**When to use Event (Async)**:
- ✅ Story generation (30-60s)
- ✅ Asset generation (30-90s each)
- ✅ Any task >10 seconds
- ✅ Fire-and-forget operations

**When to use RequestResponse (Sync)**:
- ✅ Health checks (<1s)
- ✅ Quick lookups (<5s)
- ✅ When you need immediate response
- ✅ API Gateway routes (but keep <29s)

---

## Content Agent Invocation Patterns

### Pattern 1: Story Creation (from REST API)

```typescript
// packages/universal-agent/src/api/RESTAPIGateway.ts

/**
 * ✅ CORRECT PATTERN: Create story record first, then invoke async
 * 
 * Why: If Lambda fails, story record still exists with status='generating'
 * User can retry or view partial progress
 */
async createStory(req: Request, res: Response) {
  // 1. Create story record IMMEDIATELY
  const { data: storyRecord } = await this.supabase
    .from('stories')
    .insert({
      title: req.body.title,
      status: 'generating', // CRITICAL: Mark as generating
      asset_generation_status: { overall: 'generating', assets: {...} }
    })
    .select()
    .single();
  
  const storyId = storyRecord.id;
  
  // 2. Create asset jobs
  for (const assetType of assetTypes) {
    await this.supabase
      .from('asset_generation_jobs')
      .insert({ story_id: storyId, asset_type: assetType, status: 'queued' });
  }
  
  // 3. Invoke Content Agent ASYNC
  lambda.send(new InvokeCommand({
    FunctionName: 'storytailor-content-agent-production',
    InvocationType: 'Event', // CRITICAL: Async
    Payload: JSON.stringify({
      action: 'generate_story',
      storyId, // CRITICAL: Pass storyId so it updates existing record
      userId,
      creatorUserId, // CRITICAL: For quota attribution
      characterId,
      storyType,
      themes,
      generateAssets: true
    })
  })).catch(async (err) => {
    // 4. Handle Lambda invocation failure
    this.logger.error('Failed to trigger story generation', { storyId, error: err });
    
    // Mark story as failed
    await this.supabase
      .from('stories')
      .update({ status: 'failed', asset_generation_status: { overall: 'failed', ... } })
      .eq('id', storyId);
  });
  
  // 5. Return story ID immediately (don't wait for Lambda)
  res.status(201).json({
    success: true,
    data: {
      id: storyId,
      status: 'generating',
      realtimeChannel: `stories:id=${storyId}`
    }
  });
}
```

**Key Points**:
- ✅ Create database record **before** invoking Lambda
- ✅ Return story ID **immediately** (don't wait)
- ✅ Use `InvocationType: 'Event'` for async
- ✅ Pass `storyId` so Lambda updates existing record
- ✅ Pass `creatorUserId` for quota attribution
- ✅ Handle Lambda invocation errors (mark story as failed)

---

### Pattern 2: Asset Generation (from Asset Worker)

```typescript
// lambda-deployments/asset-worker/src/lambda.ts

/**
 * ✅ CORRECT PATTERN: Pass complete payload with story object
 * 
 * Why: Content Agent needs full story context to generate assets
 */
async processAssetJob(job: AssetJob) {
  // 1. Mark job as generating
  await supabase
    .from('asset_generation_jobs')
    .update({ status: 'generating', started_at: new Date().toISOString() })
    .eq('id', job.id);
  
  // 2. Get FULL story object (not just ID)
  const { data: story } = await supabase
    .from('stories')
    .select('*, creator_user_id') // CRITICAL: Include creator for quota
    .eq('id', job.story_id)
    .single();
  
  // 3. Invoke Content Agent with COMPLETE payload
  await lambda.send(new InvokeCommand({
    FunctionName: 'storytailor-content-agent-production',
    InvocationType: 'Event',
    Payload: JSON.stringify({
      action: 'generate_asset', // CRITICAL: Specific action
      storyId: job.story_id,
      assetType: job.asset_type, // 'cover', 'scene_1', 'audio', 'pdf', etc.
      jobId: job.id, // CRITICAL: So Lambda can mark job complete
      story, // CRITICAL: Full story object (not just ID)
      userId: story.creator_user_id, // CRITICAL: For S3 permissions
      creatorUserId: story.creator_user_id,
      metadata: job.metadata || {}
    })
  }));
}
```

**Key Points**:
- ✅ Mark job as `'generating'` before invoking
- ✅ Fetch **full story object** (not just ID)
- ✅ Pass `jobId` so Lambda can mark job complete
- ✅ Pass `userId` for S3 upload permissions
- ✅ Include `story` object with full content

**❌ WRONG PATTERN**:
```typescript
// ❌ MISSING CRITICAL FIELDS
await lambda.send(new InvokeCommand({
  FunctionName: 'storytailor-content-agent-production',
  InvocationType: 'Event',
  Payload: JSON.stringify({
    action: 'generate_asset',
    storyId: job.story_id,
    assetType: job.asset_type
    // ❌ Missing: jobId, story object, userId
  })
}));

// Result: Content Agent can't generate asset (missing context)
// Result: Job never marked complete (missing jobId)
// Result: S3 upload fails (missing userId)
```

---

### Pattern 3: Character Creation with Images

```typescript
// packages/universal-agent/src/api/RESTAPIGateway.ts

/**
 * ✅ CORRECT PATTERN: Create character first, then trigger image generation
 * 
 * Why: Character must exist before images can reference it
 */
async createCharacter(req: Request, res: Response) {
  // 1. Create character record
  const { data: character } = await this.supabase
    .from('characters')
    .insert({
      name: req.body.name,
      traits: req.body.traits,
      library_id: libraryId
    })
    .select()
    .single();
  
  // 2. If generateImages=true, invoke Content Agent
  if (req.body.generateImages !== false) {
    lambda.send(new InvokeCommand({
      FunctionName: 'storytailor-content-agent-production',
      InvocationType: 'Event',
      Payload: JSON.stringify({
        action: 'create_character', // Will generate images
        characterId: character.id, // CRITICAL: Pass character ID
        userId,
        character: {
          name: character.name,
          traits: character.traits
        }
      })
    })).catch((err) => {
      this.logger.error('Failed to trigger character image generation', { 
        characterId: character.id, 
        error: err 
      });
      // Character still created, images can be retried later
    });
  }
  
  // 3. Return character immediately
  res.status(201).json({
    success: true,
    data: character // Images will be added asynchronously
  });
}
```

**Key Points**:
- ✅ Create character record **before** generating images
- ✅ Return character immediately (images come later)
- ✅ Pass `characterId` for Lambda to update existing record
- ✅ Handle Lambda failure gracefully (character still usable)

---

## Asset Worker Invocation Patterns

### Pattern 1: Polling for Queued Jobs

```typescript
// lambda-deployments/asset-worker/src/lambda.ts

/**
 * ✅ CORRECT PATTERN: Limit batch size, order by created_at
 * 
 * Why: Prevents Lambda timeout, processes jobs in order
 */
export const handler: Handler = async (event) => {
  // 1. Query queued jobs (LIMIT 10)
  const { data: jobs } = await supabase
    .from('asset_generation_jobs')
    .select('*')
    .eq('status', 'queued') // CRITICAL: Only queued
    .order('created_at', { ascending: true }) // CRITICAL: FIFO
    .limit(10); // CRITICAL: Prevent timeout
  
  if (!jobs || jobs.length === 0) {
    return { processed: 0, message: 'No jobs to process' };
  }
  
  // 2. Process each job
  let processed = 0;
  for (const job of jobs) {
    try {
      await processJob(job);
      processed++;
    } catch (error) {
      logger.error('Job processing failed', { jobId: job.id, error });
      // Continue processing other jobs (don't fail entire batch)
    }
  }
  
  return { processed, total: jobs.length };
};
```

**Key Points**:
- ✅ `LIMIT 10` to prevent Lambda timeout
- ✅ `order('created_at')` for FIFO processing
- ✅ Filter by `status='queued'` only
- ✅ Continue on individual job failure
- ✅ Return metrics for monitoring

**❌ WRONG PATTERN**:
```typescript
// ❌ No limit (Lambda will timeout with many jobs)
const { data: jobs } = await supabase
  .from('asset_generation_jobs')
  .select('*')
  .eq('status', 'queued');

// ❌ Process all jobs (takes too long)
for (const job of jobs) {
  await processJob(job); // 30-90s each!
}
```

---

### Pattern 2: EventBridge Scheduled Trigger

```yaml
# EventBridge Rule Configuration

RuleName: storytailor-asset-worker-production
ScheduleExpression: rate(5 minutes)
State: ENABLED
Target:
  Arn: arn:aws:lambda:us-east-1:ACCOUNT:function:storytailor-asset-worker-production
  InputTransformer:
    InputPathsMap: {}
    InputTemplate: '{"source": "eventbridge", "time": "<aws.events.time>"}'
```

**Key Points**:
- ✅ `rate(5 minutes)` is optimal (not too frequent, not too slow)
- ✅ Use `InputTransformer` to pass event metadata
- ✅ Enable CloudWatch Logs for debugging

**Why 5 minutes?**
- Asset generation takes 30-90s each
- Worker processes 10 jobs = 5-15 minutes total
- 5 minute interval allows overlap for high volume
- Prevents queue buildup during peak usage

---

## Common Mistakes & Fixes

### Mistake 1: Missing `storyId` in Payload

```typescript
// ❌ WRONG: Lambda creates new story record instead of updating existing
await lambda.send(new InvokeCommand({
  FunctionName: 'storytailor-content-agent-production',
  InvocationType: 'Event',
  Payload: JSON.stringify({
    action: 'generate_story',
    userId,
    characterName: 'Hero'
    // ❌ Missing storyId
  })
}));

// Result: Content Agent creates NEW story in database
// Result: Original story stuck in 'generating' status forever
// Result: User sees duplicate stories
```

**✅ FIX**:
```typescript
// Create story record first, pass storyId
const { data: story } = await supabase
  .from('stories')
  .insert({ title: '...', status: 'generating' })
  .select()
  .single();

await lambda.send(new InvokeCommand({
  FunctionName: 'storytailor-content-agent-production',
  InvocationType: 'Event',
  Payload: JSON.stringify({
    action: 'generate_story',
    storyId: story.id, // ✅ CRITICAL
    userId,
    characterName: 'Hero'
  })
}));
```

---

### Mistake 2: Using Sync Invocation for Long Tasks

```typescript
// ❌ WRONG: API Gateway will timeout after 29 seconds
const response = await lambda.send(new InvokeCommand({
  FunctionName: 'storytailor-content-agent-production',
  InvocationType: 'RequestResponse', // ❌ Sync
  Payload: JSON.stringify({ action: 'generate_story', ... })
}));

// Result: API Gateway timeout after 29s
// Result: User sees 504 Gateway Timeout
// Result: Story may or may not have been created (race condition)
```

**✅ FIX**:
```typescript
// Use Event (async) + Supabase Realtime for progress
await lambda.send(new InvokeCommand({
  FunctionName: 'storytailor-content-agent-production',
  InvocationType: 'Event', // ✅ Async
  Payload: JSON.stringify({ action: 'generate_story', storyId, ... })
}));

// Return immediately with story ID
res.status(201).json({
  success: true,
  data: { id: storyId, status: 'generating', realtimeChannel: `stories:id=${storyId}` }
});

// Frontend subscribes to Supabase Realtime for updates
```

---

### Mistake 3: Missing `creatorUserId` for Quota Attribution

```typescript
// ❌ WRONG: Asset Worker passes wrong userId
const { data: story } = await supabase
  .from('stories')
  .select('library_id') // ❌ Only fetches library_id
  .eq('id', job.story_id)
  .single();

await lambda.send(new InvokeCommand({
  Payload: JSON.stringify({
    action: 'generate_asset',
    userId: story.library_id // ❌ Library owner, not story creator!
  })
}));

// Result: Wrong user charged for asset generation
// Result: Quota enforcement broken
```

**✅ FIX**:
```typescript
// Fetch creator_user_id explicitly
const { data: story } = await supabase
  .from('stories')
  .select('*, creator_user_id') // ✅ Include creator
  .eq('id', job.story_id)
  .single();

await lambda.send(new InvokeCommand({
  Payload: JSON.stringify({
    action: 'generate_asset',
    userId: story.creator_user_id, // ✅ Correct
    creatorUserId: story.creator_user_id, // ✅ Explicit
    story
  })
}));
```

---

### Mistake 4: Missing `jobId` in Asset Generation

```typescript
// ❌ WRONG: Job never marked complete
await lambda.send(new InvokeCommand({
  Payload: JSON.stringify({
    action: 'generate_asset',
    storyId: job.story_id,
    assetType: job.asset_type
    // ❌ Missing jobId
  })
}));

// Result: Content Agent generates asset successfully
// Result: Job status never updated from 'generating'
// Result: Timeout handler marks as 'failed' after 15 minutes
// Result: Asset Worker retries job (duplicate work)
```

**✅ FIX**:
```typescript
await lambda.send(new InvokeCommand({
  Payload: JSON.stringify({
    action: 'generate_asset',
    storyId: job.story_id,
    assetType: job.asset_type,
    jobId: job.id, // ✅ CRITICAL: Lambda marks job complete
    story,
    userId
  })
}));

// In Content Agent Lambda:
async function completeAssetGeneration(result) {
  // Update story with asset URL
  await supabase.from('stories').update({ ... }).eq('id', result.storyId);
  
  // Mark job complete
  await supabase
    .from('asset_generation_jobs')
    .update({ status: 'ready', completed_at: new Date().toISOString() })
    .eq('id', result.jobId); // ✅ Uses jobId from payload
}
```

---

### Mistake 5: Not Handling Lambda Invocation Errors

```typescript
// ❌ WRONG: Fire and forget (no error handling)
lambda.send(new InvokeCommand({
  FunctionName: 'storytailor-content-agent-production',
  InvocationType: 'Event',
  Payload: JSON.stringify({ action: 'generate_story', storyId })
}));

// Result: If Lambda invocation fails (e.g., throttling), story stuck forever
// Result: No error logged
// Result: User never notified
```

**✅ FIX**:
```typescript
lambda.send(new InvokeCommand({
  FunctionName: 'storytailor-content-agent-production',
  InvocationType: 'Event',
  Payload: JSON.stringify({ action: 'generate_story', storyId })
})).catch(async (err) => {
  // Log error with context
  this.logger.error('Lambda invocation failed', { 
    storyId, 
    error: err,
    functionName: 'storytailor-content-agent-production'
  });
  
  // Mark story as failed
  await this.supabase
    .from('stories')
    .update({ 
      status: 'failed',
      asset_generation_status: { 
        overall: 'failed',
        assets: { content: { status: 'failed', error: 'Lambda invocation failed' } }
      }
    })
    .eq('id', storyId);
  
  // Optionally: Send notification to user
  // await this.notificationService.sendError(userId, 'Story generation failed');
});
```

---

### Mistake 6: Incorrect Payload Structure

```typescript
// ❌ WRONG: Payload wrapped in extra "body" field
await lambda.send(new InvokeCommand({
  Payload: JSON.stringify({
    body: JSON.stringify({ // ❌ Double stringification
      action: 'generate_story',
      storyId
    })
  })
}));

// Result: Content Agent receives: event.body = "{\"action\":\"generate_story\",...}"
// Result: Must parse twice: JSON.parse(JSON.parse(event.body))
// Result: Brittle and error-prone
```

**✅ FIX**:
```typescript
// Direct Lambda invocation (not via API Gateway)
await lambda.send(new InvokeCommand({
  Payload: JSON.stringify({
    action: 'generate_story', // ✅ Direct fields
    storyId,
    userId
  })
}));

// Content Agent receives:
// event = { action: 'generate_story', storyId: '...', userId: '...' }
```

---

## Error Handling

### Lambda Invocation Errors

```typescript
try {
  const response = await lambda.send(new InvokeCommand({
    FunctionName: 'storytailor-content-agent-production',
    InvocationType: 'Event',
    Payload: JSON.stringify(payload)
  }));
  
  // Check for Lambda function error (StatusCode 200 but FunctionError present)
  if (response.FunctionError) {
    throw new Error(`Lambda function error: ${response.FunctionError}`);
  }
  
  logger.info('Lambda invoked successfully', { 
    statusCode: response.StatusCode,
    requestId: response.$metadata.requestId
  });
  
} catch (error) {
  // AWS SDK errors
  if (error.name === 'ResourceNotFoundException') {
    logger.error('Lambda function not found', { functionName });
  } else if (error.name === 'TooManyRequestsException') {
    logger.error('Lambda throttling', { functionName });
    // Implement backoff and retry
  } else if (error.name === 'ServiceException') {
    logger.error('AWS service error', { error });
  } else {
    logger.error('Unknown Lambda invocation error', { error });
  }
  
  // Handle gracefully (don't fail entire request)
  throw error;
}
```

---

### Content Agent Error Handling

```typescript
// lambda-deployments/content-agent/src/lambda.ts

export const handler = async (event: any) => {
  try {
    const action = event.action || event.intent?.type;
    
    if (action === 'generate_story') {
      const result = await generateStory(event);
      return { statusCode: 200, body: JSON.stringify(result) };
    }
    
  } catch (error) {
    logger.error('Content Agent error', { action: event.action, error });
    
    // Update story/job status to 'failed'
    if (event.storyId) {
      await supabase
        .from('stories')
        .update({ 
          status: 'failed',
          asset_generation_status: { overall: 'failed', ... }
        })
        .eq('id', event.storyId);
    }
    
    if (event.jobId) {
      await supabase
        .from('asset_generation_jobs')
        .update({ status: 'failed', error_message: error.message })
        .eq('id', event.jobId);
    }
    
    // Return error (for RequestResponse invocations)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

---

## Best Practices

### 1. Always Pass Correlation IDs

```typescript
// ✅ CORRECT: Include request/session IDs for tracing
await lambda.send(new InvokeCommand({
  Payload: JSON.stringify({
    action: 'generate_story',
    storyId,
    userId,
    sessionId: req.sessionId, // For correlation
    requestId: req.id // For tracing
  })
}));

// Lambda can log with correlation:
logger.info('Generating story', { 
  storyId, 
  userId, 
  sessionId: event.sessionId, 
  requestId: event.requestId 
});
```

---

### 2. Use Environment Variables for Function Names

```typescript
// ✅ CORRECT: Use environment variable
const functionName = process.env.CONTENT_AGENT_FUNCTION || 'storytailor-content-agent-production';

await lambda.send(new InvokeCommand({
  FunctionName: functionName,
  ...
}));

// Allows easy switching between staging/production
// Environment: CONTENT_AGENT_FUNCTION=storytailor-content-agent-staging
```

---

### 3. Log Payload Size

```typescript
// ✅ CORRECT: Monitor payload size
const payload = JSON.stringify({ action: 'generate_story', ... });
const payloadSize = Buffer.byteLength(payload, 'utf8');

if (payloadSize > 256000) { // 256 KB limit for async invocations
  logger.warn('Large Lambda payload', { payloadSize, maxSize: 256000 });
}

await lambda.send(new InvokeCommand({
  Payload: payload
}));
```

---

### 4. Implement Retry with Exponential Backoff

```typescript
// ✅ CORRECT: Retry with backoff for transient errors
async function invokeLambdaWithRetry(payload: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await lambda.send(new InvokeCommand({
        FunctionName: 'storytailor-content-agent-production',
        InvocationType: 'Event',
        Payload: JSON.stringify(payload)
      }));
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Retry on throttling or service errors
      if (error.name === 'TooManyRequestsException' || error.name === 'ServiceException') {
        const backoff = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.warn('Lambda invocation failed, retrying', { attempt, backoff, error });
        await new Promise(resolve => setTimeout(resolve, backoff));
      } else {
        throw error; // Don't retry on other errors
      }
    }
  }
}
```

---

## Testing Lambda Invocations

### Local Testing (CLI)

```bash
# Test Content Agent with sample payload
aws lambda invoke \
  --function-name storytailor-content-agent-production \
  --invocation-type Event \
  --payload '{"action":"health"}' \
  response.json

# Check response
cat response.json

# View logs
aws logs tail /aws/lambda/storytailor-content-agent-production --follow
```

---

### Integration Testing (Node.js)

```javascript
// scripts/test-lambda-invocation.js

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const lambda = new LambdaClient({ region: 'us-east-1' });

async function testStoryGeneration() {
  const payload = {
    action: 'generate_story',
    storyId: 'test-story-uuid',
    userId: 'test-user-uuid',
    characterName: 'Test Hero',
    storyType: 'adventure'
  };
  
  console.log('Invoking Lambda with payload:', payload);
  
  const response = await lambda.send(new InvokeCommand({
    FunctionName: 'storytailor-content-agent-production',
    InvocationType: 'Event',
    Payload: JSON.stringify(payload)
  }));
  
  console.log('Response:', {
    StatusCode: response.StatusCode,
    FunctionError: response.FunctionError,
    RequestId: response.$metadata.requestId
  });
  
  // Check story status after 60s
  setTimeout(async () => {
    const { data: story } = await supabase
      .from('stories')
      .select('status, content')
      .eq('id', 'test-story-uuid')
      .single();
    
    console.log('Story status:', story.status);
    console.log('Story content:', story.content ? 'Generated' : 'Missing');
  }, 60000);
}

testStoryGeneration().catch(console.error);
```

---

## Summary

### ✅ DO

- Use `InvocationType: 'Event'` for tasks >10 seconds
- Create database records **before** invoking Lambda
- Pass `storyId` to update existing records (not create new ones)
- Pass `creatorUserId` for quota attribution
- Pass `jobId` so Lambda can mark jobs complete
- Pass full `story` object for asset generation
- Handle Lambda invocation errors (mark records as failed)
- Use environment variables for function names
- Implement retry with exponential backoff
- Log payload sizes and correlation IDs

### ❌ DON'T

- Use `InvocationType: 'RequestResponse'` for long tasks
- Forget to pass `storyId` (causes duplicate stories)
- Forget to pass `jobId` (jobs never marked complete)
- Pass `library_id` as `userId` (wrong quota attribution)
- Double-stringify payloads (brittle parsing)
- Process unlimited jobs in Asset Worker (Lambda timeout)
- Ignore Lambda invocation errors (silent failures)

---

## Related Documentation

- [Story Creation Pipeline](../STORY_CREATION_PIPELINE.md)
- [Error Troubleshooting Guide](./STORY_GENERATION_ERRORS.md)
- [Environment Variables](../../deployment/ENVIRONMENT_VARIABLES.md)

---

**Last Updated**: December 28, 2025  
**Author**: AI Agent (Claude Sonnet 4.5)  
**Verified**: ✅ All patterns from production code

