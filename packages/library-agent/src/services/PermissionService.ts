import { Database } from '@alexa-multi-agent/shared-types';
import {
  LibraryPermission,
  PermissionGrantRequest,
  PermissionUpdateRequest,
  LibraryOperationContext,
  DatabasePermission,
  DatabasePermissionInsert,
  DatabasePermissionUpdate,
  LibraryError,
  PermissionError,
  COPPAComplianceError
} from '../types';
import { UserRole } from '../types';
import { LibrarySupabaseClient } from '../db/client';

export class PermissionService {
  constructor(private supabase: LibrarySupabaseClient) {}

  async grantPermission(
    libraryId: string,
    request: PermissionGrantRequest,
    context: LibraryOperationContext
  ): Promise<void> {
    // Check if requester has permission to grant permissions (Owner or Admin)
    const hasPermission = await this.checkLibraryPermission(libraryId, 'Admin', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Admin access required to grant permissions');
    }

    // Validate role
    if (!this.isValidUserRole(request.role)) {
      throw new LibraryError('Invalid role specified', 'INVALID_INPUT');
    }

    // Check if user already has permission
    const { data: existingPermission, error: checkError } = await this.supabase
      .from('library_permissions')
      .select('id, role')
      .eq('library_id', libraryId)
      .eq('user_id', request.user_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new LibraryError(`Failed to check existing permissions: ${checkError.message}`, 'CHECK_FAILED');
    }

    if (existingPermission) {
      throw new LibraryError('User already has permission on this library', 'PERMISSION_EXISTS');
    }

    // Check COPPA compliance for the target user
    const { data: targetUser, error: userError } = await this.supabase
      .from('users')
      .select('is_minor, parent_consent_verified')
      .eq('id', request.user_id)
      .single();

    if (userError) {
      throw new LibraryError(`Failed to get target user info: ${userError.message}`, 'USER_CHECK_FAILED');
    }

    // Check if library is a sub-library and target user is under 13
    const { data: library, error: libraryError } = await this.supabase
      .from('libraries')
      .select('parent_library')
      .eq('id', libraryId)
      .single();

    if (libraryError) {
      throw new LibraryError(`Failed to get library info: ${libraryError.message}`, 'LIBRARY_CHECK_FAILED');
    }

    if (library.parent_library && targetUser.is_minor && !targetUser.parent_consent_verified) {
      throw new COPPAComplianceError('Parent consent required for users under 13 accessing sub-libraries');
    }

    // Grant permission
    const permissionData: DatabasePermissionInsert = {
      library_id: libraryId,
      user_id: request.user_id,
      role: request.role,
      granted_by: context.user_id
    };

    const { error } = await this.supabase
      .from('library_permissions')
      .insert(permissionData);

    if (error) {
      throw new LibraryError(`Failed to grant permission: ${error.message}`, 'GRANT_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('permission_granted', {
      library_id: libraryId,
      target_user_id: request.user_id,
      role: request.role
    }, context);

    // If this is a sub-library, inherit permissions from parent if needed
    if (library.parent_library) {
      await this.inheritParentPermissions(libraryId, request.user_id, context);
    }
  }

  async updatePermission(
    libraryId: string,
    userId: string,
    request: PermissionUpdateRequest,
    context: LibraryOperationContext
  ): Promise<void> {
    // Check if requester has permission to update permissions
    const hasPermission = await this.checkLibraryPermission(libraryId, 'Admin', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Admin access required to update permissions');
    }

    // Validate role
    if (!this.isValidUserRole(request.role)) {
      throw new LibraryError('Invalid role specified', 'INVALID_INPUT');
    }

    // Cannot change owner role through this method
    if (request.role === 'Owner') {
      throw new LibraryError('Use transferOwnership method to change ownership', 'INVALID_OPERATION');
    }

    // Check if permission exists
    const { data: existingPermission, error: checkError } = await this.supabase
      .from('library_permissions')
      .select('id, role')
      .eq('library_id', libraryId)
      .eq('user_id', userId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw new LibraryError('Permission not found', 'PERMISSION_NOT_FOUND');
      }
      throw new LibraryError(`Failed to check permission: ${checkError.message}`, 'CHECK_FAILED');
    }

    // Cannot update owner permission through this method
    if (existingPermission.role === 'Owner') {
      throw new LibraryError('Cannot update owner permission', 'INVALID_OPERATION');
    }

    // Update permission
    const { error } = await this.supabase
      .from('library_permissions')
      .update({ role: request.role })
      .eq('library_id', libraryId)
      .eq('user_id', userId);

    if (error) {
      throw new LibraryError(`Failed to update permission: ${error.message}`, 'UPDATE_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('permission_updated', {
      library_id: libraryId,
      target_user_id: userId,
      old_role: existingPermission.role,
      new_role: request.role
    }, context);
  }

  async revokePermission(
    libraryId: string,
    userId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    // Check if requester has permission to revoke permissions
    const hasPermission = await this.checkLibraryPermission(libraryId, 'Admin', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Admin access required to revoke permissions');
    }

    // Check if permission exists and get role
    const { data: existingPermission, error: checkError } = await this.supabase
      .from('library_permissions')
      .select('id, role')
      .eq('library_id', libraryId)
      .eq('user_id', userId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw new LibraryError('Permission not found', 'PERMISSION_NOT_FOUND');
      }
      throw new LibraryError(`Failed to check permission: ${checkError.message}`, 'CHECK_FAILED');
    }

    // Cannot revoke owner permission
    if (existingPermission.role === 'Owner') {
      throw new LibraryError('Cannot revoke owner permission', 'INVALID_OPERATION');
    }

    // Cannot revoke own permission
    if (userId === context.user_id) {
      throw new LibraryError('Cannot revoke your own permission', 'INVALID_OPERATION');
    }

    // Revoke permission
    const { error } = await this.supabase
      .from('library_permissions')
      .delete()
      .eq('library_id', libraryId)
      .eq('user_id', userId);

    if (error) {
      throw new LibraryError(`Failed to revoke permission: ${error.message}`, 'REVOKE_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('permission_revoked', {
      library_id: libraryId,
      target_user_id: userId,
      revoked_role: existingPermission.role
    }, context);
  }

  async transferOwnership(
    libraryId: string,
    newOwnerId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    // Only current owner can transfer ownership
    const isOwner = await this.checkLibraryPermission(libraryId, 'Owner', context.user_id);
    if (!isOwner) {
      throw new PermissionError('Only owner can transfer ownership');
    }

    // Check if new owner exists
    const { data: newOwner, error: userError } = await this.supabase
      .from('users')
      .select('id, is_minor, parent_consent_verified')
      .eq('id', newOwnerId)
      .single();

    if (userError) {
      throw new LibraryError(`New owner not found: ${userError.message}`, 'USER_NOT_FOUND');
    }

    // Check COPPA compliance for new owner
    const { data: library, error: libraryError } = await this.supabase
      .from('libraries')
      .select('parent_library')
      .eq('id', libraryId)
      .single();

    if (libraryError) {
      throw new LibraryError(`Failed to get library info: ${libraryError.message}`, 'LIBRARY_CHECK_FAILED');
    }

    if (library.parent_library && newOwner.is_minor && !newOwner.parent_consent_verified) {
      throw new COPPAComplianceError('Parent consent required for users under 13 to own sub-libraries');
    }

    // Start transaction-like operations
    try {
      // Update library owner
      const { error: libraryUpdateError } = await this.supabase
        .from('libraries')
        .update({ owner: newOwnerId })
        .eq('id', libraryId);

      if (libraryUpdateError) {
        throw new LibraryError(`Failed to update library owner: ${libraryUpdateError.message}`, 'TRANSFER_FAILED');
      }

      // Update current owner's permission to Admin
      const { error: currentOwnerError } = await this.supabase
        .from('library_permissions')
        .update({ role: 'Admin' })
        .eq('library_id', libraryId)
        .eq('user_id', context.user_id);

      if (currentOwnerError) {
        throw new LibraryError(`Failed to update current owner permission: ${currentOwnerError.message}`, 'TRANSFER_FAILED');
      }

      // Create or update new owner's permission
      const { error: newOwnerError } = await this.supabase
        .from('library_permissions')
        .upsert({
          library_id: libraryId,
          user_id: newOwnerId,
          role: 'Owner' as UserRole,
          granted_by: context.user_id
        });

      if (newOwnerError) {
        throw new LibraryError(`Failed to create new owner permission: ${newOwnerError.message}`, 'TRANSFER_FAILED');
      }

      // Log audit event
      await this.logAuditEvent('ownership_transferred', {
        library_id: libraryId,
        old_owner_id: context.user_id,
        new_owner_id: newOwnerId
      }, context);

    } catch (error) {
      // In a real implementation, we'd want proper transaction rollback
      throw error;
    }
  }

  async getLibraryPermissions(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<LibraryPermission[]> {
    // Check if user has access to view permissions
    const hasPermission = await this.checkLibraryPermission(libraryId, 'Viewer', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Access denied to library permissions');
    }

    const { data: permissions, error } = await this.supabase
      .from('library_permissions')
      .select(`
        *,
        users!library_permissions_user_id_fkey (
          id,
          email
        ),
        granted_by_user:users!library_permissions_granted_by_fkey (
          id,
          email
        )
      `)
      .eq('library_id', libraryId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get library permissions: ${error.message}`, 'GET_FAILED');
    }

    return permissions?.map(permission => ({
      id: permission.id,
      library_id: permission.library_id,
      user_id: permission.user_id,
      role: permission.role as UserRole,
      granted_by: permission.granted_by,
      created_at: permission.created_at,
      user_email: permission.users?.email,
      granted_by_email: permission.granted_by_user?.email
    })) || [];
  }

  async getUserLibraryRole(
    libraryId: string,
    userId: string
  ): Promise<UserRole | null> {
    const { data: permission, error } = await this.supabase
      .from('library_permissions')
      .select('role')
      .eq('library_id', libraryId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No permission found
      }
      throw new LibraryError(`Failed to get user role: ${error.message}`, 'GET_FAILED');
    }

    return permission.role as UserRole;
  }

  async validatePermissionMiddleware(
    libraryId: string,
    requiredRole: UserRole,
    userId: string
  ): Promise<boolean> {
    return await this.checkLibraryPermission(libraryId, requiredRole, userId);
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

  private async inheritParentPermissions(
    subLibraryId: string,
    userId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    // Get parent library
    const { data: subLibrary, error: subLibraryError } = await this.supabase
      .from('libraries')
      .select('parent_library')
      .eq('id', subLibraryId)
      .single();

    if (subLibraryError || !subLibrary.parent_library) {
      return; // Not a sub-library or error getting parent
    }

    // Get user's permission on parent library
    const { data: parentPermission, error: parentPermissionError } = await this.supabase
      .from('library_permissions')
      .select('role')
      .eq('library_id', subLibrary.parent_library)
      .eq('user_id', userId)
      .single();

    if (parentPermissionError || !parentPermission) {
      return; // No permission on parent library
    }

    // Sub-library permissions are typically more restrictive than parent
    // For now, we'll just log that inheritance was considered
    await this.logAuditEvent('permission_inheritance_considered', {
      sub_library_id: subLibraryId,
      parent_library_id: subLibrary.parent_library,
      user_id: userId,
      parent_role: parentPermission.role
    }, context);
  }

  private isValidUserRole(role: string): role is UserRole {
    return ['Owner', 'Admin', 'Editor', 'Viewer'].includes(role);
  }

  private async logAuditEvent(
    action: string,
    payload: any,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_audit_event_enhanced', {
        p_agent_name: 'PermissionService',
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