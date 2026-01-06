# Apply Organization ID Migration

## Issue
The `invitations` table has `organization_id` as NOT NULL, but friend referrals don't have an organization_id.

## Solution
Apply this SQL in Supabase Dashboard:

```sql
ALTER TABLE public.invitations ALTER COLUMN organization_id DROP NOT NULL;
```

## Steps
1. Go to: https://supabase.com/dashboard/project/lendybmmnlqelrhkhdyc/sql/new
2. Copy and paste the SQL above
3. Click "Run"
4. Verify the migration succeeded

## Alternative: Use Migration File
The migration file `supabase/migrations/20251227000000_add_invitations_rls_policy.sql` includes this fix along with RLS policies.

