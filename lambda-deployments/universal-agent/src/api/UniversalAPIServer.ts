import { Logger } from 'winston';
import { RESTAPIGateway } from './RESTAPIGateway';

export class UniversalAPIServer {
  private restApiGateway: RESTAPIGateway;
  private logger: Logger;

  constructor(
    storytellerAPI: any | null,
    logger: Logger
  ) {
    this.logger = logger;
    this.restApiGateway = new RESTAPIGateway(storytellerAPI, logger);
  }

  start(port: number): void {
    // For Lambda, we don't actually start a server
    // The serverless handler is used instead
    this.logger.info(`Universal API Server configured for port ${port} (Lambda deployment)`);
  }

  stop(): void {
    // No-op for Lambda deployment
    this.logger.info('Universal API Server stopped');
  }

  getHandler(): any {
    // Return the serverless handler for Lambda
    // Access the handler through the RESTAPIGateway's handleLambdaEvent method
    return (event: any, context: any) => {
      return this.restApiGateway.handleLambdaEvent(event, context);
    };
  }
}
