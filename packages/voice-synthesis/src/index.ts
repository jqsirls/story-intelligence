// Main exports for the voice synthesis package
export { VoiceService } from './VoiceService';
export { ElevenLabsClient } from './clients/ElevenLabsClient';
export { PollyClient } from './clients/PollyClient';
export { FailoverPolicy } from './FailoverPolicy';
export { VoiceCloneManager } from './VoiceCloneManager';
export { MetricsCollector } from './utils/MetricsCollector';
export { CostTracker } from './utils/CostTracker';

// Type exports
export * from './types';

// Utility exports
export * from './utils/validation';

// Configuration helper
export { createDefaultConfig } from './config';