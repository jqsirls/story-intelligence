-- Migration: Cleanup Age and Parent Email Triggers
-- Drops any remaining triggers/functions that reference the dropped 'age' and 'parent_email' columns
-- Date: 2025-12-26
-- 
-- This migration should be run if the age/parent_email columns were dropped but triggers still exist
-- It's safe to run multiple times (idempotent)

-- Drop trigger that sets COPPA protection based on age
DROP TRIGGER IF EXISTS trigger_set_coppa_protection ON users;

-- Drop the function that references age
DROP FUNCTION IF EXISTS set_coppa_protection();

-- Drop any other triggers that might reference age or parent_email
DROP TRIGGER IF EXISTS trigger_validate_user_registration ON users;
DROP TRIGGER IF EXISTS validate_user_registration_trigger ON users;

-- Drop the trigger function (references both age and parent_email)
-- Try all possible function signatures
DROP FUNCTION IF EXISTS trigger_validate_user_registration();
DROP FUNCTION IF EXISTS trigger_validate_user_registration() CASCADE;

-- Drop the validate_user_registration function (references parent_email parameter)
-- Try all possible function signatures
DROP FUNCTION IF EXISTS validate_user_registration(INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS validate_user_registration(INTEGER, TEXT, TEXT) CASCADE;

-- Force drop by finding and dropping all functions with this name
DO $$
DECLARE
  func_record RECORD;
  func_signature TEXT;
BEGIN
  -- Find all functions named trigger_validate_user_registration
  FOR func_record IN 
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as argtypes,
      p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'trigger_validate_user_registration'
    AND n.nspname = 'public'
  LOOP
    -- Build function signature
    IF func_record.argtypes = '' THEN
      func_signature := format('%s()', func_record.proname);
    ELSE
      func_signature := format('%s(%s)', func_record.proname, func_record.argtypes);
    END IF;
    
    -- Drop the function
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS public.%s CASCADE', func_signature);
      RAISE NOTICE 'Dropped function: %', func_signature;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping function %: %', func_signature, SQLERRM;
    END;
  END LOOP;
  
  -- Find all functions named validate_user_registration
  FOR func_record IN 
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as argtypes,
      p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'validate_user_registration'
    AND n.nspname = 'public'
  LOOP
    -- Build function signature
    IF func_record.argtypes = '' THEN
      func_signature := format('%s()', func_record.proname);
    ELSE
      func_signature := format('%s(%s)', func_record.proname, func_record.argtypes);
    END IF;
    
    -- Drop the function
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS public.%s CASCADE', func_signature);
      RAISE NOTICE 'Dropped function: %', func_signature;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping function %: %', func_signature, SQLERRM;
    END;
  END LOOP;
END $$;

-- Verify no triggers remain (this will show any remaining triggers)
-- Run this query manually to check:
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'users';

