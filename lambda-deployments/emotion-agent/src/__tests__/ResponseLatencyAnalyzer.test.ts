import { ResponseLatencyAnalyzer } from '../services/ResponseLatencyAnalyzer';
import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';

// Mock dependencies
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn() })) })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({ data: [], error: null }))
        }))
      }))
    }))
  }))
} as unknown as SupabaseClient;

const mockRedis = {
  get: jest.fn(),
  setEx: jest.fn(),
  quit: jest.fn()
} as unknown as RedisClientType;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
} as unknown as Logger;

describe('ResponseLatencyAnalyzer', () => {
  let analyzer: ResponseLatencyAnalyzer;

  beforeEach(() => {
    analyzer = new ResponseLatencyAnalyzer(mockSupabase, mockRedis, mockLogger);
    jest.clearAllMocks();
  });

  describe('recordResponseLatency', () => {
    const mockLatencyData = {
      userId: 'user-123',
      sessionId: 'session-456',
      questionType: 'character_trait' as const,
      question: 'What color is your character\'s hair?',
      responseTime: 3500,
      timestamp: '2024-01-01T12:00:00Z'
    };

    it('should record response latency data successfully', async () => {
      const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn() })) }));
      (mockSupabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      await analyzer.recordResponseLatency(mockLatencyData);

      expect(mockSupabase.from).toHaveBeenCalledWith('response_latency_data');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: mockLatencyData.userId,
        session_id: mockLatencyData.sessionId,
        question_type: mockLatencyData.questionType,
        question: mockLatencyData.question,
        response_time: mockLatencyData.responseTime,
        context: mockLatencyData.context,
        created_at: mockLatencyData.timestamp
      });
    });

    it('should cache recent data in Redis', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify([
        { responseTime: 2000, questionType: 'general', timestamp: '2024-01-01T11:00:00Z' }
      ]));

      await analyzer.recordResponseLatency(mockLatencyData);

      expect(mockRedis.get).toHaveBeenCalledWith(`latency:${mockLatencyData.userId}:${mockLatencyData.sessionId}`);
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `latency:${mockLatencyData.userId}:${mockLatencyData.sessionId}`,
        3600,
        expect.stringContaining(mockLatencyData.responseTime.toString())
      );
    });

    it('should handle Redis cache miss gracefully', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);

      await analyzer.recordResponseLatency(mockLatencyData);

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `latency:${mockLatencyData.userId}:${mockLatencyData.sessionId}`,
        3600,
        expect.stringContaining(mockLatencyData.responseTime.toString())
      );
    });

    it('should log recording activity', async () => {
      await analyzer.recordResponseLatency(mockLatencyData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Recording response latency',
        expect.objectContaining({
          userId: mockLatencyData.userId,
          sessionId: mockLatencyData.sessionId,
          responseTime: mockLatencyData.responseTime,
          questionType: mockLatencyData.questionType
        })
      );
    });
  });

  describe('analyzeEngagementMetrics', () => {
    const userId = 'user-123';
    const sessionId = 'session-456';

    it('should analyze engagement metrics successfully', async () => {
      const mockLatencyData = [
        { response_time: 2000, created_at: '2024-01-01T12:00:00Z' },
        { response_time: 3000, created_at: '2024-01-01T12:01:00Z' },
        { response_time: 2500, created_at: '2024-01-01T12:02:00Z' }
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({ data: mockLatencyData, error: null }))
            }))
          }))
        }))
      });

      const result = await analyzer.analyzeEngagementMetrics(userId, sessionId);

      expect(result).toHaveProperty('averageResponseTime');
      expect(result).toHaveProperty('responseTimeVariance');
      expect(result).toHaveProperty('engagementLevel');
      expect(result).toHaveProperty('attentionSpan');
      expect(result).toHaveProperty('fatigueIndicators');
      expect(result).toHaveProperty('recommendations');

      expect(result.averageResponseTime).toBe(2500); // (2000 + 3000 + 2500) / 3
      expect(['high', 'medium', 'low']).toContain(result.engagementLevel);
      expect(Array.isArray(result.fatigueIndicators)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should return default metrics when no data available', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({ data: [], error: null }))
            }))
          }))
        }))
      });

      const result = await analyzer.analyzeEngagementMetrics(userId, sessionId);

      expect(result.averageResponseTime).toBe(3000);
      expect(result.engagementLevel).toBe('medium');
      expect(result.attentionSpan).toBe(300);
    });

    it('should detect high engagement for optimal response times', async () => {
      const optimalLatencyData = [
        { response_time: 3000, created_at: '2024-01-01T12:00:00Z' },
        { response_time: 3500, created_at: '2024-01-01T12:01:00Z' },
        { response_time: 4000, created_at: '2024-01-01T12:02:00Z' }
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({ data: optimalLatencyData, error: null }))
            }))
          }))
        }))
      });

      const result = await analyzer.analyzeEngagementMetrics(userId, sessionId);

      expect(result.engagementLevel).toBe('high');
    });

    it('should detect low engagement for slow response times', async () => {
      const slowLatencyData = [
        { response_time: 10000, created_at: '2024-01-01T12:00:00Z' },
        { response_time: 12000, created_at: '2024-01-01T12:01:00Z' },
        { response_time: 15000, created_at: '2024-01-01T12:02:00Z' }
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({ data: slowLatencyData, error: null }))
            }))
          }))
        }))
      });

      const result = await analyzer.analyzeEngagementMetrics(userId, sessionId);

      expect(result.engagementLevel).toBe('low');
      expect(result.recommendations).toContain('Consider more interactive or engaging content');
    });
  });

  describe('detectInterventionTriggers', () => {
    const userId = 'user-123';
    const sessionId = 'session-456';

    it('should detect fatigue intervention triggers', async () => {
      const fatigueLatencyData = [
        { response_time: 2000, created_at: '2024-01-01T12:00:00Z' },
        { response_time: 4000, created_at: '2024-01-01T12:01:00Z' },
        { response_time: 8000, created_at: '2024-01-01T12:02:00Z' },
        { response_time: 12000, created_at: '2024-01-01T12:03:00Z' }
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({ data: fatigueLatencyData, error: null }))
            }))
          }))
        }))
      });

      const result = await analyzer.detectInterventionTriggers(userId, sessionId);

      expect(result.interventionNeeded).toBe(true);
      expect(['fatigue', 'distress', 'disengagement', 'confusion']).toContain(result.triggerType);
      expect(['low', 'medium', 'high']).toContain(result.severity);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should detect distress patterns from extreme response times', async () => {
      const distressLatencyData = [
        { response_time: 300, created_at: '2024-01-01T12:00:00Z' }, // Very fast
        { response_time: 20000, created_at: '2024-01-01T12:01:00Z' }, // Very slow
        { response_time: 400, created_at: '2024-01-01T12:02:00Z' }, // Very fast
        { response_time: 25000, created_at: '2024-01-01T12:03:00Z' } // Very slow
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({ data: distressLatencyData, error: null }))
            }))
          }))
        }))
      });

      const result = await analyzer.detectInterventionTriggers(userId, sessionId);

      expect(result.interventionNeeded).toBe(true);
      expect(result.triggerType).toBe('distress');
      expect(result.recommendations).toContain('Check if the child needs emotional support');
    });

    it('should not trigger intervention for normal patterns', async () => {
      const normalLatencyData = [
        { response_time: 3000, created_at: '2024-01-01T12:00:00Z' },
        { response_time: 3500, created_at: '2024-01-01T12:01:00Z' },
        { response_time: 4000, created_at: '2024-01-01T12:02:00Z' },
        { response_time: 3200, created_at: '2024-01-01T12:03:00Z' }
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({ data: normalLatencyData, error: null }))
            }))
          }))
        }))
      });

      const result = await analyzer.detectInterventionTriggers(userId, sessionId);

      expect(result.interventionNeeded).toBe(false);
    });
  });

  describe('analyzeEngagementPatterns', () => {
    const userId = 'user-123';
    const timeRange = {
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-07T23:59:59Z'
    };

    it('should analyze engagement patterns over time', async () => {
      const mockSessions = [
        { session_id: 'session-1', created_at: '2024-01-01T12:00:00Z' },
        { session_id: 'session-2', created_at: '2024-01-02T12:00:00Z' }
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({ data: mockSessions, error: null }))
              }))
            }))
          }))
        }))
      });

      const result = await analyzer.analyzeEngagementPatterns(userId, timeRange);

      expect(Array.isArray(result)).toBe(true);
      // Would contain engagement patterns for each session
    });

    it('should handle empty session data', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({ data: [], error: null }))
              }))
            }))
          }))
        }))
      });

      const result = await analyzer.analyzeEngagementPatterns(userId, timeRange);

      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn(() => {
          throw new Error('Database error');
        })
      });

      const mockLatencyData = {
        userId: 'user-123',
        sessionId: 'session-456',
        questionType: 'general' as const,
        question: 'Test question',
        responseTime: 3000,
        timestamp: '2024-01-01T12:00:00Z'
      };

      await expect(analyzer.recordResponseLatency(mockLatencyData)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle Redis errors without breaking main functionality', async () => {
      (mockRedis.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const mockLatencyData = {
        userId: 'user-123',
        sessionId: 'session-456',
        questionType: 'general' as const,
        question: 'Test question',
        responseTime: 3000,
        timestamp: '2024-01-01T12:00:00Z'
      };

      // Should not throw even if Redis fails
      await analyzer.recordResponseLatency(mockLatencyData);
      
      expect(mockSupabase.from).toHaveBeenCalled(); // Database operation should still proceed
    });
  });
});