declare module '@alexa-multi-agent/shared-types' {
  export type ConversationPhase = 'story_creation' | 'character_creation' | 'review' | 'delivery';
  export interface LoggerLike { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void }
  export interface Database { [schema: string]: any }
  export type VoicePlatform =
    | 'alexa'
    | 'google'
    | 'apple'
    | 'microsoft'
    | 'alexa_plus'
    | 'google_assistant'
    | 'apple_siri'
    | 'microsoft_cortana';
  export interface VoicePlatformAdapter {
    platform: VoicePlatform;
    handleRequest: (req: any) => Promise<any>;
    parseUserRequest: (raw: any) => StandardizedRequest;
    formatResponse: (res: StandardizedResponse) => any;
    formatError: (e: any) => any;
    getCapabilities: () => string[];
    supportsSmartHome: () => boolean;
    supportsThirdPartyEmbedding: () => boolean;
    generateEmbeddingCode: (config: any) => string;
    sendResponse: (res: any) => Promise<void>;
    supportsWebhooks: () => boolean;
    setupWebhook: (...args: any[]) => Promise<WebhookResult>;
    validateWebhookSignature: (...args: any[]) => boolean;
    getUserContext: (raw: any) => Promise<any>;
  }
  export interface StandardizedRequest {
    platform: VoicePlatform;
    userId: string;
    sessionId: string;
    intent?: string;
    locale?: string;
    slots?: Record<string, any>;
    rawRequest?: any;
    deviceCapabilities?: Record<string, any>;
    capabilities?: Record<string, any>;
    payload?: any;
  }
  export interface StandardizedResponse {
    status?: 'ok' | 'error';
    payload?: any;
    error?: string;
    speech?: string;
    reprompt?: string;
    smartHomeActions?: SmartHomeAction[];
    sessionAttributes?: any;
    shouldEndSession?: boolean;
  }
  export interface SmartHomeAction { [k: string]: any }
  export interface NarrativeEvent { [k: string]: any }
  export interface SystemConfig { [k: string]: any }
  export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
  export interface LogEntry { level: LogLevel; message: string; meta?: Record<string, any>; timestamp?: string; service?: string; correlationId?: string; userId?: string; error?: { name: string; message: string; stack?: string }; metadata?: Record<string, any> }
  export interface ConnectedDevice { deviceId?: string; platform?: VoicePlatform; roomId?: string; deviceType?: string; status?: 'connected' | 'disconnected' | 'error'; capabilities?: any; lastUsed?: any; [k: string]: any }
  export interface WebhookPayload { headers: Record<string, string>; body: any; eventType?: string; userId?: string; sessionId?: string; data?: any; timestamp?: string }
  export interface WebhookConfig { secret?: string; url?: string; events: Array<{ type: string }> }
  export interface WebhookResult { status: 'active' | 'inactive' | 'error'; body?: any; webhookId: string }
  export interface WebhookEvent { type: string; payload: any }
  export interface SelfHealingConfig { [k: string]: any }
  export enum IntentType {
    STORY_CREATION = 'STORY_CREATION',
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
  export class AlexaPlusAdapter implements VoicePlatformAdapter {
    constructor(...args: any[]);
    platform: VoicePlatform;
    handleRequest: (req: any) => Promise<any>;
    parseUserRequest: (raw: any) => StandardizedRequest;
    formatResponse: (res: StandardizedResponse) => any;
    formatError: (e: any) => any;
    getCapabilities: () => string[];
    supportsSmartHome: () => boolean;
    supportsThirdPartyEmbedding: () => boolean;
    generateEmbeddingCode: (config: any) => string;
    sendResponse: (res: any) => Promise<void>;
    supportsWebhooks: () => boolean;
    setupWebhook: (...args: any[]) => Promise<WebhookResult>;
    validateWebhookSignature: (...args: any[]) => boolean;
    getUserContext: (raw: any) => Promise<any>;
  }
  export class GoogleAssistantAdapter extends AlexaPlusAdapter {}
  export class AppleSiriAdapter extends AlexaPlusAdapter {}
  export class MicrosoftCortanaAdapter extends AlexaPlusAdapter {}
}


