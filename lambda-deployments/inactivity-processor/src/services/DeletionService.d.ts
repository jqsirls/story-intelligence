import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
export interface DeletionRequest {
    userId: string;
    deletionType: 'account' | 'story' | 'character' | 'library_member' | 'conversation_assets';
    targetId: string;
    reason?: string;
    immediate?: boolean;
}
export interface CharacterDeletionOptions {
    deleteStories?: boolean;
    removeFromStories?: boolean;
}
export declare class DeletionService {
    private supabase;
    private logger;
    private s3Client;
    private glacierClient;
    private assetBucket;
    private glacierBucket;
    private glacierVault;
    constructor(supabase: SupabaseClient, logger: Logger, region?: string);
    /**
     * Request account deletion with grace period
     */
    requestAccountDeletion(userId: string, immediate?: boolean, reason?: string): Promise<{
        requestId: string;
        scheduledDeletionAt: Date | null;
    }>;
    /**
     * Request story deletion
     */
    requestStoryDeletion(storyId: string, userId: string, immediate?: boolean, reason?: string): Promise<{
        requestId: string;
        scheduledDeletionAt: Date | null;
    }>;
    /**
     * Request character deletion with options
     */
    requestCharacterDeletion(characterId: string, userId: string, options?: CharacterDeletionOptions): Promise<{
        requestId: string;
        scheduledDeletionAt: Date;
    }>;
    /**
     * Remove library member
     */
    removeLibraryMember(libraryId: string, memberUserId: string, adminUserId: string): Promise<void>;
    /**
     * Handle conversation asset deletion
     */
    handleConversationAssetDeletion(sessionId: string, userId: string, assetKeys: string[]): Promise<void>;
    /**
     * Cancel a deletion request
     */
    cancelDeletion(requestId: string, userId: string): Promise<void>;
    /**
     * Process scheduled deletions (called by cron job)
     */
    processScheduledDeletions(): Promise<{
        processed: number;
        errors: number;
    }>;
    /**
     * Hibernate account (archive to Glacier)
     */
    hibernateAccount(userId: string): Promise<{
        archiveId: string;
        estimatedRestoreHours: number;
    }>;
    /**
     * Restore hibernated account from Glacier
     */
    restoreHibernatedAccount(userId: string): Promise<void>;
    /**
     * Process account deletion
     */
    private processAccountDeletion;
    /**
     * Process story deletion
     */
    private processStoryDeletion;
    /**
     * Process character deletion
     */
    private processCharacterDeletion;
}
//# sourceMappingURL=DeletionService.d.ts.map