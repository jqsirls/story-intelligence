import { ArtGenerationService, ArtGenerationConfig, ProtagonistDNA } from '../services/ArtGenerationService';
import { Character, Story, StoryContent, StoryBeat } from '@storytailor/shared-types';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('ArtGenerationService', () => {
  let service: ArtGenerationService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let config: ArtGenerationConfig;

  beforeEach(() => {
    config = {
      openaiApiKey: 'test-key',
      maxPromptLength: 400,
      imageSize: '1024x1024',
      quality: 'standard',
      style: 'vivid'
    };

    mockOpenAI = {
      images: {
        generate: jest.fn()
      },
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;

    MockedOpenAI.mockImplementation(() => mockOpenAI);
    service = new ArtGenerationService(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractProtagonistDNA', () => {
    it('should extract protagonist DNA with word limit', () => {
      const character: Character = {
        id: '1',
        libraryId: 'lib1',
        name: 'Luna',
        traits: {
          name: 'Luna',
          age: 8,
          species: 'magical_creature',
          gender: 'female',
          appearance: {
            eyeColor: 'silver',
            hairColor: 'white',
            hairTexture: 'flowing',
            clothing: 'sparkly dress'
          },
          personality: ['brave', 'kind'],
          inclusivityTraits: [{
            type: 'autism',
            description: 'communicates through music',
            storyIntegration: 'uses musical magic'
          }]
        },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const dna = service.extractProtagonistDNA(character);

      expect(dna.visualDescription).toBeDefined();
      expect(dna.visualDescription.split(' ').length).toBeLessThanOrEqual(60);
      expect(dna.species).toBe('magical_creature');
      expect(dna.coreTraits).toEqual(['brave', 'kind']);
      expect(dna.inclusivityElements).toContain('communicates through music');
    });

    it('should handle character without optional fields', () => {
      const character: Character = {
        id: '1',
        libraryId: 'lib1',
        name: 'Sam',
        traits: {
          name: 'Sam',
          species: 'human',
          appearance: {}
        },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const dna = service.extractProtagonistDNA(character);

      expect(dna.visualDescription).toContain('human');
      expect(dna.species).toBe('human');
      expect(dna.coreTraits).toEqual([]);
      expect(dna.inclusivityElements).toEqual([]);
    });
  });

  describe('generateStoryMotif', () => {
    it('should generate motif for adventure story', () => {
      const story: Story = {
        id: '1',
        libraryId: 'lib1',
        title: 'Test Adventure',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [],
          characters: ['char1'],
          theme: 'courage',
          setting: 'enchanted forest',
          mood: 'adventurous',
          heroJourneyStructure: [
            { stage: 'ordinary_world', content: 'home', completed: true },
            { stage: 'call_to_adventure', content: 'quest begins', completed: true }
          ]
        },
        status: 'draft',
        ageRating: 8,
        createdAt: '2024-01-01'
      };

      const motif = service.generateStoryMotif(story);

      expect(motif.primaryTheme).toBe('exploration and discovery');
      expect(motif.atmosphere).toBe('adventurous');
      expect(motif.visualElements).toContain('enchanted forest');
      expect(motif.symbolism).toContain('compass');
    });
  });

  describe('generatePaletteJourney', () => {
    it('should create 5-step palette journey', () => {
      const story: Story = {
        id: '1',
        libraryId: 'lib1',
        title: 'Test Story',
        content: {
          type: 'Bedtime',
          audience: 'child',
          complexity: 'simple',
          beats: [],
          characters: [],
          theme: 'peace',
          setting: 'bedroom',
          mood: 'calm',
          heroJourneyStructure: []
        },
        status: 'draft',
        ageRating: 5,
        createdAt: '2024-01-01'
      };

      const motif = service.generateStoryMotif(story);
      const palette = service.generatePaletteJourney(story, motif);

      expect(palette.step1).toBeDefined();
      expect(palette.step2).toBeDefined();
      expect(palette.step3).toBeDefined();
      expect(palette.step4).toBeDefined();
      expect(palette.step5).toBeDefined();

      expect(palette.step1.mood).toBe('introduction');
      expect(palette.step4.mood).toBe('climax');
      expect(palette.step5.mood).toBe('resolution');
    });
  });

  describe('findCoverArtMoment', () => {
    it('should find highest scoring moment', () => {
      const story: Story = {
        id: '1',
        libraryId: 'lib1',
        title: 'Test Story',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [
            {
              id: 'beat1',
              sequence: 1,
              content: 'walking slowly',
              emotionalTone: 'calm'
            },
            {
              id: 'beat2',
              sequence: 2,
              content: 'running and jumping over obstacles',
              choices: [{ id: 'choice1', text: 'Go left', consequence: 'safe path' }],
              emotionalTone: 'excited'
            }
          ],
          characters: [],
          theme: 'adventure',
          setting: 'forest',
          mood: 'adventurous',
          heroJourneyStructure: []
        },
        status: 'draft',
        ageRating: 8,
        createdAt: '2024-01-01'
      };

      const coverMoment = service.findCoverArtMoment(story);

      expect(coverMoment.beatId).toBe('beat2'); // Should pick the more kinetic beat
      expect(coverMoment.visualKineticScore).toBeGreaterThan(0);
      expect(coverMoment.plotShiftingScore).toBeGreaterThan(0);
    });
  });

  describe('generateBodyIllustrations', () => {
    it('should generate 4 illustrations with camera and depth directives', () => {
      const story: Story = {
        id: '1',
        libraryId: 'lib1',
        title: 'Test Story',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [
            { id: 'beat1', sequence: 1, content: 'start journey', emotionalTone: 'excited' },
            { id: 'beat2', sequence: 2, content: 'meet friend', emotionalTone: 'happy' },
            { id: 'beat3', sequence: 3, content: 'face challenge', emotionalTone: 'determined' },
            { id: 'beat4', sequence: 4, content: 'victory celebration', emotionalTone: 'joyful' }
          ],
          characters: [],
          theme: 'friendship',
          setting: 'playground',
          mood: 'adventurous',
          heroJourneyStructure: []
        },
        status: 'draft',
        ageRating: 6,
        createdAt: '2024-01-01'
      };

      const protagonistDNA: ProtagonistDNA = {
        visualDescription: 'young human child with brown hair',
        coreTraits: ['brave'],
        species: 'human',
        appearance: 'brown hair, blue eyes',
        inclusivityElements: []
      };

      const illustrations = service.generateBodyIllustrations(story, protagonistDNA);

      expect(illustrations).toHaveLength(4);
      expect(illustrations[0].sequence).toBe(1);
      expect(illustrations[0].cameraAngle).toBeDefined();
      expect(illustrations[0].depthDirective).toBeDefined();
      expect(illustrations[0].prompt).toContain('brown hair');
    });
  });

  describe('generateStoryArt', () => {
    it('should generate complete art package', async () => {
      const character: Character = {
        id: '1',
        libraryId: 'lib1',
        name: 'Test Character',
        traits: {
          name: 'Test Character',
          species: 'human',
          appearance: { eyeColor: 'blue' }
        },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const story: Story = {
        id: '1',
        libraryId: 'lib1',
        title: 'Test Story',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [
            { id: 'beat1', sequence: 1, content: 'adventure begins', emotionalTone: 'excited' }
          ],
          characters: ['1'],
          theme: 'courage',
          setting: 'forest',
          mood: 'adventurous',
          heroJourneyStructure: []
        },
        status: 'draft',
        ageRating: 8,
        createdAt: '2024-01-01'
      };

      // Mock OpenAI responses
      mockOpenAI.images.generate.mockResolvedValue({
        data: [{ url: 'https://example.com/image.jpg' }]
      } as any);

      const result = await service.generateStoryArt(story, character);

      expect(result.coverArt).toBeDefined();
      expect(result.coverArt.url).toBe('https://example.com/image.jpg');
      expect(result.characterArt.headshot).toBeDefined();
      expect(result.characterArt.bodyshot).toBeDefined();
      expect(result.bodyIllustrations).toHaveLength(1);
      expect(mockOpenAI.images.generate).toHaveBeenCalledTimes(4); // headshot, bodyshot, cover, 1 body illustration
    });
  });

  describe('analyzeReferenceImage', () => {
    it('should analyze image for consistency', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: `Visual elements: character, background, lighting
                     Colors: blue, green, yellow
                     Style: children's book illustration
                     Consistency: 85 out of 100
                     Recommendations: maintain color palette, consistent character design`
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse as any);

      const result = await service.analyzeReferenceImage(
        'https://example.com/image.jpg',
        'fantasy adventure story'
      );

      expect(result.consistency).toBe(85);
      expect(result.style).toContain('children\'s book');
      expect(result.visualElements).toBeDefined();
      expect(result.colorPalette).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });
});