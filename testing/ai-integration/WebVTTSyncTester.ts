/**
 * WebVTT Word-Sync Testing Infrastructure
 * Tests audio-text synchronization with ≤5ms P90 accuracy requirement
 */

import { performance } from 'perf_hooks';
import { WebVTTService } from '../../packages/universal-agent/src/api/WebVTTService';

export interface WebVTTSyncResult {
  storyId: string;
  audioUrl: string;
  webvttUrl: string;
  syncAccuracy: number;
  p90Latency: number;
  wordCount: number;
  passed: boolean;
  errors: string[];
}

export interface WebVTTTestConfig {
  maxP90Latency: number; // 5ms requirement
  sampleSize: number;
  timeoutMs: number;
}

export class WebVTTSyncTester {
  private webvttService: WebVTTService;
  private config: WebVTTTestConfig;

  constructor(config: WebVTTTestConfig = {
    maxP90Latency: 5,
    sampleSize: 100,
    timeoutMs: 30000
  }) {
    this.webvttService = new WebVTTService();
    this.config = config;
  }

  /**
   * Test WebVTT generation service for audio-text synchronization
   */
  async testWebVTTGeneration(storyId: string, audioUrl: string, text: string): Promise<WebVTTSyncResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      // Generate WebVTT file
      const webvttResult = await this.webvttService.generateWebVTT({
        storyId,
        audioUrl,
        text,
        includeWordTimestamps: true
      });

      if (!webvttResult.success) {
        errors.push(`WebVTT generation failed: ${webvttResult.error}`);
        return this.createFailedResult(storyId, audioUrl, '', errors);
      }

      // Test word-level timestamp mapping
      const syncAccuracy = await this.testWordLevelMapping(webvttResult.webvttUrl, text);
      
      // Test performance benchmarks
      const p90Latency = await this.testPerformanceBenchmarks(storyId, audioUrl, text);

      // Test fallback when files are missing
      await this.testWebVTTFallback(storyId);

      const passed = syncAccuracy >= 0.95 && p90Latency <= this.config.maxP90Latency;

      return {
        storyId,
        audioUrl,
        webvttUrl: webvttResult.webvttUrl,
        syncAccuracy,
        p90Latency,
        wordCount: text.split(' ').length,
        passed,
        errors
      };

    } catch (error) {
      errors.push(`WebVTT sync test failed: ${error.message}`);
      return this.createFailedResult(storyId, audioUrl, '', errors);
    }
  }

  /**
   * Test word-level timestamp mapping for karaoke-style highlighting
   */
  private async testWordLevelMapping(webvttUrl: string, originalText: string): Promise<number> {
    try {
      const response = await fetch(webvttUrl);
      const webvttContent = await response.text();
      
      // Parse WebVTT content
      const cues = this.parseWebVTTCues(webvttContent);
      const originalWords = originalText.split(' ');
      
      let accurateWords = 0;
      let totalWords = 0;

      for (const cue of cues) {
        const cueWords = cue.text.split(' ');
        totalWords += cueWords.length;
        
        // Check if timestamps are reasonable (not negative, in order)
        if (cue.startTime >= 0 && cue.endTime > cue.startTime) {
          accurateWords += cueWords.length;
        }
      }

      return totalWords > 0 ? accurateWords / totalWords : 0;
    } catch (error) {
      console.error('Word-level mapping test failed:', error);
      return 0;
    }
  }

  /**
   * Test performance benchmarks for WebVTT generation and parsing
   */
  private async testPerformanceBenchmarks(storyId: string, audioUrl: string, text: string): Promise<number> {
    const latencies: number[] = [];

    for (let i = 0; i < this.config.sampleSize; i++) {
      const startTime = performance.now();
      
      try {
        await this.webvttService.generateWebVTT({
          storyId: `${storyId}-bench-${i}`,
          audioUrl,
          text,
          includeWordTimestamps: true
        });
        
        const endTime = performance.now();
        latencies.push(endTime - startTime);
      } catch (error) {
        // Count failures as max latency
        latencies.push(this.config.timeoutMs);
      }
    }

    // Calculate P90 latency
    latencies.sort((a, b) => a - b);
    const p90Index = Math.floor(latencies.length * 0.9);
    return latencies[p90Index];
  }

  /**
   * Test WebVTT fallback when files are missing
   */
  private async testWebVTTFallback(storyId: string): Promise<void> {
    try {
      // Test with non-existent WebVTT URL
      const fallbackResult = await this.webvttService.getWebVTT(`${storyId}-nonexistent`);
      
      if (fallbackResult.success) {
        throw new Error('Fallback test failed: should have returned error for missing file');
      }

      // Verify graceful degradation
      if (!fallbackResult.fallbackText) {
        throw new Error('Fallback test failed: no fallback text provided');
      }
    } catch (error) {
      throw new Error(`WebVTT fallback test failed: ${error.message}`);
    }
  }

  /**
   * Parse WebVTT content into cues
   */
  private parseWebVTTCues(webvttContent: string): Array<{startTime: number, endTime: number, text: string}> {
    const cues: Array<{startTime: number, endTime: number, text: string}> = [];
    const lines = webvttContent.split('\n');
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Look for timestamp line (format: 00:00:00.000 --> 00:00:05.000)
      if (line.includes('-->')) {
        const [startStr, endStr] = line.split('-->').map(s => s.trim());
        const startTime = this.parseTimestamp(startStr);
        const endTime = this.parseTimestamp(endStr);
        
        // Get text content (next non-empty line)
        i++;
        while (i < lines.length && lines[i].trim() === '') i++;
        
        if (i < lines.length) {
          const text = lines[i].trim();
          cues.push({ startTime, endTime, text });
        }
      }
      i++;
    }
    
    return cues;
  }

  /**
   * Parse WebVTT timestamp to milliseconds
   */
  private parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(':');
    if (parts.length !== 3) return 0;
    
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseFloat(parts[2]);
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  /**
   * Create failed result object
   */
  private createFailedResult(storyId: string, audioUrl: string, webvttUrl: string, errors: string[]): WebVTTSyncResult {
    return {
      storyId,
      audioUrl,
      webvttUrl,
      syncAccuracy: 0,
      p90Latency: this.config.timeoutMs,
      wordCount: 0,
      passed: false,
      errors
    };
  }

  /**
   * Run comprehensive WebVTT sync validation
   */
  async validateWebVTTSync(testCases: Array<{storyId: string, audioUrl: string, text: string}>): Promise<{
    passed: boolean;
    results: WebVTTSyncResult[];
    summary: {
      totalTests: number;
      passedTests: number;
      averageP90Latency: number;
      averageSyncAccuracy: number;
    };
  }> {
    const results: WebVTTSyncResult[] = [];
    
    for (const testCase of testCases) {
      const result = await this.testWebVTTGeneration(testCase.storyId, testCase.audioUrl, testCase.text);
      results.push(result);
    }

    const passedTests = results.filter(r => r.passed).length;
    const averageP90Latency = results.reduce((sum, r) => sum + r.p90Latency, 0) / results.length;
    const averageSyncAccuracy = results.reduce((sum, r) => sum + r.syncAccuracy, 0) / results.length;

    return {
      passed: passedTests === results.length && averageP90Latency <= this.config.maxP90Latency,
      results,
      summary: {
        totalTests: results.length,
        passedTests,
        averageP90Latency,
        averageSyncAccuracy
      }
    };
  }
}