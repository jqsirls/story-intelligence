import OpenAI from 'openai';
import { DynamicLanguageSwitchRequest, LocalizationResponse } from '../types';
export declare class DynamicLanguageSwitcher {
    private openai;
    constructor(openai: OpenAI);
    switchLanguage(request: DynamicLanguageSwitchRequest): Promise<LocalizationResponse>;
    private buildLanguageSwitchPrompt;
    /**
     * Determine if a language switch is appropriate at this point in the story
     */
    shouldSwitchLanguage(currentContext: any, targetLanguage: string, reason: string): Promise<{
        shouldSwitch: boolean;
        reasoning: string;
        suggestedTransitionPhrase?: string;
    }>;
    /**
     * Generate educational context for language switches
     */
    generateEducationalContext(fromLanguage: string, toLanguage: string, storyContext: any): Promise<{
        educationalValue: string;
        childFriendlyExplanation: string;
        vocabularyHighlights: string[];
    }>;
}
//# sourceMappingURL=DynamicLanguageSwitcher.d.ts.map