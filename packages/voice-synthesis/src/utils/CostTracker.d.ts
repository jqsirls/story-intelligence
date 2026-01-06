import { Logger } from 'winston';
import { CostMetrics } from '../types';
interface CostConfig {
    maxCostPerRequest: number;
    dailyBudgetLimit: number;
    enableCostTracking: boolean;
}
/**
 * Cost tracker for voice synthesis budget management
 * Monitors spending across engines and enforces limits
 */
export declare class CostTracker {
    private config;
    private logger;
    private dailyCosts;
    private userCosts;
    private isInitialized;
    constructor(config: CostConfig, logger: Logger);
    /**
     * Initialize the cost tracker
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the cost tracker
     */
    shutdown(): Promise<void>;
    /**
     * Check if request is within cost limits
     */
    checkLimits(userId: string | undefined, characterCount: number): Promise<void>;
    /**
     * Record actual cost after synthesis
     */
    recordCost(metrics: CostMetrics): Promise<void>;
    /**
     * Get cost metrics for monitoring
     */
    getCostMetrics(userId?: string, timeRangeMs?: number): Promise<{
        totalCost: number;
        engineBreakdown: {
            elevenlabs: number;
            polly: number;
        };
        characterCount: number;
        avgCostPerCharacter: number;
        budgetUtilization: number;
    }>;
    /**
     * Get current budget status
     */
    getBudgetStatus(): Promise<{
        dailyBudget: number;
        dailySpent: number;
        remainingBudget: number;
        utilizationPercent: number;
        isNearLimit: boolean;
        isOverBudget: boolean;
    }>;
    /**
     * Reset daily costs (called at midnight)
     */
    resetDailyCosts(): Promise<void>;
    /**
     * Private helper methods
     */
    private estimateRequestCost;
    private getTodayKey;
    private getYesterdayKey;
    private checkBudgetAlerts;
    private startDailyResetTask;
}
export {};
//# sourceMappingURL=CostTracker.d.ts.map