import { ConversationAgentConfig, ConversationState } from '../config/agent-config';
export declare class ConversationAgent {
    private config;
    private logger;
    private elevenLabsClient;
    private connectionManager;
    private stateManager;
    private hueIntegration;
    private isInitialized;
    constructor(config: ConversationAgentConfig);
    initialize(): Promise<void>;
    startConversation(connectionId: string, userId: string, sessionId: string, metadata?: Record<string, unknown>): Promise<ConversationState>;
    sendMessage(connectionId: string, message: string, metadata?: Record<string, unknown>): Promise<void>;
    endConversation(connectionId: string): Promise<void>;
    getConversationState(connectionId: string): Promise<ConversationState | null>;
    getUserConversations(userId: string): Promise<ConversationState[]>;
    getConnectionStats(): Promise<{
        totalConnections: number;
        activeConnections: number;
        userConnections: Record<string, number>;
    }>;
    private handleAgentResponse;
    private handleTextResponse;
    private handleAudioResponse;
    private handleToolCall;
    private handleErrorResponse;
    /**
     * Handle special conversation moments with Hue lighting
     */
    handleSpecialMoment(userId: string, momentType: 'giggle' | 'silence' | 'yawn' | 'excitement' | 'fear' | 'calm', roomId?: string): Promise<void>;
    /**
     * Update Hue lighting for story context
     */
    updateStoryLighting(userId: string, storyType: string, storyProgress: number, characterName?: string, roomId?: string): Promise<void>;
    /**
     * Check if Hue is connected for user
     */
    isHueConnected(): boolean;
    private ensureInitialized;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ConversationAgent.d.ts.map