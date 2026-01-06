/**
 * Kid Communication Intelligence Service
 * Main orchestration service that enhances existing production systems
 */
import { Logger } from 'winston';
import {
  KidCommunicationConfig,
  AudioInput,
  TranscriptionResult,
  EnhancedTranscriptionResult,
  ChildProfile,
  MultimodalInput,
  MultimodalResult
} from './types';
import { TestTimeAdaptation } from './personalization/TestTimeAdaptation';
import { KidAudioIntelligence } from './audio/KidAudioIntelligence';
import { MultimodalKidInterpreter } from './multimodal/MultimodalKidInterpreter';
import { DevelopmentalStageProcessor } from './developmental/DevelopmentalStageProcessor';
import { InventedWordIntelligence } from './language/InventedWordIntelligence';
import { ChildLogicInterpreter } from './logic/ChildLogicInterpreter';
import { EmotionalSpeechIntelligence } from './emotion/EmotionalSpeechIntelligence';
import { AdaptiveKidTranscription } from './transcription/AdaptiveKidTranscription';
import { ContinuousPersonalization } from './learning/ContinuousPersonalization';
import { IntelligentConfidenceSystem } from './confidence/IntelligentConfidenceSystem';

export class KidCommunicationIntelligenceService {
  private testTimeAdaptation?: TestTimeAdaptation;
  private audioIntelligence?: KidAudioIntelligence;
  private multimodalInterpreter?: MultimodalKidInterpreter;
  private developmentalProcessor?: DevelopmentalStageProcessor;
  private inventedWordIntelligence?: InventedWordIntelligence;
  private childLogicInterpreter?: ChildLogicInterpreter;
  private emotionalIntelligence?: EmotionalSpeechIntelligence;
  private adaptiveTranscription?: AdaptiveKidTranscription;
  private continuousPersonalization?: ContinuousPersonalization;
  private confidenceSystem?: IntelligentConfidenceSystem;
  private isInitialized = false;

  constructor(
    private config: KidCommunicationConfig,
    private logger: Logger
  ) {
    this.logger.info('KidCommunicationIntelligenceService created');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      if (this.config.enableTestTimeAdaptation) {
        this.testTimeAdaptation = new TestTimeAdaptation(this.config, this.logger);
        await this.testTimeAdaptation.initialize();
      }
      if (this.config.enableAudioIntelligence) {
        this.audioIntelligence = new KidAudioIntelligence(this.config, this.logger);
        await this.audioIntelligence.initialize();
      }
      if (this.config.enableMultimodal) {
        this.multimodalInterpreter = new MultimodalKidInterpreter(this.config, this.logger);
        await this.multimodalInterpreter.initialize();
      }
      if (this.config.enableDevelopmentalProcessing) {
        this.developmentalProcessor = new DevelopmentalStageProcessor(this.config, this.logger);
        await this.developmentalProcessor.initialize();
      }
      if (this.config.enableInventedWordIntelligence) {
        this.inventedWordIntelligence = new InventedWordIntelligence(this.config, this.logger);
        await this.inventedWordIntelligence.initialize();
      }
      if (this.config.enableChildLogicInterpreter) {
        this.childLogicInterpreter = new ChildLogicInterpreter(this.config, this.logger);
        await this.childLogicInterpreter.initialize();
      }
      if (this.config.enableEmotionalSpeechIntelligence) {
        this.emotionalIntelligence = new EmotionalSpeechIntelligence(this.config, this.logger);
        await this.emotionalIntelligence.initialize();
      }
      if (this.config.enableAdaptiveTranscription) {
        this.adaptiveTranscription = new AdaptiveKidTranscription(this.config, this.logger);
        await this.adaptiveTranscription.initialize();
      }
      if (this.config.enableContinuousPersonalization) {
        this.continuousPersonalization = new ContinuousPersonalization(this.config, this.logger);
        await this.continuousPersonalization.initialize();
      }
      if (this.config.enableConfidenceSystem) {
        this.confidenceSystem = new IntelligentConfidenceSystem(this.config, this.logger);
        await this.confidenceSystem.initialize();
      }
      this.isInitialized = true;
      this.logger.info('Kid Communication Intelligence Service initialized');
    } catch (error: any) {
      this.logger.error('Failed to initialize', { error: error.message });
      this.isInitialized = false;
    }
  }

  async preprocessAudio(audio: AudioInput, childProfile?: ChildProfile): Promise<AudioInput> {
    if (!this.audioIntelligence) return audio;
    try {
      return await this.audioIntelligence.enhanceAudio(audio, childProfile);
    } catch (error: any) {
      this.logger.warn('Audio preprocessing failed', { error: error.message });
      return audio;
    }
  }

  async enhanceTranscription(
    transcription: TranscriptionResult,
    audio?: AudioInput,
    childProfile?: ChildProfile,
    context?: {
      conversationHistory?: any[];
      storyContext?: any;
      sessionId?: string;
    }
  ): Promise<EnhancedTranscriptionResult> {
    let enhanced: EnhancedTranscriptionResult = {
      ...transcription,
      audioIntelligence: { pitchNormalized: false, spectralModified: false, noiseReduced: false },
      personalization: { adapted: false }
    };
    try {
      if (this.adaptiveTranscription) {
        enhanced = await this.adaptiveTranscription.enhance(enhanced, audio, childProfile);
      }
      if (this.inventedWordIntelligence && context) {
        enhanced.inventedWords = await this.inventedWordIntelligence.detectAndInfer(enhanced.text, context);
      }
      if (this.childLogicInterpreter && context) {
        enhanced.nonLinearPatterns = await this.childLogicInterpreter.analyze(enhanced.text, context.conversationHistory || []);
      }
      if (this.emotionalIntelligence && audio) {
        enhanced.emotionalContext = await this.emotionalIntelligence.analyze(audio, enhanced.text);
      }
      if (this.developmentalProcessor && childProfile) {
        enhanced.developmentalStage = await this.developmentalProcessor.process(enhanced.text, childProfile);
      }
      if (this.confidenceSystem) {
        const confidence = await this.confidenceSystem.calculate(enhanced, audio, childProfile);
        enhanced.confidenceBreakdown = confidence;
        enhanced.confidence = confidence.overall;
      }
      if (this.continuousPersonalization && childProfile) {
        await this.continuousPersonalization.learn(enhanced, childProfile, context);
      }
      return enhanced;
    } catch (error: any) {
      this.logger.warn('Transcription enhancement failed', { error: error.message });
      return enhanced;
    }
  }

  async processMultimodalInput(input: MultimodalInput, childProfile?: ChildProfile): Promise<MultimodalResult> {
    if (!this.multimodalInterpreter) {
      return { primaryInput: 'voice', validated: false };
    }
    try {
      return await this.multimodalInterpreter.interpret(input, childProfile);
    } catch (error: any) {
      this.logger.warn('Multimodal processing failed', { error: error.message });
      return { primaryInput: 'voice', validated: false };
    }
  }

  async getChildProfile(childId: string, age: number): Promise<ChildProfile> {
    return {
      childId,
      age,
      personalizationData: { adaptationCount: 0, lastAdaptation: new Date().toISOString() }
    };
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }
}
