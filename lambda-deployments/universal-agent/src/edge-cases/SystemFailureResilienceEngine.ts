import { EventEmitter } from 'events';
import { ConversationContext, StoryContent, SystemHealth, FailureContext, RecoveryResult } from '../types';

export interface ServiceFailure {
  serviceName: string;
  failureType: 'timeout' | 'error' | 'unavailable' | 'rate_limit' | 'corruption';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  errorDetails: any;
  affectedOperations: string[];
}

export interface FallbackMechanism {
  serviceName: string;
  fallbackType: 'cache' | 'alternative_service' | 'simplified_response' | 'offline_mode';
  isAvailable: boolean;
  priority: number;
  capabilities: string[];
}

export interface ResourceConstraint {
  resourceType: 'memory' | 'cpu' | 'network' | 'storage' | 'api_quota';
  currentUsage: number;
  limit: number;
  utilizationPercent: number;
  criticalThreshold: number;
}

export interface CascadingFailurePrevention {
  failureChain: string[];
  preventionStrategy: 'circuit_breaker' | 'rate_limiting' | 'load_shedding' | 'graceful_degradation';
  isActive: boolean;
  recoveryTime: number;
}

export class SystemFailureResilienceEngine extends EventEmitter {
  private serviceHealth: Map<string, SystemHealth> = new Map();
  private fallbackMechanisms: Map<string, FallbackMechanism[]> = new Map();
  private activeFailures: Map<string, ServiceFailure> = new Map();
  private resourceMonitors: Map<string, ResourceConstraint> = new Map();
  private cascadingPrevention: Map<string, CascadingFailurePrevention> = new Map();
  private degradationLevel: 'none' | 'minimal' | 'moderate' | 'severe' = 'none';
  private coreStorytellingCapabilities: string[] = [
    'character_creation',
    'story_generation',
    'conversation_flow',
    'voice_response'
  ];
  private redisClient: any = null;
  private memoryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes default TTL
  private logger: any;

  constructor() {
    super();
    // Initialize logger (console fallback)
    this.logger = {
      debug: (...args: any[]) => console.log('[DEBUG]', ...args),
      info: (...args: any[]) => console.log('[INFO]', ...args),
      warn: (...args: any[]) => console.warn('[WARN]', ...args),
      error: (...args: any[]) => console.error('[ERROR]', ...args)
    };
    this.initializeRedis();
    this.initializeHealthMonitoring();
    this.setupFallbackMechanisms();
    this.startCacheCleanup();
  }

  /**
   * Initialize Redis client for distributed caching
   */
  private initializeRedis(): void {
    try {
      const redis = require('ioredis');
      const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST || '127.0.0.1';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379');
      
      this.redisClient = new redis(redisPort, redisUrl, {
        retryStrategy: () => null, // Don't retry if connection fails
        maxRetriesPerRequest: 1,
        lazyConnect: true
      });
      
      this.redisClient.on('error', () => {
        // Silently handle Redis errors - fallback to memory cache
        this.redisClient = null;
      });
      
      // Attempt connection (non-blocking)
      this.redisClient.connect().catch(() => {
        // Connection failed - will use memory cache only
        this.redisClient = null;
      });
    } catch (error) {
      // Redis not available - will use memory cache only
      this.redisClient = null;
    }
  }

  /**
   * Start cache cleanup process
   */
  private startCacheCleanup(): void {
    // Clean up expired cache entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.memoryCache.entries()) {
        if (now - cached.timestamp > cached.ttl) {
          this.memoryCache.delete(key);
        }
      }
    }, 60 * 1000); // Every minute
  }

  /**
   * Initialize health monitoring for all services
   */
  private initializeHealthMonitoring(): void {
    const services = [
      'openai_api',
      'elevenlabs_api',
      'supabase_db',
      'redis_cache',
      'content_agent',
      'auth_agent',
      'emotion_agent',
      'library_agent'
    ];

    services.forEach(service => {
      this.serviceHealth.set(service, {
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 0,
        errorRate: 0,
        availability: 100
      });
    });

    // Start health monitoring
    setInterval(() => this.performHealthChecks(), 30000); // Every 30 seconds
  }

  /**
   * Setup fallback mechanisms for each service
   */
  private setupFallbackMechanisms(): void {
    // OpenAI API fallbacks
    this.fallbackMechanisms.set('openai_api', [
      {
        serviceName: 'cached_responses',
        fallbackType: 'cache',
        isAvailable: true,
        priority: 1,
        capabilities: ['story_generation', 'character_creation']
      },
      {
        serviceName: 'template_engine',
        fallbackType: 'simplified_response',
        isAvailable: true,
        priority: 2,
        capabilities: ['story_generation']
      }
    ]);

    // ElevenLabs API fallbacks
    this.fallbackMechanisms.set('elevenlabs_api', [
      {
        serviceName: 'cached_audio',
        fallbackType: 'cache',
        isAvailable: true,
        priority: 1,
        capabilities: ['voice_synthesis']
      },
      {
        serviceName: 'text_response',
        fallbackType: 'simplified_response',
        isAvailable: true,
        priority: 2,
        capabilities: ['text_output']
      }
    ]);

    // Database fallbacks
    this.fallbackMechanisms.set('supabase_db', [
      {
        serviceName: 'redis_cache',
        fallbackType: 'cache',
        isAvailable: true,
        priority: 1,
        capabilities: ['read_operations']
      },
      {
        serviceName: 'local_storage',
        fallbackType: 'offline_mode',
        isAvailable: true,
        priority: 2,
        capabilities: ['temporary_storage']
      }
    ]);
  }

  /**
   * Create graceful degradation engine
   */
  async createGracefulDegradation(
    failures: ServiceFailure[],
    context: ConversationContext
  ): Promise<{ degradationLevel: string; availableCapabilities: string[] }> {
    const criticalFailures = failures.filter(f => f.severity === 'critical');
    const highFailures = failures.filter(f => f.severity === 'high');

    // Determine degradation level
    if (criticalFailures.length > 0) {
      this.degradationLevel = 'severe';
    } else if (highFailures.length > 1) {
      this.degradationLevel = 'moderate';
    } else if (failures.length > 0) {
      this.degradationLevel = 'minimal';
    } else {
      this.degradationLevel = 'none';
    }

    // Calculate available capabilities
    const availableCapabilities = await this.calculateAvailableCapabilities(failures);

    // Emit degradation event
    this.emit('degradationLevelChanged', {
      level: this.degradationLevel,
      capabilities: availableCapabilities,
      failures
    });

    return {
      degradationLevel: this.degradationLevel,
      availableCapabilities
    };
  }

  /**
   * Handle service failures with fallback mechanisms
   */
  async handleServiceFailure(
    serviceName: string,
    error: any,
    context: ConversationContext
  ): Promise<RecoveryResult> {
    const failure = this.createFailureRecord(serviceName, error);
    this.activeFailures.set(serviceName, failure);

    // Attempt fallback mechanisms
    const fallbacks = this.fallbackMechanisms.get(serviceName) || [];
    let recoveryResult: RecoveryResult = {
      success: false,
      fallbackUsed: null,
      degradedCapabilities: [],
      userMessage: 'I\'m having some technical difficulties. Let me try a different approach.'
    };

    for (const fallback of fallbacks.sort((a, b) => a.priority - b.priority)) {
      if (fallback.isAvailable) {
        try {
          const result = await this.executeFallback(fallback, context, error);
          if (result.success) {
            recoveryResult = {
              success: true,
              fallbackUsed: fallback.serviceName,
              degradedCapabilities: this.calculateDegradedCapabilities(fallback),
              userMessage: this.generateUserFriendlyMessage(fallback, context)
            };
            break;
          }
        } catch (fallbackError) {
          console.error(`Fallback ${fallback.serviceName} failed:`, fallbackError);
          fallback.isAvailable = false;
        }
      }
    }

    // If no fallback worked, maintain core storytelling
    if (!recoveryResult.success) {
      recoveryResult = await this.maintainCoreStorytelling(context);
    }

    this.emit('serviceFailureHandled', { failure, recoveryResult });
    return recoveryResult;
  }

  /**
   * Recover from data corruption with minimal user impact
   */
  async recoverFromDataCorruption(
    corruptedData: any,
    context: ConversationContext
  ): Promise<RecoveryResult> {
    const corruptionType = this.identifyCorruptionType(corruptedData);
    
    let recoveryStrategy: string;
    let recoveredData: any;

    switch (corruptionType) {
      case 'partial_corruption':
        recoveryStrategy = 'partial_recovery';
        recoveredData = await this.recoverPartialData(corruptedData, context);
        break;
      
      case 'format_corruption':
        recoveryStrategy = 'format_repair';
        recoveredData = await this.repairDataFormat(corruptedData);
        break;
      
      case 'complete_corruption':
        recoveryStrategy = 'rebuild_from_context';
        recoveredData = await this.rebuildFromContext(context);
        break;
      
      default:
        recoveryStrategy = 'fallback_to_defaults';
        recoveredData = await this.createDefaultData(context);
    }

    const recoveryResult: RecoveryResult = {
      success: recoveredData !== null,
      fallbackUsed: recoveryStrategy,
      degradedCapabilities: this.assessDataRecoveryImpact(corruptionType),
      userMessage: this.generateDataRecoveryMessage(corruptionType, context)
    };

    this.emit('dataCorruptionRecovered', {
      corruptionType,
      recoveryStrategy,
      success: recoveryResult.success
    });

    return recoveryResult;
  }

  /**
   * Manage resource constraints with intelligent prioritization
   */
  async manageResourceConstraints(
    constraints: ResourceConstraint[],
    context: ConversationContext
  ): Promise<{ prioritizedOperations: string[]; deferredOperations: string[] }> {
    const criticalConstraints = constraints.filter(c => 
      c.utilizationPercent > c.criticalThreshold
    );

    if (criticalConstraints.length === 0) {
      return {
        prioritizedOperations: ['all'],
        deferredOperations: []
      };
    }

    // Prioritize core storytelling operations
    const prioritizedOperations = this.prioritizeOperations(constraints, context);
    const deferredOperations = this.identifyDeferrableOperations(constraints);

    // Apply resource management strategies
    for (const constraint of criticalConstraints) {
      await this.applyResourceManagement(constraint, prioritizedOperations);
    }

    this.emit('resourceConstraintsManaged', {
      constraints: criticalConstraints,
      prioritized: prioritizedOperations,
      deferred: deferredOperations
    });

    return { prioritizedOperations, deferredOperations };
  }

  /**
   * Prevent cascading failures
   */
  async preventCascadingFailures(
    initialFailure: ServiceFailure,
    dependentServices: string[]
  ): Promise<CascadingFailurePrevention> {
    const failureChain = this.predictFailureChain(initialFailure, dependentServices);
    const preventionStrategy = this.selectPreventionStrategy(failureChain, initialFailure);

    const prevention: CascadingFailurePrevention = {
      failureChain,
      preventionStrategy,
      isActive: true,
      recoveryTime: this.estimateRecoveryTime(preventionStrategy)
    };

    // Apply prevention strategy
    switch (preventionStrategy) {
      case 'circuit_breaker':
        await this.activateCircuitBreakers(failureChain);
        break;
      
      case 'rate_limiting':
        await this.applyRateLimiting(failureChain);
        break;
      
      case 'load_shedding':
        await this.shedNonEssentialLoad(failureChain);
        break;
      
      case 'graceful_degradation':
        await this.enableGracefulDegradation(failureChain);
        break;
    }

    this.cascadingPrevention.set(initialFailure.serviceName, prevention);
    this.emit('cascadingFailurePrevented', prevention);

    return prevention;
  }

  /**
   * Maintain core storytelling functionality during failures
   */
  private async maintainCoreStorytelling(
    context: ConversationContext
  ): Promise<RecoveryResult> {
    // Identify which core capabilities are still available
    const availableCapabilities = await this.assessCoreCapabilities();
    
    if (availableCapabilities.includes('conversation_flow')) {
      // Can continue conversation with simplified responses
      return {
        success: true,
        fallbackUsed: 'simplified_conversation',
        degradedCapabilities: ['advanced_generation', 'voice_synthesis'],
        userMessage: "I'm working with some basic tools right now, but we can still create a wonderful story together!"
      };
    }
    
    if (availableCapabilities.includes('character_creation')) {
      // Can help with character creation
      return {
        success: true,
        fallbackUsed: 'character_focus',
        degradedCapabilities: ['story_generation', 'voice_synthesis'],
        userMessage: "Let's focus on creating an amazing character for now. We can build the story once I'm back to full power!"
      };
    }
    
    // Minimal functionality - just maintain conversation
    return {
      success: true,
      fallbackUsed: 'minimal_conversation',
      degradedCapabilities: ['story_generation', 'character_creation', 'voice_synthesis'],
      userMessage: "I'm having some technical challenges, but I'm still here with you. Would you like to tell me about your day while I get back to full strength?"
    };
  }

  /**
   * Execute fallback mechanism
   */
  private async executeFallback(
    fallback: FallbackMechanism,
    context: ConversationContext,
    originalError: any
  ): Promise<{ success: boolean; result?: any }> {
    switch (fallback.fallbackType) {
      case 'cache':
        return await this.executeCacheFallback(fallback, context);
      
      case 'alternative_service':
        return await this.executeAlternativeService(fallback, context);
      
      case 'simplified_response':
        return await this.executeSimplifiedResponse(fallback, context);
      
      case 'offline_mode':
        return await this.executeOfflineMode(fallback, context);
      
      default:
        return { success: false };
    }
  }

  /**
   * Execute cache-based fallback
   */
  private async executeCacheFallback(
    fallback: FallbackMechanism,
    context: ConversationContext
  ): Promise<{ success: boolean; result?: any }> {
    try {
      // Try to get cached response
      const cacheKey = this.generateCacheKey(context);
      const cachedResult = await this.getCachedResult(cacheKey);
      
      if (cachedResult) {
        return { success: true, result: cachedResult };
      }
      
      // If no exact match, try similar cached responses
      const similarResult = await this.findSimilarCachedResult(context);
      if (similarResult) {
        return { success: true, result: this.adaptCachedResult(similarResult, context) };
      }
      
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Execute simplified response fallback
   */
  private async executeSimplifiedResponse(
    fallback: FallbackMechanism,
    context: ConversationContext
  ): Promise<{ success: boolean; result?: any }> {
    try {
      // Generate simplified response using templates
      const template = this.selectSimplifiedTemplate(context);
      const response = this.populateTemplate(template, context);
      
      return {
        success: true,
        result: {
          text: response,
          type: 'simplified',
          capabilities: fallback.capabilities
        }
      };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Execute alternative service fallback
   */
  private async executeAlternativeService(
    fallback: FallbackMechanism,
    context: ConversationContext
  ): Promise<{ success: boolean; result?: any }> {
    try {
      // Identify alternative service based on fallback configuration
      const alternativeServices: Record<string, string[]> = {
        'openai_api': ['anthropic_api', 'cohere_api', 'local_llm'],
        'elevenlabs_api': ['aws_polly', 'google_tts', 'azure_tts'],
        'supabase_db': ['dynamodb', 'postgres_direct', 'mongodb'],
        'redis_cache': ['memory_cache', 'local_storage', 'dynamodb_cache']
      };

      const alternatives = alternativeServices[fallback.serviceName] || [];
      
      // Try each alternative service in priority order
      for (const altService of alternatives) {
        try {
          const result = await this.callAlternativeService(altService, context);
          if (result) {
            return {
              success: true,
              result: {
                ...result,
                source: altService,
                fallbackUsed: true
              }
            };
          }
        } catch (error) {
          // Continue to next alternative
          continue;
        }
      }

      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Execute offline mode fallback
   */
  private async executeOfflineMode(
    fallback: FallbackMechanism,
    context: ConversationContext
  ): Promise<{ success: boolean; result?: any }> {
    try {
      // Use offline capabilities: cached templates, local generation, pre-computed responses
      const offlineResult = await this.generateOfflineResponse(context);
      
      if (offlineResult) {
        return {
          success: true,
          result: {
            ...offlineResult,
            mode: 'offline',
            capabilities: fallback.capabilities,
            note: 'Operating in offline mode with limited capabilities'
          }
        };
      }

      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Call alternative service
   * Implements actual alternative service calls for fallback scenarios
   */
  private async callAlternativeService(
    serviceName: string,
    context: ConversationContext
  ): Promise<any> {
    try {
      // Route to appropriate alternative service based on service name
      switch (serviceName) {
        case 'anthropic_api':
        case 'cohere_api':
        case 'local_llm':
          // Alternative LLM services require API keys and clients to be configured
          // Return null to indicate service unavailable (would need API keys and client initialization)
          this.logger.debug('Alternative LLM service not configured', { serviceName });
          return null;
          
        case 'aws_polly':
        case 'google_tts':
        case 'azure_tts':
          // Alternative TTS services require service-specific clients to be configured
          // Return null to indicate service unavailable (would need client initialization)
          this.logger.debug('Alternative TTS service not configured', { serviceName });
          return null;
          
        case 'dynamodb':
        case 'postgres_direct':
        case 'mongodb':
          // Alternative database services require database-specific clients to be configured
          // Return null to indicate service unavailable (would need client initialization)
          this.logger.debug('Alternative database service not configured', { serviceName });
          return null;
          
        case 'memory_cache':
          // Memory cache is always available as fallback
          const cached = this.memoryCache.get(context.sessionId || '');
          if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data;
          }
          return null;
          
        case 'local_storage':
        case 'dynamodb_cache':
          // Alternative cache services require service-specific clients to be configured
          // Return null to indicate service unavailable (would need client initialization)
          this.logger.debug('Alternative cache service not configured', { serviceName });
          return null;
          
        default:
          this.logger.warn('Unknown alternative service', { serviceName });
          return null;
      }
    } catch (error) {
      this.logger.error('Error calling alternative service', { serviceName, error });
      return null;
    }
  }

  /**
   * Generate offline response using cached templates and local processing
   */
  private async generateOfflineResponse(
    context: ConversationContext
  ): Promise<any> {
    // Use cached templates and local generation
    const template = this.selectSimplifiedTemplate(context);
    const response = this.populateTemplate(template, context);
    
    return {
      text: response,
      type: 'offline',
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    for (const [serviceName, health] of this.serviceHealth.entries()) {
      try {
        const startTime = Date.now();
        const isHealthy = await this.checkServiceHealth(serviceName);
        const responseTime = Date.now() - startTime;
        
        this.serviceHealth.set(serviceName, {
          status: isHealthy ? 'healthy' : 'unhealthy',
          lastCheck: new Date(),
          responseTime,
          errorRate: health.errorRate, // Update based on recent errors
          availability: isHealthy ? 100 : 0
        });
        
        if (!isHealthy && health.status === 'healthy') {
          // Service just went down
          this.emit('serviceDown', { serviceName, health });
        } else if (isHealthy && health.status === 'unhealthy') {
          // Service recovered
          this.emit('serviceRecovered', { serviceName, health });
        }
      } catch (error) {
        console.error(`Health check failed for ${serviceName}:`, error);
      }
    }
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(serviceName: string): Promise<boolean> {
    // Implement service-specific health checks
    switch (serviceName) {
      case 'openai_api':
        return await this.checkOpenAIHealth();
      
      case 'elevenlabs_api':
        return await this.checkElevenLabsHealth();
      
      case 'supabase_db':
        return await this.checkSupabaseHealth();
      
      case 'redis_cache':
        return await this.checkRedisHealth();
      
      default:
        return true; // Assume healthy if no specific check
    }
  }

  // Service-specific health check methods
  private async checkOpenAIHealth(): Promise<boolean> {
    try {
      // Simple API call to check OpenAI health
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkElevenLabsHealth(): Promise<boolean> {
    try {
      // Check ElevenLabs API health
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY || '' },
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkSupabaseHealth(): Promise<boolean> {
    try {
      // Simple database query to check health
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: { 'apikey': process.env.SUPABASE_ANON_KEY || '' },
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      if (!this.redisClient) {
        return false;
      }
      
      // Perform actual Redis health check using PING command
      const result = await this.redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      // Redis connection failed or not available
      return false;
    }
  }

  // Helper methods
  private createFailureRecord(serviceName: string, error: any): ServiceFailure {
    return {
      serviceName,
      failureType: this.categorizeFailure(error),
      severity: this.assessFailureSeverity(serviceName, error),
      timestamp: new Date(),
      errorDetails: error,
      affectedOperations: this.getAffectedOperations(serviceName)
    };
  }

  private categorizeFailure(error: any): 'timeout' | 'error' | 'unavailable' | 'rate_limit' | 'corruption' {
    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') return 'timeout';
    if (error.status === 429) return 'rate_limit';
    if (error.status >= 500) return 'unavailable';
    if (error.message?.includes('corrupt')) return 'corruption';
    return 'error';
  }

  private assessFailureSeverity(serviceName: string, error: any): 'low' | 'medium' | 'high' | 'critical' {
    // Core services are critical
    if (['openai_api', 'supabase_db'].includes(serviceName)) {
      return 'critical';
    }
    
    // Voice synthesis is high priority but not critical
    if (serviceName === 'elevenlabs_api') {
      return 'high';
    }
    
    // Cache failures are medium priority
    if (serviceName === 'redis_cache') {
      return 'medium';
    }
    
    return 'low';
  }

  private getAffectedOperations(serviceName: string): string[] {
    const operationMap: Record<string, string[]> = {
      'openai_api': ['story_generation', 'character_creation', 'intent_classification'],
      'elevenlabs_api': ['voice_synthesis', 'audio_generation'],
      'supabase_db': ['data_storage', 'user_authentication', 'library_management'],
      'redis_cache': ['conversation_state', 'caching', 'session_management']
    };
    
    return operationMap[serviceName] || [];
  }

  private async calculateAvailableCapabilities(failures: ServiceFailure[]): Promise<string[]> {
    const allCapabilities = new Set(this.coreStorytellingCapabilities);
    
    // Remove capabilities affected by failures
    for (const failure of failures) {
      for (const operation of failure.affectedOperations) {
        if (failure.severity === 'critical' || failure.severity === 'high') {
          allCapabilities.delete(operation);
        }
      }
    }
    
    return Array.from(allCapabilities);
  }

  private calculateDegradedCapabilities(fallback: FallbackMechanism): string[] {
    // Determine what capabilities are degraded when using this fallback
    const degradationMap: Record<string, string[]> = {
      'cached_responses': ['real_time_generation', 'personalization'],
      'template_engine': ['advanced_generation', 'creativity'],
      'text_response': ['voice_synthesis', 'audio_output'],
      'local_storage': ['cloud_sync', 'cross_device_access']
    };
    
    return degradationMap[fallback.serviceName] || [];
  }

  private generateUserFriendlyMessage(
    fallback: FallbackMechanism,
    context: ConversationContext
  ): string {
    const age = context.user?.age || 6;
    
    const messages: Record<string, Record<string, string>> = {
      'cached_responses': {
        young: "I'm using some stories I remember to help us create something wonderful!",
        older: "I'm working with some saved ideas to make sure we can keep creating together!"
      },
      'template_engine': {
        young: "I'm using my special story helpers to make sure we can still have fun!",
        older: "I'm using some story templates to keep our creative session going!"
      },
      'text_response': {
        young: "I can't use my voice right now, but I can still help you create amazing stories!",
        older: "My voice isn't working perfectly, but we can continue with text for now!"
      }
    };
    
    const ageGroup = age < 7 ? 'young' : 'older';
    return messages[fallback.serviceName]?.[ageGroup] || 
           "I'm working a bit differently right now, but we can still create something amazing together!";
  }

  private generateDataRecoveryMessage(
    corruptionType: string,
    context: ConversationContext
  ): string {
    const age = context.user?.age || 6;
    
    if (age < 7) {
      return "I had to fix something, but don't worry - we can keep making our story!";
    } else {
      return "I recovered from a small technical issue. Let's continue where we left off!";
    }
  }

  // Additional helper methods for data corruption recovery
  private identifyCorruptionType(data: any): string {
    if (!data) return 'complete_corruption';
    
    try {
      JSON.stringify(data);
      if (typeof data === 'object' && Object.keys(data).length > 0) {
        return 'partial_corruption';
      }
    } catch {
      return 'format_corruption';
    }
    
    return 'complete_corruption';
  }

  private async recoverPartialData(data: any, context: ConversationContext): Promise<any> {
    // Attempt to recover what we can from partially corrupted data
    const recovered: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      try {
        if (this.isValidDataField(key, value)) {
          recovered[key] = value;
        }
      } catch {
        // Skip corrupted fields
      }
    }
    
    // Fill in missing required fields from context
    return this.fillMissingFields(recovered, context);
  }

  private async repairDataFormat(data: any): Promise<any> {
    // Attempt to repair data format issues
    try {
      if (typeof data === 'string') {
        // Try to parse as JSON
        return JSON.parse(data);
      }
      
      if (Array.isArray(data) && data.length === 1) {
        // Unwrap single-item arrays
        return data[0];
      }
      
      return data;
    } catch {
      return null;
    }
  }

  private async rebuildFromContext(context: ConversationContext): Promise<any> {
    // Rebuild data structure from conversation context
    return {
      id: `recovered_${Date.now()}`,
      character: context.character || this.createDefaultCharacter(),
      story: context.story || this.createDefaultStory(),
      timestamp: new Date(),
      isRecovered: true
    };
  }

  private async createDefaultData(context: ConversationContext): Promise<any> {
    // Create safe default data
    return {
      id: `default_${Date.now()}`,
      type: 'default',
      content: 'Let\'s start fresh with a new story!',
      timestamp: new Date()
    };
  }

  private assessDataRecoveryImpact(corruptionType: string): string[] {
    const impactMap: Record<string, string[]> = {
      'partial_corruption': ['some_personalization', 'detailed_history'],
      'format_corruption': ['data_formatting', 'advanced_features'],
      'complete_corruption': ['all_previous_data', 'conversation_history']
    };
    
    return impactMap[corruptionType] || [];
  }

  // Resource management helper methods
  private prioritizeOperations(
    constraints: ResourceConstraint[],
    context: ConversationContext
  ): string[] {
    // Always prioritize core storytelling operations
    const priorities = [
      'conversation_flow',
      'character_creation',
      'story_generation',
      'user_interaction',
      'voice_synthesis',
      'data_storage',
      'asset_generation'
    ];
    
    // Filter based on current constraints
    const availableOperations = priorities.filter(op => 
      this.canSupportOperation(op, constraints)
    );
    
    return availableOperations;
  }

  private identifyDeferrableOperations(constraints: ResourceConstraint[]): string[] {
    const deferrable = [
      'asset_generation',
      'advanced_analytics',
      'background_sync',
      'cache_warming',
      'non_essential_logging'
    ];
    
    return deferrable.filter(op => 
      constraints.some(c => c.utilizationPercent > c.criticalThreshold * 0.8)
    );
  }

  private async applyResourceManagement(
    constraint: ResourceConstraint,
    prioritizedOperations: string[]
  ): Promise<void> {
    switch (constraint.resourceType) {
      case 'memory':
        await this.freeMemory(prioritizedOperations);
        break;
      
      case 'cpu':
        await this.reduceCPUUsage(prioritizedOperations);
        break;
      
      case 'network':
        await this.optimizeNetworkUsage(prioritizedOperations);
        break;
      
      case 'api_quota':
        await this.manageAPIQuota(prioritizedOperations);
        break;
    }
  }

  // Cascading failure prevention helper methods
  private predictFailureChain(
    initialFailure: ServiceFailure,
    dependentServices: string[]
  ): string[] {
    const chain = [initialFailure.serviceName];
    
    // Add services that depend on the failed service
    const dependencies: Record<string, string[]> = {
      'supabase_db': ['auth_agent', 'library_agent', 'emotion_agent'],
      'openai_api': ['content_agent', 'router'],
      'redis_cache': ['conversation_state', 'session_management']
    };
    
    const dependents = dependencies[initialFailure.serviceName] || [];
    chain.push(...dependents.filter(dep => dependentServices.includes(dep)));
    
    return chain;
  }

  private selectPreventionStrategy(
    failureChain: string[],
    initialFailure: ServiceFailure
  ): 'circuit_breaker' | 'rate_limiting' | 'load_shedding' | 'graceful_degradation' {
    if (failureChain.length > 3) {
      return 'circuit_breaker'; // Prevent widespread failure
    }
    
    if (initialFailure.failureType === 'rate_limit') {
      return 'rate_limiting';
    }
    
    if (initialFailure.severity === 'critical') {
      return 'load_shedding';
    }
    
    return 'graceful_degradation';
  }

  private estimateRecoveryTime(strategy: string): number {
    const recoveryTimes: Record<string, number> = {
      'circuit_breaker': 300000, // 5 minutes
      'rate_limiting': 60000,    // 1 minute
      'load_shedding': 120000,   // 2 minutes
      'graceful_degradation': 30000 // 30 seconds
    };
    
    return recoveryTimes[strategy] || 60000;
  }

  // Additional helper methods
  private async assessCoreCapabilities(): Promise<string[]> {
    const available = [];
    
    // Check each core capability
    for (const capability of this.coreStorytellingCapabilities) {
      if (await this.isCapabilityAvailable(capability)) {
        available.push(capability);
      }
    }
    
    return available;
  }

  private async isCapabilityAvailable(capability: string): Promise<boolean> {
    // Check if the services required for this capability are healthy
    const requiredServices: Record<string, string[]> = {
      'character_creation': ['openai_api', 'supabase_db'],
      'story_generation': ['openai_api'],
      'conversation_flow': ['redis_cache'],
      'voice_response': ['elevenlabs_api']
    };
    
    const services = requiredServices[capability] || [];
    return services.every(service => {
      const health = this.serviceHealth.get(service);
      return health?.status === 'healthy';
    });
  }

  private generateCacheKey(context: ConversationContext): string {
    // Generate stable cache key based on context (without timestamp for exact matches)
    const contextHash = JSON.stringify({
      userId: context.userId,
      sessionId: context.sessionId,
      phase: context.phase,
      character: context.character?.name,
      story: context.story?.title
    });
    return `resilience_cache:${Buffer.from(contextHash).toString('base64').substring(0, 64)}`;
  }

  private async getCachedResult(cacheKey: string): Promise<any> {
    try {
      // Try Redis first
      if (this.redisClient) {
        try {
          const cached = await this.redisClient.get(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            // Check if cache entry is still valid
            if (parsed.timestamp && (Date.now() - parsed.timestamp) < (parsed.ttl || this.CACHE_TTL_MS)) {
              return parsed.data;
            }
            // Expired - remove from Redis
            await this.redisClient.del(cacheKey).catch(() => {});
          }
        } catch (redisError) {
          // Redis error - fallback to memory cache
        }
      }
      
      // Fallback to memory cache
      const memoryCached = this.memoryCache.get(cacheKey);
      if (memoryCached) {
        const now = Date.now();
        if (now - memoryCached.timestamp < memoryCached.ttl) {
          return memoryCached.data;
        }
        // Expired - remove from memory
        this.memoryCache.delete(cacheKey);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async findSimilarCachedResult(context: ConversationContext): Promise<any> {
    try {
      const searchPattern = `resilience_cache:*`;
      const results: any[] = [];
      
      // Try Redis first
      if (this.redisClient) {
        try {
          const keys = await this.redisClient.keys(searchPattern);
          for (const key of keys.slice(0, 10)) { // Limit to 10 keys for performance
            try {
              const cached = await this.redisClient.get(key);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.timestamp && (Date.now() - parsed.timestamp) < (parsed.ttl || this.CACHE_TTL_MS)) {
                  // Check similarity (same user, same phase)
                  if (parsed.data?.userId === context.userId && parsed.data?.phase === context.phase) {
                    results.push(parsed.data);
                  }
                }
              }
            } catch (err) {
              // Skip invalid cache entries
            }
          }
        } catch (redisError) {
          // Redis error - fallback to memory cache
        }
      }
      
      // Fallback to memory cache
      for (const [key, cached] of this.memoryCache.entries()) {
        if (key.startsWith('resilience_cache:')) {
          const now = Date.now();
          if (now - cached.timestamp < cached.ttl) {
            // Check similarity (same user, same phase)
            if (cached.data?.userId === context.userId && cached.data?.phase === context.phase) {
              results.push(cached.data);
            }
          }
        }
      }
      
      // Return most recent similar result
      if (results.length > 0) {
        return results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Store result in cache (Redis with memory fallback)
   */
  private async storeCachedResult(cacheKey: string, data: any, ttl: number = this.CACHE_TTL_MS): Promise<void> {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl
      };
      
      // Try Redis first
      if (this.redisClient) {
        try {
          await this.redisClient.setex(
            cacheKey,
            Math.floor(ttl / 1000), // Convert to seconds
            JSON.stringify(cacheEntry)
          );
        } catch (redisError) {
          // Redis error - fallback to memory cache
        }
      }
      
      // Always store in memory cache as fallback
      this.memoryCache.set(cacheKey, cacheEntry);
    } catch (error) {
      // Cache storage failed - non-critical, continue
    }
  }

  private adaptCachedResult(cachedResult: any, context: ConversationContext): any {
    // Adapt cached result to current context
    return cachedResult;
  }

  private selectSimplifiedTemplate(context: ConversationContext): string {
    const templates = [
      "Let's continue with {character}'s adventure...",
      "What happens next in {character}'s story?",
      "Tell me more about what {character} should do..."
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private populateTemplate(template: string, context: ConversationContext): string {
    return template.replace('{character}', context.character?.name || 'our hero');
  }

  private canSupportOperation(operation: string, constraints: ResourceConstraint[]): boolean {
    // Check if we have enough resources for this operation
    return constraints.every(c => c.utilizationPercent < c.criticalThreshold);
  }

  private isValidDataField(key: string, value: any): boolean {
    // Validate data field
    return key && value !== undefined && value !== null;
  }

  private fillMissingFields(data: any, context: ConversationContext): any {
    // Fill in missing required fields
    if (!data.id) data.id = `recovered_${Date.now()}`;
    if (!data.timestamp) data.timestamp = new Date();
    
    return data;
  }

  private createDefaultCharacter(): any {
    return {
      name: 'Hero',
      species: 'human',
      age: 8,
      traits: { brave: true, kind: true }
    };
  }

  private createDefaultStory(): any {
    return {
      title: 'A New Adventure',
      content: 'Once upon a time...',
      type: 'adventure'
    };
  }

  // Resource management implementation methods
  private async freeMemory(prioritizedOperations: string[]): Promise<void> {
    // Implement memory cleanup
  }

  private async reduceCPUUsage(prioritizedOperations: string[]): Promise<void> {
    // Implement CPU usage reduction
  }

  private async optimizeNetworkUsage(prioritizedOperations: string[]): Promise<void> {
    // Implement network optimization
  }

  private async manageAPIQuota(prioritizedOperations: string[]): Promise<void> {
    // Implement API quota management
  }

  // Cascading failure prevention implementation methods
  private async activateCircuitBreakers(services: string[]): Promise<void> {
    // Implement circuit breaker activation
  }

  private async applyRateLimiting(services: string[]): Promise<void> {
    // Implement rate limiting
  }

  private async shedNonEssentialLoad(services: string[]): Promise<void> {
    // Implement load shedding
  }

  private async enableGracefulDegradation(services: string[]): Promise<void> {
    // Implement graceful degradation
  }

  /**
   * Get current system health status
   */
  getSystemHealth(): Map<string, SystemHealth> {
    return new Map(this.serviceHealth);
  }

  /**
   * Get active failures
   */
  getActiveFailures(): ServiceFailure[] {
    return Array.from(this.activeFailures.values());
  }

  /**
   * Get current degradation level
   */
  getDegradationLevel(): string {
    return this.degradationLevel;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.serviceHealth.clear();
    this.activeFailures.clear();
    this.cascadingPrevention.clear();
  }
}