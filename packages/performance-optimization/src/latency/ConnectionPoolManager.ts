import { EventEmitter } from 'events';

export interface ConnectionPoolConfig {
  maxConnections: number;
  keepAliveTimeout: number; // ms
  idleTimeout: number; // ms
}

export interface Connection {
  id: string;
  type: string;
  created: number;
  lastUsed: number;
  inUse: boolean;
  keepAlive: boolean;
  metadata: any;
}

export class ConnectionPoolManager extends EventEmitter {
  private config: ConnectionPoolConfig;
  private pools: Map<string, ConnectionPool>;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: ConnectionPoolConfig) {
    super();
    this.config = config;
    this.pools = new Map();
    
    // Start cleanup process
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 30000); // Cleanup every 30 seconds
  }

  async getConnection(type: string): Promise<Connection> {
    let pool = this.pools.get(type);
    
    if (!pool) {
      pool = new ConnectionPool(type, this.config);
      this.pools.set(type, pool);
      this.emit('poolCreated', { type, maxSize: this.config.maxConnections });
    }

    const connection = await pool.acquire();
    this.emit('connectionAcquired', { type, connectionId: connection.id });
    
    return connection;
  }

  releaseConnection(connection: Connection): void {
    const pool = this.pools.get(connection.type);
    if (pool) {
      pool.release(connection);
      this.emit('connectionReleased', { 
        type: connection.type, 
        connectionId: connection.id 
      });
    }
  }

  getUtilization(): number {
    let totalConnections = 0;
    let inUseConnections = 0;

    for (const pool of this.pools.values()) {
      const stats = pool.getStats();
      totalConnections += stats.total;
      inUseConnections += stats.inUse;
    }

    return totalConnections > 0 ? inUseConnections / totalConnections : 0;
  }

  getPoolStats(type?: string): Map<string, PoolStats> {
    const stats = new Map<string, PoolStats>();
    
    if (type) {
      const pool = this.pools.get(type);
      if (pool) {
        stats.set(type, pool.getStats());
      }
    } else {
      for (const [poolType, pool] of this.pools.entries()) {
        stats.set(poolType, pool.getStats());
      }
    }
    
    return stats;
  }

  updateConfig(config: Partial<ConnectionPoolConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update existing pools
    for (const pool of this.pools.values()) {
      pool.updateConfig(this.config);
    }
    
    this.emit('configUpdated', this.config);
  }

  private cleanupIdleConnections(): void {
    const now = Date.now();
    let totalCleaned = 0;

    for (const [type, pool] of this.pools.entries()) {
      const cleaned = pool.cleanupIdle(now);
      totalCleaned += cleaned;
      
      if (cleaned > 0) {
        this.emit('idleConnectionsCleaned', { type, count: cleaned });
      }
    }

    if (totalCleaned > 0) {
      this.emit('cleanupComplete', { totalCleaned });
    }
  }

  async shutdown(): Promise<void> {
    clearInterval(this.cleanupInterval);
    
    // Close all pools
    const shutdownPromises = Array.from(this.pools.values()).map(pool => 
      pool.shutdown()
    );
    
    await Promise.all(shutdownPromises);
    this.pools.clear();
    
    this.emit('shutdown');
  }
}

class ConnectionPool {
  private type: string;
  private config: ConnectionPoolConfig;
  private available: Connection[] = [];
  private inUse: Set<Connection> = new Set();
  private waitingQueue: Array<{
    resolve: (connection: Connection) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];

  constructor(type: string, config: ConnectionPoolConfig) {
    this.type = type;
    this.config = config;
  }

  async acquire(): Promise<Connection> {
    // Try to get an available connection
    const available = this.available.pop();
    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      this.inUse.add(available);
      return available;
    }

    // Create new connection if under limit
    if (this.getTotalConnections() < this.config.maxConnections) {
      const connection = await this.createConnection();
      connection.inUse = true;
      this.inUse.add(connection);
      return connection;
    }

    // Wait for a connection to become available
    return new Promise((resolve, reject) => {
      this.waitingQueue.push({
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Set timeout for waiting
      setTimeout(() => {
        const index = this.waitingQueue.findIndex(w => w.resolve === resolve);
        if (index >= 0) {
          this.waitingQueue.splice(index, 1);
          reject(new Error(`Connection acquisition timeout for type: ${this.type}`));
        }
      }, 10000); // 10 second timeout
    });
  }

  release(connection: Connection): void {
    if (!this.inUse.has(connection)) {
      return; // Connection not from this pool
    }

    this.inUse.delete(connection);
    connection.inUse = false;
    connection.lastUsed = Date.now();

    // Check if there are waiting requests
    const waiting = this.waitingQueue.shift();
    if (waiting) {
      connection.inUse = true;
      this.inUse.add(connection);
      waiting.resolve(connection);
      return;
    }

    // Return to available pool if keep-alive is enabled
    if (connection.keepAlive) {
      this.available.push(connection);
    } else {
      this.destroyConnection(connection);
    }
  }

  getStats(): PoolStats {
    return {
      type: this.type,
      total: this.getTotalConnections(),
      available: this.available.length,
      inUse: this.inUse.size,
      waiting: this.waitingQueue.length,
      maxConnections: this.config.maxConnections
    };
  }

  updateConfig(config: ConnectionPoolConfig): void {
    this.config = config;
    
    // If max connections reduced, close excess connections
    if (this.getTotalConnections() > config.maxConnections) {
      const excess = this.getTotalConnections() - config.maxConnections;
      const toClose = this.available.splice(0, excess);
      toClose.forEach(conn => this.destroyConnection(conn));
    }
  }

  cleanupIdle(now: number): number {
    let cleaned = 0;
    
    // Remove idle connections
    this.available = this.available.filter(connection => {
      const idle = now - connection.lastUsed;
      if (idle > this.config.idleTimeout) {
        this.destroyConnection(connection);
        cleaned++;
        return false;
      }
      return true;
    });

    return cleaned;
  }

  async shutdown(): Promise<void> {
    // Reject all waiting requests
    for (const waiting of this.waitingQueue) {
      waiting.reject(new Error('Pool is shutting down'));
    }
    this.waitingQueue.length = 0;

    // Close all connections
    const allConnections = [...this.available, ...this.inUse];
    for (const connection of allConnections) {
      this.destroyConnection(connection);
    }

    this.available.length = 0;
    this.inUse.clear();
  }

  private async createConnection(): Promise<Connection> {
    const connection: Connection = {
      id: this.generateConnectionId(),
      type: this.type,
      created: Date.now(),
      lastUsed: Date.now(),
      inUse: false,
      keepAlive: true,
      metadata: await this.initializeConnection(this.type)
    };

    return connection;
  }

  private async initializeConnection(type: string): Promise<any> {
    // This would contain type-specific connection initialization
    // For example, HTTP client, database connection, etc.
    switch (type) {
      case 'http':
        return this.createHttpConnection();
      case 'database':
        return this.createDatabaseConnection();
      case 'redis':
        return this.createRedisConnection();
      default:
        return {};
    }
  }

  private createHttpConnection(): any {
    // Create HTTP client with keep-alive
    return {
      agent: {
        keepAlive: true,
        keepAliveMsecs: this.config.keepAliveTimeout,
        maxSockets: 1
      }
    };
  }

  private createDatabaseConnection(): any {
    // Database connection configuration
    return {
      connectionString: process.env.DATABASE_URL,
      pooled: true
    };
  }

  private createRedisConnection(): any {
    // Redis connection configuration
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      keepAlive: true
    };
  }

  private destroyConnection(connection: Connection): void {
    // Perform any cleanup needed for the connection
    if (connection.metadata?.close) {
      try {
        connection.metadata.close();
      } catch (error) {
        // Log error but don't throw
        console.error('Error closing connection:', error);
      }
    }
  }

  private generateConnectionId(): string {
    return `${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTotalConnections(): number {
    return this.available.length + this.inUse.size;
  }
}

interface PoolStats {
  type: string;
  total: number;
  available: number;
  inUse: number;
  waiting: number;
  maxConnections: number;
}