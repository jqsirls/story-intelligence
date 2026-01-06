# API Keys and Webhooks Migration Instructions

## Migration File
`supabase/migrations/20240101000018_api_keys_and_webhooks.sql`

## Quick Start (Recommended - 2 minutes)

### Option 1: Supabase Dashboard

1. **Open Supabase SQL Editor:**
   - Go to: https://app.supabase.com/project/lendybmmnlqelrhkhdyc/sql/new

2. **Copy Migration SQL:**
   ```bash
   cat supabase/migrations/20240101000018_api_keys_and_webhooks.sql
   ```

3. **Paste and Run:**
   - Paste the entire SQL content into the SQL Editor
   - Click the **"Run"** button
   - Wait for confirmation

4. **Verify:**
   - Check that tables `api_keys`, `webhooks`, and `webhook_deliveries` exist
   - Verify RLS policies are enabled

### Option 2: Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref lendybmmnlqelrhkhdyc

# Push migrations
supabase db push
```

## What This Migration Creates

### Tables
- **`api_keys`** - Stores hashed API keys with permissions and rate limits
- **`webhooks`** - Stores webhook endpoint configurations
- **`webhook_deliveries`** - Tracks webhook delivery history with retry support

### Features
- ✅ Row Level Security (RLS) policies for user data isolation
- ✅ Performance indexes on key columns
- ✅ Helper functions for webhook delivery management
- ✅ Automatic cleanup of old deliveries (30+ days)
- ✅ Trigger functions for automatic timestamp updates

## Verification

After running the migration, verify it worked:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('api_keys', 'webhooks', 'webhook_deliveries');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('api_keys', 'webhooks', 'webhook_deliveries');
```

## Troubleshooting

If you see errors:
- **"relation already exists"** - Tables already created, migration partially applied
- **"permission denied"** - Ensure you're using the correct Supabase account
- **"syntax error"** - Copy the entire file, don't split it

## Next Steps

Once migration is complete:
1. ✅ API key management endpoints will work with database persistence
2. ✅ Webhook delivery will track history in database
3. ✅ Retry logic will use database for scheduling
4. ✅ All webhook and API key operations will be persisted
