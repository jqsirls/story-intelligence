# RLS Fix Migration Instructions

## Problem
The `library_permissions` RLS policy has infinite recursion, causing story saves to fail with error:
```
infinite recursion detected in policy for relation "library_permissions"
```

## Solution
Apply migration: `supabase/migrations/20250117000001_fix_library_permissions_rls_recursion.sql`

## Method 1: Supabase Dashboard (RECOMMENDED)

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/[YOUR_PROJECT_REF]/sql
2. Navigate to: **SQL Editor**
3. Open file: `supabase/migrations/20250117000001_fix_library_permissions_rls_recursion.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows/Linux)
7. Verify no errors appear

## Method 2: Supabase CLI (If Available)

```bash
supabase db push
# Or
supabase migration up
```

## Method 3: Direct psql Connection

```bash
# Get connection string from Supabase Dashboard
# Settings → Database → Connection string (URI format)

psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f supabase/migrations/20250117000001_fix_library_permissions_rls_recursion.sql
```

## Verification

After applying, verify the fix:

```sql
-- Check that the policy exists and doesn't have recursion
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'library_permissions'
AND policyname = 'library_permissions_policy';

-- Should show policy without nested library_permissions check
```

## What This Fixes

1. **Removes infinite recursion** from `library_permissions_policy`
2. **Fixes story_access policy** to avoid recursion
3. **Fixes character_access policy** to avoid recursion
4. **Fixes media_asset_access policy** to avoid recursion
5. **Adds trigger** to auto-create Owner permission when library is created

## Impact

- Stories can now be saved to database successfully
- Cover image generation can retrieve stories from database
- All image URLs will be generated and returned properly
