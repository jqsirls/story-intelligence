-- Webhook registrations table for platform integrations
CREATE TABLE webhook_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL, -- 'alexa_plus', 'google_assistant', 'apple_siri', etc.
  config JSONB NOT NULL, -- Webhook configuration
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  verification_token TEXT,
  last_delivery_timestamp TIMESTAMPTZ,
  last_delivery_status TEXT CHECK (last_delivery_status IN ('success', 'failed')),
  last_delivery_response_code INTEGER,
  last_delivery_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform integration events table
CREATE TABLE platform_integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'skill_enabled', 'account_linked', etc.
  user_id UUID REFERENCES users,
  session_id TEXT,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  processing_status TEXT DEFAULT 'processed' CHECK (processing_status IN ('processed', 'failed', 'ignored')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Universal platform configurations table
CREATE TABLE universal_platform_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  capabilities TEXT[] DEFAULT '{}',
  request_format TEXT DEFAULT 'json' CHECK (request_format IN ('json', 'xml', 'form_data', 'custom')),
  response_format TEXT DEFAULT 'json' CHECK (response_format IN ('json', 'xml', 'custom')),
  authentication_config JSONB NOT NULL,
  endpoints JSONB NOT NULL,
  request_mapping JSONB NOT NULL,
  response_mapping JSONB NOT NULL,
  smart_home_mapping JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform embedding configurations table
CREATE TABLE platform_embedding_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  skill_id TEXT,
  action_id TEXT,
  shortcut_id TEXT,
  invocation_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  privacy_policy_url TEXT NOT NULL,
  terms_of_use_url TEXT NOT NULL,
  supported_locales TEXT[] DEFAULT '{"en-US"}',
  target_audience TEXT DEFAULT 'family' CHECK (target_audience IN ('children', 'adults', 'family')),
  content_rating TEXT DEFAULT 'everyone' CHECK (content_rating IN ('everyone', 'teen', 'mature')),
  permissions JSONB DEFAULT '[]',
  smart_home_integration JSONB,
  embedding_code TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_webhook_registrations_platform ON webhook_registrations(platform);
CREATE INDEX idx_webhook_registrations_status ON webhook_registrations(status);
CREATE INDEX idx_platform_integration_events_platform ON platform_integration_events(platform);
CREATE INDEX idx_platform_integration_events_user_id ON platform_integration_events(user_id);
CREATE INDEX idx_platform_integration_events_event_type ON platform_integration_events(event_type);
CREATE INDEX idx_universal_platform_configs_platform_name ON universal_platform_configs(platform_name);
CREATE INDEX idx_platform_embedding_configs_platform ON platform_embedding_configs(platform);
CREATE INDEX idx_platform_embedding_configs_status ON platform_embedding_configs(status);

-- RLS policies
ALTER TABLE webhook_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE universal_platform_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_embedding_configs ENABLE ROW LEVEL SECURITY;

-- Webhook registrations are system-level, only accessible by service role
CREATE POLICY webhook_registrations_policy ON webhook_registrations
  FOR ALL USING (auth.role() = 'service_role');

-- Platform integration events are accessible by the user they belong to
CREATE POLICY platform_integration_events_policy ON platform_integration_events
  FOR ALL USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

-- Universal platform configs are system-level
CREATE POLICY universal_platform_configs_policy ON universal_platform_configs
  FOR ALL USING (auth.role() = 'service_role');

-- Platform embedding configs are system-level
CREATE POLICY platform_embedding_configs_policy ON platform_embedding_configs
  FOR ALL USING (auth.role() = 'service_role');

-- Functions for webhook management
CREATE OR REPLACE FUNCTION update_webhook_delivery_status(
  webhook_id UUID,
  delivery_status TEXT,
  response_code INTEGER DEFAULT NULL,
  error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE webhook_registrations
  SET 
    last_delivery_timestamp = NOW(),
    last_delivery_status = delivery_status,
    last_delivery_response_code = response_code,
    last_delivery_error = error_message,
    updated_at = NOW()
  WHERE id = webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log platform integration events
CREATE OR REPLACE FUNCTION log_platform_integration_event(
  platform_name TEXT,
  event_type_name TEXT,
  user_id_param UUID DEFAULT NULL,
  session_id_param TEXT DEFAULT NULL,
  payload_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO platform_integration_events (
    platform,
    event_type,
    user_id,
    session_id,
    payload
  ) VALUES (
    platform_name,
    event_type_name,
    user_id_param,
    session_id_param,
    payload_data
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active webhook registrations for a platform
CREATE OR REPLACE FUNCTION get_active_webhooks_for_platform(platform_name TEXT)
RETURNS TABLE (
  id UUID,
  config JSONB,
  verification_token TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wr.id,
    wr.config,
    wr.verification_token,
    wr.created_at
  FROM webhook_registrations wr
  WHERE wr.platform = platform_name
    AND wr.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register a universal platform
CREATE OR REPLACE FUNCTION register_universal_platform(
  platform_name_param TEXT,
  version_param TEXT,
  capabilities_param TEXT[],
  config_data JSONB
)
RETURNS UUID AS $$
DECLARE
  config_id UUID;
BEGIN
  INSERT INTO universal_platform_configs (
    platform_name,
    version,
    capabilities,
    request_format,
    response_format,
    authentication_config,
    endpoints,
    request_mapping,
    response_mapping,
    smart_home_mapping
  ) VALUES (
    platform_name_param,
    version_param,
    capabilities_param,
    COALESCE(config_data->>'request_format', 'json'),
    COALESCE(config_data->>'response_format', 'json'),
    config_data->'authentication',
    config_data->'endpoints',
    config_data->'request_mapping',
    config_data->'response_mapping',
    config_data->'smart_home_mapping'
  ) RETURNING id INTO config_id;
  
  RETURN config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_webhook_registrations_updated_at
  BEFORE UPDATE ON webhook_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_universal_platform_configs_updated_at
  BEFORE UPDATE ON universal_platform_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_embedding_configs_updated_at
  BEFORE UPDATE ON platform_embedding_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();