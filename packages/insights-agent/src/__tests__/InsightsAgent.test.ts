// Insights Agent Unit Test - 100% Coverage + Pattern Detection
import { InsightsAgent } from '../InsightsAgent';
import { PatternAnalysisService } from '../services/PatternAnalysisService';
import { BehavioralAnalysisService } from '../services/BehavioralAnalysisService';
import { InterestDetectionService } from '../services/InterestDetectionService';
import { ReadingHabitService } from '../services/ReadingHabitService';
import { StoryPreferenceService } from '../services/StoryPreferenceService';
import { createClient } from '@supabase/supabase-js';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('../services/PatternAnalysisService');
jest.mock('../services/BehavioralAnalysisService');
jest.mock('../services/InterestDetectionService');
jest.mock('../services/ReadingHabitService');
jest.mock('../services/StoryPreferenceService');

describe('InsightsAgent - 100% Coverage with Deep Pattern Recognition', () => {
  let insightsAgent: InsightsAgent;
  let mockSupabase: any;
  let mockEventBridge: jest.Mocked<EventBridgeClient>;
  let mockPatternAnalysis: jest.Mocked<PatternAnalysisService>;
  let mockBehavioralAnalysis: jest.Mocked<BehavioralAnalysisService>;
  let mockInterestDetection: jest.Mocked<InterestDetectionService>;
  let mockReadingHabits: jest.Mocked<ReadingHabitService>;
  let mockStoryPreferences: jest.Mocked<StoryPreferenceService>;

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
    
    insightsAgent = new InsightsAgent({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      environment: 'test'
    });
  });

  describe('Behavioral Pattern Analysis', () => {
    test('should identify user engagement patterns', async () => {
      mockPatternAnalysis.analyzeEngagement.mockResolvedValue({
        patterns: [
          { type: 'peak-usage', timeWindow: '18:00-20:00', frequency: 0.85 },
          { type: 'weekend-preference', strength: 0.72 },
          { type: 'bedtime-routine', consistency: 0.90 }
        ],
        insights: ['Highly consistent bedtime story routine', 'Weekend story marathons']
      });

      const patterns = await insightsAgent.analyzeUserPatterns({
        userId: 'user-123',
        timeframe: 'last-90-days'
      });

      expect(patterns.behavioralPatterns).toHaveLength(3);
      expect(patterns.primaryPattern).toBe('bedtime-routine');
      expect(patterns.actionableInsights).toBeDefined();
      expect(patterns.confidence).toBeGreaterThan(0.8);
    });

    test('should detect changes in behavior', async () => {
      const changes = await insightsAgent.detectBehavioralChanges({
        userId: 'user-123',
        compareWindow: '30-days'
      });

      expect(changes.significantChanges).toBeDefined();
      expect(changes.possibleReasons).toContain('school-started');
      expect(changes.recommendations).toBeDefined();
      expect(changes.alertWorthy).toBe(false);
    });

    test('should predict future behavior', async () => {
      const prediction = await insightsAgent.predictBehavior({
        userId: 'user-123',
        predictWindow: 'next-7-days'
      });

      expect(prediction.likelyUsageTimes).toBeDefined();
      expect(prediction.expectedStoryCount).toBeGreaterThan(0);
      expect(prediction.contentRecommendations).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0.75);
    });
  });

  describe('Interest Evolution Tracking', () => {
    test('should track evolving interests over time', async () => {
      mockInterestDetection.trackEvolution.mockResolvedValue({
        currentInterests: ['space', 'dinosaurs', 'friendship'],
        emergingInterests: ['ocean', 'mysteries'],
        fadingInterests: ['fairies'],
        interestLifecycle: 'exploring-phase'
      });

      const evolution = await insightsAgent.trackInterestEvolution({
        userId: 'user-123',
        period: '6-months'
      });

      expect(evolution.interestTrajectory).toBeDefined();
      expect(evolution.emergingTopics).toContain('ocean');
      expect(evolution.recommendNewContent).toBe(true);
      expect(evolution.developmentalAlignment).toBe('age-appropriate');
    });

    test('should identify interest clusters', async () => {
      const clusters = await insightsAgent.identifyInterestClusters({
        userId: 'user-123',
        minClusterSize: 3
      });

      expect(clusters.mainClusters).toBeDefined();
      expect(clusters.mainClusters[0].theme).toBe('adventure-exploration');
      expect(clusters.mainClusters[0].topics).toContain('space');
      expect(clusters.crossConnections).toBeDefined();
    });

    test('should suggest interest expansion', async () => {
      const expansion = await insightsAgent.suggestInterestExpansion({
        userId: 'user-123',
        currentInterests: ['dinosaurs', 'volcanoes'],
        expansionStrategy: 'gradual'
      });

      expect(expansion.suggestions).toContain('geology');
      expect(expansion.suggestions).toContain('prehistoric-oceans');
      expect(expansion.bridgeContent).toBeDefined();
      expect(expansion.educationalValue).toBe('high');
    });
  });

  describe('Reading Habit Analysis', () => {
    test('should analyze reading comprehension indicators', async () => {
      mockReadingHabits.analyzeComprehension.mockResolvedValue({
        completionRate: 0.87,
        rereadingPattern: 'selective',
        pausePoints: ['complex-vocabulary', 'emotional-moments'],
        comprehensionLevel: 'strong'
      });

      const comprehension = await insightsAgent.analyzeReadingComprehension({
        userId: 'user-123',
        storyIds: ['story-1', 'story-2', 'story-3']
      });

      expect(comprehension.level).toBe('strong');
      expect(comprehension.growthAreas).toBeDefined();
      expect(comprehension.vocabularyRecommendations).toBeDefined();
      expect(comprehension.readingLevel).toBe('grade-appropriate');
    });

    test('should track reading speed progression', async () => {
      const progression = await insightsAgent.trackReadingProgress({
        userId: 'user-123',
        metric: 'speed',
        timeframe: '3-months'
      });

      expect(progression.improvement).toBe(true);
      expect(progression.currentWPM).toBeGreaterThan(progression.startingWPM);
      expect(progression.milestones).toBeDefined();
      expect(progression.encouragement).toBeDefined();
    });

    test('should identify optimal reading times', async () => {
      const optimal = await insightsAgent.findOptimalReadingTimes({
        userId: 'user-123',
        factors: ['completion', 'engagement', 'retention']
      });

      expect(optimal.bestTimes).toContain('19:00-20:00');
      expect(optimal.reasoning).toContain('highest-engagement');
      expect(optimal.schedule).toBeDefined();
    });
  });

  describe('Story Preference Intelligence', () => {
    test('should build comprehensive preference profile', async () => {
      mockStoryPreferences.buildProfile.mockResolvedValue({
        genres: { adventure: 0.4, educational: 0.3, fantasy: 0.3 },
        length: { preference: 'medium', tolerance: 'flexible' },
        complexity: { current: 'age-appropriate', growth: 'ready-for-challenge' },
        themes: ['friendship', 'problem-solving', 'humor']
      });

      const profile = await insightsAgent.buildPreferenceProfile({
        userId: 'user-123',
        depth: 'comprehensive'
      });

      expect(profile.topGenre).toBe('adventure');
      expect(profile.diversityScore).toBeGreaterThan(0.7);
      expect(profile.growthOpportunities).toBeDefined();
      expect(profile.avoidancePatterns).toBeDefined();
    });

    test('should predict story success', async () => {
      const prediction = await insightsAgent.predictStorySuccess({
        userId: 'user-123',
        storyAttributes: {
          genre: 'adventure',
          length: 'medium',
          characters: ['brave hero', 'wise mentor'],
          themes: ['courage', 'friendship']
        }
      });

      expect(prediction.successProbability).toBeGreaterThan(0.8);
      expect(prediction.strongPoints).toContain('genre-match');
      expect(prediction.suggestions).toBeDefined();
    });

    test('should recommend story variations', async () => {
      const variations = await insightsAgent.recommendVariations({
        baseStory: 'story-123',
        userId: 'user-123',
        variationType: 'expand-interest'
      });

      expect(variations.recommendations).toHaveLength(3);
      expect(variations.recommendations[0].rationale).toBeDefined();
      expect(variations.balancesFamiliarity).toBe(true);
    });
  });

  describe('Family Insights', () => {
    test('should generate family reading insights', async () => {
      const familyInsights = await insightsAgent.generateFamilyInsights({
        familyId: 'family-123',
        members: ['parent-1', 'child-1', 'child-2']
      });

      expect(familyInsights.sharedInterests).toBeDefined();
      expect(familyInsights.readingTogether).toBe(true);
      expect(familyInsights.individualGrowth).toBeDefined();
      expect(familyInsights.familyActivities).toBeDefined();
    });

    test('should identify sibling patterns', async () => {
      const siblingPatterns = await insightsAgent.analyzeSiblingDynamics({
        siblings: ['child-1', 'child-2'],
        timeframe: '30-days'
      });

      expect(siblingPatterns.sharedStories).toBeGreaterThan(0);
      expect(siblingPatterns.competitiveReading).toBe(false);
      expect(siblingPatterns.recommendations).toContain('collaborative-stories');
    });
  });

  describe('Developmental Insights', () => {
    test('should track developmental progress through stories', async () => {
      const development = await insightsAgent.trackDevelopmentalProgress({
        userId: 'child-123',
        age: 7,
        assessmentPeriod: '6-months'
      });

      expect(development.languageGrowth).toBe('above-average');
      expect(development.emotionalMaturity).toBe('on-track');
      expect(development.cognitiveIndicators).toBeDefined();
      expect(development.recommendations).toBeDefined();
    });

    test('should identify learning opportunities', async () => {
      const opportunities = await insightsAgent.identifyLearningOpportunities({
        userId: 'child-123',
        currentLevel: 'grade-2',
        interests: ['science', 'nature']
      });

      expect(opportunities.suggestedTopics).toContain('ecosystems');
      expect(opportunities.skillBuilding).toContain('scientific-thinking');
      expect(opportunities.crossCurricular).toBe(true);
    });
  });

  describe('Insight Reporting', () => {
    test('should generate parent-friendly reports', async () => {
      const report = await insightsAgent.generateParentReport({
        childId: 'child-123',
        reportType: 'monthly',
        includeRecommendations: true
      });

      expect(report.keyHighlights).toBeDefined();
      expect(report.readingSummary).toBeDefined();
      expect(report.emotionalInsights).toBeDefined();
      expect(report.growthAreas).toBeDefined();
      expect(report.celebrateAchievements).toHaveLength(3);
      expect(report.actionableSteps).toBeDefined();
    });

    test('should create educator insights', async () => {
      const educatorReport = await insightsAgent.generateEducatorInsights({
        classroomId: 'class-123',
        students: ['student-1', 'student-2', 'student-3'],
        period: 'semester'
      });

      expect(educatorReport.classProgress).toBeDefined();
      expect(educatorReport.individualAssessments).toBeDefined();
      expect(educatorReport.curriculumAlignment).toBeDefined();
      expect(educatorReport.interventionSuggestions).toBeDefined();
    });
  });

  describe('Predictive Recommendations', () => {
    test('should provide next-best-action recommendations', async () => {
      const nextAction = await insightsAgent.recommendNextAction({
        userId: 'user-123',
        context: 'post-story-completion',
        goals: ['maintain-engagement', 'educational-growth']
      });

      expect(nextAction.recommendation).toBeDefined();
      expect(nextAction.rationale).toBeDefined();
      expect(nextAction.expectedOutcome).toBeDefined();
      expect(nextAction.alternativeOptions).toHaveLength(2);
    });

    test('should suggest intervention timing', async () => {
      const intervention = await insightsAgent.suggestIntervention({
        userId: 'user-123',
        concernType: 'declining-engagement',
        severity: 'moderate'
      });

      expect(intervention.timing).toBe('within-48-hours');
      expect(intervention.approach).toBe('positive-reinforcement');
      expect(intervention.specificActions).toBeDefined();
      expect(intervention.successMetrics).toBeDefined();
    });
  });

  describe('Multi-Agent Intelligence Sharing', () => {
    test('should aggregate insights from all agents', async () => {
      mockEventBridge.send = jest.fn().mockResolvedValue({});

      const aggregated = await insightsAgent.aggregateMultiAgentInsights({
        userId: 'user-123',
        includeAgents: ['emotion', 'content', 'educational']
      });

      expect(aggregated.emotionalJourney).toBeDefined();
      expect(aggregated.contentEffectiveness).toBeDefined();
      expect(aggregated.learningProgress).toBeDefined();
      expect(aggregated.holisticView).toBe(true);
    });

    test('should provide cross-agent recommendations', async () => {
      const crossAgent = await insightsAgent.generateCrossAgentRecommendations({
        userId: 'user-123',
        goal: 'improve-engagement'
      });

      expect(crossAgent.contentAdjustments).toBeDefined();
      expect(crossAgent.emotionalSupport).toBeDefined();
      expect(crossAgent.educationalEnhancements).toBeDefined();
      expect(crossAgent.synergyScore).toBeGreaterThan(0.8);
    });
  });

  describe('Health Check', () => {
    test('should report comprehensive health status', async () => {
      const health = await insightsAgent.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('insights-agent');
      expect(health.capabilities).toContain('pattern-analysis');
      expect(health.capabilities).toContain('behavioral-insights');
      expect(health.capabilities).toContain('predictive-recommendations');
      expect(health.capabilities).toContain('family-analytics');
      expect(health.dataProcessing).toBe('real-time');
      expect(health.insightAccuracy).toBeGreaterThan(0.85);
      expect(health.modelsActive).toBeGreaterThan(15);
    });
  });
});

// Test utilities
export const InsightsTestUtils = {
  createUserBehavior: (overrides = {}) => ({
    userId: 'user-123',
    actions: [],
    timeframe: '30-days',
    ...overrides
  }),
  
  mockInsightGeneration: (agent: InsightsAgent, insight: any) => {
    jest.spyOn(agent, 'generateInsight').mockResolvedValue({
      insight,
      confidence: 0.9,
      actionable: true
    });
  }
};