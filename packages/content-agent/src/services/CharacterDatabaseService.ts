import { SupabaseClient } from '@supabase/supabase-js';
import { Character, CharacterTraits } from '@alexa-multi-agent/shared-types';
import { Logger } from 'winston';

export interface CharacterCreateRequest {
  libraryId: string;
  name: string;
  traits: CharacterTraits;
  artPrompt?: string;
}

export interface CharacterUpdateRequest {
  characterId: string;
  name?: string;
  traits?: Partial<CharacterTraits>;
  artPrompt?: string;
  appearanceUrl?: string;
}

export interface CharacterSearchOptions {
  libraryId: string;
  species?: string;
  ageRange?: { min: number; max: number };
  hasInclusivityTraits?: boolean;
  limit?: number;
  offset?: number;
}

export class CharacterDatabaseService {
  private supabase: SupabaseClient;
  private logger: Logger;

  constructor(supabase: SupabaseClient, logger: Logger) {
    this.supabase = supabase;
    this.logger = logger;
  }

  /**
   * Create a new character in a library
   */
  async createCharacter(request: CharacterCreateRequest): Promise<Character> {
    this.logger.info('Creating character in database', {
      libraryId: request.libraryId,
      characterName: request.name
    });

    try {
      // Use the database function for proper permission checking and COPPA compliance
      const { data, error } = await this.supabase.rpc('create_character_in_library', {
        p_library_id: request.libraryId,
        p_name: request.name,
        p_traits: request.traits,
        p_art_prompt: request.artPrompt
      });

      if (error) {
        this.logger.error('Error creating character', { error, request });
        throw new Error(`Failed to create character: ${error.message}`);
      }

      const characterId = data as string;

      // Fetch the created character
      const character = await this.getCharacter(characterId);
      if (!character) {
        throw new Error('Character was created but could not be retrieved');
      }

      this.logger.info('Character created successfully', {
        characterId,
        libraryId: request.libraryId,
        name: request.name
      });

      return character;

    } catch (error) {
      this.logger.error('Failed to create character', { error, request });
      throw error;
    }
  }

  /**
   * Get a character by ID
   */
  async getCharacter(characterId: string): Promise<Character | null> {
    try {
      const { data, error } = await this.supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        this.logger.error('Error fetching character', { error, characterId });
        throw new Error(`Failed to fetch character: ${error.message}`);
      }

      return this.mapDatabaseToCharacter(data);

    } catch (error) {
      this.logger.error('Failed to get character', { error, characterId });
      throw error;
    }
  }

  /**
   * Update a character
   */
  async updateCharacter(request: CharacterUpdateRequest): Promise<Character> {
    this.logger.info('Updating character', {
      characterId: request.characterId,
      hasNameUpdate: !!request.name,
      hasTraitsUpdate: !!request.traits,
      hasArtPromptUpdate: !!request.artPrompt,
      hasAppearanceUrlUpdate: !!request.appearanceUrl
    });

    try {
      // Merge traits if provided
      let mergedTraits: CharacterTraits | undefined;
      if (request.traits) {
        const existingCharacter = await this.getCharacter(request.characterId);
        if (!existingCharacter) {
          throw new Error('Character not found');
        }
        mergedTraits = { ...existingCharacter.traits, ...request.traits };
      }

      // Use the database function for proper permission checking
      const { error } = await this.supabase.rpc('update_character', {
        p_character_id: request.characterId,
        p_name: request.name,
        p_traits: mergedTraits,
        p_art_prompt: request.artPrompt,
        p_appearance_url: request.appearanceUrl
      });

      if (error) {
        this.logger.error('Error updating character', { error, request });
        throw new Error(`Failed to update character: ${error.message}`);
      }

      // Fetch the updated character
      const updatedCharacter = await this.getCharacter(request.characterId);
      if (!updatedCharacter) {
        throw new Error('Character was updated but could not be retrieved');
      }

      this.logger.info('Character updated successfully', {
        characterId: request.characterId
      });

      return updatedCharacter;

    } catch (error) {
      this.logger.error('Failed to update character', { error, request });
      throw error;
    }
  }

  /**
   * Delete a character
   */
  async deleteCharacter(characterId: string): Promise<boolean> {
    this.logger.info('Deleting character', { characterId });

    try {
      // Use the database function for proper permission checking
      const { error } = await this.supabase.rpc('delete_character', {
        p_character_id: characterId
      });

      if (error) {
        this.logger.error('Error deleting character', { error, characterId });
        throw new Error(`Failed to delete character: ${error.message}`);
      }

      this.logger.info('Character deleted successfully', { characterId });
      return true;

    } catch (error) {
      this.logger.error('Failed to delete character', { error, characterId });
      throw error;
    }
  }

  /**
   * Get all characters in a library
   */
  async getLibraryCharacters(libraryId: string): Promise<Character[]> {
    this.logger.info('Fetching library characters', { libraryId });

    try {
      // Use the database function for proper permission checking
      const { data, error } = await this.supabase.rpc('get_library_characters', {
        p_library_id: libraryId
      });

      if (error) {
        this.logger.error('Error fetching library characters', { error, libraryId });
        throw new Error(`Failed to fetch library characters: ${error.message}`);
      }

      const characters = (data || []).map((row: any) => this.mapDatabaseToCharacter({
        id: row.id,
        library_id: libraryId,
        name: row.name,
        traits: row.traits,
        art_prompt: row.art_prompt,
        appearance_url: row.appearance_url,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      this.logger.info('Library characters fetched successfully', {
        libraryId,
        count: characters.length
      });

      return characters;

    } catch (error) {
      this.logger.error('Failed to get library characters', { error, libraryId });
      throw error;
    }
  }

  /**
   * Search characters with filters
   */
  async searchCharacters(options: CharacterSearchOptions): Promise<Character[]> {
    this.logger.info('Searching characters', { options });

    try {
      let query = this.supabase
        .from('characters')
        .select('*')
        .eq('library_id', options.libraryId);

      // Apply filters
      if (options.species) {
        query = query.eq('traits->species', options.species);
      }

      if (options.ageRange) {
        query = query
          .gte('traits->age', options.ageRange.min)
          .lte('traits->age', options.ageRange.max);
      }

      if (options.hasInclusivityTraits !== undefined) {
        if (options.hasInclusivityTraits) {
          query = query.not('traits->inclusivityTraits', 'is', null);
        } else {
          query = query.or('traits->inclusivityTraits.is.null,traits->inclusivityTraits.eq.[]');
        }
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      // Order by creation date
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error searching characters', { error, options });
        throw new Error(`Failed to search characters: ${error.message}`);
      }

      const characters = (data || []).map(row => this.mapDatabaseToCharacter(row));

      this.logger.info('Character search completed', {
        libraryId: options.libraryId,
        count: characters.length,
        filters: {
          species: options.species,
          ageRange: options.ageRange,
          hasInclusivityTraits: options.hasInclusivityTraits
        }
      });

      return characters;

    } catch (error) {
      this.logger.error('Failed to search characters', { error, options });
      throw error;
    }
  }

  /**
   * Check if character name is unique in library
   */
  async isCharacterNameUnique(libraryId: string, name: string, excludeCharacterId?: string): Promise<boolean> {
    try {
      let query = this.supabase
        .from('characters')
        .select('id')
        .eq('library_id', libraryId)
        .ilike('name', name);

      if (excludeCharacterId) {
        query = query.neq('id', excludeCharacterId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error checking character name uniqueness', { error, libraryId, name });
        throw new Error(`Failed to check character name uniqueness: ${error.message}`);
      }

      return (data || []).length === 0;

    } catch (error) {
      this.logger.error('Failed to check character name uniqueness', { error, libraryId, name });
      throw error;
    }
  }

  /**
   * Get character statistics for a library
   */
  async getLibraryCharacterStats(libraryId: string): Promise<{
    totalCharacters: number;
    speciesDistribution: Record<string, number>;
    ageDistribution: Record<string, number>;
    inclusivityTraitsCount: number;
    averageAge: number;
  }> {
    try {
      const characters = await this.getLibraryCharacters(libraryId);

      const stats = {
        totalCharacters: characters.length,
        speciesDistribution: {} as Record<string, number>,
        ageDistribution: {} as Record<string, number>,
        inclusivityTraitsCount: 0,
        averageAge: 0
      };

      let totalAge = 0;
      let ageCount = 0;

      characters.forEach(character => {
        // Species distribution
        const species = character.traits.species;
        stats.speciesDistribution[species] = (stats.speciesDistribution[species] || 0) + 1;

        // Age distribution
        if (character.traits.age) {
          const ageGroup = this.getAgeGroup(character.traits.age);
          stats.ageDistribution[ageGroup] = (stats.ageDistribution[ageGroup] || 0) + 1;
          totalAge += character.traits.age;
          ageCount++;
        }

        // Inclusivity traits count
        if (character.traits.inclusivityTraits && character.traits.inclusivityTraits.length > 0) {
          stats.inclusivityTraitsCount++;
        }
      });

      // Calculate average age
      stats.averageAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;

      this.logger.info('Library character stats calculated', { libraryId, stats });

      return stats;

    } catch (error) {
      this.logger.error('Failed to get library character stats', { error, libraryId });
      throw error;
    }
  }

  /**
   * Map database row to Character object
   */
  private mapDatabaseToCharacter(row: any): Character {
    return {
      id: row.id,
      libraryId: row.library_id,
      name: row.name,
      traits: row.traits,
      artPrompt: row.art_prompt,
      appearanceUrl: row.appearance_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at
    };
  }

  /**
   * Get age group for statistics
   */
  private getAgeGroup(age: number): string {
    if (age <= 3) return '0-3';
    if (age <= 6) return '4-6';
    if (age <= 9) return '7-9';
    if (age <= 12) return '10-12';
    if (age <= 15) return '13-15';
    return '16+';
  }
}