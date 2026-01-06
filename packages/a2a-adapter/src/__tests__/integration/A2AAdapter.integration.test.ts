/**
 * A2A Adapter Integration Tests
 * 
 * These tests use real Supabase and Redis instances (test environment)
 */

import { A2AAdapter } from '../../A2AAdapter';
import { A2AAdapterDependencies } from '../../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';

describe('A2AAdapter Integration', () => {
  let adapter: A2AAdapter;
  let supabase: SupabaseClient;
  let logger: Logger;

  beforeAll(() => {
    // Use real test environment
    const supabaseUrl = process.env.SUPABASE_URL || process.env.TEST_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.TEST_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Skip all tests if credentials not configured
      console.warn('Skipping integration tests: Supabase credentials not configured');
      return;
    }

    supabase = createClient(supabaseUrl, supabaseKey);

    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as unknown as Logger;
  });

  beforeEach(() => {
    // Skip if credentials not configured
    if (!supabase) {
      return;
    }

    const baseUrl = process.env.A2A_BASE_URL || 'http://localhost:3000';
    const deps: A2AAdapterDependencies = {
      router: null,
      storytellerAPI: null,
      supabase,
      logger,
      config: {
        baseUrl,
        webhookUrl: process.env.A2A_WEBHOOK_URL || `${baseUrl}/a2a/webhook`,
        healthUrl: process.env.A2A_HEALTH_URL || `${baseUrl}/health`,
        agentId: 'storytailor-agent',
        agentName: 'Storytailor Agent',
        agentVersion: '1.0.0',
        capabilities: ['storytelling', 'emotional-check-in', 'crisis-detection'],
        redis: {
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          keyPrefix: 'a2a-test'
        }
      }
    };

    adapter = new A2AAdapter(deps);
  });

  it('should generate agent card', async () => {
    if (!supabase) {
      return;
    }
    const card = await adapter.getAgentCard();

    expect(card.id).toBe('storytailor-agent');
    expect(card.capabilities).toContain('storytelling');
    expect(card.capabilities).toContain('emotional-check-in');
    expect(card.capabilities).toContain('crisis-detection');
  });

  it('should create and track task', async () => {
    if (!supabase) {
      return;
    }

    const task = await adapter.createTask({
      method: 'test.method',
      params: { test: 'value' },
      clientAgentId: 'test-client',
      sessionId: 'test-session'
    });

    expect(task.taskId).toBeDefined();
    expect(task.state).toBe('submitted');

    const status = await adapter.getTaskStatus(task.taskId);
    expect(status.taskId).toBe(task.taskId);
  });
});
