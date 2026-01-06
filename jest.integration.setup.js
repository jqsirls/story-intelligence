// Integration test setup
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.testConfig = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'test-anon-key',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  testTimeout: 30000
};

// Mock external services for integration tests
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock OpenAI response',
              function_call: {
                name: 'test_function',
                arguments: '{"test": true}'
              }
            }
          }]
        })
      }
    }
  }))
}));

jest.mock('elevenlabs', () => ({
  ElevenLabsAPI: jest.fn().mockImplementation(() => ({
    textToSpeech: {
      convert: jest.fn().mockResolvedValue({
        audio: Buffer.from('mock-audio-data')
      })
    }
  }))
}));

// Setup test database connection
beforeAll(async () => {
  // Initialize test database if needed
  console.log('Setting up integration test environment...');
});

afterAll(async () => {
  // Cleanup test database
  console.log('Tearing down integration test environment...');
});

// Clean up between tests
afterEach(async () => {
  // Clear any test data
  jest.clearAllMocks();
});