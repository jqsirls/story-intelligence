"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
const shared_1 = require("./shared");
class ConnectionManager {
    constructor(redisUrl, logger) {
        this.connections = new Map();
        this.redis = (0, shared_1.createRedisClient)({ url: redisUrl });
        this.logger = logger;
        // Cleanup stale connections every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupStaleConnections();
        }, 300000);
    }
    async initialize() {
        await this.redis.connect();
        this.logger.info('ConnectionManager initialized');
    }
    async addConnection(connectionInfo) {
        this.connections.set(connectionInfo.connectionId, connectionInfo);
        // Store in Redis for persistence
        await this.redis.setex(`connection:${connectionInfo.connectionId}`, 3600, // 1 hour TTL
        JSON.stringify(connectionInfo));
        this.logger.info('Connection added', {
            connectionId: connectionInfo.connectionId,
            userId: connectionInfo.userId,
            totalConnections: this.connections.size
        });
    }
    async removeConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            this.connections.delete(connectionId);
            await this.redis.del(`connection:${connectionId}`);
            this.logger.info('Connection removed', {
                connectionId,
                userId: connection.userId,
                totalConnections: this.connections.size
            });
        }
    }
    async updateConnectionActivity(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.lastPing = new Date();
            connection.isActive = true;
            // Update Redis
            await this.redis.setex(`connection:${connectionId}`, 3600, JSON.stringify(connection));
        }
    }
    async getConnection(connectionId) {
        // Try memory first
        let connection = this.connections.get(connectionId);
        if (!connection) {
            // Try Redis
            const redisData = await this.redis.get(`connection:${connectionId}`);
            if (redisData) {
                const parsedConnection = JSON.parse(redisData);
                this.connections.set(connectionId, parsedConnection);
                connection = parsedConnection;
            }
        }
        return connection || null;
    }
    async getUserConnections(userId) {
        const userConnections = [];
        for (const connection of this.connections.values()) {
            if (connection.userId === userId) {
                userConnections.push(connection);
            }
        }
        return userConnections;
    }
    async getActiveConnections() {
        return Array.from(this.connections.values()).filter(conn => conn.isActive);
    }
    async getConnectionCount() {
        return this.connections.size;
    }
    async getActiveConnectionCount() {
        return (await this.getActiveConnections()).length;
    }
    async cleanupStaleConnections() {
        const now = new Date();
        const staleThreshold = 5 * 60 * 1000; // 5 minutes
        for (const [connectionId, connection] of this.connections.entries()) {
            const timeSinceLastPing = now.getTime() - connection.lastPing.getTime();
            if (timeSinceLastPing > staleThreshold) {
                this.logger.warn('Removing stale connection', {
                    connectionId,
                    userId: connection.userId,
                    timeSinceLastPing
                });
                await this.removeConnection(connectionId);
            }
        }
    }
    async shutdown() {
        clearInterval(this.cleanupInterval);
        await this.redis.disconnect();
        this.logger.info('ConnectionManager shutdown complete');
    }
}
exports.ConnectionManager = ConnectionManager;
//# sourceMappingURL=ConnectionManager.js.map