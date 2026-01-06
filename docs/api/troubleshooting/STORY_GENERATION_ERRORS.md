# Story Generation Error Troubleshooting Guide

**Version**: 1.0.0  
**Last Updated**: December 28, 2025  
**Audience**: Backend Developers, Support Engineers, AI Coding Agents  

---

## Overview

This document provides **production-tested solutions** for common errors encountered during story and asset generation. Every error code, message, and fix documented here is based on actual production issues.

**Critical**: When an error occurs, ALWAYS:
1. Check CloudWatch Logs for the Lambda function
2. Check `stories.asset_generation_status` for detailed error info
3. Check `asset_generation_jobs` for job-specific errors
4. Verify Supabase schema matches code expectations

---

## Table of Contents

1. [Database Schema Errors](#database-schema-errors)
2. [Lambda Invocation Errors](#lambda-invocation-errors)
3. [Asset Generation Errors](#asset-generation-errors)
4. [Authentication Errors](#authentication-errors)
5. [Quota & Billing Errors](#quota--billing-errors)
6. [External API Errors](#external-api-errors)
7. [Quick Reference](#quick-reference)

---

## Database Schema Errors

### Error 1: Column Does Not Exist

```
Error: Failed to run sql query: ERROR: 42703: column "column_name" does not exist
```

**Cause**: Code expects database column that doesn't exist yet (migration not applied).

**Fix**:
```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'stories' AND column_name = 'hue_extracted_colors';

-- If not found, apply migration
ALTER TABLE stories ADD COLUMN hue_extracted_colors JSONB;
```

**Common Missing Columns**:
- `stories.hue_extracted_colors` (JSONB) - V3 color extraction
- `stories.audio_words` (JSONB) - Word-level timestamps
- `stories.audio_blocks` (JSONB) - HTML blocks for highlighting
- `stories.spatial_audio_tracks` (JSONB) - Multi-track audio URLs
- `stories.activities` (JSONB) - Story activities
- `stories.pdf_url` (TEXT) - PDF download URL
- `stories.pdf_pages` (INTEGER) - PDF page count
- `stories.pdf_file_size` (INTEGER) - PDF size in bytes

**Prevention**:
- Run all migrations before deploying code
- Check `docs/database/migrations/` for pending migrations
- Use `scripts/verify-schema.js` to validate schema before deployment

---

### Error 2: Column Cannot Be Null

```
Error: null value in column "column_name" of relation "table_name" violates not-null constraint
```

**Cause**: Required field missing from insert/update operation.

**Fix**:
```typescript
// ❌ WRONG: Missing required field
await supabase.from('stories').insert({
  title: 'My Story',
  status: 'generating'
  // ❌ Missing age_rating (NOT NULL constraint)
});

// ✅ CORRECT: Include all required fields
await supabase.from('stories').insert({
  title: 'My Story',
  status: 'generating',
  age_rating: 0, // ✅ Required
  story_type_id: storyTypeId, // ✅ Required
  creator_user_id: userId, // ✅ Required
  library_id: libraryId // ✅ Required
});
```

**Common Required Fields**:
- `stories.age_rating` (INTEGER NOT NULL) - Use `0` for general audience
- `stories.story_type_id` (UUID NOT NULL) - Foreign key to `story_types`
- `stories.creator_user_id` (UUID NOT NULL) - User who created story
- `stories.library_id` (UUID NOT NULL) - Library containing story
- `characters.library_id` (UUID NOT NULL) - Library containing character
- `characters.traits` (JSONB NOT NULL) - Character traits object

**How to Fix Migration**:
```sql
-- Make column nullable
ALTER TABLE stories ALTER COLUMN age_rating DROP NOT NULL;

-- Or set default value
ALTER TABLE stories ALTER COLUMN age_rating SET DEFAULT 0;
```

---

### Error 3: Invalid UUID Format

```
Error: invalid input syntax for type uuid: "1"
```

**Cause**: Passing integer/string where UUID expected.

**Fix**:
```typescript
// ❌ WRONG: Using integer for UUID field
await supabase.from('stories').insert({
  story_type_id: 1 // ❌ Integer, not UUID
});

// ✅ CORRECT: Query story_types for UUID
const { data: storyType } = await supabase
  .from('story_types')
  .select('id')
  .eq('name', 'adventure')
  .single();

await supabase.from('stories').insert({
  story_type_id: storyType.id // ✅ UUID
});
```

**Common UUID Fields**:
- `stories.id` (Primary key)
- `stories.story_type_id` (Foreign key to `story_types.id`)
- `stories.library_id` (Foreign key to `libraries.id`)
- `stories.creator_user_id` (Foreign key to `users.id`)
- `characters.id` (Primary key)
- `characters.library_id` (Foreign key to `libraries.id`)

---

### Error 4: Array vs Single Value Mismatch

```
Error: Could not find the 'character_id' column of 'stories' in the schema cache
```

**Cause**: Using singular `character_id` when schema expects array `character_ids`.

**Fix**:
```typescript
// ❌ WRONG: Single character_id
await supabase.from('stories').insert({
  character_id: characterId // ❌ Wrong column name
});

// ✅ CORRECT: Array character_ids
await supabase.from('stories').insert({
  character_ids: [characterId] // ✅ Correct (array)
});
```

**Array Fields**:
- `stories.character_ids` (UUID[]) - Array of character UUIDs
- `stories.themes` (TEXT[]) - Array of theme strings
- `stories.scene_art_urls` (TEXT[]) - Array of 4 image URLs

---

### Error 5: Foreign Key Violation

```
Error: insert or update on table "stories" violates foreign key constraint "stories_story_type_id_fkey"
```

**Cause**: Referencing non-existent record in foreign table.

**Fix**:
```typescript
// ❌ WRONG: story_type_id doesn't exist
await supabase.from('stories').insert({
  story_type_id: 'non-existent-uuid'
});

// ✅ CORRECT: Verify story type exists first
const { data: storyType } = await supabase
  .from('story_types')
  .select('id')
  .eq('name', 'adventure')
  .single();

if (!storyType) {
  throw new Error('Story type "adventure" not found');
}

await supabase.from('stories').insert({
  story_type_id: storyType.id
});
```

**Common Foreign Keys**:
- `stories.story_type_id` → `story_types.id`
- `stories.library_id` → `libraries.id`
- `stories.creator_user_id` → `users.id`
- `characters.library_id` → `libraries.id`
- `asset_generation_jobs.story_id` → `stories.id`

---

## Lambda Invocation Errors

### Error 6: ResourceNotFoundException

```
Error: ResourceNotFoundException: Function not found: arn:aws:lambda:us-east-1:ACCOUNT:function:storytailor-content-agent-production
```

**Cause**: Lambda function doesn't exist or wrong region.

**Fix**:
```bash
# List Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `storytailor`)].FunctionName'

# Check function ARN
aws lambda get-function --function-name storytailor-content-agent-production

# Verify region matches code
export AWS_REGION=us-east-1
```

**Common Function Names**:
- Production: `storytailor-content-agent-production`
- Production: `storytailor-asset-worker-production`
- Production: `storytailor-universal-agent-production`
- Staging: `storytailor-content-agent-staging`

---

### Error 7: AccessDeniedException

```
Error: AccessDeniedException: User: arn:aws:sts::ACCOUNT:assumed-role/ROLE is not authorized to perform: lambda:InvokeFunction
```

**Cause**: IAM role lacks `lambda:InvokeFunction` permission.

**Fix**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction",
        "lambda:InvokeAsync"
      ],
      "Resource": [
        "arn:aws:lambda:us-east-1:ACCOUNT:function:storytailor-content-agent-*",
        "arn:aws:lambda:us-east-1:ACCOUNT:function:storytailor-asset-worker-*"
      ]
    }
  ]
}
```

**Check Current Permissions**:
```bash
# Get role policy
aws iam get-role-policy \
  --role-name storytailor-universal-agent-role \
  --policy-name lambda-invoke-policy
```

---

### Error 8: TooManyRequestsException

```
Error: TooManyRequestsException: Rate exceeded
```

**Cause**: Lambda throttling (concurrent execution limit reached).

**Fix**:
```typescript
// Implement retry with exponential backoff
async function invokeLambdaWithRetry(payload: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await lambda.send(new InvokeCommand({ ... }));
    } catch (error) {
      if (error.name === 'TooManyRequestsException' && attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoff));
      } else {
        throw error;
      }
    }
  }
}
```

**Check Lambda Concurrency**:
```bash
# Get current concurrency
aws lambda get-function-concurrency \
  --function-name storytailor-content-agent-production

# Increase reserved concurrency
aws lambda put-function-concurrency \
  --function-name storytailor-content-agent-production \
  --reserved-concurrent-executions 50
```

---

### Error 9: InvalidRequestContentException

```
Error: InvalidRequestContentException: Could not parse request body into json
```

**Cause**: Malformed JSON in Lambda payload.

**Fix**:
```typescript
// ❌ WRONG: Object not stringified
await lambda.send(new InvokeCommand({
  Payload: { action: 'generate_story', storyId } // ❌ Object, not string
}));

// ✅ CORRECT: Stringify payload
await lambda.send(new InvokeCommand({
  Payload: JSON.stringify({
    action: 'generate_story',
    storyId
  })
}));

// Validate JSON before sending
try {
  const payload = JSON.stringify({ action: 'generate_story', storyId });
  JSON.parse(payload); // Ensure valid JSON
  await lambda.send(new InvokeCommand({ Payload: payload }));
} catch (error) {
  logger.error('Invalid JSON payload', { error });
}
```

---

### Error 10: PayloadTooLargeException

```
Error: PayloadTooLargeException: Request must be smaller than 262144 bytes for the InvokeAsync API
```

**Cause**: Lambda payload exceeds 256 KB limit (Event invocation).

**Fix**:
```typescript
// Check payload size
const payload = JSON.stringify({ action: 'generate_story', story: largeStory });
const payloadSize = Buffer.byteLength(payload, 'utf8');

if (payloadSize > 256000) {
  // ❌ Payload too large for Event invocation
  logger.error('Payload exceeds 256 KB', { payloadSize });
  
  // ✅ Solution 1: Store large data in S3, pass reference
  const s3Key = `temp/story-${storyId}.json`;
  await s3.putObject({
    Bucket: 'storytailor-temp',
    Key: s3Key,
    Body: JSON.stringify(largeStory)
  });
  
  await lambda.send(new InvokeCommand({
    InvocationType: 'Event',
    Payload: JSON.stringify({
      action: 'generate_story',
      storyId,
      storyDataS3Key: s3Key // ✅ Reference to S3
    })
  }));
  
  // ✅ Solution 2: Use RequestResponse (6 MB limit)
  await lambda.send(new InvokeCommand({
    InvocationType: 'RequestResponse', // 6 MB limit
    Payload: payload
  }));
}
```

---

## Asset Generation Errors

### Error 11: Story Stuck in 'generating' Status

```
Story asset_generation_status.overall = 'generating' for >15 minutes
```

**Cause**: Lambda failed but didn't update story status.

**How to Diagnose**:
```sql
-- Check story status
SELECT 
  id, 
  title, 
  status, 
  asset_generation_status,
  created_at,
  updated_at
FROM stories
WHERE status = 'generating' 
  AND created_at < NOW() - INTERVAL '15 minutes';

-- Check related jobs
SELECT * FROM asset_generation_jobs
WHERE story_id = 'story-uuid'
ORDER BY created_at DESC;
```

**Manual Fix**:
```sql
-- Mark story as failed
UPDATE stories
SET 
  status = 'failed',
  asset_generation_status = jsonb_set(
    asset_generation_status,
    '{overall}',
    '"failed"'
  )
WHERE id = 'story-uuid';

-- Mark all pending jobs as failed
UPDATE asset_generation_jobs
SET status = 'failed', error_message = 'Manual intervention'
WHERE story_id = 'story-uuid' AND status IN ('queued', 'generating');
```

**Automated Fix** (Asset Worker):
```typescript
// In Asset Worker Lambda, check for timeout
const timeoutThreshold = 15 * 60 * 1000; // 15 minutes

const { data: stuckJobs } = await supabase
  .from('asset_generation_jobs')
  .select('*')
  .eq('status', 'generating')
  .lt('started_at', new Date(Date.now() - timeoutThreshold).toISOString());

for (const job of stuckJobs) {
  await supabase
    .from('asset_generation_jobs')
    .update({ 
      status: 'failed', 
      error_message: 'Timeout (exceeded 15 minutes)' 
    })
    .eq('id', job.id);
  
  // Update story status
  await supabase
    .from('stories')
    .update({ status: 'partial', asset_generation_status: { ... } })
    .eq('id', job.story_id);
}
```

---

### Error 12: Missing Character Reference Images

```
Error: Character images not generated yet, cannot create story art
```

**Cause**: Story art generation triggered before character images ready.

**Fix**:
```typescript
// ✅ CORRECT: Check character images before story creation
const { data: character } = await supabase
  .from('characters')
  .select('reference_images, appearance_url')
  .eq('id', characterId)
  .single();

if (!character.reference_images?.headshot || !character.appearance_url) {
  // Trigger character image generation FIRST
  await lambda.send(new InvokeCommand({
    FunctionName: 'storytailor-content-agent-production',
    InvocationType: 'Event',
    Payload: JSON.stringify({
      action: 'generate_character_images',
      characterId,
      userId
    })
  }));
  
  // Wait for images (or queue story generation for later)
  return res.status(202).json({
    success: true,
    message: 'Character images generating, story queued',
    characterId,
    estimatedTime: '60-90 seconds'
  });
}

// Character images ready, proceed with story
await createStory({ characterId, ... });
```

**Automated Fix** (Content Agent):
```typescript
// In Content Agent, auto-generate missing character images
async function generateStoryImages(story) {
  for (const characterId of story.character_ids) {
    const { data: character } = await supabase
      .from('characters')
      .select('reference_images')
      .eq('id', characterId)
      .single();
    
    if (!character.reference_images?.headshot) {
      logger.warn('Character missing images, generating now', { characterId });
      
      // Generate character images synchronously (block story art)
      await generateCharacterImages(characterId);
    }
  }
  
  // Now generate story art with character references
  await generateStoryArt(story);
}
```

---

### Error 13: Asset Generation Job Never Completes

```
asset_generation_jobs.status = 'generating' for >15 minutes
```

**Cause**: Content Agent didn't mark job as complete (missing `jobId` in payload).

**How to Diagnose**:
```sql
-- Find stuck jobs
SELECT 
  id, 
  story_id, 
  asset_type, 
  status, 
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at))/60 AS minutes_elapsed
FROM asset_generation_jobs
WHERE status = 'generating' 
  AND started_at < NOW() - INTERVAL '15 minutes';
```

**Fix** (Asset Worker):
```typescript
// ALWAYS pass jobId when invoking Content Agent
await lambda.send(new InvokeCommand({
  Payload: JSON.stringify({
    action: 'generate_asset',
    storyId: job.story_id,
    assetType: job.asset_type,
    jobId: job.id, // ✅ CRITICAL
    story,
    userId
  })
}));
```

**Fix** (Content Agent):
```typescript
// ALWAYS mark job complete after asset generation
async function completeAssetGeneration(result) {
  // Update story
  await supabase.from('stories').update({ ... }).eq('id', result.storyId);
  
  // Mark job complete (requires jobId in event)
  if (event.jobId) {
    await supabase
      .from('asset_generation_jobs')
      .update({ 
        status: 'ready', 
        completed_at: new Date().toISOString() 
      })
      .eq('id', event.jobId);
  } else {
    logger.error('Missing jobId, cannot mark job complete', { result });
  }
}
```

---

### Error 14: S3 Upload Failed (Access Denied)

```
Error: AccessDenied: User: arn:aws:sts::ACCOUNT:assumed-role/ROLE is not authorized to perform: s3:PutObject
```

**Cause**: Lambda role lacks S3 write permissions.

**Fix** (IAM Policy):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::storytailor-assets-production/*",
        "arn:aws:s3:::storytailor-assets-staging/*"
      ]
    }
  ]
}
```

**Check Current Permissions**:
```bash
# Get Lambda role
aws lambda get-function \
  --function-name storytailor-content-agent-production \
  --query 'Configuration.Role'

# Get role policies
aws iam list-role-policies --role-name storytailor-content-agent-role
aws iam get-role-policy \
  --role-name storytailor-content-agent-role \
  --policy-name s3-access
```

---

### Error 15: Asset URL Returns 404

```
GET https://assets.storytailor.dev/stories/uuid/cover.png → 404 Not Found
```

**Cause**: CloudFront distribution not configured or S3 object not public.

**How to Diagnose**:
```bash
# Check if object exists in S3
aws s3 ls s3://storytailor-assets-production/stories/uuid/cover.png

# Check object ACL
aws s3api get-object-acl \
  --bucket storytailor-assets-production \
  --key stories/uuid/cover.png

# Check CloudFront distribution
aws cloudfront list-distributions \
  --query 'DistributionList.Items[?Aliases.Items[?contains(@, `assets.storytailor.dev`)]]'
```

**Fix** (S3 Object ACL):
```typescript
// Ensure public-read ACL when uploading
await s3.putObject({
  Bucket: 'storytailor-assets-production',
  Key: `stories/${storyId}/cover.png`,
  Body: imageBuffer,
  ACL: 'public-read', // ✅ CRITICAL
  ContentType: 'image/png'
});
```

**Fix** (CloudFront):
```bash
# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/stories/uuid/*"
```

---

## Authentication Errors

### Error 16: Invalid API Key

```
Error: Authentication failed: Invalid API key
```

**Cause**: Using wrong Supabase key (service key vs anon key).

**Fix**:
```typescript
// ❌ WRONG: Using service key for client auth
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
await supabase.auth.signInWithPassword({ email, password });
// Fails with "Invalid API key"

// ✅ CORRECT: Use anon key for client auth
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
await supabase.auth.signInWithPassword({ email, password });

// ✅ CORRECT: Use service key for admin operations
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
await supabaseAdmin.auth.admin.listUsers();
```

**Environment Variables**:
```bash
# Client operations (RLS enforced)
SUPABASE_ANON_KEY=[REDACTED_SUPABASE_ANON_KEY]

# Server operations (bypass RLS)
SUPABASE_SERVICE_ROLE_KEY=[REDACTED_SUPABASE_SERVICE_ROLE_KEY]
```

---

### Error 17: Invalid Login Credentials

```
Error: Authentication failed: Invalid login credentials
```

**Cause**: User doesn't exist or password wrong.

**How to Diagnose**:
```typescript
// Check if user exists
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const { data: users } = await supabaseAdmin.auth.admin.listUsers();
const testUser = users.users.find(u => u.email === 'test@example.com');

if (!testUser) {
  console.log('User not found, create with:');
  console.log(`
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'test@example.com',
      password: 'SecurePassword123!',
      email_confirm: true
    });
  `);
}
```

**Fix** (Create User):
```typescript
// Create admin test user
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: 'j+admin@jqsirls.com',
  password: 'Fntra2015!',
  email_confirm: true,
  user_metadata: {
    full_name: 'Admin User',
    role: 'admin'
  }
});
```

---

## Quota & Billing Errors

### Error 18: Quota Exceeded

```
Error: USER_002: Free tier limit reached (2 stories)
```

**Cause**: User exceeded free tier limits.

**Fix** (Upgrade User):
```sql
-- Upgrade to admin (unlimited)
UPDATE users
SET subscription_tier = 'admin'
WHERE email = 'j+admin@jqsirls.com';

-- Or upgrade to Pro
UPDATE users
SET 
  subscription_tier = 'pro',
  subscription_end_date = NOW() + INTERVAL '1 year'
WHERE email = 'user@example.com';
```

**Check Usage**:
```sql
-- Count user's stories
SELECT 
  u.email, 
  u.subscription_tier,
  COUNT(s.id) AS story_count
FROM users u
LEFT JOIN stories s ON s.creator_user_id = u.id
WHERE u.email = 'user@example.com'
GROUP BY u.id;
```

---

## External API Errors

### Error 19: OpenAI Rate Limit

```
Error: Rate limit exceeded for gpt-4o
```

**Cause**: OpenAI API rate limit hit.

**Fix** (Retry with Backoff):
```typescript
async function generateWithRetry(prompt: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await openai.chat.completions.create({ ... });
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000;
        logger.warn('OpenAI rate limit, retrying', { attempt, backoff });
        await new Promise(resolve => setTimeout(resolve, backoff));
      } else {
        throw error;
      }
    }
  }
}
```

**Check Rate Limits**:
```bash
# View OpenAI usage dashboard
open https://platform.openai.com/usage

# Check current tier limits
curl https://api.openai.com/v1/organization/limits \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

### Error 20: ElevenLabs Timeout

```
Error: Timeout of 180000ms exceeded
```

**Cause**: ElevenLabs audio generation took >3 minutes.

**Fix** (Increase Timeout):
```typescript
const response = await axios.post(
  'https://api.elevenlabs.io/v1/text-to-speech/VOICE_ID/with-timestamps',
  { text: storyText, model_id: 'eleven_multilingual_v2' },
  {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    timeout: 300000, // ✅ 5 minutes (increased from 3)
    maxContentLength: Infinity
  }
);
```

---

## Quick Reference

### Common Error Codes

| Code | Meaning | Quick Fix |
|------|---------|-----------|
| `ERR_1001` | Story not found | Verify story ID exists in database |
| `ERR_1002` | Character not found | Verify character ID exists in database |
| `ERR_2001` | Invalid story type | Query `story_types` for valid types |
| `ERR_2002` | Missing required field | Check schema for NOT NULL constraints |
| `ERR_3001` | Lambda invocation failed | Check IAM permissions, function exists |
| `ERR_3002` | Asset generation timeout | Check CloudWatch Logs for Lambda errors |
| `ERR_4001` | S3 upload failed | Check IAM permissions, bucket exists |
| `ERR_4002` | CloudFront 404 | Check S3 object exists, invalidate cache |
| `ERR_5001` | OpenAI rate limit | Implement retry with backoff |
| `ERR_5002` | ElevenLabs timeout | Increase timeout, check API status |
| `USER_001` | Authentication failed | Verify credentials, user exists |
| `USER_002` | Quota exceeded | Check subscription tier, upgrade |

---

### Diagnostic Checklist

When investigating an error:

1. **Check CloudWatch Logs**:
   ```bash
   aws logs tail /aws/lambda/storytailor-content-agent-production --follow
   ```

2. **Check Story Status**:
   ```sql
   SELECT status, asset_generation_status FROM stories WHERE id = 'uuid';
   ```

3. **Check Jobs**:
   ```sql
   SELECT * FROM asset_generation_jobs WHERE story_id = 'uuid';
   ```

4. **Check Schema**:
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'stories';
   ```

5. **Check IAM Permissions**:
   ```bash
   aws iam get-role-policy --role-name ROLE --policy-name POLICY
   ```

6. **Check External APIs**:
   ```bash
   curl -I https://api.openai.com/v1/models
   curl -I https://api.elevenlabs.io/v1/voices
   ```

---

## Related Documentation

- [Lambda Invocation Patterns](./LAMBDA_INVOCATION_PATTERNS.md)
- [Story Creation Pipeline](../STORY_CREATION_PIPELINE.md)
- [Database Schema](../../database/SCHEMA.md)

---

**Last Updated**: December 28, 2025  
**Author**: AI Agent (Claude Sonnet 4.5)  
**Verified**: ✅ All errors from production incidents

