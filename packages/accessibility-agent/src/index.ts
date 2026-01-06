export { AccessibilityAgent } from './AccessibilityAgent';
export { AdaptiveCommunicationEngine } from './services/AdaptiveCommunicationEngine';
export { VocabularyAdapter } from './services/VocabularyAdapter';
export { EngagementManager } from './services/EngagementManager';
export { AssistiveTechnologyIntegrator } from './services/AssistiveTechnologyIntegrator';
export { MultiModalInputProcessor } from './services/MultiModalInputProcessor';
export { InclusiveDesignEngine } from './services/InclusiveDesignEngine';

export * from './types';

// Re-export commonly used types for convenience
export type {
  AccessibilityProfile,
  CommunicationAdaptation,
  EngagementCheck,
  AssistiveTechnology,
  VocabularyAdaptation,
  MultiModalInput,
  ResponseAdaptation,
} from './types';