import { EducationalActivitiesService, EducationalActivitiesConfig, ActivityType } from '../services/EducationalActivitiesService';
import { Story, Character } from '@storytailor/shared-types';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('EducationalActivitiesService', () => {
  let service: EducationalActivitiesService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let config: EducationalActivitiesConfig;

  beforeEach(() => {
    config = {
      openaiApiKey: 'test-key',
      maxActivities: 4,
      ageRanges: {
        'toddler': { min: 2, max: 3, developmentalStage: 'toddler' },
        'preschool': { min: 3, max: 5, developmentalStage: 'preschool' },
        'early_elementary': { min: 6, max: 8, developmentalStage: 'early elementary' }
      }
    };

    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;

    MockedOpenAI.mockImplementation(() => mockOpenAI);
    service = new EducationalActivitiesService(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateActivities', () => {
    it('should generate 4 educational activities for a story', async () => {
      const story: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'The Brave Little Explorer',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [
            {
              id: 'beat1',
              sequence: 1,
              content: 'A young explorer discovers a magical forest filled with friendly creatures.',
              emotionalTone: 'excited'
            },
            {
              id: 'beat2',
              sequence: 2,
              content: 'They learn to overcome their fears and make new friends.',
              emotionalTone: 'brave'
            }
          ],
          characters: ['char1'],
          theme: 'courage',
          setting: 'magical forest',
          mood: 'adventurous',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 6,
        createdAt: '2024-01-01'
      };

      const character: Character = {
        id: 'char1',
        libraryId: 'lib1',
        name: 'Alex',
        traits: {
          name: 'Alex',
          age: 6,
          species: 'human',
          appearance: { eyeColor: 'brown' },
          personality: ['brave', 'curious']
        },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const mockResponse = {
        choices: [{
          message: {
            content: `
Title: Forest Adventure Obstacle Course
Description: Create an indoor obstacle course inspired by the magical forest
Duration: 20-30 minutes
Materials:
- Pillows and cushions
- Blankets
- Cardboard boxes
- Stuffed animals
Instructions:
1. Set up obstacle course stations
2. Guide child through each challenge
3. Celebrate achievements together
Learning Objectives:
- Develop gross motor skills
- Build confidence and courage
- Practice problem-solving
Story Connection: Recreates the explorer's journey through the magical forest
Younger Adaptation: Simplify obstacles and provide more assistance
Older Adaptation: Add timing challenges and complex movements
Special Needs: Modify obstacles for accessibility
Parent Tips: Encourage and celebrate effort over perfection
Safety: Ensure soft landing areas and clear pathways
            `
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse as any);

      const result = await service.generateActivities({
        story,
        character,
        targetAge: 6
      });

      expect(result.activities).toHaveLength(4);
      expect(result.metadata.storyId).toBe('story1');
      expect(result.metadata.characterId).toBe('char1');
      expect(result.metadata.targetAge).toBe(6);
      expect(result.metadata.storyThemes).toContain('courage');
      
      // Check that activities have required properties
      result.activities.forEach(activity => {
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('title');
        expect(activity).toHaveProperty('description');
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('materials');
        expect(activity).toHaveProperty('instructions');
        expect(activity).toHaveProperty('learningObjectives');
        expect(activity).toHaveProperty('storyConnection');
        expect(activity).toHaveProperty('adaptations');
        expect(activity).toHaveProperty('parentTips');
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(4);
    });

    it('should respect preferred activity types', async () => {
      const story: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'Art Adventure',
        content: {
          type: 'Educational',
          audience: 'child',
          complexity: 'simple',
          beats: [{ id: 'beat1', sequence: 1, content: 'Learning about colors', emotionalTone: 'curious' }],
          characters: [],
          theme: 'creativity',
          setting: 'art studio',
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
        name: 'Artist',
        traits: { name: 'Artist', species: 'human', appearance: {} },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const preferredTypes: ActivityType[] = ['creative_arts', 'sensory_play'];

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Title: Creative Activity\nDescription: Art-based activity\nDuration: 15 minutes'
          }
        }]
      } as any);

      const result = await service.generateActivities({
        story,
        character,
        targetAge: 5,
        preferredTypes
      });

      // Should include the preferred types
      const activityTypes = result.activities.map(a => a.type);
      expect(activityTypes).toContain('creative_arts');
      expect(activityTypes).toContain('sensory_play');
    });

    it('should consider available materials', async () => {
      const story: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'Building Story',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [{ id: 'beat1', sequence: 1, content: 'Building a fort', emotionalTone: 'excited' }],
          characters: [],
          theme: 'construction',
          setting: 'backyard',
          mood: 'adventurous',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 7,
        createdAt: '2024-01-01'
      };

      const character: Character = {
        id: 'char1',
        libraryId: 'lib1',
        name: 'Builder',
        traits: { name: 'Builder', species: 'human', appearance: {} },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const availableMaterials = ['cardboard boxes', 'tape', 'markers', 'scissors'];

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: `
Title: Cardboard Fort Building
Materials:
- Cardboard boxes
- Tape
- Markers
Description: Build a fort using available materials
            `
          }
        }]
      } as any);

      const result = await service.generateActivities({
        story,
        character,
        targetAge: 7,
        availableMaterials
      });

      // Check that the prompt included available materials
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[1].content).toContain('cardboard boxes');
      expect(callArgs.messages[1].content).toContain('tape');
    });
  });

  describe('regenerateActivities', () => {
    it('should regenerate all activities when major elements change', async () => {
      const originalActivities = {
        activities: [
          {
            id: 'activity1',
            title: 'Original Activity',
            description: 'Original description',
            type: 'creative_arts' as ActivityType,
            ageRange: { min: 5, max: 8 },
            duration: '15 minutes',
            materials: ['paper'],
            instructions: ['draw'],
            learningObjectives: ['creativity'],
            storyConnection: 'connects to old story',
            adaptations: {
              younger: 'simplify',
              older: 'complexify',
              specialNeeds: 'adapt'
            },
            parentTips: ['encourage']
          }
        ],
        metadata: {
          storyId: 'story1',
          characterId: 'char1',
          targetAge: 6,
          generatedAt: '2024-01-01T00:00:00Z',
          storyThemes: ['old theme'],
          learningDomains: ['art']
        }
      };

      const updatedStory: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'New Adventure',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [{ id: 'beat1', sequence: 1, content: 'New content', emotionalTone: 'excited' }],
          characters: [],
          theme: 'new theme',
          setting: 'new setting',
          mood: 'adventurous',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 6,
        createdAt: '2024-01-01'
      };

      const changedElements = ['theme', 'setting'];

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Title: New Activity\nDescription: Updated activity'
          }
        }]
      } as any);

      const result = await service.regenerateActivities(
        originalActivities,
        updatedStory,
        changedElements
      );

      expect(result.activities).toHaveLength(4); // Should generate new full set
      expect(result.metadata.storyThemes).toContain('new theme');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    it('should update activities for minor story changes', async () => {
      const originalActivities = {
        activities: [
          {
            id: 'activity1',
            title: 'Original Activity',
            description: 'Original description',
            type: 'creative_arts' as ActivityType,
            ageRange: { min: 5, max: 8 },
            duration: '15 minutes',
            materials: ['paper'],
            instructions: ['draw'],
            learningObjectives: ['creativity'],
            storyConnection: 'connects to old story',
            adaptations: {
              younger: 'simplify',
              older: 'complexify',
              specialNeeds: 'adapt'
            },
            parentTips: ['encourage']
          }
        ],
        metadata: {
          storyId: 'story1',
          characterId: 'char1',
          targetAge: 6,
          generatedAt: '2024-01-01T00:00:00Z',
          storyThemes: ['old theme'],
          learningDomains: ['art']
        }
      };

      const updatedStory: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'Updated Adventure',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [{ id: 'beat1', sequence: 1, content: 'Updated content', emotionalTone: 'excited' }],
          characters: [],
          theme: 'courage',
          setting: 'forest',
          mood: 'adventurous',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 6,
        createdAt: '2024-01-01'
      };

      const changedElements = ['content']; // Minor change

      const result = await service.regenerateActivities(
        originalActivities,
        updatedStory,
        changedElements
      );

      expect(result.activities).toHaveLength(1); // Same number as original
      expect(result.activities[0].storyConnection).toContain('courage');
      expect(result.activities[0].learningObjectives).toContain('Explore themes from "Updated Adventure"');
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled(); // No new generation
    });
  });

  describe('getActivitySuggestions', () => {
    it('should return appropriate suggestions for adventure stories', () => {
      const suggestions = service.getActivitySuggestions('Adventure', 6);

      expect(suggestions.recommended).toContain('physical_movement');
      expect(suggestions.recommended).toContain('dramatic_play');
      expect(suggestions.alternatives).toBeDefined();
      expect(suggestions.considerations).toBeDefined();
      expect(suggestions.considerations.length).toBeGreaterThan(0);
    });

    it('should return appropriate suggestions for bedtime stories', () => {
      const suggestions = service.getActivitySuggestions('Bedtime', 4);

      expect(suggestions.recommended).toContain('sensory_play');
      expect(suggestions.recommended).toContain('music_rhythm');
      expect(suggestions.alternatives).not.toContain('sensory_play'); // Should not duplicate
    });

    it('should return appropriate suggestions for educational stories', () => {
      const suggestions = service.getActivitySuggestions('Educational', 7);

      expect(suggestions.recommended).toContain('science_exploration');
      expect(suggestions.recommended).toContain('literacy_extension');
      expect(suggestions.recommended).toContain('math_concepts');
    });

    it('should provide age-appropriate considerations', () => {
      const toddlerSuggestions = service.getActivitySuggestions('Adventure', 3);
      const schoolAgeSuggestions = service.getActivitySuggestions('Adventure', 8);

      expect(toddlerSuggestions.considerations).toContain('Short attention span');
      expect(schoolAgeSuggestions.considerations).toContain('Reading skills developing');
    });
  });

  describe('activity type selection', () => {
    it('should select diverse activity types', async () => {
      const story: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'Diverse Story',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [{ id: 'beat1', sequence: 1, content: 'Various activities', emotionalTone: 'excited' }],
          characters: [],
          theme: 'diversity',
          setting: 'playground',
          mood: 'adventurous',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 6,
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

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Title: Activity\nDescription: Test activity'
          }
        }]
      } as any);

      const result = await service.generateActivities({
        story,
        character,
        targetAge: 6
      });

      // Should have 4 different activity types
      const activityTypes = result.activities.map(a => a.type);
      const uniqueTypes = new Set(activityTypes);
      expect(uniqueTypes.size).toBe(4);
    });
  });

  describe('age appropriateness', () => {
    it('should generate age-appropriate activities for toddlers', async () => {
      const story: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'Toddler Story',
        content: {
          type: 'Bedtime',
          audience: 'child',
          complexity: 'simple',
          beats: [{ id: 'beat1', sequence: 1, content: 'Simple story', emotionalTone: 'calm' }],
          characters: [],
          theme: 'comfort',
          setting: 'bedroom',
          mood: 'peaceful',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 3,
        createdAt: '2024-01-01'
      };

      const character: Character = {
        id: 'char1',
        libraryId: 'lib1',
        name: 'Toddler',
        traits: { name: 'Toddler', age: 3, species: 'human', appearance: {} },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Title: Simple Activity\nDescription: Toddler-appropriate activity'
          }
        }]
      } as any);

      const result = await service.generateActivities({
        story,
        character,
        targetAge: 3
      });

      result.activities.forEach(activity => {
        expect(activity.ageRange.min).toBeLessThanOrEqual(3);
        expect(activity.ageRange.max).toBeGreaterThanOrEqual(3);
      });

      // Check that prompts mention appropriate developmental stage
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[1].content).toContain('3-year-old');
      expect(callArgs.messages[1].content).toContain('preschool');
    });

    it('should generate age-appropriate activities for school-age children', async () => {
      const story: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'School Story',
        content: {
          type: 'Educational',
          audience: 'child',
          complexity: 'simple',
          beats: [{ id: 'beat1', sequence: 1, content: 'Learning story', emotionalTone: 'curious' }],
          characters: [],
          theme: 'learning',
          setting: 'school',
          mood: 'excited',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 8,
        createdAt: '2024-01-01'
      };

      const character: Character = {
        id: 'char1',
        libraryId: 'lib1',
        name: 'Student',
        traits: { name: 'Student', age: 8, species: 'human', appearance: {} },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Title: Complex Activity\nDescription: School-age appropriate activity'
          }
        }]
      } as any);

      const result = await service.generateActivities({
        story,
        character,
        targetAge: 8
      });

      // Check that prompts mention appropriate developmental stage
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[1].content).toContain('8-year-old');
      expect(callArgs.messages[1].content).toContain('early elementary');
    });
  });
});