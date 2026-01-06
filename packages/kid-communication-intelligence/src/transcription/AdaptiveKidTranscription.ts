import { Logger } from 'winston';
import { KidCommunicationConfig, AudioInput, EnhancedTranscriptionResult, ChildProfile } from '../types';

export class AdaptiveKidTranscription {
  private isInitialized = false;
  constructor(private config: KidCommunicationConfig, private logger: Logger) {}
  async initialize(): Promise<void> { this.isInitialized = true; this.logger.info('AdaptiveKidTranscription initialized'); }
  async enhance(transcription: EnhancedTranscriptionResult, audio?: AudioInput, childProfile?: ChildProfile): Promise<EnhancedTranscriptionResult> {
    if (!this.isInitialized) return transcription;
    try {
      let enhanced = { ...transcription };
      enhanced.text = this.correctPronunciationErrors(enhanced.text, childProfile);
      if (childProfile?.age) enhanced = this.applyAgeSpecificExpectations(enhanced, childProfile.age);
      enhanced.audioIntelligence = { pitchNormalized: false, spectralModified: false, noiseReduced: false };
      return enhanced;
    } catch (error: any) {
      this.logger.warn('Transcription enhancement failed', { error: error.message });
      return transcription;
    }
  }
  private correctPronunciationErrors(text: string, childProfile?: ChildProfile): string {
    const corrections: Array<[RegExp, string]> = [
      [/wabbit/gi, 'rabbit'], [/pasketti/gi, 'spaghetti'], [/nana/gi, 'banana'],
      [/pway/gi, 'play'], [/fwing/gi, 'swing']
    ];
    let corrected = text;
    for (const [pattern, replacement] of corrections) corrected = corrected.replace(pattern, replacement);
    return corrected;
  }
  private applyAgeSpecificExpectations(transcription: EnhancedTranscriptionResult, age: number): EnhancedTranscriptionResult {
    if (age < 5 && transcription.confidence < 0.6) transcription.confidence = Math.max(0.6, transcription.confidence);
    return transcription;
  }
}
