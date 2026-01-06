import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@alexa-multi-agent/shared-types';
import { PermissionService } from './PermissionService';
import {
  LibraryOperationContext,
  StoryTransferRequest,
  StoryTransferResponse,
  DatabaseStory,
  DatabaseStoryUpdate,
  LibraryError,
  PermissionError,
  StoryNotFoundError
} from '../types';

export interface EmailService {
  sendStoryTransferRequestEmail(to: string, senderName: string, storyTitle: string, transferUrl: string, discountCode?: string): Promise<void>;
  sendStoryTransferSentEmail(to: string, senderName: string, recipientEmail: string, storyTitle: string): Promise<void>;
  sendStoryTransferAcceptedEmail(to: string, recipientName: string, storyTitle: string): Promise<void>;
  sendStoryTransferRejectedEmail(to: string, recipientName: string, storyTitle: string): Promise<void>;
}

export class StoryService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private permissionService: PermissionService,
    private emailService?: EmailService,
    private logger?: any
  ) {
    this.logger = logger || console;
  }

  async getLibraryStories(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<DatabaseStory[]> {
    // Check permission
    const hasPermission = await this.permissionService.validatePermissionMiddleware(
      libraryId,
      'Viewer',
      context.user_id
    );
    if (!hasPermission) {
      throw new PermissionError('Access denied to library stories');
    }

    const { data: stories, error } = await this.supabase
      .from('stories')
      .select('*')
      .eq('library_id', libraryId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get library stories: ${error.message}`, 'GET_FAILED');
    }

    return stories || [];
  }

  async getStory(
    storyId: string,
    context: LibraryOperationContext
  ): Promise<DatabaseStory> {
    // Get story with library info to check permissions
    const { data: story, error } = await this.supabase
      .from('stories')
      .select(`
        *,
        libraries (
          id,
          name,
          owner
        )
      `)
      .eq('id', storyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new StoryNotFoundError(storyId);
      }
      throw new LibraryError(`Failed to get story: ${error.message}`, 'GET_FAILED');
    }

    // Check permission on the story's library
    const hasPermission = await this.permissionService.validatePermissionMiddleware(
      story.library_id,
      'Viewer',
      context.user_id
    );
    if (!hasPermission) {
      throw new PermissionError('Access denied to story');
    }

    return story;
  }

  async updateStory(
    storyId: string,
    updates: Partial<DatabaseStory>,
    context: LibraryOperationContext
  ): Promise<DatabaseStory> {
    // Get story to check permissions
    const story = await this.getStory(storyId, context);

    // Check permission for editing
    const hasPermission = await this.permissionService.validatePermissionMiddleware(
      story.library_id,
      'Editor',
      context.user_id
    );
    if (!hasPermission) {
      throw new PermissionError('Editor access required to update story');
    }

    // Prepare update data (exclude read-only fields)
    const updateData: DatabaseStoryUpdate = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.age_rating !== undefined) updateData.age_rating = updates.age_rating;
    
    // Set finalized_at if status is changing to 'final'
    if (updates.status === 'final' && story.status !== 'final') {
      updateData.finalized_at = new Date().toISOString();
    }

    const { data: updatedStory, error } = await this.supabase
      .from('stories')
      .update(updateData)
      .eq('id', storyId)
      .select()
      .single();

    if (error) {
      throw new LibraryError(`Failed to update story: ${error.message}`, 'UPDATE_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('story_updated', {
      story_id: storyId,
      library_id: story.library_id,
      changes: updateData
    }, context);

    // Record interaction
    await this.recordStoryInteraction(storyId, 'edited', context);

    return updatedStory;
  }

  async deleteStory(
    storyId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    // Get story to check permissions
    const story = await this.getStory(storyId, context);

    // Check permission for deletion (Admin required)
    const hasPermission = await this.permissionService.validatePermissionMiddleware(
      story.library_id,
      'Admin',
      context.user_id
    );
    if (!hasPermission) {
      throw new PermissionError('Admin access required to delete story');
    }

    // Delete story (will cascade to characters and media_assets)
    const { error } = await this.supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (error) {
      throw new LibraryError(`Failed to delete story: ${error.message}`, 'DELETE_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('story_deleted', {
      story_id: storyId,
      library_id: story.library_id,
      story_title: story.title
    }, context);
  }

  async transferStory(
    request: StoryTransferRequest,
    context: LibraryOperationContext
  ): Promise<StoryTransferResponse> {
    // Get story to check permissions
    const story = await this.getStory(request.story_id, context);

    // Check permission on source library (Editor required)
    const hasSourcePermission = await this.permissionService.validatePermissionMiddleware(
      story.library_id,
      'Editor',
      context.user_id
    );
    if (!hasSourcePermission) {
      throw new PermissionError('Editor access required on source library to transfer story');
    }

    // Check if target library exists and user has permission
    const { data: targetLibrary, error: targetError } = await this.supabase
      .from('libraries')
      .select('id, name, owner')
      .eq('id', request.target_library_id)
      .single();

    if (targetError) {
      throw new LibraryError(`Target library not found: ${targetError.message}`, 'TARGET_NOT_FOUND');
    }

    // Create transfer request using database function
    const { data: transferId, error: transferError } = await this.supabase
      .rpc('create_story_transfer_request', {
        p_story_id: request.story_id,
        p_to_library_id: request.target_library_id,
        p_transfer_message: request.transfer_message || null
      });

    if (transferError) {
      throw new LibraryError(`Failed to create transfer request: ${transferError.message}`, 'TRANSFER_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('story_transfer_requested', {
      story_id: request.story_id,
      from_library_id: story.library_id,
      to_library_id: request.target_library_id,
      transfer_id: transferId
    }, context);

    // Send transfer request email to target library owner
    if (this.emailService) {
      try {
        // Get sender and recipient details
        const { data: sender } = await this.supabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', context.user_id)
          .single();
        
        const { data: recipient } = await this.supabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', targetLibrary.owner)
          .single();
        
        if (sender?.email && recipient?.email) {
          const senderName = sender.first_name && sender.last_name
            ? `${sender.first_name} ${sender.last_name}`
            : sender.email;
          
          const transferUrl = `${process.env.APP_URL || process.env.FRONTEND_URL || 'https://storytailor.com'}/library/${request.target_library_id}/transfers/${transferId}`;
          
          // Send request email to recipient
          await this.emailService.sendStoryTransferRequestEmail(
            recipient.email,
            senderName,
            story.title || 'Untitled Story',
            transferUrl
          );
          
          // Send confirmation email to sender
          await this.emailService.sendStoryTransferSentEmail(
            sender.email,
            senderName,
            recipient.email,
            story.title || 'Untitled Story'
          );
        }
      } catch (error) {
        this.logger?.warn('Failed to send story transfer emails', { error, transferId });
        // Don't fail the transfer if email fails
      }
    }

    return {
      transfer_id: transferId,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
  }

  async respondToStoryTransfer(
    transferId: string,
    response: 'accepted' | 'rejected',
    context: LibraryOperationContext,
    responseMessage?: string
  ): Promise<void> {
    // Get transfer details before responding
    let transferDetails: any = null;
    if (this.emailService) {
      const { data: transfer } = await this.supabase
        .from('story_transfers')
        .select(`
          id,
          story_id,
          from_library_id,
          to_library_id,
          stories:story_id (title),
          from_library:from_library_id (owner),
          to_library:to_library_id (owner)
        `)
        .eq('id', transferId)
        .single();
      
      transferDetails = transfer;
    }

    // Use database function to respond to transfer
    const { data: success, error } = await this.supabase
      .rpc('respond_to_story_transfer', {
        p_transfer_id: transferId,
        p_response: response,
        p_response_message: responseMessage || null
      });

    if (error) {
      throw new LibraryError(`Failed to respond to transfer: ${error.message}`, 'TRANSFER_RESPONSE_FAILED');
    }

    // Log audit event
    await this.logAuditEvent('story_transfer_responded', {
      transfer_id: transferId,
      response,
      response_message: responseMessage
    }, context);

    // Send response email
    if (this.emailService && transferDetails) {
      try {
        // Get recipient (the person who sent the transfer)
        const { data: sender } = await this.supabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', transferDetails.from_library?.owner || context.user_id)
          .single();
        
        // Get responder (the person responding)
        const { data: responder } = await this.supabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', context.user_id)
          .single();
        
        if (sender?.email && responder) {
          const responderName = responder.first_name && responder.last_name
            ? `${responder.first_name} ${responder.last_name}`
            : responder.email;
          
          const storyTitle = transferDetails.stories?.title || 'Untitled Story';
          
          if (response === 'accepted') {
            await this.emailService.sendStoryTransferAcceptedEmail(
              sender.email,
              responderName,
              storyTitle
            );
          } else {
            await this.emailService.sendStoryTransferRejectedEmail(
              sender.email,
              responderName,
              storyTitle
            );
          }
        }
      } catch (error) {
        this.logger?.warn('Failed to send story transfer response email', { error, transferId, response });
        // Don't fail the response if email fails
      }
    }
  }

  async getStoryTransferRequests(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<any[]> {
    // Check permission
    const hasPermission = await this.permissionService.validatePermissionMiddleware(
      libraryId,
      'Viewer',
      context.user_id
    );
    if (!hasPermission) {
      throw new PermissionError('Access denied to transfer requests');
    }

    const { data: requests, error } = await this.supabase
      .from('story_transfer_requests')
      .select(`
        *,
        stories (
          id,
          title
        ),
        from_library:libraries!story_transfer_requests_from_library_id_fkey (
          id,
          name
        ),
        to_library:libraries!story_transfer_requests_to_library_id_fkey (
          id,
          name
        ),
        requester:users!story_transfer_requests_requested_by_fkey (
          id,
          email
        )
      `)
      .or(`from_library_id.eq.${libraryId},to_library_id.eq.${libraryId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get transfer requests: ${error.message}`, 'GET_FAILED');
    }

    return requests || [];
  }

  async searchStories(
    query: string,
    libraryIds: string[],
    context: LibraryOperationContext
  ): Promise<DatabaseStory[]> {
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

    // Search stories by title and content
    const { data: stories, error } = await this.supabase
      .from('stories')
      .select('*')
      .in('library_id', libraryIds)
      .or(`title.ilike.%${query}%,content->>story_type.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new LibraryError(`Failed to search stories: ${error.message}`, 'SEARCH_FAILED');
    }

    // Record search interaction
    await this.logAuditEvent('stories_searched', {
      query,
      library_ids: libraryIds,
      results_count: stories?.length || 0
    }, context);

    return stories || [];
  }

  async getStoryInteractions(
    storyId: string,
    context: LibraryOperationContext
  ): Promise<any[]> {
    // Get story to check permissions
    const story = await this.getStory(storyId, context);

    const { data: interactions, error } = await this.supabase
      .from('story_interactions')
      .select(`
        *,
        users (
          id,
          email
        )
      `)
      .eq('story_id', storyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get story interactions: ${error.message}`, 'GET_FAILED');
    }

    return interactions || [];
  }

  async getStoriesByStatus(
    libraryId: string,
    status: 'draft' | 'final',
    context: LibraryOperationContext
  ): Promise<DatabaseStory[]> {
    // Check permission
    const hasPermission = await this.permissionService.validatePermissionMiddleware(
      libraryId,
      'Viewer',
      context.user_id
    );
    if (!hasPermission) {
      throw new PermissionError('Access denied to library stories');
    }

    const { data: stories, error } = await this.supabase
      .from('stories')
      .select('*')
      .eq('library_id', libraryId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get stories by status: ${error.message}`, 'GET_FAILED');
    }

    return stories || [];
  }

  // Private helper methods
  private async recordStoryInteraction(
    storyId: string,
    interactionType: string,
    context: LibraryOperationContext,
    interactionData: any = {}
  ): Promise<void> {
    try {
      await this.supabase
        .from('story_interactions')
        .insert({
          user_id: context.user_id,
          story_id: storyId,
          interaction_type: interactionType,
          interaction_data: {
            ...interactionData,
            session_id: context.session_id,
            correlation_id: context.correlation_id
          },
          session_id: context.session_id
        });
    } catch (error) {
      console.error('Failed to record story interaction:', error);
      // Don't throw - interaction logging failure shouldn't break the operation
    }
  }

  private async logAuditEvent(
    action: string,
    payload: any,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      // Log audit event (using RPC if available, otherwise skip)
      try {
        await this.supabase.rpc('log_audit_event_enhanced', {
          p_agent_name: 'StoryService',
          p_action: action,
          p_payload: payload,
          p_session_id: context.session_id || null,
          p_correlation_id: context.correlation_id || null,
          p_ip_address: context.ip_address || null,
          p_user_agent: context.user_agent || null
        } as any);
      } catch (rpcError) {
        // RPC function may not exist, log to console instead
        this.logger?.info('Audit event logged', { action, payload });
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}