"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElevenLabsAgentClient = void 0;
const ws_1 = __importDefault(require("ws"));
class ElevenLabsAgentClient {
    constructor(config, logger) {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.isConnected = false;
        this.heartbeatInterval = null;
        this.messageQueue = [];
        this.config = config;
        this.logger = logger;
    }
    async connect() {
        try {
            this.logger.info('Connecting to ElevenLabs Agent', {
                agentId: this.config.elevenLabsAgentId,
                attempt: this.reconnectAttempts + 1
            });
            const wsUrl = `wss://api.elevenlabs.io/v1/agents/${this.config.elevenLabsAgentId}/conversation`;
            this.ws = new ws_1.default(wsUrl, {
                headers: {
                    'xi-api-key': this.config.elevenLabsApiKey,
                    'User-Agent': 'Storytailor-ConversationAgent/1.0.0'
                }
            });
            this.ws.on('open', () => {
                this.logger.info('Connected to ElevenLabs Agent');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                // Start heartbeat
                this.startHeartbeat();
                // Process queued messages
                this.processMessageQueue();
            });
            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });
            this.ws.on('close', (code, reason) => {
                this.logger.warn('ElevenLabs Agent connection closed', { code, reason: reason.toString() });
                this.isConnected = false;
                this.stopHeartbeat();
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
                else {
                    this.logger.error('Max reconnection attempts reached');
                }
            });
            this.ws.on('error', (error) => {
                this.logger.error('ElevenLabs Agent WebSocket error', { error: error.message });
                this.isConnected = false;
            });
        }
        catch (error) {
            this.logger.error('Failed to connect to ElevenLabs Agent', { error });
            throw error;
        }
    }
    async sendMessage(message, userId, metadata) {
        const payload = {
            type: 'message',
            content: message,
            userId,
            metadata,
            timestamp: new Date().toISOString()
        };
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(payload));
        }
        else {
            // Queue message for when connection is restored
            this.messageQueue.push(JSON.stringify(payload));
            this.logger.warn('Message queued - connection not available');
        }
    }
    async sendToolCall(toolCall) {
        const payload = {
            type: 'tool_call',
            toolCall,
            timestamp: new Date().toISOString()
        };
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(payload));
        }
        else {
            this.logger.error('Cannot send tool call - connection not available');
        }
    }
    onResponse(callback) {
        this.responseCallback = callback;
    }
    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            if (this.responseCallback) {
                this.responseCallback(message);
            }
        }
        catch (error) {
            this.logger.error('Failed to parse ElevenLabs Agent message', { error });
        }
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.ws) {
                this.ws.ping();
            }
        }, 30000); // 30 seconds
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
        this.logger.info('Scheduling reconnection', {
            attempt: this.reconnectAttempts,
            delay
        });
        setTimeout(() => {
            this.connect().catch(error => {
                this.logger.error('Reconnection failed', { error });
            });
        }, delay);
    }
    processMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected && this.ws) {
            const message = this.messageQueue.shift();
            if (message) {
                this.ws.send(message);
            }
        }
    }
    disconnect() {
        this.stopHeartbeat();
        this.isConnected = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    isConnectionActive() {
        return this.isConnected && this.ws?.readyState === ws_1.default.OPEN;
    }
}
exports.ElevenLabsAgentClient = ElevenLabsAgentClient;
//# sourceMappingURL=ElevenLabsAgentClient.js.map