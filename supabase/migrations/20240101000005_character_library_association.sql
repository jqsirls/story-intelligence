-- Update characters table to associate with libraries instead of stories
-- This allows characters to be reused across multiple stories in the same library

-- First, add library_id column to characters table
ALTER TABLE characters ADD COLUMN library_id UUID REFERENCES libraries;

-- Update existing characters to use the library_id from their associated story
UPDATE characters 
SET library_id = (
  SELECT s.library_id 
  FROM stories s 
  WHERE s.id = characters.story_id
);

-- Make library_id NOT NULL after populating it
ALTER TABLE characters ALTER COLUMN library_id SET NOT NULL;

-- Make story_id optional since characters can exist without being in a story yet
ALTER TABLE characters ALTER COLUMN story_id DROP NOT NULL;

-- Add updated_at column for tracking changes
ALTER TABLE characters ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add art_prompt column for character visualization
ALTER TABLE characters ADD COLUMN art_prompt TEXT;

-- Create index for library_id
CREATE INDEX idx_characters_library_id ON characters(library_id);

-- Update RLS policy for characters to use library permissions
DROP POLICY IF EXISTS characters_policy ON characters;

CREATE POLICY characters_policy ON characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM libraries l
      LEFT JOIN library_permissions lp ON l.id = lp.library_id
      WHERE l.id = library_id AND (
        l.owner = auth.uid() OR 
        lp.user_id = auth.uid()
      )
    )
  );

-- Function to create character with library association
CREATE OR REPLACE FUNCTION create_character_in_library(
  p_library_id UUID,
  p_name TEXT,
  p_traits JSONB,
  p_art_prompt TEXT DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  character_id UUID;
BEGIN
  -- Check if user has permission to create characters in this library
  IF NOT check_library_permission(p_library_id, 'Editor') THEN
    RAISE EXCEPTION 'Insufficient permissions to create character in library';
  END IF;
  
  -- Check COPPA compliance
  IF NOT check_coppa_compliance(auth.uid(), p_library_id) THEN
    RAISE EXCEPTION 'COPPA compliance violation: Parent consent required';
  END IF;
  
  -- Create the character
  INSERT INTO characters (library_id, name, traits, art_prompt)
  VALUES (p_library_id, p_name, p_traits, p_art_prompt)
  RETURNING id INTO character_id;
  
  -- Log the creation
  PERFORM log_audit_event_enhanced(
    'ContentAgent',
    'character_created',
    jsonb_build_object(
      'character_id', character_id,
      'library_id', p_library_id,
      'character_name', p_name
    )
  );
  
  RETURN character_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update character
CREATE OR REPLACE FUNCTION update_character(
  p_character_id UUID,
  p_name TEXT DEFAULT NULL,
  p_traits JSONB DEFAULT NULL,
  p_art_prompt TEXT DEFAULT NULL,
  p_appearance_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $
DECLARE
  lib_id UUID;
BEGIN
  -- Get library_id for permission check
  SELECT library_id INTO lib_id FROM characters WHERE id = p_character_id;
  
  IF lib_id IS NULL THEN
    RAISE EXCEPTION 'Character not found';
  END IF;
  
  -- Check permissions
  IF NOT check_library_permission(lib_id, 'Editor') THEN
    RAISE EXCEPTION 'Insufficient permissions to update character';
  END IF;
  
  -- Update the character
  UPDATE characters 
  SET 
    name = COALESCE(p_name, name),
    traits = COALESCE(p_traits, traits),
    art_prompt = COALESCE(p_art_prompt, art_prompt),
    appearance_url = COALESCE(p_appearance_url, appearance_url),
    updated_at = NOW()
  WHERE id = p_character_id;
  
  -- Log the update
  PERFORM log_audit_event_enhanced(
    'ContentAgent',
    'character_updated',
    jsonb_build_object(
      'character_id', p_character_id,
      'library_id', lib_id
    )
  );
  
  RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete character
CREATE OR REPLACE FUNCTION delete_character(p_character_id UUID)
RETURNS BOOLEAN AS $
DECLARE
  lib_id UUID;
BEGIN
  -- Get library_id for permission check
  SELECT library_id INTO lib_id FROM characters WHERE id = p_character_id;
  
  IF lib_id IS NULL THEN
    RAISE EXCEPTION 'Character not found';
  END IF;
  
  -- Check permissions
  IF NOT check_library_permission(lib_id, 'Editor') THEN
    RAISE EXCEPTION 'Insufficient permissions to delete character';
  END IF;
  
  -- Delete the character
  DELETE FROM characters WHERE id = p_character_id;
  
  -- Log the deletion
  PERFORM log_audit_event_enhanced(
    'ContentAgent',
    'character_deleted',
    jsonb_build_object(
      'character_id', p_character_id,
      'library_id', lib_id
    )
  );
  
  RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get characters in a library
CREATE OR REPLACE FUNCTION get_library_characters(p_library_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  traits JSONB,
  art_prompt TEXT,
  appearance_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $
BEGIN
  -- Check permissions
  IF NOT check_library_permission(p_library_id, 'Viewer') THEN
    RAISE EXCEPTION 'Insufficient permissions to view library characters';
  END IF;
  
  RETURN QUERY
  SELECT c.id, c.name, c.traits, c.art_prompt, c.appearance_url, c.created_at, c.updated_at
  FROM characters c
  WHERE c.library_id = p_library_id
  ORDER BY c.created_at DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_character_in_library(UUID, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_character(UUID, TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_character(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_library_characters(UUID) TO authenticated;