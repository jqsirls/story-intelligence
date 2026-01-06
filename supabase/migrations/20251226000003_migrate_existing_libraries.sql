-- Migration: Migrate Existing Libraries to Storytailor IDs
-- Sets all existing libraries as Storytailor IDs
-- Sets consent_status for sub-libraries
-- Creates function to auto-create default Storytailor ID for users
-- Runs migration for existing users without libraries
-- Date: 2025-12-26

-- Step 1: Set all existing libraries as Storytailor IDs
UPDATE libraries 
SET is_storytailor_id = true 
WHERE is_storytailor_id IS NULL;

-- Step 2: For sub-libraries (child Storytailor IDs), set consent_status to 'pending' if no consent exists
-- Note: We can't determine is_minor from existing data, so we'll leave it NULL
-- Consent workflow will set it when consent is requested
UPDATE libraries 
SET consent_status = 'pending' 
WHERE parent_library IS NOT NULL 
  AND consent_status = 'none'
  AND is_minor IS NULL; -- Only for libraries where we haven't evaluated yet

-- Step 3: Function to auto-create default Storytailor ID for existing users without libraries
CREATE OR REPLACE FUNCTION create_default_storytailor_id_for_user(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_library_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User does not exist: %', p_user_id;
  END IF;

  -- Check if user already has a library (main library, not sub-library)
  SELECT id INTO v_library_id 
  FROM libraries 
  WHERE owner = p_user_id 
  AND parent_library IS NULL 
  LIMIT 1;

  -- If library exists, return it
  IF v_library_id IS NOT NULL THEN
    RETURN v_library_id;
  END IF;

  -- Create default library (Storytailor ID)
  INSERT INTO libraries (owner, name, is_storytailor_id)
  VALUES (p_user_id, 'My Stories', true)
  RETURNING id INTO v_library_id;

  -- Create owner permission
  INSERT INTO library_permissions (library_id, user_id, role, granted_by)
  VALUES (v_library_id, p_user_id, 'Owner', p_user_id);

  RETURN v_library_id;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Run migration for existing users without libraries
DO $$
DECLARE
  user_record RECORD;
  library_id UUID;
  users_processed INTEGER := 0;
  libraries_created INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT id FROM users 
    WHERE id NOT IN (SELECT DISTINCT owner FROM libraries WHERE parent_library IS NULL)
  LOOP
    BEGIN
      SELECT create_default_storytailor_id_for_user(user_record.id) INTO library_id;
      libraries_created := libraries_created + 1;
      RAISE NOTICE 'Created default Storytailor ID for user %: %', user_record.id, library_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create default Storytailor ID for user %: %', user_record.id, SQLERRM;
    END;
    users_processed := users_processed + 1;
  END LOOP;
  
  RAISE NOTICE 'Migration complete: Processed % users, created % default Storytailor IDs', users_processed, libraries_created;
END $$;

-- Step 5: Create function to get user's default Storytailor ID (helper for API)
CREATE OR REPLACE FUNCTION get_user_default_storytailor_id(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_library_id UUID;
BEGIN
  -- Get user's main library (not sub-library)
  SELECT id INTO v_library_id 
  FROM libraries 
  WHERE owner = p_user_id 
  AND parent_library IS NULL 
  AND is_storytailor_id = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no library exists, create one
  IF v_library_id IS NULL THEN
    SELECT create_default_storytailor_id_for_user(p_user_id) INTO v_library_id;
  END IF;

  RETURN v_library_id;
END;
$$ LANGUAGE plpgsql;

