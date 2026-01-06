import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { VoiceSynthesisRequest, VoiceSynthesisResponse, AudioChunk, VoiceEngineConfig, VoiceMetrics, VoicePreferences } from './types';
import { VoiceCloneManager } from './VoiceCloneManager';
/**
 * Main voice synthesis service that orchestrates multiple TTS engines
 * with intelligent failover and real-time streaming capabilities
 */
export declare class VoiceService extends EventEmitter {
    private config;
    private logger;
    private elevenLabsClient;
    private pollyClient;
    private failoverPolicy;
    private voiceCloneManager;
    private metricsCollector;
    private costTracker;
    private isInitialized;
    constructor(config: VoiceEngineConfig, logger: Logger);
    /**
     * Initialize the voice service and all clients
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the voice service gracefully
     */
    shutdown(): Promise<void>;
    /**
     * Stream audio synthesis with real-time chunks
     * Primary method for voice-first interactions
     */
    stream(request: VoiceSynthesisRequest, onChunk: (chunk: AudioChunk) => void): Promise<VoiceSynthesisResponse>;
    /**
     * Generate long-form audio (for final story MP3s)
     * Asynchronous processing for complete stories
     */
    generateLongForm(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse>;
    /**
     * Get voice clone manager for managing custom voices
     */
    getVoiceCloneManager(): VoiceCloneManager;
    /**
     * Get current metrics and performance data
     */
    getMetrics(timeRangeMs?: number): Promise<VoiceMetrics[]>;
    /**
     * Get cost tracking information
     */
    getCostMetrics(userId?: string, timeRangeMs?: number): Promise<{
        totalCost: number;
        engineBreakdown: {
            elevenlabs: number;
            polly: number;
        };
        characterCount: number;
        avgCostPerCharacter: number;
        budgetUtilization: number;
    }>;
    /**
     * Update user voice preferences
     */
    updateVoicePreferences(preferences: VoicePreferences): Promise<void>;
    /**
     * Health check for the voice service
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        engines: {
            elevenlabs: 'up' | 'down' | 'degraded';
            polly: 'up' | 'down' | 'degraded';
        };
        metrics: {
            avgLatency: number;
            successRate: number;
            dailyCost: number;
        };
    }>;
    /**
     * Private helper methods
     */
    private ensureInitialized;
    private selectEngine;
    private shouldAttemptFailover;
    private attemptFailover;
    private recordMetrics;
    private hasPremiuVoiceEntitlement;
    private generateSessionId;
    private setupEventListeners;
    private getRecentMetrics;
    private determineOverallHealth;
}
//# sourceMappingURL=VoiceService.d.ts.map