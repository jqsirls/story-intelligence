# Database Migration Application Instructions

## Migration File
`supabase/migrations/20250101000001_deletion_system.sql`

## Application Methods

### Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20250101000001_deletion_system.sql`
5. Paste into the SQL Editor
6. Click **Run** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)
7. Verify no errors appear in the results

### Method 2: Supabase CLI

```bash
# If you have Supabase CLI linked to your project
supabase db push

# Or apply specific migration
supabase migration up
```

### Method 3: Direct psql Connection

```bash
# Set your database connection string
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Apply migration
psql $DATABASE_URL -f supabase/migrations/20250101000001_deletion_system.sql
```

## Verification

After applying the migration, run the verification script:

```bash
./scripts/verify-deletion-migration.sh
```

Or verify manually by checking:

1. **Tables exist:**
   - `user_tiers`
   - `deletion_requests`
   - `deletion_audit_log`
   - `email_engagement_tracking`
   - `hibernated_accounts`

2. **Function exists:**
   - `log_deletion_audit`

3. **Indexes exist:**
   - `idx_deletion_requests_user_id`
   - `idx_deletion_requests_status`
   - `idx_deletion_requests_scheduled_at`
   - `idx_email_tracking_user_id`

4. **RLS is enabled** on all tables

## Important Notes

- The migration uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` for idempotency
- If tables already exist, the migration will skip creating them
- RLS policies are created for security
- The `log_deletion_audit` function is required for deletion operations

## Troubleshooting

If you encounter errors:

1. **Table already exists**: This is OK - the migration is idempotent
2. **Permission errors**: Ensure you're using the service role key or have proper permissions
3. **Function errors**: Check that the function signature matches what's expected

## Next Steps

After successful migration:
1. Run verification script: `./scripts/verify-deletion-migration.sh`
2. Proceed with Universal Agent deployment
3. Test deletion endpoints
