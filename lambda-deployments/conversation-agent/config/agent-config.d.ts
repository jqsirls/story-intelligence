import { Logger } from 'winston';
export interface ConversationAgentConfig {
    elevenLabsApiKey: string;
    elevenLabsAgentId: string;
    redisUrl: string;
    supabaseUrl: string;
    supabaseServiceKey: string;
    s3Bucket: string;
    logger: Logger;
}
export interface ConversationState {
    conversationId: string;
    userId: string;
    sessionId: string;
    agentId: string;
    status: 'active' | 'paused' | 'ended' | 'error';
    startTime: Date;
    lastActivity: Date;
    transcript: ConversationTurn[];
    metadata: {
        storyType?: string;
        characterName?: string;
        userAge?: number;
        emotion?: string;
        hueConnected?: boolean;
    };
}
export interface ConversationTurn {
    turnId: string;
    timestamp: Date;
    speaker: 'user' | 'agent';
    message: string;
    audioUrl?: string;
    emotion?: string;
    metadata?: any;
}
export interface ElevenLabsAgentResponse {
    type: 'message' | 'audio' | 'tool_call' | 'error';
    content: string;
    audioUrl?: string;
    toolCalls?: ToolCall[];
    metadata?: any;
}
export interface ToolCall {
    name: string;
    parameters: Record<string, any>;
    result?: any;
}
export interface ConnectionInfo {
    connectionId: string;
    userId: string;
    sessionId: string;
    conversationId: string;
    isActive: boolean;
    lastPing: Date;
    reconnectAttempts: number;
}
//# sourceMappingURL=agent-config.d.ts.map