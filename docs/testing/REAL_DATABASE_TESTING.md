# Real Database Testing Guide

This guide explains how to test the Storytailor ID implementation against a real database (not mocks).

## Prerequisites

1. **Database Access**: You need access to a Supabase database (production, staging, or local)
2. **Environment Variables**: Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
3. **API Server**: Either running locally or deployed Lambda

## Step 1: Apply Migrations

Before testing, apply the Storytailor ID migrations to your database.

### Option A: Using Supabase Studio (Recommended)

1. Go to your Supabase project: `https://[project-id].supabase.co/project/_/sql`
2. For each migration file, copy and paste into SQL Editor:
   - `supabase/migrations/20251226000000_adult_only_registration.sql`
   - `supabase/migrations/20251226000001_storytailor_id_enhancement.sql`
   - `supabase/migrations/20251226000002_library_consent.sql`
   - `supabase/migrations/20251226000003_migrate_existing_libraries.sql`
3. Click "Run" for each migration
4. Verify no errors appear

### Option B: Using Migration Script

```bash
./scripts/apply-storytailor-id-migrations.sh [supabase-url] [service-key]
```

Or with environment variables:

```bash
export SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_SERVICE_KEY=xxx
./scripts/apply-storytailor-id-migrations.sh
```

## Step 2: Test Database Schema

Verify the migrations were applied correctly:

```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_KEY=xxx \
node scripts/test-storytailor-id-real-db.js
```

This script will:
- ✅ Check that all new columns exist
- ✅ Verify constraints (adult-only registration)
- ✅ Test Storytailor ID creation flow
- ✅ Verify jurisdiction logic

## Step 3: Test REST API Endpoints

Test the actual REST API endpoints with real HTTP requests:

```bash
API_BASE_URL=https://api.storytailor.dev \
node scripts/test-rest-api-endpoints.js
```

Or for local testing:

```bash
API_BASE_URL=http://localhost:3000 \
node scripts/test-rest-api-endpoints.js
```

This script tests:
- ✅ Adult registration (should succeed)
- ✅ Minor registration (should fail with 403 ADULT_REQUIRED)
- ✅ Get user info
- ✅ Create character
- ✅ Create Storytailor ID
- ✅ List Storytailor IDs
- ✅ Get single Storytailor ID
- ✅ Request consent

## Step 4: Manual Verification

### Check Database State

```sql
-- Verify users table has jurisdiction fields
SELECT id, email, country, is_minor, policy_version 
FROM users 
LIMIT 5;

-- Verify all users are adults
SELECT COUNT(*) as minor_count 
FROM users 
WHERE is_minor = true;
-- Should return 0

-- Verify Storytailor ID fields exist
SELECT id, name, is_storytailor_id, primary_character_id, consent_status 
FROM libraries 
WHERE is_storytailor_id = true 
LIMIT 5;

-- Verify age verification audit table
SELECT COUNT(*) 
FROM age_verification_audit;
```

### Test Registration Flow

1. **Adult Registration** (should succeed):
```bash
curl -X POST https://api.storytailor.dev/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "adult@test.com",
    "password": "Test123!",
    "fullName": "Test Adult",
    "country": "US",
    "locale": "en-US",
    "dateOfBirth": "1990-01-01",
    "userType": "parent"
  }'
```

2. **Minor Registration** (should fail with 403):
```bash
curl -X POST https://api.storytailor.dev/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "minor@test.com",
    "password": "Test123!",
    "fullName": "Test Minor",
    "country": "US",
    "locale": "en-US",
    "dateOfBirth": "2015-01-01",
    "userType": "parent"
  }'
```

Expected response:
```json
{
  "success": false,
  "error": "ADULT_REQUIRED",
  "code": "ADULT_REQUIRED",
  "message": "Registration is only available for adults"
}
```

## Troubleshooting

### Migration Errors

**Error: "column already exists"**
- This is OK - migrations use `IF NOT EXISTS` clauses
- The migration is idempotent

**Error: "constraint already exists"**
- This is OK - constraints are created with `IF NOT EXISTS`
- Re-running migrations is safe

**Error: "relation does not exist"**
- Check that you're running migrations in order
- Ensure base schema exists (initial migrations applied)

### Test Failures

**"Table or column does not exist"**
- Migrations not applied - go back to Step 1
- Check migration order (run in timestamp order)

**"Users table constraint violated"**
- Check for existing users with `is_minor = true`
- Migration should have migrated these, but verify manually

**"No auth token received"**
- Check API server is running
- Verify authentication endpoint is working
- Check API_BASE_URL is correct

**"403 ADULT_REQUIRED not returned"**
- Check JurisdictionService is integrated
- Verify age evaluation logic in AuthRoutes
- Check logs for error details

## Success Criteria

All tests pass when:
- ✅ All migrations applied without errors
- ✅ Database schema has all new columns
- ✅ Adult registration succeeds
- ✅ Minor registration fails with 403
- ✅ Storytailor ID creation works
- ✅ Character-first creation flow works
- ✅ Consent workflow works

## Next Steps

After successful testing:
1. Deploy migrations to production
2. Monitor for errors in production
3. Verify real user registrations work
4. Check age verification audit logs

