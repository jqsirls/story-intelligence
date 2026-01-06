/**
 * Kid Communication Intelligence Performance Tests
 * Tests system performance under various load conditions
 */

import { KidCommunicationIntelligenceService } from '@alexa-multi-agent/kid-communication-intelligence';
import { AudioInput, TranscriptionResult, ChildProfile } from '@alexa-multi-agent/kid-communication-intelligence';
import { createLogger } from '../../helpers/setup';

describe('Kid Intelligence Performance Tests', () => {
  let service: KidCommunicationIntelligenceService;
  let logger: any;

  beforeEach(async () => {
    logger = createLogger();
    service = new KidCommunicationIntelligenceService({
      enableAudioIntelligence: true,
      enableTestTimeAdaptation: true,
      enableMultimodal: true,
      enableDevelopmentalProcessing: true,
      enableInventedWordIntelligence: true,
      enableChildLogicInterpreter: true,
      enableEmotionalSpeechIntelligence: true,
      enableAdaptiveTranscription: true,
      enableContinuousPersonalization: true,
      enableConfidenceSystem: true,
      supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
    }, logger);
    await service.initialize();
  });

  describe('Transcription Enhancement Performance', () => {
    it('should process transcription within acceptable time (< 500ms)', async () => {
      const transcription: TranscriptionResult = {
        text: 'I want a wuggy for my story about a dragon',
        confidence: 0.85,
        language: 'en'
      };

      const startTime = Date.now();
      const enhanced = await service.enhanceTranscription(
        transcription,
        undefined,
        undefined,
        {
          conversationHistory: [],
          storyContext: { theme: 'adventure' }
        }
      );
      const duration = Date.now() - startTime;

      expect(enhanced).toBeDefined();
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });

    it('should handle batch transcription processing efficiently', async () => {
      const transcriptions: TranscriptionResult[] = Array.from({ length: 10 }, (_, i) => ({
        text: `Test transcription ${i} with invented word wuggy${i}`,
        confidence: 0.80 + (i * 0.01),
        language: 'en'
      }));

      const startTime = Date.now();
      const enhancedPromises = transcriptions.map(t =>
        service.enhanceTranscription(t, undefined, undefined, {
          conversationHistory: [],
          storyContext: { theme: 'adventure' }
        })
      );
      const enhanced = await Promise.all(enhancedPromises);
      const duration = Date.now() - startTime;

      expect(enhanced.length).toBe(10);
      expect(duration).toBeLessThan(2000); // Should process 10 transcriptions in under 2s
    });
  });

  describe('Concurrent Processing', () => {
    it('should handle concurrent transcription enhancements', async () => {
      const concurrentRequests = 20;
      const transcriptions: TranscriptionResult[] = Array.from({ length: concurrentRequests }, (_, i) => ({
        text: `Concurrent test ${i} with wuggy${i}`,
        confidence: 0.85,
        language: 'en'
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        transcriptions.map(t =>
          service.enhanceTranscription(t, undefined, undefined, {
            conversationHistory: [],
            storyContext: { theme: 'adventure' }
          })
        )
      );
      const duration = Date.now() - startTime;

      expect(results.length).toBe(concurrentRequests);
      expect(results.every(r => r !== undefined)).toBe(true);
      // Should handle 20 concurrent requests efficiently
      expect(duration).toBeLessThan(3000);
    });
  });
});
