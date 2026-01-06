// Core domain types
export * from './types/auth';
export * from './types/library';
export * from './types/story';
export * from './types/character';
export * from './types/emotion';
export * from './types/commerce';
export * from './types/conversation';
export * from './types/agent';

// Database types
export * from './types/database';

// API types
export * from './types/api';

// Event types
export * from './types/events';

// gRPC types (selective exports to avoid conflicts)
export {
  RequestContextSchema,
  AgentErrorSchema,
  AgentResponseSchema,
  IntentResultSchema,
  CustomerResponseSchema,
  AuthResultSchema,
  LinkAccountResponseSchema,
  CharacterResultSchema,
  StoryResultSchema,
  StoryDraftResultSchema,
  StoryBeatResultSchema,
  StoryUpdateResultSchema,
  StoryTypeResultSchema,
  LibraryResultSchema,
  StoriesResultSchema,
  EmotionResultSchema,
  EmotionPatternsResultSchema,
  SentimentResultSchema,
  CheckoutResultSchema,
  DiscountResultSchema,
  SubscriptionResultSchema,
} from './types/grpc';

// Infrastructure types (selective exports to avoid conflicts)
export {
  CacheKeySchema,
  CacheEntrySchema,
  ServiceHealthSchema,
  ServiceMetricsSchema,
  CircuitBreakerStateSchema,
  CircuitBreakerConfigSchema,
  CircuitBreakerStatusSchema,
  EventSchema,
  EventHandlerSchema,
  LogLevelSchema,
  LogEntrySchema,
  RateLimitConfigSchema,
  RateLimitStatusSchema,
} from './types/infrastructure';

export type {
  CacheKey,
  CacheEntry,
  ServiceHealth,
  ServiceMetrics,
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerStatus,
  Event as InfrastructureEvent,
  EventHandler,
  LogLevel,
  LogEntry,
  RateLimitConfig,
  RateLimitStatus,
} from './types/infrastructure';

// Configuration
export * from './config';

// Base classes and self-healing types
export { EnhancedAgentBase } from './base/EnhancedAgentBase';
export * from './types/self-healing';

// Explicitly export key self-healing types to ensure they're available
export type {
  SelfHealingConfig,
  IncidentPattern,
  DetectionRule,
  HealingAction,
  IncidentRecord,
  HealingMetrics,
  SelfHealingEventType,
  EnhancedErrorContext
} from './types/self-healing';

// Voice platform types (selective exports to avoid conflicts)
export type {
  VoicePlatform,
  PlatformCapability,
  DeviceCapability,
  StandardizedRequest,
  StandardizedResponse,
  UserContext,
  ConnectedDevice,
  ResponseCard,
  ResponseDirective,
  SessionHistoryItem,
  SmartHomeAction,
  NarrativeEvent,
  AlexaRequest,
  AlexaResponse,
  GoogleRequest,
  GoogleResponse,
  SiriRequest,
  SiriResponse,
  CortanaRequest,
  CortanaResponse,
  EmbeddingConfig,
  PlatformPermission,
  SmartHomeIntegrationConfig,
  OAuthConfig,
  WebhookConfig,
  WebhookEvent,
  WebhookRetryPolicy,
  WebhookAuthentication,
  WebhookResult,
  WebhookPayload,
  UniversalPlatformConfig,
  RequestFieldMapping,
  ResponseFieldMapping,
  SmartHomeFieldMapping
} from './voice-platform/StandardizedTypes';

export {
  VoicePlatformAdapter,
  AlexaPlusAdapter,
  GoogleAssistantAdapter,
  AppleSiriAdapter,
  MicrosoftCortanaAdapter,
  UniversalPlatformAdapter,
  PlatformAdapterRegistry,
  defaultPlatformRegistry
} from './voice-platform/PlatformAdapters';

export type {
  DeviceType,
  DeviceTokenData,
  DeviceTokenRecord,
  DeviceConnectionConfig,
  LightingState,
  LightingProfile,
  LightingTransition,
  StoryLightingProfile,
  EnvironmentalCue,
  DeviceConnection,
  HueDevice,
  HueBridgeAuth,
  HueAuthResult,
  HueBridgeInfo,
  MinimalDeviceData,
  IoTConsentRecord,
  SmartHomeConfig,
  DeviceManager,
  TokenStore,
  EncryptionService,
  ValidationResult,
  PrivacyValidation,
  DeviceAccessAudit
} from './voice-platform/SmartHomeTypes';