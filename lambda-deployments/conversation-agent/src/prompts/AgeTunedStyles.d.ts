/**
 * Age-Tuned Conversation Styles
 *
 * Provides AI with age-specific guidance for language, pacing, and interaction patterns.
 * Based on: agentic-ux scripts sections 2, 10.32, 26.6
 * Version: 1.0.0
 */
export type AgeGroup = '3-4' | '5-6' | '7-9' | '10+';
export interface AgeStyle {
    ageRange: string;
    sessionLength: string;
    beatCount: string;
    maxChoices: number;
    sentenceComplexity: string;
    vocabularyLevel: string;
    examples: string[];
    pacing: string;
    specialConsiderations: string[];
}
export declare class AgeTunedStyles {
    /**
     * Get conversation style guidance for specific age
     */
    static getForAge(age: number): string;
    private static determineAgeGroup;
    private static styles;
    private static getOpeners;
    private static getChoiceFormats;
    /**
     * Get complete style configuration object
     */
    static getStyleConfig(age: number): AgeStyle;
    /**
     * Validate if session length appropriate for age
     */
    static validateSessionLength(age: number, durationMinutes: number): {
        appropriate: boolean;
        recommendation?: string;
    };
}
//# sourceMappingURL=AgeTunedStyles.d.ts.map