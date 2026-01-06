// Content Agent Unit Test - 100% Coverage + Multi-Agent Verification
import { ContentAgent } from '../ContentAgent';
import { StoryGenerationService } from '../services/StoryGenerationService';
import { CharacterGenerationService } from '../services/CharacterGenerationService';
import { AssetGenerationService } from '../services/AssetGenerationService';
import { OpenAIService } from '../services/OpenAIService';
import { createClient } from '@supabase/supabase-js';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

// Mock all dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('../services/StoryGenerationService');
jest.mock('../services/CharacterGenerationService');
jest.mock('../services/AssetGenerationService');
jest.mock('../services/OpenAIService');

describe('ContentAgent - 100% Coverage with Multi-Agent Orchestration', () => {
  let contentAgent: ContentAgent;
  let mockSupabase: any;
  let mockEventBridge: jest.Mocked<EventBridgeClient>;
  let mockStoryService: jest.Mocked<StoryGenerationService>;
  let mockCharacterService: jest.Mocked<CharacterGenerationService>;
  let mockAssetService: jest.Mocked<AssetGenerationService>;
  let mockOpenAI: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
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
    
    // Initialize ContentAgent
    contentAgent = new ContentAgent({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      openaiApiKey: 'test-openai-key',
      environment: 'test'
    });
  });

  describe('Story Generation - All Types & Multi-Agent Coordination', () => {
    const storyTypes = ['adventure', 'bedtime', 'educational', 'therapeutic'];
    
    test.each(storyTypes)('should generate %s story with proper agent coordination', async (type) => {
      const request = {
        type,
        userId: 'user-123',
        characterId: 'char-456',
        theme: 'friendship and courage',
        options: {
          mood: 'uplifting',
          duration: 'medium'
        }
      };

      // Mock character retrieval
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'char-456',
          name: 'Luna',
          traits: ['brave', 'curious', 'kind'],
          backstory: 'A young explorer'
        },
        error: null
      });

      // Mock multi-agent coordination events
      const mockPublishEvent = jest.fn().mockResolvedValue({});
      mockEventBridge.send = mockPublishEvent;

      // Mock story generation
      const generatedStory = {
        id: 'story-789',
        title: `Luna's ${type} Adventure`,
        content: 'Once upon a time...',
        type,
        readingLevel: 3,
        emotionalTone: 'uplifting',
        duration: 300
      };

      mockOpenAI.generateStory = jest.fn().mockResolvedValue(generatedStory);

      const result = await contentAgent.generateStory(request);

      // Verify multi-agent coordination
      expect(mockPublishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              EventBusName: 'storytailor-event-bus-test',
              Source: 'content-agent',
              DetailType: 'StoryGenerationStarted'
            })
          ])
        })
      );

      // Verify story generation
      expect(result.success).toBe(true);
      expect(result.story.type).toBe(type);
      expect(result.story.title).toContain('Luna');
      
      // Verify agent coordination events were published
      expect(mockPublishEvent).toHaveBeenCalledTimes(3); // Start, SafetyCheck, Complete
    });

    describe('Educational Story Specialization', () => {
      test('should include educational metadata and learning objectives', async () => {
        const request = {
          type: 'educational',
          userId: 'user-123',
          theme: 'solar system',
          options: {
            educationalFocus: 'astronomy',
            ageGroup: '8-10',
            learningObjectives: ['planets', 'space', 'gravity']
          }
        };

        mockSupabase.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' } // No character
        });

        const educationalStory = {
          id: 'edu-story-123',
          title: 'Journey Through the Solar System',
          content: 'Educational content about planets...',
          metadata: {
            concepts: ['planets', 'orbits', 'gravity'],
            vocabulary: ['asteroid', 'constellation', 'galaxy'],
            questions: [
              'What is the largest planet?',
              'How many planets are there?'
            ]
          }
        };

        mockOpenAI.generateStory = jest.fn().mockResolvedValue(educationalStory);

        const result = await contentAgent.generateStory(request);

        expect(result.success).toBe(true);
        expect(result.story.metadata.concepts).toBeDefined();
        expect(result.story.metadata.vocabulary).toBeDefined();
        expect(result.story.metadata.questions).toHaveLength(2);
      });
    });

    describe('Therapeutic Story Specialization', () => {
      test('should handle therapeutic goals and emotional support', async () => {
        const request = {
          type: 'therapeutic',
          userId: 'user-123',
          theme: 'dealing with anxiety',
          options: {
            therapeuticGoal: 'anxiety_management',
            techniques: ['breathing', 'visualization', 'grounding']
          }
        };

        // Mock emotion agent coordination
        const mockEmotionCheck = {
          mood: 'anxious',
          intensity: 0.7,
          recommendations: ['calming_story', 'breathing_exercises']
        };

        mockEventBridge.send = jest.fn()
          .mockResolvedValueOnce({}) // Initial event
          .mockResolvedValueOnce({ // Emotion agent response
            Entries: [{ EventId: 'emotion-check' }]
          });

        const therapeuticStory = {
          id: 'therapy-story-123',
          title: 'The Calm Forest',
          content: 'A soothing story with breathing exercises...',
          metadata: {
            techniques: ['4-7-8 breathing', 'forest visualization'],
            affirmations: ['You are safe', 'You are in control'],
            followUp: 'Consider the mindfulness activity'
          }
        };

        mockOpenAI.generateStory = jest.fn().mockResolvedValue(therapeuticStory);

        const result = await contentAgent.generateStory(request);

        expect(result.success).toBe(true);
        expect(result.story.metadata.techniques).toBeDefined();
        expect(result.story.metadata.affirmations).toBeDefined();
        
        // Verify coordination with Emotion and Therapeutic agents
        expect(mockEventBridge.send).toHaveBeenCalledWith(
          expect.objectContaining({
            Entries: expect.arrayContaining([
              expect.objectContaining({
                DetailType: 'TherapeuticContentRequest'
              })
            ])
          })
        );
      });
    });

    describe('Safety Filtering & Crisis Detection', () => {
      test('should filter inappropriate content', async () => {
        const request = {
          type: 'adventure',
          userId: 'user-123',
          theme: 'inappropriate content test'
        };

        // Mock safety agent response
        mockEventBridge.send = jest.fn().mockImplementation((params) => {
          if (params.Entries[0].DetailType === 'ContentSafetyCheck') {
            return Promise.resolve({
              detail: {
                safe: false,
                reason: 'inappropriate_content',
                suggestions: ['friendship', 'teamwork']
              }
            });
          }
          return Promise.resolve({});
        });

        const result = await contentAgent.generateStory(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('content guidelines');
        expect(result.suggestions).toBeDefined();
      });

      test('should detect crisis keywords and escalate', async () => {
        const crisisKeywords = ['hurt myself', 'nobody loves me', 'want to die'];
        
        for (const keyword of crisisKeywords) {
          const request = {
            type: 'therapeutic',
            userId: 'user-123',
            theme: keyword
          };

          mockEventBridge.send = jest.fn().mockResolvedValue({});

          const result = await contentAgent.generateStory(request);

          expect(mockEventBridge.send).toHaveBeenCalledWith(
            expect.objectContaining({
              Entries: expect.arrayContaining([
                expect.objectContaining({
                  DetailType: 'CrisisDetected',
                  Detail: expect.stringContaining('immediate_support')
                })
              ])
            })
          );

          expect(result.crisisSupport).toBe(true);
          expect(result.resources).toBeDefined();
        }
      });
    });
  });

  describe('Character Generation - Inclusive Design & Multi-Agent', () => {
    test('should create character with accessibility considerations', async () => {
      const request = {
        userId: 'user-123',
        name: 'Alex',
        traits: ['creative', 'determined', 'empathetic'],
        appearance: 'Uses a wheelchair, has bright purple hair',
        backstory: 'A young inventor who creates assistive devices'
      };

      // Mock accessibility agent coordination
      mockEventBridge.send = jest.fn().mockResolvedValue({});

      const generatedCharacter = {
        id: 'char-999',
        name: 'Alex',
        traits: request.traits,
        appearance: request.appearance,
        backstory: request.backstory,
        metadata: {
          inclusivity: ['mobility_device_user', 'STEM_interest'],
          representation: 'positive_disability_representation'
        },
        assets: {
          imagePrompt: 'child-friendly illustration of Alex...'
        }
      };

      mockOpenAI.generateCharacter = jest.fn().mockResolvedValue(generatedCharacter);
      
      // Mock asset generation
      mockAssetService.generateCharacterImage = jest.fn().mockResolvedValue({
        imageUrl: 'https://cdn.storytailor.ai/char-999.png'
      });

      const result = await contentAgent.createCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character.metadata.inclusivity).toBeDefined();
      
      // Verify accessibility agent was consulted
      expect(mockEventBridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: 'AccessibilityReview'
            })
          ])
        })
      );
    });

    test('should handle diverse cultural backgrounds', async () => {
      const culturalBackgrounds = [
        { name: 'Yuki', culture: 'Japanese', traits: ['respectful', 'artistic'] },
        { name: 'Amara', culture: 'Nigerian', traits: ['storyteller', 'joyful'] },
        { name: 'Carlos', culture: 'Mexican', traits: ['family-oriented', 'musical'] }
      ];

      for (const character of culturalBackgrounds) {
        // Mock localization agent coordination
        mockEventBridge.send = jest.fn().mockResolvedValue({});

        const result = await contentAgent.createCharacter({
          userId: 'user-123',
          name: character.name,
          traits: character.traits,
          culturalBackground: character.culture
        });

        // Verify localization agent was consulted
        expect(mockEventBridge.send).toHaveBeenCalledWith(
          expect.objectContaining({
            Entries: expect.arrayContaining([
              expect.objectContaining({
                DetailType: 'CulturalValidation',
                Detail: expect.stringContaining(character.culture)
              })
            ])
          })
        );
      }
    });
  });

  describe('Asset Generation Pipeline', () => {
    test('should generate character illustration with DALL-E', async () => {
      const character = {
        id: 'char-123',
        name: 'Luna',
        appearance: 'Young girl with curly hair and starry dress',
        traits: ['adventurous', 'kind']
      };

      mockAssetService.generateCharacterImage = jest.fn().mockResolvedValue({
        imageUrl: 'https://cdn.storytailor.ai/luna.png',
        prompt: 'child-friendly illustration...',
        safetyScore: 1.0
      });

      const result = await contentAgent.generateCharacterAssets(character);

      expect(result.success).toBe(true);
      expect(result.assets.imageUrl).toBeDefined();
      expect(result.assets.safetyScore).toBe(1.0);
    });

    test('should generate story audio with voice synthesis', async () => {
      const story = {
        id: 'story-123',
        content: 'Once upon a time...',
        characterVoiceId: 'voice-luna'
      };

      // Mock voice synthesis agent
      mockEventBridge.send = jest.fn().mockResolvedValue({});

      const result = await contentAgent.requestAudioGeneration(story);

      expect(mockEventBridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: 'AudioGenerationRequest',
              Detail: expect.stringContaining(story.id)
            })
          ])
        })
      );

      expect(result.success).toBe(true);
      expect(result.audioJobId).toBeDefined();
    });
  });

  describe('Content Regeneration & Editing', () => {
    test('should regenerate story with new parameters', async () => {
      const storyId = 'story-123';
      const regenerateOptions = {
        keepCharacters: true,
        newTheme: 'space exploration',
        adjustMood: 'more exciting'
      };

      // Mock existing story retrieval
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: storyId,
          title: 'Original Story',
          content: 'Original content...',
          character_id: 'char-456'
        },
        error: null
      });

      const regeneratedStory = {
        id: storyId,
        title: 'Luna\'s Space Adventure',
        content: 'New exciting space content...'
      };

      mockOpenAI.regenerateStory = jest.fn().mockResolvedValue(regeneratedStory);

      const result = await contentAgent.regenerateStory(storyId, regenerateOptions);

      expect(result.success).toBe(true);
      expect(result.story.content).toContain('space');
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    test('should allow interactive story choices', async () => {
      const storyId = 'story-123';
      const choice = {
        choicePoint: 'cave_entrance',
        selection: 'enter_bravely'
      };

      mockOpenAI.continueStory = jest.fn().mockResolvedValue({
        continuation: 'Luna bravely entered the cave...',
        nextChoices: ['explore_deeper', 'return_outside']
      });

      const result = await contentAgent.makeStoryChoice(storyId, choice);

      expect(result.success).toBe(true);
      expect(result.continuation).toBeDefined();
      expect(result.nextChoices).toHaveLength(2);
    });
  });

  describe('Performance & Token Optimization', () => {
    test('should optimize token usage for story generation', async () => {
      const request = {
        type: 'adventure',
        userId: 'user-123',
        theme: 'simple adventure'
      };

      let tokenUsage = 0;
      mockOpenAI.generateStory = jest.fn().mockImplementation(() => {
        tokenUsage = 1500; // Simulated token count
        return Promise.resolve({
          id: 'story-123',
          content: 'Story content...',
          tokenUsage
        });
      });

      const result = await contentAgent.generateStory(request);

      expect(result.success).toBe(true);
      expect(result.metrics.tokenUsage).toBeLessThan(2000); // Token limit
      expect(result.metrics.estimatedCost).toBeDefined();
    });

    test('should handle rate limiting gracefully', async () => {
      mockOpenAI.generateStory = jest.fn()
        .mockRejectedValueOnce({ code: 'rate_limit_exceeded' })
        .mockResolvedValueOnce({ id: 'story-123', content: 'Success' });

      const result = await contentAgent.generateStory({
        type: 'adventure',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(mockOpenAI.generateStory).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling & Fallbacks', () => {
    test('should provide fallback content on AI service failure', async () => {
      mockOpenAI.generateStory = jest.fn().mockRejectedValue(
        new Error('OpenAI service unavailable')
      );

      const result = await contentAgent.generateStory({
        type: 'bedtime',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.story.content).toContain('wonderful dreams'); // Fallback content
      expect(result.fallbackUsed).toBe(true);
    });

    test('should handle database failures gracefully', async () => {
      mockSupabase.insert.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const result = await contentAgent.createCharacter({
        userId: 'user-123',
        name: 'Test Character'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('temporarily unavailable');
      expect(result.retryAfter).toBeDefined();
    });
  });

  describe('Health Check', () => {
    test('should report comprehensive health status', async () => {
      const health = await contentAgent.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('content-agent');
      expect(health.capabilities).toContain('story-generation');
      expect(health.capabilities).toContain('character-creation');
      expect(health.integrations).toEqual({
        openai: 'connected',
        supabase: 'connected',
        eventbridge: 'connected'
      });
    });
  });
});

// Test Data Factories
export const ContentTestUtils = {
  createStoryRequest: (overrides = {}) => ({
    type: 'adventure',
    userId: 'test-user',
    theme: 'friendship',
    ...overrides
  }),
  
  createCharacterRequest: (overrides = {}) => ({
    userId: 'test-user',
    name: 'Test Character',
    traits: ['brave', 'kind'],
    ...overrides
  }),
  
  mockStoryGeneration: (agent: ContentAgent, response: any) => {
    jest.spyOn(agent, 'generateStory').mockResolvedValue({
      success: true,
      story: response
    });
  }
};