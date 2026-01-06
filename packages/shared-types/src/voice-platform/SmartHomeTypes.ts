// Smart home integration types
import { ConnectedDevice } from './StandardizedTypes';

export type DeviceType = 'philips_hue' | 'nanoleaf' | 'lifx' | 'govee' | 'custom_device';

export interface DeviceTokenData {
  deviceId: string;
  accessToken: string;
  expiresAt?: string;
  refreshToken?: string;
  tokenType: string;
  scope?: string[];
  metadata?: Record<string, any>;
}

export interface DeviceTokenRecord {
  id: string;
  userId: string;
  deviceId: string;
  deviceType: DeviceType;
  encryptedToken: string;
  tokenType: string;
  expiresAt?: string;
  refreshToken?: string;
  lastRefreshed: string;
  refreshAttempts: number;
  status: 'active' | 'expired' | 'revoked';
}

export interface DeviceConnectionConfig {
  deviceType: DeviceType;
  userId: string;
  roomId: string;
  roomName?: string;
  platform: string;
  dataMinimization: {
    collectOnlyLighting: boolean;
    excludeUsagePatterns: boolean;
    excludeDeviceMetadata: boolean;
  };
  consentScope: {
    lightingControl: boolean;
    ambientResponse: boolean;
    narrativeSynchronization: boolean;
  };
  retentionPolicy: {
    connectionLogs: string; // "24_hours"
    lightingHistory: string; // "none" or "7_days"
    errorLogs: string; // "30_days"
  };
}

export interface LightingState {
  brightness: number; // 0-100
  color: string; // Hex color
  saturation: number; // 0-100
}

export interface LightingProfile extends LightingState {
  transitionDuration?: number; // milliseconds
}

export interface LightingTransition {
  color?: string;
  brightness?: number;
  saturation?: number;
  transition: number; // milliseconds
}

export interface StoryLightingProfile {
  storyType: string;
  baseProfile: LightingState;
  narrativeEvents: {
    [eventType: string]: LightingTransition;
  };
  ageAppropriate: {
    brightness: { min: number; max: number };
    colorRestrictions: string[];
    transitionSpeed: 'gentle' | 'moderate' | 'dynamic';
  };
  platformCompatibility: string[];
}

export interface EnvironmentalCue {
  type: 'lighting' | 'sound' | 'temperature';
  action: 'set' | 'brighten' | 'dim' | 'change_color' | 'fade';
  color?: string;
  brightness?: number;
  duration: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface DeviceConnection {
  deviceId: string;
  deviceType: DeviceType;
  roomId: string;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: string;
  errorMessage?: string;
}

export interface HueDevice {
  id: string;
  name: string;
  type: string;
  state: {
    on: boolean;
    bri: number; // 0-254
    hue: number; // 0-65535
    sat: number; // 0-254
    reachable: boolean;
  };
  capabilities: string[];
}

export interface HueBridgeAuth {
  username: string;
  clientkey?: string;
}

export interface HueAuthResult {
  success: boolean;
  requiresButtonPress?: boolean;
  message?: string;
  tokenData?: DeviceTokenData;
  bridgeInfo?: HueBridgeInfo;
}

export interface HueBridgeInfo {
  id: string;
  name: string;
  modelid: string;
  swversion: string;
  ipaddress: string;
}

export interface MinimalDeviceData {
  deviceId: string; // Hashed for privacy
  roomId: string;
  connectionStatus: 'connected' | 'disconnected';
  lastUsed: string; // For cleanup only
  // NO collection of:
  // - Usage patterns
  // - Detailed device metadata
  // - User behavior analytics
  // - Room occupancy data
}

export interface IoTConsentRecord {
  userId: string;
  deviceType: DeviceType;
  deviceId: string;
  consentGiven: boolean;
  consentScope: {
    basicLighting: boolean;
    storySync: boolean;
    ambientResponse: boolean;
  };
  parentalConsent: boolean; // Required for COPPA-protected users
  consentMethod: 'voice' | 'app' | 'web';
  consentTimestamp: string;
  withdrawalTimestamp?: string;
  dataRetentionPreference: 'minimal' | 'none';
  platform: string;
}

export interface SmartHomeConfig {
  encryption: {
    algorithm: string;
    keyRotationInterval: number;
  };
  tokenRefresh: {
    refreshBeforeExpiry: number; // minutes
    maxRetryAttempts: number;
    retryBackoffMs: number;
  };
  privacy: {
    dataRetentionHours: number;
    enableUsageAnalytics: boolean;
    requireParentalConsent: boolean;
  };
  devices: {
    philipsHue: {
      discoveryTimeout: number;
      maxBridgesPerUser: number;
    };
    nanoleaf: {
      authTimeout: number;
    };
  };
}

export interface DeviceManager {
  deviceType: DeviceType;
  
  // Device discovery and authentication
  discoverDevices(): Promise<any[]>;
  authenticateDevice(config: any): Promise<DeviceTokenData>;
  refreshToken(refreshToken: string): Promise<DeviceTokenData | null>;
  
  // Lighting control
  setRoomLighting(userId: string, roomId: string, profile: LightingProfile): Promise<void>;
  createGradualTransition(userId: string, roomId: string, from: LightingState, to: LightingState, duration: number): Promise<void>;
  
  // Device management
  getRoomLights(userId: string, roomId: string): Promise<any[]>;
  testConnection(userId: string, deviceId: string): Promise<boolean>;
  disconnectDevice(userId: string, deviceId: string): Promise<void>;
}

export interface TokenStore {
  store(tokenRecord: Omit<DeviceTokenRecord, 'id'>): Promise<string>;
  get(userId: string, deviceType: DeviceType, deviceId: string): Promise<DeviceTokenRecord | null>;
  update(id: string, updates: Partial<DeviceTokenRecord>): Promise<void>;
  markAsExpired(id: string): Promise<void>;
  incrementRefreshAttempts(id: string): Promise<void>;
  cleanup(): Promise<number>;
}

export interface EncryptionService {
  encrypt(data: any): Promise<string>;
  decrypt(encryptedData: string): Promise<any>;
  rotateKeys(): Promise<void>;
  getCurrentKeyId(): string;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  restrictions?: string[];
}

export interface PrivacyValidation {
  consentValid: boolean;
  ageAppropriate: boolean;
  parentalApprovalRequired: boolean;
  dataMinimizationApplied: boolean;
  retentionPolicyEnforced: boolean;
}

export interface DeviceAccessAudit {
  userId: string;
  connectedDevices: ConnectedDevice[];
  consentHistory: IoTConsentRecord[];
  dataAccess: {
    lastAccessed: string;
    accessFrequency: number;
    dataTypesAccessed: string[];
  };
  privacyCompliance: {
    coppaCompliant: boolean;
    gdprCompliant: boolean;
    dataMinimized: boolean;
  };
}