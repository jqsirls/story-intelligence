import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { FailoverState } from './types';

interface FailoverConfig {
  latencyThresholdMs: number;
  errorThresholdCount: number;
  cooldownMs: number;
  enableCircuitBreaker: boolean;
}

/**
 * Intelligent failover policy with circuit breaker pattern
 * Monitors latency and error rates to switch between engines
 */
export class FailoverPolicy extends EventEmitter {
  private state: FailoverState;
  private latencyWindow: number[] = [];
  private readonly maxLatencyWindow = 5;

  constructor(
    private config: FailoverConfig,
    private logger: Logger
  ) {
    super();

    this.state = {
      currentEngine: 'elevenlabs',
      errorCount: 0,
      circuitBreakerOpen: false,
      recentLatencies: [],
    };
  }

  /**
   * Initialize the failover policy
   */
  async initialize(): Promise<void> {
    this.logger.info('Failover policy initialized', {
      latencyThreshold: this.config.latencyThresholdMs,
      errorThreshold: this.config.errorThresholdCount,
      cooldownMs: this.config.cooldownMs,
      circuitBreakerEnabled: this.config.enableCircuitBreaker,
    });
  }

  /**
   * Get the current recommended engine
   */
  getCurrentEngine(): 'elevenlabs' | 'polly' {
    // If circuit breaker is open for ElevenLabs, use Polly
    if (this.state.circuitBreakerOpen && this.state.currentEngine === 'elevenlabs') {
      return 'polly';
    }

    // Check if we're in cooldown period
    if (this.state.cooldownUntil && new Date() < this.state.cooldownUntil) {
      return this.state.currentEngine === 'elevenlabs' ? 'polly' : 'elevenlabs';
    }

    return this.state.currentEngine;
  }

  /**
   * Check if a specific engine can be used
   */
  async canUseEngine(engine: 'elevenlabs' | 'polly'): Promise<boolean> {
    // Always allow Polly as fallback
    if (engine === 'polly') {
      return true;
    }

    // Check ElevenLabs availability
    if (engine === 'elevenlabs') {
      // Circuit breaker check
      if (this.config.enableCircuitBreaker && this.state.circuitBreakerOpen) {
        return false;
      }

      // Cooldown check
      if (this.state.cooldownUntil && new Date() < this.state.cooldownUntil) {
        return false;
      }

      // Error count check
      if (this.state.errorCount >= this.config.errorThresholdCount) {
        return false;
      }

      return true;
    }

    return false;
  }

  /**
   * Record the result of an engine call
   */
  async recordResult(
    engine: 'elevenlabs' | 'polly',
    latency: number,
    success: boolean
  ): Promise<void> {
    const now = new Date();

    this.logger.debug('Recording engine result', {
      engine,
      latency,
      success,
      currentEngine: this.state.currentEngine,
    });

    if (success) {
      // Reset error count on success
      if (engine === this.state.currentEngine) {
        this.state.errorCount = Math.max(0, this.state.errorCount - 1);
      }

      // Record latency
      this.recordLatency(engine, latency);

      // Check if we should close circuit breaker
      if (this.state.circuitBreakerOpen && engine === 'elevenlabs') {
        this.state.circuitBreakerOpen = false;
        this.logger.info('Circuit breaker closed for ElevenLabs');
        this.emit('circuit_breaker_closed', { engine: 'elevenlabs' });
      }

    } else {
      // Handle failure
      if (engine === this.state.currentEngine) {
        this.state.errorCount++;
        this.state.lastFailureTime = now;

        this.logger.warn('Engine failure recorded', {
          engine,
          errorCount: this.state.errorCount,
          threshold: this.config.errorThresholdCount,
        });

        // Check if we should switch engines
        if (this.state.errorCount >= this.config.errorThresholdCount) {
          await this.switchEngine();
        }

        // Open circuit breaker if enabled
        if (this.config.enableCircuitBreaker && engine === 'elevenlabs') {
          this.state.circuitBreakerOpen = true;
          this.logger.warn('Circuit breaker opened for ElevenLabs');
          this.emit('circuit_breaker_opened', { engine: 'elevenlabs' });
        }
      }
    }

    // Check latency-based switching
    if (success && engine === 'elevenlabs') {
      await this.checkLatencyBasedSwitching(latency);
    }
  }

  /**
   * Force switch to a specific engine
   */
  async forceSwitch(engine: 'elevenlabs' | 'polly'): Promise<void> {
    if (this.state.currentEngine !== engine) {
      const previousEngine = this.state.currentEngine;
      this.state.currentEngine = engine;
      this.state.errorCount = 0;
      this.state.cooldownUntil = undefined;

      this.logger.info('Engine forcibly switched', {
        from: previousEngine,
        to: engine,
      });

      this.emit('engine_switched', {
        from: previousEngine,
        to: engine,
        reason: 'forced',
      });
    }
  }

  /**
   * Get current failover state for monitoring
   */
  getState(): FailoverState {
    return { ...this.state };
  }

  /**
   * Reset failover state
   */
  reset(): void {
    this.state = {
      currentEngine: 'elevenlabs',
      errorCount: 0,
      circuitBreakerOpen: false,
      recentLatencies: [],
    };
    this.latencyWindow = [];

    this.logger.info('Failover policy reset');
    this.emit('policy_reset');
  }

  /**
   * Private helper methods
   */

  private recordLatency(engine: 'elevenlabs' | 'polly', latency: number): void {
    if (engine === 'elevenlabs') {
      this.latencyWindow.push(latency);
      
      // Keep only recent latencies
      if (this.latencyWindow.length > this.maxLatencyWindow) {
        this.latencyWindow.shift();
      }

      // Update state
      this.state.recentLatencies = [...this.latencyWindow];
    }
  }

  private async checkLatencyBasedSwitching(latency: number): Promise<void> {
    // Only switch if we have enough data points
    if (this.latencyWindow.length < this.maxLatencyWindow) {
      return;
    }

    // Calculate rolling average
    const avgLatency = this.latencyWindow.reduce((sum, l) => sum + l, 0) / this.latencyWindow.length;

    // Check if average latency exceeds threshold
    if (avgLatency > this.config.latencyThresholdMs) {
      this.logger.warn('High latency detected, switching to Polly', {
        avgLatency,
        threshold: this.config.latencyThresholdMs,
        recentLatencies: this.latencyWindow,
      });

      await this.switchEngine('high_latency');
    }
  }

  private async switchEngine(reason: string = 'error_threshold'): Promise<void> {
    const previousEngine = this.state.currentEngine;
    const newEngine = previousEngine === 'elevenlabs' ? 'polly' : 'elevenlabs';

    this.state.currentEngine = newEngine;
    this.state.errorCount = 0;
    this.state.cooldownUntil = new Date(Date.now() + this.config.cooldownMs);

    // Clear latency window when switching
    this.latencyWindow = [];
    this.state.recentLatencies = [];

    this.logger.info('Engine switched due to failures', {
      from: previousEngine,
      to: newEngine,
      reason,
      cooldownUntil: this.state.cooldownUntil,
    });

    this.emit('engine_switched', {
      from: previousEngine,
      to: newEngine,
      reason,
      cooldownUntil: this.state.cooldownUntil,
    });
  }

  /**
   * Periodic maintenance to clean up old state
   */
  private startMaintenance(): void {
    setInterval(() => {
      const now = new Date();

      // Check if cooldown period has expired
      if (this.state.cooldownUntil && now >= this.state.cooldownUntil) {
        this.logger.info('Cooldown period expired, resetting to ElevenLabs');
        this.state.currentEngine = 'elevenlabs';
        this.state.cooldownUntil = undefined;
        this.state.errorCount = 0;

        this.emit('cooldown_expired');
      }

      // Gradually reduce error count over time (circuit breaker recovery)
      if (this.state.errorCount > 0 && this.state.lastFailureTime) {
        const timeSinceLastFailure = now.getTime() - this.state.lastFailureTime.getTime();
        const recoveryTime = 5 * 60 * 1000; // 5 minutes

        if (timeSinceLastFailure > recoveryTime) {
          this.state.errorCount = Math.max(0, this.state.errorCount - 1);
          this.state.lastFailureTime = now;

          if (this.state.errorCount === 0) {
            this.logger.info('Error count reset due to recovery time');
          }
        }
      }

    }, 30000); // Run every 30 seconds
  }
}