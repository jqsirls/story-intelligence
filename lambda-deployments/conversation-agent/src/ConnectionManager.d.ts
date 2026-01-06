import { Logger } from 'winston';
import { ConnectionInfo } from '../config/agent-config';
export declare class ConnectionManager {
    private connections;
    private redis;
    private logger;
    private cleanupInterval;
    constructor(redisUrl: string, logger: Logger);
    initialize(): Promise<void>;
    addConnection(connectionInfo: ConnectionInfo): Promise<void>;
    removeConnection(connectionId: string): Promise<void>;
    updateConnectionActivity(connectionId: string): Promise<void>;
    getConnection(connectionId: string): Promise<ConnectionInfo | null>;
    getUserConnections(userId: string): Promise<ConnectionInfo[]>;
    getActiveConnections(): Promise<ConnectionInfo[]>;
    getConnectionCount(): Promise<number>;
    getActiveConnectionCount(): Promise<number>;
    private cleanupStaleConnections;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ConnectionManager.d.ts.map