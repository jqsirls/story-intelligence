import { SupabaseClient } from '@supabase/supabase-js';
import { Database, UserRole } from '@alexa-multi-agent/shared-types';
import {
  Library,
  LibraryCreateRequest,
  LibraryUpdateRequest,
  LibrarySearchFilters,
  LibraryOperationContext,
  DatabaseLibrary,
  DatabaseLibraryInsert,
  DatabaseLibraryUpdate,
  LibraryError,
  LibraryNotFoundError,
  PermissionError,
  COPPAComplianceError
} from '../types';

export class LibraryService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async createLibrary(
    request: LibraryCreateRequest,
    context: LibraryOperationContext
  ): Promise<Library> {
    // Validate input
    if (!request.name?.trim()) {
      throw new LibraryError('Library name is required', 'INVALID_INPUT');
    }

    // Check COPPA compliance if creating a sub-library
    if (request.parent_library) {
      const { data: complianceCheck, error: complianceError } = await this.supabase
        .rpc('check_coppa_compliance', {
          p_user_id: context.user_id,
          p_library_id: request.parent_library
        });

      if (complianceError) {
        throw new LibraryError('Failed to check COPPA compliance', 'COMPLIANCE_CHECK_FAILED');
      }

      if (!complianceCheck) {
        throw new COPPAComplianceError('Parent consent required for users under 13 creating sub-libraries');
      }
    }

    // Create library
    const libraryData: DatabaseLibraryInsert = {
      owner: context.user_id,
      name: request.name.trim(),
      parent_library: request.parent_library || null
    };

    const { data: library, error } = await this.supabase
      .from('libraries')
      .insert(libraryData)
      .select()
      .single();

    if (error) {
      throw new LibraryError(`Failed to create library: ${error.message}`, 'CREATE_FAILED');
    }

    // Create owner permission
    const { error: permissionError } = await this.supabase
      .from('library_permissions')
      .insert({
        library_id: library.id,
        user_id: context.user_id,
        role: 'Owner' as UserRole,
        granted_by: context.user_id
      });

    if (permissionError) {
      // Rollback library creation
      await this.supabase.from('libraries').delete().eq('id', library.id);
      throw new LibraryError(`Failed to create owner permission: ${permissionError.message}`, 'PERMISSION_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('library_created', {
      library_id: library.id,
      library_name: library.name,
      parent_library: library.parent_library
    }, context);

    return this.mapDatabaseLibraryToLibrary(library);
  }

  async getLibrary(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<Library> {
    // Check permission
    const hasPermission = await this.checkLibraryPermission(libraryId, 'Viewer', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Access denied to library');
    }

    const { data: library, error } = await this.supabase
      .from('libraries')
      .select(`
        *,
        library_permissions (
          id,
          user_id,
          role,
          granted_by,
          created_at
        )
      `)
      .eq('id', libraryId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new LibraryNotFoundError(libraryId);
      }
      throw new LibraryError(`Failed to get library: ${error.message}`, 'GET_FAILED');
    }

    return this.mapDatabaseLibraryToLibrary(library);
  }

  async updateLibrary(
    libraryId: string,
    request: LibraryUpdateRequest,
    context: LibraryOperationContext
  ): Promise<Library> {
    // Check permission
    const hasPermission = await this.checkLibraryPermission(libraryId, 'Admin', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Admin access required to update library');
    }

    // Validate input
    if (request.name !== undefined && !request.name?.trim()) {
      throw new LibraryError('Library name cannot be empty', 'INVALID_INPUT');
    }

    const updateData: DatabaseLibraryUpdate = {};
    if (request.name !== undefined) {
      updateData.name = request.name.trim();
    }

    const { data: library, error } = await this.supabase
      .from('libraries')
      .update(updateData)
      .eq('id', libraryId)
      .select()
      .single();

    if (error) {
      throw new LibraryError(`Failed to update library: ${error.message}`, 'UPDATE_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('library_updated', {
      library_id: libraryId,
      changes: updateData
    }, context);

    return this.mapDatabaseLibraryToLibrary(library);
  }

  async deleteLibrary(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    // Check permission (only owner can delete)
    const hasPermission = await this.checkLibraryPermission(libraryId, 'Owner', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Owner access required to delete library');
    }

    // Check for sub-libraries
    const { data: subLibraries, error: subLibrariesError } = await this.supabase
      .from('libraries')
      .select('id')
      .eq('parent_library', libraryId);

    if (subLibrariesError) {
      throw new LibraryError(`Failed to check sub-libraries: ${subLibrariesError.message}`, 'DELETE_FAILED');
    }

    if (subLibraries && subLibraries.length > 0) {
      throw new LibraryError('Cannot delete library with sub-libraries', 'HAS_SUB_LIBRARIES');
    }

    // Delete will cascade to stories, characters, permissions due to foreign key constraints
    const { error } = await this.supabase
      .from('libraries')
      .delete()
      .eq('id', libraryId);

    if (error) {
      throw new LibraryError(`Failed to delete library: ${error.message}`, 'DELETE_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('library_deleted', {
      library_id: libraryId
    }, context);
  }

  async searchLibraries(
    filters: LibrarySearchFilters,
    context: LibraryOperationContext
  ): Promise<Library[]> {
    let query = this.supabase
      .from('libraries')
      .select(`
        *,
        library_permissions!inner (
          user_id,
          role
        )
      `)
      .eq('library_permissions.user_id', context.user_id);

    // Apply filters
    if (filters.name) {
      query = query.ilike('name', `%${filters.name}%`);
    }

    if (filters.owner) {
      query = query.eq('owner', filters.owner);
    }

    if (filters.parent_library !== undefined) {
      if (filters.parent_library === null) {
        query = query.is('parent_library', null);
      } else {
        query = query.eq('parent_library', filters.parent_library);
      }
    }

    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after);
    }

    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before);
    }

    if (filters.has_stories !== undefined) {
      if (filters.has_stories) {
        query = query.not('stories', 'is', null);
      } else {
        query = query.is('stories', null);
      }
    }

    const { data: libraries, error } = await query;

    if (error) {
      throw new LibraryError(`Failed to search libraries: ${error.message}`, 'SEARCH_FAILED');
    }

    return libraries?.map(lib => this.mapDatabaseLibraryToLibrary(lib)) || [];
  }

  async getUserLibraries(
    context: LibraryOperationContext
  ): Promise<Library[]> {
    const { data: libraries, error } = await this.supabase
      .from('libraries')
      .select(`
        *,
        library_permissions!inner (
          user_id,
          role
        )
      `)
      .eq('library_permissions.user_id', context.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get user libraries: ${error.message}`, 'GET_FAILED');
    }

    return libraries?.map(lib => this.mapDatabaseLibraryToLibrary(lib)) || [];
  }

  async createSubLibrary(
    parentLibraryId: string,
    request: LibraryCreateRequest & { 
      avatar_type?: string; 
      avatar_data?: any;
    },
    context: LibraryOperationContext
  ): Promise<Library> {
    // Check permission on parent library
    const hasPermission = await this.checkLibraryPermission(parentLibraryId, 'Admin', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Admin access required on parent library to create sub-library');
    }

    // If avatar is provided, use the database function
    if (request.avatar_type && request.avatar_data) {
      const { data: libraryId, error } = await this.supabase
        .rpc('create_sub_library_with_avatar', {
          p_parent_library_id: parentLibraryId,
          p_name: request.name.trim(),
          p_avatar_type: request.avatar_type,
          p_avatar_data: request.avatar_data
        });

      if (error) {
        throw new LibraryError(`Failed to create sub-library with avatar: ${error.message}`, 'CREATE_FAILED');
      }

      // Get the created library
      return await this.getLibrary(libraryId, context);
    }

    // Create sub-library with parent reference (without avatar)
    const subLibraryRequest: LibraryCreateRequest = {
      ...request,
      parent_library: parentLibraryId
    };

    return await this.createLibrary(subLibraryRequest, context);
  }

  async getSubLibraries(
    parentLibraryId: string,
    context: LibraryOperationContext
  ): Promise<Library[]> {
    // Check permission on parent library
    const hasPermission = await this.checkLibraryPermission(parentLibraryId, 'Viewer', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Access denied to parent library');
    }

    const { data: subLibraries, error } = await this.supabase
      .from('libraries')
      .select(`
        *,
        library_permissions (
          id,
          user_id,
          role,
          granted_by,
          created_at
        ),
        sub_library_avatars (
          avatar_type,
          avatar_data
        )
      `)
      .eq('parent_library', parentLibraryId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get sub-libraries: ${error.message}`, 'GET_FAILED');
    }

    return subLibraries?.map(lib => this.mapDatabaseLibraryToLibrary(lib)) || [];
  }

  async getHierarchicalLibraryStories(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<any[]> {
    // This uses the database function to get stories from library and all sub-libraries
    const { data: stories, error } = await this.supabase
      .rpc('get_hierarchical_library_stories', {
        p_library_id: libraryId
      });

    if (error) {
      throw new LibraryError(`Failed to get hierarchical stories: ${error.message}`, 'GET_FAILED');
    }

    return stories || [];
  }

  async setSubLibraryAvatar(
    libraryId: string,
    avatarType: string,
    avatarData: any,
    context: LibraryOperationContext
  ): Promise<void> {
    // Check permission
    const hasPermission = await this.checkLibraryPermission(libraryId, 'Admin', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Admin access required to set sub-library avatar');
    }

    // Validate avatar type
    const validAvatarTypes = ['animal', 'character', 'symbol', 'color'];
    if (!validAvatarTypes.includes(avatarType)) {
      throw new LibraryError('Invalid avatar type', 'INVALID_INPUT');
    }

    // Upsert avatar
    const { error } = await this.supabase
      .from('sub_library_avatars')
      .upsert({
        library_id: libraryId,
        avatar_type: avatarType,
        avatar_data: avatarData,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new LibraryError(`Failed to set sub-library avatar: ${error.message}`, 'UPDATE_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('sub_library_avatar_updated', {
      library_id: libraryId,
      avatar_type: avatarType
    }, context);
  }

  async getSubLibraryAvatar(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<any> {
    // Check permission
    const hasPermission = await this.checkLibraryPermission(libraryId, 'Viewer', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Access denied to sub-library avatar');
    }

    const { data: avatar, error } = await this.supabase
      .from('sub_library_avatars')
      .select('*')
      .eq('library_id', libraryId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new LibraryError(`Failed to get sub-library avatar: ${error.message}`, 'GET_FAILED');
    }

    return avatar;
  }

  // Private helper methods
  private async checkLibraryPermission(
    libraryId: string,
    requiredRole: UserRole,
    userId: string
  ): Promise<boolean> {
    const { data: hasPermission, error } = await this.supabase
      .rpc('check_library_permission_with_coppa', {
        lib_id: libraryId,
        required_role: requiredRole
      });

    if (error) {
      console.error('Permission check error:', error);
      return false;
    }

    return hasPermission || false;
  }

  private async logAuditEvent(
    action: string,
    payload: any,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_audit_event_enhanced', {
        p_agent_name: 'LibraryAgent',
        p_action: action,
        p_payload: payload,
        p_session_id: context.session_id || null,
        p_correlation_id: context.correlation_id || null,
        p_ip_address: context.ip_address || null,
        p_user_agent: context.user_agent || null
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging failure shouldn't break the operation
    }
  }

  private mapDatabaseLibraryToLibrary(dbLibrary: any): Library {
    return {
      id: dbLibrary.id,
      owner: dbLibrary.owner,
      name: dbLibrary.name,
      parent_library: dbLibrary.parent_library,
      created_at: dbLibrary.created_at,
      permissions: dbLibrary.library_permissions || []
    };
  }
}