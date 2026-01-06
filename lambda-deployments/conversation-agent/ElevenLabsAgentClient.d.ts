import { Logger } from 'winston';
import { ConversationAgentConfig, ElevenLabsAgentResponse, ToolCall } from '../config/agent-config';
export declare class ElevenLabsAgentClient {
    private ws;
    private config;
    private logger;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private isConnected;
    private heartbeatInterval;
    private messageQueue;
    constructor(config: ConversationAgentConfig, logger: Logger);
    connect(): Promise<void>;
    sendMessage(message: string, userId: string, metadata?: any): Promise<void>;
    sendToolCall(toolCall: ToolCall): Promise<void>;
    onResponse(callback: (response: ElevenLabsAgentResponse) => void): void;
    private responseCallback?;
    private handleMessage;
    private startHeartbeat;
    private stopHeartbeat;
    private scheduleReconnect;
    private processMessageQueue;
    disconnect(): void;
    isConnectionActive(): boolean;
}
//# sourceMappingURL=ElevenLabsAgentClient.d.ts.map