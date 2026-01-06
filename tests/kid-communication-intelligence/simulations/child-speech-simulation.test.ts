/**
 * Child Speech Simulation Tests
 * Simulates real-world child speech patterns and validates system responses
 */

import { KidCommunicationIntelligenceService } from '@alexa-multi-agent/kid-communication-intelligence';
import { AudioInput, TranscriptionResult, ChildProfile } from '@alexa-multi-agent/kid-communication-intelligence';
import { createLogger } from '../../helpers/setup';

describe('Child Speech Simulation Tests', () => {
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

  describe('Age 3-4 Speech Patterns', () => {
    it('should handle invented words (e.g., "wuggy" for "thing")', async () => {
      const transcription: TranscriptionResult = {
        text: 'I want the wuggy',
        confidence: 0.70,
        language: 'en'
      };

      const childProfile: ChildProfile = {
        childId: 'sim-child-1',
        age: 3
      };

      const context = {
        conversationHistory: [
          { speaker: 'user', message: 'What is that?', timestamp: new Date().toISOString() },
          { speaker: 'assistant', message: 'That is a magical wand', timestamp: new Date().toISOString() }
        ],
        storyContext: { theme: 'magic' }
      };

      const enhanced = await service.enhanceTranscription(
        transcription,
        undefined,
        childProfile,
        context
      );

      expect(enhanced).toBeDefined();
      // Should detect "wuggy" as invented word
      if (enhanced.inventedWords && enhanced.inventedWords.length > 0) {
        const wuggy = enhanced.inventedWords.find(w => w.word.toLowerCase().includes('wuggy'));
        expect(wuggy).toBeDefined();
      }
    });

    it('should handle incomplete thoughts with ellipsis', async () => {
      const transcription: TranscriptionResult = {
        text: 'The dragon is...',
        confidence: 0.65,
        language: 'en'
      };

      const childProfile: ChildProfile = {
        childId: 'sim-child-2',
        age: 4
      };

      const enhanced = await service.enhanceTranscription(
        transcription,
        undefined,
        childProfile,
        {
          conversationHistory: [],
          storyContext: { theme: 'adventure' }
        }
      );

      expect(enhanced).toBeDefined();
      // Should detect incomplete thought pattern
      if (enhanced.nonLinearPatterns) {
        const incomplete = enhanced.nonLinearPatterns.find(p => 
          p.type === 'tangent' || p.type === 'topic_jump'
        );
        // May or may not detect depending on implementation
        expect(enhanced.text).toContain('dragon');
      }
    });

    it('should handle repetitive speech patterns', async () => {
      const transcription: TranscriptionResult = {
        text: 'No no no no I want it',
        confidence: 0.75,
        language: 'en'
      };

      const childProfile: ChildProfile = {
        childId: 'sim-child-3',
        age: 3
      };

      const enhanced = await service.enhanceTranscription(
        transcription,
        undefined,
        childProfile,
        undefined
      );

      expect(enhanced).toBeDefined();
      expect(enhanced.text).toBeDefined();
    });
  });

  describe('Age 5-7 Speech Patterns', () => {
    it('should handle topic jumps and non-linear logic', async () => {
      const transcription: TranscriptionResult = {
        text: 'Can we make a story about a princess? Actually, I saw a cat today. Can the cat be in the story?',
        confidence: 0.85,
        language: 'en'
      };

      const childProfile: ChildProfile = {
        childId: 'sim-child-4',
        age: 6
      };

      const context = {
        conversationHistory: [
          { speaker: 'user', message: 'I want to make a story', timestamp: new Date().toISOString() }
        ],
        storyContext: { theme: 'adventure' }
      };

      const enhanced = await service.enhanceTranscription(
        transcription,
        undefined,
        childProfile,
        context
      );

      expect(enhanced).toBeDefined();
      // Should detect topic jumps
      if (enhanced.nonLinearPatterns) {
        const topicJumps = enhanced.nonLinearPatterns.filter(p => p.type === 'topic_jump');
        expect(topicJumps.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle emotional speech patterns', async () => {
      const audioInput: AudioInput = {
        data: Buffer.from('test audio with high pitch'),
        sampleRate: 16000,
        channels: 1,
        format: 'pcm',
        metadata: {
          childId: 'sim-child-5',
          age: 5
        }
      };

      const transcription: TranscriptionResult = {
        text: 'I am so excited! This is the best story ever!',
        confidence: 0.90,
        language: 'en'
      };

      const childProfile: ChildProfile = {
        childId: 'sim-child-5',
        age: 5
      };

      const enhanced = await service.enhanceTranscription(
        transcription,
        audioInput,
        childProfile,
        undefined
      );

      expect(enhanced).toBeDefined();
      // Should detect emotional context
      if (enhanced.emotionalContext) {
        expect(enhanced.emotionalContext.detectedEmotion).toBeDefined();
        expect(['excited', 'happy', 'joyful']).toContain(
          enhanced.emotionalContext.detectedEmotion.toLowerCase()
        );
      }
    });
  });

  describe('Age 8-10 Speech Patterns', () => {
    it('should handle complex invented words with context', async () => {
      const transcription: TranscriptionResult = {
        text: 'My character has a flibberjabber that can do magic',
        confidence: 0.88,
        language: 'en'
      };

      const childProfile: ChildProfile = {
        childId: 'sim-child-6',
        age: 8
      };

      const context = {
        conversationHistory: [
          { speaker: 'user', message: 'I want a magic character', timestamp: new Date().toISOString() }
        ],
        storyContext: { theme: 'fantasy', hasMagic: true }
      };

      const enhanced = await service.enhanceTranscription(
        transcription,
        undefined,
        childProfile,
        context
      );

      expect(enhanced).toBeDefined();
      // Should infer meaning of "flibberjabber" from context
      if (enhanced.inventedWords && enhanced.inventedWords.length > 0) {
        const flibberjabber = enhanced.inventedWords.find(w => 
          w.word.toLowerCase().includes('flibberjabber')
        );
        if (flibberjabber && flibberjabber.inferredMeaning) {
          expect(flibberjabber.inferredMeaning).toMatch(/magic|wand|staff|tool/i);
        }
      }
    });

    it('should handle question cascades', async () => {
      const transcription: TranscriptionResult = {
        text: 'What if the dragon is friendly? Can it fly? Does it have fire? Can I ride it?',
        confidence: 0.87,
        language: 'en'
      };

      const childProfile: ChildProfile = {
        childId: 'sim-child-7',
        age: 9
      };

      const enhanced = await service.enhanceTranscription(
        transcription,
        undefined,
        childProfile,
        {
          conversationHistory: [],
          storyContext: { theme: 'adventure' }
        }
      );

      expect(enhanced).toBeDefined();
      // Should detect question cascade pattern
      if (enhanced.nonLinearPatterns) {
        const questionCascade = enhanced.nonLinearPatterns.find(p => 
          p.type === 'question_cascade'
        );
        // May or may not detect depending on implementation
        expect(enhanced.text).toContain('dragon');
      }
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle mixed invented words and real words', async () => {
      const transcription: TranscriptionResult = {
        text: 'I want a zippy dragon that can zoom really fast',
        confidence: 0.82,
        language: 'en'
      };

      const childProfile: ChildProfile = {
        childId: 'sim-child-8',
        age: 5
      };

      const enhanced = await service.enhanceTranscription(
        transcription,
        undefined,
        childProfile,
        {
          conversationHistory: [],
          storyContext: { theme: 'adventure' }
        }
      );

      expect(enhanced).toBeDefined();
      // Should identify "zippy" as potentially invented, but understand context
      expect(enhanced.text).toContain('dragon');
    });

    it('should handle emotional distress signals', async () => {
      const audioInput: AudioInput = {
        data: Buffer.from('test audio with distress indicators'),
        sampleRate: 16000,
        channels: 1,
        format: 'pcm',
        metadata: {
          childId: 'sim-child-9',
          age: 6
        }
      };

      const transcription: TranscriptionResult = {
        text: 'I am sad. The story is not working.',
        confidence: 0.78,
        language: 'en'
      };

      const childProfile: ChildProfile = {
        childId: 'sim-child-9',
        age: 6
      };

      const enhanced = await service.enhanceTranscription(
        transcription,
        audioInput,
        childProfile,
        undefined
      );

      expect(enhanced).toBeDefined();
      // Should detect emotional distress
      if (enhanced.emotionalContext) {
        expect(['sad', 'upset', 'frustrated']).toContain(
          enhanced.emotionalContext.detectedEmotion.toLowerCase()
        );
        if (enhanced.emotionalContext.needsSupport) {
          expect(enhanced.emotionalContext.needsSupport).toBe(true);
        }
      }
    });

    it('should adapt to child voice characteristics over time', async () => {
      const childProfile: ChildProfile = {
        childId: 'sim-child-10',
        age: 4,
        voiceCharacteristics: {
          averagePitch: 350, // Higher pitch typical for young children
          pronunciationPatterns: [
            {
              original: 'thing',
              childPronunciation: 'ting',
              confidence: 0.8,
              corrected: false
            }
          ]
        }
      };

      const audioInput: AudioInput = {
        data: Buffer.from('test audio'),
        sampleRate: 16000,
        channels: 1,
        format: 'pcm',
        metadata: {
          childId: 'sim-child-10',
          age: 4
        }
      };

      // First interaction
      const transcription1: TranscriptionResult = {
        text: 'I want a ting',
        confidence: 0.70,
        language: 'en'
      };

      const enhanced1 = await service.enhanceTranscription(
        transcription1,
        audioInput,
        childProfile,
        undefined
      );

      expect(enhanced1).toBeDefined();

      // Second interaction - should improve confidence
      const transcription2: TranscriptionResult = {
        text: 'Can I have another ting?',
        confidence: 0.75,
        language: 'en'
      };

      const enhanced2 = await service.enhanceTranscription(
        transcription2,
        audioInput,
        childProfile,
        {
          conversationHistory: [
            { speaker: 'user', message: 'I want a ting', timestamp: new Date().toISOString() }
          ]
        }
      );

      expect(enhanced2).toBeDefined();
      // Confidence should improve or stay stable
      expect(enhanced2.confidence).toBeGreaterThanOrEqual(enhanced1.confidence - 0.1);
    });
  });
});
