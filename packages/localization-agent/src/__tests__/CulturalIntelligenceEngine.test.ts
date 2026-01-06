import { CulturalIntelligenceEngine } from '../services/CulturalIntelligenceEngine';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('openai');

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  upsert: jest.fn().mockReturnThis()
};

const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);
(OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

describe('CulturalIntelligenceEngine', () => {
  let engine: CulturalIntelligenceEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new CulturalIntelligenceEngine(mockSupabase as any, mockOpenAI as any);
  });

  describe('analyzeStoryElements', () => {
    it('should analyze story elements for cultural appropriateness', async () => {
      const mockAnalysis = {
        element: 'dragon character',
        culturalAppropriateness: {
          'chinese': {
            appropriate: true,
            concerns: [],
            suggestions: ['Portray as benevolent and wise'],
            alternatives: []
          },
          'western': {
            appropriate: true,
            concerns: ['Avoid evil dragon stereotype'],
            suggestions: ['Show dragon as helpful character'],
            alternatives: ['Friendly dragon', 'Wise dragon mentor']
          }
        },
        universalThemes: ['wisdom', 'protection', 'magic'],
        culturalSpecificAdaptations: {
          'chinese': 'Emphasize wisdom and good fortune aspects',
          'western': 'Focus on friendship and helpfulness'
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }]
      });

      const result = await engine.analyzeStoryElements(
        ['dragon character'],
        ['chinese', 'western'],
        { storyType: 'adventure', ageGroup: '5-8' }
      );

      expect(result).toHaveLength(1);
      expect(result[0].element).toBe('dragon character');
      expect(result[0].culturalAppropriateness.chinese.appropriate).toBe(true);
      expect(result[0].universalThemes).toContain('wisdom');
    });

    it('should handle multiple story elements', async () => {
      const elements = ['dragon character', 'tea ceremony', 'family dinner'];
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
          element: 'test',
          culturalAppropriateness: {},
          universalThemes: [],
          culturalSpecificAdaptations: {}
        }) } }]
      });

      const result = await engine.analyzeStoryElements(
        elements,
        ['chinese', 'japanese'],
        { storyType: 'family', ageGroup: '6-10' }
      );

      expect(result).toHaveLength(3);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('getCulturalSymbols', () => {
    it('should return cultural symbols for given cultures', async () => {
      const result = await engine.getCulturalSymbols(['chinese', 'japanese']);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      
      const dragonSymbol = result.find(s => s.symbol === 'Dragon');
      expect(dragonSymbol).toBeDefined();
      expect(dragonSymbol?.culturalOrigin).toContain('Chinese');
      expect(dragonSymbol?.meaning).toContain('Power');
    });

    it('should return empty array for unknown cultures', async () => {
      const result = await engine.getCulturalSymbols(['unknown_culture']);
      expect(result).toEqual([]);
    });

    it('should include appropriate usage guidelines', async () => {
      const result = await engine.getCulturalSymbols(['chinese']);
      
      const dragonSymbol = result.find(s => s.symbol === 'Dragon');
      expect(dragonSymbol?.respectfulUsage).toContain('Benevolent guardian');
      expect(dragonSymbol?.inappropriateContexts).toContain('evil villain');
    });
  });

  describe('getCulturalArchetypes', () => {
    it('should return cultural archetypes for given cultures', async () => {
      const result = await engine.getCulturalArchetypes(['chinese', 'african']);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      
      const wiseElder = result.find(a => a.name === 'Wise Elder');
      expect(wiseElder).toBeDefined();
      expect(wiseElder?.culturalOrigin).toContain('Chinese');
    });

    it('should include stereotype avoidance guidelines', async () => {
      const result = await engine.getCulturalArchetypes(['native_american']);
      
      const spiritGuide = result.find(a => a.name === 'Animal Spirit Guide');
      expect(spiritGuide?.avoidStereotypes).toContain('Not mystical without context');
    });
  });

  describe('integrateStorytellingTraditions', () => {
    it('should integrate storytelling traditions into modern narratives', async () => {
      const mockIntegration = {
        integratedNarrative: {
          story: 'A modern story with traditional elements',
          characters: ['Wise grandmother', 'Curious child'],
          themes: ['respect for elders', 'learning from tradition'],
          structure: 'Traditional circular narrative adapted for modern audience'
        },
        traditionalElements: ['Oral storytelling style', 'Moral lessons', 'Community wisdom'],
        modernAdaptations: ['Interactive elements', 'Contemporary setting', 'Age-appropriate language'],
        culturalRespect: ['Honored original meaning', 'Consulted cultural sources', 'Avoided stereotypes']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockIntegration) } }]
      });

      const traditions = [{
        name: 'African Storytelling',
        culturalOrigin: ['African'],
        narrativeStructure: 'Oral tradition with call-and-response',
        commonThemes: ['community wisdom', 'connection to nature'],
        characterArchetypes: ['wise griot', 'trickster'],
        moralFramework: 'Community wisdom and ancestral guidance',
        adaptationGuidelines: ['Include community participation', 'Nature as teacher']
      }];

      const result = await engine.integrateStorytellingTraditions(
        traditions,
        { storyType: 'adventure', setting: 'modern city' },
        { age: 7, culturalBackground: ['african', 'american'] }
      );

      expect(result.integratedNarrative.story).toBeDefined();
      expect(result.traditionalElements).toContain('Oral storytelling style');
      expect(result.culturalRespect).toContain('Honored original meaning');
    });
  });

  describe('getCulturalCelebrations', () => {
    it('should return cultural celebrations for given cultures', async () => {
      const result = await engine.getCulturalCelebrations(['chinese', 'indian']);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      
      const chineseNewYear = result.find(c => c.name === 'Chinese New Year');
      expect(chineseNewYear).toBeDefined();
      expect(chineseNewYear?.significance).toContain('New beginnings');
      expect(chineseNewYear?.childFriendlyActivities).toContain('Making paper lanterns');
    });

    it('should include respectful inclusion guidelines', async () => {
      const result = await engine.getCulturalCelebrations(['mexican']);
      
      const diaDeLosMuertos = result.find(c => c.name === 'Día de los Muertos');
      expect(diaDeLosMuertos?.respectfulInclusion).toContain('Explain cultural context');
      expect(diaDeLosMuertos?.respectfulInclusion).toContain('Avoid Halloween confusion');
    });
  });

  describe('generateCrossCulturalInteraction', () => {
    it('should generate cross-cultural interaction scenarios', async () => {
      const mockInteraction = {
        cultures: ['chinese', 'american'],
        interactionType: 'friendship',
        commonGround: ['love of stories', 'curiosity about world', 'kindness'],
        culturalDifferences: ['different languages', 'different celebrations', 'different foods'],
        bridgingElements: ['shared games', 'learning each other\'s words', 'trying new foods together'],
        learningOpportunities: ['language exchange', 'cultural appreciation', 'friendship across differences'],
        respectfulExchange: ['asking questions politely', 'sharing traditions', 'celebrating differences']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockInteraction) } }]
      });

      const result = await engine.generateCrossCulturalInteraction(
        ['chinese', 'american'],
        'friendship',
        { setting: 'school', situation: 'new student' },
        '6-8 years'
      );

      expect(result.cultures).toEqual(['chinese', 'american']);
      expect(result.interactionType).toBe('friendship');
      expect(result.commonGround).toContain('love of stories');
      expect(result.respectfulExchange).toContain('asking questions politely');
    });

    it('should handle different interaction types', async () => {
      const interactionTypes = ['friendship', 'learning', 'celebration', 'conflict_resolution', 'collaboration'];
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
          cultures: ['test'],
          interactionType: 'test',
          commonGround: [],
          culturalDifferences: [],
          bridgingElements: [],
          learningOpportunities: [],
          respectfulExchange: []
        }) } }]
      });

      for (const type of interactionTypes) {
        await engine.generateCrossCulturalInteraction(
          ['culture1', 'culture2'],
          type as any,
          {},
          '5-7 years'
        );
      }

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(interactionTypes.length);
    });
  });

  describe('createReligiousSensitivityEngine', () => {
    it('should create religious sensitivity filters', async () => {
      const result = await engine.createReligiousSensitivityEngine(['islamic', 'jewish']);

      expect(result.filters).toHaveLength(2);
      expect(result.guidelines.length).toBeGreaterThan(0);
      expect(result.respectfulAlternatives).toBeDefined();
      
      const islamicFilter = result.filters.find(f => f.culturalContext === 'Islamic');
      expect(islamicFilter?.sensitiveTopics).toContain('pork');
      expect(islamicFilter?.appropriateAlternatives.pork).toContain('chicken');
    });

    it('should apply custom filters when provided', async () => {
      const customFilters = {
        additionalSensitiveTopics: ['custom_topic'],
        additionalAlternatives: { 'custom_topic': ['alternative1', 'alternative2'] },
        additionalAvoidancePatterns: ['custom_pattern']
      };

      const result = await engine.createReligiousSensitivityEngine(['islamic'], customFilters);

      const islamicFilter = result.filters[0];
      expect(islamicFilter.sensitiveTopics).toContain('custom_topic');
      expect(islamicFilter.appropriateAlternatives['custom_topic']).toEqual(['alternative1', 'alternative2']);
      expect(islamicFilter.avoidancePatterns).toContain('custom_pattern');
    });

    it('should provide comprehensive religious guidelines', async () => {
      const result = await engine.createReligiousSensitivityEngine(['christian', 'hindu', 'buddhist']);

      expect(result.guidelines).toContain('Show respect for Christian beliefs and practices');
      expect(result.guidelines).toContain('Show respect for Hindu beliefs and practices');
      expect(result.guidelines).toContain('Emphasize compassion and non-violence');
    });
  });

  describe('analyzeCulturalContext', () => {
    it('should analyze story content for cultural appropriateness', async () => {
      const mockAnalysis = {
        overallAppropriateness: true,
        culturalAnalysis: {
          'chinese': {
            appropriate: true,
            concerns: [],
            positiveElements: ['Respectful dragon portrayal', 'Family values'],
            suggestions: ['Continue positive representation']
          },
          'western': {
            appropriate: true,
            concerns: ['Minor stereotype risk'],
            positiveElements: ['Universal themes'],
            suggestions: ['Emphasize individual character traits']
          }
        },
        recommendations: ['Maintain cultural respect', 'Continue positive representation'],
        requiredAdaptations: []
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }]
      });

      const storyContent = {
        title: 'The Wise Dragon',
        characters: ['Dragon', 'Child'],
        themes: ['wisdom', 'friendship']
      };

      const result = await engine.analyzeCulturalContext(
        storyContent,
        ['chinese', 'western'],
        'medium'
      );

      expect(result.overallAppropriateness).toBe(true);
      expect(result.culturalAnalysis.chinese.appropriate).toBe(true);
      expect(result.recommendations).toContain('Maintain cultural respect');
    });

    it('should handle different sensitivity levels', async () => {
      const sensitivityLevels = ['high', 'medium', 'low'] as const;
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
          overallAppropriateness: true,
          culturalAnalysis: {},
          recommendations: [],
          requiredAdaptations: []
        }) } }]
      });

      for (const level of sensitivityLevels) {
        await engine.analyzeCulturalContext(
          { test: 'content' },
          ['culture1'],
          level
        );
      }

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(sensitivityLevels.length);
    });

    it('should identify required adaptations for inappropriate content', async () => {
      const mockAnalysis = {
        overallAppropriateness: false,
        culturalAnalysis: {
          'islamic': {
            appropriate: false,
            concerns: ['Contains pork reference', 'Alcohol consumption'],
            positiveElements: ['Family values'],
            suggestions: ['Replace pork with halal alternative', 'Remove alcohol references']
          }
        },
        recommendations: ['Review dietary references', 'Ensure cultural sensitivity'],
        requiredAdaptations: ['Replace pork with chicken', 'Change wine to juice']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }]
      });

      const result = await engine.analyzeCulturalContext(
        { content: 'Story with pork and wine' },
        ['islamic'],
        'high'
      );

      expect(result.overallAppropriateness).toBe(false);
      expect(result.requiredAdaptations).toContain('Replace pork with chicken');
      expect(result.culturalAnalysis.islamic.concerns).toContain('Contains pork reference');
    });
  });

  describe('error handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      await expect(engine.analyzeStoryElements(['test'], ['culture'], {}))
        .rejects.toThrow('API Error');
    });

    it('should handle invalid JSON responses', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'invalid json' } }]
      });

      await expect(engine.analyzeStoryElements(['test'], ['culture'], {}))
        .rejects.toThrow();
    });
  });
});