/**
 * Cost Controller - Per-tenant cost monitoring and throttling
 * Prevents runaway costs through budget enforcement
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { CostTracking } from '../types';
import { Logger } from '../utils/logger';

export interface ThrottleConfig {
  samplingRate: number;
  useModel: string;
  skipNonCritical: boolean;
}

export class CostController {
  private supabase: SupabaseClient;
  private logger: Logger;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.logger = new Logger('CostController');
  }

  /**
   * Check if analysis should proceed
   */
  async beforeAnalysis(
    tenantId: string,
    estimatedCost: number
  ): Promise<{ allow: boolean; throttle: ThrottleConfig | null; reason?: string }> {
    const costStatus = await this.getCurrentCostStatus(tenantId);

    if (!costStatus) {
      this.logger.warn(`No cost tracking found for tenant ${tenantId}, allowing analysis`);
      return { allow: true, throttle: null };
    }

    const projectedTotal = costStatus.estimatedCost + estimatedCost;
    const projectedPercentage = projectedTotal / costStatus.costLimit;

    // Hard block at 100%
    if (projectedPercentage >= 1.0) {
      this.logger.warn(`Cost limit reached for tenant ${tenantId}`);
      await this.notifyTenantOwner(tenantId, 'usage_limit_reached');
      return { allow: false, throttle: null, reason: 'monthly_budget_exceeded' };
    }

    // Throttle at 90%
    if (projectedPercentage >= 0.9) {
      this.logger.info(`Throttling tenant ${tenantId} at ${(projectedPercentage * 100).toFixed(1)}% budget`);
      return {
        allow: true,
        throttle: {
          samplingRate: 0.5,
          useModel: 'gpt-4o-mini',
          skipNonCritical: true
        }
      };
    }

    // Warn at 80%
    if (projectedPercentage >= 0.8) {
      this.logger.info(`Warning threshold for tenant ${tenantId} at ${(projectedPercentage * 100).toFixed(1)}% budget`);
      await this.notifyTenantOwner(tenantId, 'usage_warning');
    }

    // Normal operation under 80%
    return { allow: true, throttle: null };
  }

  /**
   * Record actual cost after analysis
   */
  async afterAnalysis(
    tenantId: string,
    operation: string,
    model: string,
    tokensUsed: number,
    actualCost: number,
    duration: number
  ): Promise<void> {
    await this.supabase.rpc('record_research_usage', {
      p_tenant_id: tenantId,
      p_operation: operation,
      p_model: model,
      p_tokens_used: tokensUsed,
      p_cost: actualCost,
      p_duration: duration
    });

    this.logger.info(
      `Recorded usage for ${tenantId}: ${operation} using ${model}, ` +
      `${tokensUsed} tokens, $${actualCost.toFixed(4)}, ${duration}ms`
    );

    // Update cost tracking status
    await this.updateCostStatus(tenantId);
  }

  /**
   * Get current cost status for tenant
   */
  async getCurrentCostStatus(tenantId: string): Promise<CostTracking | null> {
    const { data, error } = await this.supabase
      .rpc('get_tenant_cost_status', { p_tenant_id: tenantId });

    if (error) {
      this.logger.error('Failed to get cost status', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const status = data[0];
    return {
      tenantId,
      period: 'month',
      periodStart: new Date(),
      periodEnd: new Date(),
      eventsProcessed: 0,
      llmTokensUsed: {
        'gpt-4o-mini': 0,
        'claude-haiku': 0,
        'claude-sonnet': 0
      },
      analysesGenerated: 0,
      estimatedCost: status.current_cost || 0,
      costLimit: status.cost_limit || 300,
      status: status.status || 'normal'
    };
  }

  /**
   * Initialize cost tracking for a new period
   */
  async initializeCostTracking(
    tenantId: string,
    costLimit: number
  ): Promise<void> {
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await this.supabase
      .from('research_cost_tracking')
      .insert([{
        tenant_id: tenantId,
        period: 'month',
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        events_processed: 0,
        llm_tokens_used: {
          'gpt-4o-mini': 0,
          'claude-haiku': 0,
          'claude-sonnet': 0
        },
        analyses_generated: 0,
        estimated_cost: 0,
        cost_limit: costLimit,
        status: 'normal'
      }]);

    this.logger.info(`Initialized cost tracking for tenant ${tenantId}`);
  }

  /**
   * Update cost status after usage
   */
  private async updateCostStatus(tenantId: string): Promise<void> {
    const costStatus = await this.getCurrentCostStatus(tenantId);
    if (!costStatus) return;

    const percentage = costStatus.estimatedCost / costStatus.costLimit;
    
    let newStatus: 'normal' | 'warning' | 'throttled' | 'blocked';
    if (percentage >= 1.0) {
      newStatus = 'blocked';
    } else if (percentage >= 0.9) {
      newStatus = 'throttled';
    } else if (percentage >= 0.8) {
      newStatus = 'warning';
    } else {
      newStatus = 'normal';
    }

    if (newStatus !== costStatus.status) {
      this.logger.info(`Cost status changed for ${tenantId}: ${costStatus.status} → ${newStatus}`);
    }
  }

  /**
   * Notify tenant owner of cost status
   */
  private async notifyTenantOwner(
    tenantId: string,
    eventType: 'usage_warning' | 'usage_limit_reached'
  ): Promise<void> {
    // This would trigger notification via configured channels
    // Implementation delegated to delivery adapters
    this.logger.info(`Notification queued for ${tenantId}: ${eventType}`);
  }

  /**
   * Get cost statistics for tenant
   */
  async getCostStatistics(tenantId: string): Promise<any> {
    const { data: usage, error } = await this.supabase
      .from('research_usage_metrics')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      this.logger.error('Failed to get usage statistics', error);
      return null;
    }

    if (!usage || usage.length === 0) {
      return {
        totalCost: 0,
        totalTokens: 0,
        operationCount: 0
      };
    }

    const totalCost = usage.reduce((sum, u) => sum + parseFloat(u.cost), 0);
    const totalTokens = usage.reduce((sum, u) => sum + u.tokens_used, 0);
    
    const byModel: any = {};
    for (const u of usage) {
      if (!byModel[u.model]) {
        byModel[u.model] = { count: 0, cost: 0, tokens: 0 };
      }
      byModel[u.model].count++;
      byModel[u.model].cost += parseFloat(u.cost);
      byModel[u.model].tokens += u.tokens_used;
    }

    return {
      totalCost: totalCost.toFixed(2),
      totalTokens,
      operationCount: usage.length,
      byModel,
      avgCostPerOperation: (totalCost / usage.length).toFixed(4)
    };
  }

  /**
   * Reset cost tracking for new period
   */
  async resetForNewPeriod(tenantId: string): Promise<void> {
    const { data: tenant } = await this.supabase
      .from('research_tenants')
      .select('cost_limit')
      .eq('tenant_id', tenantId)
      .single();

    if (!tenant) {
      this.logger.error(`Tenant not found: ${tenantId}`);
      return;
    }

    await this.initializeCostTracking(tenantId, tenant.cost_limit);
    this.logger.info(`Reset cost tracking for new period: ${tenantId}`);
  }

  /**
   * Check cost limit (alias for getCurrentCostStatus with status format)
   */
  async checkLimit(tenantId: string): Promise<{ status: 'normal' | 'warning' | 'blocked'; cost: number; limit: number }> {
    const costStatus = await this.getCurrentCostStatus(tenantId);
    
    if (!costStatus) {
      return { status: 'normal', cost: 0, limit: 300 };
    }

    const percentage = costStatus.estimatedCost / costStatus.costLimit;
    
    let status: 'normal' | 'warning' | 'blocked';
    if (percentage >= 1.0) {
      status = 'blocked';
    } else if (percentage >= 0.8) {
      status = 'warning';
    } else {
      status = 'normal';
    }

    return {
      status,
      cost: costStatus.estimatedCost,
      limit: costStatus.costLimit
    };
  }

  /**
   * Reset period (alias for resetForNewPeriod)
   */
  async resetPeriod(tenantId: string): Promise<void> {
    return this.resetForNewPeriod(tenantId);
  }
}
