-- Character Reference Images Migration
-- Adds support for reference images, color palettes, and expressions
-- for AI-generated character consistency and inclusivity trait validation

-- Add reference image fields to characters table
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS reference_images JSONB DEFAULT '[]'::jsonb;

-- Add reference image fields to user_characters table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_characters') THEN
    ALTER TABLE user_characters
    ADD COLUMN IF NOT EXISTS reference_images JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS bodyshot_url TEXT,
    ADD COLUMN IF NOT EXISTS bodyshot_prompt TEXT,
    ADD COLUMN IF NOT EXISTS color_palette JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS expressions JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add indexes for querying
CREATE INDEX IF NOT EXISTS idx_characters_reference_images 
ON characters USING GIN (reference_images);

-- Add index for user_characters if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_characters') THEN
    CREATE INDEX IF NOT EXISTS idx_user_characters_reference_images 
    ON user_characters USING GIN (reference_images);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN characters.reference_images IS 
'Array of reference image objects for visual consistency across story illustrations:
[{
  "type": "headshot" | "bodyshot",
  "url": "https://...",
  "prompt": "Full prompt used to generate image",
  "traitsValidated": true/false,
  "createdAt": "ISO8601 timestamp"
}]

The traitsValidated flag indicates whether vision model confirmed that all inclusivity traits are visible in the image. This combats AI bias toward "perfect" features.';

-- Add comment for user_characters color_palette if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_characters') THEN
    EXECUTE 'COMMENT ON COLUMN user_characters.color_palette IS ''Hex color palette for character visual consistency: {"skin": "#D2A679", "hair": "#4B3621", "eyes": "#50C878", "clothing": ["#..."], "accessories": ["#..."]}''';
    
    EXECUTE 'COMMENT ON COLUMN user_characters.expressions IS ''Signature expressions array: [{"emotion": "joyful", "description": "Eyes sparkle, wide smile, cheeks lifted"}, ...]''';
  END IF;
END $$;

-- Migration complete
