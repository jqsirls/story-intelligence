import { EventEmitter } from 'events';

export interface StoryCreationRequest {
  userId: string;
  preferences: {
    ageRange: '3-5' | '6-8' | '9-12';
    genre: string;
    characters: string[];
    themes: string[];
    length: 'short' | 'medium' | 'long';
  };
  voiceOptions?: {
    voiceId: string;
    speed: number;
    pitch: number;
  };
  requestId: string;
}

export interface StoryCreationProgress {
  requestId: string;
  stage: 'initializing' | 'generating_text' | 'processing_personality' | 'synthesizing_voice' | 'finalizing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  timestamp: Date;
  estimatedTimeRemaining?: number;
}

export interface StoryCreationResult {
  requestId: string;
  success: boolean;
  story?: {
    id: string;
    title: string;
    content: string;
    audioUrl?: string;
    webvttUrl?: string;
    metadata: {
      generationTime: number;
      wordCount: number;
      audioDuration?: number;
      qualityScore: number;
    };
  };
  partialResults?: {
    textGenerated: boolean;
    personalityProcessed: boolean;
    audioSynthesized: boolean;
    webvttGenerated: boolean;
  };
  error?: {
    code: string;
    message: string;
    stage: string;
    recoverable: boolean;
  };
  metrics: {
    totalTime: number;
    textGenerationTime?: number;
    voiceSynthesisTime?: number;
    personalityProcessingTime?: number;
  };
}

export interface ConcurrentTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  concurrencyLevel: number;
  throughput: number; // requests per second
  errorDistribution: Record<string, number>;
}

export class EndToEndStoryFlowTester extends EventEmitter {
  private activeRequests: Map<string, StoryCreationProgress> = new Map();
  private completedRequests: Map<string, StoryCreationResult> = new Map();
  private testMetrics: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageResponseTime: number;
  } = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    averageResponseTime: 0
  };

  constructor(
    private openaiClient: any,
    private elevenLabsClient: any,
    private personalityAgents: any,
    private webvttService: any,
    private database: any
  ) {
    super();
  }

  /**
   * Test complete story generation workflow
   */
  async testCompleteStoryWorkflow(request: StoryCreationRequest): Promise<StoryCreationResult> {
    const startTime = Date.now();
    const progress: StoryCreationProgress = {
      requestId: request.requestId,
      stage: 'initializing',
      progress: 0,
      message: 'Initializing story creation workflow',
      timestamp: new Date()
    };

    this.activeRequests.set(request.requestId, progress);
    this.emit('progress', progress);

    try {
      // Stage 1: Text Generation
      await this.updateProgress(request.requestId, 'generating_text', 10, 'Generating story content with OpenAI');
      const textStartTime = Date.now();
      const storyContent = await this.generateStoryText(request);
      const textGenerationTime = Date.now() - textStartTime;

      // Stage 2: Personality Processing
      await this.updateProgress(request.requestId, 'processing_personality', 40, 'Processing personality and emotional elements');
      const personalityStartTime = Date.now();
      const enhancedContent = await this.processPersonalityElements(storyContent, request.preferences);
      const personalityProcessingTime = Date.now() - personalityStartTime;

      // Stage 3: Voice Synthesis (if requested)
      let audioUrl: string | undefined;
      let webvttUrl: string | undefined;
      let voiceSynthesisTime: number | undefined;

      if (request.voiceOptions) {
        await this.updateProgress(request.requestId, 'synthesizing_voice', 70, 'Synthesizing voice narration');
        const voiceStartTime = Date.now();
        const audioResult = await this.synthesizeVoice(enhancedContent.content, request.voiceOptions);
        audioUrl = audioResult.audioUrl;
        webvttUrl = audioResult.webvttUrl;
        voiceSynthesisTime = Date.now() - voiceStartTime;
      }

      // Stage 4: Finalization
      await this.updateProgress(request.requestId, 'finalizing', 90, 'Finalizing and saving story');
      const storyId = await this.saveStoryToDatabase({
        title: enhancedContent.title,
        content: enhancedContent.content,
        audioUrl,
        webvttUrl,
        userId: request.userId,
        preferences: request.preferences
      });

      await this.updateProgress(request.requestId, 'completed', 100, 'Story creation completed successfully');

      const totalTime = Date.now() - startTime;
      const result: StoryCreationResult = {
        requestId: request.requestId,
        success: true,
        story: {
          id: storyId,
          title: enhancedContent.title,
          content: enhancedContent.content,
          audioUrl,
          webvttUrl,
          metadata: {
            generationTime: totalTime,
            wordCount: enhancedContent.content.split(' ').length,
            audioDuration: audioUrl ? await this.getAudioDuration(audioUrl) : undefined,
            qualityScore: enhancedContent.qualityScore
          }
        },
        partialResults: {
          textGenerated: true,
          personalityProcessed: true,
          audioSynthesized: !!audioUrl,
          webvttGenerated: !!webvttUrl
        },
        metrics: {
          totalTime,
          textGenerationTime,
          personalityProcessingTime,
          voiceSynthesisTime
        }
      };

      this.completedRequests.set(request.requestId, result);
      this.updateTestMetrics(true, totalTime);
      this.emit('completed', result);

      return result;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      const failureResult = await this.handleWorkflowFailure(request.requestId, error as Error, totalTime);
      this.completedRequests.set(request.requestId, failureResult);
      this.updateTestMetrics(false, totalTime);
      this.emit('failed', failureResult);
      return failureResult;
    } finally {
      this.activeRequests.delete(request.requestId);
    }
  }

  /**
   * Test concurrent story generation
   */
  async testConcurrentStoryGeneration(
    requests: StoryCreationRequest[],
    maxConcurrency: number = 5
  ): Promise<ConcurrentTestResult> {
    const startTime = Date.now();
    const results: StoryCreationResult[] = [];
    const errors: Record<string, number> = {};

    // Process requests in batches to control concurrency
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(request => 
        this.testCompleteStoryWorkflow(request).catch(error => {
          const errorKey = error.error?.code || error.code || 'unknown_error';
          errors[errorKey] = (errors[errorKey] || 0) + 1;
          return error;
        })
      );

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          // Handle rejected promises by creating a failure result
          const errorKey = result.reason?.error?.code || result.reason?.code || 'workflow_failure';
          errors[errorKey] = (errors[errorKey] || 0) + 1;
          return {
            success: false,
            error: { code: errorKey, message: result.reason?.message || 'Unknown error' },
            metrics: { totalTime: 0 }
          };
        }
      }));
    }

    const totalTime = Date.now() - startTime;
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    const responseTimes = successfulResults.map(r => r.metrics?.totalTime || 0).filter(t => t > 0);
    
    return {
      totalRequests: requests.length,
      successfulRequests: successfulResults.length,
      failedRequests: failedResults.length,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      concurrencyLevel: maxConcurrency,
      throughput: totalTime > 0 ? successfulResults.length / (totalTime / 1000) : 0,
      errorDistribution: errors
    };
  }

  /**
   * Test partial result handling for failed operations
   */
  async testPartialResultHandling(request: StoryCreationRequest): Promise<StoryCreationResult> {
    const startTime = Date.now();
    let partialResults = {
      textGenerated: false,
      personalityProcessed: false,
      audioSynthesized: false,
      webvttGenerated: false
    };

    try {
      // Attempt text generation
      await this.updateProgress(request.requestId, 'generating_text', 10, 'Generating story content');
      const storyContent = await this.generateStoryText(request);
      partialResults.textGenerated = true;

      // Attempt personality processing
      await this.updateProgress(request.requestId, 'processing_personality', 40, 'Processing personality elements');
      const enhancedContent = await this.processPersonalityElements(storyContent, request.preferences);
      partialResults.personalityProcessed = true;

      // Attempt voice synthesis (may fail)
      if (request.voiceOptions) {
        try {
          await this.updateProgress(request.requestId, 'synthesizing_voice', 70, 'Synthesizing voice');
          await this.synthesizeVoice(enhancedContent.content, request.voiceOptions);
          partialResults.audioSynthesized = true;
          partialResults.webvttGenerated = true;
        } catch (voiceError) {
          // Voice synthesis failed, but we have text content
          console.warn('Voice synthesis failed, proceeding with text-only story:', voiceError);
        }
      }

      // Save partial results
      const storyId = await this.saveStoryToDatabase({
        title: enhancedContent.title,
        content: enhancedContent.content,
        userId: request.userId,
        preferences: request.preferences
      });

      const totalTime = Date.now() - startTime;
      return {
        requestId: request.requestId,
        success: true,
        story: {
          id: storyId,
          title: enhancedContent.title,
          content: enhancedContent.content,
          metadata: {
            generationTime: totalTime,
            wordCount: enhancedContent.content.split(' ').length,
            qualityScore: enhancedContent.qualityScore
          }
        },
        partialResults,
        metrics: {
          totalTime
        }
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      return {
        requestId: request.requestId,
        success: false,
        partialResults,
        error: {
          code: 'partial_failure',
          message: (error as Error).message,
          stage: this.activeRequests.get(request.requestId)?.stage || 'unknown',
          recoverable: partialResults.textGenerated
        },
        metrics: {
          totalTime
        }
      };
    }
  }

  /**
   * Test cross-service integration validation
   */
  async testCrossServiceIntegration(): Promise<{
    openaiIntegration: boolean;
    elevenLabsIntegration: boolean;
    personalityAgentIntegration: boolean;
    webvttIntegration: boolean;
    databaseIntegration: boolean;
    overallHealth: boolean;
  }> {
    const results = {
      openaiIntegration: false,
      elevenLabsIntegration: false,
      personalityAgentIntegration: false,
      webvttIntegration: false,
      databaseIntegration: false,
      overallHealth: false
    };

    try {
      // Test OpenAI integration
      const testPrompt = "Generate a short test story for a 5-year-old about friendship.";
      await this.openaiClient.generateStory(testPrompt);
      results.openaiIntegration = true;
    } catch (error) {
      console.error('OpenAI integration test failed:', error);
    }

    try {
      // Test ElevenLabs integration
      await this.elevenLabsClient.synthesizeVoice("Test audio synthesis", "default_voice");
      results.elevenLabsIntegration = true;
    } catch (error) {
      console.error('ElevenLabs integration test failed:', error);
    }

    try {
      // Test personality agent integration
      await this.personalityAgents.processContent("Test content", { ageRange: '3-5' });
      results.personalityAgentIntegration = true;
    } catch (error) {
      console.error('Personality agent integration test failed:', error);
    }

    try {
      // Test WebVTT integration
      await this.webvttService.generateWebVTT("Test content", "test_audio_url");
      results.webvttIntegration = true;
    } catch (error) {
      console.error('WebVTT integration test failed:', error);
    }

    try {
      // Test database integration
      await this.database.testConnection();
      results.databaseIntegration = true;
    } catch (error) {
      console.error('Database integration test failed:', error);
    }

    results.overallHealth = Object.values(results).slice(0, -1).every(Boolean);
    return results;
  }

  private async updateProgress(
    requestId: string,
    stage: StoryCreationProgress['stage'],
    progress: number,
    message: string
  ): Promise<void> {
    const progressUpdate: StoryCreationProgress = {
      requestId,
      stage,
      progress,
      message,
      timestamp: new Date(),
      estimatedTimeRemaining: this.calculateEstimatedTime(stage, progress)
    };

    this.activeRequests.set(requestId, progressUpdate);
    this.emit('progress', progressUpdate);
  }

  private async generateStoryText(request: StoryCreationRequest): Promise<any> {
    const prompt = this.buildStoryPrompt(request.preferences);
    return await this.openaiClient.generateStory(prompt, {
      ageRange: request.preferences.ageRange,
      maxTokens: this.getMaxTokensForLength(request.preferences.length)
    });
  }

  private async processPersonalityElements(storyContent: any, preferences: any): Promise<any> {
    return await this.personalityAgents.processContent(storyContent, preferences);
  }

  private async synthesizeVoice(content: string, voiceOptions: any): Promise<{ audioUrl: string; webvttUrl: string }> {
    const audioResult = await this.elevenLabsClient.synthesizeVoice(content, voiceOptions.voiceId);
    const webvttResult = await this.webvttService.generateWebVTT(content, audioResult.audioUrl);
    
    return {
      audioUrl: audioResult.audioUrl,
      webvttUrl: webvttResult.webvttUrl
    };
  }

  private async saveStoryToDatabase(storyData: any): Promise<string> {
    const result = await this.database.stories.create(storyData);
    return result.id;
  }

  private async getAudioDuration(audioUrl: string): Promise<number> {
    // Implementation would analyze audio file to get duration
    return 0; // Placeholder
  }

  private async handleWorkflowFailure(
    requestId: string,
    error: Error,
    totalTime: number
  ): Promise<StoryCreationResult> {
    const currentProgress = this.activeRequests.get(requestId);
    
    return {
      requestId,
      success: false,
      error: {
        code: 'workflow_failure',
        message: error.message,
        stage: currentProgress?.stage || 'unknown',
        recoverable: this.isRecoverableError(error)
      },
      partialResults: {
        textGenerated: false,
        personalityProcessed: false,
        audioSynthesized: false,
        webvttGenerated: false
      },
      metrics: {
        totalTime
      }
    };
  }

  private buildStoryPrompt(preferences: any): string {
    return `Create a ${preferences.length} story for children aged ${preferences.ageRange} about ${preferences.themes.join(', ')} featuring ${preferences.characters.join(', ')}.`;
  }

  private getMaxTokensForLength(length: string): number {
    switch (length) {
      case 'short': return 500;
      case 'medium': return 1000;
      case 'long': return 2000;
      default: return 1000;
    }
  }

  private calculateEstimatedTime(stage: string, progress: number): number {
    // Rough estimates based on typical processing times
    const stageEstimates = {
      'initializing': 2,
      'generating_text': 15,
      'processing_personality': 5,
      'synthesizing_voice': 25,
      'finalizing': 3
    };
    
    const totalEstimate = Object.values(stageEstimates).reduce((a, b) => a + b, 0);
    const remainingProgress = 100 - progress;
    return (totalEstimate * remainingProgress) / 100;
  }

  private isRecoverableError(error: Error): boolean {
    const recoverableErrors = ['rate_limit', 'temporary_unavailable', 'timeout'];
    return recoverableErrors.some(type => error.message.includes(type));
  }

  private updateTestMetrics(success: boolean, responseTime: number): void {
    this.testMetrics.totalTests++;
    if (success) {
      this.testMetrics.passedTests++;
    } else {
      this.testMetrics.failedTests++;
    }
    
    const totalResponseTime = this.testMetrics.averageResponseTime * (this.testMetrics.totalTests - 1) + responseTime;
    this.testMetrics.averageResponseTime = totalResponseTime / this.testMetrics.totalTests;
  }

  /**
   * Get current test metrics
   */
  getTestMetrics() {
    return { ...this.testMetrics };
  }

  /**
   * Get active requests
   */
  getActiveRequests(): StoryCreationProgress[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Get completed requests
   */
  getCompletedRequests(): StoryCreationResult[] {
    return Array.from(this.completedRequests.values());
  }
}