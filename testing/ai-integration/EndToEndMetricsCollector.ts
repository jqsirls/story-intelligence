import { EventEmitter } from 'events';
import { StoryCreationResult, StoryCreationProgress, ConcurrentTestResult } from './EndToEndStoryFlowTester';

export interface PerformanceMetrics {
  timestamp: Date;
  testType: 'single' | 'concurrent' | 'partial' | 'integration';
  duration: number;
  success: boolean;
  errorType?: string;
  stageMetrics: {
    textGeneration?: number;
    personalityProcessing?: number;
    voiceSynthesis?: number;
    webvttGeneration?: number;
    finalization?: number;
  };
  qualityMetrics?: {
    contentQuality: number;
    audioQuality?: number;
    syncAccuracy?: number;
  };
  resourceMetrics?: {
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
  };
}

export interface BenchmarkThresholds {
  textGenerationTime: number; // milliseconds
  voiceSynthesisTime: number; // milliseconds
  totalWorkflowTime: number; // milliseconds
  concurrentThroughput: number; // requests per second
  errorRate: number; // percentage
  qualityScore: number; // 0-1 scale
  syncAccuracy: number; // 0-1 scale
}

export interface TestReport {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    averageResponseTime: number;
    totalTestDuration: number;
  };
  performance: {
    benchmarksMet: boolean;
    averageTextGenerationTime: number;
    averageVoiceSynthesisTime: number;
    averageTotalTime: number;
    peakConcurrentThroughput: number;
  };
  quality: {
    averageContentQuality: number;
    averageAudioQuality: number;
    averageSyncAccuracy: number;
    ageAppropriatenessScore: number;
  };
  reliability: {
    errorDistribution: Record<string, number>;
    partialSuccessRate: number;
    serviceAvailability: Record<string, number>;
  };
  recommendations: string[];
}

export class EndToEndMetricsCollector extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private benchmarkThresholds: BenchmarkThresholds;
  private testStartTime: Date;
  private serviceAvailability: Record<string, { total: number; successful: number }> = {
    openai: { total: 0, successful: 0 },
    elevenlabs: { total: 0, successful: 0 },
    personality: { total: 0, successful: 0 },
    webvtt: { total: 0, successful: 0 },
    database: { total: 0, successful: 0 }
  };

  constructor(thresholds?: Partial<BenchmarkThresholds>) {
    super();
    
    // Default benchmark thresholds from design document
    this.benchmarkThresholds = {
      textGenerationTime: 15000, // 15 seconds
      voiceSynthesisTime: 30000, // 30 seconds
      totalWorkflowTime: 45000, // 45 seconds
      concurrentThroughput: 2.0, // 2 requests per second
      errorRate: 0.01, // 1% error rate
      qualityScore: 0.7, // 70% quality score
      syncAccuracy: 0.95, // 95% sync accuracy
      ...thresholds
    };

    this.testStartTime = new Date();
  }

  /**
   * Record metrics from a single story creation test
   */
  recordSingleTestMetrics(result: StoryCreationResult): void {
    const metric: PerformanceMetrics = {
      timestamp: new Date(),
      testType: 'single',
      duration: result.metrics.totalTime,
      success: result.success,
      errorType: result.error?.code,
      stageMetrics: {
        textGeneration: result.metrics.textGenerationTime,
        personalityProcessing: result.metrics.personalityProcessingTime,
        voiceSynthesis: result.metrics.voiceSynthesisTime
      },
      qualityMetrics: result.story ? {
        contentQuality: result.story.metadata.qualityScore,
        audioQuality: this.calculateAudioQuality(result.story.audioUrl),
        syncAccuracy: this.calculateSyncAccuracy(result.story.webvttUrl)
      } : undefined,
      resourceMetrics: this.collectResourceMetrics()
    };

    this.metrics.push(metric);
    this.updateServiceAvailability(result);
    this.emit('metricsRecorded', metric);
  }

  /**
   * Record metrics from concurrent testing
   */
  recordConcurrentTestMetrics(result: ConcurrentTestResult): void {
    const metric: PerformanceMetrics = {
      timestamp: new Date(),
      testType: 'concurrent',
      duration: 0, // Duration is calculated differently for concurrent tests
      success: result.successfulRequests > 0,
      stageMetrics: {},
      resourceMetrics: this.collectResourceMetrics()
    };

    this.metrics.push(metric);
    this.emit('concurrentMetricsRecorded', { metric, concurrentResult: result });
  }

  /**
   * Record progress metrics during test execution
   */
  recordProgressMetrics(progress: StoryCreationProgress): void {
    this.emit('progressMetrics', {
      timestamp: new Date(),
      requestId: progress.requestId,
      stage: progress.stage,
      progress: progress.progress,
      estimatedTimeRemaining: progress.estimatedTimeRemaining
    });
  }

  /**
   * Record service availability metrics
   */
  recordServiceAvailability(service: string, available: boolean): void {
    if (!this.serviceAvailability[service]) {
      this.serviceAvailability[service] = { total: 0, successful: 0 };
    }

    this.serviceAvailability[service].total++;
    if (available) {
      this.serviceAvailability[service].successful++;
    }

    this.emit('serviceAvailability', {
      service,
      available,
      availability: this.serviceAvailability[service].successful / this.serviceAvailability[service].total
    });
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport(): TestReport {
    const totalTests = this.metrics.length;
    const passedTests = this.metrics.filter(m => m.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? passedTests / totalTests : 0;

    const successfulMetrics = this.metrics.filter(m => m.success);
    const averageResponseTime = successfulMetrics.length > 0 
      ? successfulMetrics.reduce((sum, m) => sum + m.duration, 0) / successfulMetrics.length 
      : 0;

    const textGenerationTimes = successfulMetrics
      .map(m => m.stageMetrics.textGeneration)
      .filter(t => t !== undefined) as number[];
    
    const voiceSynthesisTimes = successfulMetrics
      .map(m => m.stageMetrics.voiceSynthesis)
      .filter(t => t !== undefined) as number[];

    const qualityScores = successfulMetrics
      .map(m => m.qualityMetrics?.contentQuality)
      .filter(q => q !== undefined) as number[];

    const audioQualityScores = successfulMetrics
      .map(m => m.qualityMetrics?.audioQuality)
      .filter(q => q !== undefined) as number[];

    const syncAccuracyScores = successfulMetrics
      .map(m => m.qualityMetrics?.syncAccuracy)
      .filter(s => s !== undefined) as number[];

    // Calculate error distribution
    const errorDistribution: Record<string, number> = {};
    this.metrics.filter(m => !m.success).forEach(m => {
      const errorType = m.errorType || 'unknown';
      errorDistribution[errorType] = (errorDistribution[errorType] || 0) + 1;
    });

    // Check if benchmarks are met
    const averageTextGenTime = textGenerationTimes.length > 0 
      ? textGenerationTimes.reduce((a, b) => a + b, 0) / textGenerationTimes.length 
      : 0;
    
    const averageVoiceTime = voiceSynthesisTimes.length > 0 
      ? voiceSynthesisTimes.reduce((a, b) => a + b, 0) / voiceSynthesisTimes.length 
      : 0;

    const benchmarksMet = 
      averageTextGenTime <= this.benchmarkThresholds.textGenerationTime &&
      averageVoiceTime <= this.benchmarkThresholds.voiceSynthesisTime &&
      averageResponseTime <= this.benchmarkThresholds.totalWorkflowTime &&
      (1 - successRate) <= this.benchmarkThresholds.errorRate;

    const report: TestReport = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate,
        averageResponseTime,
        totalTestDuration: Date.now() - this.testStartTime.getTime()
      },
      performance: {
        benchmarksMet,
        averageTextGenerationTime: averageTextGenTime,
        averageVoiceSynthesisTime: averageVoiceTime,
        averageTotalTime: averageResponseTime,
        peakConcurrentThroughput: this.calculatePeakThroughput()
      },
      quality: {
        averageContentQuality: qualityScores.length > 0 
          ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length 
          : 0,
        averageAudioQuality: audioQualityScores.length > 0 
          ? audioQualityScores.reduce((a, b) => a + b, 0) / audioQualityScores.length 
          : 0,
        averageSyncAccuracy: syncAccuracyScores.length > 0 
          ? syncAccuracyScores.reduce((a, b) => a + b, 0) / syncAccuracyScores.length 
          : 0,
        ageAppropriatenessScore: this.calculateAgeAppropriatenessScore()
      },
      reliability: {
        errorDistribution,
        partialSuccessRate: this.calculatePartialSuccessRate(),
        serviceAvailability: this.calculateServiceAvailabilityScores()
      },
      recommendations: this.generateRecommendations(benchmarksMet, successRate, errorDistribution)
    };

    this.emit('reportGenerated', report);
    return report;
  }

  /**
   * Export metrics data for external analysis
   */
  exportMetricsData(): {
    metrics: PerformanceMetrics[];
    thresholds: BenchmarkThresholds;
    serviceAvailability: Record<string, { total: number; successful: number }>;
  } {
    return {
      metrics: [...this.metrics],
      thresholds: { ...this.benchmarkThresholds },
      serviceAvailability: { ...this.serviceAvailability }
    };
  }

  /**
   * Reset all collected metrics
   */
  resetMetrics(): void {
    this.metrics = [];
    this.serviceAvailability = {
      openai: { total: 0, successful: 0 },
      elevenlabs: { total: 0, successful: 0 },
      personality: { total: 0, successful: 0 },
      webvtt: { total: 0, successful: 0 },
      database: { total: 0, successful: 0 }
    };
    this.testStartTime = new Date();
    this.emit('metricsReset');
  }

  /**
   * Get real-time performance dashboard data
   */
  getDashboardData(): {
    currentThroughput: number;
    averageResponseTime: number;
    errorRate: number;
    activeTests: number;
    recentMetrics: PerformanceMetrics[];
  } {
    const recentMetrics = this.metrics.slice(-10); // Last 10 tests
    const recentSuccessful = recentMetrics.filter(m => m.success);
    
    return {
      currentThroughput: this.calculateCurrentThroughput(),
      averageResponseTime: recentSuccessful.length > 0 
        ? recentSuccessful.reduce((sum, m) => sum + m.duration, 0) / recentSuccessful.length 
        : 0,
      errorRate: recentMetrics.length > 0 
        ? (recentMetrics.length - recentSuccessful.length) / recentMetrics.length 
        : 0,
      activeTests: 0, // Would be tracked separately in real implementation
      recentMetrics
    };
  }

  private updateServiceAvailability(result: StoryCreationResult): void {
    // Update based on which services were used and their success
    this.recordServiceAvailability('openai', result.partialResults?.textGenerated || false);
    this.recordServiceAvailability('personality', result.partialResults?.personalityProcessed || false);
    this.recordServiceAvailability('elevenlabs', result.partialResults?.audioSynthesized || false);
    this.recordServiceAvailability('webvtt', result.partialResults?.webvttGenerated || false);
    this.recordServiceAvailability('database', result.success);
  }

  private calculateAudioQuality(audioUrl?: string): number {
    // Placeholder - would analyze actual audio quality
    return audioUrl ? 0.85 : 0;
  }

  private calculateSyncAccuracy(webvttUrl?: string): number {
    // Placeholder - would analyze WebVTT sync accuracy
    return webvttUrl ? 0.95 : 0;
  }

  private collectResourceMetrics(): { memoryUsage: number; cpuUsage: number; networkLatency: number } {
    // Placeholder - would collect actual system metrics
    return {
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: 0, // Would use actual CPU monitoring
      networkLatency: 0 // Would measure actual network latency
    };
  }

  private calculatePeakThroughput(): number {
    // Calculate peak throughput from concurrent test metrics
    const concurrentMetrics = this.metrics.filter(m => m.testType === 'concurrent');
    return concurrentMetrics.length > 0 ? 2.5 : 0; // Placeholder
  }

  private calculateAgeAppropriatenessScore(): number {
    // Placeholder - would analyze content for age appropriateness
    return 0.92;
  }

  private calculatePartialSuccessRate(): number {
    const partialMetrics = this.metrics.filter(m => m.testType === 'partial');
    if (partialMetrics.length === 0) return 0;
    
    const partialSuccesses = partialMetrics.filter(m => m.success);
    return partialSuccesses.length / partialMetrics.length;
  }

  private calculateServiceAvailabilityScores(): Record<string, number> {
    const scores: Record<string, number> = {};
    
    Object.entries(this.serviceAvailability).forEach(([service, stats]) => {
      scores[service] = stats.total > 0 ? stats.successful / stats.total : 0;
    });
    
    return scores;
  }

  private calculateCurrentThroughput(): number {
    const recentWindow = 60000; // 1 minute
    const now = Date.now();
    const recentMetrics = this.metrics.filter(
      m => now - m.timestamp.getTime() < recentWindow
    );
    
    return recentMetrics.length / (recentWindow / 1000); // requests per second
  }

  private generateRecommendations(
    benchmarksMet: boolean, 
    successRate: number, 
    errorDistribution: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    if (!benchmarksMet) {
      recommendations.push('Performance benchmarks not met. Consider optimizing service calls or increasing timeout thresholds.');
    }

    if (successRate < 0.95) {
      recommendations.push('Success rate below 95%. Investigate error patterns and implement better error handling.');
    }

    const topError = Object.entries(errorDistribution)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topError && topError[1] > 2) {
      recommendations.push(`Most common error: ${topError[0]}. Focus on resolving this error type.`);
    }

    if (this.serviceAvailability.openai.successful / this.serviceAvailability.openai.total < 0.95) {
      recommendations.push('OpenAI service availability below 95%. Check API key, rate limits, and network connectivity.');
    }

    if (this.serviceAvailability.elevenlabs.successful / this.serviceAvailability.elevenlabs.total < 0.90) {
      recommendations.push('ElevenLabs service availability below 90%. Consider implementing fallback voice synthesis options.');
    }

    if (recommendations.length === 0) {
      recommendations.push('All metrics within acceptable ranges. System performing well.');
    }

    return recommendations;
  }
}