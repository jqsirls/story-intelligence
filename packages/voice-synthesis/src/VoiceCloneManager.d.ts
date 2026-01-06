import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { VoiceCloneRequest, VoiceClone, VoiceEngineConfig } from './types';
/**
 * Voice clone manager for opt-in voice cloning with parental consent
 * Handles 15-sentence capture, consent management, and revocation
 */
export declare class VoiceCloneManager extends EventEmitter {
    private config;
    private logger;
    private supabase;
    private isInitialized;
    constructor(config: VoiceEngineConfig, logger: Logger);
    /**
     * Initialize the voice clone manager
     */
    initialize(): Promise<void>;
    /**
     * Create a new voice clone with parental consent
     */
    createVoiceClone(request: VoiceCloneRequest): Promise<VoiceClone>;
    /**
     * Revoke a voice clone and delete all associated data
     */
    revokeVoiceClone(userId: string, reason?: string): Promise<void>;
    /**
     * List voice clones for a user
     */
    listVoiceClones(userId: string): Promise<VoiceClone[]>;
    /**
     * Get voice clone status
     */
    getVoiceCloneStatus(userId: string): Promise<VoiceClone | null>;
    /**
     * Check if user has parental consent for voice cloning
     */
    hasParentalConsent(userId: string): Promise<boolean>;
    /**
     * Private helper methods
     */
    private ensureInitialized;
    private validateParentalConsent;
    private createElevenLabsVoice;
    private deleteElevenLabsVoice;
    private storeVoiceClone;
    private getVoiceCloneByUserId;
    private markVoiceCloneRevoked;
    private deleteAudioSamples;
    private processVoiceClone;
    private mapDatabaseToVoiceClone;
}
//# sourceMappingURL=VoiceCloneManager.d.ts.map