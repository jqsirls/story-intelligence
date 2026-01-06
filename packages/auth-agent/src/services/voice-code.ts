import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@alexa-multi-agent/shared-types';
import { 
  VoiceCodeData, 
  VoiceCodeVerification,
  AuthError, 
  AuthErrorCode,
  AuthAgentConfig 
} from '../types';
import { Logger } from 'winston';
import { createHash, randomInt } from 'crypto';

interface GenerateVoiceCodeRequest {
  email: string;
  alexaPersonId: string;
  deviceType: 'voice' | 'screen';
}

export class VoiceCodeService {
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
   * Generate a 6-digit voice code with 5-minute expiration
   */
  async generateVoiceCode(request: GenerateVoiceCodeRequest): Promise<VoiceCodeData> {
    try {
      // Generate 6-digit code
      const code = this.generateSixDigitCode();
      const expiresAt = new Date(Date.now() + this.config.voiceCode.ttl * 1000);

      // Store in database
      const { data: voiceCodeData, error } = await this.supabase
        .from('voice_codes')
        .insert({
          email: request.email,
          code,
          expires_at: expiresAt.toISOString(),
          attempts: 0,
          used: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to store voice code', {
          error,
          email: request.email,
        });
        throw new AuthError(
          AuthErrorCode.INTERNAL_ERROR,
          'Failed to generate voice code'
        );
      }

      this.logger.info('Voice code generated', {
        email: request.email,
        alexaPersonId: request.alexaPersonId,
        deviceType: request.deviceType,
        expiresAt: expiresAt.toISOString(),
      });

      return {
        id: voiceCodeData.id,
        email: voiceCodeData.email,
        code: voiceCodeData.code,
        expiresAt: new Date(voiceCodeData.expires_at),
        attempts: voiceCodeData.attempts,
        used: voiceCodeData.used,
        alexaPersonId: request.alexaPersonId,
        deviceType: request.deviceType,
        createdAt: new Date(voiceCodeData.created_at),
      };

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error('Unexpected error generating voice code', {
        error: error instanceof Error ? error.message : String(error),
        email: request.email,
      });

      throw new AuthError(
        AuthErrorCode.INTERNAL_ERROR,
        'Failed to generate voice code'
      );
    }
  }

  /**
   * Verify voice code and return success/failure
   */
  async verifyVoiceCode(verification: VoiceCodeVerification): Promise<boolean> {
    try {
      // Find the voice code
      const { data: voiceCode, error } = await this.supabase
        .from('voice_codes')
        .select('*')
        .eq('email', verification.email)
        .eq('code', verification.code)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !voiceCode) {
        this.logger.warn('Voice code not found or already used', {
          email: verification.email,
          code: verification.code,
        });
        throw new AuthError(
          AuthErrorCode.VOICE_CODE_INVALID,
          'Invalid voice code'
        );
      }

      // Check if code has expired
      if (new Date() > new Date(voiceCode.expires_at)) {
        this.logger.warn('Voice code expired', {
          email: verification.email,
          code: verification.code,
          expiresAt: voiceCode.expires_at,
        });
        throw new AuthError(
          AuthErrorCode.VOICE_CODE_EXPIRED,
          'Voice code has expired'
        );
      }

      // Check attempt limit
      if (voiceCode.attempts >= this.config.voiceCode.maxAttempts) {
        this.logger.warn('Max attempts exceeded for voice code', {
          email: verification.email,
          attempts: voiceCode.attempts,
        });
        throw new AuthError(
          AuthErrorCode.MAX_ATTEMPTS_EXCEEDED,
          'Maximum verification attempts exceeded'
        );
      }

      // Mark code as used
      const { error: updateError } = await this.supabase
        .from('voice_codes')
        .update({
          used: true,
          attempts: voiceCode.attempts + 1,
        })
        .eq('id', voiceCode.id);

      if (updateError) {
        this.logger.error('Failed to mark voice code as used', {
          error: updateError,
          voiceCodeId: voiceCode.id,
        });
        throw new AuthError(
          AuthErrorCode.INTERNAL_ERROR,
          'Failed to verify voice code'
        );
      }

      // Confirm user email
      await this.confirmUserEmail(verification.email);

      this.logger.info('Voice code verified successfully', {
        email: verification.email,
        alexaPersonId: verification.alexaPersonId,
      });

      return true;

    } catch (error) {
      if (error instanceof AuthError) {
        // Increment attempt count for tracking
        await this.incrementAttemptCount(verification.email, verification.code);
        throw error;
      }

      this.logger.error('Unexpected error verifying voice code', {
        error: error instanceof Error ? error.message : String(error),
        email: verification.email,
      });

      throw new AuthError(
        AuthErrorCode.INTERNAL_ERROR,
        'Failed to verify voice code'
      );
    }
  }

  /**
   * Clean up expired voice codes
   */
  async cleanupExpiredCodes(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('voice_codes')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        this.logger.error('Failed to cleanup expired voice codes', { error });
        return 0;
      }

      const deletedCount = data?.length || 0;
      this.logger.info('Cleaned up expired voice codes', { deletedCount });
      
      return deletedCount;

    } catch (error) {
      this.logger.error('Unexpected error cleaning up voice codes', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Generate a secure 6-digit code
   */
  private generateSixDigitCode(): string {
    // Generate a secure random 6-digit code
    // Avoid easily confused characters (0, O, 1, I, etc.)
    const digits = '23456789';
    let code = '';
    
    for (let i = 0; i < this.config.voiceCode.length; i++) {
      const randomIndex = randomInt(0, digits.length);
      code += digits[randomIndex];
    }
    
    return code;
  }

  /**
   * Increment attempt count for failed verification
   */
  private async incrementAttemptCount(email: string, code: string): Promise<void> {
    try {
      await this.supabase
        .from('voice_codes')
        .update({
          attempts: this.supabase.rpc('increment_attempts'),
        })
        .eq('email', email)
        .eq('code', code)
        .eq('used', false);
    } catch (error) {
      this.logger.error('Failed to increment attempt count', {
        error: error instanceof Error ? error.message : String(error),
        email,
        code,
      });
    }
  }

  /**
   * Confirm user email after successful verification
   */
  private async confirmUserEmail(email: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          email_confirmed: true,
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('email', email);

      if (error) {
        this.logger.error('Failed to confirm user email', {
          error,
          email,
        });
        // Don't throw error as this is not critical for the flow
      }
    } catch (error) {
      this.logger.error('Unexpected error confirming user email', {
        error: error instanceof Error ? error.message : String(error),
        email,
      });
    }
  }
}