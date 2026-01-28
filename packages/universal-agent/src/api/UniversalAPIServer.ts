import express, { Express, Request, Response } from 'express';
import { Server } from 'http';
import { Logger } from 'winston';
import { UniversalStorytellerAPI } from '../UniversalStorytellerAPI';

export class UniversalAPIServer {
  private readonly app: Express;
  private server: Server | null = null;
  private readonly logger: Logger;
  private readonly storytellerAPI: UniversalStorytellerAPI;

  constructor(storytellerAPI: UniversalStorytellerAPI, logger: Logger) {
    this.storytellerAPI = storytellerAPI;
    this.logger = logger;
    this.app = express();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // Basic status endpoint to confirm storyteller API is wired
    this.app.get('/status', (_req: Request, res: Response) => {
      res.json({ sessions: this.storytellerAPI ? 'available' : 'unavailable' });
    });
  }

  start(port: number): void {
    if (this.server) {
      return;
    }

    this.server = this.app.listen(port, () => {
      if (this.logger?.info) {
        this.logger.info(`Universal API server listening on port ${port}`);
      }
    });
  }

  stop(): void {
    if (!this.server) {
      return;
    }

    this.server.close(() => {
      if (this.logger?.info) {
        this.logger.info('Universal API server stopped');
      }
    });
    this.server = null;
  }
}

