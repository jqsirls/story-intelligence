import { RedisClientType } from 'redis';
import { Logger } from 'winston';

export interface EphemeralData {
  sessionId: string;
  userId: string;
  dataType: 'emotional_response' | 'support_session' | 'crisis_data' | 'therapeutic_context';
  data: any;
  createdAt: string;
  expiresAt: string;
}

export interface DataRetentionPolicy {
  therapeuticData: {
    maxRetentionHours: number;
    autoDeleteEnabled: boolean;
    encryptionRequired: boolean;
  };
  supportSessions: {
    maxRetentionHours: number;
    autoDeleteEnabled: boolean;
  };
  crisisData: {
    maxRetentionHours: number; // Longer for safety follow-up
    autoDeleteEnabled: boolean;
    alertOnDeletion: boolean;
  };
}

export class DataRetentionManager {
  private redis: RedisClientType;
  private logger: Logger;
  private policy: DataRetentionPolicy;

  constructor(redis: RedisClientType, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
    this.policy = {
      therapeuticData: {
        maxRetentionHours: 24, // 24 hours max
        autoDeleteEnabled: true,
        encryptionRequired: true
      },
      supportSessions: {
        maxRetentionHours: 12, // 12 hours max
        autoDeleteEnabled: true
      },
      crisisData: {
        maxRetentionHours: 72, // 72 hours for safety follow-up
        autoDeleteEnabled: true,
        alertOnDeletion: true
      }
    };
  }

  /**
   * Store ephemeral therapeutic data with automatic expiration
   */
  async storeEphemeralData(data: Omit<EphemeralData, 'createdAt' | 'expiresAt'>): Promise<void> {
    const now = new Date();
    const retentionHours = this.getRetentionHours(data.dataType);
    const expiresAt = new Date(now.getTime() + (retentionHours * 60 * 60 * 1000));

    const ephemeralData: EphemeralData = {
      ...data,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    const key = this.generateKey(data.dataType, data.sessionId, data.userId);
    
    // Store with automatic expiration
    await this.redis.setEx(
      key, 
      retentionHours * 3600, // TTL in seconds
      JSON.stringify(ephemeralData)
    );

    this.logger.info('Ephemeral therapeutic data stored', {
      dataType: data.dataType,
      sessionId: data.sessionId,
      expiresAt: expiresAt.toISOString(),
      retentionHours
    });
  }

  /**
   * Retrieve ephemeral data (if not expired)
   */
  async getEphemeralData(
    dataType: EphemeralData['dataType'], 
    sessionId: string, 
    userId: string
  ): Promise<EphemeralData | null> {
    const key = this.generateKey(dataType, sessionId, userId);
    const data = await this.redis.get(key);
    
    if (!data) {
      return null;
    }

    const ephemeralData: EphemeralData = JSON.parse(data);
    
    // Double-check expiration (Redis should handle this, but safety first)
    if (new Date() > new Date(ephemeralData.expiresAt)) {
      await this.redis.del(key);
      this.logger.warn('Expired therapeutic data accessed and deleted', {
        dataType,
        sessionId,
        expiredAt: ephemeralData.expiresAt
      });
      return null;
    }

    return ephemeralData;
  }

  /**
   * Immediately purge all therapeutic data for a session
   */
  async purgeSessionData(sessionId: string, userId: string): Promise<void> {
    const dataTypes: EphemeralData['dataType'][] = [
      'emotional_response',
      'support_session', 
      'crisis_data',
      'therapeutic_context'
    ];

    const deletePromises = dataTypes.map(dataType => {
      const key = this.generateKey(dataType, sessionId, userId);
      return this.redis.del(key);
    });

    await Promise.all(deletePromises);

    this.logger.info('Session therapeutic data purged', {
      sessionId,
      userId,
      dataTypesPurged: dataTypes.length
    });
  }

  /**
   * Purge all therapeutic data for a user
   */
  async purgeUserTherapeuticData(userId: string): Promise<void> {
    const pattern = `therapeutic:*:${userId}`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(keys);
      this.logger.info('User therapeutic data purged', {
        userId,
        keysPurged: keys.length
      });
    }
  }

  /**
   * Run scheduled cleanup of expired data
   */
  async runScheduledCleanup(): Promise<{
    cleaned: number;
    errors: number;
  }> {
    let cleaned = 0;
    let errors = 0;

    try {
      // Get all therapeutic data keys
      const patterns = [
        'therapeutic:emotional_response:*',
        'therapeutic:support_session:*',
        'therapeutic:crisis_data:*',
        'therapeutic:therapeutic_context:*'
      ];

      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        
        for (const key of keys) {
          try {
            const data = await this.redis.get(key);
            if (data) {
              const ephemeralData: EphemeralData = JSON.parse(data);
              
              // Check if expired
              if (new Date() > new Date(ephemeralData.expiresAt)) {
                await this.redis.del(key);
                cleaned++;
                
                // Alert on crisis data deletion if configured
                if (ephemeralData.dataType === 'crisis_data' && this.policy.crisisData.alertOnDeletion) {
                  this.logger.warn('Crisis data auto-deleted', {
                    sessionId: ephemeralData.sessionId,
                    userId: ephemeralData.userId,
                    expiredAt: ephemeralData.expiresAt
                  });
                }
              }
            }
          } catch (error) {
            errors++;
            this.logger.error('Error during cleanup of key', { key, error });
          }
        }
      }

      this.logger.info('Scheduled therapeutic data cleanup completed', {
        cleaned,
        errors
      });

    } catch (error) {
      this.logger.error('Error during scheduled cleanup', { error });
      errors++;
    }

    return { cleaned, errors };
  }

  /**
   * Get data retention statistics
   */
  async getRetentionStats(): Promise<{
    totalEphemeralRecords: number;
    byDataType: Record<string, number>;
    oldestRecord: string | null;
    newestRecord: string | null;
  }> {
    const patterns = [
      'therapeutic:emotional_response:*',
      'therapeutic:support_session:*',
      'therapeutic:crisis_data:*',
      'therapeutic:therapeutic_context:*'
    ];

    const stats = {
      totalEphemeralRecords: 0,
      byDataType: {} as Record<string, number>,
      oldestRecord: null as string | null,
      newestRecord: null as string | null
    };

    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      const dataType = pattern.split(':')[1];
      stats.byDataType[dataType] = keys.length;
      stats.totalEphemeralRecords += keys.length;

      // Check dates for oldest/newest
      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const ephemeralData: EphemeralData = JSON.parse(data);
            const createdDate = new Date(ephemeralData.createdAt);
            
            if (!oldestDate || createdDate < oldestDate) {
              oldestDate = createdDate;
              stats.oldestRecord = ephemeralData.createdAt;
            }
            
            if (!newestDate || createdDate > newestDate) {
              newestDate = createdDate;
              stats.newestRecord = ephemeralData.createdAt;
            }
          }
        } catch (error) {
          // Skip malformed data
        }
      }
    }

    return stats;
  }

  /**
   * Create sanitized story data for permanent storage
   */
  sanitizeStoryForStorage(storyContent: string, storyType: string): {
    sanitizedContent: string;
    metadata: {
      storyType: string;
      wordCount: number;
      createdAt: string;
      containsTherapeuticElements: boolean;
    };
  } {
    // Remove any personal identifiers or sensitive therapeutic content
    let sanitizedContent = storyContent;
    
    // Remove common PII patterns
    sanitizedContent = sanitizedContent.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
    sanitizedContent = sanitizedContent.replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]');
    sanitizedContent = sanitizedContent.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
    
    // Remove specific therapeutic context that shouldn't be stored
    const therapeuticPatterns = [
      /my child who died/gi,
      /when I lost my baby/gi,
      /my trauma from/gi,
      /I was abused/gi,
      /my therapist said/gi
    ];
    
    therapeuticPatterns.forEach(pattern => {
      sanitizedContent = sanitizedContent.replace(pattern, '[THERAPEUTIC_CONTEXT]');
    });

    const therapeuticStoryTypes = ['Child Loss', 'Inner Child', 'New Birth'];
    
    return {
      sanitizedContent,
      metadata: {
        storyType,
        wordCount: sanitizedContent.split(/\s+/).length,
        createdAt: new Date().toISOString(),
        containsTherapeuticElements: therapeuticStoryTypes.includes(storyType)
      }
    };
  }

  private generateKey(dataType: EphemeralData['dataType'], sessionId: string, userId: string): string {
    return `therapeutic:${dataType}:${sessionId}:${userId}`;
  }

  private getRetentionHours(dataType: EphemeralData['dataType']): number {
    switch (dataType) {
      case 'emotional_response':
      case 'therapeutic_context':
        return this.policy.therapeuticData.maxRetentionHours;
      case 'support_session':
        return this.policy.supportSessions.maxRetentionHours;
      case 'crisis_data':
        return this.policy.crisisData.maxRetentionHours;
      default:
        return 24; // Default 24 hours
    }
  }

  /**
   * Emergency purge all therapeutic data (GDPR compliance)
   */
  async emergencyPurgeAllTherapeuticData(): Promise<{
    purged: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let purged = 0;

    try {
      const allTherapeuticKeys = await this.redis.keys('therapeutic:*');
      
      if (allTherapeuticKeys.length > 0) {
        await this.redis.del(allTherapeuticKeys);
        purged = allTherapeuticKeys.length;
      }

      this.logger.warn('Emergency purge of all therapeutic data completed', {
        keysPurged: purged
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      this.logger.error('Error during emergency purge', { error: errorMsg });
    }

    return { purged, errors };
  }
}