import { AnomalyDetectionEngine, AnomalyDetectionConfig, AccessPattern } from '../anomaly/AnomalyDetectionEngine';

describe('AnomalyDetectionEngine', () => {
  let engine: AnomalyDetectionEngine;
  let config: AnomalyDetectionConfig;

  beforeEach(() => {
    config = {
      anomalyThreshold: 0.5,
      profileUpdateThreshold: 0.3,
      maxRecentActivity: 100,
      temporalWindowHours: 24,
      geographicalThresholdKm: 100,
      frequencyThresholdMultiplier: 3.0
    };

    engine = new AnomalyDetectionEngine(config);
  });

  describe('detectAnomalies', () => {
    it('should detect normal access patterns', async () => {
      const pattern: AccessPattern = {
        userId: 'user123',
        timestamp: Date.now(),
        action: 'story_creation',
        resource: 'stories',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        deviceId: 'device123',
        location: {
          country: 'US',
          region: 'CA',
          city: 'San Francisco'
        },
        metadata: {}
      };

      const result = await engine.detectAnomalies(pattern);

      expect(result).toBeDefined();
      expect(typeof result.isAnomalous).toBe('boolean');
      expect(typeof result.anomalyScore.overall).toBe('number');
      expect(typeof result.anomalyScore.temporal).toBe('number');
      expect(typeof result.anomalyScore.behavioral).toBe('number');
      expect(typeof result.anomalyScore.geographical).toBe('number');
      expect(typeof result.anomalyScore.device).toBe('number');
      expect(typeof result.anomalyScore.frequency).toBe('number');
      expect(Array.isArray(result.anomalyTypes)).toBe(true);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.explanation)).toBe(true);
      expect(Array.isArray(result.recommendedActions)).toBe(true);
    });

    it('should detect temporal anomalies', async () => {
      const unusualTimePattern: AccessPattern = {
        userId: 'user123',
        timestamp: new Date('2024-01-01T03:00:00Z').getTime(), // 3 AM
        action: 'story_creation',
        resource: 'stories',
        metadata: {}
      };

      const result = await engine.detectAnomalies(unusualTimePattern);

      expect(result.anomalyScore.temporal).toBeGreaterThan(0.5);
      expect(result.anomalyTypes).toContain('temporal_anomaly');
      expect(result.explanation).toContain('Access occurred at an unusual time');
    });

    it('should detect behavioral anomalies', async () => {
      // First establish normal behavior
      const normalPattern: AccessPattern = {
        userId: 'user123',
        timestamp: Date.now(),
        action: 'story_creation',
        resource: 'stories',
        metadata: {}
      };

      // Repeat normal pattern to establish baseline
      for (let i = 0; i < 10; i++) {
        await engine.detectAnomalies({
          ...normalPattern,
          timestamp: Date.now() + i * 1000
        });
      }

      // Now try unusual behavior
      const unusualPattern: AccessPattern = {
        userId: 'user123',
        timestamp: Date.now(),
        action: 'admin_access', // Unusual action
        resource: 'system_settings', // Unusual resource
        metadata: {}
      };

      const result = await engine.detectAnomalies(unusualPattern);

      expect(result.anomalyScore.behavioral).toBeGreaterThan(0.3);
      expect(result.anomalyTypes).toContain('behavioral_anomaly');
    });

    it('should detect geographical anomalies', async () => {
      // Establish normal location
      const normalPattern: AccessPattern = {
        userId: 'user123',
        timestamp: Date.now(),
        action: 'story_creation',
        resource: 'stories',
        location: {
          country: 'US',
          region: 'CA',
          city: 'San Francisco'
        },
        metadata: {}
      };

      // Repeat to establish baseline
      for (let i = 0; i < 5; i++) {
        await engine.detectAnomalies({
          ...normalPattern,
          timestamp: Date.now() + i * 1000
        });
      }

      // Access from unusual location
      const unusualLocationPattern: AccessPattern = {
        userId: 'user123',
        timestamp: Date.now(),
        action: 'story_creation',
        resource: 'stories',
        location: {
          country: 'RU',
          region: 'Moscow',
          city: 'Moscow'
        },
        metadata: {}
      };

      const result = await engine.detectAnomalies(unusualLocationPattern);

      expect(result.anomalyScore.geographical).toBeGreaterThan(0.5);
      expect(result.anomalyTypes).toContain('geographical_anomaly');
    });

    it('should detect device anomalies', async () => {
      // Establish normal device
      const normalPattern: AccessPattern = {
        userId: 'user123',
        timestamp: Date.now(),
        action: 'story_creation',
        resource: 'stories',
        deviceId: 'trusted-device-123',
        metadata: {}
      };

      // Repeat to establish baseline
      for (let i = 0; i < 5; i++) {
        await engine.detectAnomalies({
          ...normalPattern,
          timestamp: Date.now() + i * 1000
        });
      }

      // Access from new device
      const newDevicePattern: AccessPattern = {
        userId: 'user123',
        timestamp: Date.now(),
        action: 'story_creation',
        resource: 'stories',
        deviceId: 'unknown-device-456',
        metadata: {}
      };

      const result = await engine.detectAnomalies(newDevicePattern);

      expect(result.anomalyScore.device).toBeGreaterThan(0.5);
      expect(result.anomalyTypes).toContain('device_anomaly');
    });

    it('should detect frequency anomalies', async () => {
      const userId = 'user123';
      const baseTime = Date.now();

      // Rapid successive accesses (frequency anomaly)
      const rapidPatterns: AccessPattern[] = [];
      for (let i = 0; i < 20; i++) {
        rapidPatterns.push({
          userId,
          timestamp: baseTime + i * 100, // 100ms apart
          action: 'story_creation',
          resource: 'stories',
          metadata: {}
        });
      }

      // Process all patterns
      let lastResult;
      for (const pattern of rapidPatterns) {
        lastResult = await engine.detectAnomalies(pattern);
      }

      expect(lastResult!.anomalyScore.frequency).toBeGreaterThan(0.5);
      expect(lastResult!.anomalyTypes).toContain('frequency_anomaly');
    });

    it('should emit anomaly detected event', async () => {
      const suspiciousPattern: AccessPattern = {
        userId: 'user123',
        timestamp: new Date('2024-01-01T03:00:00Z').getTime(), // Unusual time
        action: 'admin_access', // Unusual action
        resource: 'system_settings',
        location: {
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown'
        },
        metadata: {}
      };

      let eventEmitted = false;
      engine.on('anomalyDetected', (event) => {
        expect(event.pattern).toBeDefined();
        expect(event.result).toBeDefined();
        expect(event.userProfile).toBeDefined();
        eventEmitted = true;
      });

      await engine.detectAnomalies(suspiciousPattern);
      expect(eventEmitted).toBe(true);
    });

    it('should emit critical anomaly event for high-risk patterns', async () => {
      const criticalPattern: AccessPattern = {
        userId: 'user123',
        timestamp: new Date('2024-01-01T03:00:00Z').getTime(),
        action: 'system_admin',
        resource: 'user_data',
        location: {
          country: 'Unknown'
        },
        deviceId: 'suspicious-device',
        metadata: {}
      };

      let criticalEventEmitted = false;
      engine.on('criticalAnomaly', (event) => {
        expect(event.pattern).toBeDefined();
        expect(event.result.riskLevel).toBe('critical');
        criticalEventEmitted = true;
      });

      await engine.detectAnomalies(criticalPattern);
      expect(criticalEventEmitted).toBe(true);
    });
  });

  describe('trainModel', () => {
    it('should train the model with historical data', async () => {
      const historicalPatterns: AccessPattern[] = [];
      const baseTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago

      // Generate historical patterns for multiple users
      for (let userId = 1; userId <= 3; userId++) {
        for (let day = 0; day < 30; day++) {
          for (let hour = 9; hour < 17; hour++) { // Business hours
            historicalPatterns.push({
              userId: `user${userId}`,
              timestamp: baseTime + (day * 24 * 60 * 60 * 1000) + (hour * 60 * 60 * 1000),
              action: 'story_creation',
              resource: 'stories',
              deviceId: `device${userId}`,
              location: {
                country: 'US',
                region: 'CA',
                city: 'San Francisco'
              },
              metadata: {}
            });
          }
        }
      }

      let eventEmitted = false;
      engine.on('modelTrained', (event) => {
        expect(event.userCount).toBe(3);
        expect(event.patternCount).toBe(historicalPatterns.length);
        eventEmitted = true;
      });

      await engine.trainModel(historicalPatterns);
      expect(eventEmitted).toBe(true);
    });

    it('should handle training errors gracefully', async () => {
      const invalidPatterns = null as any;

      let errorEmitted = false;
      engine.on('trainingError', (event) => {
        expect(event.error).toBeDefined();
        errorEmitted = true;
      });

      await expect(engine.trainModel(invalidPatterns)).rejects.toThrow();
      expect(errorEmitted).toBe(true);
    });
  });

  describe('getMetrics', () => {
    beforeEach(async () => {
      // Create some test data
      const patterns: AccessPattern[] = [
        {
          userId: 'user1',
          timestamp: Date.now(),
          action: 'story_creation',
          resource: 'stories',
          metadata: {}
        },
        {
          userId: 'user2',
          timestamp: Date.now(),
          action: 'character_creation',
          resource: 'characters',
          metadata: {}
        }
      ];

      for (const pattern of patterns) {
        await engine.detectAnomalies(pattern);
      }
    });

    it('should return system metrics', () => {
      const metrics = engine.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalUsers).toBe('number');
      expect(typeof metrics.totalProfiles).toBe('number');
      expect(typeof metrics.averageProfileAge).toBe('number');
      expect(typeof metrics.anomalyDetectionRate).toBe('number');
      expect(Array.isArray(metrics.topAnomalyTypes)).toBe(true);

      expect(metrics.totalUsers).toBeGreaterThan(0);
      expect(metrics.totalProfiles).toBeGreaterThan(0);
    });
  });

  describe('risk level determination', () => {
    it('should assign correct risk levels', async () => {
      const testCases = [
        {
          pattern: {
            userId: 'user123',
            timestamp: Date.now(),
            action: 'story_creation',
            resource: 'stories',
            metadata: {}
          },
          expectedRiskLevel: 'low'
        },
        {
          pattern: {
            userId: 'user123',
            timestamp: new Date('2024-01-01T03:00:00Z').getTime(),
            action: 'unusual_action',
            resource: 'sensitive_resource',
            location: { country: 'Unknown' },
            metadata: {}
          },
          expectedRiskLevel: 'high'
        }
      ];

      for (const testCase of testCases) {
        const result = await engine.detectAnomalies(testCase.pattern as AccessPattern);
        expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
      }
    });
  });

  describe('recommended actions', () => {
    it('should provide appropriate recommended actions', async () => {
      const highRiskPattern: AccessPattern = {
        userId: 'user123',
        timestamp: new Date('2024-01-01T03:00:00Z').getTime(),
        action: 'admin_access',
        resource: 'user_data',
        location: { country: 'Unknown' },
        deviceId: 'suspicious-device',
        metadata: {}
      };

      const result = await engine.detectAnomalies(highRiskPattern);

      expect(result.recommendedActions).toBeDefined();
      expect(Array.isArray(result.recommendedActions)).toBe(true);
      expect(result.recommendedActions.length).toBeGreaterThan(0);

      // Should include security actions for high-risk scenarios
      const hasSecurityActions = result.recommendedActions.some(action => 
        ['require_additional_authentication', 'increase_monitoring', 'verify_device', 'verify_location'].includes(action)
      );
      expect(hasSecurityActions).toBe(true);
    });
  });
});