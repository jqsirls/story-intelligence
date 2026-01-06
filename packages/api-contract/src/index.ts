/**
 * @storytailor/api-contract
 * OpenAPI specifications and type definitions for Storytailor platform APIs
 * Powered by Story Intelligence™
 */

// Export all types and schemas
export * from './types';

// Export OpenAPI specification
export { default as openApiSpec } from './schemas/storytailor-api.yaml';

// API Configuration
export const API_CONFIG = {
  name: 'Storytailor Platform API',
  description: 'Storytailor® Platform API powered by Story Intelligence™',
  version: '2.0.0',
  baseUrls: {
    production: 'https://api-v2.storytailor.com',
    staging: 'https://staging-api.storytailor.com',
    development: 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging'
  },
  branding: {
    poweredBy: 'Story Intelligence™',
    platform: 'Storytailor®',
    company: 'Storytailor Inc'
  }
} as const;

// API Client Configuration
export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  bearerToken?: string;
  timeout?: number;
  retries?: number;
}

// Default configuration
export const DEFAULT_CONFIG: Partial<ApiClientConfig> = {
  timeout: 30000,
  retries: 3
} as const;

// Error codes
export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_TOKEN: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_003',
  
  // User errors
  USER_NOT_FOUND: 'USER_001',
  USER_AGE_VALIDATION: 'USER_002',
  USER_EMAIL_TAKEN: 'USER_003',
  
  // Story errors
  STORY_NOT_FOUND: 'STORY_001',
  STORY_CONTENT_VALIDATION: 'STORY_002',
  STORY_CREATION_FAILED: 'STORY_003',
  
  // Character errors
  CHARACTER_NOT_FOUND: 'CHAR_001',
  CHARACTER_CREATION_FAILED: 'CHAR_002',
  
  // Conversation errors
  CONVERSATION_NOT_FOUND: 'CONV_001',
  CONVERSATION_ENDED: 'CONV_002',
  MESSAGE_PROCESSING_FAILED: 'CONV_003',
  
  // Multi-agent errors
  AGENT_UNAVAILABLE: 'AGENT_001',
  AGENT_CIRCUIT_OPEN: 'AGENT_002',
  DELEGATION_FAILED: 'AGENT_003',
  
  // Knowledge base errors
  KNOWLEDGE_QUERY_FAILED: 'KB_001',
  KNOWLEDGE_SOURCE_UNAVAILABLE: 'KB_002',
  
  // System errors
  INTERNAL_SERVER_ERROR: 'SYS_001',
  SERVICE_UNAVAILABLE: 'SYS_002',
  RATE_LIMIT_EXCEEDED: 'SYS_003'
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// API Endpoints
export const ENDPOINTS = {
  // Authentication
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    verify: '/auth/verify'
  },
  
  // Users
  users: {
    profile: '/users/profile',
    update: '/users/profile',
    delete: '/users/profile'
  },
  
  // Stories
  stories: {
    list: '/stories',
    create: '/stories',
    get: (id: string) => `/stories/${id}`,
    update: (id: string) => `/stories/${id}`,
    delete: (id: string) => `/stories/${id}`
  },
  
  // Characters
  characters: {
    list: '/characters',
    create: '/characters',
    get: (id: string) => `/characters/${id}`,
    update: (id: string) => `/characters/${id}`,
    delete: (id: string) => `/characters/${id}`
  },
  
  // Conversations
  conversations: {
    start: '/v1/conversation/start',
    message: '/v1/conversation/message',
    end: '/v1/conversation/end',
    history: (sessionId: string) => `/v1/conversation/${sessionId}/history`
  },
  
  // Knowledge Base
  knowledge: {
    query: '/knowledge/query',
    health: '/knowledge/health'
  },
  
  // System
  system: {
    health: '/health',
    version: '/version',
    status: '/status'
  }
} as const;

// Content-Type headers
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
  TEXT: 'text/plain'
} as const;

// User Agent
export const USER_AGENT = 'Storytailor-API-Client/2.0.0 (Story Intelligence powered)';

// Request timeout configurations
export const TIMEOUTS = {
  FAST: 5000,      // 5 seconds - health checks
  NORMAL: 30000,   // 30 seconds - standard operations
  SLOW: 60000,     // 60 seconds - story generation
  UPLOAD: 300000   // 5 minutes - file uploads
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1
} as const;

// Validation constants
export const VALIDATION = {
  MIN_AGE: 3,
  MAX_AGE: 120,
  MIN_STORY_LENGTH: 10,
  MAX_STORY_LENGTH: 50000,
  MIN_CHARACTER_NAME_LENGTH: 1,
  MAX_CHARACTER_NAME_LENGTH: 100,
  MAX_MESSAGE_LENGTH: 1000
} as const;

// Feature flags
export const FEATURES = {
  MULTI_AGENT_SYSTEM: true,
  VOICE_SYNTHESIS: true,
  REAL_TIME_CONVERSATIONS: true,
  CHARACTER_CREATION: true,
  STORY_INTELLIGENCE: true,
  KNOWLEDGE_BASE: true,
  SMART_HOME_INTEGRATION: true,
  EMOTION_DETECTION: true,
  KID_COMMUNICATION_INTELLIGENCE: process.env.ENABLE_KID_INTELLIGENCE === 'true' || false
} as const;

// Agent names
export const AGENT_NAMES = {
  ROUTER: 'router',
  CONTENT: 'content',
  EMOTION: 'emotion',
  PERSONALITY: 'personality',
  AUTH: 'auth',
  LIBRARY: 'library',
  COMMERCE: 'commerce',
  EDUCATIONAL: 'educational',
  THERAPEUTIC: 'therapeutic',
  ACCESSIBILITY: 'accessibility',
  LOCALIZATION: 'localization',
  CONVERSATION_INTELLIGENCE: 'conversation-intelligence',
  ANALYTICS_INTELLIGENCE: 'analytics-intelligence',
  INSIGHTS: 'insights',
  SMART_HOME: 'smart-home',
  CHILD_SAFETY: 'child-safety',
  KNOWLEDGE_BASE: 'knowledge-base'
} as const;

// Story Intelligence™ brand constants
export const STORY_INTELLIGENCE = {
  TRADEMARK: 'Story Intelligence™',
  POWERED_BY: 'Powered by Story Intelligence™',
  TAGLINE: 'Revolutionary technology for award-caliber personal storytelling',
  DIFFERENTIATION: 'Not AI-powered - powered by Story Intelligence™',
  CATEGORY: 'Creates new category alongside books and traditional publishing',
  FOCUS: 'Story creation + off-screen activities',
  PRIVACY: 'Personal and private - not for commercialization'
} as const;
 
 
 