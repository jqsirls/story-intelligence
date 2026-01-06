import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { RealTimeMonitoringEvent } from '../types';
export declare class RealTimeMonitor {
    private redis;
    private logger;
    private enabled;
    constructor(redis: RedisClientType, logger: Logger, enabled?: boolean);
    initialize(): Promise<void>;
    logEvent(event: RealTimeMonitoringEvent): Promise<void>;
    private triggerAlert;
    getRecentEvents(limit?: number, severity?: string, eventType?: string): Promise<RealTimeMonitoringEvent[]>;
    getEventStats(): Promise<{
        totalEvents: number;
        eventsBySeverity: Record<string, number>;
        eventsByType: Record<string, number>;
        recentAlerts: number;
    }>;
    shutdown(): Promise<void>;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=RealTimeMonitor.d.ts.map