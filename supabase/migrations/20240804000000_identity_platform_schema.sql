-- Identity Platform Schema Extensions for OAuth/OIDC Support
-- This migration adds comprehensive OAuth 2.0 and OpenID Connect support

-- OAuth Clients Table (for registered applications)
CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(255) UNIQUE NOT NULL,
    client_secret VARCHAR(255), -- null for public clients
    client_name VARCHAR(255) NOT NULL,
    client_type VARCHAR(50) NOT NULL CHECK (client_type IN ('confidential', 'public')),
    
    -- OAuth Configuration
    redirect_uris TEXT[] NOT NULL,
    allowed_grant_types TEXT[] NOT NULL DEFAULT ARRAY['authorization_code'],
    allowed_response_types TEXT[] NOT NULL DEFAULT ARRAY['code'],
    allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY['openid', 'profile', 'email'],
    
    -- PKCE Settings
    require_pkce BOOLEAN DEFAULT true,
    allowed_code_challenge_methods TEXT[] DEFAULT ARRAY['S256'],
    
    -- Token Configuration
    access_token_ttl INTEGER DEFAULT 3600, -- 1 hour
    refresh_token_ttl INTEGER DEFAULT 2592000, -- 30 days
    id_token_ttl INTEGER DEFAULT 3600, -- 1 hour
    
    -- Client Metadata
    logo_uri VARCHAR(500),
    policy_uri VARCHAR(500),
    tos_uri VARCHAR(500),
    contacts TEXT[],
    
    -- Security Settings
    token_endpoint_auth_method VARCHAR(50) DEFAULT 'client_secret_basic',
    jwks_uri VARCHAR(500), -- for private_key_jwt auth
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    
    -- Additional OIDC fields
    application_type VARCHAR(50) DEFAULT 'web',
    sector_identifier_uri VARCHAR(500),
    subject_type VARCHAR(50) DEFAULT 'public',
    id_token_signed_response_alg VARCHAR(50) DEFAULT 'RS256',
    userinfo_signed_response_alg VARCHAR(50),
    
    -- Kid-safe specific settings
    requires_parental_consent BOOLEAN DEFAULT true,
    age_gate_enabled BOOLEAN DEFAULT true,
    min_age_requirement INTEGER DEFAULT 13
);

-- Authorization Codes Table
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- OAuth Parameters
    redirect_uri VARCHAR(500) NOT NULL,
    scope TEXT NOT NULL,
    state TEXT,
    nonce TEXT, -- for OIDC
    
    -- PKCE Parameters
    code_challenge TEXT,
    code_challenge_method VARCHAR(50),
    
    -- Session Binding
    session_id UUID,
    auth_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens Table
CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(255) UNIQUE NOT NULL, -- Store hash of token
    client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Token Metadata
    scope TEXT NOT NULL,
    
    -- Token Rotation
    previous_token_hash VARCHAR(255),
    rotation_count INTEGER DEFAULT 0,
    
    -- Expiration and Usage
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES auth.users(id),
    revocation_reason VARCHAR(255),
    
    -- Device/Session Binding
    device_id VARCHAR(255),
    session_id UUID,
    
    -- Security Context
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Access Tokens Table (for token introspection and revocation)
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Token Claims
    scope TEXT NOT NULL,
    audience TEXT[],
    
    -- Token Metadata
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Relationship to Refresh Token
    refresh_token_id UUID REFERENCES oauth_refresh_tokens(id) ON DELETE CASCADE,
    
    -- Revocation
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES auth.users(id),
    
    -- Usage Tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    use_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Consent Records Table
CREATE TABLE IF NOT EXISTS oauth_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    
    -- Consent Details
    granted_scopes TEXT[] NOT NULL,
    denied_scopes TEXT[],
    
    -- Parental Consent (for COPPA)
    requires_parental_consent BOOLEAN DEFAULT false,
    parent_user_id UUID REFERENCES auth.users(id),
    parent_consent_method VARCHAR(100), -- email, credit_card, id_verification
    parent_consent_timestamp TIMESTAMP WITH TIME ZONE,
    parent_consent_ip INET,
    
    -- Consent Metadata
    consent_given_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    consent_expires_at TIMESTAMP WITH TIME ZONE,
    consent_revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, client_id)
);

-- ID Token Claims Table (for custom claims)
CREATE TABLE IF NOT EXISTS oauth_id_token_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Standard OIDC Claims
    preferred_username VARCHAR(255),
    profile_url VARCHAR(500),
    picture_url VARCHAR(500),
    website VARCHAR(500),
    email_verified BOOLEAN DEFAULT false,
    gender VARCHAR(50),
    birthdate DATE,
    zoneinfo VARCHAR(100),
    locale VARCHAR(50),
    phone_number VARCHAR(50),
    phone_number_verified BOOLEAN DEFAULT false,
    
    -- Address Claim
    address_formatted TEXT,
    address_street TEXT,
    address_locality VARCHAR(255),
    address_region VARCHAR(255),
    address_postal_code VARCHAR(50),
    address_country VARCHAR(100),
    
    -- Custom Claims for Storytailor
    character_ids UUID[],
    family_id UUID,
    subscription_tier VARCHAR(50),
    content_preferences JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- JWKS (JSON Web Key Set) Table for key rotation
CREATE TABLE IF NOT EXISTS oauth_jwks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid VARCHAR(255) UNIQUE NOT NULL, -- Key ID
    kty VARCHAR(50) NOT NULL, -- Key Type (RSA, EC)
    use VARCHAR(50) NOT NULL, -- sig or enc
    alg VARCHAR(50) NOT NULL, -- Algorithm (RS256, ES256, etc)
    
    -- Key Material (stored encrypted)
    public_key TEXT NOT NULL,
    private_key_encrypted TEXT NOT NULL,
    
    -- Key Lifecycle
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason VARCHAR(255),
    
    -- Key Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rotated_from_kid VARCHAR(255) -- Reference to previous key
);

-- OAuth Events Table (for audit and security monitoring)
CREATE TABLE IF NOT EXISTS oauth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    client_id VARCHAR(255) REFERENCES oauth_clients(client_id),
    user_id UUID REFERENCES auth.users(id),
    
    -- Event Details
    event_data JSONB,
    success BOOLEAN NOT NULL,
    error_code VARCHAR(100),
    error_description TEXT,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_oauth_authorization_codes_expires_at ON oauth_authorization_codes(expires_at);
CREATE INDEX idx_oauth_authorization_codes_client_user ON oauth_authorization_codes(client_id, user_id);
CREATE INDEX idx_oauth_refresh_tokens_expires_at ON oauth_refresh_tokens(expires_at);
CREATE INDEX idx_oauth_refresh_tokens_client_user ON oauth_refresh_tokens(client_id, user_id);
CREATE INDEX idx_oauth_access_tokens_expires_at ON oauth_access_tokens(expires_at);
CREATE INDEX idx_oauth_access_tokens_token_hash ON oauth_access_tokens(token_hash);
CREATE INDEX idx_oauth_consent_records_user_client ON oauth_consent_records(user_id, client_id);
CREATE INDEX idx_oauth_events_created_at ON oauth_events(created_at DESC);
CREATE INDEX idx_oauth_events_user_id ON oauth_events(user_id);
CREATE INDEX idx_oauth_events_client_id ON oauth_events(client_id);

-- Row Level Security
ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_id_token_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_jwks ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- OAuth Clients: Public read, admin write
CREATE POLICY "OAuth clients are publicly readable" ON oauth_clients
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage OAuth clients" ON oauth_clients
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Authorization codes: Only accessible by owner
CREATE POLICY "Users can only access their own auth codes" ON oauth_authorization_codes
    FOR ALL USING (auth.uid() = user_id);

-- Refresh tokens: Only accessible by owner
CREATE POLICY "Users can only access their own refresh tokens" ON oauth_refresh_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Access tokens: Only accessible by owner
CREATE POLICY "Users can only access their own access tokens" ON oauth_access_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Consent records: Users can view and manage their own
CREATE POLICY "Users can manage their own consent" ON oauth_consent_records
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = parent_user_id);

-- ID token claims: Users can manage their own
CREATE POLICY "Users can manage their own claims" ON oauth_id_token_claims
    FOR ALL USING (auth.uid() = user_id);

-- JWKS: Public read for active keys
CREATE POLICY "Active JWKS are publicly readable" ON oauth_jwks
    FOR SELECT USING (is_active = true AND revoked_at IS NULL);

CREATE POLICY "Only system can manage JWKS" ON oauth_jwks
    FOR ALL USING (auth.jwt() ->> 'role' = 'system');

-- OAuth events: Users can view their own, admins can view all
CREATE POLICY "Users can view their own OAuth events" ON oauth_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all OAuth events" ON oauth_events
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Functions

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_tokens()
RETURNS void AS $$
BEGIN
    -- Delete expired authorization codes
    DELETE FROM oauth_authorization_codes 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Delete expired access tokens
    DELETE FROM oauth_access_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP AND revoked_at IS NULL;
    
    -- Delete expired refresh tokens
    DELETE FROM oauth_refresh_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP AND revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke all tokens for a user
CREATE OR REPLACE FUNCTION revoke_all_user_tokens(p_user_id UUID, p_reason VARCHAR DEFAULT 'user_requested')
RETURNS void AS $$
BEGIN
    -- Revoke all refresh tokens
    UPDATE oauth_refresh_tokens 
    SET revoked_at = CURRENT_TIMESTAMP,
        revocation_reason = p_reason
    WHERE user_id = p_user_id 
    AND revoked_at IS NULL;
    
    -- Revoke all access tokens
    UPDATE oauth_access_tokens 
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id 
    AND revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_oauth_clients_updated_at BEFORE UPDATE ON oauth_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_consent_records_updated_at BEFORE UPDATE ON oauth_consent_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_id_token_claims_updated_at BEFORE UPDATE ON oauth_id_token_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();