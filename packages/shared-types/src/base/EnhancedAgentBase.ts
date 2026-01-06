// Enhanced agent base class that adds self-healing to existing agents
// import { EventPublisher } from '@alexa-multi-agent/event-system';
import { Logger } from 'winston';
import { 
  EnhancedErrorContext, 
  IncidentPattern, 
  SelfHealingConfig 
} from '../types/self-healing';

export abstract class EnhancedAgentBase {
  // protected eventPublisher: EventPublisher;
  protected logger: Logger;
  protected agentName: string;
  protected selfHealingConfig: SelfHealingConfig;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();

  constructor(
    // eventPublisher: EventPublisher,
    logger: Logger,
    agentName: string,
    selfHealingConfig: SelfHealingConfig
  ) {
    // this.eventPublisher = eventPublisher;
    this.logger = logger;
    this.agentName = agentName;
    this.selfHealingConfig = selfHealingConfig;
  }

  /**
   * Enhanced error handling with self-healing capabilities
   * This wraps existing agent error handling
   */
  protected async handleErrorWithHealing(
    error: Error,
    context: {
      userId?: string;
      sessionId?: string;
      storyId?: string;
      activeConversation?: boolean;
      operation?: string;
    }
  ): Promise<any> {
    const errorKey = `${context.operation || 'unknown'}:${error.name}`;
    
    // Track error frequency
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    this.lastErrors.set(errorKey, new Date());

    // Create enhanced error context
    const enhancedContext: EnhancedErrorContext = {
      agentName: this.agentName,
      userId: context.userId,
      sessionId: context.sessionId,
      storyId: context.storyId,
      activeConversation: context.activeConversation || false,
      errorCount: currentCount + 1,
      lastOccurrence: new Date().toISOString(),
      relatedIncidents: []
    };

    // Log error with enhanced context
    this.logger.error(`Agent error in ${this.agentName}`, {
      error: error.message,
      stack: error.stack,
      context: enhancedContext,
      operation: context.operation
    });

    // Publish error event for self-healing system
    await this.publishErrorEvent(error, enhancedContext);

    // Try self-healing if enabled and conditions are met
    if (this.selfHealingConfig.enabled && this.shouldAttemptSelfHealing(enhancedContext)) {
      const healingResult = await this.attemptSelfHealing(error, enhancedContext);
      if (healingResult.success) {
        this.logger.info('Self-healing successful', {
          agentName: this.agentName,
          operation: context.operation,
          healingAction: healingResult.action
        });
        
        // Reset error count on successful healing
        this.errorCounts.set(errorKey, 0);
        
        return healingResult.result;
      }
    }

    // Fall back to existing error handling
    return this.handleErrorFallback(error, context);
  }

  private async publishErrorEvent(
    error: Error, 
    context: EnhancedErrorContext
  ): Promise<void> {
    try {
      // await this.eventPublisher.publishEvent(
      //   'com.storytailor.agent.error',
      //   {
      //     agentName: this.agentName,
      //     errorName: error.name,
      //     errorMessage: error.message,
      //     errorStack: error.stack,
      //     userId: context.userId,
      //     sessionId: context.sessionId,
      //     storyId: context.storyId,
      //     activeConversation: context.activeConversation,
      //     errorCount: context.errorCount,
      //     operation: 'error_handling'
      //   },
      //   {
      //     userId: context.userId,
      //     sessionId: context.sessionId,
      //     agentName: this.agentName
      //   }
      // );
    } catch (publishError) {
      this.logger.error('Failed to publish error event', {
        originalError: error.message,
        publishError: publishError instanceof Error ? publishError.message : String(publishError)
      });
    }
  }

  private shouldAttemptSelfHealing(context: EnhancedErrorContext): boolean {
    // Don't interrupt active story conversations
    if (context.activeConversation && this.selfHealingConfig.storySessionProtection) {
      return false;
    }

    // Check if error frequency warrants healing
    if (context.errorCount < 2) {
      return false;
    }

    // Check time window restrictions
    if (!this.isWithinAllowedTimeWindow()) {
      return false;
    }

    return true;
  }

  private async attemptSelfHealing(
    error: Error,
    context: EnhancedErrorContext
  ): Promise<{ success: boolean; action?: string; result?: any }> {
    try {
      // Determine healing action based on error type and agent
      const healingAction = this.selectHealingAction(error, context);
      if (!healingAction) {
        return { success: false };
      }

      // Execute healing action
      const result = await this.executeHealingAction(healingAction, error, context);
      
      if (result.success) {
        // Publish healing success event
        // await this.eventPublisher.publishEvent(
        //   'com.storytailor.healing.completed',
        //   {
        //     agentName: this.agentName,
        //     healingAction,
        //     success: true,
        //     errorType: error.name,
        //     context: {
        //       userId: context.userId,
        //       sessionId: context.sessionId,
        //       storyId: context.storyId
        //     }
        //   }
        // );

        return { 
          success: true, 
          action: healingAction, 
          result: result.data 
        };
      }

      return { success: false, action: healingAction };

    } catch (healingError) {
      this.logger.error('Self-healing attempt failed', {
        agentName: this.agentName,
        originalError: error.message,
        healingError: healingError instanceof Error ? healingError.message : String(healingError)
      });

      return { success: false };
    }
  }

  private selectHealingAction(error: Error, context: EnhancedErrorContext): string | null {
    // Select healing action based on error type and agent capabilities
    switch (error.name) {
      case 'TimeoutError':
      case 'RequestTimeoutError':
        return 'retry_with_backoff';
      
      case 'ConnectionError':
      case 'NetworkError':
        return 'switch_to_backup';
      
      case 'RateLimitError':
        return 'apply_exponential_backoff';
      
      case 'CacheError':
        return 'clear_cache';
      
      case 'ValidationError':
        if (context.errorCount >= 3) {
          return 'reset_conversation_state';
        }
        return null;
      
      default:
        if (context.errorCount >= 5) {
          return 'restart_agent_process';
        }
        return null;
    }
  }

  private async executeHealingAction(
    action: string,
    error: Error,
    context: EnhancedErrorContext
  ): Promise<{ success: boolean; data?: any }> {
    switch (action) {
      case 'retry_with_backoff':
        return this.retryWithBackoff(context);
      
      case 'switch_to_backup':
        return this.switchToBackupService(context);
      
      case 'apply_exponential_backoff':
        return this.applyExponentialBackoff(context);
      
      case 'clear_cache':
        return this.clearAgentCache(context);
      
      case 'reset_conversation_state':
        return this.resetConversationState(context);
      
      case 'restart_agent_process':
        return this.restartAgentProcess(context);
      
      default:
        return { success: false };
    }
  }

  // Healing action implementations (to be overridden by specific agents)
  protected async retryWithBackoff(context: EnhancedErrorContext): Promise<{ success: boolean; data?: any }> {
    // Default implementation - agents can override
    await this.sleep(Math.min(1000 * Math.pow(2, context.errorCount), 10000));
    return { success: true };
  }

  protected async switchToBackupService(context: EnhancedErrorContext): Promise<{ success: boolean; data?: any }> {
    // Default implementation - agents can override
    this.logger.info('Switching to backup service', { agentName: this.agentName });
    return { success: true };
  }

  protected async applyExponentialBackoff(context: EnhancedErrorContext): Promise<{ success: boolean; data?: any }> {
    // Default implementation - agents can override
    const backoffMs = Math.min(1000 * Math.pow(2, context.errorCount), 60000);
    await this.sleep(backoffMs);
    return { success: true };
  }

  protected async clearAgentCache(context: EnhancedErrorContext): Promise<{ success: boolean; data?: any }> {
    // Default implementation - agents can override
    this.logger.info('Clearing agent cache', { agentName: this.agentName });
    return { success: true };
  }

  protected async resetConversationState(context: EnhancedErrorContext): Promise<{ success: boolean; data?: any }> {
    // Default implementation - agents can override
    this.logger.info('Resetting conversation state', { 
      agentName: this.agentName,
      sessionId: context.sessionId 
    });
    return { success: true };
  }

  protected async restartAgentProcess(context: EnhancedErrorContext): Promise<{ success: boolean; data?: any }> {
    // Default implementation - agents can override
    this.logger.warn('Agent process restart requested', { agentName: this.agentName });
    return { success: false }; // Requires external orchestration
  }

  private isWithinAllowedTimeWindow(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(this.selfHealingConfig.allowedTimeWindow.start.split(':')[0]);
    const endHour = parseInt(this.selfHealingConfig.allowedTimeWindow.end.split(':')[0]);
    
    return currentHour >= startHour && currentHour < endHour;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Abstract method for existing error handling fallback
  protected abstract handleErrorFallback(error: Error, context: any): Promise<any>;

  /**
   * Enhanced circuit breaker pattern
   */
  protected async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: { userId?: string; sessionId?: string; storyId?: string } = {}
  ): Promise<T> {
    try {
      const result = await operation();
      
      // Reset error count on success
      const errorKey = `${operationName}:success`;
      this.errorCounts.set(errorKey, 0);
      
      return result;
    } catch (error) {
      // Handle error with self-healing
      return this.handleErrorWithHealing(error as Error, {
        ...context,
        operation: operationName,
        activeConversation: context.storyId ? true : false
      });
    }
  }

  /**
   * Get agent health status
   */
  public getHealthStatus(): {
    agentName: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    errorCounts: Record<string, number>;
    lastErrors: Record<string, string>;
    selfHealingEnabled: boolean;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (totalErrors > 10) {
      status = 'unhealthy';
    } else if (totalErrors > 3) {
      status = 'degraded';
    }

    return {
      agentName: this.agentName,
      status,
      errorCounts: Object.fromEntries(this.errorCounts),
      lastErrors: Object.fromEntries(
        Array.from(this.lastErrors.entries()).map(([key, date]) => [key, date.toISOString()])
      ),
      selfHealingEnabled: this.selfHealingConfig.enabled
    };
  }
}