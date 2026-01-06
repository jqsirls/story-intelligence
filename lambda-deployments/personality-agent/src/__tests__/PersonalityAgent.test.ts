// Personality Agent Unit Test - 100% Coverage + Multi-Agent Personality Verification
import { PersonalityFramework } from '../PersonalityFramework';
import { WhimsicalPersonalityEngine } from '../engines/WhimsicalPersonalityEngine';
import { EmotionalIntelligenceEngine } from '../engines/EmotionalIntelligenceEngine';
import { YouthfulEnergyEngine } from '../engines/YouthfulEnergyEngine';
import { GiggleInducingEngine } from '../engines/GiggleInducingEngine';
import { WarmthEngine } from '../engines/WarmthEngine';
import { EmpathyEngine } from '../engines/EmpathyEngine';
import { PersonalityExpressionEngine } from '../expression/PersonalityExpressionEngine';
import { createClient } from '@supabase/supabase-js';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('../engines/WhimsicalPersonalityEngine');
jest.mock('../engines/EmotionalIntelligenceEngine');
jest.mock('../engines/YouthfulEnergyEngine');
jest.mock('../engines/GiggleInducingEngine');
jest.mock('../engines/WarmthEngine');
jest.mock('../engines/EmpathyEngine');
jest.mock('../expression/PersonalityExpressionEngine');

describe('PersonalityAgent - 100% Coverage with Personality Consistency', () => {
  let personalityFramework: PersonalityFramework;
  let mockSupabase: any;
  let mockEventBridge: jest.Mocked<EventBridgeClient>;
  let mockWhimsical: jest.Mocked<WhimsicalPersonalityEngine>;
  let mockEmotionalIntelligence: jest.Mocked<EmotionalIntelligenceEngine>;
  let mockYouthfulEnergy: jest.Mocked<YouthfulEnergyEngine>;
  let mockGiggle: jest.Mocked<GiggleInducingEngine>;
  let mockWarmth: jest.Mocked<WarmthEngine>;
  let mockEmpathy: jest.Mocked<EmpathyEngine>;
  let mockExpression: jest.Mocked<PersonalityExpressionEngine>;

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
    
    personalityFramework = new PersonalityFramework({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      environment: 'test'
    });
  });

  describe('Core Personality Traits', () => {
    test('should maintain whimsical personality across interactions', async () => {
      mockWhimsical.generateWhimsy.mockResolvedValue({
        playfulness: 0.85,
        imagination: 0.90,
        spontaneity: 0.75,
        magicalThinking: 0.80
      });

      const response = await personalityFramework.applyPersonality({
        input: 'Tell me a story',
        context: 'story-request',
        userId: 'user-123'
      });

      expect(response.traits.whimsy).toBeGreaterThan(0.8);
      expect(response.expression).toContain('magical');
      expect(response.tone).toBe('playful-enthusiastic');
    });

    test('should express youthful energy consistently', async () => {
      mockYouthfulEnergy.generateEnergy.mockResolvedValue({
        enthusiasm: 0.95,
        curiosity: 0.90,
        wonderment: 0.88,
        excitement: 0.92
      });

      const interactions = [
        'Wow! That sounds amazing!',
        'Can we explore more?',
        'This is so cool!'
      ];

      for (const interaction of interactions) {
        const result = await personalityFramework.processInteraction({
          input: interaction,
          userId: 'user-123'
        });

        expect(result.energyLevel).toBeGreaterThan(0.85);
        expect(result.responseStyle).toContain('enthusiastic');
      }
    });

    test('should inject humor appropriately', async () => {
      mockGiggle.generateHumor.mockResolvedValue({
        silliness: 0.7,
        wordplay: 0.6,
        surpriseElement: 0.8,
        ageAppropriate: true
      });

      const humorResponse = await personalityFramework.addHumor({
        content: 'The cat sat on the mat',
        childAge: 6,
        humorPreference: 'silly'
      });

      expect(humorResponse.humorAdded).toBe(true);
      expect(humorResponse.content).toContain('silly');
      expect(humorResponse.giggleProbability).toBeGreaterThan(0.6);
    });
  });

  describe('Emotional Intelligence', () => {
    test('should demonstrate empathy in responses', async () => {
      mockEmpathy.analyzeEmotionalNeed.mockResolvedValue({
        emotionalState: 'sad',
        needsValidation: true,
        supportLevel: 'high'
      });

      mockEmotionalIntelligence.generateResponse.mockResolvedValue({
        empathyLevel: 0.9,
        validation: 'I understand you feel sad',
        comfort: 'It\'s okay to feel this way',
        support: 'I\'m here with you'
      });

      const response = await personalityFramework.respondWithEmpathy({
        userInput: 'I feel really sad today',
        userId: 'user-123'
      });

      expect(response.empathyScore).toBeGreaterThan(0.85);
      expect(response.message).toContain('understand');
      expect(response.supportiveElements).toHaveLength(3);
    });

    test('should adapt emotional tone to user needs', async () => {
      const emotionalStates = [
        { state: 'excited', expectedTone: 'celebratory' },
        { state: 'anxious', expectedTone: 'calming' },
        { state: 'curious', expectedTone: 'encouraging' },
        { state: 'frustrated', expectedTone: 'patient' }
      ];

      for (const { state, expectedTone } of emotionalStates) {
        const response = await personalityFramework.adaptEmotionalTone({
          userEmotionalState: state,
          baseResponse: 'Let me help you'
        });

        expect(response.tone).toBe(expectedTone);
        expect(response.emotionalAlignment).toBeGreaterThan(0.8);
      }
    });
  });

  describe('Age-Adaptive Personality', () => {
    test('should adjust personality expression by age', async () => {
      const ageGroups = [
        { age: 4, complexity: 'very-simple', energy: 'high', silliness: 'maximum' },
        { age: 8, complexity: 'moderate', energy: 'high', silliness: 'balanced' },
        { age: 12, complexity: 'sophisticated', energy: 'moderate', silliness: 'subtle' },
        { age: 16, complexity: 'mature', energy: 'controlled', silliness: 'witty' }
      ];

      for (const group of ageGroups) {
        const personality = await personalityFramework.adaptToAge({
          basePersonality: 'storytailor-default',
          userAge: group.age
        });

        expect(personality.complexity).toBe(group.complexity);
        expect(personality.energyLevel).toBe(group.energy);
        expect(personality.humorStyle).toBe(group.silliness);
      }
    });

    test('should use age-appropriate vocabulary', async () => {
      const vocabularyTests = [
        { age: 5, word: 'happy', expected: 'happy' },
        { age: 5, word: 'melancholy', expected: 'sad' },
        { age: 15, word: 'melancholy', expected: 'melancholy' }
      ];

      for (const test of vocabularyTests) {
        const result = await personalityFramework.adaptVocabulary({
          text: `feeling ${test.word}`,
          userAge: test.age
        });

        expect(result).toContain(test.expected);
      }
    });
  });

  describe('Personality Consistency', () => {
    test('should maintain consistent personality across sessions', async () => {
      // First session
      const session1 = await personalityFramework.createSession({
        userId: 'user-123',
        timestamp: new Date('2024-01-01T10:00:00')
      });

      // Second session
      const session2 = await personalityFramework.createSession({
        userId: 'user-123',
        timestamp: new Date('2024-01-01T14:00:00')
      });

      expect(session2.personalityTraits).toEqual(session1.personalityTraits);
      expect(session2.consistencyScore).toBeGreaterThan(0.95);
    });

    test('should remember personality preferences', async () => {
      mockSupabase.select.mockResolvedValue({
        data: {
          preferred_humor: 'wordplay',
          energy_preference: 'moderate',
          interaction_style: 'encouraging'
        },
        error: null
      });

      const preferences = await personalityFramework.loadUserPreferences('user-123');

      expect(preferences.humor).toBe('wordplay');
      expect(preferences.energy).toBe('moderate');
      expect(preferences.style).toBe('encouraging');
    });
  });

  describe('Multi-Platform Personality', () => {
    test('should adapt personality for voice platforms', async () => {
      const voicePersonality = await personalityFramework.adaptForPlatform({
        platform: 'alexa',
        basePersonality: 'storytailor-default'
      });

      expect(voicePersonality.prosody).toBeDefined();
      expect(voicePersonality.speechRate).toBe('slightly-fast');
      expect(voicePersonality.pitch).toBe('warm-friendly');
      expect(voicePersonality.soundEffects).toBe(true);
    });

    test('should adapt personality for text platforms', async () => {
      const textPersonality = await personalityFramework.adaptForPlatform({
        platform: 'web-chat',
        basePersonality: 'storytailor-default'
      });

      expect(textPersonality.emojis).toBe(true);
      expect(textPersonality.formatting).toContain('playful');
      expect(textPersonality.responseLength).toBe('conversational');
    });
  });

  describe('Character Personality Generation', () => {
    test('should create unique character personalities', async () => {
      const character = await personalityFramework.generateCharacterPersonality({
        characterType: 'brave-explorer',
        storyContext: 'jungle-adventure',
        childPreferences: ['humor', 'action']
      });

      expect(character.traits).toContain('courageous');
      expect(character.traits).toContain('curious');
      expect(character.quirks).toHaveLength(3);
      expect(character.catchphrase).toBeDefined();
      expect(character.voiceStyle).toBe('confident-adventurous');
    });

    test('should ensure character personality diversity', async () => {
      const characters = await Promise.all([
        personalityFramework.generateCharacterPersonality({ characterType: 'wise-mentor' }),
        personalityFramework.generateCharacterPersonality({ characterType: 'silly-sidekick' }),
        personalityFramework.generateCharacterPersonality({ characterType: 'mysterious-guide' })
      ]);

      const personalities = characters.map(c => c.dominantTrait);
      const uniquePersonalities = new Set(personalities);
      
      expect(uniquePersonalities.size).toBe(personalities.length);
    });
  });

  describe('Warmth and Connection', () => {
    test('should express genuine warmth', async () => {
      mockWarmth.generateWarmth.mockResolvedValue({
        warmthLevel: 0.9,
        connectionStrength: 0.85,
        emotionalSafety: 0.95
      });

      const warmResponse = await personalityFramework.expressWarmth({
        context: 'child-feeling-lonely',
        previousInteractions: 5
      });

      expect(warmResponse.warmthScore).toBeGreaterThan(0.85);
      expect(warmResponse.message).toContain('here for you');
      expect(warmResponse.emotionalSafety).toBe('high');
    });

    test('should build connection over time', async () => {
      const interactions = [1, 5, 10, 20];
      const expectedConnection = [0.3, 0.5, 0.7, 0.9];

      for (let i = 0; i < interactions.length; i++) {
        const connection = await personalityFramework.measureConnection({
          userId: 'user-123',
          interactionCount: interactions[i]
        });

        expect(connection.strength).toBeCloseTo(expectedConnection[i], 1);
      }
    });
  });

  describe('Multi-Agent Personality Coordination', () => {
    test('should coordinate personality with Content Agent', async () => {
      mockEventBridge.send = jest.fn().mockResolvedValue({});

      await personalityFramework.coordinateWithContent({
        storyId: 'story-123',
        personalityProfile: {
          energy: 'high',
          humor: 'silly',
          warmth: 'nurturing'
        }
      });

      expect(mockEventBridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: 'PersonalityProfileUpdate',
              Source: 'personality-agent'
            })
          ])
        })
      );
    });

    test('should sync with Emotion Agent for emotional coherence', async () => {
      const emotionalSync = await personalityFramework.syncWithEmotion({
        userId: 'user-123',
        currentMood: 'happy',
        personalityMode: 'celebratory'
      });

      expect(emotionalSync.aligned).toBe(true);
      expect(emotionalSync.personalityAdjustments).toEqual([]);
      expect(emotionalSync.coherenceScore).toBeGreaterThan(0.9);
    });
  });

  describe('Health Check', () => {
    test('should report comprehensive health status', async () => {
      const health = await personalityFramework.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('personality-agent');
      expect(health.traits).toContain('whimsical');
      expect(health.traits).toContain('warm');
      expect(health.traits).toContain('empathetic');
      expect(health.traits).toContain('youthful');
      expect(health.engines).toHaveLength(6);
      expect(health.platformSupport).toContain('voice');
      expect(health.platformSupport).toContain('text');
      expect(health.consistencyScore).toBeGreaterThan(0.95);
    });
  });
});

// Test utilities
export const PersonalityTestUtils = {
  createPersonalityProfile: (overrides = {}) => ({
    whimsy: 0.85,
    warmth: 0.90,
    energy: 0.80,
    empathy: 0.95,
    humor: 0.75,
    ...overrides
  }),
  
  mockPersonalityState: (framework: PersonalityFramework, traits: any) => {
    jest.spyOn(framework, 'getCurrentPersonality').mockResolvedValue({
      traits,
      consistency: 0.95
    });
  }
};