import { getConfig } from '@alexa-multi-agent/shared-types';
import { createLogger } from './utils/logger';
import { createServer } from './server';

const config = getConfig();
const logger = createLogger(config.agent.name);

async function main() {
  try {
    logger.info('Starting Storytailor Agent', {
      version: config.agent.version,
      environment: config.agent.environment,
      port: config.agent.port,
    });

    const app = await createServer(config);
    
    const server = app.listen(config.agent.port, () => {
      logger.info(`Storytailor Agent listening on port ${config.agent.port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start Storytailor Agent', { error });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main };