// Universal Agent main entry point
export { UniversalStorytellerAPI } from './UniversalStorytellerAPI';
export { UniversalAPIServer } from './api/UniversalAPIServer';

// Re-export types for easy access
export type {
  ConversationConfig,
  UserMessage,
  BotResponse,
  ConversationSession,
  VoiceResponse,
  StoryCreationRequest,
  SmartDeviceConfig,
  DeviceConnection
} from './UniversalStorytellerAPI';

// Factory function for easy setup
import { UniversalStorytellerAPI } from './UniversalStorytellerAPI';
import { UniversalAPIServer } from './api/UniversalAPIServer';
// Router imported dynamically to avoid module resolution issues in Lambda
// import { Router } from '@alexa-multi-agent/router';
// @ts-ignore - Event-system is bundled at runtime, types may not be available during compilation
import { EventPublisher } from '@alexa-multi-agent/event-system';
import { Logger } from 'winston';

export interface UniversalAgentConfig {
  router: any; // Router loaded dynamically
  eventPublisher: EventPublisher;
  logger: Logger;
  apiServer?: {
    port: number;
    corsOrigins: string[];
  };
}

export function createUniversalAgent(config: UniversalAgentConfig) {
  const storytellerAPI = new UniversalStorytellerAPI(
    config.router,
    config.eventPublisher,
    config.logger
  );

  const apiServer = new UniversalAPIServer(storytellerAPI, config.logger);

  return {
    storytellerAPI,
    apiServer,
    start: (port?: number) => {
      apiServer.start(port || config.apiServer?.port || 3000);
    },
    stop: () => {
      apiServer.stop();
    }
  };
}