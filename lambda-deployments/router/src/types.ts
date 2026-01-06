import { z } from 'zod';

// Story types supported by the system
export enum StoryType {
  ADVENTURE = 'adventure',
  BEDTIME = 'bedtime',
  BIRTHDAY = 'birthday',
  EDUCATIONAL = 'educational',
  FINANCIAL_LITERACY = 'financial_literacy',
  LANGUAGE_LEARNING = 'language_learning',
  MEDICAL_BRAVERY = 'medical_bravery',
  MENTAL_HEALTH = 'mental_health',
  MILESTONES = 'milestones',
  NEW_CHAPTER_SEQUEL = 'new_chapter_sequel',
  TECH_READINESS = 'tech_readiness'
}

// Intent types that the router can classify
export enum IntentType {
  // Story creation intents
  CREATE_STORY = 'create_story',
  CONTINUE_STORY = 'continue_story',
  EDIT_STORY = 'edit_story',
  FINISH_STORY = 'finish_story',
  
  // Character management intents
  CREATE_CHARACTER = 'create_character',
  EDIT_CHARACTER = 'edit_character',
  CONFIRM_CHARACTER = 'confirm_character',
  
  // Library management intents
  VIEW_LIBRARY = 'view_library',
  SHARE_STORY = 'share_story',
  DELETE_STORY = 'delete_story',
  
  // Emotional check-in intents
  EMOTION_CHECKIN = 'emotion_checkin',
  MOOD_UPDATE = 'mood_update',
  
  // Smart home integration intents
  CONNECT_HUE = 'connect_hue',
  HUE_STATUS = 'hue_status',
  CONTROL_LIGHTS = 'control_lights',
  
  // Account and commerce intents
  ACCOUNT_LINKING = 'account_linking',
  SUBSCRIPTION_MANAGEMENT = 'subscription_management',
  UPGRADE_ACCOUNT = 'upgrade_account',
  PAYMENT_PROCESSING = 'payment_processing',
  STRIPE_WEBHOOK = 'stripe_webhook',
  
  // General conversation intents
  GREETING = 'greeting',
  HELP = 'help',
  GOODBYE = 'goodbye',
  
  // Conversational storytelling intents
  START_CONVERSATION = 'start_conversation',
  CONTINUE_CONVERSATION = 'continue_conversation',
  END_CONVERSATION = 'end_conversation',
  RESUME_CONVERSATION = 'resume_conversation',
  
  UNKNOWN = 'unknown',

  // PLG intents used in Router.ts
  START_ONBOARDING = 'START_ONBOARDING',
  GET_ONBOARDING_PROGRESS = 'GET_ONBOARDING_PROGRESS',
  COMPLETE_ONBOARDING_STEP = 'COMPLETE_ONBOARDING_STEP',
  GET_FEEDBACK = 'GET_FEEDBACK',
  SUBMIT_FEEDBACK = 'SUBMIT_FEEDBACK',
  ANALYZE_RETENTION = 'ANALYZE_RETENTION',
  GET_PERSONALIZED_RECOMMENDATIONS = 'GET_PERSONALIZED_RECOMMENDATIONS',
  ANALYZE_FUNNEL = 'ANALYZE_FUNNEL',
  GET_COHORT_INSIGHTS = 'GET_COHORT_INSIGHTS',
  GET_PREDICTIVE_INSIGHTS = 'GET_PREDICTIVE_INSIGHTS'
}

// Conversation phase tracking
export enum ConversationPhase {
  GREETING = 'greeting',
  EMOTION_CHECK = 'emotion_check',
  CHARACTER_CREATION = 'character_creation',
  STORY_BUILDING = 'story_building',
  STORY_EDITING = 'story_editing',
  ASSET_GENERATION = 'asset_generation',
  COMPLETION = 'completion'
}

// Turn context from Alexa or other channels
export const TurnContextSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string(),
  requestId: z.string(),
  userInput: z.string(),
  channel: z.enum(['alexa', 'web', 'mobile', 'api']),
  locale: z.string().default('en-US'),
  deviceType: z.enum(['voice', 'screen', 'mobile', 'web']).optional(),
  timestamp: z.string().datetime(),
  conversationPhase: z.nativeEnum(ConversationPhase).optional(),
  previousIntent: z.nativeEnum(IntentType).optional(),
  metadata: z.record(z.any()).optional(),
});

export type TurnContext = z.infer<typeof TurnContextSchema>;

// Classified intent with confidence and parameters
export const IntentSchema = z.object({
  type: z.nativeEnum(IntentType),
  confidence: z.number().min(0).max(1),
  storyType: z.nativeEnum(StoryType).optional(),
  parameters: z.record(z.any()).optional(),
  requiresAuth: z.boolean().default(false),
  targetAgent: z.enum(['auth', 'content', 'library', 'emotion', 'commerce', 'insights', 'smarthome', 'conversation']),
  conversationPhase: z.nativeEnum(ConversationPhase).optional(),
});

export type Intent = z.infer<typeof IntentSchema>;

// Agent response structure
export const AgentResponseSchema = z.object({
  agentName: z.string(),
  success: z.boolean(),
  conversationId: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
  nextPhase: z.nativeEnum(ConversationPhase).optional(),
  requiresFollowup: z.boolean().default(false),
  followupAgent: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// Customer-facing response
export const CustomerResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  speechText: z.string().optional(),
  displayText: z.string().optional(),
  conversationPhase: z.nativeEnum(ConversationPhase),
  nextExpectedInput: z.string().optional(),
  visualElements: z.array(z.any()).optional(),
  audioUrl: z.string().optional(),
  shouldEndSession: z.boolean().default(false),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CustomerResponse = z.infer<typeof CustomerResponseSchema>;

// Memory state for conversation context
export interface MemoryState {
  userId: string;
  sessionId: string;
  conversationPhase: ConversationPhase;
  currentStoryId?: string;
  currentCharacterId?: string;
  storyType?: StoryType;
  lastIntent: IntentType;
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

// OpenAI function calling schema for intent classification
export interface IntentClassificationFunction {
  name: 'classify_intent';
  description: 'Classify user intent for storytelling conversation';
  parameters: {
    type: 'object';
    properties: {
      intent_type: {
        type: 'string';
        enum: string[];
        description: 'The primary intent of the user input';
      };
      story_type: {
        type: 'string';
        enum: string[];
        description: 'The type of story if creating or continuing a story';
      };
      confidence: {
        type: 'number';
        minimum: 0;
        maximum: 1;
        description: 'Confidence score for the classification (0.0 to 1.0)';
      };
      parameters: {
        type: 'object';
        description: 'Additional parameters extracted from the input';
      };
      conversation_phase: {
        type: 'string';
        enum: string[];
        description: 'The expected conversation phase after this intent';
      };
    };
    required: ['intent_type', 'confidence'];
  };
}

// Circuit breaker state for agent health
export interface CircuitBreakerState {
  agentName: string;
  isOpen: boolean;
  failureCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
}

// Router configuration
export interface RouterConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  redis: {
    url: string;
    keyPrefix: string;
    defaultTtl: number;
  };
  database?: {
    url: string;
    apiKey: string;
  };
  agents: {
    [key: string]: {
      endpoint: string;
      timeout: number;
      retries: number;
    };
  };
  circuitBreaker: {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
  };
  fallback: {
    enabled: boolean;
    defaultResponse: string;
    maxRetries: number;
  };
}

// Error types
export enum RouterErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  INTENT_CLASSIFICATION_FAILED = 'INTENT_CLASSIFICATION_FAILED',
  AGENT_UNAVAILABLE = 'AGENT_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class RouterError extends Error {
  constructor(
    public code: RouterErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'RouterError';
  }
}

// Agent delegation request
export interface AgentRequest {
  intent: Intent;
  context: TurnContext;
  memoryState: MemoryState;
  userId: string;
  sessionId: string;
}

// Story type prompts mapping
export interface StoryTypePrompt {
  type: StoryType;
  name: string;
  description: string;
  ageRange: [number, number];
  keywords: string[];
  examples: string[];
  conversationStarters: string[];
}

// Intent classification context
export interface ClassificationContext {
  previousIntents: IntentType[];
  conversationHistory: string[];
  currentPhase: ConversationPhase;
  userProfile?: {
    age?: number;
    preferences?: string[];
    previousStoryTypes?: StoryType[];
  };
}