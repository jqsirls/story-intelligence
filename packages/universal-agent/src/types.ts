// Core conversation types
export interface ConversationContext {
  userId: string;
  sessionId: string;
  phase?: string;
  currentPhase?: string;
  currentTopic?: string;
  currentStep?: number;
  character?: Character;
  story?: StoryContent;
  user?: {
    age?: number;
    preferences?: Record<string, any>;
  };
  conversationHistory?: ConversationHistoryItem[];
  topicHistory?: string[];
  tangentNotes?: string[];
  pendingTopics?: string[];
  emotionalState?: EmotionalState;
  lastEngagementTime?: number;
  lastResponseTime?: number;
  startTime?: number;
  engagementMode?: string;
  topicChangeRequested?: boolean;
  breakSuggested?: boolean;
  timestamp?: Date;
  isRebuilt?: boolean;
  isFreshStart?: boolean;
  needsUserConfirmation?: boolean;
  confirmationPrompt?: string;
}

export interface UserInput {
  type?: string;
  text: string;
  intent?: string;
  field?: string;
  value?: any;
  options?: any[];
  originalInput?: any;
  characterTraits?: Record<string, any>;
  storyElements?: Record<string, any>;
  timestamp?: Date;
  metadata?: {
    systemInterruption?: boolean;
    multipleVoicesDetected?: boolean;
    detectedUsers?: string[];
    [key: string]: any;
  };
  requiresOnline?: boolean;
}

export interface Character {
  id?: string;
  name: string;
  age?: number;
  species?: string;
  description?: string;
  traits?: Record<string, any>;
  appearance?: Record<string, any>;
  [key: string]: any;
}

export interface StoryContent {
  id: string;
  title: string;
  content: string;
  type: string;
  protagonist?: string;
  isOfflineGenerated?: boolean;
  createdAt?: Date;
  needsOnlineEnhancement?: boolean;
  [key: string]: any;
}

export interface ConversationHistoryItem {
  id: string;
  timestamp: Date;
  speaker: 'user' | 'agent';
  content: string;
  type: string;
  metadata?: Record<string, any>;
}

export interface EmotionalState {
  mood: 'happy' | 'sad' | 'excited' | 'calm' | 'frustrated' | 'neutral';
  engagement: number; // 0-1
  confidence: number; // 0-1
  lastUpdated: Date;
}

// Channel types
export interface Channel {
  type: 'alexa' | 'web_chat' | 'mobile_voice' | 'api' | 'webhook';
  capabilities: ChannelCapabilities;
  constraints: ChannelConstraints;
  authentication: AuthenticationMethod;
}

export interface ChannelCapabilities {
  supportsVoice: boolean;
  supportsText: boolean;
  supportsImages: boolean;
  supportsVideo: boolean;
  supportsFiles: boolean;
  supportsRealtime: boolean;
  supportsOffline: boolean;
  maxResponseTime: number;
  maxContentLength: number;
}

export interface ChannelConstraints {
  maxMessageLength?: number;
  supportedFormats?: string[];
  rateLimits?: Record<string, number>;
}

export interface AuthenticationMethod {
  type: 'jwt' | 'api_key' | 'oauth' | 'session';
  required: boolean;
  scopes?: string[];
}

// Response types
export interface ConversationResponse {
  id: string;
  content: string;
  type: 'text' | 'voice' | 'multimodal';
  metadata?: Record<string, any>;
  actions?: ResponseAction[];
  contextUpdate?: Partial<ConversationContext>;
}

export interface ResponseAction {
  type: string;
  data: any;
  priority: number;
}

// Request types
export interface ConversationRequest {
  channel: Channel;
  userId: string;
  sessionId: string;
  input: UserInput;
  context: ConversationContext;
  metadata: RequestMetadata;
}

export interface RequestMetadata {
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
  location?: {
    country?: string;
    region?: string;
    timezone?: string;
  };
}

// Error types
export interface EdgeCaseError {
  code: string;
  message: string;
  type: 'network' | 'user_input' | 'system_failure' | 'conversation_flow';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  context?: any;
}

// Webhook types
export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
  source: string;
  signature?: string;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
  actions?: ResponseAction[];
}

// API types
export interface APIRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

export interface APIResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  metadata?: {
    processingTime: number;
    requestId: string;
    version: string;
  };
}

// Platform-specific types
export interface AlexaTurnContext {
  requestId: string;
  userId: string;
  deviceId: string;
  intent: string;
  slots: Record<string, any>;
  sessionAttributes: Record<string, any>;
  supportedInterfaces: string[];
}

export interface AlexaResponse {
  response: {
    outputSpeech: {
      type: 'PlainText' | 'SSML';
      text?: string;
      ssml?: string;
    };
    card?: {
      type: string;
      title?: string;
      content?: string;
      image?: {
        smallImageUrl?: string;
        largeImageUrl?: string;
      };
    };
    directives?: any[];
    shouldEndSession: boolean;
  };
  sessionAttributes: Record<string, any>;
}

export interface WebChatMessage {
  id: string;
  content: string;
  type: 'text' | 'voice' | 'image' | 'file';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface WebChatResponse {
  id: string;
  content: string;
  type: 'text' | 'voice' | 'image' | 'html';
  timestamp: Date;
  actions?: ResponseAction[];
  metadata?: Record<string, any>;
}

export interface MobileVoiceInput {
  audioData: ArrayBuffer;
  format: 'wav' | 'mp3' | 'opus';
  sampleRate: number;
  duration: number;
  metadata?: Record<string, any>;
}

export interface MobileVoiceResponse {
  audioData?: ArrayBuffer;
  text: string;
  format?: 'wav' | 'mp3' | 'opus';
  actions?: ResponseAction[];
  metadata?: Record<string, any>;
}

// Agent handoff types
export interface AgentHandoffContext {
  fromAgent: string;
  toAgent: string;
  handoffReason: string;
  context: ConversationContext;
  preservedState: Record<string, any>;
  capabilities: string[];
}

export interface AgentResponse {
  agentId: string;
  content: string;
  confidence: number;
  actions?: ResponseAction[];
  handoffRequired?: {
    targetAgent: string;
    reason: string;
    context: Record<string, any>;
  };
}

// Synchronization types
export interface ChannelSwitchResult {
  success: boolean;
  fromChannel: Channel;
  toChannel: Channel;
  preservedContext: ConversationContext;
  lostData?: string[];
}

export interface SyncResult {
  success: boolean;
  syncedChannels: string[];
  conflicts: ConflictResolution[];
  errors: EdgeCaseError[];
}

export interface ConflictResolution {
  field: string;
  conflictType: 'data_mismatch' | 'timestamp_conflict' | 'version_conflict';
  resolution: 'merge' | 'latest_wins' | 'user_choice';
  resolvedValue: any;
}

// Content generation types
export interface StoryGenerationRequest {
  character: Character;
  storyType: string;
  preferences: Record<string, any>;
  context: ConversationContext;
}

export interface AssetGenerationRequest {
  storyId: string;
  assetTypes: ('image' | 'audio' | 'pdf' | 'activity')[];
  quality: 'low' | 'medium' | 'high';
  context: ConversationContext;
}

// Monitoring types
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
    storage: number;
  };
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  details?: Record<string, any>;
}

// Configuration types
export interface AgentConfig {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  endpoints: Record<string, string>;
  authentication: AuthenticationMethod;
  rateLimits: Record<string, number>;
  timeouts: Record<string, number>;
}

export interface SystemConfig {
  agents: AgentConfig[];
  channels: Channel[];
  features: Record<string, boolean>;
  limits: Record<string, number>;
  monitoring: {
    enabled: boolean;
    endpoints: string[];
    alerting: Record<string, any>;
  };
}

// Edge case handling types
export type EdgeCaseType = 
  | 'network_failure'
  | 'user_input_conflict'
  | 'system_failure'
  | 'conversation_interruption'
  | 'data_corruption'
  | 'resource_constraint'
  | 'multi_user_conflict'
  | 'attention_loss'
  | 'generic';

export interface EdgeCaseResponse {
  success: boolean;
  type: EdgeCaseType;
  action: string;
  message: string;
  data: any;
  fallbackUsed: string;
}

export interface FailureContext {
  serviceName: string;
  failureType: string;
  error: any;
  timestamp: Date;
  context: ConversationContext;
}

export interface RecoveryResult {
  success: boolean;
  fallbackUsed: string | null;
  degradedCapabilities: string[];
  userMessage: string;
}

export interface InterruptionContext {
  type: string;
  severity: string;
  source: string;
  timestamp: Date;
  duration?: number;
}

export interface InputConflict {
  field: string;
  values: any[];
  confidence: number[];
  timestamp: Date;
}

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'offline';

export interface OfflineState {
  isOffline: boolean;
  capability: any;
  queuedActionsCount: number;
  lastSyncTime: Date;
  pendingChanges: string[];
}

export interface SyncResult {
  totalActions: number;
  syncedActions: number;
  failedActions: number;
  conflicts: number;
  conflictResolutions: any[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  availability: number;
}