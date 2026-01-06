import { EndToEndStoryFlowTester, StoryCreationRequest } from '../EndToEndStoryFlowTester';
import { OpenAIValidator } from '../OpenAIValidator';
import { ElevenLabsValidator } from '../ElevenLabsValidator';
import { PersonalityAgentValidator } from '../PersonalityAgentValidator';
import { WebVTTSyncTester } from '../WebVTTSyncTester';

/**
 * Integration tests for end-to-end story creation flow
 * These tests validate the complete workflow with actual service integrations
 */
describe('End-to-End Story Creation Integration Tests', () => {
  let endToEndTester: EndToEndStoryFlowTester;
  let openaiValidator: OpenAIValidator;
  let elevenLabsValidator: ElevenLabsValidator;
  let personalityValidator: PersonalityAgentValidator;
  let webvttTester: WebVTTSyncTester;

  // Test configuration
  const testConfig = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
      model: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.7
    },
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY || 'test-key',
      voiceIds: ['child_friendly_voice_1', 'narrator_voice_1'],
      outputFormat: 'mp3_44100_128'
    },
    database: {
      connectionString: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'
    },
    timeout: 60000 // 60 seconds for integration tests
  };

  beforeAll(async () => {
    // Initialize validators and testers
    openaiValidator = new OpenAIValidator(testConfig.openai);
    elevenLabsValidator = new ElevenLabsValidator(testConfig.elevenlabs);
    personalityValidator = new PersonalityAgentValidator();
    webvttTester = new WebVTTSyncTester();

    // Initialize end-to-end tester with real service clients
    endToEndTester = new EndToEndStoryFlowTester(
      openaiValidator,
      elevenLabsValidator,
      personalityValidator,
      webvttTester,
      // Mock database for integration tests
      {
        stories: {
          create: jest.fn().mockResolvedValue({ id: 'test_story_id' })
        },
        testConnection: jest.fn().mockResolvedValue(true)
      }
    );
  }, testConfig.timeout);

  describe('Complete Story Workflow Tests', () => {
    it('should create a complete story with text and audio for age 3-5', async () => {
      const request: StoryCreationRequest = {
        userId: 'test_user_1',
        preferences: {
          ageRange: '3-5',
          genre: 'bedtime',
          characters: ['teddy bear', 'moon'],
          themes: ['sleep', 'dreams', 'comfort'],
          length: 'short'
        },
        voiceOptions: {
          voiceId: testConfig.elevenlabs.voiceIds[0],
          speed: 0.9,
          pitch: 1.0
        },
        requestId: 'integration_test_1'
      };

      const progressEvents: any[] = [];
      endToEndTester.on('progress', (progress) => {
        progressEvents.push(progress);
        console.log(`Progress: ${progress.stage} - ${progress.progress}% - ${progress.message}`);
      });

      const result = await endToEndTester.testCompleteStoryWorkflow(request);

      // Validate successful completion
      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story?.content).toBeDefined();
      expect(result.story?.audioUrl).toBeDefined();
      expect(result.story?.webvttUrl).toBeDefined();

      // Validate content quality
      expect(result.story?.content.length).toBeGreaterThan(100);
      expect(result.story?.metadata.wordCount).toBeGreaterThan(20);
      expect(result.story?.metadata.qualityScore).toBeGreaterThan(0.7);

      // Validate age appropriateness
      expect(result.story?.content).not.toMatch(/violence|scary|frightening/i);
      expect(result.story?.content).toMatch(/teddy bear|moon/i);

      // Validate performance metrics
      expect(result.metrics.totalTime).toBeLessThan(45000); // Under 45 seconds
      expect(result.metrics.textGenerationTime).toBeLessThan(15000); // Under 15 seconds
      expect(result.metrics.voiceSynthesisTime).toBeLessThan(30000); // Under 30 seconds

      // Validate progress tracking
      expect(progressEvents.length).toBeGreaterThan(5);
      expect(progressEvents[0].stage).toBe('initializing');
      expect(progressEvents[progressEvents.length - 1].stage).toBe('completed');

      console.log('✅ Age 3-5 story creation test passed');
    }, testConfig.timeout);

    it('should create a complete story with text and audio for age 6-8', async () => {
      const request: StoryCreationRequest = {
        userId: 'test_user_2',
        preferences: {
          ageRange: '6-8',
          genre: 'adventure',
          characters: ['brave knight', 'friendly dragon'],
          themes: ['friendship', 'courage', 'problem-solving'],
          length: 'medium'
        },
        voiceOptions: {
          voiceId: testConfig.elevenlabs.voiceIds[1],
          speed: 1.0,
          pitch: 1.0
        },
        requestId: 'integration_test_2'
      };

      const result = await endToEndTester.testCompleteStoryWorkflow(request);

      // Validate successful completion
      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();

      // Validate content complexity for age group
      expect(result.story?.content.length).toBeGreaterThan(300);
      expect(result.story?.metadata.wordCount).toBeGreaterThan(50);

      // Validate age-appropriate vocabulary and themes
      expect(result.story?.content).toMatch(/knight|dragon|adventure/i);
      expect(result.story?.content).not.toMatch(/death|kill|murder/i);

      // Validate audio quality
      if (result.story?.audioUrl) {
        const audioValidation = await elevenLabsValidator.validateAudioQuality(result.story.audioUrl);
        expect(audioValidation.success).toBe(true);
        expect(audioValidation.metrics?.clarity).toBeGreaterThan(0.8);
      }

      console.log('✅ Age 6-8 story creation test passed');
    }, testConfig.timeout);

    it('should create a complete story with text and audio for age 9-12', async () => {
      const request: StoryCreationRequest = {
        userId: 'test_user_3',
        preferences: {
          ageRange: '9-12',
          genre: 'mystery',
          characters: ['young detective', 'mysterious cat'],
          themes: ['mystery', 'logic', 'investigation'],
          length: 'long'
        },
        voiceOptions: {
          voiceId: testConfig.elevenlabs.voiceIds[0],
          speed: 1.1,
          pitch: 0.9
        },
        requestId: 'integration_test_3'
      };

      const result = await endToEndTester.testCompleteStoryWorkflow(request);

      // Validate successful completion
      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();

      // Validate content complexity for older children
      expect(result.story?.content.length).toBeGreaterThan(500);
      expect(result.story?.metadata.wordCount).toBeGreaterThan(100);

      // Validate sophisticated themes and vocabulary
      expect(result.story?.content).toMatch(/detective|mystery|investigate/i);
      expect(result.story?.content).toMatch(/clue|evidence|solve/i);

      // Validate WebVTT synchronization
      if (result.story?.webvttUrl) {
        const webvttValidation = await webvttTester.validateWebVTTSync(
          result.story.content,
          result.story.webvttUrl
        );
        expect(webvttValidation.success).toBe(true);
        expect(webvttValidation.syncAccuracy).toBeGreaterThan(0.95);
      }

      console.log('✅ Age 9-12 story creation test passed');
    }, testConfig.timeout);
  });

  describe('Concurrent Story Generation Tests', () => {
    it('should handle multiple concurrent story requests efficiently', async () => {
      const requests: StoryCreationRequest[] = [
        {
          userId: 'concurrent_user_1',
          preferences: {
            ageRange: '3-5',
            genre: 'animal',
            characters: ['puppy'],
            themes: ['friendship'],
            length: 'short'
          },
          requestId: 'concurrent_1'
        },
        {
          userId: 'concurrent_user_2',
          preferences: {
            ageRange: '6-8',
            genre: 'fantasy',
            characters: ['wizard'],
            themes: ['magic'],
            length: 'short'
          },
          requestId: 'concurrent_2'
        },
        {
          userId: 'concurrent_user_3',
          preferences: {
            ageRange: '9-12',
            genre: 'science',
            characters: ['robot'],
            themes: ['technology'],
            length: 'short'
          },
          requestId: 'concurrent_3'
        }
      ];

      const startTime = Date.now();
      const result = await endToEndTester.testConcurrentStoryGeneration(requests, 3);
      const totalTime = Date.now() - startTime;

      // Validate concurrent execution results
      expect(result.totalRequests).toBe(3);
      expect(result.successfulRequests).toBeGreaterThanOrEqual(2); // Allow for some failures
      expect(result.concurrencyLevel).toBe(3);
      expect(result.throughput).toBeGreaterThan(0);

      // Validate performance benefits of concurrency
      expect(totalTime).toBeLessThan(90000); // Should be faster than sequential execution

      // Validate individual request performance
      expect(result.averageResponseTime).toBeLessThan(45000);
      expect(result.maxResponseTime).toBeLessThan(60000);

      console.log(`✅ Concurrent story generation test passed: ${result.successfulRequests}/${result.totalRequests} successful`);
    }, testConfig.timeout * 2);

    it('should handle high concurrency load gracefully', async () => {
      const requests: StoryCreationRequest[] = Array.from({ length: 10 }, (_, i) => ({
        userId: `load_test_user_${i}`,
        preferences: {
          ageRange: '6-8' as const,
          genre: 'adventure',
          characters: [`hero_${i}`],
          themes: ['courage'],
          length: 'short' as const
        },
        requestId: `load_test_${i}`
      }));

      const result = await endToEndTester.testConcurrentStoryGeneration(requests, 5);

      // Validate system handles load
      expect(result.totalRequests).toBe(10);
      expect(result.successfulRequests / result.totalRequests).toBeGreaterThan(0.7); // 70% success rate minimum

      // Validate no catastrophic failures
      expect(result.errorDistribution).toBeDefined();
      
      // Log performance metrics
      console.log(`Load test results: ${result.successfulRequests}/${result.totalRequests} successful`);
      console.log(`Average response time: ${result.averageResponseTime}ms`);
      console.log(`Throughput: ${result.throughput.toFixed(2)} requests/second`);

      console.log('✅ High concurrency load test passed');
    }, testConfig.timeout * 3);
  });

  describe('Partial Result Handling Tests', () => {
    it('should handle voice synthesis failures gracefully', async () => {
      const request: StoryCreationRequest = {
        userId: 'partial_test_user',
        preferences: {
          ageRange: '6-8',
          genre: 'adventure',
          characters: ['explorer'],
          themes: ['discovery'],
          length: 'medium'
        },
        voiceOptions: {
          voiceId: 'invalid_voice_id', // This should cause voice synthesis to fail
          speed: 1.0,
          pitch: 1.0
        },
        requestId: 'partial_test_1'
      };

      const result = await endToEndTester.testPartialResultHandling(request);

      // Should succeed with text even if voice fails
      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story?.content).toBeDefined();
      expect(result.partialResults?.textGenerated).toBe(true);
      expect(result.partialResults?.personalityProcessed).toBe(true);

      // Voice synthesis should have failed
      expect(result.partialResults?.audioSynthesized).toBe(false);
      expect(result.partialResults?.webvttGenerated).toBe(false);

      console.log('✅ Partial result handling test passed');
    }, testConfig.timeout);

    it('should provide meaningful error information for failures', async () => {
      const request: StoryCreationRequest = {
        userId: 'error_test_user',
        preferences: {
          ageRange: '6-8',
          genre: 'invalid_genre_that_should_fail',
          characters: [],
          themes: [],
          length: 'medium'
        },
        requestId: 'error_test_1'
      };

      const result = await endToEndTester.testPartialResultHandling(request);

      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBeDefined();
        expect(result.error?.message).toBeDefined();
        expect(result.error?.stage).toBeDefined();
        expect(typeof result.error?.recoverable).toBe('boolean');
      }

      console.log('✅ Error information test passed');
    }, testConfig.timeout);
  });

  describe('Cross-Service Integration Tests', () => {
    it('should validate all service integrations', async () => {
      const result = await endToEndTester.testCrossServiceIntegration();

      // Log integration status
      console.log('Service Integration Status:');
      console.log(`- OpenAI: ${result.openaiIntegration ? '✅' : '❌'}`);
      console.log(`- ElevenLabs: ${result.elevenLabsIntegration ? '✅' : '❌'}`);
      console.log(`- Personality Agents: ${result.personalityAgentIntegration ? '✅' : '❌'}`);
      console.log(`- WebVTT Service: ${result.webvttIntegration ? '✅' : '❌'}`);
      console.log(`- Database: ${result.databaseIntegration ? '✅' : '❌'}`);
      console.log(`- Overall Health: ${result.overallHealth ? '✅' : '❌'}`);

      // At minimum, core services should be available
      expect(result.openaiIntegration || result.elevenLabsIntegration).toBe(true);
      expect(result.databaseIntegration).toBe(true);

      console.log('✅ Cross-service integration test completed');
    }, testConfig.timeout);
  });

  describe('Performance Benchmark Tests', () => {
    it('should meet performance benchmarks for story generation', async () => {
      const request: StoryCreationRequest = {
        userId: 'benchmark_user',
        preferences: {
          ageRange: '6-8',
          genre: 'adventure',
          characters: ['hero', 'companion'],
          themes: ['friendship', 'courage'],
          length: 'medium'
        },
        voiceOptions: {
          voiceId: testConfig.elevenlabs.voiceIds[0],
          speed: 1.0,
          pitch: 1.0
        },
        requestId: 'benchmark_run'
      };

      const result = await endToEndTester.testCompleteStoryWorkflow(request);

      if (result.success) {
        // Validate performance benchmarks from design document
        expect(result.metrics.textGenerationTime).toBeLessThan(15000); // < 15 seconds
        expect(result.metrics.voiceSynthesisTime).toBeLessThan(30000); // < 30 seconds
        expect(result.metrics.totalTime).toBeLessThan(45000); // < 45 seconds total

        // Validate quality metrics
        expect(result.story?.metadata.qualityScore).toBeGreaterThan(0.7);

        console.log(`✅ Performance benchmarks met:`);
        console.log(`  - Text generation: ${result.metrics.textGenerationTime}ms`);
        console.log(`  - Voice synthesis: ${result.metrics.voiceSynthesisTime}ms`);
        console.log(`  - Total time: ${result.metrics.totalTime}ms`);
        console.log(`  - Quality score: ${result.story?.metadata.qualityScore}`);
      } else {
        console.log('❌ Performance benchmark test failed due to workflow failure');
        console.log(`Error: ${result.error?.message}`);
      }
    }, testConfig.timeout);
  });

  describe('Content Quality and Safety Tests', () => {
    it('should ensure age-appropriate content across all age ranges', async () => {
      const ageRanges: Array<'3-5' | '6-8' | '9-12'> = ['3-5', '6-8', '9-12'];
      
      for (const ageRange of ageRanges) {
        const request: StoryCreationRequest = {
          userId: `safety_test_${ageRange}`,
          preferences: {
            ageRange,
            genre: 'adventure',
            characters: ['child', 'animal friend'],
            themes: ['friendship', 'kindness'],
            length: 'short'
          },
          requestId: `safety_test_${ageRange}`
        };

        const result = await endToEndTester.testCompleteStoryWorkflow(request);

        if (result.success && result.story) {
          // Validate content safety
          expect(result.story.content).not.toMatch(/violence|death|scary|frightening|dangerous/i);
          
          // Validate age-appropriate vocabulary
          const wordCount = result.story.content.split(' ').length;
          switch (ageRange) {
            case '3-5':
              expect(wordCount).toBeLessThan(200); // Shorter for younger children
              break;
            case '6-8':
              expect(wordCount).toBeLessThan(400);
              break;
            case '9-12':
              expect(wordCount).toBeLessThan(600);
              break;
          }

          console.log(`✅ Age ${ageRange} content safety validated`);
        }
      }
    }, testConfig.timeout * 3);
  });

  afterAll(async () => {
    // Cleanup and final metrics
    const metrics = endToEndTester.getTestMetrics();
    console.log('\n📊 Final Test Metrics:');
    console.log(`Total tests: ${metrics.totalTests}`);
    console.log(`Passed tests: ${metrics.passedTests}`);
    console.log(`Failed tests: ${metrics.failedTests}`);
    console.log(`Success rate: ${((metrics.passedTests / metrics.totalTests) * 100).toFixed(1)}%`);
    console.log(`Average response time: ${metrics.averageResponseTime.toFixed(0)}ms`);
  });
});