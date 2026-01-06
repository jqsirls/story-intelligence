import { Logger } from 'winston';
export interface VoiceConversationRequest {
    userId: string;
    sessionId: string;
    audioBuffer?: Buffer;
    textInput?: string;
    characterName?: string;
    storyType?: string;
    userAge?: number;
    conversationPhase?: string;
    storyId?: string;
}
export interface VoiceConversationResponse {
    success: boolean;
    audioUrl?: string;
    textResponse?: string;
    storyData?: any;
    soundEffects?: any[];
    backgroundMusic?: string;
    error?: string;
}
export declare class VoiceConversationHandler {
    private logger;
    private activeConversations;
    constructor(logger: Logger);
    handleVoiceConversation(request: VoiceConversationRequest): Promise<VoiceConversationResponse>;
    endConversation(sessionId: string): Promise<void>;
    getActiveConversations(): string[];
}
//# sourceMappingURL=VoiceConversationHandler.d.ts.map