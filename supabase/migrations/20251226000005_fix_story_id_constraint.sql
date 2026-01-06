-- Migration: Fix story_id NOT NULL Constraint
-- Makes story_id nullable to allow characters without stories
-- Date: 2025-12-26
-- 
-- This fixes the missing piece from 20240101000005_character_library_association.sql
-- which was partially applied (library_id exists but story_id is still NOT NULL)

-- Make story_id nullable
-- This allows characters to be created independently of stories
ALTER TABLE characters ALTER COLUMN story_id DROP NOT NULL;

-- Verify the change
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'characters' 
    AND column_name = 'story_id' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'Failed to make story_id nullable - constraint still exists';
  ELSE
    RAISE NOTICE 'Successfully made story_id nullable';
  END IF;
END $$;

