import { z } from 'zod';

// Voice synthesis request schema
export const VoiceSynthesisRequestSchema = z.object({
  text: z.string().min(1).max(4000),
  language: z.string().default('en-US'),
  emotion: z.enum(['neutral', 'happy', 'sad', 'excited', 'calm', 'dramatic']).default('neutral'),
  voiceId: z.string().optional(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  format: z.enum(['pcm', 'mp3', 'wav']).default('pcm'),
  sampleRate: z.number().default(16000),
  streaming: z.boolean().default(true),
});

export type VoiceSynthesisRequest = z.infer<typeof VoiceSynthesisRequestSchema>;

// Voice synthesis response
export interface VoiceSynthesisResponse {
  success: boolean;
  audioData?: Buffer;
  audioUrl?: string;
  duration?: number;
  engine: 'elevenlabs' | 'polly';
  latency: number;
  cost?: number;
  error?: string;
  sessionId: string;
}

// Streaming audio chunk
export interface AudioChunk {
  data: Buffer;
  isLast: boolean;
  sequenceNumber: number;
  timestamp: number;
}

// Voice engine configuration
export interface VoiceEngineConfig {
  elevenlabs: {
    apiKey: string;
    baseUrl: string;
    model: string;
    voiceId: string;
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
    websocketUrl: string;
    maxRetries: number;
    timeoutMs: number;
  };
  polly: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    roleArn?: string;
    voiceId: string;
    engine: 'neural' | 'standard';
    outputFormat: 'pcm' | 'mp3';
    sampleRate: string;
    textType: 'text' | 'ssml';
    maxRetries: number;
    timeoutMs: number;
  };
  failover: {
    latencyThresholdMs: number;
    errorThresholdCount: number;
    cooldownMs: number;
    enableCircuitBreaker: boolean;
  };
  cost: {
    maxCostPerRequest: number;
    dailyBudgetLimit: number;
    enableCostTracking: boolean;
  };
  redis: {
    url: string;
    keyPrefix: string;
    metricsRetentionMs: number;
  };
}

// Voice clone management
export const VoiceCloneRequestSchema = z.object({
  userId: z.string().uuid(),
  parentConsentId: z.string().uuid(),
  audioSamples: z.array(z.string()).min(15).max(15), // Base64 encoded audio
  voiceName: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
});

export type VoiceCloneRequest = z.infer<typeof VoiceCloneRequestSchema>;

export interface VoiceClone {
  id: string;
  userId: string;
  voiceId: string;
  name: string;
  description?: string;
  status: 'processing' | 'ready' | 'failed';
  parentConsentId: string;
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date;
}

// Performance metrics
export interface VoiceMetrics {
  engine: 'elevenlabs' | 'polly';
  latency: number;
  success: boolean;
  cost: number;
  characterCount: number;
  timestamp: Date;
  userId?: string;
  sessionId: string;
}

// Failover policy state
export interface FailoverState {
  currentEngine: 'elevenlabs' | 'polly';
  errorCount: number;
  lastFailureTime?: Date;
  cooldownUntil?: Date;
  circuitBreakerOpen: boolean;
  recentLatencies: number[];
}

// SSML support
export interface SSMLOptions {
  rate?: 'x-slow' | 'slow' | 'medium' | 'fast' | 'x-fast';
  pitch?: 'x-low' | 'low' | 'medium' | 'high' | 'x-high';
  volume?: 'silent' | 'x-soft' | 'soft' | 'medium' | 'loud' | 'x-loud';
  emphasis?: 'strong' | 'moderate' | 'reduced';
  breakTime?: string; // e.g., "500ms", "2s"
}

// ElevenLabs specific types
export interface ElevenLabsVoiceSettings {
  stability: number; // 0.0 - 1.0
  similarity_boost: number; // 0.0 - 1.0
  style?: number; // 0.0 - 1.0
  use_speaker_boost?: boolean;
}

export interface ElevenLabsStreamRequest {
  text: string;
  model_id: string;
  voice_settings: ElevenLabsVoiceSettings;
  generation_config?: {
    chunk_length_schedule?: number[];
  };
}

// Polly specific types
export interface PollyVoiceRequest {
  Text: string;
  VoiceId: string;
  OutputFormat: 'pcm' | 'mp3';
  SampleRate: string;
  Engine: 'neural' | 'standard';
  TextType: 'text' | 'ssml';
  LanguageCode?: string;
}

// Error types
export enum VoiceErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  ENGINE_UNAVAILABLE = 'ENGINE_UNAVAILABLE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VOICE_NOT_FOUND = 'VOICE_NOT_FOUND',
  TEXT_TOO_LONG = 'TEXT_TOO_LONG',
  UNSUPPORTED_LANGUAGE = 'UNSUPPORTED_LANGUAGE',
}

export class VoiceError extends Error {
  constructor(
    public code: VoiceErrorCode,
    message: string,
    public engine?: 'elevenlabs' | 'polly',
    public details?: any
  ) {
    super(message);
    this.name = 'VoiceError';
  }
}

// Cost tracking
export interface CostMetrics {
  engine: 'elevenlabs' | 'polly';
  characterCount: number;
  cost: number;
  timestamp: Date;
  userId?: string;
}

// User preferences
export interface VoicePreferences {
  userId: string;
  preferredEngine: 'elevenlabs' | 'polly' | 'auto';
  voiceId?: string;
  speed: number; // 0.5 - 2.0
  emotion: string;
  language: string;
  enableVoiceCloning: boolean;
  createdAt: Date;
  updatedAt: Date;
}