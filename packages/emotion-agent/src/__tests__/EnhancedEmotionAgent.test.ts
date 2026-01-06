import { EmotionAgent } from '../EmotionAgent';
import { createClient } from '@supabase/supabase-js';
import { createClient as createRedisClient } from 'redis';
import { Logger } from 'winston';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('redis');

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({ data: [], error: null }))
        }))
      }))
    })),
    insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn() })) })),
    rpc: jest.fn(() => ({ data: null, error: null }))
  }))
};

const mockRedis = {
  connect: jest.fn(),
  get: jest.fn(),
  setEx: jest.fn(),
  quit: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
} as unknown as Logger;

(createClient as jest.Mock).mockReturnValue(mockSupabase);
(createRedisClient as jest.Mock).mockReturnValue(mockRedis);

describe('Enhanced EmotionAgent', () => {
  let emotionAgent: EmotionAgent;

  beforeEach(() => {
    emotionAgent = new EmotionAgent({
      supabaseUrl: 'http://localhost:54321',
      supabaseKey: 'test-key',
      redisUrl: 'redis://localhost:6379'
    }, mockLogger);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await emotionAgent.close();
  });

  describe('Sophisticated Emotion Detection', () => {
    describe('analyzeVoicePatterns', () => {
      it('should analyze voice patterns for emotional states', async () => {
        const audioData = {
          buffer: Buffer.from('test audio'),
          format: 'wav' as const,
          sampleRate: 16000,
          duration: 2.5
        };

        const result = await emotionAgent.analyzeVoicePatterns(audioData);

        expect(result).toHaveProperty('detectedEmotions');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('voiceCharacteristics');
        expect(result).toHaveProperty('emotionalMarkers');
        expect(result).toHaveProperty('stressIndicators');

        expect(Array.isArray(result.detectedEmotions)).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });

      it('should detect emotional markers in voice patterns', async () => {
        const audioData = {
          buffer: Buffer.from('test audio'),
          format: 'wav' as const,
          sampleRate: 16000,
          duration: 3.0
        };

        const result = await emotionAgent.analyzeVoicePatterns(audioData);

        expect(Array.isArray(result.emotionalMarkers)).toBe(true);
        result.emotionalMarkers.forEach(marker => {
          expect(marker).toHaveProperty('type');
          expect(marker).toHaveProperty('confidence');
          expect(marker).toHaveProperty('timestamp');
          expect(['laughter', 'sigh', 'gasp', 'vocal_fry', 'uptalk', 'tremor']).toContain(marker.type);
        });
      });
    });

    describe('recordResponseLatency', () => {
      it('should record response latency for engagement analysis', async () => {
        const latencyData = {
          userId: 'user-123',
          sessionId: 'session-456',
          questionType: 'character_trait' as const,
          question: 'What is your character\'s name?',
          responseTime: 3500,
          timestamp: '2024-01-01T12:00:00Z'
        };

        await emotionAgent.recordResponseLatency(latencyData);

        expect(mockSupabase.from).toHaveBeenCalledWith('response_latency_data');
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Recording response latency',
          expect.objectContaining({
            userId: latencyData.userId,
            responseTime: latencyData.responseTime
          })
        );
      });
    });

    describe('analyzeEngagementMetrics', () => {
      it('should analyze engagement metrics for a session', async () => {
        const mockLatencyData = [
          { response_time: 2000, created_at: '2024-01-01T12:00:00Z' },
          { response_time: 3000, created_at: '2024-01-01T12:01:00Z' },
          { response_time: 2500, created_at: '2024-01-01T12:02:00Z' }
        ];

        (mockSupabase.from as jest.Mock).mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({ data: mockLatencyData, error: null }))
              }))
            }))
          }))
        });

        const result = await emotionAgent.analyzeEngagementMetrics('user-123', 'session-456');

        expect(result).toHaveProperty('averageResponseTime');
        expect(result).toHaveProperty('engagementLevel');
        expect(result).toHaveProperty('attentionSpan');
        expect(result).toHaveProperty('fatigueIndicators');
        expect(result).toHaveProperty('recommendations');

        expect(['high', 'medium', 'low']).toContain(result.engagementLevel);
        expect(Array.isArray(result.fatigueIndicators)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
      });
    });

    describe('recordStoryChoice', () => {
      it('should record story choice for pattern analysis', async () => {
        const choice = {
          userId: 'user-123',
          sessionId: 'session-456',
          storyId: 'story-789',
          choicePoint: 'character_decision',
          choiceOptions: ['help friend', 'go alone', 'ask for help'],
          selectedChoice: 'help friend',
          responseTime: 4000,
          emotionalContext: 'happy' as const,
          timestamp: '2024-01-01T12:00:00Z'
        };

        await emotionAgent.recordStoryChoice(choice);

        expect(mockSupabase.from).toHaveBeenCalledWith('story_choices');
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Recording story choice',
          expect.objectContaining({
            userId: choice.userId,
            choicePoint: choice.choicePoint
          })
        );
      });
    });

    describe('detectInterventionTriggers', () => {
      it('should detect comprehensive intervention triggers', async () => {
        // Mock various data sources
        (mockSupabase.from as jest.Mock).mockImplementation((table) => {
          if (table === 'response_latency_data') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    order: jest.fn(() => ({ 
                      data: [
                        { response_time: 15000, created_at: '2024-01-01T12:00:00Z' },
                        { response_time: 18000, created_at: '2024-01-01T12:01:00Z' }
                      ], 
                      error: null 
                    }))
                  }))
                }))
              }))
            };
          }
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({ data: [], error: null }))
              }))
            }))
          };
        });

        const result = await emotionAgent.detectInterventionTriggers('user-123', 'session-456');

        expect(result).toHaveProperty('interventionNeeded');
        expect(result).toHaveProperty('triggers');
        expect(result).toHaveProperty('overallRecommendations');

        expect(typeof result.interventionNeeded).toBe('boolean');
        expect(Array.isArray(result.triggers)).toBe(true);
        expect(Array.isArray(result.overallRecommendations)).toBe(true);
      });
    });
  });

  describe('Predictive Emotional Support', () => {
    describe('detectEarlyInterventionSignals', () => {
      it('should detect early intervention signals', async () => {
        // Mock emotion data showing decline
        (mockSupabase.from as jest.Mock).mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => ({ 
                  data: [
                    { mood: 'happy', confidence: 0.8, created_at: '2024-01-01T12:00:00Z' },
                    { mood: 'neutral', confidence: 0.7, created_at: '2024-01-02T12:00:00Z' },
                    { mood: 'sad', confidence: 0.9, created_at: '2024-01-03T12:00:00Z' }
                  ], 
                  error: null 
                }))
              }))
            }))
          }))
        });

        const result = await emotionAgent.detectEarlyInterventionSignals('user-123');

        expect(Array.isArray(result)).toBe(true);
        result.forEach(signal => {
          expect(signal).toHaveProperty('signalType');
          expect(signal).toHaveProperty('severity');
          expect(signal).toHaveProperty('confidence');
          expect(signal).toHaveProperty('recommendedActions');

          expect(['emotional_decline', 'behavioral_change', 'engagement_drop', 'stress_accumulation', 'social_withdrawal']).toContain(signal.signalType);
          expect(['low', 'medium', 'high', 'critical']).toContain(signal.severity);
          expect(Array.isArray(signal.recommendedActions)).toBe(true);
        });
      });
    });

    describe('performRiskAssessment', () => {
      it('should perform comprehensive risk assessment', async () => {
        const result = await emotionAgent.performRiskAssessment('user-123');

        expect(result).toHaveProperty('userId');
        expect(result).toHaveProperty('overallRiskLevel');
        expect(result).toHaveProperty('riskFactors');
        expect(result).toHaveProperty('protectiveFactors');
        expect(result).toHaveProperty('interventionUrgency');
        expect(result).toHaveProperty('recommendedInterventions');
        expect(result).toHaveProperty('nextAssessmentDue');

        expect(result.userId).toBe('user-123');
        expect(['low', 'medium', 'high', 'critical']).toContain(result.overallRiskLevel);
        expect(['none', 'monitor', 'schedule', 'immediate']).toContain(result.interventionUrgency);
        expect(Array.isArray(result.riskFactors)).toBe(true);
        expect(Array.isArray(result.protectiveFactors)).toBe(true);
        expect(Array.isArray(result.recommendedInterventions)).toBe(true);
      });
    });

    describe('generateMoodBasedRecommendations', () => {
      it('should generate mood-based story recommendations', async () => {
        const context = {
          currentMood: 'sad' as const,
          recentMoodHistory: [
            { mood: 'sad' as const, confidence: 0.8, timestamp: '2024-01-01T12:00:00Z', context: 'daily_checkin' }
          ],
          emotionalGoal: 'mood_improvement' as const,
          sessionContext: {
            timeOfDay: 'afternoon' as const,
            sessionLength: 'medium' as const,
            energyLevel: 'medium' as const,
            attentionSpan: 10
          },
          userPreferences: {
            favoriteStoryTypes: ['Adventure'],
            preferredCharacterTraits: ['brave', 'kind'],
            avoidedThemes: ['scary'],
            responseToTones: { 'uplifting': 'positive' as const },
            optimalSessionLength: 15
          }
        };

        const result = await emotionAgent.generateMoodBasedRecommendations(context);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);

        result.forEach(recommendation => {
          expect(recommendation).toHaveProperty('storyType');
          expect(recommendation).toHaveProperty('theme');
          expect(recommendation).toHaveProperty('tone');
          expect(recommendation).toHaveProperty('reasoning');
          expect(recommendation).toHaveProperty('expectedEmotionalImpact');
          expect(recommendation).toHaveProperty('confidence');
          expect(recommendation).toHaveProperty('adaptations');

          expect(['uplifting', 'calming', 'energetic', 'gentle', 'neutral']).toContain(recommendation.tone);
          expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
          expect(recommendation.confidence).toBeLessThanOrEqual(1);
          expect(Array.isArray(recommendation.adaptations)).toBe(true);
        });
      });
    });

    describe('createTherapeuticPathway', () => {
      it('should create therapeutic story pathway', async () => {
        const result = await emotionAgent.createTherapeuticPathway(
          'user-123',
          ['happy', 'neutral'],
          'sad',
          ['mood_improvement', 'emotional_regulation']
        );

        expect(result).toHaveProperty('pathwayName');
        expect(result).toHaveProperty('targetEmotions');
        expect(result).toHaveProperty('storyProgression');
        expect(result).toHaveProperty('expectedOutcomes');
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('adaptationTriggers');

        expect(Array.isArray(result.targetEmotions)).toBe(true);
        expect(result.targetEmotions).toContain('happy');
        expect(result.targetEmotions).toContain('neutral');
        expect(Array.isArray(result.storyProgression)).toBe(true);
        expect(Array.isArray(result.expectedOutcomes)).toBe(true);
        expect(Array.isArray(result.adaptationTriggers)).toBe(true);
        expect(typeof result.duration).toBe('number');
      });
    });

    describe('detectAndRespondToCrisis', () => {
      it('should detect crisis indicators and execute response', async () => {
        const analysisData = {
          textContent: 'I want to hurt myself',
          emotionalState: 'sad' as const
        };

        const context = {
          userAge: 8,
          sessionDuration: 1800,
          timeOfDay: 'evening'
        };

        const result = await emotionAgent.detectAndRespondToCrisis(
          'user-123',
          'session-456',
          analysisData,
          context
        );

        expect(result).toHaveProperty('crisisDetected');
        expect(result).toHaveProperty('immediateActions');

        expect(typeof result.crisisDetected).toBe('boolean');
        expect(Array.isArray(result.immediateActions)).toBe(true);

        if (result.crisisDetected) {
          expect(result).toHaveProperty('crisisResponse');
          expect(result.crisisResponse).toHaveProperty('crisisId');
          expect(result.crisisResponse).toHaveProperty('riskLevel');
          expect(result.crisisResponse).toHaveProperty('escalationActions');
          expect(['low', 'medium', 'high', 'critical']).toContain(result.crisisResponse!.riskLevel);
        }
      });

      it('should not trigger crisis response for normal content', async () => {
        const analysisData = {
          textContent: 'I like adventure stories',
          emotionalState: 'happy' as const
        };

        const context = {
          userAge: 8,
          sessionDuration: 1200,
          timeOfDay: 'afternoon'
        };

        const result = await emotionAgent.detectAndRespondToCrisis(
          'user-123',
          'session-456',
          analysisData,
          context
        );

        expect(result.crisisDetected).toBe(false);
        expect(result.immediateActions).toEqual([]);
      });
    });

    describe('generatePredictiveEmotionalSupport', () => {
      it('should generate comprehensive predictive support plan', async () => {
        // Mock recent emotions
        (mockSupabase.from as jest.Mock).mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({ 
                  data: [
                    { 
                      mood: 'sad', 
                      confidence: 0.8, 
                      created_at: '2024-01-01T12:00:00Z',
                      context: { type: 'daily_checkin' }
                    }
                  ], 
                  error: null 
                }))
              }))
            }))
          }))
        });

        const result = await emotionAgent.generatePredictiveEmotionalSupport('user-123');

        expect(result).toHaveProperty('earlyInterventionSignals');
        expect(result).toHaveProperty('riskAssessment');
        expect(result).toHaveProperty('storyRecommendations');
        expect(result).toHaveProperty('predictiveInsights');
        expect(result).toHaveProperty('supportPlan');

        expect(Array.isArray(result.earlyInterventionSignals)).toBe(true);
        expect(Array.isArray(result.storyRecommendations)).toBe(true);

        expect(result.supportPlan).toHaveProperty('immediateActions');
        expect(result.supportPlan).toHaveProperty('shortTermGoals');
        expect(result.supportPlan).toHaveProperty('longTermObjectives');
        expect(result.supportPlan).toHaveProperty('monitoringPlan');

        expect(Array.isArray(result.supportPlan.immediateActions)).toBe(true);
        expect(Array.isArray(result.supportPlan.shortTermGoals)).toBe(true);
        expect(Array.isArray(result.supportPlan.longTermObjectives)).toBe(true);
        expect(Array.isArray(result.supportPlan.monitoringPlan)).toBe(true);
      });

      it('should create therapeutic pathway for high-risk users', async () => {
        // Mock high-risk scenario
        (mockSupabase.from as jest.Mock).mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({ 
                  data: [
                    { 
                      mood: 'sad', 
                      confidence: 0.9, 
                      created_at: '2024-01-01T12:00:00Z',
                      context: { type: 'crisis_indicator' }
                    }
                  ], 
                  error: null 
                }))
              }))
            }))
          }))
        });

        const result = await emotionAgent.generatePredictiveEmotionalSupport('user-123');

        // Should include therapeutic pathway for high-risk users
        if (result.riskAssessment.overallRiskLevel === 'high' || result.riskAssessment.overallRiskLevel === 'critical') {
          expect(result.therapeuticPathway).toBeDefined();
          expect(result.therapeuticPathway).toHaveProperty('pathwayName');
          expect(result.therapeuticPathway).toHaveProperty('targetEmotions');
        }
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete emotional intelligence workflow', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      // 1. Record voice analysis
      const audioData = {
        buffer: Buffer.from('test audio'),
        format: 'wav' as const,
        sampleRate: 16000,
        duration: 3.0
      };
      const voiceAnalysis = await emotionAgent.analyzeVoicePatterns(audioData);

      // 2. Record response latency
      await emotionAgent.recordResponseLatency({
        userId,
        sessionId,
        questionType: 'character_trait',
        question: 'What is your character like?',
        responseTime: 5000,
        timestamp: new Date().toISOString()
      });

      // 3. Record story choice
      await emotionAgent.recordStoryChoice({
        userId,
        sessionId,
        storyId: 'story-789',
        choicePoint: 'character_decision',
        choiceOptions: ['help friend', 'go alone'],
        selectedChoice: 'help friend',
        responseTime: 3000,
        emotionalContext: 'happy',
        timestamp: new Date().toISOString()
      });

      // 4. Detect intervention triggers
      const interventionTriggers = await emotionAgent.detectInterventionTriggers(userId, sessionId);

      // 5. Generate predictive support
      const predictiveSupport = await emotionAgent.generatePredictiveEmotionalSupport(userId);

      // Verify workflow completion
      expect(voiceAnalysis).toBeDefined();
      expect(interventionTriggers).toBeDefined();
      expect(predictiveSupport).toBeDefined();

      expect(predictiveSupport.storyRecommendations.length).toBeGreaterThan(0);
      expect(predictiveSupport.supportPlan.immediateActions).toBeDefined();
    });

    it('should maintain data consistency across services', async () => {
      const userId = 'user-123';

      // Generate multiple data points
      await emotionAgent.recordResponseLatency({
        userId,
        sessionId: 'session-1',
        questionType: 'emotional_checkin',
        question: 'How are you feeling?',
        responseTime: 2000,
        timestamp: new Date().toISOString()
      });

      await emotionAgent.recordStoryChoice({
        userId,
        sessionId: 'session-1',
        storyId: 'story-1',
        choicePoint: 'story_start',
        choiceOptions: ['adventure', 'mystery'],
        selectedChoice: 'adventure',
        responseTime: 1500,
        emotionalContext: 'happy',
        timestamp: new Date().toISOString()
      });

      // Analyze patterns
      const choicePatterns = await emotionAgent.analyzeChoicePatterns(userId);
      const engagementMetrics = await emotionAgent.analyzeEngagementMetrics(userId, 'session-1');

      // Verify data consistency
      expect(Array.isArray(choicePatterns)).toBe(true);
      expect(engagementMetrics).toBeDefined();
      expect(engagementMetrics.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => {
          throw new Error('Database connection failed');
        })
      });

      await expect(emotionAgent.detectEarlyInterventionSignals('user-123')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle invalid input gracefully', async () => {
      const invalidAudioData = {
        buffer: Buffer.from(''),
        format: 'wav' as const,
        sampleRate: -1,
        duration: -1
      };

      await expect(emotionAgent.analyzeVoicePatterns(invalidAudioData)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle Redis connection failures gracefully', async () => {
      (mockRedis.get as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw even if Redis fails
      await emotionAgent.recordResponseLatency({
        userId: 'user-123',
        sessionId: 'session-456',
        questionType: 'general',
        question: 'Test question',
        responseTime: 3000,
        timestamp: new Date().toISOString()
      });

      expect(mockSupabase.from).toHaveBeenCalled(); // Database operation should still proceed
    });
  });
});