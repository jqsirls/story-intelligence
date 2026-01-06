/**
 * Frankie System Prompt for ElevenLabs Conversational AI
 *
 * This is the master system prompt that configures ElevenLabs agent to embody
 * Frankie's personality and follow Storytailor's conversational patterns.
 *
 * Based on: agentic-ux/Conversation scripts
 * Version: 1.0.0
 * Updated: 2025-10-19
 */
export interface FrankiePromptConfig {
    userAge: number;
    mode: 'voice' | 'text' | 'avatar';
    userName?: string;
    isReturningUser?: boolean;
    currentEmotion?: string;
    conversationPhase?: string;
}
export declare class FrankieSystemPrompt {
    /**
     * Build complete system prompt for ElevenLabs Conversational AI
     */
    static build(config: FrankiePromptConfig): string;
    private static getAgeGroup;
    private static getSessionLength;
    private static getChoiceCount;
    private static getAgeGuidance;
    /**
     * Build prompt for specific conversation phase
     */
    static buildForPhase(phase: string, config: FrankiePromptConfig): string;
}
//# sourceMappingURL=FrankieSystemPrompt.d.ts.map