import { VoicePatternAnalyzer } from '../services/VoicePatternAnalyzer';
import { Logger } from 'winston';
import { AudioData } from '../types';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
} as unknown as Logger;

describe('VoicePatternAnalyzer', () => {
  let analyzer: VoicePatternAnalyzer;

  beforeEach(() => {
    analyzer = new VoicePatternAnalyzer(mockLogger);
    jest.clearAllMocks();
  });

  describe('analyzeVoicePatterns', () => {
    const mockAudioData: AudioData = {
      buffer: Buffer.from('mock audio data'),
      format: 'wav',
      sampleRate: 16000,
      duration: 2.5
    };

    it('should analyze voice patterns and return comprehensive analysis', async () => {
      const result = await analyzer.analyzeVoicePatterns(mockAudioData);

      expect(result).toHaveProperty('detectedEmotions');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('voiceCharacteristics');
      expect(result).toHaveProperty('emotionalMarkers');
      expect(result).toHaveProperty('stressIndicators');

      expect(Array.isArray(result.detectedEmotions)).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect voice characteristics correctly', async () => {
      const result = await analyzer.analyzeVoicePatterns(mockAudioData);

      expect(result.voiceCharacteristics).toHaveProperty('pitch');
      expect(result.voiceCharacteristics).toHaveProperty('pace');
      expect(result.voiceCharacteristics).toHaveProperty('volume');
      expect(result.voiceCharacteristics).toHaveProperty('tonality');

      expect(result.voiceCharacteristics.pitch).toHaveProperty('average');
      expect(result.voiceCharacteristics.pitch).toHaveProperty('variance');
      expect(result.voiceCharacteristics.pitch).toHaveProperty('trend');

      expect(result.voiceCharacteristics.pace).toHaveProperty('wordsPerMinute');
      expect(result.voiceCharacteristics.pace).toHaveProperty('pauseFrequency');
      expect(result.voiceCharacteristics.pace).toHaveProperty('averagePauseLength');
    });

    it('should detect emotional markers', async () => {
      const result = await analyzer.analyzeVoicePatterns(mockAudioData);

      expect(Array.isArray(result.emotionalMarkers)).toBe(true);
      
      result.emotionalMarkers.forEach(marker => {
        expect(marker).toHaveProperty('type');
        expect(marker).toHaveProperty('timestamp');
        expect(marker).toHaveProperty('confidence');
        expect(marker).toHaveProperty('duration');
        expect(marker).toHaveProperty('intensity');

        expect(['laughter', 'sigh', 'gasp', 'vocal_fry', 'uptalk', 'tremor']).toContain(marker.type);
        expect(marker.confidence).toBeGreaterThanOrEqual(0);
        expect(marker.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should detect stress indicators', async () => {
      const result = await analyzer.analyzeVoicePatterns(mockAudioData);

      expect(Array.isArray(result.stressIndicators)).toBe(true);
      
      result.stressIndicators.forEach(indicator => {
        expect(indicator).toHaveProperty('type');
        expect(indicator).toHaveProperty('severity');
        expect(indicator).toHaveProperty('confidence');
        expect(indicator).toHaveProperty('timestamp');

        expect(['rapid_speech', 'voice_breaks', 'shallow_breathing', 'monotone', 'hesitation']).toContain(indicator.type);
        expect(['low', 'medium', 'high']).toContain(indicator.severity);
        expect(indicator.confidence).toBeGreaterThanOrEqual(0);
        expect(indicator.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should return at least one detected emotion', async () => {
      const result = await analyzer.analyzeVoicePatterns(mockAudioData);

      expect(result.detectedEmotions.length).toBeGreaterThan(0);
      result.detectedEmotions.forEach(emotion => {
        expect(['happy', 'sad', 'scared', 'angry', 'neutral']).toContain(emotion);
      });
    });

    it('should handle different audio durations appropriately', async () => {
      const shortAudio: AudioData = { ...mockAudioData, duration: 0.3 };
      const longAudio: AudioData = { ...mockAudioData, duration: 10.0 };

      const shortResult = await analyzer.analyzeVoicePatterns(shortAudio);
      const longResult = await analyzer.analyzeVoicePatterns(longAudio);

      expect(shortResult.confidence).toBeDefined();
      expect(longResult.confidence).toBeDefined();
      
      // Longer audio might have more emotional markers
      expect(longResult.emotionalMarkers.length).toBeGreaterThanOrEqual(shortResult.emotionalMarkers.length);
    });

    it('should handle different sample rates', async () => {
      const lowSampleRate: AudioData = { ...mockAudioData, sampleRate: 8000 };
      const highSampleRate: AudioData = { ...mockAudioData, sampleRate: 44100 };

      const lowResult = await analyzer.analyzeVoicePatterns(lowSampleRate);
      const highResult = await analyzer.analyzeVoicePatterns(highSampleRate);

      expect(lowResult.confidence).toBeDefined();
      expect(highResult.confidence).toBeDefined();
      
      // Higher sample rate should generally provide better analysis
      expect(highResult.confidence).toBeGreaterThanOrEqual(lowResult.confidence - 0.1);
    });

    it('should log analysis activity', async () => {
      await analyzer.analyzeVoicePatterns(mockAudioData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Analyzing voice patterns for emotional states',
        expect.objectContaining({
          duration: mockAudioData.duration,
          sampleRate: mockAudioData.sampleRate,
          format: mockAudioData.format
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const invalidAudioData = { ...mockAudioData, duration: -1 };

      await expect(analyzer.analyzeVoicePatterns(invalidAudioData)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('confidence calculation', () => {
    it('should provide higher confidence for clear audio characteristics', async () => {
      const clearAudio: AudioData = {
        buffer: Buffer.from('clear audio'),
        format: 'wav',
        sampleRate: 44100,
        duration: 3.0
      };

      const result = await analyzer.analyzeVoicePatterns(clearAudio);
      
      // Should have reasonable confidence for good quality audio
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should cap confidence at reasonable maximum', async () => {
      const result = await analyzer.analyzeVoicePatterns(mockAudioData);
      
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe('emotion determination', () => {
    it('should map voice characteristics to appropriate emotions', async () => {
      const result = await analyzer.analyzeVoicePatterns(mockAudioData);

      // Should detect emotions based on voice patterns
      expect(result.detectedEmotions.length).toBeGreaterThan(0);
      
      // All detected emotions should be valid
      result.detectedEmotions.forEach(emotion => {
        expect(['happy', 'sad', 'scared', 'angry', 'neutral']).toContain(emotion);
      });
    });

    it('should consider multiple factors in emotion detection', async () => {
      const result = await analyzer.analyzeVoicePatterns(mockAudioData);

      // Analysis should consider voice characteristics, markers, and stress indicators
      expect(result.voiceCharacteristics).toBeDefined();
      expect(result.emotionalMarkers).toBeDefined();
      expect(result.stressIndicators).toBeDefined();
      
      // These should influence the detected emotions
      expect(result.detectedEmotions.length).toBeGreaterThan(0);
    });
  });
});