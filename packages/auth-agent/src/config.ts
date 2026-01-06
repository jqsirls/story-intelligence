import { AuthAgentConfig } from './types';

/**
 * Default configuration for AuthAgent
 */
export const defaultConfig: AuthAgentConfig = {
  supabase: {
    url: process.env.SUPABASE_URL || 'http://localhost:54321',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    issuer: process.env.JWT_ISSUER || 'storytailor.com',
    audience: process.env.JWT_AUDIENCE || 'storytailor-users',
    accessTokenTtl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL || '3600'), // 60 minutes
    refreshTokenTtl: parseInt(process.env.JWT_REFRESH_TOKEN_TTL || '1209600'), // 14 days
  },
  voiceCode: {
    length: 6,
    ttl: parseInt(process.env.VOICE_CODE_TTL || '300'), // 5 minutes
    maxAttempts: parseInt(process.env.VOICE_CODE_MAX_ATTEMPTS || '3'),
  },
  rateLimit: {
    maxRequestsPerMinute: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  },
  magicLink: {
    baseUrl: process.env.MAGIC_LINK_BASE_URL || 'https://storytailor.com',
    ttl: parseInt(process.env.MAGIC_LINK_TTL || '900'), // 15 minutes
  },
};

/**
 * Validate configuration
 */
export function validateConfig(config: AuthAgentConfig): void {
  const errors: string[] = [];

  if (!config.supabase.url) {
    errors.push('Supabase URL is required');
  }

  if (!config.supabase.serviceKey) {
    errors.push('Supabase service key is required');
  }

  if (!config.redis.url) {
    errors.push('Redis URL is required');
  }

  if (!config.jwt.secret) {
    errors.push('JWT secret is required');
  }

  if (config.jwt.secret.length < 32) {
    errors.push('JWT secret must be at least 32 characters long');
  }

  if (config.voiceCode.length !== 6) {
    errors.push('Voice code length must be 6 digits');
  }

  if (config.voiceCode.ttl < 60) {
    errors.push('Voice code TTL must be at least 60 seconds');
  }

  if (config.voiceCode.maxAttempts < 1) {
    errors.push('Voice code max attempts must be at least 1');
  }

  if (config.jwt.accessTokenTtl < 300) {
    errors.push('Access token TTL must be at least 300 seconds (5 minutes)');
  }

  if (config.jwt.refreshTokenTtl < 3600) {
    errors.push('Refresh token TTL must be at least 3600 seconds (1 hour)');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): AuthAgentConfig {
  const config = { ...defaultConfig };
  validateConfig(config);
  return config;
}