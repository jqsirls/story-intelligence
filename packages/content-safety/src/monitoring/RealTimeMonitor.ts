import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { RealTimeMonitoringEvent } from '../types';

export class RealTimeMonitor {
  private redis: RedisClientType;
  private logger: Logger;
  private enabled: boolean;

  constructor(redis: RedisClientType, logger: Logger, enabled: boolean = true) {
    this.redis = redis;
    this.logger = logger;
    this.enabled = enabled;
  }

  async initialize(): Promise<void> {
    if (this.enabled) {
      this.logger.info('RealTimeMonitor initialized');
    } else {
      this.logger.info('RealTimeMonitor disabled');
    }
  }

  async logEvent(event: RealTimeMonitoringEvent): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // Store event in Redis for real-time monitoring
      const eventKey = `content_safety_event:${Date.now()}:${Math.random()}`;
      await this.redis.setEx(eventKey, 3600, JSON.stringify(event)); // Store for 1 hour

      // Add to severity-based lists for quick filtering
      const severityKey = `events_by_severity:${event.severity}`;
      await this.redis.lPush(severityKey, eventKey);
      await this.redis.expire(severityKey, 3600);

      // Add to type-based lists
      const typeKey = `events_by_type:${event.eventType}`;
      await this.redis.lPush(typeKey, eventKey);
      await this.redis.expire(typeKey, 3600);

      this.logger.debug('Real-time monitoring event logged', {
        eventType: event.eventType,
        severity: event.severity,
        userId: event.userId,
        sessionId: event.sessionId
      });

      // Trigger alerts for high-severity events
      if (event.severity === 'critical' || event.severity === 'high') {
        await this.triggerAlert(event);
      }

    } catch (error) {
      this.logger.error('Failed to log monitoring event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        event: event.eventType
      });
    }
  }

  private async triggerAlert(event: RealTimeMonitoringEvent): Promise<void> {
    try {
      // Store alert for immediate attention
      const alertKey = `content_safety_alert:${Date.now()}`;
      const alertData = {
        ...event,
        alertTriggered: new Date().toISOString(),
        requiresReview: true
      };

      await this.redis.setEx(alertKey, 86400, JSON.stringify(alertData)); // Store for 24 hours

      this.logger.warn('Content safety alert triggered', {
        eventType: event.eventType,
        severity: event.severity,
        userId: event.userId,
        flags: event.flags
      });

    } catch (error) {
      this.logger.error('Failed to trigger alert', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getRecentEvents(
    limit: number = 100,
    severity?: string,
    eventType?: string
  ): Promise<RealTimeMonitoringEvent[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      let keys: string[] = [];

      if (severity) {
        keys = await this.redis.lRange(`events_by_severity:${severity}`, 0, limit - 1);
      } else if (eventType) {
        keys = await this.redis.lRange(`events_by_type:${eventType}`, 0, limit - 1);
      } else {
        // Get all recent events (this is a simplified approach)
        const allKeys = await this.redis.keys('content_safety_event:*');
        keys = allKeys.slice(0, limit);
      }

      const events: RealTimeMonitoringEvent[] = [];
      for (const key of keys) {
        const eventData = await this.redis.get(key);
        if (eventData) {
          events.push(JSON.parse(eventData));
        }
      }

      return events.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    } catch (error) {
      this.logger.error('Failed to get recent events', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  async getEventStats(): Promise<{
    totalEvents: number;
    eventsBySeverity: Record<string, number>;
    eventsByType: Record<string, number>;
    recentAlerts: number;
  }> {
    if (!this.enabled) {
      return {
        totalEvents: 0,
        eventsBySeverity: {},
        eventsByType: {},
        recentAlerts: 0
      };
    }

    try {
      // Get counts by severity
      const severities = ['low', 'medium', 'high', 'critical'];
      const eventsBySeverity: Record<string, number> = {};
      
      for (const severity of severities) {
        const count = await this.redis.lLen(`events_by_severity:${severity}`);
        eventsBySeverity[severity] = count;
      }

      // Get counts by type
      const types = ['content_generated', 'content_flagged', 'bias_detected', 'quality_issue', 'human_escalation'];
      const eventsByType: Record<string, number> = {};
      
      for (const type of types) {
        const count = await this.redis.lLen(`events_by_type:${type}`);
        eventsByType[type] = count;
      }

      // Get total events
      const totalEvents = Object.values(eventsBySeverity).reduce((sum, count) => sum + count, 0);

      // Get recent alerts
      const alertKeys = await this.redis.keys('content_safety_alert:*');
      const recentAlerts = alertKeys.length;

      return {
        totalEvents,
        eventsBySeverity,
        eventsByType,
        recentAlerts
      };

    } catch (error) {
      this.logger.error('Failed to get event stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        totalEvents: 0,
        eventsBySeverity: {},
        eventsByType: {},
        recentAlerts: 0
      };
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('RealTimeMonitor shutting down');
  }

  async healthCheck(): Promise<boolean> {
    if (!this.enabled) {
      return true; // Always healthy if disabled
    }

    try {
      // Test Redis connection
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.error('RealTimeMonitor health check failed', { error });
      return false;
    }
  }
}