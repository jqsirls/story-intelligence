-- Migration: Add profile_id to Stories Table
-- Version: V3 Audio & UX Superiority
-- Purpose: Connect stories to child profiles for multi-child household support
-- Reference: .cursor/plans/v3_audio_&_ux_superiority_b6cf5777.plan.md Phase 1.1

-- ============================================================================
-- ADD profile_id COLUMN TO stories TABLE
-- ============================================================================

DO $$
BEGIN
  -- Check if profile_id already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stories' 
    AND column_name = 'profile_id'
  ) THEN
    -- Verify profiles table exists before adding FK
    -- Note: profiles table may not exist yet - if so, this migration will fail gracefully
    -- and can be re-run after profiles table is created
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles'
    ) THEN
      -- Add column with FK constraint
      ALTER TABLE stories ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
      
      -- Index for performance
      CREATE INDEX IF NOT EXISTS idx_stories_profile_id ON stories(profile_id);
      
      RAISE NOTICE 'Added profile_id column to stories table';
    ELSE
      -- Profiles table doesn't exist - add column without FK for now
      -- FK can be added later when profiles table is created
      ALTER TABLE stories ADD COLUMN profile_id UUID;
      CREATE INDEX IF NOT EXISTS idx_stories_profile_id ON stories(profile_id);
      
      RAISE NOTICE 'Added profile_id column to stories table (without FK - profiles table does not exist)';
      RAISE WARNING 'Consider adding FK constraint later: ALTER TABLE stories ADD CONSTRAINT stories_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;';
    END IF;
  ELSE
    RAISE NOTICE 'profile_id column already exists, skipping';
  END IF;
END $$;

-- ============================================================================
-- UPDATE RLS POLICIES (if needed)
-- ============================================================================

-- Note: RLS policies may already exist for stories table
-- This adds profile-based access if profiles table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Check if policy already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'stories' 
      AND policyname = 'Users can view their profile stories'
    ) THEN
      CREATE POLICY "Users can view their profile stories"
        ON stories FOR SELECT
        USING (
          profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          )
        );
      RAISE NOTICE 'Created RLS policy for profile stories';
    ELSE
      RAISE NOTICE 'RLS policy already exists, skipping';
    END IF;
  ELSE
    RAISE NOTICE 'Profiles table does not exist - skipping RLS policy creation';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN stories.profile_id IS 'Child profile this story belongs to (for multi-child household support). NULL if story belongs to parent library.';

