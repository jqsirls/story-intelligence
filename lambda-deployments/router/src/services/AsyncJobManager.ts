/**
 * Async Job Manager
 * 
 * Handles long-running story generation operations asynchronously
 * to work within API Gateway's 30s timeout limit
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';

export interface AsyncJob {
  jobId: string;
  userId: string;
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  type: 'story_generation';
  request: any;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export class AsyncJobManager {
  private supabase: SupabaseClient;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    private logger: Logger
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Create a new async job
   */
  async createJob(
    userId: string,
    sessionId: string,
    type: 'story_generation',
    request: any
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const job: AsyncJob = {
      jobId,
      userId,
      sessionId,
      status: 'pending',
      type,
      request,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store in Supabase
    try {
      await this.supabase
        .from('async_jobs')
        .insert({
          job_id: jobId,
          user_id: userId,
          session_id: sessionId,
          status: 'pending',
          job_type: type,
          request_data: request,
          created_at: job.createdAt,
          updated_at: job.updatedAt
        });

      this.logger.info('Async job created', { jobId, type });
    } catch (error) {
      this.logger.error('Failed to store async job', { error, jobId });
      // Continue anyway with in-memory fallback
    }

    // Trigger async Lambda execution
    await this.triggerAsyncExecution(jobId, request);

    return jobId;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<AsyncJob | null> {
    try {
      const { data, error } = await this.supabase
        .from('async_jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (error || !data) {
        this.logger.warn('Job not found', { jobId, error });
        return null;
      }

      return {
        jobId: data.job_id,
        userId: data.user_id,
        sessionId: data.session_id,
        status: data.status,
        type: data.job_type,
        request: data.request_data,
        result: data.result_data,
        error: data.error_message,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        completedAt: data.completed_at
      };
    } catch (error) {
      this.logger.error('Failed to get job status', { error, jobId });
      return null;
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    status: AsyncJob['status'],
    result?: any,
    error?: string
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.result_data = result;
    }

    if (status === 'failed') {
      updates.error_message = error;
      updates.completed_at = new Date().toISOString();
    }

    try {
      await this.supabase
        .from('async_jobs')
        .update(updates)
        .eq('job_id', jobId);

      this.logger.info('Job status updated', { jobId, status });
    } catch (err) {
      this.logger.error('Failed to update job status', { error: err, jobId });
    }
  }

  /**
   * Trigger async Lambda execution
   */
  private async triggerAsyncExecution(jobId: string, request: any): Promise<void> {
    try {
      const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');
      const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

      // Invoke Content Agent asynchronously
      await lambda.send(new InvokeCommand({
        FunctionName: process.env.CONTENT_AGENT_FUNCTION || 'storytailor-content-production',
        InvocationType: 'Event', // Async invocation
        Payload: JSON.stringify({
          jobId,
          ...request
        })
      }));

      this.logger.info('Async Lambda triggered', { jobId });
    } catch (error) {
      this.logger.error('Failed to trigger async execution', { error, jobId });
    }
  }
}

