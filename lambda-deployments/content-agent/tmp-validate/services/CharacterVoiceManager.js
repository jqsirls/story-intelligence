"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CharacterVoiceManager = void 0;
const CharacterVoiceGenerator_1 = require("./CharacterVoiceGenerator");
const VoiceConfiguration_1 = require("../config/VoiceConfiguration");
class CharacterVoiceManager {
    constructor(logger) {
        this.storyVoiceProfiles = new Map();
        this.logger = logger;
        this.voiceLibrary = this.initializeVoiceLibrary();
        this.characterVoiceGenerator = new CharacterVoiceGenerator_1.CharacterVoiceGenerator(logger);
    }
    initializeVoiceLibrary() {
        return {
            frankieVoice: {
                characterName: 'Frankie',
                voiceId: VoiceConfiguration_1.VOICE_CONFIGURATION.frankieVoiceId,
                voiceSettings: VoiceConfiguration_1.VOICE_CONFIGURATION.frankieVoiceSettings,
                ageAppropriate: true,
                gender: 'neutral',
                personality: 'cheerful'
            },
            defaultVoice: {
                characterName: 'Default Character',
                voiceId: VoiceConfiguration_1.VOICE_CONFIGURATION.defaultVoiceId,
                voiceSettings: VoiceConfiguration_1.VOICE_CONFIGURATION.defaultVoiceSettings,
                ageAppropriate: true,
                gender: 'neutral',
                personality: 'gentle'
            },
            characters: [
                // Magical Characters
                {
                    characterName: 'Star',
                    voiceId: 'pNInz6obpgDQGcFmaJgB',
                    voiceSettings: VoiceConfiguration_1.VOICE_CONFIGURATION.characterVoiceSettings.star,
                    ageAppropriate: true,
                    gender: 'neutral',
                    personality: 'mysterious'
                },
                {
                    characterName: 'Fairy',
                    voiceId: 'pNInz6obpgDQGcFmaJgB',
                    voiceSettings: VoiceConfiguration_1.VOICE_CONFIGURATION.characterVoiceSettings.fairy,
                    ageAppropriate: true,
                    gender: 'female',
                    personality: 'playful'
                },
                {
                    characterName: 'Wizard',
                    voiceId: 'VR6AewLTigWG4xSOukaG',
                    voiceSettings: VoiceConfiguration_1.VOICE_CONFIGURATION.characterVoiceSettings.wizard,
                    ageAppropriate: true,
                    gender: 'male',
                    personality: 'wise'
                },
                {
                    characterName: 'Dragon',
                    voiceId: 'VR6AewLTigWG4xSOukaG',
                    voiceSettings: VoiceConfiguration_1.VOICE_CONFIGURATION.characterVoiceSettings.dragon,
                    ageAppropriate: true,
                    gender: 'neutral',
                    personality: 'mysterious'
                },
                // Animal Characters
                {
                    characterName: 'Rabbit',
                    voiceId: 'EXAVITQu4vr4xnSDxMaL',
                    voiceSettings: VoiceConfiguration_1.VOICE_CONFIGURATION.characterVoiceSettings.rabbit,
                    ageAppropriate: true,
                    gender: 'neutral',
                    personality: 'playful'
                },
                {
                    characterName: 'Owl',
                    voiceId: 'VR6AewLTigWG4xSOukaG',
                    voiceSettings: VoiceConfiguration_1.VOICE_CONFIGURATION.characterVoiceSettings.owl,
                    ageAppropriate: true,
                    gender: 'neutral',
                    personality: 'wise'
                },
                // Human Characters
                {
                    characterName: 'Child',
                    voiceId: 'EXAVITQu4vr4xnSDxMaL',
                    voiceSettings: VoiceConfiguration_1.VOICE_CONFIGURATION.characterVoiceSettings.child,
                    ageAppropriate: true,
                    gender: 'neutral',
                    personality: 'cheerful'
                },
                {
                    characterName: 'Parent',
                    voiceId: 'VR6AewLTigWG4xSOukaG',
                    voiceSettings: VoiceConfiguration_1.VOICE_CONFIGURATION.characterVoiceSettings.parent,
                    ageAppropriate: true,
                    gender: 'neutral',
                    personality: 'gentle'
                }
            ]
        };
    }
    getVoiceForCharacter(characterName, storyType) {
        const normalizedName = characterName.toLowerCase().trim();
        // First, try exact match
        const exactMatch = this.voiceLibrary.characters.find(char => char.characterName.toLowerCase() === normalizedName);
        if (exactMatch) {
            this.logger.info('Found exact voice match', { characterName, voiceId: exactMatch.voiceId });
            return exactMatch;
        }
        // Try partial match
        const partialMatch = this.voiceLibrary.characters.find(char => normalizedName.includes(char.characterName.toLowerCase()) ||
            char.characterName.toLowerCase().includes(normalizedName));
        if (partialMatch) {
            this.logger.info('Found partial voice match', { characterName, voiceId: partialMatch.voiceId });
            return partialMatch;
        }
        // Try to match by story type
        const storyTypeMatch = this.getVoiceByStoryType(storyType);
        if (storyTypeMatch) {
            this.logger.info('Found voice match by story type', { characterName, storyType, voiceId: storyTypeMatch.voiceId });
            return storyTypeMatch;
        }
        // Default fallback
        this.logger.info('Using default voice', { characterName });
        return this.voiceLibrary.defaultVoice;
    }
    getVoiceByStoryType(storyType) {
        if (!storyType)
            return null;
        const storyTypeMap = {
            'adventure': 'Dragon',
            'fantasy': 'Wizard',
            'magical': 'Fairy',
            'animal': 'Rabbit',
            'mystery': 'Owl',
            'bedtime': 'Parent'
        };
        const suggestedCharacter = storyTypeMap[storyType.toLowerCase()];
        if (suggestedCharacter) {
            return this.getVoiceForCharacter(suggestedCharacter);
        }
        return null;
    }
    getFrankieVoice() {
        return this.voiceLibrary.frankieVoice;
    }
    addCustomCharacterVoice(characterVoice) {
        // Check if character already exists
        const existingIndex = this.voiceLibrary.characters.findIndex(char => char.characterName.toLowerCase() === characterVoice.characterName.toLowerCase());
        if (existingIndex >= 0) {
            // Update existing character
            this.voiceLibrary.characters[existingIndex] = characterVoice;
            this.logger.info('Updated custom character voice', { characterName: characterVoice.characterName });
        }
        else {
            // Add new character
            this.voiceLibrary.characters.push(characterVoice);
            this.logger.info('Added custom character voice', { characterName: characterVoice.characterName });
        }
    }
    removeCustomCharacterVoice(characterName) {
        const index = this.voiceLibrary.characters.findIndex(char => char.characterName.toLowerCase() === characterName.toLowerCase());
        if (index >= 0) {
            this.voiceLibrary.characters.splice(index, 1);
            this.logger.info('Removed custom character voice', { characterName });
            return true;
        }
        return false;
    }
    getAllCharacterVoices() {
        return [...this.voiceLibrary.characters];
    }
    getVoicesByGender(gender) {
        return this.voiceLibrary.characters.filter(char => char.gender === gender);
    }
    getVoicesByPersonality(personality) {
        return this.voiceLibrary.characters.filter(char => char.personality === personality);
    }
    getAgeAppropriateVoices() {
        return this.voiceLibrary.characters.filter(char => char.ageAppropriate);
    }
    validateVoiceSettings(voiceSettings) {
        return (0, VoiceConfiguration_1.validateVoiceSettings)(voiceSettings);
    }
    getRecommendedVoiceSettings(storyType, characterPersonality) {
        return (0, VoiceConfiguration_1.getVoiceSettings)(characterPersonality || 'default', 'story_narration');
    }
    /**
     * Generate voices for a complete story
     */
    async generateStoryVoices(storyId, storyType, characterNames, characterPersonalities) {
        try {
            this.logger.info('Generating story voices', {
                storyId,
                storyType,
                characterCount: characterNames.length
            });
            // Create character profiles
            const characterProfiles = characterNames.map(name => {
                const personality = characterPersonalities?.get(name) || 'friendly';
                return {
                    characterName: name,
                    voiceDescription: `A ${personality} ${name.toLowerCase()} perfect for ${storyType} stories`,
                    voiceSettings: this.getRecommendedVoiceSettings(storyType, personality),
                    ageAppropriate: true,
                    gender: 'neutral',
                    personality: personality,
                    storyType: storyType
                };
            });
            // Generate voices using CharacterVoiceGenerator
            const storyVoiceProfile = await this.characterVoiceGenerator.generateStoryCharacterVoices(storyId, storyType, characterProfiles);
            // Store the profile for future use
            this.storyVoiceProfiles.set(storyId, storyVoiceProfile);
            this.logger.info('Story voices generated successfully', {
                storyId,
                characterCount: storyVoiceProfile.characters.length,
                narratorVoiceId: storyVoiceProfile.narratorVoiceId
            });
            return storyVoiceProfile;
        }
        catch (error) {
            this.logger.error('Story voice generation failed', { error });
            throw error;
        }
    }
    /**
     * Get voice for a character in a specific story context
     */
    getCharacterVoiceForStory(storyId, characterName, context) {
        const storyProfile = this.storyVoiceProfiles.get(storyId);
        if (!storyProfile) {
            this.logger.warn('Story voice profile not found', { storyId });
            const characterVoice = this.getVoiceForCharacter(characterName);
            return characterVoice?.voiceId;
        }
        // Try to get context-specific voice
        if (context) {
            const contextVoiceId = this.characterVoiceGenerator.getCharacterVoiceForContext(storyProfile, characterName, context);
            if (contextVoiceId) {
                return contextVoiceId;
            }
        }
        // Fall back to character's base voice in story
        const character = storyProfile.characters.find(c => c.characterName === characterName);
        return character?.voiceId;
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
            const voiceId = await this.characterVoiceGenerator.createQuickCharacterVoice(characterName, personality, storyType);
            // Add to voice library
            const characterVoice = {
                characterName: characterName,
                voiceId: voiceId,
                voiceSettings: (0, VoiceConfiguration_1.getVoiceSettings)(characterName.toLowerCase(), 'multi_character'),
                ageAppropriate: true,
                gender: 'neutral',
                personality: personality,
                isGenerated: true,
                generatedDescription: `A ${personality} ${characterName.toLowerCase()} perfect for ${storyType} stories`
            };
            this.voiceLibrary.characters.push(characterVoice);
            this.logger.info('Quick character voice created and added to library', {
                characterName,
                voiceId
            });
            return voiceId;
        }
        catch (error) {
            this.logger.error('Quick character voice creation failed', { error });
            throw error;
        }
    }
    /**
     * Refine an existing character voice
     */
    async refineCharacterVoice(characterName, voiceId, refinementPrompts) {
        try {
            this.logger.info('Refining character voice', {
                characterName,
                voiceId,
                refinementCount: refinementPrompts.length
            });
            const refinedVoiceId = await this.characterVoiceGenerator.refineCharacterVoice(characterName, voiceId, refinementPrompts);
            // Update the voice library if this voice exists
            const characterVoice = this.voiceLibrary.characters.find(c => c.voiceId === voiceId);
            if (characterVoice) {
                characterVoice.voiceId = refinedVoiceId;
                characterVoice.isGenerated = true;
            }
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
     * Get story voice profile
     */
    getStoryVoiceProfile(storyId) {
        return this.storyVoiceProfiles.get(storyId);
    }
    /**
     * List all generated voices
     */
    getGeneratedVoices() {
        return this.voiceLibrary.characters.filter(voice => voice.isGenerated);
    }
    /**
     * Get voice statistics
     */
    getVoiceStatistics() {
        const generatedVoices = this.getGeneratedVoices();
        const allCharacters = this.voiceLibrary.characters.map(v => v.characterName);
        return {
            totalVoices: this.voiceLibrary.characters.length,
            generatedVoices: generatedVoices.length,
            storyProfiles: this.storyVoiceProfiles.size,
            characters: allCharacters
        };
    }
    /**
     * Clean up old story voice profiles
     */
    cleanupStoryProfile(storyId) {
        this.storyVoiceProfiles.delete(storyId);
        this.logger.info('Story voice profile cleaned up', { storyId });
    }
}
exports.CharacterVoiceManager = CharacterVoiceManager;
