import { RouterConfig } from './types';

export type { RouterConfig };

/**
 * Create default router configuration
 */
export function createDefaultConfig(): RouterConfig {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-5',
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
        endpoint: process.env.AUTH_AGENT_ENDPOINT || 'https://d43qck2ware2japqdze7scglqq0rfync.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.AUTH_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.AUTH_AGENT_RETRIES || '3'),
      },
      content: {
        endpoint: process.env.CONTENT_AGENT_ENDPOINT || 'https://trnger2opr6g5iug47h7hh5rlu0yiauo.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.CONTENT_AGENT_TIMEOUT || '120000'),
        retries: parseInt(process.env.CONTENT_AGENT_RETRIES || '2'),
      },
      library: {
        endpoint: process.env.LIBRARY_AGENT_ENDPOINT || 'https://krtrmmkg3vbffqwh3imitrz63m0qzgli.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.LIBRARY_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.LIBRARY_AGENT_RETRIES || '3'),
      },
      emotion: {
        endpoint: process.env.EMOTION_AGENT_ENDPOINT || 'https://izkplgtet5edsh3bflql6a6bze0gklgw.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.EMOTION_AGENT_TIMEOUT || '10000'),
        retries: parseInt(process.env.EMOTION_AGENT_RETRIES || '2'),
      },
      commerce: {
        endpoint: process.env.COMMERCE_AGENT_ENDPOINT || 'https://knmozto5bumqhuemxfooqirrza0zycvr.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.COMMERCE_AGENT_TIMEOUT || '8000'),
        retries: parseInt(process.env.COMMERCE_AGENT_RETRIES || '3'),
      },
      insights: {
        endpoint: process.env.INSIGHTS_AGENT_ENDPOINT || 'https://5bccpj6yvzrhwwv6qppxtjcpdi0upbxd.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.INSIGHTS_AGENT_TIMEOUT || '15000'),
        retries: parseInt(process.env.INSIGHTS_AGENT_RETRIES || '2'),
      },
      smarthome: {
        endpoint: process.env.SMARTHOME_AGENT_ENDPOINT || 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/production/v1/smarthome',
        timeout: parseInt(process.env.SMARTHOME_AGENT_TIMEOUT || '10000'),
        retries: parseInt(process.env.SMARTHOME_AGENT_RETRIES || '2'),
      },
      personality: {
        endpoint: process.env.PERSONALITY_AGENT_ENDPOINT || 'https://jqk4hk2hcwf6lhstlxj6fxlxya0qnjrc.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.PERSONALITY_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.PERSONALITY_AGENT_RETRIES || '2'),
      },
      therapeutic: {
        endpoint: process.env.THERAPEUTIC_AGENT_ENDPOINT || 'https://u6wuabv6nwzk6jvv4ajmg3jwci0klhuc.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.THERAPEUTIC_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.THERAPEUTIC_AGENT_RETRIES || '2'),
      },
      knowledgeBase: {
        endpoint: process.env.KNOWLEDGE_BASE_AGENT_ENDPOINT || 'https://4n7nmnuggvfskk7i3tzeq43zlu0bzvev.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.KNOWLEDGE_BASE_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.KNOWLEDGE_BASE_AGENT_RETRIES || '2'),
      },
      localization: {
        endpoint: process.env.LOCALIZATION_AGENT_ENDPOINT || 'https://ufkknefkwqz4wkfgbvuabcb7m40ofmqw.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.LOCALIZATION_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.LOCALIZATION_AGENT_RETRIES || '2'),
      },
      accessibility: {
        endpoint: process.env.ACCESSIBILITY_AGENT_ENDPOINT || 'https://ky3jkp2pv2jvcygdbm4nctdkve0lmfhr.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.ACCESSIBILITY_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.ACCESSIBILITY_AGENT_RETRIES || '2'),
      },
      avatar: {
        endpoint: process.env.AVATAR_AGENT_ENDPOINT || 'https://jvp7hoxjuixsojy3evwu2p4nhu0hspxc.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.AVATAR_AGENT_TIMEOUT || '30000'),
        retries: parseInt(process.env.AVATAR_AGENT_RETRIES || '2'),
      },
      childSafety: {
        endpoint: process.env.CHILD_SAFETY_AGENT_ENDPOINT || 'https://4g4gqbmr6zfqjuzddwb2g2zqfu0hnjxw.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.CHILD_SAFETY_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.CHILD_SAFETY_AGENT_RETRIES || '2'),
      },
      smartHome: {
        endpoint: process.env.SMART_HOME_AGENT_ENDPOINT || 'https://5ohxl3xgzkcebsxhrlk2y55fkm0uuqlo.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.SMART_HOME_AGENT_TIMEOUT || '8000'),
        retries: parseInt(process.env.SMART_HOME_AGENT_RETRIES || '2'),
      },
      voiceSynthesis: {
        endpoint: process.env.VOICE_SYNTHESIS_AGENT_ENDPOINT || 'https://kf2xbi3pggqlhausa4kqhj4hwe0qlbok.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.VOICE_SYNTHESIS_AGENT_TIMEOUT || '30000'),
        retries: parseInt(process.env.VOICE_SYNTHESIS_AGENT_RETRIES || '2'),
      },
      analytics: {
        endpoint: process.env.ANALYTICS_AGENT_ENDPOINT || 'https://5i3rjcybqmlojkd4fgmffrnqey0gkutg.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.ANALYTICS_AGENT_TIMEOUT || '10000'),
        retries: parseInt(process.env.ANALYTICS_AGENT_RETRIES || '2'),
      },
      conversationIntelligence: {
        endpoint: process.env.CONVERSATION_AGENT_ENDPOINT || 'https://c3c3yz3evlrvvdhpsbsqrpfscq0rnbdo.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.CONVERSATION_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.CONVERSATION_AGENT_RETRIES || '2'),
      },
      educational: {
        endpoint: process.env.EDUCATIONAL_AGENT_ENDPOINT || 'https://4fajq4cz3dojnkfpybdijgcgma0bgtrs.lambda-url.us-east-2.on.aws/',
        timeout: parseInt(process.env.EDUCATIONAL_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.EDUCATIONAL_AGENT_RETRIES || '2'),
      },
      universal: {
        endpoint: process.env.UNIVERSAL_AGENT_ENDPOINT || 'arn:aws:lambda:us-east-2:326181217496:function:storytailor-universal-agent-production',
        timeout: parseInt(process.env.UNIVERSAL_AGENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.UNIVERSAL_AGENT_RETRIES || '2'),
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
      model: 'gpt-5',
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