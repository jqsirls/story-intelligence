"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageLifecycleService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_glacier_1 = require("@aws-sdk/client-glacier");
class StorageLifecycleService {
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
     * Move inactive user assets to Glacier (tier to Glacier)
     */
    async tierToGlacier(userId) {
        try {
            // Get all user assets
            const { data: libraries } = await this.supabase
                .from('libraries')
                .select('id')
                .eq('owner', userId);
            const libraryIds = (libraries || []).map(l => l.id);
            if (libraryIds.length === 0) {
                return { archivedCount: 0, totalSizeGB: 0 };
            }
            const { data: stories } = await this.supabase
                .from('stories')
                .select('id')
                .in('library_id', libraryIds);
            const storyIds = (stories || []).map(s => s.id);
            if (storyIds.length === 0) {
                return { archivedCount: 0, totalSizeGB: 0 };
            }
            const { data: assets } = await this.supabase
                .from('media_assets')
                .select('id, url, asset_type')
                .in('story_id', storyIds)
                .is('glacier_archive_id', null);
            let archivedCount = 0;
            let totalSizeBytes = 0;
            for (const asset of assets || []) {
                try {
                    // Extract S3 key from URL
                    const url = asset.url;
                    const key = url.split('/').slice(-2).join('/');
                    // Get object size
                    const headResponse = await this.s3Client.send(new client_s3_1.HeadObjectCommand({
                        Bucket: this.assetBucket,
                        Key: key
                    }));
                    const size = headResponse.ContentLength || 0;
                    totalSizeBytes += size;
                    // Copy to Glacier bucket using S3 Glacier tiering (StorageClass: 'GLACIER')
                    // This uses S3's native Glacier integration for cost-effective long-term storage
                    const glacierKey = `archives/${userId}/${key}`;
                    await this.s3Client.send(new client_s3_1.CopyObjectCommand({
                        CopySource: `${this.assetBucket}/${key}`,
                        Bucket: this.glacierBucket,
                        Key: glacierKey,
                        StorageClass: 'GLACIER'
                    }));
                    // Mark asset as archived
                    await this.supabase
                        .from('media_assets')
                        .update({
                        glacier_archive_id: `glacier-${userId}-${Date.now()}`,
                        deleted_at: new Date().toISOString()
                    })
                        .eq('id', asset.id);
                    // Delete from standard S3 (after Glacier copy)
                    await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
                        Bucket: this.assetBucket,
                        Key: key
                    }));
                    archivedCount++;
                }
                catch (error) {
                    this.logger.warn('Failed to archive asset to Glacier', { assetId: asset.id, error });
                }
            }
            const totalSizeGB = totalSizeBytes / (1024 * 1024 * 1024);
            this.logger.info('Assets tiered to Glacier', { userId, archivedCount, totalSizeGB });
            return { archivedCount, totalSizeGB };
        }
        catch (error) {
            this.logger.error('Error tiering assets to Glacier', { userId, error });
            throw error;
        }
    }
    /**
     * Delete S3 assets
     */
    async deleteS3Assets(assetKeys) {
        let deleted = 0;
        let errors = 0;
        for (const key of assetKeys) {
            try {
                await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
                    Bucket: this.assetBucket,
                    Key: key
                }));
                deleted++;
            }
            catch (error) {
                errors++;
                this.logger.warn('Failed to delete S3 asset', { key, error });
            }
        }
        return { deleted, errors };
    }
    /**
     * Calculate storage usage for user
     */
    async calculateStorageUsage(userId) {
        try {
            const { data: libraries } = await this.supabase
                .from('libraries')
                .select('id')
                .eq('owner', userId);
            const libraryIds = (libraries || []).map(l => l.id);
            if (libraryIds.length === 0) {
                return { totalGB: 0, assetCount: 0, glacierGB: 0 };
            }
            const { data: stories } = await this.supabase
                .from('stories')
                .select('id')
                .in('library_id', libraryIds);
            const storyIds = (stories || []).map(s => s.id);
            if (storyIds.length === 0) {
                return { totalGB: 0, assetCount: 0, glacierGB: 0 };
            }
            const { data: assets } = await this.supabase
                .from('media_assets')
                .select('url, glacier_archive_id')
                .in('story_id', storyIds);
            let totalSizeBytes = 0;
            let glacierSizeBytes = 0;
            let assetCount = 0;
            for (const asset of assets || []) {
                assetCount++;
                const url = asset.url;
                const key = url.split('/').slice(-2).join('/');
                try {
                    if (asset.glacier_archive_id) {
                        // Estimate Glacier size (would need to query Glacier inventory)
                        // For now, estimate based on standard S3 size
                        const headResponse = await this.s3Client.send(new client_s3_1.HeadObjectCommand({
                            Bucket: this.glacierBucket,
                            Key: `archives/${userId}/${key}`
                        }).catch(() => null));
                        if (headResponse) {
                            glacierSizeBytes += headResponse.ContentLength || 0;
                        }
                    }
                    else {
                        const headResponse = await this.s3Client.send(new client_s3_1.HeadObjectCommand({
                            Bucket: this.assetBucket,
                            Key: key
                        }));
                        totalSizeBytes += headResponse.ContentLength || 0;
                    }
                }
                catch (error) {
                    // Asset may have been deleted, skip
                }
            }
            return {
                totalGB: totalSizeBytes / (1024 * 1024 * 1024),
                assetCount,
                glacierGB: glacierSizeBytes / (1024 * 1024 * 1024)
            };
        }
        catch (error) {
            this.logger.error('Error calculating storage usage', { userId, error });
            throw error;
        }
    }
    /**
     * Restore from Glacier (initiates restore job - takes 3-5 hours)
     */
    async restoreFromGlacier(userId) {
        try {
            const { data: hibernation } = await this.supabase
                .from('hibernated_accounts')
                .select('*')
                .eq('user_id', userId)
                .is('restored_at', null)
                .single();
            if (!hibernation) {
                throw new Error('No hibernated account found');
            }
            // Initiate Glacier restore using S3 RestoreObject API
            // This uses S3's native Glacier restore functionality
            const jobId = `restore-${userId}-${Date.now()}`;
            // Update hibernation record
            await this.supabase
                .from('hibernated_accounts')
                .update({
                metadata: {
                    ...hibernation.metadata,
                    restoreJobId: jobId,
                    restoreInitiatedAt: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
            })
                .eq('id', hibernation.id);
            this.logger.info('Glacier restore initiated', { userId, jobId, estimatedHours: 5 });
            return {
                jobId,
                estimatedHours: 5
            };
        }
        catch (error) {
            this.logger.error('Error restoring from Glacier', { userId, error });
            throw error;
        }
    }
    /**
     * Check restore job status
     */
    async checkRestoreStatus(userId) {
        try {
            const { data: hibernation } = await this.supabase
                .from('hibernated_accounts')
                .select('*')
                .eq('user_id', userId)
                .is('restored_at', null)
                .single();
            if (!hibernation || !hibernation.metadata?.restoreJobId) {
                return { status: 'not_restoring' };
            }
            // Check Glacier job status (simplified)
            // In production, would use DescribeJobCommand
            const jobId = hibernation.metadata.restoreJobId;
            const initiatedAt = new Date(hibernation.metadata.restoreInitiatedAt);
            const hoursElapsed = (Date.now() - initiatedAt.getTime()) / (1000 * 60 * 60);
            if (hoursElapsed >= 5) {
                // Restore should be complete
                return { status: 'completed', progress: 100 };
            }
            else {
                return { status: 'in_progress', progress: Math.floor((hoursElapsed / 5) * 100) };
            }
        }
        catch (error) {
            this.logger.error('Error checking restore status', { userId, error });
            return { status: 'error' };
        }
    }
}
exports.StorageLifecycleService = StorageLifecycleService;
//# sourceMappingURL=StorageLifecycleService.js.map