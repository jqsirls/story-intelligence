import winston from 'winston';
import { LogLevel, LogEntry } from '@alexa-multi-agent/shared-types';

export const createLogger = (serviceName: string) => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const logEntry: LogEntry = {
          level: info.level as LogLevel,
          message: String(info.message),
          timestamp: String(info.timestamp),
          service: serviceName,
          correlationId: info.correlationId ? String(info.correlationId) : undefined,
          userId: info.userId ? String(info.userId) : undefined,
          metadata: info.metadata as Record<string, any> | undefined,
          error: info.error as { name: string; message: string; stack?: string } | undefined,
        };
        return JSON.stringify(logEntry);
      })
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });

  return logger;
};