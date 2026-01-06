import { Logger } from 'winston';
import { KidCommunicationConfig, AudioInput, ChildProfile, EnhancedTranscriptionResult } from '../types';

export class TestTimeAdaptation {
  private childProfiles: Map<string, ChildProfile> = new Map();
  private isInitialized = false;

  constructor(private config: KidCommunicationConfig, private logger: Logger) {}

  async initialize(): Promise<void> {
    this.isInitialized = true;
    this.logger.info('TestTimeAdaptation initialized');
  }

  async adapt(audio: AudioInput, transcription: EnhancedTranscriptionResult, childProfile: ChildProfile): Promise<EnhancedTranscriptionResult> {
    if (!this.isInitialized) return transcription;
    try {
      if (!childProfile.voiceCharacteristics) childProfile.voiceCharacteristics = {};
      const pitch = this.extractPitch(audio);
      if (pitch) childProfile.voiceCharacteristics.averagePitch = pitch;
      if (childProfile.voiceCharacteristics.averagePitch) {
        const pitchBoost = this.calculatePitchAdaptation(childProfile.voiceCharacteristics.averagePitch);
        transcription.confidence = Math.min(1.0, transcription.confidence + pitchBoost);
        transcription.personalization = { adapted: true, confidenceBoost: pitchBoost };
      }
      if (!childProfile.personalizationData) {
        childProfile.personalizationData = { adaptationCount: 0, lastAdaptation: new Date().toISOString() };
      }
      childProfile.personalizationData.adaptationCount = (childProfile.personalizationData.adaptationCount || 0) + 1;
      childProfile.personalizationData.lastAdaptation = new Date().toISOString();
      this.childProfiles.set(childProfile.childId, childProfile);
      return transcription;
    } catch (error: any) {
      this.logger.warn('Test-Time Adaptation failed', { error: error.message });
      return transcription;
    }
  }

  private extractPitch(audio: AudioInput): number | null { return null; }
  private calculatePitchAdaptation(pitch: number): number {
    if (pitch > 350) return 0.15;
    else if (pitch > 280) return 0.10;
    else if (pitch > 250) return 0.05;
    return 0.02;
  }
  getChildProfile(childId: string): ChildProfile | undefined { return this.childProfiles.get(childId); }
}
