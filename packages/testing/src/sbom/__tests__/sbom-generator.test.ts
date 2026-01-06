import { SBOMGenerator } from '../SBOMGenerator';
import { S3, CodeArtifact } from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Mock modules
jest.mock('fs');
jest.mock('child_process');
jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    putObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  })),
  CodeArtifact: jest.fn().mockImplementation(() => ({}))
}));

describe('SBOMGenerator', () => {
  let generator: SBOMGenerator;
  let mockFs: jest.Mocked<typeof fs>;
  let mockExecSync: jest.MockedFunction<typeof execSync>;
  let mockS3: any;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new SBOMGenerator();
    mockFs = fs as jest.Mocked<typeof fs>;
    mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
    mockS3 = new S3();
    
    // Default mocks
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.writeFileSync.mockReturnValue(undefined);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      name: 'test-package',
      version: '1.0.0',
      dependencies: {
        'express': '^4.18.0',
        'lodash': '~4.17.21'
      }
    }));
    
    mockFs.readdirSync.mockReturnValue([
      { name: 'package.json', isFile: () => true, isDirectory: () => false },
      { name: 'packages', isFile: () => false, isDirectory: () => true }
    ] as any);
  });

  describe('generateSBOM', () => {
    it('should generate a comprehensive SBOM', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({
        name: 'express',
        version: '4.18.0',
        license: 'MIT',
        repository: { url: 'https://github.com/expressjs/express' }
      }));

      const result = await generator.generateSBOM();

      expect(result).toMatchObject({
        id: expect.stringMatching(/^sbom-/),
        timestamp: expect.any(Date),
        format: 'cyclonedx',
        packages: expect.any(Array),
        licenses: expect.any(Object),
        vulnerabilities: expect.any(Object),
        compliance: expect.any(Object),
        outputFile: expect.any(String)
      });

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(mockS3.putObject).toHaveBeenCalled();
    });

    it('should support different SBOM formats', async () => {
      const spdxResult = await generator.generateSBOM({ format: 'spdx' });
      
      const spdxCall = mockFs.writeFileSync.mock.calls.find(
        call => call[1].toString().includes('spdxVersion')
      );
      expect(spdxCall).toBeDefined();

      const cycloneDxResult = await generator.generateSBOM({ format: 'cyclonedx' });
      
      const cycloneDxCall = mockFs.writeFileSync.mock.calls.find(
        call => call[1].toString().includes('bomFormat')
      );
      expect(cycloneDxCall).toBeDefined();
    });

    it('should include vulnerability scanning when enabled', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('npm audit')) {
          return JSON.stringify({
            vulnerabilities: {
              'express': {
                severity: 'high',
                via: [{
                  name: 'CVE-2022-12345',
                  title: 'Test vulnerability',
                  overview: 'Test description',
                  cwe: ['CWE-79']
                }],
                range: '<4.18.0',
                fixAvailable: { version: '4.18.1' }
              }
            }
          });
        }
        return JSON.stringify({});
      });

      const result = await generator.generateSBOM({ vulnerabilityScanning: true });

      expect(result.vulnerabilities.totalVulnerabilities).toBeGreaterThan(0);
      expect(result.vulnerabilities.highCount).toBeGreaterThan(0);
      expect(result.vulnerabilities.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should sign SBOM when requested', async () => {
      const result = await generator.generateSBOM({ signSBOM: true });

      expect(result.signature).toBeDefined();
      expect(result.signature).toBeTruthy();
      
      // Verify signature file was created
      const signatureFileCall = mockFs.writeFileSync.mock.calls.find(
        call => call[0].toString().endsWith('.sig')
      );
      expect(signatureFileCall).toBeDefined();
    });
  });

  describe('generatePackageSBOM', () => {
    it('should generate SBOM for specific package', async () => {
      const packagePath = '/test/packages/test-agent';
      
      // Mock process.cwd and chdir
      const originalCwd = process.cwd();
      const mockChdir = jest.spyOn(process, 'chdir').mockImplementation();
      jest.spyOn(process, 'cwd').mockReturnValue(packagePath);

      const result = await generator.generatePackageSBOM(packagePath);

      expect(mockChdir).toHaveBeenCalledWith(packagePath);
      expect(mockChdir).toHaveBeenCalledWith(originalCwd);
      expect(result.packages.length).toBeGreaterThan(0);
      
      mockChdir.mockRestore();
    });
  });

  describe('validateSBOM', () => {
    it('should validate correct SBOM format', async () => {
      const validSBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 1,
        components: [
          { name: 'test-package', version: '1.0.0' }
        ]
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(validSBOM));

      const validation = await generator.validateSBOM('/path/to/sbom.json');

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect invalid SBOM format', async () => {
      const invalidSBOM = {
        // Missing required fields
        components: []
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidSBOM));

      const validation = await generator.validateSBOM('/path/to/sbom.json');

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Missing required field: bomFormat');
    });

    it('should validate component structure', async () => {
      const sbomWithInvalidComponent = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 1,
        components: [
          { version: '1.0.0' } // Missing name
        ]
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(sbomWithInvalidComponent));

      const validation = await generator.validateSBOM('/path/to/sbom.json');

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('missing name'))).toBe(true);
    });
  });

  describe('compareSBOMs', () => {
    it('should identify added packages', async () => {
      const sbom1 = {
        components: [
          { name: 'package-a', version: '1.0.0' }
        ]
      };

      const sbom2 = {
        components: [
          { name: 'package-a', version: '1.0.0' },
          { name: 'package-b', version: '2.0.0' }
        ]
      };

      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify(sbom1))
        .mockReturnValueOnce(JSON.stringify(sbom2));

      const comparison = await generator.compareSBOMs('sbom1.json', 'sbom2.json');

      expect(comparison.added.length).toBe(1);
      expect(comparison.added[0].name).toBe('package-b');
    });

    it('should identify removed packages', async () => {
      const sbom1 = {
        components: [
          { name: 'package-a', version: '1.0.0' },
          { name: 'package-b', version: '2.0.0' }
        ]
      };

      const sbom2 = {
        components: [
          { name: 'package-a', version: '1.0.0' }
        ]
      };

      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify(sbom1))
        .mockReturnValueOnce(JSON.stringify(sbom2));

      const comparison = await generator.compareSBOMs('sbom1.json', 'sbom2.json');

      expect(comparison.removed.length).toBe(1);
      expect(comparison.removed[0].name).toBe('package-b');
    });

    it('should identify version updates', async () => {
      const sbom1 = {
        components: [
          { name: 'package-a', version: '1.0.0' }
        ]
      };

      const sbom2 = {
        components: [
          { name: 'package-a', version: '2.0.0' }
        ]
      };

      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify(sbom1))
        .mockReturnValueOnce(JSON.stringify(sbom2));

      const comparison = await generator.compareSBOMs('sbom1.json', 'sbom2.json');

      expect(comparison.updated.length).toBe(1);
      expect(comparison.updated[0]).toMatchObject({
        package: 'package-a',
        oldVersion: '1.0.0',
        newVersion: '2.0.0'
      });
    });

    it('should identify license changes', async () => {
      const sbom1 = {
        components: [{
          name: 'package-a',
          version: '1.0.0',
          licenses: [{ license: { id: 'MIT' } }]
        }]
      };

      const sbom2 = {
        components: [{
          name: 'package-a',
          version: '1.0.0',
          licenses: [{ license: { id: 'Apache-2.0' } }]
        }]
      };

      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify(sbom1))
        .mockReturnValueOnce(JSON.stringify(sbom2));

      const comparison = await generator.compareSBOMs('sbom1.json', 'sbom2.json');

      expect(comparison.licenseChanges.length).toBe(1);
      expect(comparison.licenseChanges[0]).toMatchObject({
        package: 'package-a',
        oldLicense: 'MIT',
        newLicense: 'Apache-2.0'
      });
    });
  });

  describe('License Analysis', () => {
    it('should detect denied licenses', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('express')) {
          return JSON.stringify({ license: 'GPL-3.0' }); // Denied license
        }
        return JSON.stringify({ license: 'MIT' });
      });

      const result = await generator.generateSBOM({
        licenseCompliance: {
          allowedLicenses: ['MIT', 'Apache-2.0'],
          deniedLicenses: ['GPL-3.0'],
          requireAttribution: true,
          copyleftHandling: 'deny'
        }
      });

      expect(result.compliance.compliant).toBe(false);
      expect(result.compliance.violations.some(v => 
        v.type === 'license' && v.description.includes('denied license')
      )).toBe(true);
    });

    it('should identify copyleft licenses', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('express')) {
          return JSON.stringify({ license: 'GPL-2.0' });
        }
        return JSON.stringify({ license: 'MIT' });
      });

      const result = await generator.generateSBOM();

      expect(result.licenses.copyleftPackages.length).toBeGreaterThan(0);
      expect(result.licenses.copyleftPackages[0].license).toBe('GPL-2.0');
    });

    it('should track license distribution', async () => {
      mockExecSync.mockImplementation(() => 
        JSON.stringify({ license: 'MIT' })
      );

      const result = await generator.generateSBOM();

      expect(result.licenses.licenseDistribution).toBeDefined();
      expect(result.licenses.licenseDistribution['MIT']).toBeGreaterThan(0);
    });

    it('should identify packages requiring attribution', async () => {
      mockExecSync.mockImplementation(() => 
        JSON.stringify({ license: 'Apache-2.0' })
      );

      const result = await generator.generateSBOM({
        licenseCompliance: {
          allowedLicenses: ['MIT', 'Apache-2.0'],
          deniedLicenses: [],
          requireAttribution: true,
          copyleftHandling: 'allow'
        }
      });

      expect(result.compliance.attributionRequired.length).toBeGreaterThan(0);
    });
  });

  describe('Vulnerability Scanning', () => {
    it('should categorize vulnerabilities by severity', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('npm audit')) {
          return JSON.stringify({
            vulnerabilities: {
              'package-a': {
                severity: 'critical',
                via: [{ name: 'CVE-2023-1', title: 'Critical vuln' }]
              },
              'package-b': {
                severity: 'high',
                via: [{ name: 'CVE-2023-2', title: 'High vuln' }]
              },
              'package-c': {
                severity: 'medium',
                via: [{ name: 'CVE-2023-3', title: 'Medium vuln' }]
              }
            }
          });
        }
        return JSON.stringify({});
      });

      const result = await generator.generateSBOM({ vulnerabilityScanning: true });

      expect(result.vulnerabilities.criticalCount).toBe(1);
      expect(result.vulnerabilities.highCount).toBe(1);
      expect(result.vulnerabilities.mediumCount).toBe(1);
    });

    it('should generate remediation recommendations', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('npm audit')) {
          return JSON.stringify({
            vulnerabilities: {
              'vulnerable-package': {
                severity: 'critical',
                via: [{ name: 'CVE-2023-12345' }],
                fixAvailable: { version: '2.0.0' }
              }
            }
          });
        }
        return JSON.stringify({});
      });

      const result = await generator.generateSBOM({ vulnerabilityScanning: true });

      expect(result.vulnerabilities.recommendedActions).toContain(
        expect.stringContaining('Update vulnerable-package to version 2.0.0')
      );
    });
  });

  describe('SBOM Signing', () => {
    it('should generate and verify signatures', async () => {
      // Generate SBOM with signature
      const result = await generator.generateSBOM({ signSBOM: true });
      
      expect(result.signature).toBeDefined();
      expect(typeof result.signature).toBe('string');
      expect(result.signature.length).toBeGreaterThan(0);
    });

    it('should save signature to separate file', async () => {
      await generator.generateSBOM({ signSBOM: true });

      const signatureCall = mockFs.writeFileSync.mock.calls.find(
        call => call[0].toString().endsWith('.sig')
      );

      expect(signatureCall).toBeDefined();
      expect(signatureCall?.[1]).toBeTruthy();
    });
  });

  describe('Compliance Checking', () => {
    it('should fail compliance for critical vulnerabilities', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('npm audit')) {
          return JSON.stringify({
            vulnerabilities: {
              'critical-package': {
                severity: 'critical',
                via: [{ name: 'CVE-2023-CRITICAL' }]
              }
            }
          });
        }
        return JSON.stringify({});
      });

      const result = await generator.generateSBOM({ vulnerabilityScanning: true });

      expect(result.compliance.compliant).toBe(false);
      expect(result.compliance.violations.some(v => 
        v.type === 'vulnerability' && v.severity === 'critical'
      )).toBe(true);
    });

    it('should warn about unknown licenses', async () => {
      mockExecSync.mockImplementation(() => 
        JSON.stringify({}) // No license info
      );

      const result = await generator.generateSBOM();

      expect(result.licenses.unknownLicenses.length).toBeGreaterThan(0);
      expect(result.compliance.warnings.some(w => 
        w.message.includes('unknown licenses')
      )).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle npm command failures gracefully', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('npm command failed');
      });

      const result = await generator.generateSBOM();

      // Should still generate SBOM with unknown licenses
      expect(result).toBeDefined();
      expect(result.packages.length).toBeGreaterThan(0);
      expect(result.packages[0].license).toBe('UNKNOWN');
    });

    it('should handle file system errors', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(generator.validateSBOM('/invalid/path')).resolves.toMatchObject({
        valid: false,
        errors: expect.arrayContaining([
          expect.stringContaining('Failed to validate SBOM')
        ])
      });
    });

    it('should handle S3 upload failures gracefully', async () => {
      mockS3.putObject.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('S3 error'))
      });

      // Should not throw, just warn
      await expect(generator.generateSBOM()).resolves.toBeDefined();
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await generator.generateSBOM();

      const reportCalls = consoleSpy.mock.calls.filter(
        call => call[0].includes('Software Bill of Materials (SBOM) Report')
      );

      expect(reportCalls.length).toBeGreaterThan(0);
      
      const report = reportCalls[0][0];
      expect(report).toContain('Summary');
      expect(report).toContain('License Analysis');
      expect(report).toContain('Vulnerability Summary');
      expect(report).toContain('Compliance Status');

      consoleSpy.mockRestore();
    });

    it('should save report to file', async () => {
      await generator.generateSBOM();

      const reportCall = mockFs.writeFileSync.mock.calls.find(
        call => call[0].toString().endsWith('-report.md')
      );

      expect(reportCall).toBeDefined();
      expect(reportCall?.[1]).toContain('Software Bill of Materials (SBOM) Report');
    });
  });
});