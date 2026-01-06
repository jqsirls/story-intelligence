-- Migration: Complete HUE System (V2 Compatibility + V3 Enhancements)
-- Version: V3 Audio & UX Superiority
-- Purpose: Implement two-tier HUE architecture from V2 (story types + extracted colors)
-- Reference: .cursor/plans/v3_audio_&_ux_superiority_b6cf5777.plan.md Phase 1.2
-- Source: airtable/Story Types-Grid view.csv (14 story types with 15 HUE fields each)

-- ============================================================================
-- PART 1: CREATE story_types TABLE WITH V2 HUE CONFIGURATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'story_types'
  ) THEN
    CREATE TABLE story_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type_id TEXT UNIQUE NOT NULL,        -- V2 Airtable ID (e.g., 'recrt7JbFltfYdE6o')
      type_name TEXT UNIQUE NOT NULL,      -- Human-readable name (e.g., 'Mental Health')
      type_description TEXT,
      
      -- ============================================================
      -- V2 HUE CONFIGURATION (15 fields from Airtable)
      -- ============================================================
      hue_base_hex TEXT DEFAULT '#1e90ff',
      hue_base_bri INTEGER DEFAULT 180 CHECK (hue_base_bri BETWEEN 0 AND 254),
      hue_style TEXT CHECK (hue_style IN ('calm', 'pulse', 'bold')) DEFAULT 'pulse',
      hue_jolt_pct NUMERIC DEFAULT 1.15 CHECK (hue_jolt_pct BETWEEN 1.0 AND 2.0),
      hue_jolt_ms INTEGER DEFAULT 500,
      hue_tt_in INTEGER DEFAULT 36,
      hue_tt_scene INTEGER DEFAULT 90,
      hue_rotate_every_ms INTEGER DEFAULT 4000,
      hue_per_bulb_ms INTEGER DEFAULT 100,
      hue_breathe_pct NUMERIC DEFAULT 0.15,
      hue_breathe_period_ms INTEGER DEFAULT 8000,
      hue_motion TEXT DEFAULT 'balanced',
      hue_pause_style TEXT DEFAULT 'sway',
      hue_tempo_ms INTEGER DEFAULT 3200,
      hue_lead_ms INTEGER DEFAULT 300,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Populate with all 14 V2 story types (from Airtable)
    -- CRITICAL: Use ON CONFLICT for idempotency (safe to re-run)
    INSERT INTO story_types (type_id, type_name, type_description, hue_base_hex, hue_base_bri, hue_style, hue_jolt_pct, hue_jolt_ms, hue_tt_in, hue_tt_scene, hue_rotate_every_ms, hue_per_bulb_ms, hue_breathe_pct, hue_breathe_period_ms, hue_motion, hue_pause_style, hue_tempo_ms, hue_lead_ms) VALUES
    ('recrt7JbFltfYdE6o', 'Mental Health', 'Help your child articulate and handle big emotions.', '#3db8c8', 120, 'calm', 1.05, 900, 60, 160, 0, 0, 0.12, 10000, 'balanced', 'sway', 3200, 300),
    ('recPM2SmNrgtJhcjv', 'Child-Loss', 'Support parents and caregivers processing the grief of losing a child through guided storytelling and memory connection.', '#ff90c2', 60, 'calm', 1.05, 900, 60, 160, 0, 0, 0.12, 10000, 'balanced', 'sway', 3200, 300),
    ('recM9mIckUbei4KFc', 'Inner-Child', 'Reconnect with your own childhood experiences and emotions through reflective and healing narratives.', '#eea00ff', 200, 'calm', 1.05, 900, 60, 160, 0, 0, 0.12, 10000, 'balanced', 'sway', 3200, 300),
    ('recDgWoAWHODydHFv', 'New Birth', 'Celebrate the arrival of a new baby with stories that mark the beginning of a new family chapter.', '#90e0ff', 120, 'calm', 1.05, 900, 60, 160, 0, 0, 0.12, 10000, 'balanced', 'sway', 3200, 300),
    ('recrW41nQHLqNNKKS', 'Educational', 'Make learning fun with stories that support curriculum.', '#1e90ff', 180, 'pulse', 1.15, 500, 36, 90, 4000, 100, 0.15, 8000, 'balanced', 'sway', 3200, 300),
    ('rec29TBjHAZctU7a6', 'Milestones', 'Celebrate and support important firsts—like losing a tooth, first day of school, or using the potty.', '#00c78c', 180, 'pulse', 1.15, 500, 36, 90, 4000, 100, 0.15, 8000, 'balanced', 'sway', 3200, 300),
    ('recGncXlegmqxlAo3', 'Language Learning', 'Create a story that subtly introduces a new language.', '#ffd700', 200, 'pulse', 1.15, 500, 36, 90, 4000, 100, 0.15, 8000, 'balanced', 'sway', 3200, 300),
    ('recRwB5xOtn8Pa3N3', 'Financial Literacy', 'Simplify the basics of money management and saving through child-friendly stories.', '#4bb543', 180, 'pulse', 1.15, 500, 36, 90, 4000, 100, 0.15, 8000, 'balanced', 'sway', 3200, 300),
    ('recod6oyhu63fvtaZ', 'Music', 'Introduce musical concepts and appreciation through stories that incorporate songs and rhythms.', '#8a2be2', 200, 'pulse', 1.15, 500, 36, 90, 4000, 100, 0.15, 8000, 'balanced', 'sway', 3200, 300),
    ('recIgrQaTZVrT59un', 'Bedtime', 'Ease into sleep with soothing stories for sweet dreams.', '#6d5cff', 60, 'bold', 1.25, 600, 28, 110, 3500, 120, 0.15, 8000, 'balanced', 'sway', 3200, 300),
    ('rectYq4a4Rf2IwE8F', 'Adventure', 'Ignite curiosity with tales full of discovery and wonder.', '#ff8a00', 254, 'bold', 1.25, 600, 28, 110, 3500, 120, 0.15, 8000, 'balanced', 'sway', 3200, 300),
    ('recNXUPrqGueN344O', 'Medical Bravery', 'Turn medical challenges into brave adventures for resilience.', '#ff3e41', 220, 'bold', 1.25, 600, 28, 110, 3500, 120, 0.15, 8000, 'balanced', 'sway', 3200, 300),
    ('recslrlxmnD4RuR6k', 'Birthday', 'Celebrate another year with the gift of a story.', '#ff69b4', 220, 'bold', 1.25, 600, 28, 110, 3500, 120, 0.15, 8000, 'balanced', 'sway', 3200, 300),
    ('recsEVQnsX2RiWMa2', 'Tech Readiness', 'Introduce digital habits, online safety, and healthy screen use through age-appropriate storytelling.', '#14e1ff', 254, 'bold', 1.25, 600, 28, 110, 3500, 120, 0.15, 8000, 'balanced', 'sway', 3200, 300)
    ON CONFLICT (type_id) DO NOTHING;  -- ← CRITICAL: Prevents duplicate key error on re-run
    
    -- Create index on type_name for lookups
    CREATE INDEX IF NOT EXISTS idx_story_types_name ON story_types(type_name);
    
    RAISE NOTICE 'Created story_types table with 14 V2 story types (or already exists)';
  ELSE
    RAISE NOTICE 'story_types table already exists, skipping';
  END IF;
END $$;

-- ============================================================================
-- PART 2: ADD story_type REFERENCE TO stories TABLE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stories' 
    AND column_name = 'story_type_id'
  ) THEN
    -- Add column (nullable - stories may not have a type assigned yet)
    ALTER TABLE stories ADD COLUMN story_type_id UUID;
    
    -- Add FK constraint (only if story_types table exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'story_types'
    ) THEN
      ALTER TABLE stories ADD CONSTRAINT stories_story_type_id_fkey 
        FOREIGN KEY (story_type_id) REFERENCES story_types(id) ON DELETE SET NULL;
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_stories_story_type_id ON stories(story_type_id);
    RAISE NOTICE 'Added story_type_id column to stories';
  ELSE
    RAISE NOTICE 'story_type_id column already exists, skipping';
  END IF;
END $$;

-- ============================================================================
-- PART 3: ADD PER-STORY EXTRACTED HUE COLORS (15 hex codes)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stories' 
    AND column_name = 'hue_extracted_colors'
  ) THEN
    ALTER TABLE stories ADD COLUMN hue_extracted_colors JSONB DEFAULT '{}';
    COMMENT ON COLUMN stories.hue_extracted_colors IS 'Extracted HUE colors (15 hex codes): coverHex1-3, sceneAHex1-3, sceneBHex1-3, sceneCHex1-3, sceneDHex1-3. These override story type base colors with story-specific palettes.';
    CREATE INDEX IF NOT EXISTS idx_stories_hue_colors ON stories USING gin(hue_extracted_colors);
    RAISE NOTICE 'Added hue_extracted_colors column';
  ELSE
    RAISE NOTICE 'hue_extracted_colors column already exists, skipping';
  END IF;
END $$;

-- ============================================================================
-- PART 4: ADD CHARACTER COLOR PALETTE (for consistency tracking)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'characters' 
    AND column_name = 'color_palette'
  ) THEN
    ALTER TABLE characters ADD COLUMN color_palette JSONB DEFAULT '[]';
    COMMENT ON COLUMN characters.color_palette IS 'Character signature colors (3 hex codes) for HUE consistency across stories. Extracted from character headshot during creation.';
    RAISE NOTICE 'Added color_palette column to characters';
  ELSE
    RAISE NOTICE 'characters.color_palette already exists, skipping';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE story_types IS 'V2 story type configuration with 15 HUE fields per type. Defines base animation style, timing, and default colors for each story category.';
COMMENT ON COLUMN story_types.type_id IS 'V2 Airtable record ID (e.g., recrt7JbFltfYdE6o) - preserved for compatibility';
COMMENT ON COLUMN story_types.hue_base_hex IS 'Base color hex code for this story type (e.g., #3db8c8 for Mental Health)';
COMMENT ON COLUMN story_types.hue_base_bri IS 'Base brightness (0-254) for this story type';
COMMENT ON COLUMN story_types.hue_style IS 'Animation style: calm (soothing), pulse (engaging), bold (energetic)';

-- ============================================================================
-- EXPECTED JSON STRUCTURES
-- ============================================================================

-- stories.hue_extracted_colors:
-- {
--   "coverHex1": "#1A2B3C",
--   "coverHex2": "#4D5E6F",
--   "coverHex3": "#7890AB",
--   "sceneAHex1": "#...",
--   "sceneAHex2": "#...",
--   "sceneAHex3": "#...",
--   "sceneBHex1": "#...",
--   "sceneBHex2": "#...",
--   "sceneBHex3": "#...",
--   "sceneCHex1": "#...",
--   "sceneCHex2": "#...",
--   "sceneCHex3": "#...",
--   "sceneDHex1": "#...",
--   "sceneDHex2": "#...",
--   "sceneDHex3": "#..."
-- }

-- characters.color_palette:
-- ["#1A2B3C", "#4D5E6F", "#7890AB"]

