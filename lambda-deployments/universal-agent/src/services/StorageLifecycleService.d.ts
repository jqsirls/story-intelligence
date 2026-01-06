import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
export declare class StorageLifecycleService {
    private supabase;
    private logger;
    private s3Client;
    private glacierClient;
    private assetBucket;
    private glacierBucket;
    private glacierVault;
    constructor(supabase: SupabaseClient, logger: Logger, region?: string);
    /**
     * Move inactive user assets to Glacier (tier to Glacier)
     */
    tierToGlacier(userId: string): Promise<{
        archivedCount: number;
        totalSizeGB: number;
    }>;
    /**
     * Delete S3 assets
     */
    deleteS3Assets(assetKeys: string[]): Promise<{
        deleted: number;
        errors: number;
    }>;
    /**
     * Calculate storage usage for user
     */
    calculateStorageUsage(userId: string): Promise<{
        totalGB: number;
        assetCount: number;
        glacierGB: number;
    }>;
    /**
     * Restore from Glacier (initiates restore job - takes 3-5 hours)
     */
    restoreFromGlacier(userId: string): Promise<{
        jobId: string;
        estimatedHours: number;
    }>;
    /**
     * Check restore job status
     */
    checkRestoreStatus(userId: string): Promise<{
        status: string;
        progress?: number;
    }>;
}
//# sourceMappingURL=StorageLifecycleService.d.ts.map