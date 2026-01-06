// Enhanced Router that extends existing Router with self-healing capabilities
import { Router } from './Router';
import { SelfHealingConfig } from '@alexa-multi-agent/shared-types';
import { Logger } from 'winston';
import { RouterConfig } from './types';

export class EnhancedRouter {
  private router: Router;
  private logger: Logger;
  private selfHealingConfig: SelfHealingConfig;
  public metadata: Record<string, any> = {};

  constructor(
    config: RouterConfig,
    logger: Logger,
    selfHealingConfig: SelfHealingConfig
  ) {
    this.router = new Router(config, logger);
    this.logger = logger;
    this.selfHealingConfig = selfHealingConfig;
  }

  /**
   * Initialize the enhanced router
   */
  async initialize(): Promise<void> {
    await this.router.initialize();
  }

  /**
   * Enhanced route request with basic error handling
   */
  async route(turnContext: any): Promise<any> {
    try {
      return await this.router.route(turnContext);
    } catch (error) {
      this.logger.error('Enhanced router error', {
        error: error instanceof Error ? error.message : String(error),
        userId: turnContext.userId,
        sessionId: turnContext.sessionId
      });
      throw error;
    }
  }

  /**
   * Enhanced health check
   */
  async getHealthStatus(): Promise<any> {
    try {
      return await this.router.getHealthStatus();
    } catch (error) {
      this.logger.error('Health check error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Enhanced interruption handling
   */
  async handleInterruption(sessionId: string, userId: string, interruptionType: any, contextSnapshot?: any, deviceContext?: any): Promise<any> {
    try {
      return await this.router.handleInterruption(sessionId, userId, interruptionType, contextSnapshot, deviceContext);
    } catch (error) {
      this.logger.error('Interruption handling error', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        userId
      });
      throw error;
    }
  }

  /**
   * Shutdown the enhanced router
   */
  async shutdown(): Promise<void> {
    await this.router.shutdown();
  }

  /**
   * Reset circuit breaker for an agent
   */
  resetAgentCircuitBreaker(agentName: string): void {
    this.router.resetAgentCircuitBreaker(agentName);
  }

  /**
   * Get conversation summary
   */
  async getConversationSummary(userId: string, sessionId: string) {
    return this.router.getConversationSummary(userId, sessionId);
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<any> {
    const baseHealth = await this.getHealthStatus();
    const routerHealth = await this.router.getHealthStatus();
    
    return {
      ...baseHealth,
      router: routerHealth,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Recover from conversation interruption
   */
  async recoverFromInterruption(
    interruptionId: string,
    newTurnContext: any
  ): Promise<{
    success: boolean;
    customerResponse?: any;
    error?: string;
  }> {
    try {
      return await this.router.recoverFromInterruption(interruptionId, newTurnContext);
    } catch (error) {
      this.logger.error('Enhanced router interruption recovery error', {
        error: error instanceof Error ? error.message : String(error),
        interruptionId
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Separate user context for multi-user scenarios
   */
  async separateUserContext(
    sessionId: string,
    primaryUserId: string,
    allUserIds: string[],
    userContexts: Record<string, any>
  ): Promise<void> {
    try {
      await this.router.separateUserContext(sessionId, primaryUserId, allUserIds, userContexts);
    } catch (error) {
      this.logger.error('Enhanced router user context separation error', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        primaryUserId
      });
      throw error;
    }
  }

  /**
   * Switch user context on shared device
   */
  async switchUserContext(
    sessionId: string,
    fromUserId: string,
    toUserId: string
  ): Promise<{
    success: boolean;
    customerResponse?: any;
    error?: string;
  }> {
    try {
      return await this.router.switchUserContext(sessionId, fromUserId, toUserId);
    } catch (error) {
      this.logger.error('Enhanced router user context switch error', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        fromUserId,
        toUserId
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Create checkpoint at key narrative moments
   */
  async createCheckpoint(
    userId: string,
    sessionId: string,
    deviceContext?: any
  ): Promise<any> {
    try {
      return await this.router.createCheckpoint(userId, sessionId, deviceContext);
    } catch (error) {
      this.logger.error('Enhanced router checkpoint creation error', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        sessionId
      });
      throw error;
    }
  }
}

// Factory function to create enhanced router
export function createEnhancedRouter(
  config: RouterConfig,
  logger: Logger,
  selfHealingConfig?: Partial<SelfHealingConfig>
): EnhancedRouter {
  const defaultSelfHealingConfig: SelfHealingConfig = {
    enabled: true,
    autonomyLevel: 2,
    maxActionsPerHour: 10,
    storySessionProtection: true,
    parentNotification: true,
    allowedTimeWindow: {
      start: '07:00',
      end: '19:00',
      timezone: 'America/Chicago'
    }
  };

  const finalConfig = { ...defaultSelfHealingConfig, ...selfHealingConfig };
  
  return new EnhancedRouter(config, logger, finalConfig);
}