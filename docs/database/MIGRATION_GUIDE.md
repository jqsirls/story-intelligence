# Database Migration Guide

**Last Updated**: December 26, 2025  
**Purpose**: Complete guide for creating, applying, and validating database migrations

---

## Overview

This guide covers the database migration process for the Storytailor Multi-Agent System, including how to create migrations, apply them safely, and troubleshoot common issues.

---

## Migration Files Location

All migrations are stored in:
```
supabase/migrations/
```

**Naming Convention**: `YYYYMMDDHHMMSS_description.sql`

**Example**: `20251226000000_adult_only_registration.sql`

---

## Creating Migrations

### 1. Generate Migration File

```bash
# Create new migration file
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_your_migration_name.sql
```

### 2. Write Migration SQL

**Best Practices**:

1. **Idempotency**: Migrations should be safe to run multiple times
   ```sql
   -- Good: Idempotent
   CREATE TABLE IF NOT EXISTS users (...);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;
   
   -- Bad: Not idempotent
   CREATE TABLE users (...);  -- Fails if table exists
   ALTER TABLE users ADD COLUMN country TEXT;  -- Fails if column exists
   ```

2. **Data Migration**: Migrate existing data before adding constraints
   ```sql
   -- Good: Migrate data first
   UPDATE users SET is_minor = false WHERE is_minor IS NULL;
   ALTER TABLE users ADD CONSTRAINT users_adults_not_minor CHECK (is_minor = false);
   
   -- Bad: Constraint before data migration
   ALTER TABLE users ADD CONSTRAINT users_adults_not_minor CHECK (is_minor = false);
   UPDATE users SET is_minor = false WHERE is_minor IS NULL;  -- May fail
   ```

3. **Dependency Management**: Drop dependencies before dropping columns
   ```sql
   -- Good: Drop dependencies first
   DROP POLICY IF EXISTS users_profile_policy ON users;
   DROP FUNCTION IF EXISTS validate_user_registration();
   ALTER TABLE users DROP COLUMN IF EXISTS age CASCADE;
   
   -- Bad: Drop column first
   ALTER TABLE users DROP COLUMN age;  -- Fails if dependencies exist
   ```

4. **Verification**: Include verification steps
   ```sql
   -- Verify migration success
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'users' AND column_name = 'country'
     ) THEN
       RAISE EXCEPTION 'Migration failed: country column not found';
     END IF;
   END $$;
   ```

### 3. Migration Template

```sql
-- Migration: [Description]
-- Date: YYYY-MM-DD
-- Purpose: [What this migration does]
--
-- This migration [detailed description]

-- Step 1: Drop dependencies (if needed)
DROP POLICY IF EXISTS [policy_name] ON [table_name];
DROP FUNCTION IF EXISTS [function_name]();

-- Step 2: Migrate existing data (if needed)
UPDATE [table_name] SET [column] = [value] WHERE [condition];

-- Step 3: Add/modify schema
ALTER TABLE [table_name] ADD COLUMN IF NOT EXISTS [column] [type];
ALTER TABLE [table_name] ALTER COLUMN [column] DROP NOT NULL;

-- Step 4: Add constraints (after data migration)
ALTER TABLE [table_name] ADD CONSTRAINT IF NOT EXISTS [constraint_name] CHECK ([condition]);

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS [index_name] ON [table_name] ([column]);

-- Step 6: Verify
DO $$
BEGIN
  -- Verification logic
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '[table_name]' AND column_name = '[column]'
  ) THEN
    RAISE EXCEPTION 'Verification failed: [description]';
  END IF;
END $$;
```

---

## Applying Migrations

### Option A: Via Supabase Studio (Recommended for Production)

1. **Go to Supabase Dashboard**:
   - Navigate to: SQL Editor

2. **Open Migration File**:
   - Open migration file from `supabase/migrations/`
   - Copy entire SQL content

3. **Execute Migration**:
   - Paste SQL into SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - Review results

4. **Verify Success**:
   - Check for errors in results
   - Verify schema changes in Table Editor
   - Test affected functionality

### Option B: Via Supabase CLI (For Local Development)

```bash
# Apply all pending migrations
supabase db push

# Or apply specific migration
supabase migration up <migration_name>

# Check migration status
supabase migration list
```

### Option C: Programmatic Application (Not Recommended)

**Note**: The `exec_sql` RPC function may not be available in all Supabase projects.

```javascript
// Not recommended - use Supabase Studio instead
const { data, error } = await supabase.rpc('exec_sql', {
  sql: migrationSQL
});
```

---

## Migration Validation

### Pre-Application Validation

**1. Syntax Check**:
```bash
# Validate SQL syntax (if you have psql)
psql -d your_database -f migration_file.sql --dry-run
```

**2. Review Checklist**:
- [ ] Migration is idempotent
- [ ] Data migration happens before constraints
- [ ] Dependencies are dropped before columns
- [ ] Verification steps included
- [ ] No hardcoded values
- [ ] Comments explain purpose

**3. Test in Staging**:
- Apply migration to staging database first
- Verify schema changes
- Test affected functionality
- Check for performance impact

### Post-Application Validation

**1. Schema Verification**:
```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('country', 'locale', 'is_minor');

-- Check constraints exist
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users'
AND constraint_name = 'users_adults_not_minor';

-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND indexname LIKE '%country%';
```

**2. Data Verification**:
```sql
-- Check data migration
SELECT COUNT(*) FROM users WHERE is_minor IS NULL;  -- Should be 0
SELECT COUNT(*) FROM users WHERE country IS NULL;   -- Check expected nulls

-- Check constraint compliance
SELECT COUNT(*) FROM users WHERE is_minor = true;   -- Should be 0 (for adults table)
```

**3. Functionality Testing**:
- Test affected API endpoints
- Verify RLS policies work
- Check triggers fire correctly
- Test application functionality

---

## Storytailor ID Migration Details

### Migration Sequence

The Storytailor ID implementation required 6 migrations:

1. **`20251226000000_adult_only_registration.sql`**:
   - Removes `age` and `parent_email` columns
   - Adds jurisdiction fields (`country`, `locale`, `is_minor`)
   - Enforces `is_minor = false` constraint on users table
   - Creates `age_verification_audit` table

2. **`20251226000001_storytailor_id_enhancement.sql`**:
   - Adds `primary_character_id` to libraries
   - Adds `is_storytailor_id`, `age_range`, `is_minor` to libraries
   - Adds `is_primary` and `library_id` to characters
   - Creates indexes

3. **`20251226000002_library_consent.sql`**:
   - Creates `library_consent` table
   - Tracks parental consent for child Storytailor IDs

4. **`20251226000003_migrate_existing_libraries.sql`**:
   - Sets `is_storytailor_id = true` for all libraries
   - Creates default Storytailor IDs for existing users
   - Sets consent status for child sub-libraries

5. **`20251226000004_cleanup_age_triggers.sql`**:
   - Drops old triggers/functions referencing `age` column
   - Cleans up COPPA-related database objects

6. **`20251226000005_fix_story_id_constraint.sql`**:
   - Makes `story_id` nullable in characters table
   - Allows character-first creation flow

### Key Learnings

1. **Always Drop Dependencies First**: RLS policies, triggers, and functions must be dropped before dropping columns
2. **Migrate Data Before Constraints**: Update existing data before adding constraints
3. **Use CASCADE Carefully**: `CASCADE` can drop more than expected
4. **Verify After Each Step**: Check schema changes after each migration
5. **Test in Staging First**: Always test migrations in staging before production

---

## Troubleshooting

### Error: "cannot drop column X because other objects depend on it"

**Cause**: RLS policies, triggers, or functions reference the column

**Solution**:
```sql
-- 1. Find dependencies
SELECT 
  dependent_ns.nspname as dependent_schema,
  dependent_view.relname as dependent_view,
  source_ns.nspname as source_schema,
  source_table.relname as source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
JOIN pg_namespace source_ns ON source_table.relnamespace = source_ns.oid
WHERE source_table.relname = 'users'
AND source_table.relkind = 'r';

-- 2. Drop dependencies
DROP POLICY IF EXISTS [policy_name] ON users;
DROP FUNCTION IF EXISTS [function_name]();
DROP TRIGGER IF EXISTS [trigger_name] ON users;

-- 3. Then drop column
ALTER TABLE users DROP COLUMN [column_name] CASCADE;
```

### Error: "constraint X already exists"

**Cause**: Constraint was created in previous migration attempt

**Solution**:
```sql
-- Drop constraint if exists, then create
ALTER TABLE users DROP CONSTRAINT IF EXISTS [constraint_name];
ALTER TABLE users ADD CONSTRAINT [constraint_name] CHECK ([condition]);
```

### Error: "column X does not exist"

**Cause**: Migration was already applied or column name is wrong

**Solution**:
```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'country';

-- Use IF EXISTS or IF NOT EXISTS
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;
```

### Error: "null value in column X violates not-null constraint"

**Cause**: Adding NOT NULL constraint to column with null values

**Solution**:
```sql
-- 1. Update existing data
UPDATE users SET country = 'US' WHERE country IS NULL;

-- 2. Then add constraint
ALTER TABLE users ALTER COLUMN country SET NOT NULL;
```

---

## Migration Best Practices

### 1. Always Backup First

```bash
# Create database backup before applying migrations
# Use Supabase Dashboard → Database → Backups
# Or use pg_dump for local databases
```

### 2. Test in Staging

- Apply migrations to staging database first
- Verify schema changes
- Test affected functionality
- Check performance impact

### 3. Write Idempotent Migrations

- Use `IF EXISTS` / `IF NOT EXISTS`
- Check for existing objects before creating
- Safe to run multiple times

### 4. Migrate Data Before Constraints

- Update existing data first
- Then add constraints
- Verify data compliance

### 5. Drop Dependencies First

- Drop RLS policies
- Drop triggers
- Drop functions
- Then drop columns/tables

### 6. Include Verification

- Verify schema changes
- Verify data migration
- Verify constraints
- Verify indexes

### 7. Document Changes

- Add comments explaining purpose
- Document breaking changes
- Note required application updates

---

## Migration Checklist

### Before Creating Migration

- [ ] Understand what needs to change
- [ ] Review existing schema
- [ ] Plan migration steps
- [ ] Consider data migration needs
- [ ] Check for dependencies

### While Writing Migration

- [ ] Make it idempotent
- [ ] Migrate data before constraints
- [ ] Drop dependencies first
- [ ] Include verification
- [ ] Add comments

### Before Applying

- [ ] Review SQL syntax
- [ ] Test in staging
- [ ] Backup database
- [ ] Notify team
- [ ] Schedule maintenance window (if needed)

### After Applying

- [ ] Verify schema changes
- [ ] Verify data migration
- [ ] Test functionality
- [ ] Check performance
- [ ] Update documentation

---

## Related Documentation

- [Deployment Guide](../deployment/COMPLETE_DEPLOYMENT_GUIDE.md) - Deployment process
- [Testing Guide](../testing/COMPLETE_TESTING_GUIDE.md) - Database testing
- [API Status](../api/API_STATUS.md) - API endpoint inventory

---

**Last Updated**: December 26, 2025  
**Maintained By**: Engineering Team

