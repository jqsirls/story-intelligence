import { Logger } from 'winston';
import { StoryVoiceProfile } from './CharacterVoiceGenerator';
export interface CharacterVoice {
    characterName: string;
    voiceId: string;
    voiceSettings: {
        stability: number;
        similarity_boost: number;
        use_speaker_boost: boolean;
        style: number;
        speed: number;
    };
    ageAppropriate: boolean;
    gender?: 'male' | 'female' | 'neutral';
    personality?: 'cheerful' | 'mysterious' | 'wise' | 'playful' | 'gentle' | 'brave' | 'magical';
    isGenerated?: boolean;
    generatedDescription?: string;
}
export interface VoiceLibrary {
    characters: CharacterVoice[];
    defaultVoice: CharacterVoice;
    frankieVoice: CharacterVoice;
}
export declare class CharacterVoiceManager {
    private logger;
    private voiceLibrary;
    private characterVoiceGenerator;
    private storyVoiceProfiles;
    constructor(logger: Logger);
    private initializeVoiceLibrary;
    getVoiceForCharacter(characterName: string, storyType?: string): CharacterVoice;
    private getVoiceByStoryType;
    getFrankieVoice(): CharacterVoice;
    addCustomCharacterVoice(characterVoice: CharacterVoice): void;
    removeCustomCharacterVoice(characterName: string): boolean;
    getAllCharacterVoices(): CharacterVoice[];
    getVoicesByGender(gender: 'male' | 'female' | 'neutral'): CharacterVoice[];
    getVoicesByPersonality(personality: string): CharacterVoice[];
    getAgeAppropriateVoices(): CharacterVoice[];
    validateVoiceSettings(voiceSettings: CharacterVoice['voiceSettings']): boolean;
    getRecommendedVoiceSettings(storyType: string, characterPersonality?: string): CharacterVoice['voiceSettings'];
    /**
     * Generate voices for a complete story
     */
    generateStoryVoices(storyId: string, storyType: 'adventure' | 'bedtime' | 'educational' | 'fantasy', characterNames: string[], characterPersonalities?: Map<string, string>): Promise<StoryVoiceProfile>;
    /**
     * Get voice for a character in a specific story context
     */
    getCharacterVoiceForStory(storyId: string, characterName: string, context?: string): string | undefined;
    /**
     * Create a quick character voice for testing
     */
    createQuickCharacterVoice(characterName: string, personality: string, storyType: string): Promise<string>;
    /**
     * Refine an existing character voice
     */
    refineCharacterVoice(characterName: string, voiceId: string, refinementPrompts: string[]): Promise<string>;
    /**
     * Get story voice profile
     */
    getStoryVoiceProfile(storyId: string): StoryVoiceProfile | undefined;
    /**
     * List all generated voices
     */
    getGeneratedVoices(): CharacterVoice[];
    /**
     * Get voice statistics
     */
    getVoiceStatistics(): {
        totalVoices: number;
        generatedVoices: number;
        storyProfiles: number;
        characters: string[];
    };
    /**
     * Clean up old story voice profiles
     */
    cleanupStoryProfile(storyId: string): void;
}
//# sourceMappingURL=CharacterVoiceManager.d.ts.map