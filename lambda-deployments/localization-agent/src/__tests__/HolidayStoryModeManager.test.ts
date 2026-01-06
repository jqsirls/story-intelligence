import { HolidayStoryModeManager } from '../services/HolidayStoryModeManager';
import { HolidayStoryRequest } from '../services/HolidayStoryModeManager';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('openai');

describe('HolidayStoryModeManager', () => {
  let manager: HolidayStoryModeManager;
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

    manager = new HolidayStoryModeManager(mockSupabase, mockOpenAI);
  });

  describe('createHolidayStory', () => {
    it('should create holiday story successfully', async () => {
      const mockStoryResponse = {
        story: {
          title: 'The Festival of Lights',
          content: 'Once upon a time, during Diwali, a young girl named Priya learned about the importance of light over darkness...',
          culturalElements: ['diyas (oil lamps)', 'rangoli patterns', 'family traditions'],
          educationalNotes: ['Diwali celebrates the victory of light over darkness', 'Families come together to share sweets and prayers'],
          interactiveElements: ['Ask children what lights they see around them', 'Encourage them to think about what brings light to their lives']
        },
        activities: [
          {
            name: 'Make Paper Diyas',
            description: 'Create beautiful paper oil lamps to celebrate the festival',
            materials: ['colored paper', 'scissors', 'glue', 'LED tea lights'],
            culturalSignificance: 'Diyas represent the light that dispels darkness and ignorance'
          }
        ],
        learningObjectives: ['Understanding Diwali traditions', 'Appreciating the symbolism of light', 'Learning about Indian culture'],
        familyDiscussionPoints: ['What does light mean to your family?', 'How do you celebrate special occasions?', 'What traditions are important to you?']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockStoryResponse)
          }
        }]
      });

      const request: HolidayStoryRequest = {
        userId: 'user-123',
        holiday: 'Diwali',
        culturalContext: ['hindu', 'indian'],
        userAge: 7,
        storyPreferences: {
          length: 'medium',
          interactivity: 'high',
          educationalFocus: 'cultural'
        }
      };

      const result = await manager.createHolidayStory(request);

      expect(result).toEqual(mockStoryResponse);
      expect(result.story.title).toBe('The Festival of Lights');
      expect(result.story.culturalElements).toContain('diyas (oil lamps)');
      expect(result.activities).toHaveLength(1);
      expect(result.activities[0].name).toBe('Make Paper Diyas');
      expect(result.learningObjectives).toContain('Understanding Diwali traditions');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('culturally authentic holiday stories')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Diwali')
          })
        ]),
        temperature: 0.4
      });
    });

    it('should handle holiday story creation errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Story Creation Error'));

      const request: HolidayStoryRequest = {
        userId: 'user-123',
        holiday: 'Christmas',
        culturalContext: ['christian'],
        userAge: 6,
        storyPreferences: {
          length: 'short',
          interactivity: 'low',
          educationalFocus: 'values'
        }
      };

      await expect(manager.createHolidayStory(request)).rejects.toThrow('Failed to create holiday story');
    });
  });

  describe('getSeasonalStoryCalendar', () => {
    it('should return seasonal story calendar', async () => {
      const calendar = await manager.getSeasonalStoryCalendar(['christian', 'jewish', 'hindu']);

      expect(calendar).toBeInstanceOf(Array);
      expect(calendar.length).toBe(12); // 12 months

      // Check that each month has the expected structure
      calendar.forEach(month => {
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('holidays');
        expect(month.holidays).toBeInstanceOf(Array);
        
        if (month.holidays.length > 0) {
          expect(month.holidays[0]).toHaveProperty('name');
          expect(month.holidays[0]).toHaveProperty('cultures');
          expect(month.holidays[0]).toHaveProperty('storyThemes');
          expect(month.holidays[0]).toHaveProperty('ageAppropriate');
        }
      });

      // Check specific months
      const december = calendar.find(month => month.month === 'December');
      expect(december).toBeDefined();
      expect(december!.holidays.some(holiday => holiday.name === 'Christmas')).toBe(true);
      expect(december!.holidays.some(holiday => holiday.name === 'Hanukkah')).toBe(true);

      const october = calendar.find(month => month.month === 'October');
      expect(october).toBeDefined();
      expect(october!.holidays.some(holiday => holiday.name === 'Diwali')).toBe(true);
    });
  });

  describe('getHolidayStorySuggestions', () => {
    it('should return holiday story suggestions based on date and context', async () => {
      const mockSuggestions = [
        {
          holiday: 'Christmas',
          urgency: 'upcoming',
          culturalRelevance: 0.9,
          storyIdeas: ['Santa\'s workshop adventure', 'The true meaning of giving', 'Christmas around the world'],
          educationalValue: ['Learning about generosity', 'Understanding different Christmas traditions', 'Appreciating family time']
        },
        {
          holiday: 'Hanukkah',
          urgency: 'upcoming',
          culturalRelevance: 0.8,
          storyIdeas: ['The miracle of the oil', 'Eight nights of celebration', 'Dreidel games and traditions'],
          educationalValue: ['Learning about Jewish traditions', 'Understanding perseverance', 'Appreciating religious freedom']
        }
      ];

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockSuggestions)
          }
        }]
      });

      const currentDate = new Date('2023-12-01'); // December 1st
      const result = await manager.getHolidayStorySuggestions(['christian', 'jewish'], currentDate, 8);

      expect(result).toEqual(mockSuggestions);
      expect(result).toHaveLength(2);
      expect(result[0].holiday).toBe('Christmas');
      expect(result[0].urgency).toBe('upcoming');
      expect(result[0].culturalRelevance).toBe(0.9);
      expect(result[1].holiday).toBe('Hanukkah');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('global holiday traditions')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('2023-12-01')
          })
        ]),
        temperature: 0.3
      });
    });

    it('should handle suggestion generation errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Suggestion Error'));

      const result = await manager.getHolidayStorySuggestions(['test'], new Date(), 8);

      expect(result).toEqual([]);
    });
  });

  describe('createMulticulturalHolidayStory', () => {
    it('should create multicultural holiday story successfully', async () => {
      const mockMulticulturalStory = {
        story: {
          title: 'Lights Around the World',
          content: 'In a diverse neighborhood, children celebrate both Christmas and Diwali together...',
          culturalElements: ['Christmas lights', 'Diwali diyas', 'shared celebrations', 'cultural exchange'],
          educationalNotes: ['Both holidays celebrate light', 'Different cultures can celebrate together', 'Shared values across traditions'],
          interactiveElements: ['Compare different types of lights', 'Discuss family traditions', 'Share holiday foods']
        },
        activities: [
          {
            name: 'International Light Festival',
            description: 'Create a celebration that honors both Christmas and Diwali traditions',
            materials: ['Christmas lights', 'paper diyas', 'decorative materials'],
            culturalSignificance: 'Shows how different cultures can celebrate together while respecting each tradition'
          }
        ],
        learningObjectives: ['Understanding multiple cultural traditions', 'Appreciating diversity', 'Finding common ground'],
        familyDiscussionPoints: ['How are Christmas and Diwali similar?', 'What can we learn from other cultures?', 'How can we celebrate together respectfully?']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockMulticulturalStory)
          }
        }]
      });

      const result = await manager.createMulticulturalHolidayStory(
        ['Christmas', 'Diwali'],
        ['christian', 'hindu'],
        8,
        'celebration of light'
      );

      expect(result).toEqual(mockMulticulturalStory);
      expect(result.story.title).toBe('Lights Around the World');
      expect(result.story.culturalElements).toContain('Christmas lights');
      expect(result.story.culturalElements).toContain('Diwali diyas');
      expect(result.learningObjectives).toContain('Understanding multiple cultural traditions');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('inclusive multicultural stories')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Christmas, Diwali')
          })
        ]),
        temperature: 0.4
      });
    });

    it('should handle multicultural story creation errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Multicultural Story Error'));

      await expect(manager.createMulticulturalHolidayStory(['test'], ['test'], 8, 'test'))
        .rejects.toThrow('Failed to create multicultural holiday story');
    });
  });

  describe('generateHolidayCharacterVariations', () => {
    it('should generate holiday character variations', async () => {
      const mockVariations = [
        {
          variation: 'Christmas version with festive clothing and holiday spirit',
          culturalElements: ['Christmas sweater', 'holiday decorations', 'gift-giving spirit'],
          holidaySpecificTraits: ['generous', 'festive', 'family-oriented'],
          respectfulAdaptations: ['Participates in gift exchange', 'Helps decorate the tree', 'Shares holiday cookies']
        },
        {
          variation: 'Winter celebration version focusing on universal themes',
          culturalElements: ['warm winter clothing', 'snow activities', 'cozy gatherings'],
          holidaySpecificTraits: ['warm-hearted', 'community-minded', 'celebratory'],
          respectfulAdaptations: ['Enjoys winter activities', 'Brings people together', 'Celebrates the season']
        }
      ];

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockVariations)
          }
        }]
      });

      const baseCharacter = {
        name: 'Emma',
        age: 8,
        personality: 'kind and curious'
      };

      const result = await manager.generateHolidayCharacterVariations(
        baseCharacter,
        'Christmas',
        ['christian', 'western']
      );

      expect(result).toEqual(mockVariations);
      expect(result).toHaveLength(2);
      expect(result[0].variation).toContain('Christmas version');
      expect(result[0].culturalElements).toContain('Christmas sweater');
      expect(result[1].variation).toContain('Winter celebration');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('adapting characters for holiday-themed stories')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Christmas')
          })
        ]),
        temperature: 0.4
      });
    });

    it('should handle character variation generation errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Character Variation Error'));

      const result = await manager.generateHolidayCharacterVariations({}, 'test', ['test']);

      expect(result).toEqual([]);
    });
  });

  describe('createHolidayActivities', () => {
    it('should create holiday activities successfully', async () => {
      const mockActivities = [
        {
          activity: 'Diwali Rangoli Art',
          type: 'craft',
          materials: ['colored sand', 'stencils', 'flowers', 'candles'],
          instructions: ['Choose a design', 'Create the pattern', 'Add colors carefully', 'Place diyas around'],
          culturalSignificance: 'Rangoli patterns welcome prosperity and good luck into the home',
          safetyNotes: ['Adult supervision with candles', 'Use non-toxic materials'],
          adaptations: {
            '3-5': ['Use larger stencils', 'Pre-made patterns', 'Washable materials'],
            '6-8': ['Simple geometric patterns', 'Basic color mixing', 'LED candles'],
            '9-12': ['Complex designs', 'Traditional patterns', 'Real diyas with supervision']
          }
        }
      ];

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockActivities)
          }
        }]
      });

      const result = await manager.createHolidayActivities('Diwali', ['hindu'], 8, 'celebration of light');

      expect(result).toEqual(mockActivities);
      expect(result).toHaveLength(1);
      expect(result[0].activity).toBe('Diwali Rangoli Art');
      expect(result[0].type).toBe('craft');
      expect(result[0].culturalSignificance).toContain('Rangoli patterns');
      expect(result[0].adaptations).toHaveProperty('3-5');
      expect(result[0].adaptations).toHaveProperty('6-8');
      expect(result[0].adaptations).toHaveProperty('9-12');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('culturally authentic and age-appropriate holiday activities')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Diwali')
          })
        ]),
        temperature: 0.4
      });
    });

    it('should handle activity creation errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Activity Creation Error'));

      const result = await manager.createHolidayActivities('test', ['test'], 8, 'test');

      expect(result).toEqual([]);
    });
  });
});