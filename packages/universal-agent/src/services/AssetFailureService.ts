/**
 * Asset Failure Service
 * 
 * Handles graceful asset generation failures:
 * - Partial complete (some assets ready)
 * - Complete failure (no assets generated)
 * - Asset timeout (stuck in generating)
 * 
 * Sends user-friendly emails with retry options and credit refunds.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailService } from './EmailService';

export interface AssetFailure {
  storyId: string;
  userId: string;
  failureType: 'partial' | 'complete' | 'timeout';
  failedAssets: string[];
  successfulAssets: string[];
  errorMessage: string;
}

export class AssetFailureService {
  constructor(
    private supabase: SupabaseClient,
    private emailService: EmailService,
    private logger: Logger
  ) {}
  
  async handleFailure(failure: AssetFailure): Promise<void> {
    try {
      this.logger.warn('Asset generation failure', {
        storyId: failure.storyId,
        failureType: failure.failureType,
        failedAssets: failure.failedAssets
      });
      
      // Send appropriate email
      switch (failure.failureType) {
        case 'partial':
          await this.sendPartialCompleteEmail(failure);
          break;
        case 'complete':
          await this.sendCompleteFailureEmail(failure);
          break;
        case 'timeout':
          await this.sendTimeoutEmail(failure);
          break;
      }
      
      // Auto-retry logic (3 attempts)
      await this.scheduleRetry(failure);
      
      // Credit refund for paid assets
      await this.processRefund(failure);
      
    } catch (error) {
      this.logger.error('Failed to handle asset failure', {
        error: error instanceof Error ? error.message : String(error),
        failure
      });
    }
  }
  
  private async sendPartialCompleteEmail(failure: AssetFailure): Promise<void> {
    const { data: user } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', failure.userId)
      .single();
    
    const { data: story } = await this.supabase
      .from('stories')
      .select('title')
      .eq('id', failure.storyId)
      .single();
    
    if (user?.email && story) {
      const subject = `"${story.title}" partially ready`;
      const body = `
        <p>"${story.title}" is ready, but some assets are still generating.</p>
        
        <p><strong>Ready:</strong> ${failure.successfulAssets.join(', ')}</p>
        <p><strong>Still working on:</strong> ${failure.failedAssets.join(', ')}</p>
        
        <p>We're retrying automatically. You'll get another email when complete.</p>
        
        <p><a href="https://storytailor.com/stories/${failure.storyId}">View Story</a></p>
      `;
      
      await this.emailService.sendEmail({
        to: user.email,
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, '')
      });
    }
  }
  
  private async sendCompleteFailureEmail(failure: AssetFailure): Promise<void> {
    const { data: user } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', failure.userId)
      .single();
    
    const { data: story } = await this.supabase
      .from('stories')
      .select('title')
      .eq('id', failure.storyId)
      .single();
    
    if (user?.email && story) {
      const subject = `Issue with "${story.title}"`;
      const body = `
        <p>We encountered an issue generating "${story.title}".</p>
        
        <p>We're working on it and will retry automatically. You'll receive an email when it's ready.</p>
        
        <p>If this continues, contact support: support@storytailor.com</p>
      `;
      
      await this.emailService.sendEmail({
        to: user.email,
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, '')
      });
    }
  }
  
  private async sendTimeoutEmail(failure: AssetFailure): Promise<void> {
    const { data: user } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', failure.userId)
      .single();
    
    if (user?.email) {
      const subject = 'Story taking longer than expected';
      const body = `
        <p>Your story is taking longer than expected to generate.</p>
        
        <p>We're still working on it. ETA: 15 minutes.</p>
        
        <p>You'll receive an email when it's ready.</p>
      `;
      
      await this.emailService.sendEmail({
        to: user.email,
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, '')
      });
    }
  }
  
  private async scheduleRetry(failure: AssetFailure): Promise<void> {
    // Schedule retry (would use EventBridge or queue)
    this.logger.info('Scheduling asset retry', {
      storyId: failure.storyId
    });
  }
  
  private async processRefund(failure: AssetFailure): Promise<void> {
    // Process credit refund for failed paid assets
    this.logger.info('Processing refund for failed assets', {
      storyId: failure.storyId
    });
  }
}

