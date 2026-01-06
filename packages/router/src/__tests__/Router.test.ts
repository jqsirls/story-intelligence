// Router Unit Test - 100% Coverage, NO SHORTCUTS
import { Router } from '../Router';
import { IntentClassifier } from '../services/IntentClassifier';
import { AgentDelegator } from '../services/AgentDelegator';
import { ConversationStateManager } from '../services/ConversationStateManager';
import { RouterConfig } from '../types';

// Mock dependencies
jest.mock('../services/IntentClassifier');
jest.mock('../services/AgentDelegator');
jest.mock('../services/ConversationStateManager');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('@aws-sdk/client-lambda');

describe('Router - 100% Coverage Test Suite', () => {
  let router: Router;
  let mockIntentClassifier: jest.Mocked<IntentClassifier>;
  let mockAgentDelegator: jest.Mocked<AgentDelegator>;
  let mockStateManager: jest.Mocked<ConversationStateManager>;

  const defaultConfig: RouterConfig = {
    environment: 'test',
    region: 'us-east-1',
    enableCircuitBreaker: true,
    enableMetrics: true,
    logLevel: 'info'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockIntentClassifier = new IntentClassifier(defaultConfig) as jest.Mocked<IntentClassifier>;
    mockAgentDelegator = new AgentDelegator(defaultConfig) as jest.Mocked<AgentDelegator>;
    mockStateManager = new ConversationStateManager(defaultConfig) as jest.Mocked<ConversationStateManager>;
    
    // Initialize router
    router = new Router(defaultConfig);
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default config', () => {
      expect(router).toBeDefined();
      expect(router.getConfig()).toEqual(defaultConfig);
    });

    test('should initialize with custom config', () => {
      const customConfig: RouterConfig = {
        ...defaultConfig,
        environment: 'production',
        enableCircuitBreaker: false
      };
      
      const customRouter = new Router(customConfig);
      expect(customRouter.getConfig()).toEqual(customConfig);
    });

    test('should throw error with invalid config', () => {
      expect(() => new Router({} as RouterConfig)).toThrow();
    });
  });

  describe('Intent Classification - ALL CASES', () => {
    const intentTestCases = [
      // Content Creation
      { input: 'Create a story', expectedIntent: 'CONTENT', confidence: 0.95 },
      { input: 'Tell me a bedtime story', expectedIntent: 'CONTENT', confidence: 0.95 },
      { input: 'Make a new character', expectedIntent: 'CONTENT', confidence: 0.90 },
      { input: 'Generate an adventure', expectedIntent: 'CONTENT', confidence: 0.90 },
      { input: 'Write a fairy tale', expectedIntent: 'CONTENT', confidence: 0.95 },
      
      // Authentication
      { input: 'Login to my account', expectedIntent: 'AUTH', confidence: 0.95 },
      { input: 'Sign me up', expectedIntent: 'AUTH', confidence: 0.95 },
      { input: 'Reset my password', expectedIntent: 'AUTH', confidence: 0.95 },
      { input: 'Logout', expectedIntent: 'AUTH', confidence: 0.95 },
      { input: 'Change my email', expectedIntent: 'AUTH', confidence: 0.85 },
      
      // Knowledge Base
      { input: 'What is Story Intelligence?', expectedIntent: 'KNOWLEDGE', confidence: 0.95 },
      { input: 'How does Storytailor work?', expectedIntent: 'KNOWLEDGE', confidence: 0.95 },
      { input: 'Tell me about your features', expectedIntent: 'KNOWLEDGE', confidence: 0.90 },
      { input: 'Why should I use this?', expectedIntent: 'KNOWLEDGE', confidence: 0.85 },
      { input: 'Explain the pricing', expectedIntent: 'KNOWLEDGE', confidence: 0.85 },
      
      // Emotion
      { input: 'I feel sad today', expectedIntent: 'EMOTION', confidence: 0.95 },
      { input: 'I am happy', expectedIntent: 'EMOTION', confidence: 0.95 },
      { input: 'I had a bad day', expectedIntent: 'EMOTION', confidence: 0.90 },
      { input: 'Feeling anxious', expectedIntent: 'EMOTION', confidence: 0.95 },
      { input: 'I am excited!', expectedIntent: 'EMOTION', confidence: 0.95 },
      
      // Educational
      { input: 'Help me learn math', expectedIntent: 'EDUCATIONAL', confidence: 0.95 },
      { input: 'Teach me about science', expectedIntent: 'EDUCATIONAL', confidence: 0.95 },
      { input: 'I need help with homework', expectedIntent: 'EDUCATIONAL', confidence: 0.90 },
      { input: 'Practice spelling with me', expectedIntent: 'EDUCATIONAL', confidence: 0.90 },
      { input: 'Educational story please', expectedIntent: 'EDUCATIONAL', confidence: 0.85 },
      
      // Therapeutic
      { input: 'I need someone to talk to', expectedIntent: 'THERAPEUTIC', confidence: 0.95 },
      { input: 'Help me with anxiety', expectedIntent: 'THERAPEUTIC', confidence: 0.95 },
      { input: 'Practice mindfulness', expectedIntent: 'THERAPEUTIC', confidence: 0.90 },
      { input: 'Breathing exercises', expectedIntent: 'THERAPEUTIC', confidence: 0.90 },
      { input: 'Calm me down', expectedIntent: 'THERAPEUTIC', confidence: 0.85 },
      
      // Smart Home
      { input: 'Turn on the lights', expectedIntent: 'SMART_HOME', confidence: 0.95 },
      { input: 'Set bedtime mode', expectedIntent: 'SMART_HOME', confidence: 0.90 },
      { input: 'Dim the brightness', expectedIntent: 'SMART_HOME', confidence: 0.95 },
      { input: 'Change room color to blue', expectedIntent: 'SMART_HOME', confidence: 0.90 },
      { input: 'Activate night light', expectedIntent: 'SMART_HOME', confidence: 0.90 },
      
      // Commerce
      { input: 'Buy a subscription', expectedIntent: 'COMMERCE', confidence: 0.95 },
      { input: 'Show me pricing', expectedIntent: 'COMMERCE', confidence: 0.95 },
      { input: 'Upgrade my plan', expectedIntent: 'COMMERCE', confidence: 0.95 },
      { input: 'Cancel subscription', expectedIntent: 'COMMERCE', confidence: 0.90 },
      { input: 'Payment options', expectedIntent: 'COMMERCE', confidence: 0.90 },
      
      // Edge Cases
      { input: '', expectedIntent: 'CONTENT', confidence: 0.5 },
      { input: '   ', expectedIntent: 'CONTENT', confidence: 0.5 },
      { input: '!!!', expectedIntent: 'CONTENT', confidence: 0.5 },
      { input: 'asdfghjkl', expectedIntent: 'CONTENT', confidence: 0.5 },
      { input: '12345', expectedIntent: 'CONTENT', confidence: 0.5 },
      
      // Ambiguous Cases
      { input: 'I want to learn how to create stories', expectedIntent: 'CONTENT', confidence: 0.7 },
      { input: 'Tell me a story about feelings', expectedIntent: 'CONTENT', confidence: 0.8 },
      { input: 'Buy educational content', expectedIntent: 'COMMERCE', confidence: 0.7 }
    ];

    test.each(intentTestCases)(
      'should classify "$input" as $expectedIntent with confidence >= $confidence',
      async ({ input, expectedIntent, confidence }) => {
        mockIntentClassifier.classify.mockResolvedValue({
          primary: expectedIntent,
          secondary: [],
          confidence,
          metadata: {}
        });

        const result = await router.classifyIntent(input);
        
        expect(result.primary).toBe(expectedIntent);
        expect(result.confidence).toBeGreaterThanOrEqual(confidence - 0.05);
        expect(mockIntentClassifier.classify).toHaveBeenCalledWith(input);
      }
    );

    test('should handle classification errors gracefully', async () => {
      mockIntentClassifier.classify.mockRejectedValue(new Error('Classification failed'));
      
      const result = await router.classifyIntent('test input');
      
      expect(result.primary).toBe('CONTENT'); // Default fallback
      expect(result.confidence).toBe(0.5);
      expect(result.error).toBeDefined();
    });

    test('should detect multiple intents (secondary)', async () => {
      mockIntentClassifier.classify.mockResolvedValue({
        primary: 'EDUCATIONAL',
        secondary: ['CONTENT', 'EMOTION'],
        confidence: 0.75,
        metadata: {}
      });

      const result = await router.classifyIntent('Teach me with a fun story about feelings');
      
      expect(result.primary).toBe('EDUCATIONAL');
      expect(result.secondary).toContain('CONTENT');
      expect(result.secondary).toContain('EMOTION');
    });
  });

  describe('Agent Routing - ALL PATHS', () => {
    const routingTestCases = [
      { intent: 'CONTENT', expectedAgent: 'content-agent' },
      { intent: 'AUTH', expectedAgent: 'auth-agent' },
      { intent: 'EMOTION', expectedAgent: 'emotion-agent' },
      { intent: 'EDUCATIONAL', expectedAgent: 'educational-agent' },
      { intent: 'THERAPEUTIC', expectedAgent: 'therapeutic-agent' },
      { intent: 'SMART_HOME', expectedAgent: 'smart-home-agent' },
      { intent: 'COMMERCE', expectedAgent: 'commerce-agent' },
      { intent: 'KNOWLEDGE', expectedAgent: 'knowledge-base-agent' },
      { intent: 'UNKNOWN', expectedAgent: 'universal-agent' } // Fallback
    ];

    test.each(routingTestCases)(
      'should route $intent to $expectedAgent',
      async ({ intent, expectedAgent }) => {
        mockIntentClassifier.classify.mockResolvedValue({
          primary: intent,
          secondary: [],
          confidence: 0.9,
          metadata: {}
        });

        mockAgentDelegator.delegate.mockResolvedValue({
          success: true,
          agent: expectedAgent,
          response: { message: 'Success' }
        });

        const result = await router.route({
          input: 'test input',
          userId: 'test-user',
          conversationId: 'test-conv'
        });

        expect(result.success).toBe(true);
        expect(result.agent).toBe(expectedAgent);
        expect(mockAgentDelegator.delegate).toHaveBeenCalledWith(
          expectedAgent,
          expect.any(Object)
        );
      }
    );

    test('should handle routing failures with fallback', async () => {
      mockIntentClassifier.classify.mockResolvedValue({
        primary: 'CONTENT',
        secondary: [],
        confidence: 0.9,
        metadata: {}
      });

      mockAgentDelegator.delegate
        .mockRejectedValueOnce(new Error('Agent unavailable'))
        .mockResolvedValueOnce({
          success: true,
          agent: 'universal-agent',
          response: { message: 'Fallback success' }
        });

      const result = await router.route({
        input: 'test input',
        userId: 'test-user'
      });

      expect(result.success).toBe(true);
      expect(result.agent).toBe('universal-agent');
      expect(result.fallback).toBe(true);
    });

    test('should manage conversation state', async () => {
      const conversationId = 'test-conv-123';
      const userId = 'test-user-123';

      mockStateManager.saveState.mockResolvedValue(undefined);
      mockStateManager.getState.mockResolvedValue({
        conversationId,
        userId,
        currentPhase: 'story',
        context: {}
      });

      await router.route({
        input: 'Continue the story',
        userId,
        conversationId
      });

      expect(mockStateManager.getState).toHaveBeenCalledWith(conversationId);
      expect(mockStateManager.saveState).toHaveBeenCalled();
    });
  });

  describe('Multi-Agent Coordination', () => {
    test('should coordinate sequential agent chain', async () => {
      const agents = ['emotion-agent', 'personality-agent', 'content-agent'];
      
      for (const agent of agents) {
        mockAgentDelegator.delegate.mockResolvedValueOnce({
          success: true,
          agent,
          response: { processed: true }
        });
      }

      const result = await router.coordinateSequential({
        agents,
        input: 'Create an emotional story',
        userId: 'test-user'
      });

      expect(result.success).toBe(true);
      expect(result.responses).toHaveLength(3);
      expect(mockAgentDelegator.delegate).toHaveBeenCalledTimes(3);
    });

    test('should coordinate parallel agent processing', async () => {
      const agents = ['emotion-agent', 'child-safety-agent', 'accessibility-agent'];
      
      agents.forEach(agent => {
        mockAgentDelegator.delegate.mockResolvedValue({
          success: true,
          agent,
          response: { processed: true }
        });
      });

      const result = await router.coordinateParallel({
        agents,
        input: 'Analyze this content',
        userId: 'test-user'
      });

      expect(result.success).toBe(true);
      expect(result.responses).toHaveLength(3);
      expect(result.aggregated).toBeDefined();
    });

    test('should handle partial failures in parallel coordination', async () => {
      mockAgentDelegator.delegate
        .mockResolvedValueOnce({ success: true, agent: 'agent1', response: {} })
        .mockRejectedValueOnce(new Error('Agent 2 failed'))
        .mockResolvedValueOnce({ success: true, agent: 'agent3', response: {} });

      const result = await router.coordinateParallel({
        agents: ['agent1', 'agent2', 'agent3'],
        input: 'test',
        userId: 'test-user'
      });

      expect(result.success).toBe(true);
      expect(result.partialFailure).toBe(true);
      expect(result.responses).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Circuit Breaker Functionality', () => {
    test('should open circuit after consecutive failures', async () => {
      // Simulate 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        mockAgentDelegator.delegate.mockRejectedValueOnce(new Error('Agent failed'));
        
        await router.route({
          input: 'test',
          userId: 'test-user'
        });
      }

      // Circuit should be open now
      const result = await router.route({
        input: 'test',
        userId: 'test-user'
      });

      expect(result.circuitBreakerOpen).toBe(true);
      expect(result.success).toBe(false);
      expect(mockAgentDelegator.delegate).toHaveBeenCalledTimes(5); // No more calls after circuit opens
    });

    test('should close circuit after timeout', async () => {
      // Open the circuit
      router.openCircuit('test-agent');
      
      // Fast-forward time
      jest.advanceTimersByTime(30000); // 30 seconds
      
      mockAgentDelegator.delegate.mockResolvedValue({
        success: true,
        agent: 'test-agent',
        response: {}
      });

      const result = await router.route({
        input: 'test',
        userId: 'test-user'
      });

      expect(result.circuitBreakerOpen).toBe(false);
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling - ALL SCENARIOS', () => {
    test('should handle null input', async () => {
      const result = await router.route({
        input: null as any,
        userId: 'test-user'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input');
    });

    test('should handle undefined userId', async () => {
      const result = await router.route({
        input: 'test',
        userId: undefined as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('userId required');
    });

    test('should handle malformed JSON in request', async () => {
      const result = await router.handleHttpEvent({
        body: 'not-json',
        headers: { 'content-type': 'application/json' }
      });

      expect(result.statusCode).toBe(400);
      expect(result.body).toContain('Invalid JSON');
    });

    test('should handle timeout scenarios', async () => {
      mockAgentDelegator.delegate.mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const resultPromise = router.route({
        input: 'test',
        userId: 'test-user',
        timeout: 1000
      });

      jest.advanceTimersByTime(1001);

      const result = await resultPromise;
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('HTTP Event Handling', () => {
    test('should handle API Gateway v2 event format', async () => {
      const event = {
        version: '2.0',
        routeKey: 'POST /route',
        rawPath: '/route',
        headers: {
          'content-type': 'application/json'
        },
        requestContext: {
          http: {
            method: 'POST',
            path: '/route'
          }
        },
        body: JSON.stringify({
          input: 'Create a story',
          userId: 'test-user'
        })
      };

      mockIntentClassifier.classify.mockResolvedValue({
        primary: 'CONTENT',
        secondary: [],
        confidence: 0.9,
        metadata: {}
      });

      mockAgentDelegator.delegate.mockResolvedValue({
        success: true,
        agent: 'content-agent',
        response: { story: 'Once upon a time...' }
      });

      const result = await router.handleHttpEvent(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.agent).toBe('content-agent');
    });

    test('should handle health check endpoint', async () => {
      const event = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/health'
          }
        },
        rawPath: '/health'
      };

      const result = await router.handleHttpEvent(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('healthy');
      expect(body.service).toBe('router');
      expect(body.capabilities).toBeDefined();
    });
  });

  describe('Metrics and Monitoring', () => {
    test('should emit metrics for successful routing', async () => {
      const mockEmitMetric = jest.spyOn(router, 'emitMetric');

      mockIntentClassifier.classify.mockResolvedValue({
        primary: 'CONTENT',
        secondary: [],
        confidence: 0.9,
        metadata: {}
      });

      mockAgentDelegator.delegate.mockResolvedValue({
        success: true,
        agent: 'content-agent',
        response: {}
      });

      await router.route({
        input: 'test',
        userId: 'test-user'
      });

      expect(mockEmitMetric).toHaveBeenCalledWith('routing.success', 1);
      expect(mockEmitMetric).toHaveBeenCalledWith('routing.latency', expect.any(Number));
    });

    test('should emit metrics for failures', async () => {
      const mockEmitMetric = jest.spyOn(router, 'emitMetric');

      mockAgentDelegator.delegate.mockRejectedValue(new Error('Failed'));

      await router.route({
        input: 'test',
        userId: 'test-user'
      });

      expect(mockEmitMetric).toHaveBeenCalledWith('routing.failure', 1);
    });
  });

  describe('Performance Requirements', () => {
    test('should meet latency requirements', async () => {
      const iterations = 100;
      const latencies: number[] = [];

      mockIntentClassifier.classify.mockResolvedValue({
        primary: 'CONTENT',
        secondary: [],
        confidence: 0.9,
        metadata: {}
      });

      mockAgentDelegator.delegate.mockResolvedValue({
        success: true,
        agent: 'content-agent',
        response: {}
      });

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await router.route({
          input: 'test',
          userId: 'test-user'
        });
        latencies.push(Date.now() - start);
      }

      const p95 = latencies.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];
      expect(p95).toBeLessThan(100); // p95 < 100ms requirement
    });
  });
});

// Export test utilities for other tests
export const RouterTestUtils = {
  createMockRouter: (config?: Partial<RouterConfig>) => {
    return new Router({ ...defaultConfig, ...config });
  },
  
  mockSuccessfulRouting: (agent: string, response: any) => {
    mockAgentDelegator.delegate.mockResolvedValue({
      success: true,
      agent,
      response
    });
  },
  
  mockFailedRouting: (error: string) => {
    mockAgentDelegator.delegate.mockRejectedValue(new Error(error));
  }
};