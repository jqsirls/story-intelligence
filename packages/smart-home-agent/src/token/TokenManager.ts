import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Database } from '@alexa-multi-agent/shared-types';
import { Logger } from 'winston';
import * as crypto from 'crypto';

import {
  DeviceType,
  DeviceTokenData,
  DeviceTokenRecord,
  SmartHomeConfig,
  EncryptionService,
  TokenStore
} from '@alexa-multi-agent/shared-types';

import { SmartHomeAgentConfig } from '../types';
import { TokenRefreshScheduler } from './TokenRefreshScheduler';
import { DeviceTokenStore } from './TokenStore';
import { TokenEncryptionService } from './EncryptionService';

export class SmartHomeTokenManager {
  private tokenStore: TokenStore;
  private refreshScheduler: TokenRefreshScheduler;
  private encryptionService: EncryptionService;
  private logger: Logger;

  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: SmartHomeAgentConfig
  ) {
    this.tokenStore = new DeviceTokenStore(supabase, redis);
    this.encryptionService = new TokenEncryptionService(config.encryption);
    this.refreshScheduler = new TokenRefreshScheduler(this);
    
    this.logger = require('winston').createLogger({
      level: config.logging.level,
      format: require('winston').format.combine(
        require('winston').format.timestamp(),
        require('winston').format.json()
      ),
      defaultMeta: { service: 'token-manager' },
      transports: [new (require('winston').transports.Console)()]
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.encryptionService.rotateKeys();
      this.logger.info('TokenManager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize TokenManager', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Store device token with encryption and automatic refresh scheduling
   */
  async storeDeviceToken(
    userId: string,
    deviceType: DeviceType,
    tokenData: DeviceTokenData
  ): Promise<void> {
    try {
      this.logger.info('Storing device token', {
        userId,
        deviceType,
        deviceId: tokenData.deviceId,
        tokenType: tokenData.tokenType
      });

      // Encrypt token data
      const encryptedToken = await this.encryptionService.encrypt({
        accessToken: tokenData.accessToken,
        scope: tokenData.scope,
        metadata: tokenData.metadata
      });

      let encryptedRefreshToken: string | undefined;
      if (tokenData.refreshToken) {
        encryptedRefreshToken = await this.encryptionService.encrypt({
          refreshToken: tokenData.refreshToken
        });
      }

      // Store in database
      const tokenRecord: Omit<DeviceTokenRecord, 'id'> = {
        userId,
        deviceId: tokenData.deviceId,
        deviceType,
        encryptedToken,
        tokenType: tokenData.tokenType,
        expiresAt: tokenData.expiresAt,
        refreshToken: encryptedRefreshToken,
        lastRefreshed: new Date().toISOString(),
        refreshAttempts: 0,
        status: 'active'
      };

      const tokenId = await this.tokenStore.store(tokenRecord);

      // Schedule automatic refresh if token has expiration and refresh token
      if (tokenData.expiresAt && tokenData.refreshToken) {
        await this.refreshScheduler.scheduleRefresh(
          userId,
          deviceType,
          tokenData.deviceId,
          new Date(tokenData.expiresAt)
        );
      }

      this.logger.info('Device token stored successfully', {
        userId,
        deviceType,
        tokenId,
        expiresAt: tokenData.expiresAt
      });

    } catch (error) {
      this.logger.error('Failed to store device token', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deviceType
      });
      throw error;
    }
  }

  /**
   * Get valid token, refreshing if necessary
   */
  async getValidToken(
    userId: string,
    deviceType: DeviceType,
    deviceId: string
  ): Promise<string | null> {
    try {
      const tokenRecord = await this.tokenStore.get(userId, deviceType, deviceId);

      if (!tokenRecord) {
        this.logger.warn('No token found for device', { userId, deviceType, deviceId });
        return null;
      }

      // Check if token is expired
      if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) <= new Date()) {
        this.logger.info('Token expired, attempting refresh', {
          userId,
          deviceType,
          deviceId,
          expiresAt: tokenRecord.expiresAt
        });

        const refreshedToken = await this.refreshToken(tokenRecord);
        if (!refreshedToken) {
          await this.tokenStore.markAsExpired(tokenRecord.id);
          return null;
        }
        return refreshedToken;
      }

      // Decrypt and return token
      const decryptedData = await this.encryptionService.decrypt(tokenRecord.encryptedToken);
      
      this.logger.debug('Retrieved valid token', {
        userId,
        deviceType,
        deviceId,
        tokenType: tokenRecord.tokenType
      });

      return decryptedData.accessToken;

    } catch (error) {
      this.logger.error('Failed to get valid token', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deviceType,
        deviceId
      });
      return null;
    }
  }

  /**
   * Refresh an expired token
   */
  async refreshToken(tokenRecord: DeviceTokenRecord): Promise<string | null> {
    if (!tokenRecord.refreshToken) {
      this.logger.warn('No refresh token available', {
        userId: tokenRecord.userId,
        deviceType: tokenRecord.deviceType,
        deviceId: tokenRecord.deviceId
      });
      await this.tokenStore.markAsExpired(tokenRecord.id);
      return null;
    }

    try {
      this.logger.info('Refreshing device token', {
        userId: tokenRecord.userId,
        deviceType: tokenRecord.deviceType,
        deviceId: tokenRecord.deviceId,
        attempt: tokenRecord.refreshAttempts + 1
      });

      // Decrypt refresh token
      const decryptedRefreshData = await this.encryptionService.decrypt(tokenRecord.refreshToken);
      
      // Get device manager for token refresh
      const deviceManager = this.getDeviceManager(tokenRecord.deviceType);
      if (!deviceManager) {
        throw new Error(`No device manager for type: ${tokenRecord.deviceType}`);
      }

      // Attempt token refresh
      const newTokenData = await deviceManager.refreshToken(decryptedRefreshData.refreshToken);

      if (newTokenData) {
        // Store the new token
        await this.storeDeviceToken(
          tokenRecord.userId,
          tokenRecord.deviceType,
          newTokenData
        );

        this.logger.info('Token refreshed successfully', {
          userId: tokenRecord.userId,
          deviceType: tokenRecord.deviceType,
          deviceId: tokenRecord.deviceId
        });

        return newTokenData.accessToken;
      }

      throw new Error('Token refresh returned null');

    } catch (error) {
      this.logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: tokenRecord.userId,
        deviceType: tokenRecord.deviceType,
        deviceId: tokenRecord.deviceId,
        attempt: tokenRecord.refreshAttempts + 1
      });

      // Increment refresh attempts
      await this.tokenStore.incrementRefreshAttempts(tokenRecord.id);

      // If too many failed attempts, mark as expired
      if (tokenRecord.refreshAttempts >= this.config.tokenRefresh.maxRetryAttempts - 1) {
        await this.tokenStore.markAsExpired(tokenRecord.id);
        this.logger.warn('Token marked as expired after max retry attempts', {
          userId: tokenRecord.userId,
          deviceType: tokenRecord.deviceType,
          deviceId: tokenRecord.deviceId
        });
      }

      return null;
    }
  }

  /**
   * Revoke device tokens
   */
  async revokeDeviceTokens(
    userId: string,
    deviceType: DeviceType,
    deviceId: string
  ): Promise<void> {
    try {
      this.logger.info('Revoking device tokens', { userId, deviceType, deviceId });

      const tokenRecord = await this.tokenStore.get(userId, deviceType, deviceId);
      if (tokenRecord) {
        await this.tokenStore.update(tokenRecord.id, {
          status: 'revoked',
          refreshToken: undefined // Clear refresh token
        });

        // Clear scheduled refresh
        this.refreshScheduler.clearScheduledJob(`${userId}:${deviceType}:${deviceId}`);
      }

      this.logger.info('Device tokens revoked successfully', { userId, deviceType, deviceId });

    } catch (error) {
      this.logger.error('Failed to revoke device tokens', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deviceType,
        deviceId
      });
      throw error;
    }
  }

  /**
   * Cleanup expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const cleanedCount = await this.tokenStore.cleanup();
      
      if (cleanedCount > 0) {
        this.logger.info('Cleaned up expired tokens', { count: cleanedCount });
      }

      return cleanedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * Get token statistics for monitoring
   */
  async getTokenStatistics(): Promise<{
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    revokedTokens: number;
  }> {
    try {
      const { data: stats, error } = await this.supabase
        .from('device_tokens')
        .select('status')
        .not('status', 'eq', 'deleted');

      if (error) {
        throw new Error(`Failed to get token statistics: ${error.message}`);
      }

      const tokenCounts = {
        totalTokens: stats?.length || 0,
        activeTokens: 0,
        expiredTokens: 0,
        revokedTokens: 0
      };

      stats?.forEach(token => {
        switch (token.status) {
          case 'active':
            tokenCounts.activeTokens++;
            break;
          case 'expired':
            tokenCounts.expiredTokens++;
            break;
          case 'revoked':
            tokenCounts.revokedTokens++;
            break;
        }
      });

      return tokenCounts;

    } catch (error) {
      this.logger.error('Failed to get token statistics', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        totalTokens: 0,
        activeTokens: 0,
        expiredTokens: 0,
        revokedTokens: 0
      };
    }
  }

  // Private helper methods

  private getDeviceManager(deviceType: DeviceType): any {
    // This would return the appropriate device manager
    // For now, return a mock that implements refreshToken
    return {
      refreshToken: async (refreshToken: string): Promise<DeviceTokenData | null> => {
        // Mock implementation - would be replaced with actual device-specific logic
        if (deviceType === 'philips_hue') {
          // Hue doesn't use refresh tokens, validate existing token
          return null;
        }
        
        // For other devices, implement actual refresh logic
        return null;
      }
    };
  }
}