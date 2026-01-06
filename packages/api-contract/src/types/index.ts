/**
 * @storytailor/api-contract
 * OpenAPI specifications and type definitions for Storytailor platform APIs
 * Powered by Story Intelligence™
 */

import { z } from 'zod';

// Base API Response Structure
export const BaseResponseSchema = z.object({
  success: z.boolean(),
  timestamp: z.string().datetime(),
  poweredBy: z.literal('Story Intelligence™'),
  platform: z.literal('Storytailor®')
});

export const ErrorResponseSchema = BaseResponseSchema.extend({
  success: z.literal(false),
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional()
});

// User Types
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().min(3).max(120),
  userType: z.enum(['child', 'parent', 'teacher', 'organization']),
  firstName: z.string(),
  lastName: z.string(),
  parentEmail: z.string().email().optional(),
  emailConfirmed: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Story Types
export const StorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  description: z.string().optional(),
  ageRange: z.string(),
  themes: z.array(z.string()),
  metadata: z.record(z.any()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Character Types
export const CharacterSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  personality: z.record(z.any()),
  appearance: z.record(z.any()),
  backstory: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Conversation Types
export const ConversationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionId: z.string(),
  status: z.enum(['active', 'completed', 'paused']),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  multiAgentEnabled: z.boolean().default(true)
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string(),
  userId: z.string().uuid(),
  userMessage: z.string(),
  agentResponse: z.string(),
  agentName: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).default({})
});

// Multi-Agent Types
export const IntentSchema = z.object({
  type: z.string(),
  confidence: z.number().min(0).max(1),
  targetAgent: z.string(),
  parameters: z.record(z.any()).default({})
});

export const AgentResponseSchema = z.object({
  agentName: z.string(),
  success: z.boolean(),
  data: z.record(z.any()),
  nextPhase: z.string().optional(),
  suggestions: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
});

// API Request/Response Types
export const ConversationStartRequestSchema = z.object({
  userId: z.string().uuid(),
  initialMessage: z.string().optional(),
  context: z.record(z.any()).default({})
});

export const ConversationStartResponseSchema = BaseResponseSchema.extend({
  success: z.literal(true),
  conversation: ConversationSchema,
  message: z.string(),
  response: z.string(),
  agentName: z.string(),
  nextPhase: z.string(),
  suggestions: z.array(z.string()),
  metadata: z.record(z.any())
});

export const ConversationMessageRequestSchema = z.object({
  sessionId: z.string(),
  userId: z.string().uuid(),
  message: z.string(),
  context: z.record(z.any()).default({})
});

export const ConversationMessageResponseSchema = BaseResponseSchema.extend({
  success: z.literal(true),
  response: z.object({
    sessionId: z.string(),
    messageId: z.string(),
    userMessage: z.string(),
    agentResponse: z.string(),
    agentName: z.string(),
    timestamp: z.string().datetime(),
    nextPhase: z.string(),
    suggestions: z.array(z.string()),
    metadata: z.record(z.any()),
    multiAgent: z.boolean()
  })
});

export const HealthResponseSchema = BaseResponseSchema.extend({
  success: z.literal(true),
  status: z.literal('healthy'),
  message: z.string(),
  environment: z.string(),
  version: z.string(),
  features: z.array(z.string()),
  multiAgentSystem: z.object({
    status: z.literal('healthy'),
    agents: z.array(z.string()),
    circuitBreakers: z.record(z.object({
      state: z.enum(['CLOSED', 'OPEN', 'HALF_OPEN']),
      failureCount: z.number(),
      lastFailureTime: z.string().datetime().nullable(),
      failureThreshold: z.number(),
      recoveryTimeoutMs: z.number()
    })),
    timestamp: z.string().datetime()
  })
});

// Character API Types
export const CharacterCreateRequestSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  personality: z.record(z.any()).default({}),
  appearance: z.record(z.any()).default({})
});

export const CharacterCreateResponseSchema = BaseResponseSchema.extend({
  success: z.literal(true),
  character: CharacterSchema,
  message: z.string()
});

export const CharacterListResponseSchema = BaseResponseSchema.extend({
  success: z.literal(true),
  characters: z.array(CharacterSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number()
});

// Story API Types
export const StoryCreateRequestSchema = z.object({
  userId: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  description: z.string().optional(),
  ageRange: z.string(),
  themes: z.array(z.string()).default([])
});

export const StoryCreateResponseSchema = BaseResponseSchema.extend({
  success: z.literal(true),
  story: StorySchema,
  message: z.string()
});

export const StoryListResponseSchema = BaseResponseSchema.extend({
  success: z.literal(true),
  stories: z.array(StorySchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number()
});

// Knowledge Base API Types
export const KnowledgeQueryRequestSchema = z.object({
  query: z.string(),
  context: z.record(z.any()).default({}),
  userId: z.string().uuid().optional()
});

export const KnowledgeQueryResponseSchema = BaseResponseSchema.extend({
  success: z.literal(true),
  response: z.string(),
  sources: z.array(z.object({
    title: z.string(),
    content: z.string(),
    confidence: z.number(),
    type: z.enum(['faq', 'guide', 'concept', 'brand'])
  })),
  metadata: z.record(z.any())
});

// Export TypeScript types
export type BaseResponse = z.infer<typeof BaseResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type User = z.infer<typeof UserSchema>;
export type Story = z.infer<typeof StorySchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Intent = z.infer<typeof IntentSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;

export type ConversationStartRequest = z.infer<typeof ConversationStartRequestSchema>;
export type ConversationStartResponse = z.infer<typeof ConversationStartResponseSchema>;
export type ConversationMessageRequest = z.infer<typeof ConversationMessageRequestSchema>;
export type ConversationMessageResponse = z.infer<typeof ConversationMessageResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export type CharacterCreateRequest = z.infer<typeof CharacterCreateRequestSchema>;
export type CharacterCreateResponse = z.infer<typeof CharacterCreateResponseSchema>;
export type CharacterListResponse = z.infer<typeof CharacterListResponseSchema>;

export type StoryCreateRequest = z.infer<typeof StoryCreateRequestSchema>;
export type StoryCreateResponse = z.infer<typeof StoryCreateResponseSchema>;
export type StoryListResponse = z.infer<typeof StoryListResponseSchema>;

export type KnowledgeQueryRequest = z.infer<typeof KnowledgeQueryRequestSchema>;
export type KnowledgeQueryResponse = z.infer<typeof KnowledgeQueryResponseSchema>;

// Schema exports for validation
export {
  BaseResponseSchema,
  ErrorResponseSchema,
  UserSchema,
  StorySchema,
  CharacterSchema,
  ConversationSchema,
  MessageSchema,
  IntentSchema,
  AgentResponseSchema,
  ConversationStartRequestSchema,
  ConversationStartResponseSchema,
  ConversationMessageRequestSchema,
  ConversationMessageResponseSchema,
  HealthResponseSchema,
  CharacterCreateRequestSchema,
  CharacterCreateResponseSchema,
  CharacterListResponseSchema,
  StoryCreateRequestSchema,
  StoryCreateResponseSchema,
  StoryListResponseSchema,
  KnowledgeQueryRequestSchema,
  KnowledgeQueryResponseSchema
};
 
 
 