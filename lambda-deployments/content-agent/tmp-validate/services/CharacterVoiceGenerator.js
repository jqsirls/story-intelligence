"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CharacterVoiceGenerator = void 0;
const VoiceDesignService_1 = require("./VoiceDesignService");
const VoiceRemixingService_1 = require("./VoiceRemixingService");
class CharacterVoiceGenerator {
    constructor(logger, elevenLabsApiKey) {
        this.logger = logger;
        // Pass API key to services if provided
        this.voiceDesignService = new VoiceDesignService_1.VoiceDesignService(logger, elevenLabsApiKey);
        this.voiceRemixingService = new VoiceRemixingService_1.VoiceRemixingService(logger, elevenLabsApiKey);
    }
    /**
     * Generate voices for all characters in a story
     */
    async generateStoryCharacterVoices(storyId, storyType, characterProfiles) {
        try {
            this.logger.info('Generating character voices for story', {
                storyId,
                storyType,
                characterCount: characterProfiles.length
            });
            // Step 1: Design base voices for all characters
            const baseVoiceMap = await this.voiceDesignService.designStoryCharacterVoices(characterProfiles);
            const storyCharacters = [];
            // Step 2: Create remix variations for each character
            for (const characterProfile of characterProfiles) {
                const baseVoiceId = baseVoiceMap.get(characterProfile.characterName);
                if (!baseVoiceId) {
                    this.logger.warn('No base voice found for character', {
                        characterName: characterProfile.characterName
                    });
                    continue;
                }
                // Create remix variations for different contexts
                const remixVariations = await this.voiceRemixingService.createCharacterRemixVariations(characterProfile.characterName, baseVoiceId, characterProfile.personality || 'friendly', storyType);
                const storyCharacter = {
                    characterName: characterProfile.characterName,
                    voiceId: baseVoiceId,
                    voiceDescription: this.voiceDesignService.generateCharacterVoiceDescription(characterProfile),
                    personality: characterProfile.personality || 'friendly',
                    storyType: storyType,
                    voiceSettings: characterProfile.voiceSettings,
                    remixVariations: remixVariations
                };
                storyCharacters.push(storyCharacter);
                this.logger.info('Character voice generated', {
                    characterName: characterProfile.characterName,
                    baseVoiceId: baseVoiceId,
                    remixVariations: Array.from(remixVariations.keys())
                });
            }
            // Step 3: Generate narrator voice if needed
            let narratorVoiceId;
            try {
                const narratorProfile = {
                    characterName: 'Narrator',
                    voiceDescription: `A warm and engaging narrator perfect for ${storyType} stories`,
                    voiceSettings: {
                        stability: 0.8,
                        similarity_boost: 0.7,
                        use_speaker_boost: true,
                        style: 0.4,
                        speed: 1.0
                    },
                    ageAppropriate: true,
                    gender: 'neutral',
                    personality: 'gentle',
                    storyType: storyType
                };
                const narratorDesign = await this.voiceDesignService.designVoice({
                    voice_description: narratorProfile.voiceDescription,
                    model_id: 'eleven_ttv_v3',
                    guidance_scale: 6,
                    quality: 0.9
                });
                if (narratorDesign.previews.length > 0) {
                    narratorVoiceId = await this.voiceDesignService.createVoiceFromDesign(narratorDesign.previews[0].generated_voice_id, `Narrator_${storyType}`, narratorProfile.voiceDescription);
                }
            }
            catch (error) {
                this.logger.warn('Failed to generate narrator voice', { error });
            }
            const storyVoiceProfile = {
                storyId: storyId,
                storyType: storyType,
                characters: storyCharacters,
                narratorVoiceId: narratorVoiceId,
                backgroundMusicStyle: this.getBackgroundMusicStyle(storyType)
            };
            this.logger.info('Story character voices generated successfully', {
                storyId: storyId,
                characterCount: storyCharacters.length,
                narratorVoiceId: narratorVoiceId
            });
            return storyVoiceProfile;
        }
        catch (error) {
            this.logger.error('Story character voice generation failed', { error });
            throw error;
        }
    }
    /**
     * Get the best voice for a character in a specific context
     */
    getCharacterVoiceForContext(storyVoiceProfile, characterName, context) {
        const character = storyVoiceProfile.characters.find(c => c.characterName === characterName);
        if (!character) {
            this.logger.warn('Character not found in story voice profile', { characterName });
            return undefined;
        }
        // Try to get context-specific remix first
        if (character.remixVariations && character.remixVariations.has(context)) {
            return character.remixVariations.get(context);
        }
        // Fall back to base voice
        return character.voiceId;
    }
    /**
     * Refine a character voice based on feedback
     */
    async refineCharacterVoice(characterName, voiceId, refinementPrompts) {
        try {
            this.logger.info('Refining character voice', {
                characterName,
                voiceId,
                refinementCount: refinementPrompts.length
            });
            const refinedVoiceId = await this.voiceRemixingService.iterativeRefinement(voiceId, refinementPrompts);
            this.logger.info('Character voice refined successfully', {
                characterName,
                originalVoiceId: voiceId,
                refinedVoiceId: refinedVoiceId
            });
            return refinedVoiceId;
        }
        catch (error) {
            this.logger.error('Character voice refinement failed', { error });
            throw error;
        }
    }
    /**
     * Create a quick character voice for testing
     */
    async createQuickCharacterVoice(characterName, personality, storyType) {
        try {
            this.logger.info('Creating quick character voice', {
                characterName,
                personality,
                storyType
            });
            const characterProfile = {
                characterName: characterName,
                voiceDescription: `A ${personality} ${characterName.toLowerCase()} perfect for ${storyType} stories`,
                voiceSettings: {
                    stability: 0.75,
                    similarity_boost: 0.75,
                    use_speaker_boost: true,
                    style: 0.5,
                    speed: 1.0
                },
                ageAppropriate: true,
                gender: 'neutral',
                personality: personality,
                storyType: storyType
            };
            const designResult = await this.voiceDesignService.designVoice({
                voice_description: characterProfile.voiceDescription,
                model_id: 'eleven_ttv_v3',
                guidance_scale: 7,
                quality: 0.8
            });
            if (designResult.previews.length === 0) {
                throw new Error('No voice previews generated');
            }
            const voiceId = await this.voiceDesignService.createVoiceFromDesign(designResult.previews[0].generated_voice_id, `${characterName}_${personality}`, characterProfile.voiceDescription);
            this.logger.info('Quick character voice created', {
                characterName,
                voiceId,
                description: characterProfile.voiceDescription
            });
            return voiceId;
        }
        catch (error) {
            this.logger.error('Quick character voice creation failed', { error });
            throw error;
        }
    }
    /**
     * Get background music style based on story type
     */
    getBackgroundMusicStyle(storyType) {
        switch (storyType) {
            case 'adventure':
                return 'epic and adventurous';
            case 'bedtime':
                return 'calm and soothing';
            case 'educational':
                return 'uplifting and engaging';
            case 'fantasy':
                return 'magical and enchanting';
            default:
                return 'gentle and pleasant';
        }
    }
    /**
     * Validate voice settings for children's content
     */
    validateVoiceSettings(voiceSettings) {
        // Ensure age-appropriate settings
        if (voiceSettings.speed < 0.7 || voiceSettings.speed > 1.3) {
            this.logger.warn('Voice speed outside recommended range for children', {
                speed: voiceSettings.speed
            });
            return false;
        }
        if (voiceSettings.stability < 0.5) {
            this.logger.warn('Voice stability too low for children', {
                stability: voiceSettings.stability
            });
            return false;
        }
        return true;
    }
    /**
     * Get recommended voice settings for different character types
     */
    getRecommendedVoiceSettings(characterType) {
        switch (characterType) {
            case 'hero':
                return {
                    stability: 0.7,
                    similarity_boost: 0.8,
                    use_speaker_boost: true,
                    style: 0.8,
                    speed: 1.1
                };
            case 'villain':
                return {
                    stability: 0.6,
                    similarity_boost: 0.7,
                    use_speaker_boost: true,
                    style: 0.9,
                    speed: 0.9
                };
            case 'mentor':
                return {
                    stability: 0.9,
                    similarity_boost: 0.8,
                    use_speaker_boost: true,
                    style: 0.3,
                    speed: 0.8
                };
            case 'child':
                return {
                    stability: 0.8,
                    similarity_boost: 0.7,
                    use_speaker_boost: true,
                    style: 0.6,
                    speed: 1.2
                };
            case 'animal':
                return {
                    stability: 0.7,
                    similarity_boost: 0.6,
                    use_speaker_boost: true,
                    style: 0.7,
                    speed: 1.0
                };
            default:
                return {
                    stability: 0.75,
                    similarity_boost: 0.75,
                    use_speaker_boost: true,
                    style: 0.5,
                    speed: 1.0
                };
        }
    }
}
exports.CharacterVoiceGenerator = CharacterVoiceGenerator;
