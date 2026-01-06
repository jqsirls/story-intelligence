/**
 * Idempotency Middleware
 * 
 * Provides Redis-based idempotency for cost/state-changing endpoints.
 * Prevents duplicate operations and enables safe retries.
 * 
 * Usage:
 *   app.post('/stories', requireIdempotency('create:story'), createStoryHandler);
 * 
 * Headers:
 *   X-Idempotency-Key: {client_id}:{operation}:{unique_id}:{timestamp}
 * 
 * Behavior:
 *   - First request: Processes and caches result
 *   - Duplicate request: Returns cached result (HTTP 200)
 *   - Expired key: Processes as new request
 *   - Missing key on required endpoint: Returns 400
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import { Logger } from 'winston';

// Idempotency configuration
const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const LOCK_TTL_SECONDS = 300; // 5 minutes for in-progress operations

interface IdempotencyConfig {
  lockKey: string;           // Redis key format (supports placeholders)
  ttlSeconds?: number;       // How long to cache the result
  required?: boolean;        // Whether key is required (vs optional)
  consumesQuota?: boolean;   // Whether this operation uses quota
  description?: string;      // Human-readable description
}

interface CachedResponse {
  status: number;
  body: any;
  headers: Record<string, string>;
  createdAt: string;
  expiresAt: string;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

// Singleton Redis client
let redisClient: RedisClientType | null = null;
let logger: Logger | null = null;

/**
 * Initialize the idempotency middleware with Redis connection
 */
export async function initializeIdempotency(
  redisUrl: string,
  loggerInstance: Logger
): Promise<void> {
  logger = loggerInstance;
  
  try {
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      logger?.error('Redis client error', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger?.info('Idempotency middleware connected to Redis');
    });

    await redisClient.connect();
  } catch (error) {
    logger?.error('Failed to initialize idempotency middleware', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}

/**
 * Close Redis connection
 */
export async function closeIdempotency(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Build the Redis key for an idempotency operation
 */
function buildRedisKey(
  config: IdempotencyConfig,
  idempotencyKey: string,
  req: AuthenticatedRequest
): string {
  let key = config.lockKey;
  
  // Replace placeholders
  key = key.replace('{idempotency_key}', idempotencyKey);
  key = key.replace('{user_id}', req.user?.id || 'anonymous');
  
  // Replace path parameters
  Object.entries(req.params).forEach(([param, value]) => {
    key = key.replace(`{${param}}`, String(value));
  });
  
  return `idempotency:${key}`;
}

/**
 * Build the lock key for in-progress operations
 */
function buildLockKey(redisKey: string): string {
  return `lock:${redisKey}`;
}

/**
 * Check if a response is cacheable (success responses only)
 */
function isCacheableStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Create idempotency middleware for an endpoint
 * 
 * @param lockKeyTemplate - Redis key template (e.g., "create:story:{idempotency_key}")
 * @param options - Additional configuration
 */
export function requireIdempotency(
  lockKeyTemplate: string,
  options: Partial<IdempotencyConfig> = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const config: IdempotencyConfig = {
    lockKey: lockKeyTemplate,
    ttlSeconds: options.ttlSeconds || DEFAULT_TTL_SECONDS,
    required: options.required !== false, // Default true
    consumesQuota: options.consumesQuota || false,
    description: options.description,
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Get idempotency key from header
    const idempotencyKey = req.headers['x-idempotency-key'] as string;
    
    // If key is required but missing, return error
    if (!idempotencyKey && config.required) {
      res.status(400).json({
        success: false,
        error: {
          code: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'X-Idempotency-Key header is required for this operation',
          details: {
            format: '{client_id}:{operation}:{unique_id}:{timestamp}',
            example: 'web-client:create-story:abc123:1703318400',
          },
        },
      });
      return;
    }
    
    // If no key provided and not required, proceed without idempotency
    if (!idempotencyKey) {
      next();
      return;
    }

    // Check Redis connection
    if (!redisClient) {
      logger?.warn('Idempotency middleware: Redis not connected, proceeding without idempotency');
      next();
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const redisKey = buildRedisKey(config, idempotencyKey, authReq);
    const lockKey = buildLockKey(redisKey);

    try {
      // Check if we have a cached response
      const cached = await redisClient.get(redisKey);
      
      if (cached) {
        // Return cached response
        const cachedResponse: CachedResponse = JSON.parse(cached);
        
        logger?.debug('Returning cached idempotent response', {
          key: redisKey,
          originalCreatedAt: cachedResponse.createdAt,
        });

        // Set headers to indicate this is a cached response
        res.set('X-Idempotency-Replayed', 'true');
        res.set('X-Idempotency-Original-Timestamp', cachedResponse.createdAt);
        
        // Apply original headers
        Object.entries(cachedResponse.headers).forEach(([key, value]) => {
          res.set(key, value);
        });
        
        res.status(cachedResponse.status).json(cachedResponse.body);
        return;
      }

      // Try to acquire lock for this operation
      const lockAcquired = await redisClient.set(lockKey, 'processing', {
        NX: true,
        EX: LOCK_TTL_SECONDS,
      });

      if (!lockAcquired) {
        // Another request is currently processing this key
        res.status(409).json({
          success: false,
          error: {
            code: 'OPERATION_IN_PROGRESS',
            message: 'This operation is currently being processed. Please wait and retry.',
            details: {
              idempotencyKey,
              retryAfter: 5,
            },
          },
        });
        return;
      }

      // Intercept the response to cache it
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);
      
      let responseCaptured = false;

      const captureResponse = async (body: any): Promise<void> => {
        if (responseCaptured) return;
        responseCaptured = true;

        // Only cache successful responses
        if (isCacheableStatus(res.statusCode)) {
          const cachedResponse: CachedResponse = {
            status: res.statusCode,
            body,
            headers: {
              'Content-Type': res.get('Content-Type') || 'application/json',
            },
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + (config.ttlSeconds! * 1000)).toISOString(),
          };

          await redisClient!.set(redisKey, JSON.stringify(cachedResponse), {
            EX: config.ttlSeconds,
          });

          logger?.debug('Cached idempotent response', {
            key: redisKey,
            ttl: config.ttlSeconds,
          });
        }

        // Release the lock
        await redisClient!.del(lockKey);
      };

      // Override response methods
      res.json = function(body: any) {
        captureResponse(body).catch(err => {
          logger?.error('Failed to cache idempotent response', { error: err.message });
        });
        return originalJson(body);
      };

      res.send = function(body: any) {
        // Only capture JSON responses
        if (typeof body === 'object') {
          captureResponse(body).catch(err => {
            logger?.error('Failed to cache idempotent response', { error: err.message });
          });
        }
        return originalSend(body);
      };

      // Set header indicating this is a fresh response
      res.set('X-Idempotency-Key', idempotencyKey);

      // Proceed to the actual handler
      next();

    } catch (error) {
      logger?.error('Idempotency middleware error', {
        error: error instanceof Error ? error.message : String(error),
        key: redisKey,
      });
      
      // On error, proceed without idempotency
      next();
    }
  };
}

/**
 * Optional idempotency - accepts key if provided but doesn't require it
 */
export function optionalIdempotency(
  lockKeyTemplate: string,
  options: Partial<IdempotencyConfig> = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return requireIdempotency(lockKeyTemplate, { ...options, required: false });
}

/**
 * Predefined idempotency configurations for common operations
 */
export const IdempotencyConfigs = {
  // Story operations
  createStory: {
    lockKey: 'create:story:{idempotency_key}',
    ttlSeconds: 60 * 60 * 24, // 24 hours
    required: true,
    consumesQuota: true,
    description: 'Create a new story',
  },
  
  // Asset operations
  generateAssets: {
    lockKey: 'gen:asset:{story_id}:{asset_type}',
    ttlSeconds: 60 * 60, // 1 hour
    required: true,
    consumesQuota: true,
    description: 'Generate story assets',
  },
  
  retryAsset: {
    lockKey: 'retry:asset:{asset_id}',
    ttlSeconds: 60 * 10, // 10 minutes
    required: true,
    consumesQuota: false, // Retries don't consume quota
    description: 'Retry failed asset generation',
  },
  
  // Audio operations
  generateAudio: {
    lockKey: 'gen:audio:{story_id}',
    ttlSeconds: 60 * 60, // 1 hour
    required: true,
    consumesQuota: true,
    description: 'Generate story audio',
  },
  
  // Emotion operations
  emotionCheckIn: {
    lockKey: 'checkin:{profile_id}:{timestamp_minute}',
    ttlSeconds: 60, // 1 minute (deduplication)
    required: false,
    consumesQuota: false,
    description: 'Log emotion check-in',
  },
  
  // Transfer operations
  initiateTransfer: {
    lockKey: 'transfer:{story_id}:{recipient_email}',
    ttlSeconds: 60 * 60, // 1 hour
    required: true,
    consumesQuota: false,
    description: 'Initiate story transfer',
  },
  
  acceptTransfer: {
    lockKey: 'accept:transfer:{transfer_id}',
    ttlSeconds: 60 * 60, // 1 hour
    required: true,
    consumesQuota: false,
    description: 'Accept story transfer',
  },
  
  // Subscription operations
  updateSubscription: {
    lockKey: 'sub:update:{user_id}',
    ttlSeconds: 60 * 5, // 5 minutes
    required: true,
    consumesQuota: false,
    description: 'Update subscription',
  },
} as const;

/**
 * Helper to create middleware from predefined config
 */
export function withIdempotency(
  configName: keyof typeof IdempotencyConfigs
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const config = IdempotencyConfigs[configName];
  return requireIdempotency(config.lockKey, config);
}

/**
 * Get idempotency status for a key (useful for debugging)
 */
export async function getIdempotencyStatus(
  idempotencyKey: string,
  lockKeyTemplate: string
): Promise<{
  exists: boolean;
  locked: boolean;
  cachedResponse?: CachedResponse;
  lockExpiresIn?: number;
}> {
  if (!redisClient) {
    throw new Error('Idempotency middleware not initialized');
  }

  const redisKey = `idempotency:${lockKeyTemplate.replace('{idempotency_key}', idempotencyKey)}`;
  const lockKey = buildLockKey(redisKey);

  const [cached, lockTtl] = await Promise.all([
    redisClient.get(redisKey),
    redisClient.ttl(lockKey),
  ]);

  return {
    exists: cached !== null,
    locked: lockTtl > 0,
    cachedResponse: cached ? JSON.parse(cached) : undefined,
    lockExpiresIn: lockTtl > 0 ? lockTtl : undefined,
  };
}

/**
 * Manually invalidate an idempotency key (admin use)
 */
export async function invalidateIdempotencyKey(
  idempotencyKey: string,
  lockKeyTemplate: string
): Promise<boolean> {
  if (!redisClient) {
    throw new Error('Idempotency middleware not initialized');
  }

  const redisKey = `idempotency:${lockKeyTemplate.replace('{idempotency_key}', idempotencyKey)}`;
  const lockKey = buildLockKey(redisKey);

  const [deletedCache, deletedLock] = await Promise.all([
    redisClient.del(redisKey),
    redisClient.del(lockKey),
  ]);

  return deletedCache > 0 || deletedLock > 0;
}

