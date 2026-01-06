"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoicePatternAnalyzer = void 0;
/**
 * Advanced voice pattern analysis for emotional state detection
 * Requirements: 7.1, 7.2, 7.3
 */
class VoicePatternAnalyzer {
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Analyze voice patterns for emotional states
     * This is a sophisticated implementation that would use ML models in production
     */
    async analyzeVoicePatterns(audioData) {
        try {
            this.logger.info('Analyzing voice patterns for emotional states', {
                duration: audioData.duration,
                sampleRate: audioData.sampleRate,
                format: audioData.format
            });
            // Extract voice characteristics
            const voiceCharacteristics = await this.extractVoiceCharacteristics(audioData);
            // Detect emotional markers
            const emotionalMarkers = await this.detectEmotionalMarkers(audioData, voiceCharacteristics);
            // Identify stress indicators
            const stressIndicators = await this.identifyStressIndicators(voiceCharacteristics, emotionalMarkers);
            // Determine emotions from patterns
            const detectedEmotions = this.determineEmotionsFromPatterns(voiceCharacteristics, emotionalMarkers, stressIndicators);
            // Calculate overall confidence
            const confidence = this.calculateOverallConfidence(voiceCharacteristics, emotionalMarkers, stressIndicators);
            return {
                detectedEmotions,
                confidence,
                voiceCharacteristics,
                emotionalMarkers,
                stressIndicators
            };
        }
        catch (error) {
            this.logger.error('Error analyzing voice patterns:', error);
            throw error;
        }
    }
    /**
     * Extract detailed voice characteristics from audio
     */
    async extractVoiceCharacteristics(audioData) {
        // In production, this would use advanced audio processing libraries
        // For now, we'll simulate realistic voice analysis
        const { duration, sampleRate } = audioData;
        // Simulate pitch analysis
        const basePitch = 150 + Math.random() * 200; // Hz
        const pitchVariance = Math.random() * 50;
        const pitchTrend = Math.random() > 0.5 ? 'rising' : Math.random() > 0.5 ? 'falling' : 'stable';
        // Simulate pace analysis
        const estimatedWords = Math.floor(duration * (120 + Math.random() * 60) / 60); // 120-180 WPM range
        const wordsPerMinute = estimatedWords / (duration / 60);
        const pauseFrequency = Math.random() * 0.3; // Pauses per second
        const averagePauseLength = 0.5 + Math.random() * 1.0; // 0.5-1.5 seconds
        // Simulate volume analysis
        const averageVolume = 0.3 + Math.random() * 0.4; // 0.3-0.7 range
        const volumeVariance = Math.random() * 0.2;
        const dynamicRange = 0.1 + Math.random() * 0.3;
        // Simulate tonality analysis
        const breathiness = Math.random();
        const tension = Math.random();
        const resonance = Math.random();
        return {
            pitch: {
                average: basePitch,
                variance: pitchVariance,
                trend: pitchTrend
            },
            pace: {
                wordsPerMinute,
                pauseFrequency,
                averagePauseLength
            },
            volume: {
                average: averageVolume,
                variance: volumeVariance,
                dynamicRange
            },
            tonality: {
                breathiness,
                tension,
                resonance
            }
        };
    }
    /**
     * Detect emotional markers in voice patterns
     */
    async detectEmotionalMarkers(audioData, voiceCharacteristics) {
        const markers = [];
        const { duration } = audioData;
        // Detect laughter patterns
        if (voiceCharacteristics.pitch.variance > 30 && voiceCharacteristics.volume.dynamicRange > 0.2) {
            const laughterConfidence = Math.min(0.9, (voiceCharacteristics.pitch.variance / 50) * 0.5 +
                (voiceCharacteristics.volume.dynamicRange / 0.3) * 0.4 +
                0.1);
            if (laughterConfidence > 0.6) {
                markers.push({
                    type: 'laughter',
                    timestamp: Math.random() * duration,
                    confidence: laughterConfidence,
                    duration: 0.5 + Math.random() * 2.0,
                    intensity: laughterConfidence
                });
            }
        }
        // Detect sighs (low pitch, longer duration, volume drop)
        if (voiceCharacteristics.pitch.average < 120 && voiceCharacteristics.pace.pauseFrequency > 0.2) {
            markers.push({
                type: 'sigh',
                timestamp: Math.random() * duration,
                confidence: 0.7,
                duration: 1.0 + Math.random() * 1.5,
                intensity: 0.6
            });
        }
        // Detect gasps (sudden volume/pitch changes)
        if (voiceCharacteristics.volume.variance > 0.15 && voiceCharacteristics.pitch.variance > 25) {
            markers.push({
                type: 'gasp',
                timestamp: Math.random() * duration,
                confidence: 0.6,
                duration: 0.2 + Math.random() * 0.3,
                intensity: 0.8
            });
        }
        // Detect vocal fry (low frequency, creaky voice)
        if (voiceCharacteristics.tonality.tension > 0.7 && voiceCharacteristics.pitch.average < 100) {
            markers.push({
                type: 'vocal_fry',
                timestamp: Math.random() * duration,
                confidence: 0.5,
                duration: 0.5 + Math.random() * 1.0,
                intensity: voiceCharacteristics.tonality.tension
            });
        }
        // Detect uptalk (rising intonation at end of statements)
        if (voiceCharacteristics.pitch.trend === 'rising') {
            markers.push({
                type: 'uptalk',
                timestamp: duration - 1.0, // Near end of speech
                confidence: 0.6,
                duration: 0.5,
                intensity: 0.5
            });
        }
        // Detect voice tremor (high tension, irregular patterns)
        if (voiceCharacteristics.tonality.tension > 0.8 && voiceCharacteristics.pitch.variance > 40) {
            markers.push({
                type: 'tremor',
                timestamp: Math.random() * duration,
                confidence: 0.7,
                duration: duration * 0.3, // Affects portion of speech
                intensity: voiceCharacteristics.tonality.tension
            });
        }
        return markers;
    }
    /**
     * Identify stress indicators from voice analysis
     */
    identifyStressIndicators(voiceCharacteristics, emotionalMarkers) {
        const indicators = [];
        // Rapid speech indicator
        if (voiceCharacteristics.pace.wordsPerMinute > 180) {
            const severity = voiceCharacteristics.pace.wordsPerMinute > 220 ? 'high' :
                voiceCharacteristics.pace.wordsPerMinute > 200 ? 'medium' : 'low';
            indicators.push({
                type: 'rapid_speech',
                severity,
                confidence: Math.min(0.9, (voiceCharacteristics.pace.wordsPerMinute - 180) / 100),
                timestamp: 0
            });
        }
        // Voice breaks (high pitch variance + tension)
        if (voiceCharacteristics.pitch.variance > 35 && voiceCharacteristics.tonality.tension > 0.6) {
            indicators.push({
                type: 'voice_breaks',
                severity: voiceCharacteristics.tonality.tension > 0.8 ? 'high' : 'medium',
                confidence: 0.7,
                timestamp: 0
            });
        }
        // Shallow breathing (high pause frequency, short pauses)
        if (voiceCharacteristics.pace.pauseFrequency > 0.25 &&
            voiceCharacteristics.pace.averagePauseLength < 0.7) {
            indicators.push({
                type: 'shallow_breathing',
                severity: voiceCharacteristics.pace.pauseFrequency > 0.35 ? 'high' : 'medium',
                confidence: 0.6,
                timestamp: 0
            });
        }
        // Monotone speech (low pitch variance, low volume variance)
        if (voiceCharacteristics.pitch.variance < 15 && voiceCharacteristics.volume.variance < 0.1) {
            indicators.push({
                type: 'monotone',
                severity: voiceCharacteristics.pitch.variance < 10 ? 'high' : 'medium',
                confidence: 0.8,
                timestamp: 0
            });
        }
        // Hesitation (high pause frequency, long pauses)
        if (voiceCharacteristics.pace.pauseFrequency > 0.2 &&
            voiceCharacteristics.pace.averagePauseLength > 1.2) {
            indicators.push({
                type: 'hesitation',
                severity: voiceCharacteristics.pace.averagePauseLength > 2.0 ? 'high' : 'medium',
                confidence: 0.7,
                timestamp: 0
            });
        }
        return indicators;
    }
    /**
     * Determine emotions from voice patterns, markers, and stress indicators
     */
    determineEmotionsFromPatterns(voiceCharacteristics, emotionalMarkers, stressIndicators) {
        const emotions = [];
        const emotionScores = {
            happy: 0,
            sad: 0,
            scared: 0,
            angry: 0,
            neutral: 0.5 // Base neutral score
        };
        // Analyze emotional markers
        emotionalMarkers.forEach(marker => {
            switch (marker.type) {
                case 'laughter':
                    emotionScores.happy += marker.confidence * marker.intensity;
                    break;
                case 'sigh':
                    emotionScores.sad += marker.confidence * 0.7;
                    break;
                case 'gasp':
                    emotionScores.scared += marker.confidence * 0.8;
                    break;
                case 'vocal_fry':
                    emotionScores.sad += marker.confidence * 0.5;
                    break;
                case 'tremor':
                    emotionScores.scared += marker.confidence * 0.6;
                    emotionScores.angry += marker.confidence * 0.4;
                    break;
            }
        });
        // Analyze voice characteristics
        // High pitch + fast pace = excited/happy or scared/angry
        if (voiceCharacteristics.pitch.average > 200 && voiceCharacteristics.pace.wordsPerMinute > 160) {
            if (voiceCharacteristics.volume.average > 0.5) {
                emotionScores.happy += 0.3;
                emotionScores.angry += 0.2;
            }
            else {
                emotionScores.scared += 0.4;
            }
        }
        // Low pitch + slow pace = sad or calm
        if (voiceCharacteristics.pitch.average < 130 && voiceCharacteristics.pace.wordsPerMinute < 120) {
            emotionScores.sad += 0.4;
            emotionScores.neutral += 0.2;
        }
        // High tension = stress/anger/fear
        if (voiceCharacteristics.tonality.tension > 0.7) {
            emotionScores.angry += 0.3;
            emotionScores.scared += 0.3;
        }
        // Analyze stress indicators
        stressIndicators.forEach(indicator => {
            switch (indicator.type) {
                case 'rapid_speech':
                    emotionScores.scared += indicator.confidence * 0.4;
                    emotionScores.angry += indicator.confidence * 0.3;
                    break;
                case 'voice_breaks':
                    emotionScores.scared += indicator.confidence * 0.5;
                    emotionScores.sad += indicator.confidence * 0.3;
                    break;
                case 'shallow_breathing':
                    emotionScores.scared += indicator.confidence * 0.6;
                    break;
                case 'monotone':
                    emotionScores.sad += indicator.confidence * 0.5;
                    emotionScores.neutral += indicator.confidence * 0.3;
                    break;
                case 'hesitation':
                    emotionScores.scared += indicator.confidence * 0.4;
                    emotionScores.sad += indicator.confidence * 0.2;
                    break;
            }
        });
        // Select emotions above threshold
        const threshold = 0.4;
        Object.entries(emotionScores).forEach(([emotion, score]) => {
            if (score >= threshold) {
                emotions.push(emotion);
            }
        });
        // Ensure at least one emotion is returned
        if (emotions.length === 0) {
            const dominantEmotion = Object.entries(emotionScores).reduce((a, b) => emotionScores[a[0]] > emotionScores[b[0]] ? a : b)[0];
            emotions.push(dominantEmotion);
        }
        return emotions;
    }
    /**
     * Calculate overall confidence in the emotion detection
     */
    calculateOverallConfidence(voiceCharacteristics, emotionalMarkers, stressIndicators) {
        let confidence = 0.3; // Base confidence
        // Audio quality factors
        if (voiceCharacteristics.volume.average > 0.2) {
            confidence += 0.1; // Good volume
        }
        if (voiceCharacteristics.tonality.resonance > 0.5) {
            confidence += 0.1; // Clear voice
        }
        // Marker confidence
        const markerConfidence = emotionalMarkers.reduce((sum, marker) => sum + marker.confidence, 0) / Math.max(emotionalMarkers.length, 1);
        confidence += markerConfidence * 0.3;
        // Stress indicator confidence
        const stressConfidence = stressIndicators.reduce((sum, indicator) => sum + indicator.confidence, 0) / Math.max(stressIndicators.length, 1);
        confidence += stressConfidence * 0.2;
        // Pattern consistency bonus
        if (emotionalMarkers.length > 1 && stressIndicators.length > 0) {
            confidence += 0.1; // Multiple indicators support each other
        }
        return Math.min(0.95, confidence); // Cap at 95%
    }
}
exports.VoicePatternAnalyzer = VoicePatternAnalyzer;
//# sourceMappingURL=VoicePatternAnalyzer.js.map