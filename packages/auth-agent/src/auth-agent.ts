import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@alexa-multi-agent/shared-types';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import * as winston from 'winston';
import { Logger } from 'winston';
import { 
  AccountLinkingRequest,
  AccountLinkingResponse,
  VoiceCodeVerification,
  MagicLinkVerification,
  TokenResponse,
  AuthAgentConfig,
  AuthError,
  AuthErrorCode,
  UserSession,
  AccountLinkingRequestSchema,
  VoiceCodeVerificationSchema,
  MagicLinkVerificationSchema
} from './types';
import { AccountLinkingService } from './services/account-linking';
import { VoiceCodeService } from './services/voice-code';
import { TokenService } from './services/token';
import { 
  validateEmail, 
  validateVoiceCode, 
  validateAlexaPersonId,
  generateCorrelationId,
  sanitizeEmailForLogging 
} from './utils/validation';

export class AuthAgent {
  private supabase: SupabaseClient<Database>;
  private redis: RedisClientType;
  private logger: Logger;
  private accountLinkingService: AccountLinkingService;
  private voiceCodeService: VoiceCodeService;
  private tokenService: TokenService;
  private isInitialized = false;

  constructor(private config: AuthAgentConfig) {
    this.logger = this.setupLogger();
    this.supabase = createClient<Database>(
      config.supabase.url,
      config.supabase.serviceKey
    );
    this.redis = createRedisClient({ url: config.redis.url });
    
    // Initialize services
    this.accountLinkingService = new AccountLinkingService(config, this.logger);
    this.voiceCodeService = new VoiceCodeService(config, this.logger);
    this.tokenService = new TokenService(config, this.logger);
  }

  /**
   * Initialize the AuthAgent
   */
  async initialize(): Promise<void> {
    try {
      // Connect to Redis
      await this.redis.connect();
      
      // Test Supabase connection
      const { error } = await this.supabase.from('users').select('id').limit(1);
      if (error) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }

      this.isInitialized = true;
      this.logger.info('AuthAgent initialized successfully');

      // Start cleanup tasks
      this.startCleanupTasks();

    } catch (error) {
      this.logger.error('Failed to initialize AuthAgent', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Shutdown the AuthAgent gracefully
   */
  async shutdown(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.logger.info('AuthAgent shutdown completed');
    } catch (error) {
      this.logger.error('Error during AuthAgent shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle account linking request from Alexa
   */
  async linkAccount(request: AccountLinkingRequest): Promise<AccountLinkingResponse> {
    this.ensureInitialized();

    try {
      // Validate request
      const validatedRequest = AccountLinkingRequestSchema.parse(request);
      
      // Add correlation ID if not provided
      if (!validatedRequest.correlationId) {
        validatedRequest.correlationId = generateCorrelationId();
      }

      this.logger.info('Processing account linking request', {
        email: sanitizeEmailForLogging(validatedRequest.customerEmail),
        alexaPersonId: validatedRequest.alexaPersonId,
        deviceType: validatedRequest.deviceType,
        correlationId: validatedRequest.correlationId,
      });

      // Check rate limiting
      await this.checkRateLimit(validatedRequest.customerEmail, 'account_linking');

      // Process account linking
      const response = await this.accountLinkingService.linkAccount(validatedRequest);

      this.logger.info('Account linking completed', {
        success: response.success,
        userId: response.userId,
        correlationId: validatedRequest.correlationId,
      });

      return response;

    } catch (error) {
      this.logger.error('Account linking failed', {
        error: error instanceof Error ? error.message : String(error),
        email: sanitizeEmailForLogging(request.customerEmail),
      });

      if (error instanceof AuthError) {
        return {
          success: false,
          error: error.message,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        };
      }

      return {
        success: false,
        error: 'Internal server error',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };
    }
  }

  /**
   * Verify magic link and return full tokens (for screen devices)
   */
  async verifyMagicLink(verification: MagicLinkVerification): Promise<TokenResponse> {
    this.ensureInitialized();

    try {
      // Validate request
      const validatedVerification = MagicLinkVerificationSchema.parse(verification);

      this.logger.info('Processing magic link verification', {
        email: sanitizeEmailForLogging(validatedVerification.email),
        alexaPersonId: validatedVerification.alexaPersonId,
        deviceType: validatedVerification.deviceType,
        userAgent: validatedVerification.userAgent,
        ipAddress: validatedVerification.ipAddress,
      });

      // Check rate limiting
      await this.checkRateLimit(validatedVerification.email, 'magic_link_verification');

      // Verify voice code (magic link uses same code system)
      const voiceCodeVerification: VoiceCodeVerification = {
        email: validatedVerification.email,
        code: validatedVerification.code,
        alexaPersonId: validatedVerification.alexaPersonId || '',
        deviceType: validatedVerification.deviceType,
      };

      const isValid = await this.voiceCodeService.verifyVoiceCode(voiceCodeVerification);

      if (!isValid) {
        return {
          success: false,
          error: 'Magic link verification failed',
          tokenType: 'Bearer',
        };
      }

      // Get user by email
      const user = await this.getUserByEmail(validatedVerification.email);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          tokenType: 'Bearer',
        };
      }

      // Generate full tokens
      const tokenResponse = await this.tokenService.generateTokens(user.id);

      // Create session record for tracking
      await this.createAuthSession(user.id, tokenResponse.accessToken || '', {
        alexaPersonId: validatedVerification.alexaPersonId,
        deviceType: validatedVerification.deviceType,
        userAgent: validatedVerification.userAgent,
        ipAddress: validatedVerification.ipAddress,
      });

      // Log audit event
      await this.logAuditEvent(user.id, 'magic_link_verification_success', {
        email: validatedVerification.email,
        alexaPersonId: validatedVerification.alexaPersonId,
        deviceType: validatedVerification.deviceType,
        userAgent: validatedVerification.userAgent,
        ipAddress: validatedVerification.ipAddress,
      });

      this.logger.info('Magic link verification completed', {
        success: tokenResponse.success,
        userId: user.id,
        email: sanitizeEmailForLogging(validatedVerification.email),
      });

      return tokenResponse;

    } catch (error) {
      this.logger.error('Magic link verification failed', {
        error: error instanceof Error ? error.message : String(error),
        email: sanitizeEmailForLogging(verification.email),
      });

      // Log failed verification attempt
      await this.logAuditEvent('unknown', 'magic_link_verification_failed', {
        email: sanitizeEmailForLogging(verification.email),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      if (error instanceof AuthError) {
        return {
          success: false,
          error: error.message,
          tokenType: 'Bearer',
        };
      }

      return {
        success: false,
        error: 'Internal server error',
        tokenType: 'Bearer',
      };
    }
  }

  /**
   * Verify voice code and return full tokens
   */
  async verifyVoiceCode(verification: VoiceCodeVerification): Promise<TokenResponse> {
    this.ensureInitialized();

    try {
      // Validate request
      const validatedVerification = VoiceCodeVerificationSchema.parse(verification);

      this.logger.info('Processing voice code verification', {
        email: sanitizeEmailForLogging(validatedVerification.email),
        alexaPersonId: validatedVerification.alexaPersonId,
        deviceType: validatedVerification.deviceType,
      });

      // Check rate limiting
      await this.checkRateLimit(validatedVerification.email, 'voice_verification');

      // Verify voice code
      const isValid = await this.voiceCodeService.verifyVoiceCode(validatedVerification);

      if (!isValid) {
        return {
          success: false,
          error: 'Voice code verification failed',
          tokenType: 'Bearer',
        };
      }

      // Get user by email
      const user = await this.getUserByEmail(validatedVerification.email);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          tokenType: 'Bearer',
        };
      }

      // Generate full tokens
      const tokenResponse = await this.tokenService.generateTokens(user.id);

      // Create session record for tracking
      await this.createAuthSession(user.id, tokenResponse.accessToken || '', {
        alexaPersonId: validatedVerification.alexaPersonId,
        deviceType: validatedVerification.deviceType,
      });

      // Log audit event
      await this.logAuditEvent(user.id, 'voice_code_verification_success', {
        email: validatedVerification.email,
        alexaPersonId: validatedVerification.alexaPersonId,
        deviceType: validatedVerification.deviceType,
      });

      this.logger.info('Voice code verification completed', {
        success: tokenResponse.success,
        userId: user.id,
        email: sanitizeEmailForLogging(validatedVerification.email),
      });

      return tokenResponse;

    } catch (error) {
      this.logger.error('Voice code verification failed', {
        error: error instanceof Error ? error.message : String(error),
        email: sanitizeEmailForLogging(verification.email),
      });

      // Log failed verification attempt
      await this.logAuditEvent('unknown', 'voice_code_verification_failed', {
        email: sanitizeEmailForLogging(verification.email),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      if (error instanceof AuthError) {
        return {
          success: false,
          error: error.message,
          tokenType: 'Bearer',
        };
      }

      return {
        success: false,
        error: 'Internal server error',
        tokenType: 'Bearer',
      };
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<UserSession | null> {
    this.ensureInitialized();

    try {
      const payload = await this.tokenService.validateToken(token);
      
      // Get full user session data
      const user = await this.getUserById(payload.sub);
      if (!user) {
        return null;
      }

      return {
        userId: user.id,
        email: user.email,
        alexaPersonId: user.alexa_person_id || undefined,
        isEmailConfirmed: user.email_confirmed ?? false,
        isMinor: user.is_minor ?? undefined,
        isCoppaProtected: user.is_coppa_protected ?? false,
        parentConsentVerified: user.parent_consent_verified ?? false,
        lastLoginAt: user.last_login_at || undefined,
        createdAt: user.created_at || undefined,
      };

    } catch (error) {
      this.logger.warn('Token validation failed', {
        error: error instanceof Error ? error.message : String(error),
        token: token.substring(0, 20) + '...',
      });
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    this.ensureInitialized();

    try {
      return await this.tokenService.refreshToken(refreshToken);
    } catch (error) {
      this.logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof AuthError) {
        return {
          success: false,
          error: error.message,
          tokenType: 'Bearer',
        };
      }

      return {
        success: false,
        error: 'Internal server error',
        tokenType: 'Bearer',
      };
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeToken(refreshToken: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.tokenService.revokeRefreshToken(refreshToken);
      
      // Log audit event (without user ID since we can't easily get it from refresh token)
      await this.logAuditEvent('system', 'refresh_token_revoked', {
        timestamp: new Date().toISOString(),
      });
      
      this.logger.info('Token revoked successfully');
    } catch (error) {
      this.logger.error('Token revocation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Initiate password reset via email
   */
  async initiatePasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    this.ensureInitialized();

    try {
      // Validate email format
      if (!validateEmail(email)) {
        return {
          success: false,
          error: 'Invalid email format',
        };
      }

      this.logger.info('Processing password reset request', {
        email: sanitizeEmailForLogging(email),
      });

      // Check rate limiting
      await this.checkRateLimit(email, 'password_reset');

      // Check if user exists
      const user = await this.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        this.logger.warn('Password reset requested for non-existent user', {
          email: sanitizeEmailForLogging(email),
        });
        return {
          success: true, // Return success to prevent email enumeration
        };
      }

      // Use Supabase Auth to send password reset email
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${this.config.magicLink.baseUrl}/reset-password`,
      });

      if (error) {
        this.logger.error('Failed to send password reset email', {
          error: error.message,
          email: sanitizeEmailForLogging(email),
        });
        return {
          success: false,
          error: 'Failed to send password reset email',
        };
      }

      // Log audit event
      await this.logAuditEvent(user.id, 'password_reset_initiated', {
        email,
      });

      this.logger.info('Password reset email sent', {
        email: sanitizeEmailForLogging(email),
        userId: user.id,
      });

      return {
        success: true,
      };

    } catch (error) {
      this.logger.error('Password reset failed', {
        error: error instanceof Error ? error.message : String(error),
        email: sanitizeEmailForLogging(email),
      });

      if (error instanceof AuthError) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Internal server error',
      };
    }
  }

  /**
   * Get user by Alexa Person ID
   */
  async getUserByAlexaPersonId(alexaPersonId: string): Promise<UserSession | null> {
    this.ensureInitialized();

    try {
      const { data: mapping, error } = await this.supabase
        .from('alexa_user_mappings')
        .select('supabase_user_id')
        .eq('alexa_person_id', alexaPersonId)
        .single();

      if (error || !mapping) {
        return null;
      }

      const user = await this.getUserById(mapping.supabase_user_id);
      if (!user) {
        return null;
      }

      return {
        userId: user.id,
        email: user.email,
        alexaPersonId: user.alexa_person_id || undefined,
        isEmailConfirmed: user.email_confirmed ?? false,
        isMinor: user.is_minor ?? undefined,
        isCoppaProtected: user.is_coppa_protected ?? false,
        parentConsentVerified: user.parent_consent_verified ?? false,
        lastLoginAt: user.last_login_at || undefined,
        createdAt: user.created_at || undefined,
      };

    } catch (error) {
      this.logger.error('Failed to get user by Alexa Person ID', {
        error: error instanceof Error ? error.message : String(error),
        alexaPersonId,
      });
      return null;
    }
  }

  /**
   * Setup Winston logger
   */
  private setupLogger(): Logger {
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'auth-agent' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });
  }

  /**
   * Ensure AuthAgent is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('AuthAgent not initialized. Call initialize() first.');
    }
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(identifier: string, action: string): Promise<void> {
    const key = `rate_limit:${action}:${identifier}`;
    const current = await this.redis.get(key);
    
    if (current && parseInt(current) >= this.config.rateLimit.maxRequestsPerMinute) {
      throw new AuthError(
        AuthErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded. Please try again later.'
      );
    }

    // Increment counter
    await this.redis.multi()
      .incr(key)
      .expire(key, Math.ceil(this.config.rateLimit.windowMs / 1000))
      .exec();
  }

  /**
   * Get user by email
   */
  private async getUserByEmail(email: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      this.logger.error('Database error finding user by email', {
        error,
        email: sanitizeEmailForLogging(email),
      });
      return null;
    }

    return user;
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
   * Log audit event for compliance
   */
  private async logAuditEvent(userId: string, action: string, payload: any): Promise<void> {
    try {
      await this.supabase.rpc('log_audit_event_enhanced', {
        p_agent_name: 'AuthAgent',
        p_action: action,
        p_payload: payload,
        p_session_id: undefined,
        p_correlation_id: payload.correlationId ?? undefined,
      });
    } catch (error) {
      this.logger.error('Failed to log audit event', { 
        error: error instanceof Error ? error.message : String(error),
        userId, 
        action 
      });
      // Don't throw error as audit logging shouldn't break the flow
    }
  }

  /**
   * Create auth session record for tracking and security
   */
  private async createAuthSession(
    userId: string, 
    sessionToken: string, 
    metadata: {
      alexaPersonId?: string;
      deviceType?: string;
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + this.config.jwt.accessTokenTtl * 1000);
      
      await this.supabase
        .from('auth_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          alexa_person_id: metadata.alexaPersonId || null,
          device_type: metadata.deviceType || null,
          ip_address: metadata.ipAddress || null,
          user_agent: metadata.userAgent || null,
          expires_at: expiresAt.toISOString(),
          last_activity: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });

      this.logger.info('Auth session created', {
        userId,
        deviceType: metadata.deviceType,
        expiresAt: expiresAt.toISOString(),
      });

    } catch (error) {
      this.logger.error('Failed to create auth session', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      // Don't throw error as session tracking shouldn't break the auth flow
    }
  }

  /**
   * Start cleanup tasks for expired codes and tokens
   */
  private startCleanupTasks(): void {
    // Clean up expired voice codes every 5 minutes
    setInterval(async () => {
      try {
        await this.voiceCodeService.cleanupExpiredCodes();
      } catch (error) {
        this.logger.error('Voice code cleanup failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 5 * 60 * 1000);

    // Clean up expired refresh tokens every hour
    setInterval(async () => {
      try {
        await this.tokenService.cleanupExpiredTokens();
      } catch (error) {
        this.logger.error('Token cleanup failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 60 * 60 * 1000);

    // Clean up expired auth sessions every hour
    setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        this.logger.error('Session cleanup failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up expired auth sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('auth_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        this.logger.error('Failed to cleanup expired sessions', { error });
        return;
      }

      const deletedCount = data?.length || 0;
      this.logger.info('Cleaned up expired auth sessions', { deletedCount });

    } catch (error) {
      this.logger.error('Unexpected error cleaning up sessions', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}