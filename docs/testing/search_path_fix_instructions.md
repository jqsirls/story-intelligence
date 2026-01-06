# Fix All 9 System Functions - Instructions

**Goal**: Fix ALL 9 remaining Supabase system functions with NO EXCEPTIONS

## Functions to Fix

### GraphQL Schema (2)
- `graphql.get_schema_version()`
- `graphql.increment_schema_version()`

### Storage Schema (7)
- `storage.add_prefixes(_bucket_id text, _name text)`
- `storage.delete_leaf_prefixes(bucket_ids text[], names text[])`
- `storage.delete_prefix(_bucket_id text, _name text)`
- `storage.lock_top_prefixes(bucket_ids text[], names text[])`
- `storage.objects_delete_cleanup()`
- `storage.objects_update_cleanup()`
- `storage.prefixes_delete_cleanup()`

## Method 1: Supabase Dashboard (RECOMMENDED - Easiest)

1. **Go to Supabase Dashboard**
   - Navigate to: `https://supabase.com/dashboard/project/[YOUR_PROJECT_REF]/sql`
   - Or: Project → SQL Editor

2. **Open Migration File**
   - File: `supabase/migrations/20241216000004_fix_system_functions_with_service_role.sql`
   - Copy the entire contents

3. **Execute in SQL Editor**
   - Paste the SQL into the editor
   - Click "Run" or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)
   - The dashboard runs with service role permissions automatically

4. **Verify Success**
   - Check the output for: "🎉 SUCCESS: All 9 functions now have search_path set!"
   - Run verification: `supabase/migrations/verify_search_path_fix.sql`

## Method 2: Via Script (Automated)

```bash
# Run the automated script
./scripts/apply-search-path-fix-service-role.sh production
```

**Note**: This uses REST API which may have limitations. If it fails, use Method 1.

## Method 3: Direct psql Connection

If you have direct database access:

```bash
# Get connection string from Supabase Dashboard
# Settings → Database → Connection string (use "URI" format with service role password)

psql "postgresql://postgres:[SERVICE_ROLE_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f supabase/migrations/20241216000004_fix_system_functions_with_service_role.sql
```

## Method 4: Supabase CLI (If Available)

```bash
# Link to project (if not already linked)
supabase link --project-ref [YOUR_PROJECT_REF]

# Run migration
supabase db push
```

## Verification

After running the migration, verify with:

```sql
-- Run: supabase/migrations/verify_search_path_fix.sql
-- Expected result: 0 functions remaining
```

## Troubleshooting

### If Migration Fails with Permission Errors

1. **Check Current User**:
   ```sql
   SELECT current_user, session_user;
   ```

2. **Verify Service Role**:
   - Ensure you're using service role key (not anon key)
   - Service role key starts with `eyJ...` (JWT token)

3. **Try Granting Permissions First**:
   ```sql
   -- Run this first (may fail, but worth trying)
   GRANT ALL ON ALL FUNCTIONS IN SCHEMA graphql TO postgres;
   GRANT ALL ON ALL FUNCTIONS IN SCHEMA storage TO postgres;
   ```

### If All Methods Fail

1. **Contact Supabase Support**:
   - Open a support ticket
   - Request: "Please add `SET search_path = ''` to these 9 SECURITY DEFINER functions"
   - Provide the list of 9 functions

2. **Alternative: Recreate Functions** (Advanced):
   - This is complex and risky
   - May break Supabase functionality
   - Not recommended unless absolutely necessary

## Expected Output

**Success**:
```
✅ Updated: graphql.get_schema_version
✅ Updated: graphql.increment_schema_version
✅ Updated: storage.add_prefixes
...
🎉 SUCCESS: All 9 functions now have search_path set!
```

**Partial Success**:
- Some functions may succeed, others may fail
- Check error messages for specific issues
- Retry failed functions individually

## Next Steps After Success

1. ✅ Verify with verification query (should show 0 remaining)
2. ✅ Update documentation to reflect 100% completion
3. ✅ Mark plan requirement as complete
