/**
 * Kid Communication Intelligence System
 * 
 * Main export for the kid communication intelligence package
 */

export { KidCommunicationIntelligenceService } from './KidCommunicationIntelligenceService';
export * from './types';

// Export components (optional - can be imported individually)
export { TestTimeAdaptation } from './personalization/TestTimeAdaptation';
export { KidAudioIntelligence } from './audio/KidAudioIntelligence';
export { MultimodalKidInterpreter } from './multimodal/MultimodalKidInterpreter';
export { DevelopmentalStageProcessor } from './developmental/DevelopmentalStageProcessor';
export { InventedWordIntelligence } from './language/InventedWordIntelligence';
export { ChildLogicInterpreter } from './logic/ChildLogicInterpreter';
export { EmotionalSpeechIntelligence } from './emotion/EmotionalSpeechIntelligence';
export { AdaptiveKidTranscription } from './transcription/AdaptiveKidTranscription';
export { ContinuousPersonalization } from './learning/ContinuousPersonalization';
export { IntelligentConfidenceSystem } from './confidence/IntelligentConfidenceSystem';
