-- Transfer Magic Links Migration
-- Allows non-users to accept story transfers via magic links

CREATE TABLE IF NOT EXISTS pending_transfer_magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID REFERENCES story_transfers(id) ON DELETE CASCADE NOT NULL,
  recipient_email TEXT NOT NULL,
  magic_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON pending_transfer_magic_links(magic_token) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_magic_links_transfer ON pending_transfer_magic_links(transfer_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON pending_transfer_magic_links(recipient_email);

-- Enable RLS
ALTER TABLE pending_transfer_magic_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy: System can read/write (via service role)
DROP POLICY IF EXISTS magic_links_system_access ON pending_transfer_magic_links;
CREATE POLICY magic_links_system_access ON pending_transfer_magic_links
  FOR ALL USING (true) WITH CHECK (true);

-- Function to generate magic token
CREATE OR REPLACE FUNCTION generate_transfer_magic_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  token_exists BOOLEAN := TRUE;
BEGIN
  WHILE token_exists LOOP
    -- Generate 32-character hex token
    token := encode(gen_random_bytes(16), 'hex');
    
    -- Check if token exists
    SELECT EXISTS(SELECT 1 FROM pending_transfer_magic_links WHERE magic_token = token) INTO token_exists;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to accept transfer via magic link
CREATE OR REPLACE FUNCTION accept_transfer_via_magic_link(
  p_token TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  link_record RECORD;
  transfer_record RECORD;
  result JSONB;
BEGIN
  -- Find the magic link
  SELECT * INTO link_record
  FROM pending_transfer_magic_links
  WHERE magic_token = p_token
    AND used_at IS NULL
    AND expires_at > NOW();
  
  IF link_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired magic link'
    );
  END IF;
  
  -- Get transfer details
  SELECT * INTO transfer_record
  FROM story_transfers
  WHERE id = link_record.transfer_id
    AND status = 'pending';
  
  IF transfer_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transfer not found or already processed'
    );
  END IF;
  
  -- Update transfer to point to new user
  UPDATE story_transfers
  SET to_user_id = p_user_id,
      status = 'accepted',
      responded_at = NOW()
  WHERE id = link_record.transfer_id;
  
  -- Mark magic link as used
  UPDATE pending_transfer_magic_links
  SET used_at = NOW()
  WHERE id = link_record.id;
  
  -- Perform the transfer
  IF transfer_record.transfer_type = 'move' THEN
    UPDATE stories
    SET library_id = transfer_record.to_library_id
    WHERE id = transfer_record.story_id;
  ELSE
    -- Copy: duplicate the story
    INSERT INTO stories (
      library_id,
      creator_user_id,
      title,
      content,
      status,
      age_rating
    )
    SELECT 
      transfer_record.to_library_id,
      transfer_record.from_user_id,  -- Keep original creator
      title,
      content,
      status,
      age_rating
    FROM stories
    WHERE id = transfer_record.story_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'transferId', link_record.transfer_id,
    'storyId', transfer_record.story_id,
    'transferType', transfer_record.transfer_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

