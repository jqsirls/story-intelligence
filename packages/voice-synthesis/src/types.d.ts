import { z } from 'zod';
export declare const VoiceSynthesisRequestSchema: z.ZodObject<{
    text: z.ZodString;
    language: z.ZodDefault<z.ZodString>;
    emotion: z.ZodDefault<z.ZodEnum<["neutral", "happy", "sad", "excited", "calm", "dramatic"]>>;
    voiceId: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<["low", "normal", "high"]>>;
    format: z.ZodDefault<z.ZodEnum<["pcm", "mp3", "wav"]>>;
    sampleRate: z.ZodDefault<z.ZodNumber>;
    streaming: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    text?: string;
    userId?: string;
    language?: string;
    sessionId?: string;
    streaming?: boolean;
    emotion?: "excited" | "calm" | "neutral" | "happy" | "sad" | "dramatic";
    voiceId?: string;
    priority?: "low" | "high" | "normal";
    format?: "pcm" | "wav" | "mp3";
    sampleRate?: number;
}, {
    text?: string;
    userId?: string;
    language?: string;
    sessionId?: string;
    streaming?: boolean;
    emotion?: "excited" | "calm" | "neutral" | "happy" | "sad" | "dramatic";
    voiceId?: string;
    priority?: "low" | "high" | "normal";
    format?: "pcm" | "wav" | "mp3";
    sampleRate?: number;
}>;
export type VoiceSynthesisRequest = z.infer<typeof VoiceSynthesisRequestSchema>;
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
export interface AudioChunk {
    data: Buffer;
    isLast: boolean;
    sequenceNumber: number;
    timestamp: number;
}
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
export declare const VoiceCloneRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    parentConsentId: z.ZodString;
    audioSamples: z.ZodArray<z.ZodString, "many">;
    voiceName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId?: string;
    parentConsentId?: string;
    audioSamples?: string[];
    voiceName?: string;
    description?: string;
}, {
    userId?: string;
    parentConsentId?: string;
    audioSamples?: string[];
    voiceName?: string;
    description?: string;
}>;
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
export interface FailoverState {
    currentEngine: 'elevenlabs' | 'polly';
    errorCount: number;
    lastFailureTime?: Date;
    cooldownUntil?: Date;
    circuitBreakerOpen: boolean;
    recentLatencies: number[];
}
export interface SSMLOptions {
    rate?: 'x-slow' | 'slow' | 'medium' | 'fast' | 'x-fast';
    pitch?: 'x-low' | 'low' | 'medium' | 'high' | 'x-high';
    volume?: 'silent' | 'x-soft' | 'soft' | 'medium' | 'loud' | 'x-loud';
    emphasis?: 'strong' | 'moderate' | 'reduced';
    breakTime?: string;
}
export interface ElevenLabsVoiceSettings {
    stability: number;
    similarity_boost: number;
    style?: number;
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
export interface PollyVoiceRequest {
    Text: string;
    VoiceId: string;
    OutputFormat: 'pcm' | 'mp3';
    SampleRate: string;
    Engine: 'neural' | 'standard';
    TextType: 'text' | 'ssml';
    LanguageCode?: string;
}
export declare enum VoiceErrorCode {
    INVALID_REQUEST = "INVALID_REQUEST",
    ENGINE_UNAVAILABLE = "ENGINE_UNAVAILABLE",
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
    RATE_LIMITED = "RATE_LIMITED",
    TIMEOUT = "TIMEOUT",
    NETWORK_ERROR = "NETWORK_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    VOICE_NOT_FOUND = "VOICE_NOT_FOUND",
    TEXT_TOO_LONG = "TEXT_TOO_LONG",
    UNSUPPORTED_LANGUAGE = "UNSUPPORTED_LANGUAGE"
}
export declare class VoiceError extends Error {
    code: VoiceErrorCode;
    engine?: 'elevenlabs' | 'polly';
    details?: any;
    constructor(code: VoiceErrorCode, message: string, engine?: 'elevenlabs' | 'polly', details?: any);
}
export interface CostMetrics {
    engine: 'elevenlabs' | 'polly';
    characterCount: number;
    cost: number;
    timestamp: Date;
    userId?: string;
}
export interface VoicePreferences {
    userId: string;
    preferredEngine: 'elevenlabs' | 'polly' | 'auto';
    voiceId?: string;
    speed: number;
    emotion: string;
    language: string;
    enableVoiceCloning: boolean;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=types.d.ts.map