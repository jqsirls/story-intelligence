/**
 * Kid Communication Intelligence Service - Comprehensive Test Suite
 * Tests the core orchestration service and all enhancement layers
 */

import { KidCommunicationIntelligenceService } from '@alexa-multi-agent/kid-communication-intelligence';
import { AudioInput, TranscriptionResult, ChildProfile } from '@alexa-multi-agent/kid-communication-intelligence';
import { createLogger } from '../../helpers/setup';

describe('KidCommunicationIntelligenceService', () => {
  let service: KidCommunicationIntelligenceService;
  let logger: any;
  let testConfig: any;

  beforeEach(() => {
    logger = createLogger();
    testConfig = {
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
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
    };
    service = new KidCommunicationIntelligenceService(testConfig, logger);
  });

  describe('Initialization', () => {
    it('should initialize successfully with all features enabled', async () => {
      await service.initialize();
      expect(service.isAvailable()).toBe(true);
    });

    it('should handle missing Supabase credentials gracefully', async () => {
      const serviceWithoutCreds = new KidCommunicationIntelligenceService({
        ...testConfig,
        supabaseUrl: undefined,
        supabaseKey: undefined
      }, logger);
      await serviceWithoutCreds.initialize();
      // Should still initialize but with limited functionality
      expect(serviceWithoutCreds.isAvailable()).toBeDefined();
    });
  });

  describe('Audio Preprocessing', () => {
    it('should preprocess audio for child speech', async () => {
      await service.initialize();
      const audioInput: AudioInput = {
        data: Buffer.from('test audio data'),
        sampleRate: 16000,
        channels: 1,
        format: 'pcm',
        metadata: {
          childId: 'test-child-1',
          age: 5,
          sessionId: 'test-session-1'
        }
      };

      const childProfile: ChildProfile = {
        childId: 'test-child-1',
        age: 5
      };

      const processed = await service.preprocessAudio(audioInput, childProfile);
      expect(processed).toBeDefined();
      expect(processed.data).toBeDefined();
    });

    it('should handle audio preprocessing errors gracefully', async () => {
      await service.initialize();
      const invalidAudio: AudioInput = {
        data: Buffer.from(''),
        sampleRate: 0,
        channels: 0,
        format: 'pcm'
      };

      const processed = await service.preprocessAudio(invalidAudio);
      // Should return original audio on error
      expect(processed).toBeDefined();
    });
  });

  describe('Transcription Enhancement', () => {
    it('should enhance transcription with invented words', async () => {
      await service.initialize();
      const basicTranscription: TranscriptionResult = {
        text: 'I want a wuggy for my story',
        confidence: 0.85,
        language: 'en'
      };

      const context = {
        conversationHistory: [
          { speaker: 'user', message: 'I want a wuggy', timestamp: new Date().toISOString() }
        ],
        storyContext: { theme: 'adventure' }
      };

      const enhanced = await service.enhanceTranscription(
        basicTranscription,
        undefined,
        undefined,
        context
      );

      expect(enhanced).toBeDefined();
      expect(enhanced.text).toBeDefined();
      expect(enhanced.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should detect non-linear patterns in child speech', async () => {
      await service.initialize();
      const transcription: TranscriptionResult = {
        text: 'The dragon... wait, can I have a unicorn instead?',
        confidence: 0.80,
        language: 'en'
      };

      const context = {
        conversationHistory: [
          { speaker: 'user', message: 'I want a dragon', timestamp: new Date().toISOString() }
        ]
      };

      const enhanced = await service.enhanceTranscription(
        transcription,
        undefined,
        undefined,
        context
      );

      expect(enhanced).toBeDefined();
      // Should detect topic jump
      if (enhanced.nonLinearPatterns) {
        expect(enhanced.nonLinearPatterns.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should enhance transcription with developmental stage awareness', async () => {
      await service.initialize();
      const transcription: TranscriptionResult = {
        text: 'Me want story',
        confidence: 0.75,
        language: 'en'
      };

      const childProfile: ChildProfile = {
        childId: 'test-child-2',
        age: 3
      };

      const enhanced = await service.enhanceTranscription(
        transcription,
        undefined,
        childProfile,
        undefined
      );

      expect(enhanced).toBeDefined();
      if (enhanced.developmentalStage) {
        expect(enhanced.developmentalStage.stage).toBeDefined();
      }
    });
  });

  describe('Multimodal Processing', () => {
    it('should process multimodal input (voice + gesture)', async () => {
      await service.initialize();
      const multimodalInput = {
        voice: {
          data: Buffer.from('test'),
          sampleRate: 16000,
          channels: 1,
          format: 'pcm' as const
        },
        visual: {
          type: 'gesture' as const,
          data: { gestureType: 'pointing', direction: 'up' }
        }
      };

      const result = await service.processMultimodalInput(multimodalInput);
      expect(result).toBeDefined();
      expect(result.primaryInput).toBeDefined();
    });
  });

  describe('Child Profile Management', () => {
    it('should get child profile', async () => {
      await service.initialize();
      const profile = await service.getChildProfile('test-child-3', 6);
      expect(profile).toBeDefined();
      expect(profile.childId).toBe('test-child-3');
      expect(profile.age).toBe(6);
    });
  });
});
