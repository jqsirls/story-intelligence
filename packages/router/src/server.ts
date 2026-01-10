import express from 'express';
import cors, { CorsOptions } from 'cors';
import { createLogger } from './utils/logger';

export interface RouterServerConfig {
  agent: {
    name: string;
    version: string;
  };
  cors?: CorsOptions;
}

export const createServer = (config: RouterServerConfig): express.Express => {
  const app = express();
  const logger = createLogger('router-agent-server');

  // Middleware
  app.use(cors(config.cors));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: config.agent.name,
      version: config.agent.version,
      timestamp: new Date().toISOString(),
    });
  });

  // Metrics endpoint
  app.get('/metrics', (req, res) => {
    res.json({
      service: config.agent.name,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  });

  // Error handling middleware
  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal server error occurred',
        correlationId: req.headers['x-correlation-id'] || 'unknown',
      },
    });
  });

  return app;
};