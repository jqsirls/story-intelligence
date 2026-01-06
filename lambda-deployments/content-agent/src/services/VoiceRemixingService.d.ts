import { Logger } from 'winston';
import { VoiceRemixingRequest, VoiceRemixingResponse } from './VoiceDesignService';
export interface VoiceRemixingSession {
    sessionId: string;
    originalVoiceId: string;
    iterations: Array<{
        iterationId: string;
        prompt: string;
        promptStrength: 'low' | 'medium' | 'high' | 'max';
        remixedVoiceId?: string;
        audioPreview?: string;
    }>;
}
export interface CharacterVoiceRemixProfile {
    characterName: string;
    originalVoiceId: string;
    remixPrompts: Array<{
        context: string;
        prompt: string;
        promptStrength: 'low' | 'medium' | 'high' | 'max';
    }>;
}
export declare class VoiceRemixingService {
    private logger;
    private elevenLabsApiKey;
    private baseUrl;
    private activeSessions;
    constructor(logger: Logger);
    /**
     * Start a new voice remixing session
     */
    startRemixingSession(originalVoiceId: string, initialPrompt: string): Promise<VoiceRemixingSession>;
    /**
     * Remix a voice with a new prompt
     */
    remixVoice(request: VoiceRemixingRequest): Promise<VoiceRemixingResponse>;
    /**
     * Create character-specific remix prompts
     */
    generateCharacterRemixPrompts(characterName: string, personality: string, storyType: string): Array<{
        context: string;
        prompt: string;
        promptStrength: 'low' | 'medium' | 'high' | 'max';
    }>;
    /**
     * Create multiple remix variations for a character
     */
    createCharacterRemixVariations(characterName: string, originalVoiceId: string, personality: string, storyType: string): Promise<Map<string, string>>;
    /**
     * Iteratively refine a voice based on feedback
     */
    iterativeRefinement(voiceId: string, refinementPrompts: string[], sessionId?: string): Promise<string>;
    /**
     * Get active remixing session
     */
    getActiveSession(sessionId: string): VoiceRemixingSession | undefined;
    /**
     * Clean up completed sessions
     */
    cleanupSession(sessionId: string): void;
}
//# sourceMappingURL=VoiceRemixingService.d.ts.map