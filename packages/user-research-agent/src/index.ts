/**
 * Fieldnotes (User Research Agent)
 * Main export file
 */

// Core engine
export { ResearchEngine } from './core/ResearchEngine';

// Tracks
export { ContinuousInsightMining } from './core/tracks/ContinuousInsightMining';
export { BuyerRealityCheck } from './core/tracks/BuyerRealityCheck';
export { UserExperienceGuardrails } from './core/tracks/UserExperienceGuardrails';
export { ConceptInterrogation } from './core/tracks/ConceptInterrogation';
export { BrandConsistency } from './core/tracks/BrandConsistency';

// Cost optimization
export { ModelOrchestrator } from './core/ModelOrchestrator';
export { BatchProcessor } from './core/BatchProcessor';
export { SmartSampler } from './core/SmartSampler';
export { CostController } from './core/CostController';

// Adversarial features
export { TruthTeller } from './core/TruthTeller';
export { TensionMapper } from './core/TensionMapper';
export { AgentChallenger } from './core/AgentChallenger';

// Integrations
export { EventCollector } from './core/EventCollector';
export { SlackAdapter } from './integrations/SlackAdapter';
export { EmailAdapter } from './integrations/EmailAdapter';
export { WebhookAdapter } from './integrations/WebhookAdapter';

// SDK
export { FieldnotesClient, createClient } from './sdk';

// Scheduler
export { ResearchScheduler } from './scheduler';

// Config
export { storytailorConfig, initializeStorytalorTenant } from './config/tenants/storytailor';

// Types
export * from './types';

// Utils
export { Logger } from './utils/logger';
