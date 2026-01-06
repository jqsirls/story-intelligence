import { Logger } from 'winston';
import { CostMetrics, VoiceError, VoiceErrorCode } from '../types';

interface CostConfig {
  maxCostPerRequest: number;
  dailyBudgetLimit: number;
  enableCostTracking: boolean;
}

/**
 * Cost tracker for voice synthesis budget management
 * Monitors spending across engines and enforces limits
 */
export class CostTracker {
  private dailyCosts: Map<string, number> = new Map(); // date -> cost
  private userCosts: Map<string, number> = new Map(); // userId -> daily cost
  private isInitialized = false;

  constructor(
    private config: CostConfig,
    private logger: Logger
  ) {}

  /**
   * Initialize the cost tracker
   */
  async initialize(): Promise<void> {
    try {
      this.isInitialized = true;
      this.logger.info('CostTracker initialized successfully', {
        maxCostPerRequest: this.config.maxCostPerRequest,
        dailyBudgetLimit: this.config.dailyBudgetLimit,
        trackingEnabled: this.config.enableCostTracking,
      });

      // Start daily reset task
      this.startDailyResetTask();

    } catch (error) {
      this.logger.error('Failed to initialize CostTracker', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Shutdown the cost tracker
   */
  async shutdown(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('CostTracker shutdown completed');
    } catch (error) {
      this.logger.error('Error during CostTracker shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if request is within cost limits
   */
  async checkLimits(userId: string | undefined, characterCount: number): Promise<void> {
    if (!this.config.enableCostTracking) {
      return;
    }

    // Estimate cost for the request
    const estimatedCost = this.estimateRequestCost(characterCount);

    // Check per-request limit
    if (estimatedCost > this.config.maxCostPerRequest) {
      throw new VoiceError(
        VoiceErrorCode.QUOTA_EXCEEDED,
        `Request cost ($${estimatedCost.toFixed(4)}) exceeds per-request limit ($${this.config.maxCostPerRequest})`,
        'elevenlabs'
      );
    }

    // Check daily budget limit
    const today = this.getTodayKey();
    const currentDailyCost = this.dailyCosts.get(today) || 0;

    if (currentDailyCost + estimatedCost > this.config.dailyBudgetLimit) {
      throw new VoiceError(
        VoiceErrorCode.QUOTA_EXCEEDED,
        `Request would exceed daily budget limit ($${this.config.dailyBudgetLimit}). Current: $${currentDailyCost.toFixed(2)}`,
        'elevenlabs'
      );
    }

    // Check user-specific limits if applicable
    if (userId) {
      const userDailyCost = this.userCosts.get(`${today}:${userId}`) || 0;
      const userDailyLimit = this.config.dailyBudgetLimit * 0.1; // 10% of total budget per user

      if (userDailyCost + estimatedCost > userDailyLimit) {
        throw new VoiceError(
          VoiceErrorCode.QUOTA_EXCEEDED,
          `User daily limit exceeded ($${userDailyLimit.toFixed(2)}). Current: $${userDailyCost.toFixed(2)}`,
          'elevenlabs'
        );
      }
    }
  }

  /**
   * Record actual cost after synthesis
   */
  async recordCost(metrics: CostMetrics): Promise<void> {
    if (!this.config.enableCostTracking) {
      return;
    }

    try {
      const today = this.getTodayKey();

      // Update daily total
      const currentDailyCost = this.dailyCosts.get(today) || 0;
      this.dailyCosts.set(today, currentDailyCost + metrics.cost);

      // Update user daily cost if userId provided
      if (metrics.userId) {
        const userKey = `${today}:${metrics.userId}`;
        const currentUserCost = this.userCosts.get(userKey) || 0;
        this.userCosts.set(userKey, currentUserCost + metrics.cost);
      }

      this.logger.debug('Cost recorded', {
        engine: metrics.engine,
        cost: metrics.cost,
        characterCount: metrics.characterCount,
        userId: metrics.userId,
        dailyTotal: this.dailyCosts.get(today),
      });

      // Check if we're approaching limits
      await this.checkBudgetAlerts(today);

    } catch (error) {
      this.logger.error('Failed to record cost', {
        error: error instanceof Error ? error.message : String(error),
        metrics,
      });
    }
  }

  /**
   * Get cost metrics for monitoring
   */
  async getCostMetrics(userId?: string, timeRangeMs: number = 86400000): Promise<{
    totalCost: number;
    engineBreakdown: {
      elevenlabs: number;
      polly: number;
    };
    characterCount: number;
    avgCostPerCharacter: number;
    budgetUtilization: number;
  }> {
    try {
      // For now, return current day metrics
      // In production, this would query a persistent store
      const today = this.getTodayKey();
      const totalCost = this.dailyCosts.get(today) || 0;

      // Rough breakdown (would be more accurate with detailed tracking)
      const elevenLabsCost = totalCost * 0.7; // Assume 70% ElevenLabs
      const pollyCost = totalCost * 0.3; // Assume 30% Polly

      return {
        totalCost,
        engineBreakdown: {
          elevenlabs: elevenLabsCost,
          polly: pollyCost,
        },
        characterCount: Math.round(totalCost / 0.0003), // Rough estimate
        avgCostPerCharacter: totalCost > 0 ? totalCost / Math.round(totalCost / 0.0003) : 0,
        budgetUtilization: totalCost / this.config.dailyBudgetLimit,
      };

    } catch (error) {
      this.logger.error('Failed to get cost metrics', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });

      return {
        totalCost: 0,
        engineBreakdown: { elevenlabs: 0, polly: 0 },
        characterCount: 0,
        avgCostPerCharacter: 0,
        budgetUtilization: 0,
      };
    }
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus(): Promise<{
    dailyBudget: number;
    dailySpent: number;
    remainingBudget: number;
    utilizationPercent: number;
    isNearLimit: boolean;
    isOverBudget: boolean;
  }> {
    const today = this.getTodayKey();
    const dailySpent = this.dailyCosts.get(today) || 0;
    const remainingBudget = Math.max(0, this.config.dailyBudgetLimit - dailySpent);
    const utilizationPercent = (dailySpent / this.config.dailyBudgetLimit) * 100;

    return {
      dailyBudget: this.config.dailyBudgetLimit,
      dailySpent,
      remainingBudget,
      utilizationPercent,
      isNearLimit: utilizationPercent >= 80,
      isOverBudget: dailySpent > this.config.dailyBudgetLimit,
    };
  }

  /**
   * Reset daily costs (called at midnight)
   */
  async resetDailyCosts(): Promise<void> {
    const yesterday = this.getYesterdayKey();
    const today = this.getTodayKey();

    // Archive yesterday's costs (in production, save to persistent storage)
    const yesterdayCost = this.dailyCosts.get(yesterday) || 0;
    if (yesterdayCost > 0) {
      this.logger.info('Daily cost summary', {
        date: yesterday,
        totalCost: yesterdayCost,
        budgetUtilization: (yesterdayCost / this.config.dailyBudgetLimit) * 100,
      });
    }

    // Clear old data
    this.dailyCosts.delete(yesterday);
    
    // Clear old user costs
    const keysToDelete = Array.from(this.userCosts.keys()).filter(key => key.startsWith(yesterday));
    keysToDelete.forEach(key => this.userCosts.delete(key));

    // Initialize today if not exists
    if (!this.dailyCosts.has(today)) {
      this.dailyCosts.set(today, 0);
    }

    this.logger.info('Daily costs reset', { date: today });
  }

  /**
   * Private helper methods
   */

  private estimateRequestCost(characterCount: number): number {
    // Rough estimation based on average pricing
    // ElevenLabs: ~$0.30 per 1K characters
    // Polly: ~$0.016 per 1K characters (Neural)
    // Assume 70% ElevenLabs, 30% Polly for estimation
    const elevenLabsCost = (characterCount / 1000) * 0.30 * 0.7;
    const pollyCost = (characterCount / 1000) * 0.016 * 0.3;
    return elevenLabsCost + pollyCost;
  }

  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private getYesterdayKey(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  private async checkBudgetAlerts(today: string): Promise<void> {
    const dailySpent = this.dailyCosts.get(today) || 0;
    const utilizationPercent = (dailySpent / this.config.dailyBudgetLimit) * 100;

    // Alert at 80% utilization
    if (utilizationPercent >= 80 && utilizationPercent < 90) {
      this.logger.warn('Budget utilization warning', {
        dailySpent,
        dailyBudget: this.config.dailyBudgetLimit,
        utilizationPercent: utilizationPercent.toFixed(1),
      });
    }

    // Critical alert at 90% utilization
    if (utilizationPercent >= 90) {
      this.logger.error('Critical budget utilization', {
        dailySpent,
        dailyBudget: this.config.dailyBudgetLimit,
        utilizationPercent: utilizationPercent.toFixed(1),
      });
    }

    // Over budget alert
    if (dailySpent > this.config.dailyBudgetLimit) {
      this.logger.error('Daily budget exceeded', {
        dailySpent,
        dailyBudget: this.config.dailyBudgetLimit,
        overage: dailySpent - this.config.dailyBudgetLimit,
      });
    }
  }

  private startDailyResetTask(): void {
    // Calculate milliseconds until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    // Set initial timeout for midnight
    setTimeout(() => {
      this.resetDailyCosts();

      // Then set daily interval
      setInterval(() => {
        this.resetDailyCosts();
      }, 24 * 60 * 60 * 1000); // 24 hours

    }, msUntilMidnight);

    this.logger.info('Daily reset task scheduled', {
      nextReset: tomorrow.toISOString(),
      msUntilReset: msUntilMidnight,
    });
  }
}