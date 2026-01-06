import { Logger } from 'winston';
import { KidCommunicationConfig, EnhancedTranscriptionResult, ChildProfile } from '../types';

export class ContinuousPersonalization {
  private isInitialized = false;
  constructor(private config: KidCommunicationConfig, private logger: Logger) {}
  async initialize(): Promise<void> { this.isInitialized = true; this.logger.info('ContinuousPersonalization initialized'); }
  async learn(transcription: EnhancedTranscriptionResult, childProfile: ChildProfile, context?: { conversationHistory?: any[]; storyContext?: any; sessionId?: string }): Promise<void> {
    if (!this.isInitialized) return;
    try {
      if (!childProfile.voiceCharacteristics) childProfile.voiceCharacteristics = {};
      if (transcription.inventedWords && transcription.inventedWords.length > 0) {
        if (!childProfile.inventedWords) childProfile.inventedWords = [];
        childProfile.inventedWords.push(...transcription.inventedWords);
      }
      if (transcription.nonLinearPatterns && transcription.nonLinearPatterns.length > 0) {
        if (!childProfile.conversationStyle) childProfile.conversationStyle = {};
      }
      if (!childProfile.personalizationData) {
        childProfile.personalizationData = { adaptationCount: 0, lastAdaptation: new Date().toISOString() };
      }
      const currentConfidence = transcription.confidence;
      const previousConfidence = childProfile.personalizationData.confidenceImprovement || 0;
      childProfile.personalizationData.confidenceImprovement = Math.max(previousConfidence, currentConfidence - previousConfidence);
      this.logger.info('Learned from interaction', { childId: childProfile.childId, confidenceImprovement: childProfile.personalizationData.confidenceImprovement });
    } catch (error: any) {
      this.logger.warn('Continuous learning failed', { error: error.message });
    }
  }
}
