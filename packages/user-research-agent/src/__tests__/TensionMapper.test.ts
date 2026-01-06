/**
 * Tension Mapper Tests
 */

import { TensionMapper } from '../core/TensionMapper';
import { TrackEvaluation } from '../types';

describe('TensionMapper', () => {
  let mapper: TensionMapper;

  beforeEach(() => {
    mapper = new TensionMapper();
  });

  describe('identifyTensions', () => {
    it('should identify buyer vs user tensions', () => {
      const evaluations: TrackEvaluation[] = [
        {
          trackName: 'buyer_reality_check',
          currentState: 'concerning',
          evidence: [{
            metric: 'Average Duration',
            value: 360,
            source: 'event_store'
          }],
          tensions: [],
          recommendations: [],
          timestamp: new Date()
        },
        {
          trackName: 'user_experience_guardrails',
          currentState: 'concerning',
          evidence: [{
            metric: 'Delight per minute',
            value: 0.3,
            source: 'event_store'
          }],
          tensions: [],
          recommendations: [],
          timestamp: new Date()
        }
      ];

      const tensions = mapper.identifyTensions(evaluations);
      
      expect(tensions.length).toBeGreaterThan(0);
    });

    it('should return empty array when no tensions', () => {
      const evaluations: TrackEvaluation[] = [
        {
          trackName: 'buyer_reality_check',
          currentState: 'healthy',
          evidence: [],
          tensions: [],
          recommendations: [],
          timestamp: new Date()
        }
      ];

      const tensions = mapper.identifyTensions(evaluations);
      
      expect(tensions).toEqual([]);
    });
  });

  describe('prioritizeTensions', () => {
    it('should sort tensions by force choice date', () => {
      const tensions = [
        {
          description: 'Later tension',
          conflictingPriorities: ['A', 'B'],
          forceChoiceBy: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          costOfInaction: 'High'
        },
        {
          description: 'Urgent tension',
          conflictingPriorities: ['C', 'D'],
          forceChoiceBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          costOfInaction: 'Critical'
        }
      ];

      const prioritized = mapper.prioritizeTensions(tensions);
      
      expect(prioritized[0].description).toBe('Urgent tension');
      expect(prioritized[1].description).toBe('Later tension');
    });
  });
});
