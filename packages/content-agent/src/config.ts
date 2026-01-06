import { ContentAgentConfig } from './types';

export function createConfig(): ContentAgentConfig {
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'REDIS_URL'
  ];

  // Check for required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_ANON_KEY!,
    redisUrl: process.env.REDIS_URL!,
    moderationEnabled: process.env.MODERATION_ENABLED !== 'false',
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info'
  };
}

export const defaultConfig = createConfig;