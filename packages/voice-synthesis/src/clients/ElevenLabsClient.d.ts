import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { VoiceSynthesisRequest, VoiceSynthesisResponse, AudioChunk } from '../types';
interface ElevenLabsConfig {
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
}
/**
 * ElevenLabs client with WebSocket streaming support
 * Handles real-time audio generation with Flash v2.5 model
 */
export declare class ElevenLabsClient extends EventEmitter {
    private config;
    private logger;
    private ws;
    private isConnected;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private authHeaderCache;
    private connectionPromise;
    constructor(config: ElevenLabsConfig, logger: Logger);
    /**
     * Initialize the ElevenLabs client
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the client gracefully
     */
    shutdown(): Promise<void>;
    /**
     * Stream audio synthesis with real-time chunks
     */
    stream(request: VoiceSynthesisRequest, onChunk: (chunk: AudioChunk) => void): Promise<VoiceSynthesisResponse>;
    /**
     * Generate long-form audio using Multilingual v2 model
     */
    generateLongForm(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse>;
    /**
     * Health check for ElevenLabs service
     */
    healthCheck(): Promise<'up' | 'down' | 'degraded'>;
    /**
     * Private helper methods
     */
    private ensureConnection;
    private connect;
    private streamAudio;
    private validateApiKey;
    private handleApiError;
    private calculateCost;
    private estimateAudioDuration;
}
export {};
//# sourceMappingURL=ElevenLabsClient.d.ts.map