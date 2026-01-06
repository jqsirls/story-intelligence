import { Logger } from 'winston';
import { CharacterVoiceProfile } from './VoiceDesignService';
export interface StoryCharacterVoice {
    characterName: string;
    voiceId: string;
    voiceDescription: string;
    personality: string;
    storyType: string;
    voiceSettings: {
        stability: number;
        similarity_boost: number;
        use_speaker_boost: boolean;
        style: number;
        speed: number;
    };
    remixVariations?: Map<string, string>;
}
export interface StoryVoiceProfile {
    storyId: string;
    storyType: 'adventure' | 'bedtime' | 'educational' | 'fantasy';
    characters: StoryCharacterVoice[];
    narratorVoiceId?: string;
    backgroundMusicStyle?: string;
}
export declare class CharacterVoiceGenerator {
    private logger;
    private voiceDesignService;
    private voiceRemixingService;
    constructor(logger: Logger);
    /**
     * Generate voices for all characters in a story
     */
    generateStoryCharacterVoices(storyId: string, storyType: 'adventure' | 'bedtime' | 'educational' | 'fantasy', characterProfiles: CharacterVoiceProfile[]): Promise<StoryVoiceProfile>;
    /**
     * Get the best voice for a character in a specific context
     */
    getCharacterVoiceForContext(storyVoiceProfile: StoryVoiceProfile, characterName: string, context: string): string | undefined;
    /**
     * Refine a character voice based on feedback
     */
    refineCharacterVoice(characterName: string, voiceId: string, refinementPrompts: string[]): Promise<string>;
    /**
     * Create a quick character voice for testing
     */
    createQuickCharacterVoice(characterName: string, personality: string, storyType: string): Promise<string>;
    /**
     * Get background music style based on story type
     */
    private getBackgroundMusicStyle;
    /**
     * Validate voice settings for children's content
     */
    validateVoiceSettings(voiceSettings: any): boolean;
    /**
     * Get recommended voice settings for different character types
     */
    getRecommendedVoiceSettings(characterType: string): {
        stability: number;
        similarity_boost: number;
        use_speaker_boost: boolean;
        style: number;
        speed: number;
    };
}
//# sourceMappingURL=CharacterVoiceGenerator.d.ts.map