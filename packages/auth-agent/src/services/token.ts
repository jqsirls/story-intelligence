import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@alexa-multi-agent/shared-types';
import * as jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';
import { 
  JWTPayload, 
  RefreshTokenPayload,
  TokenResponse,
  AuthError, 
  AuthErrorCode,
  AuthAgentConfig,
  UserSession 
} from '../types';
import { Logger } from 'winston';

export class TokenService {
  private supabase: SupabaseClient<Database>;

  constructor(
    private config: AuthAgentConfig,
    private logger: Logger
  ) {
    this.supabase = createClient<Database>(
      config.supabase.url,
      config.supabase.serviceKey
    );
  }

  /**
   * Generate provisional JWT token (short-lived, for account linking)
   */
  async generateProvisionalToken(userId: string): Promise<string> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new AuthError(
          AuthErrorCode.USER_NOT_FOUND,
          'User not found'
        );
      }

      const payload: JWTPayload = {
        sub: userId,
        email: user.email,
        alexaPersonId: user.alexa_person_id || undefined,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
        iss: this.config.jwt.issuer,
        aud: this.config.jwt.audience,
        jti: randomUUID(),
      };

      const token = jwt.sign(payload, this.config.jwt.secret, {
        algorithm: 'HS256',
      });

      this.logger.info('Provisional token generated', {
        userId,
        email: user.email,
        expiresIn: '15 minutes',
      });

      return token;

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error('Failed to generate provisional token', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });

      throw new AuthError(
        AuthErrorCode.INTERNAL_ERROR,
        'Failed to generate provisional token'
      );
    }
  }

  /**
   * Generate full access and refresh tokens after verification
   */
  async generateTokens(userId: string): Promise<TokenResponse> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new AuthError(
          AuthErrorCode.USER_NOT_FOUND,
          'User not found'
        );
      }

      // Generate access token
      const accessTokenPayload: JWTPayload = {
        sub: userId,
        email: user.email,
        alexaPersonId: user.alexa_person_id || undefined,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + this.config.jwt.accessTokenTtl,
        iss: this.config.jwt.issuer,
        aud: this.config.jwt.audience,
        jti: randomUUID(),
      };

      const accessToken = jwt.sign(accessTokenPayload, this.config.jwt.secret, {
        algorithm: 'HS256',
      });

      // Generate refresh token
      const refreshTokenId = randomUUID();
      const refreshTokenPayload: RefreshTokenPayload = {
        userId,
        tokenId: refreshTokenId,
        expiresAt: new Date(Date.now() + this.config.jwt.refreshTokenTtl * 1000),
        createdAt: new Date(),
      };

      const refreshToken = await this.storeRefreshToken(refreshTokenPayload);

      this.logger.info('Tokens generated successfully', {
        userId,
        email: user.email,
        accessTokenExpiresIn: this.config.jwt.accessTokenTtl,
        refreshTokenExpiresIn: this.config.jwt.refreshTokenTtl,
      });

      return {
        success: true,
        accessToken,
        refreshToken,
        expiresIn: this.config.jwt.accessTokenTtl,
        tokenType: 'Bearer',
        userId,
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error('Failed to generate tokens', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });

      return {
        success: false,
        error: 'Failed to generate tokens',
        tokenType: 'Bearer',
      };
    }
  }

  /**
   * Validate JWT token and return payload
   */
  async validateToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.config.jwt.secret, {
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
        algorithms: ['HS256'],
      }) as JWTPayload;

      // Check if user still exists and is active
      const user = await this.getUserById(payload.sub);
      if (!user) {
        throw new AuthError(
          AuthErrorCode.USER_NOT_FOUND,
          'User no longer exists'
        );
      }

      return payload;

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        this.logger.warn('Invalid JWT token', {
          error: error.message,
          token: token.substring(0, 20) + '...',
        });
        throw new AuthError(
          AuthErrorCode.TOKEN_INVALID,
          'Invalid token'
        );
      }

      if (error instanceof jwt.TokenExpiredError) {
        this.logger.warn('Expired JWT token', {
          token: token.substring(0, 20) + '...',
        });
        throw new AuthError(
          AuthErrorCode.TOKEN_EXPIRED,
          'Token has expired'
        );
      }

      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error('Unexpected error validating token', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new AuthError(
        AuthErrorCode.INTERNAL_ERROR,
        'Failed to validate token'
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Validate and decode refresh token
      const tokenHash = this.hashToken(refreshToken);
      
      // Find refresh token in database
      const { data: storedToken, error } = await this.supabase
        .from('refresh_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .eq('revoked', false)
        .single();

      if (error || !storedToken) {
        throw new AuthError(
          AuthErrorCode.TOKEN_INVALID,
          'Invalid refresh token'
        );
      }

      // Check if refresh token has expired
      if (new Date() > new Date(storedToken.expires_at)) {
        // Mark as revoked
        await this.revokeRefreshToken(refreshToken);
        throw new AuthError(
          AuthErrorCode.TOKEN_EXPIRED,
          'Refresh token has expired'
        );
      }

      // Generate new access token
      const user = await this.getUserById(storedToken.user_id);
      if (!user) {
        throw new AuthError(
          AuthErrorCode.USER_NOT_FOUND,
          'User not found'
        );
      }

      const accessTokenPayload: JWTPayload = {
        sub: storedToken.user_id,
        email: user.email,
        alexaPersonId: user.alexa_person_id || undefined,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + this.config.jwt.accessTokenTtl,
        iss: this.config.jwt.issuer,
        aud: this.config.jwt.audience,
        jti: randomUUID(),
      };

      const accessToken = jwt.sign(accessTokenPayload, this.config.jwt.secret, {
        algorithm: 'HS256',
      });

      this.logger.info('Token refreshed successfully', {
        userId: storedToken.user_id,
        email: user.email,
      });

      return {
        success: true,
        accessToken,
        refreshToken, // Return same refresh token
        expiresIn: this.config.jwt.accessTokenTtl,
        tokenType: 'Bearer',
        userId: storedToken.user_id,
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error('Failed to refresh token', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: 'Failed to refresh token',
        tokenType: 'Bearer',
      };
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      const tokenHash = this.hashToken(refreshToken);
      
      const { error } = await this.supabase
        .from('refresh_tokens')
        .update({ revoked: true })
        .eq('token_hash', tokenHash);

      if (error) {
        this.logger.error('Failed to revoke refresh token', { error });
      } else {
        this.logger.info('Refresh token revoked successfully');
      }

    } catch (error) {
      this.logger.error('Unexpected error revoking refresh token', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get user by ID
   */
  private async getUserById(userId: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      this.logger.error('Database error finding user by ID', {
        error,
        userId,
      });
      return null;
    }

    return user;
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    const refreshToken = randomUUID();
    const tokenHash = this.hashToken(refreshToken);

    const { error } = await this.supabase
      .from('refresh_tokens')
      .insert({
        token_hash: tokenHash,
        user_id: payload.userId,
        expires_at: payload.expiresAt.toISOString(),
        revoked: false,
        created_at: payload.createdAt.toISOString(),
      });

    if (error) {
      this.logger.error('Failed to store refresh token', {
        error,
        userId: payload.userId,
      });
      throw new AuthError(
        AuthErrorCode.INTERNAL_ERROR,
        'Failed to store refresh token'
      );
    }

    return refreshToken;
  }

  /**
   * Hash token for secure storage
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('refresh_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        this.logger.error('Failed to cleanup expired refresh tokens', { error });
        return 0;
      }

      const deletedCount = data?.length || 0;
      this.logger.info('Cleaned up expired refresh tokens', { deletedCount });
      
      return deletedCount;

    } catch (error) {
      this.logger.error('Unexpected error cleaning up refresh tokens', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }
}