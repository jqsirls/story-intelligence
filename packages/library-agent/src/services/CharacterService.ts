import { Database } from '@alexa-multi-agent/shared-types';
import { PermissionService } from './PermissionService';
import {
  LibraryOperationContext,
  CharacterShareRequest,
  DatabaseCharacter,
  DatabaseCharacterUpdate,
  LibraryError,
  PermissionError,
  CharacterNotFoundError
} from '../types';
import { LibrarySupabaseClient } from '../db/client';

export class CharacterService {
  constructor(
    private supabase: LibrarySupabaseClient,
    private permissionService: PermissionService
  ) {}

  async getStoryCharacters(
    storyId: string,
    context: LibraryOperationContext
  ): Promise<DatabaseCharacter[]> {
    // Get story to check permissions
    const { data: story, error: storyError } = await this.supabase
      .from('stories')
      .select('library_id')
      .eq('id', storyId)
      .single();

    if (storyError) {
      throw new LibraryError(`Story not found: ${storyError.message}`, 'STORY_NOT_FOUND');
    }

    // Check permission on the story's library
    const hasPermission = await this.permissionService.validatePermissionMiddleware(
      story.library_id,
      'Viewer',
      context.user_id
    );
    if (!hasPermission) {
      throw new PermissionError('Access denied to story characters');
    }

    const { data: characters, error } = await this.supabase
      .from('characters')
      .select('*')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get story characters: ${error.message}`, 'GET_FAILED');
    }

    return characters || [];
  }

  async getCharacter(
    characterId: string,
    context: LibraryOperationContext
  ): Promise<DatabaseCharacter & { stories: { id: string; library_id: string; title: string } }> {
    // Get character with story and library info to check permissions
    const { data: character, error } = await this.supabase
      .from('characters')
      .select(`
        *,
        stories (
          id,
          library_id,
          title
        )
      `)
      .eq('id', characterId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new CharacterNotFoundError(characterId);
      }
      throw new LibraryError(`Failed to get character: ${error.message}`, 'GET_FAILED');
    }

    // Check permission on the character's story's library
    const hasPermission = await this.permissionService.validatePermissionMiddleware(
      (character as any).stories.library_id,
      'Viewer',
      context.user_id
    );
    if (!hasPermission) {
      throw new PermissionError('Access denied to character');
    }

    return character as any;
  }

  async updateCharacter(
    characterId: string,
    updates: Partial<DatabaseCharacter>,
    context: LibraryOperationContext
  ): Promise<DatabaseCharacter> {
    // Get character to check permissions
    const character = await this.getCharacter(characterId, context);

    // Check permission for editing
    const hasPermission = await this.permissionService.validatePermissionMiddleware(
      (character as any).stories.library_id,
      'Editor',
      context.user_id
    );
    if (!hasPermission) {
      throw new PermissionError('Editor access required to update character');
    }

    // Prepare update data (exclude read-only fields)
    const updateData: DatabaseCharacterUpdate = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.traits !== undefined) updateData.traits = updates.traits;
    if (updates.appearance_url !== undefined) updateData.appearance_url = updates.appearance_url;

    const { data: updatedCharacter, error } = await this.supabase
      .from('characters')
      .update(updateData)
      .eq('id', characterId)
      .select()
      .single();

    if (error) {
      throw new LibraryError(`Failed to update character: ${error.message}`, 'UPDATE_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('character_updated', {
      character_id: characterId,
      story_id: character.story_id,
      library_id: (character as any).stories.library_id,
      changes: updateData
    }, context);

    return updatedCharacter;
  }

  async deleteCharacter(
    characterId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    // Get character to check permissions
    const character = await this.getCharacter(characterId, context);

    // Check permission for deletion (Admin required)
    const hasPermission = await this.permissionService.validatePermissionMiddleware(
      (character as any).stories.library_id,
      'Admin',
      context.user_id
    );
    if (!hasPermission) {
      throw new PermissionError('Admin access required to delete character');
    }

    // Delete character
    const { error } = await this.supabase
      .from('characters')
      .delete()
      .eq('id', characterId);

    if (error) {
      throw new LibraryError(`Failed to delete character: ${error.message}`, 'DELETE_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('character_deleted', {
      character_id: characterId,
      story_id: character.story_id,
      library_id: (character as any).stories.library_id,
      character_name: character.name
    }, context);
  }

  async shareCharacter(
    request: CharacterShareRequest,
    context: LibraryOperationContext
  ): Promise<DatabaseCharacter> {
    // Get character to check permissions
    const character = await this.getCharacter(request.character_id, context);

    // Check permission on source library (Editor required)
    const hasSourcePermission = await this.permissionService.validatePermissionMiddleware(
      (character as any).stories.library_id,
      'Editor',
      context.user_id
    );
    if (!hasSourcePermission) {
      throw new PermissionError('Editor access required on source library to share character');
    }

    // Check permission on target library (Editor required)
    const hasTargetPermission = await this.permissionService.validatePermissionMiddleware(
      request.target_library_id,
      'Editor',
      context.user_id
    );
    if (!hasTargetPermission) {
      throw new PermissionError('Editor access required on target library to share character');
    }

    // Use database function to share character
    const { data: shareId, error: shareError } = await this.supabase
      .rpc('share_character', {
        p_character_id: request.character_id,
        p_target_library_id: request.target_library_id,
        p_share_type: request.share_type
      });

    if (shareError) {
      throw new LibraryError(`Failed to share character: ${shareError.message}`, 'SHARE_FAILED');
    }

    // For copy type, we would need to create a new character in a target story
    // For now, we'll return the original character and log the share
    if (request.share_type === 'copy') {
      // In a full implementation, this would create a new character
      // in a target story within the target library
      await this.logAuditEvent('character_copy_shared', {
        character_id: request.character_id,
        source_library_id: (character as any).stories.library_id,
        target_library_id: request.target_library_id,
        share_id: shareId
      }, context);
    } else {
      // Reference type share
      await this.logAuditEvent('character_reference_shared', {
        character_id: request.character_id,
        source_library_id: (character as any).stories.library_id,
        target_library_id: request.target_library_id,
        share_id: shareId
      }, context);
    }

    return character;
  }

  async getCharacterShares(
    characterId: string,
    context: LibraryOperationContext
  ): Promise<any[]> {
    // Get character to check permissions
    const character = await this.getCharacter(characterId, context);

    const { data: shares, error } = await this.supabase
      .from('character_shares')
      .select(`
        *,
        source_library:libraries!character_shares_source_library_id_fkey (
          id,
          name
        ),
        target_library:libraries!character_shares_target_library_id_fkey (
          id,
          name
        ),
        shared_by_user:users!character_shares_shared_by_fkey (
          id,
          email
        )
      `)
      .eq('character_id', characterId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get character shares: ${error.message}`, 'GET_FAILED');
    }

    return shares || [];
  }

  async getLibraryCharacters(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<DatabaseCharacter[]> {
    // Check permission
    const hasPermission = await this.permissionService.validatePermissionMiddleware(
      libraryId,
      'Viewer',
      context.user_id
    );
    if (!hasPermission) {
      throw new PermissionError('Access denied to library characters');
    }

    // First get story IDs for this library
    const { data: stories, error: storiesError } = await this.supabase
      .from('stories')
      .select('id')
      .eq('library_id', libraryId);

    if (storiesError) {
      throw new LibraryError(`Failed to get library stories: ${storiesError.message}`, 'GET_FAILED');
    }

    if (!stories || stories.length === 0) {
      return [];
    }

    const storyIds = stories.map(s => s.id);

    // Get all characters from stories in this library
    const { data: characters, error } = await this.supabase
      .from('characters')
      .select(`
        *,
        stories (
          id,
          title,
          library_id
        )
      `)
      .in('story_id', storyIds)
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get library characters: ${error.message}`, 'GET_FAILED');
    }

    return characters || [];
  }

  async searchCharacters(
    query: string,
    libraryIds: string[],
    context: LibraryOperationContext
  ): Promise<DatabaseCharacter[]> {
    // Validate that user has access to all specified libraries
    for (const libraryId of libraryIds) {
      const hasPermission = await this.permissionService.validatePermissionMiddleware(
        libraryId,
        'Viewer',
        context.user_id
      );
      if (!hasPermission) {
        throw new PermissionError(`Access denied to library ${libraryId}`);
      }
    }

    if (libraryIds.length === 0) {
      return [];
    }

    // First get story IDs for these libraries
    const { data: stories, error: storiesError } = await this.supabase
      .from('stories')
      .select('id')
      .in('library_id', libraryIds);

    if (storiesError) {
      throw new LibraryError(`Failed to get library stories: ${storiesError.message}`, 'SEARCH_FAILED');
    }

    if (!stories || stories.length === 0) {
      return [];
    }

    const storyIds = stories.map(s => s.id);

    // Search characters by name and traits
    const { data: characters, error } = await this.supabase
      .from('characters')
      .select(`
        *,
        stories (
          id,
          title,
          library_id
        )
      `)
      .in('story_id', storyIds)
      .or(`name.ilike.%${query}%,traits->>species.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new LibraryError(`Failed to search characters: ${error.message}`, 'SEARCH_FAILED');
    }

    // Log search
    await this.logAuditEvent('characters_searched', {
      query,
      library_ids: libraryIds,
      results_count: characters?.length || 0
    }, context);

    return characters || [];
  }

  async getCharactersByTraits(
    libraryId: string,
    traits: { [key: string]: any },
    context: LibraryOperationContext
  ): Promise<DatabaseCharacter[]> {
    // Check permission
    const hasPermission = await this.permissionService.validatePermissionMiddleware(
      libraryId,
      'Viewer',
      context.user_id
    );
    if (!hasPermission) {
      throw new PermissionError('Access denied to library characters');
    }

    // First get story IDs for this library
    const { data: stories, error: storiesError } = await this.supabase
      .from('stories')
      .select('id')
      .eq('library_id', libraryId);

    if (storiesError) {
      throw new LibraryError(`Failed to get library stories: ${storiesError.message}`, 'GET_FAILED');
    }

    if (!stories || stories.length === 0) {
      return [];
    }

    const storyIds = stories.map(s => s.id);

    let query = this.supabase
      .from('characters')
      .select(`
        *,
        stories (
          id,
          title,
          library_id
        )
      `)
      .in('story_id', storyIds) as any; // cast to avoid deep generic instantiation during chained filters

    // Add trait filters
    Object.entries(traits).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(`traits->${key}`, value);
      }
    });

    const { data: characters, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get characters by traits: ${error.message}`, 'GET_FAILED');
    }

    return characters || [];
  }

  async getCharacterUsageStats(
    characterId: string,
    context: LibraryOperationContext
  ): Promise<{
    total_shares: number;
    libraries_shared_to: number;
    last_shared: string | null;
    share_types: { [type: string]: number };
  }> {
    // Get character to check permissions
    const character = await this.getCharacter(characterId, context);

    const { data: shares, error } = await this.supabase
      .from('character_shares')
      .select('share_type, target_library_id, created_at')
      .eq('character_id', characterId);

    if (error) {
      throw new LibraryError(`Failed to get character usage stats: ${error.message}`, 'GET_FAILED');
    }

    const totalShares = shares?.length || 0;
    const uniqueLibraries = new Set((shares || []).map(s => s.target_library_id).filter(Boolean)).size;

    const sortedByDate = (shares || []).filter(s => s.created_at).sort((a, b) => {
      return new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime();
    });
    const lastShared = sortedByDate.length > 0
      ? new Date(sortedByDate[0].created_at as string).toISOString()
      : null;

    const shareTypes: { [type: string]: number } = {};
    shares?.forEach(share => {
      shareTypes[share.share_type] = (shareTypes[share.share_type] || 0) + 1;
    });

    return {
      total_shares: totalShares,
      libraries_shared_to: uniqueLibraries,
      last_shared: lastShared,
      share_types: shareTypes
    };
  }

  // Private helper methods
  private async logAuditEvent(
    action: string,
    payload: any,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_audit_event_enhanced', {
        p_agent_name: 'CharacterService',
        p_action: action,
        p_payload: payload,
        p_session_id: context.session_id ?? undefined,
        p_correlation_id: context.correlation_id ?? undefined,
        p_ip_address: context.ip_address ?? undefined,
        p_user_agent: context.user_agent ?? undefined
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}