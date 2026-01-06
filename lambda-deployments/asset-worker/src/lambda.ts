/**
 * Asset Job Worker Lambda
 * 
 * Processes queued jobs from asset_generation_jobs table.
 * Triggered by EventBridge every 5 minutes.
 * 
 * Flow:
 * 1. Poll for queued jobs (max 10 per run)
 * 2. Mark each as "generating"
 * 3. Invoke Content Agent async for each job
 * 4. Content Agent processes and updates story/character
 * 5. Content Agent marks job as "ready" or "failed"
 */

import { Handler } from 'aws-lambda';
import { createClient } from '@supabase/supabase-js';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [new transports.Console()]
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler: Handler = async (event) => {
  logger.info('Asset worker triggered', { event });
  
  try {
    // Get queued jobs (limit 10 per run to avoid Lambda timeout)
    const { data: jobs, error: fetchError } = await supabase
      .from('asset_generation_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10);
    
    if (fetchError) {
      logger.error('Failed to fetch queued jobs', { error: fetchError });
      throw fetchError;
    }
    
    if (!jobs || jobs.length === 0) {
      logger.info('No queued jobs found');
      return { 
        statusCode: 200,
        processed: 0,
        message: 'No jobs to process'
      };
    }
    
    logger.info(`Processing ${jobs.length} queued asset jobs`);
    
    let processed = 0;
    let failed = 0;
    
    for (const job of jobs) {
      try {
        // Mark as generating
        const { error: updateError } = await supabase
          .from('asset_generation_jobs')
          .update({ 
            status: 'generating', 
            started_at: new Date().toISOString() 
          })
          .eq('id', job.id);
        
        if (updateError) {
          logger.error(`Failed to update job ${job.id} status`, { error: updateError });
          continue;
        }
        
        // Get story details with creator info
        const { data: story, error: storyError } = await supabase
          .from('stories')
          .select('*, creator_user_id')
          .eq('id', job.story_id)
          .single();
        
        if (storyError || !story) {
          throw new Error(`Story not found: ${job.story_id}`);
        }
        
        // CRITICAL: Pass userId from story record (not "anonymous")
        // This ensures Content Agent can save assets properly
        const userId = story.creator_user_id || story.library_id; // Fallback to library owner if needed
        
        // Invoke Content Agent to process this specific asset
        const payload = {
          action: 'generate_asset',
          storyId: job.story_id,
          assetType: job.asset_type,
          jobId: job.id,
          story,
          userId, // CRITICAL: Pass correct userId
          creatorUserId: story.creator_user_id,
          metadata: job.metadata || {}
        };
        
        await lambda.send(new InvokeCommand({
          FunctionName: process.env.CONTENT_AGENT_FUNCTION || 'storytailor-content-agent-production',
          InvocationType: 'Event', // Async invocation
          Payload: JSON.stringify(payload)
        }));
        
        logger.info(`Dispatched ${job.asset_type} generation for story ${job.story_id}`, { 
          jobId: job.id 
        });
        
        processed++;
        
      } catch (error) {
        logger.error(`Job ${job.id} failed to dispatch`, { 
          error: error instanceof Error ? error.message : String(error),
          jobId: job.id,
          assetType: job.asset_type
        });
        
        // Mark job as failed
        await supabase
          .from('asset_generation_jobs')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : String(error),
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
        
        failed++;
      }
    }
    
    logger.info('Asset worker completed', { processed, failed, total: jobs.length });
    
    return {
      statusCode: 200,
      processed,
      failed,
      total: jobs.length
    };
    
  } catch (error) {
    logger.error('Asset worker failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      statusCode: 500,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

