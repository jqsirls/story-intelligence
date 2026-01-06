import { EventEmitter } from 'events';

export interface AdaptiveTimeoutConfig {
  enabled: boolean;
  baseTimeout: number; // ms
  maxTimeout: number; // ms
  adjustmentFactor: number; // 0.1 = 10% adjustment
}

interface TimeoutStats {
  requestType: string;
  averageResponseTime: number;
  successRate: number;
  timeoutRate: number;
  currentTimeout: number;
  adjustmentHistory: TimeoutAdjustment[];
}

interface TimeoutAdjustment {
  timestamp: number;
  oldTimeout: number;
  newTimeout: number;
  reason: string;
}

interface RequestHistory {
  timestamp: number;
  responseTime: number;
  success: boolean;
  timedOut: boolean;
}

export class AdaptiveTimeoutManager extends EventEmitter {
  private config: AdaptiveTimeoutConfig;
  private timeouts: Map<string, number>;
  private requestHistory: Map<string, RequestHistory[]>;
  private stats: Map<string, TimeoutStats>;
  private adjustmentInterval: NodeJS.Timeout;

  constructor(config: AdaptiveTimeoutConfig) {
    super();
    this.config = config;
    this.timeouts = new Map();
    this.requestHistory = new Map();
    this.stats = new Map();
    
    // Start periodic adjustment process
    this.adjustmentInterval = setInterval(() => {
      this.adjustTimeouts();
    }, 60000); // Adjust every minute
  }

  getTimeout(requestType: string, context?: any): number {
    if (!this.config.enabled) {
      return this.config.baseTimeout;
    }

    let timeout = this.timeouts.get(requestType) || this.config.baseTimeout;
    
    // Apply context-based adjustments
    if (context) {
      timeout = this.applyContextAdjustments(timeout, context);
    }
    
    return Math.min(timeout, this.config.maxTimeout);
  }

  recordSuccess(requestType: string, responseTime: number): void {
    this.recordRequest(requestType, responseTime, true, false);
  }

  recordFailure(requestType: string, responseTime?: number): void {
    this.recordRequest(requestType, responseTime || 0, false, false);
  }

  recordTimeout(requestType: string): void {
    const currentTimeout = this.getTimeout(requestType);
    this.recordRequest(requestType, currentTimeout, false, true);
  }

  getStats(requestType?: string): Map<string, TimeoutStats> {
    if (requestType) {
      const stats = this.stats.get(requestType);
      return stats ? new Map([[requestType, stats]]) : new Map();
    }
    
    return new Map(this.stats);
  }

  updateConfig(config: Partial<AdaptiveTimeoutConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (!config.enabled) {
      // Reset all timeouts to base timeout
      for (const [requestType] of this.timeouts) {
        this.timeouts.set(requestType, this.config.baseTimeout);
      }
    }
    
    this.emit('configUpdated', this.config);
  }

  private recordRequest(
    requestType: string,
    responseTime: number,
    success: boolean,
    timedOut: boolean
  ): void {
    // Initialize history if needed
    if (!this.requestHistory.has(requestType)) {
      this.requestHistory.set(requestType, []);
    }

    const history = this.requestHistory.get(requestType)!;
    history.push({
      timestamp: Date.now(),
      responseTime,
      success,
      timedOut
    });

    // Keep only recent history (last 100 requests or 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    const recentHistory = history
      .filter(h => h.timestamp > oneHourAgo)
      .slice(-100);
    
    this.requestHistory.set(requestType, recentHistory);
    
    // Update stats
    this.updateStats(requestType);
  }

  private updateStats(requestType: string): void {
    const history = this.requestHistory.get(requestType) || [];
    if (history.length === 0) return;

    const successfulRequests = history.filter(h => h.success);
    const timedOutRequests = history.filter(h => h.timedOut);
    
    const averageResponseTime = successfulRequests.length > 0
      ? successfulRequests.reduce((sum, h) => sum + h.responseTime, 0) / successfulRequests.length
      : 0;
    
    const successRate = history.length > 0 ? successfulRequests.length / history.length : 0;
    const timeoutRate = history.length > 0 ? timedOutRequests.length / history.length : 0;
    
    const currentStats = this.stats.get(requestType);
    const stats: TimeoutStats = {
      requestType,
      averageResponseTime,
      successRate,
      timeoutRate,
      currentTimeout: this.timeouts.get(requestType) || this.config.baseTimeout,
      adjustmentHistory: currentStats?.adjustmentHistory || []
    };
    
    this.stats.set(requestType, stats);
  }

  private adjustTimeouts(): void {
    if (!this.config.enabled) return;

    for (const [requestType, stats] of this.stats.entries()) {
      const newTimeout = this.calculateOptimalTimeout(requestType, stats);
      const currentTimeout = this.timeouts.get(requestType) || this.config.baseTimeout;
      
      if (Math.abs(newTimeout - currentTimeout) > currentTimeout * 0.05) { // 5% threshold
        this.setTimeout(requestType, newTimeout, this.getAdjustmentReason(stats));
      }
    }
  }

  private calculateOptimalTimeout(requestType: string, stats: TimeoutStats): number {
    const { averageResponseTime, successRate, timeoutRate } = stats;
    
    // Base calculation: average response time + buffer
    let optimalTimeout = averageResponseTime * 2; // 100% buffer
    
    // Adjust based on success rate
    if (successRate < 0.9) {
      // Low success rate, increase timeout
      optimalTimeout *= (1 + (0.9 - successRate));
    }
    
    // Adjust based on timeout rate
    if (timeoutRate > 0.05) {
      // High timeout rate, increase timeout
      optimalTimeout *= (1 + timeoutRate);
    } else if (timeoutRate < 0.01) {
      // Very low timeout rate, can decrease timeout slightly
      optimalTimeout *= 0.95;
    }
    
    // Apply adjustment factor to smooth changes
    const currentTimeout = stats.currentTimeout;
    const adjustment = (optimalTimeout - currentTimeout) * this.config.adjustmentFactor;
    const newTimeout = currentTimeout + adjustment;
    
    // Ensure within bounds
    return Math.max(
      this.config.baseTimeout * 0.5, // Minimum 50% of base
      Math.min(newTimeout, this.config.maxTimeout)
    );
  }

  private getAdjustmentReason(stats: TimeoutStats): string {
    if (stats.timeoutRate > 0.05) {
      return 'High timeout rate detected';
    }
    
    if (stats.successRate < 0.9) {
      return 'Low success rate detected';
    }
    
    if (stats.timeoutRate < 0.01 && stats.successRate > 0.95) {
      return 'Excellent performance, optimizing timeout';
    }
    
    return 'Performance-based adjustment';
  }

  private setTimeout(requestType: string, timeout: number, reason: string): void {
    const oldTimeout = this.timeouts.get(requestType) || this.config.baseTimeout;
    this.timeouts.set(requestType, timeout);
    
    // Record adjustment
    const stats = this.stats.get(requestType);
    if (stats) {
      stats.currentTimeout = timeout;
      stats.adjustmentHistory.push({
        timestamp: Date.now(),
        oldTimeout,
        newTimeout: timeout,
        reason
      });
      
      // Keep only recent adjustments
      stats.adjustmentHistory = stats.adjustmentHistory.slice(-20);
    }
    
    this.emit('timeoutAdjusted', {
      requestType,
      oldTimeout,
      newTimeout: timeout,
      reason
    });
  }

  private applyContextAdjustments(baseTimeout: number, context: any): number {
    let adjustedTimeout = baseTimeout;
    
    // Adjust based on request complexity
    if (context.complexity === 'high') {
      adjustedTimeout *= 1.5;
    } else if (context.complexity === 'low') {
      adjustedTimeout *= 0.8;
    }
    
    // Adjust based on user priority
    if (context.userPriority === 'premium') {
      adjustedTimeout *= 1.2; // More generous timeout for premium users
    }
    
    // Adjust based on retry attempts
    if (context.retryAttempt) {
      adjustedTimeout *= Math.pow(1.3, context.retryAttempt); // Exponential increase
    }
    
    // Adjust based on system load
    if (context.systemLoad === 'high') {
      adjustedTimeout *= 1.4;
    } else if (context.systemLoad === 'low') {
      adjustedTimeout *= 0.9;
    }
    
    // Adjust based on time of day (peak hours)
    const hour = new Date().getHours();
    if ((hour >= 19 && hour <= 21) || (hour >= 7 && hour <= 9)) {
      adjustedTimeout *= 1.2; // Peak hours
    }
    
    return adjustedTimeout;
  }

  shutdown(): void {
    if (this.adjustmentInterval) {
      clearInterval(this.adjustmentInterval);
    }
    
    this.emit('shutdown');
  }
}