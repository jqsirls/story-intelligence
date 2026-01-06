"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeletionService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_glacier_1 = require("@aws-sdk/client-glacier");
class DeletionService {
    constructor(supabase, logger, region = 'us-east-2') {
        this.supabase = supabase;
        this.logger = logger;
        this.s3Client = new client_s3_1.S3Client({ region });
        this.glacierClient = new client_glacier_1.GlacierClient({ region });
        this.assetBucket = process.env.ASSET_BUCKET || 'storytailor-assets-production';
        this.glacierBucket = process.env.GLACIER_BUCKET || 'storytailor-glacier-production';
        this.glacierVault = process.env.GLACIER_VAULT || 'storytailor-vault';
    }
    /**
     * Request account deletion with grace period
     */
    async requestAccountDeletion(userId, immediate = false, reason) {
        try {
            // Get grace period from SSM or use default (30 days)
            const gracePeriodDays = parseInt(process.env.DELETION_GRACE_PERIOD_ACCOUNT || '30');
            const scheduledDeletionAt = immediate
                ? new Date()
                : new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);
            // Create deletion request
            const { data: deletionRequest, error } = await this.supabase
                .from('deletion_requests')
                .insert({
                user_id: userId,
                deletion_type: 'account',
                target_id: userId,
                reason,
                immediate,
                scheduled_deletion_at: scheduledDeletionAt.toISOString(),
                status: immediate ? 'processing' : 'scheduled',
                metadata: {
                    gracePeriodDays,
                    requestedAt: new Date().toISOString()
                }
            })
                .select()
                .single();
            if (error) {
                this.logger.error('Failed to create account deletion request', { userId, error });
                throw error;
            }
            // Log audit entry
            await this.supabase.rpc('log_deletion_audit', {
                p_deletion_request_id: deletionRequest.request_id,
                p_deletion_type: 'account',
                p_user_id: userId,
                p_action: 'requested',
                p_metadata: { immediate, reason }
            });
            // If immediate, process now
            if (immediate) {
                await this.processAccountDeletion(userId, deletionRequest.request_id);
            }
            return {
                requestId: deletionRequest.request_id,
                scheduledDeletionAt: immediate ? null : scheduledDeletionAt
            };
        }
        catch (error) {
            this.logger.error('Error requesting account deletion', { userId, error });
            throw error;
        }
    }
    /**
     * Request story deletion
     */
    async requestStoryDeletion(storyId, userId, immediate = false, reason) {
        try {
            const gracePeriodDays = parseInt(process.env.DELETION_GRACE_PERIOD_STORY || '7');
            const scheduledDeletionAt = immediate
                ? new Date()
                : new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);
            const { data: deletionRequest, error } = await this.supabase
                .from('deletion_requests')
                .insert({
                user_id: userId,
                deletion_type: 'story',
                target_id: storyId,
                reason,
                immediate,
                scheduled_deletion_at: scheduledDeletionAt.toISOString(),
                status: immediate ? 'processing' : 'scheduled',
                metadata: { gracePeriodDays }
            })
                .select()
                .single();
            if (error)
                throw error;
            await this.supabase.rpc('log_deletion_audit', {
                p_deletion_request_id: deletionRequest.request_id,
                p_deletion_type: 'story',
                p_user_id: userId,
                p_action: 'requested',
                p_metadata: { storyId, immediate }
            });
            if (immediate) {
                await this.processStoryDeletion(storyId, userId, deletionRequest.request_id);
            }
            return {
                requestId: deletionRequest.request_id,
                scheduledDeletionAt: immediate ? null : scheduledDeletionAt
            };
        }
        catch (error) {
            this.logger.error('Error requesting story deletion', { storyId, userId, error });
            throw error;
        }
    }
    /**
     * Request character deletion with options
     */
    async requestCharacterDeletion(characterId, userId, options = {}) {
        try {
            const gracePeriodDays = parseInt(process.env.DELETION_GRACE_PERIOD_CHARACTER || '3');
            const scheduledDeletionAt = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);
            const { data: deletionRequest, error } = await this.supabase
                .from('deletion_requests')
                .insert({
                user_id: userId,
                deletion_type: 'character',
                target_id: characterId,
                immediate: false,
                scheduled_deletion_at: scheduledDeletionAt.toISOString(),
                status: 'scheduled',
                metadata: {
                    gracePeriodDays,
                    options: {
                        deleteStories: options.deleteStories || false,
                        removeFromStories: options.removeFromStories || false
                    }
                }
            })
                .select()
                .single();
            if (error)
                throw error;
            await this.supabase.rpc('log_deletion_audit', {
                p_deletion_request_id: deletionRequest.request_id,
                p_deletion_type: 'character',
                p_user_id: userId,
                p_action: 'requested',
                p_metadata: { characterId, options }
            });
            return {
                requestId: deletionRequest.request_id,
                scheduledDeletionAt
            };
        }
        catch (error) {
            this.logger.error('Error requesting character deletion', { characterId, userId, error });
            throw error;
        }
    }
    /**
     * Remove library member
     */
    async removeLibraryMember(libraryId, memberUserId, adminUserId) {
        try {
            // Verify admin has permission
            const { data: permission, error: permError } = await this.supabase
                .from('library_permissions')
                .select('role')
                .eq('library_id', libraryId)
                .eq('user_id', adminUserId)
                .single();
            if (permError || !permission || !['Owner', 'Admin'].includes(permission.role)) {
                throw new Error('Insufficient permissions to remove library member');
            }
            // Remove member
            const { error } = await this.supabase
                .from('library_permissions')
                .delete()
                .eq('library_id', libraryId)
                .eq('user_id', memberUserId);
            if (error)
                throw error;
            // Create deletion request for audit
            await this.supabase
                .from('deletion_requests')
                .insert({
                user_id: adminUserId,
                deletion_type: 'library_member',
                target_id: memberUserId,
                immediate: true,
                status: 'completed',
                metadata: { libraryId, removedBy: adminUserId }
            });
            this.logger.info('Library member removed', { libraryId, memberUserId, adminUserId });
        }
        catch (error) {
            this.logger.error('Error removing library member', { libraryId, memberUserId, error });
            throw error;
        }
    }
    /**
     * Handle conversation asset deletion
     */
    async handleConversationAssetDeletion(sessionId, userId, assetKeys) {
        try {
            // Delete assets from S3
            for (const key of assetKeys) {
                try {
                    await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
                        Bucket: this.assetBucket,
                        Key: key
                    }));
                }
                catch (error) {
                    this.logger.warn('Failed to delete S3 asset', { key, error });
                }
            }
            // Create deletion request for audit
            await this.supabase
                .from('deletion_requests')
                .insert({
                user_id: userId,
                deletion_type: 'conversation_assets',
                target_id: sessionId,
                immediate: true,
                status: 'completed',
                metadata: { assetKeys, sessionId }
            });
            this.logger.info('Conversation assets deleted', { sessionId, userId, assetCount: assetKeys.length });
        }
        catch (error) {
            this.logger.error('Error deleting conversation assets', { sessionId, userId, error });
            throw error;
        }
    }
    /**
     * Cancel a deletion request
     */
    async cancelDeletion(requestId, userId) {
        try {
            const { data: request, error: fetchError } = await this.supabase
                .from('deletion_requests')
                .select('*')
                .eq('request_id', requestId)
                .eq('user_id', userId)
                .single();
            if (fetchError || !request) {
                throw new Error('Deletion request not found or access denied');
            }
            if (request.status === 'completed') {
                throw new Error('Cannot cancel completed deletion');
            }
            const { error } = await this.supabase
                .from('deletion_requests')
                .update({
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
                .eq('request_id', requestId);
            if (error)
                throw error;
            await this.supabase.rpc('log_deletion_audit', {
                p_deletion_request_id: requestId,
                p_deletion_type: request.deletion_type,
                p_user_id: userId,
                p_action: 'cancelled',
                p_metadata: {}
            });
            this.logger.info('Deletion request cancelled', { requestId, userId });
        }
        catch (error) {
            this.logger.error('Error cancelling deletion', { requestId, userId, error });
            throw error;
        }
    }
    /**
     * Process scheduled deletions (called by cron job)
     */
    async processScheduledDeletions() {
        let processed = 0;
        let errors = 0;
        try {
            const { data: requests, error } = await this.supabase
                .from('deletion_requests')
                .select('*')
                .eq('status', 'scheduled')
                .lte('scheduled_deletion_at', new Date().toISOString());
            if (error)
                throw error;
            for (const request of requests || []) {
                try {
                    // Update status to processing
                    await this.supabase
                        .from('deletion_requests')
                        .update({ status: 'processing' })
                        .eq('request_id', request.request_id);
                    // Process based on type
                    switch (request.deletion_type) {
                        case 'account':
                            await this.processAccountDeletion(request.user_id, request.request_id);
                            break;
                        case 'story':
                            await this.processStoryDeletion(request.target_id, request.user_id, request.request_id);
                            break;
                        case 'character':
                            await this.processCharacterDeletion(request.target_id, request.user_id, request.request_id, request.metadata?.options);
                            break;
                        default:
                            this.logger.warn('Unknown deletion type', { type: request.deletion_type });
                    }
                    // Mark as completed
                    await this.supabase
                        .from('deletion_requests')
                        .update({
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    })
                        .eq('request_id', request.request_id);
                    processed++;
                }
                catch (error) {
                    errors++;
                    this.logger.error('Error processing deletion request', { requestId: request.request_id, error });
                    await this.supabase
                        .from('deletion_requests')
                        .update({ status: 'failed' })
                        .eq('request_id', request.request_id);
                }
            }
            return { processed, errors };
        }
        catch (error) {
            this.logger.error('Error processing scheduled deletions', { error });
            throw error;
        }
    }
    /**
     * Hibernate account (archive to Glacier)
     */
    async hibernateAccount(userId) {
        try {
            // Get all user assets
            const { data: stories } = await this.supabase
                .from('stories')
                .select('id, library_id')
                .eq('library_id', userId); // Assuming library_id maps to user
            const assetKeys = [];
            for (const story of stories || []) {
                const { data: assets } = await this.supabase
                    .from('media_assets')
                    .select('url')
                    .eq('story_id', story.id);
                for (const asset of assets || []) {
                    // Extract S3 key from URL
                    const url = asset.url;
                    const key = url.split('/').slice(-2).join('/'); // Get bucket/key
                    assetKeys.push(key);
                }
            }
            // Archive to Glacier (simplified - actual implementation would use Glacier API)
            const archiveId = `archive-${userId}-${Date.now()}`;
            // Mark assets as archived
            for (const story of stories || []) {
                await this.supabase
                    .from('media_assets')
                    .update({
                    glacier_archive_id: archiveId,
                    deleted_at: new Date().toISOString()
                })
                    .eq('story_id', story.id);
            }
            // Create hibernation record
            await this.supabase
                .from('hibernated_accounts')
                .insert({
                user_id: userId,
                glacier_archive_id: archiveId,
                storage_location: `s3://${this.glacierBucket}/${userId}/`,
                estimated_restore_time_hours: 5
            });
            // Update user
            await this.supabase
                .from('users')
                .update({ hibernated_at: new Date().toISOString() })
                .eq('id', userId);
            // Update deletion request
            await this.supabase
                .from('deletion_requests')
                .update({ status: 'hibernated' })
                .eq('user_id', userId)
                .eq('deletion_type', 'account')
                .eq('status', 'processing');
            this.logger.info('Account hibernated', { userId, archiveId });
            return {
                archiveId,
                estimatedRestoreHours: 5
            };
        }
        catch (error) {
            this.logger.error('Error hibernating account', { userId, error });
            throw error;
        }
    }
    /**
     * Restore hibernated account from Glacier
     */
    async restoreHibernatedAccount(userId) {
        try {
            const { data: hibernation, error } = await this.supabase
                .from('hibernated_accounts')
                .select('*')
                .eq('user_id', userId)
                .is('restored_at', null)
                .single();
            if (error || !hibernation) {
                throw new Error('Hibernated account not found');
            }
            // Initiate Glacier restore job (simplified - actual would use Glacier API)
            // This would take 3-5 hours
            // Update hibernation record
            await this.supabase
                .from('hibernated_accounts')
                .update({
                restored_at: new Date().toISOString()
            })
                .eq('id', hibernation.id);
            // Update user
            await this.supabase
                .from('users')
                .update({ hibernated_at: null })
                .eq('id', userId);
            // Restore assets from Glacier (simplified)
            await this.supabase
                .from('media_assets')
                .update({
                deleted_at: null,
                glacier_archive_id: null
            })
                .eq('glacier_archive_id', hibernation.glacier_archive_id);
            this.logger.info('Account restoration initiated', { userId, archiveId: hibernation.glacier_archive_id });
        }
        catch (error) {
            this.logger.error('Error restoring hibernated account', { userId, error });
            throw error;
        }
    }
    /**
     * Process account deletion
     */
    async processAccountDeletion(userId, requestId) {
        try {
            // Get all user stories
            const { data: libraries } = await this.supabase
                .from('libraries')
                .select('id')
                .eq('owner', userId);
            for (const library of libraries || []) {
                const { data: stories } = await this.supabase
                    .from('stories')
                    .select('id')
                    .eq('library_id', library.id);
                for (const story of stories || []) {
                    await this.processStoryDeletion(story.id, userId, requestId, true);
                }
            }
            // Delete S3 assets
            const { data: assets } = await this.supabase
                .from('media_assets')
                .select('url')
                .in('story_id', (libraries || []).map(l => l.id));
            for (const asset of assets || []) {
                const key = asset.url.split('/').slice(-2).join('/');
                try {
                    await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
                        Bucket: this.assetBucket,
                        Key: key
                    }));
                }
                catch (error) {
                    this.logger.warn('Failed to delete S3 asset', { key, error });
                }
            }
            // Delete user data (following GDPR deletion function pattern)
            await this.supabase.rpc('delete_user_data_gdpr', {
                p_user_id: userId,
                p_confirmation_token: 'SYSTEM_DELETION' // System deletion doesn't need confirmation
            });
            // Log audit
            await this.supabase.rpc('log_deletion_audit', {
                p_deletion_request_id: requestId,
                p_deletion_type: 'account',
                p_user_id: userId,
                p_action: 'processed',
                p_metadata: {}
            });
            this.logger.info('Account deletion processed', { userId, requestId });
        }
        catch (error) {
            this.logger.error('Error processing account deletion', { userId, requestId, error });
            throw error;
        }
    }
    /**
     * Process story deletion
     */
    async processStoryDeletion(storyId, userId, requestId, skipAuth = false) {
        try {
            if (!skipAuth) {
                // Verify ownership
                const { data: story } = await this.supabase
                    .from('stories')
                    .select('library_id, libraries!inner(owner)')
                    .eq('id', storyId)
                    .single();
                if (!story || story.libraries.owner !== userId) {
                    throw new Error('Story not found or access denied');
                }
            }
            // Get and delete S3 assets
            const { data: assets } = await this.supabase
                .from('media_assets')
                .select('url')
                .eq('story_id', storyId);
            for (const asset of assets || []) {
                const key = asset.url.split('/').slice(-2).join('/');
                try {
                    await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
                        Bucket: this.assetBucket,
                        Key: key
                    }));
                    // Mark as deleted
                    await this.supabase
                        .from('media_assets')
                        .update({
                        deleted_at: new Date().toISOString(),
                        deletion_request_id: requestId
                    })
                        .eq('url', asset.url);
                }
                catch (error) {
                    this.logger.warn('Failed to delete S3 asset', { key, error });
                }
            }
            // Delete story and related data
            await this.supabase.from('characters').delete().eq('story_id', storyId);
            await this.supabase.from('stories').delete().eq('id', storyId);
            await this.supabase.rpc('log_deletion_audit', {
                p_deletion_request_id: requestId,
                p_deletion_type: 'story',
                p_user_id: userId,
                p_action: 'processed',
                p_metadata: { storyId }
            });
            this.logger.info('Story deletion processed', { storyId, userId, requestId });
        }
        catch (error) {
            this.logger.error('Error processing story deletion', { storyId, userId, error });
            throw error;
        }
    }
    /**
     * Process character deletion
     */
    async processCharacterDeletion(characterId, userId, requestId, options) {
        try {
            const { data: character } = await this.supabase
                .from('characters')
                .select('story_id, stories!inner(library_id, libraries!inner(owner))')
                .eq('id', characterId)
                .single();
            if (!character || character.stories.libraries.owner !== userId) {
                throw new Error('Character not found or access denied');
            }
            if (options?.deleteStories) {
                // Delete all stories with this character
                await this.processStoryDeletion(character.stories.id, userId, requestId, true);
            }
            else if (options?.removeFromStories) {
                // Just remove character from stories
                await this.supabase.from('characters').delete().eq('id', characterId);
            }
            else {
                // Default: delete character only
                await this.supabase.from('characters').delete().eq('id', characterId);
            }
            await this.supabase.rpc('log_deletion_audit', {
                p_deletion_request_id: requestId,
                p_deletion_type: 'character',
                p_user_id: userId,
                p_action: 'processed',
                p_metadata: { characterId, options }
            });
            this.logger.info('Character deletion processed', { characterId, userId, requestId });
        }
        catch (error) {
            this.logger.error('Error processing character deletion', { characterId, userId, error });
            throw error;
        }
    }
}
exports.DeletionService = DeletionService;
//# sourceMappingURL=DeletionService.js.map