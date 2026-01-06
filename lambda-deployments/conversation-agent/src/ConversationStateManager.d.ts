import { Logger } from 'winston';
import { ConversationState, ConversationTurn } from '../config/agent-config';
export declare class ConversationStateManager {
    private redis;
    private logger;
    private saveInterval;
    constructor(redisUrl: string, logger: Logger);
    initialize(): Promise<void>;
    createConversation(conversationId: string, userId: string, sessionId: string, agentId: string): Promise<ConversationState>;
    getConversationState(conversationId: string): Promise<ConversationState | null>;
    saveConversationState(state: ConversationState): Promise<void>;
    addTurn(conversationId: string, turn: ConversationTurn): Promise<void>;
    updateConversationStatus(conversationId: string, status: ConversationState['status']): Promise<void>;
    updateConversationMetadata(conversationId: string, metadata: Partial<ConversationState['metadata']>): Promise<void>;
    getUserConversations(userId: string): Promise<ConversationState[]>;
    deleteConversation(conversationId: string): Promise<void>;
    private autoSaveActiveConversations;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ConversationStateManager.d.ts.map