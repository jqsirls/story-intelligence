# Testing Tools and Sandbox Environment

Comprehensive testing tools and sandbox environment for developing and testing your Storytailor integrations safely and efficiently.

## 🧪 Sandbox Environment

### Access the Sandbox

**[Launch Sandbox →](https://sandbox.storytailor.com)**

The Storytailor Sandbox provides a complete testing environment that mirrors production functionality without affecting real data or billing.

### Sandbox Features

- **Isolated Environment** - Completely separate from production
- **Mock Data** - Realistic test data for all scenarios
- **No Billing** - Test premium features without charges
- **Reset Capability** - Reset environment to clean state
- **Real-time Testing** - Test webhooks and streaming features
- **Performance Testing** - Load testing capabilities

### Getting Started with Sandbox

#### 1. Get Sandbox API Keys

```bash
# Register for sandbox access
curl -X POST https://sandbox-api.storytailor.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "name": "Developer Name",
    "purpose": "integration_testing"
  }'
```

#### 2. Configure Your Application

```javascript
// Use sandbox endpoints
const storyteller = new StorytellerWebSDK({
  apiKey: 'sandbox_publishable_key_...',
  baseURL: 'https://sandbox-api.storytailor.com/v1',
  environment: 'sandbox'
});
```

#### 3. Test with Mock Data

```javascript
// Enable mock responses for consistent testing
const storyteller = new StorytellerWebSDK({
  apiKey: 'sandbox_publishable_key_...',
  baseURL: 'https://sandbox-api.storytailor.com/v1',
  mockMode: true,
  mockScenarios: {
    storyCreation: 'success', // 'success', 'error', 'timeout'
    voiceSynthesis: 'success',
    assetGeneration: 'success'
  }
});
```

## 🔧 Testing Tools

### 1. API Testing Suite

#### Automated Test Runner

```bash
# Install testing CLI
npm install -g @storytailor/testing-cli

# Run comprehensive API tests
storytailor test api --environment sandbox

# Run specific test suites
storytailor test api --suite conversations
storytailor test api --suite stories
storytailor test api --suite voice
```

#### Custom Test Configuration

```yaml
# storytailor-tests.yml
environment: sandbox
apiKey: sandbox_publishable_key_...
baseURL: https://sandbox-api.storytailor.com/v1

tests:
  conversations:
    - name: "Start conversation"
      endpoint: POST /conversations
      payload:
        userId: "test-user-123"
        storyType: "adventure"
      expect:
        status: 200
        response:
          data.conversationId: exists
          data.status: "active"
    
    - name: "Send message"
      endpoint: POST /conversations/{conversationId}/messages
      payload:
        message: "I want to create a dragon story"
        messageType: "text"
      expect:
        status: 200
        response:
          data.response: contains("dragon")

  stories:
    - name: "Create story"
      endpoint: POST /stories
      payload:
        title: "Test Story"
        character:
          name: "Test Character"
          species: "dragon"
        storyType: "adventure"
      expect:
        status: 201
        response:
          data.id: exists
          data.title: "Test Story"
```

#### JavaScript Testing Framework

```javascript
// storytailor-test-suite.js
import { StorytellerTestSuite } from '@storytailor/testing-tools';

const testSuite = new StorytellerTestSuite({
  apiKey: 'sandbox_publishable_key_...',
  baseURL: 'https://sandbox-api.storytailor.com/v1'
});

describe('Storytailor API Integration', () => {
  beforeAll(async () => {
    await testSuite.setup();
  });

  afterAll(async () => {
    await testSuite.cleanup();
  });

  describe('Conversations', () => {
    test('should start a new conversation', async () => {
      const conversation = await testSuite.conversations.start({
        userId: 'test-user-123',
        storyType: 'adventure'
      });

      expect(conversation.status).toBe(200);
      expect(conversation.data.conversationId).toBeDefined();
      expect(conversation.data.status).toBe('active');
    });

    test('should send message and receive response', async () => {
      const conversation = await testSuite.conversations.start({
        userId: 'test-user-123',
        storyType: 'adventure'
      });

      const response = await testSuite.conversations.sendMessage(
        conversation.data.conversationId,
        'I want to create a story about a brave dragon'
      );

      expect(response.status).toBe(200);
      expect(response.data.response).toContain('dragon');
      expect(response.data.messageType).toBe('text');
    });
  });

  describe('Stories', () => {
    test('should create a complete story', async () => {
      const story = await testSuite.stories.create({
        title: 'The Brave Dragon',
        character: {
          name: 'Spark',
          species: 'dragon',
          traits: ['brave', 'kind']
        },
        storyType: 'adventure',
        generateAssets: true
      });

      expect(story.status).toBe(201);
      expect(story.data.id).toBeDefined();
      expect(story.data.title).toBe('The Brave Dragon');
      expect(story.data.character.name).toBe('Spark');
    });

    test('should generate story assets', async () => {
      const story = await testSuite.stories.create({
        title: 'Test Story',
        character: { name: 'Test', species: 'human' },
        generateAssets: true
      });

      // Wait for asset generation
      const assets = await testSuite.stories.waitForAssets(story.data.id, {
        timeout: 30000,
        expectedAssets: ['cover_art', 'character_art', 'audio', 'pdf']
      });

      expect(assets.coverArt).toBeDefined();
      expect(assets.characterArt).toBeDefined();
      expect(assets.audio).toBeDefined();
      expect(assets.pdf).toBeDefined();
    });
  });

  describe('Voice Synthesis', () => {
    test('should synthesize speech from text', async () => {
      const audio = await testSuite.voice.synthesize({
        text: 'Once upon a time, in a magical forest...',
        voice: 'child-friendly-narrator',
        emotion: 'excited'
      });

      expect(audio.status).toBe(200);
      expect(audio.data.audioUrl).toBeDefined();
      expect(audio.data.duration).toBeGreaterThan(0);
    });
  });
});
```

### 2. Load Testing Tools

#### Performance Testing with k6

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
  },
};

const API_KEY = 'sandbox_publishable_key_...';
const BASE_URL = 'https://sandbox-api.storytailor.com/v1';

export default function() {
  // Start conversation
  let conversationResponse = http.post(`${BASE_URL}/conversations`, 
    JSON.stringify({
      userId: `test-user-${__VU}-${__ITER}`,
      storyType: 'adventure'
    }), 
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  check(conversationResponse, {
    'conversation started': (r) => r.status === 200,
    'conversation has ID': (r) => JSON.parse(r.body).data.conversationId !== undefined,
  });

  if (conversationResponse.status === 200) {
    const conversationId = JSON.parse(conversationResponse.body).data.conversationId;

    // Send message
    let messageResponse = http.post(`${BASE_URL}/conversations/${conversationId}/messages`,
      JSON.stringify({
        message: 'Create a story about a magical unicorn',
        messageType: 'text'
      }),
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    check(messageResponse, {
      'message sent': (r) => r.status === 200,
      'response received': (r) => JSON.parse(r.body).data.response !== undefined,
    });
  }

  sleep(1);
}
```

#### Run Load Tests

```bash
# Install k6
npm install -g k6

# Run load test
k6 run load-test.js

# Run with custom configuration
k6 run --vus 100 --duration 10m load-test.js

# Generate HTML report
k6 run --out html=report.html load-test.js
```

### 3. Integration Testing

#### End-to-End Testing with Playwright

```javascript
// e2e-tests.js
import { test, expect } from '@playwright/test';

test.describe('Storytailor Web Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page with sandbox configuration
    await page.goto('http://localhost:3000/test');
    
    // Wait for SDK to load
    await page.waitForSelector('#storytailor-widget');
  });

  test('should initialize widget successfully', async ({ page }) => {
    // Check if widget is visible
    const widget = page.locator('#storytailor-widget');
    await expect(widget).toBeVisible();

    // Check if welcome message appears
    const welcomeMessage = page.locator('.storytailor-message').first();
    await expect(welcomeMessage).toContainText('Hello! Let\'s create a story together');
  });

  test('should handle voice input', async ({ page }) => {
    // Grant microphone permissions
    await page.context().grantPermissions(['microphone']);

    // Click voice input button
    await page.click('.storytailor-voice-button');

    // Check if recording indicator appears
    const recordingIndicator = page.locator('.storytailor-recording');
    await expect(recordingIndicator).toBeVisible();

    // Simulate voice input (in real test, you'd use actual audio)
    await page.evaluate(() => {
      window.storytailor.simulateVoiceInput('I want to create a dragon story');
    });

    // Check if message appears in chat
    const userMessage = page.locator('.storytailor-user-message').last();
    await expect(userMessage).toContainText('dragon story');
  });

  test('should create character through conversation', async ({ page }) => {
    // Start character creation
    await page.fill('.storytailor-input', 'Let\'s create a character named Luna');
    await page.press('.storytailor-input', 'Enter');

    // Wait for AI response
    await page.waitForSelector('.storytailor-ai-message:has-text("Luna")');

    // Continue character creation conversation
    await page.fill('.storytailor-input', 'Luna is a magical unicorn');
    await page.press('.storytailor-input', 'Enter');

    // Check if character details are captured
    const characterInfo = await page.evaluate(() => {
      return window.storytailor.getCurrentCharacter();
    });

    expect(characterInfo.name).toBe('Luna');
    expect(characterInfo.species).toBe('unicorn');
  });

  test('should handle offline mode', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);

    // Try to send message
    await page.fill('.storytailor-input', 'Create a story about adventure');
    await page.press('.storytailor-input', 'Enter');

    // Check if offline indicator appears
    const offlineIndicator = page.locator('.storytailor-offline-indicator');
    await expect(offlineIndicator).toBeVisible();

    // Go back online
    await page.context().setOffline(false);

    // Check if message is sent when back online
    await page.waitForSelector('.storytailor-ai-message', { timeout: 10000 });
  });
});
```

### 4. Webhook Testing

#### Webhook Test Server

```javascript
// webhook-test-server.js
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Store received webhooks for testing
const receivedWebhooks = [];

// Webhook endpoint
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-storytailor-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  // Store webhook for testing
  receivedWebhooks.push({
    timestamp: new Date(),
    event: req.body.event,
    data: req.body.data
  });

  console.log('Received webhook:', req.body.event);
  res.status(200).send('OK');
});

// Test endpoint to check received webhooks
app.get('/webhooks', (req, res) => {
  res.json(receivedWebhooks);
});

// Clear webhooks for testing
app.delete('/webhooks', (req, res) => {
  receivedWebhooks.length = 0;
  res.status(200).send('Cleared');
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Webhook test server running on port ${port}`);
});
```

#### Webhook Testing Suite

```javascript
// webhook-tests.js
import { StorytellerTestSuite } from '@storytailor/testing-tools';
import axios from 'axios';

const testSuite = new StorytellerTestSuite({
  apiKey: 'sandbox_publishable_key_...',
  webhookTestServer: 'http://localhost:3001'
});

describe('Webhook Integration', () => {
  beforeEach(async () => {
    // Clear previous webhooks
    await axios.delete('http://localhost:3001/webhooks');
  });

  test('should receive story completion webhook', async () => {
    // Create a story
    const story = await testSuite.stories.create({
      title: 'Webhook Test Story',
      character: { name: 'Test', species: 'human' },
      storyType: 'adventure'
    });

    // Complete the story
    await testSuite.stories.complete(story.data.id);

    // Wait for webhook
    await testSuite.webhooks.waitForEvent('story.completed', {
      timeout: 10000,
      filter: (webhook) => webhook.data.storyId === story.data.id
    });

    // Verify webhook was received
    const webhooks = await axios.get('http://localhost:3001/webhooks');
    const storyWebhook = webhooks.data.find(w => w.event === 'story.completed');
    
    expect(storyWebhook).toBeDefined();
    expect(storyWebhook.data.storyId).toBe(story.data.id);
    expect(storyWebhook.data.title).toBe('Webhook Test Story');
  });

  test('should receive character creation webhook', async () => {
    // Create a character
    const character = await testSuite.characters.create({
      name: 'Webhook Test Character',
      species: 'dragon',
      traits: ['brave', 'kind']
    });

    // Wait for webhook
    await testSuite.webhooks.waitForEvent('character.created', {
      timeout: 5000
    });

    // Verify webhook
    const webhooks = await axios.get('http://localhost:3001/webhooks');
    const characterWebhook = webhooks.data.find(w => w.event === 'character.created');
    
    expect(characterWebhook).toBeDefined();
    expect(characterWebhook.data.characterId).toBe(character.data.id);
  });
});
```

### 5. Mock Data and Scenarios

#### Mock Data Generator

```javascript
// mock-data-generator.js
import { faker } from '@faker-js/faker';

export class MockDataGenerator {
  static generateUser() {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      age: faker.number.int({ min: 3, max: 12 }),
      createdAt: faker.date.recent()
    };
  }

  static generateCharacter() {
    const species = faker.helpers.arrayElement([
      'human', 'dragon', 'unicorn', 'robot', 'fairy', 'animal'
    ]);
    
    return {
      id: faker.string.uuid(),
      name: faker.person.firstName(),
      species,
      traits: {
        personality: faker.helpers.arrayElements([
          'brave', 'kind', 'curious', 'funny', 'wise', 'adventurous'
        ], { min: 2, max: 4 }),
        appearance: {
          eyeColor: faker.color.human(),
          hairColor: species === 'human' ? faker.color.human() : faker.color.rgb(),
          height: faker.helpers.arrayElement(['short', 'medium', 'tall'])
        }
      },
      createdAt: faker.date.recent()
    };
  }

  static generateStory(character = null) {
    const storyTypes = [
      'adventure', 'bedtime', 'educational', 'birthday', 'fantasy'
    ];
    
    return {
      id: faker.string.uuid(),
      title: faker.lorem.words(3),
      content: faker.lorem.paragraphs(5),
      character: character || this.generateCharacter(),
      storyType: faker.helpers.arrayElement(storyTypes),
      ageGroup: faker.helpers.arrayElement(['3-5', '6-8', '9-12']),
      status: faker.helpers.arrayElement(['draft', 'completed']),
      createdAt: faker.date.recent(),
      completedAt: faker.date.recent()
    };
  }

  static generateConversation() {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      status: faker.helpers.arrayElement(['active', 'completed', 'paused']),
      messages: Array.from({ length: faker.number.int({ min: 5, max: 20 }) }, () => ({
        id: faker.string.uuid(),
        content: faker.lorem.sentence(),
        sender: faker.helpers.arrayElement(['user', 'ai']),
        timestamp: faker.date.recent()
      })),
      createdAt: faker.date.recent()
    };
  }
}
```

#### Test Scenarios

```javascript
// test-scenarios.js
export const testScenarios = {
  // Happy path scenarios
  successfulStoryCreation: {
    name: 'Successful Story Creation',
    description: 'User creates a complete story from start to finish',
    steps: [
      { action: 'startConversation', params: { storyType: 'adventure' } },
      { action: 'sendMessage', params: { message: 'Create a dragon story' } },
      { action: 'createCharacter', params: { name: 'Spark', species: 'dragon' } },
      { action: 'buildStory', params: { theme: 'friendship' } },
      { action: 'completeStory', params: { generateAssets: true } }
    ],
    expectedOutcome: {
      storyCreated: true,
      assetsGenerated: true,
      webhooksSent: ['character.created', 'story.completed']
    }
  },

  // Error scenarios
  apiKeyError: {
    name: 'Invalid API Key',
    description: 'Request with invalid API key should return 401',
    setup: { apiKey: 'invalid-key' },
    steps: [
      { action: 'startConversation', expectError: { status: 401 } }
    ]
  },

  rateLimitError: {
    name: 'Rate Limit Exceeded',
    description: 'Too many requests should return 429',
    setup: { rateLimitRequests: 100 },
    steps: [
      { action: 'bulkRequests', count: 101, expectError: { status: 429 } }
    ]
  },

  // Edge cases
  longConversation: {
    name: 'Very Long Conversation',
    description: 'Handle conversations with many messages',
    steps: [
      { action: 'startConversation' },
      { action: 'sendMultipleMessages', count: 100 },
      { action: 'completeStory' }
    ],
    expectedOutcome: {
      conversationCompleted: true,
      performanceWithinLimits: true
    }
  },

  offlineRecovery: {
    name: 'Offline Recovery',
    description: 'Handle network interruptions gracefully',
    steps: [
      { action: 'startConversation' },
      { action: 'goOffline' },
      { action: 'sendMessage', expectError: { type: 'network' } },
      { action: 'goOnline' },
      { action: 'sendMessage', expectSuccess: true }
    ]
  }
};
```

## 🎯 Testing Best Practices

### 1. Test Organization

```
tests/
├── unit/                 # Unit tests for individual components
├── integration/          # API integration tests
├── e2e/                 # End-to-end browser tests
├── load/                # Performance and load tests
├── webhooks/            # Webhook integration tests
├── fixtures/            # Test data and fixtures
├── helpers/             # Test utilities and helpers
└── config/              # Test configuration files
```

### 2. Test Data Management

```javascript
// test-data-manager.js
export class TestDataManager {
  constructor(environment = 'sandbox') {
    this.environment = environment;
    this.createdResources = [];
  }

  async createTestUser() {
    const user = await this.api.users.create({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User'
    });
    
    this.createdResources.push({ type: 'user', id: user.id });
    return user;
  }

  async cleanup() {
    // Clean up all created test resources
    for (const resource of this.createdResources) {
      try {
        await this.api[resource.type].delete(resource.id);
      } catch (error) {
        console.warn(`Failed to cleanup ${resource.type} ${resource.id}:`, error);
      }
    }
    this.createdResources = [];
  }
}
```

### 3. Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        STORYTAILOR_API_KEY: ${{ secrets.SANDBOX_API_KEY }}
        STORYTAILOR_BASE_URL: https://sandbox-api.storytailor.com/v1
    
    - name: Run E2E tests
      run: npm run test:e2e
      env:
        PLAYWRIGHT_BROWSERS_PATH: 0
    
    - name: Upload test results
      uses: actions/upload-artifact@v2
      if: always()
      with:
        name: test-results
        path: test-results/
```

## 📊 Test Reporting

### Test Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/index.html
```

### Performance Reports

```bash
# Generate performance report
k6 run --out html=performance-report.html load-test.js

# View performance metrics
open performance-report.html
```

### Integration Test Reports

```javascript
// Custom test reporter
class StorytellerTestReporter {
  onTestComplete(test, result) {
    const report = {
      testName: test.name,
      status: result.status,
      duration: result.duration,
      apiCalls: result.apiCalls,
      errors: result.errors,
      timestamp: new Date().toISOString()
    };

    // Send to monitoring service
    this.sendToMonitoring(report);
    
    // Generate HTML report
    this.updateHTMLReport(report);
  }
}
```

## 🔗 Integration with CI/CD

### Automated Testing Pipeline

```yaml
# storytailor-pipeline.yml
stages:
  - name: Unit Tests
    command: npm run test:unit
    
  - name: Integration Tests
    command: npm run test:integration
    environment: sandbox
    
  - name: Load Tests
    command: k6 run load-test.js
    threshold: p95 < 2000ms
    
  - name: E2E Tests
    command: npm run test:e2e
    browsers: [chrome, firefox, safari]
    
  - name: Security Tests
    command: npm run test:security
    
  - name: Deploy to Staging
    condition: all_tests_pass
    command: npm run deploy:staging
```

## 📞 Support and Resources

### Getting Help

- **Documentation**: [Testing Guide](../guides/testing.md)
- **API Reference**: [API Documentation](../api-reference/README.md)
- **Community**: [Developer Forum](https://community.storytailor.com)
- **Support**: [Contact Support](../support/contact.md)

### Additional Resources

- **Test Examples**: [GitHub Repository](https://github.com/storytailor/test-examples)
- **Best Practices**: [Testing Best Practices Guide](../guides/testing-best-practices.md)
- **Video Tutorials**: [Testing Tutorials](https://www.youtube.com/playlist?list=storytailor-testing)

---

## Quick Links

- 🧪 **[Launch Sandbox](https://sandbox.storytailor.com)**
- 🔧 **[Testing CLI](https://www.npmjs.com/package/@storytailor/testing-cli)**
- 📊 **[Performance Dashboard](https://performance.storytailor.com)**
- 🚀 **[API Explorer](./api-explorer.md)**
- 📖 **[Integration Guides](../integration-guides/README.md)**