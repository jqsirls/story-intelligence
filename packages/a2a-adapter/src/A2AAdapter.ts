/**
 * A2A Adapter
 * 
 * Main adapter class that coordinates all A2A protocol components.
 */

import { A2AAdapterDependencies, AgentCard, Task, TaskState, JsonRpcRequest, JsonRpcResponse, A2AContext, A2AError, A2AErrorCode } from './types';
import { AgentCardGenerator } from './AgentCard';
import { JsonRpcHandler } from './JsonRpcHandler';
import { TaskManager } from './TaskManager';
import { MessageHandler } from './MessageHandler';
import { SSEStreamer } from './SSEStreamer';
import { WebhookHandler, A2AWebhookEvent } from './WebhookHandler';
import { Authentication, AuthContext } from './Authentication';
import { RouterIntegration } from './RouterIntegration';
import { Response } from 'express';

export class A2AAdapter {
  private agentCardGenerator: AgentCardGenerator;
  private jsonRpcHandler: JsonRpcHandler;
  private taskManager: TaskManager;
  private messageHandler: MessageHandler;
  private sseStreamer: SSEStreamer;
  private webhookHandler: WebhookHandler;
  private authentication: Authentication;
  private routerIntegration: RouterIntegration;

  constructor(private dependencies: A2AAdapterDependencies) {
    // Initialize components
    this.agentCardGenerator = new AgentCardGenerator(dependencies.config);
    this.jsonRpcHandler = new JsonRpcHandler(dependencies.logger);
    this.taskManager = new TaskManager(
      dependencies.supabase,
      dependencies.logger,
      {
        redisUrl: dependencies.config.redis?.url,
        taskTimeoutMs: dependencies.config.taskTimeoutMs || 300000, // 5 minutes default
        redisKeyPrefix: dependencies.config.redis?.keyPrefix
      }
    );
    this.messageHandler = new MessageHandler(dependencies.logger);
    this.sseStreamer = new SSEStreamer(dependencies.logger);
    this.webhookHandler = new WebhookHandler(dependencies.logger);
    this.authentication = new Authentication(dependencies.logger, {
      apiKeys: dependencies.config.apiKeys,
      jwksUrl: dependencies.config.jwksUrl || process.env.A2A_JWKS_URL,
      tokenIssuer: dependencies.config.tokenIssuer || process.env.A2A_TOKEN_ISSUER,
      tokenAudience: dependencies.config.tokenAudience || process.env.A2A_TOKEN_AUDIENCE
    });
    this.routerIntegration = new RouterIntegration(
      dependencies.router || null,
      dependencies.storytellerAPI || null,
      dependencies.logger,
      dependencies.config.baseUrl // Pass REST API base URL for Storytailor ID methods
    );

    // Register method handlers
    this.registerMethodHandlers();
  }

  /**
   * Get Agent Card
   */
  async getAgentCard(): Promise<AgentCard> {
    return this.agentCardGenerator.generate();
  }

  /**
   * Handle JSON-RPC 2.0 message
   */
  async handleMessage(request: unknown): Promise<JsonRpcResponse> {
    return this.jsonRpcHandler.handleRequest(request);
  }

  /**
   * Create task
   */
  async createTask(params: {
    method: string;
    params: Record<string, unknown>;
    clientAgentId: string;
    sessionId?: string;
  }): Promise<Task> {
    const task = await this.taskManager.createTask({
      method: params.method,
      params: params.params,
      clientAgentId: params.clientAgentId,
      remoteAgentId: this.dependencies.config.agentId,
      sessionId: params.sessionId
    });

    // Execute task asynchronously if it's a long-running operation
    if (this.isLongRunningTask(params.method)) {
      this.executeTaskAsync(task.taskId, params.method, params.params, {
        taskId: task.taskId,
        clientAgentId: params.clientAgentId,
        sessionId: params.sessionId,
        correlationId: task.taskId,
        timestamp: task.createdAt
      }).catch((error) => {
        this.dependencies.logger.error('Async task execution failed', { taskId: task.taskId, error });
      });
    }

    return task;
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<Task> {
    const task = await this.taskManager.getTask(taskId);
    if (!task) {
      throw new A2AError(A2AErrorCode.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }
    return task;
  }

  /**
   * Stream task status (SSE)
   */
  async streamTaskStatus(taskId: string, res: Response, lastEventId?: string): Promise<void> {
    await this.sseStreamer.streamTaskStatus(taskId, res, lastEventId);

    // Poll for task updates
    const interval = setInterval(async () => {
      try {
        const task = await this.taskManager.getTask(taskId);
        if (task) {
          this.sseStreamer.sendTaskUpdate(task);
        } else {
          clearInterval(interval);
        }
      } catch (error) {
        this.dependencies.logger.error('Failed to poll task status', { taskId, error });
        clearInterval(interval);
      }
    }, 1000); // Poll every second

    // Cleanup on disconnect
    res.on('close', () => {
      clearInterval(interval);
    });
  }

  /**
   * Handle webhook
   */
  async handleWebhook(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>
  ): Promise<A2AWebhookEvent> {
    return this.webhookHandler.receiveWebhook(payload, headers);
  }

  /**
   * Register method handlers
   */
  private registerMethodHandlers(): void {
    // Register all methods via router integration
    this.jsonRpcHandler.registerMethod('story.generate', async (params) => {
      return this.executeMethod('story.generate', params);
    });

    this.jsonRpcHandler.registerMethod('character.create', async (params) => {
      return this.executeMethod('character.create', params);
    });

    this.jsonRpcHandler.registerMethod('emotion.checkin', async (params) => {
      return this.executeMethod('emotion.checkin', params);
    });

    this.jsonRpcHandler.registerMethod('crisis.detect', async (params) => {
      return this.executeMethod('crisis.detect', params);
    });

    this.jsonRpcHandler.registerMethod('library.list', async (params) => {
      return this.executeMethod('library.list', params);
    });

    this.jsonRpcHandler.registerMethod('library.get', async (params) => {
      return this.executeMethod('library.get', params);
    });

    this.jsonRpcHandler.registerMethod('library.share', async (params) => {
      return this.executeMethod('library.share', params);
    });
  }

  /**
   * Execute method (internal)
   */
  private async executeMethod(
    method: string,
    params: Record<string, unknown>,
    context?: A2AContext
  ): Promise<unknown> {
    const a2aContext: A2AContext = context || {
      clientAgentId: 'unknown',
      correlationId: `req-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    const agentResponse = await this.routerIntegration.executeMethod(method, params, a2aContext);
    return agentResponse.data;
  }

  /**
   * Execute task asynchronously
   */
  private async executeTaskAsync(
    taskId: string,
    method: string,
    params: Record<string, unknown>,
    context: A2AContext
  ): Promise<void> {
    // Update task to working state
    await this.taskManager.updateTaskState(taskId, TaskState.WORKING);

    try {
      // Execute method
      const result = await this.executeMethod(method, params, context);

      // Update task to completed
      await this.taskManager.updateTaskState(taskId, TaskState.COMPLETED, result);

      // Send webhook if configured
      const webhookUrl = this.dependencies.config.webhookUrl;
      if (webhookUrl && context.clientAgentId !== 'unknown') {
        await this.webhookHandler.deliverWebhook(
          webhookUrl,
          {
            event: 'task.completed',
            taskId,
            data: { result },
            timestamp: new Date().toISOString()
          }
        );
      }
    } catch (error) {
      // Update task to failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.taskManager.updateTaskState(taskId, TaskState.FAILED, undefined, {
        code: A2AErrorCode.TASK_TIMEOUT,
        message: errorMessage
      });
    }
  }

  /**
   * Check if method is long-running
   */
  private isLongRunningTask(method: string): boolean {
    return method.startsWith('story.') || method.startsWith('character.');
  }
}
