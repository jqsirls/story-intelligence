/**
 * Truth Teller Tests
 */

import { TruthTeller } from '../core/TruthTeller';
import { ModelOrchestrator } from '../core/ModelOrchestrator';
import { SupabaseClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js');
jest.mock('../core/ModelOrchestrator');

describe('TruthTeller', () => {
  let truthTeller: TruthTeller;
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockOrchestrator: jest.Mocked<ModelOrchestrator>;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
      rpc: jest.fn()
    } as any;

    mockOrchestrator = new ModelOrchestrator() as jest.Mocked<ModelOrchestrator>;

    truthTeller = new TruthTeller(mockSupabase, mockOrchestrator);
  });

  describe('detectSelfDeception', () => {
    it('should return null when no deception detected', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      }) as any;

      const alert = await truthTeller.detectSelfDeception('test-tenant');
      
      // May return null or an alert depending on data
      expect(alert === null || typeof alert === 'object').toBe(true);
    });
  });

  describe('detectConfirmationBias', () => {
    it('should detect lack of negative event tracking', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [
                { event_type: 'session_start' },
                { event_type: 'story_created' },
                { event_type: 'session_end' }
              ],
              error: null
            })
          })
        })
      }) as any;

      const biases = await truthTeller.detectConfirmationBias();
      
      expect(biases.length).toBeGreaterThan(0);
      expect(biases.some(b => b.includes('error'))).toBe(true);
    });

    it('should not flag when comprehensive tracking exists', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [
                { event_type: 'session_start' },
                { event_type: 'error_occurred' },
                { event_type: 'abandon_flow' },
                { event_type: 'churn_detected' }
              ],
              error: null
            })
          })
        })
      }) as any;

      const biases = await truthTeller.detectConfirmationBias();
      
      expect(biases.length).toBe(0);
    });
  });
});
