-- Sonos Integration Database Schema
-- Premium spatial audio orchestration for immersive storytelling experiences
-- 
-- This migration adds tables for Sonos speaker management, token storage,
-- and speaker group coordination for three-stream audio orchestration
-- (narration, sound effects, music/ambiance)

-- Sonos devices table
-- Stores discovered Sonos speakers with location and role information
CREATE TABLE sonos_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  device_id TEXT NOT NULL, -- Sonos device ID
  name TEXT NOT NULL,
  room_id TEXT NOT NULL,
  room_name TEXT,
  household_id TEXT NOT NULL, -- Sonos household ID
  capabilities JSONB DEFAULT '{}', -- Volume, stereo, grouping capabilities
  location TEXT, -- 'left', 'right', 'center', 'back_left', 'back_right', 'front_left', 'front_right'
  role TEXT, -- 'main', 'spatial', 'ambiance'
  connection_status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
  consent_given BOOLEAN DEFAULT FALSE,
  parent_consent BOOLEAN DEFAULT FALSE,
  consent_scope JSONB DEFAULT '{}',
  data_retention_preference TEXT DEFAULT 'minimal',
  device_metadata JSONB DEFAULT '{}', -- Encrypted device-specific data
  connected_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') -- Auto-cleanup inactive devices
);

-- Indexes for sonos_devices
CREATE INDEX idx_sonos_devices_user_id ON sonos_devices(user_id);
CREATE INDEX idx_sonos_devices_household_id ON sonos_devices(household_id);
CREATE INDEX idx_sonos_devices_room_id ON sonos_devices(room_id);
CREATE INDEX idx_sonos_devices_connection_status ON sonos_devices(connection_status);

-- Sonos tokens table
-- Stores encrypted OAuth tokens for Sonos Control API access
CREATE TABLE sonos_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  household_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted access token
  refresh_token_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted refresh token
  expires_at TIMESTAMPTZ NOT NULL,
  last_refresh TIMESTAMPTZ,
  refresh_attempts INTEGER DEFAULT 0,
  token_status TEXT DEFAULT 'active', -- 'active', 'expired', 'revoked'
  encryption_key_id TEXT NOT NULL, -- For key rotation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sonos_tokens
CREATE INDEX idx_sonos_tokens_user_id ON sonos_tokens(user_id);
CREATE INDEX idx_sonos_tokens_household_id ON sonos_tokens(household_id);
CREATE INDEX idx_sonos_tokens_status ON sonos_tokens(token_status);
CREATE INDEX idx_sonos_tokens_expires_at ON sonos_tokens(expires_at);

-- Sonos groups table
-- Stores Sonos speaker groups for coordinated spatial audio playback
CREATE TABLE sonos_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  group_id TEXT NOT NULL, -- Sonos group ID
  name TEXT NOT NULL,
  room_id TEXT NOT NULL,
  household_id TEXT NOT NULL,
  speaker_ids TEXT[] NOT NULL, -- Array of device IDs in group
  group_type TEXT, -- 'main', 'spatial', 'ambiance'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- Indexes for sonos_groups
CREATE INDEX idx_sonos_groups_user_id ON sonos_groups(user_id);
CREATE INDEX idx_sonos_groups_household_id ON sonos_groups(household_id);
CREATE INDEX idx_sonos_groups_room_id ON sonos_groups(room_id);
CREATE INDEX idx_sonos_groups_type ON sonos_groups(group_type);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE sonos_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sonos_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sonos_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own Sonos devices
CREATE POLICY sonos_devices_user_isolation ON sonos_devices
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only access their own Sonos tokens
CREATE POLICY sonos_tokens_user_isolation ON sonos_tokens
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only access their own Sonos groups
CREATE POLICY sonos_groups_user_isolation ON sonos_groups
  FOR ALL
  USING (auth.uid() = user_id);

-- Service role can access all (for background jobs)
CREATE POLICY sonos_devices_service_access ON sonos_devices
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY sonos_tokens_service_access ON sonos_tokens
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY sonos_groups_service_access ON sonos_groups
  FOR ALL
  TO service_role
  USING (true);

-- Comments for documentation
COMMENT ON TABLE sonos_devices IS 'Stores discovered Sonos speakers with location and role for spatial audio orchestration';
COMMENT ON TABLE sonos_tokens IS 'Stores encrypted OAuth tokens for Sonos Control API access';
COMMENT ON TABLE sonos_groups IS 'Stores Sonos speaker groups for coordinated spatial audio playback';

COMMENT ON COLUMN sonos_devices.role IS 'Speaker role: main (narration), spatial (sound effects), ambiance (background music)';
COMMENT ON COLUMN sonos_devices.location IS 'Physical location in room: left, right, center, back_left, back_right, front_left, front_right';
COMMENT ON COLUMN sonos_groups.group_type IS 'Group type: main (narration), spatial (sound effects), ambiance (background music)';
