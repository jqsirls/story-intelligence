import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { VoiceSynthesisRequest, VoiceSynthesisResponse, AudioChunk } from '../types';
interface PollyConfig {
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
}
/**
 * Amazon Polly client for fallback TTS
 * Provides reliable neural voice synthesis with presigned URLs
 */
export declare class PollyClient extends EventEmitter {
    private config;
    private logger;
    private polly;
    private s3;
    private sts;
    private isInitialized;
    constructor(config: PollyConfig, logger: Logger);
    /**
     * Initialize the Polly client
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the client gracefully
     */
    shutdown(): Promise<void>;
    /**
     * Stream audio synthesis (simulated streaming for Polly)
     */
    stream(request: VoiceSynthesisRequest, onChunk: (chunk: AudioChunk) => void): Promise<VoiceSynthesisResponse>;
    /**
     * Generate long-form audio using Polly
     */
    generateLongForm(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse>;
    /**
     * Health check for Polly service
     */
    healthCheck(): Promise<'up' | 'down' | 'degraded'>;
    /**
     * Private helper methods
     */
    private ensureInitialized;
    private validateConnection;
    private prepareText;
    private mapLanguageCode;
    private splitTextForPolly;
    private simulateStreaming;
    private uploadToS3AndGetPresignedUrl;
    private handlePollyError;
    private calculateCost;
    private estimateAudioDuration;
}
export {};
//# sourceMappingURL=PollyClient.d.ts.map