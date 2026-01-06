-- Migration: Adult-Only Registration
-- Removes age and parent_email columns, adds jurisdiction fields
-- Creates age_verification_audit table for compliance tracking
-- Date: 2025-12-26

-- Step 1: Add jurisdiction fields first (before constraint)
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT CHECK (char_length(country) = 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS policy_version TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS minor_threshold INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS applicable_framework TEXT;

-- Step 2: Migrate existing age data to is_minor before dropping age column
-- IMPORTANT: Set all existing users to is_minor = false (adults only in users table)
-- If any users have age < 18, they should NOT be in the users table (COPPA violation)
-- This migration assumes all existing users are adults
-- CHECK: Only migrate if age column exists (idempotent)
DO $$
DECLARE
  user_record RECORD;
  minor_count INTEGER := 0;
  age_column_exists BOOLEAN;
BEGIN
  -- Check if age column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'age'
  ) INTO age_column_exists;
  
  -- Only migrate if age column exists
  IF age_column_exists THEN
    -- For existing users with age, check if any are minors
    FOR user_record IN SELECT id, age FROM users WHERE age IS NOT NULL LOOP
      IF user_record.age < 18 THEN
        minor_count := minor_count + 1;
        -- Log warning but set to false (adult-only table)
        RAISE WARNING 'User % has age % (minor) - setting is_minor=false (users table is adult-only)', user_record.id, user_record.age;
      END IF;
      -- Set all existing users to false (adults only)
      UPDATE users 
      SET is_minor = false,
          policy_version = '2025-01',
          evaluated_at = NOW(),
          minor_threshold = 13, -- Default US threshold
          applicable_framework = 'COPPA'
      WHERE id = user_record.id;
    END LOOP;
    
    IF minor_count > 0 THEN
      RAISE WARNING 'Found % existing users with age < 18. All users in users table must be adults.', minor_count;
    END IF;
  ELSE
    RAISE NOTICE 'Age column does not exist - skipping age migration step';
  END IF;
  
  -- For all users (whether age column existed or not), set is_minor = false if NULL
  -- This ensures all existing users are marked as adults
  UPDATE users 
  SET is_minor = false,
      policy_version = COALESCE(policy_version, '2025-01'),
      evaluated_at = COALESCE(evaluated_at, NOW()),
      minor_threshold = COALESCE(minor_threshold, 13),
      applicable_framework = COALESCE(applicable_framework, 'COPPA')
  WHERE is_minor IS NULL;
END $$;
-- Step 3: Remove age and parent_email columns (COPPA violation - collecting child PII before consent)
-- First, drop RLS policies that depend on parent_email column
-- These policies may reference users.parent_email in their USING clauses

-- Drop policies on parent_notification_preferences table (if exists)
-- These are the policies mentioned in the error message
DROP POLICY IF EXISTS parent_notification_prefs_select ON parent_notification_preferences;
DROP POLICY IF EXISTS parent_notification_prefs_insert ON parent_notification_preferences;
DROP POLICY IF EXISTS parent_notification_prefs_update ON parent_notification_preferences;
DROP POLICY IF EXISTS parent_notification_prefs_delete ON parent_notification_preferences;

-- Drop policies on parent_notification_log table (if exists)
DROP POLICY IF EXISTS parent_notification_log_select ON parent_notification_log;
DROP POLICY IF EXISTS parent_notification_log_insert ON parent_notification_log;
DROP POLICY IF EXISTS parent_notification_log_update ON parent_notification_log;
DROP POLICY IF EXISTS parent_notification_log_delete ON parent_notification_log;

-- Drop any other policies that reference users.parent_email
-- Check for policies on users table that reference parent_email
DROP POLICY IF EXISTS users_profile_policy ON users;

-- Also drop the validate_user_registration function if it references parent_email
-- (It will be recreated without parent_email parameter if needed)
DROP FUNCTION IF EXISTS validate_user_registration(INTEGER, TEXT, TEXT);

-- Drop trigger function that references parent_email and age
DROP FUNCTION IF EXISTS trigger_validate_user_registration();

-- Drop any triggers that might reference parent_email or age
DROP TRIGGER IF EXISTS trigger_validate_user_registration ON users;
DROP TRIGGER IF EXISTS validate_user_registration_trigger ON users;

-- Also drop the set_coppa_protection trigger if it references age
DROP TRIGGER IF EXISTS trigger_set_coppa_protection ON users;
DROP FUNCTION IF EXISTS set_coppa_protection();

-- Now drop the columns
-- Use CASCADE to automatically drop any remaining dependent objects (policies, views, etc.)
ALTER TABLE users DROP COLUMN IF EXISTS age CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS parent_email CASCADE;

-- Step 4: Enforce constraint: adults must have is_minor = false
-- This ensures that all users in the users table are adults
-- Drop constraint if it exists (idempotent)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_adults_not_minor;
-- Add constraint (all existing users should have is_minor = false from Step 2)
ALTER TABLE users ADD CONSTRAINT users_adults_not_minor 
  CHECK (is_minor = false);

-- Step 5: Create age verification audit table (for compliance)
-- This table stores one-time age verification results for audit purposes
-- Retention policy: 90 days unless partner contract requires longer
CREATE TABLE IF NOT EXISTS age_verification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id), -- NULL if registration was blocked
  verification_method TEXT NOT NULL CHECK (verification_method IN ('confirmation', 'birthYear', 'ageRange')),
  verification_attestation BOOLEAN, -- true if user attested to being over threshold
  derived_bucket TEXT NOT NULL, -- 'adult_confirmed', 'minor_detected', 'adult_birthyear', etc.
  country TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  evaluated_threshold INTEGER NOT NULL,
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Encrypted sensitive data (if needed)
  encrypted_verification_value BYTEA, -- Encrypted birth year or age range if stored
  encryption_key_id TEXT, -- Reference to KMS key if using AWS KMS
  -- Retention policy: 90 days unless partner contract requires longer
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create indexes for performance and cleanup
CREATE INDEX IF NOT EXISTS idx_age_verification_audit_expires_at 
  ON age_verification_audit(expires_at);

CREATE INDEX IF NOT EXISTS idx_age_verification_audit_user_id 
  ON age_verification_audit(user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_age_verification_audit_country 
  ON age_verification_audit(country);

CREATE INDEX IF NOT EXISTS idx_age_verification_audit_created_at 
  ON age_verification_audit(created_at);

-- Step 7: Function to clean up expired audit records
CREATE OR REPLACE FUNCTION cleanup_expired_age_verification_audit()
RETURNS void AS $$
BEGIN
  DELETE FROM age_verification_audit 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create index on users.country for performance
CREATE INDEX IF NOT EXISTS idx_users_country 
  ON users(country) 
  WHERE country IS NOT NULL;

-- Step 9: Create index on users.is_minor for performance
CREATE INDEX IF NOT EXISTS idx_users_is_minor 
  ON users(is_minor);

-- Note: pg_cron scheduling for cleanup_expired_age_verification_audit()
-- would be done via Supabase dashboard or separate migration if pg_cron extension is available
-- Example (requires pg_cron extension):
-- SELECT cron.schedule('cleanup-age-verification-audit', '0 2 * * *', 'SELECT cleanup_expired_age_verification_audit()');

