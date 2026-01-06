import { SmartHomeAgentConfig } from './types';

export const createSmartHomeConfig = (overrides: Partial<SmartHomeAgentConfig> = {}): SmartHomeAgentConfig => {
  const defaultConfig: SmartHomeAgentConfig = {
    database: {
      url: process.env.SUPABASE_URL || 'http://localhost:54321',
      apiKey: process.env.SUPABASE_ANON_KEY || ''
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      keyPrefix: 'smart-home'
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyRotationInterval: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    tokenRefresh: {
      refreshBeforeExpiry: 5, // 5 minutes
      maxRetryAttempts: 3,
      retryBackoffMs: 1000
    },
    privacy: {
      dataRetentionHours: 24,
      enableUsageAnalytics: false,
      requireParentalConsent: true
    },
    devices: {
      philipsHue: {
        discoveryTimeout: 30000, // 30 seconds
        maxBridgesPerUser: 3
      },
      nanoleaf: {
        authTimeout: 60000 // 60 seconds
      }
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      enableAuditLog: true
    }
  };

  return {
    ...defaultConfig,
    ...overrides,
    database: { ...defaultConfig.database, ...overrides.database },
    redis: { ...defaultConfig.redis, ...overrides.redis },
    encryption: { ...defaultConfig.encryption, ...overrides.encryption },
    tokenRefresh: { ...defaultConfig.tokenRefresh, ...overrides.tokenRefresh },
    privacy: { ...defaultConfig.privacy, ...overrides.privacy },
    devices: { 
      ...defaultConfig.devices, 
      ...overrides.devices,
      philipsHue: { ...defaultConfig.devices.philipsHue, ...overrides.devices?.philipsHue },
      nanoleaf: { ...defaultConfig.devices.nanoleaf, ...overrides.devices?.nanoleaf }
    },
    logging: { ...defaultConfig.logging, ...overrides.logging }
  };
};

export const validateSmartHomeConfig = (config: SmartHomeAgentConfig): void => {
  if (!config.database.url) {
    throw new Error('Database URL is required');
  }
  
  if (!config.database.apiKey) {
    throw new Error('Database API key is required');
  }
  
  if (!config.redis.url) {
    throw new Error('Redis URL is required');
  }
  
  if (config.tokenRefresh.refreshBeforeExpiry <= 0) {
    throw new Error('Token refresh time must be positive');
  }
  
  if (config.privacy.dataRetentionHours <= 0) {
    throw new Error('Data retention hours must be positive');
  }
};