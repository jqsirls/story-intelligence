"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationAgent = void 0;
const ElevenLabsAgentClient_1 = require("./ElevenLabsAgentClient");
const ConnectionManager_1 = require("./ConnectionManager");
const ConversationStateManager_1 = require("./ConversationStateManager");
class ConversationAgent {
    constructor(config) {
        this.isInitialized = false;
        this.config = config;
        this.logger = config.logger;
        this.elevenLabsClient = new ElevenLabsAgentClient_1.ElevenLabsAgentClient(config, this.logger);
        this.connectionManager = new ConnectionManager_1.ConnectionManager(config.redisUrl, this.logger);
        this.stateManager = new ConversationStateManager_1.ConversationStateManager(config.redisUrl, this.logger);
    }
    async initialize() {
        try {
            this.logger.info('Initializing ConversationAgent...');
            await Promise.all([
                this.connectionManager.initialize(),
                this.stateManager.initialize(),
                this.elevenLabsClient.connect()
            ]);
            // Set up response handler
            this.elevenLabsClient.onResponse((response) => {
                this.handleAgentResponse(response);
            });
            this.isInitialized = true;
            this.logger.info('ConversationAgent initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize ConversationAgent', { error });
            throw error;
        }
    }
    async startConversation(connectionId, userId, sessionId, metadata) {
        this.ensureInitialized();
        try {
            // Create conversation state
            const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const conversation = await this.stateManager.createConversation(conversationId, userId, sessionId, this.config.elevenLabsAgentId);
            // Add connection
            await this.connectionManager.addConnection({
                connectionId,
                userId,
                sessionId,
                conversationId,
                isActive: true,
                lastPing: new Date(),
                reconnectAttempts: 0
            });
            // Update metadata
            if (metadata) {
                await this.stateManager.updateConversationMetadata(conversationId, metadata);
            }
            this.logger.info('Conversation started', {
                conversationId,
                userId,
                sessionId,
                connectionId
            });
            return conversation;
        }
        catch (error) {
            this.logger.error('Failed to start conversation', { error });
            throw error;
        }
    }
    async sendMessage(connectionId, message, metadata) {
        this.ensureInitialized();
        try {
            const connection = await this.connectionManager.getConnection(connectionId);
            if (!connection) {
                throw new Error('Connection not found');
            }
            const conversation = await this.stateManager.getConversationState(connection.conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }
            // Add user turn to transcript
            const turn = {
                turnId: `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                speaker: 'user',
                message,
                metadata
            };
            await this.stateManager.addTurn(connection.conversationId, turn);
            // Send to ElevenLabs Agent
            await this.elevenLabsClient.sendMessage(message, connection.userId, {
                conversationId: connection.conversationId,
                sessionId: connection.sessionId,
                ...metadata
            });
            // Update connection activity
            await this.connectionManager.updateConnectionActivity(connectionId);
            this.logger.debug('Message sent to ElevenLabs Agent', {
                conversationId: connection.conversationId,
                messageLength: message.length
            });
        }
        catch (error) {
            this.logger.error('Failed to send message', { error });
            throw error;
        }
    }
    async endConversation(connectionId) {
        this.ensureInitialized();
        try {
            const connection = await this.connectionManager.getConnection(connectionId);
            if (connection) {
                await this.stateManager.updateConversationStatus(connection.conversationId, 'ended');
                await this.connectionManager.removeConnection(connectionId);
                this.logger.info('Conversation ended', {
                    conversationId: connection.conversationId,
                    userId: connection.userId
                });
            }
        }
        catch (error) {
            this.logger.error('Failed to end conversation', { error });
            throw error;
        }
    }
    async getConversationState(connectionId) {
        this.ensureInitialized();
        try {
            const connection = await this.connectionManager.getConnection(connectionId);
            if (connection) {
                return await this.stateManager.getConversationState(connection.conversationId);
            }
            return null;
        }
        catch (error) {
            this.logger.error('Failed to get conversation state', { error });
            return null;
        }
    }
    async getUserConversations(userId) {
        this.ensureInitialized();
        return await this.stateManager.getUserConversations(userId);
    }
    async getConnectionStats() {
        this.ensureInitialized();
        const totalConnections = await this.connectionManager.getConnectionCount();
        const activeConnections = await this.connectionManager.getActiveConnectionCount();
        const activeConnectionsList = await this.connectionManager.getActiveConnections();
        const userConnections = {};
        activeConnectionsList.forEach(conn => {
            userConnections[conn.userId] = (userConnections[conn.userId] || 0) + 1;
        });
        return {
            totalConnections,
            activeConnections,
            userConnections
        };
    }
    async handleAgentResponse(response) {
        try {
            this.logger.debug('Received ElevenLabs Agent response', {
                type: response.type,
                hasContent: !!response.content,
                hasAudio: !!response.audioUrl,
                hasToolCalls: !!response.toolCalls
            });
            // Handle different response types
            switch (response.type) {
                case 'message':
                    await this.handleTextResponse(response);
                    break;
                case 'audio':
                    await this.handleAudioResponse(response);
                    break;
                case 'tool_call':
                    await this.handleToolCall(response);
                    break;
                case 'error':
                    await this.handleErrorResponse(response);
                    break;
                default:
                    this.logger.warn('Unknown response type', { type: response.type });
            }
        }
        catch (error) {
            this.logger.error('Failed to handle agent response', { error });
        }
    }
    async handleTextResponse(response) {
        // This would typically emit to WebSocket clients
        // Implementation depends on the WebSocket server integration
        this.logger.debug('Text response received', { content: response.content });
    }
    async handleAudioResponse(response) {
        // This would typically stream audio to WebSocket clients
        this.logger.debug('Audio response received', { audioUrl: response.audioUrl });
    }
    async handleToolCall(response) {
        if (response.toolCalls) {
            for (const toolCall of response.toolCalls) {
                this.logger.debug('Tool call received', {
                    name: toolCall.name,
                    parameters: toolCall.parameters
                });
                // Handle tool calls (Hue lighting, emotion tracking, etc.)
                // Implementation depends on specific tool requirements
            }
        }
    }
    async handleErrorResponse(response) {
        this.logger.error('ElevenLabs Agent error', { content: response.content });
    }
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('ConversationAgent not initialized. Call initialize() first.');
        }
    }
    async shutdown() {
        try {
            this.logger.info('Shutting down ConversationAgent...');
            await Promise.all([
                this.connectionManager.shutdown(),
                this.stateManager.shutdown()
            ]);
            this.elevenLabsClient.disconnect();
            this.isInitialized = false;
            this.logger.info('ConversationAgent shutdown complete');
        }
        catch (error) {
            this.logger.error('Error during shutdown', { error });
        }
    }
}
exports.ConversationAgent = ConversationAgent;
//# sourceMappingURL=ConversationAgent.js.map