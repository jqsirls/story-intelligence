import { VoiceService } from '../VoiceService';
import { createTestConfig } from '../config';
import { VoiceSynthesisRequest, AudioChunk } from '../types';
import * as winston from 'winston';

// Mock dependencies
jest.mock('../clients/ElevenLabsClient');
jest.mock('../clients/PollyClient');
jest.mock('../FailoverPolicy');
jest.mock('../VoiceCloneManager');
jest.mock('../utils/MetricsCollector');
jest.mock('../utils/CostTracker');

const mockLogger = winston.createLogger({
  level: 'error',
  transports: [new winston.transports.Console({ silent: true })],
});

describe('VoiceService', () => {
  let voiceService: VoiceService;
  let config: any;

  beforeEach(() => {
    config = createTestConfig();
    voiceService = new VoiceService(config, mockLogger);
  });

  afterEach(async () => {
    if (voiceService) {
      await voiceService.shutdown();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully with valid config', async () => {
      // Mock all initialize methods
      const mockInitialize = jest.fn().mockResolvedValue(undefined);
      
      (voiceService as any).elevenLabsClient = { initialize: mockInitialize };
      (voiceService as any).pollyClient = { initialize: mockInitialize };
      (voiceService as any).failoverPolicy = { initialize: mockInitialize };
      (voiceService as any).voiceCloneManager = { initialize: mockInitialize };
      (voiceService as any).metricsCollector = { initialize: mockInitialize };
      (voiceService as any).costTracker = { initialize: mockInitialize };

      await expect(voiceService.initialize()).resolves.not.toThrow();
      expect(mockInitialize).toHaveBeenCalledTimes(6);
    });

    it('should throw error if initialization fails', async () => {
      const mockInitialize = jest.fn().mockRejectedValue(new Error('Init failed'));
      
      (voiceService as any).elevenLabsClient = { initialize: mockInitialize };
      (voiceService as any).pollyClient = { initialize: jest.fn().mockResolvedValue(undefined) };
      (voiceService as any).failoverPolicy = { initialize: jest.fn().mockResolvedValue(undefined) };
      (voiceService as any).voiceCloneManager = { initialize: jest.fn().mockResolvedValue(undefined) };
      (voiceService as any).metricsCollector = { initialize: jest.fn().mockResolvedValue(undefined) };
      (voiceService as any).costTracker = { initialize: jest.fn().mockResolvedValue(undefined) };

      await expect(voiceService.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('stream synthesis', () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockInitialize = jest.fn().mockResolvedValue(undefined);
      
      (voiceService as any).elevenLabsClient = { 
        initialize: mockInitialize,
        stream: jest.fn(),
        shutdown: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
      (voiceService as any).pollyClient = { 
        initialize: mockInitialize,
        stream: jest.fn(),
        shutdown: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
      (voiceService as any).failoverPolicy = { 
        initialize: mockInitialize,
        canUseEngine: jest.fn().mockResolvedValue(true),
        getCurrentEngine: jest.fn().mockReturnValue('elevenlabs'),
        recordResult: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
      (voiceService as any).voiceCloneManager = { initialize: mockInitialize };
      (voiceService as any).metricsCollector = { 
        initialize: mockInitialize,
        recordMetrics: jest.fn().mockResolvedValue(undefined),
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
      (voiceService as any).costTracker = { 
        initialize: mockInitialize,
        checkLimits: jest.fn().mockResolvedValue(undefined),
        recordCost: jest.fn().mockResolvedValue(undefined),
        shutdown: jest.fn().mockResolvedValue(undefined),
      };

      await voiceService.initialize();
    });

    it('should stream audio successfully with ElevenLabs', async () => {
      const request: VoiceSynthesisRequest = {
        text: 'Hello world',
        language: 'en-US',
        emotion: 'neutral',
        streaming: true,
        format: 'pcm',
        sampleRate: 16000,
        priority: 'normal',
      };

      const mockResponse = {
        success: true,
        audioData: Buffer.from('mock audio data'),
        engine: 'elevenlabs' as const,
        latency: 150,
        cost: 0.001,
        duration: 2.5,
        sessionId: 'test-session',
      };

      (voiceService as any).elevenLabsClient.stream.mockResolvedValue(mockResponse);

      const chunks: AudioChunk[] = [];
      const onChunk = (chunk: AudioChunk) => chunks.push(chunk);

      const result = await voiceService.stream(request, onChunk);

      expect(result.success).toBe(true);
      expect(result.engine).toBe('elevenlabs');
      expect(result.latency).toBeGreaterThan(0);
      expect((voiceService as any).elevenLabsClient.stream).toHaveBeenCalledWith(request, onChunk);
    });

    it('should fallback to Polly when ElevenLabs fails', async () => {
      const request: VoiceSynthesisRequest = {
        text: 'Hello world',
        language: 'en-US',
        emotion: 'neutral',
        streaming: true,
        format: 'pcm',
        sampleRate: 16000,
        priority: 'normal',
      };

      const mockPollyResponse = {
        success: true,
        audioData: Buffer.from('mock polly audio'),
        engine: 'polly' as const,
        latency: 200,
        cost: 0.0005,
        duration: 2.5,
        sessionId: 'test-session',
      };

      // Mock ElevenLabs failure
      (voiceService as any).elevenLabsClient.stream.mockRejectedValue(new Error('ElevenLabs failed'));
      (voiceService as any).pollyClient.stream.mockResolvedValue(mockPollyResponse);

      const chunks: AudioChunk[] = [];
      const onChunk = (chunk: AudioChunk) => chunks.push(chunk);

      const result = await voiceService.stream(request, onChunk);

      expect(result.success).toBe(true);
      expect(result.engine).toBe('polly');
      expect((voiceService as any).pollyClient.stream).toHaveBeenCalledWith(request, onChunk);
    });

    it('should handle cost limit exceeded', async () => {
      const request: VoiceSynthesisRequest = {
        text: 'Hello world',
        language: 'en-US',
        emotion: 'neutral',
        streaming: true,
        format: 'pcm',
        sampleRate: 16000,
        priority: 'normal',
      };

      // Mock cost limit exceeded
      (voiceService as any).costTracker.checkLimits.mockRejectedValue(
        new Error('Daily budget limit exceeded')
      );

      const chunks: AudioChunk[] = [];
      const onChunk = (chunk: AudioChunk) => chunks.push(chunk);

      const result = await voiceService.stream(request, onChunk);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Daily budget limit exceeded');
    });
  });

  describe('long-form synthesis', () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockInitialize = jest.fn().mockResolvedValue(undefined);
      
      (voiceService as any).elevenLabsClient = { 
        initialize: mockInitialize,
        generateLongForm: jest.fn(),
        shutdown: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
      (voiceService as any).pollyClient = { 
        initialize: mockInitialize,
        generateLongForm: jest.fn(),
        shutdown: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
      (voiceService as any).failoverPolicy = { initialize: mockInitialize, on: jest.fn() };
      (voiceService as any).voiceCloneManager = { initialize: mockInitialize };
      (voiceService as any).metricsCollector = { 
        initialize: mockInitialize,
        recordMetrics: jest.fn().mockResolvedValue(undefined),
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
      (voiceService as any).costTracker = { 
        initialize: mockInitialize,
        shutdown: jest.fn().mockResolvedValue(undefined),
      };

      await voiceService.initialize();
    });

    it('should generate long-form audio with ElevenLabs', async () => {
      const request: VoiceSynthesisRequest = {
        text: 'This is a long story that will be converted to audio...',
        language: 'en-US',
        emotion: 'neutral',
        streaming: false,
        format: 'mp3',
        sampleRate: 22050,
        priority: 'normal',
      };

      const mockResponse = {
        success: true,
        audioData: Buffer.from('mock long-form audio'),
        audioUrl: 'https://example.com/audio.mp3',
        engine: 'elevenlabs' as const,
        latency: 5000,
        cost: 0.05,
        duration: 30.0,
        sessionId: 'test-session',
      };

      (voiceService as any).elevenLabsClient.generateLongForm.mockResolvedValue(mockResponse);

      const result = await voiceService.generateLongForm(request);

      expect(result.success).toBe(true);
      expect(result.engine).toBe('elevenlabs');
      expect(result.audioUrl).toBeDefined();
      expect((voiceService as any).elevenLabsClient.generateLongForm).toHaveBeenCalledWith(request);
    });

    it('should use Polly for long text on free tier', async () => {
      const longText = 'A'.repeat(3500); // > 3000 chars
      const request: VoiceSynthesisRequest = {
        text: longText,
        language: 'en-US',
        emotion: 'neutral',
        streaming: false,
        format: 'mp3',
        sampleRate: 22050,
        priority: 'normal',
      };

      const mockResponse = {
        success: true,
        audioData: Buffer.from('mock polly long-form audio'),
        engine: 'polly' as const,
        latency: 3000,
        cost: 0.01,
        duration: 45.0,
        sessionId: 'test-session',
      };

      (voiceService as any).pollyClient.generateLongForm.mockResolvedValue(mockResponse);

      const result = await voiceService.generateLongForm(request);

      expect(result.success).toBe(true);
      expect(result.engine).toBe('polly');
      expect((voiceService as any).pollyClient.generateLongForm).toHaveBeenCalledWith(request);
    });
  });

  describe('health check', () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockInitialize = jest.fn().mockResolvedValue(undefined);
      
      (voiceService as any).elevenLabsClient = { 
        initialize: mockInitialize,
        healthCheck: jest.fn().mockResolvedValue('up'),
        shutdown: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
      (voiceService as any).pollyClient = { 
        initialize: mockInitialize,
        healthCheck: jest.fn().mockResolvedValue('up'),
        shutdown: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
      (voiceService as any).failoverPolicy = { initialize: mockInitialize, on: jest.fn() };
      (voiceService as any).voiceCloneManager = { initialize: mockInitialize };
      (voiceService as any).metricsCollector = { 
        initialize: mockInitialize,
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
      (voiceService as any).costTracker = { 
        initialize: mockInitialize,
        shutdown: jest.fn().mockResolvedValue(undefined),
      };

      // Mock getRecentMetrics
      (voiceService as any).getRecentMetrics = jest.fn().mockResolvedValue({
        avgLatency: 200,
        successRate: 0.95,
        dailyCost: 5.50,
      });

      await voiceService.initialize();
    });

    it('should return healthy status when both engines are up', async () => {
      const health = await voiceService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.engines.elevenlabs).toBe('up');
      expect(health.engines.polly).toBe('up');
      expect(health.metrics.avgLatency).toBe(200);
      expect(health.metrics.successRate).toBe(0.95);
      expect(health.metrics.dailyCost).toBe(5.50);
    });

    it('should return degraded status when one engine is down', async () => {
      (voiceService as any).elevenLabsClient.healthCheck.mockResolvedValue('down');

      const health = await voiceService.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.engines.elevenlabs).toBe('down');
      expect(health.engines.polly).toBe('up');
    });

    it('should return unhealthy status when both engines are down', async () => {
      (voiceService as any).elevenLabsClient.healthCheck.mockResolvedValue('down');
      (voiceService as any).pollyClient.healthCheck.mockResolvedValue('down');

      const health = await voiceService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.engines.elevenlabs).toBe('down');
      expect(health.engines.polly).toBe('down');
    });
  });
});