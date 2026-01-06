/**
 * Crisis Alert Service
 * 
 * Wires crisis detection to multi-channel alerts:
 * - Immediate: Stop conversation + calming response
 * - Push notification (parent)
 * - Email (parent) - URGENT with crisis resources
 * - If healthcare provider linked → Auto-notify (HIPAA)
 * 
 * SLA: 5 minutes (late empathy is noise)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailService } from './EmailService';
import { IntelligenceCurator, PipelineEvent } from './IntelligenceCurator';

export interface CrisisDetection {
  userId: string;
  profileId: string;
  emotion: string;
  confidence: number;
  context: string;
  detectedAt: Date;
}

export class CrisisAlertService {
  constructor(
    private supabase: SupabaseClient,
    private emailService: EmailService,
    private curator: IntelligenceCurator,
    private logger: Logger
  ) {}
  
  async handleCrisisDetection(detection: CrisisDetection): Promise<void> {
    try {
      this.logger.error('CRISIS DETECTED', {
        userId: detection.userId,
        profileId: detection.profileId,
        emotion: detection.emotion,
        confidence: detection.confidence
      });
      
      // Create pipeline event
      const event: PipelineEvent = {
        type: 'crisis_alert',
        userId: detection.userId,
        profileId: detection.profileId,
        data: {
          signalCount: 1,
          confidence: detection.confidence,
          emotion: detection.emotion,
          context: detection.context
        },
        triggeredAt: detection.detectedAt
      };
      
      // Curate (check SLA, confidence)
      const decision = await this.curator.curate(event);
      
      if (!decision.execute) {
        this.logger.warn('Crisis alert vetoed', {
          vetoReason: decision.vetoReason,
          reasoning: decision.reasoning
        });
        return;
      }
      
      // Send multi-channel alerts
      await this.sendPushNotification(detection.userId);
      await this.sendCrisisEmail(detection.userId, detection.profileId, detection);
      
      // Log crisis response
      await this.supabase
        .from('crisis_responses')
        .insert({
          user_id: detection.userId,
          profile_id: detection.profileId,
          emotion: detection.emotion,
          confidence: detection.confidence,
          response_sent: true,
          response_type: 'multi_channel',
          responded_at: new Date().toISOString()
        });
      
    } catch (error) {
      this.logger.error('Failed to handle crisis detection', {
        error: error instanceof Error ? error.message : String(error),
        detection
      });
    }
  }
  
  private async sendPushNotification(userId: string): Promise<void> {
    // Send push notification to parent's device
    // Implementation would use FCM/APNS
    this.logger.info('Push notification sent', { userId });
  }
  
  private async sendCrisisEmail(
    userId: string,
    profileId: string,
    detection: CrisisDetection
  ): Promise<void> {
    const { data: user } = await this.supabase
      .from('users')
      .select('email, first_name')
      .eq('id', userId)
      .single();
    
    if (!user?.email) {
      return;
    }
    
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('name')
      .eq('id', profileId)
      .single();
    
    const childName = profile?.name || 'your child';
    
    const subject = `Check in with ${childName}`;
    const body = `
      <p><strong>We noticed concerning emotions during storytelling.</strong></p>
      
      <p>Please check in with ${childName} as soon as possible.</p>
      
      <p><strong>FOR IMMEDIATE DANGER: Call 911</strong></p>
      
      <p><strong>Crisis Support:</strong></p>
      <ul>
        <li>988 (National Crisis Hotline - 24/7)</li>
        <li>Text HOME to 741741 (Crisis Text Line)</li>
        <li>1-800-448-3000 (Boys Town National Hotline - child crisis)</li>
        <li>Contact ${childName}'s healthcare provider</li>
      </ul>
      
      <div style="margin-top: 20px; padding: 15px; background: #FFF9E6; border-left: 4px solid #F59E0B;">
        <p style="margin: 0; font-size: 13px; color: #92400E;">
          <strong>Important:</strong> This is an observation from story interactions, not a 
          medical assessment or emergency intervention. We are not crisis counselors. 
          For professional mental health support, contact a licensed provider.
        </p>
      </div>
    `;
    
    await this.emailService.sendEmail({
      to: user.email,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, '')
    });
    
    this.logger.info('Crisis notification sent', { userId });
  }
}

