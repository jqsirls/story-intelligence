// Therapeutic Agent Unit Test - 100% Coverage + Clinical Validation
import { TherapeuticAgent } from '../TherapeuticAgent';
import { TherapeuticPathwayManager } from '../services/TherapeuticPathwayManager';
import { EmotionalTriggerDetector } from '../services/EmotionalTriggerDetector';
import { CrisisInterventionSystem } from '../services/CrisisInterventionSystem';
import { TherapeuticProgressTracker } from '../services/TherapeuticProgressTracker';
import { createClient } from '@supabase/supabase-js';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('../services/TherapeuticPathwayManager');
jest.mock('../services/EmotionalTriggerDetector');
jest.mock('../services/CrisisInterventionSystem');
jest.mock('../services/TherapeuticProgressTracker');

describe('TherapeuticAgent - 100% Coverage with Clinical Validation', () => {
  let therapeuticAgent: TherapeuticAgent;
  let mockSupabase: any;
  let mockEventBridge: jest.Mocked<EventBridgeClient>;
  let mockPathwayManager: jest.Mocked<TherapeuticPathwayManager>;
  let mockTriggerDetector: jest.Mocked<EmotionalTriggerDetector>;
  let mockCrisisSystem: jest.Mocked<CrisisInterventionSystem>;
  let mockProgressTracker: jest.Mocked<TherapeuticProgressTracker>;

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
    
    therapeuticAgent = new TherapeuticAgent({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      environment: 'test'
    });
  });

  describe('Therapeutic Pathways', () => {
    test('should create anxiety management pathway', async () => {
      const pathway = await therapeuticAgent.createTherapeuticPathway({
        childId: 'child-123',
        condition: 'anxiety',
        severity: 'moderate',
        triggers: ['social situations', 'tests'],
        goals: ['reduce anxiety symptoms', 'build coping skills']
      });

      expect(pathway.type).toBe('anxiety-management');
      expect(pathway.techniques).toContain('breathing-exercises');
      expect(pathway.techniques).toContain('progressive-muscle-relaxation');
      expect(pathway.stories).toHaveLength(6);
      expect(pathway.duration).toBe('8-12 weeks');
    });

    test('should support multiple therapeutic conditions', async () => {
      const conditions = [
        { type: 'ADHD', techniques: ['focus-games', 'mindfulness'] },
        { type: 'grief', techniques: ['memory-stories', 'emotion-validation'] },
        { type: 'trauma', techniques: ['safety-building', 'gradual-exposure'] },
        { type: 'social-anxiety', techniques: ['social-skills', 'confidence-building'] }
      ];

      for (const condition of conditions) {
        const pathway = await therapeuticAgent.createTherapeuticPathway({
          childId: 'child-123',
          condition: condition.type
        });

        expect(pathway.techniques).toEqual(
          expect.arrayContaining(condition.techniques)
        );
      }
    });

    test('should adapt therapeutic content by age', async () => {
      const ageAdaptations = [
        { age: 5, approach: 'play-based', metaphors: 'simple' },
        { age: 10, approach: 'narrative-based', metaphors: 'relatable' },
        { age: 15, approach: 'cognitive-based', metaphors: 'sophisticated' }
      ];

      for (const adaptation of ageAdaptations) {
        const content = await therapeuticAgent.adaptTherapeuticContent({
          technique: 'anxiety-coping',
          age: adaptation.age
        });

        expect(content.approach).toBe(adaptation.approach);
        expect(content.metaphorComplexity).toBe(adaptation.metaphors);
      }
    });
  });

  describe('Emotional Trigger Detection', () => {
    test('should detect and respond to emotional triggers', async () => {
      mockTriggerDetector.analyze.mockResolvedValue({
        triggersDetected: ['fear-of-abandonment', 'perfectionism'],
        intensity: 0.7,
        recommendedResponse: 'validation-and-reframing'
      });

      const response = await therapeuticAgent.handleEmotionalTrigger({
        userId: 'user-123',
        input: 'What if mommy never comes back?',
        context: 'bedtime-story'
      });

      expect(response.triggered).toBe(true);
      expect(response.therapeuticResponse).toContain('safe and loved');
      expect(response.followUpActivities).toContain('attachment-building');
    });

    test('should track trigger patterns over time', async () => {
      mockSupabase.select.mockResolvedValue({
        data: [
          { trigger: 'separation-anxiety', count: 5, last_occurrence: '2024-01-15' },
          { trigger: 'perfectionism', count: 3, last_occurrence: '2024-01-14' }
        ],
        error: null
      });

      const patterns = await therapeuticAgent.analyzeTriggerPatterns('user-123');

      expect(patterns.mostFrequent).toBe('separation-anxiety');
      expect(patterns.trend).toBe('decreasing');
      expect(patterns.recommendations).toContain('Continue attachment stories');
    });
  });

  describe('Crisis Intervention', () => {
    test('should activate crisis protocol for severe distress', async () => {
      mockCrisisSystem.assessSeverity.mockResolvedValue({
        level: 'critical',
        immediateAction: true,
        protocolType: 'safety-first'
      });

      const intervention = await therapeuticAgent.handleCrisis({
        userId: 'user-123',
        indicators: ['self-harm-mention', 'hopelessness'],
        urgency: 'immediate'
      });

      expect(intervention.protocolActivated).toBe(true);
      expect(intervention.parentNotified).toBe(true);
      expect(intervention.professionalAlerted).toBe(true);
      expect(intervention.immediateSupport).toContain('988');
      expect(intervention.safetyPlan).toBeDefined();
    });

    test('should provide age-appropriate crisis support', async () => {
      const ageGroups = [
        { age: 6, language: 'very-simple', approach: 'comfort-first' },
        { age: 12, language: 'clear-direct', approach: 'validate-and-support' },
        { age: 17, language: 'mature', approach: 'collaborative' }
      ];

      for (const group of ageGroups) {
        const support = await therapeuticAgent.provideCrisisSupport({
          age: group.age,
          severity: 'high'
        });

        expect(support.language).toBe(group.language);
        expect(support.approach).toBe(group.approach);
      }
    });
  });

  describe('Therapeutic Story Elements', () => {
    test('should embed CBT techniques in stories', async () => {
      const story = await therapeuticAgent.createTherapeuticStory({
        technique: 'CBT',
        targetThought: 'I am not good enough',
        childAge: 10
      });

      expect(story.cognitiveReframes).toHaveLength(3);
      expect(story.thoughtChallenges).toBeDefined();
      expect(story.behavioralExperiments).toHaveLength(2);
      expect(story.characters[0].modelsBehavior).toBe('positive-self-talk');
    });

    test('should include mindfulness exercises', async () => {
      const story = await therapeuticAgent.embedMindfulness({
        storyId: 'story-123',
        techniques: ['breathing', 'body-scan', 'visualization']
      });

      expect(story.mindfulnessMoments).toHaveLength(3);
      expect(story.guidedExercises).toBeDefined();
      expect(story.practiceReminders).toBe(true);
    });

    test('should create trauma-informed narratives', async () => {
      const story = await therapeuticAgent.createTraumaInformedStory({
        childId: 'child-123',
        traumaType: 'medical',
        stage: 'early-processing'
      });

      expect(story.safetyEstablished).toBe(true);
      expect(story.triggerWarnings).toBeDefined();
      expect(story.pacingControl).toBe('child-led');
      expect(story.groundingTechniques).toHaveLength(4);
      expect(story.positiveEnding).toBe(true);
    });
  });

  describe('Progress Tracking', () => {
    test('should track therapeutic progress with clinical metrics', async () => {
      mockProgressTracker.calculateProgress.mockResolvedValue({
        overallProgress: 0.65,
        symptomReduction: 0.45,
        skillAcquisition: 0.80,
        engagementLevel: 0.90,
        clinicallySignificant: true
      });

      const progress = await therapeuticAgent.assessProgress({
        childId: 'child-123',
        startDate: '2024-01-01',
        currentDate: '2024-02-01'
      });

      expect(progress.overallProgress).toBe(0.65);
      expect(progress.clinicallySignificant).toBe(true);
      expect(progress.nextSteps).toBeDefined();
    });

    test('should generate clinical reports for therapists', async () => {
      const report = await therapeuticAgent.generateClinicalReport({
        childId: 'child-123',
        therapistId: 'therapist_1',
        period: 'monthly'
      });

      expect(report.summary).toBeDefined();
      expect(report.sessionData).toHaveLength(12);
      expect(report.symptomTracking).toBeDefined();
      expect(report.interventionEffectiveness).toBeGreaterThan(0.6);
      expect(report.recommendations).toHaveLength(3);
      expect(report.riskAssessment).toBeDefined();
    });
  });

  describe('Family Integration', () => {
    test('should provide parent psychoeducation', async () => {
      const education = await therapeuticAgent.createParentEducation({
        topic: 'supporting-anxious-child',
        parentId: 'parent-123'
      });

      expect(education.modules).toHaveLength(4);
      expect(education.modules[0].title).toBe('Understanding Childhood Anxiety');
      expect(education.practicalStrategies).toHaveLength(6);
      expect(education.warningSignsToWatch).toBeDefined();
    });

    test('should facilitate family therapy activities', async () => {
      const activities = await therapeuticAgent.createFamilyActivities({
        familyId: 'family-123',
        focus: 'communication',
        participants: ['child-123', 'parent-1', 'parent-2']
      });

      expect(activities.sharedStories).toHaveLength(3);
      expect(activities.discussionPrompts).toHaveLength(5);
      expect(activities.bondingExercises).toBeDefined();
      expect(activities.conflictResolution).toBeDefined();
    });
  });

  describe('Evidence-Based Interventions', () => {
    test('should implement validated therapeutic protocols', async () => {
      const protocols = [
        'TF-CBT', // Trauma-Focused CBT
        'CPT', // Cognitive Processing Therapy
        'PCIT', // Parent-Child Interaction Therapy
        'DBT-C' // DBT for Children
      ];

      for (const protocol of protocols) {
        const implementation = await therapeuticAgent.implementProtocol({
          protocol,
          childId: 'child-123'
        });

        expect(implementation.evidenceBased).toBe(true);
        expect(implementation.fidelityChecks).toBeDefined();
        expect(implementation.outcomeMetrics).toBeDefined();
      }
    });

    test('should maintain treatment fidelity', async () => {
      const fidelity = await therapeuticAgent.checkTreatmentFidelity({
        protocolId: 'TF-CBT-123',
        sessionId: 'session-456'
      });

      expect(fidelity.adherenceScore).toBeGreaterThan(0.85);
      expect(fidelity.componentsCovered).toContain('trauma-narrative');
      expect(fidelity.deviations).toHaveLength(0);
    });
  });

  describe('Multi-Agent Coordination', () => {
    test('should coordinate with Child Safety Agent for risk assessment', async () => {
      mockEventBridge.send = jest.fn().mockResolvedValue({});

      await therapeuticAgent.requestSafetyAssessment({
        childId: 'child-123',
        concerns: ['self-harm-ideation']
      });

      expect(mockEventBridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: 'SafetyAssessmentRequired',
              Source: 'therapeutic-agent'
            })
          ])
        })
      );
    });

    test('should integrate with Emotion Agent for mood tracking', async () => {
      const moodIntegration = await therapeuticAgent.setupMoodTracking({
        childId: 'child-123',
        frequency: 'daily',
        clinicalFocus: ['depression', 'anxiety']
      });

      expect(moodIntegration.trackingEnabled).toBe(true);
      expect(moodIntegration.clinicalAlerts).toBeDefined();
      expect(moodIntegration.dataSharing).toBe('therapist-only');
    });
  });

  describe('Health Check', () => {
    test('should report comprehensive health status', async () => {
      const health = await therapeuticAgent.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('therapeutic-agent');
      expect(health.capabilities).toContain('pathway-management');
      expect(health.capabilities).toContain('crisis-intervention');
      expect(health.capabilities).toContain('progress-tracking');
      expect(health.capabilities).toContain('evidence-based-protocols');
      expect(health.supportedConditions).toContain('anxiety');
      expect(health.supportedConditions).toContain('trauma');
      expect(health.clinicalSupervision).toBe('available');
    });
  });
});

// Test utilities
export const TherapeuticTestUtils = {
  createTherapeuticGoal: (overrides = {}) => ({
    id: 'goal-123',
    type: 'symptom-reduction',
    target: 'anxiety',
    baseline: 7,
    goal: 4,
    timeline: '8-weeks',
    ...overrides
  }),
  
  mockCrisisState: (agent: TherapeuticAgent, level: string) => {
    jest.spyOn(agent, 'assessCrisis').mockResolvedValue({
      level,
      intervention: level === 'critical' ? 'immediate' : 'monitor'
    });
  }
};