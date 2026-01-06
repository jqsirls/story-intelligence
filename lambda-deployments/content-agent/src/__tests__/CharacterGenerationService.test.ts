import { CharacterGenerationService, CharacterGenerationRequest } from '../services/CharacterGenerationService';
import OpenAI from 'openai';
import { createLogger } from 'winston';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('CharacterGenerationService', () => {
  let service: CharacterGenerationService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let logger: any;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    mockOpenAI = new MockedOpenAI() as jest.Mocked<OpenAI>;
    service = new CharacterGenerationService(mockOpenAI, logger);
  });

  describe('processCharacterGeneration', () => {
    it('should handle greeting phase', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: "Hi there! I'm so excited to help you create an amazing character! What should we call your new friend?"
          }
        }]
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn()
            .mockResolvedValueOnce({
              choices: [{
                message: {
                  function_call: {
                    arguments: JSON.stringify({})
                  }
                }
              }]
            })
            .mockResolvedValueOnce(mockResponse)
        }
      } as any;

      const request: CharacterGenerationRequest = {
        userId: 'user123',
        sessionId: 'session123',
        libraryId: 'lib123',
        conversationHistory: [],
        currentPhase: 'greeting',
        ageContext: 7
      };

      const result = await service.processCharacterGeneration(request);

      expect(result.phase).toBe('greeting');
      expect(result.nextPhase).toBe('basic_traits');
      expect(result.isComplete).toBe(false);
      expect(result.response).toContain('excited');
      expect(result.suggestedQuestions).toContain("What should we call your character?");
    });

    it('should extract character traits from conversation', async () => {
      const mockExtractionResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                name: 'Luna',
                age: 8,
                species: 'human',
                appearance: {
                  eyeColor: 'blue',
                  hairColor: 'brown'
                },
                personality: ['brave', 'kind']
              })
            }
          }
        }]
      };

      const mockConversationResponse = {
        choices: [{
          message: {
            content: "Luna sounds like a wonderful name! And 8 years old is perfect. Tell me, is Luna a human, an animal, or something magical?"
          }
        }]
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn()
            .mockResolvedValueOnce(mockExtractionResponse)
            .mockResolvedValueOnce(mockConversationResponse)
        }
      } as any;

      const request: CharacterGenerationRequest = {
        userId: 'user123',
        sessionId: 'session123',
        libraryId: 'lib123',
        conversationHistory: [
          {
            speaker: 'user',
            message: 'I want to create a character named Luna who is 8 years old',
            timestamp: new Date().toISOString()
          }
        ],
        currentPhase: 'basic_traits',
        userInput: 'I want to create a character named Luna who is 8 years old',
        ageContext: 7
      };

      const result = await service.processCharacterGeneration(request);

      expect(result.extractedTraits.name).toBe('Luna');
      expect(result.extractedTraits.age).toBe(8);
      expect(result.extractedTraits.species).toBe('human');
      expect(result.extractedTraits.personality).toContain('brave');
      expect(result.nextPhase).toBe('species_selection');
    });

    it('should validate character appropriately', async () => {
      const traits = {
        name: 'Hero',
        age: 10,
        species: 'human',
        appearance: {
          eyeColor: 'green',
          hairColor: 'black'
        },
        personality: ['brave', 'kind', 'helpful']
      };

      const validation = await service['validateCharacter'](traits, 8);

      expect(validation.isValid).toBe(true);
      expect(validation.ageAppropriate).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should flag inappropriate character traits', async () => {
      const traits = {
        name: 'Villain',
        age: 25, // Too old for 8-year-old user
        species: 'human',
        personality: ['violent', 'mean', 'scary']
      };

      const validation = await service['validateCharacter'](traits, 8);

      expect(validation.isValid).toBe(false);
      expect(validation.ageAppropriate).toBe(false);
      expect(validation.issues.some(i => i.type === 'age_inappropriate')).toBe(true);
      expect(validation.issues.some(i => i.type === 'safety_concern')).toBe(true);
    });

    it('should identify missing required fields', async () => {
      const traits = {
        appearance: {
          eyeColor: 'blue'
        },
        personality: ['kind']
      };

      const validation = await service['validateCharacter'](traits, 8);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(i => i.field === 'name')).toBe(true);
      expect(validation.issues.some(i => i.field === 'age')).toBe(true);
      expect(validation.issues.some(i => i.field === 'species')).toBe(true);
    });
  });

  describe('createCharacterFromTraits', () => {
    it('should create a complete character from traits', async () => {
      const traits = {
        name: 'Zara',
        age: 9,
        species: 'magical_creature',
        appearance: {
          eyeColor: 'purple',
          hairColor: 'silver',
          clothing: 'sparkly dress'
        },
        personality: ['magical', 'wise', 'kind'],
        interests: ['reading', 'flying'],
        inclusivityTraits: [{
          type: 'autism' as const,
          description: 'Thinks differently and sees patterns others miss',
          storyIntegration: 'Uses unique perspective to solve problems'
        }]
      };

      const character = await service.createCharacterFromTraits(
        traits,
        'lib123',
        'user123'
      );

      expect(character.name).toBe('Zara');
      expect(character.traits.age).toBe(9);
      expect(character.traits.species).toBe('magical_creature');
      expect(character.traits.appearance.eyeColor).toBe('purple');
      expect(character.traits.personality).toContain('magical');
      expect(character.traits.inclusivityTraits).toHaveLength(1);
      expect(character.artPrompt).toContain('magical_creature');
      expect(character.artPrompt).toContain('purple eyes');
      expect(character.id).toBeDefined();
      expect(character.libraryId).toBe('lib123');
    });

    it('should generate appropriate art prompt', async () => {
      const traits = {
        name: 'Robot Bob',
        age: 100,
        species: 'robot',
        appearance: {
          eyeColor: 'red',
          clothing: 'metal suit'
        },
        personality: ['helpful', 'friendly']
      };

      const artPrompt = await service['generateArtPrompt'](traits);

      expect(artPrompt).toContain('robot');
      expect(artPrompt).toContain('red eyes');
      expect(artPrompt).toContain('metal suit');
      expect(artPrompt).toContain('friendly');
      expect(artPrompt).toContain('children\'s book illustration');
    });
  });

  describe('getSpeciesOptions', () => {
    it('should return all available species options', () => {
      const options = service.getSpeciesOptions();

      expect(options).toHaveLength(7);
      expect(options.every(option => option.ageAppropriate)).toBe(true);
      expect(options.some(option => option.value === 'human')).toBe(true);
      expect(options.some(option => option.value === 'magical_creature')).toBe(true);
      expect(options.some(option => option.value === 'robot')).toBe(true);
    });
  });

  describe('getInclusivityOptions', () => {
    it('should return all available inclusivity options', () => {
      const options = service.getInclusivityOptions();

      expect(options.length).toBeGreaterThan(5);
      expect(options.every(option => option.ageAppropriate)).toBe(true);
      expect(options.some(option => option.type === 'autism')).toBe(true);
      expect(options.some(option => option.type === 'wheelchair')).toBe(true);
      expect(options.some(option => option.type === 'prosthetic')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return error response on API failure', async () => {
      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      } as any;

      const request: CharacterGenerationRequest = {
        userId: 'user123',
        sessionId: 'session123',
        libraryId: 'lib123',
        conversationHistory: [],
        currentPhase: 'greeting'
      };

      const result = await service.processCharacterGeneration(request);

      expect(result.response).toContain('Something went wrong');
      expect(result.isComplete).toBe(false);
      expect(result.suggestedQuestions).toBeDefined();
    });
  });
});