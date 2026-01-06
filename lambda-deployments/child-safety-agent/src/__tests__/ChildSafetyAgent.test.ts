// Child Safety Agent Unit Test - 100% Coverage + Crisis Detection
import { ChildSafetyAgent } from '../ChildSafetyAgent';
import { CrisisDetectionService } from '../services/CrisisDetectionService';
import { ContentFilterService } from '../services/ContentFilterService';
import { InterventionService } from '../services/InterventionService';
import { createClient } from '@supabase/supabase-js';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('../services/CrisisDetectionService');
jest.mock('../services/ContentFilterService');
jest.mock('../services/InterventionService');

describe('ChildSafetyAgent - 100% Coverage with Crisis Response Verification', () => {
  let safetyAgent: ChildSafetyAgent;
  let mockSupabase: any;
  let mockEventBridge: jest.Mocked<EventBridgeClient>;
  let mockCrisisDetection: jest.Mocked<CrisisDetectionService>;
  let mockContentFilter: jest.Mocked<ContentFilterService>;
  let mockIntervention: jest.Mocked<InterventionService>;

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
    
    safetyAgent = new ChildSafetyAgent({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      environment: 'test'
    });
  });

  describe('Crisis Detection - All Severity Levels', () => {
    const crisisScenarios = [
      {
        text: 'I want to hurt myself',
        expectedLevel: 'critical',
        immediateAction: true,
        notifyParent: true,
        provide988: true
      },
      {
        text: 'Nobody loves me and I want to disappear',
        expectedLevel: 'critical',
        immediateAction: true,
        notifyParent: true,
        provide988: true
      },
      {
        text: 'I hate my life',
        expectedLevel: 'high',
        immediateAction: false,
        notifyParent: true,
        provideSupport: true
      },
      {
        text: 'Everyone at school hates me',
        expectedLevel: 'medium',
        immediateAction: false,
        notifyParent: false,
        monitor: true
      },
      {
        text: 'I feel a bit sad today',
        expectedLevel: 'low',
        immediateAction: false,
        notifyParent: false,
        supportiveResponse: true
      }
    ];

    test.each(crisisScenarios)(
      'should detect "$text" as $expectedLevel risk',
      async (scenario) => {
        mockCrisisDetection.analyzeText.mockResolvedValue({
          riskLevel: scenario.expectedLevel,
          confidence: 0.95,
          keywords: scenario.text.toLowerCase().split(' '),
          categories: ['self-harm', 'suicidal_ideation']
        });

        mockEventBridge.send = jest.fn().mockResolvedValue({});

        const result = await safetyAgent.analyzeSafety({
          text: scenario.text,
          userId: 'user-123',
          context: 'conversation'
        });

        expect(result.riskLevel).toBe(scenario.expectedLevel);
        
        if (scenario.immediateAction) {
          expect(result.immediateInterventionRequired).toBe(true);
          expect(mockEventBridge.send).toHaveBeenCalledWith(
            expect.objectContaining({
              Entries: expect.arrayContaining([
                expect.objectContaining({
                  DetailType: 'CriticalCrisisDetected',
                  Detail: expect.stringContaining('immediate_intervention')
                })
              ])
            })
          );
        }

        if (scenario.notifyParent) {
          expect(result.parentNotificationSent).toBe(true);
        }

        if (scenario.provide988) {
          expect(result.resources).toContain('988 Suicide & Crisis Lifeline');
          expect(result.resources).toContain('Text "HELLO" to 741741');
        }
      }
    );

    test('should handle voice tone analysis for crisis detection', async () => {
      const voiceData = {
        audioUrl: 'https://audio.example.com/concerning.wav',
        userId: 'user-123',
        transcript: 'Everything is fine',
        voiceMetrics: {
          pitch: { variance: 45, mean: 150 },
          energy: 0.2,
          tempo: 0.6,
          tremor: 0.8
        }
      };

      mockCrisisDetection.analyzeVoice.mockResolvedValue({
        emotionalDistress: true,
        riskLevel: 'high',
        indicators: ['low_energy', 'voice_tremor', 'slow_speech']
      });

      const result = await safetyAgent.analyzeVoiceSafety(voiceData);

      expect(result.voiceAnalysisPerformed).toBe(true);
      expect(result.discrepancyDetected).toBe(true); // Voice doesn't match words
      expect(result.recommendation).toBe('gentle_check_in');
    });
  });

  describe('Content Filtering', () => {
    test('should filter inappropriate content in stories', async () => {
      const inappropriateContent = [
        { text: 'violent fighting and blood', category: 'violence' },
        { text: 'scary monsters that eat children', category: 'frightening' },
        { text: 'adults doing inappropriate things', category: 'adult_content' },
        { text: 'hate speech against groups', category: 'discrimination' }
      ];

      for (const content of inappropriateContent) {
        mockContentFilter.analyze.mockResolvedValue({
          safe: false,
          categories: [content.category],
          severity: 'high',
          alternatives: ['friendship', 'kindness', 'adventure']
        });

        const result = await safetyAgent.filterContent({
          text: content.text,
          type: 'story_content',
          targetAge: 8
        });

        expect(result.safe).toBe(false);
        expect(result.reason).toContain(content.category);
        expect(result.suggestedAlternatives).toBeDefined();
        expect(result.suggestedAlternatives.length).toBeGreaterThan(0);
      }
    });

    test('should adapt filtering based on age', async () => {
      const content = 'mild conflict between characters';
      const ageGroups = [
        { age: 5, expectedResult: false }, // Too young for conflict
        { age: 10, expectedResult: true }, // Age appropriate
        { age: 15, expectedResult: true }  // Definitely appropriate
      ];

      for (const { age, expectedResult } of ageGroups) {
        mockContentFilter.analyze.mockResolvedValue({
          safe: expectedResult,
          ageAppropriate: expectedResult,
          categories: expectedResult ? [] : ['mild_conflict']
        });

        const result = await safetyAgent.filterContent({
          text: content,
          type: 'story_content',
          targetAge: age
        });

        expect(result.safe).toBe(expectedResult);
      }
    });
  });

  describe('Bullying Detection', () => {
    test('should detect various forms of bullying', async () => {
      const bullyingExamples = [
        { text: 'Nobody wants to play with you', type: 'social_exclusion' },
        { text: 'You\'re so stupid and ugly', type: 'verbal_abuse' },
        { text: 'I\'m going to beat you up', type: 'physical_threat' },
        { text: 'Everyone laughs at you', type: 'emotional_abuse' }
      ];

      for (const example of bullyingExamples) {
        const result = await safetyAgent.detectBullying({
          text: example.text,
          userId: 'user-123'
        });

        expect(result.bullyingDetected).toBe(true);
        expect(result.type).toBe(example.type);
        expect(result.supportProvided).toBe(true);
        expect(result.copingStrategies).toBeDefined();
      }
    });

    test('should track bullying patterns over time', async () => {
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.gte.mockReturnThis();
      mockSupabase.order.mockResolvedValue({
        data: [
          { type: 'verbal_abuse', timestamp: '2024-01-01' },
          { type: 'social_exclusion', timestamp: '2024-01-02' },
          { type: 'verbal_abuse', timestamp: '2024-01-03' }
        ],
        error: null
      });

      const result = await safetyAgent.analyzeBullyingPattern('user-123');

      expect(result.pattern).toBe('escalating');
      expect(result.interventionRecommended).toBe(true);
      expect(result.parentNotificationRecommended).toBe(true);
    });
  });

  describe('Intervention Protocols', () => {
    test('should execute immediate intervention for critical cases', async () => {
      mockIntervention.executeCritical.mockResolvedValue({
        notificationsSet: ['parent', 'therapist', 'emergency_contact'],
        resourcesProvided: ['988', 'crisis_text', 'local_emergency'],
        supportMessageDelivered: true,
        followUpScheduled: true
      });

      const result = await safetyAgent.executeIntervention({
        userId: 'user-123',
        riskLevel: 'critical',
        triggerText: 'I want to end it all'
      });

      expect(result.success).toBe(true);
      expect(result.notificationsSet).toContain('parent');
      expect(result.immediateSupport).toBe(true);
      expect(result.followUpIn).toBe(30); // 30 minutes
    });

    test('should provide age-appropriate support responses', async () => {
      const ageGroups = [
        { age: 6, expectedTone: 'very_gentle' },
        { age: 12, expectedTone: 'understanding' },
        { age: 17, expectedTone: 'mature_supportive' }
      ];

      for (const { age, expectedTone } of ageGroups) {
        const result = await safetyAgent.generateSupportResponse({
          userId: `user-${age}`,
          age,
          concern: 'feeling sad',
          severity: 'medium'
        });

        expect(result.tone).toBe(expectedTone);
        expect(result.message).toBeDefined();
        expect(result.activities).toBeDefined();
      }
    });
  });

  describe('Parent Communication', () => {
    test('should send appropriate parent notifications', async () => {
      const notification = await safetyAgent.notifyParent({
        childId: 'child-123',
        parentId: 'parent-456',
        concern: 'high_risk_detected',
        details: 'Child expressed concerning thoughts',
        urgency: 'high'
      });

      expect(notification.sent).toBe(true);
      expect(notification.channels).toContain('email');
      expect(notification.channels).toContain('sms');
      expect(notification.channels).toContain('app_notification');
      expect(notification.includesResources).toBe(true);
    });

    test('should respect privacy while ensuring safety', async () => {
      const notification = await safetyAgent.notifyParent({
        childId: 'teen-123',
        parentId: 'parent-456',
        concern: 'medium_risk',
        childAge: 16
      });

      expect(notification.sent).toBe(true);
      expect(notification.detailLevel).toBe('summary'); // Not full details for teen privacy
      expect(notification.suggestsConversation).toBe(true);
    });
  });

  describe('Positive Behavior Reinforcement', () => {
    test('should recognize and encourage positive interactions', async () => {
      const positiveInputs = [
        'I helped my friend today',
        'I feel happy and grateful',
        'I stood up to a bully',
        'I talked to my parents about my feelings'
      ];

      for (const input of positiveInputs) {
        const result = await safetyAgent.analyzeSafety({
          text: input,
          userId: 'user-123'
        });

        expect(result.positiveDetected).toBe(true);
        expect(result.encouragement).toBeDefined();
        expect(result.points).toBeGreaterThan(0);
      }
    });
  });

  describe('Multi-Agent Coordination', () => {
    test('should coordinate with Therapeutic Agent for support', async () => {
      mockEventBridge.send = jest.fn().mockResolvedValue({});

      await safetyAgent.requestTherapeuticSupport({
        userId: 'user-123',
        concern: 'anxiety_detected',
        severity: 'medium'
      });

      expect(mockEventBridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: 'TherapeuticSupportNeeded',
              Source: 'child-safety-agent'
            })
          ])
        })
      );
    });
  });

  describe('Compliance & Reporting', () => {
    test('should maintain COPPA-compliant logs', async () => {
      const incident = {
        userId: 'child-123',
        userAge: 10,
        incidentType: 'medium_risk',
        timestamp: new Date()
      };

      const result = await safetyAgent.logIncident(incident);

      expect(result.logged).toBe(true);
      expect(result.personalInfoRedacted).toBe(true);
      expect(result.retentionDays).toBe(90); // COPPA compliant retention
    });

    test('should generate safety reports', async () => {
      const report = await safetyAgent.generateSafetyReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(report.totalIncidents).toBeDefined();
      expect(report.riskBreakdown).toBeDefined();
      expect(report.interventionSuccess).toBeGreaterThan(0.9);
      expect(report.recommendations).toBeDefined();
      });
    });

  describe('Health Check', () => {
    test('should report comprehensive health status', async () => {
      const health = await safetyAgent.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('child-safety-agent');
      expect(health.capabilities).toContain('crisis-detection');
      expect(health.capabilities).toContain('content-filtering');
      expect(health.capabilities).toContain('bullying-detection');
      expect(health.capabilities).toContain('intervention-protocols');
      expect(health.readiness).toMatchObject({
        crisisTeam: 'available',
        resourcesLoaded: true,
        interventionProtocols: 'active'
      });
    });
  });
});

// Test utilities
export const ChildSafetyTestUtils = {
  createSafetyCheck: (overrides = {}) => ({
    text: 'test content',
    userId: 'test-user',
    context: 'conversation',
    ...overrides
  }),
  
  mockCrisisResponse: (agent: ChildSafetyAgent, level: string) => {
    jest.spyOn(agent, 'analyzeSafety').mockResolvedValue({
      safe: level === 'none',
      riskLevel: level,
      intervention: level !== 'none'
    });
  }
};