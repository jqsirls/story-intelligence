import { CulturalCharacterGenerator } from '../services/CulturalCharacterGenerator';
import { CulturalCharacterGenerationRequest } from '../types';

// Mock OpenAI
jest.mock('openai');

describe('CulturalCharacterGenerator', () => {
  let generator: CulturalCharacterGenerator;
  let mockOpenAI: any;

  beforeEach(() => {
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };

    generator = new CulturalCharacterGenerator(mockOpenAI);
  });

  describe('generateCharacter', () => {
    it('should generate culturally appropriate character', async () => {
      const mockResponse = {
        adaptedCharacter: {
          name: 'Amara',
          appearance: 'Beautiful dark skin with bright eyes',
          clothing: 'Colorful traditional dress with intricate patterns',
          personality: 'Kind, wise, and community-oriented',
          background: 'From a loving West African family',
          family: 'Lives with parents, grandparents, and siblings',
          interests: 'Storytelling, dancing, helping others',
          values: 'Respect for elders, community support, wisdom',
          language: 'Speaks local language and English',
          traditions: 'Participates in harvest festivals and storytelling circles'
        },
        culturalConsiderations: ['Authentic African naming', 'Respectful cultural representation'],
        respectfulRepresentation: true,
        suggestedModifications: ['Consider specific regional traditions']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse)
          }
        }]
      });

      const request: CulturalCharacterGenerationRequest = {
        userId: 'user-123',
        culturalBackground: ['west_african'],
        characterTraits: {
          age: 8,
          species: 'human',
          personality: 'kind'
        },
        storyContext: {
          type: 'adventure',
          setting: 'village'
        },
        respectCulturalNorms: true
      };

      const result = await generator.generateCharacter(request);

      expect(result).toEqual(mockResponse);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('culturally sensitive character creation')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Cultural Background: west_african')
          })
        ]),
        temperature: 0.4
      });
    });

    it('should handle generation errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const request: CulturalCharacterGenerationRequest = {
        userId: 'user-123',
        culturalBackground: ['japanese'],
        characterTraits: {},
        storyContext: {},
        respectCulturalNorms: true
      };

      await expect(generator.generateCharacter(request)).rejects.toThrow('Failed to generate cultural character');
    });
  });

  describe('validateCulturalRepresentation', () => {
    it('should validate respectful cultural representation', async () => {
      const mockValidation = {
        isRespectful: true,
        concerns: [],
        suggestions: ['Consider adding more cultural context']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockValidation)
          }
        }]
      });

      const character = {
        name: 'Kenji',
        appearance: 'Young Japanese boy with traditional clothing',
        personality: 'Respectful and hardworking'
      };

      const result = await generator.validateCulturalRepresentation(character, ['japanese']);

      expect(result).toEqual(mockValidation);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('cultural sensitivity expert')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Cultural Background: japanese')
          })
        ]),
        temperature: 0.2
      });
    });

    it('should identify cultural concerns', async () => {
      const mockValidation = {
        isRespectful: false,
        concerns: ['Stereotypical representation', 'Inappropriate cultural elements'],
        suggestions: ['Use more authentic details', 'Avoid stereotypes']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockValidation)
          }
        }]
      });

      const character = {
        name: 'Generic Asian Name',
        appearance: 'Stereotypical description',
        personality: 'Martial arts expert'
      };

      const result = await generator.validateCulturalRepresentation(character, ['east_asian']);

      expect(result.isRespectful).toBe(false);
      expect(result.concerns).toContain('Stereotypical representation');
      expect(result.suggestions).toContain('Use more authentic details');
    });

    it('should handle validation errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Validation Error'));

      const result = await generator.validateCulturalRepresentation({}, ['test']);

      expect(result).toEqual({
        isRespectful: false,
        concerns: ['Unable to validate due to technical error'],
        suggestions: ['Please review character manually for cultural sensitivity']
      });
    });
  });

  describe('generateCulturalNames', () => {
    it('should generate culturally appropriate names', async () => {
      const mockNames = {
        suggestions: [
          {
            name: 'Amara',
            meaning: 'Grace or eternal',
            pronunciation: 'ah-MAH-rah',
            culturalSignificance: 'Popular name in West African cultures, symbolizing beauty and grace'
          },
          {
            name: 'Kofi',
            meaning: 'Born on Friday',
            pronunciation: 'KOH-fee',
            culturalSignificance: 'Traditional Akan name from Ghana, part of day-naming tradition'
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockNames)
          }
        }]
      });

      const result = await generator.generateCulturalNames(['west_african'], 'female', 'strength');

      expect(result).toEqual(mockNames);
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0]).toHaveProperty('name');
      expect(result.suggestions[0]).toHaveProperty('meaning');
      expect(result.suggestions[0]).toHaveProperty('pronunciation');
      expect(result.suggestions[0]).toHaveProperty('culturalSignificance');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('cultural naming traditions')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('west_african')
          })
        ]),
        temperature: 0.3
      });
    });

    it('should handle name generation errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Name Generation Error'));

      const result = await generator.generateCulturalNames(['test_culture']);

      expect(result).toEqual({ suggestions: [] });
    });
  });

  describe('getCulturalCharacterTraits', () => {
    it('should return cultural character traits', async () => {
      const traits = await generator.getCulturalCharacterTraits(['japanese', 'korean']);

      expect(traits).toBeInstanceOf(Array);
      expect(traits.length).toBeGreaterThan(0);
      
      if (traits.length > 0) {
        expect(traits[0]).toHaveProperty('trait');
        expect(traits[0]).toHaveProperty('culturalVariations');
      }
    });

    it('should include common character traits', async () => {
      const traits = await generator.getCulturalCharacterTraits(['test_culture']);
      const traitNames = traits.map(trait => trait.trait);

      expect(traitNames).toContain('name');
      expect(traitNames).toContain('appearance');
      expect(traitNames).toContain('clothing');
      expect(traitNames).toContain('food_preferences');
      expect(traitNames).toContain('family_structure');
    });
  });
});