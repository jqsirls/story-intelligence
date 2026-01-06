# Security Framework

## Overview
Comprehensive security and privacy protection framework ensuring COPPA/GDPR compliance and data protection for children's storytelling platform.

## Key Features
- **Voice Data Encryption**: End-to-end encryption for voice recordings
- **PII Detection**: Automatic detection and protection of personally identifiable information
- **COPPA Compliance**: Automated compliance with Children's Online Privacy Protection Act
- **GDPR Compliance**: Full compliance with General Data Protection Regulation
- **Data Retention**: Automated data retention and deletion policies

## Security Components
1. **Encryption Services**: Voice data, conversation logs, user profiles
2. **Privacy Protection**: PII detection, data anonymization, consent management
3. **Compliance Monitoring**: Automated compliance checking and reporting
4. **Access Control**: Role-based access control and audit logging

## Usage
```typescript
import { SecurityFramework } from '@storytailor/security-framework';

const security = new SecurityFramework({
  encryption: {
    algorithm: 'AES-256-GCM',
    keyRotation: '30d'
  },
  compliance: {
    coppa: true,
    gdpr: true,
    ccpa: true
  }
});

// Encrypt sensitive data
const encryptedData = await security.encrypt(sensitiveData, 'voice-recording');

// Detect PII in content
const piiResult = await security.detectPII(userContent);

// Check compliance
const complianceStatus = await security.checkCompliance('coppa', userData);
```

## Services

### VoiceDataEncryption
Encrypts and decrypts voice recordings with rotating keys.

### PIIDetectionService
Identifies and masks personally identifiable information.

### DataRetentionService
Manages automated data deletion based on retention policies.

### ConsentManagementService
Handles user consent for data processing.

### ComplianceMonitor
Monitors and reports on regulatory compliance.

## Encryption
- **Algorithm**: AES-256-GCM for symmetric encryption
- **Key Management**: AWS KMS with automatic rotation
- **Transport**: TLS 1.3 for all data in transit
- **Storage**: Encrypted at rest with customer-managed keys

## Privacy Features
- **Data Minimization**: Collect only necessary data
- **Purpose Limitation**: Use data only for stated purposes
- **Storage Limitation**: Automatic deletion after retention period
- **Accuracy**: Mechanisms to keep data accurate and up-to-date
- **Security**: Appropriate technical and organizational measures

## Compliance Standards
- **COPPA**: Children's Online Privacy Protection Act
- **GDPR**: General Data Protection Regulation
- **CCPA**: California Consumer Privacy Act
- **FERPA**: Family Educational Rights and Privacy Act (for educational features)

## Configuration
```typescript
const config = {
  encryption: {
    algorithm: 'AES-256-GCM',
    keyRotationDays: 30,
    keyDerivationIterations: 100000
  },
  privacy: {
    dataRetentionDays: 365,
    anonymizationDelay: 30,
    consentExpiryDays: 365
  },
  compliance: {
    auditLogRetentionDays: 2555, // 7 years
    complianceCheckInterval: '24h',
    reportingEnabled: true
  }
};
```

## Data Subject Rights (GDPR)
- **Right to Access**: Users can request their data
- **Right to Rectification**: Users can correct their data
- **Right to Erasure**: Users can request data deletion
- **Right to Portability**: Users can export their data
- **Right to Object**: Users can object to processing

## Testing
```bash
npm test
```

## Security Audits
Regular security audits are performed by third-party security firms. Contact security@storytailor.com for audit reports.

## Incident Response
For security incidents: security-incident@storytailor.com
For privacy concerns: privacy@storytailor.com