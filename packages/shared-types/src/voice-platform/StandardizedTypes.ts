// Standardized types for platform-agnostic voice assistant integration

export type VoicePlatform = 'alexa_plus' | 'google_assistant' | 'apple_siri' | 'microsoft_cortana' | 'custom_platform';

export type PlatformCapability = 
  | 'smart_home' 
  | 'multi_agent' 
  | 'voice_synthesis' 
  | 'actions_on_google' 
  | 'siri_shortcuts'
  | 'cortana_skills'
  | 'third_party_embedding'
  | 'webhook_support'
  | 'custom_capability';

export type DeviceCapability = 
  | 'screen' 
  | 'audio_output' 
  | 'audio_input' 
  | 'touch_input' 
  | 'camera'
  | 'smart_home_hub';

export interface StandardizedRequest {
  userId: string;
  sessionId: string;
  intent?: string;
  slots?: Record<string, any>;
  parameters?: Record<string, any>;
  deviceId?: string;
  platform: VoicePlatform;
  capabilities: PlatformCapability[];
  deviceCapabilities?: DeviceCapability[];
  rawRequest: any; // Original platform request for fallback
  timestamp: string;
  locale?: string;
  userAgent?: string;
}

export interface StandardizedResponse {
  speech: string;
  reprompt?: string;
  shouldEndSession: boolean;
  smartHomeActions?: SmartHomeAction[];
  platformSpecific?: Record<string, any>;
  sessionAttributes?: Record<string, any>;
  cards?: ResponseCard[];
  directives?: ResponseDirective[];
}

export interface ResponseCard {
  type: 'simple' | 'standard' | 'link_account';
  title?: string;
  content?: string;
  text?: string;
  image?: {
    smallImageUrl?: string;
    largeImageUrl?: string;
  };
}

export interface ResponseDirective {
  type: string;
  payload: Record<string, any>;
}

export interface UserContext {
  userId: string;
  platform: VoicePlatform;
  deviceCapabilities: DeviceCapability[];
  connectedSmartDevices: ConnectedDevice[];
  preferences: UserPreferences;
  sessionHistory?: SessionHistoryItem[];
}

export interface ConnectedDevice {
  deviceId: string;
  deviceType: string;
  roomId: string;
  roomName?: string;
  status: 'connected' | 'disconnected' | 'error';
  capabilities: string[];
  lastUsed?: string;
}

export interface UserPreferences {
  voice?: VoiceSettings;
  smartHome?: SmartHomePreferences;
  privacy?: PrivacySettings;
  accessibility?: AccessibilitySettings;
}

export interface VoiceSettings {
  voice: string;
  speed: number;
  emotion: 'excited' | 'calm' | 'mysterious' | 'gentle';
  volume: number;
}

export interface SmartHomePreferences {
  autoConnect: boolean;
  defaultRoom?: string;
  lightingIntensity: 'subtle' | 'moderate' | 'dynamic';
  enableNarrativeSync: boolean;
}

export interface PrivacySettings {
  dataRetentionPreference: 'minimal' | 'standard' | 'extended';
  analyticsOptOut: boolean;
  smartHomeDataSharing: boolean;
}

export interface AccessibilitySettings {
  speechProcessingDelay: number;
  vocabularyLevel: 'simple' | 'standard' | 'advanced';
  visualIndicators: boolean;
  hapticFeedback: boolean;
}

export interface SessionHistoryItem {
  timestamp: string;
  intent: string;
  response: string;
  smartHomeAction?: string;
}

export interface SmartHomeAction {
  type: 'set_story_environment' | 'sync_narrative_lighting' | 'restore_default_lighting' | 'device_control';
  storyType?: string;
  narrativeEvent?: NarrativeEvent;
  userId: string;
  deviceId?: string;
  roomId?: string;
  parameters?: Record<string, any>;
}

export interface NarrativeEvent {
  type: 'peaceful_moment' | 'exciting_moment' | 'mysterious_scene' | 'victory_moment' | 'story_end';
  intensity: number; // 0-1
  duration?: number; // milliseconds
  metadata?: Record<string, any>;
}

// Platform-specific request types (for type safety)
export interface AlexaRequest {
  version: string;
  session: {
    sessionId: string;
    user: { userId: string };
    attributes?: Record<string, any>;
  };
  context: {
    System: {
      user: { userId: string };
      device: { 
        deviceId: string;
        supportedInterfaces?: {
          Display?: any;
          TouchInterface?: any;
        };
      };
      apiEndpoint: string;
    };
  };
  request: {
    type: string;
    requestId: string;
    timestamp: string;
    locale?: string;
    intent?: {
      name: string;
      slots?: Record<string, any>;
    };
  };
}

export interface GoogleRequest {
  user: { userId: string };
  conversation: { conversationId: string };
  inputs: Array<{
    intent: string;
    arguments?: Record<string, any>;
    rawInputs?: Array<{
      query: string;
      inputType: string;
    }>;
  }>;
  surface?: {
    capabilities: Array<{
      name: string;
    }>;
  };
  availableSurfaces?: Array<{
    capabilities: Array<{
      name: string;
    }>;
  }>;
}

export interface SiriRequest {
  user?: { id: string };
  session?: { id: string };
  intent?: { name: string };
  parameters?: Record<string, any>;
  device?: {
    id: string;
    capabilities: string[];
  };
}

export interface CortanaRequest {
  user: { id: string };
  conversation: { id: string };
  request: {
    type: string;
    intent?: {
      name: string;
      slots?: Record<string, any>;
    };
  };
}

// Platform-specific response types
export interface AlexaResponse {
  version: string;
  sessionAttributes?: Record<string, any>;
  response: {
    outputSpeech?: {
      type: 'PlainText' | 'SSML';
      text?: string;
      ssml?: string;
    };
    card?: ResponseCard;
    reprompt?: {
      outputSpeech: {
        type: 'PlainText' | 'SSML';
        text?: string;
        ssml?: string;
      };
    };
    directives?: ResponseDirective[];
    shouldEndSession: boolean;
  };
}

export interface GoogleResponse {
  expectUserResponse: boolean;
  richResponse: {
    items: Array<{
      simpleResponse?: {
        textToSpeech: string;
        displayText?: string;
      };
    }>;
    suggestions?: Array<{
      title: string;
    }>;
  };
  systemIntent?: {
    intent: string;
    data: Record<string, any>;
  };
}

export interface SiriResponse {
  version: string;
  response: {
    outputSpeech: {
      type: string;
      text: string;
    };
    shouldEndSession: boolean;
  };
}

export interface CortanaResponse {
  version: string;
  response: {
    outputSpeech: {
      type: string;
      text: string;
    };
    shouldEndSession: boolean;
  };
}

// Enhanced platform integration types
export interface EmbeddingConfig {
  skillId?: string;
  actionId?: string;
  shortcutId?: string;
  invocationName: string;
  description: string;
  category: string;
  keywords: string[];
  privacyPolicyUrl: string;
  termsOfUseUrl: string;
  supportedLocales: string[];
  targetAudience: 'children' | 'adults' | 'family';
  contentRating: 'everyone' | 'teen' | 'mature';
  permissions: PlatformPermission[];
  smartHomeIntegration?: SmartHomeIntegrationConfig;
}

export interface PlatformPermission {
  name: string;
  reason: string;
  required: boolean;
}

export interface SmartHomeIntegrationConfig {
  supportedDeviceTypes: string[];
  supportedCapabilities: string[];
  requiresAccountLinking: boolean;
  oauthConfig?: OAuthConfig;
}

export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  scopes: string[];
  redirectUri: string;
}

export interface WebhookConfig {
  url: string;
  events: WebhookEvent[];
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: WebhookRetryPolicy;
  authentication?: WebhookAuthentication;
}

export interface WebhookEvent {
  type: 'skill_enabled' | 'skill_disabled' | 'account_linked' | 'account_unlinked' | 'smart_home_discovery' | 'smart_home_control' | 'conversation_started' | 'conversation_ended' | 'error_occurred';
  filters?: Record<string, any>;
}

export interface WebhookRetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

export interface WebhookAuthentication {
  type: 'bearer_token' | 'api_key' | 'hmac_signature' | 'oauth2';
  credentials: Record<string, string>;
}

export interface WebhookResult {
  webhookId: string;
  status: 'active' | 'inactive' | 'error';
  verificationToken?: string;
  lastDelivery?: {
    timestamp: string;
    status: 'success' | 'failed';
    responseCode?: number;
    error?: string;
  };
}

export interface WebhookPayload {
  eventType: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  platform: VoicePlatform;
  data: Record<string, any>;
  signature?: string;
}

// Universal platform adapter for future platforms
export interface UniversalPlatformConfig {
  platformName: string;
  version: string;
  capabilities: PlatformCapability[];
  requestFormat: 'json' | 'xml' | 'form_data' | 'custom';
  responseFormat: 'json' | 'xml' | 'custom';
  authentication: {
    type: 'api_key' | 'oauth2' | 'bearer_token' | 'custom';
    config: Record<string, any>;
  };
  endpoints: {
    conversation: string;
    smartHome?: string;
    webhook?: string;
  };
  requestMapping: RequestFieldMapping;
  responseMapping: ResponseFieldMapping;
  smartHomeMapping?: SmartHomeFieldMapping;
}

export interface RequestFieldMapping {
  userId: string;
  sessionId: string;
  intent: string;
  parameters: string;
  deviceId?: string;
  locale?: string;
  timestamp?: string;
}

export interface ResponseFieldMapping {
  speech: string;
  reprompt?: string;
  shouldEndSession: string;
  sessionAttributes?: string;
  cards?: string;
  directives?: string;
}

export interface SmartHomeFieldMapping {
  deviceId: string;
  deviceType: string;
  action: string;
  parameters: string;
  roomId?: string;
  userId: string;
}