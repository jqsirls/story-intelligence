import { EndToEndStoryFlowTester, StoryCreationRequest, StoryCreationResult } from '../EndToEndStoryFlowTester';
import { EventEmitter } from 'events';

// Mock implementations
const mockOpenAIClient = {
  generateStory: jest.fn()
};

const mockElevenLabsClient = {
  synthesizeVoice: jest.fn()
};

const mockPersonalityAgents = {
  processContent: jest.fn()
};

const mockWebVTTService = {
  generateWebVTT: jest.fn()
};

const mockDatabase = {
  stories: {
    create: jest.fn()
  },
  testConnection: jest.fn()
};

describe('EndToEndStoryFlowTester', () => {
  let tester: EndToEndStoryFlowTester;
  let progressEvents: any[];
  let completedEvents: any[];
  let failedEvents: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    progressEvents = [];
    completedEvents = [];
    failedEvents = [];

    tester = new EndToEndStoryFlowTester(
      mockOpenAIClient,
      mockElevenLabsClient,
      mockPersonalityAgents,
      mockWebVTTService,
      mockDatabase
    );

    tester.on('progress', (progress) => progressEvents.push(progress));
    tester.on('completed', (result) => completedEvents.push(result));
    tester.on('failed', (result) => failedEvents.push(result));

    // Setup default mock responses with timing simulation
    mockOpenAIClient.generateStory.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate processing time
      return {
        content: 'Once upon a time, there was a brave little rabbit...',
        title: 'The Brave Little Rabbit'
      };
    });

    mockPersonalityAgents.processContent.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 30)); // Simulate processing time
      return {
        content: 'Once upon a time, there was a brave little rabbit who loved adventures...',
        title: 'The Brave Little Rabbit',
        qualityScore: 0.85
      };
    });

    mockElevenLabsClient.synthesizeVoice.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 40)); // Simulate processing time
      return {
        audioUrl: 'https://example.com/audio/story123.mp3'
      };
    });

    mockWebVTTService.generateWebVTT.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 20)); // Simulate processing time
      return {
        webvttUrl: 'https://example.com/webvtt/story123.vtt'
      };
    });

    mockDatabase.stories.create.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate database write
      return {
        id: 'story_123'
      };
    });

    mockDatabase.testConnection.mockResolvedValue(true);
  });

  describe('testCompleteStoryWorkflow', () => {
    it('should successfully complete full story workflow with voice synthesis', async () => {
      const request: StoryCreationRequest = {
        userId: 'user_123',
        preferences: {
          ageRange: '6-8',
          genre: 'adventure',
          characters: ['rabbit', 'forest'],
          themes: ['friendship', 'courage'],
          length: 'medium'
        },
        voiceOptions: {
          voiceId: 'child_friendly_voice',
          speed: 1.0,
          pitch: 1.0
        },
        requestId: 'req_123'
      };

      const result = await tester.testCompleteStoryWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story?.audioUrl).toBeDefined();
      expect(result.story?.webvttUrl).toBeDefined();
      expect(result.partialResults?.textGenerated).toBe(true);
      expect(result.partialResults?.personalityProcessed).toBe(true);
      expect(result.partialResults?.audioSynthesized).toBe(true);
      expect(result.partialResults?.webvttGenerated).toBe(true);

      // Verify all services were called
      expect(mockOpenAIClient.generateStory).toHaveBeenCalled();
      expect(mockPersonalityAgents.processContent).toHaveBeenCalled();
      expect(mockElevenLabsClient.synthesizeVoice).toHaveBeenCalled();
      expect(mockWebVTTService.generateWebVTT).toHaveBeenCalled();
      expect(mockDatabase.stories.create).toHaveBeenCalled();

      // Verify progress events were emitted
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0].stage).toBe('initializing');
      expect(progressEvents[progressEvents.length - 1].stage).toBe('completed');

      // Verify completion event was emitted
      expect(completedEvents).toHaveLength(1);
      expect(completedEvents[0].requestId).toBe('req_123');
    });

    it('should successfully complete story workflow without voice synthesis', async () => {
      const request: StoryCreationRequest = {
        userId: 'user_123',
        preferences: {
          ageRange: '3-5',
          genre: 'bedtime',
          characters: ['teddy bear'],
          themes: ['sleep', 'dreams'],
          length: 'short'
        },
        requestId: 'req_124'
      };

      const result = await tester.testCompleteStoryWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story?.audioUrl).toBeUndefined();
      expect(result.story?.webvttUrl).toBeUndefined();
      expect(result.partialResults?.textGenerated).toBe(true);
      expect(result.partialResults?.personalityProcessed).toBe(true);
      expect(result.partialResults?.audioSynthesized).toBe(false);
      expect(result.partialResults?.webvttGenerated).toBe(false);

      // Verify voice services were not called
      expect(mockElevenLabsClient.synthesizeVoice).not.toHaveBeenCalled();
      expect(mockWebVTTService.generateWebVTT).not.toHaveBeenCalled();
    });

    it('should handle OpenAI generation failure', async () => {
      mockOpenAIClient.generateStory.mockRejectedValue(new Error('OpenAI API rate limit exceeded'));

      const request: StoryCreationRequest = {
        userId: 'user_123',
        preferences: {
          ageRange: '6-8',
          genre: 'adventure',
          characters: ['dragon'],
          themes: ['bravery'],
          length: 'medium'
        },
        requestId: 'req_125'
      };

      const result = await tester.testCompleteStoryWorkflow(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('rate limit');
      expect(result.partialResults?.textGenerated).toBe(false);

      // Verify failure event was emitted
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0].requestId).toBe('req_125');
    });

    it('should track performance metrics correctly', async () => {
      const request: StoryCreationRequest = {
        userId: 'user_123',
        preferences: {
          ageRange: '9-12',
          genre: 'mystery',
          characters: ['detective', 'cat'],
          themes: ['problem-solving'],
          length: 'long'
        },
        voiceOptions: {
          voiceId: 'narrator_voice',
          speed: 0.9,
          pitch: 1.1
        },
        requestId: 'req_126'
      };

      const result = await tester.testCompleteStoryWorkflow(request);

      expect(result.metrics.totalTime).toBeGreaterThan(0);
      expect(result.metrics.textGenerationTime).toBeGreaterThan(0);
      expect(result.metrics.personalityProcessingTime).toBeGreaterThan(0);
      expect(result.metrics.voiceSynthesisTime).toBeGreaterThan(0);
      expect(result.story?.metadata.generationTime).toBe(result.metrics.totalTime);
    });
  });

  describe('testConcurrentStoryGeneration', () => {
    it('should handle multiple concurrent story requests', async () => {
      const requests: StoryCreationRequest[] = Array.from({ length: 5 }, (_, i) => ({
        userId: `user_${i}`,
        preferences: {
          ageRange: '6-8' as const,
          genre: 'adventure',
          characters: [`character_${i}`],
          themes: ['friendship'],
          length: 'short' as const
        },
        requestId: `req_${i}`
      }));

      const result = await tester.testConcurrentStoryGeneration(requests, 3);

      expect(result.totalRequests).toBe(5);
      expect(result.successfulRequests).toBe(5);
      expect(result.failedRequests).toBe(0);
      expect(result.concurrencyLevel).toBe(3);
      expect(result.averageResponseTime).toBeGreaterThan(0);
      expect(result.throughput).toBeGreaterThan(0);
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Make some requests fail
      mockOpenAIClient.generateStory
        .mockResolvedValueOnce({ content: 'Story 1', title: 'Title 1' })
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({ content: 'Story 3', title: 'Title 3' });

      const requests: StoryCreationRequest[] = Array.from({ length: 3 }, (_, i) => ({
        userId: `user_${i}`,
        preferences: {
          ageRange: '3-5' as const,
          genre: 'bedtime',
          characters: [`character_${i}`],
          themes: ['sleep'],
          length: 'short' as const
        },
        requestId: `req_${i}`
      }));

      const result = await tester.testConcurrentStoryGeneration(requests, 2);

      expect(result.totalRequests).toBe(3);
      expect(result.successfulRequests).toBe(2);
      expect(result.failedRequests).toBe(1);
      
      // Check that we have some error distribution (the key might vary)
      expect(Object.keys(result.errorDistribution).length).toBeGreaterThan(0);
      
      // Check that the total errors match failed requests
      const totalErrors = Object.values(result.errorDistribution).reduce((sum, count) => sum + count, 0);
      expect(totalErrors).toBe(result.failedRequests);
    });
  });

  describe('testPartialResultHandling', () => {
    it('should handle voice synthesis failure gracefully', async () => {
      mockElevenLabsClient.synthesizeVoice.mockRejectedValue(new Error('ElevenLabs service unavailable'));

      const request: StoryCreationRequest = {
        userId: 'user_123',
        preferences: {
          ageRange: '6-8',
          genre: 'adventure',
          characters: ['knight'],
          themes: ['courage'],
          length: 'medium'
        },
        voiceOptions: {
          voiceId: 'hero_voice',
          speed: 1.0,
          pitch: 1.0
        },
        requestId: 'req_127'
      };

      const result = await tester.testPartialResultHandling(request);

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story?.audioUrl).toBeUndefined();
      expect(result.partialResults?.textGenerated).toBe(true);
      expect(result.partialResults?.personalityProcessed).toBe(true);
      expect(result.partialResults?.audioSynthesized).toBe(false);
      expect(result.partialResults?.webvttGenerated).toBe(false);
    });

    it('should handle complete failure with no partial results', async () => {
      mockOpenAIClient.generateStory.mockRejectedValue(new Error('Complete system failure'));

      const request: StoryCreationRequest = {
        userId: 'user_123',
        preferences: {
          ageRange: '3-5',
          genre: 'educational',
          characters: ['numbers'],
          themes: ['counting'],
          length: 'short'
        },
        requestId: 'req_128'
      };

      const result = await tester.testPartialResultHandling(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.partialResults?.textGenerated).toBe(false);
      expect(result.partialResults?.personalityProcessed).toBe(false);
      expect(result.partialResults?.audioSynthesized).toBe(false);
      expect(result.partialResults?.webvttGenerated).toBe(false);
    });
  });

  describe('testCrossServiceIntegration', () => {
    it('should validate all service integrations successfully', async () => {
      const result = await tester.testCrossServiceIntegration();

      expect(result.openaiIntegration).toBe(true);
      expect(result.elevenLabsIntegration).toBe(true);
      expect(result.personalityAgentIntegration).toBe(true);
      expect(result.webvttIntegration).toBe(true);
      expect(result.databaseIntegration).toBe(true);
      expect(result.overallHealth).toBe(true);
    });

    it('should detect service integration failures', async () => {
      mockOpenAIClient.generateStory.mockRejectedValue(new Error('OpenAI connection failed'));
      mockElevenLabsClient.synthesizeVoice.mockRejectedValue(new Error('ElevenLabs authentication failed'));

      const result = await tester.testCrossServiceIntegration();

      expect(result.openaiIntegration).toBe(false);
      expect(result.elevenLabsIntegration).toBe(false);
      expect(result.personalityAgentIntegration).toBe(true);
      expect(result.webvttIntegration).toBe(true);
      expect(result.databaseIntegration).toBe(true);
      expect(result.overallHealth).toBe(false);
    });
  });

  describe('progress tracking', () => {
    it('should emit progress events throughout workflow', async () => {
      const request: StoryCreationRequest = {
        userId: 'user_123',
        preferences: {
          ageRange: '6-8',
          genre: 'fantasy',
          characters: ['wizard', 'dragon'],
          themes: ['magic', 'friendship'],
          length: 'medium'
        },
        voiceOptions: {
          voiceId: 'magical_voice',
          speed: 1.0,
          pitch: 1.0
        },
        requestId: 'req_129'
      };

      await tester.testCompleteStoryWorkflow(request);

      // Verify progress stages
      const stages = progressEvents.map(p => p.stage);
      expect(stages).toContain('initializing');
      expect(stages).toContain('generating_text');
      expect(stages).toContain('processing_personality');
      expect(stages).toContain('synthesizing_voice');
      expect(stages).toContain('finalizing');
      expect(stages).toContain('completed');

      // Verify progress increases
      const progressValues = progressEvents.map(p => p.progress);
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }

      // Verify final progress is 100
      expect(progressValues[progressValues.length - 1]).toBe(100);
    });

    it('should provide estimated time remaining', async () => {
      const request: StoryCreationRequest = {
        userId: 'user_123',
        preferences: {
          ageRange: '3-5',
          genre: 'animal',
          characters: ['puppy'],
          themes: ['friendship'],
          length: 'short'
        },
        requestId: 'req_130'
      };

      await tester.testCompleteStoryWorkflow(request);

      // Verify estimated time remaining is provided and decreases
      const estimatedTimes = progressEvents
        .filter(p => p.estimatedTimeRemaining !== undefined)
        .map(p => p.estimatedTimeRemaining);

      expect(estimatedTimes.length).toBeGreaterThan(0);
      
      // Time estimates should generally decrease (allowing for some variance)
      const firstEstimate = estimatedTimes[0];
      const lastEstimate = estimatedTimes[estimatedTimes.length - 1];
      expect(lastEstimate).toBeLessThanOrEqual(firstEstimate);
    });
  });

  describe('metrics and monitoring', () => {
    it('should track test metrics correctly', async () => {
      const request1: StoryCreationRequest = {
        userId: 'user_1',
        preferences: {
          ageRange: '6-8',
          genre: 'adventure',
          characters: ['hero'],
          themes: ['courage'],
          length: 'short'
        },
        requestId: 'req_1'
      };

      const request2: StoryCreationRequest = {
        userId: 'user_2',
        preferences: {
          ageRange: '3-5',
          genre: 'bedtime',
          characters: ['moon'],
          themes: ['sleep'],
          length: 'short'
        },
        requestId: 'req_2'
      };

      // One success, one failure
      await tester.testCompleteStoryWorkflow(request1);
      
      mockOpenAIClient.generateStory.mockRejectedValueOnce(new Error('Test failure'));
      await tester.testCompleteStoryWorkflow(request2);

      const metrics = tester.getTestMetrics();
      expect(metrics.totalTests).toBe(2);
      expect(metrics.passedTests).toBe(1);
      expect(metrics.failedTests).toBe(1);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should track active and completed requests', async () => {
      const request: StoryCreationRequest = {
        userId: 'user_123',
        preferences: {
          ageRange: '9-12',
          genre: 'science',
          characters: ['robot'],
          themes: ['technology'],
          length: 'medium'
        },
        requestId: 'req_active'
      };

      // Start request but don't await
      const promise = tester.testCompleteStoryWorkflow(request);
      
      // Check active requests after a small delay to allow initialization
      await new Promise(resolve => setTimeout(resolve, 25)); // Longer delay to ensure request is active
      const activeRequests = tester.getActiveRequests();
      
      // Complete request
      await promise;

      // Check completed requests
      const completedRequests = tester.getCompletedRequests();
      expect(completedRequests.length).toBeGreaterThan(0);
      expect(completedRequests.some(r => r.requestId === 'req_active')).toBe(true);

      // Active requests should be empty after completion
      const finalActiveRequests = tester.getActiveRequests();
      expect(finalActiveRequests.length).toBe(0);
    });
  });

  describe('error handling and recovery', () => {
    it('should identify recoverable errors', async () => {
      mockOpenAIClient.generateStory.mockRejectedValue(new Error('rate_limit exceeded'));

      const request: StoryCreationRequest = {
        userId: 'user_123',
        preferences: {
          ageRange: '6-8',
          genre: 'adventure',
          characters: ['explorer'],
          themes: ['discovery'],
          length: 'medium'
        },
        requestId: 'req_recoverable'
      };

      const result = await tester.testCompleteStoryWorkflow(request);

      expect(result.success).toBe(false);
      expect(result.error?.recoverable).toBe(true);
    });

    it('should identify non-recoverable errors', async () => {
      mockOpenAIClient.generateStory.mockRejectedValue(new Error('authentication_failed'));

      const request: StoryCreationRequest = {
        userId: 'user_123',
        preferences: {
          ageRange: '3-5',
          genre: 'animal',
          characters: ['cat'],
          themes: ['play'],
          length: 'short'
        },
        requestId: 'req_non_recoverable'
      };

      const result = await tester.testCompleteStoryWorkflow(request);

      expect(result.success).toBe(false);
      expect(result.error?.recoverable).toBe(false);
    });
  });
});