/**
 * IP Dispute Service
 * 
 * Handles user reporting and rights holder disputes for IP attribution issues.
 * Provides automatic re-detection and manual attribution workflows.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IPDetectionService, IPDetectionResult } from './IPDetectionService';
import type { IPDispute } from '@alexa-multi-agent/shared-types';

export interface DisputeSubmission {
  storyId: string;
  reportedBy?: string;
  disputeType: 'missed_detection' | 'false_positive' | 'rights_holder_claim' | 'user_question';
  characterName: string;
  franchise?: string;
  owner?: string;
  description?: string;
  contactInfo?: string;
}

export interface DisputeResolution {
  disputeId: string;
  resolved: boolean;
  resolution?: string;
  attributionAdded?: boolean;
  legalEscalated?: boolean;
}

export class IPDisputeService {
  private supabase: SupabaseClient;
  private ipDetectionService: IPDetectionService;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.ipDetectionService = new IPDetectionService();
  }

  /**
   * Submit an IP dispute (user report or rights holder claim)
   */
  async submitDispute(submission: DisputeSubmission): Promise<IPDispute> {
    try {
      // Create dispute record
      const { data: dispute, error } = await this.supabase
        .from('ip_disputes')
        .insert({
          story_id: submission.storyId,
          reported_by: submission.reportedBy || null,
          dispute_type: submission.disputeType,
          character_name: submission.characterName,
          franchise: submission.franchise || null,
          owner: submission.owner || null,
          status: 'pending',
          legal_escalated: submission.disputeType === 'rights_holder_claim',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create dispute: ${error.message}`);
      }

      // If it's a missed detection or rights holder claim, trigger automatic re-detection
      if (submission.disputeType === 'missed_detection' || submission.disputeType === 'rights_holder_claim') {
        await this.processDispute(dispute.id);
      }

      return this.mapDisputeToType(dispute);
    } catch (error) {
      throw new Error(`Failed to submit dispute: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a dispute (automatic re-detection and resolution)
   */
  async processDispute(disputeId: string): Promise<DisputeResolution> {
    try {
      // Get dispute
      const { data: dispute, error: fetchError } = await this.supabase
        .from('ip_disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

      if (fetchError || !dispute) {
        throw new Error(`Dispute not found: ${disputeId}`);
      }

      // Update status to reviewing
      await this.supabase
        .from('ip_disputes')
        .update({ status: 'reviewing' })
        .eq('id', disputeId);

      // Get story
      const { data: story, error: storyError } = await this.supabase
        .from('stories')
        .select('*')
        .eq('id', dispute.story_id)
        .single();

      if (storyError || !story) {
        throw new Error(`Story not found: ${dispute.story_id}`);
      }

      // Extract story content
      const storyContent = typeof story.content === 'object' && story.content !== null
        ? (story.content as any).text || JSON.stringify(story.content)
        : story.content;

      // Re-detect IP
      const characterNames = [dispute.character_name];
      const detectionResults = await this.ipDetectionService.detectIP(storyContent, characterNames);

      // Check if the disputed character was detected
      const characterDetected = detectionResults.some(
        result => result.character.toLowerCase() === dispute.character_name.toLowerCase()
      );

      let resolution: DisputeResolution = {
        disputeId,
        resolved: false,
      };

      if (characterDetected || dispute.dispute_type === 'rights_holder_claim') {
        // Character was detected or rights holder confirmed - add attribution
        const ipAttributions = detectionResults.map(attr => ({
          character: attr.character,
          franchise: attr.franchise,
          owner: attr.owner,
          confidence: attr.confidence,
          detectedAt: new Date().toISOString(),
          attributionText: attr.attributionText,
          personalUseMessage: attr.personalUseMessage,
          ownershipDisclaimer: attr.ownershipDisclaimer,
        }));

        // Update story metadata with IP attributions
        const existingMetadata = story.metadata || {};
        const existingAttributions = existingMetadata.ipAttributions || [];
        
        // Merge attributions (avoid duplicates)
        const mergedAttributions = [...existingAttributions];
        for (const newAttr of ipAttributions) {
          const exists = mergedAttributions.some(
            existing => existing.character.toLowerCase() === newAttr.character.toLowerCase()
          );
          if (!exists) {
            mergedAttributions.push(newAttr);
          }
        }

        const updatedMetadata = {
          ...existingMetadata,
          ipAttributions: mergedAttributions,
        };

        // Update story
        await this.supabase
          .from('stories')
          .update({ metadata: updatedMetadata })
          .eq('id', dispute.story_id);

        // Resolve dispute
        await this.supabase
          .from('ip_disputes')
          .update({
            status: 'resolved',
            resolution: 'IP attribution added to story metadata',
            resolved_at: new Date().toISOString(),
          })
          .eq('id', disputeId);

        resolution = {
          disputeId,
          resolved: true,
          resolution: 'IP attribution added to story metadata',
          attributionAdded: true,
        };
      } else if (dispute.dispute_type === 'false_positive') {
        // False positive - remove attribution if it exists
        const existingMetadata = story.metadata || {};
        const existingAttributions = existingMetadata.ipAttributions || [];
        
        const filteredAttributions = existingAttributions.filter(
          attr => attr.character.toLowerCase() !== dispute.character_name.toLowerCase()
        );

        if (filteredAttributions.length !== existingAttributions.length) {
          const updatedMetadata = {
            ...existingMetadata,
            ipAttributions: filteredAttributions.length > 0 ? filteredAttributions : undefined,
          };

          await this.supabase
            .from('stories')
            .update({ metadata: updatedMetadata })
            .eq('id', dispute.story_id);

          await this.supabase
            .from('ip_disputes')
            .update({
              status: 'resolved',
              resolution: 'False positive confirmed - attribution removed',
              resolved_at: new Date().toISOString(),
            })
            .eq('id', disputeId);

          resolution = {
            disputeId,
            resolved: true,
            resolution: 'False positive confirmed - attribution removed',
            attributionAdded: false,
          };
        } else {
          await this.supabase
            .from('ip_disputes')
            .update({
              status: 'resolved',
              resolution: 'No attribution found to remove',
              resolved_at: new Date().toISOString(),
            })
            .eq('id', disputeId);

          resolution = {
            disputeId,
            resolved: true,
            resolution: 'No attribution found to remove',
          };
        }
      } else {
        // User question - mark as resolved with explanation
        await this.supabase
          .from('ip_disputes')
          .update({
            status: 'resolved',
            resolution: 'Question answered - no action needed',
            resolved_at: new Date().toISOString(),
          })
          .eq('id', disputeId);

        resolution = {
          disputeId,
          resolved: true,
          resolution: 'Question answered - no action needed',
        };
      }

      return resolution;
    } catch (error) {
      // Update dispute status to indicate error
      await this.supabase
        .from('ip_disputes')
        .update({
          status: 'escalated',
          resolution: `Error processing dispute: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
        .eq('id', disputeId);

      throw error;
    }
  }

  /**
   * Get dispute by ID
   */
  async getDispute(disputeId: string): Promise<IPDispute | null> {
    const { data, error } = await this.supabase
      .from('ip_disputes')
      .select('*')
      .eq('id', disputeId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDisputeToType(data);
  }

  /**
   * Get disputes for a story
   */
  async getDisputesForStory(storyId: string): Promise<IPDispute[]> {
    const { data, error } = await this.supabase
      .from('ip_disputes')
      .select('*')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(d => this.mapDisputeToType(d));
  }

  /**
   * Escalate dispute to legal team
   */
  async escalateToLegal(disputeId: string, reason: string): Promise<void> {
    await this.supabase
      .from('ip_disputes')
      .update({
        legal_escalated: true,
        status: 'escalated',
        resolution: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);
  }

  /**
   * Map database dispute to TypeScript type
   */
  private mapDisputeToType(data: any): IPDispute {
    return {
      id: data.id,
      storyId: data.story_id,
      reportedBy: data.reported_by,
      disputeType: data.dispute_type,
      characterName: data.character_name,
      franchise: data.franchise,
      owner: data.owner,
      status: data.status,
      resolution: data.resolution,
      legalEscalated: data.legal_escalated || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
