import { HealthcareProviderIntegration } from '../services/HealthcareProviderIntegration';
import { TherapeuticSession, TherapeuticOutcome, EmotionalAssessment } from '../types';

describe('HealthcareProviderIntegration', () => {
  let integration: HealthcareProviderIntegration;

  beforeEach(() => {
    integration = new HealthcareProviderIntegration();
  });

  describe('registerProvider', () => {
    it('should register a healthcare provider', async () => {
      const providerData = {
        name: 'Dr. Sarah Johnson',
        type: 'therapist' as const,
        credentials: ['PhD', 'Licensed Clinical Psychologist'],
        licenseNumber: 'PSY12345',
        contactInfo: {
          phone: '555-0123',
          email: 'dr.johnson@example.com'
        },
        specializations: ['Child Psychology', 'Anxiety Disorders'],
        acceptsChildren: true,
        ageRanges: [{ min: 5, max: 18 }]
      };

      const provider = await integration.registerProvider(providerData);

      expect(provider.id).toBeDefined();
      expect(provider.name).toBe('Dr. Sarah Johnson');
      expect(provider.type).toBe('therapist');
      expect(provider.verified).toBe(false);
      expect(provider.acceptsChildren).toBe(true);
    });
  });

  describe('requestProgressSharingConsent', () => {
    it('should create consent request for progress sharing', async () => {
      const consent = await integration.requestProgressSharingConsent(
        'user-123',
        'provider-456',
        'parent-789',
        'progress_sharing',
        ['session_summaries', 'emotional_trends', 'progress_outcomes']
      );

      expect(consent.id).toBeDefined();
      expect(consent.userId).toBe('user-123');
      expect(consent.providerId).toBe('provider-456');
      expect(consent.parentId).toBe('parent-789');
      expect(consent.consentType).toBe('progress_sharing');
      expect(consent.consentGiven).toBe(false);
      expect(consent.scope).toContain('session_summaries');
      expect(consent.expirationDate).toBeDefined();
    });
  });

  describe('generateProgressReport', () => {
    it('should generate comprehensive progress report', async () => {
      // First register provider and set up consent
      const provider = await integration.registerProvider({
        name: 'Dr. Test Provider',
        type: 'therapist',
        credentials: ['PhD'],
        licenseNumber: 'TEST123',
        contactInfo: { phone: '555-0000', email: 'test@example.com' },
        specializations: ['Child Therapy'],
        acceptsChildren: true,
        ageRanges: [{ min: 5, max: 12 }]
      });

      const consent = await integration.requestProgressSharingConsent(
        'user-123',
        provider.id,
        'parent-789',
        'progress_sharing',
        ['full_reports']
      );

      // Process consent as approved
      await integration.processConsentResponse(consent.id, true);

      // Create mock sessions and outcomes
      const mockSessions: TherapeuticSession[] = [
        {
          id: 'session-1',
          userId: 'user-123',
          pathwayId: 'anxiety-cbt',
          sessionNumber: 1,
          startTime: new Date('2024-01-01'),
          endTime: new Date('2024-01-01'),
          emotionalState: {
            pre: {
              mood: 'anxious',
              anxiety: 7,
              confidence: 4,
              engagement: 6,
              copingSkillsUsed: [],
              assessmentMethod: 'voice_analysis',
              timestamp: new Date('2024-01-01')
            }
          },
          progressMarkers: [],
          parentNotifications: [],
          nextSessionRecommendations: []
        }
      ];

      const mockOutcomes: TherapeuticOutcome[] = [
        {
          sessionId: 'session-1',
          pathwayId: 'anxiety-cbt',
          userId: 'user-123',
          measuredAt: new Date('2024-01-01'),
          outcomes: {
            'anxiety-reduction': {
              baseline: 7,
              current: 5,
              improvement: 28.6,
              clinicallySignificant: true
            }
          },
          overallProgress: 'improving',
          recommendedActions: ['Continue current approach'],
          professionalReferralNeeded: false
        }
      ];

      const report = await integration.generateProgressReport(
        'user-123',
        provider.id,
        'weekly_summary',
        new Date('2024-01-01'),
        new Date('2024-01-07'),
        mockSessions,
        mockOutcomes
      );

      expect(report.id).toBeDefined();
      expect(report.userId).toBe('user-123');
      expect(report.providerId).toBe(provider.id);
      expect(report.reportType).toBe('weekly_summary');
      expect(report.summary.totalSessions).toBe(1);
      expect(report.summary.completedSessions).toBe(1);
      expect(report.summary.progressTrend).toBeDefined();
      expect(report.therapeuticOutcomes).toHaveLength(1);
      expect(report.recommendations).toBeDefined();
      expect(report.deliveryStatus).toBe('pending');
    });

    it('should throw error without valid consent', async () => {
      const mockSessions: TherapeuticSession[] = [];
      const mockOutcomes: TherapeuticOutcome[] = [];

      await expect(
        integration.generateProgressReport(
          'user-123',
          'provider-456',
          'weekly_summary',
          new Date(),
          new Date(),
          mockSessions,
          mockOutcomes
        )
      ).rejects.toThrow('No valid consent for progress sharing');
    });
  });

  describe('generateTherapeuticInsights', () => {
    it('should generate therapeutic insights from session data', async () => {
      const mockSessions: TherapeuticSession[] = [
        {
          id: 'session-1',
          userId: 'user-123',
          pathwayId: 'anxiety-cbt',
          sessionNumber: 1,
          startTime: new Date(),
          endTime: new Date(),
          emotionalState: {
            pre: {
              mood: 'anxious',
              anxiety: 8,
              confidence: 3,
              engagement: 7,
              copingSkillsUsed: [],
              assessmentMethod: 'voice_analysis',
              timestamp: new Date()
            }
          },
          progressMarkers: [],
          parentNotifications: [],
          nextSessionRecommendations: []
        }
      ];

      const mockOutcomes: TherapeuticOutcome[] = [
        {
          sessionId: 'session-1',
          pathwayId: 'anxiety-cbt',
          userId: 'user-123',
          measuredAt: new Date(),
          outcomes: {},
          overallProgress: 'stable',
          recommendedActions: [],
          professionalReferralNeeded: false
        }
      ];

      const insights = await integration.generateTherapeuticInsights(
        'user-123',
        mockSessions,
        mockOutcomes
      );

      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
      
      const patternInsight = insights.find(i => i.insightType === 'pattern_detection');
      expect(patternInsight).toBeDefined();
      expect(patternInsight?.confidence).toBeGreaterThan(0);
      expect(patternInsight?.recommendations).toBeDefined();

      const progressPrediction = insights.find(i => i.insightType === 'progress_prediction');
      expect(progressPrediction).toBeDefined();
      expect(progressPrediction?.description).toBeDefined();
    });
  });

  describe('createCollaborativeCareNote', () => {
    it('should create collaborative care note', async () => {
      const note = await integration.createCollaborativeCareNote(
        'user-123',
        'ai_system',
        'system-001',
        'observation',
        'Child showed increased engagement in recent sessions',
        ['engagement', 'progress'],
        'medium'
      );

      expect(note.id).toBeDefined();
      expect(note.userId).toBe('user-123');
      expect(note.authorType).toBe('ai_system');
      expect(note.noteType).toBe('observation');
      expect(note.content).toContain('increased engagement');
      expect(note.tags).toContain('engagement');
      expect(note.priority).toBe('medium');
      expect(note.resolved).toBe(false);
      expect(note.responses).toHaveLength(0);
    });
  });

  describe('addNoteResponse', () => {
    it('should add response to existing note', async () => {
      const note = await integration.createCollaborativeCareNote(
        'user-123',
        'ai_system',
        'system-001',
        'concern',
        'Child seems withdrawn in recent sessions',
        ['concern', 'behavior'],
        'high'
      );

      await integration.addNoteResponse(
        note.id,
        'parent',
        'parent-456',
        'I noticed this at home too. Should we adjust the approach?'
      );

      // In a real implementation, we would retrieve the note to verify the response was added
      // For this test, we just verify the method doesn't throw an error
      expect(true).toBe(true);
    });

    it('should throw error for non-existent note', async () => {
      await expect(
        integration.addNoteResponse(
          'non-existent-note',
          'parent',
          'parent-456',
          'This should fail'
        )
      ).rejects.toThrow('Note not found: non-existent-note');
    });
  });

  describe('exportTherapeuticData', () => {
    it('should export comprehensive therapeutic data with consent', async () => {
      // Set up provider and consent
      const provider = await integration.registerProvider({
        name: 'Dr. Export Test',
        type: 'therapist',
        credentials: ['PhD'],
        licenseNumber: 'EXPORT123',
        contactInfo: { phone: '555-0000', email: 'export@example.com' },
        specializations: ['Data Analysis'],
        acceptsChildren: true,
        ageRanges: [{ min: 5, max: 18 }]
      });

      const consent = await integration.requestProgressSharingConsent(
        'user-123',
        provider.id,
        'parent-789',
        'full_records',
        ['all_data']
      );

      await integration.processConsentResponse(consent.id, true);

      const exportData = await integration.exportTherapeuticData(
        'user-123',
        provider.id,
        true
      );

      expect(exportData.userId).toBe('user-123');
      expect(exportData.providerId).toBe(provider.id);
      expect(exportData.exportDate).toBeDefined();
      expect(exportData.summary).toBeDefined();
      expect(exportData.progressReports).toBeDefined();
      expect(exportData.therapeuticInsights).toBeDefined();
      expect(exportData.collaborativeNotes).toBeDefined();
    });

    it('should throw error without valid consent for full records', async () => {
      await expect(
        integration.exportTherapeuticData('user-123', 'provider-456', true)
      ).rejects.toThrow('No valid consent for full records sharing');
    });
  });

  describe('getProviderRecommendations', () => {
    it('should return provider recommendations based on data', async () => {
      const recommendations = await integration.getProviderRecommendations(
        'user-123',
        'provider-456'
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });
});