/**
 * Task Manager
 * 
 * Manages A2A task lifecycle with proper state machine validation.
 * Stores tasks in Redis (fast access) and Supabase (persistence).
 */

import { Task, TaskState, A2AErrorCode, JsonRpcError, A2AError } from './types';
import { v4 as uuidv4 } from 'uuid';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import { Logger } from 'winston';

export class TaskManager {
  private redis: RedisClientType | null = null;
  private taskTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private supabase: SupabaseClient,
    private logger: Logger,
    private config: {
      redisUrl?: string;
      taskTimeoutMs?: number;
      redisKeyPrefix?: string;
    }
  ) {
    this.initializeRedis();
  }

  /**
   * Create new task with proper state machine
   */
  async createTask(params: {
    method: string;
    params: Record<string, unknown>;
    clientAgentId: string;
    remoteAgentId: string;
    sessionId?: string;
  }): Promise<Task> {
    const taskId = uuidv4();
    const now = new Date().toISOString();

    const task: Task = {
      taskId,
      state: TaskState.SUBMITTED,
      method: params.method,
      params: params.params,
      clientAgentId: params.clientAgentId,
      remoteAgentId: params.remoteAgentId,
      sessionId: params.sessionId,
      createdAt: now,
      updatedAt: now
    };

    // Store in Redis (fast access)
    await this.storeInRedis(task);

    // Store in Supabase (persistent)
    await this.storeInSupabase(task);

    // Set timeout if configured
    if (this.config.taskTimeoutMs) {
      this.setTaskTimeout(taskId, this.config.taskTimeoutMs);
    }

    this.logger.info('Task created', { taskId, method: params.method });
    return task;
  }

  /**
   * Update task state (with state machine validation)
   */
  async updateTaskState(
    taskId: string,
    newState: TaskState,
    result?: unknown,
    error?: JsonRpcError
  ): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new A2AError(A2AErrorCode.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    // Validate state transition
    this.validateStateTransition(task.state, newState);

    // Update task
    const updatedTask: Task = {
      ...task,
      state: newState,
      updatedAt: new Date().toISOString(),
      ...(newState === TaskState.COMPLETED ? { completedAt: new Date().toISOString() } : {})
    };

    // Conditionally add result and error (can't spread unknown types)
    if (result !== undefined) {
      updatedTask.result = result;
    }
    if (error !== undefined) {
      updatedTask.error = error;
    }

    // Update storage
    await this.storeInRedis(updatedTask);
    await this.storeInSupabase(updatedTask);

    // Clear timeout if completed/failed/canceled
    if ([TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELED].includes(newState)) {
      this.clearTaskTimeout(taskId);
    }

    this.logger.info('Task state updated', { taskId, oldState: task.state, newState });
    return updatedTask;
  }

  /**
   * State machine validation
   */
  private validateStateTransition(current: TaskState, next: TaskState): void {
    const validTransitions: Record<TaskState, TaskState[]> = {
      [TaskState.SUBMITTED]: [TaskState.WORKING, TaskState.CANCELED, TaskState.FAILED],
      [TaskState.WORKING]: [TaskState.COMPLETED, TaskState.FAILED, TaskState.INPUT_REQUIRED, TaskState.CANCELED],
      [TaskState.INPUT_REQUIRED]: [TaskState.WORKING, TaskState.CANCELED, TaskState.FAILED],
      [TaskState.COMPLETED]: [], // Terminal state
      [TaskState.FAILED]: [], // Terminal state
      [TaskState.CANCELED]: [] // Terminal state
    };

    if (!validTransitions[current].includes(next)) {
      throw new A2AError(
        A2AErrorCode.INVALID_TASK_STATE,
        `Invalid state transition from ${current} to ${next}`
      );
    }
  }

  /**
   * Get task by ID (check Redis first, then Supabase)
   */
  async getTask(taskId: string): Promise<Task | null> {
    // Try Redis first
    if (this.redis) {
      try {
        const cached = await this.redis.get(`${this.config.redisKeyPrefix || 'a2a'}:task:${taskId}`);
        if (cached) {
          return JSON.parse(cached) as Task;
        }
      } catch (error) {
        this.logger.warn('Failed to get task from Redis', { taskId, error });
      }
    }

    // Fallback to Supabase (with retry logic)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await Promise.race([
          this.supabase
            .from('a2a_tasks')
            .select('*')
            .eq('task_id', taskId)
            .single(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Supabase query timeout after 10 seconds')), 10000)
          )
        ]);

        if (error) {
          // Non-network errors don't need retry
          if (error.code && !error.code.includes('PGRST') && !error.message.includes('fetch')) {
            return null;
          }
          
          // Network errors: retry with exponential backoff
          if (attempt < 3) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            this.logger.warn(`Supabase query failed, retrying (attempt ${attempt}/3)`, { taskId, error: error.message, delay });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          this.logger.error('Failed to get task from Supabase after retries', { taskId, error });
          return null;
        }

        if (!data) {
          return null;
        }

        const task = this.mapDatabaseRowToTask(data);
        
        // Cache in Redis for subsequent access
        if (this.redis && task) {
          await this.storeInRedis(task);
        }

        return task;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isNetworkError = errorMessage.includes('fetch') || 
                              errorMessage.includes('timeout') || 
                              errorMessage.includes('ECONNREFUSED') ||
                              errorMessage.includes('ENOTFOUND');
        
        if (!isNetworkError || attempt >= 3) {
          this.logger.error('Failed to get task from Supabase', { taskId, error: errorMessage, attempt });
          return null;
        }
        
        // Retry network errors
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        this.logger.warn(`Supabase query failed (network error), retrying (attempt ${attempt}/3)`, { taskId, error: errorMessage, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return null;
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new A2AError(A2AErrorCode.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    if (task.state === TaskState.COMPLETED) {
      throw new A2AError(A2AErrorCode.TASK_ALREADY_COMPLETED, `Task ${taskId} is already completed`);
    }

    if (task.state === TaskState.CANCELED) {
      return task; // Already canceled
    }

    return this.updateTaskState(taskId, TaskState.CANCELED);
  }

  /**
   * Update task progress (for long-running tasks)
   */
  async updateProgress(taskId: string, progress: number): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new A2AError(A2AErrorCode.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    if (task.state !== TaskState.WORKING) {
      throw new A2AError(
        A2AErrorCode.INVALID_TASK_STATE,
        `Cannot update progress for task in state: ${task.state}`
      );
    }

    const updatedTask: Task = {
      ...task,
      progress: Math.max(0, Math.min(100, progress)),
      updatedAt: new Date().toISOString()
    };

    await this.storeInRedis(updatedTask);
    await this.storeInSupabase(updatedTask);

    return updatedTask;
  }

  private async storeInRedis(task: Task): Promise<void> {
    if (!this.redis) return;

    try {
      const key = `${this.config.redisKeyPrefix || 'a2a'}:task:${task.taskId}`;
      await this.redis.setEx(key, 86400, JSON.stringify(task)); // 24 hour TTL
    } catch (error) {
      this.logger.warn('Failed to store task in Redis', { taskId: task.taskId, error });
    }
  }

  private async storeInSupabase(task: Task, retries = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { error } = await Promise.race([
          this.supabase
            .from('a2a_tasks')
            .upsert({
              task_id: task.taskId,
              state: task.state,
              client_agent_id: task.clientAgentId,
              remote_agent_id: task.remoteAgentId,
              method: task.method,
              params: task.params,
              result: task.result || null,
              error: task.error || null,
              session_id: task.sessionId || null,
              created_at: task.createdAt,
              updated_at: task.updatedAt,
              completed_at: task.completedAt || null
            }, {
              onConflict: 'task_id'
            }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Supabase operation timeout after 10 seconds')), 10000)
          )
        ]);

        if (error) {
          // Don't retry on non-network errors (e.g., validation errors)
          if (error.code && !error.code.includes('PGRST') && !error.message.includes('fetch')) {
            this.logger.error('Failed to store task in Supabase (non-retryable)', { error, taskId: task.taskId });
            throw new Error(`Failed to store task: ${error.message}`);
          }
          
          // Retry on network errors
          if (attempt < retries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
            this.logger.warn(`Supabase store failed, retrying (attempt ${attempt}/${retries})`, { 
              taskId: task.taskId, 
              error: error.message,
              delay 
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          this.logger.error('Failed to store task in Supabase after retries', { error, taskId: task.taskId, attempts: retries });
          throw new Error(`Failed to store task after ${retries} attempts: ${error.message}`);
        }
        
        // Success
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isNetworkError = errorMessage.includes('fetch') || 
                              errorMessage.includes('timeout') || 
                              errorMessage.includes('ECONNREFUSED') ||
                              errorMessage.includes('ENOTFOUND');
        
        if (!isNetworkError) {
          // Non-network error, don't retry
          this.logger.error('Failed to store task in Supabase (non-retryable)', { taskId: task.taskId, error: errorMessage });
          throw error;
        }
        
        // Network error, retry if attempts remaining
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          this.logger.warn(`Supabase store failed (network error), retrying (attempt ${attempt}/${retries})`, { 
            taskId: task.taskId, 
            error: errorMessage,
            delay 
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Final attempt failed
        this.logger.error('Failed to store task in Supabase after retries (network error)', { 
          taskId: task.taskId, 
          error: errorMessage,
          attempts: retries 
        });
        // Don't throw - allow task to continue with Redis-only storage
        // This is a graceful degradation: tasks work even if Supabase is temporarily unavailable
        this.logger.warn('Task will continue with Redis-only storage (Supabase unavailable)', { taskId: task.taskId });
        return;
      }
    }
  }

  private setTaskTimeout(taskId: string, timeoutMs: number): void {
    const timeout = setTimeout(async () => {
      try {
        await this.updateTaskState(taskId, TaskState.FAILED, undefined, {
          code: A2AErrorCode.TASK_TIMEOUT,
          message: 'Task timed out',
          data: { timeoutMs }
        });
      } catch (error) {
        this.logger.error('Failed to timeout task', { taskId, error });
      }
    }, timeoutMs);

    this.taskTimeouts.set(taskId, timeout);
  }

  private clearTaskTimeout(taskId: string): void {
    const timeout = this.taskTimeouts.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.taskTimeouts.delete(taskId);
    }
  }

  private mapDatabaseRowToTask(row: Record<string, unknown>): Task {
    return {
      taskId: row.task_id as string,
      state: row.state as TaskState,
      method: row.method as string,
      params: row.params as Record<string, unknown>,
      result: row.result as unknown,
      error: row.error as JsonRpcError | undefined,
      sessionId: row.session_id as string | undefined,
      clientAgentId: row.client_agent_id as string,
      remoteAgentId: row.remote_agent_id as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      completedAt: row.completed_at as string | undefined
    };
  }

  private async initializeRedis(): Promise<void> {
    if (!this.config.redisUrl) {
      this.logger.warn('Redis URL not provided, task caching disabled');
      return;
    }

    try {
      this.redis = createRedisClient({ url: this.config.redisUrl });
      await this.redis.connect();
      this.logger.info('Redis connected for task management');
    } catch (error) {
      this.logger.warn('Failed to connect to Redis, continuing without cache', { error });
      this.redis = null;
    }
  }
}
