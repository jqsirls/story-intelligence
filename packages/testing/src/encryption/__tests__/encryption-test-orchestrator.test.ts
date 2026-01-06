import { EncryptionTestOrchestrator } from '../EncryptionTestOrchestrator';
import { SSM, KMS, SecretsManager, CloudWatch } from 'aws-sdk';
import * as crypto from 'crypto';

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  SSM: jest.fn().mockImplementation(() => ({
    putParameter: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    getParameter: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Parameter: { Value: 'mock-value' }
      })
    })
  })),
  KMS: jest.fn().mockImplementation(() => ({
    generateDataKey: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Plaintext: crypto.randomBytes(32),
        CiphertextBlob: crypto.randomBytes(64)
      })
    }),
    describeKey: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        KeyMetadata: { KeyId: 'test-key-id' }
      })
    })
  })),
  SecretsManager: jest.fn().mockImplementation(() => ({
    createSecret: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    describeSecret: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Name: 'test-secret'
      })
    })
  })),
  CloudWatch: jest.fn().mockImplementation(() => ({
    putMetricData: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  }))
}));

describe('EncryptionTestOrchestrator', () => {
  let orchestrator: EncryptionTestOrchestrator;
  let mockKMS: any;
  let mockSecretsManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new EncryptionTestOrchestrator();
    mockKMS = new KMS();
    mockSecretsManager = new SecretsManager();
  });

  describe('runComprehensiveEncryptionTests', () => {
    it('should run comprehensive encryption test suite', async () => {
      const result = await orchestrator.runComprehensiveEncryptionTests();

      expect(result).toMatchObject({
        testId: expect.stringMatching(/^encryption-test-\d+$/),
        timestamp: expect.any(Date),
        duration: expect.any(Number),
        libraryResults: expect.any(Array),
        performanceMetrics: expect.any(Object),
        complianceValidation: expect.any(Object),
        securityFindings: expect.any(Array),
        recommendations: expect.any(Array),
        passed: expect.any(Boolean)
      });
    });

    it('should test multiple libraries', async () => {
      const result = await orchestrator.runComprehensiveEncryptionTests();

      expect(result.libraryResults.length).toBeGreaterThan(0);
      expect(result.libraryResults[0]).toMatchObject({
        libraryId: expect.any(String),
        libraryName: expect.any(String),
        encryptionTests: expect.any(Array),
        keyManagement: expect.any(Object),
        dataIntegrity: expect.any(Object),
        crossServiceCompatibility: expect.any(Object),
        performanceMetrics: expect.any(Object),
        passed: expect.any(Boolean)
      });
    });

    it('should validate compliance requirements', async () => {
      const result = await orchestrator.runComprehensiveEncryptionTests();

      expect(result.complianceValidation).toMatchObject({
        gdprCompliant: expect.any(Boolean),
        coppaCompliant: expect.any(Boolean),
        encryptionStandard: 'AES-256-GCM',
        keyManagementCompliant: expect.any(Boolean),
        dataResidencyCompliant: expect.any(Boolean),
        auditTrailComplete: expect.any(Boolean),
        violations: expect.any(Array)
      });
    });
  });

  describe('testLibraryEncryption', () => {
    it('should test encryption for specific library', async () => {
      const result = await orchestrator.testLibraryEncryption('library-1');

      expect(result.libraryId).toBe('library-1');
      expect(result.encryptionTests.length).toBeGreaterThan(0);
      expect(result.keyManagement).toBeDefined();
      expect(result.dataIntegrity).toBeDefined();
    });

    it('should test different data types', async () => {
      const result = await orchestrator.testLibraryEncryption('library-1');

      const dataTypes = new Set(result.encryptionTests.map(t => t.dataType));
      expect(dataTypes.size).toBeGreaterThan(1);
    });

    it('should verify encryption and decryption success', async () => {
      const result = await orchestrator.testLibraryEncryption('library-1');

      result.encryptionTests.forEach(test => {
        expect(test.encryptionSuccess).toBe(true);
        expect(test.decryptionSuccess).toBe(true);
        expect(test.dataIntegrity).toBe(true);
      });
    });
  });

  describe('testPIIEncryption', () => {
    it('should detect and encrypt PII data', async () => {
      const result = await orchestrator.testPIIEncryption();

      expect(result.libraryResults).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should correctly identify PII patterns', async () => {
      const orchestratorAny = orchestrator as any;
      
      // Test PII detection
      expect(orchestratorAny.detectPII('user@example.com')).toBe(true);
      expect(orchestratorAny.detectPII('555-123-4567')).toBe(true);
      expect(orchestratorAny.detectPII('123-45-6789')).toBe(true);
      expect(orchestratorAny.detectPII('8 years old')).toBe(true);
      expect(orchestratorAny.detectPII('123 Main Street')).toBe(true);
      
      // Test non-PII
      expect(orchestratorAny.detectPII('Once upon a time')).toBe(false);
      expect(orchestratorAny.detectPII('Dragon')).toBe(false);
    });
  });

  describe('testKeyRotation', () => {
    it('should successfully rotate encryption keys', async () => {
      const result = await orchestrator.testKeyRotation();

      expect(result.libraryResults.length).toBeGreaterThan(0);
      
      result.libraryResults.forEach(libResult => {
        expect(libResult.keyManagement.keyRotationSuccess).toBe(true);
        expect(libResult.keyManagement.rotationTime).toBeDefined();
        expect(libResult.keyManagement.rotationTime).toBeLessThan(60); // Under 60 seconds
      });
    });

    it('should maintain data integrity during rotation', async () => {
      const result = await orchestrator.testKeyRotation();

      result.libraryResults.forEach(libResult => {
        expect(libResult.dataIntegrity.integrityScore).toBe(100);
        expect(libResult.passed).toBe(true);
      });
    });
  });

  describe('testEncryptionPerformance', () => {
    it('should test encryption with different data sizes', async () => {
      const result = await orchestrator.testEncryptionPerformance();

      // Should test multiple sizes
      const testNames = result.libraryResults.map(r => r.libraryName);
      expect(testNames.some(n => n.includes('1KB'))).toBe(true);
      expect(testNames.some(n => n.includes('1MB'))).toBe(true);
      expect(testNames.some(n => n.includes('10MB'))).toBe(true);
    });

    it('should test concurrent encryption operations', async () => {
      const result = await orchestrator.testEncryptionPerformance();

      // Should test different concurrency levels
      const testNames = result.libraryResults.map(r => r.libraryName);
      expect(testNames.some(n => n.includes('concurrent'))).toBe(true);
    });

    it('should calculate throughput metrics', async () => {
      const result = await orchestrator.testEncryptionPerformance();

      expect(result.performanceMetrics.overallThroughput).toBeGreaterThan(0);
      expect(result.performanceMetrics.p50Latency).toBeDefined();
      expect(result.performanceMetrics.p95Latency).toBeDefined();
      expect(result.performanceMetrics.p99Latency).toBeDefined();
    });
  });

  describe('testCrossServiceCompatibility', () => {
    it('should test encryption compatibility between services', async () => {
      const result = await orchestrator.testCrossServiceCompatibility();

      expect(result.libraryResults).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should verify data can be encrypted by one service and decrypted by another', async () => {
      // Test the internal encryption/decryption methods
      const orchestratorAny = orchestrator as any;
      const key = crypto.randomBytes(32);
      const testData = { test: 'data' };

      // Encrypt with one "service"
      const encrypted = await orchestratorAny.encryptForService('service1', testData, key);
      
      // Decrypt with another "service"
      const decrypted = await orchestratorAny.decryptForService(
        'service2',
        encrypted.ciphertext,
        key,
        encrypted.iv,
        encrypted.tag
      );

      expect(decrypted).toEqual(testData);
    });
  });

  describe('Key Management', () => {
    it('should generate unique keys for each library', async () => {
      const orchestratorAny = orchestrator as any;
      
      const key1 = await orchestratorAny.generateLibraryKey('library-1');
      const key2 = await orchestratorAny.generateLibraryKey('library-2');

      expect(key1).toBeInstanceOf(Buffer);
      expect(key2).toBeInstanceOf(Buffer);
      expect(key1.length).toBe(32); // 256 bits
      expect(key2.length).toBe(32);
      expect(key1.equals(key2)).toBe(false);
    });

    it('should cache keys for performance', async () => {
      const orchestratorAny = orchestrator as any;
      
      const key1 = await orchestratorAny.generateLibraryKey('library-1');
      const key2 = await orchestratorAny.generateLibraryKey('library-1');

      expect(key1.equals(key2)).toBe(true);
      expect(mockKMS.generateDataKey).toHaveBeenCalledTimes(1);
    });

    it('should store encrypted keys in Secrets Manager', async () => {
      const orchestratorAny = orchestrator as any;
      await orchestratorAny.generateLibraryKey('library-test');

      expect(mockSecretsManager.createSecret).toHaveBeenCalledWith(
        expect.objectContaining({
          Name: '/storytailor/library/library-test/encryption-key',
          SecretBinary: expect.any(Buffer)
        })
      );
    });
  });

  describe('Data Integrity', () => {
    it('should detect tampering with ciphertext', async () => {
      const orchestratorAny = orchestrator as any;
      const key = crypto.randomBytes(32);
      const data = 'test data';

      const encrypted = await orchestratorAny.encrypt(data, key);
      
      // Tamper with ciphertext
      const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
      tamperedCiphertext[0] = tamperedCiphertext[0] ^ 0xFF;

      await expect(
        orchestratorAny.decrypt(
          tamperedCiphertext.toString('base64'),
          key,
          encrypted.iv,
          encrypted.tag
        )
      ).rejects.toThrow();
    });

    it('should detect tampering with authentication tag', async () => {
      const orchestratorAny = orchestrator as any;
      const key = crypto.randomBytes(32);
      const data = 'test data';

      const encrypted = await orchestratorAny.encrypt(data, key);
      
      // Tamper with tag
      const tamperedTag = Buffer.from(encrypted.tag, 'base64');
      tamperedTag[0] = tamperedTag[0] ^ 0xFF;

      await expect(
        orchestratorAny.decrypt(
          encrypted.ciphertext,
          key,
          encrypted.iv,
          tamperedTag.toString('base64')
        )
      ).rejects.toThrow();
    });
  });

  describe('Compliance Testing', () => {
    it('should validate GDPR compliance', async () => {
      const compliance = await orchestrator.testGDPRCompliance();

      expect(compliance).toMatchObject({
        gdprCompliant: expect.any(Boolean),
        encryptionStandard: 'AES-256-GCM',
        violations: expect.any(Array)
      });

      if (!compliance.gdprCompliant) {
        expect(compliance.violations.length).toBeGreaterThan(0);
        compliance.violations.forEach(v => {
          expect(v.requirement).toContain('GDPR');
          expect(v.remediation).toBeDefined();
        });
      }
    });

    it('should validate COPPA compliance', async () => {
      const compliance = await orchestrator.testCOPPACompliance();

      expect(compliance).toMatchObject({
        coppaCompliant: expect.any(Boolean),
        violations: expect.any(Array)
      });

      if (!compliance.coppaCompliant) {
        expect(compliance.violations.length).toBeGreaterThan(0);
        compliance.violations.forEach(v => {
          expect(v.requirement).toContain('COPPA');
          expect(v.severity).toMatch(/low|medium|high|critical/);
        });
      }
    });
  });

  describe('Performance Metrics', () => {
    it('should measure encryption latency', async () => {
      const result = await orchestrator.testLibraryEncryption('library-1');

      result.encryptionTests.forEach(test => {
        expect(test.encryptionTime).toBeGreaterThan(0);
        expect(test.decryptionTime).toBeGreaterThan(0);
        expect(test.encryptionTime).toBeLessThan(100); // Should be fast
      });
    });

    it('should calculate library performance metrics', async () => {
      const result = await orchestrator.testLibraryEncryption('library-1');

      expect(result.performanceMetrics).toMatchObject({
        avgEncryptionTime: expect.any(Number),
        avgDecryptionTime: expect.any(Number),
        throughputMBps: expect.any(Number),
        peakMemoryUsage: expect.any(Number),
        cpuUtilization: expect.any(Number)
      });
    });
  });

  describe('Security Findings', () => {
    it('should identify security issues', async () => {
      const result = await orchestrator.runComprehensiveEncryptionTests();

      if (result.securityFindings.length > 0) {
        result.securityFindings.forEach(finding => {
          expect(finding).toMatchObject({
            findingId: expect.any(String),
            category: expect.any(String),
            severity: expect.stringMatching(/low|medium|high|critical/),
            description: expect.any(String),
            affectedLibraries: expect.any(Array),
            recommendation: expect.any(String)
          });
        });
      }
    });

    it('should fail test for critical security findings', async () => {
      // Mock a critical security issue
      const orchestratorAny = orchestrator as any;
      jest.spyOn(orchestratorAny, 'verifyKeyStorage').mockResolvedValue(false);

      const result = await orchestrator.runComprehensiveEncryptionTests();

      const criticalFindings = result.securityFindings.filter(
        f => f.severity === 'critical'
      );

      if (criticalFindings.length > 0) {
        expect(result.passed).toBe(false);
      }
    });
  });

  describe('Recommendations', () => {
    it('should generate actionable recommendations', async () => {
      const result = await orchestrator.runComprehensiveEncryptionTests();

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);

      result.recommendations.forEach(rec => {
        expect(rec).toBeTruthy();
        expect(typeof rec).toBe('string');
      });
    });

    it('should provide specific recommendations for issues', async () => {
      const result = await orchestrator.runComprehensiveEncryptionTests();

      // Should include specific encryption recommendations
      const hasSpecificRecs = result.recommendations.some(r =>
        r.includes('encryption') || 
        r.includes('key') || 
        r.includes('KMS') ||
        r.includes('compliance')
      );

      expect(hasSpecificRecs).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption failures gracefully', async () => {
      const orchestratorAny = orchestrator as any;
      
      // Force an encryption error
      jest.spyOn(orchestratorAny, 'encrypt').mockRejectedValueOnce(
        new Error('Encryption failed')
      );

      const result = await orchestrator.testLibraryEncryption('library-1');

      // Should still return result with failure noted
      expect(result.encryptionTests.some(t => !t.encryptionSuccess)).toBe(true);
    });

    it('should handle KMS failures', async () => {
      mockKMS.generateDataKey.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(new Error('KMS error'))
      });

      const orchestratorAny = orchestrator as any;
      
      await expect(
        orchestratorAny.generateLibraryKey('library-error')
      ).rejects.toThrow('KMS error');
    });
  });

  describe('Reporting', () => {
    it('should generate comprehensive report', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await orchestrator.runComprehensiveEncryptionTests();

      // Should log detailed report
      const reportCalls = consoleSpy.mock.calls.filter(
        call => call[0].includes('Encryption Test Report')
      );

      expect(reportCalls.length).toBeGreaterThan(0);
      
      const report = reportCalls[0][0];
      expect(report).toContain('Executive Summary');
      expect(report).toContain('Performance Metrics');
      expect(report).toContain('Compliance Status');
      expect(report).toContain('Library Results');

      consoleSpy.mockRestore();
    });
  });
});