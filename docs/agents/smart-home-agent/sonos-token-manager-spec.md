# SonosTokenManager Class - Implementation Specification

**Status**: Design Phase  
**Priority**: High  
**Target**: Premium Immersive Storytelling Experience  
**Last Updated**: 2025-12-14  
**Audience**: Internal | Engineering Team

## Overview

The `SonosTokenManager` class extends `SmartHomeTokenManager` to provide Sonos-specific OAuth 2.0 token management. It handles token acquisition, encryption, storage, and automatic refresh for Sonos Control API access.

**File Location:** `packages/smart-home-agent/src/token/SonosTokenManager.ts`  
**Base Class:** `SmartHomeTokenManager`  
**Reference Implementation:** `packages/smart-home-agent/src/token/TokenManager.ts`

## Class Architecture

### Class Signature

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Database } from '@alexa-multi-agent/shared-types';
import { Logger } from 'winston';
import { SmartHomeTokenManager } from './TokenManager';
import { SmartHomeAgentConfig } from '../types';

export class SonosTokenManager extends SmartHomeTokenManager {
  private logger: Logger;
  private readonly deviceType = 'sonos';

  constructor(
    supabase: SupabaseClient<Database>,
    redis: RedisClientType,
    config: SmartHomeAgentConfig
  ) {
    super(supabase, redis, config);
    // Initialize Sonos-specific logger
  }
}
```

### Dependencies

**Required:**
- `SmartHomeTokenManager` - Base token management class
- `SupabaseClient` - Database access
- `RedisClientType` - Caching
- `SmartHomeAgentConfig` - Configuration
- `axios` - HTTP client for OAuth flow

**Code Reference:**
- `packages/smart-home-agent/src/token/TokenManager.ts:21-45` - Base class constructor

## OAuth 2.0 Flow Implementation

### Initiate OAuth Flow

**Method:** `initiateOAuthFlow(userId: string, redirectUri: string): Promise<OAuthInitiation>`

**Purpose:** Start OAuth 2.0 authorization flow

**Implementation:**
```typescript
async initiateOAuthFlow(
  userId: string,
  redirectUri: string
): Promise<{
  authorizationUrl: string;
  state: string;
  expiresIn: number;
}> {
  try {
    this.logger.info('Initiating Sonos OAuth flow', { userId });

    // 1. Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // 2. Store state in Redis (expires in 10 minutes)
    await this.redis.setEx(
      `sonos:oauth:state:${state}`,
      600, // 10 minutes
      JSON.stringify({ userId, redirectUri, timestamp: Date.now() })
    );

    // 3. Build authorization URL
    const params = new URLSearchParams({
      client_id: this.config.sonos.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'playback-control playback-control-all household-control',
      state: state
    });

    const authorizationUrl = `https://api.sonos.com/login/v3/oauth?${params.toString()}`;

    this.logger.info('Sonos OAuth flow initiated', {
      userId,
      state
    });

    return {
      authorizationUrl,
      state,
      expiresIn: 600
    };

  } catch (error) {
    this.logger.error('Failed to initiate Sonos OAuth flow', {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    throw error;
  }
}
```

**Code Reference Pattern:**
- `lambda-deployments/router/src/handlers/HueOAuthHandlers.ts:77-120` - OAuth initiation pattern

### Handle OAuth Callback

**Method:** `handleOAuthCallback(code: string, state: string): Promise<TokenData>`

**Purpose:** Exchange authorization code for access token

**Implementation:**
```typescript
async handleOAuthCallback(
  code: string,
  state: string
): Promise<{
  householdId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  try {
    this.logger.info('Handling Sonos OAuth callback', { state });

    // 1. Validate state token
    const stateData = await this.redis.get(`sonos:oauth:state:${state}`);
    if (!stateData) {
      throw new Error('Invalid or expired state token');
    }

    const { userId, redirectUri } = JSON.parse(stateData);
    
    // 2. Delete state token (one-time use)
    await this.redis.del(`sonos:oauth:state:${state}`);

    // 3. Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://api.sonos.com/login/v3/oauth/access',
      {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      },
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${this.config.sonos.clientId}:${this.config.sonos.clientSecret}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      household_id: householdId
    } = tokenResponse.data;

    // 4. Store encrypted tokens
    await this.storeDeviceToken(
      userId,
      'sonos',
      {
        deviceId: householdId,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        tokenType: 'oauth2',
        scope: 'playback-control playback-control-all household-control',
        metadata: { householdId }
      }
    );

    this.logger.info('Sonos OAuth callback completed', {
      userId,
      householdId
    });

    return {
      householdId,
      accessToken,
      refreshToken,
      expiresIn
    };

  } catch (error) {
    this.logger.error('Failed to handle Sonos OAuth callback', {
      error: error instanceof Error ? error.message : String(error),
      state
    });
    throw error;
  }
}
```

**Code Reference Pattern:**
- `lambda-deployments/router/src/handlers/HueOAuthHandlers.ts:160-220` - Token exchange pattern

### Token Refresh

**Method:** `refreshToken(userId: string, householdId: string): Promise<TokenData>`

**Purpose:** Refresh expired access token using refresh token

**Implementation:**
```typescript
async refreshToken(
  userId: string,
  householdId: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  try {
    this.logger.info('Refreshing Sonos token', { userId, householdId });

    // 1. Get stored refresh token
    const tokenRecord = await this.getTokenRecord(userId, 'sonos', householdId);
    if (!tokenRecord || !tokenRecord.refreshToken) {
      throw new Error('No refresh token found');
    }

    // 2. Decrypt refresh token
    const refreshToken = await this.encryptionService.decrypt(
      tokenRecord.refreshToken
    );

    // 3. Exchange refresh token for new access token
    const tokenResponse = await axios.post(
      'https://api.sonos.com/login/v3/oauth/access',
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      },
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${this.config.sonos.clientId}:${this.config.sonos.clientSecret}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: expiresIn
    } = tokenResponse.data;

    // 4. Update stored tokens
    await this.updateDeviceToken(
      userId,
      'sonos',
      householdId,
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || refreshToken, // Use new refresh token if provided
        expiresAt: new Date(Date.now() + expiresIn * 1000)
      }
    );

    this.logger.info('Sonos token refreshed successfully', {
      userId,
      householdId
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken || refreshToken,
      expiresIn
    };

  } catch (error) {
    this.logger.error('Failed to refresh Sonos token', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      householdId
    });
    
    // Mark token as expired if refresh fails
    await this.markTokenExpired(userId, 'sonos', householdId);
    throw error;
  }
}
```

**Code Reference:**
- `packages/smart-home-agent/src/token/TokenManager.ts:200-250` - Token refresh pattern

### Get Valid Token

**Method:** `getToken(userId: string, householdId?: string): Promise<TokenData | null>`

**Purpose:** Get valid access token, refreshing if necessary

**Implementation:**
```typescript
async getToken(
  userId: string,
  householdId?: string
): Promise<{
  accessToken: string;
  householdId: string;
  expiresAt: Date;
} | null> {
  try {
    // 1. Get token record from database
    const tokenRecord = await this.getTokenRecord(userId, 'sonos', householdId);
    if (!tokenRecord) {
      return null;
    }

    // 2. Check if token is expired or expiring soon (within 5 minutes)
    const expiresAt = new Date(tokenRecord.expiresAt);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt <= fiveMinutesFromNow) {
      // Token expired or expiring soon, refresh it
      this.logger.info('Token expiring soon, refreshing', {
        userId,
        householdId: tokenRecord.deviceId,
        expiresAt
      });

      const refreshed = await this.refreshToken(
        userId,
        tokenRecord.deviceId
      );

      return {
        accessToken: refreshed.accessToken,
        householdId: tokenRecord.deviceId,
        expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000)
      };
    }

    // 3. Decrypt and return token
    const accessToken = await this.encryptionService.decrypt(
      tokenRecord.encryptedToken
    );

    return {
      accessToken,
      householdId: tokenRecord.deviceId,
      expiresAt
    };

  } catch (error) {
    this.logger.error('Failed to get Sonos token', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      householdId
    });
    return null;
  }
}
```

**Code Reference:**
- `packages/smart-home-agent/src/token/TokenManager.ts:130-180` - Token retrieval pattern

## Token Storage

### Database Storage

**Table:** `sonos_tokens`

**Storage Format:**
- `access_token_encrypted` - AES-256-GCM encrypted access token
- `refresh_token_encrypted` - AES-256-GCM encrypted refresh token
- `expires_at` - Token expiration timestamp
- `encryption_key_id` - Key ID for rotation support

**Code Reference:**
- `supabase/migrations/20250115000001_sonos_integration.sql` - Database schema

### Encryption

**Method:** Uses `TokenEncryptionService` from base class

**Encryption:**
- AES-256-GCM encryption
- Key rotation every 30 days
- Secure key storage

**Code Reference:**
- `packages/smart-home-agent/src/token/EncryptionService.ts` - Encryption service

### Redis Caching

**Cache Strategy:**
- Cache tokens in Redis for performance
- Cache key: `sonos:token:${userId}:${householdId}`
- TTL: 1 hour (shorter than token expiry)
- Invalidate on token refresh

**Code Reference:**
- `packages/smart-home-agent/src/token/TokenManager.ts:100-130` - Caching pattern

## Automatic Token Refresh

### Background Refresh Scheduler

**Integration:** Uses `TokenRefreshScheduler` from base class

**Schedule:**
- Check tokens 5 minutes before expiry
- Automatic refresh in background
- Retry on failure (3 attempts with exponential backoff)

**Code Reference:**
- `packages/smart-home-agent/src/token/TokenRefreshScheduler.ts` - Refresh scheduler

## Error Handling

### Token Refresh Failures

**Strategy:**
- Retry with exponential backoff (3 attempts)
- Mark token as expired on permanent failure
- Notify user to reconnect
- Clear sensitive data

**Implementation:**
```typescript
private async markTokenExpired(
  userId: string,
  deviceType: DeviceType,
  deviceId: string
): Promise<void> {
  await this.supabase
    .from('sonos_tokens')
    .update({
      token_status: 'expired',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('household_id', deviceId);
}
```

## Privacy & Security

### Token Encryption

**Encryption:**
- All tokens encrypted at rest (AES-256-GCM)
- Keys rotated every 30 days
- No plaintext token storage

### Token Revocation

**Method:** `revokeToken(userId: string, householdId: string): Promise<void>`

**Purpose:** Revoke and delete Sonos tokens

**Implementation:**
```typescript
async revokeToken(
  userId: string,
  householdId: string
): Promise<void> {
  try {
    // 1. Revoke token with Sonos API (if possible)
    const token = await this.getToken(userId, householdId);
    if (token) {
      try {
        await axios.post(
          'https://api.sonos.com/login/v3/oauth/revoke',
          {
            token: token.accessToken
          },
          {
            headers: {
              'Authorization': `Basic ${Buffer.from(
                `${this.config.sonos.clientId}:${this.config.sonos.clientSecret}`
              ).toString('base64')}`
            }
          }
        );
      } catch (error) {
        // Log but continue with deletion
        this.logger.warn('Failed to revoke token with Sonos API', { error });
      }
    }

    // 2. Delete tokens from database
    await this.supabase
      .from('sonos_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('household_id', householdId);

    // 3. Clear Redis cache
    await this.redis.del(`sonos:token:${userId}:${householdId}`);

    this.logger.info('Sonos token revoked', { userId, householdId });

  } catch (error) {
    this.logger.error('Failed to revoke Sonos token', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      householdId
    });
    throw error;
  }
}
```

## Configuration

### SSM Parameters

**Required Parameters:**
- `/storytailor-{ENV}/sonos/client-id` - Sonos OAuth client ID
- `/storytailor-{ENV}/sonos/client-secret` - Sonos OAuth client secret
- `/storytailor-{ENV}/sonos/redirect-uri` - OAuth redirect URI

### Environment Variables

**Smart Home Agent Lambda:**
- `SONOS_CLIENT_ID` - Sonos OAuth client ID
- `SONOS_CLIENT_SECRET` - Sonos OAuth client secret
- `SONOS_REDIRECT_URI` - OAuth redirect URI

## Related Documentation

- **Spatial Audio Specification:** See [Sonos Spatial Audio Spec](./sonos-spatial-audio-spec.md)
- **Sonos Manager Spec:** See [Sonos Manager Specification](./sonos-manager-spec.md)
- **Sonos Integration Guide:** See [Sonos Integration](../integrations/sonos.md)
- **Base Token Manager:** See `packages/smart-home-agent/src/token/TokenManager.ts`
- **Encryption Service:** See `packages/smart-home-agent/src/token/EncryptionService.ts`
