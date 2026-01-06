#!/bin/bash
# Setup Complete Test Infrastructure for Phase 3
# NO SHORTCUTS - 100/100 QUALITY
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║      🧪 SETTING UP TEST INFRASTRUCTURE - 100/100 🧪              ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"

# Verify we're in the project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Must run from project root${NC}"
    exit 1
fi

echo -e "${CYAN}Creating comprehensive test structure...${NC}"

# Create test directory structure
directories=(
    "tests"
    "tests/unit"
    "tests/unit/agents"
    "tests/unit/services"
    "tests/unit/utils"
    "tests/integration"
    "tests/integration/flows"
    "tests/integration/agents"
    "tests/integration/api"
    "tests/e2e"
    "tests/e2e/journeys"
    "tests/load"
    "tests/security"
    "tests/ai-quality"
    "tests/fixtures"
    "tests/mocks"
    "tests/helpers"
    "tests/reports"
)

for dir in "${directories[@]}"; do
    mkdir -p "$dir"
    echo -e "${GREEN}✅ Created $dir${NC}"
done

# Create Jest configuration
echo -e "${YELLOW}📝 Creating Jest configuration...${NC}"
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'packages/**/src/**/*.{ts,tsx}',
    '!packages/**/src/**/*.d.ts',
    '!packages/**/src/**/index.ts',
    '!packages/**/src/**/*.interface.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageDirectory: 'tests/reports/coverage',
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.ts'],
  moduleNameMapper: {
    '^@packages/(.*)$': '<rootDir>/packages/$1/src',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        allowJs: true
      }
    }
  }
};
EOF

# Create test setup helper
echo -e "${YELLOW}📝 Creating test setup helper...${NC}"
cat > tests/helpers/setup.ts << 'EOF'
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
EOF

# Create test environment file
echo -e "${YELLOW}📝 Creating test environment configuration...${NC}"
cat > .env.test << 'EOF'
# Test Environment Configuration
NODE_ENV=test
ENVIRONMENT=test

# Test Database (separate from staging/production)
SUPABASE_URL=https://test.supabase.co
SUPABASE_SERVICE_KEY=test-service-key

# Test Redis
REDIS_URL=redis://localhost:6379/1

# Test API Keys (use test keys)
OPENAI_API_KEY=test-openai-key
ELEVENLABS_API_KEY=test-elevenlabs-key
STRIPE_SECRET_KEY=test-stripe-key

# Test JWT
JWT_SECRET=test-jwt-secret

# AWS Test Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=326181217496
EVENT_BUS_NAME=storytailor-test
EOF

# Create comprehensive test checklist
echo -e "${YELLOW}📝 Creating test checklist...${NC}"
cat > tests/TEST_CHECKLIST.md << 'EOF'
# 🧪 COMPREHENSIVE TEST CHECKLIST - 100/100 COVERAGE

## Unit Tests (Every Component)

### Router Tests
- [ ] Intent classification accuracy
- [ ] Route mapping correctness
- [ ] Error handling
- [ ] Timeout behavior
- [ ] Circuit breaker functionality

### Agent Tests (All 18 Agents)
- [ ] AuthAgent - Authentication flows
- [ ] ContentAgent - Story generation
- [ ] EmotionAgent - Sentiment analysis
- [ ] PersonalityAgent - Tone adaptation
- [ ] LibraryAgent - CRUD operations
- [ ] CommerceAgent - Payment processing
- [ ] KnowledgeBaseAgent - Query handling
- [ ] ChildSafetyAgent - Crisis detection
- [ ] EducationalAgent - Learning paths
- [ ] TherapeuticAgent - Intervention logic
- [ ] AccessibilityAgent - Adaptations
- [ ] LocalizationAgent - Translations
- [ ] SmartHomeAgent - Device control
- [ ] VoiceSynthesisAgent - Audio generation
- [ ] SecurityFrameworkAgent - Auth validation
- [ ] AnalyticsIntelligenceAgent - Metrics
- [ ] ConversationIntelligenceAgent - Analysis
- [ ] InsightsAgent - Recommendations

## Integration Tests

### User Journey Tests
- [ ] New user onboarding (complete flow)
- [ ] Character creation (all variations)
- [ ] Story generation (all types)
- [ ] Educational session flow
- [ ] Therapeutic intervention flow
- [ ] Payment processing flow
- [ ] Library management flow
- [ ] Multi-user collaboration

### Multi-Agent Coordination
- [ ] Sequential agent chains
- [ ] Parallel agent processing
- [ ] Agent-to-agent communication
- [ ] Error propagation
- [ ] Timeout handling
- [ ] Circuit breaker activation

## AI Quality Tests

### OpenAI Integration
- [ ] Response quality metrics
- [ ] Token usage optimization
- [ ] Prompt injection prevention
- [ ] Content appropriateness
- [ ] Response time benchmarks

### ElevenLabs Integration
- [ ] Voice quality assessment
- [ ] Latency measurements
- [ ] Error handling
- [ ] Fallback behavior

## Load Tests

### Scalability Validation
- [ ] 1 concurrent user baseline
- [ ] 100 concurrent users
- [ ] 1K concurrent users
- [ ] 10K concurrent users
- [ ] 100K concurrent users
- [ ] Resource utilization at scale
- [ ] Cost projections

## Security Tests

### COPPA Compliance
- [ ] Age verification
- [ ] Parental consent flows
- [ ] Data retention policies
- [ ] Privacy controls

### Authentication & Authorization
- [ ] JWT validation
- [ ] Session management
- [ ] Role-based access
- [ ] Multi-factor authentication

### Input Validation
- [ ] SQL injection attempts
- [ ] XSS prevention
- [ ] Command injection
- [ ] Path traversal

## Performance Tests

### Latency Requirements
- [ ] p50 < 100ms
- [ ] p95 < 200ms
- [ ] p99 < 500ms

### Availability
- [ ] 99.9% uptime capability
- [ ] Graceful degradation
- [ ] Recovery time objectives

## Monitoring & Observability

### Metrics Coverage
- [ ] Business metrics
- [ ] Technical metrics
- [ ] Cost metrics
- [ ] User experience metrics

### Alerting
- [ ] Error rate alerts
- [ ] Latency alerts
- [ ] Cost alerts
- [ ] Security alerts

## Documentation

### Test Documentation
- [ ] Test plan document
- [ ] Test case specifications
- [ ] Test execution reports
- [ ] Coverage reports
- [ ] Performance baselines

---

**NO SHORTCUTS - EVERY TEST MUST PASS**
EOF

# Install test dependencies
echo -e "${YELLOW}📦 Installing test dependencies...${NC}"
npm install --save-dev \
    jest \
    ts-jest \
    @types/jest \
    @testing-library/jest-dom \
    supertest \
    @types/supertest \
    aws-sdk-client-mock \
    nock \
    faker \
    jest-junit \
    jest-html-reporter \
    artillery \
    @artillery/plugin-metrics-by-endpoint \
    k6 \
    @types/k6 \
    newman \
    @types/newman

echo -e "${GREEN}✅ Test dependencies installed${NC}"

# Create first test file (Router unit test)
echo -e "${YELLOW}📝 Creating first test file...${NC}"
cat > tests/unit/agents/router.test.ts << 'EOF'
import { Router } from '@packages/router';
import { IntentClassifier } from '@packages/router/services/IntentClassifier';

describe('Router Agent Tests - 100% Coverage', () => {
  let router: Router;
  
  beforeEach(() => {
    router = new Router({
      environment: 'test',
      enableCircuitBreaker: true
    });
  });

  describe('Intent Classification', () => {
    test('should classify story creation intent correctly', () => {
      const testCases = [
        { input: 'Create a story', expected: 'CONTENT' },
        { input: 'Tell me a bedtime story', expected: 'CONTENT' },
        { input: 'I want to make a character', expected: 'CONTENT' },
        { input: 'Login to my account', expected: 'AUTH' },
        { input: 'How do I use Storytailor?', expected: 'KNOWLEDGE' },
        { input: 'I feel sad today', expected: 'EMOTION' },
        { input: 'Turn on the lights', expected: 'SMART_HOME' },
        { input: 'Buy a subscription', expected: 'COMMERCE' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = router.classifyIntent(input);
        expect(result.primary).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    test('should handle ambiguous intents', () => {
      const input = 'I want to learn how to create stories';
      const result = router.classifyIntent(input);
      
      expect(result.primary).toBeDefined();
      expect(result.secondary).toContain('EDUCATIONAL');
      expect(result.confidence).toBeLessThan(1);
    });

    test('should handle empty input gracefully', () => {
      const result = router.classifyIntent('');
      expect(result.primary).toBe('CONTENT'); // Default
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('Agent Routing', () => {
    test('should route to correct agent based on intent', async () => {
      const mockEvent = {
        input: 'Create a story about dragons',
        userId: 'test-user-123',
        conversationId: 'conv-123'
      };

      const result = await router.route(mockEvent);
      
      expect(result.agent).toBe('content-agent');
      expect(result.success).toBe(true);
    });

    test('should handle routing failures with circuit breaker', async () => {
      // Simulate multiple failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await router.route({ input: 'fail', forceError: true });
      }

      const result = await router.route({ input: 'test' });
      expect(result.circuitBreakerOpen).toBe(true);
      expect(result.fallback).toBe(true);
    });
  });

  describe('Health Checks', () => {
    test('should return healthy status', async () => {
      const health = await router.getHealth();
      expect(health).toBeHealthyResponse();
      expect(health.agents).toBeGreaterThan(0);
    });
  });
});
EOF

# Create test runner script
echo -e "${YELLOW}📝 Creating test runner script...${NC}"
cat > scripts/run-tests.sh << 'EOF'
#!/bin/bash
# Comprehensive test runner - NO SHORTCUTS
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🧪 Running Comprehensive Test Suite${NC}"

# Run unit tests with coverage
echo -e "${YELLOW}Running unit tests...${NC}"
npm test -- --coverage --testPathPattern=unit

# Run integration tests
echo -e "${YELLOW}Running integration tests...${NC}"
npm test -- --testPathPattern=integration

# Run E2E tests
echo -e "${YELLOW}Running E2E tests...${NC}"
npm test -- --testPathPattern=e2e

# Run security tests
echo -e "${YELLOW}Running security tests...${NC}"
npm test -- --testPathPattern=security

# Generate reports
echo -e "${YELLOW}Generating test reports...${NC}"
npm test -- --coverage --coverageReporters=html --coverageReporters=lcov

echo -e "${GREEN}✅ All tests completed!${NC}"
echo -e "${GREEN}Coverage report: tests/reports/coverage/index.html${NC}"
EOF

chmod +x scripts/run-tests.sh

# Update package.json with test scripts
echo -e "${YELLOW}📝 Updating package.json with test scripts...${NC}"
npm pkg set scripts.test="jest"
npm pkg set scripts.test:unit="jest --testPathPattern=unit"
npm pkg set scripts.test:integration="jest --testPathPattern=integration"
npm pkg set scripts.test:e2e="jest --testPathPattern=e2e"
npm pkg set scripts.test:coverage="jest --coverage"
npm pkg set scripts.test:watch="jest --watch"
npm pkg set scripts.test:all="./scripts/run-tests.sh"

# Create GitHub Actions workflow for CI
echo -e "${YELLOW}📝 Creating CI/CD workflow...${NC}"
mkdir -p .github/workflows
cat > .github/workflows/test.yml << 'EOF'
name: Comprehensive Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run security tests
      run: npm run test:security
    
    - name: Generate coverage report
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./tests/reports/coverage/lcov.info
        fail_ci_if_error: true
    
    - name: Archive test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: tests/reports
EOF

# Final summary
echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║        🎉 TEST INFRASTRUCTURE SETUP COMPLETE! 🎉                  ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Test directory structure created${NC}"
echo -e "${GREEN}✅ Jest configuration complete${NC}"
echo -e "${GREEN}✅ Test helpers and utilities ready${NC}"
echo -e "${GREEN}✅ First test file created${NC}"
echo -e "${GREEN}✅ CI/CD workflow configured${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo -e "   1. Run first test: npm test tests/unit/agents/router.test.ts"
echo -e "   2. Create tests for all 18 agents"
echo -e "   3. Implement integration tests"
echo -e "   4. Set up load testing"
echo -e "   5. Configure monitoring"
echo ""
echo -e "${YELLOW}Remember: NO SHORTCUTS - 100/100 QUALITY${NC}"
echo ""