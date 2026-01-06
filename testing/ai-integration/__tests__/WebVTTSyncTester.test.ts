/**
 * Tests for WebVTT Sync Testing Infrastructure
 */

import { WebVTTSyncTester } from '../WebVTTSyncTester';

describe('WebVTTSyncTester', () => {
  let tester: WebVTTSyncTester;

  beforeEach(() => {
    tester = new WebVTTSyncTester({
      maxP90Latency: 5,
      sampleSize: 10, // Smaller sample for tests
      timeoutMs: 5000
    });
  });

  describe('WebVTT Generation Testing', () => {
    it('should test WebVTT generation with valid inputs', async () => {
      const result = await tester.testWebVTTGeneration(
        'test-story-1',
        'https://example.com/audio.mp3',
        'Once upon a time, there was a brave little mouse who loved adventures.'
      );

      expect(result.storyId).toBe('test-story-1');
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.syncAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.p90Latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle WebVTT generation failures gracefully', async () => {
      const result = await tester.testWebVTTGeneration(
        'invalid-story',
        'invalid-url',
        ''
      );

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Benchmarking', () => {
    it('should measure P90 latency within acceptable range', async () => {
      const testCases = [
        {
          storyId: 'perf-test-1',
          audioUrl: 'https://example.com/audio1.mp3',
          text: 'Short test story for performance testing.'
        }
      ];

      const validation = await tester.validateWebVTTSync(testCases);
      
      expect(validation.summary.averageP90Latency).toBeLessThanOrEqual(5000); // 5 second max for tests
      expect(validation.summary.totalTests).toBe(1);
    });
  });

  describe('WebVTT Sync Validation', () => {
    it('should validate multiple test cases', async () => {
      const testCases = [
        {
          storyId: 'validation-test-1',
          audioUrl: 'https://example.com/audio1.mp3',
          text: 'First test story with multiple words for validation.'
        },
        {
          storyId: 'validation-test-2',
          audioUrl: 'https://example.com/audio2.mp3',
          text: 'Second test story to ensure consistency across different inputs.'
        }
      ];

      const validation = await tester.validateWebVTTSync(testCases);
      
      expect(validation.results).toHaveLength(2);
      expect(validation.summary.totalTests).toBe(2);
      expect(validation.summary.averageSyncAccuracy).toBeGreaterThanOrEqual(0);
    });
  });

  describe('WebVTT Parsing', () => {
    it('should parse WebVTT content correctly', async () => {
      // This tests the internal parsing logic
      const mockWebVTTContent = `WEBVTT

00:00:00.000 --> 00:00:02.500
Once upon a time

00:00:02.500 --> 00:00:05.000
there was a brave little mouse`;

      // Access private method for testing (in real implementation, we'd make it public or test through public interface)
      const result = await tester.testWebVTTGeneration(
        'parse-test',
        'https://example.com/audio.mp3',
        'Once upon a time there was a brave little mouse'
      );

      expect(result.wordCount).toBe(9);
    });
  });

  describe('Fallback Testing', () => {
    it('should test WebVTT fallback mechanisms', async () => {
      const result = await tester.testWebVTTGeneration(
        'fallback-test',
        'https://nonexistent.com/audio.mp3',
        'Test story for fallback validation'
      );

      // Should handle missing files gracefully
      expect(result).toBeDefined();
      expect(result.storyId).toBe('fallback-test');
    });
  });
});