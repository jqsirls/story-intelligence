import { PostStorySupportService } from '../services/PostStorySupport';
import { PostStoryAnalysisRequest } from '../types';
import OpenAI from 'openai';
import { createLogger } from 'winston';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('PostStorySupportService', () => {
  let service: PostStorySupportService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockRedis: any;
  let logger: any;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    mockOpenAI = new MockedOpenAI() as jest.Mocked<OpenAI>;
    mockRedis = {
      setEx: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      keys: jest.fn()
    };
    service = new PostStorySupportService(mockOpenAI, mockRedis, logger);
  });

  describe('analyzePostStoryState', () => {
    it('should analyze emotional state after Child Loss story', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                primaryEmotions: ['grief', 'love'],
                intensityLevel: 7,
                stabilityRisk: 'moderate',
                triggerIndicators: ['loss_themes'],
                copingCapacity: 'moderate',
                supportReadiness: true
              })
            }
          }
        }]
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue(mockResponse)
        }
      } as any;

      const request: PostStoryAnalysisRequest = {
        storyId: 'story_123',
        storyType: 'Child Loss',
        storyContent: 'A story about remembering a beloved child...',
        userReaction: {
          userId: 'user123',
          storyId: 'story_123',
          sessionId: 'session_123',
          timestamp: '2024-01-01T00:00:00Z',
          emotionalResponse: {
            felt: ['sadness', 'love'],
            intensity: 7,
            triggered: false,
            overwhelmed: false,
            comforted: true,
            empowered: false,
            processing: true,
            needsSpace: false
          },
          needsSupport: true,
          followUpNeeded: true
        }
      };

      const result = await service.analyzePostStoryState(request);

      expect(result.emotionalAssessment.primaryEmotions).toContain('grief');
      expect(result.emotionalAssessment.intensityLevel).toBe(7);
      expect(result.urgencyLevel).toBe('high'); // Intensity 7 is considered high urgency
      expect(result.recommendedSupport.visualizations).toBeDefined();
      expect(result.recommendedSupport.affirmations).toBeDefined();
    });

    it('should detect crisis indicators', async () => {
      const request: PostStoryAnalysisRequest = {
        storyId: 'story_456',
        storyType: 'Inner Child',
        storyContent: 'A story about healing childhood wounds...',
        userReaction: {
          userId: 'user456',
          storyId: 'story_456',
          sessionId: 'session_456',
          timestamp: '2024-01-01T00:00:00Z',
          emotionalResponse: {
            felt: ['hopeless', 'overwhelmed'],
            intensity: 9,
            triggered: true,
            overwhelmed: true,
            comforted: false,
            empowered: false,
            processing: false,
            needsSpace: true
          },
          needsSupport: true,
          followUpNeeded: true
        }
      };

      const result = await service.analyzePostStoryState(request);

      expect(result.urgencyLevel).toBe('crisis');
      expect(result.professionalReferral).toBe(true);
      expect(result.recommendedSupport.safetyResources).toBeDefined();
    });
  });

  describe('generateImmediateGrounding', () => {
    it('should provide appropriate grounding for high intensity', () => {
      const techniques = service.generateImmediateGrounding(8, ['trauma']);

      expect(techniques.length).toBeGreaterThan(0);
      expect(techniques[0].name).toBe('5-4-3-2-1 Grounding');
      expect(techniques[0].effectiveness).toBe('strong');
    });

    it('should provide breathing techniques for moderate intensity', () => {
      const techniques = service.generateImmediateGrounding(6, []);

      expect(techniques.some(t => t.type === 'breathing')).toBe(true);
    });
  });

  describe('generateVisualizations', () => {
    it('should generate Child Loss specific visualization', () => {
      const visualizations = service.generateVisualizations('Child Loss', 'grieving');

      expect(visualizations.length).toBeGreaterThan(0);
      expect(visualizations[0].title).toBe('Garden of Memory');
      expect(visualizations[0].purpose).toBe('processing');
    });

    it('should generate Inner Child specific visualization', () => {
      const visualizations = service.generateVisualizations('Inner Child', 'healing');

      expect(visualizations.length).toBeGreaterThan(0);
      expect(visualizations[0].title).toBe('Safe Haven');
      expect(visualizations[0].purpose).toBe('empowering');
    });

    it('should generate New Birth specific visualization', () => {
      const visualizations = service.generateVisualizations('New Birth', 'excited');

      expect(visualizations.length).toBeGreaterThan(0);
      expect(visualizations[0].title).toBe('New Beginnings');
      expect(visualizations[0].purpose).toBe('calming');
    });
  });

  describe('generateAffirmations', () => {
    it('should generate universal and story-specific affirmations', () => {
      const affirmations = service.generateAffirmations('Child Loss');

      expect(affirmations.length).toBeGreaterThan(2);
      expect(affirmations.some(a => a.text.includes('worthy of love'))).toBe(true);
      expect(affirmations.some(a => a.text.includes('child'))).toBe(true);
    });

    it('should generate Inner Child specific affirmations', () => {
      const affirmations = service.generateAffirmations('Inner Child');

      expect(affirmations.some(a => a.text.includes('safe to feel'))).toBe(true);
      expect(affirmations.some(a => a.text.includes('compassion'))).toBe(true);
    });
  });

  describe('createSupportSession', () => {
    it('should create appropriate session plan', async () => {
      const request = {
        userId: 'user123',
        storyId: 'story_123',
        emotionalState: {
          felt: ['processing'],
          intensity: 6,
          processing: true
        },
        preferredSupport: ['breathing', 'visualization'],
        timeAvailable: '15 minutes',
        voiceGuidancePreferred: true
      };

      const session = await service.createSupportSession(request);

      expect(session.sessionId).toBeDefined();
      expect(session.duration).toBe('15 minutes');
      expect(session.phases.length).toBeGreaterThan(0);
      expect(session.voiceScript).toBeDefined();
    });

    it('should create shorter session for limited time', async () => {
      const request = {
        userId: 'user123',
        storyId: 'story_123',
        emotionalState: {
          felt: ['overwhelmed'],
          intensity: 8,
          overwhelmed: true
        },
        preferredSupport: ['grounding'],
        timeAvailable: '5 minutes',
        voiceGuidancePreferred: false
      };

      const session = await service.createSupportSession(request);

      expect(session.duration).toBe('5 minutes');
      expect(session.phases.length).toBe(1);
      expect(session.phases[0].name).toBe('Quick Grounding');
    });
  });
});