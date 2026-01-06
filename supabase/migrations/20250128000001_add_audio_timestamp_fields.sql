-- Migration: Add Audio Timestamp Fields to Stories Table
-- Version: V3 Audio & UX Superiority
-- Purpose: Store word-level timestamps and 4-block HTML structure for audio highlighting
-- Reference: .cursor/plans/v3_audio_&_ux_superiority_b6cf5777.plan.md Phase 3.2

-- ============================================================================
-- ADD WORD-LEVEL TIMESTAMP STORAGE
-- ============================================================================

DO $$
BEGIN
  -- Check and add audio_words
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stories' 
    AND column_name = 'audio_words'
  ) THEN
    ALTER TABLE stories ADD COLUMN audio_words JSONB;
    COMMENT ON COLUMN stories.audio_words IS 'Array of {txt, start, end} word timestamps from ElevenLabs with-timestamps API';
    RAISE NOTICE 'Added audio_words column';
  ELSE
    RAISE NOTICE 'audio_words column already exists, skipping';
  END IF;
  
  -- Check and add audio_blocks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stories' 
    AND column_name = 'audio_blocks'
  ) THEN
    ALTER TABLE stories ADD COLUMN audio_blocks JSONB;
    COMMENT ON COLUMN stories.audio_blocks IS 'Object {a, b, c, d} with HTML spans for 4 story beats. Each block contains <span data-start="..." data-end="...">word</span> elements.';
    RAISE NOTICE 'Added audio_blocks column';
  ELSE
    RAISE NOTICE 'audio_blocks column already exists, skipping';
  END IF;
END $$;

-- ============================================================================
-- ADD SFX FIELDS (Pro-only)
-- ============================================================================

DO $$
BEGIN
  -- Check and add audio_sfx_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stories' 
    AND column_name = 'audio_sfx_url'
  ) THEN
    ALTER TABLE stories ADD COLUMN audio_sfx_url TEXT;
    COMMENT ON COLUMN stories.audio_sfx_url IS 'URL to SFX bed audio file (Pro users only). Mixed with narration for background sound effects.';
    RAISE NOTICE 'Added audio_sfx_url column';
  ELSE
    RAISE NOTICE 'audio_sfx_url column already exists, skipping';
  END IF;
  
  -- Check and add audio_sfx_cues
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stories' 
    AND column_name = 'audio_sfx_cues'
  ) THEN
    ALTER TABLE stories ADD COLUMN audio_sfx_cues JSONB;
    COMMENT ON COLUMN stories.audio_sfx_cues IS 'Array of SFX cues {start, prompt, duration} for Pro users. Used for synchronized playback.';
    RAISE NOTICE 'Added audio_sfx_cues column';
  ELSE
    RAISE NOTICE 'audio_sfx_cues column already exists, skipping';
  END IF;
END $$;

-- ============================================================================
-- ADD SPATIAL AUDIO TRACKS (Future Sonos Integration)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stories' 
    AND column_name = 'spatial_audio_tracks'
  ) THEN
    ALTER TABLE stories ADD COLUMN spatial_audio_tracks JSONB;
    COMMENT ON COLUMN stories.spatial_audio_tracks IS 'Multi-track audio for Sonos: {background_music_url, sfx_left_url, sfx_right_url, slow_narration_url}. Generated now to avoid costly regeneration later.';
    RAISE NOTICE 'Added spatial_audio_tracks column';
  ELSE
    RAISE NOTICE 'spatial_audio_tracks column already exists, skipping';
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

DO $$
BEGIN
  -- Index for audio data queries (only create if doesn't exist)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'stories' 
    AND indexname = 'idx_stories_audio_data'
  ) THEN
    CREATE INDEX idx_stories_audio_data ON stories(id) 
    WHERE audio_words IS NOT NULL;
    RAISE NOTICE 'Created index idx_stories_audio_data';
  ELSE
    RAISE NOTICE 'Index idx_stories_audio_data already exists, skipping';
  END IF;
  
  -- GIN index for JSONB queries (audio_words, audio_blocks, audio_sfx_cues, spatial_audio_tracks)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'stories' 
    AND indexname = 'idx_stories_audio_jsonb'
  ) THEN
    CREATE INDEX idx_stories_audio_jsonb ON stories USING gin(audio_words, audio_blocks, audio_sfx_cues, spatial_audio_tracks);
    RAISE NOTICE 'Created GIN index idx_stories_audio_jsonb';
  ELSE
    RAISE NOTICE 'Index idx_stories_audio_jsonb already exists, skipping';
  END IF;
END $$;

