// Jest setup file
process.env.NODE_ENV = 'test';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-supabase-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MODERATION_ENABLED = 'true';
process.env.LOG_LEVEL = 'error';