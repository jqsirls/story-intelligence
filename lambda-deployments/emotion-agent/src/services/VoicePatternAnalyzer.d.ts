import { Logger } from 'winston';
import { AudioData } from '../types';
import { Mood } from '@alexa-multi-agent/shared-types';
export interface VoicePatternAnalysis {
    detectedEmotions: Mood[];
    confidence: number;
    voiceCharacteristics: VoiceCharacteristics;
    emotionalMarkers: EmotionalMarker[];
    stressIndicators: StressIndicator[];
}
export interface VoiceCharacteristics {
    pitch: {
        average: number;
        variance: number;
        trend: 'rising' | 'falling' | 'stable';
    };
    pace: {
        wordsPerMinute: number;
        pauseFrequency: number;
        averagePauseLength: number;
    };
    volume: {
        average: number;
        variance: number;
        dynamicRange: number;
    };
    tonality: {
        breathiness: number;
        tension: number;
        resonance: number;
    };
}
export interface EmotionalMarker {
    type: 'laughter' | 'sigh' | 'gasp' | 'vocal_fry' | 'uptalk' | 'tremor';
    timestamp: number;
    confidence: number;
    duration: number;
    intensity: number;
}
export interface StressIndicator {
    type: 'rapid_speech' | 'voice_breaks' | 'shallow_breathing' | 'monotone' | 'hesitation';
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    timestamp: number;
}
/**
 * Advanced voice pattern analysis for emotional state detection
 * Requirements: 7.1, 7.2, 7.3
 */
export declare class VoicePatternAnalyzer {
    private logger;
    constructor(logger: Logger);
    /**
     * Analyze voice patterns for emotional states
     * This is a sophisticated implementation that would use ML models in production
     */
    analyzeVoicePatterns(audioData: AudioData): Promise<VoicePatternAnalysis>;
    /**
     * Extract detailed voice characteristics from audio
     */
    private extractVoiceCharacteristics;
    /**
     * Detect emotional markers in voice patterns
     */
    private detectEmotionalMarkers;
    /**
     * Identify stress indicators from voice analysis
     */
    private identifyStressIndicators;
    /**
     * Determine emotions from voice patterns, markers, and stress indicators
     */
    private determineEmotionsFromPatterns;
    /**
     * Calculate overall confidence in the emotion detection
     */
    private calculateOverallConfidence;
}
//# sourceMappingURL=VoicePatternAnalyzer.d.ts.map