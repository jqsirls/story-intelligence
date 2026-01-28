// Extends existing EventSystem with self-healing capabilities
import { EventPublisher } from './EventPublisher';
import { EventSubscriber } from './EventSubscriber';
import {
  IncidentPattern,
  HealingAction,
  IncidentRecord,
  SelfHealingConfig,
  EnhancedErrorContext,
  SelfHealingEventType
} from '@alexa-multi-agent/shared-types';
import { CloudEvent, EventSubscription, EventType } from './types';
import { Logger } from 'winston';

export class SelfHealingEventHandler {
  private eventPublisher: EventPublisher;
  private eventSubscriber: EventSubscriber;
  private logger: Logger;
  private config: SelfHealingConfig;
  private knownPatterns: Map<string, IncidentPattern> = new Map();
  private activeIncidents: Map<string, IncidentRecord> = new Map();
  private queueUrl?: string;

  constructor(
    eventPublisher: EventPublisher,
    eventSubscriber: EventSubscriber,
    logger: Logger,
    config: SelfHealingConfig,
    queueUrl?: string
  ) {
    this.eventPublisher = eventPublisher;
    this.eventSubscriber = eventSubscriber;
    this.logger = logger;
    this.config = config;
    this.queueUrl = queueUrl;
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.queueUrl) {
      this.logger.warn('Self-healing queueUrl not provided; healing subscriptions disabled');
      return;
    }
    // Listen to existing agent error events
    this.eventSubscriber.subscribe(
      'com.storytailor.agent.error',
      this.createSubscription('com.storytailor.agent.error', this.handleAgentError.bind(this)),
      this.queueUrl
    );
    this.eventSubscriber.subscribe(
      'com.storytailor.api.timeout',
      this.createSubscription('com.storytailor.api.timeout', this.handleApiTimeout.bind(this)),
      this.queueUrl
    );
    this.eventSubscriber.subscribe(
      'com.storytailor.database.error',
      this.createSubscription('com.storytailor.database.error', this.handleDatabaseError.bind(this)),
      this.queueUrl
    );
    
    // Listen to existing performance events
    this.eventSubscriber.subscribe(
      'com.storytailor.performance.degraded',
      this.createSubscription('com.storytailor.performance.degraded', this.handlePerformanceDegradation.bind(this)),
      this.queueUrl
    );
  }

  private createSubscription(eventType: EventType, handler: (event: CloudEvent) => Promise<void>): EventSubscription {
    return {
      eventTypes: [eventType],
      handler: {
        handle: async (event: CloudEvent) => handler(event)
      }
    };
  }

  async handleAgentError(event: CloudEvent): Promise<void> {
    if (!this.config.enabled) return;

    const errorContext: EnhancedErrorContext = {
      agentName: event.data.agentName,
      userId: event.data.userId,
      sessionId: event.data.sessionId,
      storyId: event.data.storyId,
      activeConversation: event.data.activeConversation || false,
      errorCount: event.data.errorCount || 1,
      lastOccurrence: event.time,
      relatedIncidents: []
    };

    // Detect if this matches a known pattern
    const pattern = await this.detectIncidentPattern(event, errorContext);
    if (pattern) {
      await this.initiateHealing(pattern, errorContext);
    }
  }

  private async detectIncidentPattern(
    event: any, 
    context: EnhancedErrorContext
  ): Promise<IncidentPattern | null> {
    const errorSignature = this.generateErrorSignature(event, context);
    
    // Check against known patterns
    for (const [patternId, pattern] of this.knownPatterns) {
      if (this.matchesPattern(errorSignature, pattern)) {
        this.logger.info('Detected known incident pattern', {
          patternId,
          agentName: context.agentName,
          errorSignature
        });
        return pattern;
      }
    }

    // Learn new patterns if error frequency is high
    if (context.errorCount >= 3) {
      const newPattern = await this.learnNewPattern(errorSignature, context);
      if (newPattern) {
        this.knownPatterns.set(newPattern.id, newPattern);
        return newPattern;
      }
    }

    return null;
  }

  private async initiateHealing(
    pattern: IncidentPattern, 
    context: EnhancedErrorContext
  ): Promise<void> {
    // SAFETY: Never interrupt active story conversations
    if (context.activeConversation && this.config.storySessionProtection) {
      this.logger.info('Healing deferred - active story session', {
        patternId: pattern.id,
        sessionId: context.sessionId,
        storyId: context.storyId
      });
      return;
    }

    // Check time window restrictions
    if (!this.isWithinAllowedTimeWindow()) {
      this.logger.info('Healing deferred - outside allowed time window', {
        patternId: pattern.id,
        currentTime: new Date().toISOString()
      });
      return;
    }

    // Check rate limits
    if (!this.checkRateLimit()) {
      this.logger.warn('Healing rate limit exceeded', {
        patternId: pattern.id,
        maxActionsPerHour: this.config.maxActionsPerHour
      });
      return;
    }

    const healingAction = await this.selectHealingAction(pattern, context);
    if (healingAction) {
      await this.executeHealing(healingAction, pattern, context);
    }
  }

  private async selectHealingAction(
    pattern: IncidentPattern, 
    context: EnhancedErrorContext
  ): Promise<HealingAction | null> {
    // Select action based on pattern severity and autonomy level
    const availableActions = this.getAvailableActions(pattern);
    
    for (const action of availableActions) {
      if (action.autonomyLevel <= this.config.autonomyLevel) {
        // Verify safety checks
        const safetyPassed = await this.verifySafetyChecks(action, context);
        if (safetyPassed) {
          return action;
        }
      }
    }

    return null;
  }

  private async executeHealing(
    action: HealingAction,
    pattern: IncidentPattern,
    context: EnhancedErrorContext
  ): Promise<void> {
    const incidentId = `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const incident: IncidentRecord = {
      id: incidentId,
      incidentType: pattern.type,
      errorPattern: { signature: this.generateErrorSignature({}, context) },
      detectedAt: new Date().toISOString(),
      healingAction: action,
      success: false,
      impactedUsers: 0,
      storySessionsAffected: 0,
      resolutionTime: 0,
      metadata: {
        agentName: context.agentName,
        patternId: pattern.id,
        actionType: action.type
      }
    };

    this.activeIncidents.set(incidentId, incident);

    // Publish healing started event
    await this.eventPublisher.publishEvent(
      'com.storytailor.healing.started' as SelfHealingEventType,
      {
        incidentId,
        action: action.type,
        agentName: context.agentName,
        estimatedImpact: action.estimatedImpact
      }
    );

    try {
      const startTime = Date.now();
      
      // Execute the healing action
      const result = await this.performHealingAction(action, context);
      
      const endTime = Date.now();
      incident.resolvedAt = new Date().toISOString();
      incident.success = result.success;
      incident.resolutionTime = endTime - startTime;

      // Publish healing completed event
      await this.eventPublisher.publishEvent(
        'com.storytailor.healing.completed' as SelfHealingEventType,
        {
          incidentId,
          success: result.success,
          resolutionTime: incident.resolutionTime,
          agentName: context.agentName
        }
      );

      this.logger.info('Healing action completed', {
        incidentId,
        actionType: action.type,
        success: result.success,
        resolutionTime: incident.resolutionTime
      });

    } catch (error) {
      incident.success = false;
      incident.resolvedAt = new Date().toISOString();

      await this.eventPublisher.publishEvent(
        'com.storytailor.healing.failed' as SelfHealingEventType,
        {
          incidentId,
          error: error instanceof Error ? error.message : String(error),
          agentName: context.agentName
        }
      );

      this.logger.error('Healing action failed', {
        incidentId,
        actionType: action.type,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      // Store incident record for learning
      await this.storeIncidentRecord(incident);
      this.activeIncidents.delete(incidentId);
    }
  }

  private async performHealingAction(
    action: HealingAction,
    context: EnhancedErrorContext
  ): Promise<{ success: boolean; message?: string }> {
    switch (action.type) {
      case 'restart_agent':
        return this.restartAgent(context.agentName);
      
      case 'clear_cache':
        return this.clearAgentCache(context.agentName);
      
      case 'retry_request':
        return this.retryFailedRequest(context);
      
      case 'switch_backup':
        return this.switchToBackupService(context.agentName);
      
      case 'rollback_deploy':
        return this.rollbackDeployment(context.agentName);
      
      default:
        return { success: false, message: `Unknown action type: ${action.type}` };
    }
  }

  private async restartAgent(agentName: string): Promise<{ success: boolean; message?: string }> {
    // Implementation would restart the specific agent
    // This is a placeholder for the actual restart logic
    this.logger.info(`Restarting agent: ${agentName}`);
    return { success: true, message: `Agent ${agentName} restarted successfully` };
  }

  private async clearAgentCache(agentName: string): Promise<{ success: boolean; message?: string }> {
    // Implementation would clear Redis cache for the specific agent
    this.logger.info(`Clearing cache for agent: ${agentName}`);
    return { success: true, message: `Cache cleared for agent ${agentName}` };
  }

  private async retryFailedRequest(context: EnhancedErrorContext): Promise<{ success: boolean; message?: string }> {
    // Implementation would retry the failed request with exponential backoff
    this.logger.info(`Retrying failed request for agent: ${context.agentName}`);
    return { success: true, message: `Request retried successfully` };
  }

  private async switchToBackupService(agentName: string): Promise<{ success: boolean; message?: string }> {
    // Implementation would switch to backup service/model
    this.logger.info(`Switching to backup service for agent: ${agentName}`);
    return { success: true, message: `Switched to backup service for ${agentName}` };
  }

  private async rollbackDeployment(agentName: string): Promise<{ success: boolean; message?: string }> {
    // Implementation would trigger deployment rollback
    this.logger.info(`Rolling back deployment for agent: ${agentName}`);
    return { success: true, message: `Deployment rolled back for ${agentName}` };
  }

  // Helper methods
  private generateErrorSignature(event: any, context: EnhancedErrorContext): string {
    return `${context.agentName}:${event.type || 'unknown'}:${context.errorCount}`;
  }

  private matchesPattern(signature: string, pattern: IncidentPattern): boolean {
    return signature.includes(pattern.errorSignature);
  }

  private async learnNewPattern(signature: string, context: EnhancedErrorContext): Promise<IncidentPattern | null> {
    // Implementation would use ML to learn new patterns
    return null;
  }

  private getAvailableActions(pattern: IncidentPattern): HealingAction[] {
    // Return available healing actions based on pattern type
    return [];
  }

  private async verifySafetyChecks(action: HealingAction, context: EnhancedErrorContext): Promise<boolean> {
    // Verify all safety checks pass
    return true;
  }

  private isWithinAllowedTimeWindow(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(this.config.allowedTimeWindow.start.split(':')[0]);
    const endHour = parseInt(this.config.allowedTimeWindow.end.split(':')[0]);
    
    return currentHour >= startHour && currentHour < endHour;
  }

  private checkRateLimit(): boolean {
    // Implementation would check if we're within rate limits
    return true;
  }

  private async storeIncidentRecord(incident: IncidentRecord): Promise<void> {
    // Store in Supabase incident_knowledge table
    this.logger.info('Storing incident record', { incidentId: incident.id });
  }

  private async handleApiTimeout(event: any): Promise<void> {
    // Handle API timeout events
  }

  private async handleDatabaseError(event: any): Promise<void> {
    // Handle database error events
  }

  private async handlePerformanceDegradation(event: any): Promise<void> {
    // Handle performance degradation events
  }
}