/**
 * A2A Protocol Type Definitions
 * 
 * Complete type system with ZERO `any` types.
 * All types are explicitly defined per A2A protocol specification.
 */

// Task State Machine (strict enum per A2A spec)
export enum TaskState {
  SUBMITTED = 'submitted',
  WORKING = 'working',
  INPUT_REQUIRED = 'input-required',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled'
}

// JSON-RPC 2.0 Request (strict typing per JSON-RPC 2.0 spec)
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown> | unknown[];
}

// JSON-RPC 2.0 Response (strict typing per JSON-RPC 2.0 spec)
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

// JSON-RPC 2.0 Error (with A2A-specific codes)
export interface JsonRpcError {
  code: number; // -32700 to -32603 (standard) or -32000 to -32099 (A2A-specific)
  message: string;
  data?: unknown;
}

// A2A-Specific Error Codes (per A2A protocol spec)
export enum A2AErrorCode {
  TASK_NOT_FOUND = -32000,
  TASK_ALREADY_COMPLETED = -32001,
  TASK_CANCELED = -32002,
  INVALID_TASK_STATE = -32003,
  AGENT_NOT_FOUND = -32004,
  CAPABILITY_NOT_SUPPORTED = -32005,
  AUTHENTICATION_FAILED = -32006,
  RATE_LIMIT_EXCEEDED = -32007,
  WEBHOOK_DELIVERY_FAILED = -32008,
  INVALID_AGENT_CARD = -32009,
  TASK_TIMEOUT = -32010
}

// Standard JSON-RPC 2.0 Error Codes
export enum JsonRpcStandardErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603
}

// Part Types (A2A spec)
export type PartType = 'text' | 'file' | 'data';

export interface TextPart {
  type: 'text';
  text: string;
  mimeType?: string;
}

export interface FilePart {
  type: 'file';
  url: string;
  mimeType: string;
  filename?: string;
  size?: number;
}

export interface DataPart {
  type: 'data';
  data: Record<string, unknown>;
  mimeType?: string;
}

export type Part = TextPart | FilePart | DataPart;

// Message Structure (A2A spec)
export interface Message {
  id: string;
  role: 'user' | 'agent';
  parts: Part[];
  timestamp: string;
  correlationId?: string;
}

// Artifact Structure (A2A spec)
export interface Artifact {
  id: string;
  type: string;
  parts: Part[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Task Structure (full lifecycle per A2A spec)
export interface Task {
  taskId: string;
  state: TaskState;
  method: string;
  params: Record<string, unknown>;
  result?: Artifact | unknown;
  error?: JsonRpcError;
  sessionId?: string;
  clientAgentId: string;
  remoteAgentId: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  estimatedCompletion?: string;
  progress?: number; // 0-100 for long-running tasks
}

// Agent Card Structure (A2A spec)
export interface AgentCard {
  id: string;
  name: string;
  version: string;
  description?: string;
  capabilities: string[];
  endpoints: {
    service: string;
    webhook?: string;
    health?: string;
  };
  authentication?: {
    schemes: AuthenticationScheme[];
  };
  modalities?: string[]; // ['text', 'audio', 'video']
  metadata?: Record<string, unknown>;
}

// Authentication Schemes (OpenAPI-compatible)
export interface AuthenticationScheme {
  type: 'apiKey' | 'oauth2' | 'openIdConnect';
  name: string;
  in: 'header' | 'query' | 'cookie';
  description?: string;
  flows?: OAuth2Flows;
  openIdConnectUrl?: string;
}

export interface OAuth2Flows {
  authorizationCode?: {
    authorizationUrl: string;
    tokenUrl: string;
    scopes: Record<string, string>;
  };
  clientCredentials?: {
    tokenUrl: string;
    scopes: Record<string, string>;
  };
}

// A2A Configuration
export interface A2AConfig {
  apiKeys?: Record<string, { agentId: string; scopes: string[] }>;
  jwksUrl?: string;
  tokenIssuer?: string;
  tokenAudience?: string;
  baseUrl: string;
  webhookUrl: string;
  healthUrl: string;
  agentId: string;
  agentName: string;
  agentVersion: string;
  capabilities: string[];
  rateLimitPerMinute?: number;
  taskTimeoutMs?: number;
  redis?: {
    url: string;
    keyPrefix?: string;
  };
  supabase?: {
    url: string;
    key: string;
  };
}

// A2A Adapter Dependencies
import { Router } from '@alexa-multi-agent/router';
import { UniversalStorytellerAPI } from '@alexa-multi-agent/universal-agent';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';

export interface A2AAdapterDependencies {
  router?: Router | null;
  storytellerAPI?: UniversalStorytellerAPI | null;
  supabase: SupabaseClient;
  logger: Logger;
  config: A2AConfig;
}

// Method to Intent Mapping
import { IntentType, AgentResponse } from '@alexa-multi-agent/router';

export interface MethodMapping {
  method: string;
  intentType: IntentType;
  targetAgent: 'content' | 'emotion' | 'library' | 'auth' | 'commerce' | 'insights';
  requiresAuth: boolean;
  handler: (params: Record<string, unknown>, context: A2AContext) => Promise<AgentResponse>;
}

// A2A Request Context
export interface A2AContext {
  taskId?: string;
  clientAgentId: string;
  sessionId?: string;
  userId?: string;
  correlationId: string;
  timestamp: string;
}

// A2A Error Class (for proper error handling)
export class A2AError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'A2AError';
    Object.setPrototypeOf(this, A2AError.prototype);
  }
}

// Convert to JSON-RPC error format
export function toJsonRpcError(error: A2AError | Error): JsonRpcError {
  if (error instanceof A2AError) {
    return {
      code: error.code,
      message: error.message,
      data: error.data
    };
  }
  return {
    code: JsonRpcStandardErrorCode.INTERNAL_ERROR,
    message: error.message || 'Internal error',
    data: { type: error.constructor.name }
  };
}

// Storytailor ID Types (for A2A protocol)
export interface StorytailorId {
  id: string;
  name: string;
  primaryCharacterId?: string | null;
  ageRange?: '3-5' | '6-8' | '9-10' | '11-12' | '13-15' | '16-17' | null;
  isMinor?: boolean | null;
  consentStatus?: 'none' | 'pending' | 'verified' | 'revoked' | null;
  policyVersion?: string | null;
  evaluatedAt?: string | null;
  createdAt: string;
}

export interface StorytailorIdCreateParams {
  name: string;
  primary_character_id?: string;
  age_range?: '3-5' | '6-8' | '9-10' | '11-12' | '13-15' | '16-17';
  is_minor?: boolean;
  parent_storytailor_id?: string;
}

export interface StorytailorIdGetParams {
  id: string;
}

export interface StorytailorIdTransferParams {
  id: string;
  to_user_id: string;
}

export interface StorytailorIdTransferResult {
  storytailorId: string;
  newOwnerId: string;
  newOwnerEmail: string;
}
