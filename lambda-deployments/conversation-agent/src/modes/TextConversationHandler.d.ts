/**
 * Text Conversation Handler
 *
 * Provides same conversation quality as voice mode for text-based interactions.
 * Uses identical AI prompts but adapted for text input/output.
 *
 * For users who opt out of voice or prefer text chat.
 * Version: 1.0.0
 */
import { Logger } from 'winston';
export interface TextConversationConfig {
    openaiApiKey: string;
    model?: string;
    logger: Logger;
}
export interface TextConversationContext {
    userId: string;
    sessionId: string;
    userAge: number;
    userName?: string;
    isReturningUser?: boolean;
    conversationPhase?: string;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: string;
    }>;
}
export interface TextConversationResponse {
    message: string;
    emotion?: string;
    suggestedActions?: string[];
    conversationPhase?: string;
    requiresParentNotification?: boolean;
    notificationTier?: 1 | 2 | 3;
}
/**
 * Handles text-based conversations with same quality as voice
 *
 * Key differences from voice mode:
 * - No voice emotion detection (uses text sentiment analysis instead)
 * - No audio output (returns text responses)
 * - Same conversational patterns and quality
 * - Same age-tuning and accessibility features
 */
export declare class TextConversationHandler {
    private openai;
    private logger;
    private model;
    constructor(config: TextConversationConfig);
    /**
     * Send a message in text mode and get Frankie's response
     */
    sendMessage(userMessage: string, context: TextConversationContext): Promise<TextConversationResponse>;
    /**
     * Build comprehensive system prompt combining all guidance modules
     */
    private buildSystemPrompt;
    /**
     * Analyze emotion from text content (since no voice available)
     */
    private analyzeTextEmotion;
    /**
     * Check if message requires parent notification
     */
    private checkParentNotification;
    /**
     * Initialize conversation with greeting
     */
    startConversation(context: TextConversationContext): Promise<TextConversationResponse>;
}
//# sourceMappingURL=TextConversationHandler.d.ts.map