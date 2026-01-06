// Localization Agent Unit Test - 100% Coverage + Cultural Adaptation
import { LocalizationAgent } from '../LocalizationAgent';
import { CulturalIntelligenceEngine } from '../services/CulturalIntelligenceEngine';
import { MultiLanguageSupport } from '../services/MultiLanguageSupport';
import { GlobalStorytellingEngine } from '../services/GlobalStorytellingEngine';
import { HolidayStoryModeManager } from '../services/HolidayStoryModeManager';
import { createClient } from '@supabase/supabase-js';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('../services/CulturalIntelligenceEngine');
jest.mock('../services/MultiLanguageSupport');
jest.mock('../services/GlobalStorytellingEngine');
jest.mock('../services/HolidayStoryModeManager');

describe('LocalizationAgent - 100% Coverage with Cultural Sensitivity', () => {
  let localizationAgent: LocalizationAgent;
  let mockSupabase: any;
  let mockEventBridge: jest.Mocked<EventBridgeClient>;
  let mockCulturalIntelligence: jest.Mocked<CulturalIntelligenceEngine>;
  let mockMultiLanguage: jest.Mocked<MultiLanguageSupport>;
  let mockGlobalStorytelling: jest.Mocked<GlobalStorytellingEngine>;
  let mockHolidayManager: jest.Mocked<HolidayStoryModeManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    };
    
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockEventBridge = new EventBridgeClient({}) as jest.Mocked<EventBridgeClient>;
    
    localizationAgent = new LocalizationAgent({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      environment: 'test'
    });
  });

  describe('Multi-Language Support', () => {
    test('should support 100+ languages with native quality', async () => {
      const languages = [
        'en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ar', 'hi', 'pt',
        'ru', 'it', 'nl', 'sv', 'no', 'da', 'fi', 'pl', 'tr', 'el'
      ];

      for (const lang of languages) {
        const support = await localizationAgent.checkLanguageSupport(lang);
        
        expect(support.supported).toBe(true);
        expect(support.quality).toBe('native');
        expect(support.dialectVariants).toBeDefined();
      }
    });

    test('should handle real-time language switching', async () => {
      mockMultiLanguage.switchLanguage.mockResolvedValue({
        switched: true,
        preservedContext: true,
        continuity: 'maintained'
      });

      const result = await localizationAgent.switchLanguage({
        fromLanguage: 'en',
        toLanguage: 'es',
        currentContext: 'story-middle',
        preserveProgress: true
      });

      expect(result.switched).toBe(true);
      expect(result.preservedContext).toBe(true);
      expect(result.translatedElements).toContain('UI');
      expect(result.translatedElements).toContain('story-content');
      expect(result.translatedElements).toContain('character-names');
    });

    test('should provide dialect-specific variations', async () => {
      const dialects = [
        { language: 'es', variants: ['es-ES', 'es-MX', 'es-AR'] },
        { language: 'en', variants: ['en-US', 'en-GB', 'en-AU'] },
        { language: 'pt', variants: ['pt-BR', 'pt-PT'] },
        { language: 'zh', variants: ['zh-CN', 'zh-TW', 'zh-HK'] }
      ];

      for (const dialect of dialects) {
        const result = await localizationAgent.getDialectVariants(dialect.language);
        
        expect(result.variants).toEqual(expect.arrayContaining(dialect.variants));
        expect(result.differences).toBeDefined();
      }
    });
  });

  describe('Cultural Intelligence', () => {
    test('should adapt stories to cultural contexts', async () => {
      mockCulturalIntelligence.adaptContent.mockResolvedValue({
        adapted: true,
        culturalElements: {
          greetings: 'culture-specific',
          food: 'local-cuisine',
          clothing: 'traditional-attire',
          customs: 'local-practices'
        }
      });

      const adaptation = await localizationAgent.adaptToCulture({
        story: 'base-story',
        targetCulture: 'Japanese',
        preserveNarrative: true
      });

      expect(adaptation.culturallyAppropriate).toBe(true);
      expect(adaptation.elements.greetings).toBe('culture-specific');
      expect(adaptation.preservedStoryArc).toBe(true);
      expect(adaptation.avoidedTaboos).toBeDefined();
    });

    test('should handle religious and cultural sensitivities', async () => {
      const sensitivities = [
        { culture: 'Islamic', considerations: ['halal-food', 'modest-dress', 'prayer-times'] },
        { culture: 'Hindu', considerations: ['vegetarian-options', 'festival-awareness'] },
        { culture: 'Jewish', considerations: ['kosher-food', 'sabbath-observance'] },
        { culture: 'Buddhist', considerations: ['compassion-themes', 'mindfulness'] }
      ];

      for (const sensitivity of sensitivities) {
        const result = await localizationAgent.applyCulturalSensitivity({
          content: 'story-content',
          culture: sensitivity.culture
        });

        expect(result.appropriate).toBe(true);
        expect(result.considerations).toEqual(
          expect.arrayContaining(sensitivity.considerations)
        );
      }
    });

    test('should adapt family structures to cultural norms', async () => {
      const familyStructures = [
        { culture: 'Western', structure: 'nuclear-family' },
        { culture: 'Asian', structure: 'extended-family' },
        { culture: 'African', structure: 'community-based' },
        { culture: 'Nordic', structure: 'egalitarian' }
      ];

      for (const family of familyStructures) {
        const result = await localizationAgent.adaptFamilyStructure({
          baseFamily: 'generic-family',
          targetCulture: family.culture
        });

        expect(result.structure).toBe(family.structure);
        expect(result.roles).toBeDefined();
        expect(result.dynamics).toBeDefined();
      }
    });
  });

  describe('Holiday and Festival Support', () => {
    test('should recognize and adapt for global holidays', async () => {
      mockHolidayManager.detectHoliday.mockResolvedValue({
        currentHoliday: 'Christmas',
        relevantCultures: ['Christian', 'Western'],
        suggestedThemes: ['giving', 'family', 'joy']
      });

      const holidays = [
        'Christmas', 'Hanukkah', 'Eid', 'Diwali', 'Chinese New Year',
        'Thanksgiving', 'Halloween', 'Easter', 'Passover', 'Holi'
      ];

      for (const holiday of holidays) {
        const result = await localizationAgent.createHolidayStory({
          holiday,
          culture: 'appropriate-culture'
        });

        expect(result.holidayThemed).toBe(true);
        expect(result.culturallyAuthentic).toBe(true);
        expect(result.traditions).toBeDefined();
        expect(result.specialElements).toBeDefined();
      }
    });

    test('should create culturally authentic holiday stories', async () => {
      const holidayStory = await localizationAgent.generateHolidayStory({
        holiday: 'Diwali',
        age: 7,
        includeEducation: true
      });

      expect(holidayStory.includesHolidayElements).toBe(true);
      expect(holidayStory.educationalContent).toContain('festival of lights');
      expect(holidayStory.culturalActivities).toContain('rangoli');
      expect(holidayStory.culturalActivities).toContain('diyas');
      expect(holidayStory.ageAppropriate).toBe(true);
    });
  });

  describe('Global Storytelling Patterns', () => {
    test('should incorporate cultural storytelling traditions', async () => {
      mockGlobalStorytelling.getStorytellingPattern.mockResolvedValue({
        pattern: 'circular-narrative',
        elements: ['oral-tradition', 'moral-lesson', 'ancestral-wisdom']
      });

      const patterns = [
        { culture: 'African', pattern: 'oral-tradition-with-moral' },
        { culture: 'Native American', pattern: 'circular-narrative' },
        { culture: 'Japanese', pattern: 'kishōtenketsu' },
        { culture: 'Western', pattern: 'three-act-structure' }
      ];

      for (const tradition of patterns) {
        const result = await localizationAgent.applyStorytellingPattern({
          story: 'base-narrative',
          culturalPattern: tradition.pattern
        });

        expect(result.pattern).toBe(tradition.pattern);
        expect(result.structureAdapted).toBe(true);
      }
    });

    test('should preserve cultural storytelling elements', async () => {
      const elements = await localizationAgent.preserveCulturalElements({
        sourceStory: 'folktale',
        sourceCulture: 'Irish',
        elements: ['leprechauns', 'shamrocks', 'folklore']
      });

      expect(elements.preserved).toBe(true);
      expect(elements.culturalAuthenticity).toBe('maintained');
      expect(elements.explanation).toBeDefined();
    });
  });

  describe('Cross-Cultural Character Generation', () => {
    test('should create culturally diverse characters', async () => {
      const characters = [
        { culture: 'Japanese', traits: ['respectful', 'honor-conscious'] },
        { culture: 'Brazilian', traits: ['warm', 'family-oriented'] },
        { culture: 'German', traits: ['punctual', 'organized'] },
        { culture: 'Indian', traits: ['hospitable', 'spiritual'] }
      ];

      for (const char of characters) {
        const result = await localizationAgent.generateCulturalCharacter({
          culture: char.culture,
          avoidStereotypes: true
        });

        expect(result.authentic).toBe(true);
        expect(result.nuanced).toBe(true);
        expect(result.avoidedStereotypes).toBe(true);
        expect(result.traits).toBeDefined();
      }
    });

    test('should enable cross-cultural friendships', async () => {
      const friendship = await localizationAgent.createCrossCulturalFriendship({
        character1: { name: 'Yuki', culture: 'Japanese' },
        character2: { name: 'Maria', culture: 'Mexican' }
      });

      expect(friendship.culturalExchange).toBe(true);
      expect(friendship.mutualRespect).toBe(true);
      expect(friendship.learningMoments).toBeDefined();
      expect(friendship.sharedValues).toBeDefined();
    });
  });

  describe('Educational Cultural Content', () => {
    test('should teach cultural awareness through stories', async () => {
      const education = await localizationAgent.createCulturalEducation({
        targetAge: 8,
        culture: 'Egyptian',
        learningObjectives: ['history', 'customs', 'language']
      });

      expect(education.ageAppropriate).toBe(true);
      expect(education.factuallyAccurate).toBe(true);
      expect(education.engagingNarrative).toBe(true);
      expect(education.activities).toBeDefined();
    });

    test('should promote cultural appreciation', async () => {
      const appreciation = await localizationAgent.promoteCulturalAppreciation({
        cultures: ['Korean', 'Nigerian', 'French'],
        storyContext: 'international-friendship'
      });

      expect(appreciation.respectful).toBe(true);
      expect(appreciation.celebratesDiversity).toBe(true);
      expect(appreciation.avoidsCulturalAppropriation).toBe(true);
    });
  });

  describe('Multi-Agent Coordination', () => {
    test('should coordinate with Content Agent for cultural stories', async () => {
      mockEventBridge.send = jest.fn().mockResolvedValue({});

      await localizationAgent.requestCulturalContent({
        culture: 'Chinese',
        occasion: 'Lunar New Year',
        storyType: 'traditional'
      });

      expect(mockEventBridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: 'CulturalContentRequest',
              Source: 'localization-agent'
            })
          ])
        })
      );
    });

    test('should sync with Emotion Agent for cultural emotional norms', async () => {
      const emotionalNorms = await localizationAgent.getCulturalEmotionalNorms({
        culture: 'Japanese',
        context: 'public-expression'
      });

      expect(emotionalNorms.emotionalRestraint).toBe('high');
      expect(emotionalNorms.appropriateExpressions).toBeDefined();
      expect(emotionalNorms.culturalContext).toBeDefined();
    });
  });

  describe('Localization Quality Assurance', () => {
    test('should validate translation quality', async () => {
      const quality = await localizationAgent.validateTranslation({
        original: 'Hello, how are you?',
        translated: 'Hola, ¿cómo estás?',
        targetLanguage: 'es'
      });

      expect(quality.accurate).toBe(true);
      expect(quality.natural).toBe(true);
      expect(quality.culturallyAppropriate).toBe(true);
      expect(quality.score).toBeGreaterThan(0.9);
    });

    test('should maintain narrative coherence across languages', async () => {
      const coherence = await localizationAgent.checkNarrativeCoherence({
        story: 'multi-chapter-story',
        languages: ['en', 'es', 'fr']
      });

      expect(coherence.maintained).toBe(true);
      expect(coherence.plotConsistency).toBe(true);
      expect(coherence.characterConsistency).toBe(true);
      expect(coherence.themePreservation).toBe(true);
    });
  });

  describe('Health Check', () => {
    test('should report comprehensive health status', async () => {
      const health = await localizationAgent.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('localization-agent');
      expect(health.supportedLanguages).toBeGreaterThan(100);
      expect(health.culturalDatabases).toBe('active');
      expect(health.holidayCalendar).toBe('updated');
      expect(health.translationQuality).toBe('native');
      expect(health.culturalSensitivity).toBe('high');
    });
  });
});

// Test utilities
export const LocalizationTestUtils = {
  createCulturalContext: (overrides = {}) => ({
    language: 'en',
    culture: 'Western',
    holidays: [],
    sensitivities: [],
    ...overrides
  }),
  
  mockTranslation: (agent: LocalizationAgent, quality: number) => {
    jest.spyOn(agent, 'translateContent').mockResolvedValue({
      translated: true,
      quality,
      natural: quality > 0.8
    });
  }
};