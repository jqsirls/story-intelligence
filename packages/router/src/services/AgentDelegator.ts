import { Logger } from 'winston';
import {
  Intent,
  AgentRequest,
  AgentResponse,
  TurnContext,
  MemoryState,
  CircuitBreakerState,
  RouterError,
  RouterErrorCode,
  RouterConfig
} from '../types';

/**
 * Agent delegation service with circuit breaker pattern
 * Routes requests to appropriate sub-agents with timeout and retry handling
 */
export class AgentDelegator {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private agentEndpoints: Map<string, string> = new Map();

  constructor(
    private config: RouterConfig,
    private logger: Logger
  ) {
    // Initialize agent endpoints
    Object.entries(config.agents).forEach(([agentName, agentConfig]) => {
      this.agentEndpoints.set(agentName, agentConfig.endpoint);
      this.initializeCircuitBreaker(agentName);
    });
  }

  /**
   * Delegate request to appropriate agent
   */
  async delegate(
    intent: Intent,
    context: TurnContext,
    memoryState: MemoryState
  ): Promise<AgentResponse> {
    const agentName = intent.targetAgent;

    try {
      this.logger.info('Delegating to agent', {
        agentName,
        intentType: intent.type,
        userId: context.userId,
        sessionId: context.sessionId,
      });

      // Check circuit breaker
      if (this.isCircuitBreakerOpen(agentName)) {
        throw new RouterError(
          RouterErrorCode.CIRCUIT_BREAKER_OPEN,
          `Circuit breaker is open for agent: ${agentName}`
        );
      }

      // Prepare agent request
      const agentRequest: AgentRequest = {
        intent,
        context,
        memoryState,
        userId: context.userId,
        sessionId: context.sessionId,
      };

      // Call agent with timeout and retry
      const response = await this.callAgentWithRetry(agentName, agentRequest);

      // Record success
      this.recordSuccess(agentName);

      this.logger.info('Agent delegation successful', {
        agentName,
        success: response.success,
        userId: context.userId,
        sessionId: context.sessionId,
      });

      return response;

    } catch (error) {
      this.logger.error('Agent delegation failed', {
        agentName,
        error: error instanceof Error ? error.message : String(error),
        userId: context.userId,
        sessionId: context.sessionId,
      });

      // Record failure
      this.recordFailure(agentName);

      // Return fallback response if enabled
      if (this.config.fallback.enabled) {
        return this.getFallbackResponse(agentName, intent, error);
      }

      throw error;
    }
  }

  /**
   * Delegate to multiple agents in parallel
   */
  async delegateParallel(
    requests: Array<{
      intent: Intent;
      context: TurnContext;
      memoryState: MemoryState;
    }>
  ): Promise<AgentResponse[]> {
    const startTime = Date.now();

    this.logger.info('Starting parallel agent delegation', {
      agentCount: requests.length,
      agents: requests.map(r => r.intent.targetAgent),
    });

    const promises = requests.map(async ({ intent, context, memoryState }, index) => {
      try {
        const response = await this.delegate(intent, context, memoryState);
        
        this.logger.debug('Parallel agent completed', {
          index,
          agentName: intent.targetAgent,
          success: response.success,
          duration: Date.now() - startTime,
        });

        return response;
      } catch (error) {
        this.logger.error('Parallel agent failed', {
          index,
          agentName: intent.targetAgent,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        });

        return {
          agentName: intent.targetAgent,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          requiresFollowup: false,
        } as AgentResponse;
      }
    });

    const results = await Promise.all(promises);
    const totalDuration = Date.now() - startTime;

    this.logger.info('Parallel agent delegation completed', {
      agentCount: requests.length,
      successCount: results.filter((r: AgentResponse) => r.success).length,
      failureCount: results.filter((r: AgentResponse) => !r.success).length,
      totalDuration,
    });

    return results;
  }

  /**
   * Aggregate responses from multiple agents into a single response
   */
  aggregateResponses(responses: AgentResponse[], primaryAgent?: string): AgentResponse {
    const successfulResponses = responses.filter((r: AgentResponse) => r.success);
    const failedResponses = responses.filter((r: AgentResponse) => !r.success);

    // If all agents failed, return a failure response
    if (successfulResponses.length === 0) {
      return {
        agentName: 'aggregated',
        success: false,
        error: `All agents failed: ${failedResponses.map(r => `${r.agentName}: ${r.error}`).join(', ')}`,
        requiresFollowup: false,
      };
    }

    // Find the primary response (either specified or first successful)
    const primaryResponse = primaryAgent 
      ? successfulResponses.find(r => r.agentName === primaryAgent) || successfulResponses[0]
      : successfulResponses[0];

    // Aggregate data from all successful responses
    const aggregatedData: any = {};
    successfulResponses.forEach(response => {
      if (response.data) {
        aggregatedData[response.agentName] = response.data;
      }
    });

    // Determine if any agent requires followup
    const requiresFollowup = successfulResponses.some(r => r.requiresFollowup);
    const followupAgents = successfulResponses
      .filter(r => r.requiresFollowup && r.followupAgent)
      .map(r => r.followupAgent);

    return {
      agentName: 'aggregated',
      success: true,
      data: {
        primary: primaryResponse.data,
        all: aggregatedData,
        message: primaryResponse.data?.message || 'Multiple agents processed successfully',
      },
      nextPhase: primaryResponse.nextPhase,
      requiresFollowup,
      followupAgent: followupAgents.length > 0 ? followupAgents[0] : undefined,
      metadata: {
        responseCount: successfulResponses.length,
        failureCount: failedResponses.length,
        primaryAgent: primaryResponse.agentName,
        failedAgents: failedResponses.map(r => r.agentName),
      },
    };
  }

  /**
   * Get agent health status
   */
  getAgentHealth(): Record<string, CircuitBreakerState> {
    const health: Record<string, CircuitBreakerState> = {};
    
    this.circuitBreakers.forEach((state, agentName) => {
      health[agentName] = { ...state };
    });

    return health;
  }

  /**
   * Manually reset circuit breaker for an agent
   */
  resetCircuitBreaker(agentName: string): void {
    const circuitBreaker = this.circuitBreakers.get(agentName);
    if (circuitBreaker) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failureCount = 0;
      circuitBreaker.lastFailureTime = undefined;
      circuitBreaker.nextRetryTime = undefined;

      this.logger.info('Circuit breaker reset manually', { agentName });
    }
  }

  /**
   * Private helper methods
   */

  private async callAgentWithRetry(
    agentName: string,
    request: AgentRequest
  ): Promise<AgentResponse> {
    const agentConfig = this.config.agents[agentName];
    if (!agentConfig) {
      throw new RouterError(
        RouterErrorCode.AGENT_UNAVAILABLE,
        `Agent configuration not found: ${agentName}`
      );
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= agentConfig.retries; attempt++) {
      try {
        const response = await this.callAgent(agentName, request, agentConfig.timeout);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        this.logger.warn('Agent call attempt failed', {
          agentName,
          attempt,
          maxRetries: agentConfig.retries,
          error: lastError.message,
        });

        // Don't retry on certain error types
        if (error instanceof RouterError) {
          if ([
            RouterErrorCode.AUTHENTICATION_REQUIRED,
            RouterErrorCode.INVALID_INPUT,
          ].includes(error.code)) {
            throw error;
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < agentConfig.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new RouterError(
      RouterErrorCode.AGENT_UNAVAILABLE,
      `Agent ${agentName} failed after ${agentConfig.retries} attempts`
    );
  }

  private async callAgent(
    agentName: string,
    request: AgentRequest,
    timeout: number
  ): Promise<AgentResponse> {
    const endpoint = this.agentEndpoints.get(agentName);
    if (!endpoint) {
      throw new RouterError(
        RouterErrorCode.AGENT_UNAVAILABLE,
        `No endpoint configured for agent: ${agentName}`
      );
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new RouterError(
          RouterErrorCode.TIMEOUT,
          `Agent ${agentName} timed out after ${timeout}ms`
        ));
      }, timeout);
    });

    // Create fetch promise
    const fetchPromise = this.makeHttpRequest(endpoint, request);

    // Race between fetch and timeout
    try {
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      return response;
    } catch (error) {
      if (error instanceof RouterError && error.code === RouterErrorCode.TIMEOUT) {
        throw error;
      }
      
      throw new RouterError(
        RouterErrorCode.AGENT_UNAVAILABLE,
        `Agent ${agentName} request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async makeHttpRequest(endpoint: string, request: AgentRequest): Promise<AgentResponse> {
    try {
      // Create the HTTP request payload
      const payload = {
        intent: request.intent,
        context: request.context,
        memoryState: {
          userId: request.memoryState.userId,
          sessionId: request.memoryState.sessionId,
          conversationPhase: request.memoryState.conversationPhase,
          currentStoryId: request.memoryState.currentStoryId,
          currentCharacterId: request.memoryState.currentCharacterId,
          storyType: request.memoryState.storyType,
          lastIntent: request.memoryState.lastIntent,
          context: request.memoryState.context,
        },
        userId: request.userId,
        sessionId: request.sessionId,
        timestamp: new Date().toISOString(),
      };

      // Make the HTTP request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Storytailor-Router/1.0.0',
          'X-Request-ID': request.context.requestId,
          'X-Session-ID': request.sessionId,
        },
        body: JSON.stringify(payload),
      });

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse the response
      const responseData = await response.json();

      // Validate response structure
      if (!this.isValidAgentResponse(responseData)) {
        throw new Error('Invalid agent response format');
      }

      return responseData as AgentResponse;

    } catch (error) {
      // For development/testing, fall back to mock response if fetch fails
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        this.logger.warn('Falling back to mock response for development', {
          endpoint,
          error: error instanceof Error ? error.message : String(error),
        });

        return this.createMockResponse(request);
      }

      throw error;
    }
  }

  private createMockResponse(request: AgentRequest): AgentResponse {
    const agentName = request.intent.targetAgent;
    
    // Create different mock responses based on agent type
    let mockData: any = {
      message: `Processed ${request.intent.type} intent`,
      parameters: request.intent.parameters,
    };

    switch (agentName) {
      case 'auth':
        mockData = {
          message: 'Authentication processed',
          authenticated: true,
          token: 'mock-jwt-token',
        };
        break;
      
      case 'content':
        mockData = {
          message: 'Content generated successfully',
          speechText: 'Great! Let\'s create an amazing story together.',
          storyContent: 'Once upon a time...',
        };
        break;
      
      case 'library':
        mockData = {
          message: 'Library accessed',
          stories: [],
          totalCount: 0,
        };
        break;
      
      case 'emotion':
        mockData = {
          message: 'Emotion recorded',
          mood: 'happy',
          confidence: 0.8,
        };
        break;
      
      case 'commerce':
        mockData = {
          message: 'Commerce operation completed',
          subscriptionStatus: 'active',
        };
        break;
      
      case 'insights':
        mockData = {
          message: 'Insights generated',
          recommendations: [],
        };
        break;
    }

    return {
      agentName,
      success: true,
      data: mockData,
      nextPhase: request.intent.conversationPhase,
      requiresFollowup: false,
    };
  }

  private isValidAgentResponse(response: any): boolean {
    return (
      typeof response === 'object' &&
      typeof response.agentName === 'string' &&
      typeof response.success === 'boolean' &&
      (response.data === undefined || typeof response.data === 'object') &&
      (response.error === undefined || typeof response.error === 'string') &&
      (response.nextPhase === undefined || typeof response.nextPhase === 'string') &&
      (response.requiresFollowup === undefined || typeof response.requiresFollowup === 'boolean')
    );
  }

  private initializeCircuitBreaker(agentName: string): void {
    this.circuitBreakers.set(agentName, {
      agentName,
      isOpen: false,
      failureCount: 0,
    });
  }

  private isCircuitBreakerOpen(agentName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(agentName);
    if (!circuitBreaker) {
      return false;
    }

    // Check if circuit breaker should be reset
    if (circuitBreaker.isOpen && circuitBreaker.nextRetryTime) {
      if (new Date() >= circuitBreaker.nextRetryTime) {
        circuitBreaker.isOpen = false;
        circuitBreaker.failureCount = 0;
        circuitBreaker.nextRetryTime = undefined;
        
        this.logger.info('Circuit breaker reset automatically', { agentName });
        return false;
      }
    }

    return circuitBreaker.isOpen;
  }

  private recordSuccess(agentName: string): void {
    const circuitBreaker = this.circuitBreakers.get(agentName);
    if (circuitBreaker) {
      const wasOpen = circuitBreaker.isOpen;
      
      // Reset failure count on success
      circuitBreaker.failureCount = Math.max(0, circuitBreaker.failureCount - 1);
      
      // Close circuit breaker if it was open
      if (circuitBreaker.isOpen) {
        circuitBreaker.isOpen = false;
        circuitBreaker.nextRetryTime = undefined;
        this.logger.info('Circuit breaker closed after successful request', { agentName });
        
        // Emit circuit breaker closed event
        this.emitCircuitBreakerEvent(agentName, 'closed', circuitBreaker);
      }
    }
  }

  private recordFailure(agentName: string): void {
    const circuitBreaker = this.circuitBreakers.get(agentName);
    if (!circuitBreaker) {
      return;
    }

    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = new Date();

    // Open circuit breaker if failure threshold exceeded
    if (circuitBreaker.failureCount >= this.config.circuitBreaker.failureThreshold) {
      circuitBreaker.isOpen = true;
      circuitBreaker.nextRetryTime = new Date(
        Date.now() + this.config.circuitBreaker.resetTimeout
      );

      this.logger.warn('Circuit breaker opened due to failures', {
        agentName,
        failureCount: circuitBreaker.failureCount,
        threshold: this.config.circuitBreaker.failureThreshold,
        nextRetryTime: circuitBreaker.nextRetryTime,
      });

      // Emit circuit breaker event for monitoring
      this.emitCircuitBreakerEvent(agentName, 'opened', circuitBreaker);
    } else {
      this.logger.warn('Agent failure recorded', {
        agentName,
        failureCount: circuitBreaker.failureCount,
        threshold: this.config.circuitBreaker.failureThreshold,
      });
    }
  }

  private emitCircuitBreakerEvent(
    agentName: string, 
    event: 'opened' | 'closed' | 'half-open',
    state: CircuitBreakerState
  ): void {
    // This would integrate with monitoring systems like Datadog, CloudWatch, etc.
    this.logger.info('Circuit breaker event', {
      agentName,
      event,
      failureCount: state.failureCount,
      isOpen: state.isOpen,
      lastFailureTime: state.lastFailureTime,
      nextRetryTime: state.nextRetryTime,
    });
  }

  /**
   * Get circuit breaker metrics for monitoring
   */
  getCircuitBreakerMetrics(): Record<string, {
    isOpen: boolean;
    failureCount: number;
    failureRate: number;
    lastFailureTime?: Date;
    nextRetryTime?: Date;
    uptime: number;
  }> {
    const metrics: Record<string, any> = {};
    
    this.circuitBreakers.forEach((state, agentName) => {
      const now = Date.now();
      const monitoringPeriod = this.config.circuitBreaker.monitoringPeriod;
      
      // Calculate failure rate over monitoring period
      let failureRate = 0;
      if (state.lastFailureTime) {
        const timeSinceLastFailure = now - state.lastFailureTime.getTime();
        if (timeSinceLastFailure <= monitoringPeriod) {
          failureRate = state.failureCount / (monitoringPeriod / 1000); // failures per second
        }
      }

      // Calculate uptime percentage
      const uptime = state.isOpen ? 0 : 100;

      metrics[agentName] = {
        isOpen: state.isOpen,
        failureCount: state.failureCount,
        failureRate,
        lastFailureTime: state.lastFailureTime,
        nextRetryTime: state.nextRetryTime,
        uptime,
      };
    });

    return metrics;
  }

  private getFallbackResponse(
    agentName: string,
    intent: Intent,
    error: any
  ): AgentResponse {
    return {
      agentName,
      success: false,
      data: {
        fallbackMessage: this.config.fallback.defaultResponse,
        originalIntent: intent.type,
      },
      error: `Agent unavailable: ${error instanceof Error ? error.message : String(error)}`,
      requiresFollowup: false,
      metadata: {
        isFallback: true,
        originalError: error instanceof Error ? error.message : String(error),
      },
    };
  }
}