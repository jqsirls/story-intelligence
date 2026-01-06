// Smart Home Agent specific types
import { 
  DeviceType, 
  DeviceTokenData, 
  LightingProfile, 
  LightingState, 
  StoryLightingProfile,
  SmartHomeConfig,
  DeviceManager,
  EnvironmentalCue
} from '@alexa-multi-agent/shared-types';

export * from '@alexa-multi-agent/shared-types';

export interface SmartHomeAgentConfig {
  database: {
    url: string;
    apiKey: string;
  };
  redis: {
    url: string;
    keyPrefix: string;
  };
  logging: {
    level: string;
    enableAuditLog: boolean;
  };
  encryption: {
    algorithm: string;
    keyRotationInterval: number;
  };
  tokenRefresh: {
    refreshBeforeExpiry: number;
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

export interface EnvironmentProfile {
  roomId: string;
  storyType: string;
  lightingProfile: LightingProfile;
  environmentalCues: EnvironmentalCue[];
  duration?: number;
  ageRestrictions?: AgeRestrictions;
}

export interface AgeRestrictions {
  maxBrightness: number;
  allowedColors: string[];
  forbiddenColors: string[];
  maxTransitionSpeed: number;
  requiresParentalApproval: boolean;
}

export interface DeviceDiscoveryResult {
  devices: DiscoveredDevice[];
  platform: string;
  discoveryMethod: string;
  timestamp: string;
}

export interface DiscoveredDevice {
  id: string;
  name: string;
  type: DeviceType;
  capabilities: string[];
  requiresAuth: boolean;
  authMethod?: string;
  metadata?: Record<string, any>;
}

export interface LightingCommand {
  deviceId: string;
  roomId: string;
  lightingState: LightingState;
  transitionDuration?: number;
  priority: 'low' | 'normal' | 'high';
}

export interface NarrativeSync {
  storyId: string;
  currentBeat: number;
  environmentalCues: EnvironmentalCue[];
  syncTimestamp: string;
}

export interface SmartHomeMetrics {
  connectedDevices: number;
  activeRooms: number;
  dailyCommands: number;
  averageResponseTime: number;
  errorRate: number;
  userSatisfaction?: number;
}

export interface DeviceHealthCheck {
  deviceId: string;
  status: 'healthy' | 'warning' | 'error';
  lastChecked: string;
  responseTime?: number;
  errorMessage?: string;
  recommendations?: string[];
}

export interface RoomConfiguration {
  roomId: string;
  roomName: string;
  devices: string[]; // Device IDs
  defaultProfile: LightingProfile;
  storyProfiles: Record<string, LightingProfile>;
  ageRestrictions?: AgeRestrictions;
  privacySettings: {
    dataRetention: string;
    analyticsEnabled: boolean;
    parentalControlsEnabled: boolean;
  };
}