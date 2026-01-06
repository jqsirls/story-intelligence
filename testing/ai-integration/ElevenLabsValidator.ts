/**
 * ElevenLabs Voice Synthesis Test Suite
 * Validates audio quality, voice consistency, format validation, and error recovery
 */

import axios from 'axios';
import { TestResult } from './TestOrchestrator';

export interface VoiceSynthesisRequest {
  text: string;
  voiceId: string;
  modelId?: string;
  voiceSettings?: {
    stability: number;
    similarityBoost: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
}

export interface AudioQualityMetrics {
  duration: number;
  sampleRate: number;
  bitRate: number;
  format: string;
  fileSize: number;
  qualityScore: number;
}

export interface VoiceConsistencyResult {
  voiceId: string;
  samples: number;
  consistencyScore: number;
  variations: number[];
  passed: boolean;
}

export interface ElevenLabsTestResult extends TestResult {
  audioUrl?: string;
  audioQuality?: AudioQualityMetrics;
  voiceConsistency?: VoiceConsistencyResult;
  synthesisJobId?: string;
  costMetrics?: {
    charactersUsed: number;
    estimatedCost: number;
  };
}

export class ElevenLabsValidator {
  private apiKey: string;
  private baseUrl: string;
  private costTracker: { totalCharacters: number; totalCost: number };
  private jobTracker: Map<string, { status: string; startTime: number }>;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY || '';
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.costTracker = { totalCharacters: 0, totalCost: 0 };
    this.jobTracker = new Map();
  }

  /**
   * Validate voice synthesis with comprehensive testing
   */
  async validateVoiceSynthesis(request: VoiceSynthesisRequest): Promise<ElevenLabsTestResult> {
    const startTime = Date.now();
    
    try {
      // Synthesize audio
      const synthesisResult = await this.synthesizeAudio(request);
      
      // Validate audio quality
      const audioQuality = await this.validateAudioQuality(synthesisResult.audioUrl);
      
      // Test voice consistency (if multiple samples)
      const voiceConsistency = await this.testVoiceConsistency(request.voiceId, request.text);
      
      // Calculate cost metrics
      const costMetrics = this.calculateCostMetrics(request.text);
      
      // Determine if test passed
      const passed = this.evaluateTestSuccess(audioQuality, voiceConsistency);
      
      return {
        testId: `elevenlabs-synthesis-${Date.now()}`,
        passed,
        duration: Date.now() - startTime,
        audioUrl: synthesisResult.audioUrl,
        audioQuality,
        voiceConsistency,
        synthesisJobId: synthesisResult.jobId,
        costMetrics,
        metadata: {
          request,
          textLength: request.text.length,
          synthesisTime: Date.now() - startTime
        }
      };
      
    } catch (error) {
      return {
        testId: `elevenlabs-synthesis-${Date.now()}`,
        passed: false,
        duration: Date.now() - startTime,
        error: `Voice synthesis failed: ${error.message}`
      };
    }
  }

  /**
   * Synthesize audio using ElevenLabs API
   */
  private async synthesizeAudio(request: VoiceSynthesisRequest): Promise<{
    audioUrl: string;
    jobId: string;
  }> {
    const response = await axios.post(
      `${this.baseUrl}/text-to-speech/${request.voiceId}`,
      {
        text: request.text,
        model_id: request.modelId || 'eleven_monolingual_v1',
        voice_settings: request.voiceSettings || {
          stability: 0.5,
          similarity_boost: 0.5
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        responseType: 'arraybuffer'
      }
    );

    if (response.status !== 200) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Create temporary URL for audio data
    const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const jobId = `job-${Date.now()}`;
    
    // Track synthesis job
    this.jobTracker.set(jobId, {
      status: 'completed',
      startTime: Date.now()
    });

    return { audioUrl, jobId };
  }

  /**
   * Validate audio quality metrics
   */
  private async validateAudioQuality(audioUrl: string): Promise<AudioQualityMetrics> {
    try {
      // Fetch audio data for analysis
      const response = await fetch(audioUrl);
      const audioBuffer = await response.arrayBuffer();
      
      // Basic audio analysis (in real implementation, would use audio processing library)
      const fileSize = audioBuffer.byteLength;
      const estimatedDuration = this.estimateAudioDuration(fileSize);
      
      // Calculate quality metrics
      const qualityScore = this.calculateAudioQualityScore(fileSize, estimatedDuration);
      
      return {
        duration: estimatedDuration,
        sampleRate: 22050, // ElevenLabs default
        bitRate: 128, // Estimated for MP3
        format: 'audio/mpeg',
        fileSize,
        qualityScore
      };
      
    } catch (error) {
      console.error('Audio quality validation failed:', error);
      return {
        duration: 0,
        sampleRate: 0,
        bitRate: 0,
        format: 'unknown',
        fileSize: 0,
        qualityScore: 0
      };
    }
  }

  /**
   * Test voice consistency across multiple samples
   */
  async testVoiceConsistency(voiceId: string, text: string): Promise<VoiceConsistencyResult> {
    const sampleCount = 3;
    const samples: number[] = [];
    
    try {
      // Generate multiple samples with same text and voice
      const synthesisTasks = Array(sampleCount).fill(null).map(async (_, i) => {
        const request: VoiceSynthesisRequest = {
          text: `${text} Sample ${i + 1}`,
          voiceId,
          voiceSettings: {
            stability: 0.5,
            similarityBoost: 0.5
          }
        };
        
        return await this.synthesizeAudio(request);
      });
      
      const results = await Promise.all(synthesisTasks);
      
      // Analyze consistency (simplified - would use audio fingerprinting in real implementation)
      for (let i = 0; i < results.length; i++) {
        const qualityMetrics = await this.validateAudioQuality(results[i].audioUrl);
        samples.push(qualityMetrics.qualityScore);
      }
      
      // Calculate consistency score based on variance
      const mean = samples.reduce((sum, score) => sum + score, 0) / samples.length;
      const variance = samples.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / samples.length;
      const consistencyScore = Math.max(0, 1 - Math.sqrt(variance));
      
      return {
        voiceId,
        samples: sampleCount,
        consistencyScore,
        variations: samples,
        passed: consistencyScore >= 0.8
      };
      
    } catch (error) {
      return {
        voiceId,
        samples: 0,
        consistencyScore: 0,
        variations: [],
        passed: false
      };
    }
  }

  /**
   * Test audio format and encoding validation
   */
  async testAudioFormatValidation(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const testRequest: VoiceSynthesisRequest = {
        text: 'This is a test for audio format validation.',
        voiceId: 'EXAVITQu4vr4xnSDxMaL' // Default voice
      };
      
      const result = await this.synthesizeAudio(testRequest);
      const audioQuality = await this.validateAudioQuality(result.audioUrl);
      
      // Validate expected format
      const formatValid = audioQuality.format === 'audio/mpeg';
      const qualityValid = audioQuality.qualityScore >= 0.7;
      const sizeValid = audioQuality.fileSize > 0;
      
      return {
        testId: 'elevenlabs-format-validation',
        passed: formatValid && qualityValid && sizeValid,
        duration: Date.now() - startTime,
        metadata: {
          formatValid,
          qualityValid,
          sizeValid,
          audioQuality
        }
      };
      
    } catch (error) {
      return {
        testId: 'elevenlabs-format-validation',
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Test synthesis job tracking and status management
   */
  async testSynthesisJobTracking(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const testRequest: VoiceSynthesisRequest = {
        text: 'Testing job tracking functionality with a longer text to ensure proper job management.',
        voiceId: 'EXAVITQu4vr4xnSDxMaL'
      };
      
      const result = await this.synthesizeAudio(testRequest);
      
      // Check if job was tracked
      const jobExists = this.jobTracker.has(result.jobId);
      const jobStatus = this.jobTracker.get(result.jobId);
      
      return {
        testId: 'elevenlabs-job-tracking',
        passed: jobExists && jobStatus?.status === 'completed',
        duration: Date.now() - startTime,
        metadata: {
          jobId: result.jobId,
          jobExists,
          jobStatus,
          totalTrackedJobs: this.jobTracker.size
        }
      };
      
    } catch (error) {
      return {
        testId: 'elevenlabs-job-tracking',
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Test error recovery and retry mechanisms
   */
  async testErrorRecoveryMechanisms(): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let recoverySuccessful = false;
    
    try {
      // Test with invalid voice ID (should fail)
      try {
        await this.synthesizeAudio({
          text: 'Test with invalid voice ID',
          voiceId: 'invalid-voice-id'
        });
      } catch (error) {
        errors.push('Expected error for invalid voice ID');
      }
      
      // Test with empty text (should fail)
      try {
        await this.synthesizeAudio({
          text: '',
          voiceId: 'EXAVITQu4vr4xnSDxMaL'
        });
      } catch (error) {
        errors.push('Expected error for empty text');
      }
      
      // Test recovery with valid request
      try {
        await this.synthesizeAudio({
          text: 'Recovery test with valid parameters',
          voiceId: 'EXAVITQu4vr4xnSDxMaL'
        });
        recoverySuccessful = true;
      } catch (error) {
        errors.push(`Recovery failed: ${error.message}`);
      }
      
      return {
        testId: 'elevenlabs-error-recovery',
        passed: errors.length >= 2 && recoverySuccessful,
        duration: Date.now() - startTime,
        metadata: {
          errorsDetected: errors.length,
          recoverySuccessful,
          errors
        }
      };
      
    } catch (error) {
      return {
        testId: 'elevenlabs-error-recovery',
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Estimate audio duration from file size (rough approximation)
   */
  private estimateAudioDuration(fileSize: number): number {
    // Rough estimate: 128kbps MP3 = ~16KB per second
    return fileSize / 16000;
  }

  /**
   * Calculate audio quality score based on metrics
   */
  private calculateAudioQualityScore(fileSize: number, duration: number): number {
    if (duration === 0) return 0;
    
    const bitRate = (fileSize * 8) / duration / 1000; // kbps
    
    // Quality score based on bit rate and file size
    let qualityScore = 0.5; // Base score
    
    if (bitRate >= 128) qualityScore += 0.3;
    if (bitRate >= 192) qualityScore += 0.2;
    if (fileSize > 10000) qualityScore += 0.1; // Minimum reasonable size
    
    return Math.min(1, qualityScore);
  }

  /**
   * Calculate cost metrics for synthesis
   */
  private calculateCostMetrics(text: string): { charactersUsed: number; estimatedCost: number } {
    const charactersUsed = text.length;
    const estimatedCost = charactersUsed * 0.00003; // ElevenLabs pricing estimate
    
    this.costTracker.totalCharacters += charactersUsed;
    this.costTracker.totalCost += estimatedCost;
    
    return { charactersUsed, estimatedCost };
  }

  /**
   * Evaluate overall test success
   */
  private evaluateTestSuccess(
    audioQuality: AudioQualityMetrics,
    voiceConsistency: VoiceConsistencyResult
  ): boolean {
    const qualityThreshold = 0.7;
    const consistencyThreshold = 0.8;
    
    return audioQuality.qualityScore >= qualityThreshold &&
           voiceConsistency.consistencyScore >= consistencyThreshold;
  }

  /**
   * Get available voices for testing
   */
  async getAvailableVoices(): Promise<Array<{ voice_id: string; name: string; category: string }>> {
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      
      return response.data.voices || [];
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      return [];
    }
  }

  /**
   * Test voice selection and customization
   */
  async testVoiceCustomization(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const voices = await this.getAvailableVoices();
      
      if (voices.length === 0) {
        throw new Error('No voices available for testing');
      }
      
      // Test with different voice settings
      const testVoice = voices[0];
      const customizationTests = [
        { stability: 0.3, similarityBoost: 0.7 },
        { stability: 0.7, similarityBoost: 0.3 },
        { stability: 0.5, similarityBoost: 0.5 }
      ];
      
      const results = await Promise.all(
        customizationTests.map(async (settings, i) => {
          const request: VoiceSynthesisRequest = {
            text: `Voice customization test ${i + 1}`,
            voiceId: testVoice.voice_id,
            voiceSettings: settings
          };
          
          return await this.synthesizeAudio(request);
        })
      );
      
      return {
        testId: 'elevenlabs-voice-customization',
        passed: results.length === customizationTests.length,
        duration: Date.now() - startTime,
        metadata: {
          voicesTested: 1,
          customizationTests: customizationTests.length,
          successfulSyntheses: results.length
        }
      };
      
    } catch (error) {
      return {
        testId: 'elevenlabs-voice-customization',
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Get cost tracking summary
   */
  getCostSummary(): { totalCharacters: number; totalCost: number } {
    return { ...this.costTracker };
  }

  /**
   * Get job tracking summary
   */
  getJobSummary(): Array<{ jobId: string; status: string; duration: number }> {
    const summary: Array<{ jobId: string; status: string; duration: number }> = [];
    
    for (const [jobId, job] of this.jobTracker.entries()) {
      summary.push({
        jobId,
        status: job.status,
        duration: Date.now() - job.startTime
      });
    }
    
    return summary;
  }

  /**
   * Clean up tracked jobs and resources
   */
  cleanup(): void {
    this.jobTracker.clear();
    this.costTracker = { totalCharacters: 0, totalCost: 0 };
  }
}