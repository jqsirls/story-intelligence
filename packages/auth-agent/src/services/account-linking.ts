import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@alexa-multi-agent/shared-types';
import { 
  AccountLinkingRequest, 
  AccountLinkingResponse, 
  AuthError, 
  AuthErrorCode,
  AuthAgentConfig 
} from '../types';
import { VoiceCodeService } from './voice-code';
import { TokenService } from './token';
import { validateEmail } from '../utils/validation';
import { Logger } from 'winston';

export class AccountLinkingService {
  private supabase: SupabaseClient<Database>;
  private voiceCodeService: VoiceCodeService;
  private tokenService: TokenService;

  constructor(
    private config: AuthAgentConfig,
    private logger: Logger
  ) {
    this.supabase = createClient<Database>(
      config.supabase.url,
      config.supabase.serviceKey
    );
    this.voiceCodeService = new VoiceCodeService(config, logger);
    this.tokenService = new TokenService(config, logger);
  }

  /**
   * Handles account linking request from Alexa
   * Creates provisional account and returns voice code or magic link
   */
  async linkAccount(request: AccountLinkingRequest): Promise<AccountLinkingResponse> {
    try {
      this.logger.info('Processing account linking request', {
        email: request.customerEmail,
        alexaPersonId: request.alexaPersonId,
        deviceType: request.deviceType,
        correlationId: request.correlationId,
      });

      // Validate email format
      if (!validateEmail(request.customerEmail)) {
        throw new AuthError(
          AuthErrorCode.INVALID_EMAIL,
          'Invalid email format provided'
        );
      }

      // Check if user already exists
      let user = await this.findUserByEmail(request.customerEmail);
      
      if (!user) {
        // Create provisional account
        user = await this.createProvisionalAccount(request);
      } else {
        // Update existing user with Alexa Person ID if not already set
        if (!user.alexa_person_id) {
          await this.updateAlexaPersonId(user.id, request.alexaPersonId);
        }
      }

      // Generate voice code
      const voiceCode = await this.voiceCodeService.generateVoiceCode({
        email: request.customerEmail,
        alexaPersonId: request.alexaPersonId,
        deviceType: request.deviceType,
      });

      // Generate provisional JWT token (short-lived)
      const provisionalToken = await this.tokenService.generateProvisionalToken(user.id);

      // Create magic link for screen devices
      let magicLinkUrl: string | undefined;
      let qrCodeUrl: string | undefined;
      
      if (request.deviceType === 'screen') {
        magicLinkUrl = this.generateMagicLink(voiceCode.code, request.customerEmail);
        qrCodeUrl = this.generateQRCodeUrl(magicLinkUrl);
      }

      // Log audit event
      await this.logAuditEvent(user.id, 'account_linking_initiated', {
        alexaPersonId: request.alexaPersonId,
        deviceType: request.deviceType,
        email: request.customerEmail,
      });

      return {
        success: true,
        provisionalToken,
        voiceCode: voiceCode.code,
        magicLinkUrl,
        qrCodeUrl,
        expiresAt: voiceCode.expiresAt.toISOString(),
        userId: user.id,
      };

    } catch (error) {
      this.logger.error('Account linking failed', {
        error: error instanceof Error ? error.message : String(error),
        email: request.customerEmail,
        alexaPersonId: request.alexaPersonId,
      });

      if (error instanceof AuthError) {
        return {
          success: false,
          error: error.message,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
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
   * Find user by email address
   */
  private async findUserByEmail(email: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      this.logger.error('Database error finding user', { error, email });
      throw new AuthError(
        AuthErrorCode.INTERNAL_ERROR,
        'Database error occurred'
      );
    }

    return user;
  }

  /**
   * Create provisional account in Supabase
   */
  private async createProvisionalAccount(request: AccountLinkingRequest) {
    const { data: user, error } = await this.supabase
      .from('users')
      .insert({
        email: request.customerEmail,
        alexa_person_id: request.alexaPersonId,
        email_confirmed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create provisional account', {
        error,
        email: request.customerEmail,
      });
      throw new AuthError(
        AuthErrorCode.ACCOUNT_LINKING_FAILED,
        'Failed to create provisional account'
      );
    }

    // Create Alexa user mapping
    await this.createAlexaUserMapping(request.alexaPersonId, user.id);

    this.logger.info('Provisional account created', {
      userId: user.id,
      email: request.customerEmail,
      alexaPersonId: request.alexaPersonId,
    });

    return user;
  }

  /**
   * Update existing user with Alexa Person ID
   */
  private async updateAlexaPersonId(userId: string, alexaPersonId: string) {
    const { error } = await this.supabase
      .from('users')
      .update({
        alexa_person_id: alexaPersonId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      this.logger.error('Failed to update Alexa Person ID', {
        error,
        userId,
        alexaPersonId,
      });
      throw new AuthError(
        AuthErrorCode.INTERNAL_ERROR,
        'Failed to update user account'
      );
    }

    // Create or update Alexa user mapping
    await this.createAlexaUserMapping(alexaPersonId, userId);
  }

  /**
   * Create Alexa user mapping
   */
  private async createAlexaUserMapping(alexaPersonId: string, userId: string) {
    const { error } = await this.supabase
      .from('alexa_user_mappings')
      .upsert({
        alexa_person_id: alexaPersonId,
        supabase_user_id: userId,
        created_at: new Date().toISOString(),
      });

    if (error) {
      this.logger.error('Failed to create Alexa user mapping', {
        error,
        alexaPersonId,
        userId,
      });
      // Don't throw error here as it's not critical for account linking
    }
  }

  /**
   * Generate magic link URL for screen devices
   */
  private generateMagicLink(code: string, email: string): string {
    const params = new URLSearchParams({
      code,
      email,
      type: 'magic_link',
    });
    
    return `${this.config.magicLink.baseUrl}/verify?${params.toString()}`;
  }

  /**
   * Generate QR code URL for magic link
   */
  private generateQRCodeUrl(magicLinkUrl: string): string {
    // In production, this would generate an actual QR code
    // For now, return a placeholder URL
    const encodedUrl = encodeURIComponent(magicLinkUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;
  }

  /**
   * Log audit event for compliance
   */
  private async logAuditEvent(userId: string, action: string, payload: any) {
    try {
      await this.supabase.rpc('log_audit_event_enhanced', {
        p_agent_name: 'AuthAgent',
        p_action: action,
        p_payload: payload,
        p_session_id: undefined,
        p_correlation_id: payload.correlationId ?? undefined,
      });
    } catch (error) {
      this.logger.error('Failed to log audit event', { error, userId, action });
      // Don't throw error as audit logging shouldn't break the flow
    }
  }
}