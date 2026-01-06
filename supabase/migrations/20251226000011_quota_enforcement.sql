-- Quota Enforcement Migration
-- Creates trigger to increment lifetime_stories_created based on creator_user_id
-- This ensures transferred stories count against the creator, not the recipient

-- Ensure lifetime_stories_created column exists on users table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='lifetime_stories_created') THEN
    ALTER TABLE public.users 
    ADD COLUMN lifetime_stories_created INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create or replace function to increment story count based on creator_user_id
CREATE OR REPLACE FUNCTION increment_story_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.creator_user_id IS NOT NULL THEN
    -- Use creator_user_id for quota attribution (correct for transfers)
    UPDATE users
    SET lifetime_stories_created = COALESCE(lifetime_stories_created, 0) + 1
    WHERE id = NEW.creator_user_id;  -- Use creator, not library owner
  ELSE
    -- Fallback for old stories without creator_user_id
    UPDATE users
    SET lifetime_stories_created = COALESCE(lifetime_stories_created, 0) + 1
    WHERE id = (SELECT owner FROM libraries WHERE id = NEW.library_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_increment_story_count ON stories;

-- Create trigger to automatically increment story count
CREATE TRIGGER trigger_increment_story_count
  AFTER INSERT ON stories
  FOR EACH ROW
  EXECUTE FUNCTION increment_story_count();

-- Ensure lifetime_characters_created column exists for character quota
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='lifetime_characters_created') THEN
    ALTER TABLE public.users 
    ADD COLUMN lifetime_characters_created INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add creator_user_id to characters table if it doesn't exist (for future transfer quota tracking)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='characters' AND column_name='creator_user_id') THEN
    ALTER TABLE public.characters 
    ADD COLUMN creator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

