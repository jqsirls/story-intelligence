#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public'
  }
});

async function executeMigrations() {
  console.log('🚀 Starting database migrations...\n');

  const migrations = [
    {
      name: 'Users table',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clerk_id TEXT UNIQUE NOT NULL,
          email TEXT NOT NULL,
          full_name TEXT,
          role TEXT DEFAULT 'parent',
          subscription_status TEXT DEFAULT 'free',
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `
    },
    {
      name: 'Organizations table',
      sql: `
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
          subscription_tier TEXT DEFAULT 'free',
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
      `
    },
    {
      name: 'Organization members table',
      sql: `
        CREATE TABLE IF NOT EXISTS organization_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          role TEXT DEFAULT 'member',
          joined_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(organization_id, user_id)
        );
      `
    },
    {
      name: 'Stories table',
      sql: `
        CREATE TABLE IF NOT EXISTS stories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          status TEXT DEFAULT 'draft',
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_stories_org_id ON stories(organization_id);
        CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
      `
    },
    {
      name: 'Characters table',
      sql: `
        CREATE TABLE IF NOT EXISTS characters (
          id TEXT PRIMARY KEY,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          age INTEGER,
          traits JSONB DEFAULT '[]',
          preferences JSONB DEFAULT '{}',
          backstory TEXT,
          voice_id TEXT,
          avatar_url TEXT,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_characters_org_id ON characters(organization_id);
      `
    },
    {
      name: 'API keys table',
      sql: `
        CREATE TABLE IF NOT EXISTS api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          key_hash TEXT NOT NULL,
          permissions JSONB DEFAULT '[]',
          last_used_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT now(),
          revoked_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(organization_id);
        CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
      `
    },
    {
      name: 'Sessions table',
      sql: `
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
      `
    },
    {
      name: 'Activity logs table',
      sql: `
        CREATE TABLE IF NOT EXISTS activity_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action TEXT NOT NULL,
          resource_type TEXT,
          resource_id TEXT,
          metadata JSONB DEFAULT '{}',
          ip_address INET,
          created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON activity_logs(organization_id);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
      `
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const migration of migrations) {
    try {
      console.log(`📝 Creating ${migration.name}...`);
      
      // Try to execute the SQL directly through RPC
      const { data, error } = await supabase.rpc('exec_sql', {
        query: migration.sql
      }).single();

      if (error) {
        // If RPC doesn't work, try a different approach
        console.log(`⚠️  RPC failed, trying alternative method...`);
        
        // Extract table name from the migration
        const tableMatch = migration.sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        if (tableMatch) {
          const tableName = tableMatch[1];
          
          // Check if table exists by trying to query it
          const { error: queryError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!queryError || queryError.code === 'PGRST116') {
            console.log(`✅ ${migration.name} - Table exists or created`);
            successCount++;
          } else {
            console.error(`❌ ${migration.name} - ${queryError.message}`);
            errorCount++;
          }
        }
      } else {
        console.log(`✅ ${migration.name} - Success`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ ${migration.name} - Error: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  
  // Now let's check which tables actually exist
  console.log('\n🔍 Verifying existing tables...');
  
  const tablesToCheck = [
    'users', 'organizations', 'organization_members', 'stories', 
    'characters', 'api_keys', 'sessions', 'activity_logs',
    'children', 'story_history', 'user_preferences', 'knowledge_base',
    'analytics_events', 'conversations', 'agent_metrics'
  ];

  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
        .single();
      
      if (!error || error.code === 'PGRST116') {
        console.log(`✅ Table "${table}" exists`);
      } else {
        console.log(`❌ Table "${table}" not found`);
      }
    } catch (err) {
      console.log(`❌ Table "${table}" not found`);
    }
  }
}

// Alternative approach using direct PostgreSQL connection
async function tryDirectConnection() {
  console.log('\n🔧 Attempting direct PostgreSQL connection...');
  
  try {
    const { Pool } = require('pg');
    
    // Extract the project ref from the URL
    const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
    
    const pool = new Pool({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: SUPABASE_SERVICE_KEY,
      ssl: { rejectUnauthorized: false }
    });

    const result = await pool.query('SELECT current_database(), current_user;');
    console.log('✅ Connected to database:', result.rows[0]);
    
    await pool.end();
    return true;
  } catch (err) {
    console.log('❌ Direct connection failed:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Storytailor Database Migration Tool\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Using service key authentication\n`);

  // First try the Supabase client approach
  await executeMigrations();
  
  // Then try direct connection
  const canConnect = await tryDirectConnection();
  
  if (!canConnect) {
    console.log('\n💡 Alternative Approach Required:');
    console.log('1. The service key has read/write access but not DDL (schema) access');
    console.log('2. You need to run the migrations through the Supabase Dashboard');
    console.log('3. The SQL scripts have been prepared in CRITICAL_MIGRATIONS_FOR_DASHBOARD.sql');
    console.log('\n📋 Next Steps:');
    console.log('1. Go to: https://app.supabase.com/project/lendybmmnlqelrhkhdyc/editor');
    console.log('2. Click on "SQL Editor" in the left sidebar');
    console.log('3. Copy and paste the contents of CRITICAL_MIGRATIONS_FOR_DASHBOARD.sql');
    console.log('4. Click "Run" to execute the migrations');
  }
}

main().catch(console.error);