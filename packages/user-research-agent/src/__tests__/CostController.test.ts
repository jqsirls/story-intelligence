/**
 * Cost Controller Tests
 */

import { CostController } from '../core/CostController';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js');

describe('CostController', () => {
  let controller: CostController;
  let mockSupabase: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    mockSupabase = {
      rpc: jest.fn(),
      from: jest.fn()
    } as any;

    controller = new CostController(mockSupabase);
  });

  describe('beforeAnalysis', () => {
    it('should allow analysis when under 80% budget', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{
          current_cost: 200,
          cost_limit: 300,
          percentage_used: 66.67,
          status: 'normal'
        }],
        error: null
      } as any);

      const result = await controller.beforeAnalysis('test-tenant', 10);
      
      expect(result.allow).toBe(true);
      expect(result.throttle).toBeNull();
    });

    it('should throttle at 90% budget', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{
          current_cost: 270,
          cost_limit: 300,
          percentage_used: 90,
          status: 'throttled'
        }],
        error: null
      } as any);

      const result = await controller.beforeAnalysis('test-tenant', 10);
      
      expect(result.allow).toBe(true);
      expect(result.throttle).not.toBeNull();
      expect(result.throttle?.samplingRate).toBeLessThan(1.0);
    });

    it('should block at 100% budget', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{
          current_cost: 300,
          cost_limit: 300,
          percentage_used: 100,
          status: 'blocked'
        }],
        error: null
      } as any);

      const result = await controller.beforeAnalysis('test-tenant', 10);
      
      expect(result.allow).toBe(false);
      expect(result.reason).toBe('monthly_budget_exceeded');
    });
  });

  describe('afterAnalysis', () => {
    it('should record usage metrics', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null } as any);

      await controller.afterAnalysis(
        'test-tenant',
        'weekly_brief',
        'claude-sonnet',
        50000,
        2.5,
        5000
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'record_research_usage',
        expect.objectContaining({
          p_tenant_id: 'test-tenant',
          p_operation: 'weekly_brief',
          p_model: 'claude-sonnet',
          p_tokens_used: 50000,
          p_cost: 2.5,
          p_duration: 5000
        })
      );
    });
  });

  describe('initializeCostTracking', () => {
    it('should initialize cost tracking for new period', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null })
      });
      mockSupabase.from = mockFrom as any;

      await controller.initializeCostTracking('test-tenant', 300);

      expect(mockFrom).toHaveBeenCalledWith('research_cost_tracking');
    });
  });
});
