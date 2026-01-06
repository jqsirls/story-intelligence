-- Add user_type support to users table
-- This migration adds proper user type classification for COPPA compliance

-- Add user_type column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT;

-- Create user_type constraint
ALTER TABLE users ADD CONSTRAINT check_user_type 
  CHECK (user_type IN (
    'child', 'parent', 'guardian', 'grandparent', 'aunt_uncle', 
    'older_sibling', 'foster_caregiver', 'teacher', 'librarian', 
    'afterschool_leader', 'childcare_provider', 'nanny', 
    'child_life_specialist', 'therapist', 'medical_professional', 
    'coach_mentor', 'enthusiast', 'other'
  ));

-- Add first_name and last_name columns (required for proper registration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Create index for user_type for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- Update RLS policies to consider user_type for enhanced security
CREATE POLICY users_profile_policy ON users
  FOR SELECT USING (
    auth.uid() = id OR 
    auth.jwt() ->> 'role' = 'admin' OR
    (user_type IN ('parent', 'guardian') AND 
     EXISTS (
       SELECT 1 FROM users child_user 
       WHERE child_user.parent_email = users.email 
       AND child_user.is_coppa_protected = TRUE
     ))
  );

-- Function to validate user registration data
CREATE OR REPLACE FUNCTION validate_user_registration(
  p_age INTEGER,
  p_user_type TEXT,
  p_parent_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Age validation
  IF p_age < 3 OR p_age > 120 THEN
    RAISE EXCEPTION 'Age must be between 3 and 120 years';
  END IF;
  
  -- COPPA compliance: children under 13 need parent email
  IF p_age < 13 AND (p_parent_email IS NULL OR p_parent_email = '') THEN
    RAISE EXCEPTION 'Children under 13 require parent email for COPPA compliance';
  END IF;
  
  -- User type validation for children
  IF p_age < 13 AND p_user_type != 'child' THEN
    RAISE EXCEPTION 'Users under 13 must have user_type "child"';
  END IF;
  
  -- User type validation for adults
  IF p_age >= 18 AND p_user_type = 'child' THEN
    RAISE EXCEPTION 'Users 18 and older cannot have user_type "child"';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Trigger to validate user data on insert/update
CREATE OR REPLACE FUNCTION trigger_validate_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip validation for updates that don't change key fields
  IF TG_OP = 'UPDATE' AND 
     OLD.age = NEW.age AND 
     OLD.user_type = NEW.user_type AND 
     OLD.parent_email = NEW.parent_email THEN
    RETURN NEW;
  END IF;
  
  -- Validate registration data
  PERFORM validate_user_registration(NEW.age, NEW.user_type, NEW.parent_email);
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_validate_user_registration ON users;
CREATE TRIGGER trigger_validate_user_registration
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_validate_user_registration();

-- Add comments for documentation
COMMENT ON COLUMN users.user_type IS 'User type classification for proper age validation and COPPA compliance';
COMMENT ON FUNCTION validate_user_registration IS 'Validates user registration data for COPPA compliance and business rules';
COMMENT ON TRIGGER trigger_validate_user_registration ON users IS 'Ensures user registration data meets COPPA and business requirements';

-- Update knowledge base content to reflect user types
INSERT INTO knowledge_content (
  content_type, category, title, content, tags, user_types
) VALUES 
(
  'platform_feature',
  'registration',
  'What user types can register?',
  'Storytailor supports comprehensive user types: Parents/Guardians, Grandparents, Aunts/Uncles, Older Siblings, Foster/Kinship Caregivers, Teachers/Educators, Librarians, After-School Leaders, Childcare Providers, Nannies, Child Life Specialists, Therapists/Counselors, Medical Professionals, Coaches/Mentors, and Enthusiasts. Children under 13 require parent email for COPPA compliance.',
  ARRAY['registration', 'user types', 'coppa', 'adults'],
  ARRAY['all']
),
(
  'platform_feature',
  'age_requirements',
  'What are the age requirements?',
  'Adults (18+) can register with any user type except "child". Teens (13-17) can register independently. Children (3-12) must have user_type "child" and require parent email for COPPA compliance. This ensures proper family account structure and legal compliance.',
  ARRAY['age', 'requirements', 'coppa', 'children', 'adults'],
  ARRAY['parent', 'teacher', 'organization_admin']
)
ON CONFLICT DO NOTHING;