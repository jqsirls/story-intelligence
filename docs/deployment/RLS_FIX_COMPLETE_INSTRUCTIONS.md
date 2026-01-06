# Complete RLS Fix Instructions

## Problem
The `library_permissions` RLS policy has infinite recursion, causing:
- Story saves to fail with error: `infinite recursion detected in policy for relation "library_permissions"`
- Stories cannot be retrieved from database
- Cover image generation cannot access stories

## Root Cause
The RLS policy checks `library_permissions` recursively:
```sql
-- OLD (BROKEN) POLICY:
CREATE POLICY library_permissions_policy ON library_permissions
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM libraries l
      WHERE l.id = library_id AND (
        l.owner = auth.uid() OR
        EXISTS (
          SELECT 1 FROM library_permissions lp2  -- ❌ RECURSION!
          WHERE lp2.library_id = l.id 
          AND lp2.user_id = auth.uid() 
        )
      )
    )
  );
```

## Solution

### Step 1: Apply Migration via Supabase Dashboard

1. **Get your Supabase Project ID:**
   ```bash
   aws ssm get-parameter --name "/storytailor-production/supabase/url" --query 'Parameter.Value' --output text
   # Extract project ID from URL (e.g., "lendybmmlqelrkhkdyc")
   ```

2. **Go to Supabase Dashboard:**
   - URL: `https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql`
   - Or: Dashboard → Your Project → SQL Editor

3. **Apply the migration:**
   - Open file: `supabase/migrations/20250117000001_fix_library_permissions_rls_recursion.sql`
   - Copy **ENTIRE** contents
   - Paste into SQL Editor
   - Click **Run** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows/Linux)
   - **VERIFY**: No errors should appear

### Step 2: Verify Migration Applied

Run this SQL in Supabase SQL Editor:

```sql
-- Check that the new policy exists
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'library_permissions'
AND policyname = 'library_permissions_policy';

-- Should show policy WITHOUT nested library_permissions check
```

### Step 3: Verify Content Agent Uses Service Role Key

The Content Agent Lambda has been updated to use service role key (bypasses RLS):
- ✅ `lambda.ts` updated to prefer `SUPABASE_SERVICE_KEY`
- ✅ Falls back to `SUPABASE_ANON_KEY` if service key not available
- ✅ Service role key bypasses all RLS policies

### Step 4: Test End-to-End

After applying migration, test story generation:

```bash
curl -X POST "https://vnzffxpjbrln6dn7dn2n5artoa0ibqim.lambda-url.us-east-1.on.aws/" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_story",
    "data": {
      "userId": "test-rls-fix-'$(date +%s)'",
      "sessionId": "test-session-'$(date +%s)'",
      "characterName": "Luna",
      "characterTraits": {
        "age": 8,
        "species": "human",
        "gender": "female"
      },
      "storyType": "adventure",
      "userAge": 8
    }
  }'
```

**Expected Results:**
- ✅ Story saved to database (not temp ID)
- ✅ Story ID is UUID (not `story_1234567890`)
- ✅ Cover image generation works
- ✅ Image URLs returned

## What the Migration Fixes

1. **Removes infinite recursion** from `library_permissions_policy`
2. **Fixes `story_access` policy** to avoid recursion
3. **Fixes `character_access` policy** to avoid recursion  
4. **Fixes `media_asset_access` policy** to avoid recursion
5. **Adds trigger** to auto-create Owner permission when library is created
6. **Ensures library owners** always have proper permissions

## Migration File Location

`supabase/migrations/20250117000001_fix_library_permissions_rls_recursion.sql`

## Verification Checklist

- [ ] Migration applied via Supabase Dashboard
- [ ] No errors in SQL Editor output
- [ ] Policy verified: `SELECT * FROM pg_policies WHERE tablename = 'library_permissions'`
- [ ] Content Agent deployed with service key fix
- [ ] Story generation test returns real database ID (UUID)
- [ ] Cover image generation works
- [ ] Image URLs are returned in response

## Troubleshooting

**If migration fails:**
- Check Supabase Dashboard for error messages
- Ensure you're using service role permissions (Dashboard uses service role automatically)
- Verify no syntax errors in SQL

**If stories still use temp IDs:**
- Check Lambda logs for "Story save failed" messages
- Verify service role key is configured in SSM: `/storytailor-production/supabase/service-key`
- Check that Content Agent Lambda environment variables include `SUPABASE_SERVICE_KEY`

**If images still don't generate:**
- Verify story was saved to database (check `stories` table)
- Check that `storyId` in cover generation request matches database ID
- Review CloudWatch logs for image generation errors
