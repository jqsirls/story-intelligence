import { Logger } from 'winston';
import { KidCommunicationConfig, EnhancedTranscriptionResult, AudioInput, ChildProfile, ConfidenceBreakdown } from '../types';

export class IntelligentConfidenceSystem {
  private isInitialized = false;
  constructor(private config: KidCommunicationConfig, private logger: Logger) {}
  async initialize(): Promise<void> { this.isInitialized = true; this.logger.info('IntelligentConfidenceSystem initialized'); }
  async calculate(transcription: EnhancedTranscriptionResult, audio?: AudioInput, childProfile?: ChildProfile): Promise<ConfidenceBreakdown> {
    if (!this.isInitialized) return { audioQuality: 0.7, transcriptionConfidence: transcription.confidence, patternMatching: 0.7, contextAlignment: 0.7, overall: transcription.confidence, factors: {} };
    try {
      const audioQuality = audio ? this.calculateAudioQuality(audio) : 0.7;
      const patternMatching = this.calculatePatternMatching(transcription, childProfile);
      const contextAlignment = this.calculateContextAlignment(transcription, childProfile);
      const factors = {
        highPitch: childProfile?.voiceCharacteristics?.averagePitch && childProfile.voiceCharacteristics.averagePitch > 300 ? -0.1 : 0,
        backgroundNoise: audio ? -0.05 : 0,
        pronunciationVariation: transcription.inventedWords && transcription.inventedWords.length > 0 ? -0.1 : 0,
        inventedWords: transcription.inventedWords && transcription.inventedWords.length > 0 ? -0.05 : 0,
        nonLinearLogic: transcription.nonLinearPatterns && transcription.nonLinearPatterns.length > 0 ? -0.05 : 0
      };
      const overall = Math.max(0, Math.min(1, transcription.confidence * 0.4 + audioQuality * 0.2 + patternMatching * 0.2 + contextAlignment * 0.2 + Object.values(factors).reduce((sum, val) => sum + val, 0)));
      return { audioQuality, transcriptionConfidence: transcription.confidence, patternMatching, contextAlignment, overall, factors };
    } catch (error: any) {
      this.logger.warn('Confidence calculation failed', { error: error.message });
      return { audioQuality: 0.7, transcriptionConfidence: transcription.confidence, patternMatching: 0.7, contextAlignment: 0.7, overall: transcription.confidence, factors: {} };
    }
  }
  private calculateAudioQuality(audio: AudioInput): number { return 0.8; }
  private calculatePatternMatching(transcription: EnhancedTranscriptionResult, childProfile?: ChildProfile): number {
    if (childProfile?.inventedWords && transcription.inventedWords) {
      const matches = transcription.inventedWords.filter(w => childProfile.inventedWords!.some(known => known.word === w.word));
      if (matches.length > 0) return 0.9;
    }
    return 0.7;
  }
  private calculateContextAlignment(transcription: EnhancedTranscriptionResult, childProfile?: ChildProfile): number {
    if (childProfile?.developmentalStage && transcription.developmentalStage) {
      if (childProfile.developmentalStage.piagetianStage === transcription.developmentalStage.stage) return 0.9;
    }
    return 0.7;
  }
  shouldClarify(confidence: ConfidenceBreakdown, childAge?: number): boolean {
    const threshold = childAge && childAge < 7 ? 0.6 : 0.7;
    return confidence.overall < threshold;
  }
}
