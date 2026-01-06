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
export declare class FailoverPolicy extends EventEmitter {
    private config;
    private logger;
    private state;
    private latencyWindow;
    private readonly maxLatencyWindow;
    constructor(config: FailoverConfig, logger: Logger);
    /**
     * Initialize the failover policy
     */
    initialize(): Promise<void>;
    /**
     * Get the current recommended engine
     */
    getCurrentEngine(): 'elevenlabs' | 'polly';
    /**
     * Check if a specific engine can be used
     */
    canUseEngine(engine: 'elevenlabs' | 'polly'): Promise<boolean>;
    /**
     * Record the result of an engine call
     */
    recordResult(engine: 'elevenlabs' | 'polly', latency: number, success: boolean): Promise<void>;
    /**
     * Force switch to a specific engine
     */
    forceSwitch(engine: 'elevenlabs' | 'polly'): Promise<void>;
    /**
     * Get current failover state for monitoring
     */
    getState(): FailoverState;
    /**
     * Reset failover state
     */
    reset(): void;
    /**
     * Private helper methods
     */
    private recordLatency;
    private checkLatencyBasedSwitching;
    private switchEngine;
    /**
     * Periodic maintenance to clean up old state
     */
    private startMaintenance;
}
export {};
//# sourceMappingURL=FailoverPolicy.d.ts.map