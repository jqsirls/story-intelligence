import { StoryCreationService } from '../services/StoryCreationService';
import OpenAI from 'openai';
import { createLogger } from 'winston';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('StoryCreationService', () => {
  let service: StoryCreationService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockLogger: any;

  beforeEach(() => {
    mockOpenAI = new MockedOpenAI() as jest.Mocked<OpenAI>;
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Mock OpenAI chat completions
    mockOpenAI.chat = {
      completions: {
        create: jest.fn()
      }
    } as any;

    service = new StoryCreationService(mockOpenAI, mockLogger);
  });

  describe('createStoryDraft', () => {
    it('should create a story draft with hero\'s journey structure', async () => {
      // Mock OpenAI responses
      (mockOpenAI.chat.completions.create as jest.Mock)
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'Hero\'s journey outline for Adventure story...'
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify([
                { text: 'Let\'s explore the forest!', consequence: 'You enter the magical forest.' },
                { text: 'I want to meet new friends!', consequence: 'You look for friendly creatures.' },
                { text: 'Let\'s find treasure!', consequence: 'You search for hidden treasure.' }
              ])
            }
          }]
        });

      const request = {
        characterId: 'char-123',
        storyType: 'Adventure' as const,
        userAge: 6,
        preferences: {
          themes: ['friendship', 'courage']
        }
      };

      const result = await service.createStoryDraft(request);

      expect(result).toMatchObject({
        characterId: 'char-123',
        storyType: 'Adventure',
        outline: expect.stringContaining('Hero\'s journey'),
        currentBeat: 0,
        choices: expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('explore'),
            consequence: expect.any(String)
          })
        ])
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith('Creating story draft', {
        characterId: 'char-123',
        storyType: 'Adventure'
      });
    });

    it('should handle OpenAI API errors gracefully', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock)
        .mockRejectedValue(new Error('OpenAI API error'));

      const request = {
        characterId: 'char-123',
        storyType: 'Adventure' as const,
        userAge: 6
      };

      await expect(service.createStoryDraft(request)).rejects.toThrow('OpenAI API error');
    });
  });

  describe('continueStoryBeat', () => {
    it('should generate next story beat based on user choice', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock)
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'As you enter the magical forest, you see sparkling lights dancing between the trees...'
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify([
                { text: 'Follow the lights!', consequence: 'You chase the magical lights.' },
                { text: 'Look for animals!', consequence: 'You search for forest creatures.' },
                { text: 'Climb a tree!', consequence: 'You climb up to get a better view.' }
              ])
            }
          }]
        });

      const request = {
        storyId: 'story-123',
        userChoice: 'Let\'s explore the forest!',
        voiceInput: 'I want to go into the forest and see what\'s there'
      };

      const result = await service.continueStoryBeat(request);

      expect(result).toMatchObject({
        beat: expect.objectContaining({
          content: expect.stringContaining('magical forest'),
          emotionalTone: expect.any(String)
        }),
        choices: expect.arrayContaining([
          expect.objectContaining({
            text: expect.any(String),
            consequence: expect.any(String)
          })
        ]),
        isComplete: false
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Continuing story beat', {
        storyId: 'story-123'
      });
    });

    it('should detect story completion', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock)
        .mockResolvedValue({
          choices: [{
            message: {
              content: 'And so your adventure comes to an end. [STORY_END]'
            }
          }]
        });

      const request = {
        storyId: 'story-123',
        userChoice: 'Go home with the treasure'
      };

      const result = await service.continueStoryBeat(request);

      expect(result.isComplete).toBe(true);
      expect(result.choices).toHaveLength(0);
    });
  });

  describe('editStoryViaVoice', () => {
    it('should parse voice edit commands and apply changes', async () => {
      // Mock parsing response
      (mockOpenAI.chat.completions.create as jest.Mock)
        .mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                type: 'character_change',
                target: 'main character',
                change: 'make them a dragon instead of human'
              })
            }
          }]
        });

      const request = {
        storyId: 'story-123',
        voiceCommand: 'Actually, can we make the character a dragon instead?',
        targetBeat: 2
      };

      const result = await service.editStoryViaVoice(request);

      expect(result).toMatchObject({
        updatedBeats: expect.any(Array),
        affectedCharacters: expect.any(Array),
        narrativeChanges: expect.arrayContaining([
          expect.stringContaining('character_change')
        ])
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Editing story via voice', {
        storyId: 'story-123',
        command: 'Actually, can we make the character a dragon instead?'
      });
    });

    it('should handle invalid voice commands gracefully', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock)
        .mockResolvedValue({
          choices: [{
            message: {
              content: 'invalid json'
            }
          }]
        });

      const request = {
        storyId: 'story-123',
        voiceCommand: 'change something unclear'
      };

      const result = await service.editStoryViaVoice(request);

      expect(result.narrativeChanges).toContain('Applied plot_change: change something unclear');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to parse voice edit command', {
        error: expect.any(Error)
      });
    });
  });

  describe('adaptStoryForCharacterChange', () => {
    it('should analyze character changes and update story accordingly', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock)
        .mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                affectedBeats: [1, 2, 3],
                narrativeChanges: ['hands → paws', 'walked → bounded'],
                requiredUpdates: ['Update movement descriptions', 'Change interaction methods']
              })
            }
          }]
        });

      const characterChanges = {
        characterId: 'char-123',
        from: { species: 'human', hands: true },
        to: { species: 'dog', paws: true }
      };

      const result = await service.adaptStoryForCharacterChange('story-123', characterChanges);

      expect(result).toMatchObject({
        updatedBeats: expect.any(Array),
        affectedCharacters: expect.arrayContaining(['char-123']),
        narrativeChanges: expect.arrayContaining([
          'hands → paws',
          'walked → bounded'
        ])
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Adapting story for character changes', {
        storyId: 'story-123',
        changes: ['characterId', 'from', 'to']
      });
    });
  });

  describe('finalizeStory', () => {
    it('should finalize story when confirmed', async () => {
      const result = await service.finalizeStory('story-123', true);

      expect(result).toMatchObject({
        id: 'story-123',
        status: 'final',
        content: expect.objectContaining({
          heroJourneyStructure: expect.arrayContaining([
            expect.objectContaining({
              stage: 'ordinary_world',
              completed: true
            })
          ])
        }),
        finalizedAt: expect.any(String)
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Finalizing story', {
        storyId: 'story-123',
        confirmed: true
      });
    });

    it('should throw error when not confirmed', async () => {
      await expect(service.finalizeStory('story-123', false))
        .rejects.toThrow('Story finalization requires user confirmation');
    });
  });

  describe('hero\'s journey structure', () => {
    it('should generate all 12 hero\'s journey beats', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock)
        .mockResolvedValue({
          choices: [{
            message: {
              content: `
                1. Ordinary World - Character's normal life
                2. Call to Adventure - The inciting incident
                3. Refusal of the Call - Initial hesitation
                4. Meeting the Mentor - Guidance appears
                5. Crossing the Threshold - Entering the adventure
                6. Tests, Allies, and Enemies - Challenges and relationships
                7. Approach to the Inmost Cave - Preparing for the main challenge
                8. Ordeal - The climactic challenge
                9. Reward - Success and what's gained
                10. The Road Back - Beginning the return journey
                11. Resurrection - Final test and transformation
                12. Return with the Elixir - How the character has changed
              `
            }
          }]
        });

      const request = {
        characterId: 'char-123',
        storyType: 'Adventure' as const,
        userAge: 8
      };

      const result = await service.createStoryDraft(request);

      expect(result.outline).toContain('Ordinary World');
      expect(result.outline).toContain('Call to Adventure');
      expect(result.outline).toContain('Return with the Elixir');
    });
  });

  describe('age-appropriate content', () => {
    it('should adapt content for different age groups', async () => {
      const youngChildRequest = {
        characterId: 'char-123',
        storyType: 'Bedtime' as const,
        userAge: 3
      };

      const olderChildRequest = {
        characterId: 'char-123',
        storyType: 'Adventure' as const,
        userAge: 9
      };

      // Mock different responses for different ages
      (mockOpenAI.chat.completions.create as jest.Mock)
        .mockResolvedValue({
          choices: [{
            message: {
              content: 'Age-appropriate story outline...'
            }
          }]
        });

      await service.createStoryDraft(youngChildRequest);
      await service.createStoryDraft(olderChildRequest);

      // Verify that age is passed to OpenAI prompts
      const calls = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls;
      expect(calls[0][0].messages[1].content).toContain('age 3');
      expect(calls[2][0].messages[1].content).toContain('age 9');
    });
  });

  describe('error handling', () => {
    it('should provide default choices when choice generation fails', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock)
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'Valid outline'
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'invalid json for choices'
            }
          }]
        });

      const request = {
        characterId: 'char-123',
        storyType: 'Adventure' as const,
        userAge: 6
      };

      const result = await service.createStoryDraft(request);

      expect(result.choices).toHaveLength(3);
      expect(result.choices[0].text).toContain('explore');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to parse initial choices', {
        error: expect.any(Error)
      });
    });
  });
});