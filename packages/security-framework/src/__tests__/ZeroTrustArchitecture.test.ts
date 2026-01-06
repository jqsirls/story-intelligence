import { ZeroTrustArchitecture } from '../ZeroTrustArchitecture';
import { PIIType } from '../types';

// Mock external dependencies
jest.mock('web3');
jest.mock('ethers');
jest.mock('ioredis');

describe('ZeroTrustArchitecture', () => {
  let zeroTrust: ZeroTrustArchitecture;

  beforeEach(() => {
    const config = {
      encryption: {
        algorithm: 'AES-256-GCM' as const,
        keyRotationInterval: 3600000, // 1 hour
        keyDerivationRounds: 100000
      },
      differentialPrivacy: {
        epsilon: 1.0,
        delta: 1e-5,
        sensitivity: 1.0,
        mechanism: 'laplace' as const
      },
      blockchain: {
        providerUrl: 'http://localhost:8545',
        privateKey: '0x' + '0'.repeat(64),
        contractAddress: '0x' + '1'.repeat(40)
      },
      redis: {
        url: 'redis://localhost:6379'
      },
      piiDetection: {
        hashSalt: 'test-salt'
      },
      biometric: {
        confidenceThreshold: 0.8,
        maxProfiles: 1000,
        updateThreshold: 0.7,
        anomalyThreshold: 0.3
      },
      deviceFingerprinting: {
        trustThreshold: 0.3,
        suspiciousThreshold: 0.6,
        maxDevicesPerUser: 5,
        anomalyThreshold: 0.4,
        newDeviceVerificationRequired: true
      },
      anomalyDetection: {
        anomalyThreshold: 0.5,
        profileUpdateThreshold: 0.3,
        maxRecentActivity: 100,
        temporalWindowHours: 24,
        geographicalThresholdKm: 100,
        frequencyThresholdMultiplier: 3.0
      },
      homomorphicEncryption: {
        keySize: 2048,
        securityLevel: 128
      }
    };

    zeroTrust = new ZeroTrustArchitecture(config);
  });

  afterEach(async () => {
    await zeroTrust.cleanup();
  });

  describe('processVoiceData', () => {
    it('should encrypt voice data and record compliance event', async () => {
      const audioBuffer = Buffer.from('test audio data');
      const userId = 'user123';
      const agentId = 'voice-agent';

      const result = await zeroTrust.processVoiceData(audioBuffer, userId, agentId);

      expect(result.encryptedData).toBeDefined();
      expect(result.encryptedData.encryptedData).toBeTruthy();
      expect(result.encryptedData.iv).toBeTruthy();
      expect(result.encryptedData.authTag).toBeTruthy();
      expect(result.encryptedData.keyId).toBeTruthy();
      expect(result.complianceStatus).toBe('compliant');
      expect(result.riskScore).toBe(0.1);
    });

    it('should handle encryption errors gracefully', async () => {
      const invalidBuffer = null as any;
      const userId = 'user123';
      const agentId = 'voice-agent';

      await expect(
        zeroTrust.processVoiceData(invalidBuffer, userId, agentId)
      ).rejects.toThrow('Voice data processing failed');
    });
  });

  describe('processTextData', () => {
    it('should detect PII and redact it', async () => {
      const textWithPII = 'My email is john.doe@example.com and my phone is 555-123-4567';
      const userId = 'user123';
      const agentId = 'text-agent';

      const result = await zeroTrust.processTextData(textWithPII, userId, agentId);

      expect(result.piiResult.hasPII).toBe(true);
      expect(result.piiResult.detectedTypes).toContain(PIIType.EMAIL);
      expect(result.piiResult.detectedTypes).toContain(PIIType.PHONE);
      expect(result.piiResult.redactedText).toContain('[EMAIL_REDACTED]');
      expect(result.piiResult.redactedText).toContain('[PHONE_REDACTED]');
      expect(result.complianceStatus).toBe('warning');
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should handle text without PII', async () => {
      const cleanText = 'This is a clean text without any personal information';
      const userId = 'user123';
      const agentId = 'text-agent';

      const result = await zeroTrust.processTextData(cleanText, userId, agentId);

      expect(result.piiResult.hasPII).toBe(false);
      expect(result.piiResult.detectedTypes).toHaveLength(0);
      expect(result.piiResult.redactedText).toBe(cleanText);
      expect(result.complianceStatus).toBe('compliant');
      expect(result.riskScore).toBe(0.1);
    });

    it('should apply differential privacy when required', async () => {
      const text = 'Some text that needs privacy protection';
      const userId = 'user123';
      const agentId = 'text-agent';
      const metadata = { requiresPrivacy: true };

      const result = await zeroTrust.processTextData(text, userId, agentId, metadata);

      expect(result.privatizedText).toContain('privatized');
    });
  });

  describe('recordConsent', () => {
    it('should record consent on blockchain', async () => {
      const userId = 'user123';
      const purposes = ['story_creation', 'voice_processing'];
      const consentData = { timestamp: Date.now(), method: 'voice' };
      const agentId = 'consent-agent';

      // Mock the blockchain consent manager
      const mockConsentRecord = {
        consentId: 'consent123',
        userId,
        purposes,
        timestamp: Date.now(),
        signature: 'mock-signature',
        transactionHash: 'mock-tx-hash',
        blockNumber: 12345,
        isRevoked: false
      };

      // This would normally interact with the blockchain
      // For testing, we'll verify the method is called correctly
      const result = await zeroTrust.recordConsent(userId, purposes, consentData, agentId);

      expect(result).toBeDefined();
      // In a real test, we'd verify the blockchain interaction
    });
  });

  describe('validateConsent', () => {
    it('should validate user consent for purposes', async () => {
      const userId = 'user123';
      const purposes = ['story_creation', 'voice_processing'];
      const agentId = 'validation-agent';

      const result = await zeroTrust.validateConsent(userId, purposes, agentId);

      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.validPurposes).toBeDefined();
      expect(result.invalidPurposes).toBeDefined();
      expect(result.consentRecords).toBeDefined();
    });
  });

  describe('privatizeAnalytics', () => {
    it('should apply differential privacy to analytics data', async () => {
      const analyticsData = {
        sessionCount: 100,
        storyCount: 50,
        averageSessionTime: 300
      };
      const userId = 'user123';
      const agentId = 'analytics-agent';

      const result = await zeroTrust.privatizeAnalytics(analyticsData, userId, agentId);

      expect(result).toBeDefined();
      expect(typeof result.sessionCount).toBe('number');
      expect(typeof result.storyCount).toBe('number');
      expect(typeof result.averageSessionTime).toBe('number');

      // Values should be different due to noise addition
      expect(result.sessionCount).not.toBe(analyticsData.sessionCount);
      expect(result.storyCount).not.toBe(analyticsData.storyCount);
      expect(result.averageSessionTime).not.toBe(analyticsData.averageSessionTime);
    });
  });

  describe('validateUserIdentity', () => {
    it('should validate user identity using voice print and anomaly detection', async () => {
      const audioBuffer = Buffer.from('test voice data');
      const userId = 'user123';
      const agentId = 'identity-agent';
      const metadata = { deviceId: 'device123', location: { country: 'US' } };

      const result = await zeroTrust.validateUserIdentity(audioBuffer, userId, agentId, metadata);

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.riskScore).toBe('number');
      expect(Array.isArray(result.anomalies)).toBe(true);
      expect(typeof result.requiresAdditionalAuth).toBe('boolean');
    });

    it('should require additional auth for high risk scenarios', async () => {
      const audioBuffer = Buffer.from('suspicious voice data');
      const userId = 'user123';
      const agentId = 'identity-agent';
      const metadata = { 
        deviceId: 'unknown-device', 
        location: { country: 'Unknown' },
        suspiciousActivity: true 
      };

      const result = await zeroTrust.validateUserIdentity(audioBuffer, userId, agentId, metadata);

      expect(result.requiresAdditionalAuth).toBe(true);
      expect(result.riskScore).toBeGreaterThan(0.5);
    });
  });

  describe('validateDevice', () => {
    it('should validate device fingerprint', async () => {
      const deviceAttributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        language: 'en-US'
      };
      const userId = 'user123';
      const agentId = 'device-agent';

      const result = await zeroTrust.validateDevice(deviceAttributes, userId, agentId);

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.deviceId).toBe('string');
      expect(['trusted', 'suspicious', 'blocked']).toContain(result.trustLevel);
      expect(typeof result.riskScore).toBe('number');
      expect(typeof result.isNewDevice).toBe('boolean');
      expect(typeof result.requiresVerification).toBe('boolean');
    });

    it('should detect suspicious device changes', async () => {
      const deviceAttributes = {
        userAgent: 'Suspicious Bot Agent',
        screenResolution: '1x1',
        timezone: 'Unknown/Unknown',
        language: 'xx-XX'
      };
      const userId = 'user123';
      const agentId = 'device-agent';

      const result = await zeroTrust.validateDevice(deviceAttributes, userId, agentId);

      expect(result.trustLevel).toBe('suspicious');
      expect(result.riskScore).toBeGreaterThan(0.5);
    });
  });

  describe('performSecureComputation', () => {
    it('should perform secure multi-party computation', async () => {
      const functionName = 'sum';
      const localData = [1, 2, 3, 4, 5];
      const partyIds = ['party1', 'party2', 'party3'];
      const userId = 'user123';
      const agentId = 'smpc-agent';

      // First record consent for data sharing
      await zeroTrust.recordConsent(
        userId, 
        ['data_sharing', 'analytics'], 
        { method: 'explicit' }, 
        agentId
      );

      const result = await zeroTrust.performSecureComputation(
        functionName, 
        localData, 
        partyIds, 
        userId, 
        agentId
      );

      expect(result).toBeDefined();
      expect(typeof result.computationId).toBe('string');
      expect(['pending', 'computing', 'completed', 'failed']).toContain(result.status);
    });

    it('should reject computation without proper consent', async () => {
      const functionName = 'sum';
      const localData = [1, 2, 3];
      const partyIds = ['party1', 'party2'];
      const userId = 'user-no-consent';
      const agentId = 'smpc-agent';

      await expect(
        zeroTrust.performSecureComputation(functionName, localData, partyIds, userId, agentId)
      ).rejects.toThrow('Insufficient consent');
    });
  });

  describe('encryptSensitiveData', () => {
    it('should encrypt data using homomorphic encryption', async () => {
      const sensitiveData = { score: 85, count: 10 };
      const userId = 'user123';
      const agentId = 'encryption-agent';

      const result = await zeroTrust.encryptSensitiveData(sensitiveData, userId, agentId);

      expect(result).toBeDefined();
      expect(typeof result.encryptedData).toBe('string');
      expect(typeof result.keyId).toBe('string');
      expect(Array.isArray(result.canPerformOperations)).toBe(true);
      expect(result.canPerformOperations).toContain('add');
    });
  });

  describe('performHomomorphicOperation', () => {
    it('should perform operations on encrypted data', async () => {
      const sensitiveData1 = { value: 10 };
      const sensitiveData2 = { value: 20 };
      const userId = 'user123';
      const agentId = 'encryption-agent';

      // First encrypt the data
      const encrypted1 = await zeroTrust.encryptSensitiveData(sensitiveData1, userId, agentId);
      const encrypted2 = await zeroTrust.encryptSensitiveData(sensitiveData2, userId, agentId);

      // Then perform operation
      const result = await zeroTrust.performHomomorphicOperation(
        'add',
        [encrypted1.encryptedData, encrypted2.encryptedData],
        encrypted1.keyId,
        userId,
        agentId
      );

      expect(result).toBeDefined();
      expect(typeof result.result).toBe('string');
      expect(result.operation).toBe('add');
      expect(result.isEncrypted).toBe(true);
    });
  });

  describe('enrollVoicePrint', () => {
    it('should enroll a new voice print for biometric authentication', async () => {
      const audioBuffer = Buffer.from('voice enrollment data');
      const userId = 'user123';
      const agentId = 'biometric-agent';

      const result = await zeroTrust.enrollVoicePrint(userId, audioBuffer, agentId);

      expect(result).toBeDefined();
      expect(result.enrolled).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.voicePrintId).toBe('string');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('getSecurityAnalytics', () => {
    it('should return comprehensive security analytics', async () => {
      const analytics = await zeroTrust.getSecurityAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.securityMetrics).toBeDefined();
      expect(analytics.biometricMetrics).toBeDefined();
      expect(analytics.deviceMetrics).toBeDefined();
      expect(analytics.anomalyMetrics).toBeDefined();
      expect(analytics.smpcMetrics).toBeDefined();
      expect(analytics.homomorphicMetrics).toBeDefined();
      expect(analytics.threatIntelligence).toBeDefined();

      // Check threat intelligence structure
      expect(Array.isArray(analytics.threatIntelligence.topThreats)).toBe(true);
      expect(Array.isArray(analytics.threatIntelligence.riskTrends)).toBe(true);
      expect(typeof analytics.threatIntelligence.complianceScore).toBe('number');
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return comprehensive security metrics', async () => {
      const metrics = zeroTrust.getSecurityMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.encryptionOperations).toBe('number');
      expect(typeof metrics.decryptionOperations).toBe('number');
      expect(typeof metrics.piiDetections).toBe('number');
      expect(typeof metrics.complianceViolations).toBe('number');
      expect(typeof metrics.keyRotations).toBe('number');
      expect(typeof metrics.consentChanges).toBe('number');
      expect(typeof metrics.averageResponseTime).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
      expect(metrics.encryptionMetrics).toBeDefined();
      expect(metrics.privacyBudget).toBeDefined();
      expect(metrics.complianceMetrics).toBeDefined();
    });
  });
});