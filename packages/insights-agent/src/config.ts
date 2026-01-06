import { InsightsConfig } from './types';

export const createInsightsConfig = (overrides: Partial<InsightsConfig> = {}): InsightsConfig => {
  const defaultConfig: InsightsConfig = {
    database: {
      url: process.env.SUPABASE_URL || 'http://localhost:54321',
      apiKey: process.env.SUPABASE_ANON_KEY || ''
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      keyPrefix: 'insights'
    },
    analysis: {
      defaultTimeRange: 30, // 30 days
      minDataPoints: 5,
      confidenceThreshold: 0.3
    },
    notifications: {
      enabled: process.env.NODE_ENV === 'production',
      riskFactorThreshold: 0.7,
      emailService: {
        apiKey: process.env.SENDGRID_API_KEY || '',
        fromEmail: process.env.FROM_EMAIL || 'insights@storytailor.com'
      }
    },
    external: {
      amazon: {
        apiKey: process.env.AMAZON_API_KEY || '',
        associateTag: process.env.AMAZON_ASSOCIATE_TAG || ''
      },
      educational: {
        sources: [
          'https://www.khanacademy.org',
          'https://www.commonlit.org',
          'https://www.readworks.org'
        ]
      }
    }
  };

  return {
    ...defaultConfig,
    ...overrides,
    database: { ...defaultConfig.database, ...overrides.database },
    redis: { ...defaultConfig.redis, ...overrides.redis },
    analysis: { ...defaultConfig.analysis, ...overrides.analysis },
    notifications: { ...defaultConfig.notifications, ...overrides.notifications },
    external: { ...defaultConfig.external, ...overrides.external }
  };
};

export const validateConfig = (config: InsightsConfig): void => {
  if (!config.database.url) {
    throw new Error('Database URL is required');
  }
  
  if (!config.database.apiKey) {
    throw new Error('Database API key is required');
  }
  
  if (!config.redis.url) {
    throw new Error('Redis URL is required');
  }
  
  if (config.analysis.defaultTimeRange <= 0) {
    throw new Error('Default time range must be positive');
  }
  
  if (config.analysis.minDataPoints <= 0) {
    throw new Error('Minimum data points must be positive');
  }
  
  if (config.analysis.confidenceThreshold < 0 || config.analysis.confidenceThreshold > 1) {
    throw new Error('Confidence threshold must be between 0 and 1');
  }
};