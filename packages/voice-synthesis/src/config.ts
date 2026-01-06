import { VoiceEngineConfig } from './types';

/**
 * Create default voice engine configuration
 */
export function createDefaultConfig(): VoiceEngineConfig {
  return {
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      baseUrl: process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io',
      model: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5',
      voiceId: process.env.ELEVENLABS_VOICE_ID || '',
      stability: parseFloat(process.env.ELEVENLABS_STABILITY || '0.5'),
      similarityBoost: parseFloat(process.env.ELEVENLABS_SIMILARITY_BOOST || '0.8'),
      style: parseFloat(process.env.ELEVENLABS_STYLE || '0.0'),
      useSpeakerBoost: process.env.ELEVENLABS_SPEAKER_BOOST === 'true',
      websocketUrl: process.env.ELEVENLABS_WS_URL || 'wss://api.elevenlabs.io',
      maxRetries: parseInt(process.env.ELEVENLABS_MAX_RETRIES || '3'),
      timeoutMs: parseInt(process.env.ELEVENLABS_TIMEOUT_MS || '30000'),
    },
    polly: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      roleArn: process.env.POLLY_ROLE_ARN,
      voiceId: process.env.POLLY_VOICE_ID || 'Matthew',
      engine: (process.env.POLLY_ENGINE as 'neural' | 'standard') || 'neural',
      outputFormat: (process.env.POLLY_OUTPUT_FORMAT as 'pcm' | 'mp3') || 'pcm',
      sampleRate: process.env.POLLY_SAMPLE_RATE || '16000',
      textType: (process.env.POLLY_TEXT_TYPE as 'text' | 'ssml') || 'text',
      maxRetries: parseInt(process.env.POLLY_MAX_RETRIES || '3'),
      timeoutMs: parseInt(process.env.POLLY_TIMEOUT_MS || '10000'),
    },
    failover: {
      latencyThresholdMs: parseInt(process.env.FAILOVER_LATENCY_THRESHOLD_MS || '250'),
      errorThresholdCount: parseInt(process.env.FAILOVER_ERROR_THRESHOLD || '3'),
      cooldownMs: parseInt(process.env.FAILOVER_COOLDOWN_MS || '60000'),
      enableCircuitBreaker: process.env.FAILOVER_CIRCUIT_BREAKER !== 'false',
    },
    cost: {
      maxCostPerRequest: parseFloat(process.env.MAX_COST_PER_REQUEST || '0.10'),
      dailyBudgetLimit: parseFloat(process.env.DAILY_BUDGET_LIMIT || '100.00'),
      enableCostTracking: process.env.ENABLE_COST_TRACKING !== 'false',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'voice_synthesis',
      metricsRetentionMs: parseInt(process.env.METRICS_RETENTION_MS || '86400000'), // 24 hours
    },
  };
}

/**
 * Create configuration for development/testing
 */
export function createTestConfig(): VoiceEngineConfig {
  return {
    elevenlabs: {
      apiKey: 'test-api-key',
      baseUrl: 'https://api.elevenlabs.io',
      model: 'eleven_flash_v2_5',
      voiceId: 'test-voice-id',
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0.0,
      useSpeakerBoost: false,
      websocketUrl: 'wss://api.elevenlabs.io',
      maxRetries: 3,
      timeoutMs: 30000,
    },
    polly: {
      region: 'us-east-1',
      voiceId: 'Matthew',
      engine: 'neural',
      outputFormat: 'pcm',
      sampleRate: '16000',
      textType: 'text',
      maxRetries: 3,
      timeoutMs: 10000,
    },
    failover: {
      latencyThresholdMs: 250,
      errorThresholdCount: 3,
      cooldownMs: 60000,
      enableCircuitBreaker: true,
    },
    cost: {
      maxCostPerRequest: 0.10,
      dailyBudgetLimit: 100.00,
      enableCostTracking: true,
    },
    redis: {
      url: 'redis://localhost:6379',
      keyPrefix: 'voice_synthesis_test',
      metricsRetentionMs: 3600000, // 1 hour for testing
    },
  };
}

/**
 * Validate required environment variables
 */
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    'ELEVENLABS_API_KEY',
    'ELEVENLABS_VOICE_ID',
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
export function getValidatedConfig(): VoiceEngineConfig {
  const envCheck = validateEnvironment();
  
  if (!envCheck.valid) {
    throw new Error(
      `Missing required environment variables: ${envCheck.missing.join(', ')}\n` +
      'Please set these variables before initializing the voice service.'
    );
  }

  return createDefaultConfig();
}