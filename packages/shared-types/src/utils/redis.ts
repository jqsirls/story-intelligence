import { createClient, RedisClientType } from 'redis';
import { CacheKey, CacheEntry } from '../types/infrastructure';
import { RedisConfig } from '../config';

export class RedisClient {
  private client: RedisClientType;
  private config: RedisConfig;

  constructor(config: RedisConfig) {
    this.config = config;
    this.client = createClient({
      socket: {
        host: config.host,
        port: config.port,
      },
      password: config.password,
      database: config.db,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  private buildKey(key: CacheKey): string {
    const parts = [this.config.keyPrefix, key.prefix, key.userId];
    if (key.sessionId) parts.push(key.sessionId);
    if (key.suffix) parts.push(key.suffix);
    return parts.join(':');
  }

  async get(key: CacheKey): Promise<string | null> {
    const redisKey = this.buildKey(key);
    return await this.client.get(redisKey);
  }

  async set(key: CacheKey, value: string, ttl?: number): Promise<void> {
    const redisKey = this.buildKey(key);
    const expiry = ttl || this.config.ttl || 3600; // Default 1 hour
    await this.client.setEx(redisKey, expiry, value);
  }

  async del(key: CacheKey): Promise<void> {
    const redisKey = this.buildKey(key);
    await this.client.del(redisKey);
  }

  async exists(key: CacheKey): Promise<boolean> {
    const redisKey = this.buildKey(key);
    const result = await this.client.exists(redisKey);
    return result === 1;
  }

  async expire(key: CacheKey, ttl: number): Promise<void> {
    const redisKey = this.buildKey(key);
    await this.client.expire(redisKey, ttl);
  }

  async ttl(key: CacheKey): Promise<number> {
    const redisKey = this.buildKey(key);
    return await this.client.ttl(redisKey);
  }

  async keys(pattern: string): Promise<string[]> {
    const searchPattern = `${this.config.keyPrefix}${pattern}`;
    return await this.client.keys(searchPattern);
  }

  async flushByPattern(pattern: string): Promise<void> {
    const keys = await this.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async hSet(key: CacheKey, field: string, value: string): Promise<void> {
    const redisKey = this.buildKey(key);
    await this.client.hSet(redisKey, field, value);
  }

  async hGet(key: CacheKey, field: string): Promise<string | undefined> {
    const redisKey = this.buildKey(key);
    return await this.client.hGet(redisKey, field);
  }

  async hGetAll(key: CacheKey): Promise<Record<string, string>> {
    const redisKey = this.buildKey(key);
    return await this.client.hGetAll(redisKey);
  }

  async hDel(key: CacheKey, field: string): Promise<void> {
    const redisKey = this.buildKey(key);
    await this.client.hDel(redisKey, field);
  }

  // Conversation state management
  async setConversationState(userId: string, sessionId: string, state: any, ttl?: number): Promise<void> {
    const key: CacheKey = {
      prefix: 'conversation',
      userId,
      sessionId,
      suffix: 'state',
    };
    await this.set(key, JSON.stringify(state), ttl);
  }

  async getConversationState(userId: string, sessionId: string): Promise<any | null> {
    const key: CacheKey = {
      prefix: 'conversation',
      userId,
      sessionId,
      suffix: 'state',
    };
    const state = await this.get(key);
    return state ? JSON.parse(state) : null;
  }

  async deleteConversationState(userId: string, sessionId: string): Promise<void> {
    const key: CacheKey = {
      prefix: 'conversation',
      userId,
      sessionId,
      suffix: 'state',
    };
    await this.del(key);
  }

  // Memory caching for agents
  async setMemory(userId: string, agentName: string, memory: any, ttl?: number): Promise<void> {
    const key: CacheKey = {
      prefix: 'memory',
      userId,
      suffix: agentName,
    };
    await this.set(key, JSON.stringify(memory), ttl);
  }

  async getMemory(userId: string, agentName: string): Promise<any | null> {
    const key: CacheKey = {
      prefix: 'memory',
      userId,
      suffix: agentName,
    };
    const memory = await this.get(key);
    return memory ? JSON.parse(memory) : null;
  }

  async deleteMemory(userId: string, agentName: string): Promise<void> {
    const key: CacheKey = {
      prefix: 'memory',
      userId,
      suffix: agentName,
    };
    await this.del(key);
  }
}