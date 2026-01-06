// Global test setup
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test timeouts
jest.setTimeout(30000);

// Mock AWS SDK
jest.mock('@aws-sdk/client-lambda');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('@aws-sdk/client-dynamodb');

// Global test utilities
global.testUtils = {
  generateTestUser: () => ({
    id: `test-user-${Date.now()}`,
    email: `test-${Date.now()}@storytailor.ai`,
    age: 10,
    role: 'child'
  }),
  
  generateTestCharacter: () => ({
    id: `test-char-${Date.now()}`,
    name: 'Test Character',
    traits: ['brave', 'kind', 'curious']
  }),
  
  generateTestStory: () => ({
    id: `test-story-${Date.now()}`,
    title: 'Test Adventure',
    type: 'adventure'
  })
};

// Global expectations
expect.extend({
  toBeHealthyResponse(received) {
    const pass = received.status === 'healthy' && 
                 received.timestamp && 
                 received.service;
    
    return {
      pass,
      message: () => pass 
        ? `expected response not to be healthy`
        : `expected response to be healthy, got ${JSON.stringify(received)}`
    };
  }
});

// Clean up after tests
afterAll(async () => {
  // Close any open connections
  await new Promise(resolve => setTimeout(resolve, 500));
});
