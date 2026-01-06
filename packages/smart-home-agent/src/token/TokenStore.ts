import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Database } from '@alexa-multi-agent/shared-types';
import { 
  DeviceType, 
  DeviceTokenRecord, 
  TokenStore 
} from '@alexa-multi-agent/shared-types';

export class DeviceTokenStore implements TokenStore {
  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType
  ) {}

  /**
   * Store a device token record
   */
  async store(tokenRecord: Omit<DeviceTokenRecord, 'id'>): Promise<string> {
    const { data, error } = await this.supabase
      .from('device_tokens')
      .insert({
        user_id: tokenRecord.userId,
        device_id: tokenRecord.deviceId,
        device_type: tokenRecord.deviceType,
        encrypted_token: tokenRecord.encryptedToken,
        token_type: tokenRecord.tokenType,
        expires_at: tokenRecord.expiresAt,
        refresh_token_encrypted: tokenRecord.refreshToken,
        last_refreshed: tokenRecord.lastRefreshed,
        refresh_attempts: tokenRecord.refreshAttempts,
        status: tokenRecord.status,
        encryption_key_id: 'current' // Would use actual key ID in production
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to store device token: ${error.message}`);
    }

    // Cache token ID for quick lookup
    const cacheKey = `token:${tokenRecord.userId}:${tokenRecord.deviceType}:${tokenRecord.deviceId}`;
    await this.redis.setEx(cacheKey, 3600, data.id); // Cache for 1 hour

    return data.id;
  }

  /**
   * Get a device token record
   */
  async get(userId: string, deviceType: DeviceType, deviceId: string): Promise<DeviceTokenRecord | null> {
    // Try cache first
    const cacheKey = `token:${userId}:${deviceType}:${deviceId}`;
    const cachedId = await this.redis.get(cacheKey);

    let query = this.supabase
      .from('device_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('device_type', deviceType)
      .eq('device_id', deviceId)
      .eq('status', 'active');

    if (cachedId) {
      query = query.eq('id', cachedId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to get device token: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      deviceId: data.device_id,
      deviceType: data.device_type as DeviceType,
      encryptedToken: data.encrypted_token,
      tokenType: data.token_type,
      expiresAt: data.expires_at,
      refreshToken: data.refresh_token_encrypted,
      lastRefreshed: data.last_refreshed,
      refreshAttempts: data.refresh_attempts,
      status: data.status as 'active' | 'expired' | 'revoked'
    };
  }

  /**
   * Update a device token record
   */
  async update(id: string, updates: Partial<DeviceTokenRecord>): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.encryptedToken) updateData.encrypted_token = updates.encryptedToken;
    if (updates.tokenType) updateData.token_type = updates.tokenType;
    if (updates.expiresAt) updateData.expires_at = updates.expiresAt;
    if (updates.refreshToken !== undefined) updateData.refresh_token_encrypted = updates.refreshToken;
    if (updates.lastRefreshed) updateData.last_refreshed = updates.lastRefreshed;
    if (updates.refreshAttempts !== undefined) updateData.refresh_attempts = updates.refreshAttempts;
    if (updates.status) updateData.status = updates.status;

    const { error } = await this.supabase
      .from('device_tokens')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update device token: ${error.message}`);
    }

    // Invalidate cache
    const { data: tokenData } = await this.supabase
      .from('device_tokens')
      .select('user_id, device_type, device_id')
      .eq('id', id)
      .single();

    if (tokenData) {
      const cacheKey = `token:${tokenData.user_id}:${tokenData.device_type}:${tokenData.device_id}`;
      await this.redis.del(cacheKey);
    }
  }

  /**
   * Mark a token as expired
   */
  async markAsExpired(id: string): Promise<void> {
    await this.update(id, { 
      status: 'expired',
      refreshToken: undefined // Clear refresh token
    });
  }

  /**
   * Increment refresh attempts counter
   */
  async incrementRefreshAttempts(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('device_tokens')
      .update({ 
        refresh_attempts: this.supabase.rpc('increment_attempts'),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to increment refresh attempts: ${error.message}`);
    }
  }

  /**
   * Cleanup expired and old tokens
   */
  async cleanup(): Promise<number> {
    // Delete tokens that have been expired for more than 30 days
    const { data, error } = await this.supabase
      .from('device_tokens')
      .delete()
      .eq('status', 'expired')
      .lt('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to cleanup expired tokens: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Get all tokens for a user (for privacy compliance)
   */
  async getUserTokens(userId: string): Promise<DeviceTokenRecord[]> {
    const { data, error } = await this.supabase
      .from('device_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user tokens: ${error.message}`);
    }

    return (data || []).map(token => ({
      id: token.id,
      userId: token.user_id,
      deviceId: token.device_id,
      deviceType: token.device_type as DeviceType,
      encryptedToken: token.encrypted_token,
      tokenType: token.token_type,
      expiresAt: token.expires_at,
      refreshToken: token.refresh_token_encrypted,
      lastRefreshed: token.last_refreshed,
      refreshAttempts: token.refresh_attempts,
      status: token.status as 'active' | 'expired' | 'revoked'
    }));
  }

  /**
   * Delete all tokens for a user (for GDPR compliance)
   */
  async deleteUserTokens(userId: string): Promise<number> {
    // First clear cache entries
    const tokens = await this.getUserTokens(userId);
    for (const token of tokens) {
      const cacheKey = `token:${userId}:${token.deviceType}:${token.deviceId}`;
      await this.redis.del(cacheKey);
    }

    // Delete from database
    const { data, error } = await this.supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new Error(`Failed to delete user tokens: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Get token statistics
   */
  async getStatistics(): Promise<{
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    revokedTokens: number;
    tokensByType: Record<string, number>;
  }> {
    const { data, error } = await this.supabase
      .from('device_tokens')
      .select('status, device_type');

    if (error) {
      throw new Error(`Failed to get token statistics: ${error.message}`);
    }

    const stats = {
      totalTokens: data?.length || 0,
      activeTokens: 0,
      expiredTokens: 0,
      revokedTokens: 0,
      tokensByType: {} as Record<string, number>
    };

    data?.forEach(token => {
      // Count by status
      switch (token.status) {
        case 'active':
          stats.activeTokens++;
          break;
        case 'expired':
          stats.expiredTokens++;
          break;
        case 'revoked':
          stats.revokedTokens++;
          break;
      }

      // Count by device type
      const deviceType = token.device_type;
      stats.tokensByType[deviceType] = (stats.tokensByType[deviceType] || 0) + 1;
    });

    return stats;
  }
}