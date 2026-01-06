-- Migration: Library Consent Tracking
-- Creates library_consent table for parental consent workflow
-- Tracks consent requests, verification, and revocation for child Storytailor IDs
-- Date: 2025-12-26

-- Step 1: Create library_consent table
CREATE TABLE IF NOT EXISTS library_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID REFERENCES libraries(id) NOT NULL,
  adult_user_id UUID REFERENCES users(id) NOT NULL,
  consent_status TEXT NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending', 'verified', 'revoked')),
  consent_method TEXT NOT NULL CHECK (consent_method IN ('email', 'sms', 'video_call', 'id_verification', 'voice', 'app')),
  verification_token TEXT NOT NULL,
  consent_scope JSONB NOT NULL DEFAULT '{}', -- What permissions are being requested
  consent_record_id TEXT NOT NULL UNIQUE, -- External audit record ID
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_library_consent_library_id 
  ON library_consent(library_id);

CREATE INDEX IF NOT EXISTS idx_library_consent_adult_user_id 
  ON library_consent(adult_user_id);

CREATE INDEX IF NOT EXISTS idx_library_consent_status 
  ON library_consent(consent_status);

CREATE INDEX IF NOT EXISTS idx_library_consent_expires_at 
  ON library_consent(expires_at);

CREATE INDEX IF NOT EXISTS idx_library_consent_verification_token 
  ON library_consent(verification_token);

CREATE INDEX IF NOT EXISTS idx_library_consent_consent_record_id 
  ON library_consent(consent_record_id);

CREATE INDEX IF NOT EXISTS idx_library_consent_requested_at 
  ON library_consent(requested_at);

-- Step 3: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_library_consent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_library_consent_updated_at
  BEFORE UPDATE ON library_consent
  FOR EACH ROW
  EXECUTE FUNCTION update_library_consent_updated_at();

-- Step 5: Create function to clean up expired consent requests
CREATE OR REPLACE FUNCTION cleanup_expired_library_consent()
RETURNS void AS $$
BEGIN
  DELETE FROM library_consent 
  WHERE expires_at < NOW() 
    AND consent_status = 'pending';
END;
$$ LANGUAGE plpgsql;

