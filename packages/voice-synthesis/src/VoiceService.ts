import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { 
  VoiceSynthesisRequest, 
  VoiceSynthesisResponse, 
  AudioChunk, 
  VoiceEngineConfig,
  VoiceMetrics,
  VoiceError,
  VoiceErrorCode,
  VoicePreferences
} from './types';
import { ElevenLabsClient } from './clients/ElevenLabsClient';
import { PollyClient } from './clients/PollyClient';
import { FailoverPolicy } from './FailoverPolicy';
import { VoiceCloneManager } from './VoiceCloneManager';
import { MetricsCollector } from './utils/MetricsCollector';
import { CostTracker } from './utils/CostTracker';
import { validateConfig } from './utils/validation';

/**
 * Main voice synthesis service that orchestrates multiple TTS engines
 * with intelligent failover and real-time streaming capabilities
 */
export class VoiceService extends EventEmitter {
  private elevenLabsClient: ElevenLabsClient;
  private pollyClient: PollyClient;
  private failoverPolicy: FailoverPolicy;
  private voiceCloneManager: VoiceCloneManager;
  private metricsCollector: MetricsCollector;
  private costTracker: CostTracker;
  private isInitialized = false;

  constructor(
    private config: VoiceEngineConfig,
    private logger: Logger
  ) {
    super();
    
    // Validate configuration
    validateConfig(config);

    // Initialize clients
    this.elevenLabsClient = new ElevenLabsClient(config.elevenlabs, logger);
    this.pollyClient = new PollyClient(config.polly, logger);
    this.failoverPolicy = new FailoverPolicy(config.failover, logger);
    this.voiceCloneManager = new VoiceCloneManager(config, logger);
    this.metricsCollector = new MetricsCollector(config.redis, logger);
    this.costTracker = new CostTracker(config.cost, logger);

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize the voice service and all clients
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing VoiceService...');

      // Initialize all components
      await Promise.all([
        this.elevenLabsClient.initialize(),
        this.pollyClient.initialize(),
        this.failoverPolicy.initialize(),
        this.voiceCloneManager.initialize(),
        this.metricsCollector.initialize(),
        this.costTracker.initialize(),
      ]);

      this.isInitialized = true;
      this.logger.info('VoiceService initialized successfully');

      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize VoiceService', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Shutdown the voice service gracefully
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down VoiceService...');

      await Promise.all([
        this.elevenLabsClient.shutdown(),
        this.pollyClient.shutdown(),
        this.metricsCollector.shutdown(),
        this.costTracker.shutdown(),
      ]);

      this.isInitialized = false;
      this.logger.info('VoiceService shutdown completed');

      this.emit('shutdown');
    } catch (error) {
      this.logger.error('Error during VoiceService shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Stream audio synthesis with real-time chunks
   * Primary method for voice-first interactions
   */
  async stream(
    request: VoiceSynthesisRequest,
    onChunk: (chunk: AudioChunk) => void
  ): Promise<VoiceSynthesisResponse> {
    this.ensureInitialized();

    const startTime = Date.now();
    const sessionId = request.sessionId || this.generateSessionId();

    try {
      this.logger.info('Starting voice synthesis stream', {
        sessionId,
        textLength: request.text.length,
        language: request.language,
        emotion: request.emotion,
        streaming: request.streaming,
      });

      // Check cost limits
      await this.costTracker.checkLimits(request.userId, request.text.length);

      // Determine engine based on failover policy and request characteristics
      const engine = await this.selectEngine(request);

      // Route to appropriate engine
      let response: VoiceSynthesisResponse;
      
      if (engine === 'elevenlabs') {
        response = await this.elevenLabsClient.stream(request, onChunk);
      } else {
        response = await this.pollyClient.stream(request, onChunk);
      }

      // Calculate final metrics
      const latency = Date.now() - startTime;
      response.latency = latency;
      response.sessionId = sessionId;

      // Record metrics
      await this.recordMetrics(response, request, latency);

      // Update failover policy
      await this.failoverPolicy.recordResult(engine, latency, true);

      this.logger.info('Voice synthesis completed successfully', {
        sessionId,
        engine: response.engine,
        latency,
        duration: response.duration,
        cost: response.cost,
      });

      this.emit('synthesis_completed', response);
      return response;

    } catch (error) {
      const latency = Date.now() - startTime;
      
      this.logger.error('Voice synthesis failed', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        latency,
      });

      // Record failure metrics
      const engine = await this.selectEngine(request);
      await this.failoverPolicy.recordResult(engine, latency, false);

      // Try failover if appropriate
      if (this.shouldAttemptFailover(error, engine)) {
        return this.attemptFailover(request, onChunk, sessionId, error);
      }

      // Return error response
      const errorResponse: VoiceSynthesisResponse = {
        success: false,
        engine: engine,
        latency,
        sessionId,
        error: error instanceof VoiceError ? error.message : 'Internal synthesis error',
      };

      this.emit('synthesis_failed', errorResponse);
      return errorResponse;
    }
  }

  /**
   * Generate long-form audio (for final story MP3s)
   * Asynchronous processing for complete stories
   */
  async generateLongForm(
    request: VoiceSynthesisRequest
  ): Promise<VoiceSynthesisResponse> {
    this.ensureInitialized();

    const startTime = Date.now();
    const sessionId = request.sessionId || this.generateSessionId();

    try {
      this.logger.info('Starting long-form voice synthesis', {
        sessionId,
        textLength: request.text.length,
        language: request.language,
      });

      // Long-form always uses ElevenLabs Multilingual v2 for quality
      // unless cost constraints force Polly
      const shouldUsePolly = request.text.length > 3000 && 
                            !await this.hasPremiuVoiceEntitlement(request.userId);

      let response: VoiceSynthesisResponse;

      if (shouldUsePolly) {
        response = await this.pollyClient.generateLongForm(request);
      } else {
        response = await this.elevenLabsClient.generateLongForm(request);
      }

      const latency = Date.now() - startTime;
      response.latency = latency;
      response.sessionId = sessionId;

      // Record metrics
      await this.recordMetrics(response, request, latency);

      this.logger.info('Long-form synthesis completed', {
        sessionId,
        engine: response.engine,
        latency,
        duration: response.duration,
        cost: response.cost,
      });

      this.emit('longform_completed', response);
      return response;

    } catch (error) {
      const latency = Date.now() - startTime;
      
      this.logger.error('Long-form synthesis failed', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        latency,
      });

      const errorResponse: VoiceSynthesisResponse = {
        success: false,
        engine: 'elevenlabs',
        latency,
        sessionId,
        error: error instanceof VoiceError ? error.message : 'Long-form synthesis failed',
      };

      this.emit('longform_failed', errorResponse);
      return errorResponse;
    }
  }

  /**
   * Get voice clone manager for managing custom voices
   */
  getVoiceCloneManager(): VoiceCloneManager {
    return this.voiceCloneManager;
  }

  /**
   * Get current metrics and performance data
   */
  async getMetrics(timeRangeMs: number = 3600000): Promise<VoiceMetrics[]> {
    return this.metricsCollector.getMetrics(timeRangeMs);
  }

  /**
   * Get cost tracking information
   */
  async getCostMetrics(userId?: string, timeRangeMs: number = 86400000) {
    return this.costTracker.getCostMetrics(userId, timeRangeMs);
  }

  /**
   * Update user voice preferences
   */
  async updateVoicePreferences(preferences: VoicePreferences): Promise<void> {
    // This would integrate with the user preferences system
    // For now, we'll emit an event that can be handled by the parent system
    this.emit('preferences_updated', preferences);
  }

  /**
   * Health check for the voice service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    engines: {
      elevenlabs: 'up' | 'down' | 'degraded';
      polly: 'up' | 'down' | 'degraded';
    };
    metrics: {
      avgLatency: number;
      successRate: number;
      dailyCost: number;
    };
  }> {
    const [elevenLabsHealth, pollyHealth, metrics] = await Promise.all([
      this.elevenLabsClient.healthCheck(),
      this.pollyClient.healthCheck(),
      this.getRecentMetrics(),
    ]);

    const overallStatus = this.determineOverallHealth(elevenLabsHealth, pollyHealth);

    return {
      status: overallStatus,
      engines: {
        elevenlabs: elevenLabsHealth,
        polly: pollyHealth,
      },
      metrics,
    };
  }

  /**
   * Private helper methods
   */

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new VoiceError(
        VoiceErrorCode.INTERNAL_ERROR,
        'VoiceService not initialized. Call initialize() first.'
      );
    }
  }

  private async selectEngine(request: VoiceSynthesisRequest): Promise<'elevenlabs' | 'polly'> {
    // Short text (< 400 chars) prefers ElevenLabs Flash
    if (request.text.length < 400) {
      const canUseElevenLabs = await this.failoverPolicy.canUseEngine('elevenlabs');
      if (canUseElevenLabs) {
        return 'elevenlabs';
      }
    }

    // Check failover policy
    return this.failoverPolicy.getCurrentEngine();
  }

  private shouldAttemptFailover(error: any, currentEngine: 'elevenlabs' | 'polly'): boolean {
    // Don't failover for certain error types
    if (error instanceof VoiceError) {
      const noFailoverCodes = [
        VoiceErrorCode.INVALID_REQUEST,
        VoiceErrorCode.TEXT_TOO_LONG,
        VoiceErrorCode.UNSUPPORTED_LANGUAGE,
      ];
      if (noFailoverCodes.includes(error.code)) {
        return false;
      }
    }

    // Only failover if we haven't already tried the other engine
    return currentEngine === 'elevenlabs';
  }

  private async attemptFailover(
    request: VoiceSynthesisRequest,
    onChunk: (chunk: AudioChunk) => void,
    sessionId: string,
    originalError: any
  ): Promise<VoiceSynthesisResponse> {
    this.logger.info('Attempting failover to Polly', { sessionId });

    try {
      const response = await this.pollyClient.stream(request, onChunk);
      response.sessionId = sessionId;
      
      this.logger.info('Failover successful', { sessionId });
      this.emit('failover_success', { sessionId, originalError });
      
      return response;
    } catch (failoverError) {
      this.logger.error('Failover also failed', {
        sessionId,
        originalError: originalError instanceof Error ? originalError.message : String(originalError),
        failoverError: failoverError instanceof Error ? failoverError.message : String(failoverError),
      });

      this.emit('failover_failed', { sessionId, originalError, failoverError });

      return {
        success: false,
        engine: 'polly',
        latency: 0,
        sessionId,
        error: 'Both primary and fallback engines failed',
      };
    }
  }

  private async recordMetrics(
    response: VoiceSynthesisResponse,
    request: VoiceSynthesisRequest,
    latency: number
  ): Promise<void> {
    const metrics: VoiceMetrics = {
      engine: response.engine,
      latency,
      success: response.success,
      cost: response.cost || 0,
      characterCount: request.text.length,
      timestamp: new Date(),
      userId: request.userId,
      sessionId: response.sessionId,
    };

    await this.metricsCollector.recordMetrics(metrics);
    
    if (response.cost) {
      await this.costTracker.recordCost({
        engine: response.engine,
        characterCount: request.text.length,
        cost: response.cost,
        timestamp: new Date(),
        userId: request.userId,
      });
    }
  }

  private async hasPremiuVoiceEntitlement(userId?: string): Promise<boolean> {
    // This would check user's subscription status
    // For now, return false to use cost-effective routing
    return false;
  }

  private generateSessionId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupEventListeners(): void {
    // Listen to client events and bubble them up
    this.elevenLabsClient.on('error', (error) => {
      this.emit('elevenlabs_error', error);
    });

    this.pollyClient.on('error', (error) => {
      this.emit('polly_error', error);
    });

    this.failoverPolicy.on('engine_switched', (data) => {
      this.emit('engine_switched', data);
    });
  }

  private async getRecentMetrics() {
    const metrics = await this.getMetrics(3600000); // Last hour
    
    if (metrics.length === 0) {
      return {
        avgLatency: 0,
        successRate: 1,
        dailyCost: 0,
      };
    }

    const avgLatency = metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length;
    const successRate = metrics.filter(m => m.success).length / metrics.length;
    
    const dailyMetrics = await this.getMetrics(86400000); // Last 24 hours
    const dailyCost = dailyMetrics.reduce((sum, m) => sum + m.cost, 0);

    return {
      avgLatency,
      successRate,
      dailyCost,
    };
  }

  private determineOverallHealth(
    elevenLabsHealth: 'up' | 'down' | 'degraded',
    pollyHealth: 'up' | 'down' | 'degraded'
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (elevenLabsHealth === 'up' && pollyHealth === 'up') {
      return 'healthy';
    }
    
    if (elevenLabsHealth === 'down' && pollyHealth === 'down') {
      return 'unhealthy';
    }
    
    return 'degraded';
  }
}