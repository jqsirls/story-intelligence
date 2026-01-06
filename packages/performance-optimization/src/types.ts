export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    ttl: number; // seconds
  };
  memory: {
    maxSize: number; // MB
    ttl: number; // seconds
  };
  cdn: {
    endpoint: string;
    bucketName: string;
    region: string;
    ttl: number; // seconds
  };
  s3: {
    bucketName: string;
    region: string;
    ttl: number; // seconds
  };
}

export interface CacheKey {
  type: 'story' | 'character' | 'asset' | 'conversation' | 'user_profile' | 'library';
  id: string;
  version?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // bytes
  tier: CacheTier;
  priority: CachePriority;
}

export type CacheTier = 'memory' | 'redis' | 'cdn' | 's3';
export type CachePriority = 'high' | 'medium' | 'low';

export interface PredictiveLoadingConfig {
  enabled: boolean;
  maxPredictions: number;
  confidenceThreshold: number;
  lookAheadTime: number; // minutes
  patterns: {
    storyProgression: boolean;
    userBehavior: boolean;
    timeBasedAccess: boolean;
  };
}

export interface ResourceAllocationConfig {
  maxMemoryUsage: number; // MB
  maxRedisConnections: number;
  maxConcurrentRequests: number;
  adaptiveScaling: {
    enabled: boolean;
    scaleUpThreshold: number; // CPU %
    scaleDownThreshold: number; // CPU %
    cooldownPeriod: number; // seconds
  };
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  redisConnections: number;
  totalRequests: number;
  errorRate: number;
  predictiveHitRate: number;
}

export interface UsagePattern {
  userId: string;
  accessTimes: number[];
  frequentlyAccessedItems: string[];
  sessionDuration: number;
  preferredContentTypes: string[];
  predictedNextAccess: {
    item: string;
    confidence: number;
    estimatedTime: number;
  }[];
}

export interface BatchRequest {
  keys: CacheKey[];
  priority: CachePriority;
  timeout: number;
}

export interface BatchResponse<T = any> {
  results: Map<string, CacheEntry<T>>;
  errors: Map<string, Error>;
  fromCache: string[];
  fromSource: string[];
}