import { CostOptimizationSystem } from './CostOptimizationSystem';
import { CostAlertingSystem } from './CostAlertingSystem';

export interface DashboardMetrics {
  totalCost: number;
  dailyCost: number;
  monthlyCost: number;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  topServices: Array<{ service: string; cost: number; percentage: number }>;
  topOperations: Array<{ operation: string; cost: number; percentage: number }>;
  cacheEfficiency: number;
  costSavings: number;
  alertCount: number;
  budgetUtilization: Record<string, number>;
}

export interface CostForecast {
  service: string;
  currentMonthlyRun: number;
  projectedMonthlyCost: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  factors: string[];
}

export interface OptimizationRecommendation {
  id: string;
  type: 'caching' | 'model_selection' | 'batching' | 'threshold_adjustment';
  service: string;
  operation?: string;
  description: string;
  estimatedSavings: number;
  effort: 'low' | 'medium' | 'high';
  priority: number;
  implementation: string;
}

export interface DashboardConfig {
  refreshInterval: number; // seconds
  retentionPeriod: number; // days
  budgets: Record<string, number>; // service -> monthly budget
  costTargets: Record<string, number>; // service -> target cost per operation
}

export class CostAnalyticsDashboard {
  private costOptimizer: CostOptimizationSystem;
  private alertingSystem: CostAlertingSystem;
  private config: DashboardConfig;
  private metricsHistory: Array<{ timestamp: Date; metrics: DashboardMetrics }> = [];
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(
    costOptimizer: CostOptimizationSystem,
    alertingSystem: CostAlertingSystem,
    config?: Partial<DashboardConfig>
  ) {
    this.costOptimizer = costOptimizer;
    this.alertingSystem = alertingSystem;
    this.config = {
      refreshInterval: 300, // 5 minutes
      retentionPeriod: 30, // 30 days
      budgets: {
        openai: 2000,
        elevenlabs: 1000
      },
      costTargets: {
        'openai:story-generation': 0.05,
        'elevenlabs:voice-synthesis': 0.10
      },
      ...config
    };

    this.startMetricsCollection();
  }

  /**
   * Clean up resources and stop timers
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Get current dashboard metrics
   */
  getCurrentMetrics(): DashboardMetrics {
    const report = this.costOptimizer.generateAnalyticsReport('daily');
    const activeAlerts = this.alertingSystem.getActiveAlerts();
    
    // Calculate cost trend
    const costTrend = this.calculateCostTrend();
    
    // Calculate budget utilization
    const budgetUtilization: Record<string, number> = {};
    for (const [service, budget] of Object.entries(this.config.budgets)) {
      const monthlyCost = this.costOptimizer.getCurrentCost(service, undefined, 'monthly');
      budgetUtilization[service] = (monthlyCost / budget) * 100;
    }

    // Calculate cache efficiency
    const totalCacheHits = Object.values(report.cacheEfficiency)
      .reduce((sum, cache) => sum + (cache.hitRate * 100), 0);
    const cacheCount = Object.keys(report.cacheEfficiency).length;
    const avgCacheEfficiency = cacheCount > 0 ? totalCacheHits / cacheCount : 0;

    // Calculate cost savings from caching
    const costSavings = Object.values(report.cacheEfficiency)
      .reduce((sum, cache) => sum + cache.costSaved, 0);

    return {
      totalCost: report.totalCost,
      dailyCost: report.totalCost,
      monthlyCost: this.costOptimizer.getCurrentCost('all', undefined, 'monthly'),
      costTrend,
      topServices: Object.entries(report.serviceBreakdown)
        .map(([service, cost]) => ({
          service,
          cost,
          percentage: report.totalCost > 0 ? (cost / report.totalCost) * 100 : 0
        }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5),
      topOperations: report.topCostDrivers.slice(0, 5).map(driver => ({
        operation: driver.key,
        cost: driver.cost,
        percentage: driver.percentage
      })),
      cacheEfficiency: avgCacheEfficiency,
      costSavings,
      alertCount: activeAlerts.length,
      budgetUtilization
    };
  }

  /**
   * Generate cost forecasts for services
   */
  generateCostForecasts(): CostForecast[] {
    const forecasts: CostForecast[] = [];
    
    for (const service of Object.keys(this.config.budgets)) {
      const forecast = this.generateServiceForecast(service);
      if (forecast) {
        forecasts.push(forecast);
      }
    }
    
    return forecasts.sort((a, b) => b.projectedMonthlyCost - a.projectedMonthlyCost);
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const report = this.costOptimizer.generateAnalyticsReport('monthly');
    
    // Caching recommendations
    for (const [cacheKey, efficiency] of Object.entries(report.cacheEfficiency)) {
      if (efficiency.hitRate < 0.5) {
        recommendations.push({
          id: `cache_${cacheKey}`,
          type: 'caching',
          service: cacheKey.split(':')[0] || 'unknown',
          description: `Improve caching strategy for ${cacheKey} (current hit rate: ${(efficiency.hitRate * 100).toFixed(1)}%)`,
          estimatedSavings: efficiency.costSaved * 2, // Potential doubling of savings
          effort: 'medium',
          priority: this.calculatePriority(efficiency.costSaved * 2, 'medium'),
          implementation: 'Optimize cache key generation and increase TTL for stable responses'
        });
      }
    }

    // Model selection recommendations
    for (const [model, usage] of Object.entries(report.modelUsage)) {
      const avgCostPerRequest = usage.cost / usage.usage;
      if (avgCostPerRequest > 0.02) { // High cost per request
        recommendations.push({
          id: `model_${model}`,
          type: 'model_selection',
          service: model.includes('gpt') ? 'openai' : 'elevenlabs',
          description: `Consider using more cost-effective model instead of ${model} (avg cost: $${avgCostPerRequest.toFixed(4)}/request)`,
          estimatedSavings: usage.cost * 0.3, // Estimated 30% savings
          effort: 'low',
          priority: this.calculatePriority(usage.cost * 0.3, 'low'),
          implementation: 'Evaluate alternative models with similar quality scores but lower costs'
        });
      }
    }

    // Batching recommendations
    for (const driver of report.topCostDrivers.slice(0, 3)) {
      if (driver.cost > 50) { // High cost operations
        recommendations.push({
          id: `batch_${driver.key}`,
          type: 'batching',
          service: driver.key.split(':')[0],
          operation: driver.key.split(':')[1],
          description: `Implement request batching for ${driver.key} to reduce API calls`,
          estimatedSavings: driver.cost * 0.2, // Estimated 20% savings
          effort: 'high',
          priority: this.calculatePriority(driver.cost * 0.2, 'high'),
          implementation: 'Group similar requests and process them in batches with appropriate delays'
        });
      }
    }

    // Threshold adjustment recommendations
    for (const [service, utilization] of Object.entries(this.getCurrentMetrics().budgetUtilization)) {
      if (utilization > 90) {
        recommendations.push({
          id: `threshold_${service}`,
          type: 'threshold_adjustment',
          service,
          description: `Budget utilization for ${service} is ${utilization.toFixed(1)}% - consider adjusting thresholds or budget`,
          estimatedSavings: 0,
          effort: 'low',
          priority: this.calculatePriority(0, 'low', utilization),
          implementation: 'Review and adjust cost thresholds or increase budget allocation'
        });
      }
    }

    return recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10); // Top 10 recommendations
  }

  /**
   * Get cost trends over time
   */
  getCostTrends(period: 'hourly' | 'daily' | 'weekly' = 'daily'): Array<{
    timestamp: Date;
    totalCost: number;
    serviceBreakdown: Record<string, number>;
  }> {
    const now = new Date();
    const trends: Array<{
      timestamp: Date;
      totalCost: number;
      serviceBreakdown: Record<string, number>;
    }> = [];

    // Generate trend data based on historical metrics
    const periodCount = period === 'hourly' ? 24 : period === 'daily' ? 30 : 12;
    const periodMs = period === 'hourly' ? 60 * 60 * 1000 : 
                    period === 'daily' ? 24 * 60 * 60 * 1000 : 
                    7 * 24 * 60 * 60 * 1000;

    for (let i = periodCount - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * periodMs);
      
      // Find closest historical metric
      const historicalMetric = this.findClosestHistoricalMetric(timestamp);
      
      if (historicalMetric) {
        trends.push({
          timestamp,
          totalCost: historicalMetric.metrics.totalCost,
          serviceBreakdown: this.extractServiceBreakdown(historicalMetric.metrics)
        });
      } else {
        // Generate estimated data if no historical data available
        trends.push({
          timestamp,
          totalCost: 0,
          serviceBreakdown: {}
        });
      }
    }

    return trends;
  }

  /**
   * Export dashboard data
   */
  exportDashboardData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: this.getCurrentMetrics(),
      forecasts: this.generateCostForecasts(),
      recommendations: this.generateOptimizationRecommendations(),
      trends: this.getCostTrends('daily'),
      alerts: this.alertingSystem.getActiveAlerts(),
      config: this.config
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // Convert to CSV format
      return this.convertToCSV(data);
    }
  }

  /**
   * Get real-time cost updates
   */
  subscribeToRealTimeUpdates(callback: (metrics: DashboardMetrics) => void): () => void {
    const interval = setInterval(() => {
      const metrics = this.getCurrentMetrics();
      callback(metrics);
    }, this.config.refreshInterval * 1000);

    return () => clearInterval(interval);
  }

  /**
   * Generate cost efficiency report
   */
  generateEfficiencyReport(): {
    overallEfficiency: number;
    serviceEfficiency: Record<string, number>;
    recommendations: string[];
    benchmarks: Record<string, { current: number; target: number; status: 'good' | 'warning' | 'poor' }>;
  } {
    const metrics = this.getCurrentMetrics();
    const report = this.costOptimizer.generateAnalyticsReport('monthly');
    
    // Calculate overall efficiency (cost savings / total potential cost)
    const totalPotentialCost = metrics.totalCost + metrics.costSavings;
    const overallEfficiency = totalPotentialCost > 0 ? (metrics.costSavings / totalPotentialCost) * 100 : 0;

    // Calculate service efficiency
    const serviceEfficiency: Record<string, number> = {};
    for (const service of metrics.topServices) {
      const serviceCacheEfficiency = Object.entries(report.cacheEfficiency)
        .filter(([key]) => key.startsWith(service.service))
        .reduce((sum, [, eff]) => sum + eff.hitRate, 0);
      
      serviceEfficiency[service.service] = serviceCacheEfficiency * 100;
    }

    // Generate benchmarks
    const benchmarks: Record<string, { current: number; target: number; status: 'good' | 'warning' | 'poor' }> = {};
    for (const [operation, target] of Object.entries(this.config.costTargets)) {
      const [service, op] = operation.split(':');
      const currentCost = this.costOptimizer.getCurrentCost(service, op, 'daily');
      const status = currentCost <= target ? 'good' : 
                    currentCost <= target * 1.2 ? 'warning' : 'poor';
      
      benchmarks[operation] = {
        current: currentCost,
        target,
        status
      };
    }

    return {
      overallEfficiency,
      serviceEfficiency,
      recommendations: report.recommendations,
      benchmarks
    };
  }

  private calculateCostTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.metricsHistory.length < 2) {
      return 'stable';
    }

    const recent = this.metricsHistory.slice(-5); // Last 5 data points
    const costs = recent.map(m => m.metrics.totalCost);
    
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 1; i < costs.length; i++) {
      if (costs[i] > costs[i - 1]) {
        increasing++;
      } else if (costs[i] < costs[i - 1]) {
        decreasing++;
      }
    }

    if (increasing > decreasing) {
      return 'increasing';
    } else if (decreasing > increasing) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  private generateServiceForecast(service: string): CostForecast | null {
    const monthlyCost = this.costOptimizer.getCurrentCost(service, undefined, 'monthly');
    const dailyCost = this.costOptimizer.getCurrentCost(service, undefined, 'daily');
    
    if (monthlyCost === 0 && dailyCost === 0) {
      return null;
    }

    // Simple linear projection based on current daily rate
    const daysInMonth = 30;
    const currentMonthlyRun = dailyCost * daysInMonth;
    
    // Calculate trend based on recent history
    const recentCosts = this.metricsHistory
      .slice(-7) // Last 7 data points
      .map(m => m.metrics.topServices.find(s => s.service === service)?.cost || 0);
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let confidence = 0.5;
    
    if (recentCosts.length >= 3) {
      const avgEarly = recentCosts.slice(0, Math.floor(recentCosts.length / 2))
        .reduce((sum, cost) => sum + cost, 0) / Math.floor(recentCosts.length / 2);
      const avgLate = recentCosts.slice(Math.floor(recentCosts.length / 2))
        .reduce((sum, cost) => sum + cost, 0) / Math.ceil(recentCosts.length / 2);
      
      if (avgLate > avgEarly * 1.1) {
        trend = 'up';
        confidence = 0.7;
      } else if (avgLate < avgEarly * 0.9) {
        trend = 'down';
        confidence = 0.7;
      } else {
        confidence = 0.8;
      }
    }

    const trendMultiplier = trend === 'up' ? 1.2 : trend === 'down' ? 0.8 : 1.0;
    const projectedMonthlyCost = currentMonthlyRun * trendMultiplier;

    return {
      service,
      currentMonthlyRun,
      projectedMonthlyCost,
      confidence,
      trend,
      factors: this.identifyForecastFactors(service, trend)
    };
  }

  private identifyForecastFactors(service: string, trend: 'up' | 'down' | 'stable'): string[] {
    const factors: string[] = [];
    
    if (trend === 'up') {
      factors.push('Increasing usage patterns');
      factors.push('Higher complexity requests');
    } else if (trend === 'down') {
      factors.push('Improved caching efficiency');
      factors.push('Optimized request patterns');
    }
    
    factors.push('Seasonal usage variations');
    factors.push('Model pricing changes');
    
    return factors;
  }

  private calculatePriority(savings: number, effort: string, urgency?: number): number {
    const savingsScore = Math.min(savings / 100, 1) * 50; // Max 50 points for savings
    const effortScore = effort === 'low' ? 30 : effort === 'medium' ? 20 : 10; // Effort penalty
    const urgencyScore = urgency ? Math.min(urgency / 100, 1) * 20 : 0; // Max 20 points for urgency
    
    return savingsScore + effortScore + urgencyScore;
  }

  private findClosestHistoricalMetric(timestamp: Date): { timestamp: Date; metrics: DashboardMetrics } | null {
    if (this.metricsHistory.length === 0) {
      return null;
    }

    return this.metricsHistory.reduce((closest, current) => {
      const closestDiff = Math.abs(closest.timestamp.getTime() - timestamp.getTime());
      const currentDiff = Math.abs(current.timestamp.getTime() - timestamp.getTime());
      
      return currentDiff < closestDiff ? current : closest;
    });
  }

  private extractServiceBreakdown(metrics: DashboardMetrics): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const service of metrics.topServices) {
      breakdown[service.service] = service.cost;
    }
    
    return breakdown;
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion for metrics
    const headers = ['timestamp', 'totalCost', 'dailyCost', 'monthlyCost', 'cacheEfficiency', 'alertCount'];
    const rows = [headers.join(',')];
    
    rows.push([
      data.timestamp,
      data.metrics.totalCost,
      data.metrics.dailyCost,
      data.metrics.monthlyCost,
      data.metrics.cacheEfficiency,
      data.metrics.alertCount
    ].join(','));
    
    return rows.join('\n');
  }

  private startMetricsCollection(): void {
    // Collect metrics at configured intervals
    this.metricsInterval = setInterval(() => {
      const metrics = this.getCurrentMetrics();
      
      this.metricsHistory.push({
        timestamp: new Date(),
        metrics
      });

      // Clean up old metrics
      const cutoff = new Date(Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000);
      this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoff);
      
    }, this.config.refreshInterval * 1000);
  }
}