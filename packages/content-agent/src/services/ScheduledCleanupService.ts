import { ContentAgent } from '../ContentAgent';
import { Logger } from 'winston';

export class ScheduledCleanupService {
  private contentAgent: ContentAgent;
  private logger: Logger;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(contentAgent: ContentAgent, logger: Logger) {
    this.contentAgent = contentAgent;
    this.logger = logger;
  }

  /**
   * Start scheduled cleanup of therapeutic data
   * Runs every 6 hours by default
   */
  start(intervalHours: number = 6): void {
    if (this.isRunning) {
      this.logger.warn('Scheduled cleanup already running');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    this.cleanupInterval = setInterval(async () => {
      await this.runCleanup();
    }, intervalMs);

    this.isRunning = true;
    
    this.logger.info('Scheduled therapeutic data cleanup started', {
      intervalHours,
      nextCleanup: new Date(Date.now() + intervalMs).toISOString()
    });

    // Run initial cleanup
    this.runCleanup();
  }

  /**
   * Stop scheduled cleanup
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.isRunning = false;
    this.logger.info('Scheduled therapeutic data cleanup stopped');
  }

  /**
   * Run cleanup manually
   */
  async runCleanup(): Promise<void> {
    try {
      this.logger.info('Starting scheduled therapeutic data cleanup');
      
      const result = await this.contentAgent.runTherapeuticDataCleanup();
      
      this.logger.info('Scheduled therapeutic data cleanup completed', {
        recordsCleaned: result.cleaned,
        errors: result.errors,
        timestamp: new Date().toISOString()
      });

      // Alert if there were errors
      if (result.errors > 0) {
        this.logger.error('Errors occurred during therapeutic data cleanup', {
          errorCount: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Failed to run scheduled therapeutic data cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get cleanup service status
   */
  getStatus(): {
    isRunning: boolean;
    nextCleanup: string | null;
  } {
    return {
      isRunning: this.isRunning,
      nextCleanup: this.cleanupInterval ? 
        new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() : 
        null
    };
  }
}

/**
 * Privacy-focused configuration for therapeutic data handling
 */
export const PRIVACY_CONFIG = {
  // Maximum retention times (in hours)
  RETENTION_LIMITS: {
    EMOTIONAL_RESPONSES: 24,    // 24 hours max
    SUPPORT_SESSIONS: 12,       // 12 hours max  
    CRISIS_DATA: 72,           // 72 hours for safety follow-up
    THERAPEUTIC_CONTEXT: 24     // 24 hours max
  },
  
  // Cleanup schedule
  CLEANUP_INTERVAL_HOURS: 6,    // Run cleanup every 6 hours
  
  // Data sanitization rules
  SANITIZATION: {
    REMOVE_PII: true,
    REMOVE_THERAPEUTIC_DETAILS: true,
    KEEP_STORY_STRUCTURE: true,
    KEEP_BASIC_METADATA: true
  },
  
  // Compliance settings
  COMPLIANCE: {
    GDPR_ENABLED: true,
    AUTO_DELETE_ENABLED: true,
    AUDIT_LOGGING: true,
    ENCRYPTION_REQUIRED: true
  }
} as const;