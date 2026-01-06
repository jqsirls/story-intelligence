/**
 * SSE (Server-Sent Events) Streamer
 * 
 * Streams task status updates to clients using SSE protocol.
 * Supports reconnection with last event ID and heartbeat for long connections.
 */

import { Response } from 'express';
import { Task, TaskState } from './types';
import { Logger } from 'winston';
import { EventEmitter } from 'events';

export class SSEStreamer extends EventEmitter {
  private activeStreams: Map<string, Response> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private logger: Logger) {
    super();
  }

  /**
   * Stream task status updates
   */
  async streamTaskStatus(
    taskId: string,
    res: Response,
    lastEventId?: string
  ): Promise<void> {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Store response
    this.activeStreams.set(taskId, res);

    // Send initial connection message
    this.sendEvent(res, 'connected', { taskId });

    // Send missed events if reconnecting
    if (lastEventId) {
      this.sendEvent(res, 'reconnected', { taskId, lastEventId });
    }

    // Start heartbeat
    this.startHeartbeat(taskId, res);

    // Handle client disconnect
    res.on('close', () => {
      this.handleDisconnect(taskId);
    });

    // Handle errors
    res.on('error', (error) => {
      this.logger.error('SSE stream error', { taskId, error });
      this.handleDisconnect(taskId);
    });
  }

  /**
   * Send task status update
   */
  sendTaskUpdate(task: Task): void {
    const res = this.activeStreams.get(task.taskId);
    if (!res) {
      return; // No active stream for this task
    }

    const eventData = {
      taskId: task.taskId,
      state: task.state,
      progress: task.progress,
      result: task.result,
      error: task.error,
      updatedAt: task.updatedAt
    };

    this.sendEvent(res, 'task.update', eventData, task.taskId);

    // Close stream if task is in terminal state
    if ([TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELED].includes(task.state)) {
      this.sendEvent(res, 'task.complete', eventData, task.taskId);
      setTimeout(() => {
        this.handleDisconnect(task.taskId);
      }, 1000);
    }
  }

  /**
   * Send SSE event
   */
  private sendEvent(
    res: Response,
    event: string,
    data: Record<string, unknown>,
    id?: string
  ): void {
    try {
      if (id) {
        res.write(`id: ${id}\n`);
      }
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      this.logger.error('Failed to send SSE event', { event, error });
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(taskId: string, res: Response): void {
    const interval = setInterval(() => {
      try {
        this.sendEvent(res, 'heartbeat', { timestamp: new Date().toISOString() });
      } catch (error) {
        this.logger.warn('Heartbeat failed', { taskId, error });
        clearInterval(interval);
        this.handleDisconnect(taskId);
      }
    }, 30000); // 30 second heartbeat

    this.heartbeatIntervals.set(taskId, interval);
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(taskId: string): void {
    const res = this.activeStreams.get(taskId);
    if (res) {
      try {
        res.end();
      } catch (error) {
        this.logger.warn('Error closing SSE stream', { taskId, error });
      }
    }

    this.activeStreams.delete(taskId);

    const interval = this.heartbeatIntervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(taskId);
    }

    this.logger.info('SSE stream disconnected', { taskId });
  }

  /**
   * Close all streams
   */
  closeAll(): void {
    for (const taskId of this.activeStreams.keys()) {
      this.handleDisconnect(taskId);
    }
  }
}
