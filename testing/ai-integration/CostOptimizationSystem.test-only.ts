import { EventEmitter } from 'events';

export interface CostMetrics {
  service: string;
  operation: string;
  cost: number;
  timestamp: Date;
  tokens?: number;
  model?: string;
  duration?: number;
  requestId: string;
}

export interface CostThreshold {
  service: string;
  operation?: string;
  dailyLimit: number;
  monthlyLimit: number;
  alertThreshold: number; // Percentage of limit
}

export interface BudgetAlert {
  service: string;
  operation?: string;
  currentCost: number;
  threshold: number;
  limit: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
}

export interface CacheStrategy {
  key: string;
  ttl: number;
  cost: number;
  hitCount: number;
  missCount: number;
  lastAccessed: Date;
}

export interface ModelCostProfile {
  model: string;
  service: string;
  costPerToken: number;
  costPerRequest: number;
  qualityScore: number;
  averageLatency: number;
  reliability: number;
}

// Test-only version without timers
export class CostOptimizationSystemTestOnly extends EventEmitter {
  private costMetrics: Map<string, CostMetrics[]> = new Map();
  private thresholds: Map<string, CostThreshold> = new Map();
  private cacheStrategies: Map<string, CacheStrategy> = new Map();
  private modelProfiles: Map<string, ModelCostProfile> = new Map();
  private dailyCosts: Map<string, number> = new Map();
  private monthlyCosts: Map<string, number> = new Map();

  constructor() {
    super();
    this.initializeDefaultThresholds();
    this.initializeModelProfiles();
    // NO TIMERS FOR TESTING
  }

  /**
   * Track usage costs for AI services
   */
  trackUsageCosts(service: string, operation: string, cost: number, metadata?: {
    tokens?: number;
    model?: string;
    duration?: number;
    requestId?: string;
  }): void {
    const metric: CostMetrics = {
      service,
      operation,
      cost,
      timestamp: new Date(),
      requestId: metadata?.requestId || this.generateRequestId(),
      ...metadata
    };

    // Store metric
    const key = `${service}:${operation}`;
    if (!this.costMetrics.has(key)) {
      this.costMetrics.set(key, []);
    }
    this.costMetrics.get(key)!.push(metric);

    // Update daily/monthly totals
    this.updateCostTotals(service, operation, cost);

    // Check thresholds
    this.checkThresholds(service, operation);

    this.emit('costTracked', metric);
  }

  /**
   * Set cost thresholds for services
   */
  setCostThreshold(threshold: CostThreshold): void {
    const key = threshold.operation 
      ? `${threshold.service}:${threshold.operation}`
      : threshold.service;
    
    this.thresholds.set(key, threshold);
    this.emit('thresholdSet', threshold);
  }

  /**
   * Get current cost for a service/operation
   */
  getCurrentCost(service: string, operation?: string, period: 'daily' | 'monthly' = 'daily'): number {
    const key = operation ? `${service}:${operation}` : service;
    const costMap = period === 'daily' ? this.dailyCosts : this.monthlyCosts;
    
    return costMap.get(key) || 0;
  }

  /**
   * Implement intelligent caching strategy
   */
  implementCaching(cacheKey: string, ttl: number, cost: number): CacheStrategy {
    const strategy: CacheStrategy = {
      key: cacheKey,
      ttl,
      cost,
      hitCount: 0,
      missCount: 0,
      lastAccessed: new Date()
    };

    this.cacheStrategies.set(cacheKey, strategy);
    this.emit('cacheStrategyImplemented', strategy);
    
    return strategy;
  }

  /**
   * Record cache hit/miss
   */
  recordCacheEvent(cacheKey: string, hit: boolean): void {
    const strategy = this.cacheStrategies.get(cacheKey);
    if (strategy) {
      if (hit) {
        strategy.hitCount++;
      } else {
        strategy.missCount++;
      }
      strategy.lastAccessed = new Date();
      
      this.emit('cacheEvent', { cacheKey, hit, strategy });
    }
  }

  /**
   * Optimize model selection based on cost/quality requirements
   */
  optimizeModelSelection(
    service: string,
    qualityRequirement: number,
    maxCost?: number
  ): ModelCostProfile | null {
    const serviceModels = Array.from(this.modelProfiles.values())
      .filter(profile => profile.service === service);

    if (serviceModels.length === 0) {
      return null;
    }

    // Filter by quality requirement
    let candidates = serviceModels.filter(
      profile => profile.qualityScore >= qualityRequirement
    );

    if (candidates.length === 0) {
      // If no models meet quality requirement, return best quality available
      candidates = serviceModels.sort((a, b) => b.qualityScore - a.qualityScore);
    }

    // Filter by cost if specified
    if (maxCost !== undefined) {
      candidates = candidates.filter(
        profile => profile.costPerRequest <= maxCost
      );
    }

    if (candidates.length === 0) {
      return null;
    }

    // Select best cost/quality ratio
    const optimized = candidates.reduce((best, current) => {
      const bestRatio = best.qualityScore / (best.costPerRequest || 1);
      const currentRatio = current.qualityScore / (current.costPerRequest || 1);
      
      return currentRatio > bestRatio ? current : best;
    });

    this.emit('modelOptimized', { service, selected: optimized, candidates });
    
    return optimized;
  }

  /**
   * Generate detailed analytics report
   */
  generateAnalyticsReport(period: 'daily' | 'weekly' | 'monthly' = 'daily'): {
    totalCost: number;
    serviceBreakdown: Record<string, number>;
    operationBreakdown: Record<string, number>;
    topCostDrivers: Array<{ key: string; cost: number; percentage: number }>;
    cacheEfficiency: Record<string, { hitRate: number; costSaved: number }>;
    modelUsage: Record<string, { usage: number; cost: number; avgQuality: number }>;
    recommendations: string[];
  } {
    const now = new Date();
    const startDate = this.getStartDate(now, period);
    
    let totalCost = 0;
    const serviceBreakdown: Record<string, number> = {};
    const operationBreakdown: Record<string, number> = {};
    const modelUsage: Record<string, { usage: number; cost: number; avgQuality: number }> = {};

    // Analyze cost metrics
    for (const [key, metrics] of this.costMetrics.entries()) {
      const periodMetrics = metrics.filter(m => m.timestamp >= startDate);
      
      for (const metric of periodMetrics) {
        totalCost += metric.cost;
        
        // Service breakdown
        serviceBreakdown[metric.service] = (serviceBreakdown[metric.service] || 0) + metric.cost;
        
        // Operation breakdown
        const opKey = `${metric.service}:${metric.operation}`;
        operationBreakdown[opKey] = (operationBreakdown[opKey] || 0) + metric.cost;
        
        // Model usage
        if (metric.model) {
          if (!modelUsage[metric.model]) {
            modelUsage[metric.model] = { usage: 0, cost: 0, avgQuality: 0 };
          }
          modelUsage[metric.model].usage++;
          modelUsage[metric.model].cost += metric.cost;
          
          const profile = this.modelProfiles.get(metric.model);
          if (profile) {
            modelUsage[metric.model].avgQuality = profile.qualityScore;
          }
        }
      }
    }

    // Calculate top cost drivers
    const topCostDrivers = Object.entries(operationBreakdown)
      .map(([key, cost]) => ({
        key,
        cost,
        percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    // Calculate cache efficiency
    const cacheEfficiency: Record<string, { hitRate: number; costSaved: number }> = {};
    for (const [key, strategy] of this.cacheStrategies.entries()) {
      const totalRequests = strategy.hitCount + strategy.missCount;
      const hitRate = totalRequests > 0 ? strategy.hitCount / totalRequests : 0;
      const costSaved = strategy.hitCount * strategy.cost;
      
      cacheEfficiency[key] = { hitRate, costSaved };
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      serviceBreakdown,
      cacheEfficiency,
      modelUsage
    );

    return {
      totalCost,
      serviceBreakdown,
      operationBreakdown,
      topCostDrivers,
      cacheEfficiency,
      modelUsage,
      recommendations
    };
  }

  /**
   * Monitor budget thresholds and send alerts
   */
  monitorBudgetThresholds(service: string, budget: number): BudgetAlert[] {
    const alerts: BudgetAlert[] = [];
    const currentCost = this.getCurrentCost(service, undefined, 'monthly');
    
    const threshold = this.thresholds.get(service);
    if (threshold) {
      const alertThresholdAmount = budget * (threshold.alertThreshold / 100);
      
      if (currentCost >= budget) {
        alerts.push({
          service,
          currentCost,
          threshold: budget,
          limit: budget,
          severity: 'critical',
          timestamp: new Date()
        });
      } else if (currentCost >= alertThresholdAmount) {
        alerts.push({
          service,
          currentCost,
          threshold: alertThresholdAmount,
          limit: budget,
          severity: 'warning',
          timestamp: new Date()
        });
      }
    }

    if (alerts.length > 0) {
      this.emit('budgetAlert', alerts);
    }

    return alerts;
  }

  private initializeDefaultThresholds(): void {
    // OpenAI thresholds
    this.setCostThreshold({
      service: 'openai',
      dailyLimit: 100,
      monthlyLimit: 2000,
      alertThreshold: 80
    });

    // ElevenLabs thresholds
    this.setCostThreshold({
      service: 'elevenlabs',
      dailyLimit: 50,
      monthlyLimit: 1000,
      alertThreshold: 75
    });
  }

  private initializeModelProfiles(): void {
    // OpenAI model profiles
    this.modelProfiles.set('gpt-4', {
      model: 'gpt-4',
      service: 'openai',
      costPerToken: 0.00003,
      costPerRequest: 0.01,
      qualityScore: 0.95,
      averageLatency: 2000,
      reliability: 0.99
    });

    this.modelProfiles.set('gpt-3.5-turbo', {
      model: 'gpt-3.5-turbo',
      service: 'openai',
      costPerToken: 0.000002,
      costPerRequest: 0.002,
      qualityScore: 0.85,
      averageLatency: 1000,
      reliability: 0.98
    });

    // ElevenLabs voice profiles
    this.modelProfiles.set('eleven_multilingual_v2', {
      model: 'eleven_multilingual_v2',
      service: 'elevenlabs',
      costPerToken: 0.0001,
      costPerRequest: 0.05,
      qualityScore: 0.92,
      averageLatency: 3000,
      reliability: 0.97
    });
  }

  private updateCostTotals(service: string, operation: string, cost: number): void {
    const serviceKey = service;
    const operationKey = `${service}:${operation}`;
    
    // Update daily costs
    this.dailyCosts.set(serviceKey, (this.dailyCosts.get(serviceKey) || 0) + cost);
    this.dailyCosts.set(operationKey, (this.dailyCosts.get(operationKey) || 0) + cost);
    
    // Update monthly costs
    this.monthlyCosts.set(serviceKey, (this.monthlyCosts.get(serviceKey) || 0) + cost);
    this.monthlyCosts.set(operationKey, (this.monthlyCosts.get(operationKey) || 0) + cost);
  }

  private checkThresholds(service: string, operation: string): void {
    const serviceThreshold = this.thresholds.get(service);
    const operationThreshold = this.thresholds.get(`${service}:${operation}`);
    
    [serviceThreshold, operationThreshold].forEach(threshold => {
      if (threshold) {
        const dailyCost = this.getCurrentCost(threshold.service, threshold.operation, 'daily');
        const monthlyCost = this.getCurrentCost(threshold.service, threshold.operation, 'monthly');
        
        // Check daily threshold
        if (dailyCost >= threshold.dailyLimit * (threshold.alertThreshold / 100)) {
          this.emit('thresholdExceeded', {
            service: threshold.service,
            operation: threshold.operation,
            type: 'daily',
            current: dailyCost,
            threshold: threshold.dailyLimit * (threshold.alertThreshold / 100),
            limit: threshold.dailyLimit
          });
        }
        
        // Check monthly threshold
        if (monthlyCost >= threshold.monthlyLimit * (threshold.alertThreshold / 100)) {
          this.emit('thresholdExceeded', {
            service: threshold.service,
            operation: threshold.operation,
            type: 'monthly',
            current: monthlyCost,
            threshold: threshold.monthlyLimit * (threshold.alertThreshold / 100),
            limit: threshold.monthlyLimit
          });
        }
      }
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStartDate(now: Date, period: 'daily' | 'weekly' | 'monthly'): Date {
    const start = new Date(now);
    
    switch (period) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    
    return start;
  }

  private generateRecommendations(
    serviceBreakdown: Record<string, number>,
    cacheEfficiency: Record<string, { hitRate: number; costSaved: number }>,
    modelUsage: Record<string, { usage: number; cost: number; avgQuality: number }>
  ): string[] {
    const recommendations: string[] = [];
    
    // Analyze service costs
    const totalCost = Object.values(serviceBreakdown).reduce((sum, cost) => sum + cost, 0);
    const topService = Object.entries(serviceBreakdown)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topService && topService[1] > totalCost * 0.6) {
      recommendations.push(`Consider optimizing ${topService[0]} usage - it accounts for ${((topService[1] / totalCost) * 100).toFixed(1)}% of total costs`);
    }
    
    // Analyze cache efficiency
    for (const [key, efficiency] of Object.entries(cacheEfficiency)) {
      if (efficiency.hitRate < 0.5) {
        recommendations.push(`Improve caching strategy for ${key} - current hit rate is ${(efficiency.hitRate * 100).toFixed(1)}%`);
      }
    }
    
    // Analyze model usage
    const expensiveModels = Object.entries(modelUsage)
      .filter(([, usage]) => usage.cost / usage.usage > 0.01)
      .sort(([,a], [,b]) => (b.cost / b.usage) - (a.cost / a.usage));
    
    if (expensiveModels.length > 0) {
      recommendations.push(`Consider using more cost-effective models for ${expensiveModels[0][0]} - average cost per request is $${(expensiveModels[0][1].cost / expensiveModels[0][1].usage).toFixed(4)}`);
    }
    
    return recommendations;
  }
}