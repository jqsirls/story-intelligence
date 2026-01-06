import { ContentSafetyPipeline } from '../ContentSafetyPipeline';
import { ContentSafetyConfig, ContentSafetyRequest } from '../types';

// Mock dependencies
jest.mock('openai');
jest.mock('@supabase/supabase-js');
jest.mock('redis');
jest.mock('winston');

describe('ContentSafetyPipeline', () => {
  let pipeline: ContentSafetyPipeline;
  let mockConfig: ContentSafetyConfig;

  beforeEach(() => {
    mockConfig = {
      openaiApiKey: 'test-key',
      supabaseUrl: 'test-url',
      supabaseKey: 'test-key',
      redisUrl: 'redis://localhost:6379',
      logLevel: 'info',
      biasDetectionEnabled: true,
      realTimeMonitoringEnabled: true,
      alternativeContentGeneration: true
    };

    pipeline = new ContentSafetyPipeline(mockConfig);
  });

  describe('processContent', () => {
    it('should approve safe content', async () => {
      const request: ContentSafetyRequest = {
        content: 'Tell me a story about a friendly cat who helps others',
        contentType: 'story',
        userAge: 8,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'test',
          requestId: 'test-123'
        }
      };

      // Mock the internal services to return safe results
      jest.spyOn(pipeline as any, 'preFilterManager', 'get').mockReturnValue({
        runFilters: jest.fn().mockResolvedValue({
          allowed: true,
          riskLevel: 'low',
          warnings: [],
          modifications: []
        })
      });

      jest.spyOn(pipeline as any, 'postValidatorManager', 'get').mockReturnValue({
        runValidators: jest.fn().mockResolvedValue([{
          valid: true,
          confidence: 0.9,
          issues: []
        }])
      });

      jest.spyOn(pipeline as any, 'biasDetectionEngine', 'get').mockReturnValue({
        detectBias: jest.fn().mockResolvedValue({
          overallBiasScore: 0.1,
          biasCategories: {
            demographic: 0.1,
            gender: 0.1,
            cultural: 0.1,
            ability: 0.1,
            socioeconomic: 0.1
          },
          detectedBiases: [],
          representationAnalysis: {
            characters: { diversity: 0.8, stereotypes: [] },
            themes: { inclusive: true, problematic: [] }
          }
        })
      });

      jest.spyOn(pipeline as any, 'qualityAssuranceEngine', 'get').mockReturnValue({
        assessQuality: jest.fn().mockResolvedValue({
          overallQuality: 0.8,
          narrativeCoherence: 0.8,
          ageAppropriateness: 0.9,
          educationalValue: 0.7,
          emotionalResonance: 0.8,
          creativity: 0.7
        })
      });

      const result = await pipeline.processContent(request);

      expect(result.approved).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.flaggedCategories).toHaveLength(0);
    });

    it('should reject unsafe content', async () => {
      const request: ContentSafetyRequest = {
        content: 'Tell me a violent story with inappropriate content',
        contentType: 'story',
        userAge: 8,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'test',
          requestId: 'test-456'
        }
      };

      // Mock the internal services to return unsafe results
      jest.spyOn(pipeline as any, 'preFilterManager', 'get').mockReturnValue({
        runFilters: jest.fn().mockResolvedValue({
          allowed: false,
          riskLevel: 'high',
          warnings: ['Violent content detected'],
          modifications: []
        })
      });

      const result = await pipeline.processContent(request);

      expect(result.approved).toBe(false);
      expect(result.riskLevel).toBe('critical');
      expect(result.flaggedCategories).toContain('pre_generation_filter');
    });

    it('should handle bias detection', async () => {
      const request: ContentSafetyRequest = {
        content: 'A story with some biased content',
        contentType: 'story',
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'test',
          requestId: 'test-789'
        }
      };

      // Mock services to pass pre-filters but detect bias
      jest.spyOn(pipeline as any, 'preFilterManager', 'get').mockReturnValue({
        runFilters: jest.fn().mockResolvedValue({
          allowed: true,
          riskLevel: 'low',
          warnings: [],
          modifications: []
        })
      });

      jest.spyOn(pipeline as any, 'postValidatorManager', 'get').mockReturnValue({
        runValidators: jest.fn().mockResolvedValue([{
          valid: true,
          confidence: 0.9,
          issues: []
        }])
      });

      jest.spyOn(pipeline as any, 'biasDetectionEngine', 'get').mockReturnValue({
        detectBias: jest.fn().mockResolvedValue({
          overallBiasScore: 0.8, // High bias score
          biasCategories: {
            demographic: 0.8,
            gender: 0.6,
            cultural: 0.7,
            ability: 0.2,
            socioeconomic: 0.3
          },
          detectedBiases: [{
            type: 'gender_stereotype',
            severity: 0.8,
            examples: ['biased example'],
            correction: 'Remove gender stereotypes'
          }],
          representationAnalysis: {
            characters: { diversity: 0.3, stereotypes: ['gender stereotype'] },
            themes: { inclusive: false, problematic: ['bias'] }
          }
        })
      });

      jest.spyOn(pipeline as any, 'qualityAssuranceEngine', 'get').mockReturnValue({
        assessQuality: jest.fn().mockResolvedValue({
          overallQuality: 0.6,
          narrativeCoherence: 0.7,
          ageAppropriateness: 0.8,
          educationalValue: 0.5,
          emotionalResonance: 0.6,
          creativity: 0.7
        })
      });

      const result = await pipeline.processContent(request);

      expect(result.approved).toBe(false);
      expect(result.flaggedCategories).toContain('bias_detected');
      expect(result.biasDetection?.overallBiasScore).toBe(0.8);
    });
  });

  describe('sanitizePrompt', () => {
    it('should sanitize prompts before generation', async () => {
      const request: ContentSafetyRequest = {
        content: 'Generate a story with some problematic content',
        contentType: 'prompt',
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'test',
          requestId: 'test-sanitize'
        }
      };

      // Mock pre-filter manager
      jest.spyOn(pipeline as any, 'preFilterManager', 'get').mockReturnValue({
        runFilters: jest.fn().mockResolvedValue({
          allowed: true,
          riskLevel: 'medium',
          sanitizedPrompt: 'Generate a story with appropriate content',
          warnings: ['Content modified for safety'],
          modifications: ['Removed problematic elements']
        })
      });

      const result = await pipeline.sanitizePrompt(request);

      expect(result.sanitizedPrompt).toBe('Generate a story with appropriate content');
      expect(result.riskAssessment.level).toBe('medium');
      expect(result.riskAssessment.warnings).toContain('Content modified for safety');
    });
  });

  describe('batchProcessContent', () => {
    it('should process multiple content pieces', async () => {
      const requests: ContentSafetyRequest[] = [
        {
          content: 'Safe content 1',
          contentType: 'story',
          metadata: { timestamp: new Date().toISOString(), source: 'test', requestId: 'batch-1' }
        },
        {
          content: 'Safe content 2',
          contentType: 'story',
          metadata: { timestamp: new Date().toISOString(), source: 'test', requestId: 'batch-2' }
        }
      ];

      // Mock processContent to return safe results
      jest.spyOn(pipeline, 'processContent').mockResolvedValue({
        approved: true,
        confidence: 0.9,
        riskLevel: 'low',
        flaggedCategories: [],
        detailedFlags: [],
        humanReviewRequired: false,
        processingTime: 100,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          pipeline: ['test']
        }
      });

      const results = await pipeline.batchProcessContent(requests);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.approved)).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = pipeline.getMetrics();

      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('approvedContent');
      expect(metrics).toHaveProperty('rejectedContent');
      expect(metrics).toHaveProperty('humanEscalations');
      expect(metrics).toHaveProperty('biasDetections');
      expect(metrics).toHaveProperty('qualityIssues');
    });
  });

  describe('healthCheck', () => {
    it('should perform health check on all services', async () => {
      // Mock all service health checks
      jest.spyOn(pipeline as any, 'preFilterManager', 'get').mockReturnValue({
        healthCheck: jest.fn().mockResolvedValue(true)
      });

      jest.spyOn(pipeline as any, 'postValidatorManager', 'get').mockReturnValue({
        healthCheck: jest.fn().mockResolvedValue(true)
      });

      jest.spyOn(pipeline as any, 'biasDetectionEngine', 'get').mockReturnValue({
        healthCheck: jest.fn().mockResolvedValue(true)
      });

      jest.spyOn(pipeline as any, 'qualityAssuranceEngine', 'get').mockReturnValue({
        healthCheck: jest.fn().mockResolvedValue(true)
      });

      jest.spyOn(pipeline as any, 'realTimeMonitor', 'get').mockReturnValue({
        healthCheck: jest.fn().mockResolvedValue(true)
      });

      // Mock external service checks
      jest.spyOn(pipeline as any, 'openai', 'get').mockReturnValue({
        models: { list: jest.fn().mockResolvedValue({}) }
      });

      jest.spyOn(pipeline as any, 'supabase', 'get').mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ error: null })
          })
        })
      });

      jest.spyOn(pipeline as any, 'redis', 'get').mockReturnValue({
        ping: jest.fn().mockResolvedValue('PONG')
      });

      const health = await pipeline.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.services.openai).toBe(true);
      expect(health.services.supabase).toBe(true);
      expect(health.services.redis).toBe(true);
    });
  });
});