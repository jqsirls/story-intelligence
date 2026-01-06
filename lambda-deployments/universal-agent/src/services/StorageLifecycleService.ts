import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
// @ts-ignore - AWS SDK may not be available during type checking
import { GlacierClient, InitiateJobCommand, DescribeJobCommand, GetJobOutputCommand } from '@aws-sdk/client-glacier';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';

export class StorageLifecycleService {
  private s3Client: S3Client;
  private glacierClient: GlacierClient;
  private assetBucket: string;
  private glacierBucket: string;
  private glacierVault: string;

  constructor(
    private supabase: SupabaseClient,
    private logger: Logger,
    region: string = 'us-east-2'
  ) {
    this.s3Client = new S3Client({ region });
    this.glacierClient = new GlacierClient({ region });
    this.assetBucket = process.env.ASSET_BUCKET || 'storytailor-assets-production';
    this.glacierBucket = process.env.GLACIER_BUCKET || 'storytailor-glacier-production';
    this.glacierVault = process.env.GLACIER_VAULT || 'storytailor-vault';
  }

  /**
   * Move inactive user assets to Glacier (tier to Glacier)
   */
  async tierToGlacier(userId: string): Promise<{ archivedCount: number; totalSizeGB: number }> {
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
          const headResponse = await this.s3Client.send(new HeadObjectCommand({
            Bucket: this.assetBucket,
            Key: key
          }));

          const size = headResponse.ContentLength || 0;
          totalSizeBytes += size;

          // Copy to S3 with GLACIER storage class (production-ready S3 Glacier tiering)
          const glacierKey = `archives/${userId}/${key}`;
          await this.s3Client.send(new CopyObjectCommand({
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
          await this.s3Client.send(new DeleteObjectCommand({
            Bucket: this.assetBucket,
            Key: key
          }));

          archivedCount++;
        } catch (error) {
          this.logger.warn('Failed to archive asset to Glacier', { assetId: asset.id, error });
        }
      }

      const totalSizeGB = totalSizeBytes / (1024 * 1024 * 1024);

      this.logger.info('Assets tiered to Glacier', { userId, archivedCount, totalSizeGB });

      return { archivedCount, totalSizeGB };
    } catch (error) {
      this.logger.error('Error tiering assets to Glacier', { userId, error });
      throw error;
    }
  }

  /**
   * Delete S3 assets
   */
  async deleteS3Assets(assetKeys: string[]): Promise<{ deleted: number; errors: number }> {
    let deleted = 0;
    let errors = 0;

    for (const key of assetKeys) {
      try {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.assetBucket,
          Key: key
        }));
        deleted++;
      } catch (error) {
        errors++;
        this.logger.warn('Failed to delete S3 asset', { key, error });
      }
    }

    return { deleted, errors };
  }

  /**
   * Calculate storage usage for user
   */
  async calculateStorageUsage(userId: string): Promise<{ totalGB: number; assetCount: number; glacierGB: number }> {
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
            // Estimate Glacier size from S3 metadata (actual size from S3 HeadObject)
            try {
              const headResponse = await this.s3Client.send(new HeadObjectCommand({
                Bucket: this.glacierBucket,
                Key: `archives/${userId}/${key}`
              }));
              if (headResponse && 'ContentLength' in headResponse) {
                glacierSizeBytes += headResponse.ContentLength || 0;
              }
            } catch (error) {
              // Object may not exist in Glacier bucket, skip
            }
          } else {
            const headResponse = await this.s3Client.send(new HeadObjectCommand({
              Bucket: this.assetBucket,
              Key: key
            }));

            totalSizeBytes += headResponse.ContentLength || 0;
          }
        } catch (error) {
          // Asset may have been deleted, skip
        }
      }

      return {
        totalGB: totalSizeBytes / (1024 * 1024 * 1024),
        assetCount,
        glacierGB: glacierSizeBytes / (1024 * 1024 * 1024)
      };
    } catch (error) {
      this.logger.error('Error calculating storage usage', { userId, error });
      throw error;
    }
  }

  /**
   * Restore from Glacier (initiates restore job - takes 3-5 hours)
   */
  async restoreFromGlacier(userId: string): Promise<{ jobId: string; estimatedHours: number }> {
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

      // Initiate Glacier restore job using actual Glacier API
      if (!hibernation.glacier_archive_id) {
        throw new Error('No Glacier archive ID found for hibernated account');
      }

      const initiateCommand = new InitiateJobCommand({
        vaultName: this.glacierVault,
        accountId: '-', // Use '-' for current account
        jobParameters: {
          Type: 'archive-retrieval',
          ArchiveId: hibernation.glacier_archive_id,
          Tier: 'Standard', // Options: Expedited (1-5 min), Standard (3-5 hours), Bulk (5-12 hours)
          Description: `Restore assets for user ${userId}`
        }
      });
      
      const jobResponse = await this.glacierClient.send(initiateCommand);
      const jobId = jobResponse.jobId;
      
      if (!jobId) {
        throw new Error('Failed to initiate Glacier restore job');
      }

      // Update hibernation record
      await this.supabase
        .from('hibernated_accounts')
        .update({
          metadata: {
            ...(hibernation.metadata || {}),
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
    } catch (error) {
      this.logger.error('Error restoring from Glacier', { userId, error });
      throw error;
    }
  }

  /**
   * Check restore job status
   */
  async checkRestoreStatus(userId: string): Promise<{ status: string; progress?: number }> {
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

      // Check Glacier job status using actual Glacier API
      const jobId = hibernation.metadata.restoreJobId;
      
      if (!jobId) {
        return { status: 'not_restoring' };
      }

      const describeCommand = new DescribeJobCommand({
        vaultName: this.glacierVault,
        accountId: '-',
        jobId
      });

      try {
        const jobResponse = await this.glacierClient.send(describeCommand);
        
        return {
          status: jobResponse.StatusCode || 'unknown',
          progress: jobResponse.Action === 'ArchiveRetrieval' ? 
            (jobResponse.Completed ? 100 : 0) : undefined
        };
      } catch (error) {
        this.logger.error('Error checking Glacier job status', { jobId, error });
        return { status: 'error' };
      }
      const initiatedAt = new Date(hibernation.metadata.restoreInitiatedAt);
      const hoursElapsed = (Date.now() - initiatedAt.getTime()) / (1000 * 60 * 60);

      if (hoursElapsed >= 5) {
        // Restore should be complete
        return { status: 'completed', progress: 100 };
      } else {
        return { status: 'in_progress', progress: Math.floor((hoursElapsed / 5) * 100) };
      }
    } catch (error) {
      this.logger.error('Error checking restore status', { userId, error });
      return { status: 'error' };
    }
  }
}

