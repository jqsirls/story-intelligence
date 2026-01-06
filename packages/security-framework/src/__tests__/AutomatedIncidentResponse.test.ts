import { AutomatedIncidentResponse, SecurityIncident } from '../incident/AutomatedIncidentResponse';
import { ThreatDetectionResult } from '../threat/AIThreatDetectionEngine';

describe('AutomatedIncidentResponse', () => {
  let incidentResponse: AutomatedIncidentResponse;

  beforeEach(() => {
    incidentResponse = new AutomatedIncidentResponse();
  });

  afterEach(() => {
    incidentResponse.cleanup();
  });

  describe('createIncident', () => {
    it('should create incident from threat detection', async () => {
      const threatDetection: ThreatDetectionResult = {
        detectionId: 'threat_123',
        timestamp: Date.now(),
        threatType: 'sql_injection',
        severity: 'high',
        confidence: 0.9,
        source: {
          userId: 'user123',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0'
        },
        indicators: [{
          type: 'signature_match',
          value: 'sql_injection_pattern',
          confidence: 0.9
        }],
        context: {
          requestData: { query: 'SELECT * FROM users' }
        },
        riskScore: 0.8,
        recommendedActions: ['block_request', 'investigate'],
        automaticMitigation: true
      };

      let eventEmitted = false;
      incidentResponse.on('incidentCreated', (incident: SecurityIncident) => {
        expect(incident.incidentId).toBeDefined();
        expect(incident.severity).toBe('high');
        expect(incident.status).toBe('open');
        eventEmitted = true;
      });

      const incident = await incidentResponse.createIncident(threatDetection);

      expect(incident).toBeDefined();
      expect(incident.incidentId).toBeDefined();
      expect(incident.title).toContain('sql_injection');
      expect(incident.severity).toBe('high');
      expect(incident.status).toBe('investigating'); // Should be updated by automated response
      expect(incident.source.detectionId).toBe('threat_123');
      expect(incident.timeline.length).toBeGreaterThan(0);
      expect(eventEmitted).toBe(true);
    });

    it('should trigger automated response for critical threats', async () => {
      const criticalThreat: ThreatDetectionResult = {
        detectionId: 'critical_threat_456',
        timestamp: Date.now(),
        threatType: 'system_compromise',
        severity: 'critical',
        confidence: 0.95,
        source: {
          userId: 'user456',
          ipAddress: '10.0.0.1'
        },
        indicators: [{
          type: 'behavioral_anomaly',
          value: 'admin_access_anomaly',
          confidence: 0.95
        }],
        context: {},
        riskScore: 0.95,
        recommendedActions: ['isolate_system', 'notify_security'],
        automaticMitigation: true
      };

      const incident = await incidentResponse.createIncident(criticalThreat);

      expect(incident.severity).toBe('critical');
      expect(incident.automatedActions.length).toBeGreaterThan(0);
      expect(incident.humanActions.length).toBeGreaterThan(0);
    });

    it('should handle incident creation errors', async () => {
      const invalidThreat = null as any;

      let errorEmitted = false;
      incidentResponse.on('incidentCreationError', (event) => {
        expect(event.error).toBeDefined();
        errorEmitted = true;
      });

      await expect(
        incidentResponse.createIncident(invalidThreat)
      ).rejects.toThrow();
      
      expect(errorEmitted).toBe(true);
    });
  });

  describe('updateIncidentStatus', () => {
    it('should update incident status successfully', async () => {
      // First create an incident
      const threatDetection: ThreatDetectionResult = {
        detectionId: 'threat_789',
        timestamp: Date.now(),
        threatType: 'malware',
        severity: 'medium',
        confidence: 0.8,
        source: { ipAddress: '192.168.1.200' },
        indicators: [],
        context: {},
        riskScore: 0.6,
        recommendedActions: [],
        automaticMitigation: false
      };

      const incident = await incidentResponse.createIncident(threatDetection);

      let eventEmitted = false;
      incidentResponse.on('incidentStatusUpdated', (event) => {
        expect(event.incidentId).toBe(incident.incidentId);
        expect(event.oldStatus).toBe('investigating');
        expect(event.newStatus).toBe('resolved');
        eventEmitted = true;
      });

      await incidentResponse.updateIncidentStatus(
        incident.incidentId,
        'resolved',
        'Threat was false positive'
      );

      expect(eventEmitted).toBe(true);
    });

    it('should handle non-existent incident', async () => {
      await expect(
        incidentResponse.updateIncidentStatus('non_existent', 'resolved')
      ).rejects.toThrow('Incident not found');
    });
  });

  describe('addLessonsLearned', () => {
    it('should add lessons learned to incident', async () => {
      // Create an incident first
      const threatDetection: ThreatDetectionResult = {
        detectionId: 'threat_lessons',
        timestamp: Date.now(),
        threatType: 'phishing',
        severity: 'medium',
        confidence: 0.7,
        source: { ipAddress: '192.168.1.300' },
        indicators: [],
        context: {},
        riskScore: 0.5,
        recommendedActions: [],
        automaticMitigation: false
      };

      const incident = await incidentResponse.createIncident(threatDetection);

      const lessons = [
        'Update email filters to catch similar phishing attempts',
        'Provide additional user training on phishing recognition',
        'Implement stricter email validation rules'
      ];

      let eventEmitted = false;
      incidentResponse.on('lessonsLearnedAdded', (event) => {
        expect(event.incidentId).toBe(incident.incidentId);
        expect(event.lessons).toEqual(lessons);
        eventEmitted = true;
      });

      await incidentResponse.addLessonsLearned(incident.incidentId, lessons);

      expect(eventEmitted).toBe(true);
    });

    it('should handle non-existent incident for lessons learned', async () => {
      const lessons = ['Test lesson'];

      await expect(
        incidentResponse.addLessonsLearned('non_existent', lessons)
      ).rejects.toThrow('Incident not found');
    });
  });

  describe('getIncidentStatistics', () => {
    it('should return incident statistics', async () => {
      // Create a few test incidents
      const threats: ThreatDetectionResult[] = [
        {
          detectionId: 'threat_1',
          timestamp: Date.now(),
          threatType: 'sql_injection',
          severity: 'high',
          confidence: 0.9,
          source: { ipAddress: '192.168.1.1' },
          indicators: [],
          context: {},
          riskScore: 0.8,
          recommendedActions: [],
          automaticMitigation: true
        },
        {
          detectionId: 'threat_2',
          timestamp: Date.now(),
          threatType: 'xss',
          severity: 'medium',
          confidence: 0.7,
          source: { ipAddress: '192.168.1.2' },
          indicators: [],
          context: {},
          riskScore: 0.6,
          recommendedActions: [],
          automaticMitigation: false
        }
      ];

      for (const threat of threats) {
        await incidentResponse.createIncident(threat);
      }

      const stats = incidentResponse.getIncidentStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalIncidents).toBe(2);
      expect(typeof stats.incidentsBySeverity).toBe('object');
      expect(typeof stats.incidentsByStatus).toBe('object');
      expect(typeof stats.incidentsByCategory).toBe('object');
      expect(typeof stats.averageResolutionTime).toBe('number');
      expect(typeof stats.automationRate).toBe('number');
      expect(Array.isArray(stats.topIncidentTypes)).toBe(true);

      expect(stats.incidentsBySeverity.high).toBe(1);
      expect(stats.incidentsBySeverity.medium).toBe(1);
    });

    it('should calculate automation rate correctly', async () => {
      // Create incident with both automated and human actions
      const threat: ThreatDetectionResult = {
        detectionId: 'automation_test',
        timestamp: Date.now(),
        threatType: 'brute_force',
        severity: 'critical',
        confidence: 0.95,
        source: { ipAddress: '192.168.1.100' },
        indicators: [],
        context: {},
        riskScore: 0.9,
        recommendedActions: [],
        automaticMitigation: true
      };

      await incidentResponse.createIncident(threat);

      const stats = incidentResponse.getIncidentStatistics();
      
      expect(stats.automationRate).toBeGreaterThanOrEqual(0);
      expect(stats.automationRate).toBeLessThanOrEqual(1);
    });
  });

  describe('automated actions', () => {
    it('should execute automated actions for incidents', async () => {
      const threat: ThreatDetectionResult = {
        detectionId: 'auto_action_test',
        timestamp: Date.now(),
        threatType: 'malware',
        severity: 'critical',
        confidence: 0.9,
        source: {
          userId: 'user123',
          ipAddress: '192.168.1.100'
        },
        indicators: [],
        context: {},
        riskScore: 0.85,
        recommendedActions: ['block_ip', 'quarantine_user'],
        automaticMitigation: true
      };

      let actionCompletedEmitted = false;
      incidentResponse.on('automatedActionCompleted', (event) => {
        expect(event.incidentId).toBeDefined();
        expect(event.actionId).toBeDefined();
        expect(event.action).toBeDefined();
        actionCompletedEmitted = true;
      });

      const incident = await incidentResponse.createIncident(threat);

      // Wait for automated actions to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(incident.automatedActions.length).toBeGreaterThan(0);
      
      // Check if any actions were completed
      const hasCompletedActions = incident.automatedActions.some(
        action => action.status === 'completed' || action.status === 'executing'
      );
      expect(hasCompletedActions).toBe(true);
    });
  });

  describe('playbook execution', () => {
    it('should execute appropriate playbooks based on incident characteristics', async () => {
      const criticalThreat: ThreatDetectionResult = {
        detectionId: 'playbook_test',
        timestamp: Date.now(),
        threatType: 'system_compromise',
        severity: 'critical',
        confidence: 0.98,
        source: {
          userId: 'admin_user',
          ipAddress: '10.0.0.1'
        },
        indicators: [{
          type: 'privilege_escalation',
          value: 'admin_access_gained',
          confidence: 0.95
        }],
        context: {},
        riskScore: 0.95,
        recommendedActions: ['isolate_system', 'collect_forensics'],
        automaticMitigation: true
      };

      let playbookExecuted = false;
      incidentResponse.on('playbookExecuted', (event) => {
        expect(event.incidentId).toBeDefined();
        expect(event.playbookId).toBeDefined();
        expect(event.automatedActions).toBeGreaterThan(0);
        playbookExecuted = true;
      });

      const incident = await incidentResponse.createIncident(criticalThreat);

      // Wait for playbook execution
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(incident.automatedActions.length).toBeGreaterThan(0);
      expect(incident.humanActions.length).toBeGreaterThan(0);
    });
  });
});