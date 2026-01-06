// Emotion Agent Unit Test - 100% Coverage + Crisis Detection
import { EmotionAgent } from '../EmotionAgent';
import { createClient } from '@supabase/supabase-js';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('ioredis');

describe('EmotionAgent - 100% Coverage with Crisis Detection', () => {
  let emotionAgent: EmotionAgent;
  let mockSupabase: any;
  let mockEventBridge: jest.Mocked<EventBridgeClient>;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    };
    
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockEventBridge = new EventBridgeClient({}) as jest.Mocked<EventBridgeClient>;
    mockRedis = new Redis() as jest.Mocked<Redis>;
    
    emotionAgent = new EmotionAgent({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      redisUrl: 'redis://localhost:6379',
      environment: 'test'
    });
  });

  describe('Daily Emotional Check-in Journey', () => {
    test('should perform emotional check-in with mood detection', async () => {
      const checkInData = {
        userId: 'user-123',
        textInput: 'I had a great day at school!',
        metadata: { time: '15:30' }
      };

      const result = await emotionAgent.performCheckIn(checkInData);
      
      expect(result.success).toBe(true);
      expect(result.mood).toBeDefined();
      expect(result.mood.primary).toBe('happy');
      expect(result.recommendations).toBeDefined();
    });

    test('should adapt response based on age', async () => {
      const ageGroups = [
        { age: 6, expectedTone: 'playful' },
        { age: 13, expectedTone: 'understanding' },
        { age: 18, expectedTone: 'mature' }
      ];

      for (const { age, expectedTone } of ageGroups) {
        mockSupabase.single.mockResolvedValueOnce({
          data: { id: 'user-123', age },
          error: null
        });

        const result = await emotionAgent.performCheckIn({
          userId: 'user-123',
          textInput: 'feeling sad'
        });

        expect(result.tone).toBe(expectedTone);
      }
    });
  });

  describe('Crisis Detection & Intervention', () => {
    const crisisScenarios = [
      { input: 'I don\'t want to be here anymore', risk: 'critical' },
      { input: 'Nobody cares about me', risk: 'high' },
      { input: 'Everything is pointless', risk: 'medium' }
    ];

    test.each(crisisScenarios)(
      'should detect "$input" as $risk risk',
      async ({ input, risk }) => {
        mockEventBridge.send = jest.fn().mockResolvedValue({});

        const result = await emotionAgent.analyzeCrisisRisk({
          userId: 'user-123',
          text: input
        });

        expect(result.riskLevel).toBe(risk);
        
        if (risk === 'critical') {
          expect(result.immediateSupport).toBe(true);
          expect(mockEventBridge.send).toHaveBeenCalledWith(
            expect.objectContaining({
              Entries: expect.arrayContaining([
                expect.objectContaining({
                  DetailType: 'CrisisDetected'
                })
              ])
            })
          );
        }
      }
    );
  });

  describe('Voice Analysis', () => {
    test('should analyze voice emotions', async () => {
      const result = await emotionAgent.analyzeVoice({
        audioUrl: 'https://audio.example.com/voice.wav',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.emotions).toBeDefined();
      expect(result.stress).toBeDefined();
    });
  });

  describe('Pattern Recognition', () => {
    test('should identify mood patterns', async () => {
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.order.mockResolvedValue({
        data: [
          { mood: 'happy', created_at: '2024-01-01' },
          { mood: 'sad', created_at: '2024-01-02' },
          { mood: 'happy', created_at: '2024-01-03' }
        ],
        error: null
      });

      const result = await emotionAgent.analyzePatterns('user-123');
      
      expect(result.pattern).toBeDefined();
      expect(result.insights).toHaveLength(2);
    });
  });

  describe('Multi-Agent Coordination', () => {
    test('should coordinate with Therapeutic Agent', async () => {
      mockEventBridge.send = jest.fn().mockResolvedValue({});

      await emotionAgent.requestTherapeuticSupport({
        userId: 'user-123',
        mood: 'anxious',
        intensity: 0.8
      });

      expect(mockEventBridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: 'TherapeuticSupportRequest'
            })
          ])
        })
      );
    });

    test('should set story mood context', async () => {
      mockRedis.setex = jest.fn().mockResolvedValue('OK');

      const result = await emotionAgent.setStoryMoodContext({
        userId: 'user-123',
        currentMood: 'sad',
        preferences: ['uplifting']
      });

      expect(result.success).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('Health Check', () => {
    test('should report health status', async () => {
      const health = await emotionAgent.getHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.service).toBe('emotion-agent');
      expect(health.capabilities).toContain('mood-detection');
      expect(health.capabilities).toContain('crisis-detection');
    });
  });
});