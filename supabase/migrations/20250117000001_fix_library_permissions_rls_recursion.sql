-- Fix infinite recursion in library_permissions RLS policy
-- The original policy checked library_permissions recursively, causing infinite recursion
-- New policy: Users can see permissions for libraries they own OR their own permission entries

-- Drop the problematic policy
DROP POLICY IF EXISTS library_permissions_policy ON library_permissions;

-- Create a simpler policy that avoids recursion
-- Users can see:
-- 1. Their own permission entries (user_id = auth.uid())
-- 2. All permissions for libraries they own (l.owner = auth.uid())
-- This avoids recursion by checking library ownership directly, not through permissions
CREATE POLICY library_permissions_policy ON library_permissions
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM libraries l
      WHERE l.id = library_id AND l.owner = auth.uid()
    )
  );

-- Also fix the story_access policy to avoid potential recursion issues
-- Stories should be accessible if user owns the library OR has a permission entry
DROP POLICY IF EXISTS story_access ON stories;

CREATE POLICY story_access ON stories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM libraries l
      WHERE l.id = library_id AND (
        l.owner = auth.uid() OR
        EXISTS (
          SELECT 1 FROM library_permissions lp
          WHERE lp.library_id = l.id AND lp.user_id = auth.uid()
        )
      )
    )
  );

-- Fix character_access policy similarly
DROP POLICY IF EXISTS character_access ON characters;

CREATE POLICY character_access ON characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stories s
      JOIN libraries l ON s.library_id = l.id
      WHERE s.id = story_id AND (
        l.owner = auth.uid() OR
        EXISTS (
          SELECT 1 FROM library_permissions lp
          WHERE lp.library_id = l.id AND lp.user_id = auth.uid()
        )
      )
    )
  );

-- Fix media_asset_access policy similarly
DROP POLICY IF EXISTS media_asset_access ON media_assets;

CREATE POLICY media_asset_access ON media_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stories s
      JOIN libraries l ON s.library_id = l.id
      WHERE s.id = story_id AND (
        l.owner = auth.uid() OR
        EXISTS (
          SELECT 1 FROM library_permissions lp
          WHERE lp.library_id = l.id AND lp.user_id = auth.uid()
        )
      )
    )
  );

-- Add a function to automatically create Owner permission when library is created
-- This ensures library owners always have proper permissions
CREATE OR REPLACE FUNCTION create_library_owner_permission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO library_permissions (library_id, user_id, role, granted_by, created_at)
  VALUES (NEW.id, NEW.owner, 'Owner', NEW.owner, NOW())
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create owner permission
DROP TRIGGER IF EXISTS auto_create_library_owner_permission ON libraries;
CREATE TRIGGER auto_create_library_owner_permission
  AFTER INSERT ON libraries
  FOR EACH ROW
  EXECUTE FUNCTION create_library_owner_permission();

-- Grant necessary permissions for service role to bypass RLS when needed
-- This allows Lambda functions using service role key to insert stories
-- Note: Service role key already bypasses RLS, but this ensures functions work correctly

-- CRITICAL: Add service role policy to libraries table to allow service role inserts
-- This ensures Lambda functions can create libraries even with RLS enabled
DROP POLICY IF EXISTS libraries_service_role_policy ON libraries;
CREATE POLICY libraries_service_role_policy ON libraries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- CRITICAL: Add service role policy to stories table to allow service role inserts
DROP POLICY IF EXISTS stories_service_role_policy ON stories;
CREATE POLICY stories_service_role_policy ON stories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- CRITICAL: Add service role policy to library_permissions to allow service role inserts
DROP POLICY IF EXISTS library_permissions_service_role_policy ON library_permissions;
CREATE POLICY library_permissions_service_role_policy ON library_permissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
