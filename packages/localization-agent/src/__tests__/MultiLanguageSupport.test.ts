import { MultiLanguageSupport } from '../services/MultiLanguageSupport';
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

describe('MultiLanguageSupport', () => {
  let multiLanguageSupport: MultiLanguageSupport;

  beforeEach(() => {
    jest.clearAllMocks();
    multiLanguageSupport = new MultiLanguageSupport(mockSupabase as any, mockOpenAI as any);
  });

  describe('createBilingualStory', () => {
    it('should create bilingual storytelling experience', async () => {
      const mockResponse = {
        bilingualContent: 'Once upon a time... Había una vez...',
        languageSwitchPoints: [
          {
            position: 20,
            fromLanguage: 'English',
            toLanguage: 'Spanish',
            reason: 'Cultural authenticity',
            educationalNote: 'Learning Spanish greeting'
          }
        ],
        vocabularyHighlights: {
          'English': ['once', 'upon', 'time'],
          'Spanish': ['había', 'una', 'vez']
        },
        culturalBridges: ['Universal storytelling opening'],
        learningObjectives: ['Learn Spanish storytelling phrases', 'Understand cultural storytelling traditions']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const request = {
        primaryLanguage: 'English',
        secondaryLanguage: 'Spanish',
        storyContent: { title: 'The Magic Garden', theme: 'adventure' },
        switchingStrategy: 'alternating_sentences' as const,
        educationalGoals: ['vocabulary building', 'cultural awareness'],
        targetAge: 7,
        culturalContext: {
          primaryLanguage: 'English',
          secondaryLanguages: ['Spanish'],
          culturalBackground: ['American', 'Mexican'],
          religiousConsiderations: [],
          familyStructure: { type: 'nuclear' as const, parentTerms: { mother: [], father: [], parent: [] }, siblingTerms: { brother: [], sister: [], sibling: [] }, extendedFamilyTerms: { grandmother: [], grandfather: [], aunt: [], uncle: [], cousin: [] } },
          celebrationsAndHolidays: [],
          storytellingTraditions: [],
          tabooTopics: [],
          preferredNarrativeStyles: []
        }
      };

      const result = await multiLanguageSupport.createBilingualStory(request);

      expect(result.bilingualContent).toContain('Once upon a time');
      expect(result.bilingualContent).toContain('Había una vez');
      expect(result.languageSwitchPoints).toHaveLength(1);
      expect(result.vocabularyHighlights.English).toContain('once');
      expect(result.vocabularyHighlights.Spanish).toContain('había');
    });

    it('should handle different switching strategies', async () => {
      const strategies = ['alternating_sentences', 'alternating_paragraphs', 'character_based', 'theme_based', 'educational_moments'] as const;
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
          bilingualContent: 'test content',
          languageSwitchPoints: [],
          vocabularyHighlights: {},
          culturalBridges: [],
          learningObjectives: []
        }) } }]
      });

      for (const strategy of strategies) {
        const request = {
          primaryLanguage: 'English',
          secondaryLanguage: 'French',
          storyContent: { title: 'Test Story' },
          switchingStrategy: strategy,
          educationalGoals: ['test'],
          targetAge: 6,
          culturalContext: {
            primaryLanguage: 'English',
            secondaryLanguages: [],
            culturalBackground: [],
            religiousConsiderations: [],
            familyStructure: { type: 'nuclear' as const, parentTerms: { mother: [], father: [], parent: [] }, siblingTerms: { brother: [], sister: [], sibling: [] }, extendedFamilyTerms: { grandmother: [], grandfather: [], aunt: [], uncle: [], cousin: [] } },
            celebrationsAndHolidays: [],
            storytellingTraditions: [],
            tabooTopics: [],
            preferredNarrativeStyles: []
          }
        };

        await multiLanguageSupport.createBilingualStory(request);
      }

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(strategies.length);
    });
  });

  describe('implementCodeSwitching', () => {
    it('should implement natural code-switching for multilingual families', async () => {
      const mockResponse = {
        codeSwitchedContent: 'Let\'s go to abuela\'s house for dinner, mijo.',
        switchingPatterns: [
          {
            trigger: 'family_interactions',
            languages: ['English', 'Spanish'],
            context: 'Talking about grandmother',
            naturalness: 0.9
          }
        ],
        familyLanguageBalance: {
          'English': 70,
          'Spanish': 30
        },
        culturalAuthenticity: 0.85
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const request = {
        familyLanguages: ['English', 'Spanish'],
        dominantLanguage: 'English',
        storyContext: { setting: 'family dinner', characters: ['child', 'parent', 'grandmother'] },
        switchingTriggers: ['family_interactions', 'emotional_moments'] as const,
        naturalness: 'high' as const
      };

      const result = await multiLanguageSupport.implementCodeSwitching(request);

      expect(result.codeSwitchedContent).toContain('abuela');
      expect(result.switchingPatterns).toHaveLength(1);
      expect(result.familyLanguageBalance.English).toBe(70);
      expect(result.culturalAuthenticity).toBe(0.85);
    });

    it('should handle different naturalness levels', async () => {
      const naturalnessLevels = ['high', 'medium', 'low'] as const;
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
          codeSwitchedContent: 'test',
          switchingPatterns: [],
          familyLanguageBalance: {},
          culturalAuthenticity: 0.8
        }) } }]
      });

      for (const level of naturalnessLevels) {
        const request = {
          familyLanguages: ['English', 'Spanish'],
          dominantLanguage: 'English',
          storyContext: {},
          switchingTriggers: ['family_interactions'] as const,
          naturalness: level
        };

        await multiLanguageSupport.implementCodeSwitching(request);
      }

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(naturalnessLevels.length);
    });
  });

  describe('getAccentDialectProfiles', () => {
    it('should return accent and dialect profiles for given language', async () => {
      const result = await multiLanguageSupport.getAccentDialectProfiles('English', ['US', 'UK']);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      
      const usProfile = result.find(p => p.region === 'United States');
      expect(usProfile).toBeDefined();
      expect(usProfile?.accentName).toBe('General American');
      expect(usProfile?.characteristics).toContain('Rhotic (pronounces R sounds)');
    });

    it('should return profiles for common regions when none specified', async () => {
      const result = await multiLanguageSupport.getAccentDialectProfiles('Spanish');

      expect(result).toBeInstanceOf(Array);
      // Should include common Spanish-speaking regions
    });

    it('should include child-friendly features', async () => {
      const result = await multiLanguageSupport.getAccentDialectProfiles('English', ['US']);
      
      const usProfile = result[0];
      expect(usProfile?.childFriendlyFeatures).toContain('Clear consonants');
      expect(usProfile?.childFriendlyFeatures).toContain('Easy to imitate');
    });
  });

  describe('createCulturallyAdaptedTranslation', () => {
    it('should create culturally adapted translation', async () => {
      const mockResponse = {
        adaptedTranslation: 'Buenos días, pequeño amigo',
        culturalNotes: ['Used familiar form of address appropriate for children'],
        alternativeVersions: [
          {
            approach: 'literal',
            translation: 'Buenos días, pequeño',
            reasoning: 'Direct translation without cultural adaptation'
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const result = await multiLanguageSupport.createCulturallyAdaptedTranslation(
        'Good morning, little one',
        'Spanish',
        ['Mexican', 'family-oriented'],
        'cultural_adaptation'
      );

      expect(result.originalText).toBe('Good morning, little one');
      expect(result.targetLanguage).toBe('Spanish');
      expect(result.adaptedTranslation).toBe('Buenos días, pequeño amigo');
      expect(result.culturalNotes).toContain('Used familiar form of address appropriate for children');
    });

    it('should handle different translation approaches', async () => {
      const approaches = ['literal', 'cultural_adaptation', 'localization', 'transcreation'] as const;
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
          adaptedTranslation: 'test',
          culturalNotes: [],
          alternativeVersions: []
        }) } }]
      });

      for (const approach of approaches) {
        await multiLanguageSupport.createCulturallyAdaptedTranslation(
          'Hello world',
          'French',
          ['French'],
          approach
        );
      }

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(approaches.length);
    });
  });

  describe('integrateLanguageLearning', () => {
    it('should integrate language learning features', async () => {
      const mockResponse = {
        interactiveElements: [
          {
            type: 'vocabulary_practice',
            content: 'Can you say "hola" like the character?',
            position: 15
          },
          {
            type: 'pronunciation_guide',
            content: 'The "ll" in "hola" sounds like "oh-lah"',
            position: 16
          }
        ],
        assessmentOpportunities: [
          {
            type: 'comprehension_check',
            content: 'What did the character say to greet his friend?',
            expectedResponse: 'hola'
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const result = await multiLanguageSupport.integrateLanguageLearning(
        { title: 'Spanish Adventure', content: 'A story about learning Spanish' },
        'Spanish',
        'beginner',
        ['basic greetings', 'pronunciation']
      );

      expect(result.targetLanguage).toBe('Spanish');
      expect(result.proficiencyLevel).toBe('beginner');
      expect(result.interactiveElements).toHaveLength(2);
      expect(result.assessmentOpportunities).toHaveLength(1);
      expect(result.interactiveElements[0].type).toBe('vocabulary_practice');
    });

    it('should handle different proficiency levels', async () => {
      const levels = ['beginner', 'intermediate', 'advanced'] as const;
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
          interactiveElements: [],
          assessmentOpportunities: []
        }) } }]
      });

      for (const level of levels) {
        await multiLanguageSupport.integrateLanguageLearning(
          { content: 'test' },
          'French',
          level,
          ['test objective']
        );
      }

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(levels.length);
    });
  });

  describe('switchLanguageMidConversation', () => {
    it('should switch language mid-conversation with context awareness', async () => {
      const mockResponse = {
        transitionPhrase: 'Now let\'s continue our story in Spanish!',
        continuationInNewLanguage: 'El niño caminó hacia el bosque mágico...',
        educationalNote: 'We\'re switching to Spanish to learn new vocabulary',
        culturalContext: 'Spanish storytelling often uses descriptive language'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const result = await multiLanguageSupport.switchLanguageMidConversation(
        'English',
        'Spanish',
        { currentScene: 'boy entering forest', mood: 'adventurous' },
        'educational_purpose',
        'educational'
      );

      expect(result.transitionPhrase).toContain('Spanish');
      expect(result.continuationInNewLanguage).toContain('El niño');
      expect(result.educationalNote).toContain('vocabulary');
      expect(result.culturalContext).toContain('Spanish storytelling');
    });

    it('should handle different switch reasons and transition styles', async () => {
      const switchReasons = ['user_request', 'cultural_appropriateness', 'educational_purpose', 'character_authenticity', 'emotional_resonance'] as const;
      const transitionStyles = ['seamless', 'acknowledged', 'educational', 'playful'] as const;
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
          transitionPhrase: 'test',
          continuationInNewLanguage: 'test'
        }) } }]
      });

      for (const reason of switchReasons) {
        for (const style of transitionStyles) {
          await multiLanguageSupport.switchLanguageMidConversation(
            'English',
            'French',
            {},
            reason,
            style
          );
        }
      }

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(switchReasons.length * transitionStyles.length);
    });
  });

  describe('generatePronunciationGuide', () => {
    it('should generate child-friendly pronunciation guide', async () => {
      const mockResponse = {
        phoneticGuide: '/ˈoʊlə/',
        simplifiedPronunciation: 'OH-lah',
        audioDescription: 'Sounds like "oh" + "lah" with emphasis on the first part',
        practiceWords: ['cola', 'sola', 'bola'],
        similarSounds: {
          'hola': 'like "cola" but with an H sound at the beginning'
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const result = await multiLanguageSupport.generatePronunciationGuide(
        'hola',
        'Spanish',
        'English',
        6
      );

      expect(result.phoneticGuide).toBe('/ˈoʊlə/');
      expect(result.simplifiedPronunciation).toBe('OH-lah');
      expect(result.practiceWords).toContain('cola');
      expect(result.similarSounds.hola).toContain('cola');
    });

    it('should adapt to different child ages', async () => {
      const ages = [4, 7, 10];
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
          phoneticGuide: 'test',
          simplifiedPronunciation: 'test',
          audioDescription: 'test',
          practiceWords: [],
          similarSounds: {}
        }) } }]
      });

      for (const age of ages) {
        await multiLanguageSupport.generatePronunciationGuide(
          'bonjour',
          'French',
          'English',
          age
        );
      }

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(ages.length);
    });
  });

  describe('error handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      await expect(multiLanguageSupport.createBilingualStory({
        primaryLanguage: 'English',
        secondaryLanguage: 'Spanish',
        storyContent: {},
        switchingStrategy: 'alternating_sentences',
        educationalGoals: [],
        targetAge: 6,
        culturalContext: {
          primaryLanguage: 'English',
          secondaryLanguages: [],
          culturalBackground: [],
          religiousConsiderations: [],
          familyStructure: { type: 'nuclear', parentTerms: { mother: [], father: [], parent: [] }, siblingTerms: { brother: [], sister: [], sibling: [] }, extendedFamilyTerms: { grandmother: [], grandfather: [], aunt: [], uncle: [], cousin: [] } },
          celebrationsAndHolidays: [],
          storytellingTraditions: [],
          tabooTopics: [],
          preferredNarrativeStyles: []
        }
      })).rejects.toThrow('API Error');
    });

    it('should handle invalid JSON responses', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'invalid json' } }]
      });

      await expect(multiLanguageSupport.createBilingualStory({
        primaryLanguage: 'English',
        secondaryLanguage: 'Spanish',
        storyContent: {},
        switchingStrategy: 'alternating_sentences',
        educationalGoals: [],
        targetAge: 6,
        culturalContext: {
          primaryLanguage: 'English',
          secondaryLanguages: [],
          culturalBackground: [],
          religiousConsiderations: [],
          familyStructure: { type: 'nuclear', parentTerms: { mother: [], father: [], parent: [] }, siblingTerms: { brother: [], sister: [], sibling: [] }, extendedFamilyTerms: { grandmother: [], grandfather: [], aunt: [], uncle: [], cousin: [] } },
          celebrationsAndHolidays: [],
          storytellingTraditions: [],
          tabooTopics: [],
          preferredNarrativeStyles: []
        }
      })).rejects.toThrow();
    });
  });
});