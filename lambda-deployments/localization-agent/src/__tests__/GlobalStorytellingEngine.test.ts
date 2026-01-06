import { GlobalStorytellingEngine } from '../services/GlobalStorytellingEngine';
import { CulturalContext } from '../types';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('openai');

describe('GlobalStorytellingEngine', () => {
  let engine: GlobalStorytellingEngine;
  let mockSupabase: any;
  let mockOpenAI: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    };

    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };

    engine = new GlobalStorytellingEngine(mockSupabase, mockOpenAI);
  });

  describe('getTraditionalStoryPatterns', () => {
    it('should return traditional story patterns for cultural backgrounds', async () => {
      const patterns = await engine.getTraditionalStoryPatterns(['african_oral', 'east_asian']);

      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBeGreaterThan(0);
      
      if (patterns.length > 0) {
        expect(patterns[0]).toHaveProperty('name');
        expect(patterns[0]).toHaveProperty('culturalOrigin');
        expect(patterns[0]).toHaveProperty('structure');
        expect(patterns[0]).toHaveProperty('commonElements');
        expect(patterns[0]).toHaveProperty('moralFramework');
        expect(patterns[0]).toHaveProperty('adaptationGuidelines');
      }
    });

    it('should return specific pattern for African oral tradition', async () => {
      const patterns = await engine.getTraditionalStoryPatterns(['african_oral']);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toBe('African Oral Tradition');
      expect(patterns[0].culturalOrigin).toContain('Various African cultures');
      expect(patterns[0].structure.opening).toContain('Call and response');
      expect(patterns[0].commonElements).toContain('animal characters');
      expect(patterns[0].moralFramework).toContain('Community responsibility');
    });

    it('should return empty array for unknown cultural backgrounds', async () => {
      const patterns = await engine.getTraditionalStoryPatterns(['unknown_culture']);

      expect(patterns).toEqual([]);
    });
  });

  describe('createHolidayStoryMode', () => {
    it('should create holiday story mode successfully', async () => {
      const mockHolidayMode = {
        holiday: 'Diwali',
        culturalContext: ['hindu', 'indian'],
        storyThemes: ['light over darkness', 'family unity', 'celebration'],
        characterTypes: ['family members', 'community members', 'traditional figures'],
        settingElements: ['decorated homes', 'oil lamps', 'festive atmosphere'],
        traditionalElements: ['diyas', 'rangoli', 'sweets', 'fireworks'],
        modernAdaptations: ['LED lights', 'virtual celebrations', 'eco-friendly practices'],
        ageAppropriateActivities: ['lamp making', 'rangoli drawing', 'story sharing']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockHolidayMode)
          }
        }]
      });

      const result = await engine.createHolidayStoryMode('Diwali', ['hindu', 'indian'], 8);

      expect(result).toEqual(mockHolidayMode);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('global holiday traditions')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Diwali')
          })
        ]),
        temperature: 0.4
      });
    });

    it('should handle holiday story mode creation errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      await expect(engine.createHolidayStoryMode('Christmas', ['christian'], 6))
        .rejects.toThrow('Failed to create holiday story mode');
    });
  });

  describe('generateCrossCulturalScenario', () => {
    it('should generate cross-cultural scenario successfully', async () => {
      const mockScenario = {
        scenario: 'Children from different cultures working together on a school project',
        cultures: ['american', 'japanese'],
        interactionType: 'cooperation',
        learningObjectives: ['Understanding different work styles', 'Appreciating cultural perspectives'],
        respectfulApproaches: ['Ask questions politely', 'Share your own traditions'],
        potentialChallenges: ['Different communication styles', 'Different approaches to teamwork'],
        resolutionStrategies: ['Find common ground', 'Celebrate differences', 'Focus on shared goals']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockScenario)
          }
        }]
      });

      const result = await engine.generateCrossCulturalScenario(
        ['american', 'japanese'],
        'cooperation',
        { setting: 'school', activity: 'project' }
      );

      expect(result).toEqual(mockScenario);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('cross-cultural education')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('american, japanese')
          })
        ]),
        temperature: 0.4
      });
    });

    it('should handle cross-cultural scenario generation errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Generation Error'));

      await expect(engine.generateCrossCulturalScenario(['test'], 'friendship', {}))
        .rejects.toThrow('Failed to generate cross-cultural scenario');
    });
  });

  describe('preserveStorytellingTradition', () => {
    it('should preserve storytelling tradition successfully', async () => {
      const mockPreservation = {
        tradition: 'Native American Storytelling',
        culturalContext: 'Native American',
        originalElements: ['circular narrative', 'animal spirits', 'nature connection'],
        preservationMethods: ['Maintain spiritual elements', 'Use traditional structure'],
        modernAdaptations: ['Interactive digital elements', 'Contemporary settings'],
        educationalValue: ['Environmental awareness', 'Respect for nature', 'Cultural heritage'],
        respectfulIntegration: ['Honor original meaning', 'Consult cultural experts', 'Avoid appropriation']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockPreservation)
          }
        }]
      });

      const result = await engine.preserveStorytellingTradition(
        'Native American Storytelling',
        'Native American',
        { modernSetting: 'urban environment', characters: ['young protagonist'] }
      );

      expect(result).toEqual(mockPreservation);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('cultural preservation')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Native American Storytelling')
          })
        ]),
        temperature: 0.3
      });
    });

    it('should handle tradition preservation errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Preservation Error'));

      await expect(engine.preserveStorytellingTradition('test', 'test', {}))
        .rejects.toThrow('Failed to preserve storytelling tradition');
    });
  });

  describe('adaptStoryForTradition', () => {
    it('should adapt story for traditional pattern successfully', async () => {
      const mockAdaptation = {
        adaptedStory: 'Story adapted with traditional elements',
        traditionalElements: ['circular narrative', 'spiritual guidance', 'nature connection'],
        culturalEnhancements: ['Traditional opening blessing', 'Animal spirit guides'],
        preservedOriginalElements: ['Main character', 'Core message', 'Adventure theme']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAdaptation)
          }
        }]
      });

      const story = { title: 'Adventure Story', content: 'A young hero goes on a journey' };
      const tradition = {
        name: 'Native American Storytelling',
        culturalOrigin: ['Native American'],
        structure: {
          opening: 'Sacred acknowledgment',
          development: 'Circular narrative',
          climax: 'Connection with nature',
          resolution: 'Balance restored',
          closing: 'Gratitude and reflection'
        },
        commonElements: ['animal spirits', 'nature teachers'],
        moralFramework: 'Respect for all living beings',
        adaptationGuidelines: ['Honor spiritual elements', 'Use circular structure']
      };
      const culturalContext: CulturalContext = {
        primaryLanguage: 'en',
        culturalBackground: ['native_american'],
        familyStructure: { type: 'extended' } as any,
        celebrationsAndHolidays: [],
        storytellingTraditions: ['native_american'],
        preferredNarrativeStyles: ['circular']
      };

      const result = await engine.adaptStoryForTradition(story, tradition, culturalContext);

      expect(result).toEqual(mockAdaptation);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('adapting modern stories to traditional')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Adventure Story')
          })
        ]),
        temperature: 0.3
      });
    });

    it('should handle story adaptation errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Adaptation Error'));

      await expect(engine.adaptStoryForTradition({}, {} as any, {} as any))
        .rejects.toThrow('Failed to adapt story for tradition');
    });
  });

  describe('generateCulturallyDiverseEnsemble', () => {
    it('should generate culturally diverse character ensemble', async () => {
      const mockEnsemble = {
        characters: [
          {
            name: 'Amara',
            culturalBackground: 'West African',
            role: 'storyteller',
            traits: ['wise', 'kind', 'community-oriented'],
            culturalElements: ['traditional clothing', 'storytelling traditions'],
            interactionStyle: 'inclusive and welcoming'
          },
          {
            name: 'Kenji',
            culturalBackground: 'Japanese',
            role: 'artist',
            traits: ['creative', 'respectful', 'detail-oriented'],
            culturalElements: ['artistic traditions', 'respect for elders'],
            interactionStyle: 'thoughtful and considerate'
          }
        ],
        groupDynamics: ['Mutual respect', 'Cultural sharing', 'Collaborative problem-solving'],
        culturalLearningOpportunities: ['Different art forms', 'Various storytelling styles', 'Diverse perspectives'],
        respectfulInteractions: ['Asking about traditions', 'Sharing cultural foods', 'Learning greetings']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockEnsemble)
          }
        }]
      });

      const result = await engine.generateCulturallyDiverseEnsemble(
        ['west_african', 'japanese'],
        'adventure',
        '8-10'
      );

      expect(result).toEqual(mockEnsemble);
      expect(result.characters).toHaveLength(2);
      expect(result.characters[0]).toHaveProperty('name');
      expect(result.characters[0]).toHaveProperty('culturalBackground');
      expect(result.characters[0]).toHaveProperty('culturalElements');
    });

    it('should handle ensemble generation errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Ensemble Error'));

      await expect(engine.generateCulturallyDiverseEnsemble(['test'], 'adventure', '8-10'))
        .rejects.toThrow('Failed to generate culturally diverse ensemble');
    });
  });
});