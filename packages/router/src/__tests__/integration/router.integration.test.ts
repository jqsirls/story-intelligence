import { Router } from '../../Router';
import { IntentClassifier } from '../../services/IntentClassifier';
import { AgentDelegator } from '../../services/AgentDelegator';
import { ConversationStateManager } from '../../services/ConversationStateManager';
import { createClient } from 'redis';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

describe('Router Integration Tests', () => {
  let router: Router;
  let redisClient: any;
  let supabaseClient: any;

  beforeAll(async () => {
    // Setup Redis connection
    redisClient = createClient({
      url: global.testConfig.redisUrl
    });
    await redisClient.connect();

    // Setup Supabase connection
    supabaseClient = createSupabaseClient(
      global.testConfig.supabaseUrl,
      global.testConfig.supabaseAnonKey
    );

    // Initialize router with real dependencies
    const intentClassifier = new IntentClassifier({
      openaiApiKey: 'test-key'
    });

    const agentDelegator = new AgentDelegator({
      supabaseClient,
      timeout: 5000
    });

    const stateManager = new ConversationStateManager({
      redisClient
    });

    router = new Router({
      intentClassifier,
      agentDelegator,
      stateManager
    });
  });

  afterAll(async () => {
    if (redisClient) {
      await redisClient.disconnect();
    }
  });

  beforeEach(async () => {
    // Clear Redis state between tests
    await redisClient.flushdb();
  });

  describe('Story Creation Flow', () => {
    it('should handle complete story creation workflow', async () => {
      const userId = 'test-user-123';
      const sessionId = 'test-session-456';

      // Step 1: Initial story creation request
      const initialRequest = {
        userId,
        sessionId,
        input: "Let's create a bedtime story",
        context: {
          platform: 'alexa',
          locale: 'en-US'
        }
      };

      const initialResponse = await router.processRequest(initialRequest);

      expect(initialResponse).toMatchObject({
        success: true,
        intent: 'createStory',
        storyType: 'bedtime',
        response: expect.stringContaining('bedtime story')
      });

      // Step 2: Character creation
      const characterRequest = {
        userId,
        sessionId,
        input: "A brave little mouse named Charlie",
        context: {
          platform: 'alexa',
          locale: 'en-US',
          conversationPhase: 'character_creation'
        }
      };

      const characterResponse = await router.processRequest(characterRequest);

      expect(characterResponse).toMatchObject({
        success: true,
        intent: 'updateCharacter',
        response: expect.stringContaining('Charlie')
      });

      // Step 3: Story development
      const storyRequest = {
        userId,
        sessionId,
        input: "Charlie should go on an adventure in the forest",
        context: {
          platform: 'alexa',
          locale: 'en-US',
          conversationPhase: 'story_creation'
        }
      };

      const storyResponse = await router.processRequest(storyRequest);

      expect(storyResponse).toMatchObject({
        success: true,
        intent: 'continueStory',
        response: expect.stringContaining('forest')
      });

      // Step 4: Story finalization
      const finalizeRequest = {
        userId,
        sessionId,
        input: "That sounds perfect, let's finish the story",
        context: {
          platform: 'alexa',
          locale: 'en-US',
          conversationPhase: 'story_finalization'
        }
      };

      const finalizeResponse = await router.processRequest(finalizeRequest);

      expect(finalizeResponse).toMatchObject({
        success: true,
        intent: 'finalizeStory',
        response: expect.stringContaining('story is ready')
      });

      // Verify conversation state was maintained
      const conversationState = await router.getConversationState(userId, sessionId);
      expect(conversationState).toMatchObject({
        userId,
        sessionId,
        currentPhase: 'completed',
        character: expect.objectContaining({
          name: 'Charlie',
          species: 'mouse'
        }),
        story: expect.objectContaining({
          type: 'bedtime',
          setting: expect.stringContaining('forest')
        })
      });
    }, 30000);

    it('should handle conversation interruption and resumption', async () => {
      const userId = 'test-user-789';
      const sessionId = 'test-session-101';

      // Start story creation
      const startRequest = {
        userId,
        sessionId,
        input: "Create an adventure story",
        context: { platform: 'alexa', locale: 'en-US' }
      };

      await router.processRequest(startRequest);

      // Simulate interruption (user stops mid-conversation)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Resume conversation
      const resumeRequest = {
        userId,
        sessionId,
        input: "Continue where we left off",
        context: { platform: 'alexa', locale: 'en-US' }
      };

      const resumeResponse = await router.processRequest(resumeRequest);

      expect(resumeResponse).toMatchObject({
        success: true,
        intent: 'resumeConversation',
        response: expect.stringContaining('adventure story')
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle agent timeout gracefully', async () => {
      // Mock agent delegator to simulate timeout
      const timeoutRequest = {
        userId: 'test-user-timeout',
        sessionId: 'test-session-timeout',
        input: "Create a story that will timeout",
        context: { platform: 'alexa', locale: 'en-US' }
      };

      const response = await router.processRequest(timeoutRequest);

      expect(response).toMatchObject({
        success: false,
        error: expect.stringContaining('timeout'),
        fallbackResponse: expect.any(String)
      });
    });

    it('should handle invalid input gracefully', async () => {
      const invalidRequest = {
        userId: 'test-user-invalid',
        sessionId: 'test-session-invalid',
        input: "", // Empty input
        context: { platform: 'alexa', locale: 'en-US' }
      };

      const response = await router.processRequest(invalidRequest);

      expect(response).toMatchObject({
        success: false,
        error: expect.stringContaining('invalid input'),
        fallbackResponse: expect.any(String)
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 800ms for story creation', async () => {
      const startTime = Date.now();

      const request = {
        userId: 'test-user-perf',
        sessionId: 'test-session-perf',
        input: "Let's make a quick story",
        context: { platform: 'alexa', locale: 'en-US' }
      };

      const response = await router.processRequest(request);
      const duration = Date.now() - startTime;

      expect(response.success).toBe(true);
      expect(duration).toBeLessThan(800);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        userId: `test-user-concurrent-${i}`,
        sessionId: `test-session-concurrent-${i}`,
        input: `Create story ${i}`,
        context: { platform: 'alexa', locale: 'en-US' }
      }));

      const startTime = Date.now();
      const responses = await Promise.all(
        concurrentRequests.map(req => router.processRequest(req))
      );
      const duration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });

      // Should handle 10 concurrent requests in reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Production Environment Tests', () => {
    it('should validate production API endpoints', async () => {
      if (process.env.NODE_ENV !== 'production') {
        return; // Skip in non-production environments
      }

      const healthResponse = await fetch(`${global.testConfig.apiBaseUrl}/health`);
      expect(healthResponse.status).toBe(200);

      const routerHealthResponse = await fetch(`${global.testConfig.apiBaseUrl}/v1/router/health`);
      expect(routerHealthResponse.status).toBe(200);
    });

    it('should handle production load patterns', async () => {
      if (process.env.NODE_ENV !== 'production') {
        return; // Skip in non-production environments
      }

      // Simulate realistic production load
      const requests = Array.from({ length: 50 }, (_, i) => ({
        userId: `prod-user-${i}`,
        sessionId: `prod-session-${i}`,
        input: "Create a bedtime story for my child",
        context: { platform: 'alexa', locale: 'en-US' }
      }));

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => router.processRequest(req))
      );
      const duration = Date.now() - startTime;

      // Check success rate
      const successCount = responses.filter(r => r.success).length;
      const successRate = successCount / responses.length;

      expect(successRate).toBeGreaterThan(0.99); // 99% success rate
      expect(duration / requests.length).toBeLessThan(800); // Average under 800ms
    });
  });
});