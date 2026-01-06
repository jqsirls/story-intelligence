import { ConversationContext, Turn } from '@alexa-multi-agent/shared-types';

// Alexa+ Multi-Agent SDK Types
export interface AlexaTurnContext {
  sessionId: string;
  userId: string;
  alexaPersonId: string;
  customerEmail?: string;
  input: string;
  locale: string;
  deviceType: 'voice' | 'screen';
  deviceCapabilities: DeviceCapabilities;
  conversationHistory: Turn[];
  metadata: AlexaMetadata;
}

export interface DeviceCapabilities {
  hasScreen: boolean;
  hasAudio: boolean;
  supportsAPL: boolean;
  supportsStreaming: boolean;
  maxResponseTime: number;
}

export interface AlexaMetadata {
  requestId: string;
  timestamp: string;
  locale: string;
  deviceId: string;
  applicationId: string;
  sessionAttributes: Record<string, any>;
}

export interface AlexaResponse {
  speech: string;
  reprompt?: string;
  shouldEndSession: boolean;
  sessionAttributes: Record<string, any>;
  aplDocument?: APLDocument;
  audioStream?: AudioStream;
  responseTime: number;
}

export interface APLDocument {
  type: 'APL';
  version: '1.8';
  document: {
    type: 'APL';
    version: '1.8';
    mainTemplate: {
      parameters: string[];
      items: APLComponent[];
    };
  };
  datasources?: Record<string, any>;
}

export interface APLComponent {
  type: string;
  width?: string;
  height?: string;
  items?: APLComponent[];
  text?: string;
  source?: string;
  scale?: string;
  align?: string;
  [key: string]: any;
}

export interface AudioStream {
  url: string;
  token: string;
  expectedPreviousToken?: string;
  offsetInMilliseconds: number;
}

export interface AlexaHandoffRequest {
  turnContext: AlexaTurnContext;
  conversationContext?: ConversationContext;
}

export interface AlexaHandoffResponse {
  response: AlexaResponse;
  conversationContext: ConversationContext;
  shouldContinue: boolean;
}

// Locale Support
export type SupportedLocale = 'en-US' | 'en-GB' | 'en-CA' | 'en-AU' | 'es-US' | 'es-ES' | 'fr-FR' | 'de-DE' | 'it-IT' | 'ja-JP';

export interface LocaleConfig {
  locale: SupportedLocale;
  fallbackLocale: SupportedLocale;
  voiceId: string;
  culturalContext: CulturalContext;
}

export interface CulturalContext {
  dateFormat: string;
  timeFormat: string;
  currency: string;
  measurementSystem: 'metric' | 'imperial';
  storytellingStyle: 'western' | 'eastern' | 'universal';
}

// Streaming Response Types
export interface StreamingResponse {
  chunks: ResponseChunk[];
  totalDuration: number;
  isComplete: boolean;
}

export interface ResponseChunk {
  id: string;
  sequence: number;
  content: string;
  audioData?: ArrayBuffer;
  timestamp: string;
  isLast: boolean;
}

// Error Types
export interface AlexaError {
  code: AlexaErrorCode;
  message: string;
  details?: any;
  shouldEndSession: boolean;
  fallbackResponse?: string;
}

export type AlexaErrorCode = 
  | 'HANDOFF_FAILED'
  | 'AUTHENTICATION_REQUIRED'
  | 'LOCALE_NOT_SUPPORTED'
  | 'DEVICE_NOT_SUPPORTED'
  | 'RESPONSE_TIMEOUT'
  | 'STREAMING_FAILED'
  | 'APL_RENDER_FAILED'
  | 'CONVERSATION_STATE_CORRUPTED';