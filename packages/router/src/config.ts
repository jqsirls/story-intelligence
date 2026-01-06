import { RouterConfig } from './types';

export type { RouterConfig };

/**
 * Create default router configuration
 */
export function createDefaultConfig(): RouterConfig {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4-1106-preview',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'router',
      defaultTtl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600'), // 1 hour
    },
    agents: {
      auth: {
        endpoint: process.env.AUTH_AGENT_ENDPOINT || 'http://localhost:3001/auth',
        timeout: parseInt(process.env.AUTH_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.AUTH_AGENT_RETRIES || '3'),
      },
      content: {
        endpoint: process.env.CONTENT_AGENT_ENDPOINT || 'http://localhost:3002/content',
        timeout: parseInt(process.env.CONTENT_AGENT_TIMEOUT || '10000'),
        retries: parseInt(process.env.CONTENT_AGENT_RETRIES || '3'),
      },
      library: {
        endpoint: process.env.LIBRARY_AGENT_ENDPOINT || 'http://localhost:3003/library',
        timeout: parseInt(process.env.LIBRARY_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.LIBRARY_AGENT_RETRIES || '3'),
      },
      emotion: {
        endpoint: process.env.EMOTION_AGENT_ENDPOINT || 'http://localhost:3004/emotion',
        timeout: parseInt(process.env.EMOTION_AGENT_TIMEOUT || '3000'),
        retries: parseInt(process.env.EMOTION_AGENT_RETRIES || '2'),
      },
      commerce: {
        endpoint: process.env.COMMERCE_AGENT_ENDPOINT || 'http://localhost:3005/commerce',
        timeout: parseInt(process.env.COMMERCE_AGENT_TIMEOUT || '8000'),
        retries: parseInt(process.env.COMMERCE_AGENT_RETRIES || '3'),
      },
      insights: {
        endpoint: process.env.INSIGHTS_AGENT_ENDPOINT || 'http://localhost:3006/insights',
        timeout: parseInt(process.env.INSIGHTS_AGENT_TIMEOUT || '15000'),
        retries: parseInt(process.env.INSIGHTS_AGENT_RETRIES || '2'),
      },
    },
    circuitBreaker: {
      failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5'),
      resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '60000'), // 1 minute
      monitoringPeriod: parseInt(process.env.CIRCUIT_BREAKER_MONITORING_PERIOD || '300000'), // 5 minutes
    },
    fallback: {
      enabled: process.env.FALLBACK_ENABLED !== 'false',
      defaultResponse: process.env.FALLBACK_DEFAULT_RESPONSE || 
        "I'm having trouble right now, but let's try creating a story together! What kind of adventure should we go on?",
      maxRetries: parseInt(process.env.FALLBACK_MAX_RETRIES || '2'),
    },
  };
}

/**
 * Create configuration for testing
 */
export function createTestConfig(): RouterConfig {
  return {
    openai: {
      apiKey: 'test-api-key',
      model: 'gpt-4-1106-preview',
      maxTokens: 500,
      temperature: 0.3,
    },
    redis: {
      url: 'redis://localhost:6379',
      keyPrefix: 'router_test',
      defaultTtl: 300, // 5 minutes for testing
    },
    agents: {
      auth: {
        endpoint: 'http://localhost:3001/auth',
        timeout: 2000,
        retries: 1,
      },
      content: {
        endpoint: 'http://localhost:3002/content',
        timeout: 3000,
        retries: 1,
      },
      library: {
        endpoint: 'http://localhost:3003/library',
        timeout: 2000,
        retries: 1,
      },
      emotion: {
        endpoint: 'http://localhost:3004/emotion',
        timeout: 1000,
        retries: 1,
      },
      commerce: {
        endpoint: 'http://localhost:3005/commerce',
        timeout: 2000,
        retries: 1,
      },
      insights: {
        endpoint: 'http://localhost:3006/insights',
        timeout: 3000,
        retries: 1,
      },
    },
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 10000, // 10 seconds for testing
      monitoringPeriod: 30000, // 30 seconds for testing
    },
    fallback: {
      enabled: true,
      defaultResponse: 'Test fallback response',
      maxRetries: 1,
    },
  };
}

/**
 * Validate required environment variables
 */
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    'OPENAI_API_KEY',
    'REDIS_URL',
  ];

  const missing = required.filter(key => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get configuration with environment validation
 */
export function getValidatedConfig(): RouterConfig {
  const envCheck = validateEnvironment();
  
  if (!envCheck.valid) {
    throw new Error(
      `Missing required environment variables: ${envCheck.missing.join(', ')}\n` +
      'Please set these variables before initializing the router.'
    );
  }

  return createDefaultConfig();
}