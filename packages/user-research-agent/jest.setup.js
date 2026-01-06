// Jest setup for user-research-agent tests

// Set test environment variables
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.FIELDNOTES_API_KEY = 'test-api-key';

// Increase timeout for integration tests
jest.setTimeout(30000);
