"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationStateManager = void 0;
const shared_1 = require("./shared");
class ConversationStateManager {
    constructor(redisUrl, logger) {
        this.redis = (0, shared_1.createRedisClient)({ url: redisUrl });
        this.logger = logger;
        // Auto-save conversation state every 30 seconds
        this.saveInterval = setInterval(() => {
            this.autoSaveActiveConversations();
        }, 30000);
    }
    async initialize() {
        await this.redis.connect();
        this.logger.info('ConversationStateManager initialized');
    }
    async createConversation(conversationId, userId, sessionId, agentId) {
        const state = {
            conversationId,
            userId,
            sessionId,
            agentId,
            status: 'active',
            startTime: new Date(),
            lastActivity: new Date(),
            transcript: [],
            metadata: {}
        };
        await this.saveConversationState(state);
        this.logger.info('Conversation created', {
            conversationId,
            userId,
            sessionId
        });
        return state;
    }
    async getConversationState(conversationId) {
        try {
            const data = await this.redis.get(`conversation:${conversationId}`);
            if (data) {
                const state = JSON.parse(data);
                // Convert date strings back to Date objects
                state.startTime = new Date(state.startTime);
                state.lastActivity = new Date(state.lastActivity);
                state.transcript.forEach((turn) => {
                    turn.timestamp = new Date(turn.timestamp);
                });
                return state;
            }
            return null;
        }
        catch (error) {
            this.logger.error('Failed to get conversation state', { conversationId, error });
            return null;
        }
    }
    async saveConversationState(state) {
        try {
            state.lastActivity = new Date();
            await this.redis.setex(`conversation:${state.conversationId}`, 3600, // 1 hour TTL
            JSON.stringify(state));
            this.logger.debug('Conversation state saved', {
                conversationId: state.conversationId,
                transcriptLength: state.transcript.length
            });
        }
        catch (error) {
            this.logger.error('Failed to save conversation state', {
                conversationId: state.conversationId,
                error
            });
        }
    }
    async addTurn(conversationId, turn) {
        const state = await this.getConversationState(conversationId);
        if (state) {
            state.transcript.push(turn);
            state.lastActivity = new Date();
            await this.saveConversationState(state);
            this.logger.debug('Turn added to conversation', {
                conversationId,
                turnId: turn.turnId,
                speaker: turn.speaker
            });
        }
        else {
            this.logger.error('Cannot add turn - conversation not found', { conversationId });
        }
    }
    async updateConversationStatus(conversationId, status) {
        const state = await this.getConversationState(conversationId);
        if (state) {
            state.status = status;
            state.lastActivity = new Date();
            await this.saveConversationState(state);
            this.logger.info('Conversation status updated', {
                conversationId,
                status
            });
        }
    }
    async updateConversationMetadata(conversationId, metadata) {
        const state = await this.getConversationState(conversationId);
        if (state) {
            state.metadata = { ...state.metadata, ...metadata };
            state.lastActivity = new Date();
            await this.saveConversationState(state);
            this.logger.debug('Conversation metadata updated', {
                conversationId,
                metadata
            });
        }
    }
    async getUserConversations(userId) {
        try {
            const keys = await this.redis.keys('conversation:*');
            const conversations = [];
            for (const key of keys) {
                const data = await this.redis.get(key);
                if (data) {
                    const state = JSON.parse(data);
                    if (state.userId === userId) {
                        // Convert date strings back to Date objects
                        state.startTime = new Date(state.startTime);
                        state.lastActivity = new Date(state.lastActivity);
                        state.transcript.forEach((turn) => {
                            turn.timestamp = new Date(turn.timestamp);
                        });
                        conversations.push(state);
                    }
                }
            }
            return conversations.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
        }
        catch (error) {
            this.logger.error('Failed to get user conversations', { userId, error });
            return [];
        }
    }
    async deleteConversation(conversationId) {
        await this.redis.del(`conversation:${conversationId}`);
        this.logger.info('Conversation deleted', { conversationId });
    }
    async autoSaveActiveConversations() {
        try {
            const keys = await this.redis.keys('conversation:*');
            let savedCount = 0;
            for (const key of keys) {
                const data = await this.redis.get(key);
                if (data) {
                    const state = JSON.parse(data);
                    if (state.status === 'active') {
                        // Extend TTL for active conversations
                        await this.redis.expire(key, 3600);
                        savedCount++;
                    }
                }
            }
            if (savedCount > 0) {
                this.logger.debug('Auto-saved active conversations', { count: savedCount });
            }
        }
        catch (error) {
            this.logger.error('Auto-save failed', { error });
        }
    }
    async shutdown() {
        clearInterval(this.saveInterval);
        await this.redis.disconnect();
        this.logger.info('ConversationStateManager shutdown complete');
    }
}
exports.ConversationStateManager = ConversationStateManager;
//# sourceMappingURL=ConversationStateManager.js.map