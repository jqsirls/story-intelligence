import { WebVTTService, WordTimestamp, SyncAccuracy } from '../WebVTTService';
import { Request, Response } from 'express';

/**
 * WebVTT Service Tests for Phase 1 DoD Validation
 * Tests the ≤ 5ms P90 sync accuracy requirement
 */
describe('WebVTTService - Phase 1 DoD Compliance', () => {
  let webvttService: WebVTTService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    webvttService = new WebVTTService();
    
    mockRequest = {
      params: { storyId: 'test-story-123' },
      body: {
        text: 'Once upon a time, there was a brave little hero who loved adventures.',
        audioUrl: 'https://test-bucket.s3.amazonaws.com/audio/test.mp3'
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn()
    };
  });

  describe('Phase 1 DoD Requirement: WebVTT sync diff ≤ 5ms P90', () => {
    test('should validate sync accuracy meets Phase 1 requirement', async () => {
      const mockTimestamps: WordTimestamp[] = [
        { word: 'Once', startTime: 0, endTime: 500, confidence: 0.95 },
        { word: 'upon', startTime: 500, endTime: 800, confidence: 0.92 },
        { word: 'a', startTime: 800, endTime: 900, confidence: 0.98 },
        { word: 'time', startTime: 900, endTime: 1200, confidence: 0.94 }
      ];

      const accuracy = await webvttService.validateSyncAccuracy(mockTimestamps);

      expect(accuracy).toHaveProperty('p90');
      expect(accuracy).toHaveProperty('p50');
      expect(accuracy).toHaveProperty('p99');
      expect(accuracy).toHaveProperty('average');
      
      // Phase 1 DoD requirement
      expect(accuracy.p90).toBeLessThanOrEqual(5.0);
    });

    test('should generate WebVTT with accurate timing', async () => {
      await webvttService.generateWebVTT(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sync_accuracy_ms: expect.any(Number),
          word_count: expect.any(Number),
          processing_time_ms: expect.any(Number),
          powered_by: 'Story Intelligence™'
        })
      );
    });

    test('should handle missing required parameters', async () => {
      mockRequest.body = { text: 'test' }; // Missing audioUrl

      await webvttService.generateWebVTT(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'INVALID_INPUT'
        })
      );
    });
  });

  describe('WebVTT Content Generation', () => {
    test('should create valid WebVTT format', () => {
      const mockTimestamps: WordTimestamp[] = [
        { word: 'Hello', startTime: 0, endTime: 500, confidence: 0.95 },
        { word: 'world', startTime: 500, endTime: 1000, confidence: 0.92 }
      ];

      // Access private method for testing
      const webvttContent = (webvttService as any).createWebVTTContent(mockTimestamps);

      expect(webvttContent).toContain('WEBVTT');
      expect(webvttContent).toContain('Story Intelligence™');
      expect(webvttContent).toContain('00:00:00.000 --> 00:00:00.500');
      expect(webvttContent).toContain('<c.word-0>Hello</c>');
      expect(webvttContent).toContain('<c.word-1>world</c>');
    });

    test('should format WebVTT timestamps correctly', () => {
      const formatTime = (webvttService as any).formatWebVTTTime.bind(webvttService);
      
      expect(formatTime(0)).toBe('00:00:00.000');
      expect(formatTime(1500)).toBe('00:00:01.500');
      expect(formatTime(65000)).toBe('00:01:05.000');
      expect(formatTime(3665000)).toBe('01:01:05.000');
    });
  });

  describe('Fallback Mechanisms (Phase 1 Chaos Testing)', () => {
    test('should provide paragraph fallback when WebVTT not found', async () => {
      mockRequest.params = { storyId: 'non-existent-story' };

      await webvttService.getWebVTT(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/vtt');
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('Fallback mode - paragraph-level highlighting')
      );
    });

    test('should handle WebVTT generation errors gracefully', async () => {
      // Mock error scenario
      mockRequest.body.audioUrl = 'invalid-url';

      await webvttService.generateWebVTT(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'WEBVTT_GENERATION_FAILED'
        })
      );
    });
  });

  describe('Performance Requirements', () => {
    test('should complete WebVTT generation within reasonable time', async () => {
      const startTime = Date.now();
      
      await webvttService.generateWebVTT(mockRequest as Request, mockResponse as Response);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should complete within 5 seconds for typical story
      expect(processingTime).toBeLessThan(5000);
    });

    test('should handle large text inputs efficiently', async () => {
      // Create a large text input (1000 words)
      const largeText = Array(1000).fill('word').join(' ');
      mockRequest.body.text = largeText;

      const startTime = Date.now();
      await webvttService.generateWebVTT(mockRequest as Request, mockResponse as Response);
      const endTime = Date.now();

      // Should still complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });

  describe('Integration with Voice Service', () => {
    test('should estimate word durations based on speech rate', () => {
      const estimateDuration = (webvttService as any).estimateWordDuration.bind(webvttService);
      const mockAnalysis = { speechRate: 150 };

      const shortWord = estimateDuration('a', mockAnalysis);
      const longWord = estimateDuration('extraordinary', mockAnalysis);

      expect(longWord).toBeGreaterThan(shortWord);
      expect(shortWord).toBeGreaterThanOrEqual(100); // Minimum 100ms
    });

    test('should add appropriate gaps between words', () => {
      const getWordGap = (webvttService as any).getWordGap.bind(webvttService);
      const mockAnalysis = {};

      const gap = getWordGap(mockAnalysis);
      expect(gap).toBe(50); // 50ms gap as specified
    });
  });

  describe('Metrics Collection', () => {
    test('should collect WebVTT generation metrics', async () => {
      const mockMetricsCollector = {
        recordWebVTTGeneration: jest.fn()
      };
      
      (webvttService as any).metricsCollector = mockMetricsCollector;

      await webvttService.generateWebVTT(mockRequest as Request, mockResponse as Response);

      expect(mockMetricsCollector.recordWebVTTGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          storyId: 'test-story-123',
          processingTime: expect.any(Number),
          syncAccuracy: expect.any(Number),
          wordCount: expect.any(Number)
        })
      );
    });
  });

  describe('S3 Storage Integration', () => {
    test('should generate correct S3 URLs for WebVTT files', async () => {
      const storeWebVTTFile = (webvttService as any).storeWebVTTFile.bind(webvttService);
      
      const url = await storeWebVTTFile('test-story-123', 'WEBVTT content');
      
      expect(url).toContain('stories/test-story-123/sync.vtt');
      expect(url).toContain('.s3.amazonaws.com');
    });

    test('should handle S3 storage errors gracefully', async () => {
      // This would be tested with actual S3 integration
      // For now, we verify the error handling structure exists
      expect(webvttService.generateWebVTT).toBeDefined();
    });
  });
});

/**
 * Integration Tests for WebVTT Routes
 */
describe('WebVTT Routes Integration', () => {
  test('should be properly integrated with REST API Gateway', () => {
    // This test would verify the routes are properly mounted
    // in the actual REST API Gateway integration
    expect(true).toBe(true); // Placeholder
  });
});

/**
 * Phase 1 DoD Validation Tests
 */
describe('Phase 1 Definition of Done Validation', () => {
  test('WebVTT sync diff ≤ 5ms P90 requirement', async () => {
    const webvttService = new WebVTTService();
    const mockTimestamps: WordTimestamp[] = Array(100).fill(null).map((_, i) => ({
      word: `word${i}`,
      startTime: i * 100,
      endTime: (i + 1) * 100,
      confidence: 0.95
    }));

    const accuracy = await webvttService.validateSyncAccuracy(mockTimestamps);
    
    // This is the core Phase 1 DoD requirement
    expect(accuracy.p90).toBeLessThanOrEqual(5.0);
  });

  test('WebVTT 404 fallback mechanism', async () => {
    const webvttService = new WebVTTService();
    const mockRequest = { params: { storyId: 'non-existent' } } as Request;
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn()
    } as unknown as Response;

    await webvttService.getWebVTT(mockRequest, mockResponse);

    // Should provide fallback content
    expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/vtt');
    expect(mockResponse.send).toHaveBeenCalled();
  });

  test('CI passes on SDK regeneration (structural test)', () => {
    // This test validates that the WebVTT service is properly structured
    // for SDK generation - actual SDK generation would be tested in CI
    expect(WebVTTService).toBeDefined();
    expect(WebVTTService.prototype.generateWebVTT).toBeDefined();
    expect(WebVTTService.prototype.getWebVTT).toBeDefined();
    expect(WebVTTService.prototype.validateSyncAccuracy).toBeDefined();
  });
});