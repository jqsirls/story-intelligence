-- API Keys and Webhooks Management Tables
-- For developer integrations and webhook delivery

-- API Keys table for developer access
-- Handle existing table with different schema
DO $$
BEGIN
  -- Check if api_keys table exists and what columns it has
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'api_keys') THEN
    -- Table exists - add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key_hash') THEN
      ALTER TABLE api_keys ADD COLUMN key_hash TEXT;
      -- Add unique constraint separately if needed
      IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'api_keys_key_hash_key') THEN
        ALTER TABLE api_keys ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);
      END IF;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key_prefix') THEN
      ALTER TABLE api_keys ADD COLUMN key_prefix TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'user_id') THEN
      ALTER TABLE api_keys ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'rate_limit_requests') THEN
      ALTER TABLE api_keys ADD COLUMN rate_limit_requests INTEGER DEFAULT 1000;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'rate_limit_window') THEN
      ALTER TABLE api_keys ADD COLUMN rate_limit_window INTEGER DEFAULT 3600;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'is_active') THEN
      ALTER TABLE api_keys ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'updated_at') THEN
      ALTER TABLE api_keys ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Handle permissions column type (might be JSONB or TEXT[])
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'permissions') THEN
      ALTER TABLE api_keys ADD COLUMN permissions TEXT[] DEFAULT '{}';
    ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'permissions' AND data_type = 'jsonb') THEN
      -- Convert JSONB to TEXT[] if needed
      ALTER TABLE api_keys ALTER COLUMN permissions TYPE TEXT[] USING 
        CASE 
          WHEN permissions::text = '[]' THEN ARRAY[]::TEXT[]
          WHEN permissions::text = 'null' THEN ARRAY[]::TEXT[]
          ELSE ARRAY(SELECT jsonb_array_elements_text(permissions))
        END;
    END IF;
  ELSE
    -- Table doesn't exist - create it
    CREATE TABLE api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      key_hash TEXT UNIQUE NOT NULL,
      key_prefix TEXT NOT NULL,
      name TEXT NOT NULL,
      permissions TEXT[] DEFAULT '{}',
      rate_limit_requests INTEGER DEFAULT 1000,
      rate_limit_window INTEGER DEFAULT 3600,
      last_used_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT TRUE,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Webhooks table for user webhook endpoints
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL, -- For HMAC signature
  is_active BOOLEAN DEFAULT TRUE,
  retry_policy JSONB DEFAULT '{
    "maxRetries": 3,
    "backoffMultiplier": 2,
    "initialDelayMs": 1000,
    "maxDelayMs": 30000
  }'::jsonb,
  timeout_ms INTEGER DEFAULT 10000,
  headers JSONB DEFAULT '{}'::jsonb,
  last_delivery_timestamp TIMESTAMPTZ,
  last_delivery_status TEXT CHECK (last_delivery_status IN ('success', 'failed', 'pending')),
  last_delivery_response_code INTEGER,
  last_delivery_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook deliveries table for tracking delivery history
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  attempt INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('pending', 'success', 'failed', 'retrying')) DEFAULT 'pending',
  response_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance (only create if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key_hash') THEN
    CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'is_active') THEN
    CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry_at ON webhook_deliveries(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- RLS Policies
DO $$
BEGIN
  -- Enable RLS (idempotent)
  ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL; -- Ignore if already enabled
END $$;

DO $$
BEGIN
  ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Users can only access their own API keys
-- Drop policy if exists, then create
DROP POLICY IF EXISTS api_keys_user_policy ON api_keys;

-- Create policy that handles both user_id and organization_id schemas
DO $$
BEGIN
  -- Check if organization_id column exists
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'organization_id') THEN
    -- Table has organization_id - support both schemas
    CREATE POLICY api_keys_user_policy ON api_keys
      FOR ALL USING (
        (user_id IS NOT NULL AND auth.uid() = user_id) OR 
        auth.role() = 'service_role' OR
        (organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM organizations o 
          WHERE o.id = api_keys.organization_id 
          AND o.owner_id = auth.uid()
        ))
      );
  ELSE
    -- Table only has user_id
    CREATE POLICY api_keys_user_policy ON api_keys
      FOR ALL USING (
        (user_id IS NOT NULL AND auth.uid() = user_id) OR 
        auth.role() = 'service_role'
      );
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Policy already exists, ignore
    NULL;
END $$;

-- Users can only access their own webhooks
DROP POLICY IF EXISTS webhooks_user_policy ON webhooks;
CREATE POLICY webhooks_user_policy ON webhooks
  FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Users can only access deliveries for their own webhooks
DROP POLICY IF EXISTS webhook_deliveries_user_policy ON webhook_deliveries;
CREATE POLICY webhook_deliveries_user_policy ON webhook_deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM webhooks w
      WHERE w.id = webhook_deliveries.webhook_id
      AND (w.user_id = auth.uid() OR auth.role() = 'service_role')
    )
  );

-- Create update_updated_at_column function BEFORE webhook functions (needed by triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update webhook delivery status
CREATE OR REPLACE FUNCTION update_webhook_delivery(
  delivery_id UUID,
  delivery_status TEXT,
  response_code_param INTEGER DEFAULT NULL,
  response_body_param TEXT DEFAULT NULL,
  error_message_param TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  webhook_uuid UUID;
BEGIN
  -- Get webhook_id from delivery
  SELECT webhook_id INTO webhook_uuid
  FROM webhook_deliveries
  WHERE id = delivery_id;
  
  -- Update delivery record
  UPDATE webhook_deliveries
  SET 
    status = delivery_status,
    response_code = response_code_param,
    response_body = response_body_param,
    error_message = error_message_param,
    delivered_at = CASE WHEN delivery_status = 'success' THEN NOW() ELSE delivered_at END,
    updated_at = NOW()
  WHERE id = delivery_id;
  
  -- Update webhook's last delivery info
  IF webhook_uuid IS NOT NULL THEN
    UPDATE webhooks
    SET 
      last_delivery_timestamp = NOW(),
      last_delivery_status = delivery_status,
      last_delivery_response_code = response_code_param,
      last_delivery_error = error_message_param,
      updated_at = NOW()
    WHERE id = webhook_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending deliveries for retry
CREATE OR REPLACE FUNCTION get_pending_webhook_deliveries(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  webhook_id UUID,
  event_id TEXT,
  event_type TEXT,
  attempt INTEGER,
  payload JSONB,
  next_retry_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wd.id,
    wd.webhook_id,
    wd.event_id,
    wd.event_type,
    wd.attempt,
    wd.payload,
    wd.next_retry_at
  FROM webhook_deliveries wd
  INNER JOIN webhooks w ON w.id = wd.webhook_id
  WHERE wd.status IN ('pending', 'retrying')
    AND w.is_active = TRUE
    AND (wd.next_retry_at IS NULL OR wd.next_retry_at <= NOW())
  ORDER BY wd.created_at ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to schedule retry
CREATE OR REPLACE FUNCTION schedule_webhook_retry(
  delivery_id UUID,
  next_retry_at_param TIMESTAMPTZ,
  attempt_count INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE webhook_deliveries
  SET 
    status = 'retrying',
    attempt = attempt_count,
    next_retry_at = next_retry_at_param,
    updated_at = NOW()
  WHERE id = delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create specific function for api_keys
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
-- Drop triggers if they exist, then create
DROP TRIGGER IF EXISTS update_api_keys_updated_at_trigger ON api_keys;
CREATE TRIGGER update_api_keys_updated_at_trigger
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_api_keys_updated_at();

DROP TRIGGER IF EXISTS update_webhooks_updated_at_trigger ON webhooks;
CREATE TRIGGER update_webhooks_updated_at_trigger
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup old deliveries (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_deliveries()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_deliveries
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('success', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
