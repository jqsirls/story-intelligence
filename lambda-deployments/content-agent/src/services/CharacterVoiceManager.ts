import { Logger } from 'winston';
import { CharacterVoiceGenerator, StoryVoiceProfile, StoryCharacterVoice } from './CharacterVoiceGenerator';
import { CharacterVoiceProfile } from './VoiceDesignService';
import { VoiceSettings, VOICE_CONFIGURATION, getVoiceSettings, getVoiceId, validateVoiceSettings } from '../config/VoiceConfiguration';

export interface CharacterVoice {
  characterName: string;
  voiceId: string;
  voiceSettings: VoiceSettings;
  ageAppropriate: boolean;
  gender?: 'male' | 'female' | 'neutral';
  personality?: 'cheerful' | 'mysterious' | 'wise' | 'playful' | 'gentle' | 'brave' | 'magical';
  isGenerated?: boolean; // New field to track if voice was generated
  generatedDescription?: string; // Description used for generation
}

export interface VoiceLibrary {
  characters: CharacterVoice[];
  defaultVoice: CharacterVoice;
  frankieVoice: CharacterVoice;
}

export class CharacterVoiceManager {
  private logger: Logger;
  private voiceLibrary: VoiceLibrary;
  private characterVoiceGenerator: CharacterVoiceGenerator;
  private storyVoiceProfiles: Map<string, StoryVoiceProfile> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
    this.voiceLibrary = this.initializeVoiceLibrary();
    this.characterVoiceGenerator = new CharacterVoiceGenerator(logger);
  }

  private initializeVoiceLibrary(): VoiceLibrary {
    return {
      frankieVoice: {
        characterName: 'Frankie',
        voiceId: VOICE_CONFIGURATION.frankieVoiceId,
        voiceSettings: VOICE_CONFIGURATION.frankieVoiceSettings,
        ageAppropriate: true,
        gender: 'neutral',
        personality: 'cheerful'
      },
      defaultVoice: {
        characterName: 'Default Character',
        voiceId: VOICE_CONFIGURATION.defaultVoiceId,
        voiceSettings: VOICE_CONFIGURATION.defaultVoiceSettings,
        ageAppropriate: true,
        gender: 'neutral',
        personality: 'gentle'
      },
      characters: [
        // Magical Characters
        {
          characterName: 'Star',
          voiceId: 'pNInz6obpgDQGcFmaJgB',
          voiceSettings: VOICE_CONFIGURATION.characterVoiceSettings.star,
          ageAppropriate: true,
          gender: 'neutral',
          personality: 'mysterious'
        },
        {
          characterName: 'Fairy',
          voiceId: 'pNInz6obpgDQGcFmaJgB',
          voiceSettings: VOICE_CONFIGURATION.characterVoiceSettings.fairy,
          ageAppropriate: true,
          gender: 'female',
          personality: 'playful'
        },
        {
          characterName: 'Wizard',
          voiceId: 'VR6AewLTigWG4xSOukaG',
          voiceSettings: VOICE_CONFIGURATION.characterVoiceSettings.wizard,
          ageAppropriate: true,
          gender: 'male',
          personality: 'wise'
        },
        {
          characterName: 'Dragon',
          voiceId: 'VR6AewLTigWG4xSOukaG',
          voiceSettings: VOICE_CONFIGURATION.characterVoiceSettings.dragon,
          ageAppropriate: true,
          gender: 'neutral',
          personality: 'mysterious'
        },
        // Animal Characters
        {
          characterName: 'Rabbit',
          voiceId: 'EXAVITQu4vr4xnSDxMaL',
          voiceSettings: VOICE_CONFIGURATION.characterVoiceSettings.rabbit,
          ageAppropriate: true,
          gender: 'neutral',
          personality: 'playful'
        },
        {
          characterName: 'Owl',
          voiceId: 'VR6AewLTigWG4xSOukaG',
          voiceSettings: VOICE_CONFIGURATION.characterVoiceSettings.owl,
          ageAppropriate: true,
          gender: 'neutral',
          personality: 'wise'
        },
        // Human Characters
        {
          characterName: 'Child',
          voiceId: 'EXAVITQu4vr4xnSDxMaL',
          voiceSettings: VOICE_CONFIGURATION.characterVoiceSettings.child,
          ageAppropriate: true,
          gender: 'neutral',
          personality: 'cheerful'
        },
        {
          characterName: 'Parent',
          voiceId: 'VR6AewLTigWG4xSOukaG',
          voiceSettings: VOICE_CONFIGURATION.characterVoiceSettings.parent,
          ageAppropriate: true,
          gender: 'neutral',
          personality: 'gentle'
        }
      ]
    };
  }

  getVoiceForCharacter(characterName: string, storyType?: string): CharacterVoice {
    const normalizedName = characterName.toLowerCase().trim();
    
    // First, try exact match
    const exactMatch = this.voiceLibrary.characters.find(
      char => char.characterName.toLowerCase() === normalizedName
    );
    
    if (exactMatch) {
      this.logger.info('Found exact voice match', { characterName, voiceId: exactMatch.voiceId });
      return exactMatch;
    }

    // Try partial match
    const partialMatch = this.voiceLibrary.characters.find(
      char => normalizedName.includes(char.characterName.toLowerCase()) ||
              char.characterName.toLowerCase().includes(normalizedName)
    );
    
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

  private getVoiceByStoryType(storyType?: string): CharacterVoice | null {
    if (!storyType) return null;

    const storyTypeMap: Record<string, string> = {
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

  getFrankieVoice(): CharacterVoice {
    return this.voiceLibrary.frankieVoice;
  }

  addCustomCharacterVoice(characterVoice: CharacterVoice): void {
    // Check if character already exists
    const existingIndex = this.voiceLibrary.characters.findIndex(
      char => char.characterName.toLowerCase() === characterVoice.characterName.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Update existing character
      this.voiceLibrary.characters[existingIndex] = characterVoice;
      this.logger.info('Updated custom character voice', { characterName: characterVoice.characterName });
    } else {
      // Add new character
      this.voiceLibrary.characters.push(characterVoice);
      this.logger.info('Added custom character voice', { characterName: characterVoice.characterName });
    }
  }

  removeCustomCharacterVoice(characterName: string): boolean {
    const index = this.voiceLibrary.characters.findIndex(
      char => char.characterName.toLowerCase() === characterName.toLowerCase()
    );

    if (index >= 0) {
      this.voiceLibrary.characters.splice(index, 1);
      this.logger.info('Removed custom character voice', { characterName });
      return true;
    }

    return false;
  }

  getAllCharacterVoices(): CharacterVoice[] {
    return [...this.voiceLibrary.characters];
  }

  getVoicesByGender(gender: 'male' | 'female' | 'neutral'): CharacterVoice[] {
    return this.voiceLibrary.characters.filter(char => char.gender === gender);
  }

  getVoicesByPersonality(personality: string): CharacterVoice[] {
    return this.voiceLibrary.characters.filter(char => char.personality === personality);
  }

  getAgeAppropriateVoices(): CharacterVoice[] {
    return this.voiceLibrary.characters.filter(char => char.ageAppropriate);
  }

  validateVoiceSettings(voiceSettings: CharacterVoice['voiceSettings']): boolean {
    return validateVoiceSettings(voiceSettings);
  }

  getRecommendedVoiceSettings(storyType: string, characterPersonality?: string): CharacterVoice['voiceSettings'] {
    return getVoiceSettings(characterPersonality || 'default', 'story_narration');
  }

  /**
   * Generate voices for a complete story
   */
  async generateStoryVoices(
    storyId: string,
    storyType: 'adventure' | 'bedtime' | 'educational' | 'fantasy',
    characterNames: string[],
    characterPersonalities?: Map<string, string>
  ): Promise<StoryVoiceProfile> {
    try {
      this.logger.info('Generating story voices', {
        storyId,
        storyType,
        characterCount: characterNames.length
      });

      // Create character profiles
      const characterProfiles: CharacterVoiceProfile[] = characterNames.map(name => {
        const personality = characterPersonalities?.get(name) || 'friendly';
        return {
          characterName: name,
          voiceDescription: `A ${personality} ${name.toLowerCase()} perfect for ${storyType} stories`,
          voiceSettings: this.getRecommendedVoiceSettings(storyType, personality),
          ageAppropriate: true,
          gender: 'neutral',
          personality: personality as any,
          storyType: storyType
        };
      });

      // Generate voices using CharacterVoiceGenerator
      const storyVoiceProfile = await this.characterVoiceGenerator.generateStoryCharacterVoices(
        storyId,
        storyType,
        characterProfiles
      );

      // Store the profile for future use
      this.storyVoiceProfiles.set(storyId, storyVoiceProfile);

      this.logger.info('Story voices generated successfully', {
        storyId,
        characterCount: storyVoiceProfile.characters.length,
        narratorVoiceId: storyVoiceProfile.narratorVoiceId
      });

      return storyVoiceProfile;

    } catch (error) {
      this.logger.error('Story voice generation failed', { error });
      throw error;
    }
  }

  /**
   * Get voice for a character in a specific story context
   */
  getCharacterVoiceForStory(
    storyId: string,
    characterName: string,
    context?: string
  ): string | undefined {
    const storyProfile = this.storyVoiceProfiles.get(storyId);
    
    if (!storyProfile) {
      this.logger.warn('Story voice profile not found', { storyId });
      const characterVoice = this.getVoiceForCharacter(characterName);
      return characterVoice?.voiceId;
    }

    // Try to get context-specific voice
    if (context) {
      const contextVoiceId = this.characterVoiceGenerator.getCharacterVoiceForContext(
        storyProfile,
        characterName,
        context
      );
      
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
  async createQuickCharacterVoice(
    characterName: string,
    personality: string,
    storyType: string
  ): Promise<string> {
    try {
      this.logger.info('Creating quick character voice', {
        characterName,
        personality,
        storyType
      });

      const voiceId = await this.characterVoiceGenerator.createQuickCharacterVoice(
        characterName,
        personality,
        storyType
      );

      // Add to voice library
      const characterVoice: CharacterVoice = {
        characterName: characterName,
        voiceId: voiceId,
        voiceSettings: getVoiceSettings(characterName.toLowerCase(), 'multi_character'),
        ageAppropriate: true,
        gender: 'neutral',
        personality: personality as any,
        isGenerated: true,
        generatedDescription: `A ${personality} ${characterName.toLowerCase()} perfect for ${storyType} stories`
      };

      this.voiceLibrary.characters.push(characterVoice);

      this.logger.info('Quick character voice created and added to library', {
        characterName,
        voiceId
      });

      return voiceId;

    } catch (error) {
      this.logger.error('Quick character voice creation failed', { error });
      throw error;
    }
  }

  /**
   * Refine an existing character voice
   */
  async refineCharacterVoice(
    characterName: string,
    voiceId: string,
    refinementPrompts: string[]
  ): Promise<string> {
    try {
      this.logger.info('Refining character voice', {
        characterName,
        voiceId,
        refinementCount: refinementPrompts.length
      });

      const refinedVoiceId = await this.characterVoiceGenerator.refineCharacterVoice(
        characterName,
        voiceId,
        refinementPrompts
      );

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

    } catch (error) {
      this.logger.error('Character voice refinement failed', { error });
      throw error;
    }
  }

  /**
   * Get story voice profile
   */
  getStoryVoiceProfile(storyId: string): StoryVoiceProfile | undefined {
    return this.storyVoiceProfiles.get(storyId);
  }

  /**
   * List all generated voices
   */
  getGeneratedVoices(): CharacterVoice[] {
    return this.voiceLibrary.characters.filter(voice => voice.isGenerated);
  }

  /**
   * Get voice statistics
   */
  getVoiceStatistics(): {
    totalVoices: number;
    generatedVoices: number;
    storyProfiles: number;
    characters: string[];
  } {
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
  cleanupStoryProfile(storyId: string): void {
    this.storyVoiceProfiles.delete(storyId);
    this.logger.info('Story voice profile cleaned up', { storyId });
  }
}
