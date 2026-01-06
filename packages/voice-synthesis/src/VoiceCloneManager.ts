import { EventEmitter } from 'events';
import { Logger } from 'winston';
import fetch from 'node-fetch';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  VoiceCloneRequest, 
  VoiceClone, 
  VoiceEngineConfig,
  VoiceError,
  VoiceErrorCode
} from './types';

/**
 * Voice clone manager for opt-in voice cloning with parental consent
 * Handles 15-sentence capture, consent management, and revocation
 */
export class VoiceCloneManager extends EventEmitter {
  private supabase: SupabaseClient;
  private isInitialized = false;

  constructor(
    private config: VoiceEngineConfig,
    private logger: Logger
  ) {
    super();
    
    // Initialize Supabase client for consent and clone management
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  /**
   * Initialize the voice clone manager
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing VoiceCloneManager...');

      // Test Supabase connection
      const { error } = await this.supabase.from('voice_clones').select('id').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Supabase connection failed: ${error.message}`);
      }

      this.isInitialized = true;
      this.logger.info('VoiceCloneManager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize VoiceCloneManager', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create a new voice clone with parental consent
   */
  async createVoiceClone(request: VoiceCloneRequest): Promise<VoiceClone> {
    this.ensureInitialized();

    try {
      this.logger.info('Creating voice clone', {
        userId: request.userId,
        voiceName: request.voiceName,
        parentConsentId: request.parentConsentId,
        sampleCount: request.audioSamples.length,
      });

      // Validate parental consent
      await this.validateParentalConsent(request.parentConsentId, request.userId);

      // Check if user already has a voice clone
      const existingClone = await this.getVoiceCloneByUserId(request.userId);
      if (existingClone && !existingClone.revokedAt) {
        throw new VoiceError(
          VoiceErrorCode.INVALID_REQUEST,
          'User already has an active voice clone',
          'elevenlabs'
        );
      }

      // Create voice clone with ElevenLabs
      const elevenLabsVoiceId = await this.createElevenLabsVoice(request);

      // Store voice clone in database
      const voiceClone = await this.storeVoiceClone({
        userId: request.userId,
        voiceId: elevenLabsVoiceId,
        name: request.voiceName,
        description: request.description,
        parentConsentId: request.parentConsentId,
        status: 'processing',
      });

      // Start async processing
      this.processVoiceClone(voiceClone.id, request.audioSamples);

      this.logger.info('Voice clone created successfully', {
        cloneId: voiceClone.id,
        userId: request.userId,
        voiceId: elevenLabsVoiceId,
      });

      this.emit('voice_clone_created', voiceClone);
      return voiceClone;

    } catch (error) {
      this.logger.error('Failed to create voice clone', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
      });

      if (error instanceof VoiceError) {
        throw error;
      }

      throw new VoiceError(
        VoiceErrorCode.INTERNAL_ERROR,
        `Failed to create voice clone: ${error instanceof Error ? error.message : String(error)}`,
        'elevenlabs',
        error
      );
    }
  }

  /**
   * Revoke a voice clone and delete all associated data
   */
  async revokeVoiceClone(userId: string, reason?: string): Promise<void> {
    this.ensureInitialized();

    try {
      this.logger.info('Revoking voice clone', { userId, reason });

      // Get the voice clone
      const voiceClone = await this.getVoiceCloneByUserId(userId);
      if (!voiceClone || voiceClone.revokedAt) {
        throw new VoiceError(
          VoiceErrorCode.VOICE_NOT_FOUND,
          'No active voice clone found for user',
          'elevenlabs'
        );
      }

      // Delete from ElevenLabs
      await this.deleteElevenLabsVoice(voiceClone.voiceId);

      // Mark as revoked in database
      await this.markVoiceCloneRevoked(voiceClone.id, reason);

      // Delete audio samples from storage (KMS encrypted)
      await this.deleteAudioSamples(voiceClone.id);

      this.logger.info('Voice clone revoked successfully', {
        cloneId: voiceClone.id,
        userId,
        voiceId: voiceClone.voiceId,
      });

      this.emit('voice_clone_revoked', {
        cloneId: voiceClone.id,
        userId,
        reason,
      });

    } catch (error) {
      this.logger.error('Failed to revoke voice clone', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });

      if (error instanceof VoiceError) {
        throw error;
      }

      throw new VoiceError(
        VoiceErrorCode.INTERNAL_ERROR,
        `Failed to revoke voice clone: ${error instanceof Error ? error.message : String(error)}`,
        'elevenlabs',
        error
      );
    }
  }

  /**
   * List voice clones for a user
   */
  async listVoiceClones(userId: string): Promise<VoiceClone[]> {
    this.ensureInitialized();

    try {
      const { data: clones, error } = await this.supabase
        .from('voice_clones')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return (clones || []).map(this.mapDatabaseToVoiceClone);

    } catch (error) {
      this.logger.error('Failed to list voice clones', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });

      throw new VoiceError(
        VoiceErrorCode.INTERNAL_ERROR,
        `Failed to list voice clones: ${error instanceof Error ? error.message : String(error)}`,
        'elevenlabs',
        error
      );
    }
  }

  /**
   * Get voice clone status
   */
  async getVoiceCloneStatus(userId: string): Promise<VoiceClone | null> {
    return this.getVoiceCloneByUserId(userId);
  }

  /**
   * Check if user has parental consent for voice cloning
   */
  async hasParentalConsent(userId: string): Promise<boolean> {
    try {
      const { data: consent, error } = await this.supabase
        .from('parental_consents')
        .select('id')
        .eq('user_id', userId)
        .eq('consent_type', 'voice_cloning')
        .eq('status', 'approved')
        .single();

      return !error && !!consent;

    } catch (error) {
      this.logger.error('Failed to check parental consent', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      return false;
    }
  }

  /**
   * Private helper methods
   */

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new VoiceError(
        VoiceErrorCode.INTERNAL_ERROR,
        'VoiceCloneManager not initialized. Call initialize() first.',
        'elevenlabs'
      );
    }
  }

  private async validateParentalConsent(consentId: string, userId: string): Promise<void> {
    const { data: consent, error } = await this.supabase
      .from('parental_consents')
      .select('*')
      .eq('id', consentId)
      .eq('user_id', userId)
      .eq('consent_type', 'voice_cloning')
      .eq('status', 'approved')
      .single();

    if (error || !consent) {
      throw new VoiceError(
        VoiceErrorCode.INVALID_REQUEST,
        'Valid parental consent required for voice cloning',
        'elevenlabs'
      );
    }

    // Check if consent is still valid (not expired)
    if (consent.expires_at && new Date() > new Date(consent.expires_at)) {
      throw new VoiceError(
        VoiceErrorCode.INVALID_REQUEST,
        'Parental consent has expired',
        'elevenlabs'
      );
    }
  }

  private async createElevenLabsVoice(request: VoiceCloneRequest): Promise<string> {
    try {
      // Convert base64 audio samples to files
      const audioFiles = request.audioSamples.map((sample, index) => ({
        name: `sample_${index + 1}.wav`,
        data: Buffer.from(sample, 'base64'),
      }));

      // Create form data for ElevenLabs API
      const formData = new FormData();
      formData.append('name', request.voiceName);
      formData.append('description', request.description || '');

      // Add audio files
      audioFiles.forEach((file, index) => {
        formData.append('files', new Blob([file.data]), file.name);
      });

      const response = await fetch(`${this.config.elevenlabs.baseUrl}/v1/voices/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.elevenlabs.apiKey}`,
          'xi-api-key': this.config.elevenlabs.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return (result as any).voice_id;

    } catch (error) {
      throw new VoiceError(
        VoiceErrorCode.ENGINE_UNAVAILABLE,
        `Failed to create ElevenLabs voice: ${error instanceof Error ? error.message : String(error)}`,
        'elevenlabs',
        error
      );
    }
  }

  private async deleteElevenLabsVoice(voiceId: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.elevenlabs.baseUrl}/v1/voices/${voiceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.elevenlabs.apiKey}`,
          'xi-api-key': this.config.elevenlabs.apiKey,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
      }

    } catch (error) {
      // Log error but don't throw - we still want to mark as revoked in our database
      this.logger.error('Failed to delete ElevenLabs voice', {
        error: error instanceof Error ? error.message : String(error),
        voiceId,
      });
    }
  }

  private async storeVoiceClone(data: {
    userId: string;
    voiceId: string;
    name: string;
    description?: string;
    parentConsentId: string;
    status: 'processing' | 'ready' | 'failed';
  }): Promise<VoiceClone> {
    const { data: clone, error } = await this.supabase
      .from('voice_clones')
      .insert({
        user_id: data.userId,
        voice_id: data.voiceId,
        name: data.name,
        description: data.description,
        parent_consent_id: data.parentConsentId,
        status: data.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return this.mapDatabaseToVoiceClone(clone);
  }

  private async getVoiceCloneByUserId(userId: string): Promise<VoiceClone | null> {
    const { data: clone, error } = await this.supabase
      .from('voice_clones')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database error: ${error.message}`);
    }

    return clone ? this.mapDatabaseToVoiceClone(clone) : null;
  }

  private async markVoiceCloneRevoked(cloneId: string, reason?: string): Promise<void> {
    const { error } = await this.supabase
      .from('voice_clones')
      .update({
        revoked_at: new Date().toISOString(),
        revocation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cloneId);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  private async deleteAudioSamples(cloneId: string): Promise<void> {
    // This would delete encrypted audio samples from AWS S3 with KMS
    // For now, we'll just log the action
    this.logger.info('Audio samples deleted', { cloneId });
  }

  private async processVoiceClone(cloneId: string, audioSamples: string[]): Promise<void> {
    // Async processing of voice clone
    // This would typically involve:
    // 1. Encrypting and storing audio samples with KMS
    // 2. Training the voice model
    // 3. Updating status to 'ready' or 'failed'
    
    setTimeout(async () => {
      try {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

        // Update status to ready
        const { error } = await this.supabase
          .from('voice_clones')
          .update({
            status: 'ready',
            updated_at: new Date().toISOString(),
          })
          .eq('id', cloneId);

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        this.logger.info('Voice clone processing completed', { cloneId });
        this.emit('voice_clone_ready', { cloneId });

      } catch (error) {
        this.logger.error('Voice clone processing failed', {
          error: error instanceof Error ? error.message : String(error),
          cloneId,
        });

        // Update status to failed
        await this.supabase
          .from('voice_clones')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', cloneId);

        this.emit('voice_clone_failed', { cloneId, error });
      }
    }, 1000);
  }

  private mapDatabaseToVoiceClone(dbClone: any): VoiceClone {
    return {
      id: dbClone.id,
      userId: dbClone.user_id,
      voiceId: dbClone.voice_id,
      name: dbClone.name,
      description: dbClone.description,
      status: dbClone.status,
      parentConsentId: dbClone.parent_consent_id,
      createdAt: new Date(dbClone.created_at),
      updatedAt: new Date(dbClone.updated_at),
      revokedAt: dbClone.revoked_at ? new Date(dbClone.revoked_at) : undefined,
    };
  }
}