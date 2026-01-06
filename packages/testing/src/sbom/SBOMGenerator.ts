import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as crypto from 'crypto';
import { S3, CodeArtifact } from 'aws-sdk';

interface SBOMConfig {
  projectName: string;
  version: string;
  format: 'spdx' | 'cyclonedx';
  includeDevDependencies: boolean;
  outputPath: string;
  licenseCompliance: LicenseCompliance;
  vulnerabilityScanning: boolean;
  signSBOM: boolean;
}

interface LicenseCompliance {
  allowedLicenses: string[];
  deniedLicenses: string[];
  requireAttribution: boolean;
  copyleftHandling: 'allow' | 'warn' | 'deny';
}

interface PackageInfo {
  name: string;
  version: string;
  license: string;
  repository?: string;
  dependencies: Record<string, string>;
  vulnerabilities?: Vulnerability[];
  checksums: {
    sha256: string;
    sha512: string;
  };
}

interface Vulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedVersions: string;
  fixedVersion?: string;
  cwe?: string[];
}

interface SBOMResult {
  id: string;
  timestamp: Date;
  format: string;
  packages: PackageInfo[];
  licenses: LicenseAnalysis;
  vulnerabilities: VulnerabilityReport;
  compliance: ComplianceReport;
  signature?: string;
  outputFile: string;
}

interface LicenseAnalysis {
  totalPackages: number;
  uniqueLicenses: string[];
  licenseDistribution: Record<string, number>;
  copyleftPackages: PackageInfo[];
  unknownLicenses: PackageInfo[];
  incompatibleLicenses: LicenseConflict[];
}

interface LicenseConflict {
  package1: string;
  license1: string;
  package2: string;
  license2: string;
  reason: string;
}

interface VulnerabilityReport {
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  affectedPackages: string[];
  recommendedActions: string[];
}

interface ComplianceReport {
  compliant: boolean;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  attributionRequired: PackageInfo[];
}

interface ComplianceViolation {
  type: 'license' | 'vulnerability' | 'policy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  package: string;
  description: string;
  remediation: string;
}

interface ComplianceWarning {
  type: string;
  package: string;
  message: string;
}

export class SBOMGenerator {
  private s3: S3;
  private codeArtifact: CodeArtifact;
  private licenseCompatibilityMatrix: Record<string, Record<string, boolean>>;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.s3 = new S3({ region });
    this.codeArtifact = new CodeArtifact({ region });
    this.licenseCompatibilityMatrix = this.initializeLicenseMatrix();
  }

  /**
   * Generate comprehensive SBOM for the project
   */
  async generateSBOM(config?: Partial<SBOMConfig>): Promise<SBOMResult> {
    console.log('\n📋 Generating Software Bill of Materials (SBOM)\n');

    const fullConfig: SBOMConfig = {
      projectName: 'storytailor-multi-agent-system',
      version: this.getProjectVersion(),
      format: 'cyclonedx',
      includeDevDependencies: false,
      outputPath: './sbom',
      licenseCompliance: {
        allowedLicenses: [
          'MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 
          'ISC', 'CC0-1.0', 'Unlicense', '0BSD'
        ],
        deniedLicenses: ['GPL-3.0', 'AGPL-3.0', 'SSPL'],
        requireAttribution: true,
        copyleftHandling: 'warn'
      },
      vulnerabilityScanning: true,
      signSBOM: true,
      ...config
    };

    const timestamp = new Date();
    const sbomId = `sbom-${timestamp.toISOString().replace(/[:.]/g, '-')}`;

    // Collect package information
    const packages = await this.collectPackageInfo(fullConfig);

    // Analyze licenses
    const licenses = this.analyzeLicenses(packages, fullConfig.licenseCompliance);

    // Scan for vulnerabilities
    const vulnerabilities = fullConfig.vulnerabilityScanning 
      ? await this.scanVulnerabilities(packages)
      : this.getEmptyVulnerabilityReport();

    // Check compliance
    const compliance = this.checkCompliance(
      packages, 
      licenses, 
      vulnerabilities, 
      fullConfig.licenseCompliance
    );

    // Generate SBOM document
    const sbomDocument = this.generateSBOMDocument(
      fullConfig,
      packages,
      licenses,
      vulnerabilities,
      timestamp
    );

    // Sign SBOM if requested
    const signature = fullConfig.signSBOM 
      ? await this.signSBOM(sbomDocument)
      : undefined;

    // Save SBOM
    const outputFile = await this.saveSBOM(
      sbomDocument,
      fullConfig,
      sbomId,
      signature
    );

    const result: SBOMResult = {
      id: sbomId,
      timestamp,
      format: fullConfig.format,
      packages,
      licenses,
      vulnerabilities,
      compliance,
      signature,
      outputFile
    };

    // Generate report
    this.generateSBOMReport(result, fullConfig);

    // Upload to S3 for archival
    await this.archiveSBOM(result, sbomDocument);

    return result;
  }

  /**
   * Generate SBOM for a specific package/agent
   */
  async generatePackageSBOM(packagePath: string): Promise<SBOMResult> {
    console.log(`\n📦 Generating SBOM for package: ${packagePath}\n`);

    const packageName = path.basename(packagePath);
    const config: Partial<SBOMConfig> = {
      projectName: packageName,
      outputPath: path.join(packagePath, 'sbom')
    };

    // Change to package directory
    const originalDir = process.cwd();
    process.chdir(packagePath);

    try {
      const result = await this.generateSBOM(config);
      return result;
    } finally {
      process.chdir(originalDir);
    }
  }

  /**
   * Validate existing SBOM
   */
  async validateSBOM(sbomPath: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    console.log(`\n🔍 Validating SBOM: ${sbomPath}\n`);

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Read SBOM
      const sbomContent = fs.readFileSync(sbomPath, 'utf-8');
      const sbom = JSON.parse(sbomContent);

      // Validate format
      if (!this.isValidSBOMFormat(sbom)) {
        errors.push('Invalid SBOM format');
      }

      // Validate required fields
      const requiredFields = ['bomFormat', 'specVersion', 'version', 'components'];
      for (const field of requiredFields) {
        if (!sbom[field]) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      // Validate components
      if (sbom.components && Array.isArray(sbom.components)) {
        sbom.components.forEach((component: any, index: number) => {
          if (!component.name) {
            errors.push(`Component ${index} missing name`);
          }
          if (!component.version) {
            warnings.push(`Component ${component.name || index} missing version`);
          }
        });
      }

      // Validate signature if present
      if (sbom.signature) {
        const isValidSignature = await this.verifySBOMSignature(sbomContent, sbom.signature);
        if (!isValidSignature) {
          errors.push('Invalid SBOM signature');
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error: any) {
      errors.push(`Failed to validate SBOM: ${error.message}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Compare two SBOMs for differences
   */
  async compareSBOMs(sbom1Path: string, sbom2Path: string): Promise<{
    added: PackageInfo[];
    removed: PackageInfo[];
    updated: Array<{
      package: string;
      oldVersion: string;
      newVersion: string;
      licenseChanged: boolean;
    }>;
    licenseChanges: Array<{
      package: string;
      oldLicense: string;
      newLicense: string;
    }>;
  }> {
    console.log(`\n🔄 Comparing SBOMs:\n  - ${sbom1Path}\n  - ${sbom2Path}\n`);

    const sbom1 = JSON.parse(fs.readFileSync(sbom1Path, 'utf-8'));
    const sbom2 = JSON.parse(fs.readFileSync(sbom2Path, 'utf-8'));

    const packages1 = new Map(
      sbom1.components.map((c: any) => [`${c.name}@${c.version}`, c])
    );
    const packages2 = new Map(
      sbom2.components.map((c: any) => [`${c.name}@${c.version}`, c])
    );

    const added: PackageInfo[] = [];
    const removed: PackageInfo[] = [];
    const updated: any[] = [];
    const licenseChanges: any[] = [];

    // Find removed and updated packages
    packages1.forEach((pkg1, key1) => {
      const found = Array.from(packages2.entries()).find(
        ([key2, pkg2]) => pkg2.name === pkg1.name
      );

      if (!found) {
        removed.push(this.convertToPackageInfo(pkg1));
      } else if (found[0] !== key1) {
        const [, pkg2] = found;
        updated.push({
          package: pkg1.name,
          oldVersion: pkg1.version,
          newVersion: pkg2.version,
          licenseChanged: pkg1.licenses?.[0]?.license?.id !== pkg2.licenses?.[0]?.license?.id
        });

        if (pkg1.licenses?.[0]?.license?.id !== pkg2.licenses?.[0]?.license?.id) {
          licenseChanges.push({
            package: pkg1.name,
            oldLicense: pkg1.licenses?.[0]?.license?.id || 'unknown',
            newLicense: pkg2.licenses?.[0]?.license?.id || 'unknown'
          });
        }
      }
    });

    // Find added packages
    packages2.forEach((pkg2, key2) => {
      const found = Array.from(packages1.keys()).find(key1 => 
        packages1.get(key1)?.name === pkg2.name
      );
      if (!found) {
        added.push(this.convertToPackageInfo(pkg2));
      }
    });

    return { added, removed, updated, licenseChanges };
  }

  /**
   * Collect package information from the project
   */
  private async collectPackageInfo(config: SBOMConfig): Promise<PackageInfo[]> {
    const packages: PackageInfo[] = [];
    
    // Get all package.json files in the monorepo
    const packageJsonPaths = this.findPackageJsonFiles();

    for (const packageJsonPath of packageJsonPaths) {
      const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const packageDir = path.dirname(packageJsonPath);

      // Get dependencies
      const dependencies = {
        ...packageData.dependencies,
        ...(config.includeDevDependencies ? packageData.devDependencies : {})
      };

      // Get detailed info for each dependency
      for (const [name, version] of Object.entries(dependencies)) {
        const info = await this.getPackageDetails(name, version as string, packageDir);
        packages.push(info);
      }

      // Add the package itself
      const selfInfo = await this.getPackageDetails(
        packageData.name,
        packageData.version,
        packageDir,
        true
      );
      packages.push(selfInfo);
    }

    // Remove duplicates
    const uniquePackages = this.deduplicatePackages(packages);

    // Calculate checksums
    for (const pkg of uniquePackages) {
      pkg.checksums = await this.calculatePackageChecksums(pkg);
    }

    return uniquePackages;
  }

  /**
   * Get detailed information about a package
   */
  private async getPackageDetails(
    name: string,
    version: string,
    baseDir: string,
    isSelf: boolean = false
  ): Promise<PackageInfo> {
    try {
      // Get package info from npm
      const npmInfo = isSelf 
        ? { name, version, license: 'MIT' } // Default for our packages
        : await this.getNpmPackageInfo(name, version);

      // Scan for vulnerabilities
      const vulnerabilities = await this.scanPackageVulnerabilities(name, version);

      return {
        name,
        version: version.replace(/[\^~]/, ''),
        license: npmInfo.license || 'UNKNOWN',
        repository: npmInfo.repository,
        dependencies: {},
        vulnerabilities,
        checksums: {
          sha256: '',
          sha512: ''
        }
      };

    } catch (error) {
      return {
        name,
        version: version.replace(/[\^~]/, ''),
        license: 'UNKNOWN',
        dependencies: {},
        checksums: {
          sha256: '',
          sha512: ''
        }
      };
    }
  }

  /**
   * Get package info from npm registry
   */
  private async getNpmPackageInfo(name: string, version: string): Promise<any> {
    try {
      const output = execSync(
        `npm view ${name}@${version} --json`,
        { encoding: 'utf-8' }
      );
      return JSON.parse(output);
    } catch {
      return {};
    }
  }

  /**
   * Scan package for known vulnerabilities
   */
  private async scanPackageVulnerabilities(
    name: string,
    version: string
  ): Promise<Vulnerability[]> {
    try {
      // Run npm audit for specific package
      const output = execSync(
        `npm audit --json --package ${name}@${version}`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      
      const audit = JSON.parse(output);
      const vulnerabilities: Vulnerability[] = [];

      if (audit.vulnerabilities && audit.vulnerabilities[name]) {
        const vuln = audit.vulnerabilities[name];
        vulnerabilities.push({
          id: vuln.via[0].name || 'Unknown',
          severity: vuln.severity,
          title: vuln.via[0].title || 'Unknown vulnerability',
          description: vuln.via[0].overview || '',
          affectedVersions: vuln.range,
          fixedVersion: vuln.fixAvailable?.version,
          cwe: vuln.via[0].cwe || []
        });
      }

      return vulnerabilities;

    } catch {
      return [];
    }
  }

  /**
   * Analyze licenses across all packages
   */
  private analyzeLicenses(
    packages: PackageInfo[],
    compliance: LicenseCompliance
  ): LicenseAnalysis {
    const uniqueLicenses = new Set<string>();
    const licenseDistribution: Record<string, number> = {};
    const copyleftPackages: PackageInfo[] = [];
    const unknownLicenses: PackageInfo[] = [];
    const incompatibleLicenses: LicenseConflict[] = [];

    // Copyleft licenses
    const copyleftLicenses = ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-2.1', 'LGPL-3.0'];

    for (const pkg of packages) {
      // Track unique licenses
      uniqueLicenses.add(pkg.license);

      // Count distribution
      licenseDistribution[pkg.license] = (licenseDistribution[pkg.license] || 0) + 1;

      // Check for copyleft
      if (copyleftLicenses.includes(pkg.license)) {
        copyleftPackages.push(pkg);
      }

      // Check for unknown
      if (pkg.license === 'UNKNOWN' || !pkg.license) {
        unknownLicenses.push(pkg);
      }
    }

    // Check for license incompatibilities
    for (let i = 0; i < packages.length; i++) {
      for (let j = i + 1; j < packages.length; j++) {
        const conflict = this.checkLicenseCompatibility(
          packages[i].license,
          packages[j].license
        );
        if (conflict) {
          incompatibleLicenses.push({
            package1: packages[i].name,
            license1: packages[i].license,
            package2: packages[j].name,
            license2: packages[j].license,
            reason: conflict
          });
        }
      }
    }

    return {
      totalPackages: packages.length,
      uniqueLicenses: Array.from(uniqueLicenses),
      licenseDistribution,
      copyleftPackages,
      unknownLicenses,
      incompatibleLicenses
    };
  }

  /**
   * Scan all packages for vulnerabilities
   */
  private async scanVulnerabilities(packages: PackageInfo[]): Promise<VulnerabilityReport> {
    console.log('  🔍 Scanning for vulnerabilities...');

    let totalVulnerabilities = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    const affectedPackages = new Set<string>();
    const recommendedActions: string[] = [];

    for (const pkg of packages) {
      if (pkg.vulnerabilities && pkg.vulnerabilities.length > 0) {
        affectedPackages.add(pkg.name);
        
        for (const vuln of pkg.vulnerabilities) {
          totalVulnerabilities++;
          
          switch (vuln.severity) {
            case 'critical':
              criticalCount++;
              break;
            case 'high':
              highCount++;
              break;
            case 'medium':
              mediumCount++;
              break;
            case 'low':
              lowCount++;
              break;
          }

          if (vuln.fixedVersion) {
            recommendedActions.push(
              `Update ${pkg.name} to version ${vuln.fixedVersion} to fix ${vuln.id}`
            );
          }
        }
      }
    }

    // Add general recommendations
    if (criticalCount > 0) {
      recommendedActions.unshift('⚠️  Address critical vulnerabilities immediately');
    }
    if (highCount > 0) {
      recommendedActions.push('Schedule updates for high severity vulnerabilities');
    }

    return {
      totalVulnerabilities,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      affectedPackages: Array.from(affectedPackages),
      recommendedActions: [...new Set(recommendedActions)]
    };
  }

  /**
   * Check compliance against policies
   */
  private checkCompliance(
    packages: PackageInfo[],
    licenses: LicenseAnalysis,
    vulnerabilities: VulnerabilityReport,
    policy: LicenseCompliance
  ): ComplianceReport {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];
    const attributionRequired: PackageInfo[] = [];

    // Check denied licenses
    for (const pkg of packages) {
      if (policy.deniedLicenses.includes(pkg.license)) {
        violations.push({
          type: 'license',
          severity: 'high',
          package: pkg.name,
          description: `Package uses denied license: ${pkg.license}`,
          remediation: 'Replace package with alternative using allowed license'
        });
      }

      // Check allowed licenses
      if (!policy.allowedLicenses.includes(pkg.license) && pkg.license !== 'UNKNOWN') {
        warnings.push({
          type: 'license',
          package: pkg.name,
          message: `Package uses non-standard license: ${pkg.license}`
        });
      }

      // Check attribution requirements
      if (policy.requireAttribution && this.requiresAttribution(pkg.license)) {
        attributionRequired.push(pkg);
      }
    }

    // Check copyleft handling
    if (policy.copyleftHandling !== 'allow' && licenses.copyleftPackages.length > 0) {
      for (const pkg of licenses.copyleftPackages) {
        if (policy.copyleftHandling === 'deny') {
          violations.push({
            type: 'license',
            severity: 'high',
            package: pkg.name,
            description: `Copyleft license not allowed: ${pkg.license}`,
            remediation: 'Replace with permissive licensed alternative'
          });
        } else {
          warnings.push({
            type: 'license',
            package: pkg.name,
            message: `Copyleft license detected: ${pkg.license}`
          });
        }
      }
    }

    // Check vulnerabilities
    if (vulnerabilities.criticalCount > 0) {
      violations.push({
        type: 'vulnerability',
        severity: 'critical',
        package: vulnerabilities.affectedPackages.join(', '),
        description: `${vulnerabilities.criticalCount} critical vulnerabilities found`,
        remediation: 'Update affected packages immediately'
      });
    }

    // Check unknown licenses
    if (licenses.unknownLicenses.length > 0) {
      warnings.push({
        type: 'license',
        package: licenses.unknownLicenses.map(p => p.name).join(', '),
        message: 'Packages with unknown licenses detected'
      });
    }

    const compliant = violations.length === 0;

    return {
      compliant,
      violations,
      warnings,
      attributionRequired
    };
  }

  /**
   * Generate SBOM document in specified format
   */
  private generateSBOMDocument(
    config: SBOMConfig,
    packages: PackageInfo[],
    licenses: LicenseAnalysis,
    vulnerabilities: VulnerabilityReport,
    timestamp: Date
  ): string {
    if (config.format === 'cyclonedx') {
      return this.generateCycloneDXDocument(config, packages, timestamp);
    } else {
      return this.generateSPDXDocument(config, packages, timestamp);
    }
  }

  /**
   * Generate CycloneDX format SBOM
   */
  private generateCycloneDXDocument(
    config: SBOMConfig,
    packages: PackageInfo[],
    timestamp: Date
  ): string {
    const sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.4',
      serialNumber: `urn:uuid:${crypto.randomUUID()}`,
      version: 1,
      metadata: {
        timestamp: timestamp.toISOString(),
        tools: [{
          vendor: 'Storytailor',
          name: 'SBOM Generator',
          version: '1.0.0'
        }],
        component: {
          type: 'application',
          name: config.projectName,
          version: config.version
        }
      },
      components: packages.map(pkg => ({
        type: 'library',
        name: pkg.name,
        version: pkg.version,
        licenses: [{
          license: {
            id: pkg.license,
            name: pkg.license
          }
        }],
        hashes: [
          {
            alg: 'SHA-256',
            content: pkg.checksums.sha256
          },
          {
            alg: 'SHA-512',
            content: pkg.checksums.sha512
          }
        ],
        externalReferences: pkg.repository ? [{
          type: 'vcs',
          url: pkg.repository
        }] : undefined
      }))
    };

    return JSON.stringify(sbom, null, 2);
  }

  /**
   * Generate SPDX format SBOM
   */
  private generateSPDXDocument(
    config: SBOMConfig,
    packages: PackageInfo[],
    timestamp: Date
  ): string {
    const sbom = {
      spdxVersion: 'SPDX-2.3',
      dataLicense: 'CC0-1.0',
      SPDXID: 'SPDXRef-DOCUMENT',
      name: config.projectName,
      documentNamespace: `https://storytailor.ai/sbom/${config.projectName}/${timestamp.getTime()}`,
      creationInfo: {
        created: timestamp.toISOString(),
        creators: ['Tool: Storytailor SBOM Generator-1.0.0']
      },
      packages: packages.map((pkg, index) => ({
        SPDXID: `SPDXRef-Package-${index}`,
        name: pkg.name,
        downloadLocation: pkg.repository || 'NOASSERTION',
        filesAnalyzed: false,
        licenseConcluded: pkg.license,
        licenseDeclared: pkg.license,
        copyrightText: 'NOASSERTION',
        versionInfo: pkg.version,
        checksums: [
          {
            algorithm: 'SHA256',
            checksumValue: pkg.checksums.sha256
          },
          {
            algorithm: 'SHA512',
            checksumValue: pkg.checksums.sha512
          }
        ]
      }))
    };

    return JSON.stringify(sbom, null, 2);
  }

  /**
   * Sign SBOM document
   */
  private async signSBOM(sbomDocument: string): Promise<string> {
    const privateKey = process.env.SBOM_SIGNING_KEY || this.generateSigningKey();
    
    const sign = crypto.createSign('SHA256');
    sign.update(sbomDocument);
    sign.end();
    
    return sign.sign(privateKey, 'base64');
  }

  /**
   * Verify SBOM signature
   */
  private async verifySBOMSignature(sbomContent: string, signature: string): Promise<boolean> {
    try {
      const publicKey = process.env.SBOM_PUBLIC_KEY || this.getPublicKey();
      
      const verify = crypto.createVerify('SHA256');
      verify.update(sbomContent);
      verify.end();
      
      return verify.verify(publicKey, signature, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * Save SBOM to file system
   */
  private async saveSBOM(
    document: string,
    config: SBOMConfig,
    sbomId: string,
    signature?: string
  ): Promise<string> {
    // Create output directory
    if (!fs.existsSync(config.outputPath)) {
      fs.mkdirSync(config.outputPath, { recursive: true });
    }

    // Save SBOM document
    const filename = `${config.projectName}-sbom-${sbomId}.json`;
    const filepath = path.join(config.outputPath, filename);
    fs.writeFileSync(filepath, document);

    // Save signature if provided
    if (signature) {
      const signatureFile = `${filename}.sig`;
      fs.writeFileSync(path.join(config.outputPath, signatureFile), signature);
    }

    // Save metadata
    const metadata = {
      id: sbomId,
      created: new Date().toISOString(),
      format: config.format,
      signed: !!signature,
      project: config.projectName,
      version: config.version
    };
    
    fs.writeFileSync(
      path.join(config.outputPath, `${filename}.meta`),
      JSON.stringify(metadata, null, 2)
    );

    return filepath;
  }

  /**
   * Archive SBOM to S3
   */
  private async archiveSBOM(result: SBOMResult, document: string): Promise<void> {
    const bucket = process.env.SBOM_ARCHIVE_BUCKET || 'storytailor-sbom-archive';
    const key = `sbom/${result.id}/sbom.json`;

    try {
      await this.s3.putObject({
        Bucket: bucket,
        Key: key,
        Body: document,
        ContentType: 'application/json',
        Metadata: {
          'sbom-id': result.id,
          'project': 'storytailor',
          'timestamp': result.timestamp.toISOString(),
          'format': result.format
        }
      }).promise();

      console.log(`  ✅ SBOM archived to S3: s3://${bucket}/${key}`);
    } catch (error) {
      console.warn('  ⚠️  Failed to archive SBOM to S3:', error);
    }
  }

  /**
   * Generate SBOM report
   */
  private generateSBOMReport(result: SBOMResult, config: SBOMConfig): void {
    const report = `
# Software Bill of Materials (SBOM) Report
Generated: ${result.timestamp.toISOString()}

## Summary
- **Project**: ${config.projectName} v${config.version}
- **Format**: ${result.format}
- **Total Packages**: ${result.packages.length}
- **Signed**: ${result.signature ? '✅ Yes' : '❌ No'}

## License Analysis
- **Unique Licenses**: ${result.licenses.uniqueLicenses.length}
- **Unknown Licenses**: ${result.licenses.unknownLicenses.length}
- **Copyleft Packages**: ${result.licenses.copyleftPackages.length}

### License Distribution
${Object.entries(result.licenses.licenseDistribution)
  .sort(([,a], [,b]) => b - a)
  .map(([license, count]) => `- ${license}: ${count} packages`)
  .join('\n')}

## Vulnerability Summary
- **Total Vulnerabilities**: ${result.vulnerabilities.totalVulnerabilities}
- **Critical**: ${result.vulnerabilities.criticalCount}
- **High**: ${result.vulnerabilities.highCount}
- **Medium**: ${result.vulnerabilities.mediumCount}
- **Low**: ${result.vulnerabilities.lowCount}

${result.vulnerabilities.recommendedActions.length > 0 ? `
### Recommended Actions
${result.vulnerabilities.recommendedActions.map(action => `- ${action}`).join('\n')}
` : ''}

## Compliance Status
**Overall Compliance**: ${result.compliance.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}

${result.compliance.violations.length > 0 ? `
### Violations
${result.compliance.violations.map(v => 
  `- **${v.severity.toUpperCase()}**: ${v.description}\n  - Package: ${v.package}\n  - Remediation: ${v.remediation}`
).join('\n\n')}
` : ''}

${result.compliance.warnings.length > 0 ? `
### Warnings
${result.compliance.warnings.map(w => `- ${w.message} (${w.package})`).join('\n')}
` : ''}

${result.compliance.attributionRequired.length > 0 ? `
### Attribution Required
The following packages require attribution in documentation:
${result.compliance.attributionRequired.map(pkg => `- ${pkg.name} (${pkg.license})`).join('\n')}
` : ''}

## Output
- **SBOM File**: ${result.outputFile}
${result.signature ? `- **Signature File**: ${result.outputFile}.sig` : ''}
`;

    console.log(report);
    
    // Save report
    const reportPath = result.outputFile.replace('.json', '-report.md');
    fs.writeFileSync(reportPath, report);
  }

  // Helper methods
  private initializeLicenseMatrix(): Record<string, Record<string, boolean>> {
    return {
      'MIT': { 'MIT': true, 'Apache-2.0': true, 'BSD-3-Clause': true },
      'Apache-2.0': { 'MIT': true, 'Apache-2.0': true, 'BSD-3-Clause': true },
      'GPL-3.0': { 'GPL-3.0': true, 'AGPL-3.0': true },
      'BSD-3-Clause': { 'MIT': true, 'Apache-2.0': true, 'BSD-3-Clause': true }
    };
  }

  private findPackageJsonFiles(): string[] {
    const files: string[] = [];
    
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name === 'package.json') {
          files.push(fullPath);
        }
      }
    };

    walkDir(process.cwd());
    return files;
  }

  private getProjectVersion(): string {
    try {
      const rootPackageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      return rootPackageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  private deduplicatePackages(packages: PackageInfo[]): PackageInfo[] {
    const seen = new Map<string, PackageInfo>();
    
    for (const pkg of packages) {
      const key = `${pkg.name}@${pkg.version}`;
      if (!seen.has(key)) {
        seen.set(key, pkg);
      }
    }

    return Array.from(seen.values());
  }

  private async calculatePackageChecksums(pkg: PackageInfo): Promise<{
    sha256: string;
    sha512: string;
  }> {
    // In a real implementation, this would calculate actual checksums
    // from the package files
    const data = `${pkg.name}@${pkg.version}`;
    
    return {
      sha256: crypto.createHash('sha256').update(data).digest('hex'),
      sha512: crypto.createHash('sha512').update(data).digest('hex')
    };
  }

  private checkLicenseCompatibility(license1: string, license2: string): string | null {
    if (!this.licenseCompatibilityMatrix[license1]) {
      return null;
    }

    if (!this.licenseCompatibilityMatrix[license1][license2]) {
      return `${license1} is incompatible with ${license2}`;
    }

    return null;
  }

  private requiresAttribution(license: string): boolean {
    const attributionLicenses = [
      'MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause',
      'CC-BY-3.0', 'CC-BY-4.0'
    ];
    return attributionLicenses.includes(license);
  }

  private getEmptyVulnerabilityReport(): VulnerabilityReport {
    return {
      totalVulnerabilities: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      affectedPackages: [],
      recommendedActions: []
    };
  }

  private generateSigningKey(): string {
    // In production, this would use a proper key management system
    return crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }).privateKey;
  }

  private getPublicKey(): string {
    // In production, this would retrieve from key management
    return '';
  }

  private isValidSBOMFormat(sbom: any): boolean {
    return (sbom.bomFormat === 'CycloneDX' && sbom.specVersion) ||
           (sbom.spdxVersion && sbom.spdxVersion.startsWith('SPDX-'));
  }

  private convertToPackageInfo(component: any): PackageInfo {
    return {
      name: component.name,
      version: component.version,
      license: component.licenses?.[0]?.license?.id || 'UNKNOWN',
      repository: component.externalReferences?.find((r: any) => r.type === 'vcs')?.url,
      dependencies: {},
      checksums: {
        sha256: component.hashes?.find((h: any) => h.alg === 'SHA-256')?.content || '',
        sha512: component.hashes?.find((h: any) => h.alg === 'SHA-512')?.content || ''
      }
    };
  }
}