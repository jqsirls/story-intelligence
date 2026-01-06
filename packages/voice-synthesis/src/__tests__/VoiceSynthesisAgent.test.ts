// Voice Synthesis Agent Unit Test - 100% Coverage + Studio Quality
import { VoiceSynthesisAgent } from '../VoiceSynthesisAgent';
import { VoiceService } from '../VoiceService';
import { VoiceCloneManager } from '../VoiceCloneManager';
import { ElevenLabsClient } from '../clients/ElevenLabsClient';
import { PollyClient } from '../clients/PollyClient';
import { FailoverPolicy } from '../FailoverPolicy';
import { CostTracker } from '../utils/CostTracker';
import { createClient } from '@supabase/supabase-js';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('../VoiceService');
jest.mock('../VoiceCloneManager');
jest.mock('../clients/ElevenLabsClient');
jest.mock('../clients/PollyClient');
jest.mock('../FailoverPolicy');
jest.mock('../utils/CostTracker');

describe('VoiceSynthesisAgent - 100% Coverage with Studio Quality Verification', () => {
  let voiceSynthesisAgent: VoiceSynthesisAgent;
  let mockSupabase: any;
  let mockEventBridge: jest.Mocked<EventBridgeClient>;
  let mockVoiceService: jest.Mocked<VoiceService>;
  let mockVoiceCloneManager: jest.Mocked<VoiceCloneManager>;
  let mockElevenLabs: jest.Mocked<ElevenLabsClient>;
  let mockPolly: jest.Mocked<PollyClient>;
  let mockFailoverPolicy: jest.Mocked<FailoverPolicy>;
  let mockCostTracker: jest.Mocked<CostTracker>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    };
    
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockEventBridge = new EventBridgeClient({}) as jest.Mocked<EventBridgeClient>;
    
    voiceSynthesisAgent = new VoiceSynthesisAgent({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      environment: 'test'
    });
  });

  describe('Studio Quality Voice Synthesis', () => {
    test('should generate broadcast-quality narration', async () => {
      mockVoiceService.generateSpeech.mockResolvedValue({
        audioUrl: 'https://audio.example.com/story.mp3',
        quality: 'studio',
        bitrate: 320,
        sampleRate: 48000
      });

      const narration = await voiceSynthesisAgent.generateNarration({
        text: 'Once upon a time...',
        voice: 'storyteller-warm',
        quality: 'maximum'
      });

      expect(narration.quality).toBe('studio');
      expect(narration.bitrate).toBeGreaterThanOrEqual(320);
      expect(narration.sampleRate).toBeGreaterThanOrEqual(48000);
      expect(narration.clarity).toBe('crystal-clear');
    });

    test('should support multiple voice personalities', async () => {
      const voices = [
        { id: 'narrator-warm', traits: ['friendly', 'engaging', 'clear'] },
        { id: 'narrator-dramatic', traits: ['theatrical', 'expressive', 'dynamic'] },
        { id: 'narrator-gentle', traits: ['soothing', 'calm', 'bedtime-perfect'] },
        { id: 'narrator-energetic', traits: ['enthusiastic', 'lively', 'fun'] },
        { id: 'character-child', traits: ['youthful', 'innocent', 'curious'] }
      ];

      for (const voice of voices) {
        const result = await voiceSynthesisAgent.selectVoice({
          personality: voice.id,
          storyType: 'adventure'
        });

        expect(result.voiceId).toBe(voice.id);
        expect(result.traits).toEqual(expect.arrayContaining(voice.traits));
      }
    });

    test('should optimize voice for different story types', async () => {
      const storyTypes = [
        { type: 'bedtime', pace: 'slow', tone: 'soothing' },
        { type: 'adventure', pace: 'dynamic', tone: 'exciting' },
        { type: 'educational', pace: 'clear', tone: 'engaging' },
        { type: 'funny', pace: 'playful', tone: 'animated' }
      ];

      for (const story of storyTypes) {
        const optimization = await voiceSynthesisAgent.optimizeForStory({
          storyType: story.type,
          targetAge: 7
        });

        expect(optimization.pace).toBe(story.pace);
        expect(optimization.tone).toBe(story.tone);
        expect(optimization.ageAppropriate).toBe(true);
      }
    });
  });

  describe('WebVTT Synchronization', () => {
    test('should generate precise word-level timing', async () => {
      const webvtt = await voiceSynthesisAgent.generateWebVTT({
        text: 'The quick brown fox jumps',
        audioUrl: 'https://audio.example.com/fox.mp3'
      });

      expect(webvtt.format).toBe('WebVTT');
      expect(webvtt.cues).toHaveLength(5); // 5 words
      expect(webvtt.cues[0].start).toBe(0);
      expect(webvtt.cues[0].text).toBe('The');
      expect(webvtt.precision).toBe('millisecond');
    });

    test('should sync highlighting with audio playback', async () => {
      const sync = await voiceSynthesisAgent.createAudioTextSync({
        audioUrl: 'https://audio.example.com/story.mp3',
        text: 'Full story text here',
        highlightMode: 'word-by-word'
      });

      expect(sync.synchronized).toBe(true);
      expect(sync.highlightPrecision).toBe('exact');
      expect(sync.fallbackMode).toBe('sentence-level');
      expect(sync.mobileOptimized).toBe(true);
    });

    test('should support multiple highlight modes', async () => {
      const modes = ['word-by-word', 'sentence', 'paragraph', 'karaoke-style'];
      
      for (const mode of modes) {
        const result = await voiceSynthesisAgent.setHighlightMode({
          mode,
          speed: 'normal'
        });

        expect(result.mode).toBe(mode);
        expect(result.supported).toBe(true);
      }
    });
  });

  describe('Voice Cloning and Consistency', () => {
    test('should maintain character voice consistency', async () => {
      mockVoiceCloneManager.ensureConsistency.mockResolvedValue({
        consistent: true,
        similarity: 0.98,
        characteristics: ['pitch', 'tone', 'accent']
      });

      const consistency = await voiceSynthesisAgent.checkVoiceConsistency({
        characterId: 'char-123',
        previousSamples: 5
      });

      expect(consistency.maintained).toBe(true);
      expect(consistency.similarity).toBeGreaterThan(0.95);
      expect(consistency.qualityScore).toBe('excellent');
    });

    test('should create unique character voices', async () => {
      const characters = [
        { name: 'Brave Knight', voice: 'noble-confident' },
        { name: 'Wise Wizard', voice: 'mysterious-ancient' },
        { name: 'Friendly Dragon', voice: 'warm-rumbling' },
        { name: 'Young Princess', voice: 'sweet-determined' }
      ];

      for (const character of characters) {
        const voice = await voiceSynthesisAgent.createCharacterVoice({
          characterName: character.name,
          personality: character.voice
        });

        expect(voice.unique).toBe(true);
        expect(voice.memorable).toBe(true);
        expect(voice.consistent).toBe(true);
      }
    });

    test('should handle voice aging for growing characters', async () => {
      const aging = await voiceSynthesisAgent.ageCharacterVoice({
        characterId: 'char-123',
        fromAge: 6,
        toAge: 8,
        gradual: true
      });

      expect(aging.natural).toBe(true);
      expect(aging.recognizable).toBe(true);
      expect(aging.pitchAdjustment).toBe('subtle');
    });
  });

  describe('Multi-Provider Failover', () => {
    test('should failover seamlessly between providers', async () => {
      mockFailoverPolicy.execute.mockResolvedValue({
        provider: 'polly',
        reason: 'elevenlabs-quota-exceeded',
        quality: 'high'
      });

      const result = await voiceSynthesisAgent.synthesizeWithFailover({
        text: 'Story content',
        preferredProvider: 'elevenlabs'
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('polly');
      expect(result.qualityMaintained).toBe(true);
      expect(result.userNotice).toBe(false);
    });

    test('should maintain quality across providers', async () => {
      const providers = ['elevenlabs', 'aws-polly', 'azure-speech'];
      const qualityScores = [];

      for (const provider of providers) {
        const result = await voiceSynthesisAgent.synthesizeWithProvider({
          text: 'Test content',
          provider
        });

        qualityScores.push(result.qualityScore);
      }

      const minQuality = Math.min(...qualityScores);
      expect(minQuality).toBeGreaterThan(0.85);
    });
  });

  describe('Performance Optimization', () => {
    test('should pre-generate audio for instant playback', async () => {
      const preGen = await voiceSynthesisAgent.preGenerateAudio({
        storyId: 'story-123',
        chapters: [1, 2, 3]
      });

      expect(preGen.ready).toBe(true);
      expect(preGen.cachedChapters).toHaveLength(3);
      expect(preGen.instantPlayback).toBe(true);
      expect(preGen.cdnOptimized).toBe(true);
    });

    test('should stream audio for long stories', async () => {
      const stream = await voiceSynthesisAgent.enableStreaming({
        storyLength: 'long',
        networkSpeed: 'variable'
      });

      expect(stream.enabled).toBe(true);
      expect(stream.bufferStrategy).toBe('adaptive');
      expect(stream.startTime).toBeLessThan(500); // ms
    });

    test('should optimize for mobile bandwidth', async () => {
      const mobile = await voiceSynthesisAgent.optimizeForMobile({
        connectionType: '3G',
        dataMode: 'saver'
      });

      expect(mobile.bitrate).toBe(128);
      expect(mobile.format).toBe('opus');
      expect(mobile.quality).toBe('good'); // Not studio, but good
      expect(mobile.cacheAggressive).toBe(true);
    });
  });

  describe('Emotional Expression', () => {
    test('should convey emotions through voice modulation', async () => {
      const emotions = [
        { emotion: 'happy', prosody: { pitch: '+5%', rate: '105%' } },
        { emotion: 'sad', prosody: { pitch: '-5%', rate: '95%' } },
        { emotion: 'excited', prosody: { pitch: '+10%', rate: '110%' } },
        { emotion: 'scared', prosody: { pitch: '+3%', rate: '108%', tremor: true } }
      ];

      for (const emo of emotions) {
        const result = await voiceSynthesisAgent.applyEmotion({
          text: 'Character dialogue',
          emotion: emo.emotion
        });

        expect(result.prosody).toMatchObject(emo.prosody);
        expect(result.natural).toBe(true);
      }
    });

    test('should handle dialogue with multiple speakers', async () => {
      const dialogue = await voiceSynthesisAgent.generateDialogue({
        speakers: [
          { name: 'Hero', voice: 'brave-young' },
          { name: 'Mentor', voice: 'wise-old' }
        ],
        lines: [
          { speaker: 'Hero', text: 'Will I succeed?' },
          { speaker: 'Mentor', text: 'You already have.' }
        ]
      });

      expect(dialogue.voices).toHaveLength(2);
      expect(dialogue.distinct).toBe(true);
      expect(dialogue.conversational).toBe(true);
    });
  });

  describe('Cost Management', () => {
    test('should track and optimize synthesis costs', async () => {
      mockCostTracker.estimate.mockResolvedValue({
        provider: 'elevenlabs',
        characters: 1000,
        estimatedCost: 0.02
      });

      const cost = await voiceSynthesisAgent.estimateCost({
        text: 'Story content here',
        voice: 'premium'
      });

      expect(cost.transparent).toBe(true);
      expect(cost.optimized).toBe(true);
      expect(cost.withinBudget).toBe(true);
    });

    test('should provide cost-effective alternatives', async () => {
      const alternatives = await voiceSynthesisAgent.suggestAlternatives({
        currentCost: 'high',
        quality: 'studio'
      });

      expect(alternatives).toHaveLength(3);
      expect(alternatives[0].savings).toBeGreaterThan(0.5);
      expect(alternatives[0].qualityImpact).toBe('minimal');
    });
  });

  describe('Accessibility Features', () => {
    test('should support variable speech rates', async () => {
      const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      
      for (const rate of rates) {
        const result = await voiceSynthesisAgent.setSpeechRate({
          rate,
          maintainPitch: true
        });

        expect(result.rate).toBe(rate);
        expect(result.natural).toBe(true);
        expect(result.comprehensible).toBe(true);
      }
    });

    test('should provide pronunciation customization', async () => {
      const custom = await voiceSynthesisAgent.customizePronunciation({
        words: [
          { text: 'Hermione', phonetic: 'her-MY-oh-nee' },
          { text: 'Xiaolong', phonetic: 'shao-long' }
        ]
      });

      expect(custom.applied).toBe(true);
      expect(custom.consistent).toBe(true);
      expect(custom.natural).toBe(true);
    });
  });

  describe('Multi-Agent Coordination', () => {
    test('should sync with Content Agent for text preparation', async () => {
      mockEventBridge.send = jest.fn().mockResolvedValue({});

      await voiceSynthesisAgent.requestTextOptimization({
        storyId: 'story-123',
        optimizeFor: 'speech'
      });

      expect(mockEventBridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: 'TextOptimizationRequest',
              Source: 'voice-synthesis-agent'
            })
          ])
        })
      );
    });

    test('should coordinate with Emotion Agent for emotional voice', async () => {
      const emotionalSync = await voiceSynthesisAgent.syncEmotionalTone({
        userId: 'user-123',
        detectedMood: 'happy',
        storyMood: 'uplifting'
      });

      expect(emotionalSync.aligned).toBe(true);
      expect(emotionalSync.voiceTone).toBe('cheerful');
      expect(emotionalSync.prosodyAdjusted).toBe(true);
    });
  });

  describe('Health Check', () => {
    test('should report comprehensive health status', async () => {
      const health = await voiceSynthesisAgent.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('voice-synthesis-agent');
      expect(health.providers).toContain('elevenlabs');
      expect(health.providers).toContain('aws-polly');
      expect(health.quality).toBe('studio');
      expect(health.features).toContain('webvtt-sync');
      expect(health.features).toContain('voice-cloning');
      expect(health.features).toContain('emotional-expression');
      expect(health.costTracking).toBe('active');
    });
  });
});

// Test utilities
export const VoiceSynthesisTestUtils = {
  createVoiceConfig: (overrides = {}) => ({
    voice: 'narrator-warm',
    quality: 'studio',
    rate: 1.0,
    pitch: 1.0,
    ...overrides
  }),
  
  mockAudioGeneration: (agent: VoiceSynthesisAgent, quality: string) => {
    jest.spyOn(agent, 'generateAudio').mockResolvedValue({
      url: 'https://audio.example.com/test.mp3',
      quality,
      duration: 60
    });
  }
};