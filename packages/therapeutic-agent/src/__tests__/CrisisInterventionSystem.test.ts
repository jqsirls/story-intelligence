import { CrisisInterventionSystem } from '../services/CrisisInterventionSystem';
import { CrisisIndicator, TherapeuticSession, EmotionalAssessment } from '../types';

describe('CrisisInterventionSystem', () => {
  let crisisSystem: CrisisInterventionSystem;

  beforeEach(() => {
    crisisSystem = new CrisisInterventionSystem();
  });

  describe('conductCrisisAssessment', () => {
    it('should assess high risk for self-harm indicators', async () => {
      const indicators: CrisisIndicator[] = [
        {
          type: 'safety_concern',
          severity: 'critical',
          description: 'Child expressed desire to hurt myself',
          detectedAt: new Date(),
          context: 'During story session',
          immediateResponse: 'Immediate safety assessment required',
          escalationRequired: true,
          mandatoryReporting: true
        }
      ];

      const mockSession: TherapeuticSession = {
        id: 'session-123',
        userId: 'user-123',
        pathwayId: 'anxiety-cbt',
        sessionNumber: 3,
        startTime: new Date(),
        emotionalState: {
          pre: {
            mood: 'distressed',
            anxiety: 9,
            confidence: 2,
            engagement: 3,
            copingSkillsUsed: [],
            assessmentMethod: 'voice_analysis',
            timestamp: new Date()
          }
        },
        progressMarkers: [],
        parentNotifications: [],
        nextSessionRecommendations: []
      };

      const assessment = await crisisSystem.conductCrisisAssessment(
        indicators,
        mockSession,
        'I want to hurt myself'
      );

      expect(assessment.riskLevel).toBe('high');
      expect(assessment.selfHarmRisk).toBe(true);
      expect(assessment.immediateInterventionRequired).toBe(true);
      expect(assessment.mandatoryReporting).toBe(true);
    });

    it('should assess imminent risk for suicidal ideation', async () => {
      const indicators: CrisisIndicator[] = [
        {
          type: 'safety_concern',
          severity: 'critical',
          description: 'Child expressed suicidal thoughts',
          detectedAt: new Date(),
          context: 'During story session',
          immediateResponse: 'Immediate safety assessment required',
          escalationRequired: true,
          mandatoryReporting: true
        }
      ];

      const mockSession: TherapeuticSession = {
        id: 'session-123',
        userId: 'user-123',
        pathwayId: 'anxiety-cbt',
        sessionNumber: 3,
        startTime: new Date(),
        emotionalState: {
          pre: {
            mood: 'hopeless',
            anxiety: 10,
            confidence: 1,
            engagement: 2,
            copingSkillsUsed: [],
            assessmentMethod: 'voice_analysis',
            timestamp: new Date()
          }
        },
        progressMarkers: [],
        parentNotifications: [],
        nextSessionRecommendations: []
      };

      const assessment = await crisisSystem.conductCrisisAssessment(
        indicators,
        mockSession,
        'I want to kill myself'
      );

      expect(assessment.riskLevel).toBe('imminent');
      expect(assessment.suicidalIdeation).toBe(true);
      expect(assessment.immediateInterventionRequired).toBe(true);
      expect(assessment.mandatoryReporting).toBe(true);
    });

    it('should assess low risk for normal emotional expression', async () => {
      const indicators: CrisisIndicator[] = [];

      const mockSession: TherapeuticSession = {
        id: 'session-123',
        userId: 'user-123',
        pathwayId: 'anxiety-cbt',
        sessionNumber: 3,
        startTime: new Date(),
        emotionalState: {
          pre: {
            mood: 'sad',
            anxiety: 5,
            confidence: 6,
            engagement: 7,
            copingSkillsUsed: ['deep breathing'],
            assessmentMethod: 'voice_analysis',
            timestamp: new Date()
          }
        },
        progressMarkers: [],
        parentNotifications: [],
        nextSessionRecommendations: []
      };

      const assessment = await crisisSystem.conductCrisisAssessment(
        indicators,
        mockSession,
        'I feel sad today'
      );

      expect(assessment.riskLevel).toBe('low');
      expect(assessment.suicidalIdeation).toBe(false);
      expect(assessment.selfHarmRisk).toBe(false);
      expect(assessment.immediateInterventionRequired).toBe(false);
      expect(assessment.mandatoryReporting).toBe(false);
    });
  });

  describe('generateCrisisResponse', () => {
    it('should generate emergency services response for imminent risk', async () => {
      const assessment = {
        riskLevel: 'imminent' as const,
        suicidalIdeation: true,
        selfHarmRisk: true,
        homicidalIdeation: false,
        psychosis: false,
        substanceUse: false,
        protectiveFactors: ['Family support'],
        riskFactors: ['Suicidal ideation', 'Self-harm risk'],
        immediateInterventionRequired: true,
        mandatoryReporting: true,
        assessmentTimestamp: new Date(),
        assessorNotes: 'Critical risk assessment'
      };

      const response = await crisisSystem.generateCrisisResponse(assessment);

      expect(response.responseType).toBe('emergency_services');
      expect(response.priority).toBe('urgent');
      expect(response.timeframe).toBe('immediate');
      expect(response.responsibleParty).toBe('emergency_services');
      expect(response.actions).toHaveLength(4); // Including mandatory reporting
      expect(response.actions[0].type).toBe('emergency_contact');
    });

    it('should generate immediate safety response for high risk', async () => {
      const assessment = {
        riskLevel: 'high' as const,
        suicidalIdeation: false,
        selfHarmRisk: true,
        homicidalIdeation: false,
        psychosis: false,
        substanceUse: false,
        protectiveFactors: ['Family support'],
        riskFactors: ['Self-harm risk'],
        immediateInterventionRequired: true,
        mandatoryReporting: true,
        assessmentTimestamp: new Date(),
        assessorNotes: 'High risk assessment'
      };

      const response = await crisisSystem.generateCrisisResponse(assessment);

      expect(response.responseType).toBe('immediate_safety');
      expect(response.priority).toBe('urgent');
      expect(response.timeframe).toBe('within 1 hour');
      expect(response.responsibleParty).toBe('parent');
      expect(response.actions).toHaveLength(4); // Including mandatory reporting
      expect(response.actions[0].type).toBe('parent_contact');
    });

    it('should generate supportive response for low risk', async () => {
      const assessment = {
        riskLevel: 'low' as const,
        suicidalIdeation: false,
        selfHarmRisk: false,
        homicidalIdeation: false,
        psychosis: false,
        substanceUse: false,
        protectiveFactors: ['Family support', 'Good therapeutic engagement'],
        riskFactors: [],
        immediateInterventionRequired: false,
        mandatoryReporting: false,
        assessmentTimestamp: new Date(),
        assessorNotes: 'Low risk assessment'
      };

      const response = await crisisSystem.generateCrisisResponse(assessment);

      expect(response.responseType).toBe('supportive');
      expect(response.priority).toBe('medium');
      expect(response.timeframe).toBe('within 24 hours');
      expect(response.responsibleParty).toBe('system');
      expect(response.actions).toHaveLength(1);
      expect(response.actions[0].type).toBe('supportive_response');
    });
  });

  describe('createSafetyPlan', () => {
    it('should create comprehensive safety plan for high-risk assessment', async () => {
      const assessment = {
        riskLevel: 'high' as const,
        suicidalIdeation: false,
        selfHarmRisk: true,
        homicidalIdeation: false,
        psychosis: false,
        substanceUse: false,
        protectiveFactors: ['Family support'],
        riskFactors: ['Self-harm risk'],
        immediateInterventionRequired: true,
        mandatoryReporting: true,
        assessmentTimestamp: new Date(),
        assessorNotes: 'High risk assessment'
      };

      const safetyPlan = await crisisSystem.createSafetyPlan('user-123', assessment);

      expect(safetyPlan.userId).toBe('user-123');
      expect(safetyPlan.warningSignsPersonal).toContain('Urges to hurt myself');
      expect(safetyPlan.copingStrategies).toContain('Take slow, deep breaths');
      expect(safetyPlan.socialSupports).toHaveLength(2);
      expect(safetyPlan.professionalContacts).toHaveLength(2);
      expect(safetyPlan.environmentalSafety).toContain('Remove sharp objects from immediate environment');
      expect(safetyPlan.reasonsForLiving).toContain('My family loves me');
      expect(safetyPlan.parentApproved).toBe(false);
    });
  });

  describe('generateCrisisNotification', () => {
    it('should generate urgent notification for imminent risk', () => {
      const assessment = {
        riskLevel: 'imminent' as const,
        suicidalIdeation: true,
        selfHarmRisk: true,
        homicidalIdeation: false,
        psychosis: false,
        substanceUse: false,
        protectiveFactors: [],
        riskFactors: ['Suicidal ideation'],
        immediateInterventionRequired: true,
        mandatoryReporting: true,
        assessmentTimestamp: new Date(),
        assessorNotes: 'Critical risk'
      };

      const response = {
        responseType: 'emergency_services' as const,
        priority: 'urgent' as const,
        actions: [],
        followUpRequired: true,
        timeframe: 'immediate',
        responsibleParty: 'emergency_services' as const
      };

      const notification = crisisSystem.generateCrisisNotification(
        assessment,
        response,
        'user-123'
      );

      expect(notification.type).toBe('crisis_alert');
      expect(notification.priority).toBe('urgent');
      expect(notification.title).toBe('URGENT: Immediate Safety Concern');
      expect(notification.actionRequired).toBe(true);
      expect(notification.resources).toBeDefined();
      expect(notification.resources.length).toBeGreaterThan(0);
    });

    it('should generate appropriate notification for moderate risk', () => {
      const assessment = {
        riskLevel: 'moderate' as const,
        suicidalIdeation: false,
        selfHarmRisk: false,
        homicidalIdeation: false,
        psychosis: false,
        substanceUse: false,
        protectiveFactors: ['Family support'],
        riskFactors: ['Emotional distress'],
        immediateInterventionRequired: false,
        mandatoryReporting: false,
        assessmentTimestamp: new Date(),
        assessorNotes: 'Moderate risk'
      };

      const response = {
        responseType: 'de_escalation' as const,
        priority: 'high' as const,
        actions: [],
        followUpRequired: true,
        timeframe: 'within 4 hours',
        responsibleParty: 'parent' as const
      };

      const notification = crisisSystem.generateCrisisNotification(
        assessment,
        response,
        'user-123'
      );

      expect(notification.type).toBe('crisis_alert');
      expect(notification.priority).toBe('high');
      expect(notification.title).toBe('Important: Concerning Indicators Detected');
      expect(notification.actionRequired).toBe(true);
    });
  });

  describe('fileMandatoryReport', () => {
    it('should file mandatory report for self-harm risk', async () => {
      const report = await crisisSystem.fileMandatoryReport(
        'user-123',
        'self_harm',
        'Child expressed desire to hurt themselves during therapeutic session',
        ['Voice analysis indicating distress', 'Direct verbal expression of self-harm intent']
      );

      expect(report.userId).toBe('user-123');
      expect(report.reportType).toBe('self_harm');
      expect(report.description).toContain('hurt themselves');
      expect(report.evidence).toHaveLength(2);
      expect(report.status).toBe('pending');
      expect(report.followUpRequired).toBe(true);
      expect(report.reportedBy).toBe('Therapeutic AI System');
    });

    it('should file mandatory report for suicidal ideation', async () => {
      const report = await crisisSystem.fileMandatoryReport(
        'user-123',
        'suicidal_ideation',
        'Child expressed suicidal thoughts during session',
        ['Direct verbal expression: "I want to kill myself"']
      );

      expect(report.reportType).toBe('suicidal_ideation');
      expect(report.description).toContain('suicidal thoughts');
      expect(report.mandatoryReporting).toBe(true);
    });
  });
});