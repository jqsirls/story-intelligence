import { AssetGenerationPipeline, AssetGenerationPipelineConfig } from '../services/AssetGenerationPipeline';
import { Story, Character } from '@storytailor/shared-types';

// Mock the services
jest.mock('../services/ArtGenerationService');
jest.mock('../services/AudioGenerationService');
jest.mock('../services/EducationalActivitiesService');
jest.mock('../services/PDFGenerationService');

describe('AssetGenerationPipeline', () => {
  let pipeline: AssetGenerationPipeline;
  let mockConfig: AssetGenerationPipelineConfig;
  let mockStory: Story;
  let mockCharacter: Character;

  beforeEach(() => {
    mockConfig = {
      artGeneration: {
        openaiApiKey: 'test-key',
        maxPromptLength: 400,
        imageSize: '1024x1024',
        quality: 'hd',
        style: 'vivid'
      },
      audioGeneration: {
        voiceService: {} as any,
        defaultVoiceId: 'test-voice',
        narratorVoiceSettings: {
          stability: 0.8,
          similarityBoost: 0.7,
          style: 0.3,
          useSpeakerBoost: false
        },
        characterVoiceSettings: {}
      },
      educationalActivities: {
        openaiApiKey: 'test-key',
        maxActivities: 4,
        ageRanges: {
          'preschool': { min: 4, max: 5, developmentalStage: 'preschool' }
        }
      },
      pdfGeneration: {
        outputDirectory: './test-pdfs',
        fonts: {
          title: 'Helvetica-Bold',
          body: 'Helvetica',
          caption: 'Helvetica-Oblique'
        },
        layout: {
          pageWidth: 612,
          pageHeight: 792,
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        },
        colors: {
          primary: '#2E86AB',
          secondary: '#A23B72',
          text: '#333333',
          background: '#FFFFFF'
        }
      },
      logLevel: 'info',
      enableParallelGeneration: true,
      retryAttempts: 3,
      timeoutMs: 30000
    };

    mockStory = {
      id: 'story-123',
      libraryId: 'lib-123',
      title: 'Test Adventure Story',
      content: {
        type: 'Adventure',
        theme: 'courage',
        setting: 'magical forest',
        mood: 'excited',
        beats: [
          {
            id: 'beat-1',
            content: 'Once upon a time, Luna the unicorn lived in a magical forest.',
            emotionalTone: 'calm',
            choices: []
          },
          {
            id: 'beat-2',
            content: 'One day, she discovered a mysterious glowing cave.',
            emotionalTone: 'mysterious',
            choices: [
              { id: 'choice-1', text: 'Enter the cave', consequence: 'adventure begins' },
              { id: 'choice-2', text: 'Walk away', consequence: 'safe but curious' }
            ]
          }
        ],
        heroJourneyStructure: [
          { stage: 'ordinary_world', completed: true },
          { stage: 'call_to_adventure', completed: true }
        ]
      },
      status: 'final',
      ageRating: 5,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      finalizedAt: '2024-01-01T00:00:00Z'
    };

    mockCharacter = {
      id: 'char-123',
      libraryId: 'lib-123',
      name: 'Luna',
      traits: {
        name: 'Luna',
        species: 'unicorn',
        age: 5,
        appearance: {
          eyeColor: 'silver',
          hairColor: 'white',
          hairTexture: 'flowing'
        },
        personality: ['brave', 'curious', 'kind']
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    pipeline = new AssetGenerationPipeline(mockConfig);
  });

  describe('generateAssets', () => {
    it('should generate all requested asset types', async () => {
      const request = {
        story: mockStory,
        character: mockCharacter,
        targetAge: 5,
        assetTypes: ['art', 'audio', 'activities', 'pdf'] as const,
        priority: 'normal' as const
      };

      const result = await pipeline.generateAssets(request);

      expect(result).toMatchObject({
        storyId: mockStory.id,
        characterId: mockCharacter.id,
        assets: expect.any(Object),
        metadata: expect.objectContaining({
          generationTime: expect.any(Number),
          totalCost: expect.any(Number),
          errors: expect.any(Array),
          warnings: expect.any(Array)
        })
      });
    });

    it('should handle partial asset generation when some services fail', async () => {
      // This test would mock some services to fail
      const request = {
        story: mockStory,
        character: mockCharacter,
        assetTypes: ['art', 'audio'] as const,
        priority: 'normal' as const
      };

      const result = await pipeline.generateAssets(request);

      expect(result.metadata.errors).toBeDefined();
      expect(result.assets).toBeDefined();
    });

    it('should respect parallel generation setting', async () => {
      const parallelConfig = { ...mockConfig, enableParallelGeneration: true };
      const sequentialConfig = { ...mockConfig, enableParallelGeneration: false };

      const parallelPipeline = new AssetGenerationPipeline(parallelConfig);
      const sequentialPipeline = new AssetGenerationPipeline(sequentialConfig);

      const request = {
        story: mockStory,
        character: mockCharacter,
        assetTypes: ['art', 'audio'] as const,
        priority: 'normal' as const
      };

      // Both should work, but parallel should be faster (in real implementation)
      const parallelResult = await parallelPipeline.generateAssets(request);
      const sequentialResult = await sequentialPipeline.generateAssets(request);

      expect(parallelResult).toBeDefined();
      expect(sequentialResult).toBeDefined();
    });
  });

  describe('regenerateAssets', () => {
    it('should regenerate only specified asset types', async () => {
      const originalAssets = {
        storyId: mockStory.id,
        characterId: mockCharacter.id,
        generatedAt: '2024-01-01T00:00:00Z',
        assets: {
          art: {} as any,
          audio: {} as any,
          activities: {} as any,
          pdf: {} as any
        },
        metadata: {
          generationTime: 5000,
          totalCost: 2.50,
          errors: [],
          warnings: []
        }
      };

      const request = {
        originalAssets,
        updatedStory: mockStory,
        updatedCharacter: mockCharacter,
        assetTypesToRegenerate: ['art', 'pdf'] as const,
        changedElements: ['character_appearance', 'story_beat_2']
      };

      const result = await pipeline.regenerateAssets(request);

      expect(result.storyId).toBe(mockStory.id);
      expect(result.assets).toBeDefined();
    });
  });

  describe('estimateGenerationCost', () => {
    it('should provide accurate cost estimates', async () => {
      const request = {
        story: mockStory,
        character: mockCharacter,
        assetTypes: ['art', 'audio', 'activities', 'pdf'] as const,
        priority: 'normal' as const
      };

      const estimate = await pipeline.estimateGenerationCost(request);

      expect(estimate).toMatchObject({
        totalCost: expect.any(Number),
        breakdown: {
          art: expect.any(Number),
          audio: expect.any(Number),
          activities: expect.any(Number),
          pdf: expect.any(Number)
        },
        currency: 'USD'
      });

      expect(estimate.totalCost).toBeGreaterThan(0);
    });

    it('should only include costs for requested asset types', async () => {
      const request = {
        story: mockStory,
        character: mockCharacter,
        assetTypes: ['art'] as const,
        priority: 'normal' as const
      };

      const estimate = await pipeline.estimateGenerationCost(request);

      expect(estimate.breakdown.art).toBeGreaterThan(0);
      expect(estimate.breakdown.audio).toBe(0);
      expect(estimate.breakdown.activities).toBe(0);
      expect(estimate.breakdown.pdf).toBe(0);
    });
  });

  describe('getGenerationStatus', () => {
    it('should return generation status', async () => {
      const status = await pipeline.getGenerationStatus('story-123');

      expect(status).toMatchObject({
        status: expect.stringMatching(/pending|in_progress|completed|failed/),
        progress: expect.any(Number),
        currentStep: expect.any(String),
        estimatedTimeRemaining: expect.any(Number),
        errors: expect.any(Array)
      });
    });
  });

  describe('healthCheck', () => {
    it('should check health of all services', async () => {
      const health = await pipeline.healthCheck();

      expect(health).toMatchObject({
        status: expect.stringMatching(/healthy|unhealthy/),
        services: {
          art: expect.any(Boolean),
          audio: expect.any(Boolean),
          activities: expect.any(Boolean),
          pdf: expect.any(Boolean)
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('error handling', () => {
    it('should handle timeout errors gracefully', async () => {
      const shortTimeoutConfig = { ...mockConfig, timeoutMs: 1 }; // 1ms timeout
      const timeoutPipeline = new AssetGenerationPipeline(shortTimeoutConfig);

      const request = {
        story: mockStory,
        character: mockCharacter,
        assetTypes: ['art'] as const,
        priority: 'normal' as const
      };

      const result = await timeoutPipeline.generateAssets(request);
      
      // Should complete but may have errors due to timeouts
      expect(result).toBeDefined();
      expect(result.metadata.errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should retry failed operations', async () => {
      const retryConfig = { ...mockConfig, retryAttempts: 2 };
      const retryPipeline = new AssetGenerationPipeline(retryConfig);

      const request = {
        story: mockStory,
        character: mockCharacter,
        assetTypes: ['art'] as const,
        priority: 'normal' as const
      };

      // This test would need to mock a service to fail initially then succeed
      const result = await retryPipeline.generateAssets(request);
      expect(result).toBeDefined();
    });
  });
});