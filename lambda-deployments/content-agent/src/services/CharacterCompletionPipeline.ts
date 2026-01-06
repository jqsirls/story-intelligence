/**
 * Character Completion Pipeline
 * 
 * Orchestrates character asset generation:
 * 1. Generate headshot (15s)
 * 2. Generate bodyshot (20s)
 * 3. Generate Birth Certificate PDF (5s)
 * 4. Send character-complete email
 * 
 * Total time: ~40 seconds
 * Progressive updates via Supabase Realtime
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { CharacterBirthCertificateService, CharacterDetails } from './CharacterBirthCertificateService';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CharacterPipelineStatus {
  characterId: string;
  status: 'queued' | 'generating_headshot' | 'generating_bodyshot' | 'generating_certificate' | 'complete' | 'failed';
  progress: number; // 0-100
  headshot_url?: string;
  bodyshot_url?: string;
  birth_certificate_url?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// ============================================================================
// Character Completion Pipeline
// ============================================================================

export class CharacterCompletionPipeline {
  private birthCertificateService: CharacterBirthCertificateService;
  
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger
  ) {
    this.birthCertificateService = new CharacterBirthCertificateService(logger);
  }
  
  /**
   * Execute complete character asset pipeline
   */
  async execute(characterId: string): Promise<void> {
    try {
      this.logger.info('Starting character completion pipeline', { characterId });
      
      // Update status: queued → generating
      await this.updateStatus(characterId, {
        status: 'generating_headshot',
        progress: 10
      });
      
      // Get character details
      const { data: character, error: fetchError } = await this.supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();
      
      if (fetchError || !character) {
        throw new Error('Character not found');
      }
      
      // Check if reference images already exist
      const refImages = Array.isArray(character.reference_images) ? character.reference_images : []
      const hasHeadshot = refImages.find((img: any) => img && img.type === 'headshot' && typeof img.url === 'string' && img.url.length > 0)?.url
      const hasBodyshot = refImages.find((img: any) => img && img.type === 'bodyshot' && typeof img.url === 'string' && img.url.length > 0)?.url
      
      if (!hasHeadshot || !hasBodyshot) {
        throw new Error('Reference images not yet generated');
      }
      
      // Update progress: Reference images confirmed
      await this.updateStatus(characterId, {
        status: 'generating_certificate',
        progress: 60,
        headshot_url: hasHeadshot,
        bodyshot_url: hasBodyshot
      });
      
      // Generate Birth Certificate PDF
      const certificate = await this.birthCertificateService.generateBirthCertificate({
        id: character.id,
        name: character.name,
        species: character.species,
        personality_traits: character.personality_traits || [],
        special_abilities: character.special_abilities || [],
        age: character.age,
        origin_story: character.backstory,
        headshot_url: hasHeadshot,
        created_at: new Date(character.created_at),
        created_by_user_id: character.user_id
      });
      
      // Update character with Birth Certificate URL
      await this.supabase
        .from('characters')
        .update({
          birth_certificate_url: certificate.pdfUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', characterId);
      
      // Update status: complete
      await this.updateStatus(characterId, {
        status: 'complete',
        progress: 100,
        birth_certificate_url: certificate.presignedUrl,
        completedAt: new Date()
      });
      
      // Create notification
      await this.createCharacterCompleteNotification(character);
      
      this.logger.info('Character completion pipeline finished', {
        characterId,
        certificateUrl: certificate.pdfUrl
      });
      
    } catch (error) {
      this.logger.error('Character completion pipeline failed', {
        error: error instanceof Error ? error.message : String(error),
        characterId
      });
      
      // Update status: failed
      await this.updateStatus(characterId, {
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
  
  /**
   * Update character pipeline status (progressive updates)
   */
  private async updateStatus(
    characterId: string,
    status: Partial<CharacterPipelineStatus>
  ): Promise<void> {
    try {
      // Update character record with status
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (status.birth_certificate_url) {
        updateData.birth_certificate_url = status.birth_certificate_url;
      }
      
      if (status.status) {
        // NOTE: We intentionally do NOT write a character status column here.
        // Schema truth for completeness is `appearance_url` + `reference_images` content.
      }
      
      const { error } = await this.supabase
        .from('characters')
        .update(updateData)
        .eq('id', characterId);
      
      if (error) {
        this.logger.error('Failed to update character status', {
          error,
          characterId,
          status
        });
      }
      
      // Supabase Realtime will notify connected clients
      this.logger.debug('Character status updated', {
        characterId,
        status: status.status,
        progress: status.progress
      });
      
    } catch (error) {
      this.logger.error('Failed to update character pipeline status', {
        error: error instanceof Error ? error.message : String(error),
        characterId,
        status
      });
    }
  }
  
  /**
   * Create character complete notification
   */
  private async createCharacterCompleteNotification(character: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: character.user_id,
          type: 'character_ready',
          title: `${character.name} is Ready!`,
          message: `Your character ${character.name} is complete with official Birth Certificate.`,
          data: {
            character_id: character.id,
            character_name: character.name,
            headshot_url: (Array.isArray(character.reference_images)
              ? character.reference_images.find((img: any) => img && img.type === 'headshot' && typeof img.url === 'string' && img.url.length > 0)?.url
              : null),
            birth_certificate_url: character.birth_certificate_url
          },
          read: false
        });
      
      if (error) {
        this.logger.error('Failed to create character complete notification', {
          error,
          characterId: character.id
        });
      }
      
    } catch (error) {
      this.logger.error('Failed to create notification', {
        error: error instanceof Error ? error.message : String(error),
        characterId: character.id
      });
    }
  }
}

