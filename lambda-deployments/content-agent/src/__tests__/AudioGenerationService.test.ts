import { AudioGenerationService, AudioGenerationConfig, VoiceCustomization } from '../services/AudioGenerationService';
import { Story, Character, StoryBeat } from '@alexa-multi-agent/shared-types';
import { VoiceService, VoiceSynthesisResponse, AudioChunk } from '@alexa-multi-agent/voice-synthesis';

// Mock VoiceService
const mockVoiceService = {
  synthesize: jest.fn(),
  stream: jest.fn(),
  healthCheck: jest.fn()
} as jest.Mocked<VoiceService>;

describe('AudioGenerationService', () => {
  let service: AudioGenerationService;
  let config: AudioGenerationConfig;

  beforeEach(() => {
    config = {
      voiceService: mockVoiceService,
      defaultVoiceId: 'default-narrator',
      narratorVoiceSettings: {
        stability: 0.7,
        similarityBoost: 0.8,
        style: 0.5,
        useSpeakerBoost: true
      },
      characterVoiceSettings: {}
    };

    service = new AudioGenerationService(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateStoryNarration', () => {
    it('should generate complete story narration', async () => {
      const story: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'The Magic Adventure',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [
            {
              id: 'beat1',
              sequence: 1,
              content: 'Once upon a time, there was a brave little hero.',
              emotionalTone: 'excited'
            },
            {
              id: 'beat2',
              sequence: 2,
              content: 'They discovered a magical forest full of wonders.',
              emotionalTone: 'mysterious'
            }
          ],
          characters: ['char1'],
          theme: 'courage',
          setting: 'magical forest',
          mood: 'adventurous',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 8,
        createdAt: '2024-01-01'
      };

      const character: Character = {
        id: 'char1',
        libraryId: 'lib1',
        name: 'Hero',
        traits: {
          name: 'Hero',
          species: 'human',
          appearance: {}
        },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const mockResponse: VoiceSynthesisResponse = {
        success: true,
        audioData: Buffer.from('mock-audio'),
        audioUrl: 'https://example.com/audio.mp3',
        engine: 'elevenlabs',
        latency: 1000,
        cost: 0.05,
        duration: 30,
        sessionId: 'test-session'
      };

      mockVoiceService.synthesize.mockResolvedValue(mockResponse);

      const result = await service.generateStoryNarration(story, character);

      expect(result.fullNarrationUrl).toBe('https://example.com/audio.mp3');
      expect(result.segments).toHaveLength(2);
      expect(result.metadata.storyId).toBe('story1');
      expect(result.metadata.characterId).toBe('char1');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.estimatedCost).toBeGreaterThan(0);
      
      // Should call synthesize for each segment plus full narration
      expect(mockVoiceService.synthesize).toHaveBeenCalledTimes(3);
    });

    it('should apply custom voice settings', async () => {
      const story: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'Test Story',
        content: {
          type: 'Bedtime',
          audience: 'child',
          complexity: 'simple',
          beats: [
            { id: 'beat1', sequence: 1, content: 'Peaceful story', emotionalTone: 'calm' }
          ],
          characters: [],
          theme: 'peace',
          setting: 'bedroom',
          mood: 'calm',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 5,
        createdAt: '2024-01-01'
      };

      const character: Character = {
        id: 'char1',
        libraryId: 'lib1',
        name: 'Child',
        traits: { name: 'Child', species: 'human', appearance: {} },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const customSettings: Partial<VoiceCustomization> = {
        voiceId: 'custom-voice',
        speed: 0.8,
        emotion: 'gentle'
      };

      mockVoiceService.synthesize.mockResolvedValue({
        success: true,
        audioData: Buffer.from('mock-audio'),
        audioUrl: 'https://example.com/audio.mp3',
        engine: 'elevenlabs',
        latency: 1000,
        cost: 0.05,
        duration: 20,
        sessionId: 'test-session'
      });

      const result = await service.generateStoryNarration(story, character, customSettings);

      expect(result.metadata.voiceSettings.voiceId).toBe('custom-voice');
      expect(result.metadata.voiceSettings.speed).toBe(0.8);
      expect(result.metadata.voiceSettings.emotion).toBe('gentle');
    });
  });

  describe('regenerateAudio', () => {
    it('should regenerate audio when voice settings change', async () => {
      const originalAudio = {
        fullNarrationUrl: 'https://example.com/old-audio.mp3',
        segments: [],
        totalDuration: 30,
        metadata: {
          storyId: 'story1',
          characterId: 'char1',
          generatedAt: '2024-01-01T00:00:00Z',
          voiceSettings: {
            voiceId: 'old-voice',
            stability: 0.7,
            similarityBoost: 0.8,
            style: 0.5,
            useSpeakerBoost: true,
            speed: 1.0,
            emotion: 'neutral' as const
          },
          wordCount: 100,
          estimatedCost: 0.05
        }
      };

      const regenerationRequest = {
        storyId: 'story1',
        voiceSettings: { voiceId: 'new-voice', speed: 1.2 },
        newContent: JSON.stringify({
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [{ id: 'beat1', sequence: 1, content: 'New content', emotionalTone: 'excited' }],
          characters: [],
          theme: 'adventure',
          setting: 'forest',
          mood: 'adventurous',
          heroJourneyStructure: []
        })
      };

      mockVoiceService.synthesize.mockResolvedValue({
        success: true,
        audioData: Buffer.from('new-audio'),
        audioUrl: 'https://example.com/new-audio.mp3',
        engine: 'elevenlabs',
        latency: 1000,
        cost: 0.06,
        duration: 25,
        sessionId: 'regen-session'
      });

      const result = await service.regenerateAudio(originalAudio, regenerationRequest);

      expect(result.metadata.voiceSettings.voiceId).toBe('new-voice');
      expect(result.metadata.voiceSettings.speed).toBe(1.2);
      expect(mockVoiceService.synthesize).toHaveBeenCalled();
    });

    it('should regenerate specific beats when only beats change', async () => {
      const originalAudio = {
        fullNarrationUrl: 'https://example.com/audio.mp3',
        segments: [
          {
            id: 'beat1',
            type: 'narration' as const,
            text: 'Original text',
            voiceSettings: {
              voiceId: 'voice1',
              stability: 0.7,
              similarityBoost: 0.8,
              style: 0.5,
              useSpeakerBoost: true,
              speed: 1.0,
              emotion: 'neutral' as const
            },
            audioUrl: 'https://example.com/beat1.mp3',
            duration: 10
          }
        ],
        totalDuration: 10,
        metadata: {
          storyId: 'story1',
          characterId: 'char1',
          generatedAt: '2024-01-01T00:00:00Z',
          voiceSettings: {
            voiceId: 'voice1',
            stability: 0.7,
            similarityBoost: 0.8,
            style: 0.5,
            useSpeakerBoost: true,
            speed: 1.0,
            emotion: 'neutral' as const
          },
          wordCount: 50,
          estimatedCost: 0.03
        }
      };

      const regenerationRequest = {
        storyId: 'story1',
        changedBeats: ['beat1']
      };

      mockVoiceService.synthesize.mockResolvedValue({
        success: true,
        audioData: Buffer.from('updated-audio'),
        audioUrl: 'https://example.com/updated-beat1.mp3',
        engine: 'elevenlabs',
        latency: 800,
        cost: 0.02,
        duration: 12,
        sessionId: 'regen-beat1'
      });

      const result = await service.regenerateAudio(originalAudio, regenerationRequest);

      expect(result.segments[0].audioUrl).toBe('https://example.com/updated-beat1.mp3');
      expect(result.segments[0].duration).toBe(12);
      expect(mockVoiceService.synthesize).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAvailableVoices', () => {
    it('should return curated list of voices for children\'s stories', async () => {
      const voices = await service.getAvailableVoices();

      expect(voices).toHaveLength(4);
      expect(voices[0]).toHaveProperty('id');
      expect(voices[0]).toHaveProperty('name');
      expect(voices[0]).toHaveProperty('description');
      expect(voices[0]).toHaveProperty('ageGroup');
      expect(voices[0]).toHaveProperty('gender');
      expect(voices[0]).toHaveProperty('accent');

      // Check that we have appropriate voices for children's content
      const femaleVoices = voices.filter(v => v.gender === 'female');
      const maleVoices = voices.filter(v => v.gender === 'male');
      
      expect(femaleVoices.length).toBeGreaterThan(0);
      expect(maleVoices.length).toBeGreaterThan(0);
    });
  });

  describe('streamStoryNarration', () => {
    it('should stream story narration in real-time', async () => {
      const story: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'Streaming Story',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [
            { id: 'beat1', sequence: 1, content: 'Streaming content', emotionalTone: 'excited' }
          ],
          characters: [],
          theme: 'adventure',
          setting: 'forest',
          mood: 'adventurous',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 8,
        createdAt: '2024-01-01'
      };

      const character: Character = {
        id: 'char1',
        libraryId: 'lib1',
        name: 'Hero',
        traits: { name: 'Hero', species: 'human', appearance: {} },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const mockChunk: AudioChunk = {
        data: Buffer.from('audio-chunk'),
        isLast: false,
        sequenceNumber: 1,
        timestamp: Date.now()
      };

      const onChunk = jest.fn();
      mockVoiceService.stream.mockImplementation(async (request, chunkCallback) => {
        chunkCallback(mockChunk);
        chunkCallback({ ...mockChunk, isLast: true, sequenceNumber: 2 });
      });

      await service.streamStoryNarration(story, character, {}, onChunk);

      expect(mockVoiceService.stream).toHaveBeenCalledTimes(1);
      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onChunk).toHaveBeenCalledWith(mockChunk);
    });
  });

  describe('voice selection logic', () => {
    it('should select appropriate voice for bedtime stories', async () => {
      const bedtimeStory: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'Bedtime Story',
        content: {
          type: 'Bedtime',
          audience: 'child',
          complexity: 'simple',
          beats: [{ id: 'beat1', sequence: 1, content: 'Sleep tight', emotionalTone: 'calm' }],
          characters: [],
          theme: 'peace',
          setting: 'bedroom',
          mood: 'calm',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 5,
        createdAt: '2024-01-01'
      };

      const character: Character = {
        id: 'char1',
        libraryId: 'lib1',
        name: 'Child',
        traits: { name: 'Child', species: 'human', appearance: {} },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      mockVoiceService.synthesize.mockResolvedValue({
        success: true,
        audioData: Buffer.from('bedtime-audio'),
        audioUrl: 'https://example.com/bedtime.mp3',
        engine: 'elevenlabs',
        latency: 1000,
        cost: 0.03,
        duration: 20,
        sessionId: 'bedtime-session'
      });

      const result = await service.generateStoryNarration(bedtimeStory, character);

      expect(result.metadata.voiceSettings.voiceId).toBe('narrator-warm-female');
      expect(result.metadata.voiceSettings.emotion).toBe('calm');
      expect(result.metadata.voiceSettings.speed).toBeLessThan(1.0); // Slower for bedtime
    });

    it('should select appropriate voice for adventure stories', async () => {
      const adventureStory: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'Adventure Story',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [{ id: 'beat1', sequence: 1, content: 'Exciting adventure', emotionalTone: 'excited' }],
          characters: [],
          theme: 'courage',
          setting: 'forest',
          mood: 'adventurous',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 8,
        createdAt: '2024-01-01'
      };

      const character: Character = {
        id: 'char1',
        libraryId: 'lib1',
        name: 'Hero',
        traits: { name: 'Hero', species: 'human', appearance: {} },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      mockVoiceService.synthesize.mockResolvedValue({
        success: true,
        audioData: Buffer.from('adventure-audio'),
        audioUrl: 'https://example.com/adventure.mp3',
        engine: 'elevenlabs',
        latency: 800,
        cost: 0.04,
        duration: 25,
        sessionId: 'adventure-session'
      });

      const result = await service.generateStoryNarration(adventureStory, character);

      expect(result.metadata.voiceSettings.voiceId).toBe('narrator-energetic-female');
      expect(result.metadata.voiceSettings.emotion).toBe('adventurous');
      expect(result.metadata.voiceSettings.speed).toBeGreaterThan(1.0); // Faster for adventure
    });
  });
});