export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  keyRotationInterval: number; // in milliseconds
  keyDerivationRounds: number;
}

export interface VoiceDataEncryption {
  encryptedData: string;
  iv: string;
  authTag: string;
  keyId: string;
  timestamp: number;
}

export interface DifferentialPrivacyConfig {
  epsilon: number; // Privacy budget
  delta: number; // Failure probability
  sensitivity: number; // Global sensitivity
  mechanism: 'laplace' | 'gaussian' | 'exponential';
}

export interface PIIDetectionResult {
  hasPII: boolean;
  detectedTypes: PIIType[];
  redactedText: string;
  confidence: number;
}

export enum PIIType {
  EMAIL = 'email',
  PHONE = 'phone',
  SSN = 'ssn',
  NAME = 'name',
  ADDRESS = 'address',
  CREDIT_CARD = 'credit_card',
  DATE_OF_BIRTH = 'date_of_birth',
  IP_ADDRESS = 'ip_address'
}

export interface BlockchainConsentRecord {
  consentId: string;
  userId: string;
  purposes: string[];
  timestamp: number;
  signature: string;
  transactionHash: string;
  blockNumber: number;
  isRevoked: boolean;
  revokedAt?: number;
}

export interface ComplianceMonitoringEvent {
  eventId: string;
  eventType: 'data_access' | 'consent_change' | 'data_deletion' | 'privacy_violation';
  userId: string;
  agentId: string;
  timestamp: number;
  metadata: Record<string, any>;
  complianceStatus: 'compliant' | 'violation' | 'warning';
  riskScore: number;
}

export interface ZeroTrustPolicy {
  policyId: string;
  name: string;
  description: string;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  priority: number;
  enabled: boolean;
}

export interface PolicyCondition {
  type: 'user_age' | 'data_type' | 'time_range' | 'location' | 'device_type';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface PolicyAction {
  type: 'allow' | 'deny' | 'encrypt' | 'audit' | 'notify';
  parameters: Record<string, any>;
}

export interface SecurityMetrics {
  encryptionOperations: number;
  decryptionOperations: number;
  piiDetections: number;
  complianceViolations: number;
  keyRotations: number;
  consentChanges: number;
  averageResponseTime: number;
  errorRate: number;
}