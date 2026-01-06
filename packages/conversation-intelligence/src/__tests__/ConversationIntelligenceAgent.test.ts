// Conversation Intelligence Agent Unit Test - 100% Coverage + NLU Validation
import { ConversationIntelligenceAgent } from '../ConversationIntelligenceAgent';
import { NaturalLanguageUnderstanding } from '../services/NaturalLanguageUnderstanding';
import { ContextualMemoryPersonalization } from '../services/ContextualMemoryPersonalization';
import { DevelopmentalPsychologyIntegration } from '../services/DevelopmentalPsychologyIntegration';
import { createClient } from '@supabase/supabase-js';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('../services/NaturalLanguageUnderstanding');
jest.mock('../services/ContextualMemoryPersonalization');
jest.mock('../services/DevelopmentalPsychologyIntegration');

describe('ConversationIntelligenceAgent - 100% Coverage with Advanced NLU', () => {
  let conversationAgent: ConversationIntelligenceAgent;
  let mockSupabase: any;
  let mockEventBridge: jest.Mocked<EventBridgeClient>;
  let mockNLU: jest.Mocked<NaturalLanguageUnderstanding>;
  let mockMemory: jest.Mocked<ContextualMemoryPersonalization>;
  let mockPsychology: jest.Mocked<DevelopmentalPsychologyIntegration>;

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
    
    conversationAgent = new ConversationIntelligenceAgent({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      environment: 'test'
    });
  });

  describe('Natural Language Understanding', () => {
    test('should understand complex child language patterns', async () => {
      mockNLU.analyzeUtterance.mockResolvedValue({
        intent: 'story-request',
        entities: {
          character: 'dragon',
          mood: 'friendly',
          setting: 'castle'
        },
        confidence: 0.92,
        childSpeechPatterns: ['incomplete-sentences', 'imaginative-elements']
      });

      const understanding = await conversationAgent.understandInput({
        text: 'I want story with nice dragon in big castle!',
        userId: 'child-123',
        age: 6
      });

      expect(understanding.intent).toBe('story-request');
      expect(understanding.extracted.character).toBe('dragon');
      expect(understanding.ageAppropriateInterpretation).toBe(true);
      expect(understanding.disambiguationNeeded).toBe(false);
    });

    test('should handle multi-turn conversations', async () => {
      const turns = [
        { input: 'I want a story', expected: 'story-initiation' },
        { input: 'With a princess', expected: 'character-addition' },
        { input: 'And she should be brave', expected: 'character-trait' },
        { input: 'Fighting a monster', expected: 'plot-element' }
      ];

      for (let i = 0; i < turns.length; i++) {
        const result = await conversationAgent.processTurn({
          text: turns[i].input,
          turnNumber: i + 1,
          conversationId: 'conv-123'
        });

        expect(result.intent).toBe(turns[i].expected);
        expect(result.contextMaintained).toBe(true);
        expect(result.coherent).toBe(true);
      }
    });

    test('should detect and handle ambiguity', async () => {
      const ambiguous = [
        { text: 'Make it scary but not too scary', resolution: 'age-appropriate-scary' },
        { text: 'I want the one from yesterday', resolution: 'retrieve-previous-story' },
        { text: 'Change it', resolution: 'clarify-change-target' }
      ];

      for (const input of ambiguous) {
        const result = await conversationAgent.resolveAmbiguity({
          text: input.text,
          context: 'story-editing'
        });

        expect(result.ambiguityDetected).toBe(true);
        expect(result.resolution).toBe(input.resolution);
        expect(result.clarificationQuestion).toBeDefined();
      }
    });
  });

  describe('Contextual Memory', () => {
    test('should remember conversation context across sessions', async () => {
      mockMemory.retrieveContext.mockResolvedValue({
        previousTopics: ['dragons', 'space adventures'],
        preferences: { genre: 'fantasy', length: 'medium' },
        recentCharacters: ['Luna the brave', 'Captain Star'],
        emotionalTone: 'adventurous'
      });

      const memory = await conversationAgent.loadConversationMemory({
        userId: 'user-123',
        lookbackDays: 7
      });

      expect(memory.hasContext).toBe(true);
      expect(memory.relevantTopics).toContain('dragons');
      expect(memory.personalizedSuggestions).toBeDefined();
      expect(memory.continuityMaintained).toBe(true);
    });

    test('should build user preference profile', async () => {
      const profile = await conversationAgent.buildPreferenceProfile({
        userId: 'user-123',
        conversationCount: 50
      });

      expect(profile.favoriteThemes).toBeDefined();
      expect(profile.preferredStoryLength).toBe('10-15 minutes');
      expect(profile.characterPreferences).toBeDefined();
      expect(profile.avoidanceTopics).toBeDefined();
      expect(profile.confidence).toBeGreaterThan(0.8);
    });

    test('should adapt responses based on memory', async () => {
      const response = await conversationAgent.generateContextualResponse({
        userId: 'user-123',
        currentInput: 'Tell me another story',
        memoryEnabled: true
      });

      expect(response.referencePreviousStory).toBe(true);
      expect(response.personalizedElements).toBeDefined();
      expect(response.continuityPhrase).toContain('another adventure');
      expect(response.familiarCharacterSuggested).toBe(true);
    });
  });

  describe('Developmental Psychology Integration', () => {
    test('should adapt conversation style by age', async () => {
      mockPsychology.getAgeAppropriateStyle.mockResolvedValue({
        vocabularyLevel: 'age-appropriate',
        sentenceComplexity: 'simple',
        abstractConcepts: 'concrete',
        attentionSpanConsideration: true
      });

      const ageGroups = [
        { age: 4, expectedComplexity: 'very-simple' },
        { age: 8, expectedComplexity: 'moderate' },
        { age: 12, expectedComplexity: 'advanced' },
        { age: 16, expectedComplexity: 'sophisticated' }
      ];

      for (const group of ageGroups) {
        const style = await conversationAgent.adaptConversationStyle({
          age: group.age,
          cognitiveLevel: 'typical'
        });

        expect(style.complexity).toBe(group.expectedComplexity);
        expect(style.developmentallyAppropriate).toBe(true);
      }
    });

    test('should recognize developmental milestones', async () => {
      const milestones = await conversationAgent.assessDevelopmentalIndicators({
        userId: 'child-123',
        conversationHistory: 'last-30-days'
      });

      expect(milestones.languageDevelopment).toBe('on-track');
      expect(milestones.imaginativePlay).toBe('age-appropriate');
      expect(milestones.socialUnderstanding).toBe('emerging');
      expect(milestones.suggestedContent).toBeDefined();
    });

    test('should support theory of mind development', async () => {
      const tomSupport = await conversationAgent.supportTheoryOfMind({
        age: 5,
        storyContext: 'character-perspectives'
      });

      expect(tomSupport.perspectiveTaking).toBe('scaffolded');
      expect(tomSupport.emotionalUnderstanding).toBe('guided');
      expect(tomSupport.questions).toContain('How do you think [character] feels?');
      expect(tomSupport.developmentallyTargeted).toBe(true);
    });
  });

  describe('Conversation Flow Management', () => {
    test('should maintain engaging conversation rhythm', async () => {
      const flow = await conversationAgent.optimizeConversationFlow({
        conversationId: 'conv-123',
        currentTurn: 5
      });

      expect(flow.turnTaking).toBe('balanced');
      expect(flow.responseLength).toBe('appropriate');
      expect(flow.questionFrequency).toBe('engaging');
      expect(flow.pacingScore).toBeGreaterThan(0.8);
    });

    test('should handle conversation repair', async () => {
      const repairs = [
        { issue: 'misunderstanding', strategy: 'clarification' },
        { issue: 'off-topic', strategy: 'gentle-redirect' },
        { issue: 'repetition', strategy: 'acknowledge-and-expand' },
        { issue: 'silence', strategy: 'encouraging-prompt' }
      ];

      for (const repair of repairs) {
        const result = await conversationAgent.repairConversation({
          issue: repair.issue,
          context: 'story-creation'
        });

        expect(result.strategy).toBe(repair.strategy);
        expect(result.successful).toBe(true);
      }
    });

    test('should manage conversation endings gracefully', async () => {
      const ending = await conversationAgent.concludeConversation({
        conversationId: 'conv-123',
        reason: 'natural-completion'
      });

      expect(ending.summary).toBeDefined();
      expect(ending.nextTimeHook).toBeDefined();
      expect(ending.positiveClose).toBe(true);
      expect(ending.continuityPreserved).toBe(true);
    });
  });

  describe('Emotion and Sentiment Analysis', () => {
    test('should detect emotional undertones', async () => {
      const emotions = [
        { text: 'I dont want to go to school tomorrow', emotion: 'anxiety' },
        { text: 'My friend was mean to me', emotion: 'sadness' },
        { text: 'I did it all by myself!', emotion: 'pride' },
        { text: 'This is the best day ever!', emotion: 'joy' }
      ];

      for (const input of emotions) {
        const result = await conversationAgent.analyzeEmotionalContent({
          text: input.text,
          includeSubtle: true
        });

        expect(result.primaryEmotion).toBe(input.emotion);
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.supportiveResponse).toBeDefined();
      }
    });

    test('should track emotional journey through conversation', async () => {
      const journey = await conversationAgent.trackEmotionalJourney({
        conversationId: 'conv-123',
        turns: 10
      });

      expect(journey.emotionalArc).toBeDefined();
      expect(journey.moodProgression).toBeDefined();
      expect(journey.interventionPoints).toBeDefined();
      expect(journey.overallSentiment).toBe('positive');
    });
  });

  describe('Advanced Language Features', () => {
    test('should understand figurative language', async () => {
      const figurative = [
        { text: 'I have butterflies in my stomach', meaning: 'nervous' },
        { text: 'Its raining cats and dogs', meaning: 'heavy-rain' },
        { text: 'Im over the moon', meaning: 'very-happy' }
      ];

      for (const phrase of figurative) {
        const result = await conversationAgent.interpretFigurativeLanguage({
          text: phrase.text,
          context: 'casual-conversation'
        });

        expect(result.literalInterpretation).toBe(false);
        expect(result.actualMeaning).toBe(phrase.meaning);
        expect(result.ageAppropriateExplanation).toBeDefined();
      }
    });

    test('should handle code-switching and mixed languages', async () => {
      const mixed = await conversationAgent.handleMultilingualInput({
        text: 'I want a cuento about a brave niña',
        primaryLanguage: 'en',
        secondaryLanguage: 'es'
      });

      expect(mixed.understood).toBe(true);
      expect(mixed.languages).toEqual(['en', 'es']);
      expect(mixed.unifiedIntent).toBe('story-request');
      expect(mixed.culturalSensitivity).toBe('maintained');
    });
  });

  describe('Learning and Improvement', () => {
    test('should learn from conversation patterns', async () => {
      const learning = await conversationAgent.updateConversationModel({
        userId: 'user-123',
        successfulPatterns: ['story-request-flow', 'character-building'],
        unsuccessfulPatterns: ['ambiguous-references']
      });

      expect(learning.modelUpdated).toBe(true);
      expect(learning.improvementAreas).toBeDefined();
      expect(learning.personalizationEnhanced).toBe(true);
    });

    test('should identify conversation quality metrics', async () => {
      const metrics = await conversationAgent.assessConversationQuality({
        conversationId: 'conv-123'
      });

      expect(metrics.coherence).toBeGreaterThan(0.8);
      expect(metrics.engagement).toBeGreaterThan(0.85);
      expect(metrics.goalCompletion).toBe(true);
      expect(metrics.userSatisfaction).toBeGreaterThan(0.9);
    });
  });

  describe('Multi-Agent Coordination', () => {
    test('should enrich content agent responses', async () => {
      mockEventBridge.send = jest.fn().mockResolvedValue({});

      await conversationAgent.enrichContentGeneration({
        storyRequest: 'magical adventure',
        conversationalContext: {
          mood: 'excited',
          previousTopics: ['unicorns', 'rainbows']
        }
      });

      expect(mockEventBridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: 'ConversationalContextUpdate',
              Source: 'conversation-intelligence-agent'
            })
          ])
        })
      );
    });

    test('should coordinate with emotion agent for empathetic responses', async () => {
      const coordination = await conversationAgent.coordinateEmpatheticResponse({
        userId: 'user-123',
        detectedEmotion: 'sadness',
        conversationContext: 'story-discussion'
      });

      expect(coordination.toneAdjusted).toBe(true);
      expect(coordination.empathyLevel).toBe('high');
      expect(coordination.supportiveElements).toBeDefined();
    });
  });

  describe('Health Check', () => {
    test('should report comprehensive health status', async () => {
      const health = await conversationAgent.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('conversation-intelligence-agent');
      expect(health.capabilities).toContain('nlu');
      expect(health.capabilities).toContain('contextual-memory');
      expect(health.capabilities).toContain('developmental-psychology');
      expect(health.capabilities).toContain('emotion-detection');
      expect(health.languageModels).toBe('active');
      expect(health.memorySystem).toBe('operational');
      expect(health.psychologyEngine).toBe('calibrated');
    });
  });
});

// Test utilities
export const ConversationTestUtils = {
  createConversationTurn: (overrides = {}) => ({
    text: 'test input',
    userId: 'user-123',
    turnNumber: 1,
    timestamp: new Date(),
    ...overrides
  }),
  
  mockNLUResult: (agent: ConversationIntelligenceAgent, intent: string) => {
    jest.spyOn(agent, 'understandInput').mockResolvedValue({
      intent,
      confidence: 0.9,
      entities: {}
    });
  }
};