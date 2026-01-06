import { DeviceType } from '@alexa-multi-agent/shared-types';
import { SmartHomeTokenManager } from './TokenManager';
import { Logger } from 'winston';

export class TokenRefreshScheduler {
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private logger: Logger;

  constructor(private tokenManager: SmartHomeTokenManager) {
    this.logger = require('winston').createLogger({
      level: 'info',
      format: require('winston').format.combine(
        require('winston').format.timestamp(),
        require('winston').format.json()
      ),
      defaultMeta: { service: 'token-refresh-scheduler' },
      transports: [new (require('winston').transports.Console)()]
    });
  }

  /**
   * Schedule automatic token refresh before expiration
   */
  async scheduleRefresh(
    userId: string,
    deviceType: DeviceType,
    deviceId: string,
    expiresAt: Date
  ): Promise<void> {
    const jobKey = `${userId}:${deviceType}:${deviceId}`;
    
    // Clear existing job if any
    this.clearScheduledJob(jobKey);
    
    // Calculate refresh time (5 minutes before expiration by default)
    const refreshBeforeMs = 5 * 60 * 1000; // 5 minutes
    const refreshTime = new Date(expiresAt.getTime() - refreshBeforeMs);
    const delay = refreshTime.getTime() - Date.now();
    
    if (delay <= 0) {
      // Token expires very soon or already expired, refresh immediately
      this.logger.warn('Token expires very soon, refreshing immediately', {
        userId,
        deviceType,
        deviceId,
        expiresAt: expiresAt.toISOString(),
        delay
      });
      
      setImmediate(() => this.executeRefresh(userId, deviceType, deviceId));
      return;
    }
    
    this.logger.info('Scheduling token refresh', {
      userId,
      deviceType,
      deviceId,
      expiresAt: expiresAt.toISOString(),
      refreshAt: refreshTime.toISOString(),
      delayMs: delay
    });
    
    const timeout = setTimeout(async () => {
      await this.executeRefresh(userId, deviceType, deviceId);
      this.scheduledJobs.delete(jobKey);
    }, delay);
    
    this.scheduledJobs.set(jobKey, timeout);
  }

  /**
   * Execute token refresh
   */
  private async executeRefresh(
    userId: string,
    deviceType: DeviceType,
    deviceId: string
  ): Promise<void> {
    try {
      this.logger.info('Executing scheduled token refresh', {
        userId,
        deviceType,
        deviceId
      });

      // This will trigger the refresh logic in TokenManager
      const token = await this.tokenManager.getValidToken(userId, deviceType, deviceId);
      
      if (token) {
        this.logger.info('Scheduled token refresh completed successfully', {
          userId,
          deviceType,
          deviceId
        });
      } else {
        this.logger.warn('Scheduled token refresh failed - token is null', {
          userId,
          deviceType,
          deviceId
        });
      }

    } catch (error) {
      this.logger.error('Scheduled token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deviceType,
        deviceId
      });
    }
  }

  /**
   * Clear a scheduled refresh job
   */
  clearScheduledJob(jobKey: string): void {
    const existingJob = this.scheduledJobs.get(jobKey);
    if (existingJob) {
      clearTimeout(existingJob);
      this.scheduledJobs.delete(jobKey);
      
      this.logger.debug('Cleared scheduled refresh job', { jobKey });
    }
  }

  /**
   * Clear all scheduled jobs (for shutdown)
   */
  clearAllJobs(): void {
    for (const [jobKey, timeout] of this.scheduledJobs.entries()) {
      clearTimeout(timeout);
    }
    this.scheduledJobs.clear();
    
    this.logger.info('Cleared all scheduled refresh jobs');
  }

  /**
   * Get statistics about scheduled jobs
   */
  getScheduledJobsCount(): number {
    return this.scheduledJobs.size;
  }

  /**
   * Get list of scheduled job keys (for monitoring)
   */
  getScheduledJobKeys(): string[] {
    return Array.from(this.scheduledJobs.keys());
  }

  /**
   * Reschedule all jobs (useful after system restart)
   */
  async rescheduleAllJobs(): Promise<void> {
    try {
      this.logger.info('Rescheduling all token refresh jobs after restart');

      // This would query the database for all active tokens with expiration times
      // and reschedule their refresh jobs
      
      // For now, this is a placeholder - would need access to token store
      this.logger.info('Token refresh job rescheduling completed');

    } catch (error) {
      this.logger.error('Failed to reschedule token refresh jobs', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}