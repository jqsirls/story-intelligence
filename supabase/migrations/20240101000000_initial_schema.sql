-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with Supabase Auth integration
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  email_confirmed BOOLEAN DEFAULT FALSE,
  parent_email TEXT, -- For COPPA compliance
  age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Libraries with hierarchical permissions
CREATE TABLE libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner UUID REFERENCES users NOT NULL,
  name TEXT NOT NULL,
  parent_library UUID REFERENCES libraries,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permission system
CREATE TABLE library_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID REFERENCES libraries NOT NULL,
  user_id UUID REFERENCES users NOT NULL,
  role TEXT CHECK (role IN ('Owner', 'Admin', 'Editor', 'Viewer')) NOT NULL,
  granted_by UUID REFERENCES users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(library_id, user_id)
);

-- Stories with status tracking
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID REFERENCES libraries NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  status TEXT CHECK (status IN ('draft', 'final')) DEFAULT 'draft',
  age_rating INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ
);

-- Characters linked to stories
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories NOT NULL,
  name TEXT NOT NULL,
  traits JSONB NOT NULL,
  appearance_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emotion tracking with TTL
CREATE TABLE emotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  library_id UUID REFERENCES libraries,
  mood TEXT CHECK (mood IN ('happy', 'sad', 'scared', 'angry', 'neutral')) NOT NULL,
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1) NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '365 days')
);

-- Subscription management
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset storage
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories NOT NULL,
  asset_type TEXT CHECK (asset_type IN ('audio', 'image', 'pdf', 'activity')) NOT NULL,
  url TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trail for compliance
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alexa user mapping for account linking
CREATE TABLE alexa_user_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alexa_person_id TEXT UNIQUE NOT NULL,
  supabase_user_id UUID REFERENCES users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice codes for account verification
CREATE TABLE voice_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation state cache (for Redis backup)
CREATE TABLE conversation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users NOT NULL,
  state JSONB NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_libraries_owner ON libraries(owner);
CREATE INDEX idx_library_permissions_library_id ON library_permissions(library_id);
CREATE INDEX idx_library_permissions_user_id ON library_permissions(user_id);
CREATE INDEX idx_stories_library_id ON stories(library_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_characters_story_id ON characters(story_id);
CREATE INDEX idx_emotions_user_id ON emotions(user_id);
CREATE INDEX idx_emotions_library_id ON emotions(library_id);
CREATE INDEX idx_emotions_expires_at ON emotions(expires_at);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_media_assets_story_id ON media_assets(story_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_alexa_user_mappings_alexa_person_id ON alexa_user_mappings(alexa_person_id);
CREATE INDEX idx_voice_codes_email ON voice_codes(email);
CREATE INDEX idx_voice_codes_expires_at ON voice_codes(expires_at);
CREATE INDEX idx_conversation_states_session_id ON conversation_states(session_id);
CREATE INDEX idx_conversation_states_expires_at ON conversation_states(expires_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE alexa_user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;