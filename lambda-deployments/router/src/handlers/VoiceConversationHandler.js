"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceConversationHandler = void 0;
class VoiceConversationHandler {
    constructor(logger) {
        this.activeConversations = new Map();
        this.logger = logger;
    }
    async handleVoiceConversation(request) {
        try {
            this.logger.info('Handling voice conversation', {
                userId: request.userId,
                sessionId: request.sessionId,
                hasAudio: !!request.audioBuffer,
                hasText: !!request.textInput
            });
            // For now, return a placeholder response
            // This will be implemented when ElevenLabs Agent integration is complete
            return {
                success: true,
                textResponse: "Voice conversation handler initialized - ElevenLabs Agent integration pending"
            };
        }
        catch (error) {
            this.logger.error('Voice conversation failed', { error });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async endConversation(sessionId) {
        this.activeConversations.delete(sessionId);
        this.logger.info('Ended voice conversation', { sessionId });
    }
    getActiveConversations() {
        return Array.from(this.activeConversations.keys());
    }
}
exports.VoiceConversationHandler = VoiceConversationHandler;
//# sourceMappingURL=VoiceConversationHandler.js.map