-- Migration: Storytailor ID Enhancement
-- Enhances libraries table to support Storytailor IDs (character-first narrative identities)
-- Enhances characters table to support primary character identity
-- Date: 2025-12-26

-- Step 1: Enhance libraries table (Storytailor IDs)
ALTER TABLE libraries ADD COLUMN IF NOT EXISTS primary_character_id UUID REFERENCES characters(id);
ALTER TABLE libraries ADD COLUMN IF NOT EXISTS is_storytailor_id BOOLEAN DEFAULT true;
ALTER TABLE libraries ADD COLUMN IF NOT EXISTS age_range TEXT CHECK (age_range IN ('3-5', '6-8', '9-10', '11-12', '13-15', '16-17'));
ALTER TABLE libraries ADD COLUMN IF NOT EXISTS is_minor BOOLEAN;
ALTER TABLE libraries ADD COLUMN IF NOT EXISTS consent_status TEXT CHECK (consent_status IN ('none', 'pending', 'verified', 'revoked')) DEFAULT 'none';
ALTER TABLE libraries ADD COLUMN IF NOT EXISTS policy_version TEXT;
ALTER TABLE libraries ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ;

-- Step 2: Enhance characters table (identity layer)
-- Note: library_id may already exist from migration 20240101000005_character_library_association.sql
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
-- Only add library_id if it doesn't exist (check via information_schema to avoid errors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'characters' AND column_name = 'library_id'
  ) THEN
    ALTER TABLE characters ADD COLUMN library_id UUID REFERENCES libraries(id);
  END IF;
END $$;

-- Step 3: Constraint: One primary character per library
-- This ensures that each Storytailor ID can have at most one primary character
CREATE UNIQUE INDEX IF NOT EXISTS idx_libraries_primary_character 
  ON libraries(primary_character_id) 
  WHERE primary_character_id IS NOT NULL;

-- Step 4: Index for library lookup by character
CREATE INDEX IF NOT EXISTS idx_characters_library_id 
  ON characters(library_id) 
  WHERE library_id IS NOT NULL;

-- Step 5: Index for primary characters
CREATE INDEX IF NOT EXISTS idx_characters_is_primary 
  ON characters(is_primary) 
  WHERE is_primary = true;

-- Step 6: Index for Storytailor ID queries
CREATE INDEX IF NOT EXISTS idx_libraries_is_storytailor_id 
  ON libraries(is_storytailor_id) 
  WHERE is_storytailor_id = true;

-- Step 7: Index for consent status queries
CREATE INDEX IF NOT EXISTS idx_libraries_consent_status 
  ON libraries(consent_status) 
  WHERE consent_status IS NOT NULL;

-- Step 8: Index for sub-libraries (child Storytailor IDs)
CREATE INDEX IF NOT EXISTS idx_libraries_parent_library 
  ON libraries(parent_library) 
  WHERE parent_library IS NOT NULL;

-- Step 9: Index for age range queries
CREATE INDEX IF NOT EXISTS idx_libraries_age_range 
  ON libraries(age_range) 
  WHERE age_range IS NOT NULL;

-- Step 10: Index for is_minor queries
CREATE INDEX IF NOT EXISTS idx_libraries_is_minor 
  ON libraries(is_minor) 
  WHERE is_minor IS NOT NULL;

