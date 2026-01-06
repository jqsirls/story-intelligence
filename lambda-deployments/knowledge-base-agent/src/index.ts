// Knowledge Base Agent - Main exports
export { KnowledgeBaseAgent } from './KnowledgeBaseAgent';

// Services
export { StoryIntelligenceKnowledgeBase } from './services/StoryIntelligenceKnowledgeBase';
export { PlatformKnowledgeBase } from './services/PlatformKnowledgeBase';

// Types
export * from './types';

// Default export
// No default export to avoid type resolution issues in CI