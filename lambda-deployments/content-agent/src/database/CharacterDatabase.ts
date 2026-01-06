/**
 * Character Database Service
 * Manages saved user characters with visual headshots and voice assignments
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { CharacterTraits } from '@alexa-multi-agent/shared-types';

export interface SavedCharacter {
  id: string;
  userId: string;
  libraryId: string;
  name: string;
  traits: CharacterTraits;
  dna: any; // CharacterDNA
  headshotUrl?: string;
  headshotPrompt?: string;
  elevenLabsVoiceId: string;
  hedraAvatarId?: string; // Optional for premium users
  createdAt: Date;
  updatedAt: Date;
  usageCount: number; // How many stories feature this character
  isFavorite: boolean;
  metadata?: {
    lastUsedAt?: Date;
    totalStories?: number;
    averageSessionLength?: number;
    userRating?: number;
  };
}

export interface CharacterFilter {
  userId?: string;
  libraryId?: string;
  isFavorite?: boolean;
  limit?: number;
  offset?: number;
}

export class CharacterDatabase {
  private supabase: SupabaseClient;
  private logger: Logger;
  private tableName = 'user_characters';

  constructor(supabaseUrl: string, supabaseKey: string, logger: Logger) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger = logger;
  }

  /**
   * Create a new character
   */
  async createCharacter(character: Omit<SavedCharacter, 'metadata'>): Promise<SavedCharacter> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert({
          id: character.id,
          user_id: character.userId,
          library_id: character.libraryId,
          name: character.name,
          traits: character.traits,
          dna: character.dna,
          headshot_url: character.headshotUrl,
          headshot_prompt: character.headshotPrompt,
          elevenlabs_voice_id: character.elevenLabsVoiceId,
          hedra_avatar_id: character.hedraAvatarId,
          created_at: character.createdAt.toISOString(),
          updated_at: character.updatedAt.toISOString(),
          usage_count: character.usageCount,
          is_favorite: character.isFavorite
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      this.logger.info('Character created in database', {
        characterId: character.id,
        userId: character.userId,
        name: character.name
      });

      return this.mapToCharacter(data);
    } catch (error) {
      this.logger.error('Failed to create character', { error, characterId: character.id });
      throw error;
    }
  }

  /**
   * Get character by ID
   */
  async getCharacterById(characterId: string): Promise<SavedCharacter | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', characterId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }

      return data ? this.mapToCharacter(data) : null;
    } catch (error) {
      this.logger.error('Failed to get character', { error, characterId });
      throw error;
    }
  }

  /**
   * Get all characters for a user
   */
  async getCharactersByUser(
    userId: string,
    filter?: CharacterFilter
  ): Promise<SavedCharacter[]> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId);

      if (filter?.libraryId) {
        query = query.eq('library_id', filter.libraryId);
      }

      if (filter?.isFavorite !== undefined) {
        query = query.eq('is_favorite', filter.isFavorite);
      }

      // Order by most recently created
      query = query.order('created_at', { ascending: false });

      if (filter?.limit) {
        query = query.limit(filter.limit);
      }

      if (filter?.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map(this.mapToCharacter);
    } catch (error) {
      this.logger.error('Failed to get characters by user', { error, userId });
      throw error;
    }
  }

  /**
   * Update character
   */
  async updateCharacter(
    characterId: string,
    updates: Partial<SavedCharacter>
  ): Promise<SavedCharacter> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.traits) updateData.traits = updates.traits;
      if (updates.headshotUrl) updateData.headshot_url = updates.headshotUrl;
      if (updates.elevenLabsVoiceId) updateData.elevenlabs_voice_id = updates.elevenLabsVoiceId;
      if (updates.hedraAvatarId) updateData.hedra_avatar_id = updates.hedraAvatarId;
      if (updates.usageCount !== undefined) updateData.usage_count = updates.usageCount;
      if (updates.isFavorite !== undefined) updateData.is_favorite = updates.isFavorite;
      if (updates.metadata) updateData.metadata = updates.metadata;

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', characterId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      this.logger.info('Character updated', { characterId, updates: Object.keys(updateData) });

      return this.mapToCharacter(data);
    } catch (error) {
      this.logger.error('Failed to update character', { error, characterId });
      throw error;
    }
  }

  /**
   * Delete character
   */
  async deleteCharacter(characterId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', characterId);

      if (error) {
        throw error;
      }

      this.logger.info('Character deleted', { characterId });
    } catch (error) {
      this.logger.error('Failed to delete character', { error, characterId });
      throw error;
    }
  }

  /**
   * Increment usage count for character
   */
  async incrementUsageCount(characterId: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('increment_character_usage', {
        character_id: characterId
      });

      if (error) {
        // Fallback: Get current count and increment
        const character = await this.getCharacterById(characterId);
        if (character) {
          await this.updateCharacter(characterId, {
            usageCount: character.usageCount + 1,
            metadata: {
              ...character.metadata,
              lastUsedAt: new Date()
            }
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to increment usage count', { error, characterId });
      // Non-critical, don't throw
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(characterId: string): Promise<boolean> {
    try {
      const character = await this.getCharacterById(characterId);
      
      if (!character) {
        throw new Error('Character not found');
      }

      const newFavoriteStatus = !character.isFavorite;
      
      await this.updateCharacter(characterId, {
        isFavorite: newFavoriteStatus
      });

      return newFavoriteStatus;
    } catch (error) {
      this.logger.error('Failed to toggle favorite', { error, characterId });
      throw error;
    }
  }

  /**
   * Get character statistics for a user
   */
  async getCharacterStats(userId: string): Promise<{
    totalCharacters: number;
    favoriteCharacters: number;
    mostUsedCharacter?: SavedCharacter;
    totalUsageCount: number;
  }> {
    try {
      const characters = await this.getCharactersByUser(userId);
      
      const totalCharacters = characters.length;
      const favoriteCharacters = characters.filter(c => c.isFavorite).length;
      const totalUsageCount = characters.reduce((sum, c) => sum + c.usageCount, 0);
      
      const mostUsedCharacter = characters.length > 0
        ? characters.reduce((max, c) => c.usageCount > max.usageCount ? c : max)
        : undefined;

      return {
        totalCharacters,
        favoriteCharacters,
        mostUsedCharacter,
        totalUsageCount
      };
    } catch (error) {
      this.logger.error('Failed to get character stats', { error, userId });
      throw error;
    }
  }

  /**
   * Map database row to SavedCharacter
   */
  private mapToCharacter(data: any): SavedCharacter {
    return {
      id: data.id,
      userId: data.user_id,
      libraryId: data.library_id,
      name: data.name,
      traits: data.traits,
      dna: data.dna,
      headshotUrl: data.headshot_url,
      headshotPrompt: data.headshot_prompt,
      elevenLabsVoiceId: data.elevenlabs_voice_id,
      hedraAvatarId: data.hedra_avatar_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      usageCount: data.usage_count || 0,
      isFavorite: data.is_favorite || false,
      metadata: data.metadata || {}
    };
  }

  /**
   * Initialize database schema (run once)
   */
  async initializeSchema(): Promise<void> {
    // This would typically be done via Supabase migration
    // Included here for reference
    const schema = `
      CREATE TABLE IF NOT EXISTS user_characters (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        library_id TEXT NOT NULL,
        name TEXT NOT NULL,
        traits JSONB NOT NULL,
        dna JSONB,
        headshot_url TEXT,
        headshot_prompt TEXT,
        elevenlabs_voice_id TEXT NOT NULL,
        hedra_avatar_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        usage_count INTEGER NOT NULL DEFAULT 0,
        is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id),
        CONSTRAINT fk_library FOREIGN KEY (library_id) REFERENCES libraries(id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_characters_user_id ON user_characters(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_characters_library_id ON user_characters(library_id);
      CREATE INDEX IF NOT EXISTS idx_user_characters_is_favorite ON user_characters(is_favorite);
      CREATE INDEX IF NOT EXISTS idx_user_characters_created_at ON user_characters(created_at DESC);

      -- Function to increment usage count
      CREATE OR REPLACE FUNCTION increment_character_usage(character_id TEXT)
      RETURNS VOID AS $$
      BEGIN
        UPDATE user_characters
        SET usage_count = usage_count + 1,
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{lastUsedAt}',
              to_jsonb(NOW())
            )
        WHERE id = character_id;
      END;
      $$ LANGUAGE plpgsql;
    `;

    this.logger.info('Character database schema reference created');
  }
}

