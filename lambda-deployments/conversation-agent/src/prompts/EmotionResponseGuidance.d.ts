/**
 * Emotion Response Guidance for AI Conversations
 *
 * Provides AI with patterns for responding to 82 emotional scenarios.
 * These are NOT templates - they teach the AI HOW to respond appropriately.
 *
 * Based on: agentic-ux/Conversation scripts (Sections 4, 10.9-10.10)
 * Version: 1.0.0
 */
export interface EmotionContext {
    detectedEmotion: string;
    intensity: number;
    childAge: number;
    conversationPhase: string;
    voiceIndicators?: {
        pace: 'slow' | 'normal' | 'fast';
        volume: 'quiet' | 'normal' | 'loud';
        pitch: 'low' | 'normal' | 'high';
    };
}
export declare class EmotionResponseGuidance {
    /**
     * Get complete emotion response guidance for AI
     */
    static getGuidance(): string;
    /**
     * Get specific guidance for an emotion
     */
    static getForEmotion(emotion: string, tier?: 1 | 2 | 3): string;
}
//# sourceMappingURL=EmotionResponseGuidance.d.ts.map