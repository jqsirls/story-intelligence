import { ConversationAgentConfig, ConversationState } from '../config/agent-config';
export declare class ConversationAgent {
    private config;
    private logger;
    private elevenLabsClient;
    private connectionManager;
    private stateManager;
    private isInitialized;
    constructor(config: ConversationAgentConfig);
    initialize(): Promise<void>;
    startConversation(connectionId: string, userId: string, sessionId: string, metadata?: any): Promise<ConversationState>;
    sendMessage(connectionId: string, message: string, metadata?: any): Promise<void>;
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
    private ensureInitialized;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ConversationAgent.d.ts.map