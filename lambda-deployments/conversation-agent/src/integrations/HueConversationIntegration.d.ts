import { EventEmitter } from 'events';
import { Logger } from 'winston';
export interface HueConversationContext {
    userId: string;
    sessionId: string;
    emotion: string;
    emotionIntensity: number;
    conversationPhase: string;
    storyType?: string;
    characterName?: string;
    storyProgress?: number;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    roomId?: string;
}
export interface HueLightingProfile {
    brightness: number;
    color: string;
    temperature: number;
    transitionDuration: number;
    effect?: 'none' | 'pulse' | 'breathe' | 'rainbow' | 'fire' | 'ocean';
}
export declare class HueConversationIntegration extends EventEmitter {
    private logger;
    private smartHomeAgentUrl;
    private isConnected;
    private currentProfile?;
    constructor(logger: Logger);
    /**
     * Initialize Hue connection for conversation
     */
    initializeHueConnection(userId: string, roomId?: string): Promise<boolean>;
    /**
     * Update lighting based on conversation context
     */
    updateLightingForConversation(context: HueConversationContext): Promise<void>;
    /**
     * Handle emotion-specific lighting changes
     */
    handleEmotionLighting(userId: string, emotion: string, intensity: number, roomId?: string): Promise<void>;
    /**
     * Handle story-specific lighting changes
     */
    handleStoryLighting(userId: string, storyType: string, storyProgress: number, characterName?: string, roomId?: string): Promise<void>;
    /**
     * Handle special conversation moments
     */
    handleSpecialMoment(userId: string, momentType: 'giggle' | 'silence' | 'yawn' | 'excitement' | 'fear' | 'calm', roomId?: string): Promise<void>;
    /**
     * Generate lighting profile based on conversation context
     */
    private generateLightingProfile;
    /**
     * Apply lighting profile to Hue lights
     */
    private applyLightingProfile;
    /**
     * Set ambient lighting for conversation start
     */
    private setAmbientLighting;
    /**
     * Check if user has Hue connected
     */
    private checkHueConnection;
    /**
     * Get current connection status
     */
    isHueConnected(): boolean;
    /**
     * Disconnect Hue
     */
    disconnect(): Promise<void>;
}
//# sourceMappingURL=HueConversationIntegration.d.ts.map