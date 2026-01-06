/**
 * TaskManager Tests
 */

import { TaskManager } from '../TaskManager';
import { TaskState, A2AErrorCode } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';

describe('TaskManager', () => {
  let taskManager: TaskManager;
  let mockSupabase: SupabaseClient;
  let mockLogger: Logger;
  let storedTasks: Map<string, Record<string, unknown>>;

  beforeEach(() => {
    storedTasks = new Map();

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as unknown as Logger;

    const mockFrom = jest.fn().mockReturnValue({
      upsert: jest.fn().mockImplementation(async (data) => {
        // Store task for retrieval
        if (Array.isArray(data)) {
          data.forEach((task) => {
            storedTasks.set(task.task_id, task);
          });
        } else {
          storedTasks.set(data.task_id, data);
        }
        return { error: null };
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockImplementation((column: string, value: string) => {
          return {
            single: jest.fn().mockImplementation(async () => {
              if (column === 'task_id') {
                const task = storedTasks.get(value);
                if (task) {
                  return { data: task, error: null };
                }
              }
              return { data: null, error: null };
            })
          };
        })
      })
    });

    mockSupabase = {
      from: mockFrom
    } as unknown as SupabaseClient;

    taskManager = new TaskManager(mockSupabase, mockLogger, {
      taskTimeoutMs: 5000
    });
  });

  it('should create task in submitted state', async () => {
    const task = await taskManager.createTask({
      method: 'test.method',
      params: {},
      clientAgentId: 'client-1',
      remoteAgentId: 'remote-1'
    });

    expect(task.state).toBe(TaskState.SUBMITTED);
    expect(task.method).toBe('test.method');
    expect(task.clientAgentId).toBe('client-1');
    expect(task.remoteAgentId).toBe('remote-1');
  });

  it('should update task state with validation', async () => {
    const task = await taskManager.createTask({
      method: 'test.method',
      params: {},
      clientAgentId: 'client-1',
      remoteAgentId: 'remote-1'
    });

    const updated = await taskManager.updateTaskState(task.taskId, TaskState.WORKING);

    expect(updated.state).toBe(TaskState.WORKING);
  });

  it('should reject invalid state transition', async () => {
    const task = await taskManager.createTask({
      method: 'test.method',
      params: {},
      clientAgentId: 'client-1',
      remoteAgentId: 'remote-1'
    });

    await taskManager.updateTaskState(task.taskId, TaskState.WORKING);

    // Try invalid transition: WORKING -> SUBMITTED
    await expect(
      taskManager.updateTaskState(task.taskId, TaskState.SUBMITTED)
    ).rejects.toThrow();
  });

  it('should cancel task', async () => {
    const task = await taskManager.createTask({
      method: 'test.method',
      params: {},
      clientAgentId: 'client-1',
      remoteAgentId: 'remote-1'
    });

    const canceled = await taskManager.cancelTask(task.taskId);

    expect(canceled.state).toBe(TaskState.CANCELED);
  });

  it('should throw error for non-existent task', async () => {
    await expect(
      taskManager.getTask('non-existent-id')
    ).resolves.toBeNull();
  });
});
