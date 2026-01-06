import { EventEmitter } from 'events';
import { NetworkResilienceManager } from './NetworkResilienceManager';
import { UserInputEdgeCaseHandler } from './UserInputEdgeCaseHandler';
import { SystemFailureResilienceEngine } from './SystemFailureResilienceEngine';
import { ConversationFlowEdgeCaseHandler } from './ConversationFlowEdgeCaseHandler';
import { 
  ConversationContext, 
  UserInput, 
  FailureContext, 
  RecoveryResult,
  EdgeCaseResponse,
  EdgeCaseType
} from '../types';

export interface EdgeCaseConfig {
  networkResilience: {
    offlineStorageLimit: number;
    syncRetryAttempts: number;
    connectionTimeoutMs: number;
    qualityThresholds: {
      excellent: number;
      good: number;
      poor: number;
    };
  };
  userInputHandling: {
    maxContradictionHistory: number;
    distressAlertThreshold: number;
    multiUserTimeoutMs: number;
  };
  systemFailure: {
    healthCheckIntervalMs: number;
    maxFailureHistory: number;
    degradationThresholds: {
      minimal: number;
      moderate: number;
      severe: number;
    };
  };
  conversationFlow: {
    maxTangentDepth: number;
    attentionLossThreshold: number;
    abandonmentTimeoutMs: number;
    contextBackupLimit: number;
  };
}

export interface EdgeCaseMetrics {
  networkIssues: number;
  userInputConflicts: number;
  systemFailures: number;
  conversationInterruptions: number;
  totalRecoveries: number;
  successRate: number;
}

export class EdgeCaseOrchestrator extends EventEmitter {
  private networkManager: NetworkResilienceManager;
  private userInputHandler: UserInputEdgeCaseHandler;
  private systemFailureEngine: SystemFailureResilienceEngine;
  private conversationFlowHandler: ConversationFlowEdgeCaseHandler;
  private metrics: EdgeCaseMetrics;
  private isInitialized: boolean = false;

  constructor(private config: EdgeCaseConfig) {
    super();
    this.initializeMetrics();
    this.initializeHandlers();
  }

  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): void {
    this.metrics = {
      networkIssues: 0,
      userInputConflicts: 0,
      systemFailures: 0,
      conversationInterruptions: 0,
      totalRecoveries: 0,
      successRate: 0
    };
  }

  /**
   * Initialize all edge case handlers
   */
  private initializeHandlers(): void {
    // Initialize network resilience manager
    this.networkManager = new NetworkResilienceManager(this.config.networkResilience);
    this.setupNetworkManagerListeners();

    // Initialize user input edge case handler
    this.userInputHandler = new UserInputEdgeCaseHandler();
    this.setupUserInputHandlerListeners();

    // Initialize system failure resilience engine
    this.systemFailureEngine = new SystemFailureResilienceEngine();
    this.setupSystemFailureEngineListeners();

    // Initialize conversation flow edge case handler
    this.conversationFlowHandler = new ConversationFlowEdgeCaseHandler();
    this.setupConversationFlowHandlerListeners();

    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Setup event listeners for network manager
   */
  private setupNetworkManagerListeners(): void {
    this.networkManager.on('online', () => {
      this.emit('networkStatusChanged', { status: 'online' });
    });

    this.networkManager.on('offline', () => {
      this.metrics.networkIssues++;
      this.emit('networkStatusChanged', { status: 'offline' });
    });

    this.networkManager.on('qualityChanged', (quality) => {
      this.emit('networkQualityChanged', { quality });
    });

    this.networkManager.on('syncCompleted', (result) => {
      this.metrics.totalRecoveries++;
      this.emit('syncCompleted', result);
    });

    this.networkManager.on('syncFailed', (error) => {
      this.emit('syncFailed', error);
    });
  }

  /**
   * Setup event listeners for user input handler
   */
  private setupUserInputHandlerListeners(): void {
    this.userInputHandler.on('ambiguityDetected', (data) => {
      this.metrics.userInputConflicts++;
      this.emit('userInputAmbiguity', data);
    });

    this.userInputHandler.on('contentRedirected', (data) => {
      this.emit('inappropriateContentHandled', data);
    });

    this.userInputHandler.on('distressAlert', (data) => {
      this.emit('emotionalDistressDetected', data);
    });

    this.userInputHandler.on('multiUserConflictResolved', (data) => {
      this.metrics.totalRecoveries++;
      this.emit('multiUserConflictResolved', data);
    });
  }

  /**
   * Setup event listeners for system failure engine
   */
  private setupSystemFailureEngineListeners(): void {
    this.systemFailureEngine.on('serviceFailureHandled', (data) => {
      this.metrics.systemFailures++;
      this.metrics.totalRecoveries++;
      this.emit('systemFailureHandled', data);
    });

    this.systemFailureEngine.on('degradationLevelChanged', (data) => {
      this.emit('systemDegradationChanged', data);
    });

    this.systemFailureEngine.on('cascadingFailurePrevented', (data) => {
      this.emit('cascadingFailurePrevented', data);
    });

    this.systemFailureEngine.on('dataCorruptionRecovered', (data) => {
      this.metrics.totalRecoveries++;
      this.emit('dataCorruptionRecovered', data);
    });
  }

  /**
   * Setup event listeners for conversation flow handler
   */
  private setupConversationFlowHandlerListeners(): void {
    this.conversationFlowHandler.on('interruptionDetected', (data) => {
      this.metrics.conversationInterruptions++;
      this.emit('conversationInterrupted', data);
    });

    this.conversationFlowHandler.on('conversationResumed', (data) => {
      this.metrics.totalRecoveries++;
      this.emit('conversationResumed', data);
    });

    this.conversationFlowHandler.on('tangentManaged', (data) => {
      this.emit('conversationTangentManaged', data);
    });

    this.conversationFlowHandler.on('attentionLossDetected', (data) => {
      this.emit('attentionLossDetected', data);
    });

    this.conversationFlowHandler.on('conversationAbandoned', (data) => {
      this.emit('conversationAbandoned', data);
    });
  }

  /**
   * Handle comprehensive edge case scenarios
   */
  async handleEdgeCase(
    edgeCaseType: EdgeCaseType,
    context: ConversationContext,
    additionalData?: any
  ): Promise<EdgeCaseResponse> {
    if (!this.isInitialized) {
      throw new Error('EdgeCaseOrchestrator not initialized');
    }

    const startTime = Date.now();
    let response: EdgeCaseResponse;

    try {
      switch (edgeCaseType) {
        case 'network_failure':
          response = await this.handleNetworkFailure(context, additionalData);
          break;

        case 'user_input_conflict':
          response = await this.handleUserInputConflict(context, additionalData);
          break;

        case 'system_failure':
          response = await this.handleSystemFailure(context, additionalData);
          break;

        case 'conversation_interruption':
          response = await this.handleConversationInterruption(context, additionalData);
          break;

        case 'data_corruption':
          response = await this.handleDataCorruption(context, additionalData);
          break;

        case 'resource_constraint':
          response = await this.handleResourceConstraint(context, additionalData);
          break;

        case 'multi_user_conflict':
          response = await this.handleMultiUserConflict(context, additionalData);
          break;

        case 'attention_loss':
          response = await this.handleAttentionLoss(context, additionalData);
          break;

        default:
          response = await this.handleGenericEdgeCase(context, additionalData);
      }

      // Update success metrics
      this.updateSuccessMetrics(true, Date.now() - startTime);
      
      this.emit('edgeCaseHandled', {
        type: edgeCaseType,
        success: true,
        response,
        duration: Date.now() - startTime
      });

      return response;

    } catch (error) {
      // Update failure metrics
      this.updateSuccessMetrics(false, Date.now() - startTime);
      
      this.emit('edgeCaseHandled', {
        type: edgeCaseType,
        success: false,
        error,
        duration: Date.now() - startTime
      });

      // Return fallback response
      return this.createFallbackResponse(edgeCaseType, context, error);
    }
  }

  /**
   * Handle network failure edge cases
   */
  private async handleNetworkFailure(
    context: ConversationContext,
    data: any
  ): Promise<EdgeCaseResponse> {
    const networkStatus = this.networkManager.getNetworkStatus();
    
    if (!networkStatus.isOnline) {
      // Handle offline scenario
      const offlineCapability = await this.networkManager.createOfflineCapability(context.userId);
      
      if (offlineCapability.canGenerateStories) {
        const offlineStory = await this.networkManager.generateOfflineStory(
          context,
          data.storyType || 'adventure'
        );
        
        return {
          success: true,
          type: 'network_failure',
          action: 'offline_generation',
          message: "I'm working offline right now, but I can still create a wonderful story with you!",
          data: { story: offlineStory, isOffline: true },
          fallbackUsed: 'offline_mode'
        };
      } else {
        return {
          success: true,
          type: 'network_failure',
          action: 'limited_offline',
          message: "I'm having connection issues, but we can still chat about your story ideas!",
          data: { limitedCapabilities: true },
          fallbackUsed: 'conversation_only'
        };
      }
    } else {
      // Handle poor network quality
      this.networkManager.adaptToNetworkQuality(networkStatus.quality);
      
      return {
        success: true,
        type: 'network_failure',
        action: 'quality_adaptation',
        message: "I'm adjusting to your connection speed to make sure we have the best experience!",
        data: { networkQuality: networkStatus.quality },
        fallbackUsed: 'quality_adaptation'
      };
    }
  }

  /**
   * Handle user input conflicts
   */
  private async handleUserInputConflict(
    context: ConversationContext,
    data: { input: UserInput; conflictType: string }
  ): Promise<EdgeCaseResponse> {
    switch (data.conflictType) {
      case 'contradictory_input':
        const resolution = await this.userInputHandler.resolveContradictoryInput(
          context.userId,
          data.input,
          context
        );
        
        return {
          success: true,
          type: 'user_input_conflict',
          action: 'contradiction_resolved',
          message: (resolution as any).strategy === 'clarify' 
            ? ((resolution as any).resolution?.text || (resolution as any).text || "Could you clarify what you meant?")
            : "I've figured out what you meant! Let's continue.",
          data: { resolution },
          fallbackUsed: (resolution as any).strategy || 'auto_resolve'
        };

      case 'ambiguous_input':
        const clarification = await this.userInputHandler.clarifyAmbiguousInput(
          data.input.text,
          context
        );
        
        return {
          success: true,
          type: 'user_input_conflict',
          action: 'ambiguity_clarified',
          message: clarification.clarification || "Could you tell me a bit more about that?",
          data: { options: clarification.options },
          fallbackUsed: 'clarification_request'
        };

      case 'inappropriate_content':
        const redirect = await this.userInputHandler.redirectInappropriateContent(
          data.input.text,
          context
        );
        
        return {
          success: true,
          type: 'user_input_conflict',
          action: 'content_redirected',
          message: redirect.redirect,
          data: { alternativeContent: redirect.alternativeContent },
          fallbackUsed: 'content_redirection'
        };

      default:
        return this.createFallbackResponse('user_input_conflict', context, 'Unknown conflict type');
    }
  }

  /**
   * Handle system failures
   */
  private async handleSystemFailure(
    context: ConversationContext,
    data: { serviceName: string; error: any }
  ): Promise<EdgeCaseResponse> {
    const recoveryResult = await this.systemFailureEngine.handleServiceFailure(
      data.serviceName,
      data.error,
      context
    );

    return {
      success: recoveryResult.success,
      type: 'system_failure',
      action: 'service_recovery',
      message: recoveryResult.userMessage,
      data: {
        fallbackUsed: recoveryResult.fallbackUsed,
        degradedCapabilities: recoveryResult.degradedCapabilities
      },
      fallbackUsed: recoveryResult.fallbackUsed || 'unknown'
    };
  }

  /**
   * Handle conversation interruptions
   */
  private async handleConversationInterruption(
    context: ConversationContext,
    data: { interruptionSignal: any }
  ): Promise<EdgeCaseResponse> {
    const interruption = await this.conversationFlowHandler.detectInterruption(
      context.userId,
      context,
      data.interruptionSignal
    );

    if (interruption.severity === 'critical') {
      // Handle critical interruptions immediately
      return {
        success: true,
        type: 'conversation_interruption',
        action: 'critical_interruption',
        message: "I understand you need to step away. I'll save everything and wait for you!",
        data: { interruption, requiresRestart: true },
        fallbackUsed: 'save_and_pause'
      };
    } else {
      // Handle minor interruptions gracefully
      return {
        success: true,
        type: 'conversation_interruption',
        action: 'graceful_pause',
        message: "No problem! I'll be right here when you're ready to continue.",
        data: { interruption, canResume: true },
        fallbackUsed: 'graceful_pause'
      };
    }
  }

  /**
   * Handle data corruption
   */
  private async handleDataCorruption(
    context: ConversationContext,
    data: { corruptedData: any }
  ): Promise<EdgeCaseResponse> {
    const recoveryResult = await this.systemFailureEngine.recoverFromDataCorruption(
      data.corruptedData,
      context
    );

    return {
      success: recoveryResult.success,
      type: 'data_corruption',
      action: 'data_recovery',
      message: recoveryResult.userMessage,
      data: {
        recoveryMethod: recoveryResult.fallbackUsed,
        dataIntegrity: recoveryResult.success ? 'restored' : 'partial'
      },
      fallbackUsed: recoveryResult.fallbackUsed || 'unknown'
    };
  }

  /**
   * Handle resource constraints
   */
  private async handleResourceConstraint(
    context: ConversationContext,
    data: { constraints: any[] }
  ): Promise<EdgeCaseResponse> {
    const managementResult = await this.systemFailureEngine.manageResourceConstraints(
      data.constraints,
      context
    );

    return {
      success: true,
      type: 'resource_constraint',
      action: 'resource_optimization',
      message: "I'm optimizing my resources to give you the best experience possible!",
      data: {
        prioritizedOperations: managementResult.prioritizedOperations,
        deferredOperations: managementResult.deferredOperations
      },
      fallbackUsed: 'resource_optimization'
    };
  }

  /**
   * Handle multi-user conflicts
   */
  private async handleMultiUserConflict(
    context: ConversationContext,
    data: { users: string[]; inputs: UserInput[] }
  ): Promise<EdgeCaseResponse> {
    const conflict = await this.userInputHandler.resolveMultiUserConflict(
      data.users,
      data.inputs,
      context
    );

    return {
      success: true,
      type: 'multi_user_conflict',
      action: 'conflict_resolution',
      message: this.generateMultiUserMessage(conflict.resolution, data.users.length),
      data: { conflict },
      fallbackUsed: conflict.resolution
    };
  }

  /**
   * Handle attention loss
   */
  private async handleAttentionLoss(
    context: ConversationContext,
    data: { behaviorSignals: any[] }
  ): Promise<EdgeCaseResponse> {
    const attentionLoss = await this.conversationFlowHandler.detectAttentionLoss(
      context.userId,
      context,
      data.behaviorSignals
    );

    if (!attentionLoss) {
      return {
        success: true,
        type: 'attention_loss',
        action: 'no_attention_loss',
        message: "Great! You seem engaged. Let's keep going!",
        data: { attentionLevel: 'normal' },
        fallbackUsed: 'none'
      };
    }

    const recoveryMessage = this.generateAttentionRecoveryMessage(
      attentionLoss.recoveryStrategy,
      context
    );

    return {
      success: true,
      type: 'attention_loss',
      action: 'attention_recovery',
      message: recoveryMessage,
      data: { attentionLoss },
      fallbackUsed: attentionLoss.recoveryStrategy
    };
  }

  /**
   * Handle generic edge cases
   */
  private async handleGenericEdgeCase(
    context: ConversationContext,
    data: any
  ): Promise<EdgeCaseResponse> {
    return {
      success: true,
      type: 'generic',
      action: 'generic_handling',
      message: "I encountered something unexpected, but don't worry - we can keep creating together!",
      data: { originalData: data },
      fallbackUsed: 'generic_fallback'
    };
  }

  /**
   * Create fallback response for failed edge case handling
   */
  private createFallbackResponse(
    edgeCaseType: EdgeCaseType,
    context: ConversationContext,
    error: any
  ): EdgeCaseResponse {
    const age = context.user?.age || 6;
    
    let message: string;
    if (age < 6) {
      message = "Something silly happened, but it's okay! Let's keep playing!";
    } else if (age < 9) {
      message = "I had a little hiccup, but I'm ready to continue our story!";
    } else {
      message = "I encountered a small technical issue, but we can keep creating together!";
    }

    return {
      success: false,
      type: edgeCaseType,
      action: 'fallback',
      message,
      data: { error: error.message || 'Unknown error' },
      fallbackUsed: 'emergency_fallback'
    };
  }

  /**
   * Update success metrics
   */
  private updateSuccessMetrics(success: boolean, duration: number): void {
    if (success) {
      this.metrics.totalRecoveries++;
    }
    
    // Calculate success rate (simple moving average)
    const totalAttempts = this.metrics.networkIssues + 
                         this.metrics.userInputConflicts + 
                         this.metrics.systemFailures + 
                         this.metrics.conversationInterruptions;
    
    if (totalAttempts > 0) {
      this.metrics.successRate = this.metrics.totalRecoveries / totalAttempts;
    }
  }

  /**
   * Generate multi-user conflict resolution message
   */
  private generateMultiUserMessage(resolution: string, userCount: number): string {
    switch (resolution) {
      case 'queue':
        return `I heard everyone! Let's take turns - I'll work with each of you one at a time.`;
      
      case 'merge':
        return `What great ideas from everyone! Let me combine all your thoughts into our story.`;
      
      case 'prioritize':
        return `I'll help the first person finish their thought, then we'll hear from everyone else.`;
      
      case 'separate_sessions':
        return `There are so many creative minds here! Let me create separate stories for each of you.`;
      
      default:
        return `I love hearing from all ${userCount} of you! Let's figure out how to include everyone's ideas.`;
    }
  }

  /**
   * Generate attention recovery message
   */
  private generateAttentionRecoveryMessage(
    strategy: string,
    context: ConversationContext
  ): string {
    const characterName = context.character?.name || 'our hero';
    
    switch (strategy) {
      case 'engagement_boost':
        return `Wow! Something amazing just happened to ${characterName}! What do you think it could be?`;
      
      case 'topic_change':
        return `You know what? Let's try something completely different in our story!`;
      
      case 'break_suggestion':
        return `You've been such a wonderful storyteller! Would you like to take a little break?`;
      
      case 'interactive_element':
        return `Quick decision time! ${characterName} needs your help right now - what should they do?`;
      
      default:
        return `What would you like to happen next in our story?`;
    }
  }

  /**
   * Resume conversation after interruption
   */
  async resumeConversation(
    userId: string,
    context: ConversationContext
  ): Promise<{ resumptionPrompt: string; contextRestored: boolean }> {
    return await this.conversationFlowHandler.resumeConversation(userId, context);
  }

  /**
   * Check if user has abandoned session
   */
  hasAbandonedSession(userId: string): boolean {
    return this.conversationFlowHandler.getAbandonedSession(userId) !== undefined;
  }

  /**
   * Get resumption prompt for abandoned session
   */
  getResumptionPrompt(userId: string): string | null {
    const abandoned = this.conversationFlowHandler.getAbandonedSession(userId);
    return abandoned ? abandoned.resumptionPrompt : null;
  }

  /**
   * Get current system health
   */
  getSystemHealth(): any {
    return {
      network: this.networkManager.getNetworkStatus(),
      systemHealth: this.systemFailureEngine.getSystemHealth(),
      activeFailures: this.systemFailureEngine.getActiveFailures(),
      degradationLevel: this.systemFailureEngine.getDegradationLevel()
    };
  }

  /**
   * Get edge case metrics
   */
  getMetrics(): EdgeCaseMetrics {
    return { ...this.metrics };
  }

  /**
   * Get user-specific edge case history
   */
  getUserEdgeCaseHistory(userId: string): any {
    return {
      contradictions: this.userInputHandler.getContradictionHistory(userId),
      distressPatterns: this.userInputHandler.getDistressPatterns(userId),
      tangentHistory: this.conversationFlowHandler.getTangentHistory(userId),
      attentionPatterns: this.conversationFlowHandler.getAttentionPatterns(userId),
      interruptions: this.conversationFlowHandler.getInterruptionHistory(userId),
      abandonedSession: this.conversationFlowHandler.getAbandonedSession(userId)
    };
  }

  /**
   * Clear user data for privacy compliance
   */
  clearUserData(userId: string): void {
    this.userInputHandler.clearUserHistory(userId);
    this.conversationFlowHandler.clearUserData(userId);
    this.emit('userDataCleared', { userId });
  }

  /**
   * Get system statistics
   */
  getSystemStats(): any {
    return {
      metrics: this.metrics,
      networkStats: this.networkManager.getNetworkStatus(),
      systemHealth: this.systemFailureEngine.getSystemHealth(),
      conversationStats: this.conversationFlowHandler.getSystemStats()
    };
  }

  /**
   * Perform health check on all systems
   */
  async performHealthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'critical';
    components: Record<string, string>;
    recommendations: string[];
  }> {
    const networkStatus = this.networkManager.getNetworkStatus();
    const systemHealth = this.systemFailureEngine.getSystemHealth();
    const activeFailures = this.systemFailureEngine.getActiveFailures();
    
    const components = {
      network: networkStatus.isOnline ? 'healthy' : 'critical',
      systemServices: activeFailures.length === 0 ? 'healthy' : 'degraded',
      edgeHandling: this.metrics.successRate > 0.8 ? 'healthy' : 'degraded'
    };
    
    const criticalCount = Object.values(components).filter(status => status === 'critical').length;
    const degradedCount = Object.values(components).filter(status => status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'critical';
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }
    
    const recommendations = this.generateHealthRecommendations(components, activeFailures);
    
    return { overall, components, recommendations };
  }

  /**
   * Generate health recommendations
   */
  private generateHealthRecommendations(
    components: Record<string, string>,
    activeFailures: any[]
  ): string[] {
    const recommendations = [];
    
    if (components.network === 'critical') {
      recommendations.push('Check network connectivity and consider offline mode');
    }
    
    if (components.systemServices === 'degraded') {
      recommendations.push('Review system service health and restart failed services');
    }
    
    if (this.metrics.successRate < 0.8) {
      recommendations.push('Review edge case handling patterns and improve fallback mechanisms');
    }
    
    if (activeFailures.length > 3) {
      recommendations.push('Multiple system failures detected - consider maintenance mode');
    }
    
    return recommendations;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.networkManager) {
      this.networkManager.destroy();
    }
    
    if (this.systemFailureEngine) {
      this.systemFailureEngine.destroy();
    }
    
    if (this.conversationFlowHandler) {
      this.conversationFlowHandler.destroy();
    }
    
    this.removeAllListeners();
    this.isInitialized = false;
  }
}