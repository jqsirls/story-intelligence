import { Turn } from './conversation';

export type AgentType = 'auth' | 'library' | 'content' | 'emotion' | 'commerce' | 'router' | 'storytailor';

export interface AgentRequest {
  id: string;
  agentType: AgentType;
  method: string;
  params: Record<string, any>;
  context: RequestContext;
  timestamp: string;
}

export interface AgentResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: AgentError;
  timestamp: string;
  processingTime: number;
}

export interface AgentError {
  code: string;
  message: string;
  details?: any;
  correlationId: string;
}

export interface RequestContext {
  userId?: string;
  sessionId?: string;
  correlationId: string;
  jwt?: string;
  metadata: Record<string, any>;
}

export interface Intent {
  name: string;
  confidence: number;
  parameters: Record<string, any>;
  context: Record<string, any>;
}

export interface TurnContext {
  sessionId: string;
  userId: string;
  input: string;
  intent?: Intent;
  conversationHistory: Turn[];
  metadata: Record<string, any>;
}